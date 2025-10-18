// Service worker - network first strategy (always fetch fresh)
const CACHE_NAME = 'todo-app-v3';

// Install - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - claim clients immediately and clear all caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL caches
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch - always use network (no caching for now to avoid issues)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, return error page
      return new Response('Offline - please check your connection', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
