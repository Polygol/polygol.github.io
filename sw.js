const CACHE_NAME = 'gurasuraisu-cache-v1'; // Give your cache a clear name

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/index.js',
  '/js/lang.js',
  '/assets/ui/svg/load.svg',
  '/manifest.json',
  '/assets/img/favi/regular.png',
  '/assets/img/pwaicon/regular.png',
  '/assets/img/pwaicon/pride.png',
  '/assets/img/ver/14.png',
  '/assets/appicon/default.png',
  '/assets/appicon/alarm.png',
  '/assets/appicon/calculator.png',
  '/assets/appicon/docs.png',
  '/assets/appicon/music.png',
  '/assets/appicon/photos.png',
  '/assets/appicon/tasks.png',
  '/assets/appicon/video.png',
  '/assets/appicon/weather.png',
  '/assets/appicon/sketch.png',
  '/assets/appicon/mail.png',
  '/assets/appicon/home.png',
  '/assets/appicon/camera.png',
  '/assets/marketing/hero3.png',
  '/assets/sound/timer.mp3',
  'https://www.gstatic.com/delight/funbox/timer_utilitarian_v2.mp3',
  'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
  'https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&display=swap',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap',
  'https://fonts.googleapis.com/css2?family=Iansui&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap',
  'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap',
  'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap',
  'https://fonts.googleapis.com/css2?family=Rampart+One&display=swap',
  'https://fonts.googleapis.com/css2?family=Doto:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@200..900&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,700,1,0',
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
  '/chronos/index.html',
  '/ailuator/index.html',
  '/wordy/index.html',
  '/music/index.html',
  '/fantaskical/index.html',
  '/clapper/index.html',
  '/weather/index.html',
  '/moments/index.html',
  '/waves/index.html',
  '/camera/index.html'
];

// INSTALL: Cache all core assets when the SW is first installed.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets.');
        // Use individual cache.add() to prevent one failed request from failing all
        const promises = ASSETS_TO_CACHE.map(url => {
          // For external URLs, we need a Request object with no-cors mode
          // as a fallback if the server doesn't support CORS.
          const request = new Request(url, { mode: 'no-cors' });
          return cache.add(request).catch(err => console.warn(`[SW] Failed to cache ${url}`, err));
        });
        return Promise.allSettled(promises);
      })
  );
});

// ACTIVATE: Clean up old caches.
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

// *** NEW & IMPORTANT: Listen for messages from the app ***
self.addEventListener('message', event => {
    // Check if the message is an instruction to cache a new app
    if (event.data && event.data.action === 'cache-app') {
        const filesToCache = event.data.files;
        if (filesToCache && filesToCache.length > 0) {
            console.log(`[SW] Received request to cache app with ${filesToCache.length} files.`);
            event.waitUntil(
                caches.open(CACHE_NAME).then(cache => {
                    // Create requests that can handle cross-origin URLs
                    const cachePromises = filesToCache.map(url => {
                        const request = new Request(url, { mode: 'no-cors' });
                        return cache.add(request).catch(err => console.warn(`[SW] Failed to cache file: ${url}`, err));
                    });
                    return Promise.allSettled(cachePromises)
                        .then(() => console.log('[SW] App caching complete.'));
                })
            );
        }
    }
});


// FETCH: Serve assets from cache first (Cache-First Strategy).
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If we have a cached response, return it.
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, fetch from the network.
        return fetch(event.request).then(networkResponse => {
          // And cache the new response for next time.
          return caches.open(CACHE_NAME).then(cache => {
            // Be careful caching POST requests or other API calls if they shouldn't be static.
            if (event.request.method === 'GET') {
               // Clone the response because it can only be consumed once.
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
      .catch(error => {
        // If both cache and network fail, you can provide a fallback page.
        console.error('[SW] Fetch failed. You are offline, and there is no cache', error);
        // return caches.match('/offline.html'); // Optional: an offline fallback page
      })
  );
});
