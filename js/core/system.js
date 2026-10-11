// Prevent all network downloads/uploads automatically when Wi-Fi is disabled
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        if (localStorage.getItem('wifiEnabled') === 'false') {
            return Promise.reject(new TypeError('Network request blocked: Wi-Fi is disabled in system settings.'));
        }
        return originalFetch.apply(this, args);
    };

    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        if (localStorage.getItem('wifiEnabled') === 'false') {
            throw new Error('Network request blocked: Wi-Fi is disabled in system settings.');
        }
        return new originalXHR();
    };
})();

let isSilentMode = localStorage.getItem('silentMode') === 'true'; // Global flag to track silent mode state
let originalFaviconUrl = '';
const initialFaviconLink = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
if (initialFaviconLink) {
    originalFaviconUrl = initialFaviconLink.href;
}
let currentLanguage = (typeof LANG_EN !== 'undefined' ? LANG_EN : {}); // Default to English
if (typeof window !== 'undefined') {
    window.currentLanguage = currentLanguage;
    window.language = currentLanguage;
    window.t = function(key, params = {}) {
        const dict = window.currentLanguage || currentLanguage || (typeof LANG_EN !== 'undefined' ? LANG_EN : {});
        let str = dict[key] || (typeof LANG_EN !== 'undefined' && LANG_EN[key]) || key;
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(p => {
                str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
            });
        }
        return str;
    };
    window.getString = window.t;
}
let allowPageLeave = false; // Global flag to bypass beforeunload prompt
let blackoutHoldTimer = null;
let previousBlackoutSettings = {};
let autoSleepTimer = null;

/**
 * Sends a message to all active APP iframes to update their cursor state.
 * @param {boolean} isVisible - True to show the cursor, false to hide it.
 */
function broadcastCursorState(isVisible) {
    const iframes = document.querySelectorAll('iframe[data-polygol-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({ 
                type: 'cursorStateUpdate', 
                visible: isVisible 
            }, targetOrigin);
        }
    });
}

// --- System Version Management ---
async function fetchSystemVersion() {
    try {
        const response = await fetch('/sw.js');
        const text = await response.text();
        const match = text.match(/const CORE_CACHE_VERSION = '(.*)';/);
        if (match && match[1]) {
            return match[1];
        }
    } catch (e) {
        console.warn("Could not fetch SW version", e);
    }
    return "Unknown";
}

async function updateSystemVersionUI() {
    const version = await fetchSystemVersion();
    window.systemVersion = version; // Expose globally
    
    // Update System Info Label
    const infoLabel = document.querySelector('.version-info span');
    if (infoLabel) {
        infoLabel.textContent = `Polygol ${version}`;
    }
}

// --- Service Worker Logic ---
let updateNotificationInterval = null;

