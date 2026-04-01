// App definitions
var apps = {
    "kirbStore": {
        url: "/kirbstore/index.html",
        icon: "appstore.png"
	},
    "Files": {
        url: "/assets/gurapp/intl/forudaraisu/index.html",
        icon: "files.png"
	},
    "Internet": {
        url: "/assets/gurapp/intl/internet/index.html",
        icon: "internet.png"
	},
    "Assistant": {
        url: "https://kirbindustries.gitbook.io/polygol/assistant-for-polygol",
        icon: "assistant.png"
	},
    "Feedback": {
        url: "https://docs.google.com/forms/d/e/1FAIpQLSeSYSJalaX0HCZe0helcK5NCuc0U47tQc6KaO1OAsBs5HxK1A/viewform?embedded=true",
        icon: "feedback.png"
	},
    "Settings": {
        url: "/assets/gurapp/intl/settings/index.html",
        icon: "settings.png"
	}
};

// Helper to calculate and send final volume (Master * App)
function syncAppVolume(iframe) {
    const appId = iframe.dataset.appId;
    if (!appId || appId === 'Donburi') return;

    const master = (parseInt(localStorage.getItem('master_volume') || 100)) / 100;
    const appLevel = (parseInt(localStorage.getItem(`vol_${appId}`) || 100)) / 100;
    
    const finalLevel = master * appLevel;

    if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ 
            type: 'volumeUpdate', 
            level: finalLevel, 
            muted: (finalLevel === 0)
        }, '*');
    }
}

function updateVolumeMixerUI() {
    const list = document.getElementById('volume-mixer-list');
    list.innerHTML = '';
    
    // 1. Add System Channel (Internal sounds/alerts)
    const sysVol = localStorage.getItem('system_channel_volume') || 100;
    const sysItem = document.createElement('div');
    sysItem.style.cssText = 'display:flex; flex-direction:column; gap:4px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border);';
    sysItem.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:500;">
            <span>System</span>
            <span>${sysVol}%</span>
        </div>
        <input type="range" min="0" max="100" value="${sysVol}" class="thermostat-slider">
    `;
    sysItem.querySelector('input').oninput = (e) => {
        const val = e.target.value;
        sysItem.querySelector('span:last-child').textContent = `${val}%`;
        localStorage.setItem('system_channel_volume', val);
    };
    list.appendChild(sysItem);

    // 2. Add Active Apps (Exclude Donburi)
    const activeApps = Array.from(document.querySelectorAll('iframe[data-app-id]'))
                            .filter(f => f.dataset.appId !== 'Donburi');
    
    if (activeApps.length === 0) {
        const msg = document.createElement('p');
        msg.style.cssText = 'font-size:11px; opacity:0.5; text-align:center; margin: 10px 0;';
        msg.textContent = 'No running apps';
        list.appendChild(msg);
    }

    activeApps.forEach(iframe => {
        const appId = iframe.dataset.appId;
        const currentVol = localStorage.getItem(`vol_${appId}`) || 100;
        
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:500;">
                <span>${appId}</span>
                <span>${currentVol}%</span>
            </div>
            <input type="range" min="0" max="100" value="${currentVol}" class="thermostat-slider">
        `;
        
        item.querySelector('input').oninput = (e) => {
            const val = e.target.value;
            item.querySelector('span:last-child').textContent = `${val}%`;
            localStorage.setItem(`vol_${appId}`, val);
            syncAppVolume(iframe);
        };
        list.appendChild(item);
    });
}

let appUsage = {};
window.appHistoryStack = []; // Track app navigation history
let minimizedEmbeds = {}; // Object to store minimized embeds by URL
let appLastOpened = {};

function loadSavedData() {
    // Load existing data if available
    const savedLastOpened = localStorage.getItem('appLastOpened');
    if (savedLastOpened) {
        appLastOpened = JSON.parse(savedLastOpened);
    }
    
    // Load other existing data as before
    const savedUsage = localStorage.getItem('appUsage');
    if (savedUsage) {
        appUsage = JSON.parse(savedUsage);
    }
}

function saveLastOpenedData() {
    localStorage.setItem('appLastOpened', JSON.stringify(appLastOpened));
}

Object.keys(apps).forEach(appName => {
    appUsage[appName] = 0;
});

// Load saved usage data from localStorage
const savedUsage = localStorage.getItem('appUsage');
if (savedUsage) {
    Object.assign(appUsage, JSON.parse(savedUsage));
}

// Save usage data whenever an app is opened
function saveUsageData(appName) {
    localStorage.setItem('appUsage', JSON.stringify(appUsage));
    
    // Track usage by hour for Predictive Preloading
    if (appName) {
        const hour = new Date().getHours();
        let hourlyUsage = JSON.parse(localStorage.getItem('appUsageHourly') || '{}');
        if (!hourlyUsage[hour]) hourlyUsage[hour] = {};
        hourlyUsage[hour][appName] = (hourlyUsage[hour][appName] || 0) + 1;
        localStorage.setItem('appUsageHourly', JSON.stringify(hourlyUsage));
    }
}

function loadUserInstalledApps() {
    try {
        const userApps = JSON.parse(localStorage.getItem('userInstalledApps')) || {};
        // Merge user-installed apps into the main apps object
        apps = { ...apps, ...userApps };
        console.log('Loaded and merged user-installed apps.');
    } catch (e) {
        console.error('Could not load user-installed apps:', e);
    }
}

async function installApp(appData) {
    // Prevent overwriting core system apps
    const reservedNames = ['settings', 'kirbstore', 'donburi', 'system', 'files', 'assistant', 'tips', 'feedback', 'apps'];
    const normalizedName = appData.name ? appData.name.trim().toLowerCase() : '';
    
    if (reservedNames.includes(normalizedName)) {
        console.error(`[Security] Blocked installation of protected system app: ${appData.name}`);
        showDialog({ type: 'alert', title: 'App installation blocked', message: `Cannot install or overwrite protected system app ${appData.name}`, icon: 'do_not_touch'});
        return;
    }
	
    const userInstalledAppsInfo = JSON.parse(localStorage.getItem('userInstalledAppsInfo') || '{}');
    const isUpdate = userInstalledAppsInfo[appData.name];

    if (isUpdate) {
        console.log(`Updating app: ${appData.name}`);
        const oldFiles = userInstalledAppsInfo[appData.name].filesToCache;
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'uncache-app',
                filesToDelete: oldFiles
            });
        }
    } else {
        console.log(`Installing new app: ${appData.name}`);
    }

    const iconPath = appData.iconUrl;

    apps[appData.name] = { url: appData.url, icon: iconPath };
    const userApps = JSON.parse(localStorage.getItem('userInstalledApps')) || {};
    userApps[appData.name] = { url: appData.url, icon: iconPath };
    localStorage.setItem('userInstalledApps', JSON.stringify(userApps));

    userInstalledAppsInfo[appData.name] = {
        filesToCache: appData.filesToCache
    };
    localStorage.setItem('userInstalledAppsInfo', JSON.stringify(userInstalledAppsInfo));

    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            registration.active.postMessage({
                action: 'cache-app',
                files: appData.filesToCache
            });
            const message = isUpdate ? `${appData.name} updated` : currentLanguage.GURAPP_INSTALLING.replace('{appName}', appData.name);
            showPopup(message);
        } catch (error) {
            console.error('Service Worker not ready:', error);
			showDialog({ 
			    type: 'alert', 
			    title: currentLanguage.GURAPP_INSTALL_FAILED.replace('{appName}', appData.name),
                icon: 'file_download_off'
			});
        }
    } else {
        showPopup(currentLanguage.GURAPP_OFFLINE_NOT_SUPPORTED);
    }

	await cacheAppIconColors(); // Re-analyze icon colors
    createAppIcons();
    populateDock();
}

