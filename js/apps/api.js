// --- Dynamic Permission Model ---
const PERMISSION_MAPPINGS = {
    // Direct Actions
    'requestFileUpload': 'file-upload',
    
    // API Functions
    'showNotification': 'notifications',
    'startLiveActivity': 'live-activity',
    'updateLiveActivity': 'live-activity',
    'stopLiveActivity': 'live-activity',
    'setImmersiveMode': 'immersive-mode',
    'registerWidget': 'widgets',
    'registerMediaSession': 'media-session',
    'clearMediaSession': 'media-session',
    'updateMediaPlaybackState': 'media-session',
    'updateMediaProgress': 'media-session',
    'speakText': 'tts',
    'setRemoteUI': 'waves',
    'sendRemoteUpdate': 'waves',
    'playUiSound': 'ui-sounds',
    
    // App Management
    'installApp': 'app-management',
    'installAppLink': 'app-management',
    'deleteApp': 'app-management',
    'requestInstalledApps': 'app-management',
    
    // System Admin (Root)
    'getLocalStorageItem': 'system-admin',
    'setLocalStorageItem': 'system-admin',
    'removeLocalStorageItem': 'system-admin',
    'listLocalStorageKeys': 'system-admin',
    'clearLocalStorage': 'system-admin',
    'listCommonSettings': 'system-admin',
    'listRecentWallpapers': 'system-admin',
    'removeWallpaperAtIndex': 'system-admin',
    'clearAllWallpapers': 'system-admin',
    'switchWallpaperParent': 'system-admin',
    'getCurrentTimeParent': 'system-admin',
    'rebootGurasuraisu': 'system-admin',
    'promptPWAInstall': 'system-admin',
    'executeParentJS': 'system-admin',
    'listIDBDatabases': 'system-admin',
    'listIDBStores': 'system-admin',
    'getIDBRecord': 'system-admin',
    'setIDBRecord': 'system-admin',
    'removeIDBRecord': 'system-admin',
    'clearIDBStore': 'system-admin',
    'deleteIDBDatabase': 'system-admin',
    'getLocalStorageAll': 'system-admin',
    'listCaches': 'system-admin',
    'deleteCache': 'system-admin',
    'forceUpdatePolygol': 'system-admin',
    'clearAllNotifications': 'system-admin',
    'forceCloseAppByName': 'app-management',
    'clearAppData': 'app-management'
};

const PERMISSION_NAMES = {
    'notifications': 'send notifications',
    'live-activity': 'show live activities',
    'immersive-mode': 'hide system UI',
    'file-upload': 'access your files',
    'widgets': 'register dashboard widgets',
    'media-session': 'control media playback',
    'tts': 'use text-to-speech',
    'waves': 'connect to Waves remotes',
    'ui-sounds': 'play system sound effects',
    'app-management': 'manage installed apps',
    'system-admin': 'modify core system settings (root access)'
};

// Lock mechanism to prevent spamming the user if an app fires 5 requests at once
const _pendingPermissionRequests = {};

async function checkAppPermission(sourceAppId, targetAction, origin) {
    const requiredPerm = PERMISSION_MAPPINGS[targetAction];
    if (!requiredPerm) return true; // No permission required for this action

    let perms = JSON.parse(localStorage.getItem('appPermissions') || '{}');
    if (!perms[sourceAppId]) perms[sourceAppId] = {};

    let status = perms[sourceAppId][requiredPerm];

    // Auto-grant for trusted internal system apps to prevent annoying the user
    const systemApps = ['Settings', 'Donburi', 'kirbStore'];
    if (systemApps.includes(sourceAppId) && (origin === window.location.origin || origin.startsWith('internal://'))) {
        return true;
    }

    // Default Grants 
    if (status === undefined && requiredPerm === 'ui-sounds') {
        perms[sourceAppId][requiredPerm] = 'granted';
        localStorage.setItem('appPermissions', JSON.stringify(perms));
        return true;
    }

    if (status === 'granted') return true;
    if (status === 'denied') return false;

    // Check if we are already asking the user for this exact permission right now
    const requestKey = `${sourceAppId}_${requiredPerm}`;
    if (_pendingPermissionRequests[requestKey]) {
        // Wait for the existing dialogue to finish instead of spawning a new one
        return await _pendingPermissionRequests[requestKey];
    }

    const friendlyName = PERMISSION_NAMES[requiredPerm] || requiredPerm;

    // Helper to resolve and save permission state
    const resolvePermission = (allowed) => {
        let currentPerms = JSON.parse(localStorage.getItem('appPermissions') || '{}');
        if (!currentPerms[sourceAppId]) currentPerms[sourceAppId] = {};
        currentPerms[sourceAppId][requiredPerm] = allowed ? 'granted' : 'denied';
        localStorage.setItem('appPermissions', JSON.stringify(currentPerms));
        delete _pendingPermissionRequests[requestKey];
        return allowed;
    };

    _pendingPermissionRequests[requestKey] = new Promise(async (resolve) => {
        if (requiredPerm === 'system-admin') {
            let confirmed = await showCustomConfirm(`${sourceAppId} will be able to read, modify, and delete all system data, settings, and other apps from now on. ONLY ALLOW THIS IF YOU ABSOLUTELY TRUST THIS APP!`, `READ CAREFULLY! Allow ${sourceAppId} to ${friendlyName}? (1/5)`, 'report');
            if (!confirmed) return resolve(resolvePermission(false));

            confirmed = await showCustomConfirm(`Are you absolutely sure? A malicious app with root access can permanently destroy your setup and cause irreversible damage.`, `READ CAREFULLY! Allow ${sourceAppId} to ${friendlyName}? (2/5)`, 'report');
            if (!confirmed) return resolve(resolvePermission(false));

            confirmed = await showCustomConfirm(`The system is not responsible for any damage caused by granting root to ${sourceAppId}. Proceed?`, `READ CAREFULLY! Allow ${sourceAppId} to ${friendlyName}? (3/5)`, 'report');
            if (!confirmed) return resolve(resolvePermission(false));

            confirmed = await showCustomConfirm(`This is last on-screen warning. Do you completely trust ${sourceAppId} with full control over your system?`, `READ CAREFULLY! Allow ${sourceAppId} to ${friendlyName}? (4/5)`, 'report');
            if (!confirmed) return resolve(resolvePermission(false));

            // STAGE 5: Notification Action
            let resolved = false;
            showNotification(`Ignore to deny`, {
                heading: `Allow ${sourceAppId} to ${friendlyName}? (5/5)`,
                icon: 'report',
                system: true,
                buttonText: 'Grant permission',
                buttonAction: () => {
                    if (!resolved) {
                        resolved = true;
                        resolve(resolvePermission(true));
                    }
                }
            });

            // Auto-deny if not clicked within 6 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    showPopup(`Automatically denied access to ${friendlyName} for ${sourceAppId}`);
                    resolve(resolvePermission(false));
                }
            }, 6000);

        } else {
            // Standard App Permission Flow
            const friendlyName = PERMISSION_NAMES[requiredPerm] || requiredPerm;
            let promptText = `${sourceAppId} will be able to ${friendlyName} from now on.`;
            let promptTitle = `Allow ${sourceAppId} to ${friendlyName}?`;
            let promptIcon = 'shield';

            const allowed = await showCustomConfirm(promptText, promptTitle, promptIcon);
            resolve(resolvePermission(allowed));
        }
    });

    return await _pendingPermissionRequests[requestKey];
}