async function setupServiceWorkerUpdateListener() {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('SystemUpdate')) {
        console.log("[System] System Update component disabled by user.");
        return;
    }

    if (!('serviceWorker' in navigator)) return;
	
    // Load Version Info on startup
    updateSystemVersionUI().then(() => {
        const checkUpdate = () => {
            // Check user preference
            const updatesEnabled = localStorage.getItem('updatesEnabled') !== 'false';
            if (!updatesEnabled) {
                console.log("[System] Automatic updates disabled. Skipping background check.");
                return;
            }

            const lastCheck = parseInt(localStorage.getItem('last_sw_check') || '0');
            const ONE_DAY = 24 * 60 * 60 * 1000;

            if (Date.now() - lastCheck > ONE_DAY) {
                console.log("[System] Running background update check...");
                navigator.serviceWorker.getRegistration().then(reg => {
                    // .update() downloads new assets silently without refreshing the page
                    if (reg) reg.update();
                    localStorage.setItem('last_sw_check', Date.now().toString());
                });
            }
        };

        // 1. Check immediately on boot
        checkUpdate();

        // 2. Check every 6 hours while the OS is running
        setInterval(checkUpdate, 6 * 60 * 60 * 1000);
    });

    const isUpdate = navigator.serviceWorker.controller !== null;

    navigator.serviceWorker.getRegistration().then(async reg => {
        if (!reg) return;

        // Function to handle a waiting worker
        const handleWaitingWorker = async (worker) => {
            const updatesEnabled = localStorage.getItem('updatesEnabled') !== 'false';
            
            if (!updatesEnabled) {
                console.log("[AutoUpdate] Update available but disabled by user settings.");
                return; 
            }

            // Define newV by fetching the latest version from the script
            const newV = await fetchSystemVersion();

			const showUpdateNotification = () => {
                showNotification(window.t('SYSTEM_UPDATE_AVAILABLE'), {
					header: `Polygol ${newV}`,
                    icon: 'update',
                    system: true,
                    buttonText: window.t('RESTART_INSTALL'),
                    buttonAction: () => {
                        worker.postMessage({ action: 'skipWaiting' });
                    }
                });
            };

            // Show immediately
            showUpdateNotification();

            // Set hourly reminder
            if (updateNotificationInterval) clearInterval(updateNotificationInterval);
            updateNotificationInterval = setInterval(() => {
                console.log("[AutoUpdate] Sending hourly reminder.");
                showUpdateNotification();
            }, 3600000); // 1 hour
        };

        // Check if there is already a waiting worker on load
        if (reg.waiting) {
            await handleWaitingWorker(reg.waiting);
        }

        reg.onupdatefound = () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.onstatechange = async () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        await handleWaitingWorker(newWorker);
                    }
                };
            }
        };
    });

    let refreshing;
    // This listener is only triggered when the user explicitly clicks 
    // the "Restart and Install" button in the notification.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing && isUpdate) {
            console.log("[System] New Service Worker activated. Finalizing update...");
            window.location.reload();
            refreshing = true;
        }
    });
}

// Force Update: Triggered by Settings
async function forceUpdatePolygol() {
    if (!('serviceWorker' in navigator)) {
        showNotification(window.t('SERVICE_WORKER_NOT_SUPPORTED'), { icon: 'error', system: true });
        return;
    }
    
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { showNotification(window.t('NO_REGISTRATION'), {icon:'error'}); return; }
        
        await reg.update();
        
        // Give it a moment to find something
        setTimeout(() => {
            if (!reg.installing && !reg.waiting) {
                 showDialog({ 
				    type: 'alert', 
				    title: window.t('SYSTEM_UP_TO_DATE'), 
				    message: window.t('SYSTEM_UP_TO_DATE_MSG', { version: window.systemVersion })
				});
            }
        }, 1000);
    } catch(e) {
        console.error(e);
    }
}

