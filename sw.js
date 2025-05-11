const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/index.js',
  '/js/lang.js',
  '/assets/ui/svg/load.svg',
  '/assets/13.png',
  '/manifest.json',
  '/assets/favicon.png',
  '/assets/gurasuraisu.png',
  '/assets/gurasuraisu-icon.png',
  '/assets/gurasuraisu-icon-alt.png',
  '/assets/appicon/alarm.png',
  '/assets/appicon/calculator.png',
  '/assets/appicon/docs.png',
  '/assets/appicon/music.png',
  '/assets/appicon/photos.png',
  '/assets/appicon/sketch.png',
  '/assets/appicon/tasks.png',
  '/assets/appicon/video.png',
  '/assets/appicon/weather.png',
  '/assets/appicon/appstore.png',
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
  '/appstore/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('gurasuraisu-cache')
      .then(cache => {
        // Use individual cache.add() calls that won't fail the entire operation
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache: ${url}`, error);
              // Continue despite this individual failure
            })
          )
        );
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
