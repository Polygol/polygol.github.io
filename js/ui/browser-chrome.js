// State cache for title logic
const lastTitleData = {
    prefix: '',
    time: '',
    weather: ''
};

// Function to update the document title
function updateTitle() {
  const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
  if (disabledSys.includes('TitleFavicon')) return;

  if (isMobileDevice()) return;

  let titlePrefix = '';

  const truncate = (str) => {
      if (!str) return str;
      return str.length > 14 ? str.slice(0, 11) + '...' : str;
  };
  
  // 1. Check Live Activities
  const liveActivityTexts = [];
  if (typeof activeIslands !== 'undefined' && activeIslands.length > 0) {
      activeIslands.forEach(i => {
          if (i.type === 'live-activity' && i.data && i.data.text) {
              liveActivityTexts.push(truncate(i.data.text));
          }
      });
  }

  if (liveActivityTexts.length > 0) {
      titlePrefix = liveActivityTexts.join(' | ') + ' | ';
  } else {
      // 2. Check Media (Only if no live activities)
      if (typeof activeMediaSessionApp !== 'undefined' && activeMediaSessionApp && typeof mediaSessionStack !== 'undefined' && mediaSessionStack.length > 0) {
          const session = mediaSessionStack.find(s => s.appName === activeMediaSessionApp);
          if (session && session.metadata) {
              const { title, artist } = session.metadata;
              if (title && title !== 'Unknown Title') {
                  titlePrefix = `${truncate(title)} | `;
              }
          }
      } 
      // 3. Check Active App (Only if no Live Activity and no Media info)
      else {
          if (window.currentActiveAppUrl) {
              const appName = Object.keys(apps).find(name => apps[name].url === window.currentActiveAppUrl);
              if (appName) {
                  titlePrefix = `${truncate(appName)} | `;
              }
          }
      }
  }

  // 4. Time & Date Logic
  let now = new Date();
  let hours = now.getHours();
  let minutes = String(now.getMinutes()).padStart(2, '0');
  let seconds = String(now.getSeconds()).padStart(2, '0');

  let displayHours;
  let period = '';

  if (use12HourFormat) {
    period = hours >= 12 ? ' PM' : ' AM';
    displayHours = hours % 12 || 12;
    displayHours = String(displayHours).padStart(2, '0');
  } else {
    displayHours = String(hours).padStart(2, '0');
  }

  const timeString = showSeconds ? 
    `${displayHours}:${minutes}:${seconds}${period}` : 
    `${displayHours}:${minutes}${period}`;

  // 5. Weather Logic
  // Caching the showWeather check into a global state (updated by the toggle) avoids localStorage reads every second
  const isWeatherShown = typeof showWeather !== 'undefined' ? showWeather : (localStorage.getItem('showWeather') !== 'false');
  let weatherString = '';
  
  if (isWeatherShown) {
    // Only query if we don't have it, or it was removed
    if (!window._cachedTempEl || !document.body.contains(window._cachedTempEl)) {
        window._cachedTempEl = document.getElementById('temperature');
        window._cachedIconEl = document.getElementById('weather-icon');
    }

    if (window._cachedTempEl && window._cachedIconEl && window._cachedIconEl.dataset.weatherCode) {
      const temperature = window._cachedTempEl.textContent;
      const weatherCode = parseInt(window._cachedIconEl.dataset.weatherCode);

      if (weatherConditionsForTitle[weatherCode]) {
        weatherString = ` • ${temperature} ${weatherConditionsForTitle[weatherCode].icon}`;
      }
    }
  }

  // OPTIMIZATION: Only write to DOM if a string segment has actually changed
  if (lastTitleData.prefix !== titlePrefix || lastTitleData.time !== timeString || lastTitleData.weather !== weatherString) {
      document.title = `${titlePrefix}${timeString}${weatherString}`;
      lastTitleData.prefix = titlePrefix;
      lastTitleData.time = timeString;
      lastTitleData.weather = weatherString;
  }
}

function createShapedFavicon(source, shape) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const size = 64; 
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            ctx.beginPath();
            if (shape === 'circle') {
                ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
            } else if (shape === 'square') {
                // Rounded square (50% radius)
                const x = 0, y = 0, w = size, h = size, r = size * 0.25;
                ctx.moveTo(x+r, y);
                ctx.arcTo(x+w, y, x+w, y+h, r);
                ctx.arcTo(x+w, y+h, x, y+h, r);
                ctx.arcTo(x, y+h, x, y, r);
                ctx.arcTo(x, y, x+w, y, r);
            }
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, size, size);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(source); // Fallback to raw URL
        img.src = source;
    });
}

