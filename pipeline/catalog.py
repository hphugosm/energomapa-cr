"""One metric/source catalog for all adapters; no dataset-specific frontend code."""
import json
from pathlib import Path

CATEGORIES = ['demography','electricity','renewables','storage','heating','transport','industry','emissions','potential']
ALIASES = {'installed_generation_capacity':'generation_capacity','solar_pv_capacity':'solar_capacity',
           'battery_storage':'battery_storage_capacity_mwh','ev_charging':'ev_charging_stations',
           'industrial_co2':'industrial_co2_tonnes','solar_potential':'solar_potential_kwh_kwp_year'}
SOURCES = {
    'population':('ČSÚ','REGUAP – obyvatelstvo','annual','CC BY 4.0'),
    'territories':('ČSÚ','Územní číselník','annual','CC BY 4.0'),
    'geography':('ČÚZK','INSPIRE AU / RÚIAN','continuous','Podmínky ČÚZK; viz source URL'),
    'solar_capacity':('ERÚ','Technologická energetická zařízení – výroba elektřiny','monthly','Podmínky veřejných dat ERÚ; explicitní licence neuvedena'),
    'storage':('ERÚ','Technologická energetická zařízení – ukládání elektřiny','monthly','Podmínky veřejných dat ERÚ; explicitní licence neuvedena'),
    'heating':('ČSÚ','Sčítání 2021 – obydlené byty a vytápění','census','CC BY 4.0'),
    'households':('ČSÚ','Sčítání 2021 – hospodařící domácnosti','census','CC BY 4.0'),
    'charging':('MPO','Evidence veřejně přístupných dobíjecích stanic','quarterly','Veřejná evidence MPO; explicitní licence neuvedena'),
    'industry':('EEA','E-PRTR v16 – česká hlášení CO₂','annual','CC BY 4.0'),
    'pvgis':('European Commission JRC','PVGIS 5.3 SARAH3 municipal models','model release','European Commission reuse policy; viz source URL'),
}

def normalizations(population_year=2025):
    return {
        'absolute':{'label':'Absolutně','unitSuffix':''},
        'per_capita':{'label':f'Na obyvatele · základ {population_year}','denominator':'population','factor':1,'unitSuffix':'/ obyv.','referenceYear':population_year},
        'per_1000_capita':{'label':f'Na 1 000 obyvatel · základ {population_year}','denominator':'population','factor':1000,'unitSuffix':'/ 1 000 obyv.','referenceYear':population_year},
        'per_km2':{'label':'Na km²','denominator':'areaKm2','factor':1,'unitSuffix':'/ km²'},
        'per_household':{'label':'Na domácnost · Sčítání 2021','denominatorMetric':'households','denominatorYear':2021,'factor':1,'unitSuffix':'/ domácnost','referenceYear':2021},
    }

def canonical_metric(metric, source_id):
    m=dict(metric); source=dict(m.get('source') or {})
    m['source']=source; m['sourceId']=source_id
    if isinstance(source.get('limitations'),str):source['limitations']=[source['limitations']]
    source['provider']=SOURCES[source_id][0]
    m['timeType']=m.get('timeType') or ('timeseries' if len(m['years'])>1 else 'snapshot')
    m['category']={'context':'demography','heat':'heating'}.get(m['category'],m['category'])
    if m['id']=='industrial_facility_count':m['category']='industry'
    m['sourceUrl']=source.get('url'); m['sourceDate']=source.get('asOf') or source.get('updatedAt') or source.get('retrievedAt')
    m['methodology']=source.get('methodology','')
    m['limitations']=source.get('limitations',[])
    m['nonNegative']=True
    ranges={'solar_potential_kwh_kwp_year':[300,2000],'annual_irradiation_kwh_m2':[300,2500],'optimal_slope_deg':[0,90]}
    if m['id'] in ranges:m['expectedRange']=ranges[m['id']]
    if m['unit']=='MW':m['expectedRange']=[0,10000]
    m['expectedUnit']=m['unit']
    if m['status']=='verified':m['profile']=True
    norms=list(m['normalizations'])
    if 'per_capita' in norms:
        norms.insert(norms.index('per_capita')+1,'per_1000_capita')
    if m['category'] in ('electricity','renewables','storage','transport') and m['status']=='verified':
        norms.append('per_household')
    m['normalizations']=list(dict.fromkeys(norms))
    if m['timeType']=='static':m['normalizations']=['absolute']
    return m

