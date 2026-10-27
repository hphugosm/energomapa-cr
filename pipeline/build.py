#!/usr/bin/env python3
"""Deterministic offline data build. Network is opt-in with --download."""
import argparse, csv, gzip, hashlib, json, pathlib, xml.etree.ElementTree as ET
import openpyxl
import shapely
from shapely.geometry import Polygon, MultiPolygon, mapping, shape
from shapely.ops import unary_union
from pyproj import Transformer
from solar import build_solar
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw'; OUT=ROOT/'public/data'
NS={'a':'http://inspire.ec.europa.eu/schemas/au/4.0','e':'http://www.locationframework.eu/schemas/AdministrativeUnits/1.0','g':'http://www.opengis.net/gml/3.2','n':'http://inspire.ec.europa.eu/schemas/gn/4.0','w':'http://www.opengis.net/wfs/2.0'}

def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
def source_metadata(name):
    return json.loads((ROOT/f'data/sources/{name}.json').read_text())

def rounded(value):
    if isinstance(value,(tuple,list)):return [rounded(x) for x in value]
    if isinstance(value,float):return round(value,7)
    return value

def geometries():
    result={}
    for path in sorted((RAW/'geography').glob('*.gml.gz')):
        root=ET.fromstring(gzip.decompress(path.read_bytes()))
        if root.find('w:truncatedResponse',NS) is not None:continue
        for node in root.findall('w:member/e:AdministrativeUnit',NS):
            code=node.findtext('a:nationalCode',namespaces=NS)
            polys=[]
            for p in node.findall('.//g:Polygon',NS):
                def ring(r):
                    seq=list(map(float,r.find('.//g:posList',NS).text.split()))
                    return list(zip(seq[::2],seq[1::2]))
                exterior=p.find('g:exterior',NS)
                polys.append(Polygon(ring(exterior),[ring(x) for x in p.findall('g:interior',NS)]))
            geom=MultiPolygon(polys)
            if not geom.is_valid:geom=shapely.make_valid(geom)
            assert not geom.is_empty and geom.area>0
            result[code]=geom
    return result

