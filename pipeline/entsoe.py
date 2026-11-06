"""European electricity snapshots via explicitly attributed Energy-Charts republisher."""
import gzip, hashlib, json, pathlib, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from energy_databank import dump, number, publish, cols

COUNTRIES={'CZ':'Česko','DE':'Německo','AT':'Rakousko','PL':'Polsko','SK':'Slovensko'}
ENDPOINT='https://api.energy-charts.info/v2/public_power'
START='2025-07-01';END='2025-07-07'
EXCLUDED={'cross_border_electricity_trading','renewable_share_of_load','renewable_share_of_generation','residual_load'}

def download_entsoe(root):
    root=pathlib.Path(root);pending={};meta={'schemaVersion':1,'inputs':{}}
    for country in COUNTRIES:
        name='entsoe-energycharts-'+country.lower()+'.json.gz'
        url=ENDPOINT+'?'+urllib.parse.urlencode({'country':country.lower(),'start':START,'end':END})
        req=urllib.request.Request(url,headers={'User-Agent':'EnergoMapa educational offline historical electricity snapshot'})
        with urllib.request.urlopen(req,timeout=90) as response:payload=response.read()
        d=json.loads(payload);validate(d,country)
        raw=gzip.compress(payload,mtime=0);pending[name]=raw
        meta['inputs'][name]={'publisher':'Fraunhofer ISE / Energy-Charts.info','url':url,'upstreamPublisher':'ENTSO-E Transparency Platform (plus Energy-Charts processing and supplementary sources)','upstreamUrl':'https://transparency.entsoe.eu/','attributionUrl':f'https://energy-charts.info/charts/power/chart.htm?c={country}&l=en&year=2025&week=27','apiDocumentation':'https://api.energy-charts.info/','license':d.get('license'),'retrievedAt':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(raw).hexdigest(),'country':country,'sourceResolution':d['resolution'],'sourceTimezone':d['timezone'],'sourceGeneratedAt':d.get('generated_at'),'access':'Public republished series; not a direct authenticated ENTSO-E API retrieval.'}
        print(name,len(d['data']),d['resolution'],flush=True)
    folder=root/'data/raw/databank';folder.mkdir(parents=True,exist_ok=True)
    for name,raw in pending.items():
        p=folder/(name+'.tmp');p.write_bytes(raw);p.replace(folder/name)
    dump(root/'data/sources/entsoe-inputs.json',meta)

def validate(d,country):
    if d.get('unit')!='MW' or d.get('country','').lower()!=country.lower() or not d.get('data'):raise ValueError('Unexpected Energy-Charts response '+country)
    if d.get('interval_minutes') not in (15,30,60):raise ValueError('Unexpected interval')
    parsed=[datetime.fromisoformat(r['timestamp']) for r in d['data']]
    if any(t.utcoffset() is None for t in parsed):raise ValueError('Naive timestamp cannot be converted safely')
    stamps=[t.astimezone(timezone.utc) for t in parsed]
    if any(s.utcoffset() is None for s in stamps) or len(stamps)!=len(set(stamps)) or stamps!=sorted(stamps):raise ValueError('Invalid interval chronology')
    if any((b-a).total_seconds()!=d['interval_minutes']*60 for a,b in zip(stamps,stamps[1:])):raise ValueError('Source interval gaps; preserve and inspect before publishing')

def utc_stamp(timestamp):return datetime.fromisoformat(timestamp).astimezone(timezone.utc).isoformat().replace('+00:00','Z')

def daily_integrals(data,keys):
    """Integrate only complete UTC days; partial edge days are intentionally excluded."""
    step=data['interval_minutes'];days={}
    for r in data['data']:
        time=utc_stamp(r['timestamp']);day=time[:10];days.setdefault(day,[]).append(r)
    result=[]
    for day,rows in sorted(days.items()):
        if len(rows)!=1440//step:continue
        result.append({'time':day,**{k:round(sum(number(r['values'].get(k)) for r in rows)*step/60,6) if all(number(r['values'].get(k)) is not None for r in rows) else None for k in keys}})
    return result

