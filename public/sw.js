/* Optional full offline copy. All URLs stay relative to the GitHub Pages scope. */
const CACHE = 'energomapa-offline-0.6.0';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'PREPARE_OFFLINE') return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      const response = await fetch(new URL('offline-files.json', self.registration.scope), {cache: 'reload'});
      if (!response.ok) throw Error('Seznam offline souborů není dostupný.');
      const manifest = await response.json(), cache = await caches.open(CACHE);
      let current = 0, next = 0;
      await Promise.all(Array.from({length: 4}, async () => {
        while (next < manifest.files.length) {
          const path = manifest.files[next++], url = new URL(path, self.registration.scope);
          if (!url.href.startsWith(self.registration.scope)) throw Error('Soubor je mimo rozsah aplikace.');
          const resource = await fetch(url, {cache: 'reload'});
          if (!resource.ok) throw Error(`Soubor ${path}: ${resource.status}`);
          await cache.put(url, resource); current++;
          port.postMessage({current, total: manifest.files.length});
        }
      }));
      port.postMessage({done: true, current, total: manifest.files.length});
    } catch (error) {port.postMessage({error: error.message});}
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(event.request, {ignoreSearch: true});
      if (saved) return saved;
      if (event.request.mode === 'navigate') {
        const index = await cache.match(new URL('index.html', self.registration.scope));
        if (index) return index;
      }
      throw error;
    }
  })());
});
