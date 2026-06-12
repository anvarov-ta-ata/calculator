// ATA Oil & Gas Field Calculator — Service Worker
// v7: относительные пути (работает и на Vercel, и на GitHub Pages /calculator/),
//     пропуск POST и /api/, пропуск всех внешних доменов
const CACHE_NAME = 'ata-calc-v7';

// База вычисляется от расположения самого sw.js:
// на Vercel   -> '/'
// на GH Pages -> '/calculator/'
const BASE = new URL('./', self.location).pathname;

// Файлы для кэширования офлайн (пути относительно BASE)
const FILES_TO_CACHE = [
  '',                // корень ( '/' или '/calculator/' )
  'index.html',
  'monitoring.html',
  'balance.html',
  'kompanovka.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'slide1.jpg'
  // Остальные слайды НЕ предзагружаем: слайдер находит и грузит их сам,
  // а обработчик fetch кэширует каждый показанный слайд автоматически.
  // Добавление slideN.jpg не требует правок этого файла.
].map(f => BASE + f);

// ── УСТАНОВКА ──────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v7, base =', BASE);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        FILES_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// ── АКТИВАЦИЯ ──────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating v7...');
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => {
          console.log('[SW] Deleting old cache:', n);
          return caches.delete(n);
        })
      )
    )
  );
  self.clients.claim();
});

// ── ПЕРЕХВАТ ЗАПРОСОВ ──────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Не GET (POST к ИИ и т.п.) — не трогаем, идёт напрямую в сеть
  if (req.method !== 'GET') return;

  // 2) Чужие домены (погода, курсы, Метрика, QR, CDN...) — не трогаем.
  //    Браузер обработает их сам, ничего не кэшируем и не подменяем.
  if (url.origin !== self.location.origin) return;

  // 3) Свой бэкенд /api/ — только сеть, никогда не кэшируем
  if (url.pathname.includes('/api/')) return;

  // 4) HTML — Network First: свежая версия при наличии сети, кэш офлайн
  const isHTML = req.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === BASE;

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(netRes => {
          if (netRes && netRes.status === 200) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return netRes;
        })
        .catch(() => {
          console.log('[SW] Offline — serving from cache:', url.pathname);
          return caches.match(req).then(r => r || caches.match(BASE + 'index.html'));
        })
    );
    return;
  }

  // 5) Остальная статика (картинки, иконки, manifest) — Cache First
  //    с фоновым обновлением (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then(cached => {
      const netFetch = fetch(req).then(netRes => {
        if (netRes && netRes.status === 200) {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return netRes;
      }).catch(() => cached); // офлайн: что есть в кэше, то и отдаём

      return cached || netFetch;
    })
  );
});
