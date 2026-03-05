let isSilentMode = localStorage.getItem('silentMode') === 'true'; // Global flag to track silent mode state
let originalFaviconUrl = '';
const initialFaviconLink = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
if (initialFaviconLink) {
    originalFaviconUrl = initialFaviconLink.href;
}
let currentLanguage = LANG_EN; // Default to English
let allowPageLeave = false; // Global flag to bypass beforeunload prompt
let blackoutHoldTimer = null;
let previousBlackoutSettings = {};
let autoSleepTimer = null;

/**
 * Sends a message to all active Gurapp iframes to update their cursor state.
 * @param {boolean} isVisible - True to show the cursor, false to hide it.
 */
function broadcastCursorState(isVisible) {
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
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
                showNotification(`System update is available to install.`, {
					header: `Polygol ${newV}`,
                    icon: 'update',
                    system: true,
                    buttonText: 'Restart and Install',
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
        showNotification('Service Worker not supported', { icon: 'error', system: true });
        return;
    }
    
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { showNotification('No registration', {icon:'error'}); return; }
        
        await reg.update();
        
        // Give it a moment to find something
        setTimeout(() => {
            if (!reg.installing && !reg.waiting) {
                 showDialog({ 
				    type: 'alert', 
				    title: 'System is up to date', 
				    message: `Polygol ${window.systemVersion} is the latest version.` 
				});
            }
        }, 1000);
    } catch(e) {
        console.error(e);
    }
}

function applyLanguage(language) {
    console.log('Applying language:', language);
    document.querySelector('.modal-content h3').innerText = language.CONTROLS;
    document.querySelector('#silent_switch_qc .qc-label').innerText = language.SILENT;
    document.querySelector('#temp_control_qc .qc-label').innerText = language.TONE;
    document.querySelector('#minimal_mode_qc .qc-label').innerText = language.MINIMAL;
    document.querySelector('#light_mode_qc .qc-label').innerText = language.DAYLIGHT;

    // Dynamically update labels in the grid
    document.querySelectorAll('.setting-label[data-lang-key]').forEach(label => {
        const key = label.getAttribute('data-lang-key');
        if (language[key]) {
            label.innerText = language[key];
        }
    });

    // Safely update elements that might not always be visible
    const versionButton = document.querySelector('.version-info button#versionButton');
    if (versionButton) versionButton.textContent = language.GET_DOCS;
    
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
            if (optionEl) optionEl.textContent = language[langKey];
        }
    }

    const alignmentSelect = document.getElementById('alignment-select');
    if (alignmentSelect) {
        const options = { "center": "ALIGN_CENTER", "left": "ALIGN_LEFT", "right": "ALIGN_RIGHT" };
        for (const [value, langKey] of Object.entries(options)) {
            const optionEl = alignmentSelect.querySelector(`option[value="${value}"]`);
            if (optionEl) optionEl.textContent = language[langKey];
        }
    }

    const adjustLabel = document.querySelector('#thermostat-popup .adjust-label');
    if (adjustLabel) {
        adjustLabel.textContent = language.ADJUST;
    }

    // Update checkWords and closeWords
    window.checkWords = language.CHECK_WORDS;
    window.closeWords = language.CLOSE_WORDS;
}

function selectLanguage(languageCode) {
    return new Promise(resolve => {
        const languageMap = {
            'EN': LANG_EN,
            'JP': LANG_JP,
            'DE': LANG_DE,
            'ES': LANG_ES,
            'KO': LANG_KO,
            'ZH': LANG_ZH
        };

        currentLanguage = languageMap[languageCode] || LANG_EN;
        console.log('Selected language code:', languageCode);
        console.log('Current language object:', currentLanguage);

        localStorage.setItem('selectedLanguage', languageCode);
        applyLanguage(currentLanguage);

        const languageSwitcher = document.getElementById('language-switcher');
        if (languageSwitcher) {
            languageSwitcher.value = languageCode;
        }

        // Broadcast the language change to all Gurapp iframes
        const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
        iframes.forEach(iframe => {
            if (iframe.contentWindow) {
                const targetOrigin = getOriginFromUrl(iframe.src);
                iframe.contentWindow.postMessage({
                    type: 'languageUpdate',
                    languageCode: languageCode
                }, targetOrigin);
            }
        });

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
        highContrast: document.documentElement.classList.contains('gurasuraisu-high-contrast'),
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