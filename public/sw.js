const CACHE_NAME = 'kj-wiki-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  self.clients.claim();
});

// Pobieranie danych: najpierw sieć, potem cache (Pełna synchronizacja)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Rejestracja synchronizacji w tle
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-updates') {
    event.waitUntil(console.log('Synchronizacja danych w toku...'));
  }
});