def build():
    checksums=json.loads((ROOT/'data/sources/checksums.json').read_text())
    assert set(checksums)=={str(p.relative_to(ROOT)) for p in RAW.rglob('*') if p.is_file()}, 'Unpinned or missing raw input'
    for path,digest in checksums.items():
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest,f'Input checksum mismatch: {path}'
    geo_source=source_metadata('geography')
    population_source=source_metadata('population')
    territory_source=source_metadata('territories')
    assert population_source['sha256']==hashlib.sha256((RAW/'population_2018_2025.csv.gz').read_bytes()).hexdigest(), 'Population source digest is stale'
    records=[r for r in openpyxl.load_workbook(RAW/'struktura_uzemi_cr.xlsx',read_only=True,data_only=True)[territory_source['sheet']].values][2:]
    municipalities={str(r[0]):{'id':str(r[0]),'code':str(r[0]),'name':r[1],'level':'municipality','parentId':r[9],'regionId':r[9],'population':None,'populationYear':None,'areaKm2':None,'status':r[2]} for r in records}
    regions={r[9]:r[10] for r in records}
    pop={}; official_aggregates={}
    with gzip.open(RAW/'population_2018_2025.csv.gz','rt',encoding='utf8') as f:
        for r in csv.DictReader(f):
            code=r['UZ0245OR26X'];year=r['Roky']
            if code in regions or code=='CZ':
                official_aggregates.setdefault(year,{})[code]=int(float(r['Hodnota']))
            if code not in municipalities:continue
            val=r['Hodnota']
            if not val:continue
            try:value=int(float(val))
            except ValueError:continue
            pop.setdefault(year,{})[code]=value
    assert pop, 'No population years found'
    latest_year=max(map(int,pop))
    for year,values in pop.items():
        assert set(values)==set(municipalities),f'Population coverage incomplete in {year}'
    for year,values in pop.items():
        assert sum(values.values())==official_aggregates[year]['CZ'], f'Country population sum mismatch {year}'
        for rid in regions:
            assert sum(v for code,v in values.items() if municipalities[code]['regionId']==rid)==official_aggregates[year][rid],f'Region population sum mismatch {year}/{rid}'
    for code,t in municipalities.items():
        t['population']=pop[str(latest_year)][code]
        t['populationYear']=latest_year
    geoms=geometries()
    assert set(municipalities)<=set(geoms),f'Missing geometry: {set(municipalities)-set(geoms)}'
    for code,t in municipalities.items():t['areaKm2']=round(geoms[code].area/1e6,5)
    # A single coverage operation keeps adjacent municipal edges identical.
    codes=sorted(municipalities)
    assert shapely.coverage_is_valid([geoms[c] for c in codes]), 'Original geography has overlapping edges'
    simple=shapely.coverage_simplify([geoms[c] for c in codes],100)
    assert all(g.is_valid and not g.is_empty and g.area>0 for g in simple)
    assert shapely.coverage_is_valid(simple), 'Simplification damaged shared edges'
    project=Transformer.from_crs(5514,4326,always_xy=True).transform
    def feature(code,name,g):return {'type':'Feature','id':code,'properties':{'code':code,'name':name},'geometry':{'type':mapping(g)['type'],'coordinates':rounded(mapping(shapely.transform(g,project,interleaved=False))['coordinates'])}}
    reg_geoms={rid:unary_union([geoms[c] for c,t in municipalities.items() if t['regionId']==rid]) for rid in regions}
    reg_order=sorted(regions)
    reg_simple=dict(zip(reg_order,shapely.coverage_simplify([reg_geoms[r] for r in reg_order],150)))
    overview=[]; territories=[]
    country=unary_union(list(reg_geoms.values()))
    def summary(code,name,level,g):
        members=[t for t in municipalities.values() if level=='country' or t['regionId']==code]
        return {'id':code,'code':code,'name':name,'level':level,'parentId':None if level=='country' else 'CZ','regionId':None if level=='country' else code,'population':sum(t['population'] for t in members) if all(t['population'] is not None for t in members) else None,'populationYear':latest_year,'areaKm2':round(sum(t['areaKm2'] for t in members),5)}
    territories.append(summary('CZ','Česká republika','country',country));overview.append(feature('CZ','Česká republika',country.simplify(250,preserve_topology=True)))
    for rid,name in sorted(regions.items()):
        territories.append(summary(rid,name,'region',reg_geoms[rid]));overview.append(feature(rid,name,reg_simple[rid]))
        features=[feature(c,municipalities[c]['name'],g) for c,g in zip(codes,simple) if municipalities[c]['regionId']==rid]
        assert all(shape(f['geometry']).is_valid for f in features), 'GeoJSON rounding damaged geometry'
        write(OUT/f'geo/municipalities/{rid}.geojson',{'type':'FeatureCollection','features':features})
    territories.extend(municipalities[c] for c in codes)
    assert all(shape(f['geometry']).is_valid for f in overview), 'Invalid overview GeoJSON'
    write(OUT/'territories.json',{'schemaVersion':1,'territories':territories})
    write(OUT/'geo/overview.geojson',{'type':'FeatureCollection','features':overview})
    write(OUT/'metrics/population.json',{'schemaVersion':1,'metricId':'population','status':'verified','values':{y:dict(sorted(v.items())) for y,v in sorted(pop.items())}})
    solar_metric,solar_data,solar_audit=build_solar(territories,ROOT)
    write(OUT/'metrics/solar_capacity.json',solar_data)
    write(ROOT/'data/processed/solar_capacity.json',solar_data)
    write(ROOT/'data/processed/solar-validation.json',solar_audit)
    write(OUT/'solar-validation.json',solar_audit)
    build_manifest(pop,solar_metric)
    report={'municipalities':len(codes),'regions':len(regions),'populationCoverage':{y:len(v) for y,v in pop.items()},'missingPopulation':[c for c,t in municipalities.items() if t['population'] is None],'geographyAsOf':geo_source.get('asOf',geo_source['retrievedAt'][:10]),'geometryToleranceMetres':100,'areaMethod':'Planar area of original full-resolution ČÚZK geometry in EPSG:5514; km²','publicBytes':sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())}
    write(ROOT/'data/processed/validation.json',report)
    print(json.dumps(report,ensure_ascii=False,indent=2))


