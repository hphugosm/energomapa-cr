import test from 'node:test';
import assert from 'node:assert/strict';
import {PointLayerStore} from '../public/js/points.mjs';
// All IDs, coordinates and observations in these fixtures are synthetic.
const territories = [{id: 'fixture-municipality', level: 'municipality'}, {id: 'fixture-region', level: 'region'}];
const manifest = {points: [{id: 'fixture-layer', name: 'Synthetic chargers', kind: 'charger', path: 'points/fixture.json', source: {name: 'Synthetic test fixture', url: 'https://example.invalid/fixture'}}]};
const fixture = () => ({type: 'FeatureCollection', features: [{type: 'Feature', id: 'fixture-point', geometry: {type: 'Point', coordinates: [0, 0]}, properties: {name: 'Synthetic point', kind: 'charger', municipalityId: 'fixture-municipality', metrics: {arbitrary_metric: {'2025': 0, '2026': null}}}}]});
test('loads only on demand, shares concurrent requests and caches successful data', async () => {
  let calls = 0;
  const store = new PointLayerStore(manifest, territories, {fetchJSON: async path => {calls++; assert.equal(path, './data/points/fixture.json'); return fixture();}});
  assert.equal(calls, 0);
  const [a, b] = await Promise.all([store.load('fixture-layer'), store.load('fixture-layer')]);
  assert.equal(a, b); assert.equal(calls, 1);
  assert.equal(await store.load('fixture-layer'), a); assert.equal(calls, 1);
  assert.equal(a.features[0].properties.metrics.arbitrary_metric['2025'], 0);
});
test('failed requests and validation failures are retryable', async () => {
  let calls = 0;
  const store = new PointLayerStore(manifest, territories, {fetchJSON: () => {calls++; if (calls === 1) throw Error('offline'); if (calls === 2) return {type: 'FeatureCollection'}; return fixture();}});
  await assert.rejects(store.load('fixture-layer'), /offline/);
  await assert.rejects(store.load('fixture-layer'), /FeatureCollection/);
  assert.equal((await store.load('fixture-layer')).features.length, 1); assert.equal(calls, 3);
});
for (const [name, mutate] of [
  ['duplicate pointid', data => data.features.push(structuredClone(data.features[0]))],
  ['unknown municipality', data => data.features[0].properties.municipalityId = 'missing'],
  ['region is not municipality', data => data.features[0].properties.municipalityId = 'fixture-region'],
  ['longitude out of range', data => data.features[0].geometry.coordinates[0] = 181],
  ['latitude out of range', data => data.features[0].geometry.coordinates[1] = -91],
  ['nonfinite coordinate', data => data.features[0].geometry.coordinates[0] = Infinity],
  ['non-Point geometry', data => data.features[0].geometry.type = 'Polygon'],
  ['invalid year', data => data.features[0].properties.metrics.arbitrary_metric.bad = 4],
  ['nonfinite observation', data => data.features[0].properties.metrics.arbitrary_metric['2025'] = NaN],
  ['mismatched kind', data => data.features[0].properties.kind = 'battery'],
  ['missing source name', data => data.features[0].properties.source = {url: 'https://example.invalid'}],
]) test(`rejects ${name}`, async () => {
  const data = fixture(); mutate(data);
  const store = new PointLayerStore(manifest, territories, {fetchJSON: async () => data});
  await assert.rejects(store.load('fixture-layer'));
});
test('unknown and duplicate manifest layer IDs fail clearly', async () => {
  const store = new PointLayerStore({points: []}, territories);
  await assert.rejects(store.load('unknown'), /Neznámá/);
  assert.throws(() => new PointLayerStore({points: [manifest.points[0], manifest.points[0]]}, territories), /duplicitní/);
});
