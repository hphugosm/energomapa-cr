import test from 'node:test';
import assert from 'node:assert/strict';
import {MetricEngine} from '../public/js/engine.mjs';
import {EnergyProfile} from '../public/js/profile.mjs';

function fixture(fetchJSON) {
  const metric = (id, years, extra = {}) => ({id, name: id, years, profile: true,
    status: 'verified', path: `${id}.json`, normalizations: ['absolute'], unit: 'MW',
    geography: ['municipality', 'region', 'country'], aggregation: 'sum', ...extra});
  const manifest = {schemaVersion: 1, defaultMetric: 'one', normalizations: {absolute: {}},
    metrics: [metric('one', [2020, 2026], {source: {asOf: '2026-10-01'}}),
      metric('two', [2021], {unit: 'bytů'}), metric('demo', [2026], {status: 'demo'}),
      metric('context', [2025], {profile: false}), metric('unavailable', [], {status: 'unavailable'})]};
  const territories = [{id: 'CZ', level: 'country'}, {id: 'R', level: 'region', parentId: 'CZ'},
    {id: 'A', level: 'municipality', parentId: 'R'}, {id: 'B', level: 'municipality', parentId: 'R'}];
  const calls = [];
  const engine = new MetricEngine(manifest, territories, {fetchJSON: async path => {
    const id = path.split('/').at(-1).replace('.json', ''); calls.push(id);
    if (fetchJSON) return fetchJSON(id);
    return {schemaVersion: 1, metricId: id, values: id === 'one'
      ? {2020: {A: 1, B: 2}, 2026: {A: 5, B: null}} : {2021: {A: 0, B: 7}}};
  }});
  return {engine, calls, profile: new EnergyProfile(engine)};
}

test('profile is lazy, deduplicates opens and uses verified manifest entries only', async () => {
  const {profile, calls} = fixture();
  assert.deepEqual(calls, []);
  assert.deepEqual(profile.rows('CZ').map(row => row.id), ['one', 'two']);
  const first = profile.load(), again = profile.load();
  assert.strictEqual(first, again);
  await first;
  await profile.load();
  assert.deepEqual(calls, ['one', 'two']);
});

test('latest states keep their own date, unit, zero and missing coverage', async () => {
  const {profile} = fixture(); await profile.load();
  const [capacity, heating] = profile.rows('CZ');
  assert.equal(capacity.year, 2026); assert.equal(capacity.asOf, '2026-10-01');
  assert.equal(capacity.result.value, 5); assert.equal(capacity.result.partial, true);
  assert.equal(heating.year, 2021); assert.equal(heating.unit, 'bytů');
  assert.equal(heating.result.value, 7);
  assert.equal(profile.rows('A')[1].result.value, 0);
  assert.equal(profile.rows('B')[0].result.value, null);
});

test('one failed layer leaves other profile values usable and can be retried', async () => {
  let fail = true;
  const {profile, calls} = fixture(id => {
    if (id === 'two' && fail) throw Error('offline');
    return {schemaVersion: 1, metricId: id, values: id === 'one' ? {2026: {A: 5}} : {2021: {B: 7}}};
  });
  await profile.load();
  assert.deepEqual(profile.rows('CZ').map(row => row.status), ['ready', 'error']);
  assert.equal(profile.rows('B')[0].result.value, null);
  fail = false; await profile.load();
  assert.deepEqual(profile.rows('CZ').map(row => row.status), ['ready', 'ready']);
  assert.deepEqual(calls, ['one', 'two', 'two']);
});

test('profile rows expose each metric temporal type and source limitation',async()=>{
  const {engine,profile}=fixture();
  Object.assign(engine.metric('two'),{timeType:'static',limitation:'Census snapshot only',source:{name:'Census',url:'https://example.invalid',asOf:'2021-03-27'}});
  await profile.load();const row=profile.rows('A')[1];
  assert.equal(row.timeType,'static');assert.equal(row.limitation,'Census snapshot only');
  assert.equal(row.source.name,'Census');assert.equal(row.asOf,'2021-03-27');
});