def source_registry(root, metrics):
    rows=[]
    for ident,(provider,name,frequency,license_name) in SOURCES.items():
        meta=json.loads((Path(root)/f'data/sources/{ident}.json').read_text())
        src=meta.get('source',meta); members=[m for m in metrics if m['sourceId']==ident]
        rows.append({'id':ident,'provider':provider,'datasetName':name,
                     'url':src.get('url') or meta.get('url') or meta.get('downloadUrl'),
                     'downloadUrl':meta.get('downloadUrl') or meta.get('download',{}).get('archiveUrl'),
                     'retrievedAt':src.get('retrievedAt') or meta.get('retrievedAt'),
                     'license':src.get('license') or license_name,'expectedUpdateFrequency':frequency,
                     'geography':src.get('geographicGranularity') or 'municipality',
                     'timeCoverage':sorted({year for m in members for year in m['years']}),
                     'notes':src.get('scopeNote') or src.get('methodology') or meta.get('methodology',''),
                     'metricIds':[m['id'] for m in members]})
    return {'schemaVersion':1,'sources':rows}

def build_catalog(territories, root, geometries, population):
    from solar import build_solar
    from generation import build_generation
    from census import build_census
    from storage import build_storage
    from charging import build_charging
    from industry import build_industry
    from households import build_households
    from potential import build_potential
    root=Path(root); metrics=[]; datasets={}; audits={}; layers=[]

    def add(source_id, metric_rows, data_rows, audit, point_rows=()):
        for m in metric_rows:
            if m['id'] in datasets:raise ValueError('Duplicate metric adapter: '+m['id'])
            metrics.append(canonical_metric(m,source_id))
        datasets.update(data_rows); audits[source_id]=audit
        if isinstance(point_rows,dict):
            point_rows=[points if isinstance(points,dict) else {'id':key,'name':key.replace('_',' '),'type':points[0]['type'] if points else 'facility',
                         'source':metric_rows[0]['source'],'points':points} for key,points in point_rows.items()]
        layers.extend(point_rows)

    pop_source=json.loads((root/'data/sources/population.json').read_text())
    latest=max(map(int,population))
    pm={'id':'population','name':'Počet obyvatel','unit':'obyv.','category':'demography','geography':['country','region','municipality'],
        'years':sorted(map(int,population)),'timeType':'timeseries','colorScale':'electricity','normalizations':['absolute','per_km2'],
        'path':'metrics/population.json','status':'verified','aggregation':'sum','source':{
            'name':'ČSÚ · REGUAP – obyvatelstvo','url':pop_source.get('url','https://csu.gov.cz/statistika/csu_a_uzemne_analyticke_podklady'),
            'asOf':f'{latest}-12-31','retrievedAt':pop_source['retrievedAt'],'geographicGranularity':'municipality','temporalGranularity':'annual',
            'methodology':'Ukazatel 2406UAP891; stav k 31. prosinci. Současné kódy obcí, ověřené krajské a národní součty. Sčítání a změny hranic mohou narušit srovnatelnost.'}}
    add('population',[pm],{'population':{'schemaVersion':1,'metricId':'population','status':'verified','values':population}}, {})
    m,d,a=build_solar(territories,root);add('solar_capacity',[m],{m['id']:d},a)
    for m,d,a in build_generation(territories,root):
        metrics.append(canonical_metric(m,'solar_capacity'));datasets[m['id']]=d;audits[m['id']]=a
    m,d,a=build_census(territories,root);add('heating',m,d,a)
    for source_id,builder,spatial in [('households',build_households,False),('storage',build_storage,False),
                                      ('charging',build_charging,True),('industry',build_industry,True),('pvgis',build_potential,False)]:
        result=builder(territories,root,geometries=geometries) if spatial else builder(territories,root)
        add(source_id,*result)
    # The group17 source has power/current, but no energy-capacity field.
    missing={'id':'battery_storage_capacity_mwh','name':'Ukládání elektřiny – energie v MWh (zdroj neuvádí)',
             'unit':'MWh','category':'storage','geography':['country','region','municipality'],'years':[],
             'timeType':'snapshot','normalizations':['absolute'],'path':None,'status':'unavailable',
             'colorScale':'storage','aggregation':'sum','source':dict(next(m['source'] for m in metrics if m['sourceId']=='storage'))}
    missing['source']['scopeNote']='ERÚ skupina 17 neobsahuje kapacitu v MWh. Proud v A není energetická kapacita; hodnoty nejsou odhadnuty.'
    metrics.append(canonical_metric(missing,'storage'))
    metrics.sort(key=lambda m:(CATEGORIES.index(m['category']),m['id']))
    return metrics,datasets,audits,layers