function getLocalStorageItem(key) {
    return localStorage.getItem(key);
}

function setLocalStorageItem(key, value) {
    setControlValueAndDispatch(key, value);
    // Return a confirmation message
    return `Setting '${key}' was remotely triggered.`;
}

function removeLocalStorageItem(key) {
    localStorage.removeItem(key);
    return `Storage key '${key}' removed.`;
}

function listLocalStorageKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
    }
    return keys;
}

async function clearLocalStorage() {
    if (await showCustomConfirm(currentLanguage.RESET_CONFIRM)) {
        localStorage.clear();
        setTimeout(() => window.location.reload(), 100); // Give time for message to send
        return 'All Polygol localStorage data cleared. Reloading...';
    } else {
        return 'Operation cancelled.';
    }
}

const DEFAULTS_TRUE_KEYS = new Set([
    'gurappsEnabled', 'animationsEnabled', 'showSeconds', 'showWeather', 
    'aiAssistantEnabled', 'gurappSoundsEnabled', 'glassEffectsEnabled',
    'resourceManagerEnabled', 'smartDisplayZoom', 'telemetryEnabled'
]);

function getEffectiveSettingValue(key) {
    const rawValue = localStorage.getItem(key);
    if (DEFAULTS_TRUE_KEYS.has(key)) {
        return (rawValue !== 'false').toString();
    }
    return rawValue || '';
}

function listCommonSettings() {
    return {
        'theme': localStorage.getItem('theme'),
        'minimalMode': localStorage.getItem('minimalMode'),
        'silentMode': localStorage.getItem('silentMode'),
        'page_brightness': localStorage.getItem('page_brightness'),
        'showSeconds': localStorage.getItem('showSeconds'),
        'showWeather': localStorage.getItem('showWeather'),
        'gurappsEnabled': localStorage.getItem('gurappsEnabled'),
        'animationsEnabled': localStorage.getItem('animationsEnabled'),
        'highContrast': localStorage.getItem('highContrast'),
        'use12HourFormat': localStorage.getItem('use12HourFormat'),
        'clockFont': localStorage.getItem('clockFont'),
        'clockWeight': localStorage.getItem('clockWeight'),
        'clockColor': localStorage.getItem('clockColor'),
        'clockColorEnabled': localStorage.getItem('clockColorEnabled'),
        'clockStackEnabled': localStorage.getItem('clockStackEnabled'),
        'selectedLanguage': localStorage.getItem('selectedLanguage'),
		'displayScale': localStorage.getItem('displayScale'),
		'smartDisplayZoom': localStorage.getItem('smartDisplayZoom'),
		'nightStandEnabled': localStorage.getItem('nightStandEnabled'),
		'nightStandStart': localStorage.getItem('nightStandStart'),
		'nightStandEnd': localStorage.getItem('nightStandEnd'),
		'nightStandBrightness': localStorage.getItem('nightStandBrightness'),
		'colorFilter': localStorage.getItem('colorFilter'),
		'keyboardNavEnabled': localStorage.getItem('keyboardNavEnabled'),
		'sfxVolume': localStorage.getItem('sfxVolume'),
        'telemetryEnabled': localStorage.getItem('telemetryEnabled'),
    };
}

function listRecentWallpapers() {
    return recentWallpapers;
}

async function removeWallpaperAtIndex(index) {
    if (index < 0 || index >= recentWallpapers.length) {
        throw new Error('Invalid wallpaper index.');
    }
    if (confirm(currentLanguage.WALLPAPER_REMOVE_CONFIRM)) {
        await removeWallpaper(index);
        return `Wallpaper at index ${index} removed.`;
    } else {
        return 'Operation cancelled.';
    }
}

async function clearAllWallpapers() {
    if (recentWallpapers.length === 0) {
        return 'No custom wallpapers to clear.';
    }
    if (confirm(currentLanguage.WALLPAPER_CLEAR_CONFIRM)) {
        const db = await initDB();
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                recentWallpapers = [];
                localStorage.removeItem("recentWallpapers");
                clearInterval(slideshowInterval);
                slideshowInterval = null;
                isSlideshow = false;
                localStorage.removeItem("wallpapers");
                localStorage.removeItem("wallpaperOrder");
                currentWallpaperPosition = 0;
                localStorage.setItem("wallpaperType", "default");
                applyWallpaper();
                updatePageIndicatorDots(true);
                syncUiStates();
                resolve('All custom wallpapers cleared. Resetting to default.');
            };
            request.onerror = (e) => reject(new Error('Failed to clear wallpapers from database.'));
        });
    } else {
        return 'Operation cancelled.';
    }
}

function switchWallpaperParent(directionOrIndex) {
    if (typeof directionOrIndex === 'string' && (directionOrIndex === 'left' || directionOrIndex === 'right')) {
        switchWallpaper(directionOrIndex);
        return `Switched wallpaper ${directionOrIndex}.`;
    }
    const index = parseInt(directionOrIndex);
    if (!isNaN(index)) {
        jumpToWallpaper(index);
        return `Jumped to wallpaper at index ${index}.`;
    }
    throw new Error('Invalid argument. Use "left", "right", or a numeric index.');
}

