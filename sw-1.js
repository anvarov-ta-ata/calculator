// ATA Oil & Gas Field Calculator — Service Worker
// Версия кэша — меняй при обновлении файлов
const CACHE_NAME = 'ata-calc-v4';

// Файлы для кэширования офлайн
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/monitoring.html',
  '/balance.html',
  '/kompanovka.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/slide1.jpg',
  '/slide2.jpg',
  '/slide3.jpg',
  '/slide4.jpg',
  '/slide5.jpg',
  '/slide6.jpg',
  '/slide7.jpg',
  '/slide8.jpg',
  '/slide9.jpg',
  '/slide10.jpg',
  '/slide11.jpg',
  '/slide12.jpg',
  '/slide13.jpg',
  '/slide14.jpg',
  '/slide15.jpg'
];

// ── УСТАНОВКА ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app files');
      return Promise.allSettled(
        FILES_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// ── АКТИВАЦИЯ ──────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── ПЕРЕХВАТ ЗАПРОСОВ ──────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Внешние API запросы — всегда через сеть, не кэшировать
  const externalHosts = [
    'api.open-meteo.com',
    'geocoding-api.open-meteo.com',
    'wttr.in',
    'api.allorigins.win',
    'api.frankfurter.app',
    'cdn.jsdelivr.net',
    'latest.currency-api.pages.dev',
    'query1.finance.yahoo.com',
    'api.coingecko.com',
    'bigdatacloud.net',
    'nominatim.openstreetmap.org',
    'api.qrserver.com'       // QR генератор — не кэшировать
  ];

  if (externalHosts.some(host => url.hostname.includes(host))) {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  // Стратегия: сначала кэш, потом сеть (Cache First + фоновое обновление)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Отдаём из кэша, обновляем в фоне
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Нет в кэше — идём в сеть
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
