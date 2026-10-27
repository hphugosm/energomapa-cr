"""MPO snapshot: preserve every reported row; never resolve duplicate identities by guess."""
import gzip, hashlib, io, json, math, os, re, tempfile
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen
import openpyxl
from shapely.geometry import Point
from shapely.strtree import STRtree
from pyproj import Transformer

AS_OF='2026-09-30'
CONFIG={'ev_charging_stations':('Dobíjecí stanice – záznamy MPO','evidovaných stanic','stations'), 'ev_charging_points':('Dobíjecí body – hlášené MPO','evidovaných bodů','points'), 'ev_charging_power_kw':('Dobíjecí stanice – nominální max. výkon MPO','kW','powerKw')}

def number(value):
    if isinstance(value,bool): raise ValueError('Boolean numeric cell')
    value=float(re.sub(r'[NE]$','',str(value).strip()).replace(',','.'))
    if not math.isfinite(value) or value<0: raise ValueError('Invalid numeric cell')
    return value

def parse_workbook(content):
    sheet=openpyxl.load_workbook(io.BytesIO(content),read_only=True,data_only=True).active
    rows=list(sheet.values)
    if '30. 9. 2026' not in str(rows[0][1]): raise ValueError('MPO snapshot date drift')
    if rows[6][10]!='celkový nominální max. výkon stanice (kW)' or rows[6][11]!='počet dobíjecích bodů': raise ValueError('MPO columns changed')
    records=[]
    for index,row in enumerate(rows[7:],8):
        if row[11] is None or row[11]=='počet dobíjecích bodů':continue
        points=number(row[11]); power=number(row[10]); lat=number(row[6]);lon=number(row[7])
        if not points.is_integer() or points<=0:raise ValueError('Invalid point count')
        if not 48<=lat<=52 or not 12<=lon<=19:raise ValueError('Invalid Czech coordinates')
        records.append({'row':index,'address':str(row[1]),'position':str(row[2]),'postcode':str(row[3]),'municipalityName':str(row[4]),'operator':str(row[9]),'lat':lat,'lon':lon,'points':int(points),'powerKw':power,'stations':1})
    return records,{'stations':int(rows[0][21]),'points':int(rows[1][21])}

def allocate(records,territories,geometries):
    mun={t['id']:t for t in territories if t['level']=='municipality'}
    codes=sorted(set(geometries)&set(mun));tree=STRtree([geometries[c] for c in codes]);project=Transformer.from_crs(4326,5514,always_xy=True).transform
    identities=defaultdict(list)
    for r in records:
        # Source has no station ID; equal address/position/operator cannot be safely interpreted.
        key=tuple(r[k] for k in ['address','position','postcode','municipalityName','operator'])
        identities[key].append(r['row'])
    ambiguous={i for group in identities.values() if len(group)>1 for i in group}
    affected=set();unmapped=[]
    for r in records:
        p=Point(*project(r['lon'],r['lat']));matches=[codes[int(i)] for i in tree.query(p,predicate='intersects')]
        r['municipalityCode']=matches[0] if len(matches)==1 else None
        r['ambiguousIdentity']=r['row'] in ambiguous
        r['duplicateGroup']=next((f'mpo-identity-row-{group[0]}' for group in identities.values() if len(group)>1 and r['row'] in group),None)
        if len(matches)!=1:unmapped.append(r['row'])
        if r['ambiguousIdentity'] and r['municipalityCode']:affected.add(r['municipalityCode'])
    values={ident:{c:None for c in mun} for ident in CONFIG}
    for r in records:
        c=r['municipalityCode']
        if not c:continue
        for ident,(_,_,key) in CONFIG.items():values[ident][c]=round((values[ident][c] or 0)+r[key],6)
    points=[{'id':f'mpo-20260930-row-{r["row"]}','type':'charging','name':f'{r["operator"]} · {r["address"]} ({r["position"]})','lat':r['lat'],'lon':r['lon'],'municipalityCode':r['municipalityCode'],'regionCode':mun[r['municipalityCode']]['regionId'] if r['municipalityCode'] else None,'properties':{k:r[k] for k in ['row','address','position','municipalityName','operator','points','powerKw','ambiguousIdentity','duplicateGroup']}} for r in records]
    audit={'asOf':AS_OF,'sourceRows':len(records),'sourceRowPoints':sum(r['points'] for r in records),'sourceRowPowerKw':round(sum(r['powerKw'] for r in records),6),'ambiguousIdentityGroups':[v for v in identities.values() if len(v)>1],'ambiguousIdentityMunicipalities':sorted(affected),'unmappedRows':unmapped,'reconciliation':{ident:{'sourceRowSum':round(sum(r[key] for r in records),6),'publishedMunicipalSum':round(sum(v for v in values[ident].values() if v is not None),6),'excludedRowSum':round(sum(r[key] for r in records if not r['municipalityCode']),6)} for ident,(_,_,key) in CONFIG.items()},'identityPolicy':'Every source-reported station row is retained and summed. Equal location/position/operator is flagged, never deduplicated: separate physical devices can legitimately share these fields. Counts are reported records, not independently verified unique sites.', 'zeroPolicy':'Absence is null, never zero. Only spatially unassigned rows are excluded from municipal aggregates.'}
    for a in audit['reconciliation'].values():
        if abs(a['sourceRowSum']-a['publishedMunicipalSum']-a['excludedRowSum'])>0.00001:raise ValueError('Charging reconciliation failed')
    return values,audit,points