def build_entsoe(root):
    root=pathlib.Path(root);meta=json.loads((root/'data/sources/entsoe-inputs.json').read_text())['inputs'];out=[];load_records={};sources=[]
    for country,label in COUNTRIES.items():
        name='entsoe-energycharts-'+country.lower()+'.json.gz';p=root/'data/raw/databank'/name;raw=p.read_bytes()
        if hashlib.sha256(raw).hexdigest()!=meta[name]['sha256']:raise ValueError('European snapshot checksum mismatch '+name)
        d=json.loads(gzip.decompress(raw));validate(d,country)
        labels={s['id']:s['name'] for s in d['series'] if s['id'] not in EXCLUDED and s.get('unit','MW')=='MW'}
        source=meta[name]|{'methodology':'Veřejná čistá výroba elektřiny podle zdroje a zatížení; republikováno Fraunhofer ISE / Energy-Charts.info z ENTSO-E a doplňkových zdrojů. Není přímým stažením autentizovaného API ENTSO-E. Energy-Charts může data upravovat a doplňovat (např. fotovoltaika); nejde o nezávislé měření ani záruku identické revize ENTSO-E. Časové značky jsou začátky intervalů, převedené z původní místní zóny na UTC. Původní jednotka MW: intervalový průměrný výkon; nikoli MWh. Procentní podíly, reziduální zatížení a agregát obchodu se do výrobního mixu nesčítají. Čerpání přečerpávacích elektráren je spotřeba, ne kladná výroba. null není nula.'}
        records=[{'time':utc_stamp(r['timestamp']),**{k:number(r['values'].get(k)) for k in labels}} for r in d['data']]
        hourly={}
        for r in records:hourly.setdefault(r['time'][:13]+':00:00Z',[]).append(r.get('load'))
        for stamp,values in hourly.items():
            complete=len(values)==60//d['interval_minutes'] and all(v is not None for v in values)
            load_records.setdefault(stamp,{'time':stamp,**{c:None for c in COUNTRIES}})[country]=round(sum(values)/len(values),6) if complete else None
        descriptor=publish(root,'entsoe-public-power-'+country.lower(),f'Evropská elektřina — {label}: výroba a zatížení','european_power','MW','15min' if d['interval_minutes']==15 else str(d['interval_minutes'])+'min',source,cols(labels,'MW'),records,intervalMinutes=d['interval_minutes'],upstream='ENTSO-E via Energy-Charts')
        out.append(descriptor);sources.append(source)
        integrated=daily_integrals(d,list(labels))
        daily_source=source|{'methodology':source['methodology']+' Denní energie MWh = součet intervalových průměrných MW × interval_minutes / 60. Pouze úplné dny UTC, přítomny všechny intervaly; jakýkoliv null ve sloupci znamená null denního součtu. Dva neúplné krajní dny při převodu místního týdne na UTC nejsou vydávány jako úplné dny.'}
        out.append(publish(root,'entsoe-daily-energy-'+country.lower(),f'Evropská elektřina — {label}: denní energie','european_energy','MWh','day',daily_source,cols(labels,'MWh'),integrated,intervalMinutes=d['interval_minutes'],upstream='ENTSO-E via Energy-Charts'))
    source={'publisher':'Fraunhofer ISE / Energy-Charts.info','upstreamPublisher':'ENTSO-E and supplementary Energy-Charts sources','url':'https://api.energy-charts.info/','upstreamUrl':'https://transparency.entsoe.eu/','retrievedAt':max(s['retrievedAt'] for s in sources),'license':'CC BY 4.0; attribution Energy-Charts.info','methodology':'Porovnání publikovaného zatížení ČR, Německa, Rakouska, Polska a Slovenska. Hodinový průměr MW: z původních 15min hodnot pouze při přítomnosti všech čtyř intervalů; slovenská nativní hodinová řada beze změny. Žádná interpolace. UTC začátky hodin. Původ jednotlivých národních řad a SHA-256 jsou v sources. Jednotka MW, nikoli MWh. Nesčítá se s výrobním mixem. Historický týden 1.–7. července 2025 v místních zónách, nikoli aktuální data. Chybějící hodnoty null. Republikované hodnoty Energy-Charts s upstream ENTSO-E; nikoli přímý přístup k Transparency API.'}
    out.append(publish(root,'entsoe-load-comparison','Evropská elektřina — porovnání zatížení pěti zemí','european_power','MW','hour',source,cols(COUNTRIES,'MW'),[load_records[t] for t in sorted(load_records)],sources=sources))
    return out

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');args=parser.parse_args();root=pathlib.Path(__file__).resolve().parents[1]
    if args.download:download_entsoe(root)
    else:print(json.dumps(build_entsoe(root),ensure_ascii=False,indent=2))