function applyLanguage(language) {
    currentLanguage = language;
    if (typeof window !== 'undefined') {
        window.currentLanguage = language;
        window.language = language;
    }
    console.log('Applying language:', language);

    const storedCode = (localStorage.getItem('selectedLanguage') || 'EN').toUpperCase();
    const normCode = (language === (window.LANG_JP || window.LANG_JA)) ? 'JP' :
                     (language === window.LANG_KO ? 'KO' :
                     (language === window.LANG_ZH ? 'ZH' :
                     (['JP', 'JA', 'KO', 'ZH'].includes(storedCode) ? (storedCode === 'JA' ? 'JP' : storedCode) : 'EN')));

    if (document.documentElement) {
        document.documentElement.lang = getBcp47Locale(normCode);
        document.documentElement.style.setProperty('--no-notifications-text', JSON.stringify(language.NO_NOTIFICATIONS || 'No notifications'));
    }

    if (typeof moment !== 'undefined') {
        const momentLoc = (normCode === 'JP' || normCode === 'JA') ? 'ja' : (normCode === 'KO' ? 'ko' : (normCode === 'ZH' ? 'zh-cn' : 'en'));
        try {
            if (typeof ensureMomentLocales === 'function') ensureMomentLocales();
            moment.locale(momentLoc);
        } catch (e) {
            console.warn('[System] moment.locale error:', e);
        }
    }

    const controlsTitle = document.querySelector('.modal-content h3');
    if (controlsTitle && language.CONTROLS) controlsTitle.innerText = language.CONTROLS;
    const silentLabel = document.querySelector('#silent_switch_qc .qc-label');
    if (silentLabel && language.SILENT) silentLabel.innerText = language.SILENT;
    const toneLabel = document.querySelector('#temp_control_qc .qc-label');
    if (toneLabel && language.TONE) toneLabel.innerText = language.TONE;
    const minimalLabel = document.querySelector('#minimal_mode_qc .qc-label');
    if (minimalLabel && language.MINIMAL) minimalLabel.innerText = language.MINIMAL;
    const daylightLabel = document.querySelector('#light_mode_qc .qc-label');
    if (daylightLabel && language.DAYLIGHT) daylightLabel.innerText = language.DAYLIGHT;

    // Dynamically update elements with data-lang-key
    document.querySelectorAll('[data-lang-key]').forEach(label => {
        const key = label.getAttribute('data-lang-key');
        if (language[key]) {
            if (label.tagName === 'INPUT' || label.tagName === 'TEXTAREA') {
                label.value = language[key];
            } else {
                label.textContent = language[key];
            }
        }
    });

    // Dynamically update placeholders, titles and aria labels
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.getAttribute('data-lang-placeholder');
        if (language[key]) el.placeholder = language[key];
    });

    document.querySelectorAll('[data-lang-title]').forEach(el => {
        const key = el.getAttribute('data-lang-title');
        if (language[key]) el.title = language[key];
    });

    document.querySelectorAll('[data-lang-aria-label]').forEach(el => {
        const key = el.getAttribute('data-lang-aria-label');
        if (language[key]) el.setAttribute('aria-label', language[key]);
    });

    const resetBtn = document.getElementById('resetButton');
    if (resetBtn && language.RESET_BTN) {
        resetBtn.innerText = language.RESET_BTN;
    }

    // Safely update font dropdown options
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        const options = {
            "Inter": "DEFAULT", "Bricolage Grotesque": "WORK", "DynaPuff": "PUFFY", "Domine": "CLASSIC",
            "Climate Crisis": "STROKES", "JetBrains Mono": "MONO", "DotGothic16": "PIXEL",
            "Playpen Sans": "WRITTEN", "Jaro": "RAISED", "Doto": "DOT", "Nunito": "ROUND"
        };
        for (const [value, langKey] of Object.entries(options)) {
            const optionEl = fontSelect.querySelector(`option[value="${value}"]`);
            if (optionEl && language[langKey]) optionEl.textContent = language[langKey];
        }
    }

    const alignmentSelect = document.getElementById('alignment-select');
    if (alignmentSelect) {
        const options = { "center": "ALIGN_CENTER", "left": "ALIGN_LEFT", "right": "ALIGN_RIGHT" };
        for (const [value, langKey] of Object.entries(options)) {
            const optionEl = alignmentSelect.querySelector(`option[value="${value}"]`);
            if (optionEl && language[langKey]) optionEl.textContent = language[langKey];
        }
    }

    const adjustLabel = document.querySelector('#thermostat-popup .adjust-label');
    if (adjustLabel && language.ADJUST) {
        adjustLabel.textContent = language.ADJUST;
    }

    // Update checkWords and closeWords
    window.checkWords = language.CHECK_WORDS;
    window.closeWords = language.CLOSE_WORDS;

    if (typeof window.updateNavigationModeUI === 'function') {
        window.updateNavigationModeUI();
    }

    if (typeof updateClockAndDate === 'function') {
        updateClockAndDate();
    }

    broadcastLocaleUpdate();
}

function getBcp47Locale(langCode) {
    const code = (langCode || localStorage.getItem('selectedLanguage') || 'EN').toUpperCase();
    switch (code) {
        case 'JP':
        case 'JA':
            return 'ja-JP';
        case 'KO':
            return 'ko-KR';
        case 'ZH':
            return 'zh-CN';
        case 'EN':
        default:
            return 'en-US';
    }
}

function getSystemLocalePayload() {
    const langCode = localStorage.getItem('selectedLanguage') || 'EN';
    const normCode = (langCode === 'JA' || langCode === 'JP') ? 'JP' : (['KO', 'ZH'].includes(langCode) ? langCode : 'EN');
    return {
        languageCode: normCode,
        locale: getBcp47Locale(normCode),
        dateFormat: localStorage.getItem('systemDateFormat') || 'auto',
        use12HourFormat: localStorage.getItem('use12HourFormat') === 'true',
        timeZone: localStorage.getItem('timeZoneSelection') || 'auto'
    };
}

