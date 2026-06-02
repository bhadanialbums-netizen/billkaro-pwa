/* BillKaro Service Worker v1.0 */
const CACHE_NAME = 'billkaro-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/db.js',
  '/js/app.js',
  '/js/billing.js',
  '/js/pdf.js',
  '/js/sync.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
];

/* Install — cache all assets */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.filter(u => !u.startsWith('http') || u.includes('fonts.googleapis') || u.includes('cdnjs'))))
      .then(() => self.skipWaiting())
  );
});

/* Activate — remove old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch — offline first for local, network first for CDN */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin && !url.hostname.includes('fonts') && !url.hostname.includes('cdnjs')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        if (e.request.destination === 'document') return caches.match('/index.html');
      });
    })
  );
});

/* Background sync */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-bills') {
    e.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  /* Notify all clients to sync */
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_NOW' }));
}

/* Push notifications for due reminders */
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'BillKaro', body: 'Reminder' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png'
    })
  );
});
