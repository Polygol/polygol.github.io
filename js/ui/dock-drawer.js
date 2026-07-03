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

function openQuickMenu() {
    if (isQuickMenuOpen) return;
    isQuickMenuOpen = true;
    const qm = document.getElementById('quick-menu');
    if (!qm) return;
    qm.style.display = 'flex';
    void qm.offsetWidth;

    const interactionBlocker = document.getElementById('interaction-blocker');
    if(interactionBlocker) interactionBlocker.style.display = 'none';

    updateQMClock();
    resetQmInactivityTimer();
    requestAnimationFrame(() => qm.classList.add('open'));
}

function closeQuickMenu() {
    if (!isQuickMenuOpen) return;
    isQuickMenuOpen = false;
    clearTimeout(qmInactivityTimer);
    qmInactivityTimer = null;
    const qm = document.getElementById('quick-menu');
    if (!qm) return;
    qm.classList.remove('open');
    setTimeout(() => { if(!isQuickMenuOpen) qm.style.display = 'none'; }, 300);
}

let qmInactivityTimer = null;

function resetQmInactivityTimer() {
    clearTimeout(qmInactivityTimer);
    if (isQuickMenuOpen) {
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
    const drawerHandle = document.querySelector('.drawer-handle');
    
    // 1. Setup Swipe Overlay (from dock-drawer.js)
    // This allows capturing gestures even when an iframe is in the foreground
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

    // 2. Mouse-only UI: Create Quick Menu Button
    // We detect "mouse-only" by checking if the device supports touch
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let qmTriggerBtn = null;

    if (!isTouchDevice && drawerHandle) {
        qmTriggerBtn = document.createElement('button');
        qmTriggerBtn.className = 'qm-trigger-btn';
        
        drawerHandle.appendChild(qmTriggerBtn);
        qmTriggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openQuickMenu();
        });
    }

    // Helper: Forward clicks through the handle/overlay to underlying content
    function forwardClick(clientX, clientY) {
        const handlePE = drawerHandle ? drawerHandle.style.pointerEvents : "";
        const overlayPE = swipeOverlay.style.pointerEvents;

        if (drawerHandle) drawerHandle.style.pointerEvents = "none";
        swipeOverlay.style.pointerEvents = "none";

        const passthrough = document.querySelectorAll(".fullscreen-embed, iframe");
        const original = new Map();

        passthrough.forEach(el => {
            original.set(el, el.style.pointerEvents);
            el.style.pointerEvents = "auto";
        });

        const target = document.elementFromPoint(clientX, clientY);

        if (target) {
            if (target.tagName === "IFRAME") {
                const rect = target.getBoundingClientRect();
                const zoom = (parseFloat(document.body.style.zoom) || 100) / 100;

                target.contentWindow?.postMessage({
                    type: "forward-click",
                    x: (clientX - rect.left) / zoom,
                    y: (clientY - rect.top) / zoom
                }, "*");
            } else {
                target.dispatchEvent(new MouseEvent("click", {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX,
                    clientY
                }));
            }
        }

        if (drawerHandle) drawerHandle.style.pointerEvents = handlePE;
        swipeOverlay.style.pointerEvents = overlayPE;
        passthrough.forEach(el => el.style.pointerEvents = original.get(el));
    }

    // 3. Gesture Logic (Disabled if mouse-only button is present)
    if (drawerHandle) {
        let handleStartY = 0;
        let handleDragging = false;
        let handleSwiped = false;
        const SWIPE_THRESHOLD = 50;

        drawerHandle.addEventListener('touchstart', (e) => {
            handleDragging = true;
            handleSwiped = false;
            handleStartY = e.touches[0].clientY;
        }, { passive: true });

        drawerHandle.addEventListener('touchmove', (e) => {
            if (!handleDragging) return;
            const deltaY = handleStartY - e.touches[0].clientY;
            if (deltaY >= SWIPE_THRESHOLD) {
                handleDragging = false;
                handleSwiped = true;
                openQuickMenu();
            }
        }, { passive: true });

        drawerHandle.addEventListener('touchend', (e) => {
            if (!handleSwiped && e.changedTouches.length) {
                forwardClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
            handleDragging = false;
        });

        // Mouse listeners for the handle - only enable gestures if button is NOT used
        drawerHandle.addEventListener('mousedown', (e) => {
            if (qmTriggerBtn) return; // Disable gestures on mouse if button exists
            handleDragging = true;
            handleSwiped = false;
            handleStartY = e.clientY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!handleDragging || qmTriggerBtn) return;
            const deltaY = handleStartY - e.clientY;
            if (deltaY >= SWIPE_THRESHOLD) {
                handleDragging = false;
                handleSwiped = true;
                openQuickMenu();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (handleDragging && !handleSwiped) {
                forwardClick(e.clientX, e.clientY);
            }
            handleDragging = false;
        });
    }

    // 4. Swipe Overlay Interaction (Closing apps)
    let overlayStartY = 0;
    let isOverlayDragging = false;

    swipeOverlay.addEventListener('touchstart', (e) => {
        overlayStartY = e.touches[0].clientY;
        isOverlayDragging = false;
    }, { passive: true });

    swipeOverlay.addEventListener('touchmove', (e) => {
        const deltaY = overlayStartY - e.touches[0].clientY;
        if (deltaY > 30) isOverlayDragging = true; 
    }, { passive: true });

    swipeOverlay.addEventListener('touchend', (e) => {
        const deltaY = overlayStartY - e.changedTouches[0].clientY;
        // If swiped up from overlay, minimize app
        if (isOverlayDragging && deltaY > 100) {
            minimizeFullscreenEmbed();
        }
    });

    // 5. Visibility Observer for Swipe Overlay
    const updateOverlayVisibility = () => {
        const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        const isDrawerOpen = document.getElementById('app-drawer')?.classList.contains('open');
        
        if (isAppOpen && !isDrawerOpen) {
            swipeOverlay.style.display = 'block';
            swipeOverlay.style.pointerEvents = 'auto';
        } else {
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
        }
    };

    const observer = new MutationObserver(updateOverlayVisibility);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    updateOverlayVisibility();

    // --- Quick Menu Logic ---
    const qm = document.getElementById('quick-menu');
    if (qm) {
        let qmStartY = 0;
        let qmIsDragging = false;

        // Close on background click
        qm.addEventListener('click', (e) => {
            if (e.target.id === 'quick-menu') closeQuickMenu();
        });

        // Swipe Down anywhere on Quick Menu to close
        qm.addEventListener('touchstart', (e) => {
            qmStartY = e.touches[0].clientY;
            qmIsDragging = true;
        }, { passive: true });

        qm.addEventListener('touchmove', (e) => {
            if (!qmIsDragging) return;
            const deltaY = e.touches[0].clientY - qmStartY;
        }, { passive: true });

        qm.addEventListener('touchend', (e) => {
            if (!qmIsDragging) return;
            const deltaY = e.changedTouches[0].clientY - qmStartY;
            const menuContent = qm.querySelector('.quick-menu-content');
            
            if (deltaY > 70) { // Threshold to close
                closeQuickMenu();
            }
            qmIsDragging = false;
        });

        // Mouse support for swipe down
        qm.addEventListener('mousedown', (e) => {
            qmStartY = e.clientY;
            qmIsDragging = true;
        });

        window.addEventListener('mousemove', (e) => {
            if (!qmIsDragging || qm.style.display === 'none') return;
            const deltaY = e.clientY - qmStartY;
        });

        window.addEventListener('mouseup', (e) => {
            if (!qmIsDragging) return;
            const deltaY = e.clientY - qmStartY;
            const menuContent = qm.querySelector('.quick-menu-content');
            
            if (deltaY > 70) {
                closeQuickMenu();
            }
            qmIsDragging = false;
        });

        // Existing inactivity and reset listeners
        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'input', 'change'].forEach(evt => {
            qm.addEventListener(evt, resetQmInactivityTimer, { passive: true });
        });
    }

    const btnAssistant = document.getElementById('qm-btn-assistant');
    if (btnAssistant) {
        btnAssistant.addEventListener('click', () => {
            closeQuickMenu();

            showPopup('This feature is not available')

            /* Uncomment when ready.
            
            if (window.Assistant && typeof window.Assistant.trigger === 'function') {
                window.Assistant.trigger();
            } */
        });
    }

    const btnHome = document.getElementById('qm-btn-home');
    if (btnHome) {
        btnHome.addEventListener('click', () => {
            closeQuickMenu();
            
            const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
            if (openEmbed) {
                // Apply closing animation styling from dock-drawer.js
                openEmbed.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, filter 0.3s ease, border-radius 0.3s ease';
                openEmbed.style.transform = 'perspective(100vh) rotateX(40deg) translateY(-40px) scale(0.8)';
                openEmbed.style.opacity = '0';
                openEmbed.style.filter = 'blur(10px)';
                openEmbed.style.borderRadius = '50px';
                if (openEmbed.style.hasOwnProperty('cornerShape')) openEmbed.style.cornerShape = 'superellipse(1.5)';
                openEmbed.style.border = '1px solid var(--glass-border)';

                // Revert background effects
                if (typeof applyWallpaperEffects === 'function') applyWallpaperEffects();
                document.body.style.setProperty('--bg-transform-scale', '1.05');

                setTimeout(() => {
                    minimizeFullscreenEmbed(false); // Skip standard minimize animation as we've manually animated it
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
            const appDrawer = document.getElementById('app-drawer');
            if (!appDrawer) return;
            appDrawer.style.display = 'flex';
            requestAnimationFrame(() => {
                appDrawer.classList.add('open');
                appDrawer.style.zIndex = '1005';
                appDrawer.style.bottom = '0%';
                appDrawer.style.opacity = '1';
                if (typeof createAppIcons === 'function') createAppIcons();
            });
            document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                if (!el.dataset.originalDisplay) el.dataset.originalDisplay = window.getComputedStyle(el).display;
                el.style.opacity = '0';
                setTimeout(() => el.classList.add('force-hide'), 300);
            });
            const interactionBlocker = document.getElementById('interaction-blocker');
            if(interactionBlocker) {
                interactionBlocker.style.display = 'block';
                interactionBlocker.style.pointerEvents = 'auto';
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

    // Global Bottom Swipe Detection (for Quick Menu)
    let startX, startY;
    let isBottomSwipe = false;
    let isGesturing = false;

    const handleGlobalStart = (clientX, clientY) => {
        startX = clientX;
        startY = clientY;
        isBottomSwipe = startY > window.innerHeight - 50;
        isGesturing = true;
    };

    const handleGlobalEnd = (clientX, clientY) => {
        if (!isGesturing) return;
        isGesturing = false;
        const deltaY = clientY - startY;
        // Swipe up from bottom opens Quick Menu (unless mouse button mode is active)
        if (isBottomSwipe && deltaY < -30 && !qmTriggerBtn) {
            openQuickMenu();
        }
    };

    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) handleGlobalStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        if (e.changedTouches.length > 0) handleGlobalEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    });
    
    document.addEventListener('mousedown', (e) => {
        if (qmTriggerBtn) return; // Disable gestures if mouse button exists
        const t = e.target;
        if (t === document.body || t.id === 'background-video' || t.id === 'depth-layer' || (t.classList && t.classList.contains('drawer-handle'))) {
            handleGlobalStart(e.clientX, e.clientY);
        } else if (e.clientY > window.innerHeight - 50) {
            handleGlobalStart(e.clientX, e.clientY);
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (isGesturing) handleGlobalEnd(e.clientX, e.clientY);
    });
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

        if (isDrawerOpen()) {
            // Close app drawer
            appDrawer.classList.remove('open');
            setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
            document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                el.classList.remove('force-hide');
                el.style.removeProperty('content-visibility'); // OPTIMIZATION
                el.style.opacity = '1';
            });
			resetIndicatorTimeout();
        } else {
            // Open App Drawer
            if (dock.classList.contains('show')) {
                dock.classList.remove('show');
                setTimeout(() => { if (!dock.classList.contains('show')) { dock.style.display = 'none'; } }, 300);
            }
            
            // **FIX:** Clear inline styles that might be left over from gesture interactions
            appDrawer.style.display = 'flex';
            appDrawer.style.bottom = '';
            appDrawer.style.opacity = '';
            
            requestAnimationFrame(() => {
                appDrawer.classList.add('open'); // Now the CSS class will take effect
            });
            
            document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                if (!el.dataset.originalDisplay) {
                    el.dataset.originalDisplay = window.getComputedStyle(el).display;
                }
                el.style.opacity = '0';
                setTimeout(() => { 
                    el.classList.add('force-hide'); 
                    el.style.contentVisibility = 'hidden'; // OPTIMIZATION
                }, 300);
            });
            
            // Hide Home Activities
            HomeActivityManager.updateVisibility();

			resetIndicatorTimeout();
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