async function deleteApp(appName) {
    // --- Protection Clause ---
    const appToDelete = apps[appName];
	if (
		appToDelete && 
		(appToDelete.url.includes('/kirbstore/index.html') ||
		appToDelete.url.includes('/assets/gurapp/intl/settings/'))
	) {
	showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.GURAPP_DELETE_STORE_DENIED,
            icon: 'do_not_touch'
		});
        return; // Stop the function immediately
    }

    // Confirmation dialog
    if (!(await showCustomConfirm(currentLanguage.GURAPP_DELETE_ASK.replace('{appName}', appName)), '', 'delete_forever')) {
        return;
    }

    if (apps[appName]) {
        // 1. Remove widget definitions from the available list
        if (availableWidgets[appName]) {
            delete availableWidgets[appName];
            saveAvailableWidgets(); // Save the updated definitions
        }
        // 2. Filter out active instances of widgets from the deleted app
        activeWidgets = activeWidgets.filter(widget => widget.appName !== appName);
        saveWidgets(); // Save the cleaned active widgets list
        renderWidgets(); // Re-render the grid immediately
        
        // Unregister custom OSK if the app provided one
        if (typeof window.unregisterCustomOSK === 'function') {
            window.unregisterCustomOSK(appName);
        }

        // Remove from the in-memory `apps` object
        delete apps[appName];

        // Remove from the 'userInstalledApps' in localStorage
        const userApps = JSON.parse(localStorage.getItem('userInstalledApps')) || {};
        delete userApps[appName];
        localStorage.setItem('userInstalledApps', JSON.stringify(userApps));
        
        // Un-cache the files from the Service Worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
             // We need to know which files to delete. This assumes appToDelete has a filesToCache property.
             // This property should be saved to localStorage when the app is installed.
             const userAppInfo = JSON.parse(localStorage.getItem('userInstalledAppsInfo') || '{}');
             if (userAppInfo[appName] && userAppInfo[appName].filesToCache) {
                 navigator.serviceWorker.controller.postMessage({
                    action: 'uncache-app',
                    filesToDelete: userAppInfo[appName].filesToCache
                });
                // Clean up the stored info
                delete userAppInfo[appName];
                localStorage.setItem('userInstalledAppsInfo', JSON.stringify(userAppInfo));
             }
        }

		// Remove the app's color from the cache
        delete appIconColors[appName];
        localStorage.setItem('appIconColors', JSON.stringify(appIconColors));

        // Clean up orphaned tracking data to prevent localStorage bloat
        delete appUsage[appName];
        delete appLastOpened[appName];
        saveUsageData();
        saveLastOpenedData();

        // Refresh the app drawer and dock
        createAppIcons();
        populateDock();
        showPopup(currentLanguage.GURAPP_DELETED.replace('{appName}', appName));
    } else {
		showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.GURAPP_DELETE_FAILED.replace('{appName}', appName),
            icon: 'cancel'
		});
    }
}

// --- Split Screen State ---
let splitScreenState = {
    active: false,
    leftAppUrl: null,
    rightAppUrl: null,
    splitPercentage: 50,
    isSelecting: false,
    selectingSide: null, // 'left' or 'right' (side for the NEW app)
    // A history of pairs to restore them
    lastSplitPair: null // Will store { left: url, right: url }
};

function getEmbedContainer(url) {
    return document.querySelector(`.fullscreen-embed[data-embed-url="${url}"]`) || minimizedEmbeds[url];
}

// --- Split Screen Logic ---

function initiateSplitScreen(sideForNewApp) {
    const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
    if (!activeEmbed || splitScreenState.active) return; // Don't allow splitting a split view

    const currentUrl = activeEmbed.dataset.embedUrl;
    
    splitScreenState.isSelecting = true;
    splitScreenState.selectingSide = sideForNewApp;
    splitScreenState.splitPercentage = 50; 

    if (sideForNewApp === 'right') { 
        splitScreenState.leftAppUrl = currentUrl;
        activeEmbed.classList.add('split-left');
    } else { 
        splitScreenState.rightAppUrl = currentUrl;
        activeEmbed.classList.add('split-right');
    }
    
    activeEmbed.classList.add('split-selecting');
    
    // Open App Drawer to pick the second app
    const appDrawer = document.getElementById('app-drawer');

    appDrawer.style.display = 'flex';
    // Clear inline styles that might block the class-based opening
    appDrawer.style.bottom = '';
    appDrawer.style.opacity = '';

    requestAnimationFrame(() => {
        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
        appDrawer.classList.add('open');
        appDrawer.style.zIndex = '1005'; // FIX: Ensure drawer is on top of the splitting app
    });
    createAppIcons();
    
    showPopup("Select an app for the other side");
}

async function finalizeSplitScreen(secondAppUrl) {
    const firstAppUrl = splitScreenState.selectingSide === 'right' ? splitScreenState.leftAppUrl : splitScreenState.rightAppUrl;
    
    // Reset Drawer Z-Index
    const appDrawer = document.getElementById('app-drawer');
    appDrawer.style.zIndex = ''; 

    if (firstAppUrl === secondAppUrl) {
        // User selected the same app, cancel split and return to fullscreen
        splitScreenState.active = false;
        splitScreenState.isSelecting = false;
        const firstEmbed = getEmbedContainer(firstAppUrl);
        if (firstEmbed) firstEmbed.classList.remove('split-selecting', 'split-left', 'split-right');
        appDrawer.classList.remove('open');
        return;
    }

    const sideForSecondApp = splitScreenState.selectingSide;
    splitScreenState[sideForSecondApp === 'right' ? 'rightAppUrl' : 'leftAppUrl'] = secondAppUrl;
    
    // FIX: Set Global State IMMEDIATELY to prevent race conditions during app load/animation
    // This ensures the handle appears and closing logic works even if the app takes time to restore.
    splitScreenState.active = true;
    splitScreenState.isSelecting = false;
    splitScreenState.lastSplitPair = { left: splitScreenState.leftAppUrl, right: splitScreenState.rightAppUrl };

    // FIX: Show divider immediately
    const divider = document.getElementById('split-divider');
    if (divider) {
        divider.style.display = 'flex';
        divider.style.zIndex = '1002'; // Ensure it's above apps (1001)
    }

    // 1. Clean up the selecting state visually on the first app
    const firstEmbed = getEmbedContainer(firstAppUrl);
    if(firstEmbed) {
        // FIX: Ensure first app is treated as active if it was minimized
        if (minimizedEmbeds[firstAppUrl]) {
            delete minimizedEmbeds[firstAppUrl];
        }

        firstEmbed.classList.remove('split-selecting');
        firstEmbed.classList.remove('split-left', 'split-right');
        firstEmbed.classList.add(sideForSecondApp === 'right' ? 'split-left' : 'split-right');
        
        // FIX: Force visibility and z-index. The app might have been minimized/hidden
        // during the selection process (e.g. accessing home screen).
        firstEmbed.style.display = 'block';
        firstEmbed.style.opacity = '1';
        firstEmbed.style.zIndex = '1001';
        // Restore pointer events in case they were disabled by drawer logic
        firstEmbed.style.pointerEvents = 'auto';
        
        // Force layout update on first app immediately
        updateSplitLayout(50);
    }

    // 2. Properly initialize the second app
    await createFullscreenEmbed(secondAppUrl, { 
        isSplitActivation: true, 
        splitSide: sideForSecondApp 
    });

    appDrawer.classList.remove('open');
    setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
    
    // Ensure final layout is correct
    updateSplitLayout(50);
}

function exitSplitScreen(survivingUrl = null) {
    // Prevent recursion lockups by clearing flags immediately
    splitScreenState.active = false;
    splitScreenState.isSelecting = false;
    
    // FIX: Only clear history if we are explicitly destroying the split 
    // by maximizing one side (survivingUrl). 
    // If survivingUrl is null (minimize all / switch away), we keep the pair in memory.
    if (survivingUrl) {
        splitScreenState.lastSplitPair = null;
    }
    
    const { leftAppUrl, rightAppUrl } = splitScreenState;
    
    // Clear state refs
    splitScreenState.leftAppUrl = null;
    splitScreenState.rightAppUrl = null;
    document.getElementById('split-divider').style.display = 'none';

    const cleanupApp = (url, keepOpen) => {
        if (!url) return;
        const embed = getEmbedContainer(url);
        if (!embed) return;

        embed.classList.remove('split-left', 'split-right', 'split-selecting');
        embed.style.width = ''; 
        embed.style.left = '';
        embed.style.right = '';

        if (!keepOpen) {
            // Pass false to skip animation
            minimizeFullscreenEmbed(false, url);
        } else {
            embed.style.display = 'block';
            embed.style.opacity = '1';
            embed.style.zIndex = '1001';
            const iframe = embed.querySelector('iframe');
            if(iframe) iframe.style.pointerEvents = 'auto';
        }
    };

    if (survivingUrl) {
        cleanupApp(survivingUrl, true);
        const otherUrl = (survivingUrl === leftAppUrl) ? rightAppUrl : leftAppUrl;
        cleanupApp(otherUrl, false);
    } else {
        cleanupApp(leftAppUrl, false);
        cleanupApp(rightAppUrl, false);
        closeFullscreenEmbed(); 
    }
}

