"""Pinned ERÚ group 17: licensed storage power, never inferred MWh/history/points."""
import gzip
import hashlib
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
try:
    from .solar import AS_OF, PAGE_URL, CAD_URL, active, read_cadastres
except ImportError:
    from solar import AS_OF, PAGE_URL, CAD_URL, active, read_cadastres

FILES = {
    'ukladani-elektriny-provozovny.doc': 'https://eru.gov.cz/sites/default/files/obsah/prilohy/ukladani-elektriny-seznam-jednotlivych-provozoven.doc',
    'tez-sk-17-2026-10-01.xml.gz': 'https://eru.gov.cz/sites/default/files/obsah/prilohy/tez-sk-17-2026-10-01.xml',
    'vzor-17-v1.xsd': 'https://code.gov.cz/energeticky-regulacni-urad/tezy/-/raw/main/vzor-17-v1.xsd',
    'UI_KATASTRALNI_UZEMI.zip': CAD_URL,
}

def download_storage(root):
    """Explicit network-only refresh; normal build never invokes this function.

    Digests intentionally require review/update in storage.json after refresh.
    """
    folder = pathlib.Path(root)/'data/raw/storage'
    folder.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        data = urllib.request.urlopen(url, timeout=120).read()
        if name.endswith('.gz'): data = gzip.compress(data, mtime=0)
        (folder/name).write_bytes(data)
    return {n: hashlib.sha256((folder/n).read_bytes()).hexdigest() for n in FILES}


def number(text):
    try: value = Decimal(text)
    except (InvalidOperation, TypeError): raise ValueError('Invalid storage power')
    if not value.is_finite() or value < 0: raise ValueError('Invalid storage power')
    return value


