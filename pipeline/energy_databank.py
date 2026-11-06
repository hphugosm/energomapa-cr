"""Reproducible local energy series. Downloads are explicit; builds use pinned bytes only."""
import csv, gzip, hashlib, itertools, json, math, pathlib, urllib.parse, urllib.request
from csv_export import write_dataset_csv
from collections import defaultdict
from datetime import datetime, timezone

COUNTRIES={'CZ':'Česko','DE':'Německo','PL':'Polsko','SK':'Slovensko','AT':'Rakousko','EU27_2020':'EU 27'}
BASE='https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/'
MPO_URL='https://mpo.gov.cz/assets/cz/energetika/statistika/energeticke-bilance/2026/2/SEB_2010-2024.xlsx'
BALANCES={'PPRD':'Primární produkce','IMP':'Dovoz','EXP':'Vývoz','GAE':'Hrubá dostupná energie','GIC':'Hrubá domácí spotřeba','FC_E':'Konečná energetická spotřeba','FC_IND_E':'Průmysl','FC_TRA_E':'Doprava','FC_OTH_HH_E':'Domácnosti','GEP':'Hrubá výroba elektřiny','DL':'Distribuční ztráty'}

def dump(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')

def number(v):return float(v) if isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) else None

def download_energy_databank(root):
    root=pathlib.Path(root);folder=root/'data/raw/databank';folder.mkdir(parents=True,exist_ok=True)
    queries={
      'eurostat-balance':('nrg_bal_s',{'unit':'GWH','siec':['TOTAL','E7000']}),
      'eurostat-dependency':('nrg_ind_id',{'unit':'PC','siec':'TOTAL'}),
      'eurostat-renewables':('nrg_ind_ren',{'unit':'PC'})}
    manifest={'schemaVersion':1,'inputs':{}};pending={}
    for name,(code,filters) in queries.items():
        params={'lang':'EN','geo':list(COUNTRIES),'sinceTimePeriod':'2000',**filters}
        url=BASE+code+'?'+urllib.parse.urlencode(params,doseq=True)
        req=urllib.request.Request(url,headers={'User-Agent':'EnergoMapa educational offline snapshot builder'})
        with urllib.request.urlopen(req,timeout=120) as response:payload=response.read()
        data=json.loads(payload)
        if data.get('class')!='dataset' or not data.get('value'):raise ValueError('Empty Eurostat response '+code)
        name+='.json.gz';raw=gzip.compress(payload,mtime=0);pending[name]=raw
        manifest['inputs'][name]={'url':url,'publisher':'Eurostat','retrievedAt':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'dataset':code}
        print(name,len(payload),flush=True)
    with urllib.request.urlopen(MPO_URL,timeout=90) as response:payload=response.read()
    name='mpo-energy-balance.xlsx';pending[name]=payload
    manifest['inputs'][name]={'url':MPO_URL,'publisher':'MPO / ČSÚ','retrievedAt':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(payload).hexdigest(),'referencePage':'https://mpo.gov.cz/cz/energetika/statistika/energeticke-bilance/souhrnna-energeticka-bilance-statu-v-metodice-eurostatu-za-leta-2010_2024--290739/'}
    # Fetch and validate every response before replacing any pinned snapshot.
    for name,payload in pending.items():
        temporary=folder/(name+'.tmp');temporary.write_bytes(payload);temporary.replace(folder/name)
    dump(root/'data/sources/databank-inputs.json',manifest)

def jsonstat_rows(data):
    """Decode JSON-stat row-major sparse indexes, preserving status flags and nulls."""
    ids=data['id'];sizes=data['size'];keys=[]
    for key in ids:
        ix=data['dimension'][key]['category']['index']
        keys.append(sorted(ix,key=ix.get) if isinstance(ix,dict) else ix)
    vals=data['value'];flags=data.get('status',{})
    for index,coords in enumerate(itertools.product(*keys)):
        value=vals.get(str(index)) if isinstance(vals,dict) else vals[index]
        status=flags.get(str(index)) if isinstance(flags,dict) else flags[index] if index<len(flags) else None
        yield dict(zip(ids,coords)),number(value),status