function createCompositeFavicon(sources) {
    return new Promise(async (resolve) => {
        const canvas = document.createElement('canvas');
        const size = 16;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Apply square rounding clip first
        const x = 0, y = 0, w = size, h = size, r = size * 0.25;
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.arcTo(x+w, y, x+w, y+h, r);
        ctx.arcTo(x+w, y+h, x, y+h, r);
        ctx.arcTo(x, y+h, x, y, r);
        ctx.arcTo(x, y, x+w, y, r);
        ctx.closePath();
        ctx.clip();

        // Load all images
        const images = await Promise.all(sources.map(src => {
            return new Promise(r => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => r(img);
                img.onerror = () => r(null);
                img.src = src;
            });
        }));

        const validImages = images.filter(img => img !== null);
        if (validImages.length === 0) { resolve(null); return; }
        
        if (validImages.length === 1) {
            ctx.drawImage(validImages[0], 0, 0, size, size);
        } else {
            // Split vertical. Draw first on left, second on right.
            // Draw into half-width slots
            ctx.drawImage(validImages[0], 0, 0, size/2, size);
            ctx.drawImage(validImages[1], size/2, 0, size/2, size);
        }
        
        resolve(canvas.toDataURL('image/png'));
    });
}

async function restoreCorrectFavicon(forceAppUrl = null) {
    // 1. Priority: Media (Square)
    if (typeof activeMediaSessionApp !== 'undefined' && activeMediaSessionApp && typeof mediaSessionStack !== 'undefined' && mediaSessionStack.length > 0) {
        const session = mediaSessionStack.find(s => s.appName === activeMediaSessionApp);
        if (session?.metadata?.artwork?.[0]?.src) {
            const url = session.metadata.artwork[0].src;
            const dataUrl = await createShapedFavicon(url, 'square');
            updateFavicon(dataUrl, false); 
            return;
        }
    }

    // 2. Priority: Live Activities (Square/Composite)
    if (typeof activeIslands !== 'undefined' && activeIslands.length > 0) {
        const activityIcons = [];
        activeIslands.forEach(i => {
            if (i.type === 'live-activity') {
                let src = i.data.imgUrl;
                if (!src && apps[i.data.appName]) src = apps[i.data.appName].icon;
                if (src) {
                    if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('./')) {
                        src = `./assets/appicon/${src}`;
                    }
                    if(!activityIcons.includes(src)) activityIcons.push(src);
                }
            }
        });

        if (activityIcons.length > 0) {
            const dataUrl = await createCompositeFavicon(activityIcons.slice(0, 2)); 
            if (dataUrl) {
                updateFavicon(dataUrl, false);
                return;
            }
        }
    }

    // 3. Priority: Current App (Circle)
    let targetUrl = forceAppUrl;
    
    // If no forced URL provided, use global state
    if (!targetUrl && window.currentActiveAppUrl) {
        targetUrl = window.currentActiveAppUrl;
    }

    if (targetUrl) {
        const appName = Object.keys(apps).find(name => apps[name].url === targetUrl);
        // Fallback for internal tools if not in apps list
        let iconUrl = apps[appName]?.icon;
        if (!iconUrl && !appName) iconUrl = 'system.png'; 

        if (iconUrl) {
            if (!iconUrl.startsWith('http') && !iconUrl.startsWith('./') && !iconUrl.startsWith('data:')) {
                iconUrl = `./assets/appicon/${iconUrl}`;
            }
            const dataUrl = await createShapedFavicon(iconUrl, 'circle');
            updateFavicon(dataUrl, false);
            return;
        }
    }

    // 4. Default
    if (originalFaviconUrl) {
        updateFavicon(originalFaviconUrl, false);
    }
}

/**
 * Creates a rounded version of an image using a canvas.
 * @param {string} url - The URL of the source image.
 * @returns {Promise<string>} A promise that resolves with the data URL of the rounded image.
 */
function createRoundedFavicon(url) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const size = 64; // Use a higher resolution for better quality
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Necessary for loading images onto a canvas
        img.onload = () => {
            // Create a circular clipping path
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            // Draw the image into the circular area
            ctx.drawImage(img, 0, 0, size, size);

            // Resolve the promise with the new data URL
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            // Reject if the image fails to load, allowing a fallback
            reject(new Error('Image could not be loaded for favicon.'));
        };
        img.src = url;
    });
}

// Function to dynamically update the document's favicon
async function updateFavicon(url, round = true) {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('TitleFavicon')) return;

    if (isMobileDevice()) return;

    let link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");

    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    if (round) {
        try {
            // Attempt to create and set the rounded icon
            const roundedUrl = await createRoundedFavicon(url);
            link.href = roundedUrl;
            link.type = 'image/png'; // The canvas will always output a PNG
        } catch (error) {
            console.warn("Could not create rounded favicon, falling back to original:", error);
            link.href = url; // Fallback to the original URL on error
        }
    } else {
        // If rounding is disabled, set the URL directly
        link.href = url;
        // Simple type detection for the original icon
        if (url.endsWith('.png')) {
            link.type = 'image/png';
        } else if (url.endsWith('.ico')) {
            link.type = 'image/x-icon';
        } else if (url.endsWith('.svg')) {
            link.type = 'image/svg+xml';
        }
    }
}

