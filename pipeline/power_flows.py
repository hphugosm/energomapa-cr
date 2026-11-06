"""ČEPS hourly electricity snapshots. Offline build; explicit --download refresh only."""
from __future__ import annotations
import argparse, concurrent.futures, csv, datetime as dt, gzip, hashlib, io, json, math, tempfile
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo
from csv_export import write_dataset_csv

ENDPOINT='https://www.ceps.cz/_layouts/CepsData.asmx'
NS='https://www.ceps.cz/CepsData/'
DOC_URL='https://www.ceps.cz/cs/ke-stazeni/webove-sluzby/dokumentace/cepsvip-popis-rozhrani-strukturovana-data-3-2.docx'
BORDERS={'DE':('TenneT','50HzT'),'PL':('PSE',),'SK':('SEPS',),'AT':('APG',)}
FLOW_AGGREGATION='Dovoz/vývoz v bilanci = součet kladných/záporných hodinových sald čtyř zemí. Německo je TenneT + 50Hertz před rozdělením znamének; opačné profily se nettují. Nejde o hrubé toky všech TSO ani jednotlivých vedení. Denní bilance integruje tyto hodinové části, nikoli kladné/záporné denní netto.'
NAMES={'DE':'Německo','PL':'Polsko','SK':'Slovensko','AT':'Rakousko'}
ROOT=Path(__file__).resolve().parents[1]

def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n',encoding='utf8')

def fetch(method,start,end):
    params={'dateFrom':start,'dateTo':end,'agregation':'HR','function':'AVG','version':'RT'}
    if method=='Generation':params['para1']='all'
    inner=''.join(f'<{key}>{value}</{key}>' for key,value in params.items())
    body=f'<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><{method} xmlns="{NS}">{inner}</{method}></soap:Body></soap:Envelope>'
    req=urllib.request.Request(ENDPOINT,data=body.encode(),headers={'Content-Type':'text/xml; charset=utf-8','SOAPAction':f'"{NS}{method}"'})
    with urllib.request.urlopen(req,timeout=90) as response:raw=response.read()
    series,records=parse_xml(raw)
    if not records:raise ValueError(f'ČEPS returned no data: {method} {start}')
    return raw,params,len(records)

def parse_xml(raw):
    root=ET.fromstring(raw)
    series={n.attrib['id']:n.attrib['name'] for n in root.iter() if n.tag.rsplit('}',1)[-1]=='serie'}
    rows=[]
    for node in root.iter():
        if node.tag.rsplit('}',1)[-1]!='item' or 'date' not in node.attrib:continue
        instant=dt.datetime.fromisoformat(node.attrib['date'])
        if instant.tzinfo is None:raise ValueError('ČEPS timestamp missing explicit offset')
        row={'time':instant.astimezone(dt.timezone.utc).isoformat().replace('+00:00','Z')}
        for key,label in series.items():
            try:value=float(node.attrib[key])
            except (KeyError,ValueError):value=None
            row[label]=value if value is not None and math.isfinite(value) else None
        rows.append(row)
    return series,rows

