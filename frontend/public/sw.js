// ═══════════════════════════════════════════════════════════════
// SIPTU Mobile — Service Worker
// Strategy: Cache First for static, Network First for API
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'siptu-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Static assets to pre-cache on install
const PRE_CACHE_URLS = [
  '/',
  '/login',
  '/favicon.png',
  '/logo/favicon.png',
  '/manifest.json',
];

// ─── Install: Pre-cache essential assets ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRE_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: Smart caching strategy ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, ws, etc.
  if (!url.protocol.startsWith('http')) return;

  // API calls → Network First
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/core_api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (JS, CSS, images, fonts) → Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests → Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Everything else → Network First
  event.respondWith(networkFirst(request));
});

// ─── Cache First Strategy ───
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ─── Network First Strategy ───
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ message: 'Anda sedang offline.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── Navigation Handler ───
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try to return cached version of the page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback to cached index.html (SPA)
    const fallback = await caches.match('/');
    if (fallback) return fallback;

    return new Response(offlineHTML(), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ─── Helpers ───
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/i.test(pathname)
    || pathname.startsWith('/assets/');
}

function offlineHTML() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SIPTU Mobile — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc; color: #1e293b;
    }
    .offline-card {
      text-align: center; padding: 48px 32px; max-width: 400px;
      background: white; border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    }
    .offline-icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
    p { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    button {
      background: #6D94C5; color: white; border: none; padding: 12px 32px;
      border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer;
    }
    button:hover { background: #5a7fb0; }
  </style>
</head>
<body>
  <div class="offline-card">
    <div class="offline-icon">📡</div>
    <h1>Anda Sedang Offline</h1>
    <p>Perangkat Anda tidak terhubung ke internet. Periksa koneksi dan coba lagi.</p>
    <button onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`;
}

// ─── Cache cleanup: limit dynamic cache size ───
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, maxItems);
  }
}

// Periodically trim dynamic cache
self.addEventListener('message', (event) => {
  if (event.data === 'trimCache') {
    trimCache(DYNAMIC_CACHE, 50);
  }
});

// ─── Push Notification Events ───
self.addEventListener('push', function (event) {
  let msg = {};
  if (event.data) {
    try {
      msg = event.data.json();
    } catch (err) {
      msg = { title: 'SIPTU ULTRA Mobile', body: event.data.text() };
    }
  } else {
    msg = { title: 'SIPTU ULTRA Mobile', body: 'Ada pembaruan status pengajuan di SIPTU.' };
  }

  const title = msg.title || 'SIPTU ULTRA Mobile';
  const targetUrl = (msg.data && msg.data.url) || msg.url || (typeof msg.action === 'string' && msg.action.startsWith('/') ? msg.action : '/app/layanan-mandiri');

  const options = {
    body: msg.body || 'Ada pengajuan atau pembaruan baru di SIPTU.',
    icon: msg.icon || '/logo192.png',
    badge: msg.badge || '/logo/favicon.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: msg.tag || ('siptu-notif-' + Date.now()),
    renotify: true,
    data: { url: targetUrl },
    actions: [
      { action: 'open_app', title: 'Buka Aplikasi' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();

  // Focus or open the target window
  var targetUrl = (e.notification.data && e.notification.data.url) || e.notification.data || '/app/layanan-mandiri';
  
  e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
          for (var i = 0; i < clientList.length; i++) {
              var client = clientList[i];
              if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
                  return client.focus();
              }
          }
          if (clients.openWindow) {
              return clients.openWindow(targetUrl);
          }
      })
  );
});