def publish(root,ident,title,kind,unit,frequency,source,columns,records,**extra):
    if not records:raise ValueError('No records '+ident)
    numeric=[c['key'] for c in columns if c.get('type')=='number']
    missing=sum(r.get(k) is None for r in records for k in numeric)
    data={'schemaVersion':1,'id':ident,'title':title,'description':source['methodology'],'kind':kind,'unit':unit,'frequency':frequency,'timezone':'not applicable' if frequency in ('year','climatological_month') else 'UTC','period':{'start':records[0]['time'],'end':records[-1]['time']},'source':source,'columns':columns,'records':records,'coverage':{'rows':len(records),'numericCells':len(records)*len(numeric),'missingCells':missing},'status':'snapshot',**extra}
    out=root/'public/data/databank';dump(out/(ident+'.json'),data)
    write_dataset_csv(out/(ident+'.csv'),data)
    return {k:data[k] for k in ('id','title','kind','unit','frequency','period','source','status','coverage')}|{'rowCount':len(records),'path':ident+'.json','csv':ident+'.csv'}

def cols(labels,unit):return [{'key':k,'label':label,'type':'number','unit':unit} for k,label in labels.items()]

def build_energy_databank(root):
    root=pathlib.Path(root);meta=json.loads((root/'data/sources/databank-inputs.json').read_text())['inputs'];result=[]
    def raw(name):
        p=root/'data/raw/databank'/name
        if hashlib.sha256(p.read_bytes()).hexdigest()!=meta[name]['sha256']:raise ValueError('Databank checksum mismatch '+name)
        return json.loads(gzip.decompress(p.read_bytes()))
    def source(name,method):
        if name.startswith('eurostat'):
            return meta[name]|{'methodology':method,'license':'Eurostat reuse policy; acknowledge Eurostat and identify transformations.','licenseUrl':'https://ec.europa.eu/eurostat/help/copyright-notice','attribution':'Source: Eurostat; EnergoMapa selection and processing.','snapshotNote':'Lokální historický snapshot; nejde o aktuální měření.'}
        return meta[name]|{'methodology':method,'license':'Eurostat reuse policy' if name.startswith('eurostat') else 'Public official statistical publication','snapshotNote':'Lokální historický snapshot; nejde o aktuální měření.'}
    balances=raw('eurostat-balance.json.gz');rows=list(jsonstat_rows(balances))
    for balance,label in BALANCES.items():
        # GEP/TOTAL is the reported gross electricity output across all fuel inputs.
        fuel='TOTAL'
        selected=[(dims,v,flag) for dims,v,flag in rows if dims['nrg_bal']==balance and dims['siec']==fuel]
        records={}
        flags=[]
        for dims,v,flag in selected:
            records.setdefault(dims['time'],{'time':dims['time'],**{g:None for g in COUNTRIES}})[dims['geo']]=v
            if flag:flags.append({'time':dims['time'],'geo':dims['geo'],'flag':flag})
        if not any(number(r[g]) is not None for r in records.values() for g in COUNTRIES):continue
        method=f'Eurostat nrg_bal_s; freq=A, nrg_bal={balance}, siec={fuel}, unit=GWH; hodnoty jednotlivých států a EU27 se nesčítají. Zachovány chybějící buňky null a příznaky kvality zdroje. Roční energie v GWh není výkon v MW.'
        result.append(publish(root,'eurostat-'+balance.lower(),label+' — evropské srovnání','energy_balance','GWh','year',source('eurostat-balance.json.gz',method),cols(COUNTRIES,'GWh'),[records[t] for t in sorted(records)],qualityFlags=flags))
    for balance,label in {'IMP':'Dovoz elektřiny','EXP':'Vývoz elektřiny','FC_E':'Konečná spotřeba elektřiny','DL':'Distribuční ztráty elektřiny'}.items():
        records={};flags=[]
        for dims,v,flag in rows:
            if dims['nrg_bal']!=balance or dims['siec']!='E7000':continue
            records.setdefault(dims['time'],{'time':dims['time'],**{g:None for g in COUNTRIES}})[dims['geo']]=v
            if flag:flags.append({'time':dims['time'],'geo':dims['geo'],'flag':flag})
        method=f'Eurostat nrg_bal_s; nrg_bal={balance}, siec=E7000, unit=GWH, roční elektřina. Statistická energetická bilance, nikoli směrové přeshraniční výkonové toky nebo obchodní plány. EU27 se nesčítá s členskými státy; null není nula.'
        result.append(publish(root,'eurostat-electricity-'+balance.lower(),label+' — evropské srovnání','electricity_balance','GWh','year',source('eurostat-balance.json.gz',method),cols(COUNTRIES,'GWh'),[records[t] for t in sorted(records)],qualityFlags=flags))
    for name,filter_key,filter_value,title,ident in [('eurostat-dependency.json.gz',None,None,'Energetická dovozní závislost','eurostat-import-dependency'),('eurostat-renewables.json.gz','nrg_bal','REN','Podíl obnovitelných zdrojů — celkem','eurostat-renewables'),('eurostat-renewables.json.gz','nrg_bal','REN_ELC','Podíl OZE v hrubé konečné spotřebě elektřiny','eurostat-renewable-electricity'),('eurostat-renewables.json.gz','nrg_bal','REN_HEAT_CL','Podíl OZE ve vytápění a chlazení','eurostat-renewable-heat'),('eurostat-renewables.json.gz','nrg_bal','REN_TRA','Podíl OZE v dopravě','eurostat-renewable-transport')]:
        records={};flags=[]
        for dims,v,flag in jsonstat_rows(raw(name)):
            if filter_key and dims[filter_key]!=filter_value:continue
            records.setdefault(dims['time'],{'time':dims['time'],**{g:None for g in COUNTRIES}})[dims['geo']]=v
            if flag:flags.append({'time':dims['time'],'geo':dims['geo'],'flag':flag})
        method=('Čistý dovoz / hrubá dostupná energie × 100; záporné hodnoty jsou přípustné. ' if not filter_key else f'Oficiální indikátor {filter_value} dle metodiky SHARES; normalizovaná výroba z vody a větru, specifická pravidla pro dopravu; není prostým podílem vyrobené elektřiny. ' )+'Eurostat, roční hodnoty v procentech. Chybějící údaje jsou null; bez interpolace.'
        result.append(publish(root,ident,title,'energy_indicator','%','year',source(name,method),cols(COUNTRIES,'%'),[records[t] for t in sorted(records)],qualityFlags=flags))
    result.extend(build_mpo(root,meta))
    result.extend(build_pvgis(root))
    result.extend(build_eea(root))
    return result