def build_charging(territories,root,geometries=None):
    root=Path(root);meta=json.loads((root/'data/sources/charging.json').read_text());raw=(root/'data/raw/charging'/meta['rawFile']).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=meta['rawSha256']:raise ValueError('Charging checksum mismatch')
    original=gzip.decompress(raw)
    if hashlib.sha256(original).hexdigest()!=meta['uncompressedSha256']:raise ValueError('Charging workbook checksum mismatch')
    if geometries is None:raise ValueError('Original EPSG:5514 municipal geometries required')
    records,official=parse_workbook(original);values,audit,points=allocate(records,territories,geometries)
    audit['officialHeaderTotals']=official;audit['headerDifferences']={'stations':len(records)-official['stations'],'points':sum(r['points'] for r in records)-official['points']}
    metrics=[{'id':ident,'name':name,'unit':unit,'category':'transport','geography':['country','region','municipality'],'years':[2026],'colorScale':'grid','normalizations':['absolute','per_capita','per_km2'],'path':f'metrics/{ident}.json','status':'verified','source':meta['source'],'aggregation':'sum','coverage':'partial','qualityWarnings':['source_header_body_disagreement','source_station_identity_ambiguity'],'timeType':'snapshot','profile':True} for ident,(name,unit,_) in CONFIG.items()]
    datasets={ident:{'schemaVersion':1,'metricId':ident,'status':'verified','values':{'2026':value}} for ident,value in values.items()}
    return metrics,datasets,audit,[{'id':'charging_stations','name':'Veřejné dobíjecí stanice MPO','type':'charging','source':meta['source'],'points':points}]

def download_charging(root):
    root=Path(root);meta=json.loads((root/'data/sources/charging.json').read_text())
    with urlopen(meta['downloadUrl'],timeout=60) as response:original=response.read()
    if hashlib.sha256(original).hexdigest()!=meta['uncompressedSha256']:raise ValueError('MPO snapshot changed; review before repinning')
    payload=gzip.compress(original,mtime=0)
    if hashlib.sha256(payload).hexdigest()!=meta['rawSha256']:raise ValueError('Compression differs from pinned snapshot')
    target=root/'data/raw/charging'/meta['rawFile'];target.parent.mkdir(parents=True,exist_ok=True)
    handle,name=tempfile.mkstemp(prefix='.'+target.name+'.',dir=target.parent)
    try:
        with os.fdopen(handle,'wb') as stream:
            stream.write(payload);stream.flush();os.fsync(stream.fileno())
        os.replace(name,target)
    finally:
        if os.path.exists(name):os.unlink(name)