function broadcastLocaleUpdate() {
    const payload = getSystemLocalePayload();
    document.documentElement.lang = payload.locale;

    const iframes = document.querySelectorAll('iframe[data-polygol-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'localeUpdate',
                ...payload
            }, targetOrigin);
            iframe.contentWindow.postMessage({
                type: 'languageUpdate',
                languageCode: payload.languageCode
            }, targetOrigin);
            iframe.contentWindow.postMessage({
                type: 'dateFormatUpdate',
                dateFormat: payload.dateFormat
            }, targetOrigin);
        }
    });
}

function getSystemDateFormat() {
    return localStorage.getItem('systemDateFormat') || 'auto';
}

function setSystemDateFormat(format) {
    const valid = ['auto', 'YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'medium', 'long'].includes(format) ? format : 'auto';
    localStorage.setItem('systemDateFormat', valid);
    broadcastLocaleUpdate();
    if (typeof window.updateDynamicDate === 'function') {
        window.updateDynamicDate();
    }
    // Sync any select in DOM
    const el = document.getElementById('system-date-format-select');
    if (el) el.value = valid;
    return `System date format updated to '${valid}'`;
}

function getSystemLayoutVariables() {
    const isImmersive = document.body.classList.contains('immersive-active');
    const isMinimal = document.body.classList.contains('minimal-active');
    const navMode = localStorage.getItem('navigationMode') || 'gestures';
    const dockPinned = localStorage.getItem('dockPinned') === 'true';
    const screenCurve = parseInt(localStorage.getItem('screenCurve') || '0', 10);
    
    let topPadding = isImmersive ? 0 : (isMinimal ? 0 : 80);
    let bottomPadding = isImmersive ? 0 : (dockPinned ? 80 : (navMode === 'quickmenu' ? 40 : 16));
    let sidePadding = Math.max(16, Math.round(screenCurve * 0.4));
    
    return {
        '--top-screen-padding': `${topPadding}px`,
        '--bottom-screen-padding': `${bottomPadding}px`,
        '--side-screen-padding': `${sidePadding}px`,
        '--left-screen-padding': `${sidePadding}px`,
        '--right-screen-padding': `${sidePadding}px`,
        '--safe-area-inset-top': `${topPadding}px`,
        '--safe-area-inset-bottom': `${bottomPadding}px`,
        '--safe-area-inset-left': `${sidePadding}px`,
        '--safe-area-inset-right': `${sidePadding}px`,
        '--status-bar-height': `${topPadding}px`,
        '--dock-height': '80px',
        '--screen-curve': `${screenCurve}px`
    };
}

function broadcastSystemLayoutUpdate() {
    const vars = getSystemLayoutVariables();
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    
    const iframes = document.querySelectorAll('iframe[data-polygol-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'systemLayoutUpdate',
                variables: vars
            }, targetOrigin);
        }
    });
}

window.getBcp47Locale = getBcp47Locale;
window.getSystemLocalePayload = getSystemLocalePayload;
window.broadcastLocaleUpdate = broadcastLocaleUpdate;
window.getSystemDateFormat = getSystemDateFormat;
window.setSystemDateFormat = setSystemDateFormat;
window.getSystemLayoutVariables = getSystemLayoutVariables;
window.broadcastSystemLayoutUpdate = broadcastSystemLayoutUpdate;

function selectLanguage(languageCode) {
    return new Promise(resolve => {
        const languageMap = {
            'EN': LANG_EN,
            'JP': LANG_JP,
            'JA': LANG_JP,
            'KO': LANG_KO,
            'ZH': LANG_ZH
        };

        const normCode = (languageCode === 'JA' || languageCode === 'JP') ? 'JP' : (['KO', 'ZH'].includes(languageCode) ? languageCode : 'EN');
        currentLanguage = languageMap[normCode] || LANG_EN;
        console.log('Selected language code:', normCode);

        localStorage.setItem('selectedLanguage', normCode);
        document.documentElement.lang = getBcp47Locale(normCode);
        applyLanguage(currentLanguage);

        if (typeof window.updateDynamicDate === 'function') {
            window.updateDynamicDate();
        }

        const languageSwitcher = document.getElementById('language-switcher');
        if (languageSwitcher) {
            languageSwitcher.value = normCode;
        }

        // Broadcast locale and language change to all APP iframes
        broadcastLocaleUpdate();

        resolve(); // Let async functions await this
    });
}