function updateSplitLayout(percentage) {
    if (!splitScreenState.active) return;
    
    // Clamp to safe area (15% - 85%)
    const safePercentage = Math.max(15, Math.min(85, percentage));
    
    splitScreenState.splitPercentage = safePercentage;
    const leftApp = getEmbedContainer(splitScreenState.leftAppUrl);
    const rightApp = getEmbedContainer(splitScreenState.rightAppUrl);
    
    if (leftApp) {
        leftApp.style.setProperty('width', `${safePercentage}%`, 'important');
        leftApp.style.setProperty('left', '0', 'important');
        leftApp.style.setProperty('right', 'auto', 'important');
    }
    if (rightApp) {
        rightApp.style.setProperty('width', `${100 - safePercentage}%`, 'important');
        rightApp.style.setProperty('left', `${safePercentage}%`, 'important');
        rightApp.style.setProperty('right', '0', 'important');
    }
    
    const divider = document.getElementById('split-divider');
    if(divider) divider.style.left = `${safePercentage}%`;
}

let isAppOpen = false;
window.currentActiveAppUrl = null; 
let drawerWasOpen = false;
let drawerInactivityTimeout = null;
const DRAWER_AUTO_CLOSE_MS = 30000; // 30 second inactivity

function resetDrawerInactivityTimer() {
    clearTimeout(drawerInactivityTimeout);
    if (appDrawer.classList.contains('open')) {
        drawerInactivityTimeout = setTimeout(() => {
            if (appDrawer.classList.contains('open')) {
                const navHandle = document.getElementById('one-button-nav-handle');
                navHandle ? navHandle.click() : document.querySelector('.container').click();
            }
        }, DRAWER_AUTO_CLOSE_MS);
    }
}

async function createFullscreenEmbed(url, options = {}) {
    // Save drawer state before opening app
    drawerWasOpen = appDrawer.classList.contains('open');
	
    let { isSplitActivation = false, splitSide = null } = options;

    // Safeguard: If active split exists and URL matches, enforce split mode
    if (splitScreenState.active && !isSplitActivation) {
        if (url === splitScreenState.leftAppUrl) {
            isSplitActivation = true;
            splitSide = 'left';
        } else if (url === splitScreenState.rightAppUrl) {
            isSplitActivation = true;
            splitSide = 'right';
        }

        // If we enforced split mode, ensure the UI reflects it (divider + neighbor)
        if (isSplitActivation) {
            closeControls();
            const drawer = document.getElementById('app-drawer');
            if(drawer) {
                drawer.classList.remove('open');
                setTimeout(() => { if (!drawer.classList.contains('open')) drawer.style.display = 'none'; }, 300);
            }

            const divider = document.getElementById('split-divider');
            if (divider) {
                divider.style.display = 'flex';
                updateSplitLayout(splitScreenState.splitPercentage || 50);
            }
            
            // Restore neighbor
            const neighborUrl = (splitSide === 'left') ? splitScreenState.rightAppUrl : splitScreenState.leftAppUrl;
            if (neighborUrl && neighborUrl !== url) {
                 // Invoke with isSplitActivation: true to bypass wrapper logic and prevent recursion loops
                 createFullscreenEmbed(neighborUrl, { 
                     isSplitActivation: true, 
                     splitSide: (splitSide === 'left' ? 'right' : 'left') 
                 });
            }
        }
    }
	
    // 1. If currently selecting a split partner
    // FIX: Only finalize if this is a USER interaction, not a system activation
    if (splitScreenState.isSelecting && !isSplitActivation) {
        finalizeSplitScreen(url);
        return;
    }

    // 2. Restore a previous split session
    // FIX: Only restore if this is a USER interaction, not a system activation
    if (!splitScreenState.active && splitScreenState.lastSplitPair && (url === splitScreenState.lastSplitPair.left || url === splitScreenState.lastSplitPair.right) && !isSplitActivation) {
        const { left, right } = splitScreenState.lastSplitPair;
        
        splitScreenState.active = true;
        splitScreenState.leftAppUrl = left;
        splitScreenState.rightAppUrl = right;

        // Open/Restore both apps
        await createFullscreenEmbed(left, { isSplitActivation: true, splitSide: 'left' });
        await createFullscreenEmbed(right, { isSplitActivation: true, splitSide: 'right' });

        updateSplitLayout(50);
        document.getElementById('split-divider').style.display = 'flex';
        // Close drawer if open
        const drawer = document.getElementById('app-drawer');
        if(drawer) drawer.classList.remove('open');
        closeControls();
        return;
    }

    // 3. Normal Open
    if (splitScreenState.active && !isSplitActivation) {
        exitSplitScreen(null);
    }

    if (!isSplitActivation) {
        // NEW: History Stack Logic
        // If an app is currently open and active (display: block), save it to history
        const currentActive = document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        // Ensure we aren't just refreshing the current app
        if (currentActive && currentActive.dataset.embedUrl !== url) {
            // Push the URL to the stack
            window.appHistoryStack.push(currentActive.dataset.embedUrl);
            
            // Limit history stack size to prevent infinite memory growth
            if (window.appHistoryStack.length > 15) {
                window.appHistoryStack.shift();
            }
            console.log(`[System] Pushed to history: ${currentActive.dataset.embedUrl}`);
        }

        // --- Hard Reset for FULLSCREEN apps only ---
        document.querySelectorAll('.fullscreen-embed').forEach(embed => {
            if (embed.dataset.embedUrl !== url) {
                // FIX: Skip embeds that are marked as closing (being destroyed)
                // This prevents caching stale references to elements about to be removed
                if (embed.dataset.closing === 'true') {
                    return;
                }
                
                // FIX: Check if this embed is part of an active split. If so, DO NOT HIDE IT.
                // This prevents the system from "unsplitting" when restoring the pair or switching focus.
                const isPartOfActiveSplit = splitScreenState.active && 
                    (embed.dataset.embedUrl === splitScreenState.leftAppUrl || 
                     embed.dataset.embedUrl === splitScreenState.rightAppUrl);

                if (!isPartOfActiveSplit) {
                    if (embed.dataset.embedUrl) {
                        minimizedEmbeds[embed.dataset.embedUrl] = embed;
                    }
                    embed.style.display = 'none'; // Hide immediately
                    embed.style.contentVisibility = 'hidden'; // OPTIMIZATION
                    embed.style.opacity = '0';
                    embed.style.zIndex = '0';
                }
            }
        });
    }

	closeControls();

    // --- DUPLICATE PREVENTION FIX ---
    // Check cache first, then fall back to checking DOM for any existing container
    let embedContainer = minimizedEmbeds[url];
    
    // FIX: If the cached embed is marked as closing, clear it from cache and ignore it
    if (embedContainer && embedContainer.dataset.closing === 'true') {
        delete minimizedEmbeds[url];
        embedContainer = null;
    }
    
    if (!embedContainer) {
        const inDom = document.querySelector(`.fullscreen-embed[data-embed-url="${url}"]`);
        if (inDom) {
            // FIX: Skip elements that are marked as closing (being destroyed)
            if (inDom.dataset.closing === 'true') {
                // Don't use this element, let a new one be created
            } else if (inDom.style.display === 'none') {
                // Found in DOM but not in cache
                minimizedEmbeds[url] = inDom; // Re-link cache
                embedContainer = inDom;
            } else if (isSplitActivation) {
                // FIX: Explicitly reuse existing container for split activation to prevent duplicates
                embedContainer = inDom;
            } else {
                // App is already active/visible and not splitting. Just return (focus).
                return; 
            }
        }
    }
	
    // If we are about to restore this app, cancel any pending cleanup timer for it.
    // FIX: Clear the specific timeout for this URL
    if (minimizeTimeouts[url]) {
        clearTimeout(minimizeTimeouts[url]);
        delete minimizeTimeouts[url];
    }
    // Also clear global one just in case
    clearTimeout(minimizeCleanupTimeout);

	// 1. Check if Gurapps are disabled entirely
    // This uses the 'gurappsEnabled' variable you already have.
    if (!gurappsEnabled) {
        showPopup(currentLanguage.GURAPP_OFF);
        return; // Stop execution immediately
    }

    // NEW: When one-button nav is active, disable gesture overlay for apps
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.pointerEvents = oneButtonNavEnabled ? 'none' : 'auto';
    }

