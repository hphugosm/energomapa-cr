"""Pinned PVGIS 5.3 SARAH3 municipal models. Offline builds never contact JRC."""
import concurrent.futures
import gzip
import hashlib
import json
import math
import pathlib
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ENDPOINT='https://re.jrc.ec.europa.eu/api/v5_3/PVcalc'
PARAMETERS={'peakpower':1,'loss':14,'optimalinclination':1,'aspect':0,'pvtechchoice':'crystSi','mountingplace':'free','raddatabase':'PVGIS-SARAH3','usehorizon':1,'outputformat':'json'}
CONFIG={'solar_potential_kwh_kwp_year':('Modelová roční výroba FVE na 1 kWp','kWh/kWp/rok','E_y'), 'annual_irradiation_kwh_m2':('Roční ozáření optimálně nakloněné roviny','kWh/m²/rok','H(i)_y'), 'optimal_slope_deg':('Optimální sklon FVE k jihu','°',None)}

def request_parameters(territory):
    centroid=territory['centroid']
    lon,lat=(centroid['lon'],centroid['lat']) if isinstance(centroid,dict) else centroid
    if not (math.isfinite(lon) and math.isfinite(lat) and 12<lon<19 and 48<lat<52): raise ValueError('Invalid Czech WGS84 centroid')
    return dict(PARAMETERS,lat=round(lat,7),lon=round(lon,7))

def validate_response(response, parameters):
    inputs=response['inputs']; meteo=inputs['meteo_data']; module=inputs['pv_module']; fixed=inputs['mounting_system']['fixed']
    if (meteo['radiation_db']!='PVGIS-SARAH3' or meteo['year_min']!=2005 or meteo['year_max']!=2023
        or module['peak_power']!=1 or module['system_loss']!=14 or module['technology']!='c-Si'
        or not meteo['use_horizon'] or fixed['azimuth']['value']!=0 or not fixed['slope']['optimal']
        or fixed['type']!='free-standing'): raise ValueError('PVGIS model input drift')
    for key,param in [('latitude','lat'),('longitude','lon')]:
        if abs(inputs['location'][key]-parameters[param])>0.000001: raise ValueError('PVGIS location mismatch')
    totals=response['outputs']['totals']['fixed']
    values={ident:totals[key] if key else fixed['slope']['value'] for ident,(_,_,key) in CONFIG.items()}
    if any(not isinstance(v,(int,float)) or not math.isfinite(v) or v<=0 for v in values.values()): raise ValueError('Invalid PVGIS result')
    if not 0<values['optimal_slope_deg']<90: raise ValueError('Invalid PV slope')
    return values

def cache_path(root, code): return pathlib.Path(root)/'data/raw/pvgis'/f'{code}.json.gz'

def read_cache(path, parameters):
    envelope=json.loads(gzip.decompress(path.read_bytes()))
    if envelope['parameters']!=parameters or envelope['endpoint']!=ENDPOINT: raise ValueError('Stale PVGIS request cache')
    validate_response(envelope['response'],parameters)
    return envelope

class RateLimiter:
    def __init__(self, rate): self.delay=1/rate; self.lock=threading.Lock(); self.next=0
    def wait(self):
        with self.lock:
            now=time.monotonic(); wait=max(0,self.next-now); self.next=max(now,self.next)+self.delay
        if wait: time.sleep(wait)

