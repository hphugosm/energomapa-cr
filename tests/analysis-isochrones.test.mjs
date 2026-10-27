import test from 'node:test';
import assert from 'node:assert/strict';
import {createIsochroneLoader,requestExternalIsochrones,validateIsochrones} from '../public/js/analysis/isochrones.mjs';
const polygon=time=>({type:'Feature',geometry:{type:'Polygon',coordinates:[[[14,50],[14.1,50],[14.1,50.1],[14,50]]]},properties:{contour:time,metric:'time'}});
const data={type:'FeatureCollection',features:[60,30,15].map(polygon)};
const index={schemaVersion:1,source:{name:'Valhalla'},origins:[{id:'a',name:'A',lat:50,lon:14,path:'a.geojson',minutes:[15,30,60]},{id:'b',name:'B',lat:51,lon:15,path:'b.geojson',minutes:[15,30,60]}]};
function fixture(){const calls=[];return {calls,loader:createIsochroneLoader({fetcher:async url=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('manifest.json')?index:data};}})};}
test('static loader is lazy, concurrent cached and filters requested contours',async()=>{
 const {loader,calls}=fixture();assert.deepEqual(calls,[]);
 const [a,b]=await Promise.all([loader.load({originId:'a',minutes:[15]}),loader.load({originId:'a',minutes:[30,60]})]);
 assert.equal(calls.length,2);assert.equal(a.geojson.features.length,1);assert.equal(b.geojson.features.length,2);assert.equal(a.origin.id,'a');assert.equal(a.approximateOrigin,false);
});
test('nearest only suggests known origin, never routes or claims selected location',async()=>{
 const {loader,calls}=fixture();const origin=await loader.nearest({lat:50,lon:14.01});assert.equal(origin.id,'a');assert.ok(origin.distanceKm>0);assert.equal(calls.length,1);
});
test('unknown origin and unavailable120minutes fail without polygon request',async()=>{
 const {loader,calls}=fixture();await assert.rejects(loader.load({originId:'missing'}),/počátek/);await assert.rejects(loader.load({originId:'a',minutes:[120]}),/120/);assert.equal(calls.length,1);
});
test('external routing requires configured endpoint, validates result and preserves actual origin',async()=>{
 let calls=0;const fetcher=async url=>{calls++;assert.equal(new URL(url).searchParams.has('json'),true);return {ok:true,json:async()=>data};};
 await assert.rejects(requestExternalIsochrones({lat:50,lon:14,fetcher}),/není nastaven/);assert.equal(calls,0);
 const r=await requestExternalIsochrones({endpoint:'http://localhost:8002/isochrone',lat:50,lon:14,minutes:[15,30,60],fetcher});assert.deepEqual(r.origin,{lat:50,lon:14});assert.equal(calls,1);
});
test('rejects point geometry, missing contours and invalid coordinates',()=>{
 assert.throws(()=>validateIsochrones({...data,features:[{...polygon(15),geometry:{type:'Point',coordinates:[14,50]}}]},[15]));
 assert.throws(()=>validateIsochrones(data,[15,30,60,120]),/všechny/);
 const bad=structuredClone(data);bad.features[0].geometry.coordinates[0][0]=[181,50];assert.throws(()=>validateIsochrones(bad,[15,30,60]),/souřadnice/);
});