function getCurrentTimeParent() {
    return new Date().toLocaleTimeString();
}

function executeParentJS(code) {
    // eval() is dangerous, but this function is already protected by the security check.
    const result = eval(code);
    let resultString;
    if (typeof result === 'object' && result !== null) {
        try { resultString = JSON.stringify(result); } catch (e) { resultString = result.toString(); }
    } else {
        resultString = String(result);
    }
    return resultString;
}

async function listIDBDatabases() {
    const dbs = await indexedDB.databases();
    return dbs.map(db => db.name);
}

function openIDB(dbName) { // Removed sourceWindow
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(new Error(`Failed to open DB '${dbName}': ${request.error}`));
        request.onsuccess = () => resolve(request.result);
    });
}

async function listIDBStores(dbName) {
    const db = await openIDB(dbName);
    const storeNames = Array.from(db.objectStoreNames);
    db.close();
    return storeNames;
}

async function getIDBRecord(dbName, storeName, key) {
    const db = await openIDB(dbName);
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        // If a specific key is requested
        if (key !== null && key !== undefined) {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Could not get from '${storeName}': ${request.error}`));
        } else {
            // If listing all, we MUST fetch keys and values separately to reconstruct the pairs
            // because store.getAll() does not return keys for out-of-line stores.
            const keysReq = store.getAllKeys();
            const valuesReq = store.getAll();
            
            let keys = null;
            let values = null;
            
            keysReq.onsuccess = () => {
                keys = keysReq.result;
                if (values) finish();
            };
            
            valuesReq.onsuccess = () => {
                values = valuesReq.result;
                if (keys) finish();
            };
            
            function finish() {
                // Combine into objects
                const result = values.map((val, i) => ({ key: keys[i], value: val }));
                resolve(result);
            }
            
            keysReq.onerror = valuesReq.onerror = () => reject(new Error(`Failed to list records from '${storeName}'`));
        }
        transaction.oncomplete = () => db.close();
    });
}

async function setIDBRecord(dbName, storeName, key, jsonData) {
    try {
        const data = JSON.parse(jsonData);
        const db = await openIDB(dbName);
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        let request;
        // Check if the store uses in-line keys (the key is part of the data object)
        if (store.keyPath) {
            // In this case, the provided 'key' argument from the terminal is ignored.
            request = store.put(data);
        } else {
            // The store uses out-of-line keys, so the 'key' argument is required.
            if (key === undefined || key === null) {
                throw new Error("This object store requires an explicit key, but none was provided.");
            }
            request = store.put(data, key);
        }

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(`Record successfully set in '${dbName}/${storeName}'.`);
            request.onerror = () => reject(new Error(`Could not set record in '${storeName}': ${request.error.message}`));
            transaction.oncomplete = () => db.close();
        });
    } catch (e) {
        // Catches JSON parsing errors or other synchronous issues.
        throw new Error('Operation failed: ' + e.message);
    }
}

async function removeIDBRecord(dbName, storeName, key) {
    const db = await openIDB(dbName);
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(`Record with key '${key}' deleted from '${dbName}/${storeName}'.`);
        request.onerror = () => reject(new Error(`Could not delete record from '${storeName}': ${request.error}`));
        transaction.oncomplete = () => db.close();
    });
}

async function clearIDBStore(dbName, storeName) {
    const confirmed = await showCustomConfirm(`Are you sure you want to clear ALL data from the '${storeName}' store in the '${dbName}' database? This cannot be undone.`);
    if (!confirmed) {
        return 'Operation cancelled.';
    }
    const db = await openIDB(dbName);
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(`Store '${dbName}/${storeName}' has been cleared.`);
        request.onerror = () => reject(new Error(`Could not clear store '${storeName}': ${request.error}`));
        transaction.oncomplete = () => db.close();
    });
}

function getOriginFromUrl(url) {
    try {
        return new URL(url).origin;
    } catch (e) {
        return window.location.origin; // Fallback for relative URLs
    }
}

async function rebootGurasuraisu() {
    if (await showCustomConfirm(currentLanguage.REBOOT_CONFIRM)) {
        setTimeout(() => window.location.reload(), 100);
        return 'Rebooting Polygol...';
    } else {
        return 'Reboot cancelled.';
    }
}

function setImmersiveMode(enabled) {
    if (enabled) {
        document.body.classList.add('immersive-active');
    } else {
        document.body.classList.remove('immersive-active');
    }
}

function promptPWAInstall() { 
    promptToInstallPWA();
    return 'PWA installation prompt initiated.';
}

function requestInstalledApps() {
    // Return the full info object, not just names
    return JSON.parse(localStorage.getItem('userInstalledAppsInfo') || '{}');
}

const Gurasuraisu = {
    callApp: (appName, action) => {
        if (!appName) return;
        // Use 'i' flag for case-insensitive matching to be robust
        const iframe = document.querySelector(`iframe[data-app-id="${appName}" i]`);
        if (iframe) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({ type: 'media-control', action: action }, targetOrigin);
        } else {
             console.warn(`[System] Could not find running app '${appName}' to send media command.`);
        }
    }
};
window.Gurasuraisu = Gurasuraisu; // FIX: Explicitly expose to window

// --- NEW: Function to broadcast a setting update to the settings app ---
function broadcastSettingUpdate(key, value) {
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'settingUpdate',
                key: key,
                value: value
            }, targetOrigin);
        }
    });
}

// --- NEW: Function to programmatically change a control's value and dispatch an event ---
function setControlValueAndDispatch(key, value) {
    // Handle settings without a direct UI control in index.html
    const settingsWithoutDirectControl =[
        'sleepModeStyle', 'slideshowInterval', 'hideClockIndicator',
        'autoSleepEnabled', 'autoSleepDuration', 'autoSleepScope',
		'resourceManagerEnabled', 'displayScale', 'smartDisplayZoom',
        'nightStandEnabled', 'nightStandStart', 'nightStandEnd', 'nightStandBrightness',
	    'colorFilter', 'keyboardNavEnabled', 'sfxVolume', 'homeActivitiesEnabled',
        'telemetryEnabled', 'oledBurnInProtection', 'hapticsEnabled', 'adaptiveBatterySaver',
        'doubleTapToSleep', 'autoBrightness', 'dynamicTone', 'adaptiveVolume', 'predictivePreload'
    ];
    if (settingsWithoutDirectControl.includes(key)) {
        localStorage.setItem(key, value);
        broadcastSettingUpdate(key, value);

        if (key === 'telemetryEnabled') {
            if (value === 'true') {
                window.Analytics?.init();
            } else {
                window.Analytics?.disable();
            }
        }
        if (key === 'slideshowInterval') {
            applyWallpaper(); // This will restart the interval with the new duration
        }
        if (key.startsWith('autoSleep')) {
            resetAutoSleepTimer();
        }
        if (key === 'hideClockIndicator') {
            updatePersistentClock();
        }
        if (key === 'resourceManagerEnabled') {
            if (value === 'true') ResourceManager.init();
            else ResourceManager.stop();
        }
        if (key === 'displayScale') {
            document.body.style.zoom = `${value}%`;
        }
        if (key === 'smartDisplayZoom') {
            if (value === 'true') {
                const smartScale = calculateSmartZoom();
                document.body.style.zoom = `${smartScale}%`;
            } else {
                const manualScale = localStorage.getItem('displayScale') || '100';
                document.body.style.zoom = `${manualScale}%`;
            }
        }
        if (key.startsWith('nightStand')) {
            checkNightStand();
        }
        if (key === 'colorFilter') {
            applyColorFilter();
        }
        if (key === 'keyboardNavEnabled') {
            KeyboardNavigationManager.enabled = (value === 'true');
        }
        if (key === 'homeActivitiesEnabled') {
            HomeActivityManager.setEnabled(value);
        }
        // sfxVolume is read directly from localStorage by SoundManager
        return;
    }
	
	const controlId = controlIdMap[key];
    if (!controlId) return;

    const control = document.getElementById(controlId);
    if (!control) return;

    let eventType = 'change';

    // Handle special toggle-like DIVs (Night Mode, Minimal, Silent)
    if (control.classList.contains('qcontrol-item')) {
        const currentStateIsActive = control.classList.contains('active');
        const targetStateIsActive = (value === 'true');
        // Only click if the state needs to change
        if (currentStateIsActive !== targetStateIsActive) {
            control.click();
        }
        return; // The click handler will do the rest.
    }

    if (control.type === 'checkbox') {
        const isChecked = (key === 'theme') ? (value === 'light') : (value === 'true');
        if (control.checked !== isChecked) {
            control.checked = isChecked;
        } else { return; } // No change needed, prevent event loop
    } else if (['range', 'color', 'text'].includes(control.type)) {
        if (control.value !== value) {
            control.value = value;
            eventType = 'input';
        } else { return; }
    } else if (control.tagName === 'SELECT') {
        if (control.value !== value) {
            control.value = value;
        } else { return; }
        eventType = 'change'; // Ensure select triggers change, not input
    }

    control.dispatchEvent(new Event(eventType, { bubbles: true }));
}

window.addEventListener('message', async (event) => { // Make listener async
	// All functions that can be called from an iframe must be listed here.
	const allowedFunctions = {
		// Public Functions
		showPopup, 
		showNotification, 
		minimizeFullscreenEmbed, 
		createFullscreenEmbed, 
		closeFullscreenEmbed: () => {
            // Identify which iframe sent the close request
            let callingUrl = null;
            const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
            for (const iframe of iframes) {
                // 'event' is available from the parent listener scope
                if (iframe.contentWindow === event.source) {
                    const container = iframe.closest('.fullscreen-embed');
                    if (container) callingUrl = container.dataset.embedUrl;
                    break;
                }
            }

            if (callingUrl) {
                // Close the specific app that requested it
                forceCloseApp(callingUrl);
            } else {
                showPopup('Could not close app')
            }
        },
		launchAppSilently: createBackgroundEmbed, // Expose silent launch
		blackoutScreen,
		registerWidget, 
		triggerWallpaperUpload: () => document.getElementById('wallpaperInput').click(),
		registerMediaSession, 
		clearMediaSession,
		updateMediaPlaybackState, 
		updateMediaProgress,
	    startLiveActivity,
	    updateLiveActivity, // Forward updates
	    stopLiveActivity,
		speakText: (text) => {
            if (typeof window.systemSpeak === 'function') {
                window.systemSpeak(text);
            }
        },
		playUiSound: (type) => {
            if (window.SoundManager) {
                window.SoundManager.play(type);
            }
        },
        requestFileUpload: (options) => {
            const { accept, multiple, requestId } = options;
            
            // Identify the App sending the request using 'event.source' from the listener closure
            let sourceAppId = 'Unknown';
            const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
            for (const iframe of iframes) {
                if (iframe.contentWindow === event.source) {
                    sourceAppId = iframe.dataset.appId;
                    break;
                }
            }

            // Create a unique ID for the manager to track this specific request
            const uniqueReqId = `app_${sourceAppId}_${requestId}`;

            // Register the callback
            FileUploadManager.registerAppRequest(uniqueReqId, sourceAppId, (files) => {
                // Serialize files to send back over postMessage
                const promises = files.map(async (f) => {
                    if (f.data) return f; // Already a data object (from Remote)
                    
                    // Read local File to Base64
                    return new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({
                            name: f.name,
                            type: f.type,
                            size: f.size,
                            data: reader.result
                        });
                        reader.readAsDataURL(f);
                    });
                });

                Promise.all(promises).then(serializedFiles => {
                    // Send response back to the app iframe
                    event.source.postMessage({
                        type: 'dialog-response', 
                        requestId: requestId, 
                        value: serializedFiles
                    }, event.origin);
                });
            });

            // Trigger the UI (Local picker + Remote request)
            FileUploadManager.trigger(accept, multiple, uniqueReqId);
        },
		setRemoteUI: (components) => {
            // NEW: Allow ANY running app (even background) to set remote UI if they are the sender.
            // We identify the app by matching the event source window to our iframes.
            let appName = null;
            const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
            for (const iframe of iframes) {
                if (iframe.contentWindow === event.source) {
                    appName = iframe.dataset.appId;
                    break;
                }
            }

            if (window.WavesHost && appName) {
                window.WavesHost.pushAppUI(appName, components);
                
                // Auto-register as Mini App capable
                if (apps[appName] && !apps[appName].hasMiniApp) {
                    apps[appName].hasMiniApp = true;
                    // Persist change
                    const userApps = JSON.parse(localStorage.getItem('userInstalledApps')) || {};
                    if (userApps[appName]) {
                        userApps[appName].hasMiniApp = true;
                        localStorage.setItem('userInstalledApps', JSON.stringify(userApps));
                    }
                }
            }
        },
        sendRemoteUpdate: (updates) => {
            // Allow background apps to send updates
            let appName = null;
            const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
            for (const iframe of iframes) {
                if (iframe.contentWindow === event.source) {
                    appName = iframe.dataset.appId;
                    break;
                }
            }

            if (window.WavesHost && appName) {
                window.WavesHost.pushAppUIUpdate(appName, updates);
            }
        },
        setImmersiveMode: (enabled) => setImmersiveMode(enabled),
        performSystemShortcut: (action) => {
            if (action === 'appSwitcher') {
                if (!appSwitcherVisible) {
                    openAppSwitcher();
                } else {
                    updateSwitcherSelection(appSwitcherIndex + 1);
                }
            } else if (action === 'home') {
                // Shift+Space Logic (Home/Drawer)
                if (shiftSpaceSequenceTimer) {
                     clearTimeout(shiftSpaceSequenceTimer);
                }
                // Set a timer to trigger Home/Drawer action if E is not pressed soon.
                shiftSpaceSequenceTimer = setTimeout(() => {
                    const openEmbed = document.querySelector('.fullscreen-embed');
                    if (openEmbed) {
                        minimizeFullscreenEmbed();
                    } else {
                        if (!appDrawer.classList.contains('open')) {
                            appDrawer.style.display = 'flex';
                            requestAnimationFrame(() => {
                                appDrawer.classList.add('open');
                                createAppIcons();
                            });
                        } else {
                            appDrawer.classList.remove('open');
                            setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
                        }
                    }
                    shiftSpaceSequenceTimer = null;
                }, 250);
            } else if (action === 'actionE') {
                // E Logic (Quick Actions)
                 if (shiftSpaceSequenceTimer) {
                    clearTimeout(shiftSpaceSequenceTimer);
                    shiftSpaceSequenceTimer = null;
        
                    const customizeModal = document.getElementById('customizeModal');
                    if (customizeModal.classList.contains('show')) {
                        closeControls();
                    } else {
                        document.getElementById('persistent-clock').click();
                    }
                }
            }
        },
        switchControlExit: (direction) => {
            // 1. Identify source iframe
            let sourceFrame = null;
            const iframes = document.querySelectorAll('iframe');
            for(const f of iframes) {
                if (f.contentWindow === event.source) {
                    sourceFrame = f;
                    break;
                }
            }
            
            if (sourceFrame) {
                // 2. Resume Parent Navigation
                window.focus(); // Reclaim focus
                KeyboardNavigationManager.resumeFromChild(sourceFrame, direction);
            }
        },

		// Privileged Functions (already checked above)
		clearAllNotifications,
        stopActivitiesForApp: (appName) => {
            Object.keys(activeLiveActivities).forEach(id => {
                if (activeLiveActivities[id].appName === appName) stopLiveActivity(id);
            });
            // Also force update media session to respect new block
            if (activeMediaSessionApp === appName) {
                _updateActiveMediaSession();
            }
        },
        forceCloseAppByName: (appName) => {
            const app = apps[appName];
            if (app && app.url) {
                forceCloseApp(app.url);
                return `Force closed ${appName}`;
            }
            return `App not running or not found`;
        },
        clearAppTrackingData: (appName) => {
            // Clear usage tracking
            if (typeof appUsage !== 'undefined') {
                delete appUsage[appName];
                localStorage.setItem('appUsage', JSON.stringify(appUsage));
            }
            if (typeof appLastOpened !== 'undefined') {
                delete appLastOpened[appName];
                localStorage.setItem('appLastOpened', JSON.stringify(appLastOpened));
            }
            // Clear permissions
            let perms = JSON.parse(localStorage.getItem('appPermissions') || '{}');
            if (perms[appName]) {
                delete perms[appName];
                localStorage.setItem('appPermissions', JSON.stringify(perms));
            }
            return `Cleared OS data and permissions for ${appName}`;
        },
		installApp, 
		installAppLink: (appData) => {
            if (typeof window.installApp === 'function') {
                // Map the data structure to what installApp expects
                window.installApp({
                    name: appData.title || 'Shortcut',
                    url: appData.url,
                    iconUrl: appData.icon,
                    // Mark as a simple link so it doesn't try to cache offline files
                    isLink: true 
                });
            }
        },
		deleteApp,
		requestInstalledApps, 
		getLocalStorageItem, 
		setLocalStorageItem,
		removeLocalStorageItem, 
		listLocalStorageKeys, 
		clearLocalStorage, 
		listCommonSettings,
		listRecentWallpapers, 
		removeWallpaperAtIndex, 
        clearAllWallpapers, 
        switchWallpaperParent,
        getCurrentTimeParent, 
        rebootGurasuraisu, 
        promptPWAInstall, 
        executeParentJS,
        listIDBDatabases, 
        listIDBStores, 
        getIDBRecord, 
        setIDBRecord, 
        removeIDBRecord, 
        clearIDBStore,
		setSettingValue: (key, value) => {
            setControlValueAndDispatch(key, value);
            return `Setting '${key}' remotely updated.`;
        },
        deleteIDBDatabase: async (dbName) => {
            if (await showCustomConfirm(`Are you sure you want to delete the entire database "${dbName}"? This is irreversible.`)) {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.deleteDatabase(dbName);
                    req.onsuccess = () => resolve(`Database '${dbName}' deleted.`);
                    req.onerror = () => reject(`Failed to delete '${dbName}'.`);
                    req.onblocked = () => reject(`Deletion blocked: Database '${dbName}' is currently open in another tab/app.`);
                });
            } else {
                return "Operation cancelled.";
            }
        },
		// Get all LS data for the manager list
        getLocalStorageAll: () => {
            const items = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items.push({ key, value: localStorage.getItem(key) });
            }
            return items;
        },
        // Cache Storage API
        listCaches: async () => {
            if ('caches' in window) {
                return await caches.keys();
            }
            return [];
        },
        deleteCache: async (cacheName) => {
            if ('caches' in window) {
                if (await showCustomConfirm(`Delete cache "${cacheName}"? This may affect app performance.`)) {
                    return await caches.delete(cacheName);
                }
            }
            return false;
        },
		forceUpdatePolygol
    };

    const data = event.data;
    const sourceWindow = event.source;

    // Identify App Identity safely once at the top
    let sourceAppId = null;
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    for (const iframe of iframes) {
        if (iframe.contentWindow === sourceWindow) {
            sourceAppId = iframe.dataset.appId;
            break;
        }
    }
    if (!sourceAppId) sourceAppId = 'Untrusted Source';

	// Handle API presence handshake to prevent legacy mode
	if (data.type === 'gurasuraisu-api-present') {
	    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
	    for (const iframe of iframes) {
	        if (iframe.contentWindow === sourceWindow) {
	            const embedContainer = iframe.closest('.fullscreen-embed');
	            if (embedContainer) {
	                // Mark as having the API to prevent the legacy timeout from firing
	                embedContainer.dataset.hasApi = 'true';
	                // Also ensure legacy class is removed in case of a race condition
	                embedContainer.classList.remove('legacy');
	            }
	            break;
	        }
	    }
	    return; // Handshake message handled
	}
	
    if (data.action) {
        const funcToCall = allowedFunctions[data.action];
        if (typeof funcToCall === 'function') {
            try {
                // Pass arguments if they exist
                const result = await funcToCall.apply(window, data.args || []);
                // Send success back if needed
            } catch (error) {
                console.error(`Error executing action '${data.action}':`, error);
            }
            return; // Action handled
        }
    }

    if (data && data.action === 'userActivity') {
        showCursorAndResetTimer();
        return; // Message handled, no need to proceed further.
    }

    if (data.action === 'requestFileUpload') {
        // CHECK PERMISSIONS FIRST
        const hasPerm = await checkAppPermission(sourceAppId, 'requestFileUpload', event.origin);
        if (!hasPerm) {
            sourceWindow.postMessage({ type: 'parentActionError', message: 'Permission denied: file-upload' }, event.origin);
            return;
        }

        // args: [{ accept, multiple, requestId }]
        const args = data.args[0];
        const { accept, multiple, requestId } = args;

        // Register callback to send data back to iframe
        // We use a unique ID combo to avoid collisions
        const uniqueReqId = `app_${sourceAppId}_${requestId}`;

        FileUploadManager.registerAppRequest(uniqueReqId, sourceAppId, (files) => {
            // 'files' is an array of File objects or Data Objects
            // We must serialize them to send over postMessage
            
            const promises = files.map(async (f) => {
                if (f.data) return f; // Already data object
                
                // Read File to Base64
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        data: reader.result
                    });
                    reader.readAsDataURL(f);
                });
            });

            Promise.all(promises).then(serializedFiles => {
                sourceWindow.postMessage({
                    type: 'dialog-response', // Reusing dialog response channel or custom
                    requestId: requestId, // Original ID from app
                    value: serializedFiles
                }, event.origin);
            });
        });

        // Trigger the UI
        FileUploadManager.trigger(accept, multiple, uniqueReqId);
        return;
    }

    // Handle a Gurapp announcing it's ready for settings
    if (data.type === 'gurapp-ready') {
        if (!sourceWindow) return;

	    const targetOrigin = event.origin; // Use the actual origin of the sender

        // Find which app sent the message
        let sourceAppId = null;
        const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
        for (const iframe of iframes) {
            if (iframe.contentWindow === sourceWindow) {
                sourceAppId = iframe.dataset.appId;
                break;
            }
        }

        console.log(`[Polygol] Received 'gurapp-ready' from: ${sourceAppId || 'Unknown App'}`);

        // --- Core Logic ---
        // If the ready message is from apps, send ALL settings.
	    // When sending messages back, use the correct targetOrigin
	    if (sourceAppId === 'Settings' || sourceAppId === 'DONBURI') {
	        Object.keys(controlIdMap).forEach(key => {
	            const effectiveValue = getEffectiveSettingValue(key);
	            sourceWindow.postMessage({ 
	                type: 'localStorageItemValue', 
	                key: key, 
	                value: effectiveValue
	            }, targetOrigin);
	        });
	    }

        // For ALL apps (including Settings), send the standard initial state.
        const currentTheme = localStorage.getItem('theme') || 'dark';
        sourceWindow.postMessage({ type: 'themeUpdate', theme: currentTheme }, targetOrigin);

        const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
        sourceWindow.postMessage({ type: 'animationsUpdate', enabled: animationsEnabled }, targetOrigin);
        
        const highContrastEnabled = localStorage.getItem('highContrast') === 'true';
        sourceWindow.postMessage({ type: 'contrastUpdate', enabled: highContrastEnabled }, targetOrigin);

        const glassMode = localStorage.getItem('glassEffectsMode') || 'on';
        const glassValue = getGlassFilterValue(glassMode);
		sourceWindow.postMessage({ type: 'glassEffectsUpdate', value: glassValue, mode: glassMode }, targetOrigin);

        if (window.currentTintVariables) {
            sourceWindow.postMessage({
                type: 'themeVariablesUpdate',
                variables: window.currentTintVariables
            }, targetOrigin);
        }

        sourceWindow.postMessage({ type: 'sunUpdate', shadow: currentSunShadow, shadowStrong: currentSunShadowStrong }, targetOrigin);

		const gurappSounds = localStorage.getItem('gurappSoundsEnabled') !== 'false';
	    sourceWindow.postMessage({ 
	        type: 'settingUpdate', 
	        key: 'gurappSoundsEnabled', 
	        value: gurappSounds.toString() 
	    }, targetOrigin);

        return; // Message handled
    }

    if (data.type === 'settings-app-ready') {
        console.log('[Polygol] Settings app is ready. Sending all current settings.');
        if (!sourceWindow) return;
        
        // Send all tracked settings to the new settings app so its UI is in sync
        Object.keys(controlIdMap).forEach(key => {
            const value = localStorage.getItem(key);
            sourceWindow.postMessage({ type: 'localStorageItemValue', key, value }, event.origin);
        });
        return;
    }

    // Handle homescreen updates from a Live Activity iframe
    if (data.type === 'live-activity-homescreen-update') {
        // A. Handle Legacy invisible widget if present (keep existing logic)
        const homescreenWidget = document.getElementById('live-activity-homescreen');
        if (homescreenWidget) {
            const iconEl = homescreenWidget.querySelector('.material-symbols-rounded');
            const textEl = homescreenWidget.querySelector('span:last-child');
            if (iconEl) iconEl.textContent = data.icon || '';
            if (textEl) textEl.textContent = data.text || '';
        }
        
        // Update global variable for Remote Sync
        window.activeLiveActivityData = { 
            icon: data.icon || 'smart_toy', 
            text: data.text || 'Live Activity' 
        };
        updateRemoteNotifications();

        // B. SYNC WITH ACTIVITY ISLAND
        const sourceWindow = event.source;
        let sourceAppId = null;
        let specificActivityId = null;
        
        // Find iframe matching source window
        const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
        for (const iframe of iframes) {
            if (iframe.contentWindow === sourceWindow) {
                sourceAppId = iframe.dataset.appId; 
                
                // Fallback: If no appId on iframe, check if it's a Live Activity frame
                if (!sourceAppId) {
                    const activityContainer = iframe.closest('.live-activity-notification');
                    if (activityContainer && activityContainer.dataset.activityId) {
                        specificActivityId = activityContainer.dataset.activityId;
                        if (activeLiveActivities[specificActivityId]) {
                            sourceAppId = activeLiveActivities[specificActivityId].appName;
                        }
                    }
                }
                break;
            }
        }
        
        if (sourceAppId && sourceAppId !== 'Donburi') {
            let targetActivityId = specificActivityId;
            
            // If we didn't find the ID from the container, look it up by app name
            if (!targetActivityId) {
                const normalizedSource = sourceAppId.toLowerCase();
                const entry = Object.entries(activeLiveActivities).find(([id, val]) => 
                    val.appName.toLowerCase() === normalizedSource
                );
                targetActivityId = entry ? entry[0] : `island-${sourceAppId.replace(/\s+/g, '-')}`;
            }

            // Push update to IslandManager
            IslandManager.update(targetActivityId, 'live-activity', {
                appName: sourceAppId,
                iconString: data.icon, 
                text: data.text 
            });
            
            // Trigger UI sync for night/minimal/status
            updateStatusIndicator(); 
        }
        
        return;
    }

	// Donburi specialized communication
    const donburiIframe = document.querySelector('#donburi-container iframe');
    const isDonburiSender = donburiIframe && event.source === donburiIframe.contentWindow;

    if (isDonburiSender) {
        if (data.type === 'get-system-weather') {
            const weatherData = JSON.parse(localStorage.getItem('lastWeatherData'));
            if (weatherData) {
                const code = weatherData.current.weathercode;
                const unit = weatherData.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
                const info = weatherConditions[code] || { icon: () => 'question_mark' };
                const iconString = info.icon();
                event.source.postMessage({
                    type: 'system-weather-response',
                    temp: Math.round(weatherData.current.temperature),
                    unit: unit,
                    icon: iconString,
                    city: weatherData.city
                }, event.origin);
            }
            return;
        }
        if (data.type === 'donburi-close') {
            window.closeDonburi();
            return;
        }
    }

    // Check if this is an API call from a Gurapp
    if (data && data.action === 'callGurasuraisuFunc' && data.functionName) {
        const funcName = data.functionName;
        const args = Array.isArray(data.args) ? data.args : [];
		
        // Handle dialogs specifically as they have a complex payload
        if (funcName === 'showDialog') {
            const dialogOptions = args[0] || {};
            dialogOptions.source = sourceWindow; // Track who to reply to
            dialogOptions.origin = event.origin;
            showDialog(dialogOptions);
            // Dialogs are async, no immediate result to return. The response is handled in showDialog.
            return;
        }

        // --- NEW: Interactive Security Check ---
        const hasPerm = await checkAppPermission(sourceAppId, funcName, event.origin);
        if (!hasPerm) {
            if (sourceWindow) {
                sourceWindow.postMessage({ type: 'parentActionError', message: `Permission Denied: ${PERMISSION_MAPPINGS[funcName]}` }, event.origin);
            }
            return; // Stop execution immediately.
        }

        const funcToCall = allowedFunctions[funcName];

        if (typeof funcToCall === 'function') {
			try {
				const normalizedSourceId = sourceAppId.toLowerCase();

                // 1. Notification Spoofing Protection
                if (funcName === 'showNotification' && args[1] && typeof args[1] === 'object') {
                    if (args[1].system === true) {
                        console.warn(`[Security] App '${sourceAppId}' attempted to mark notification as system. Flag removed.`);
                        delete args[1].system;
                    }
                    if (args[1].appName && args[1].appName.toLowerCase() !== normalizedSourceId) {
                        console.warn(`[Security] App '${sourceAppId}' attempted to spoof notification as '${args[1].appName}'. Enforcing true identity.`);
                    }
                    args[1].appName = sourceAppId; // Force strict canonical identity
                }

                // 2. Media & Live Activity Spoofing Protection (String Arg)
                const identityBoundFunctions =['registerMediaSession', 'clearMediaSession', 'updateMediaPlaybackState', 'updateMediaProgress', 'startLiveActivity'];
                if (identityBoundFunctions.includes(funcName)) {
                    if (args[0] && typeof args[0] === 'string' && args[0].toLowerCase() !== normalizedSourceId) {
                        console.warn(`[Security] App '${sourceAppId}' attempted to spoof API call '${funcName}' as '${args[0]}'. Enforcing true identity.`);
                    }
                    args[0] = sourceAppId; // Force strict canonical identity
                }

                // 3. Widget Registration Spoofing Protection (Object Arg)
                if (funcName === 'registerWidget' && args[0] && typeof args[0] === 'object') {
                    if (args[0].appName && typeof args[0].appName === 'string' && args[0].appName.toLowerCase() !== normalizedSourceId) {
                        console.warn(`[Security] App '${sourceAppId}' attempted to spoof widget registration as '${args[0].appName}'.`);
                    }
                    args[0].appName = sourceAppId; // Force strict canonical identity
                }

                // 4. Live Activity Hijack Protection
                if (funcName === 'updateLiveActivity' || funcName === 'stopLiveActivity') {
                    const targetActivityId = args[0];
                    if (activeLiveActivities[targetActivityId] && activeLiveActivities[targetActivityId].appName.toLowerCase() !== normalizedSourceId) {
                        console.error(`[Security] CRITICAL: App '${sourceAppId}' attempted to hijack/stop Live Activity '${targetActivityId}' owned by '${activeLiveActivities[targetActivityId].appName}'. Blocked.`);
                        return; // Terminate execution immediately
                    }
                }
                
                const result = await funcToCall.apply(window, args);
                
                let messageType = 'parentActionSuccess';
                const typeMap = {
                    'getLocalStorageItem': 'localStorageItemValue',
                    'listLocalStorageKeys': 'localStorageKeysList',
                    'listCommonSettings': 'commonSettingsList',
                    'listRecentWallpapers': 'recentWallpapersList',
                    'getCurrentTimeParent': 'currentTimeValue',
                    'executeParentJS': 'commandOutput',
                    'listIDBDatabases': 'idbDatabasesList',
                    'listIDBStores': 'idbStoresList',
                    'getIDBRecord': 'idbRecordValue',
                    'requestInstalledApps': 'installed-apps-list',
					'getLocalStorageAll': 'localStorageAllValues',
                    'listCaches': 'cachesList'
                };

                if (funcName.startsWith('get') || funcName.startsWith('list') || funcName.startsWith('request')) {
                    messageType = typeMap[funcName] || 'commandOutput';
                }

                const response = { type: messageType };
                
                if (funcName === 'requestInstalledApps') {
                    response.apps = result;
                } else if (funcName === 'listLocalStorageKeys') {
                    response.keys = result;
	            } else if (funcName === 'getLocalStorageItem') {
	                response.key = args[0]; // Include the key in the response
	                response.value = result;
	            } else if (funcName === 'listCommonSettings') {
	                response.settings = result;
	            } else if (funcName === 'listRecentWallpapers') {
	                response.wallpapers = result;
	            } else if (funcName === 'listIDBDatabases') {
	                response.databases = result;
	            } else if (funcName === 'listIDBStores') {
	                response.stores = result;
				} else if (funcName === 'getIDBRecord' || funcName === 'getLocalStorageAll' || funcName === 'listCaches') {
				    // Ensure these data-heavy responses use the 'value' property
				    // so settings.js knows where to look.
				    response.value = result;
				} else {
				    response.message = result;
				}
                
                sourceWindow.postMessage(response, event.origin);

            } catch (error) {
                sourceWindow.postMessage({ type: 'parentActionError', message: error.message }, event.origin);
            }
        } else {
            console.warn(`A Gurapp attempted to call a disallowed or non-existent function: "${funcName}"`);
        }
        return;
    }
	
    // Case 2: Gurapp-to-Gurapp communication
    const { targetApp, ...payload } = data;
    if (targetApp) {
        const iframe = document.querySelector(`iframe[data-app-id="${targetApp}"]`);
        if (iframe) {
			const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage(payload, targetOrigin);
        } else {
            console.warn(`Message target not found: No iframe for app "${targetApp}"`);
        }
        return; // Message handled
    }
});

function broadcastAllWallpaperSettings(wallpaper) {
    if (!wallpaper) return;
    const styles = wallpaper.clockStyles || {};
    const val = (v, def) => (v !== undefined ? v : def).toString();

    // Prepare all settings to sync
    const settings = {
        'font': val(styles.font, 'Inter'),
        // Convert weight 700 -> 70 for the slider/settings UI
        'weight': (parseInt(styles.weight || '700', 10) / 10).toString(),
        'color': val(styles.color, '#ffffff'),
        'colorEnabled': val(styles.colorEnabled, 'false'),
        'stackEnabled': val(styles.stackEnabled, 'false'),
        'showSeconds': val(styles.showSeconds, 'true'),
        'showWeather': val(styles.showWeather, 'true'),
        'clockSize': val(styles.clockSize, '0'),
        'clockPosX': val(styles.clockPosX, '50'),
        'clockPosY': val(styles.clockPosY, '50'),
        'alignment': val(styles.alignment, 'center'),
        'shadowEnabled': val(styles.shadowEnabled, 'false'),
        'shadowBlur': val(styles.shadowBlur, '10'),
        'shadowColor': val(styles.shadowColor, '#000000'),
        'gradientEnabled': val(styles.gradientEnabled, 'false'),
        'gradientColor': val(styles.gradientColor, '#ffffff'),
        'glassEnabled': val(styles.glassEnabled, 'false'),
        'clockDynamicFillEnabled': val(styles.clockDynamicFillEnabled, 'false'),
        'roundness': val(styles.roundness, '0'),
        'dateFormat': val(styles.dateFormat, 'ddd MMM D • $(smart)$'),
        'depthEffectEnabled': val(wallpaper.depthEnabled, 'false'),
        'letterSpacing': val(styles.letterSpacing, '0'),
        'textCase': val(styles.textCase, 'none'),
        'dateSize': val(styles.dateSize, '100'),
        'dateOffset': val(styles.dateOffset, '0')
    };
    
    // Clock format might default based on 12hr setting
    const defaultClockFormat = document.getElementById('hour-switch').checked ? 'h:mm:ss A' : 'HH:mm:ss';
    settings['clockFormat'] = val(styles.clockFormat, defaultClockFormat);

    // Theme-dependent effects
    const isLightMode = document.body.classList.contains('light-theme');
    const theme = isLightMode ? 'light' : 'dark';
    const effects = styles.wallpaperEffects?.[theme] || { blur: '0', brightness: '100', contrast: '100' };

    settings['wallpaperBlur'] = effects.blur;
    settings['wallpaperBrightness'] = effects.brightness;
    settings['wallpaperContrast'] = effects.contrast;

    // Update LocalStorage and Broadcast
    for (const [key, value] of Object.entries(settings)) {
        localStorage.setItem(key, value);
        broadcastSettingUpdate(key, value);
    }
}