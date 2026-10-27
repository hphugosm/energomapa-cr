"""Conservative licensed generation capacity from pinned ERÚ TEZ resources."""
import gzip
import hashlib
import json
import pathlib
import xml.etree.ElementTree as ET
from collections import Counter
from decimal import Decimal
try:
    from .solar import AS_OF, active, read_cadastres
except ImportError:
    from solar import AS_OF, active, read_cadastres

CONFIG = {
    'generation_capacity': ('Licencované elektrárny – přiřazený výkon', 'electricity'),
    'wind_capacity': ('Licencovaný vítr – přiřazený výkon', 'renewables'),
    'hydro_capacity': ('Licencovaná voda bez PVE – přiřazený výkon', 'renewables'),
}

def classification(row, metric, premise_type=""):
    """Return included/conflicting/irrelevant; never classify by facility name."""
    if metric == 'generation_capacity': return 'included'
    kind, fuel = row.findtext('ElecPremiseTypeId') or '', row.findtext('FuelTypeId') or ''
    target, expected = ('VTE','R') if metric == 'wind_capacity' else ('VE','Q')
    # Pumped storage is an explicitly separate technology, not ordinary hydro.
    if metric == 'hydro_capacity' and (kind == 'PVE' or (not kind and premise_type == 'PVE')): return 'irrelevant'
    if kind == target:
        return 'included' if not fuel or fuel == expected else 'conflicting'
    if fuel == expected:
        return 'included' if not kind else 'conflicting'
    return 'irrelevant'

