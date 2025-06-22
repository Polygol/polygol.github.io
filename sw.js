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
  '/assets/marketing/hero3.png',
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

    // --- NEW: Handle un-caching an app ---
    if (event.data && event.data.action === 'uncache-app') {
        const appName = event.data.appName;
        console.log(`[SW] Received request to un-cache app: ${appName}`);
        // This is a simplified approach. A more robust way would be to get a list
        // of files to delete from the main thread, as the SW doesn't know them.
        // For now, we will log that the action was received.
        // A full implementation would require passing appData.filesToCache to the SW to delete.
    }
});


// FETCH: Serve assets from cache first (Cache-First Strategy).
self.addEventListener('fetch', event => {
    // For external APIs (like weather), always go to the network.
    // Do not attempt to cache these dynamic responses.
    const externalApiUrls = [
        'api.open-meteo.com',
        'nominatim.openstreetmap.org'
    ];
    if (externalApiUrls.some(url => event.request.url.includes(url))) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Use the "Stale-While-Revalidate" strategy for all other assets.
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 1. Make a network request in the background regardless.
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // If the fetch is successful, update the cache.
                    // We only cache valid GET requests.
                    if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });

                // 2. Return the cached response immediately if it exists.
                // The user gets a fast response while the cache updates in the background.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 3. If there's no cached response, wait for the network response.
                return fetchPromise;
            }).catch(error => {
                // This catch block handles cases where the initial cache.match fails
                // or when the user is offline and there's no cache.
                console.error('[SW] Fetch failed; likely offline and resource is not cached.', error);
                // You could return a fallback offline page here if you have one.
                // return caches.match('/offline.html');
            });
        })
    );
});
