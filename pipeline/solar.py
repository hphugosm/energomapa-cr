"""Offline ERÚ licensed solar snapshot adapter; no inferred historical series."""
import csv, gzip, hashlib, io, json, pathlib, urllib.request, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from decimal import Decimal
from datetime import date as iso_date, datetime, timezone

AS_OF = '2026-10-01'
XML_URL = 'https://eru.gov.cz/sites/default/files/obsah/prilohy/tez-sk-11-2026-10-01.xml'
PAGE_URL = 'https://eru.gov.cz/datove-sady-technologickych-energetickych-zarizeni-ke-dni-01102026-vzor-2025'
CAD_URL = 'https://services.cuzk.gov.cz/sestavy/cis/UI_KATASTRALNI_UZEMI.zip'
FILES = {'tez-sk-11-2026-10-01.xml.gz': XML_URL, 'UI_KATASTRALNI_UZEMI.zip': CAD_URL, 'vzor-11-v5_1.zip': 'https://eru.gov.cz/sites/default/files/obsah/prilohy/vzor-11-v5_1.zip'}

def download_solar(root):
    """Explicit network refresh. gzip is lossless and deterministic (mtime=0)."""
    folder = pathlib.Path(root)/'data/raw/solar'
    folder.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        data = urllib.request.urlopen(url, timeout=120).read()
        if name.endswith('.gz'): data = gzip.compress(data, mtime=0)
        (folder/name).write_bytes(data)
    meta_path = pathlib.Path(root)/'data/sources/solar_capacity.json'
    meta = json.loads(meta_path.read_text())
    meta['rawSha256'] = {name: hashlib.sha256((folder/name).read_bytes()).hexdigest() for name in sorted(FILES)}
    meta['source']['retrievedAt'] = datetime.now(timezone.utc).date().isoformat()
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2)+'\n')

def active(start, end, date=AS_OF):
    if not start or not end: raise ValueError('Missing validity date')
    for value in (start, end, date):
        parsed = iso_date.fromisoformat(value)
        if parsed.isoformat() != value: raise ValueError('Invalid ISO date')
    return (start == '1900-01-01' or start <= date) and (end == '1900-01-01' or end >= date)

def read_cadastres(path):
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist() if n.lower().endswith('.csv')]
        if len(names) != 1: raise ValueError('Expected one cadastral CSV')
        rows = csv.DictReader(io.StringIO(z.read(names[0]).decode('cp1250')), delimiter=';')
        result = {}
        for r in rows:
            if r['PLATI_DO']: continue
            code, municipality = r['KOD'], r['OBEC_KOD']
            if code in result and result[code] != municipality: raise ValueError('Ambiguous cadastral mapping')
            result[code] = municipality
        return result

