import test from 'node:test';
import assert from 'node:assert/strict';
import {MetricEngine, calendarYears, format} from '../public/js/engine.mjs';

const territories = [
  {id:'CZ', level:'country'}, {id:'R', parentId:'CZ', level:'region'},
  {id:'S', parentId:'CZ', level:'region'},
  {id:'A', parentId:'R', level:'municipality', areaKm2:2},
  {id:'B', parentId:'R', level:'municipality', areaKm2:8},
  {id:'C', parentId:'S', level:'municipality', areaKm2:10},
];
function fixture(values, options = {}) {
  const metric = {id:'arbitrary-new-metric', years:[2020,2021,2023], path:'new.json',
    normalizations:['absolute','area','person'], geography:['municipality','region','country'],
    aggregation:'sum', unit:'MWh', colorScale:'energy', ...options.metric};
  const manifest = {schemaVersion:1, defaultMetric:metric.id,
    normalizations:{absolute:{}, area:{denominator:'areaKm2'}, person:{denominatorMetric:'population',factor:1000}},
    colorScales:{energy:['#ffffff','#000000'],diverging:['#ff0000','#ffffff','#0000ff']},
    metrics:[metric,{...metric,id:'population',path:'pop.json',normalizations:['absolute']}]};
  const calls=[];
  const engine=new MetricEngine(manifest, options.territories || territories,{fetchJSON: options.fetchJSON || (async path=>{
    calls.push(path); const id=path.endsWith('pop.json')?'population':metric.id;
    return {schemaVersion:1,metricId:id,values:id==='population'?(options.population || {}):values};
  })});
  return {engine,calls,id:metric.id};
}

test('zero is measured; null and absent observations remain missing',async()=>{
  const {engine:e,id}=fixture({2020:{A:0,B:null}}); await e.load(id);
  assert.equal(e.value(id,'A',2020).value,0);
  assert.equal(e.value(id,'B',2020).value,null);
  assert.equal(e.value(id,'C',2020).value,null);
  assert.equal(e.aggregate(id,'R',2020).coverage,1);
});
test('municipality sums propagate to regions and country without averaging',async()=>{
  const {engine:e,id}=fixture({2020:{A:10,B:30,C:60}}); await e.load(id);
  assert.equal(e.value(id,'R',2020).value,40);
  assert.equal(e.value(id,'S',2020).value,60);
  assert.equal(e.value(id,'CZ',2020).value,100);
  assert.equal(e.value(id,'CZ',2020).coverage,3);
});
test('partial totals expose coverage; normalization uses only covered municipalities',async()=>{
  const {engine:e,id}=fixture({2020:{A:10,C:30}},{population:{2020:{A:100,B:900,C:300}}});
  await e.prepare(id,'person');
  const absolute=e.value(id,'CZ',2020), area=e.value(id,'CZ',2020,'area'), person=e.value(id,'CZ',2020,'person');
  assert.equal(absolute.partial,true); assert.equal(absolute.expected,3); assert.equal(absolute.coverage,2);
  assert.equal(area.denominator,12); assert.equal(area.value,40/12);
  assert.equal(person.denominator,400); assert.equal(person.value,100);
});
test('missing and zero denominator never become zero or infinity',async()=>{
  for(const population of [{2020:{A:0}},{2020:{}}]){
    const {engine:e,id}=fixture({2020:{A:5}},{population}); await e.prepare(id,'person');
    assert.equal(e.value(id,'A',2020,'person').value,null);
    assert.equal(e.value(id,'A',2020,'person').denominatorMissing,true);
  }
  const {engine:e,id}=fixture({2020:{A:5}},{territories:territories.map(t=>t.id==='A'?{...t,areaKm2:0}:t)});
  await e.load(id); assert.equal(e.value(id,'A',2020,'area').value,null);
});
test('annual difference uses previous calendar year and exact same covered towns',async()=>{
  const {engine:e,id}=fixture({2020:{A:10},2021:{B:20},2023:{A:40}}); await e.load(id);
  assert.equal(e.value(id,'R',2021,'absolute','yoy').value,null);
  assert.equal(e.value(id,'A',2023,'absolute','yoy').value,null);
  assert.deepEqual(calendarYears([2023,2020]),[2020,2021,2022,2023]);
  assert.equal(e.series(id,'A').find(p=>p.year===2022).value,null);
  const same=fixture({2020:{A:10},2021:{A:7}}); await same.engine.load(same.id);
  assert.equal(same.engine.value(same.id,'R',2021,'absolute','yoy').value,-3);
});
test('color scale covers full history, preserving comparable color over time',async()=>{
  const {engine:e,id}=fixture({2020:{A:10},2021:{A:100}}); await e.load(id);
  const domain=e.domain(id,['A']); assert.equal(domain.max,100);
  assert.equal(e.color(id,10,domain),'rgb(230, 230, 230)');
  assert.equal(e.color(id,null,domain),null);
  const signed=e.domain(id,['A'],'absolute','yoy'); assert.equal(signed.min,-90); assert.equal(signed.max,90);
});
test('loading is lazy, cached and concurrent requests share one fetch',async()=>{
  let resolve, calls=0; const response=new Promise(r=>resolve=r);
  const {engine:e,id}=fixture({}, {fetchJSON:()=>{calls++;return response;}});
  assert.equal(calls,0); const a=e.load(id), b=e.load(id); assert.equal(calls,1);
  resolve({schemaVersion:1,metricId:id,values:{2020:{A:11}}});
  assert.strictEqual(await a,await b); await e.load(id); assert.equal(calls,1);
});
test('failed loads can be retried and malformed data is not cached',async()=>{
  let calls=0; const {engine:e,id}=fixture({}, {fetchJSON:async()=>{
    calls++; if(calls===1) throw Error('offline');
    return {schemaVersion:1,metricId:id,values:{2020:{A:12}}};
  }});
  await assert.rejects(e.load(id),/offline/); await e.load(id); assert.equal(calls,2);
  const bad=fixture({2020:{A:'12'}}); await assert.rejects(bad.engine.load(bad.id),/Neplatná hodnota/);
  assert.equal(bad.engine.cache.size,0);
});
test('new manifest metric works through load, aggregation, normalization, series and color',async()=>{
  const {engine:e,id}=fixture({2020:{A:20},2021:{A:40}}); await e.prepare(id,'area');
  assert.equal(e.value(id,'R',2021,'area').value,20);
  assert.equal(e.series(id,'A','area')[0].value,10);
  assert.equal(typeof e.color(id,20,e.domain(id,['A'],'area')),'string');
  assert.throws(()=>e.metric('not-in-manifest'),/Neznámá metrika/);
});
test('a domain requested before loading is recomputed after successful load',async()=>{
  const {engine:e,id}=fixture({2020:{A:250}});
  assert.equal(e.domain(id,['A']).empty,true);
  await e.load(id);
  assert.equal(e.domain(id,['A']).max,250);
  assert.equal(e.domain(id,['A']).empty,false);
});
test('direct parent totals do not invent municipality coverage or normalization',async()=>{
  const {engine:e,id}=fixture({2020:{R:100},2021:{R:130}},{population:{2020:{A:100,B:200},2021:{A:100,B:200}}});
  await e.prepare(id,'person');
  assert.equal(e.value(id,'R',2020).value,100);
  assert.equal(e.value(id,'R',2020).coverage,null);
  assert.equal(e.value(id,'R',2020).coveredIds,null);
  assert.equal(e.value(id,'R',2020,'person').value,null);
  assert.equal(e.value(id,'R',2021,'absolute','yoy').value,null);
});