// Normalize URL helper to safely compare paths
    const normalizeUrlPath = (u) => {
        try { return new URL(u, window.location.origin).pathname; } 
        catch(e) { return u; }
    };

    // 2. Find the app's name from the URL. This also validates that the app is "installed".
    let appName = Object.keys(apps).find(name => apps[name].url === url);
    if (!appName) {
        // Try matching by normalized path (helps resolve absolute vs relative discrepancies)
        appName = Object.keys(apps).find(name => normalizeUrlPath(apps[name].url) === normalizeUrlPath(url));
    }

    // --- START of MODIFICATION ---
    // NEW: Define special internal tool URLs that are always allowed to open.
    const internalToolUrls = [
        '/recovery/index.html',
        '/transfer/index.html',
    ];
	
	const isInternalTool = internalToolUrls.some(t => url.includes(t));
    const isSystemApp = url.includes('/assets/gurapp/intl');

    // --- Fuzzy Matching for Unknown URLs ---
    let isFuzzyMatch = false;
    if (!appName) {
        try {
            const targetUrl = new URL(url, window.location.origin);
            const targetDomain = targetUrl.hostname;
            const targetParams = targetUrl.search;

            isFuzzyMatch = Object.values(apps).some(app => {
                try {
                    const appUrl = new URL(app.url, window.location.origin);
                    // Match if same domain AND (contains "search" or "q=" or "query=")
                    const sameDomain = appUrl.hostname === targetDomain;
                    const isQuery = targetParams.includes('search') || targetParams.includes('q=') || targetParams.includes('query=');
                    return sameDomain && isQuery;
                } catch(e) { return false; }
            });

            // Allow general domain matching for local network addresses
            if (!isFuzzyMatch) {
                const isLocal = targetDomain === 'localhost' || 
                                targetDomain === '127.0.0.1' || 
                                targetDomain.startsWith('192.168.') || 
                                targetDomain.startsWith('10.') || 
                                targetDomain.endsWith('.local');
                if (isLocal) isFuzzyMatch = true;
            }
        } catch(e) { isFuzzyMatch = false; }
    }
	
	// If the URL is not for an installed app, tool, system app, or a fuzzy match, block it.
	if (!appName && !isInternalTool && !isSystemApp && !isFuzzyMatch) {
	    console.warn(`Attempted to open an unknown app or non-allowlisted URL: ${url}`);
		showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.GURAPP_NOT_INSTALLED,
			message: `${url}`,
            icon: 'cancel'
		});
	    return;
	}
	
	// Fallback app details for tools/allowlisted URLs
	let appDetails;
	if (appName) {
	    appDetails = apps[appName];
	} else { // It must be an internal tool or Google Form to get this far
	    appDetails = {
            name: 'System Tool',
            icon: '/assets/appicon/system.png', // A generic system icon
            url: url
        };
        appName = 'System Tool'; // Assign a temporary name for tracking
    }

    // Update the favicon to the app's icon
    await restoreCorrectFavicon();

    // 3. Since the app is valid, perform the tracking.
    appUsage[appName] = (appUsage[appName] || 0) + 1;
    saveUsageData();

    appLastOpened[appName] = Date.now();
    saveLastOpenedData();

    const dynArea = document.getElementById('dynamic-area');
    if (dynArea) dynArea.style.opacity = '1';

    isAppOpen = true;
    document.body.classList.add('app-active'); // Ensure active state is set immediately

	SoundManager.play('open');
	
    if (embedContainer) {
        // Restore the minimized embed
        
        // FIX: Removed variable shadowing 'const embedContainer = ...' 
        // to prevent crash when reusing active DOM elements.

        // Remove from cache immediately
        if (minimizedEmbeds[url]) delete minimizedEmbeds[url];

        // Ensure split classes are correct upon restore
        if (isSplitActivation && splitSide) {
            embedContainer.classList.remove('split-left', 'split-right');
            embedContainer.classList.add(splitSide === 'left' ? 'split-left' : 'split-right');
            embedContainer.style.zIndex = '1001';
            
            // FIX: Force width/position update immediately to override any stale inline styles
            // This is necessary because 'updateSplitLayout' checks 'splitScreenState.active',
            // which isn't true yet during the initialization of the second app.
            const splitPercent = splitScreenState.splitPercentage || 50;
            if (splitSide === 'left') {
                embedContainer.style.setProperty('width', `${splitPercent}%`, 'important');
                embedContainer.style.setProperty('left', '0', 'important');
                embedContainer.style.setProperty('right', 'auto', 'important');
            } else {
                embedContainer.style.setProperty('width', `${100 - splitPercent}%`, 'important');
                embedContainer.style.setProperty('left', `${splitPercent}%`, 'important');
                embedContainer.style.setProperty('right', '0', 'important');
            }
        } else if (!isSplitActivation) {
            // Standard restore, remove split artifacts
            embedContainer.classList.remove('split-left', 'split-right');
            embedContainer.style.width = '';
            embedContainer.style.left = '';
            embedContainer.style.removeProperty('right');
        }
		
        // First, remove any existing transitions
        embedContainer.style.transition = 'none';
        
        // Set initial state with rounded corners
        embedContainer.style.transform = 'perspective(100vh) rotateX(-40deg) translateY(40px) scale(0.8)';
        embedContainer.style.opacity = '0';
        embedContainer.style.filter = 'blur(10px)';
        embedContainer.style.borderRadius = '50px';
		embedContainer.style.cornerShape = 'superellipse(1.5)';
		embedContainer.style.border = '1px solid var(--glass-border)';
        embedContainer.style.overflow = 'clip';
        embedContainer.style.display = 'block'; // Ensure visibility
        embedContainer.style.removeProperty('content-visibility'); // OPTIMIZATION: Ensure rendering

		const brightnessValue = document.getElementById('wallpaper-brightness-slider')?.value || 100;
	    const contrastValue = document.getElementById('wallpaper-contrast-slider')?.value || 100;
        const saturateValue = document.getElementById('wallpaper-saturate-slider')?.value || 100;
        const hueValue = document.getElementById('wallpaper-hue-slider')?.value || 0;
	    const openFilter = `blur(10px) brightness(${brightnessValue}%) contrast(${contrastValue}%) saturate(${saturateValue}%) hue-rotate(${hueValue}deg)`;
	    document.body.style.setProperty('--wallpaper-filter', openFilter);
	    document.body.style.setProperty('--bg-transform-scale', '1.25');
        
        clearTimeout(autoSleepTimer); // Stop auto-sleep when an app is opened

        // IMPORTANT FIX: Restore proper z-index and pointer events
        embedContainer.style.pointerEvents = 'auto';
        embedContainer.style.zIndex = '1001';
        
        // Force reflow to apply the immediate style changes
        void embedContainer.offsetWidth;
        
        // Add transition for all properties (removed filter)
		embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';

        // Pause background animations (Video and Animated Images)
        pauseAllAnimations();
		
	    // Clear background blur and trigger the animation
	    setTimeout(() => {
            const frame = embedContainer.querySelector('iframe');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({ type: 'visibilityUpdate', visible: true }, '*');
            }
	        embedContainer.style.transform = 'scale(1)';
	        embedContainer.style.opacity = '1';
	        embedContainer.style.filter = 'none';
	        embedContainer.style.borderRadius = `${window.systemScreenCurve || 0}px`;
			embedContainer.style.cornerShape = 'superellipse(1.5)';
			embedContainer.style.border = 'none';
	    }, 10);
        
        // Hide all main UI elements
        document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
            if (!el.dataset.originalDisplay) {
                el.dataset.originalDisplay = window.getComputedStyle(el).display;
            }
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            setTimeout(() => {
                el.classList.add('force-hide');
                el.style.contentVisibility = 'hidden'; // OPTIMIZATION
            }, 300);
        });
        
        // Hide Home Activities
        HomeActivityManager.updateVisibility();

        // Restore app management
        document.querySelectorAll('#app-management-info').forEach(el => {
            el.classList.remove('force-hide');
            el.style.display = el.dataset.originalDisplay || ''; // Restore original display property
            el.style.transition = 'opacity 0.3s ease';

            requestAnimationFrame(() => {
                el.style.opacity = '1';
            });
        });

        // Show the swipe overlay when restoring an app
	    if (swipeOverlay) {
	        swipeOverlay.style.display = 'block';
	        swipeOverlay.style.pointerEvents = 'auto';
	    }
        
        // IMPORTANT FIX: Make sure interaction blocker doesn't block embed
        const interactionBlocker = document.getElementById('interaction-blocker');
        if (interactionBlocker) {
            interactionBlocker.style.pointerEvents = 'none';
            interactionBlocker.style.display = 'none';
        }

		// NEW: Send sun update to the iframe once it's restored
        const restoredIframe = embedContainer.querySelector('iframe');
	    if (restoredIframe && restoredIframe.contentWindow) {
	        restoredIframe.contentWindow.postMessage({ type: 'sunUpdate', shadow: currentSunShadow }, window.location.origin);
	    }
		restoredIframe.style.pointerEvents = 'auto';

	    populateDock();
        
        return;
    }
    
    // Create new embed if not already minimized
        embedContainer = document.createElement('div');
    const iframe = document.createElement('iframe');

    // Detect current domain structure and verify URL availability
    let finalUrl = url;
    try {
        const parsedUrl = new URL(url, window.location.origin);
        if (parsedUrl.origin === window.location.origin) {
            const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
            if (!res || !res.ok) {
                // If unavailable at root, try in the domain's subfolder (e.g. Github Pages)
                if (url.startsWith('/')) {
                    const basePath = window.location.pathname.replace(/\/[^\/]*$/, '');
                    if (basePath) finalUrl = basePath + url;
                } 
                // Vice versa: if relative, try root
                else if (!url.startsWith('http')) {
                    finalUrl = '/' + url.replace(/^\.\//, '');
                }
            }
        }
    } catch(e) {
        console.warn("URL resolution check failed", e);
    }

    iframe.src = finalUrl;
    iframe.setAttribute('data-gurasuraisu-iframe', 'true');
    const appId = Object.keys(apps).find(k => apps[k].url === url);
    iframe.dataset.appId = appId;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    
    embedContainer.className = 'fullscreen-embed';
    if (isSplitActivation && splitSide) {
        embedContainer.classList.add(splitSide === 'left' ? 'split-left' : 'split-right');
    }
    
    // Check for pending split class
    if (window.pendingSplitClass) {
        embedContainer.classList.add(window.pendingSplitClass);
    }
    
    // Set initial styles BEFORE adding to DOM
    embedContainer.style.transform = 'perspective(100vh) rotateX(-40deg) translateY(40px) scale(0.8)';
    embedContainer.style.opacity = '0';
    embedContainer.style.filter = 'blur(10px)';
    embedContainer.style.borderRadius = '50px';
	embedContainer.style.cornerShape = 'superellipse(1.5)';
	embedContainer.style.border = '1px solid var(--glass-border)';
    embedContainer.style.overflow = 'clip';
	embedContainer.style.display = 'block';
    embedContainer.style.backgroundColor = 'var(--background-color-tr)';

    // Create Loading Spinner
    const spinner = document.createElement('div');
    spinner.className = 'app-loading-indicator';
    spinner.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1002; transition: opacity 0.3s ease; pointer-events: none;';
    spinner.innerHTML = `
        <svg class="loading-spinner" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px;">
            <rect width="100%" height="100%" fill="currentColor" stroke="none" class="loading-spinner-ind" />
        </svg>
    `;
    embedContainer.appendChild(spinner);
        
    // IMPORTANT FIX: Set proper z-index and pointer events
    embedContainer.style.pointerEvents = 'auto';
    embedContainer.style.zIndex = '1001';
    embedContainer.appendChild(iframe);

    const brightnessValue = document.getElementById('wallpaper-brightness-slider')?.value || 100;
    const contrastValue = document.getElementById('wallpaper-contrast-slider')?.value || 100;
    const saturateValue = document.getElementById('wallpaper-saturate-slider')?.value || 100;
    const hueValue = document.getElementById('wallpaper-hue-slider')?.value || 0;
    const openFilter = `blur(10px) brightness(${brightnessValue}%) contrast(${contrastValue}%) saturate(${saturateValue}%) hue-rotate(${hueValue}deg)`;
    document.body.style.setProperty('--wallpaper-filter', openFilter);
    document.body.style.setProperty('--bg-transform-scale', '1.25');
    
    // Store the URL as a data attribute
    embedContainer.dataset.embedUrl = url;
    window.currentActiveAppUrl = url; // Update global state

    window.Analytics?.trackAppOpen(url);
	
    // Flag to track embedding status
    let embedFailed = false;
    
	iframe.addEventListener('load', () => {
        // Hide spinner and show app
        iframe.style.opacity = '1';
        spinner.style.opacity = '0';
        setTimeout(() => { if (spinner.parentNode) spinner.remove(); }, 300);
        embedContainer.style.backgroundColor = '';

	    // If iframe loaded successfully, send language to iframe
	    const currentLang = localStorage.getItem('selectedLanguage') || 'EN';
	    if (iframe.contentWindow) {
	        iframe.contentWindow.postMessage({
	            type: 'languageUpdate',
	            languageCode: currentLang
	        }, '*');
	    }

    	// Set a timeout to apply legacy mode if the app doesn't announce its API
        setTimeout(() => {
            // Check if the embed still exists and hasn't received an API handshake
            if (document.body.contains(embedContainer) && !embedContainer.dataset.hasApi) {
                console.log(`Gurapp at ${url} did not announce API. Applying legacy mode.`);
                
                // Create and prepend the legacy header
                const legacyHeader = document.createElement('div');
                legacyHeader.className = 'legacy-app-header';

                const appIconImg = document.createElement('img');
                const appNameSpan = document.createElement('span');
                const navControls = document.createElement('div');
                navControls.className = 'legacy-nav-controls';

                const refreshBtn = document.createElement('button');
                refreshBtn.className = 'btn-qc';
                refreshBtn.innerHTML = `<span class="material-symbols-rounded">home</span>`;
                // This is the cross-origin safe way to reload an iframe.
                refreshBtn.onclick = () => { iframe.src = iframe.src; };

                // Populate header info
                let iconUrl = appDetails.icon;
                if (iconUrl && !(iconUrl.startsWith('http') || iconUrl.startsWith('/') || iconUrl.startsWith('data:'))) {
                    iconUrl = `/assets/appicon/${iconUrl}`;
                }
                appIconImg.src = iconUrl || '';
                appNameSpan.textContent = appName;

                // Assemble the header
                navControls.appendChild(refreshBtn);
                legacyHeader.appendChild(navControls);
                legacyHeader.appendChild(appIconImg);
                legacyHeader.appendChild(appNameSpan);
                
                // Add the header before the iframe
                embedContainer.insertBefore(legacyHeader, iframe);
                
                // Finally, apply the legacy class to make it all visible
                embedContainer.classList.add('legacy');
            }
        }, 1000); // 1s grace period
	});
    
    // Handle iframe loading error
	iframe.addEventListener('error', () => {
	    embedFailed = true;
	    const urlDomain = new URL(url).hostname;
	
	    // Only open a new tab if domain is not allowlisted
	    if (!allowlistDomains.includes(urlDomain)) {
	        window.open(url, '_blank');
	    }
	
	    // Don't remove the container or close the embed
	});
    
    // Hide all main UI elements
    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
        if (!el.dataset.originalDisplay) {
            el.dataset.originalDisplay = window.getComputedStyle(el).display;
        }
        el.style.transition = 'opacity 0.3s ease';
        el.style.opacity = '0';
        setTimeout(() => {
            el.classList.add('force-hide');
            el.style.contentVisibility = 'hidden'; // OPTIMIZATION
        }, 300);
    });

    // Restore app management
    document.querySelectorAll('#app-management-info').forEach(el => {
	el.classList.remove('force-hide');
        el.style.display = el.dataset.originalDisplay || ''; // Restore original display property
        el.style.transition = 'opacity 0.3s ease';

        requestAnimationFrame(() => {
            el.style.opacity = '1';
        });
    });
	
    // Append the container to the DOM
    document.body.appendChild(embedContainer);
	
    pauseAllAnimations();
    
    // Force reflow to ensure the initial styles are applied
    void embedContainer.offsetWidth;
    
    // Now add the transition AFTER the element is in the DOM (removed filter)
    embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';

    // Pause background animations
    await pauseAllAnimations();
    
    // Clear background blur and trigger the animation
    setTimeout(() => {
        embedContainer.style.transform = 'scale(1)';
        embedContainer.style.opacity = '1';
        embedContainer.style.filter = 'none';
        embedContainer.style.borderRadius = `${window.systemScreenCurve || 0}px`;
		embedContainer.style.cornerShape = 'superellipse(1.5)';
		embedContainer.style.border = 'none';
    }, 10);
    
    // Show the swipe overlay when opening an app
    if (swipeOverlay) {
        swipeOverlay.style.display = 'block';
        swipeOverlay.style.pointerEvents = 'auto';
    }
    
    // IMPORTANT FIX: Make sure interaction blocker doesn't block embed
    const interactionBlocker = document.getElementById('interaction-blocker');
    if (interactionBlocker) {
        interactionBlocker.style.pointerEvents = 'none';
        interactionBlocker.style.display = 'none';
    }

    // Explicitly update visibility to hide Home Activities on cold launch
    HomeActivityManager.updateVisibility();

    populateDock();
    resetIndicatorTimeout();
	updateDockVisibility();
}

