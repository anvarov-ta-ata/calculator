// ATA Oil & Gas Field Calculator — Service Worker
// Версия кэша — обновляется автоматически при изменении sw.js
const CACHE_NAME = 'ata-calc-v5';

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

// HTML-файлы — всегда Network First (обновления сразу видны)
const HTML_FILES = [
  '/index.html',
  '/monitoring.html',
  '/balance.html',
  '/kompanovka.html',
  '/'
];

// ── УСТАНОВКА ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v5...');
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
  // Активируем новый SW немедленно, не ждём закрытия вкладок
  self.skipWaiting();
});

// ── АКТИВАЦИЯ ──────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating v5...');
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
  // Берём управление всеми вкладками немедленно
  self.clients.claim();
});

// ── ПЕРЕХВАТ ЗАПРОСОВ ──────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Внешние API — только сеть, без кэша
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
    'api.qrserver.com',
    'api.anthropic.com',
    'cdnjs.cloudflare.com'
  ];

  if (externalHosts.some(host => url.hostname.includes(host))) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // HTML-файлы — Network First: сначала сеть, кэш только если нет связи
  const isHTML = HTML_FILES.includes(url.pathname) ||
                 event.request.destination === 'document';

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            // Обновляем кэш свежей версией
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Нет сети — отдаём из кэша
          console.log('[SW] Offline — serving from cache:', url.pathname);
          return caches.match(event.request).then(r => r || caches.match('/index.html'));
        })
    );
    return;
  }

  // Всё остальное (картинки, иконки) — Cache First
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Фоновое обновление кэша
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, networkResponse.clone())
            );
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;
        caches.open(CACHE_NAME).then(cache =>
          cache.put(event.request, networkResponse.clone())
        );
        return networkResponse;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
