const appDrawer = document.getElementById('app-drawer');
const appGrid = document.getElementById('app-grid');
let isQuickMenuOpen = false;
let isWidgetsOpen = false;
let qmClockTimer = null;

function updateQMClock() {
    if (!isQuickMenuOpen) {
        clearTimeout(qmClockTimer);
        qmClockTimer = null;
        return;
    }

    const qmClock = document.getElementById('qm-clock');
    if (qmClock && typeof moment === 'function') {
        const now = moment();
        const use12 = localStorage.getItem('use12HourFormat') === 'true';
        const format = use12 ? 'h:mm A' : 'HH:mm';
        qmClock.textContent = now.format(format);
    }

    const delay = 1000 - (Date.now() % 1000);
    qmClockTimer = setTimeout(updateQMClock, delay);
}

function isQuickMenuEnabled() {
    const navMode = localStorage.getItem('navigationMode');
    if (navMode) return navMode === 'quickmenu';
    return localStorage.getItem('quickMenuEnabled') === 'true';
}

function isQuickMenuPinned() {
    return isQuickMenuEnabled() && (localStorage.getItem('quickMenuPinned') === 'true');
}

function setQuickMenuPinned(pinned) {
    localStorage.setItem('quickMenuPinned', pinned ? 'true' : 'false');
    updateNavigationModeUI();
    if (typeof broadcastSettingUpdate === 'function') {
        broadcastSettingUpdate('quickMenuPinned', pinned ? 'true' : 'false');
    }
}

function setNavigationMode(mode) {
    const isQm = mode === 'quickmenu';
    localStorage.setItem('navigationMode', isQm ? 'quickmenu' : 'gestures');
    localStorage.setItem('quickMenuEnabled', isQm ? 'true' : 'false');
    updateNavigationModeUI();
    if (typeof broadcastSettingUpdate === 'function') {
        broadcastSettingUpdate('navigationMode', isQm ? 'quickmenu' : 'gestures');
        broadcastSettingUpdate('quickMenuEnabled', isQm ? 'true' : 'false');
    }
}

function toggleNavigationMode() {
    const currentlyQm = isQuickMenuEnabled();
    const newMode = currentlyQm ? 'gestures' : 'quickmenu';
    setNavigationMode(newMode);
    if (typeof showPopup === 'function') {
        showPopup(newMode === 'quickmenu' ? (currentLanguage.NAV_QUICKMENU_ACTIVE || 'Navigation: Quick Menu') : (currentLanguage.NAV_GESTURES_ACTIVE || 'Navigation: Gestures'));
    }
    return newMode;
}

function updateNavigationModeUI() {
    const isQm = isQuickMenuEnabled();
    const isPinned = isQm && (localStorage.getItem('quickMenuPinned') === 'true');

    document.body.classList.toggle('nav-quickmenu-active', isQm);
    document.body.classList.toggle('nav-gestures-active', !isQm);
    document.body.classList.toggle('qm-pinned', isPinned);

    if (isPinned) {
        openQuickMenu();
    } else if (!isQm && isQuickMenuOpen) {
        closeQuickMenu();
    }

    const navSelect = document.getElementById('navigation-mode-select');
    if (navSelect && navSelect.value !== (isQm ? 'quickmenu' : 'gestures')) {
        navSelect.value = isQm ? 'quickmenu' : 'gestures';
    }

    const qmSwitch = document.getElementById('quickmenu-switch');
    if (qmSwitch && qmSwitch.checked !== isQm) {
        qmSwitch.checked = isQm;
    }

    const pinnedSwitch = document.getElementById('quickmenu-pinned-switch');
    if (pinnedSwitch && pinnedSwitch.checked !== isPinned) {
        pinnedSwitch.checked = isPinned;
    }
}

window.isQuickMenuEnabled = isQuickMenuEnabled;
window.isQuickMenuPinned = isQuickMenuPinned;
window.setQuickMenuPinned = setQuickMenuPinned;
window.setNavigationMode = setNavigationMode;
window.toggleNavigationMode = toggleNavigationMode;
window.updateNavigationModeUI = updateNavigationModeUI;
try { updateNavigationModeUI(); } catch (e) {}

function openQuickMenu() {
    if (!isQuickMenuEnabled()) return;
    if (isQuickMenuOpen && !isQuickMenuPinned()) return;
    isQuickMenuOpen = true;
    const qm = document.getElementById('quick-menu');
    if (!qm) return;
    qm.style.display = 'flex';
    void qm.offsetWidth;

    const interactionBlocker = document.getElementById('interaction-blocker');
    if(interactionBlocker && !isQuickMenuPinned()) interactionBlocker.style.display = 'none';

    if (!isQuickMenuPinned()) {
        updateQMClock();
        resetQmInactivityTimer();
    }
    requestAnimationFrame(() => qm.classList.add('open'));
}

function closeQuickMenu() {
    if (isQuickMenuPinned()) return; // Pinned quick menu never closes
    if (!isQuickMenuOpen) return;
    isQuickMenuOpen = false;
    clearTimeout(qmInactivityTimer);
    qmInactivityTimer = null;
    const qm = document.getElementById('quick-menu');
    if (!qm) return;
    qm.classList.remove('open');
    setTimeout(() => { if(!isQuickMenuOpen && !isQuickMenuPinned()) qm.style.display = 'none'; }, 300);
}

let qmInactivityTimer = null;

function resetQmInactivityTimer() {
    clearTimeout(qmInactivityTimer);
    if (isQuickMenuOpen && !isQuickMenuPinned()) {
        qmInactivityTimer = setTimeout(closeQuickMenu, 5000);
    }
}

