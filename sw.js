const CACHE_NAME = 'polygol-cache-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/recovery/index.html',
  '/index.html',
  '/css/styles.css',
  '/js/index.js',
  '/js/lang.js',
  '/assets/gurapp/api/gurasuraisu-api.js',
  '/assets/ui/svg/load.svg',
  '/manifest.json',
  '/assets/img/favi/regular.png',
  '/assets/img/pwaicon/regular.png',
  '/assets/img/pwaicon/coloricon.png',
  '/assets/img/pwaicon/monochrome.png',
  '/assets/img/ver/15.png',
  '/transfer/index.html',
  '/appstore/index.html',
  '/assets/appicon/appstore.png',
  '/assets/appicon/system.png',
  '/assets/appicon/transfer.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Regular.woff2',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Medium.woff2',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Semibold.woff2',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Bold.woff2',
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

        // Separate local assets from cross-origin assets
        const localAssets = ASSETS_TO_CACHE.filter(url => !url.startsWith('http'));
        const externalAssets = ASSETS_TO_CACHE.filter(url => url.startsWith('http'));

        // --- Cache local assets using the simple cache.add() ---
        const localCachePromise = cache.addAll(localAssets).catch(err => {
            console.warn('[SW] Failed to cache one or more local assets.', err);
        });

        // --- Cache external assets manually to handle opaque responses ---
        const externalCachePromises = externalAssets.map(url => {
            return fetch(url, { mode: 'no-cors' }) // Use no-cors to get the resource
                .then(response => {
                    // cache.put() CAN handle opaque responses, unlike cache.add()
                    return cache.put(url, response);
                })
                .catch(err => {
                    console.warn(`[SW] Failed to fetch and cache external asset: ${url}`, err);
                });
        });

        // Wait for all caching operations to complete
        return Promise.all([localCachePromise, ...externalCachePromises]);
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
