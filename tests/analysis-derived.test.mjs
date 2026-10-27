import test from 'node:test';
import assert from 'node:assert/strict';
import {MetricEngine} from '../public/js/engine.mjs';
import {installDerivedMetrics,parseDerivedFormula} from '../public/js/analysis/derived.mjs';
import {compareTerritories} from '../public/js/analysis/compare.mjs';

function fixture({populationB=300,numeratorB=9} = {}) {
  const metric = (id,years,timeType='snapshot') => ({id,name:id,unit:'u',years,timeType,path:`${id}.json`,normalizations:['absolute'],geography:['country','region','municipality'],aggregation:'sum',status:'verified',colorScale:'a',source:{name:`Source ${id}`,url:'https://example.org/data',asOf: timeType==='snapshot' ? `${years.at(-1)}-10-01` : undefined}});
  const manifest = {schemaVersion:1,defaultMetric:'solar_capacity',normalizations:{absolute:{}},colorScales:{a:['#000000','#ffffff']},metrics:[metric('solar_capacity',[2026]),metric('generation_capacity',[2026]),metric('ev_charging_points',[2026]),metric('industrial_co2_tonnes',[2010,2022],'timeseries'),metric('population',[2021,2025],'timeseries'),metric('unused',[2024])]};
  const territories = [{id:'CZ',name:'ČR',level:'country'}, {id:'R',name:'Region',level:'region',parentId:'CZ'}, {id:'a',name:'A',level:'municipality',parentId:'R',areaKm2:2},{id:'b',name:'B',level:'municipality',parentId:'R',areaKm2:8}];
  const data = Object.fromEntries(manifest.metrics.map(m => [m.id,{schemaVersion:1,metricId:m.id,values:Object.fromEntries(m.years.map(year => [year,m.id==='population' ? {a:100,b:populationB} : {a:1,b:numeratorB}]))}]));
  const fetches=[];
  const engine = new MetricEngine(manifest,territories,{fetchJSON:async path => {const id=path.split('/').at(-1).replace('.json','');fetches.push(id);return data[id];}});
  installDerivedMetrics(engine);
  return {engine,fetches,data};
}

test('safe declarative formula grammar and reference validation reject code and invalid factors', () => {
  assert.deepEqual(parseDerivedFormula('solar_capacity / population * 1000'),{numerator:'solar_capacity',denominator:'population',factor:1000,denominatorField:false});
  for (const formula of ['x + y','x / y; alert(1)','x / y * 0','x / y * Infinity','x / y * -1','Math.random()','x / y / z']) assert.throws(() => parseDerivedFormula(formula));
  const {engine}=fixture();assert.throws(() => installDerivedMetrics(new MetricEngine({schemaVersion:1,defaultMetric:'x',metrics:[{id:'x',years:[2021],normalizations:['absolute'],geography:['municipality'],path:'x'}],normalizations:{absolute:{}}},[]),[{id:'z',formula:'x / unknown'}]),/Neznámá metrika/);
  assert.equal(engine.metric('solar_capacity_per_1000').derived,true);
});

test('derived loads only dependencies, deduplicates concurrent cache and normal map APIs work', async () => {
  const {engine,fetches}=fixture();
  await Promise.all([engine.prepare('solar_capacity_per_1000'),engine.prepare('solar_capacity_per_1000')]);
  assert.deepEqual(fetches.sort(),['population','solar_capacity']);
  assert.equal(engine.value('solar_capacity_per_1000','a',2026).value,10);
  assert.equal(engine.series('solar_capacity_per_1000','a')[0].value,10);
  assert.equal(engine.domain('solar_capacity_per_1000',['a','b']).max,30);
  const result=engine.value('solar_capacity_per_1000','R',2026);
  assert.equal(result.value,25); // 10 / 400 * 1000; sum of local ratios would incorrectly be 40.
  assert.deepEqual(result.componentYears,{solar_capacity:2026,population:2025});assert.equal(result.mixedPeriods,true);
  await engine.load('solar_capacity_per_1000');assert.equal(fetches.length,2);
});

test('derived area denominator sums matching area and missing/zero never become zero', async () => {
  const {engine,fetches}=fixture();await engine.load('generation_capacity_per_km2');
  assert.equal(engine.value('generation_capacity_per_km2','R',2026).value,1);
  assert.deepEqual(fetches,['generation_capacity']);
  for (const populationB of [null,0]) {
    const {engine:e}=fixture({populationB});await e.load('solar_capacity_per_1000');
    assert.equal(e.value('solar_capacity_per_1000','b',2026).value,null);
    if(populationB===null) assert.equal(e.value('solar_capacity_per_1000','R',2026).value,null);
  }
  const {engine:e}=fixture({numeratorB:null});await e.load('solar_capacity_per_1000');
  assert.equal(e.value('solar_capacity_per_1000','R',2026).value,null);
  assert.equal(e.value('solar_capacity_per_1000','R',2026).coverageMismatch,true);
});