def build_mpo(root,meta):
    import openpyxl
    name='mpo-energy-balance.xlsx';p=root/'data/raw/databank'/name
    if hashlib.sha256(p.read_bytes()).hexdigest()!=meta[name]['sha256']:raise ValueError('MPO checksum mismatch')
    workbook=openpyxl.load_workbook(p,read_only=True,data_only=True);records=[];labels={};flags=[]
    for year in range(2010,2025):
        sheet=workbook[f'{year}-SB'];record={'time':str(year)}
        assert sheet.cell(5,1).value=='TJ' and sheet.cell(2,9).value=='Celkem'
        for row in sheet.values:
            key=row[7]
            if key not in BALANCES:continue
            if key in record:raise ValueError('MPO duplicate balance row '+key)
            labels[key]=BALANCES[key];record[key]=number(row[8])
            if record[key] is None and row[8] is not None:flags.append({'time':str(year),'column':key,'flag':str(row[8])})
        records.append(record)
    workbook.close()
    source=meta[name]|{'methodology':'MPO a ČSÚ: Souhrnná energetická bilance 2010–2024; původní listy YYYY-SB, sloupec I Celkem, kód bilance ve sloupci H. Jednotka TJ ověřena v buňce A5. Pouze číselné hodnoty, textové značky zachovány v qualityFlags a hodnota null. Bilance zahrnuje všechna paliva, ne pouze elektřinu. Převody TJ / 3,6 = GWh; PJ = TJ / 1000. Žádné doplnění chybějících hodnot.'}
    return [publish(root,'mpo-czech-energy-balance','MPO / ČSÚ — celková energetická bilance ČR','energy_balance','TJ','year',source,cols(labels,'TJ'),records,qualityFlags=flags)]