function consoleLicense() {
    console.info(currentLanguage.LICENCE);
}

consoleLicense()

function consoleLoaded() {
    console.log(currentLanguage.LOAD_SUCCESS);
}

// Function to check storage availability
function checkStorageQuota(data) {
    try {
        localStorage.setItem('quotaTest', data);
        localStorage.removeItem('quotaTest');
        return true;
    } catch (e) {
        return false;
    }
}

// Request persistent storage for the OS itself
async function requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
        try {
            const isPersisted = await navigator.storage.persist();
            console.log(`[System] Persistent storage granted: ${isPersisted}`);
        } catch (e) {
            console.warn("[System] Failed to request persistent storage:", e);
        }
    }
}

window.getSystemStatus = function() {
    const batteryEl = document.getElementById('battery-status-indicator');
    const batteryIcon = batteryEl ? batteryEl.querySelector('span').textContent : 'battery_unknown';
    
    // Context Logic
    const context = {
        theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
        highContrast: document.documentElement.classList.contains('polygol-high-contrast'),
        reduceMotion: document.body.classList.contains('reduce-animations')
    };

    // Network Logic
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const network = {
        online: navigator.onLine,
        type: connection ? connection.type : 'unknown',
        effectiveType: connection ? connection.effectiveType : 'unknown',
        downlink: connection ? connection.downlink : 0
    };

    return {
        silent: isSilentMode,
        minimal: minimalMode,
        night: nightMode,
        battery: {
            level: (typeof window.currentBatteryLevel !== 'undefined') ? window.currentBatteryLevel : 100,
            charging: (typeof window.currentBatteryCharging !== 'undefined') ? window.currentBatteryCharging : false,
            icon: batteryIcon
        },
        network: network,
        wifi: navigator.onLine, // Legacy support
        context: context
    };
};

/**
 * Central Click Passthrough Function
 * Forwards clicks/taps through overlay handles (edge handles, gesture barrier, drawer handle, etc.)
 * directly to whatever element or app iframe is underneath.
 */
function forwardClick(clientX, clientY) {
    // 1. Temporarily disable pointer events on gesture overlays and edge handles
    const overlays = document.querySelectorAll('.kirbai-edge-handle, .drawer-handle, #home-gesture-bar, #swipe-overlay, .app-gesture-barrier, #app-gesture-barrier');
    const prevOverlayEvents = new Map();
    overlays.forEach(h => {
        prevOverlayEvents.set(h, h.style.pointerEvents);
        h.style.pointerEvents = 'none';
    });

    // 2. Ensure fullscreen embeds and iframes are targetable
    const passthrough = document.querySelectorAll('.fullscreen-embed, iframe');
    const originalEvents = new Map();
    passthrough.forEach(el => {
        originalEvents.set(el, el.style.pointerEvents);
        el.style.pointerEvents = 'auto';
    });

    // 3. Find element beneath the touch point
    const target = document.elementFromPoint(clientX, clientY);

    if (target) {
        const iframe = target.tagName === 'IFRAME' ? target : target.querySelector?.('iframe');
        if (iframe && iframe.contentWindow) {
            const rect = iframe.getBoundingClientRect();
            const zoom = (parseFloat(document.body.style.zoom) || 100) / 100;
            iframe.contentWindow.postMessage({
                type: 'forward-click',
                x: (clientX - rect.left) / zoom,
                y: (clientY - rect.top) / zoom
            }, '*');
        } else {
            target.dispatchEvent(new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX,
                clientY
            }));
        }
    }

    // 4. Restore original pointer events
    overlays.forEach(h => {
        h.style.pointerEvents = prevOverlayEvents.get(h) || '';
    });
    passthrough.forEach(el => {
        el.style.pointerEvents = originalEvents.get(el) || '';
    });
}

window.forwardClick = forwardClick;
window.forwardClickToActiveApp = forwardClick; // Central alias

window.isWallpaperEditingActive = function() {
    return document.body.classList.contains('edit-mode-active') ||
           document.getElementById('wallpaper-switcher-overlay')?.classList.contains('show') ||
           document.getElementById('wallpaper-picker-drawer')?.classList.contains('open') ||
           document.getElementById('edit-mode-ui')?.style.display === 'block';
};