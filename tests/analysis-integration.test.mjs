import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MetricEngine} from '../public/js/engine.mjs';
import {filterTerritories} from '../public/js/analysis/filters.mjs';
import {scoreLocations} from '../public/js/analysis/scoring.mjs';
import {installDerivedMetrics} from '../public/js/analysis/derived.mjs';
const read=async file=>JSON.parse(await readFile(new URL('../public/data/'+file,import.meta.url),'utf8'));
async function realEngine(){
 const calls=[];const engine=new MetricEngine(await read('manifest.json'),await read('territories.json'),{baseURL:'',fetchJSON:async path=>{calls.push(path);return read(path);}});return {engine,calls};
}
test('real mixed-year criteria retain their own snapshot years and fetch only requested data',async()=>{
 const {engine,calls}=await realEngine();
 const conditions=[{metric:'population',operator:'>=',value:10000},{metric:'heating_heat_pump',operator:'>=',value:0},{metric:'ev_charging_points',operator:'>=',value:1}];
 const result=await filterTerritories({engine,conditions});
 assert.equal(result.total,6258);assert.ok(result.rows.length>0);
 assert.deepEqual(result.conditions.map(c=>c.year),[2025,2021,2026]);
 assert.deepEqual(calls.sort(),conditions.map(c=>`metrics/${c.metric}.json`).sort());
 for(const row of result.rows)assert.deepEqual(Object.values(row.values).map(v=>v.year),[2025,2021,2026]);
 await filterTerritories({engine,conditions});assert.equal(calls.length,3);
});
test('real published zeros remain eligible while missing charging records remain unknown',async()=>{
 const {engine}=await realEngine();
 const heating=await filterTerritories({engine,conditions:[{metric:'heating_heat_pump',operator:'<=',value:0}]});
 assert.ok(heating.rows.length>0);assert.ok(heating.excludedMissing>0);
 assert.ok(heating.rows.every(row=>row.values[0].value===0));
 const charging=await filterTerritories({engine,conditions:[{metric:'ev_charging_points',operator:'<=',value:0}]});
 assert.equal(charging.matched,0);assert.ok(charging.excludedMissing>5000);
});
test('real mixed-year weighted scoring exposes missing weight and complete-case policy',async()=>{
 const {engine}=await realEngine();const criteria=[{metric:'population',weight:1,direction:'higher'},{metric:'ev_charging_points',weight:3,direction:'lower'}];
 const result=await scoreLocations({engine,criteria});
 const missing=result.rows.find(row=>row.availableCriteria===1);assert.ok(missing);assert.equal(missing.coverage,25);
 assert.equal(missing.factors[1].value,null);assert.equal(missing.factors[1].score,null);
 assert.ok(result.rows.every(row=>Number.isFinite(row.score)&&row.score>=0&&row.score<=100));
 const strict=await scoreLocations({engine,criteria,missingPolicy:'exclude'});
 assert.ok(strict.rows.length<result.rows.length);assert.ok(strict.rows.every(row=>row.coverage===100&&row.availableCriteria===2));
 assert.deepEqual(result.criteria.map(c=>c.year),[2025,2026]);
});
test('real declarative ratios expose source years, respect coverage, and share lazy dependencies',async()=>{
 const {engine,calls}=await realEngine();installDerivedMetrics(engine);
 await Promise.all([engine.prepare('solar_capacity_per_1000'),engine.prepare('solar_capacity_per_1000')]);
 assert.deepEqual(calls.sort(),['metrics/population.json','metrics/solar_capacity.json']);
 const available=[...engine.territories.values()].find(t=>t.level==='municipality'&&engine.value('solar_capacity',t.id,2026).value>0);
 assert.ok(available);const ratio=engine.value('solar_capacity_per_1000',available.id,2026);
 assert.ok(ratio.value>0);assert.deepEqual(ratio.componentYears,{solar_capacity:2026,population:2025});assert.equal(ratio.mixedPeriods,true);
 assert.equal(ratio.value,engine.value('solar_capacity',available.id,2026).value/engine.value('population',available.id,2025).value*1000);
 assert.equal(engine.value('solar_capacity_per_1000','CZ',2026).value,null,'national partial numerator cannot silently divide by a differently covered population');
});
test('real comparison aligns all 22 available metrics to their own source period without loading unavailable storage energy',async()=>{
 const {compareTerritories}=await import('../public/js/analysis/compare.mjs');
 const {engine,calls}=await realEngine();const ids=engine.manifest.metrics.map(m=>m.id);
 const result=await compareTerritories({engine,territoryIds:['554782','582786','554821'],metricIds:ids});
 assert.equal(result.rows.length,23);assert.equal(calls.length,22);
 for(const row of result.rows){
   const metric=engine.metric(row.metricId);const ownYear=metric.years.length?Math.max(...metric.years):null;
   assert.equal(row.year,ownYear);
   for(const value of row.values)assert.equal(value.year,ownYear);
 }
 assert.equal(result.rows.find(row=>row.metricId==='heating_gas').values[0].period,'2021-03-26');
 assert.equal(result.rows.find(row=>row.metricId==='ev_charging_points').values[0].period,'2026-09-30');
 assert.ok(result.rows.find(row=>row.metricId==='battery_storage_capacity_mwh').values.every(value=>value.value===null&&value.valueStatus==='unavailable'));
});