def download_power_flows(root=ROOT,start='2025-01-01',end='2026-11-05'):
    """Archive full original SOAP responses and their exact query parameters."""
    root=Path(root);directory=root/'data/raw/databank';directory.mkdir(parents=True,exist_ok=True)
    staging_context=tempfile.TemporaryDirectory(prefix='flows-refresh-',dir=root/'data')
    staging=Path(staging_context.name)
    start_date=dt.date.fromisoformat(start);end_date=dt.date.fromisoformat(end)
    jobs=[];cursor=start_date
    while cursor<=end_date:
        following=(cursor.replace(day=28)+dt.timedelta(days=4)).replace(day=1)
        stop=min(end_date,following-dt.timedelta(days=1))
        for method in ('CrossborderPowerFlows','Generation','Load'):
            jobs.append((method,cursor.isoformat()+'T00:00:00',stop.isoformat()+'T23:59:59'))
        cursor=following
    def download(job):
        method,a,b=job;raw,params,count=fetch(method,a,b)
        name=f'flows-{method}-{a[:7]}.xml.gz';compressed=gzip.compress(raw,mtime=0)
        path=directory/name;(staging/name).write_bytes(compressed)
        print(f'{name}: {count} hours',flush=True)
        return {'path':str(path.relative_to(root)),'sha256':hashlib.sha256(compressed).hexdigest(),'decompressedSha256':hashlib.sha256(raw).hexdigest(),'method':method,'parameters':params,'rowCount':count}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        files=list(executor.map(download,jobs))
    # Reference the restricted document; never archive or republish its bytes.
    with urllib.request.urlopen(DOC_URL,timeout=60) as response:
        documentation_hash=hashlib.sha256(response.read()).hexdigest()
    documentation_reference={'url':DOC_URL,'sha256':documentation_hash,'description':'ČEPS SOAP API, structured data interface v3.2; restricted ČEPS/Seyfor document. Reference only; original is not redistributed.','redistributionPermission':'not evidenced'}
    for name,url in [('flows-sign-convention.html','https://www.ceps.cz/cs/data/preshranicni-toky')]:
        with urllib.request.urlopen(url,timeout=60) as response:raw=response.read()
        target=directory/name;(staging/name).write_bytes(raw)
        files.append({'path':str(target.relative_to(root)),'sha256':hashlib.sha256(raw).hexdigest(),'url':url})
    meta={'publisher':'ČEPS, a.s.','url':'https://www.ceps.cz/cs/webove-sluzby','endpoint':ENDPOINT,'documentation':DOC_URL,'retrievedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'requestedPeriod':{'start':start,'end':end},'files':files,'signConvention':'Kladná hodnota je dovoz do ČR; záporná vývoz z ČR. Potvrzeno větví val < 0 → export v oficiálním grafu ČEPS.','methodology':'HR / AVG / RT. Hodinový průměr výkonu v MW. Čas začátku intervalu převeden z explicitního UTC offsetu zdroje do UTC. Každý interval trvá 1 h. DE je součet profilů TenneT a 50HzT; ostatní profily PSE, SEPS, APG. Planned jsou plánované přeshraniční výměny ČEPS, nikoli realizované obchody OTE.','license':'Veřejně dostupná data ČEPS; zachovat uvedení zdroje, licence pro další užití není v rozhraní deklarována.'}
    meta['documentationReference']=documentation_reference
    meta['license']='Číselná data ČEPS: podmínky dalšího užití nejsou v rozhraní deklarovány; oprávnění k redistribuci nebylo doloženo. Doložka dokumentu ČEPS/Seyfor není licencí těchto dat.'
    # All requests and parsing succeeded before touching the last good snapshot.
    for item in files:
        target=root/item['path'];(staging/target.name).replace(target)
    write(root/'data/sources/flows.json',meta)
    staging_context.cleanup()
    return meta

def complete_sum(values):
    return round(sum(values),6) if values and all(v is not None for v in values) else None

def build_power_flows(root=ROOT):
    root=Path(root);meta_path=root/'data/sources/flows.json'
    if not meta_path.exists():return []
    meta=json.loads(meta_path.read_text());by_method={}
    for item in meta['files']:
        path=root/item['path'];raw=path.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=item['sha256']:raise ValueError(f'ČEPS snapshot checksum mismatch: {path}')
        if 'method' not in item:continue
        _,rows=parse_xml(gzip.decompress(raw));target=by_method.setdefault(item['method'],{})
        for row in rows:
            if row['time'] in target:raise ValueError(f'Duplicate ČEPS hour: {row["time"]}')
            target[row['time']]=row
    # Align on the requested interval, including explicit missing hours. UTC
    # iteration handles both the 23-hour and 25-hour Czech clock-change days.
    local=ZoneInfo('Europe/Prague')
    period=meta['requestedPeriod']
    start=dt.datetime.combine(dt.date.fromisoformat(period['start']),dt.time(),local).astimezone(dt.timezone.utc)
    stop=dt.datetime.combine(dt.date.fromisoformat(period['end'])+dt.timedelta(days=1),dt.time(),local).astimezone(dt.timezone.utc)
    expected=[];instant=start
    while instant<stop:
        expected.append(instant.isoformat().replace('+00:00','Z'));instant+=dt.timedelta(hours=1)
    for method,rows in by_method.items():
        if set(rows)-set(expected):raise ValueError(f'ČEPS returned out-of-range hours: {method}')
        by_method[method]={time:rows.get(time,{'time':time}) for time in expected}
    flow_rows=by_method['CrossborderPowerFlows'];datasets=[]
    common={'publisher':meta['publisher'],'url':meta['url'],'retrievedAt':meta['retrievedAt'],'methodology':meta['methodology'],'signConvention':meta['signConvention'],'documentation':meta['documentation'],'license':meta['license'],'rawInputs':[{k:item[k] for k in ('path','sha256')} for item in meta['files']]}
    common['documentationReference']=meta.get('documentationReference')
    common['aggregationScope']=FLOW_AGGREGATION
    common['methodology']+=' '+FLOW_AGGREGATION
    columns=[{'key':code,'label':NAMES[code],'unit':'MW','border':code,'direction':'net'} for code in BORDERS]
    for ident,flavour,title,kind in [('flows-physical','Actual','Fyzické přeshraniční toky ČR','physical_flow'),('flows-commercial','Planned','Obchodní výměna ČR · plánované toky ČEPS','commercial_exchange')]:
        records=[]
        for time,row in sorted(flow_rows.items()):
            values={code:complete_sum([row.get(f'{operator} {flavour} [MW]') for operator in operators]) for code,operators in BORDERS.items()}
            records.append({'time':time,**values})
        datasets.append({'id':ident,'title':title,'kind':kind,'unit':'MW','frequency':'hour','columns':columns,'records':records,'description':'Historický offline snapshot. Kladně dovoz do ČR, záporně vývoz. Německo = součet dvou profilů. '+('Skutečně naměřené toky; nikoli obchodní výměna.' if flavour=='Actual' else 'Plánované výměny mezi provozovateli. Nejde o fyzické toky ani o objemy obchodů na trhu OTE.')})
    physical={r['time']:r for r in datasets[0]['records']}
    generation=by_method['Generation'];load=by_method['Load'];records=[]
    for time in sorted(set(physical)|set(generation)|set(load)):
        g=generation.get(time,{});l=load.get(time,{});f=physical.get(time,{})
        gross=complete_sum([g.get(f'{key} [MW]') for key in ('TPP','CCGT','NPP','HPP','PsPP','AltPP','ApPP','WPP','PVPP')])
        border_values=[f.get(code) for code in BORDERS]
        imports=complete_sum([max(v,0) if v is not None else None for v in border_values]);exports=complete_sum([max(-v,0) if v is not None else None for v in border_values])
        demand=l.get('Load including pumping [MW]');without=l.get('Load [MW]')
        pumping=round(demand-without,6) if demand is not None and without is not None else None
        residual=round(gross+imports-exports-demand,6) if all(v is not None for v in (gross,imports,exports,demand)) else None
        records.append({'time':time,'generation':gross,'load':demand,'loadWithoutPumping':without,'pumping':pumping,'import':imports,'export':exports,'residual':residual})
    balance_columns=[{'key':key,'label':label,'unit':'MW'} for key,label in [('generation','Výroba brutto'),('load','Zatížení včetně čerpání'),('loadWithoutPumping','Zatížení bez čerpání'),('pumping','Čerpání'),('import','Dovoz — součet kladných hodinových sald zemí'),('export','Vývoz — součet záporných hodinových sald zemí'),('residual','Rozdíl výroba + dovoz − vývoz − zatížení')]]
    datasets.append({'id':'flows-balance','title':'Bilance elektřiny ČR · provozní hodinové hodnoty','kind':'electricity_balance','unit':'MW','frequency':'hour','columns':balance_columns,'records':records,'description':'Provozní data ČEPS: součet publikovaných typů výroby brutto, zatížení včetně/bez čerpání a hraniční toky. Rozdíl bilance je zobrazen samostatně: soubory mohou mít odlišné měřicí pokrytí a nejsou statistickou bilanční ročenkou. Výroba není dopočítána ze zatížení. '+FLOW_AGGREGATION})
    # Genuine generation mix is separately available for competition calculations.
    labels={'TPP':'Parní','CCGT':'Plynové a paroplynové','NPP':'Jaderné','HPP':'Vodní','PsPP':'Přečerpávací (výroba)','AltPP':'Alternativní','ApPP':'Závodní','WPP':'Větrné','PVPP':'Fotovoltaické'}
    generation_columns=[{'key':key,'label':label,'unit':'MW'} for key,label in labels.items()]
    datasets.append({'id':'flows-generation','title':'Výroba elektřiny ČR podle typu elektrárny','kind':'electricity_generation','unit':'MW','frequency':'hour','columns':generation_columns,'records':[{'time':time,**{key:row.get(f'{key} [MW]') for key in labels}} for time,row in sorted(generation.items())],'description':'Provozní brutto výroba ČEPS podle devíti typů elektráren; originální klasifikace zdroje, bez odhadování palivového mixu.'})
    for dataset in list(datasets):
        buckets={}
        for record in dataset['records']:buckets.setdefault(record['time'][:10],[]).append(record)
        daily=[]
        for date,hours in sorted(buckets.items()):
            complete=len(hours)==24 and {h['time'][11:13] for h in hours}=={f'{h:02}' for h in range(24)}
            daily.append({'time':date,**{c['key']:complete_sum([h.get(c['key']) for h in hours]) if complete else None for c in dataset['columns']},'availableHours':len(hours),'expectedHours':24})
        datasets.append({**dataset,'id':dataset['id']+'-daily','title':dataset['title']+' · denní energie','unit':'MWh','frequency':'day','columns':[{**c,'unit':'MWh'} for c in dataset['columns']],'records':daily,'description':dataset['description']+' Denní energie = součet úplných hodinových průměrů MW × 1 h v UTC dni; neúplné dny nebo chybějící profil mají null. U signed hraničních toků jde o čistou energii; souběžný dovoz/vývoz neodvozovat až z denního netta.'})
    descriptors=[];out=root/'public/data/databank'
    for dataset in datasets:
        records=dataset['records'];dataset.update(schemaVersion=1,timezone='UTC',status='snapshot',period={'start':records[0]['time'],'end':records[-1]['time'],'endExclusive':stop.isoformat().replace('+00:00','Z') if dataset['frequency']=='hour' else None},source=common,intervalDurationHours=1 if dataset['frequency']=='hour' else 24)
        dataset['coverage']={'rows':len(records),'availableValues':sum(r.get(c['key']) is not None for r in records for c in dataset['columns']),'expectedValues':len(records)*len(dataset['columns']),'missingPolicy':'null; žádná interpolace; neúplný den nemá energii'}
        write(out/(dataset['id']+'.json'),dataset)
        fields=['time']+[c['key'] for c in dataset['columns']]+(['availableHours','expectedHours'] if dataset['frequency']=='day' else [])
        csv_path=out/(dataset['id']+'.csv')
        write_dataset_csv(csv_path,dataset,fields)
        descriptors.append({key:dataset[key] for key in ('id','title','description','kind','unit','frequency','period','source','status','coverage','columns','timezone') }|{'rowCount':len(records),'path':dataset['id']+'.json','csv':dataset['id']+'.csv'})
    return descriptors

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');parser.add_argument('--start',default='2025-01-01');parser.add_argument('--end',default='2026-11-05');args=parser.parse_args()
    if args.download:download_power_flows(ROOT,args.start,args.end)
    print(json.dumps(build_power_flows(ROOT),ensure_ascii=False,indent=2))
