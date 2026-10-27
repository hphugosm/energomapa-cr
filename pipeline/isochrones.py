"""Real road-network isochrones: explicit bounded download, reproducible offline build."""
import argparse
import gzip
import hashlib
import json
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from shapely.geometry import shape

ROOT=pathlib.Path(__file__).resolve().parents[1]
DEMO='https://valhalla1.openstreetmap.de/isochrone'
CODES=['554782','582786','554821','554791','563889','500496','544256','569810','555134','554804','554961','585068','586846','562335']
MINUTES=[15,30,60]

def origins(territories):
    by_id={t['id']:t for t in territories}
    return [dict(id=c,municipalityCode=c,name=by_id[c]['name'],**by_id[c]['centroid'],coordinateMethod='Geometric municipal centroid EPSG:5514 transformed to EPSG:4326; network snapping by Valhalla') for c in CODES]

def parameters(origin,minutes=MINUTES):
    if not minutes or any(not isinstance(x,(int,float)) or not 0<x<=120 for x in minutes) or len(minutes)>4: raise ValueError('Unsupported contour times')
    if not -90<=origin['lat']<=90 or not -180<=origin['lon']<=180: raise ValueError('Invalid origin')
    return {'locations':[{'lat':origin['lat'],'lon':origin['lon']}],'costing':'auto','contours':[{'time':x} for x in sorted(set(minutes))],'polygons':True,'denoise':1,'generalize':100,'show_locations':False}

def validate_geojson(data,minutes):
    if data.get('type')!='FeatureCollection' or not isinstance(data.get('features'),list): raise ValueError('Invalid isochrone collection')
    seen=set()
    for f in data['features']:
        if f.get('type')!='Feature' or f.get('geometry',{}).get('type') not in ('Polygon','MultiPolygon'): raise ValueError('Isochrone must be a network polygon')
        p=f.get('properties',{}); contour=p.get('contour')
        if p.get('metric')!='time' or contour not in minutes or contour in seen: raise ValueError('Invalid/duplicate contour')
        geom=shape(f['geometry'])
        if geom.is_empty or not geom.is_valid or geom.area<=0: raise ValueError('Invalid isochrone geometry')
        if geom.bounds[0]<-180 or geom.bounds[2]>180 or geom.bounds[1]<-90 or geom.bounds[3]>90: raise ValueError('Invalid geographic coordinates')
        seen.add(contour)
    if seen!=set(minutes): raise ValueError('Missing isochrone contour')
    return data

def download_isochrones(root=ROOT,endpoint=DEMO,origin_list=None,minutes=MINUTES,interval=5):
    """Serial small-city batch only on demo. Use own server for larger/arbitrary batches."""
    root=pathlib.Path(root)
    if origin_list is None: origin_list=origins(json.loads((root/'public/data/territories.json').read_text())['territories'])
    if endpoint==DEMO and (len(origin_list)>14 or max(minutes)>60 or interval<5): raise ValueError('Demo allows only bounded 14-city batch, <=60 minutes, >=5 second spacing')
    folder=root/'data/raw/isochrones';folder.mkdir(parents=True,exist_ok=True)
    for origin in origin_list:
        params=parameters(origin,minutes);path=folder/f"{origin['id']}.json.gz"
        if path.exists():
            cached=json.loads(gzip.decompress(path.read_bytes()))
            if cached['parameters']!=params or cached['endpoint']!=endpoint: raise ValueError('Stale isochrone cache')
            validate_geojson(cached['response'],minutes);continue
        url=endpoint+'?json='+urllib.parse.quote(json.dumps(params,separators=(',',':')))
        request=urllib.request.Request(url,headers={'User-Agent':'EnergoMapa-educational-MVP/0.5 bounded offline city precomputation','X-Client-Id':'energomapa-educational-mvp'})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request,timeout=120) as response: result=json.load(response)
                validate_geojson(result,minutes);break
            except urllib.error.HTTPError as exc:
                if exc.code not in (429,500,502,503,504) or attempt==2: raise
                time.sleep(max(15,5*2**attempt))
        envelope={'origin':origin,'parameters':params,'endpoint':endpoint,'retrievedAt':datetime.now(timezone.utc).isoformat(),'response':result,'attribution':'© OpenStreetMap contributors · Valhalla / FOSSGIS e.V.','networkSnapshot':'Provider graph snapshot not reported by this response; archived polygons are pinned, live reruns may change.'}
        payload=gzip.compress(json.dumps(envelope,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode(),mtime=0)
        temp=path.with_suffix('.tmp');temp.write_bytes(payload);temp.replace(path)
        print(origin['name'],len(payload),flush=True);time.sleep(interval)
    meta_path=root/'data/sources/isochrones.json';meta=json.loads(meta_path.read_text())
    meta['rawSha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(folder.glob('*.json.gz'))}
    meta['source']['retrievedAt']=datetime.now(timezone.utc).date().isoformat();meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
    return build_isochrones(root)

def build_isochrones(root=ROOT):
    """Validate pinned provider polygons and publish static lazy city files. No network."""
    root=pathlib.Path(root);meta=json.loads((root/'data/sources/isochrones.json').read_text());out=root/'public/data/isochrones';out.mkdir(parents=True,exist_ok=True)
    index=[]
    for name,digest in sorted(meta['rawSha256'].items()):
        path=root/'data/raw/isochrones'/name
        if hashlib.sha256(path.read_bytes()).hexdigest()!=digest: raise ValueError('Isochrone checksum mismatch')
        cache=json.loads(gzip.decompress(path.read_bytes()));origin=cache['origin'];minutes=[x['time'] for x in cache['parameters']['contours']]
        if cache['parameters']!=parameters(origin,minutes): raise ValueError('Isochrone model parameters drift')
        data=validate_geojson(cache['response'],minutes)
        result={'type':'FeatureCollection','features':[],'source':dict(meta['source'],retrievedAt=cache['retrievedAt']),'origin':origin}
        for f in sorted(data['features'],key=lambda f:-f['properties']['contour']):
            result['features'].append(dict(f,properties=dict(f['properties'],originId=origin['id'],originName=origin['name'],minutes=f['properties']['contour'])))
        payload=(json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n').encode();target=out/f"{origin['id']}.geojson";target.write_bytes(payload)
        index.append(dict(origin,path=target.name,minutes=minutes,sha256=hashlib.sha256(payload).hexdigest()))
    if not index: raise ValueError('No pinned network isochrones')
    if 'expectedOriginCodes' in meta and {o['id'] for o in index}!=set(meta['expectedOriginCodes']): raise ValueError('Incomplete pinned isochrone origins')
    manifest={'schemaVersion':1,'costing':'auto','minutes':sorted({m for o in index for m in o['minutes']}),'origins':index,'source':meta['source'],'limitations':meta['limitations'],'optionalMinutes':[120]}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
    return manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');parser.add_argument('--endpoint',default=DEMO);parser.add_argument('--root',type=pathlib.Path,default=ROOT);args=parser.parse_args()
    print(json.dumps(download_isochrones(args.root,args.endpoint) if args.download else build_isochrones(args.root),ensure_ascii=False))