// Recursively update title based on whether seconds are needed
function startSynchronizedTitle() {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('TitleFavicon')) return;

    if (isMobileDevice()) return;

    updateTitle();
    const now = new Date();
    
    // IDLE OPTIMIZATION: Only update once per minute if seconds are not displayed
    const isShowingSeconds = typeof showSeconds !== 'undefined' ? showSeconds : true;
    const delay = isShowingSeconds 
        ? (1000 - now.getMilliseconds()) 
        : ((60 - now.getSeconds()) * 1000 - now.getMilliseconds());
        
    setTimeout(startSynchronizedTitle, delay);
}
startSynchronizedTitle();

function isFullScreen() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function goFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen();
    }
}

function updateFullscreenButtonVisibility() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        const isCurrentlyFullScreen = isFullScreen();
        fullscreenBtn.style.display = isCurrentlyFullScreen ? 'none' : 'flex';
    }
}

function checkFullscreen() {
  updateFullscreenButtonVisibility();

  if (!isFullScreen()) {
    showPopup(currentLanguage.NOT_FULLSCREEN);
  }

  const fsPopup = document.querySelector('#fullscreen-prompt-popup');
  if (isFullScreen() && fsPopup) {
    // If we have just entered fullscreen, hide any visible prompt.
    fsPopup.style.opacity = '0';
    setTimeout(() => {
        if (fsPopup.parentNode) {
            fsPopup.parentNode.removeChild(fsPopup);
        }
    }, 500);
  }
}

// Listen for fullscreen change events across different browsers
document.addEventListener('fullscreenchange', checkFullscreen);
document.addEventListener('webkitfullscreenchange', checkFullscreen);
document.addEventListener('mozfullscreenchange', checkFullscreen);
document.addEventListener('MSFullscreenChange', checkFullscreen);

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function calculateSmartZoom() {
    const width = window.innerWidth;
    // Elements should be readable from a distance (3-10ft) or glanceable.
	
    // Watch
    // Unusable
    if (width < 400) return 50;
	
    // Small mobile
    // Grrr
    if (width <= 600) return 90;
	
    // Mobile
    // No
    if (width <= 800) return 100;

    // Tablet / smart display
    // Yoy
    if (width <= 1080) return 125;

    // Monitors / wall display
    // Wow
    if (width <= 2048) return 150;

    // 4k
    // Uh
    return 200;
}

function checkIfPWA() {
  // Check if the app is running as a PWA (in standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    return false;
  }

  return false;
}

function promptToInstallPWA() {
    if (!localStorage.getItem('pwaPromptShown') && !checkIfPWA()) {
		showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.INSTALL_PROMPT
		});
        localStorage.setItem('pwaPromptShown', 'true');
    }
}

// Disable Ctrl+Wheel (Browser Zoom) on System
window.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// Fully disable pinch-to-zoom on iOS/touch devices
document.addEventListener('touchmove', function(e) {
    if (e.scale !== 1 && e.scale !== undefined) {
        e.preventDefault();
    }
    if (e.touches && e.touches.length === 2) {
        e.preventDefault();
    }
}, { passive: false });

// Prevents back/forward navigation
const _disabledSysNav = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
if (!_disabledSysNav.includes('NavBlocker')) {
    history.pushState(null, null, location.href);
    window.onpopstate = function () {
        history.go(1);
    };
}

// Block navigation keyboard shortcuts
window.addEventListener('keydown', (e) => {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('NavBlocker')) return;
    const isNavigationKey = 
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) || // Alt + Left/Right
        (e.metaKey && (e.key === '[' || e.key === ']')); // Cmd + [ / ] (Mac)

    if (isNavigationKey) {
        e.preventDefault();
        console.log("[System] Browser navigation shortcut blocked.");
    }
}, { capture: true });

function preventLeaving() {
    window.addEventListener('beforeunload', function (e) {
        const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
        if (disabledSys.includes('NavBlocker')) return;

        if (window.allowPageLeave) { return; } // Bypass for controlled reloads

		// Only prevent leaving if an app is open (foreground or minimized).
        const hasOpenApps = window.isAppOpen || Object.keys(minimizedEmbeds).length > 0;
        if (hasOpenApps) {
            e.preventDefault();
            e.returnValue = ''; // Standard for most browsers
            return ''; // For some older browsers
        }
    });
}