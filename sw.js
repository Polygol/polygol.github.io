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
    const { request } = event;
    const url = new URL(request.url);

    // --- Strategy 1: Network Only for external APIs ---
    const externalApiUrls = [
        'api.open-meteo.com',
        'nominatim.openstreetmap.org'
    ];
    if (externalApiUrls.some(apiUrl => url.hostname.includes(apiUrl))) {
        event.respondWith(fetch(request));
        return;
    }

    // --- Strategy 2: Network-First for Gurapp HTML files ---
    // This ensures the user always gets the latest version of the app if they are online.
    // It checks if the path ends with a known Gurapp name followed by /index.html.
    const isGurappHtml = /\/(chronos|ailuator|wordy|fantaskical|moments|music|clapper|waves|sketchpad|invitations|weather|camera|appstore)\/index\.html$/.test(url.pathname);

    if (request.mode === 'navigate' || isGurappHtml) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // If network is successful, cache the new version and return it.
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // If network fails (user is offline), serve the app from the cache.
                    return caches.match(request);
                })
        );
        return;
    }

    // --- Strategy 3: Stale-While-Revalidate for everything else (CSS, JS, images, fonts) ---
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(cachedResponse => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                });

                // Return cached response immediately if it exists, otherwise wait for network.
                return cachedResponse || fetchPromise;
            });
        })
    );
});