// Wrapper to intercept app open calls
const originalCreateFullscreenEmbed = createFullscreenEmbed;
createFullscreenEmbed = async function(url, options = {}) {
    // Wake up and log activity for Resource Manager
    if (typeof ResourceManager !== 'undefined') {
        ResourceManager.markAppActive(url);
    }
	
    // Default options to empty object if undefined
    const { isSplitActivation = false } = options || {};

    // Close Donburi dynamically when an app is opened
    if (typeof window.closeDonburi === 'function') {
        window.closeDonburi();
    }

    // Bypass for internal calls
    if (isSplitActivation) {
        return originalCreateFullscreenEmbed(url, options);
    }

    // Case 1: Intercept click to finalize a split selection
    if (splitScreenState.isSelecting) {
        finalizeSplitScreen(url);
        return;
    }

    // Case 2: Handling Active Splits (Visible or Minimized)
    if (splitScreenState.active) {
        // Sub-case: The requested URL is part of the active split pair
        if (url === splitScreenState.leftAppUrl || url === splitScreenState.rightAppUrl) {
            
            // We are restoring a minimized split. We must restore the OTHER side too.
            const otherUrl = (url === splitScreenState.leftAppUrl) 
                ? splitScreenState.rightAppUrl 
                : splitScreenState.leftAppUrl;

            // 1. Restore the other side first (silently)
            // We pass isSplitActivation: true to prevent recursion
            await originalCreateFullscreenEmbed(otherUrl, { 
                isSplitActivation: true, 
                splitSide: (otherUrl === splitScreenState.leftAppUrl ? 'left' : 'right') 
            });

            // 2. Ensure Divider is visible and correct
            const divider = document.getElementById('split-divider');
            if (divider) {
                divider.style.display = 'flex';
                // Restore previous position or default to 50
                updateSplitLayout(splitScreenState.splitPercentage || 50);
            }
            
            // 3. Close Home UI Elements
            closeControls();
            const drawer = document.getElementById('app-drawer');
            if(drawer) {
                drawer.classList.remove('open');
                setTimeout(() => { if (!drawer.classList.contains('open')) drawer.style.display = 'none'; }, 300);
            }
			
            // 4. Call original for the requested URL (this brings it to front/focus)
            return originalCreateFullscreenEmbed(url, { 
                isSplitActivation: true, 
                splitSide: (url === splitScreenState.leftAppUrl ? 'left' : 'right') 
            });

        } else {
            // Sub-case: Opening a 3rd app (Not part of split)
            // This exits the split session and minimizes the pair
            exitSplitScreen(null); 
        }
    }
    
    // Case 3: Restore a previous split session from history (if getting completely fresh)
	if (!splitScreenState.active && splitScreenState.lastSplitPair && (url === splitScreenState.lastSplitPair.left || url === splitScreenState.lastSplitPair.right)) {
		const { left, right } = splitScreenState.lastSplitPair;
		
		splitScreenState.active = true;
		splitScreenState.leftAppUrl = left;
		splitScreenState.rightAppUrl = right;
		
		await createFullscreenEmbed(left, { isSplitActivation: true, splitSide: 'left' });
		await createFullscreenEmbed(right, { isSplitActivation: true, splitSide: 'right' });
		
		document.getElementById('split-divider').style.display = 'flex';
		updateSplitLayout(50);
		closeControls();
		const drawer = document.getElementById('app-drawer');
		if(drawer) {
			drawer.classList.remove('open');
			setTimeout(() => { if (!drawer.classList.contains('open')) drawer.style.display = 'none'; }, 300);
		}
		return;
	}

    // Case 4: Manual App Open (Clearing History)
    // If we reach here, we are opening a single app normally via interaction.
    // We should clear the split history and the navigation stack.
    if (!splitScreenState.active && !isSplitActivation) {
        // FIX: Do not wipe lastSplitPair here. 
        // This allows switching to a 3rd app and then coming back to restore the split A+B.
        // splitScreenState.lastSplitPair = null; 
        
        window.appHistoryStack = []; // Clear history stack on manual open
    }

    // Call original logic which handles DOM creation
    const result = await originalCreateFullscreenEmbed(url, options);

    // Force immediate favicon update with the URL we just opened.
    // This bypasses the DOM query delay.
    restoreCorrectFavicon(url);
    updateTitle();

    return result;
};

