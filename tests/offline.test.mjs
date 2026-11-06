import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {webcrypto, createHash} from 'node:crypto';
import vm from 'node:vm';

const script = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const digest = text => createHash('sha256').update(text).digest('hex');

for (const base of ['/', '/energomapa-cr/']) test(`A03 atomic offline refresh, HTTP 503, integrity and worker restart at ${base}`, async t => {
  let revision = 1, fail = false, corrupt = false, offline = false, stagedA;
  const bodies = () => ({'index.html': `<p>snapshot ${revision}</p>`, 'a.json': JSON.stringify({snapshot: revision, key: 'a'}), 'b.json': JSON.stringify({snapshot: revision, key: 'b'})});
  let requests = [];
  const server = createServer(async (req, res) => {
    requests.push(req.url);
    const path = req.url.slice(base.length), data = bodies();
    if (path === 'offline-files.json') {
      const files = Object.entries(data).map(([path, text]) => ({path, sha256: digest(text), bytes: Buffer.byteLength(text)}));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({schemaVersion: 2, snapshot: digest(JSON.stringify(files)), files}));
    } else if (fail && path === 'b.json') {
      await stagedA.promise; // Guarantee that new a.json was written before the 503.
      res.writeHead(503); res.end('interrupted refresh');
    } else if (data[path]) res.end(corrupt && path === 'b.json' ? 'wrong bytes' : data[path]);
    else {res.writeHead(404); res.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const scope = `http://127.0.0.1:${server.address().port}${base}`;
  const stores = new Map();
  const key = request => typeof request === 'string' ? request : request.url;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const values = stores.get(name);
      return {
        async put(request, response) {
          values.set(key(request), response.clone());
          if (fail && name.startsWith('energomapa-snapshot-') && key(request).endsWith('/a.json')) stagedA.resolve();
        },
        async match(request, options = {}) {
          let url = key(request);
          if (options.ignoreSearch) url = url.split('?')[0];
          return values.get(url)?.clone();
        },
        async keys() {return [...values.keys()].map(url => new Request(url));},
      };
    },
    async keys() {return [...stores.keys()];},
    async delete(name) {return stores.delete(name);},
  };
  const startWorker = () => {
    const events = new Map();
    vm.runInNewContext(script, {self: {registration: {scope}, addEventListener: (type, fn) => events.set(type, fn)},
      URL, Response, crypto: webcrypto, caches, fetch: (...args) => {if (offline) throw Error('offline');return fetch(...args);}});
    return events;
  };
  let events = startWorker();
  const prepare = async () => {
    let completion, messages = [];
    events.get('message')({data: {type: 'PREPARE_OFFLINE'}, ports: [{postMessage: message => messages.push(message)}], waitUntil: promise => completion = promise});
    await completion;
    return messages.at(-1);
  };
  const saved = async path => {
    let promise;
    events.get('fetch')({request: new Request(scope + path), respondWith: result => promise = result});
    return (await promise).json();
  };
  assert.equal((await prepare()).done, true);
  const state = () => stores.get('energomapa-state-v2').get(scope + '__offline_active__').clone().text();
  const original = await state();
  revision = 2; fail = true;
  let resolve; const promise = new Promise(done => resolve = done); stagedA = {promise, resolve};
  assert.match((await prepare()).error, /503/);
  assert.equal(await state(), original);
  assert.equal([...stores.keys()].filter(name => name.startsWith('energomapa-snapshot-')).length, 1);
  offline = true; events = startWorker();
  assert.equal((await saved('a.json')).snapshot, 1);
  assert.equal((await saved('b.json')).snapshot, 1);
  offline = false; fail = false; corrupt = true;
  assert.match((await prepare()).error, /integrita/);
  assert.equal(await state(), original);
  corrupt = false;
  assert.equal((await prepare()).done, true);
  offline = true;
  assert.equal((await saved('a.json')).snapshot, 2);
  assert.equal((await saved('b.json')).snapshot, 2);
  assert.ok(requests.filter(path => path.endsWith('b.json')).length >= 4);
});