def build_manifest(pop,solar_metric):
    population_source=source_metadata('population')
    geo_source=source_metadata('geography')
    latest_year=max(map(int,pop))
    configs=[('population','Počet obyvatel','obyv.','context','electricity'),('households','Domácnosti','domácností','context','electricity'),('generation_capacity','Instalovaný výkon elektráren','MW','electricity','electricity'),('solar_capacity','Instalovaný výkon FVE','MW','electricity','solar'),('wind_capacity','Instalovaný výkon větru','MW','electricity','renewables'),('hydro_capacity','Instalovaný výkon vody','MW','electricity','renewables'),('battery_storage','Bateriová úložiště','MWh','storage','grid'),('heating_gas','Vytápění plynem','domácností','heat','heat'),('heating_electricity','Vytápění elektřinou','domácností','heat','electricity'),('district_heating','Dálkové teplo','domácností','heat','heat'),('ev_charging','Dobíjecí stanice','stanic','transport','grid'),('industrial_co2','Průmyslové emise CO₂','t CO₂/rok','emissions','co2'),('solar_potential','Solární potenciál','MWh/rok','electricity','solar')]
    metrics=[]
    for ident,name,unit,category,scale in configs:
        if ident=='solar_capacity':
            metrics.append(solar_metric)
            continue
        status='verified' if ident=='population' else 'demo' if ident in ['solar_capacity','battery_storage','ev_charging'] else 'unavailable'
        years=list(map(int,sorted(pop))) if ident=='population' else ([2026] if ident=='ev_charging' else list(range(2022,2027))) if status=='demo' else []
        method='ČSÚ REGUAP, ukazatel 2406UAP891, stav k 31. prosinci. Území podle číselníku 1. 1. 2026; změny hranic a sčítání mohou narušit srovnatelnost.' if ident=='population' else 'Syntetické demonstrační hodnoty šesti měst; záměrná mezera roku 2024 v Děčíně. Nejde o měření ani produkční energetická data.' if status=='demo' else 'Datový adaptér připraven. Skutečný obecní dataset zatím není připojen; chybějící hodnoty se nedopočítávají.'
        m={'id':ident,'name':name,'unit':unit,'category':category,'geography':['country','region','municipality'],'years':years,'colorScale':scale,'normalizations':['absolute','per_km2'] if ident=='population' else ['absolute','per_capita','per_km2'],'path':f'metrics/{ident}.json' if status!='unavailable' else None,'status':status,'source':{'name':'Český statistický úřad · REGUAP' if ident=='population' else 'Demo fixture EnergoMapa' if status=='demo' else 'Nepřipojeno','url':'https://csu.gov.cz/statistika/csu_a_uzemne_analyticke_podklady' if ident=='population' else None,'updatedAt':'2026-10-27','geographicGranularity':'municipality','temporalGranularity':'annual' if years else 'unavailable','methodology':method},'aggregation':'sum','coverage':'full' if ident=='population' else 'partial' if status=='demo' else 'none'}
        if ident=='population':
            m['source']['asOf']=f'{latest_year}-12-31'
            m['source']['updatedAt']=None
        m['source']['retrievedAt']=population_source['retrievedAt'] if ident=='population' else '2026-10-27'
        if status=='unavailable':
            m['source']['updatedAt']=None
            m['source']['retrievedAt']=None
        if ident=='ev_charging':
            m['source']['asOf']='2026-10-01'
            m['source']['temporalGranularity']='snapshot'
        metrics.append(m)
        if status=='demo':
            fixture=json.loads((RAW/f'demo/{ident}.json').read_text())
            fixture['values']={y:v for y,v in fixture['values'].items() if int(y) in years}
            write(OUT/f'metrics/{ident}.json',fixture)
    manifest={'schemaVersion':1,'defaultMetric':'population','normalizations':{'absolute':{'label':'Absolutně','unitSuffix':''},'per_capita':{'label':'Na 1 000 obyvatel','denominator':'population','factor':1000,'unitSuffix':'/ 1 000 obyv.'},'per_km2':{'label':'Na km²','denominator':'areaKm2','factor':1,'unitSuffix':'/ km²'}},'colorScales':{'electricity':['#eef3fc','#173da5'],'solar':['#fff4cb','#d98212'],'renewables':['#ecf7e9','#24763c'],'heat':['#fff0df','#bb5418'],'co2':['#fde9e7','#ab2929'],'grid':['#f1eafb','#6d42a5']},'metrics':metrics,'geography':{'overview':'geo/overview.geojson','municipalities':'geo/municipalities/{regionId}.geojson','source':{'name':'ČÚZK · INSPIRE AU WFS / RÚIAN','url':'https://services.cuzk.gov.cz/wfs/inspire-au-wfs.asp','asOf':geo_source.get('asOf',geo_source['retrievedAt'][:10]),'retrievedAt':geo_source['retrievedAt'],'methodology':'Aktuální skutečné polygony; topologicky zjednodušeno na 100 m pro web. Kraje a stát odvozeny sjednocením obcí; rozloha z původní geometrie EPSG:5514.'}},'territories':'territories.json','points':[]}
    manifest['pointsSchema']='points/schema.json'
    write(OUT/'points/schema.json',json.loads((ROOT/'data/sources/point-layer.schema.json').read_text()))
    write(OUT/'manifest.json',manifest)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--download',action='store_true');p.add_argument('--download-solar',action='store_true');args=p.parse_args()
    if args.download:
        from download import download_geography,download_tables,refresh_source_metadata,pin_inputs
        download_geography(refresh=True)
        download_tables()
        refresh_source_metadata()
    if args.download or args.download_solar:
        from solar import download_solar
        from download import pin_inputs
        download_solar(ROOT)
        pin_inputs()
    build()