async function createBackgroundEmbed(url) {
    // 1. Check if running (Active or Minimized)
    const existingActive = document.querySelector(`.fullscreen-embed[data-embed-url="${url}"]`);
    if (existingActive || minimizedEmbeds[url]) {
        // NEW: Force refresh UI if already running so remote picks it up immediately
        const targetContainer = existingActive || minimizedEmbeds[url];
        const targetFrame = targetContainer.querySelector('iframe');
        if (targetFrame && targetFrame.contentWindow) {
            const targetOrigin = getOriginFromUrl(url);
            targetFrame.contentWindow.postMessage({ type: 'requestRemoteUI' }, targetOrigin);
        }
        return; // Already running
    }

    // 2. Find App Info
    let appName = Object.keys(apps).find(name => apps[name].url === url);
    let appDetails = appName ? apps[appName] : null;

    // 3. Create Container (Hidden)
    const embedContainer = document.createElement('div');
    embedContainer.className = 'fullscreen-embed';
    embedContainer.style.display = 'none'; 
    embedContainer.style.zIndex = '0';
    embedContainer.dataset.embedUrl = url;

    // 4. Create Iframe
    const iframe = document.createElement('iframe');

    let finalUrl = url;
    try {
        const parsedUrl = new URL(url, window.location.origin);
        if (parsedUrl.origin === window.location.origin) {
            const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
            if (!res || !res.ok) {
                if (url.startsWith('/')) {
                    const basePath = window.location.pathname.replace(/\/[^\/]*$/, '');
                    if (basePath) finalUrl = basePath + url;
                } else if (!url.startsWith('http')) {
                    finalUrl = '/' + url.replace(/^\.\//, '');
                }
            }
        }
    } catch(e) {}

    iframe.src = finalUrl;
    iframe.setAttribute('data-gurasuraisu-iframe', 'true');
    if (appName) iframe.dataset.appId = appName;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    
    embedContainer.appendChild(iframe);

    // 5. Listeners
    iframe.addEventListener('load', () => {
        // Set initial volume based on current Master and App settings
        syncAppVolume(iframe);
        
        const currentLang = localStorage.getItem('selectedLanguage') || 'EN';
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'languageUpdate',
                languageCode: currentLang
            }, '*');
        }
    });

    // 6. Add to DOM and Minimized Cache
    document.body.appendChild(embedContainer);
    minimizedEmbeds[url] = embedContainer;
    
    console.log(`[System] Launched ${appName} in background.`);
}

window.launchAppSilently = createBackgroundEmbed;