def download_potential(territories, root, workers=8, rate=5):
    """Resume exact-coordinate cache; max 5 requests/sec by default (JRC limit 30).
    Retry429/529/5xx and network errors; fail visibly if any municipality fails.
    """
    if not 1<=workers<=16 or not 0<rate<=10: raise ValueError('Polite rate/workers bounds exceeded')
    municipalities=[t for t in territories if t['level']=='municipality']; limiter=RateLimiter(rate)
    folder=pathlib.Path(root)/'data/raw/pvgis'; folder.mkdir(parents=True,exist_ok=True)
    def fetch(t):
        params=request_parameters(t); path=cache_path(root,t['id'])
        if path.exists(): read_cache(path,params); return
        url=ENDPOINT+'?'+urllib.parse.urlencode(params)
        for attempt in range(7):
            limiter.wait()
            try:
                req=urllib.request.Request(url,headers={'User-Agent':'EnergoMapa/0.4 public educational offline data builder'})
                with urllib.request.urlopen(req,timeout=90) as stream: response=json.load(stream)
                validate_response(response,params)
                envelope={'municipalityId':t['id'],'endpoint':ENDPOINT,'parameters':params,'coordinateReference':'EPSG:4326; longitude,latitude; geometric centroid of original EPSG:5514 municipal polygon transformed to WGS84','retrievedAt':datetime.now(timezone.utc).isoformat(),'response':response}
                payload=gzip.compress(json.dumps(envelope,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode(),mtime=0)
                temporary=path.with_suffix('.tmp'); temporary.write_bytes(payload); temporary.replace(path); return
            except urllib.error.HTTPError as exc:
                if exc.code not in (429,500,502,503,504,529) or attempt==6: raise
                time.sleep(max(float(exc.headers.get('Retry-After',0) or 0),min(60,2**attempt)))
            except (urllib.error.URLError,TimeoutError,OSError):
                if attempt==6: raise
                time.sleep(min(60,2**attempt))
    failures={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        jobs={pool.submit(fetch,t):t['id'] for t in municipalities}
        for index,job in enumerate(concurrent.futures.as_completed(jobs),1):
            try: job.result()
            except Exception as exc: failures[jobs[job]]=str(exc)
            if index%100==0: print(f'PVGIS {index}/{len(jobs)} failures={len(failures)}',flush=True)
    if failures: raise RuntimeError(f'PVGIS incomplete download: {json.dumps(failures)}')
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.glob('*.json.gz'))}
    meta_path=pathlib.Path(root)/'data/sources/pvgis.json'; meta=json.loads(meta_path.read_text()); meta['rawSha256']=hashes
    meta['source']['retrievedAt']=datetime.now(timezone.utc).date().isoformat()
    meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    return hashes

def build_potential(territories, root):
    root=pathlib.Path(root); meta=json.loads((root/'data/sources/pvgis.json').read_text()); municipalities=[t for t in territories if t['level']=='municipality']
    values={key:{} for key in CONFIG}; missing=[]
    for t in municipalities:
        path=cache_path(root,t['id'])
        if not path.exists(): missing.append(t['id']); continue
        if hashlib.sha256(path.read_bytes()).hexdigest()!=meta['rawSha256'].get(path.name): raise ValueError('PVGIS checksum mismatch')
        envelope=read_cache(path,request_parameters(t)); parsed=validate_response(envelope['response'],envelope['parameters'])
        if envelope['municipalityId']!=t['id']: raise ValueError('PVGIS municipality mismatch')
        for key,value in parsed.items(): values[key][t['id']]=value
    if missing: raise ValueError(f'PVGIS incomplete municipal coverage: {len(missing)} missing: {missing[:10]}')
    metrics=[]; datasets={}
    for ident,(name,unit,_) in CONFIG.items():
        metrics.append({'id':ident,'name':name,'unit':unit,'category':'potential','geography':['country','region','municipality'],'years':[2023],'timeType':'static','modelled':True,'referencePeriod':'2005–2023','colorScale':'solar','normalizations':['absolute'],'path':f'metrics/{ident}.json','status':'verified','source':meta['source'],'aggregation':'area_weighted_mean','coverage':'complete','profile':True})
        datasets[ident]={'schemaVersion':1,'metricId':ident,'status':'verified','values':{'2023':values[ident]}}
    audit={'municipalities':len(municipalities),'modelledMunicipalities':len(values[next(iter(CONFIG))]),'missingMunicipalities':missing,'referencePeriod':'2005–2023','modelParameters':PARAMETERS,'coordinateMethod':'Geometric centroid in original EPSG:5514 geometry; transformed to EPSG:4326','aggregation':'Municipal-area-weighted mean, not sum; centroid model is not a rooftop assessment.'}
    return metrics,datasets,audit,[]

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(); parser.add_argument('--download',action='store_true'); parser.add_argument('--territories',type=pathlib.Path,required=True); parser.add_argument('--root',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]); args=parser.parse_args()
    territories=json.loads(args.territories.read_text()); territories=territories.get('territories',territories) if isinstance(territories,dict) else territories
    if args.download: download_potential(territories,args.root)
    else: print(json.dumps(build_potential(territories,args.root)[2],ensure_ascii=False))
