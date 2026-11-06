/* Complete immutable snapshots; the single state entry is the commit point. */
const PREFIX = 'energomapa-snapshot-v2-';
const STATE = 'energomapa-state-v2';
const RUNTIME = 'energomapa-runtime-v2';
const scoped = path => new URL(path, self.registration.scope).href;
const ACTIVE = scoped('__offline_active__');
const READY = scoped('__offline_complete__');
const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async buffer => hex(await crypto.subtle.digest('SHA-256', buffer));
let preparation = Promise.resolve();

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function prepare(port) {
  const name = PREFIX + crypto.randomUUID();
  let committed = false;
  try {
    const response = await fetch(scoped('offline-files.json'), {cache: 'no-store'});
    if (!response.ok) throw Error('Seznam offline souborů není dostupný.');
    const manifest = await response.json();
    if (manifest.schemaVersion !== 2 || !/^[a-f0-9]{64}$/.test(manifest.snapshot) || !Array.isArray(manifest.files) || !manifest.files.length) throw Error('Neplatný manifest offline kopie.');
    const urls = new Set();
    for (const item of manifest.files) {
      if (typeof item.path !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256) || !Number.isSafeInteger(item.bytes) || item.bytes < 0) throw Error('Neplatný záznam integrity.');
      const url = new URL(item.path, self.registration.scope);
      if (!url.href.startsWith(self.registration.scope) || url.search || url.hash || urls.has(url.href) || [ACTIVE, READY, scoped('offline-files.json')].includes(url.href)) throw Error('Duplicitní soubor nebo soubor mimo rozsah aplikace.');
      urls.add(url.href);
    }
    if (!urls.has(scoped('index.html'))) throw Error('Chybí úvodní stránka.');
    const cache = await caches.open(name);
    let next = 0, current = 0, failed = false;
    const workers = await Promise.allSettled(Array.from({length: 4}, async () => {
      while (!failed && next < manifest.files.length) {
        const item = manifest.files[next++], url = scoped(item.path);
        try {
          const resource = await fetch(url, {cache: 'no-store'});
          if (!resource.ok) throw Error(`Soubor ${item.path}: ${resource.status}`);
          const bytes = await resource.clone().arrayBuffer();
          if (bytes.byteLength !== item.bytes || await sha256(bytes) !== item.sha256) throw Error(`Soubor ${item.path}: nesouhlasí integrita.`);
          await cache.put(url, resource);
          port?.postMessage({current: ++current, total: manifest.files.length});
        } catch (error) { failed = true; throw error; }
      }
    }));
    // Wait for every worker before cleanup; late writes cannot recreate failed staging.
    const failure = workers.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    if (current !== manifest.files.length || (await cache.keys()).length !== manifest.files.length) throw Error('Offline kopie není úplná.');
    await cache.put(scoped('offline-files.json'), new Response(JSON.stringify(manifest), {headers: {'Content-Type': 'application/json'}}));
    await cache.put(READY, new Response(manifest.snapshot));
    const state = await caches.open(STATE);
    const previous = await state.match(ACTIVE);
    const previousName = previous ? (await previous.json()).cache : null;
    // Cache.put replaces this one entry atomically. No published snapshot is mutated.
    await state.put(ACTIVE, new Response(JSON.stringify({cache: name, snapshot: manifest.snapshot})));
    committed = true;
    // Keep the preceding complete cache for in-flight reads. Failed staging and
    // older/legacy copies can now be reclaimed without touching either snapshot.
    try {
      for (const old of await caches.keys()) {
        if ((old.startsWith(PREFIX) || old.startsWith('energomapa-offline-')) && old !== name && old !== previousName) await caches.delete(old);
      }
    } catch {} // Cleanup failure cannot undo a successful commit.
    port?.postMessage({done: true, current, total: manifest.files.length, snapshot: manifest.snapshot});
  } catch (error) {
    port?.postMessage({error: error.message});
  } finally {
    if (!committed) await caches.delete(name);
  }
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'PREPARE_OFFLINE') return;
  // Serialize refreshes so two tabs cannot interleave a commit and cleanup.
  preparation = preparation.catch(() => {}).then(() => prepare(event.ports[0]));
  event.waitUntil(preparation);
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const state = await caches.open(STATE), active = await state.match(ACTIVE);
    if (active) {
      const pointer = await active.json();
      const cache = await caches.open(pointer.cache);
      if (await cache.match(READY)) {
        const saved = await cache.match(event.request, {ignoreSearch: true});
        if (saved) return saved;
        if (event.request.mode === 'navigate') return cache.match(scoped('index.html'));
      }
    }
    // Before the first complete preparation, use a separate best-effort cache.
    // It can never overwrite an active complete snapshot.
    const runtime = await caches.open(RUNTIME);
    try {
      const response = await fetch(event.request);
      if (response.ok) await runtime.put(event.request, response.clone());
      return response;
    } catch (error) {
      const saved = await runtime.match(event.request, {ignoreSearch: true});
      if (saved) return saved;
      if (event.request.mode === 'navigate') {
        const index = await runtime.match(scoped('index.html'));
        if (index) return index;
      }
      throw error;
    }
  })());
});