function populateDock() {
    // Clear only the app icons
    const appIcons = dock.querySelectorAll('.dock-icon');
    appIcons.forEach(icon => icon.remove());
    
    const sortedApps = Object.entries(apps)
        .filter(([appName]) => appName !== "Apps")  // Filter out Apps
        .map(([appName, appDetails]) => ({
            name: appName,
            details: appDetails,
            lastOpened: appLastOpened[appName] || 0
        }))
        .sort((a, b) => b.lastOpened - a.lastOpened)
        .slice(0, 6);  // Only take 6 more
    
    sortedApps.forEach(({ name, details }) => {
        const dockIcon = document.createElement('div');
        dockIcon.className = 'dock-icon';
        
        const img = document.createElement('img');
        img.alt = name;

	const iconSource = details.icon;
        if (iconSource && (iconSource.startsWith('http') || iconSource.startsWith('/') || iconSource.startsWith('data:'))) {
            // If it's a full URL, a root-relative path, or a data URI, use it directly.
            img.src = iconSource;
        } else if (iconSource) {
            // Otherwise, assume it's a local filename and prepend the default path.
            img.src = `/assets/appicon/${iconSource}`;
        } else {
            // Fallback to Fanny for missing icons
            img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJrSURBVHhe7dnrbcIwFEDh7MIwzMIoTMIgzMEsVFeNVGrdpM7DzlFzjuQ/VUmKPzshdHgbKkFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYB0C8ng83sMwVI3b7Ta+al3X6zU9bjaez+f4quPqChJvOJuImnG/38ej1BWQ2XFqxuv1Go/Sv24gS3bF1KjdLUt2xdQ4ard0AdmyM8rx107ZsjPKccRO6QJyuVzSNzy34ud21NREzcHPrfipHRU/711zkGxiA6i2bMVPQWYTu+TeU742Ru9LV3OQbJKWXgqyHVYWxyx/Z+kKz3ZY7X1rr5qDlJO55g1mu6xEzSZzzeouF1Dvy1ZzkM83F2Ppx9eoZrJr0GoqL5FLLq971Bxkj/Za/TUJUlE5STHWrP6ayvP8u0vW1jKMVqu2PE+MNZfYLaFBMowYcb/Yu+w8MXqHBZnCiJ/vXXaeGK3uU3MhQc6KEeFAzowRoUCmMFp80snOE6PF/WlJGBAxvkOAiPHT4SDZl4IxWmDEM0V2LgpGhARp9eCXgfR+8PsrJEirFZuB0BIEliCweH/RyRMEliCwECDxzNHjul7er1p8P7a1w0G8qf8O8ReVk9Tq29aA/jxP7/+X14QA+Zyo1k/On5fH2J20eHv25AkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQVO/3F/glxm3ea3j7AAAAAElFTkSuQmCC';
        }

        img.onerror = () => { img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJrSURBVHhe7dnrbcIwFEDh7MIwzMIoTMIgzMEsVFeNVGrdpM7DzlFzjuQ/VUmKPzshdHgbKkFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYB0C8ng83sMwVI3b7Ta+al3X6zU9bjaez+f4quPqChJvOJuImnG/38ej1BWQ2XFqxuv1Go/Sv24gS3bF1KjdLUt2xdQ4ard0AdmyM8rx107ZsjPKccRO6QJyuVzSNzy34ud21NREzcHPrfipHRU/711zkGxiA6i2bMVPQWYTu+TeU742Ru9LV3OQbJKWXgqyHVYWxyx/Z+kKz3ZY7X1rr5qDlJO55g1mu6xEzSZzzeouF1Dvy1ZzkM83F2Ppx9eoZrJr0GoqL5FLLq971Bxkj/Za/TUJUlE5STHWrP6ayvP8u0vW1jKMVqu2PE+MNZfYLaFBMowYcb/Yu+w8MXqHBZnCiJ/vXXaeGK3uU3MhQc6KEeFAzowRoUCmMFp80snOE6PF/WlJGBAxvkOAiPHT4SDZl4IxWmDEM0V2LgpGhARp9eCXgfR+8PsrJEirFZuB0BIEliCweH/RyRMEliCwECDxzNHjul7er1p8P7a1w0G8qf8O8ReVk9Tq29aA/jxP7/+X14QA+Zyo1k/On5fH2J20eHv25AkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQVO/3F/glxm3ea3j7AAAAAElFTkSuQmCC'; };
        
		const imgContainer = document.createElement('div');
        imgContainer.className = 'app-icon-img';
        imgContainer.appendChild(img);
        
        dockIcon.appendChild(imgContainer);
		
	dockIcon.addEventListener('click', async () => {
        const dock = document.getElementById('dock');
        if (dock) dock.classList.remove('show');
		const drawerPill = document.querySelector('.drawer-pill');
		drawerPill.style.opacity = '1'
	    // Open the new app
	    createFullscreenEmbed(details.url);
	    populateDock(); // Refresh the dock
	});
        
        dock.appendChild(dockIcon);
    });
}

function updateDockVisibility() {
    const dock = document.getElementById('dock');
    const drawerPill = document.querySelector('.drawer-pill');
    const pageIndicator = document.getElementById('page-indicator');
    
    if (!dock) return;

    const isPinned = localStorage.getItem('dockPinned') === 'true';
    
    // Robust check for any open app (foreground)
    const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
    
    // Check if drawer is open
    const isDrawerOpen = document.getElementById('app-drawer')?.classList.contains('open');

    // LOGIC: Show Dock ONLY if Pinned AND on Home Screen (No App, No Drawer)
    if (isPinned && !isAppOpen && !isDrawerOpen) {
        // Show Dock
        dock.style.display = 'flex';
        
        // Add class after display set to allow transition
        requestAnimationFrame(() => {
            dock.classList.add('show');
            dock.style.boxShadow = 'var(--sun-shadow), 0 -2px 10px rgba(0, 0, 0, 0.1)';
        });
        
        if (drawerPill) drawerPill.style.opacity = '0';

        // Move Page Indicator UP
        if (pageIndicator) {
            pageIndicator.classList.add('shifted-up');
        }
    } 
    // ELSE: Hide Dock (Default behavior, or if App/Drawer is open)
    else {
        // Only hide if we aren't actively interacting with it (optional safety check)
        if (!dock.classList.contains('interacting')) {
            dock.classList.remove('show');
            
            if (drawerPill && !isPinned) drawerPill.style.opacity = '1';
            
            setTimeout(() => {
                // Check again before setting display:none to prevent flickering if state changed fast
                if (!dock.classList.contains('show')) {
                    dock.style.display = 'none';
                }
            }, 300);
        }

        // Move Page Indicator DOWN
        if (pageIndicator) {
            pageIndicator.classList.remove('shifted-up');
        }
    }
}

let appIconColors = JSON.parse(localStorage.getItem('appIconColors')) || {};
const sortMethods = [
    { id: 'alpha', icon: 'sort_by_alpha', label: 'Alphabetical' },
    { id: 'last_used', icon: 'history', label: 'Last Used' },
    { id: 'most_used', icon: 'trending_up', label: 'Most Used' },
    { id: 'color', icon: 'palette', label: 'Color' }
];
let currentSortIndex = 0;

function loadSortPreference() {
    const savedSort = localStorage.getItem('appSortMethod') || 'alpha';
    const savedIndex = sortMethods.findIndex(m => m.id === savedSort);
    currentSortIndex = savedIndex !== -1 ? savedIndex : 0;
}

function updateSortButtonUI() {
    const sortBtn = document.getElementById('sort-app-btn');
    if (sortBtn) {
        const currentMethod = sortMethods[currentSortIndex];
        // Only update the icon, not the text label, to prevent UI shifting.
        sortBtn.querySelector('.material-symbols-rounded').textContent = currentMethod.icon;
    }
}

// Function to handle Gurapps visibility
function updateGurappsVisibility() {
    const drawerHandle = document.querySelector(".drawer-handle");
    const splitTrigger = document.getElementById("split-screen-trigger");
    const dock = document.getElementById("dock");
    
    if (gurappsEnabled) {
        // Show Gurapps elements
        if (drawerHandle) drawerHandle.style.display = "flex";
        if (splitTrigger) splitTrigger.classList.remove("force-hide");
        if (dock) dock.classList.remove("force-hide");
        
        // Reset app functionality
        document.body.classList.remove("gurapps-disabled");
    } else {
        // Hide Gurapps elements
        if (drawerHandle) drawerHandle.style.display = "none";
        if (splitTrigger) splitTrigger.classList.add("force-hide");
        if (dock) dock.classList.add("force-hide");
        
        // Add class to body for CSS targeting
        document.body.classList.add("gurapps-disabled");
        
		// Close app drawer if open
        if (appDrawer.classList.contains("open")) {
            appDrawer.classList.remove("open");
            setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
        }
    }
}

const __gurappsSwitch = document.getElementById("gurapps-switch");
if (__gurappsSwitch) {
    if (typeof gurappsEnabled === 'undefined') {
        window.gurappsEnabled = localStorage.getItem("gurappsEnabled") !== "false";
    }
    __gurappsSwitch.checked = window.gurappsEnabled;
    __gurappsSwitch.addEventListener("change", handleGurappsToggle);
}

function handleGurappsToggle() {
    window.gurappsEnabled = this.checked;
    const value = window.gurappsEnabled.toString();
    localStorage.setItem("gurappsEnabled", value);
    broadcastSettingUpdate('gurappsEnabled', value);
    updateGurappsVisibility();
}

function updateOneButtonNavVisibility() {
    document.body.classList.toggle('one-button-nav-active', oneButtonNavEnabled);
}

// --- Color Analysis Utilities ---
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function getDominantColor(imgSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            try {
                const data = ctx.getImageData(0, 0, img.width, img.height).data;
                const colorCounts = {};
                let maxCount = 0;
                let dominantColor = {r: 255, g: 255, b: 255}; // Default white
                for (let i = 0; i < data.length; i += 40) {
                    // Skip transparent or near-white/black pixels to get actual color
                    if (data[i+3] < 128 || (data[i] > 250 && data[i+1] > 250 && data[i+2] > 250) || (data[i] < 5 && data[i+1] < 5 && data[i+2] < 5)) continue;
                    
                    const rgb = `${data[i]},${data[i+1]},${data[i+2]}`;
                    colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
                    if (colorCounts[rgb] > maxCount) {
                        maxCount = colorCounts[rgb];
                        dominantColor = { r: data[i], g: data[i+1], b: data[i+2] };
                    }
                }
                resolve(dominantColor);
            } catch (e) {
                reject(e); // Likely a CORS error
            }
        };
        img.onerror = () => resolve({ r: 255, g: 255, b: 255 }); // Resolve with white on error
        img.src = imgSrc;
    });
}

