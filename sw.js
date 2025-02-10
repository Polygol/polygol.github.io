const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/index.js',
  '/assets',
  '/manifest.json',
  '/assets/favicon.png',
  '/assets/gurasuraisu.png',
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
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('gurasuraisu-cache')
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== 'gurasuraisu-cache') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(async cachedResponse => {
        try {
          // Skip API calls
          if (event.request.url.includes('api.open-meteo.com') || 
              event.request.url.includes('nominatim.openstreetmap.org')) {
            return cachedResponse || fetch(event.request);
          }

          // Fetch network response
          const networkResponse = await fetch(event.request);
          const networkResponseClone = networkResponse.clone();

          // Compare responses
          if (cachedResponse) {
            const areSame = await compareResponses(cachedResponse.clone(), networkResponseClone);
            
            if (!areSame) {
              // Update cache if different
              const cache = await caches.open('gurasuraisu-cache');
              await cache.put(event.request, networkResponse.clone());
              return networkResponse;
            }
            return cachedResponse;
          }

          // If no cached response, add to cache
          const cache = await caches.open('gurasuraisu-cache');
          await cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          // Fallback to cached response or root
          return cachedResponse || caches.match('/');
        }
      })
  );
});

async function compareResponses(cachedResponse, networkResponse) {
  // Compare response types
  if (cachedResponse.type !== networkResponse.type) return false;
  
  // Compare response status
  if (cachedResponse.status !== networkResponse.status) return false;
  
  try {
    const cachedText = await cachedResponse.text();
    const networkText = await networkResponse.text();
    return cachedText === networkText;
  } catch (error) {
    // Fallback to header comparison if text comparison fails
    const cachedHeaders = Object.fromEntries(cachedResponse.headers.entries());
    const networkHeaders = Object.fromEntries(networkResponse.headers.entries());
    return JSON.stringify(cachedHeaders) === JSON.stringify(networkHeaders);
  }
}
