const CACHE_NAME = 'polygol-cache-v4.66';

const ASSETS_TO_CACHE = [
  '/assets/img/regular-expressive-onload.webp',
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
  '/assets/gurapp/intl/settings/index.html',
  '/assets/gurapp/intl/settings/settings.css',
  '/assets/gurapp/intl/settings/settings.js',
  '/assets/appicon/appstore.png',
  '/assets/appicon/system.png',
  '/assets/appicon/transfer.png',
  '/assets/appicon/settings.png',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/suncalc.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Regular.woff2',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Medium.woff2',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Semibold.woff2',
  'https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Bold.woff2',
  '/assets/fonts/InterNumeric.ttf',
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap',
  'https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&display=swap',
  'https://fonts.googleapis.com/css2?family=Domine:wght@400..700&display=swap',
  'https://fonts.googleapis.com/css2?family=Climate+Crisis&display=swap',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap',
  'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap',  
  'https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@100..800&display=swap',
  'https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&display=swap',    
  'https://fonts.googleapis.com/css2?family=Doto:wght@400;700&display=swap', 
  'https://fonts.googleapis.com/css2?family=Nunito:wght@200..900&display=swap'
];

// INSTALL: Cache all assets. This now uses a single, simpler call.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets for new version.');
        // THE FIX: Use cache.addAll for the entire list.
        // It correctly handles CORS requests for cross-origin assets like fonts.
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(err => {
        console.error('[SW] Core asset caching failed:', err);
      })
  );
});

// ACTIVATE: Clean up old caches when this SW finally activates.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of open clients
  );
});

// MESSAGE: Listen for commands from the main application.
self.addEventListener('message', event => {
    if (!event.data) return;

    // Command to activate the new, waiting service worker
    if (event.data.action === 'skipWaiting') {
        console.log('[SW] Received skipWaiting command. Activating new version.');
        self.skipWaiting();
    }

    // Command to cache a newly installed app's files
    if (event.data.action === 'cache-app') {
        const filesToCache = event.data.files;
        if (filesToCache && filesToCache.length > 0) {
            console.log(`[SW] Caching ${filesToCache.length} files for new app.`);
            event.waitUntil(
                caches.open(CACHE_NAME).then(cache => {
                    return cache.addAll(filesToCache)
                        .then(() => console.log('[SW] App caching complete.'))
                        .catch(err => console.warn(`[SW] Failed to cache one or more app files. The app may not work offline.`, err));
                })
            );
        }
    }

    // Command to remove a deleted app's files from the cache
    if (event.data.action === 'uncache-app') {
        const filesToDelete = event.data.filesToDelete;
        if (filesToDelete && filesToDelete.length > 0) {
            console.log(`[SW] Deleting ${filesToDelete.length} files for uninstalled app.`);
            event.waitUntil(
                caches.open(CACHE_NAME).then(cache => {
                    const deletePromises = filesToDelete.map(url => {
                        return cache.delete(url).then(wasDeleted => {
                            if (wasDeleted) {
                                console.log(`[SW] Uncached: ${url}`);
                            }
                        });
                    });
                    return Promise.allSettled(deletePromises);
                })
            );
        }
    }
});

// FETCH: Serve assets using a combination of strategies.
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Strategy 1: Network Only for external APIs
    if (url.hostname === 'api.open-meteo.com' || url.hostname === 'nominatim.openstreetmap.org') {
        event.respondWith(fetch(request));
        return;
    }

    // Strategy 2: Cache First for everything else (core assets, fonts, app files)
    // This is fast and reliable for offline use. Updates are handled by the new SW version.
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // If not in cache, fetch from network, cache it, and return it.
                return fetch(request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                       return caches.open(CACHE_NAME).then(cache => {
                            // Use put for all requests, including opaque ones from CDNs
                            cache.put(request, networkResponse.clone());
                            return networkResponse;
                        });
                    }
                    return networkResponse;
                });
            })
    );
});
