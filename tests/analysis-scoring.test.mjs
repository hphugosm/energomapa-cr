import test from 'node:test';
import assert from 'node:assert/strict';
import {MetricEngine} from '../public/js/engine.mjs';
import {filterTerritories} from '../public/js/analysis/filters.mjs';
import {scoreLocations} from '../public/js/analysis/scoring.mjs';
import {SCORING_PRESETS} from '../public/js/analysis/presets.mjs';
function fixture(){
 const calls=[];const territories=[{id:'CZ',level:'country'},{id:'R',level:'region',parentId:'CZ'},...['A','B','C','D'].map(id=>({id,level:'municipality',parentId:'R',areaKm2:1}))];
 const metrics=['x','y','unused'].map(id=>({id,name:id,unit:'MW',years:[2021],path:`${id}.json`,normalizations:['absolute'],geography:['municipality','region','country'],aggregation:'sum'}));
 const values={x:{A:0,B:10,C:20,D:null},y:{A:20,B:10,C:null,D:0}};
 const engine=new MetricEngine({schemaVersion:1,defaultMetric:'x',normalizations:{absolute:{}},metrics},territories,{fetchJSON:async path=>{const id=path.split('/').at(-1).replace('.json','');calls.push(id);return {schemaVersion:1,metricId:id,values:{2021:values[id]}};}});
 return {engine,calls};
}
test('AND filters retain measured zero, report missing and load only requested datasets concurrently',async()=>{
 const {engine,calls}=fixture();
 const [result]=await Promise.all([filterTerritories({engine,conditions:[{metric:'x',operator:'>=',value:0},{metric:'y',operator:'between',value:10,max:20}]}),filterTerritories({engine,conditions:[{metric:'x',operator:'<',value:11}]})]);
 assert.deepEqual(result.rows.map(r=>r.id),['A','B']);assert.equal(result.excludedMissing,2);assert.equal(result.total,4);assert.deepEqual(calls.sort(),['x','y']);
 assert.equal(result.rows[0].values[0].value,0);assert.equal(result.rows[0].values[1].year,2021);
});
test('percentile filters use finite candidate population with deterministic ties',async()=>{
 const {engine}=fixture();
 const top=await filterTerritories({engine,conditions:[{metric:'x',operator:'top',value:34}]});
 assert.deepEqual(top.rows.map(r=>r.id),['B','C']);
 const bottom=await filterTerritories({engine,conditions:[{metric:'x',operator:'bottom',value:1}]});assert.deepEqual(bottom.rows.map(r=>r.id),['A']);
 engine.cache.get('x').values['2021'].B=20;
 const tie=await filterTerritories({engine,conditions:[{metric:'x',operator:'top',value:1}]});assert.deepEqual(tie.rows.map(r=>r.id),['B']);
});
test('weighted higher/lower score reports available weight coverage and deterministic ranking',async()=>{
 const {engine,calls}=fixture();
 const result=await scoreLocations({engine,criteria:[{metric:'x',weight:3,direction:'higher'},{metric:'y',weight:1,direction:'lower'}]});
 assert.deepEqual(result.rows.map(r=>r.id),['C','D','B','A']);
 const c=result.rows[0];assert.equal(c.score,100);assert.equal(c.coverage,75);assert.equal(c.availableCriteria,1);assert.equal(c.totalCriteria,2);
 assert.equal(result.rows.find(r=>r.id==='B').score,50);assert.equal(result.rows.find(r=>r.id==='A').score,0);
 assert.deepEqual(calls.sort(),['x','y']);
 const strict=await scoreLocations({engine,criteria:result.criteria,missingPolicy:'exclude'});assert.deepEqual(strict.rows.map(r=>r.id),['B','A']);assert.equal(strict.excludedMissing,2);
});
test('target range gives 100 within bounds, declines outside, constant metrics stay neutral',async()=>{
 const {engine}=fixture();
 const result=await scoreLocations({engine,criteria:[{metric:'x',weight:1,direction:'target',min:8,max:12}]});
 assert.equal(result.rows[0].id,'B');assert.equal(result.rows[0].score,100);
 assert.equal(result.rows[1].score,0);assert.equal(result.rows[2].score,0);
 const neutral=await scoreLocations({engine,criteria:[{metric:'x',weight:1,direction:'higher'}],territoryIds:['B']});assert.equal(neutral.rows[0].score,50);
});
test('partial aggregate is exposed as partial and never made complete',async()=>{
 const {engine}=fixture();const result=await scoreLocations({engine,criteria:[{metric:'x',weight:1,direction:'higher'}],territoryIds:['R']});
 assert.equal(result.rows[0].partial,true);assert.equal(result.rows[0].factors[0].partial,true);assert.equal(result.rows[0].factors[0].value,30);
});
test('invalid criteria and unavailable years fail before loading',async()=>{
 const {engine,calls}=fixture();
 for(const criteria of [[{metric:'x',weight:0,direction:'higher'}],[{metric:'x',weight:-1,direction:'higher'}],[{metric:'x',weight:1,direction:'target',min:2,max:1}],[{metric:'x',weight:1,direction:'higher',year:2020}]]) await assert.rejects(scoreLocations({engine,criteria}));
 for(const c of [{metric:'x',operator:'top',value:0},{metric:'x',operator:'between',value:1,max:0},{metric:'unknown',operator:'>',value:0}]) await assert.rejects(filterTerritories({engine,conditions:[c]}));
 assert.deepEqual(calls,[]);
});
test('presets contain only editable declarative criteria and positive weights',()=>{
 assert.equal(SCORING_PRESETS.length,5);
 for(const preset of SCORING_PRESETS) assert.ok(preset.criteria.every(c=>typeof c.metric==='string'&&c.weight>0&&['higher','lower','target'].includes(c.direction)));
});

test('zero-weight criteria never fetch unused datasets', async () => {
  const {engine,calls}=fixture();
  await scoreLocations({engine,criteria:[{metric:'x',weight:1,direction:'higher'},{metric:'unused',weight:0,direction:'higher'}]});
  assert.deepEqual(calls,['x']);
});

test('factor contributions explain the final score with available weight normalization',async()=>{
 const {engine}=fixture();
 const {rows}=await scoreLocations({engine,criteria:[{metric:'x',weight:25,direction:'higher'},{metric:'y',weight:75,direction:'lower'}]});
 for(const row of rows) assert.ok(Math.abs(row.score-row.factors.reduce((sum,f)=>sum+(f.contribution??0),0))<1e-10);
 assert.equal(rows.find(r=>r.id==='D').factors[0].contribution,null);
});