def parse_solar(xml_path, cadastre_map, municipalities):
    totals = {c: Decimal(0) for c in municipalities}
    tainted, seen_resources, seen_facilities = set(), {}, set()
    audit = Counter(); skipped = []; conflicts = []; total = Decimal(0); located = Decimal(0); conflicting_mw = Decimal(0)
    with gzip.open(xml_path, 'rb') as f:
        tree = ET.parse(f)
    if tree.getroot().tag != 'Licence': raise ValueError('Unexpected ERÚ schema')
    for lic in tree.getroot():
        valid = lic.findtext('ProcesStatus') == 'Udělená licence' and lic.findtext('VersionStatusDes') == 'Aktivní verze' and active(lic.findtext('LicValidFrom'), lic.findtext('LicValidTo')) and active(lic.findtext('VersionValidFrom'), lic.findtext('VersionValidTo'))
        for p in lic.findall('TEZGroup/PremiseElec'):
            if not p.findtext('PremiseElecId'): raise ValueError('Missing facility ID')
            outputs = p.findall('PremiseElecOutputsGroup/PremiseElecOutput')
            if any(not o.findtext('ResourceElecId') for o in outputs): raise ValueError('Missing resource ID')
            premise_active = valid and active(p.findtext('DateBegin'), p.findtext('DateEnd'))
            solar = []
            for o in outputs:
                kind, fuel = o.findtext('ElecPremiseTypeId') or '', o.findtext('FuelTypeId') or ''
                if kind == 'SLE' or (not kind and fuel == 'O'): solar.append(o)
                elif fuel == 'O':
                    if not premise_active: continue
                    conflict_value = Decimal(o.findtext('OutputElec'))
                    if not conflict_value.is_finite() or conflict_value < 0: raise ValueError('Invalid conflicting resource MW')
                    audit['conflictingSolarResourceTypes'] += 1
                    conflicting_mw += conflict_value
                    conflicts.append({'facilityId':p.findtext('PremiseElecId'),'resourceId':o.findtext('ResourceElecId'),'mw':float(conflict_value)})
                    tainted.update(cadastre_map.get(c.findtext('CadasterId')) for c in p.findall('TEZCadasterGroup/TEZCadaster') if cadastre_map.get(c.findtext('CadasterId')) in totals)
            if not solar: continue
            if not premise_active:
                audit['inactiveSolarFacilities'] += 1; continue
            fid = p.findtext('PremiseElecId')
            if not fid: raise ValueError('Missing facility ID')
            if fid in seen_facilities: raise ValueError('Duplicate active facility ID')
            seen_facilities.add(fid); audit['activeSolarFacilities'] += 1
            if len({o.findtext('ElecPremiseTypeId') for o in outputs}) > 1: audit['mixedTechnologyFacilities'] += 1
            capacity = Decimal(0)
            for o in solar:
                rid, val = o.findtext('ResourceElecId'), Decimal(o.findtext('OutputElec'))
                if not val.is_finite() or val < 0: raise ValueError('Invalid solar MW')
                if not rid: raise ValueError('Missing resource ID')
                signature = (fid, val)
                if rid in seen_resources:
                    if seen_resources[rid] != signature: raise ValueError('Conflicting resource ID')
                    audit['duplicateResourceRowsIgnored'] += 1; continue
                seen_resources[rid] = signature; capacity += val; audit['solarResources'] += 1
                if not o.findtext('ElecPremiseTypeId'): audit['solarFuelFallbackResources'] += 1
            total += capacity
            codes = {c.findtext('CadasterId') or '' for c in p.findall('TEZCadasterGroup/TEZCadaster')}
            mapped = {cadastre_map.get(c) for c in codes}
            if len(codes) > 1: audit['multipleCadastreFacilities'] += 1
            if len(mapped) == 1 and None not in mapped and next(iter(mapped)) in totals:
                code = next(iter(mapped)); totals[code] += capacity; located += capacity; audit['locatedFacilities'] += 1
            else:
                tainted.update(c for c in mapped if c in totals)
                reason = 'multipleMunicipalities' if None not in mapped and len(mapped)>1 else 'missingOrUnmappedCadastre'
                audit[reason+'Facilities'] += 1
                skipped.append({'facilityId':fid, 'reason':reason, 'mw':float(capacity), 'municipalityCodes':sorted(c for c in mapped if c in totals)})
    # Unknown facility locations mean absence cannot safely be interpreted as zero.
    values = {c:float(v) if v and c not in tainted else None for c,v in sorted(totals.items())}
    published = sum((Decimal(str(v)) for v in values.values() if v is not None), Decimal(0))
    assert sum(v is not None for v in values.values()) + sum(v is None for v in values.values()) == len(municipalities)
    assert Decimal(0) <= published <= located <= total
    audit = dict(sorted(audit.items()))
    audit.update({'asOf':AS_OF,'publishedMunicipalMW':float(published),'withheldLocatedMW':float(located-published),'excludedConflictingResources':sorted(conflicts,key=lambda x:(x['facilityId'],x['resourceId'])),'excludedConflictingTypeMW':float(conflicting_mw),'totalEligibleSolarMW':float(total),'unambiguouslyLocatedSolarMW':float(located),'unallocatedSolarMW':float(total-located),'mappedMunicipalitiesWithPositiveValues':sum(v is not None for v in values.values()),'taintedMunicipalities':sorted(tainted),'nullMunicipalities':sum(v is None for v in values.values()),'zeroPolicy':'No zero is inferred: unknown locations prevent proving absence. Municipalities affected by multi-municipality facilities are null. Positive untainted municipalities report identified capacity, with national incomplete-coverage disclosure.','unallocatedFacilities':skipped})
    return values, audit

def build_solar(territories, root):
    root=pathlib.Path(root); raw=root/'data/raw/solar'
    meta=json.loads((root/'data/sources/solar_capacity.json').read_text())
    for name,digest in meta['rawSha256'].items():
        if hashlib.sha256((raw/name).read_bytes()).hexdigest()!=digest: raise ValueError('Solar input checksum mismatch: '+name)
    municipalities={t['id'] for t in territories if t['level']=='municipality'}
    values,audit=parse_solar(raw/'tez-sk-11-2026-10-01.xml.gz',read_cadastres(raw/'UI_KATASTRALNI_UZEMI.zip'),municipalities)
    metric={'id':'solar_capacity','name':'Licencované FVE – přiřazený výkon','unit':'MW','category':'electricity','geography':['country','region','municipality'],'years':[2026],'colorScale':'solar','normalizations':['absolute','per_capita','per_km2'],'path':'metrics/solar_capacity.json','status':'verified','source':meta['source'],'aggregation':'sum','coverage':'partial'}
    data={'schemaVersion':1,'metricId':'solar_capacity','status':'verified','values':{'2026':values}}
    return metric,data,audit
