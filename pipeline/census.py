"""Pinned SLDB 2021 occupied dwellings; no temporal or geographic interpolation."""
import csv
import gzip
import hashlib
import json
import os
import tempfile
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.request import urlopen
from pathlib import Path

AS_OF = '2021-03-26'
CATEGORIES = {'1':'Z kotelny mimo dům','2':'Uhlí, koks, uhelné brikety','3':'Dřevo, dřevěné brikety','4':'Topné oleje, nafta','5':'Zemní plyn','7':'Elektřina','9':'Tepelné čerpadlo','10':'Jiné druhy plynu (LPG, CNG, bioplyn aj.)','11':'Dřevěné pelety','12':'Solární kolektory','8':'Jiný','99':'Nezjištěno'}
REGIONS = dict(zip(['3018','3026','3034','3042','3051','3069','3077','3085','3093','3107','3115','3123','3131','3140'],['CZ010','CZ020','CZ031','CZ032','CZ041','CZ042','CZ051','CZ052','CZ053','CZ063','CZ064','CZ071','CZ072','CZ080']))
CONFIG = {'occupied_dwellings':('','Obydlené byty celkem',False), 'heating_gas':('5','Obydlené byty – vytápění zemním plynem',True),'heating_electricity':('7','Obydlené byty – vytápění elektřinou',True),'district_heating':('1','Obydlené byty – teplo z kotelny mimo dům',True),'heating_heat_pump':('9','Obydlené byty – vytápění tepelným čerpadlem',True),'heating_solid_fuels':(('2','3','11'),'Obydlené byty – vytápění pevnými palivy',True)}

def parse_census(rows, territories):
    records = {}; ids = set()
    for row in rows:
        category = row['energie_kod']
        if (row['ukaz_kod']!='2607' or row['sldb_datum']!=AS_OF or row['sldb_rok']!='2021'
            or (category and (row['energie_cis']!='3063' or CATEGORIES.get(category)!=row['energie_txt']))
            or (not category and (row['energie_cis'] or row['energie_txt']))):
            raise ValueError('Census classification/date drift')
        if not row['hodnota'].isdigit(): raise ValueError('Invalid census count')
        key=(row['uzemi_cis'],row['uzemi_kod'],category)
        if key in records or row['idhod'] in ids: raise ValueError('Duplicate census row')
        records[key]=int(row['hodnota']); ids.add(row['idhod'])
    # Every published source territory partitions its total into exactly 12 categories.
    source_keys={(level,code) for level,code,cat in records}
    zero_omissions=[]
    for level,code in source_keys:
        if (level,code,'') not in records: raise ValueError('Missing census total')
        total=records[level,code,'']
        for cat in CATEGORIES:
            if (level,code,cat) not in records:
                if total!=0: raise ValueError('Missing category in nonzero census territory')
                records[level,code,cat]=0; zero_omissions.append([level,code,cat])
        if sum(records[level,code,cat] for cat in CATEGORIES)!=total:
            raise ValueError('Census categories do not balance')
    municipalities={t['id']:t for t in territories if t['level']=='municipality'}
    source_codes={code for level,code in source_keys if level=='43'}
    unmapped=sorted(source_codes-set(municipalities)); missing=sorted(set(municipalities)-source_codes)
    output={}; checks={}
    for ident,(cat,_,_) in CONFIG.items():
        categories=cat if isinstance(cat,tuple) else (cat,)
        def value_at(level,code):
            parts=[records.get((level,code,c)) for c in categories]
            return None if any(v is None for v in parts) else sum(parts)
        official=value_at('97','19')
        if official is None: raise ValueError('Missing official national count')
        municipal=sum(value_at('43',c) for c in source_codes)
        regional=sum(value_at('100',c) if value_at('100',c) is not None else -1 for c in REGIONS)
        if municipal!=official or regional!=official: raise ValueError('Census national reconciliation failed')
        region_checks={}
        for code,region in REGIONS.items():
            value=value_at('100',code)
            if value is None: raise ValueError('Missing official region')
            mapped=sum(value_at('43',c) for c,t in municipalities.items() if t['regionId']==region and c in source_codes)
            if not unmapped and value != mapped:
                raise ValueError('Census region reconciliation failed; review an explicit territory crosswalk before publishing')
            region_checks[region]={'source':value,'mappedMunicipal':mapped,'difference':value-mapped}
        values={c:value_at('43',c) for c in sorted(municipalities)}
        # Aggregates are explicitly official 2021 values; build may recompute from current municipalities.
        output[ident]=values
        checks[ident]={'officialCountry':official,'sourceMunicipalSum':municipal,'sourceRegionalSum':regional,'mappedMunicipalSum':sum(v for v in values.values() if v is not None),'regions':region_checks}
    audit={'asOf':AS_OF,'sourceMunicipalities':len(source_codes),'unmappedSourceMunicipalities':unmapped,'missingCurrentMunicipalities':missing,'zeroTotalCategoryOmissions':sorted(zero_omissions),'reconciliation':checks,'zeroPolicy':'Published zero is retained. Missing categories are zero only for source territories with explicit total zero. Current municipalities absent from the 2021 source are null; no boundary/name interpolation.'}
    return output,audit

