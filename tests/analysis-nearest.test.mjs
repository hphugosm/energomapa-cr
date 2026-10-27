import test from 'node:test';
import assert from 'node:assert/strict';
import {createNearestEngine, haversineDistance} from '../public/js/analysis/nearest.mjs';
import {PointLayerStore} from '../public/js/points.mjs';

const source = {name: 'Official fixture', url: 'https://example.org/source'};
const point = (id, lon, extra = {}) => ({id, name: id, lat: 50, lon, type: 'industry', municipalityCode: '123456', regionCode: 'CZ010', properties: {}, ...extra});
function fixture(points, extraSource = {}) {
  const layers = ['industrial_facilities', 'chargers'].map(id => ({id, name: id, type: 'industry', path: `points/${id}.json`, source: {...source, ...extraSource}}));
  const calls = [];
  const store = new PointLayerStore({points: layers}, [
    {id: '123456', level: 'municipality', parentId: 'CZ010'}, {id: 'CZ010', level: 'region'}
  ], {fetchJSON: async path => {
    calls.push(path); const id = path.includes('industrial_facilities') ? 'industrial_facilities' : 'chargers';
    return {schemaVersion: 1, layerId: id, source: {...source, ...extraSource}, points};
  }});
  return {engine: createNearestEngine(store), calls};
}

test('haversine returns kilometres, supports objects and handles identical/antipodal points', () => {
  assert.equal(haversineDistance(50, 14, 50, 14), 0);
  assert.ok(Math.abs(haversineDistance(0, 0, 0, 1) - 111.19508) < .0001);
  assert.equal(haversineDistance({lat: 0, lon: 0}, {lat: 0, lon: 1}), haversineDistance(0, 0, 0, 1));
  assert.ok(Math.abs(haversineDistance(0, 0, 0, 180) - 20015.11444) < .001);
});

test('invalid coordinates, limits, years and unknown layers fail before fetching', async () => {
  const {engine, calls} = fixture([]);
  for (const location of [{lat: NaN, lon: 14}, {lat: 91, lon: 14}, {lat: 50, lon: 181}, {lat: '50', lon: 14}, {}]) {
    await assert.rejects(engine.findNearest({...location, layer: 'chargers'}), RangeError);
  }
  await assert.rejects(engine.findNearest({lat: 50, lon: 14, layer: 'chargers', limit: 0}), RangeError);
  await assert.rejects(engine.findNearest({lat: 50, lon: 14, layer: 'chargers', year: '2022'}), RangeError);
  await assert.rejects(engine.findNearest({lat: 50, lon: 14, layer: 'unknown'}), /Neznámá/);
  assert.deepEqual(calls, []);
});

test('one layer loads lazily and cache is shared across repeated/concurrent searches', async () => {
  const {engine, calls} = fixture([point('near', 14), point('far', 15)]);
  assert.deepEqual(calls, []);
  const [a] = await Promise.all([engine.findNearest({lat: 50, lon: 14, layer: 'chargers'}), engine.findNearest({lat: 51, lon: 15, layer: 'chargers'})]);
  await engine.findNearest({lat: 50, lon: 14, layer: 'chargers'});
  assert.equal(calls.length, 1); assert.match(calls[0], /chargers/);
  assert.deepEqual(a.results.map(row => row.id), ['near', 'far']);
  assert.equal(a.results[0].distanceKm, 0);
  assert.deepEqual(a.results[0].source, source);
});

test('ties are deterministic and limit is honoured without merging colocated unrelated rows', async () => {
  const {engine} = fixture([point('b', 14), point('a', 14), point('c', 14)]);
  const result = await engine.findNearest({lat: 50, lon: 14, layer: 'chargers', limit: 2});
  assert.deepEqual(result.results.map(row => row.id), ['a', 'b']);
  assert.equal(result.totalCandidates, 3);
});

test('latest common reporting year is default; old-only facilities never masquerade as current', async () => {
  const {engine} = fixture([
    point('facility-2021', 14, {year: 2021, properties: {facilityId: 'f1'}}),
    point('facility-2022', 15, {year: 2022, properties: {facilityId: 'f1', co2Tonnes: 100}}),
    point('old-only-2021', 14, {year: 2021, properties: {facilityId: 'closed'}})
  ]);
  const result = await engine.findNearest({lat: 50, lon: 14, layer: 'industrial_facilities'});
  assert.equal(result.selectedYear, 2022);
  assert.deepEqual(result.availableYears, [2021, 2022]);
  assert.deepEqual(result.results.map(row => row.id), ['facility-2022']);
  assert.equal(result.results[0].properties.co2Tonnes, 100);
  const old = await engine.findNearest({lat: 50, lon: 14, layer: 'industrial_facilities', year: 2021});
  assert.equal(old.results.length, 2);
  const missing = await engine.findNearest({lat: 50, lon: 14, layer: 'industrial_facilities', year: 2023});
  assert.equal(missing.selectedYear, 2023); assert.deepEqual(missing.results, []);
});

test('stable facility identity deduplicates within selected year deterministically', async () => {
  const {engine} = fixture([point('b', 14, {year: 2022, properties: {facilityId: 'f'}}), point('a', 15, {year: 2022, properties: {facilityId: 'f'}})]);
  const result = await engine.findNearest({lat: 50, lon: 14, layer: 'industrial_facilities'});
  assert.deepEqual(result.results.map(row => row.id), ['a']);
  assert.equal(result.duplicatesExcluded, 1);
});

test('snapshot year uses observation asOf, not publication/retrieval date', async () => {
  const {engine} = fixture([point('station', 14)], {asOf: '2026-09-30', updatedAt: '2027-01-01'});
  const result = await engine.findNearest({lat: 50, lon: 14, layer: 'chargers'});
  assert.equal(result.selectedYear, 2026);
  assert.equal((await engine.findNearest({lat: 50, lon: 14, layer: 'chargers', year: 2025})).results.length, 0);
});

test('empty layer has no invented year or nearest result', async () => {
  const {engine} = fixture([]);
  const result = await engine.findNearest({lat: 50, lon: 14, layer: 'chargers'});
  assert.equal(result.selectedYear, null); assert.equal(result.totalCandidates, 0);
  assert.deepEqual(result.results, []);
});

test('malformed coordinates from an alternate store are excluded, never coerced', async () => {
  const engine = createNearestEngine({layer: () => ({id: 'custom', source}), load: async () => ({source, points: [point('valid', 14), point('missing', null), point('invalid', 200)]})});
  const result = await engine.findNearest({lat: 50, lon: 14, layer: 'custom'});
  assert.equal(result.invalidCoordinates, 2); assert.equal(result.totalCandidates, 1);
  assert.equal(result.distanceMethod, 'straight-line');
});