def parse_generation(xml_path, cadastres, municipalities, metric):
    if metric not in CONFIG: raise ValueError('Unknown generation metric')
    totals = {c: Decimal(0) for c in municipalities}
    tainted, facilities, resources = set(), {}, {}
    audit = Counter(); excluded = []; unallocated = []
    total = located = conflicting = Decimal(0)
    with gzip.open(xml_path, 'rb') as stream: root = ET.parse(stream).getroot()
    if root.tag != 'Licence': raise ValueError('Unexpected ERÚ schema')
    for lic in root:
        valid = (lic.findtext('ProcesStatus') == 'Udělená licence' and lic.findtext('VersionStatusDes') == 'Aktivní verze'
                 and active(lic.findtext('LicValidFrom'),lic.findtext('LicValidTo'))
                 and active(lic.findtext('VersionValidFrom'),lic.findtext('VersionValidTo')))
        for p in lic.findall('TEZGroup/PremiseElec'):
            if not valid or not active(p.findtext('DateBegin'),p.findtext('DateEnd')): continue
            fid = p.findtext('PremiseElecId')
            if not fid: raise ValueError('Missing facility ID')
            signature = (p.findtext('TechnicalData/ElecPremiseTypeId') or '', tuple(sorted((o.findtext('ResourceElecId') or '',o.findtext('OutputElec') or '',o.findtext('ElecPremiseTypeId') or '',o.findtext('FuelTypeId') or '') for o in p.findall('PremiseElecOutputsGroup/PremiseElecOutput'))), tuple(sorted({c.findtext('CadasterId') or '' for c in p.findall('TEZCadasterGroup/TEZCadaster')})))
            if fid in facilities:
                if facilities[fid] != signature: raise ValueError('Conflicting active facility ID')
                audit['duplicateEquivalentFacilitiesIgnored'] += 1
                continue
            facilities[fid] = signature
            codes = {c.findtext('CadasterId') or '' for c in p.findall('TEZCadasterGroup/TEZCadaster')}
            mapped = {cadastres.get(c) for c in codes}
            capacity = Decimal(0); selected = False
            for row in p.findall('PremiseElecOutputsGroup/PremiseElecOutput'):
                rid = row.findtext('ResourceElecId')
                if not rid: raise ValueError('Missing resource ID')
                value = Decimal(row.findtext('OutputElec'))
                if not value.is_finite() or value < 0: raise ValueError('Invalid electrical MW')
                signature = (fid,value,row.findtext('ElecPremiseTypeId') or '',row.findtext('FuelTypeId') or '')
                if rid in resources:
                    if resources[rid] != signature: raise ValueError('Conflicting resource ID')
                    audit['duplicateResourceRowsIgnored'] += 1; continue
                resources[rid] = signature
                category = classification(row,metric,p.findtext('TechnicalData/ElecPremiseTypeId') or '')
                if category == 'conflicting':
                    conflicting += value
                    tainted.update(c for c in mapped if c in totals)
                    excluded.append({'facilityId':fid,'resourceId':rid,'mw':float(value)})
                elif category == 'included':
                    selected = True; capacity += value; audit['eligibleResources'] += 1
                    if metric != 'generation_capacity' and not row.findtext('ElecPremiseTypeId'): audit['fuelFallbackResources'] += 1
            if not selected: continue
            audit['activeEligibleFacilities'] += 1; total += capacity
            if len(codes)>1: audit['multipleCadastreFacilities'] += 1
            if len(mapped)==1 and None not in mapped and next(iter(mapped)) in totals:
                totals[next(iter(mapped))] += capacity; located += capacity; audit['locatedFacilities'] += 1
            else:
                tainted.update(c for c in mapped if c in totals)
                reason = 'multipleMunicipalities' if None not in mapped and len(mapped)>1 else 'missingOrUnmappedCadastre'
                audit[reason+'Facilities'] += 1
                unallocated.append({'facilityId':fid,'reason':reason,'mw':float(capacity),'municipalityCodes':sorted(c for c in mapped if c in totals)})
    values = {c:float(v) if v>0 and c not in tainted else None for c,v in sorted(totals.items())}
    published = sum((Decimal(str(v)) for v in values.values() if v is not None),Decimal(0))
    assert Decimal(0)<=published<=located<=total
    audit = dict(sorted(audit.items()))
    audit.update({'metricId':metric,'asOf':AS_OF,'capacityUnit':'MW','totalEligibleMW':float(total),
                  'unambiguouslyLocatedMW':float(located),'unallocatedMW':float(total-located),
                  'publishedMunicipalMW':float(published),'withheldLocatedMW':float(located-published),
                  'excludedConflictingTypeMW':float(conflicting),'excludedConflictingResources':excluded,
                  'taintedMunicipalities':sorted(tainted),'positiveMunicipalities':sum(v is not None for v in values.values()),
                  'nullMunicipalities':sum(v is None for v in values.values()),'unallocatedFacilities':unallocated,
                  'zeroPolicy':'Absent records are null, never inferred zero. Ambiguous or conflicting facilities taint affected municipalities. All public aggregates sum only published positive municipal capacity and remain partial.'})
    return values,audit

def build_generation(territories, root):
    root = pathlib.Path(root); folder = root/'data/raw/solar'
    pinned = json.loads((root/'data/sources/solar_capacity.json').read_text())
    for name,digest in pinned['rawSha256'].items():
        if hashlib.sha256((folder/name).read_bytes()).hexdigest()!=digest: raise ValueError('Generation input checksum mismatch: '+name)
    municipalities = {t['id'] for t in territories if t['level']=='municipality'}
    cadastres = read_cadastres(folder/'UI_KATASTRALNI_UZEMI.zip')
    result = []
    for ident,(name,scale) in CONFIG.items():
        meta = json.loads((root/f'data/sources/{ident}.json').read_text())
        values,audit = parse_generation(folder/'tez-sk-11-2026-10-01.xml.gz',cadastres,municipalities,ident)
        source = dict(meta['source']); source['retrievedAt'] = pinned['source']['retrievedAt']
        metric = {'id':ident,'name':name,'unit':'MW','category':'electricity','geography':['country','region','municipality'],
                  'years':[2026],'colorScale':scale,'normalizations':['absolute','per_capita','per_km2'],
                  'path':f'metrics/{ident}.json','status':'verified','source':source,'aggregation':'sum','coverage':'partial','profile':True}
        result.append((metric,{'schemaVersion':1,'metricId':ident,'status':'verified','values':{'2026':values}},audit))
    return result
