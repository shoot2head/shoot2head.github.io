/* shoot2head.mp3 service worker — makes the app shell work offline.
   Downloaded songs live in IndexedDB, so with the shell cached here the app
   opens offline and plays downloads without any network. */
const CACHE = 'shoot2head-mp3-v1';
const SHELL = ['index.html', 'script.js', 'style.css', 'logo.png', 'playlists.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // playlists.json: fresh from the server when online, cached copy when offline.
  if (url.pathname.endsWith('playlists.json')) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // App shell: cache first, network as fallback.
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