def build_census(territories, root):
    root=Path(root); meta=json.loads((root/'data/sources/heating.json').read_text())
    raw=root/'data/raw/census'/meta['rawFile']
    if hashlib.sha256(raw.read_bytes()).hexdigest()!=meta['rawSha256']: raise ValueError('Census input checksum mismatch')
    with gzip.open(raw,'rt',encoding='utf-8-sig',newline='') as stream:
        values,audit=parse_census(csv.DictReader(stream),territories)
    metrics=[]; datasets={}
    for ident,(_,name,profile) in CONFIG.items():
        metrics.append({'id':ident,'name':name,'unit':'bytů','category':'context' if ident=='occupied_dwellings' else 'heating','geography':['country','region','municipality'],'years':[2021],'timeType':'snapshot','colorScale':'electricity' if ident=='occupied_dwellings' else 'heat','normalizations':['absolute','per_km2'],'path':f'metrics/{ident}.json','status':'verified','source':meta['source'],'aggregation':'sum','coverage':'partial' if audit['unmappedSourceMunicipalities'] or audit['missingCurrentMunicipalities'] else 'complete','profile':profile})
        datasets[ident]={'schemaVersion':1,'metricId':ident,'status':'verified','values':{'2021':values[ident]}}
    return metrics,datasets,audit


def download_census(root):
    """Refresh retrieval of the reviewed immutable snapshot; reject source changes."""
    root=Path(root); meta_path=root/'data/sources/heating.json'
    meta=json.loads(meta_path.read_text()); target=root/'data/raw/census'/meta['rawFile']
    with urlopen(meta['downloadUrl'],timeout=60) as response:
        original=response.read()
    if hashlib.sha256(original).hexdigest()!=meta['uncompressedSha256']:
        raise ValueError('Census source changed: review content and metadata before repinning')
    compressed=gzip.compress(original,mtime=0)
    if hashlib.sha256(compressed).hexdigest()!=meta['rawSha256']:
        raise ValueError('Census compression differs from pinned bytes; review runtime before repinning')
    meta['source']['retrievedAt']=datetime.now(ZoneInfo('Europe/Prague')).date().isoformat()
    target.parent.mkdir(parents=True,exist_ok=True)
    # Each replacement is atomic; validation happens before either file is touched.
    for path,payload in [(target,compressed),(meta_path,(json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())]:
        handle,name=tempfile.mkstemp(prefix='.'+path.name+'.',dir=path.parent)
        try:
            with os.fdopen(handle,'wb') as stream:
                stream.write(payload); stream.flush(); os.fsync(stream.fileno())
            os.replace(name,path)
        finally:
            if os.path.exists(name): os.unlink(name)
    return meta