async function cacheAppIconColors() {
    let needsUpdate = false;
    for (const appName in apps) {
        if (!appIconColors[appName] && apps[appName].icon) {
            try {
                let iconSrc = apps[appName].icon;
                if (!(iconSrc.startsWith('http') || iconSrc.startsWith('/') || iconSrc.startsWith('data:'))) {
                    iconSrc = `/assets/appicon/${iconSrc}`;
                }
                const color = await getDominantColor(iconSrc);
                const hsl = rgbToHsl(color.r, color.g, color.b);
                appIconColors[appName] = hsl[0]; // Store hue
                needsUpdate = true;
            } catch (e) {
                appIconColors[appName] = 0; // Default on error
            }
        }
    }
    if (needsUpdate) {
        localStorage.setItem('appIconColors', JSON.stringify(appIconColors));
    }
}

// Function to sort and render app icons
function createAppIcons(filterQuery = '', forceShowNames = false) {
    appGrid.innerHTML = '';
    
    let appsArray = Object.entries(apps)
        .filter(([appName]) => appName !== "Apps")
        .map(([appName, appDetails]) => ({ name: appName, details: appDetails }));

    // Apply search filter if provided
    if (filterQuery) {
        appsArray = appsArray.filter(app => app.name.toLowerCase().includes(filterQuery.toLowerCase()));
    }

    // Apply sorting
    const sortMethod = sortMethods[currentSortIndex].id;
    switch (sortMethod) {
        case 'last_used':
            appsArray.sort((a, b) => (appLastOpened[b.name] || 0) - (appLastOpened[a.name] || 0));
            break;
        case 'most_used':
            appsArray.sort((a, b) => (appUsage[b.name] || 0) - (appUsage[a.name] || 0));
            break;
        case 'color':
            appsArray.sort((a, b) => (appIconColors[a.name] || 0) - (appIconColors[b.name] || 0));
            break;
        case 'alpha':
        default:
            appsArray.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }

    const fragment = document.createDocumentFragment();

    appsArray.forEach((app) => {
        const appIcon = document.createElement('div');
        appIcon.classList.add('app-icon');
        appIcon.dataset.app = app.name;

        const img = document.createElement('img');
        img.alt = app.name;
        
        // 1. Get the icon source from the app's details.
        const iconSource = app.details.icon;

        // 2. Check the source type and set img.src only ONCE.
        if (iconSource && (iconSource.startsWith('http') || iconSource.startsWith('/') || iconSource.startsWith('data:'))) {
            // If it's an absolute URL or a root-relative path, use it directly.
            img.src = iconSource;
        } else if (iconSource) {
            // Otherwise, assume it's a local filename and prepend the default path.
            img.src = `/assets/appicon/${iconSource}`;
        } else {
            // Fallback to Fanny for cases where the icon is missing entirely.
            img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJrSURBVHhe7dnrbcIwFEDh7MIwzMIoTMIgzMEsVFeNVGrdpM7DzlFzjuQ/VUmKPzshdHgbKkFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYB0C8ng83sMwVI3b7Ta+al3X6zU9bjaez+f4quPqChJvOJuImnG/38ej1BWQ2XFqxuv1Go/Sv24gS3bF1KjdLUt2xdQ4ard0AdmyM8rx107ZsjPKccRO6QJyuVzSNzy34ud21NREzcHPrfipHRU/711zkGxiA6i2bMVPQWYTu+TeU742Ru9LV3OQbJKWXgqyHVYWxyx/Z+kKz3ZY7X1rr5qDlJO55g1mu6xEzSZzzeouF1Dvy1ZzkM83F2Ppx9eoZrJr0GoqL5FLLq971Bxkj/Za/TUJUlE5STHWrP6ayvP8u0vW1jKMVqu2PE+MNZfYLaFBMowYcb/Yu+w8MXqHBZnCiJ/vXXaeGK3uU3MhQc6KEeFAzowRoUCmMFp80snOE6PF/WlJGBAxvkOAiPHT4SDZl4IxWmDEM0V2LgpGhARp9eCXgfR+8PsrJEirFZuB0BIEliCweH/RyRMEliCwECDxzNHjul7er1p8P7a1w0G8qf8O8ReVk9Tq29aA/jxP7/+X14QA+Zyo1k/On5fH2J20eHv25AkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQVO/3F/glxm3ea3j7AAAAAElFTkSuQmCC';
        }

        // 3. Set the error handler AFTER defining the initial source.
        img.onerror = () => {
            img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJrSURBVHhe7dnrbcIwFEDh7MIwzMIoTMIgzMEsVFeNVGrdpM7DzlFzjuQ/VUmKPzshdHgbKkFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYB0C8ng83sMwVI3b7Ta+al3X6zU9bjaez+f4quPqChJvOJuImnG/38ej1BWQ2XFqxuv1Go/Sv24gS3bF1KjdLUt2xdQ4ard0AdmyM8rx107ZsjPKccRO6QJyuVzSNzy34ud21NREzcHPrfipHRU/711zkGxiA6i2bMVPQWYTu+TeU742Ru9LV3OQbJKWXgqyHVYWxyx/Z+kKz3ZY7X1rr5qDlJO55g1mu6xEzSZzzeouF1Dvy1ZzkM83F2Ppx9eoZrJr0GoqL5FLLq971Bxkj/Za/TUJUlE5STHWrP6ayvP8u0vW1jKMVqu2PE+MNZfYLaFBMowYcb/Yu+w8MXqHBZnCiJ/vXXaeGK3uU3MhQc6KEeFAzowRoUCmMFp80snOE6PF/WlJGBAxvkOAiPHT4SDZl4IxWmDEM0V2LgpGhARp9eCXgfR+8PsrJEirFZuB0BIEliCweH/RyRMEliCwECDxzNHjul7er1p8P7a1w0G8qf8O8ReVk9Tq29aA/jxP7/+X14QA+Zyo1k/On5fH2J20eHv25AkCSxBYgsASBJYgsASBJQgsQWAJAksQWILAEgSWILAEgSUILEFgCQJLEFiCwBIEliCwBIElCCxBYAkCSxBYgsASBJYgsASBJQgsQWAJAksQVO/3F/glxm3ea3j7AAAAAElFTkSuQmCC';
        };
        
		const imgContainer = document.createElement('div');
        imgContainer.className = 'app-icon-img';
        imgContainer.appendChild(img);
        appIcon.appendChild(imgContainer);

        const showNames = forceShowNames || localStorage.getItem('showAppNamesAppDrawer') === 'true';

        if (showNames) {
            const label = document.createElement('span');
            label.textContent = app.name;
            appIcon.appendChild(label);
        }
        
		const handleAppOpen = (e) => {
		    e.preventDefault();
		    e.stopPropagation();
		
		    // If we're in selection mode, this click finalizes the split
		    if (splitScreenState.isSelecting) {
		        finalizeSplitScreen(app.details.url);
		    } else {
		        // Normal app open logic
		        closeSearch();
		        const dock = document.getElementById('dock');
		        if (dock) dock.classList.remove('show');
		        const drawerPill = document.querySelector('.drawer-pill');
		        if(drawerPill) drawerPill.style.opacity = '1';
		        
		        try {
		            if (app.name === 'Assistant') {
		                appDrawer.classList.remove('open');
		                setTimeout(() => {
		                    if (!appDrawer.classList.contains('open')) {
		                        appDrawer.style.display = 'none';
		                        appDrawer.style.bottom = '';
		                        appDrawer.style.opacity = '';
		                        appDrawer.style.zIndex = '';
		                    }
		                }, 300);
		                if (window.Assistant && typeof window.Assistant.trigger === 'function') {
		                    window.Assistant.trigger();
		                }
		                return;
		            }
		            createFullscreenEmbed(app.details.url);
		            appDrawer.classList.remove('open');
                    setTimeout(() => {
                        if (!appDrawer.classList.contains('open')) {
                            appDrawer.style.display = 'none';
                            appDrawer.style.bottom = '';
                            appDrawer.style.opacity = '';
                            appDrawer.style.zIndex = '';
                        }
                    }, 300);
		        } catch (error) {
		            showDialog({ 
		                type: 'alert', 
		                title: currentLanguage.APP_OPEN_FAIL.replace("{app}", app.name)
		            });
		            console.error(`App open error: ${error}`);
		        }
		    }
		};
        
        appIcon.addEventListener('click', handleAppOpen);
        fragment.appendChild(appIcon);
    });
        
    const wrapper = document.createElement('div');
    wrapper.className = 'get-app-btn-container';

    // Hide button if searching
    if (forceShowNames) {
        wrapper.style.display = 'none';
    }

    const button = document.createElement('button');
    button.className = 'get-app-btn';
    // Set initial button text based on preference
    const showNames = localStorage.getItem('showAppNamesAppDrawer') === 'true';
    button.innerHTML = showNames ? '<span class="material-symbols-rounded">collapse_content</span>' : '<span class="material-symbols-rounded">expand_content</span>';

    // Hide button entirely if forced
    if (forceShowNames) {
        button.style.display = 'none';
    }

    button.onclick = () => {
        const currentlyShowing = localStorage.getItem('showAppNamesAppDrawer') === 'true';
        const newState = !currentlyShowing;

        // Save preference
        localStorage.setItem('showAppNamesAppDrawer', newState);

        // Update all labels
        document.querySelectorAll('.app-icon').forEach(icon => {
            const appName = icon.dataset.app;

            // Remove existing label if present
            const existingLabel = icon.querySelector('span');
            if (existingLabel) {
                existingLabel.remove();
            }

            // Add label only if enabled
            if (newState) {
                const newLabel = document.createElement('span');
                newLabel.textContent = appName;
                icon.appendChild(newLabel);
            }
        }); 

        // Update button text
        button.innerHTML = newState ? '<span class="material-symbols-rounded">collapse_content</span>' : '<span class="material-symbols-rounded">expand_content</span>';
    };

    wrapper.appendChild(button);
    fragment.appendChild(wrapper);

    appGrid.appendChild(fragment);
}

