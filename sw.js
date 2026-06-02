/**
 * BillKaro PWA — Service Worker
 * Version: 2.0.0
 * Offline-first architecture with background sync
 */

const CACHE_NAME = 'billkaro-v2.0.0';
const SYNC_TAG = 'billkaro-sync';

// Core files to cache for offline use
const CORE_ASSETS = [
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/auth.js',
  '/js/sync.js',
  '/js/billing.js',
  '/js/pdf.js',
  '/js/dashboard.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // CDN fonts - cached on first use
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing BillKaro Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache core assets, ignore failures for external resources
        return Promise.allSettled(
          CORE_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn('[SW] Failed to cache:', url, err)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW] Core assets cached!');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating BillKaro Service Worker...');
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// ===== FETCH EVENT (Offline-First Strategy) =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Chrome extensions
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API requests — Network first, fallback to cache
  if (url.hostname.includes('api.') || url.pathname.includes('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // App shell and assets — Cache first, fallback to network
  event.respondWith(cacheFirstStrategy(event.request));
});

/**
 * Cache First Strategy: Return cached version if available,
 * otherwise fetch from network and cache it
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Background update of cache
      fetchAndUpdateCache(request);
      return cachedResponse;
    }
    // Not in cache, fetch from network
    return await fetchAndUpdateCache(request);
  } catch (error) {
    // Return offline fallback page
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;
    return new Response('Offline — Please install the app first', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Network First Strategy: Try network first, fall back to cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Fetch from network and update cache
 */
async function fetchAndUpdateCache(request) {
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingData());
  }
});

/**
 * Sync pending offline data to cloud
 */
async function syncPendingData() {
  console.log('[SW] Syncing pending data...');
  // Notify all clients to run sync
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_START', timestamp: Date.now() });
  });
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'BillKaro', {
      body: data.body || 'Naya notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'billkaro',
      data: data.url || '/',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Dekho', icon: '/icons/icon-72.png' },
        { action: 'close', title: 'Close' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data || '/')
    );
  }
});

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CACHE_CLEAR') {
    caches.delete(CACHE_NAME).then(() => {
      event.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

console.log('[SW] BillKaro Service Worker loaded — v2.0.0');