test('derived avoids future population denominator for historical emissions', async () => {
  const {engine}=fixture();await engine.load('industrial_co2_per_capita');
  assert.deepEqual(engine.metric('industrial_co2_per_capita').years,[2022]);
  assert.equal(engine.value('industrial_co2_per_capita','a',2010).value,null);
  const result=engine.value('industrial_co2_per_capita','a',2022);
  assert.equal(result.value,0.01);assert.deepEqual(result.componentYears,{industrial_co2_tonnes:2022,population:2021});
});

test('comparison aligns own periods, preserves missing and coverage, and only loads requested metrics', async () => {
  const {engine,fetches}=fixture({numeratorB:null});
  const result=await compareTerritories({engine,territoryIds:['a','b'],metricIds:['solar_capacity','industrial_co2_tonnes','solar_capacity_per_1000']});
  assert.deepEqual(fetches.sort(),['industrial_co2_tonnes','population','solar_capacity']);
  assert.equal(result.rows[0].year,2026);assert.equal(result.rows[0].values[0].period,'2026-10-01');
  assert.equal(result.rows[1].year,2022);assert.equal(result.rows[1].values[0].period,'2022');
  assert.equal(result.rows[0].values[1].missing,true);assert.equal(result.rows[0].values[1].value,null);
  assert.equal(result.rows[0].values[1].coverage,0);
  assert.equal(result.rows[2].values[0].componentPeriods.population.year,2025);
  await compareTerritories({engine,territoryIds:['a','b'],metricIds:['solar_capacity']});assert.equal(fetches.length,3);
});

test('comparison validates territories and metric references before loading', async () => {
  const {engine,fetches}=fixture();
  for(const territoryIds of [['a'],['a','a'],['a','b','R','CZ'],['a','unknown']]) await assert.rejects(compareTerritories({engine,territoryIds}));
  await assert.rejects(compareTerritories({engine,territoryIds:['a','b'],metricIds:['solar_capacity','unknown']}));
  assert.deepEqual(fetches,[]);
  const result=await compareTerritories({engine,territoryIds:['a','b','R']});assert.equal(result.territories.length,3);assert.deepEqual(fetches,['solar_capacity']);
});

test('known zero numerator stays zero; missing area and matching partial coverage are explicit', async () => {
  const {engine,data}=fixture({numeratorB:0});await engine.load('solar_capacity_per_1000');
  assert.equal(engine.value('solar_capacity_per_1000','b',2026).value,0);
  const partial=fixture({populationB:null,numeratorB:null});await partial.engine.load('solar_capacity_per_1000');
  const result=partial.engine.value('solar_capacity_per_1000','R',2026);
  assert.equal(result.value,10);assert.equal(result.partial,true);assert.equal(result.coverage,1);assert.equal(result.expected,2);
  await engine.load('generation_capacity_per_km2');engine.territories.get('b').areaKm2=null;
  assert.equal(engine.value('generation_capacity_per_km2','R',2026).value,null);
  // Data objects retain published values; decoration does not synthesize ratio records into inputs.
  assert.equal(data.solar_capacity.values['2026'].b,0);
});

test('comparison preserves unavailable cells without fetching unavailable paths', async () => {
  const {engine,fetches}=fixture();const unavailable=engine.metric('unused');unavailable.status='unavailable';unavailable.years=[];
  const result=await compareTerritories({engine,territoryIds:['a','b'],metricIds:['unused']});
  assert.deepEqual(fetches,[]);assert.equal(result.rows[0].year,null);
  assert.equal(result.rows[0].values[0].valueStatus,'unavailable');assert.equal(result.rows[0].values[0].period,null);
});

test('comparison labels model reference period independently of its storage year key', async () => {
  const {engine}=fixture();
  Object.assign(engine.metric('unused'), {timeType:'static',referencePeriod:'2005–2023'});
  const result=await compareTerritories({engine,territoryIds:['a','b'],metricIds:['unused']});
  assert.equal(result.rows[0].year,2024);
  assert.equal(result.rows[0].values[0].period,'Model · 2005–2023');
});
