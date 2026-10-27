import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterPoints} from '../public/js/analysis/clustering.mjs';
import {latestPointFeatures} from '../public/js/ui/layers-panel.mjs';
const point = (id,x,y) => ({id,geometry:{type:'Point',coordinates:[x,y]},properties:{name:id}});
test('screen grid clusters close observations, culls offscreen and follows zoom', () => {
  const points = [point('a',10,10),point('b',20,20),point('off',500,500)];
  const base = {project:x=>x,width:100,height:100,cellSize:32,camera:{x:0,y:0,z:1}};
  const groups = clusterPoints(points,base);
  assert.equal(groups.length,1); assert.equal(groups[0].features.length,2); assert.equal(groups[0].x,15);
  assert.equal(clusterPoints(points,{...base,camera:{x:0,y:0,z:4}}).length,2);
  assert.equal(clusterPoints(points,{...base,camera:{x:-500,y:-500,z:1}})[0].features[0].id,'off');
});
test('industry visible layer uses latest reporting year and excludes historic facility rows', () => {
  const data = {points:[{id:'old',year:2007},{id:'new',year:2022}],features:[point('old',1,1),point('new',1,1)]};
  assert.deepEqual(latestPointFeatures(data,{source:{latestAvailableYear:2022}}).map(p=>p.id),['new']);
  assert.equal(latestPointFeatures(data,{source:{asOf:'2026-09-30'}}).length,2);
});