def build_pvgis(root):
    territories=json.loads((root/'public/data/territories.json').read_text())['territories'];municipalities=[t for t in territories if t['level']=='municipality'];config=json.loads((root/'data/sources/pvgis.json').read_text());labels={'CZ':'Česko'}|{t['id']:t['name'] for t in territories if t['level']=='region'}
    sums={m:defaultdict(float) for m in range(1,13)};areas=defaultdict(float);retrieved=[]
    for t in municipalities:
        path=root/'data/raw/pvgis'/(t['id']+'.json.gz');payload=path.read_bytes()
        if hashlib.sha256(payload).hexdigest()!=config['rawSha256'][path.name]:raise ValueError('PVGIS databank checksum mismatch')
        envelope=json.loads(gzip.decompress(payload));retrieved.append(envelope['retrievedAt']);monthly=envelope['response']['outputs']['monthly']['fixed']
        if sorted(x['month'] for x in monthly)!=list(range(1,13)):raise ValueError('Incomplete PVGIS months')
        for key in ('CZ',t['regionId']):
            areas[key]+=t['areaKm2']
            for x in monthly:sums[x['month']][key]+=x['E_m']*t['areaKm2']
    records=[{'time':f'{m:02d}',**{k:round(sums[m][k]/areas[k],6) for k in labels}} for m in range(1,13)]
    source=config['source']|{'publisher':'European Commission JRC','retrievedAt':max(retrieved),'rawChecksumManifest':'data/sources/pvgis.json','methodology':'PVGIS 5.3 SARAH3, klimatický průměr 2005–2023, měsíční E_m modelované výroby pro 1 kWp. 6 258 centroidových modelů, průměr vážený rozlohou obcí. 1 kWp, ztráty 14 %, krystalický křemík, jih, optimální sklon. Měsíce 01–12 jsou klimatologie, nikoli kalendářní časová řada ani skutečně naměřená výroba. Není odhad celkového výrobního potenciálu území.'}
    return [publish(root,'pvgis-monthly-potential','PVGIS — měsíční model výroby 1 kWp podle krajů','solar_model','kWh/kWp','climatological_month',source,cols(labels,'kWh/kWp'),records,modelled=True,referencePeriod={'start':'2005','end':'2023'})]

def build_eea(root):
    from industry import normalize_row
    config=json.loads((root/'data/sources/industry.json').read_text());path=root/'data/raw/industry/F1_4_Air_Releases_Facilities_CZ.csv.gz'
    if hashlib.sha256(path.read_bytes()).hexdigest()!=config['rawSha256'][path.name]:raise ValueError('EEA databank checksum mismatch')
    selected={}
    with gzip.open(path,'rt',encoding='utf-8-sig',newline='') as stream:
        for original in csv.DictReader(stream):
            r=normalize_row(original)
            if r['pollutantName']!='Carbon dioxide (CO2)' or r.get('confidentialityReason'):continue
            if r['unit']!='kg' or r['countryCode']!='CZ':raise ValueError('EEA invalid scope')
            key=(str(r['reportingYear']),r['facilityId'])
            val=float(r['emissions'])/1000
            if not math.isfinite(val) or val<0:raise ValueError('EEA invalid amount')
            if key in selected and selected[key]!=val:raise ValueError('EEA conflicting duplicate')
            selected[key]=val
    yearly=defaultdict(list)
    for (year,fid),value in selected.items():yearly[year].append(value)
    source=config['source']|{'publisher':'EEA','rawSha256':config['rawSha256'][path.name],'methodology':'E-PRTR v16: všechny české neanonymní provozovny ohlašující Carbon dioxide (CO2), pouze ovzduší. Deduplikace facilityId/rok, kg / 1000 = t. Součet obsahuje i hlášení bez bezpečné lokalizace do obce a proto se může lišit od mapové vrstvy. Celkové CO₂ včetně biomasy; nezahrnuje všechna zařízení ani celostátní inventář emisí. Chybějící hlášení nejsou nuly.'}
    out=[]
    for key,title,unit,fn in [('emissions_tonnes','EEA — ohlášené průmyslové emise CO₂ v ČR','t CO₂',sum),('facilities','EEA — počet českých provozoven ohlašujících CO₂','provozoven',len)]:
        records=[{'time':y,'CZ':fn(yearly[y])} for y in sorted(yearly)]
        out.append(publish(root,'eea-'+key.replace('_','-'),title,'industrial_emissions',unit,'year',source,cols({'CZ':'Česko'},unit),records))
    return out

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');args=parser.parse_args();root=pathlib.Path(__file__).resolve().parents[1]
    if args.download:download_energy_databank(root)
    else:print(json.dumps(build_energy_databank(root),ensure_ascii=False,indent=2))