function closeFullscreenEmbed() {
    // Restore the original favicon
    setTimeout(() => {
        restoreCorrectFavicon();
        updateTitle();
    }, 50);
	
    isAppOpen = false;
    window.currentActiveAppUrl = null; // Clear global state
    
	SoundManager.play('close'); 

    window.speechSynthesis.cancel();

    const embedContainer = document.querySelector('.fullscreen-embed[style*="display: block"]');
    
    if (embedContainer) {
        const url = embedContainer.dataset.embedUrl;
        window.Analytics?.trackAppClose(url);

		document.body.classList.remove('app-active');
        
        // Clean up Switcher Data Immediately
        // Remove from minimized cache to prevent ghosting in App Switcher
        if (url && minimizedEmbeds[url]) {
            delete minimizedEmbeds[url];
        }

        // If part of a split, clear the split state from memory so the remaining app becomes standalone
        if (splitScreenState.active && (url === splitScreenState.leftAppUrl || url === splitScreenState.rightAppUrl)) {
            splitScreenState.active = false;
            splitScreenState.leftAppUrl = null;
            splitScreenState.rightAppUrl = null;
            const divider = document.getElementById('split-divider');
            if (divider) divider.style.display = 'none';
        }

        const appName = Object.keys(apps).find(name => apps[name].url === url);

        if (appName) {
            // Clear media session for the closing app
            clearMediaSession(appName);
            // Stop all live activities started by this app
            Object.keys(activeLiveActivities).forEach(activityId => {
                if (activeLiveActivities[activityId].appName === appName) {
                    stopLiveActivity(activityId);
                }
            });
        }
		
	    if (window.WavesHost) {
            // Only clear if the closing app owns the current UI
            if (window.activeAppUI && window.activeAppUI.appName === appName) {
	            window.WavesHost.clearAppUI(); 
            }
	    }
		
        // Animate out
        embedContainer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        embedContainer.style.transform = 'translateY(40px) scale(0.9)';
        embedContainer.style.opacity = '0';
        embedContainer.style.pointerEvents = 'none'; // Prevent clicks during fade out
        
        // FIX: Set display to none immediately so the closing app is not detected as "active"
        // This prevents history apps from pushing the closing app back onto the stack
        embedContainer.style.display = 'none';
        
        // FIX: Mark this embed as closing so createFullscreenEmbed won't cache it
        embedContainer.dataset.closing = 'true';

		// After animation, remove the element entirely from the DOM
        setTimeout(() => {
            // OPTIMIZATION: Force browser Garbage Collection by navigating to about:blank
            // This destroys the app's JS context immediately instead of waiting for the GC daemon
            const iframe = embedContainer.querySelector('iframe');
            if (iframe) {
                iframe.src = 'about:blank';
                iframe.remove();
            }
            embedContainer.remove();
        }, 300);
    }

    // Check History Stack
    if (window.appHistoryStack && window.appHistoryStack.length > 0) {
        const previousUrl = window.appHistoryStack.pop();
        // Check if previous app is the same as the one closing (prevent loops)
        if (previousUrl !== embedContainer?.dataset?.embedUrl) {
            console.log(`[System] Restoring from history: ${previousUrl}`);
            createFullscreenEmbed(previousUrl);
            return; // EXIT: Do not show Home Screen
        }
    }
	
    // --- STANDARD HOME RESTORATION (Only if history is empty) ---
    // Restore all main UI elements
    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
	    el.classList.remove('force-hide');
        el.style.display = el.dataset.originalDisplay || ''; // Restore original display property
        el.style.removeProperty('content-visibility'); // OPTIMIZATION: Enable rendering
        el.style.transition = 'opacity 0.3s ease';

        requestAnimationFrame(() => {
            el.style.opacity = '1';
        });
    });

    // Hide app management
    document.querySelectorAll('#app-management-info').forEach(el => {
        if (!el.dataset.originalDisplay) {
            el.dataset.originalDisplay = window.getComputedStyle(el).display;
        }
        el.style.transition = 'opacity 0.3s ease';
        el.style.opacity = '0';
        setTimeout(() => {
            el.classList.add('force-hide');
        }, 300);
    });
    
    // Hide the swipe overlay
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.display = 'none';
        swipeOverlay.style.pointerEvents = 'none';
    }

    // Restore background effects
    applyWallpaperEffects();
    document.body.style.setProperty('--bg-transform-scale', '1.05');
	
    // Resume background animations
    resumeAllAnimations();

    populateDock();
    resetAutoSleepTimer(); // Reset timer when returning to home screen
    resetIndicatorTimeout();
	updateDockVisibility();
    HomeActivityManager.updateVisibility();
}

function forceCloseApp(url) {
    window.Analytics?.trackAppClose(url);

	document.body.classList.remove('app-active');
	
    // 1. Identify if we are closing the currently focused/visible app
    const activeElement = document.querySelector('.fullscreen-embed[style*="display: block"]');
    const isActiveApp = activeElement && activeElement.dataset.embedUrl === url;

    // 2. Resource Cleanup
    // Minimized Cache
    if (minimizedEmbeds[url]) {
        delete minimizedEmbeds[url];
    }
	// Switcher Snapshots
    if (typeof SwapManager !== 'undefined') {
        SwapManager.remove('app_snap_' + url);
    }
    // Split Screen State
    if (typeof splitScreenState !== 'undefined' && splitScreenState.active) {
        if (url === splitScreenState.leftAppUrl || url === splitScreenState.rightAppUrl) {
            splitScreenState.active = false;
            splitScreenState.leftAppUrl = null;
            splitScreenState.rightAppUrl = null;
            const divider = document.getElementById('split-divider');
            if (divider) divider.style.display = 'none';
        }
    }
    // App-Specific Resources (Media, Activities, Waves)
    const appName = Object.keys(apps).find(name => apps[name].url === url);
    if (appName) {
        if (typeof clearMediaSession === 'function') clearMediaSession(appName);
        
        if (typeof activeLiveActivities !== 'undefined') {
            Object.keys(activeLiveActivities).forEach(activityId => {
                if (activeLiveActivities[activityId].appName === appName) {
                    if (typeof stopLiveActivity === 'function') stopLiveActivity(activityId);
                }
            });
        }
        
        if (window.WavesHost && window.activeAppUI && window.activeAppUI.appName === appName) {
             window.WavesHost.clearAppUI(); 
        }
    }

    // 3. UI Restoration Logic (Only if the app was active)
    if (isActiveApp) {
        isAppOpen = false;
        window.currentActiveAppUrl = null; // Clear global state
        
        if (typeof SoundManager !== 'undefined') SoundManager.play('close');
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        
        // Show Home Activity
        HomeActivityManager.updateVisibility();

        // Check History Stack
        if (window.appHistoryStack && window.appHistoryStack.length > 0) {
            const previousUrl = window.appHistoryStack.pop();
            // If prev is different, we go back instead of Home
            if (previousUrl !== url) {
                // Kill current DOM
                const embeds = document.querySelectorAll(`.fullscreen-embed[data-embed-url="${url}"]`);
                embeds.forEach(el => el.remove());
                
                // Open previous
                createFullscreenEmbed(previousUrl);
                console.log(`[System] Force closed ${url}, navigating back to ${previousUrl}`);
                return; 
            }
        }

        // Restore Home Screen UI
        document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
            el.classList.remove('force-hide');
            el.style.display = el.dataset.originalDisplay || ''; 
            el.style.removeProperty('content-visibility'); 
            el.style.transition = 'opacity 0.3s ease';
            requestAnimationFrame(() => { el.style.opacity = '1'; });
        });

        // Hide App Management Label
        document.querySelectorAll('#app-management-info').forEach(el => {
            if (!el.dataset.originalDisplay) el.dataset.originalDisplay = window.getComputedStyle(el).display;
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            setTimeout(() => el.classList.add('force-hide'), 300);
        });

        // Hide Overlays
        const swipeOverlay = document.getElementById('swipe-overlay');
        if(swipeOverlay) {
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
        }
        const interactionBlocker = document.getElementById('interaction-blocker');
        if(interactionBlocker) interactionBlocker.style.pointerEvents = 'auto';

        // Restore Effects
        applyWallpaperEffects();
        document.body.style.setProperty('--bg-transform-scale', '1.05');
        resumeAllAnimations();
        populateDock();
        resetAutoSleepTimer();
        resetIndicatorTimeout();
        updateDockVisibility();
        
        // Update Title
        setTimeout(() => {
            restoreCorrectFavicon();
            updateTitle();
        }, 50);
    }

	// 4. Final DOM Removal
    // This removes the iframe container for the specified URL, effectively killing the app.
    const embeds = document.querySelectorAll(`.fullscreen-embed[data-embed-url="${url}"]`);
    embeds.forEach(el => {
        // OPTIMIZATION: Force immediate Garbage Collection of the inner app context
        const iframe = el.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
            iframe.remove();
        }
        el.remove();
    });
    
    console.log(`[System] Force closed app: ${url}`);
}

