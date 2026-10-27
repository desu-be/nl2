// Service worker: makes the app installable and keeps the last loaded version usable.
// - pages: network first, cached copy when offline;
// - hashed build assets (assets/*): cache first, they never change;
// - anything else on this origin: network first, cached copy when offline;
// - other origins (the GitHub API) are never touched.
const CACHE = 'nl2-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isAsset = url.pathname.includes('/assets/');
  event.respondWith(isAsset ? cacheFirst(request) : networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  return cached ?? fetchAndStore(request);
}

async function networkFirst(request) {
  try {
    return await fetchAndStore(request);
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function fetchAndStore(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}