function openSearch() {
    const searchContainer = document.querySelector('.app-search-container');
    if (searchContainer.style.display === 'flex') return;
    const searchInput = document.getElementById('app-search-input');
    searchInput.focus();
}

function closeSearch() {
    const searchContainer = document.querySelector('.app-search-container');
    if (searchContainer.style.display === 'none') return;
    const searchInput = document.getElementById('app-search-input');
    searchInput.value = '';
    createAppIcons(); // Reset to full, sorted list
}

// ridespeedy engine
function setupDrawerInteractions() {
    if (window._drawerInteractionsInitialized) return;
    window._drawerInteractionsInitialized = true;

    let startY = 0, startX = 0;
    let currentY = 0, currentX = 0;
    let touchStartX = 0, touchStartY = 0;
    let touchEndX = 0, touchEndY = 0;
    let isDragging = false;
    let isDrawerInMotion = false;
    let isPendingDrag = false;
    let dragStartTime = 0;
    let lastY = 0;
    let velocities = [];
    let longPressTimer = null;
    const longPressDuration = 500;
    let dragSource = null; // 'handle', 'body', 'content'
    const flickVelocityThreshold = 0.4;
    const SWIPE_THRESHOLD = 40;

    const drawerPill = document.querySelector('.drawer-pill');
    const drawerHandle = document.querySelector('.drawer-handle');
    const appDrawerHandle = document.querySelector('.app-drawer-handle');
    const oneButtonNavHandle = document.getElementById('one-button-nav-handle');
    const interactionBlocker = document.getElementById('interaction-blocker');

    // 1. Long Press on Drawer Pill -> Open App Switcher UI (from 3cba470)
    const startLongPress = (e) => {
        if (typeof oneButtonNavEnabled !== 'undefined' && oneButtonNavEnabled) return; 
        if (document.body.classList.contains('immersive-active')) return;
        if (isQuickMenuEnabled()) return; // Only in Gestures mode

        if (!isDragging) {
            longPressTimer = setTimeout(() => {
                if (typeof openAppSwitcherUI === 'function') {
                    openAppSwitcherUI();
                }
            }, longPressDuration);
        }
    };

    const cancelLongPress = () => {
        clearTimeout(longPressTimer);
    };

    if (drawerPill) {
        drawerPill.addEventListener('mousedown', startLongPress);
        drawerPill.addEventListener('touchstart', startLongPress, { passive: true });
        drawerPill.addEventListener('mouseup', cancelLongPress);
        drawerPill.addEventListener('mouseleave', cancelLongPress);
        drawerPill.addEventListener('touchend', cancelLongPress);
    }

    // 2. Navigation Mode Sync Listeners (from Settings)
    const navModeSelect = document.getElementById('navigation-mode-select');
    if (navModeSelect) {
        navModeSelect.addEventListener('change', (e) => {
            setNavigationMode(e.target.value);
        });
    }

    const qmSwitch = document.getElementById('quickmenu-switch');
    if (qmSwitch) {
        qmSwitch.addEventListener('change', (e) => {
            setNavigationMode(e.target.checked ? 'quickmenu' : 'gestures');
        });
    }

    updateNavigationModeUI();

    // 3. Setup Swipe Overlay (from 3cba470 / dock-drawer.js)
    let swipeOverlay = document.getElementById('swipe-overlay');
    if (!swipeOverlay) {
        swipeOverlay = document.createElement('div');
        swipeOverlay.id = 'swipe-overlay';
        Object.assign(swipeOverlay.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '1000',
            display: 'none',
            pointerEvents: 'none'
        });
        document.body.appendChild(swipeOverlay);
    }

    // 4. Mouse-only UI for Quick Menu: Create Quick Menu Button
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let qmTriggerBtn = null;
    if (!isTouchDevice && drawerHandle) {
        qmTriggerBtn = document.createElement('button');
        qmTriggerBtn.className = 'qm-trigger-btn';
        drawerHandle.appendChild(qmTriggerBtn);
        qmTriggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isQuickMenuEnabled()) openQuickMenu();
        });
    }

    // 5. Pre-calculations & Drag Lifecycles (from 3cba470)
    let cachedOpenEmbed = null;
    let cachedWindowHeight = window.innerHeight;
    window.addEventListener('resize', () => cachedWindowHeight = window.innerHeight, { passive: true });

    function prepareDrag(xPosition, yPosition) {
        startX = xPosition;
        startY = yPosition;
        lastY = yPosition;
        currentX = xPosition;
        currentY = yPosition;
        dragStartTime = Date.now();
        isPendingDrag = true;
    }

    function startDrag(xPosition, yPosition) {
        if (xPosition !== undefined) startX = xPosition;
        if (yPosition !== undefined) startY = yPosition;
        lastY = startY;
        currentX = startX;
        currentY = startY;
        isDragging = true;
        isPendingDrag = false;
        isDrawerInMotion = true;
        velocities = [];

        cachedOpenEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        document.querySelectorAll('.fullscreen-embed iframe').forEach(frame => {
            frame.style.pointerEvents = 'none';
        });
    }

    function moveDrawer(xPosition, yPosition) {
        if (!isDragging) return;

        touchEndX = xPosition;
        touchEndY = yPosition;
        currentX = xPosition;
        const deltaX = currentX - startX;
        const deltaY = startY - yPosition; // positive for upward drag
        const verticalDelta = deltaY;

        const now = Date.now();
        const deltaTime = now - dragStartTime;
        if (deltaTime > 0) {
            const velocity = (lastY - yPosition) / deltaTime;
            velocities.push(velocity);
            if (velocities.length > 5) velocities.shift();
        }

        lastY = yPosition;
        currentY = yPosition;

        const openEmbed = cachedOpenEmbed;

        if (window._drawerMoveRaf) return;
        window._drawerMoveRaf = requestAnimationFrame(() => {
            window._drawerMoveRaf = null;

            if (openEmbed) {
                if (document.body.classList.contains('immersive-active')) return;

                openEmbed.style.willChange = 'transform, opacity, border-radius';

                if (deltaY > 20) {
                    cancelLongPress();
                    const dynArea = document.getElementById('dynamic-area');
                    if (dynArea) dynArea.style.opacity = '0';

                    const progress = Math.min(1, deltaY / (cachedWindowHeight * 0.25));
                    const translateY = -deltaY;
                    const scale = 1 - (progress * 0.2);
                    const borderRadius = progress * 50;

                    openEmbed.style.border = '1px solid var(--glass-border)';
                    openEmbed.style.transform = `perspective(100vh) rotateX(${(progress * 20)}deg) translateY(${translateY}px) scale(${scale})`;
                    openEmbed.style.opacity = 1 - (progress * 0.85);
                    openEmbed.style.filter = `blur(${(progress * 10)}px)`;
                    if (openEmbed.style.hasOwnProperty('cornerShape')) openEmbed.style.cornerShape = 'superellipse(1.5)';
                    openEmbed.style.borderRadius = `${borderRadius}px`;
                } else {
                    cancelLongPress();
                    openEmbed.style.transform = 'perspective(100vh) rotateX(0deg) translateY(0px) scale(1)';
                    openEmbed.style.opacity = '1';
                    openEmbed.style.filter = 'none';
                    openEmbed.style.borderRadius = `${window.systemScreenCurve || 0}px`;
                    openEmbed.style.border = 'none';
                    if (openEmbed.style.hasOwnProperty('cornerShape')) openEmbed.style.cornerShape = 'superellipse(1.5)';

                    const dynArea = document.getElementById('dynamic-area');
                    if (dynArea) dynArea.style.opacity = '1';
                }
            }
        });
    }

    function endDrag() {
        if (!isDragging) return;

        if (window._drawerMoveRaf) {
            cancelAnimationFrame(window._drawerMoveRaf);
            window._drawerMoveRaf = null;
        }

        const deltaY = startY - currentY;
        let avgVelocity = 0;
        if (velocities.length > 0) {
            avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
        }
        const movementPercentage = (deltaY / cachedWindowHeight) * 100;
        const isFlickUp = avgVelocity > flickVelocityThreshold;
        const isFlickDown = avgVelocity < -flickVelocityThreshold;

        const openEmbed = cachedOpenEmbed;

        if (openEmbed) {
            // Immersive mode check
            if (document.body.classList.contains('immersive-active')) {
                if (movementPercentage > 5 || isFlickUp) {
                    if (typeof setImmersiveMode === 'function') setImmersiveMode(false);
                }
                isDragging = false;
                document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');
                return;
            }

            // Downward drag: enter immersive mode
            if (movementPercentage < -12) {
                if (typeof setImmersiveMode === 'function') setImmersiveMode(true);
                isDragging = false;
                document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');
                return;
            }

            // Upward swipe: minimize app back to Home screen (Astatine 27.1 / 3cba470)
            if (movementPercentage > 15 || isFlickUp) {
                openEmbed.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease, border-radius 0.3s ease';
                openEmbed.style.transform = 'perspective(100vh) rotateX(40deg) translateY(-40px) scale(0.8)';
                openEmbed.style.opacity = '0';
                openEmbed.style.filter = 'blur(10px)';
                openEmbed.style.borderRadius = '50px';
                if (openEmbed.style.hasOwnProperty('cornerShape')) openEmbed.style.cornerShape = 'superellipse(1.5)';
                openEmbed.style.border = '1px solid var(--glass-border)';

                if (typeof applyWallpaperEffects === 'function') applyWallpaperEffects();
                document.body.style.setProperty('--bg-transform-scale', '1.05');

                setTimeout(() => {
                    minimizeFullscreenEmbed(false);
                    if (swipeOverlay) {
                        swipeOverlay.style.display = 'none';
                        swipeOverlay.style.pointerEvents = 'none';
                    }
                    openEmbed.style.border = 'none';
                    openEmbed.style.transition = '';
                    openEmbed.style.transform = '';
                    openEmbed.style.opacity = '';
                    openEmbed.style.filter = '';
                    openEmbed.style.borderRadius = '';
                }, 300);
            } else {
                // Snap back to fullscreen
                openEmbed.style.transition = 'transform 0.25s ease, opacity 0.25s ease, filter 0.25s ease';
                openEmbed.style.transform = 'perspective(100vh) rotateX(0deg) translateY(0px) scale(1)';
                openEmbed.style.opacity = '1';
                openEmbed.style.filter = 'none';
                openEmbed.style.borderRadius = `${window.systemScreenCurve || 0}px`;
                if (openEmbed.style.hasOwnProperty('cornerShape')) openEmbed.style.cornerShape = 'superellipse(1.5)';
                openEmbed.style.border = 'none';

                setTimeout(() => {
                    if (openEmbed) openEmbed.style.transition = '';
                }, 250);

                const dynArea = document.getElementById('dynamic-area');
                if (dynArea) dynArea.style.opacity = '1';
            }
        } else {
            // No app open: on Beginnings or Home screen
            if (movementPercentage > 10 || isFlickUp) {
                if (document.body.classList.contains('beginnings-active')) {
                    if (typeof window.exitBeginningsState === 'function') window.exitBeginningsState();
                } else {
                    if (typeof window.scrollHomePage === 'function') window.scrollHomePage('next');
                }
            } else if (movementPercentage < -10 || isFlickDown) {
                if (typeof window.scrollHomePage === 'function') window.scrollHomePage('prev');
            }
        }

        document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');
        isDragging = false;
        setTimeout(() => { isDrawerInMotion = false; }, 300);
    }

    // 6. Split Screen Inward Diagonal Corner Gestures (from 3cba470)
    const checkSplitGestureStart = (x, y) => {
        if (typeof oneButtonNavEnabled !== 'undefined' && oneButtonNavEnabled) return false;
        if (isQuickMenuEnabled()) return false;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isOpenSingleApp = document.querySelector('.fullscreen-embed[style*="display: block"]') &&
            (typeof splitScreenState !== 'undefined' && !splitScreenState.active && !splitScreenState.isSelecting);

        if (isOpenSingleApp && y > height * 0.85) {
            if (x < width * 0.2) {
                window.potentialSplitSide = 'left';
                window.splitGestureStart = { x, y };
                return true;
            } else if (x > width * 0.8) {
                window.potentialSplitSide = 'right';
                window.splitGestureStart = { x, y };
                return true;
            }
        }
        return false;
    };

    const handleSplitGestureMove = (x, y) => {
        if (window.potentialSplitSide && !isDragging) {
            const start = window.splitGestureStart;
            const deltaX = x - start.x;
            const deltaY = y - start.y;

            if (deltaY < -40 && Math.abs(deltaX) > 40) {
                const side = window.potentialSplitSide;
                if (side === 'left' && deltaX > 0) {
                    if (typeof initiateSplitScreen === 'function') initiateSplitScreen('left');
                    window.potentialSplitSide = null;
                    return true;
                }
                if (side === 'right' && deltaX < 0) {
                    if (typeof initiateSplitScreen === 'function') initiateSplitScreen('right');
                    window.potentialSplitSide = null;
                    return true;
                }
            }
        }
        return false;
    };

    const resetSplitGesture = () => { window.potentialSplitSide = null; };
    document.addEventListener('mouseup', resetSplitGesture);
    document.addEventListener('touchend', resetSplitGesture);

    // 7. Split Divider Drag Logic (from 3cba470)
    const divider = document.getElementById('split-divider');
    let isDividerDragging = false;
    if (divider) {
        const startDividerDrag = (e) => {
            isDividerDragging = true;
            divider.classList.add('active');
            e.preventDefault();
            document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
        };

        const stopDividerDrag = () => {
            if (!isDividerDragging) return;
            isDividerDragging = false;
            divider.classList.remove('active');
            document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');
        };

        divider.addEventListener('touchstart', startDividerDrag, { passive: false });
        divider.addEventListener('mousedown', startDividerDrag);

        const handleDividerMove = (clientX) => {
            if (!isDividerDragging || typeof splitScreenState === 'undefined' || !splitScreenState.active) return;
            const width = window.innerWidth;
            const percentage = (clientX / width) * 100;

            if (percentage < 15) {
                stopDividerDrag();
                if (typeof exitSplitScreen === 'function') exitSplitScreen(splitScreenState.rightAppUrl);
            } else if (percentage > 85) {
                stopDividerDrag();
                if (typeof exitSplitScreen === 'function') exitSplitScreen(splitScreenState.leftAppUrl);
            } else {
                if (typeof updateSplitLayout === 'function') updateSplitLayout(percentage);
            }
        };

        window.addEventListener('touchmove', (e) => {
            if (isDividerDragging && e.touches.length) handleDividerMove(e.touches[0].clientX);
        });
        window.addEventListener('mousemove', (e) => {
            if (isDividerDragging) handleDividerMove(e.clientX);
        });
        window.addEventListener('touchend', stopDividerDrag);
        window.addEventListener('mouseup', stopDividerDrag);
    }

    // 8. 3-Finger Drag Message Handling (from 3cba470)
    window.addEventListener('message', (e) => {
        if (!e.data || typeof e.data !== 'object') return;
        if (e.data.type === 'three-finger-drag-start') {
            if (document.body.classList.contains('immersive-active')) return;
            if (isQuickMenuEnabled()) return;
            dragSource = 'handle';
            const screenY = e.data.y;
            const screenX = window.innerWidth / 2;
            prepareDrag(screenX, screenY);
            startDrag(screenX, screenY);
        } else if (e.data.type === 'three-finger-drag-move') {
            if (isDragging) {
                moveDrawer(window.innerWidth / 2, e.data.y);
            }
        } else if (e.data.type === 'three-finger-drag-end') {
            if (isDragging) {
                endDrag();
            }
        }
    });

    // 9. Handle Gesture Listeners (.drawer-handle)
    if (drawerHandle) {
        let qmDragging = false;
        let qmStartY = 0;

        drawerHandle.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];

            if (checkSplitGestureStart(touch.clientX, touch.clientY)) return;

            if (isQuickMenuEnabled()) {
                qmDragging = true;
                qmStartY = touch.clientY;
            } else {
                dragSource = 'handle';
                prepareDrag(touch.clientX, touch.clientY);
            }
        }, { passive: true });

        drawerHandle.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];

            if (handleSplitGestureMove(touch.clientX, touch.clientY)) return;

            if (isQuickMenuEnabled()) {
                if (!qmDragging) return;
                const deltaY = qmStartY - touch.clientY;
                if (deltaY >= SWIPE_THRESHOLD) {
                    qmDragging = false;
                    openQuickMenu();
                }
            } else {
                if (isPendingDrag && !isDragging) {
                    const dist = Math.hypot(touch.clientX - startX, touch.clientY - startY);
                    if (dist > 8) {
                        cancelLongPress();
                        startDrag(startX, startY);
                    }
                }
                if (isDragging) {
                    cancelLongPress();
                    moveDrawer(touch.clientX, touch.clientY);
                }
            }
        }, { passive: true });

        drawerHandle.addEventListener('touchend', (e) => {
            if (isQuickMenuEnabled()) {
                if (qmDragging) {
                    qmDragging = false;
                    // Forward click if released without opening Quick Menu
                    if (e.changedTouches.length && typeof window.forwardClick === 'function') {
                        window.forwardClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                }
            } else {
                cancelLongPress();
                if (isDragging) {
                    endDrag();
                } else if (isPendingDrag) {
                    isPendingDrag = false;
                    // Fast tap on handle forwards click directly to underlying element
                    if (e.changedTouches.length && typeof window.forwardClick === 'function') {
                        window.forwardClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                }
            }
        });

        // Mouse listeners on handle for desktop testing/pointer users
        let mouseDragging = false;
        let mouseStartY = 0;

        const onHandleMouseMove = (e) => {
            if (isQuickMenuEnabled()) {
                if (!mouseDragging || qmTriggerBtn) return;
                const deltaY = mouseStartY - e.clientY;
                if (deltaY >= SWIPE_THRESHOLD) {
                    mouseDragging = false;
                    openQuickMenu();
                    cleanupHandleMouse();
                }
            } else {
                if (isPendingDrag && !isDragging) {
                    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
                    if (dist > 8) {
                        cancelLongPress();
                        startDrag(startX, startY);
                    }
                }
                if (isDragging) {
                    cancelLongPress();
                    moveDrawer(e.clientX, e.clientY);
                }
            }
        };

        const onHandleMouseUp = (e) => {
            if (isQuickMenuEnabled()) {
                if (mouseDragging) {
                    mouseDragging = false;
                    if (typeof window.forwardClick === 'function') {
                        window.forwardClick(e.clientX, e.clientY);
                    }
                }
            } else {
                cancelLongPress();
                if (isDragging) {
                    endDrag();
                } else if (isPendingDrag) {
                    isPendingDrag = false;
                    if (typeof window.forwardClick === 'function') {
                        window.forwardClick(e.clientX, e.clientY);
                    }
                }
            }
            cleanupHandleMouse();
        };

        const cleanupHandleMouse = () => {
            document.removeEventListener('mousemove', onHandleMouseMove);
            document.removeEventListener('mouseup', onHandleMouseUp);
        };

        drawerHandle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (isQuickMenuEnabled()) {
                if (qmTriggerBtn) return;
                mouseDragging = true;
                mouseStartY = e.clientY;
            } else {
                dragSource = 'handle';
                prepareDrag(e.clientX, e.clientY);
            }
            document.addEventListener('mousemove', onHandleMouseMove);
            document.addEventListener('mouseup', onHandleMouseUp);
        });
    }

    // 10. In-App Swipe Overlay Gesture Detection (from 3cba470)
    let inAppOverlayDragging = false;
    let inAppStartY = 0;

    swipeOverlay.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        inAppStartY = e.touches[0].clientY;
        inAppOverlayDragging = false;
        if (!isQuickMenuEnabled()) {
            prepareDrag(e.touches[0].clientX, e.touches[0].clientY);
            startLongPress(e);
        }
    }, { passive: true });

    swipeOverlay.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        const deltaY = inAppStartY - e.touches[0].clientY;

        if (isQuickMenuEnabled()) {
            if (deltaY > 50) {
                openQuickMenu();
            }
        } else {
            if (deltaY > 20 && !isDragging) {
                cancelLongPress();
                startDrag(startX, startY);
            }
            if (isDragging) {
                moveDrawer(e.touches[0].clientX, e.touches[0].clientY);
            }
        }
    }, { passive: true });

    swipeOverlay.addEventListener('touchend', (e) => {
        cancelLongPress();
        if (isDragging) {
            endDrag();
        }
    });

    // 11. Swipe Overlay Visibility Observer
    const updateOverlayVisibility = () => {
        const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (isAppOpen && !isQuickMenuEnabled()) {
            swipeOverlay.style.display = 'block';
            swipeOverlay.style.pointerEvents = 'auto';
        } else {
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
        }
    };

    const overlayObserver = new MutationObserver(updateOverlayVisibility);
    overlayObserver.observe(document.body, {
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    updateOverlayVisibility();

    // 12. Quick Menu Overlay Logic (cb6d18e + 2c1e6779)
    const qm = document.getElementById('quick-menu');
    if (qm) {
        let qmStartY = 0;
        let qmIsDragging = false;

        qm.addEventListener('click', (e) => {
            if (isQuickMenuPinned()) return;
            if (e.target.id === 'quick-menu') closeQuickMenu();
        });

        qm.addEventListener('touchstart', (e) => {
            if (isQuickMenuPinned()) return;
            qmStartY = e.touches[0].clientY;
            qmIsDragging = true;
        }, { passive: true });

        qm.addEventListener('touchmove', (e) => {
            if (!qmIsDragging || isQuickMenuPinned()) return;
        }, { passive: true });

        qm.addEventListener('touchend', (e) => {
            if (!qmIsDragging || isQuickMenuPinned()) return;
            const deltaY = e.changedTouches[0].clientY - qmStartY;
            if (deltaY > 70) {
                closeQuickMenu();
            }
            qmIsDragging = false;
        });

        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'input', 'change'].forEach(evt => {
            qm.addEventListener(evt, resetQmInactivityTimer, { passive: true });
        });
    }

    const btnAssistant = document.getElementById('qm-btn-assistant');
    if (btnAssistant) {
        btnAssistant.addEventListener('click', () => {
            closeQuickMenu();
            if (window.Assistant && typeof window.Assistant.trigger === 'function') {
                window.Assistant.trigger();
            }
        });
    }

    const btnHome = document.getElementById('qm-btn-home');
    if (btnHome) {
        btnHome.addEventListener('click', () => {
            closeQuickMenu();
            const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
            if (openEmbed) {
                openEmbed.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease, border-radius 0.3s ease';
                openEmbed.style.transform = 'perspective(100vh) rotateX(40deg) translateY(-40px) scale(0.8)';
                openEmbed.style.opacity = '0';
                openEmbed.style.filter = 'blur(10px)';
                openEmbed.style.borderRadius = '50px';
                if (openEmbed.style.hasOwnProperty('cornerShape')) openEmbed.style.cornerShape = 'superellipse(1.5)';
                openEmbed.style.border = '1px solid var(--glass-border)';

                if (typeof applyWallpaperEffects === 'function') applyWallpaperEffects();
                document.body.style.setProperty('--bg-transform-scale', '1.05');

                setTimeout(() => {
                    minimizeFullscreenEmbed(false);
                    openEmbed.style.border = 'none';
                    openEmbed.style.transition = '';
                }, 300);
            } else {
                minimizeFullscreenEmbed();
            }
        });
    }

    const btnApps = document.getElementById('qm-btn-apps');
    if (btnApps) {
        btnApps.addEventListener('click', () => {
            closeQuickMenu();
            if (typeof openAppSwitcherUI === 'function') {
                openAppSwitcherUI();
            }
        });
    }

    // Quick Menu Control Buttons
    const adjustSetting = (key, delta, min, max) => {
        let current = parseInt(localStorage.getItem(key) || max);
        if (isNaN(current)) current = max;
        let next = Math.min(max, Math.max(min, current + delta));
        if (typeof setControlValueAndDispatch === 'function') {
            setControlValueAndDispatch(key, next.toString());
        }
    };

    document.getElementById('qm-btn-bright-down')?.addEventListener('click', () => adjustSetting('page_brightness', -10, 20, 100));
    document.getElementById('qm-btn-bright-up')?.addEventListener('click', () => adjustSetting('page_brightness', 10, 20, 100));
    document.getElementById('qm-btn-vol-down')?.addEventListener('click', () => adjustSetting('master_volume', -10, 0, 100));
    document.getElementById('qm-btn-vol-up')?.addEventListener('click', () => adjustSetting('master_volume', 10, 0, 100));
    document.getElementById('qm-btn-controls')?.addEventListener('click', () => { closeQuickMenu(); openControls(); });
}

const appDrawerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (typeof HomeActivityManager !== 'undefined') {
                HomeActivityManager.updateVisibility();
            }
        }
    });
});

appDrawerObserver.observe(appDrawer, {
    attributes: true
});

function setupOneButtonNav() {
    const navButton = document.getElementById('one-button-nav-handle');
    if (!navButton) return;

    let clickTimeout = null;
    let longPressTimeout = null;
    const longPressDuration = 500;
    let isLongPress = false;

    const isAppOpen = () => document.querySelector('.fullscreen-embed[style*="display: block"]');
    const isDrawerOpen = () => appDrawer.classList.contains('open');

    const handleClick = () => {
		if (isAppOpen()) {
            minimizeFullscreenEmbed();
		} else if (isDrawerOpen()) {
            // Close app drawer by removing the class
            appDrawer.classList.remove('open');
            setTimeout(() => {
                if (!appDrawer.classList.contains('open')) {
                    appDrawer.style.display = 'none';
                    appDrawer.style.bottom = '';
                    appDrawer.style.opacity = '';
                    appDrawer.style.zIndex = '';
                }
            }, 300);
            document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                el.classList.remove('force-hide');
                el.style.display = el.dataset.originalDisplay || '';
                el.style.removeProperty('content-visibility'); // OPTIMIZATION
                el.style.transition = 'opacity 0.3s ease';
                requestAnimationFrame(() => { el.style.opacity = '1'; });
            });
			resetIndicatorTimeout();
        } else {
            // Toggle Dock on Home Screen
            if (dock.classList.contains('show')) {
                dock.classList.remove('show');
                setTimeout(() => {
                    if (!dock.classList.contains('show')) {
                        dock.style.display = 'none';
                    }
                }, 300); // Match CSS transition duration
            } else {
                dock.style.display = 'flex';
                requestAnimationFrame(() => {
                    dock.classList.add('show');
                });
            }
        }
    };

    const handleDoubleClick = () => {
        if (isAppOpen()) return; // Don't do anything if an app is open
        if (typeof openAppSwitcherUI === 'function') {
            openAppSwitcherUI();
        }
    };

    const handleLongPress = () => {
		isLongPress = true;
		openAppSwitcherUI();
    };

    const onPointerDown = (e) => {
        if (!oneButtonNavEnabled) return;
        e.preventDefault();
        isLongPress = false;
        longPressTimeout = setTimeout(handleLongPress, longPressDuration);
    };

    const onPointerUp = (e) => {
        if (!oneButtonNavEnabled) return;
        clearTimeout(longPressTimeout);
        if (isLongPress) {
            e.preventDefault();
            return;
        }

        if (clickTimeout) { // Double click
            clearTimeout(clickTimeout);
            clickTimeout = null;
            handleDoubleClick();
        } else { // Single click
            clickTimeout = setTimeout(() => {
                handleClick();
                clickTimeout = null;
            }, 250);
        }
    };

    navButton.addEventListener('mousedown', onPointerDown);
    navButton.addEventListener('touchstart', onPointerDown, { passive: false });

    navButton.addEventListener('mouseup', onPointerUp);
    navButton.addEventListener('touchend', onPointerUp);

    navButton.addEventListener('mouseleave', () => clearTimeout(longPressTimeout));
    navButton.addEventListener('touchmove', () => clearTimeout(longPressTimeout));

    // --- Split Screen Button Handler ---
    const splitTrigger = document.getElementById('split-screen-trigger');
    if (splitTrigger) {
        splitTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Vibrate for feedback if supported
            if (navigator.vibrate) navigator.vibrate(50);
            
            if (document.querySelector('.fullscreen-embed[style*="display: block"]')) {
                 initiateSplitScreen('left'); // Default to putting current app on left
            } else {
                 showPopup(currentLanguage.SPLIT_OPEN_APP_FIRST || "Open an app first to split screen");
            }
        });
    }
}

// Initialize app drawer
function initAppDraw() {
    const searchBtn = document.getElementById('search-app-btn');
    const sortBtn = document.getElementById('sort-app-btn');
    const searchInput = document.getElementById('app-search-input');
    const closeSearchBtn = document.getElementById('close-search-btn');

    searchInput.addEventListener('blur', () => {
        if (searchInput.value.trim() === '') {
            setTimeout(closeSearch, 100);
        }
    });

    searchInput.addEventListener('input', () => {
        createAppIcons(searchInput.value, true);
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() !== '') {
            const firstIcon = appGrid.querySelector('.app-icon');
            if (firstIcon) {
                firstIcon.click();
            }
        }
    });

    sortBtn.addEventListener('click', () => {
        currentSortIndex = (currentSortIndex + 1) % sortMethods.length;
        localStorage.setItem('appSortMethod', sortMethods[currentSortIndex].id);
        updateSortButtonUI();
        createAppIcons(searchInput.value);
    });

    loadSortPreference();
    updateSortButtonUI();
    cacheAppIconColors().then(() => {
        createAppIcons();
    });

    setupDrawerInteractions();
}