test('ratio of sums includes known zero denominators when the covered total is positive',async()=>{
  const local=territories.map(t=>t.id==='A'?{...t,areaKm2:0}:t);
  const {engine:e,id}=fixture({2020:{A:5,B:15}}, {territories:local,population:{2020:{A:0,B:100}}});
  await e.prepare(id,'person');
  assert.equal(e.value(id,'R',2020,'area').value,20/8);
  const person=e.value(id,'R',2020,'person');
  assert.equal(person.value,200); assert.equal(person.denominator,100);
  assert.deepEqual(person.coveredIds,['A','B']);
  assert.equal(e.value(id,'CZ',2020,'person').value,200);
  assert.equal(e.value(id,'A',2020,'person').value,null);
  assert.equal(e.value(id,'A',2020,'area').value,null);
});
test('all-zero, missing and negative components invalidate denominator sums',async()=>{
  for(const components of [{A:0,B:0},{A:0},{A:0,B:-1}]){
    const local=territories.map(t=>t.level==='municipality'?{...t,areaKm2:components[t.id]}:t);
    const {engine:e,id}=fixture({2020:{A:5,B:15}}, {territories:local,population:{2020:components}});
    await e.prepare(id,'person');
    for(const normalization of ['area','person']){
      const result=e.value(id,'R',2020,normalization);
      assert.equal(result.value,null); assert.equal(result.denominatorMissing,true);
      assert.deepEqual(result.coveredIds,['A','B']);
    }
  }
});

test('area weighted intensities use valid positive area and retain observed domain', async () => {
  const {engine:e,id}=fixture({2020:{A:100,B:200,C:null}}, {metric:{aggregation:'area_weighted_mean'}});
  await e.load(id);
  assert.equal(e.value(id,'R',2020).value,180);
  assert.equal(e.value(id,'CZ',2020).partial,true);
  assert.deepEqual(e.domain(id,['A','B']),{min:100,max:200,signed:false,empty:false});
  const invalid=fixture({2020:{A:100,B:200}}, {metric:{aggregation:'area_weighted_mean'},territories:territories.map(t=>t.id==='B'?{...t,areaKm2:0}:t)});
  await invalid.engine.load(invalid.id);
  assert.equal(invalid.engine.value(invalid.id,'R',2020).value,100);
  assert.equal(invalid.engine.value(invalid.id,'R',2020).coverage,1);
});
test('explicit observation statuses preserve not applicable separately from missing and zero',async()=>{
  const {engine:e,id}=fixture({}, {fetchJSON:async()=>({schemaVersion:1,metricId:'arbitrary-new-metric', values:{2020:{A:0,B:null}}, statuses:{2020:{B:'not_applicable',C:'unavailable'}}})});
  await e.load(id);
  assert.equal(e.value(id,'A',2020).valueStatus,'available');
  assert.equal(e.value(id,'B',2020).valueStatus,'not_applicable');
  assert.equal(e.value(id,'C',2020).valueStatus,'unavailable');
  assert.equal(e.value(id,'A',2021).valueStatus,'missing');
});
test('generic normalization factors and explicit denominator census year',async()=>{
  const {engine:e,id}=fixture({2023:{A:10}}, {population:{2020:{A:2}}});
  e.manifest.normalizations.person.denominatorYear=2020;
  await e.prepare(id,'person');
  assert.equal(e.value(id,'A',2023,'person').value,5000);
  e.manifest.normalizations.person.factor=1;
  assert.equal(e.value(id,'A',2023,'person').value,5);
});

test('small positive normalized values do not round into a measured zero', () => {
  assert.equal(format(0.000184), '0,000184');
  assert.equal(format(-0.00000004567), '-0,0000000457');
  assert.equal(format(0), '0');
  assert.equal(format(null), '—');
});