// Ensure the function accepts the second argument
function minimizeFullscreenEmbed(animate = true, urlToMinimize = null) {
    // UPDATE TITLE/FAVICON
    setTimeout(() => {
        restoreCorrectFavicon();
        updateTitle();
    }, 50);
	
    // Clear any pending cleanup
    clearTimeout(minimizeCleanupTimeout);

	document.body.classList.remove('app-active');
	
    // --- Split Screen Support: Handle split screen minimization ---
    if (splitScreenState.active) {
        // Scenario A: Swipe up on ONE side (Close one, keep other)
        if (urlToMinimize) {
            const survivor = (urlToMinimize === splitScreenState.leftAppUrl) 
                ? splitScreenState.rightAppUrl 
                : splitScreenState.leftAppUrl;
            
            // This destroys the split state and maximizes the survivor
            exitSplitScreen(survivor);
            return;
        }

        // Scenario B: Home Button / Minimize All (Keep split active in background)
        // 1. Hide Divider
        const divider = document.getElementById('split-divider');
        if (divider) divider.style.display = 'none';

        // 2. Minimize Both Apps manually
        [splitScreenState.leftAppUrl, splitScreenState.rightAppUrl].forEach(url => {
            if(!url) return;
            const embed = getEmbedContainer(url);
            if (embed) {
                minimizedEmbeds[url] = embed; 
                
                // Visual Minimize Animation
                if (animate) {
                    embed.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                    embed.style.transform = 'translateY(40px) scale(0.8)';
                    embed.style.opacity = '0';
                }
                
                // Do NOT remove split classes yet, so they restore in position
                
                setTimeout(() => {
                    if (minimizedEmbeds[url] === embed) {
                        embed.style.display = 'none';
                        embed.style.contentVisibility = 'hidden'; // OPTIMIZATION
                        embed.style.pointerEvents = 'none';
                        embed.style.zIndex = '0';
                    }
                }, animate ? 300 : 0);
            }
        });

        // 3. RESTORE HOME UI
        const dynArea = document.getElementById('dynamic-area');
        if (dynArea) dynArea.style.opacity = '1';
        updateDockVisibility();
        applyWallpaperEffects();
        document.body.style.setProperty('--bg-transform-scale', '1.05');
        resetIndicatorTimeout();
        
        // Restore interaction blocker
        const interactionBlocker = document.getElementById('interaction-blocker');
        if (interactionBlocker) interactionBlocker.style.pointerEvents = 'auto';
		
        // Unhide all main UI elements
        document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
            el.classList.remove('force-hide');
            el.style.display = el.dataset.originalDisplay || '';
            el.style.removeProperty('content-visibility'); // OPTIMIZATION
            el.style.transition = 'opacity 0.3s ease';
            requestAnimationFrame(() => { el.style.opacity = '1'; });
        });

        restoreCorrectFavicon();
        return; 
    }
	
	// --- Standard Single App Minimize Logic ---
    isAppOpen = false;
    window.currentActiveAppUrl = null; // Clear global state
	SoundManager.play('close'); 
	
	const embedContainer = urlToMinimize 
	    ? getEmbedContainer(urlToMinimize)
	    : document.querySelector('.fullscreen-embed[style*="display: block"]');
	
    if (embedContainer) {
        const url = embedContainer.dataset.embedUrl;
        if (url) {
            minimizedEmbeds[url] = embedContainer;

            // FIX: Cancel existing timeout for this specific app
            if (minimizeTimeouts[url]) {
                clearTimeout(minimizeTimeouts[url]);
            }

	        if (animate) {
	            embedContainer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
	            embedContainer.style.transform = 'translateY(40px)';
	            embedContainer.style.opacity = '0';
	        }
			
            const cleanupDelay = animate ? 300 : 0;

            // FIX: Store timeout in dictionary keyed by URL. 
            // This prevents race conditions where minimizing App A then App B 
            // would orphan App A's timer, causing it to hide A later even if restored.
			minimizeTimeouts[url] = setTimeout(() => {
                applyWallpaperEffects();
	
                document.body.style.setProperty('--bg-transform-scale', '1.05');
                
                if (minimizedEmbeds[url] === embedContainer) {
                    const frame = embedContainer.querySelector('iframe');
                    if (frame && frame.contentWindow) {
                        frame.contentWindow.postMessage({ type: 'visibilityUpdate', visible: false }, '*');
                    }
                    embedContainer.style.display = 'none';
                    embedContainer.style.contentVisibility = 'hidden'; // OPTIMIZATION
				    embedContainer.style.pointerEvents = 'none';
                }

				const dynArea = document.getElementById('dynamic-area');
				if (dynArea) dynArea.style.opacity = '1';
                embedContainer.style.transform = 'perspective(100vh) rotateX(-40deg) translateY(40px) scale(0.8)';

				resetIndicatorTimeout();
				updateDockVisibility();
                HomeActivityManager.updateVisibility();
                
                delete minimizeTimeouts[url]; // Clean up map entry
            }, cleanupDelay);
        }
    }
    
    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
	    el.classList.remove('force-hide');
        el.style.display = el.dataset.originalDisplay;
        el.style.removeProperty('content-visibility'); // OPTIMIZATION
        el.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => { el.style.opacity = '1'; });
    });
    
    document.querySelectorAll('.fullscreen-embed:not([style*="display: block"])').forEach(embed => {
        embed.style.zIndex = '0';
    });
    
	const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.display = 'none';
        swipeOverlay.style.pointerEvents = 'none';
    }
    
    const interactionBlocker = document.getElementById('interaction-blocker');
    if (interactionBlocker) {
        interactionBlocker.style.pointerEvents = 'auto';
    }
	
    resumeAllAnimations();
}

/**
 * Creates a composite screenshot of the main body and an active iframe.
 * This works by asking the iframe (via gurasuraisu-api.js) to provide its own screenshot.
 * @returns {Promise<string>} A promise that resolves with the dataURL of the composite image.
 */
function createCompositeScreenshot() {
    return new Promise(async (resolve, reject) => {
        if (window.isLowEndDevice) { resolve(null); return; }

        const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        const iframe = activeEmbed ? activeEmbed.querySelector('iframe') : null;
        const isMobile = isMobileDevice();

        if (!iframe) {
            let dataUrl;
            if (isMobile) {
                const canvas = await html2canvas(document.body, { useCORS: true, logging: false });
                dataUrl = canvas.toDataURL('image/jpeg', 0.5);
            } else {
                dataUrl = await modernScreenshot.domToJpeg(document.body, { 
                    quality: 0.5,
                    filter: (node) => {
                        if (node.nodeType === 1 && (node.tagName === 'IMG' || node.tagName === 'VIDEO') && node.src && !node.src.startsWith('data:') && !node.src.startsWith('blob:')) {
                            try {
                                const url = new URL(node.src, window.location.href);
                                if (url.origin !== window.location.origin && !node.crossOrigin) return false;
                            } catch(e) {}
                        }
                        return true;
                    }
                });
            }
            resolve(dataUrl);
            return;
        }

        let parentDataUrl;
        if (isMobile) {
            const parentCanvas = await html2canvas(document.body, {
                useCORS: true,
                logging: false,
                ignoreElements: (el) => el.tagName === 'IFRAME'
            });
            parentDataUrl = parentCanvas.toDataURL();
        } else {
            parentDataUrl = await modernScreenshot.domToJpeg(document.body, {
                filter: (node) => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'IFRAME') return false;
                        if ((node.tagName === 'IMG' || node.tagName === 'VIDEO') && node.src && !node.src.startsWith('data:') && !node.src.startsWith('blob:')) {
                            try {
                                const url = new URL(node.src, window.location.href);
                                if (url.origin !== window.location.origin && !node.crossOrigin) return false;
                            } catch(e) {}
                        }
                    }
                    return true;
                },
                quality: 1.0 // Keep high quality for the base composition step
            });
        }

        const iframeListener = (event) => {
            if (event.source === iframe.contentWindow && event.data.type === 'screenshot-response') {
                window.removeEventListener('message', iframeListener);

                const childDataUrl = event.data.screenshotDataUrl;

                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = window.innerWidth;
                finalCanvas.height = window.innerHeight;
                const ctx = finalCanvas.getContext('2d');

                const parentImg = new Image();
                parentImg.onload = () => {
                    ctx.drawImage(parentImg, 0, 0);

                    const childImg = new Image();
                    childImg.onload = () => {
                        const rect = iframe.getBoundingClientRect();
                        ctx.drawImage(childImg, rect.left, rect.top, rect.width, rect.height);
                        resolve(finalCanvas.toDataURL('image/jpeg', 0.5));
                    };
                    childImg.src = childDataUrl;
                };
                parentImg.src = parentDataUrl;
            }
        };

        window.addEventListener('message', iframeListener);
        const targetOrigin = getOriginFromUrl(iframe.src);
        iframe.contentWindow.postMessage({ type: 'request-screenshot' }, targetOrigin);
        
        setTimeout(() => {
            window.removeEventListener('message', iframeListener);
            reject(new Error("Screenshot request to iframe timed out. The active app may not support this feature."));
        }, 3000);
    });
}

// --- Predictive App Preloading ---
function initPredictivePreload() {
    if (localStorage.getItem('predictivePreload') === 'false') return;

    // Wait 5 seconds after boot to ensure system stability before heavy operations
    setTimeout(() => {
        const hour = new Date().getHours();
        const hourlyUsage = JSON.parse(localStorage.getItem('appUsageHourly') || '{}');
        
        if (hourlyUsage[hour]) {
            // Sort apps used in this hour by frequency
            const sorted = Object.entries(hourlyUsage[hour]).sort((a, b) => b[1] - a[1]);
            
            // If the user has opened this app at least 3 times during this hour historically
            if (sorted.length > 0 && sorted[0][1] >= 3) {
                const predictedAppName = sorted[0][0];
                const appDef = apps[predictedAppName];
                
                if (appDef && appDef.url) {
                    console.log(`[System] Predictive AI Preloading: ${predictedAppName}`);
                    createBackgroundEmbed(appDef.url);
                }
            }
        }
    }, 50000);
}