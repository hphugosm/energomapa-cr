"""Actual SLDB 2021 housekeeping households; never occupied-dwelling proxies."""
import csv
import gzip
import hashlib
import json
from pathlib import Path
try:
    from .census import AS_OF, REGIONS
except ImportError:
    from census import AS_OF, REGIONS


def parse_households(rows, territories):
    records = {}; ids = set(); row_count = 0
    for row in rows:
        row_count += 1
        if row['ukaz_kod'] != '2423' or row['ukaz_txt'] != 'Počet hospodařících domácností' or row['sldb_datum'] != AS_OF or row['sldb_rok'] != '2021':
            raise ValueError('Household indicator/date drift')
        if not row['hodnota'].isdigit() or row['idhod'] in ids:
            raise ValueError('Invalid or duplicate household row')
        ids.add(row['idhod'])
        # Only totals across both size and type; all detail rows are non-additive.
        if any(row[k] for k in ('clenu_cis','clenu_kod','typ_cis','typ_kod','typ_struktura')):
            continue
        key = (row['uzemi_cis'],row['uzemi_kod'])
        if key in records: raise ValueError('Duplicate household total')
        records[key] = int(row['hodnota'])
    source_codes = {c for level,c in records if level == '43'}
    municipalities = {t['id']:t for t in territories if t['level']=='municipality'}
    unmapped = sorted(source_codes-set(municipalities))
    missing = sorted(set(municipalities)-source_codes)
    official = records.get(('97','19'))
    municipal = sum(records['43',c] for c in source_codes)
    regional = sum(records.get(('100',c),-1) for c in REGIONS)
    if official is None or municipal != official or regional != official:
        raise ValueError('Household national reconciliation failed')
    regions = {}
    for code,region in REGIONS.items():
        value = records.get(('100',code))
        mapped = sum(records['43',c] for c,t in municipalities.items() if t['regionId']==region and c in source_codes)
        if value is None or (not unmapped and value != mapped):
            raise ValueError('Household region reconciliation failed; explicit crosswalk review required')
        regions[region] = {'source':value,'mappedMunicipal':mapped,'difference':value-mapped}
    values = {c:records.get(('43',c)) for c in sorted(municipalities)}
    audit = {'asOf':AS_OF,'sourceRows':row_count,'sourceMunicipalities':len(source_codes),'unmappedSourceMunicipalities':unmapped,'missingCurrentMunicipalities':missing,'reconciliation':{'households':{'officialCountry':official,'sourceMunicipalSum':municipal,'sourceRegionalSum':regional,'mappedMunicipalSum':sum(v for v in values.values() if v is not None),'regions':regions}},'zeroPolicy':'Published zero retained; missing municipality null. Exact municipality codes only, no name matching or inferred boundary crosswalk.'}
    return values,audit


def build_households(territories, root):
    root=Path(root); meta=json.loads((root/'data/sources/households.json').read_text())
    raw=root/'data/raw/households'/meta['rawFile']
    if hashlib.sha256(raw.read_bytes()).hexdigest()!=meta['rawSha256']:
        raise ValueError('Household checksum mismatch')
    with gzip.open(raw,'rt',encoding='utf-8-sig',newline='') as stream:
        values,audit=parse_households(csv.DictReader(stream),territories)
    metric={'id':'households','name':'Hospodařící domácnosti','unit':'domácností','category':'demography','geography':['country','region','municipality'],'years':[2021],'timeType':'snapshot','colorScale':'electricity','normalizations':['absolute','per_km2'],'path':'metrics/households.json','status':'verified','source':meta['source'],'aggregation':'sum','profile':True,'coverage':'partial' if audit['unmappedSourceMunicipalities'] or audit['missingCurrentMunicipalities'] else 'complete'}
    return [metric],{'households':{'schemaVersion':1,'metricId':'households','status':'verified','values':{'2021':values}}},audit,{}
