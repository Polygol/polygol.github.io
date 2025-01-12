const CACHE_NAME = 'gurasuraisu-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/index.js',
  '/assets/favicon.png',
  '/assets/appicon/alarm.png',
  '/assets/appicon/calculator.png',
  '/assets/appicon/docs.png',
  '/assets/appicon/music.png',
  '/assets/appicon/notes.png',
  '/assets/appicon/photos.png',
  '/assets/appicon/sketch.png',
  '/assets/appicon/tasks.png',
  '/assets/appicon/video.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Strategy: Cache First, Network Fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Cache new resources if they're not API calls
            if (!event.request.url.includes('api.open-meteo.com') && 
                !event.request.url.includes('nominatim.openstreetmap.org')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // Return a custom offline page or handle offline state
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});
