#!/usr/bin/env python3
"""Deterministic offline data build. Network is opt-in with --download."""
import argparse, csv, gzip, hashlib, json, pathlib, xml.etree.ElementTree as ET
import openpyxl
import shapely
from shapely.geometry import Polygon, MultiPolygon, mapping, shape
from shapely.ops import unary_union
from pyproj import Transformer
from catalog import build_catalog, source_registry, normalizations, ALIASES, CATEGORIES
from validation import validate_metrics, validate_points
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
    centroid_project=Transformer.from_crs(5514,4326,always_xy=True).transform
    for code,t in municipalities.items():
        t['areaKm2']=round(geoms[code].area/1e6,5)
        lon,lat=centroid_project(geoms[code].centroid.x,geoms[code].centroid.y)
        t['centroid']={'lon':round(lon,7),'lat':round(lat,7)}
        t['municipalityCode']=code; t['regionCode']=t['regionId']
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
    metrics,datasets,audits,layers=build_catalog(territories,ROOT,geoms,pop)
    household_values=datasets['households']['values']['2021']
    for t in territories:
        t['regionCode']=t.get('regionId')
        members=[t['id']] if t['level']=='municipality' else [c for c,m in municipalities.items() if t['level']=='country' or m['regionId']==t['id']]
        values=[household_values.get(c) for c in members]
        t['households']=sum(v for v in values if v is not None) if any(v is not None for v in values) else None
        t['householdsYear']=2021
        t['householdsCoverage']={'available':sum(v is not None for v in values),'expected':len(values)}
        if t['level']!='municipality':
            g=country if t['level']=='country' else reg_geoms[t['id']]
            lon,lat=project(g.centroid.x,g.centroid.y)
            t['centroid']={'lon':round(lon,7),'lat':round(lat,7)}
    baseline_path=ROOT/'data/sources/coverage-baseline.json'
    baseline=json.loads(baseline_path.read_text()) if baseline_path.exists() else {}
    reports=validate_metrics(metrics,datasets,territories,baseline)
    validate_points(layers,territories)
    for ident,data in datasets.items():
        write(OUT/f'metrics/{ident}.json',data)
        write(ROOT/f'data/processed/{ident}.json',data)
    # Remove retired demo/placeholder output files from production only.
    for path in (OUT/'metrics').glob('*.json'):
        if path.stem not in datasets:path.unlink()
    for ident,audit in audits.items():
        name='solar' if ident=='solar_capacity' else ident
        write(OUT/f'{name}-validation.json',audit)
        write(ROOT/f'data/processed/{name}-validation.json',audit)
    point_metadata=[]
    for layer in layers:
        ident=layer['id']; source=layer['source']
        # Repeated provenance remains on the layer, not on every point.
        points=layer['points']
        for point in points:
            point.pop('source',None)
        write(OUT/f'points/{ident}.json',{'schemaVersion':1,'layerId':ident,'source':source,'points':points})
        point_metadata.append({'id':ident,'name':layer.get('name',ident.replace('_',' ')),'type':layer['type'],'path':f'points/{ident}.json','source':source,'count':len(points)})
    source_data=source_registry(ROOT,metrics)
    write(ROOT/'data/sources/registry.json',source_data)
    write(OUT/'sources.json',source_data)
    manifest={'schemaVersion':1,'version':'0.4.0','defaultMetric':'population','metricAliases':ALIASES,
              'categories':CATEGORIES,'normalizations':normalizations(latest_year),
              'colorScales':{'electricity':['#eef3fc','#173da5'],'solar':['#fff4cb','#d98212'],'renewables':['#ecf7e9','#24763c'],'heat':['#fff0df','#bb5418'],'co2':['#fde9e7','#ab2929'],'grid':['#f1eafb','#6d42a5'],'storage':['#f1eafb','#6d42a5']},
              'metrics':metrics,'geography':{'overview':'geo/overview.geojson','municipalities':'geo/municipalities/{regionId}.geojson','source':geo_source},
              'territories':'territories.json','points':point_metadata,'sources':'sources.json','validation':'validation.json','pointsSchema':'points/schema.json'}
    write(OUT/'points/schema.json',json.loads((ROOT/'data/sources/flat-point-layer.schema.json').read_text()))
    write(OUT/'territories.json',{'schemaVersion':1,'territories':territories})
    write(OUT/'geo/overview.geojson',{'type':'FeatureCollection','features':overview})
    write(OUT/'manifest.json',manifest)
    report={'municipalities':len(codes),'regions':len(regions),'geographyAsOf':geo_source.get('asOf',geo_source['retrievedAt'][:10]),
            'geometryToleranceMetres':100,'metricCount':len(metrics),'realMetricCount':len(datasets),'pointLayers':len(layers),'metrics':reports}
    write(OUT/'validation.json',report)
    report['publicBytes']=sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    write(ROOT/'data/processed/validation.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='metrics'},ensure_ascii=False,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--download',action='store_true');p.add_argument('--download-solar',action='store_true');p.add_argument('--download-heating',action='store_true');p.add_argument('--download-family',choices=['storage','charging','industry','households','pvgis']);args=p.parse_args()
    if args.download:
        from download import download_geography,download_tables,refresh_source_metadata,pin_inputs
        download_geography(refresh=True)
        download_tables()
        refresh_source_metadata()
    if args.download or args.download_solar:
        from solar import download_solar
        from download import pin_inputs
        download_solar(ROOT)
    if args.download or args.download_heating:
        from census import download_census
        download_census(ROOT)
    families=['storage','charging','industry','households','pvgis'] if args.download else [args.download_family] if args.download_family else []
    for family in families:
        import importlib
        module=importlib.import_module('potential' if family=='pvgis' else family)
        fn=getattr(module,'download_potential' if family=='pvgis' else 'download_'+family)
        if family=='pvgis':
            existing=json.loads((OUT/'territories.json').read_text())['territories']
            fn(existing,ROOT,workers=16,rate=10)
        else:fn(ROOT)
    if args.download or args.download_solar or args.download_heating or args.download_family:
        from download import pin_inputs
        pin_inputs()
    build()