def parse_storage(path, cadastres, municipalities):
    with gzip.open(path, 'rb') as stream: root = ET.parse(stream).getroot()
    if root.tag != 'Licence' or not root.findall('LicTable') or not root.findall('.//StorageElec'):
        raise ValueError('Unexpected storage schema')
    totals = {c: Decimal(0) for c in municipalities}; counts = dict.fromkeys(municipalities, 0)
    seen = {}; tainted = set(); unallocated = []; source_total = Decimal(0); located = Decimal(0)
    duplicates = inactive = 0
    facility_records = []
    for licence in root.findall('LicTable'):
        valid = (licence.findtext('ProcesStatus') == 'Udělená licence'
                 and licence.findtext('VersionStatusDes') == 'Aktivní verze'
                 and active(licence.findtext('LicValidFrom'), licence.findtext('LicValidTo'))
                 and active(licence.findtext('VersionValidFrom'), licence.findtext('VersionValidTo')))
        for facility in licence.findall('TEZGroup/StorageElec'):
            if not valid or not active(facility.findtext('DateBegin'), facility.findtext('DateEnd')):
                inactive += 1; continue
            ident = facility.findtext('StorageElecId')
            if not ident: raise ValueError('Missing storage facility ID')
            # Device rows have no IDs: repeated identical modules are real units, not duplicates.
            devices = facility.findall('StorageElecDeviceGroup/StorageElecDevice')
            if not devices: raise ValueError('Missing storage devices')
            powers = tuple(number(d.findtext('OutputElec')) for d in devices)
            capacity = sum(powers, Decimal(0))
            if number(facility.findtext('TechnicalData/OutputSum')) != capacity:
                raise ValueError('Storage device and facility MW disagree')
            if facility.findtext('TechnicalData/NoOfResources') != str(len(devices)):
                raise ValueError('Storage device count disagrees')
            codes = {r.findtext('CadasterId') or '' for r in facility.findall('TEZCadasterGroup/TEZCadaster')}
            signature = (capacity, tuple(sorted(codes)), tuple(sorted(ET.tostring(d) for d in devices)))
            if ident in seen:
                if seen[ident] != signature: raise ValueError('Conflicting active storage facility ID')
                duplicates += 1; continue
            seen[ident] = signature; source_total += capacity
            facility_record = {'id':ident,'name':facility.findtext('Name') or '',
                               'licenceId':licence.findtext('LicId'),'mw':float(capacity),
                               'municipalityCode':None,'technology':None,'lat':None,'lon':None}
            facility_records.append(facility_record)
            mapped = {cadastres.get(c) for c in codes}
            if len(mapped) == 1 and None not in mapped and next(iter(mapped)) in municipalities:
                code = next(iter(mapped)); totals[code] += capacity; counts[code] += 1; located += capacity
                facility_record['municipalityCode'] = code
            else:
                known = sorted(c for c in mapped if c in municipalities)
                tainted.update(known)
                unallocated.append({'facilityId':ident,'mw':float(capacity),'municipalityCodes':known,
                                    'reason':'multipleMunicipalities' if len(mapped)>1 and None not in mapped else 'missingOrUnmappedCadastre'})
    # Registry absence is unknown; explicit zero-power known facilities remain genuine zero.
    values = {c:float(totals[c]) if counts[c] and c not in tainted else None for c in sorted(municipalities)}
    count_values = {c:counts[c] if counts[c] and c not in tainted else None for c in sorted(municipalities)}
    published = sum((Decimal(str(v)) for v in values.values() if v is not None), Decimal(0))
    audit = {'asOf':AS_OF,'totalEligibleMW':float(source_total),'unambiguouslyLocatedMW':float(located),
             'unallocatedMW':float(source_total-located),'publishedMunicipalMW':float(published),
             'withheldLocatedMW':float(located-published),'activeFacilities':len(seen),
             'publishedFacilities':sum(v for v in count_values.values() if v is not None),
             'inactiveFacilityRowsExcluded':inactive,'duplicateEquivalentFacilitiesIgnored':duplicates,
             'taintedMunicipalities':sorted(tainted),'unallocatedFacilities':unallocated,
             'positiveMunicipalities':sum(v is not None and v>0 for v in values.values()),
             'nullMunicipalities':sum(v is None for v in values.values()),
             'facilitiesWithoutCoordinates':len(seen),'pointCount':0,
             'facilities':sorted(facility_records,key=lambda x:x['id']),
             'energyCapacityMWh':None,'energyCapacityReason':'No explicit MWh field; CurrentElecCharge and VoltageNominal are not converted.',
             'zeroPolicy':'Registry absence is null. Only explicitly reported zero power in known facilities is zero. Aggregates are partial.'}
    if not Decimal(0) <= published <= located <= source_total: raise ValueError('Storage reconciliation failed')
    return values, count_values, audit


def build_storage(territories, root):
    root = pathlib.Path(root); folder = root/'data/raw/storage'
    meta = json.loads((root/'data/sources/storage.json').read_text())
    for name, digest in meta['rawSha256'].items():
        if hashlib.sha256((folder/name).read_bytes()).hexdigest() != digest:
            raise ValueError('Storage checksum mismatch: '+name)
    municipalities = {t['id'] for t in territories if t['level']=='municipality'}
    mw, counts, audit = parse_storage(folder/'tez-sk-17-2026-10-01.xml.gz', read_cadastres(folder/'UI_KATASTRALNI_UZEMI.zip'), municipalities)
    metrics = []; datasets = {}
    for ident, name, unit, values in [
        ('battery_storage_capacity_mw','Licencované ukládání elektřiny – přiřazený výkon','MW',mw),
        ('battery_storage_count','Licencované ukládání elektřiny – počet provozoven','provozoven',counts)]:
        metrics.append({'id':ident,'name':name,'unit':unit,'category':'storage','geography':['country','region','municipality'],
                        'years':[2026],'timeType':'snapshot','colorScale':'storage','normalizations':['absolute','per_capita','per_km2'],
                        'path':f'metrics/{ident}.json','status':'verified','source':dict(meta['source']),
                        'aggregation':'sum','coverage':'partial','profile':True})
        datasets[ident] = {'schemaVersion':1,'metricId':ident,'status':'verified','values':{'2026':values}}
    return metrics, datasets, audit, []
