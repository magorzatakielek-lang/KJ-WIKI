const CACHE_NAME = 'kj-wiki-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/ikona.svg',
  '/ikona_favicon.svg',
  // dodaj tu inne pliki stylu lub skryptów (np. style.css, app.js)
];

// Instalacja i cache'owanie zasobów
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Aktywacja i czyszczenie starego cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Strategia Network First (najpierw sieć, potem cache dla synchronizacji)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Pełna synchronizacja w tle
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(performFullSync());
  }
});

async function performFullSync() {
  console.log('Inicjowanie pełnej synchronizacji danych...');
  // Tutaj dodaj logikę wysyłania zapisanych lokalnie zmian do Twojego API na Cloud Run
  // Przykład: pobierz dane z IndexedDB i wyślij przez fetch()
}

