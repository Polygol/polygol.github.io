const appDrawer = document.getElementById('app-drawer');
const appGrid = document.getElementById('app-grid');

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
        if (iconSource && (iconSource.startsWith('http') || iconSource.startsWith('./') || iconSource.startsWith('data:'))) {
            // If it's a full URL, a root-relative path, or a data URI, use it directly.
            img.src = iconSource;
        } else if (iconSource) {
            // Otherwise, assume it's a local filename and prepend the default path.
            img.src = `./assets/appicon/${iconSource}`;
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
                if (!(iconSrc.startsWith('http') || iconSrc.startsWith('./') || iconSrc.startsWith('data:'))) {
                    iconSrc = `./assets/appicon/${iconSrc}`;
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
        if (iconSource && (iconSource.startsWith('http') || iconSource.startsWith('./') || iconSource.startsWith('data:'))) {
            // If it's an absolute URL or a root-relative path, use it directly.
            img.src = iconSource;
        } else if (iconSource) {
            // Otherwise, assume it's a local filename and prepend the default path.
            img.src = `./assets/appicon/${iconSource}`;
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


function setupDrawerInteractions() {
    let startY = 0, startX = 0;
    let currentY = 0, currentX = 0;
    let dragStartIndex = -1; // NEW: Tracks the initial index for horizontal swipe
    let initialDrawerPosition = -100;
    let isDragging = false;
    let isDrawerInMotion = false;
    let dragStartTime = 0;
    let lastY = 0;
    let velocities = [];
    let dockHideTimeout = null;
    let longPressTimer;
    const longPressDuration = 500; // 500ms for a long press
	let dragSource = null; // 'handle', 'body', 'content'
    const flickVelocityThreshold = 0.4;
    const dockThreshold = -2.5; // Threshold for dock appearance
    const openThreshold = -50;
    const drawerPill = document.querySelector('.drawer-pill');
    const drawerHandle = document.querySelector('.drawer-handle');
	const appDrawerHandle = document.querySelector('.app-drawer-handle');
    const oneButtonNavHandle = document.getElementById('one-button-nav-handle');

	const startLongPress = (e) => {
        if (oneButtonNavEnabled) return; 
        if (document.body.classList.contains('immersive-active')) return;

        if (!isDragging) {
             longPressTimer = setTimeout(() => {
                openAppSwitcherUI();
            }, longPressDuration);
        }
    };

    const cancelLongPress = () => {
        clearTimeout(longPressTimer);
    };

    if (drawerPill) {
        drawerPill.addEventListener('mousedown', startLongPress);
        drawerPill.addEventListener('touchstart', startLongPress);
        
        drawerPill.addEventListener('mouseup', cancelLongPress);
        drawerPill.addEventListener('mouseleave', cancelLongPress);
        drawerPill.addEventListener('touchend', cancelLongPress);
    }
        
    // Create interaction blocker overlay
	const interactionBlocker = document.getElementById('interaction-blocker');
    
    populateDock();
    
    // Create transparent overlay for app swipe detection
    const swipeOverlay = document.createElement('div');
    swipeOverlay.id = 'swipe-overlay';
    swipeOverlay.style.position = 'fixed';
    swipeOverlay.style.bottom = '0';
    swipeOverlay.style.left = '0';
    swipeOverlay.style.width = '100%';
    swipeOverlay.style.height = '100%'; // 100% of screen for swipe detection
    swipeOverlay.style.zIndex = '1000';
    swipeOverlay.style.display = 'none';
    swipeOverlay.style.pointerEvents = 'none'; // Start with no interaction
    document.body.appendChild(swipeOverlay);
	
	let isPendingDrag = false;

	function prepareDrag(xPosition, yPosition) {
        startX = xPosition;
        startY = yPosition;
        lastY = yPosition;
        currentX = xPosition;
        currentY = yPosition;
        dragStartTime = Date.now();
        isPendingDrag = true;
    }

    let cachedOpenEmbed = null;
    let cachedWindowHeight = window.innerHeight;
    window.addEventListener('resize', () => cachedWindowHeight = window.innerHeight, {passive: true});

	function startDrag(xPosition, yPosition) {
        if (xPosition !== undefined) startX = xPosition;
        if (yPosition !== undefined) startY = yPosition;
        lastY = startY;
        currentX = startX;
        currentY = startY;
        dragStartIndex = -1; // Reset on new drag
        isDragging = true;
        isPendingDrag = false;
        isDrawerInMotion = true;
        velocities =[];
        
        // PRE-CALCULATE DOM queries before the high-frequency move loop starts
        cachedOpenEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        appDrawer.style.transition = 'opacity 0.3s, filter 0.3s';
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
        const verticalDelta = startY - yPosition; // Use a different name to avoid conflict

        const HORIZONTAL_SWIPE_DEADZONE = 20; // Min horizontal movement to trigger switcher
        const VERTICAL_SWIPE_LIMIT = 50;      // Max vertical movement for a horizontal gesture

        // If switcher is visible and user swipes up past the limit, discard it.
        if (appSwitcherVisible && verticalDelta > VERTICAL_SWIPE_LIMIT) {
            discardAndCloseAppSwitcher();
            return; // Stop processing this gesture immediately.
        }

        // Determine if swipe is horizontal (and not significantly vertical)
        if (Math.abs(verticalDelta) < VERTICAL_SWIPE_LIMIT && Math.abs(deltaX) > Math.abs(verticalDelta) + 20) {
            // Immersive Check
            if (document.body.classList.contains('immersive-active')) return;
            
            // 1. App Switcher: Restricted to Handle
            if (dragSource === 'handle') {
                if (!appSwitcherVisible && Math.abs(deltaX) > HORIZONTAL_SWIPE_DEADZONE) {
                    openAppSwitcher();
                }
            }

            // 2. Wallpaper Swipe: Handled in touchend/move via simple ignore here
            const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
            if (!appSwitcherVisible && !isAppOpen) {
                // It's a horizontal swipe on home.
                // If dragging body, let it be handled by wallpaper logic (don't move drawer vertical).
                // If dragging handle, we allow app switcher (above), but don't move drawer.
                return; 
            }

			if (appSwitcherVisible) {
		        if (dragStartIndex === -1) {
		            dragStartIndex = appSwitcherIndex; // Set initial index on first horizontal move
		        }
		
		        const itemWidth = 80; // approximate width + gap
		        const slotsMoved = Math.round(deltaX / itemWidth);
		        const newIndex = dragStartIndex + slotsMoved;
		
		        // Only update the UI if the calculated index has actually changed
		        if (newIndex !== appSwitcherIndex) {
		            updateSwitcherSelection(newIndex);
		        }
		    }
		    return; // Don't process vertical drawer movement
		}
	
	    const now = Date.now();
	    const deltaTime = now - dragStartTime;
	    if (deltaTime > 0) {
	        const velocity = (lastY - yPosition) / deltaTime;
	        velocities.push(velocity);
	        if (velocities.length > 5) {
	            velocities.shift();
	        }
	    }
		
	    lastY = yPosition;
	    currentY = yPosition;
	    const deltaY = startY - currentY; // Positive for upward swipe
	    const movementPercentage = (deltaY / cachedWindowHeight) * 100;
	
	    const openEmbed = cachedOpenEmbed;

        // OPTIMIZATION: Throttle visual updates to screen refresh rate
        if (window._drawerMoveRaf) return;
        window._drawerMoveRaf = requestAnimationFrame(() => {
            window._drawerMoveRaf = null;

		if (openEmbed) {
			// Immersive Mode Check: Do not visually manipulate the window
			if (document.body.classList.contains('immersive-active')) {
				return; 
			}
			
			// LOGIC FOR DRAGGING AN OPEN APP
	        openEmbed.style.willChange = 'transform, opacity, border-radius'; // GPU Layer Hint

	        // Start effect after a small deadzone
	        if (deltaY > 50) {
		    cancelLongPress();
		    const dynArea = document.getElementById('dynamic-area');
		    if (dynArea) dynArea.style.opacity = '0';
			
	            // Progress is how far along the "close" gesture we are. 
	            // A 20% screen height swipe is considered the full gesture.
	            const progress = Math.min(1, deltaY / (cachedWindowHeight * 0.2));
	
	            // Move the card up as you swipe, making it feel like you're pushing it away
	            const translateY = -deltaY;
	
	            // Scale down from 1 to 0.8 as you drag
	            const scale = 1 - (progress * 0.2);
	
	            // Add border radius up to 35px
	            const borderRadius = progress * 50;
	
	            // Apply the border now that we're dragging
	            openEmbed.style.border = '1px solid var(--glass-border)';
	
	            // Set the new styles
	            openEmbed.style.transform = `perspective(100vh) rotateX(${(progress * 20)}deg) translateY(${translateY}px) scale(${scale})`;
	            openEmbed.style.opacity = 1 - (progress * 1); // Fade out slightly
	            openEmbed.style.filter = `blur(${(progress * 10)}px)`;
				openEmbed.style.cornerShape = 'superellipse(1.5)';
	            openEmbed.style.borderRadius = `${borderRadius}px`;
	        } else {
                cancelLongPress();
	            // If dragging back down below the deadzone, reset to initial state
	            openEmbed.style.transform = 'perspective(100vh) rotateX(0deg) translateY(0px) scale(1)';
	            openEmbed.style.opacity = '1';
    	        openEmbed.style.filter = 'none';
	            openEmbed.style.borderRadius = `${window.systemScreenCurve || 0}px`;
	            openEmbed.style.border = 'none';
				openEmbed.style.cornerShape = 'superellipse(1.5)';
	            
                const dynArea = document.getElementById('dynamic-area');
                if (dynArea) dynArea.style.opacity = '1';
	        }
	
	        // Ensure the drawer UI is not visible
	        appDrawer.style.opacity = '0';
	        interactionBlocker.style.pointerEvents = 'none';
	
	    } else {
            // LOGIC FOR DRAGGING THE DRAWER (NO APP OPEN)
            // --- Donburi Swipe Down ---
            if (dragSource === 'body' && movementPercentage < -5) {
                const donburi = document.getElementById('donburi-container');
                if (donburi) {
                    const dynArea = document.getElementById('dynamic-area');
                    if (dynArea) dynArea.style.opacity = '0';
                    donburi.style.display = 'block';
                    donburi.style.contentVisibility = 'auto';
	                donburi.style.pointerEvents = 'none';
                    const progress = Math.min(1, Math.abs(movementPercentage) / 30);
                    donburi.style.transform = `translateY(${-100 + (progress * 100)}%)`;
                }
            }
			
            // Only show Dock if dragging from Handle. If dragging from Body, keep it hidden.
	        if (dragSource === 'handle' && movementPercentage > 2.5 && movementPercentage < 25) {
	            if (dock.style.display === 'none' || dock.style.display === '') {
	                dock.style.display = 'flex';
	                requestAnimationFrame(() => {
	                    dock.classList.add('show');
	                });
	            } else {
	                dock.classList.add('show');
	            }
	            dock.style.boxShadow = 'var(--sun-shadow), 0 -2px 10px rgba(0, 0, 0, 0.1)';
	            if (dockHideTimeout) clearTimeout(dockHideTimeout);
	            drawerPill.style.opacity = '0';

				// Restore all main UI elements
			    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
				    el.classList.remove('force-hide');
			        el.style.display = el.dataset.originalDisplay;
                    el.style.removeProperty('content-visibility'); // OPTIMIZATION
			        el.style.transition = 'opacity 0.3s ease';
			
			        requestAnimationFrame(() => {
			            el.style.opacity = '1';
			        });
			    });
	        } else {
	            dock.classList.remove('show');
	            dock.style.boxShadow = 'none';
	            if (dockHideTimeout) clearTimeout(dockHideTimeout);
	            dockHideTimeout = setTimeout(() => {
	                if (!dock.classList.contains('show')) {
	                    dock.style.display = 'none';
	                }
	            }, 300);
	            drawerPill.style.opacity = '1';
	        }
		    
			cancelLongPress();
	
			const newPosition = Math.max(-100, Math.min(0, initialDrawerPosition + movementPercentage));
	        
	        if (appDrawer.style.display === 'none' && newPosition > -100) {
	            appDrawer.style.display = 'flex';
	        }

            // Visually, the drawer will only open/close completely upon release (flick/tap).
            if (movementPercentage > 5 && !appDrawer.classList.contains('open')) {
                if (appDrawer.style.display === 'none') appDrawer.style.display = 'flex';
                interactionBlocker.style.display = 'block';
                interactionBlocker.style.pointerEvents = openEmbed ? 'none' : 'auto';
            }
	    }
        });
	}

	function endDrag() {
	    if (!isDragging) return;

        // Cancel any pending drag frames to prevent them from overriding the snap animation
        if (window._drawerMoveRaf) {
            cancelAnimationFrame(window._drawerMoveRaf);
            window._drawerMoveRaf = null;
        }
	
	    const deltaY = startY - currentY; // Positive for upward swipe
	    let avgVelocity = 0;
	    if (velocities.length > 0) {
	        avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
	    }
	    const movementPercentage = (deltaY / cachedWindowHeight) * 100;
	    const isFlickUp = avgVelocity > flickVelocityThreshold;
	    const isFlickDown = avgVelocity < -flickVelocityThreshold;
	
	    const openEmbed = cachedOpenEmbed;
	    
	    if (openEmbed) {
            // Immersive Mode Exit Logic
            if (document.body.classList.contains('immersive-active')) {
                // If swiped up sufficiently, exit immersive mode
                if (movementPercentage > 5 || isFlickUp) {
                    setImmersiveMode(false);
                }
                // Always reset drag state without closing the app
                isDragging = false;
                return;
            }

	        // Immersive Mode Trigger
            // movementPercentage is negative for down swipes.
            if (movementPercentage < -10) {
                setImmersiveMode(true);
                isDragging = false;
				setTimeout(() => {
			        const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
			        if (activeEmbed) {
			            const activeIframe = activeEmbed.querySelector('iframe');
			            if (activeIframe) {
			                activeIframe.style.pointerEvents = 'auto';
			            }
			        }
			    }, 350); // Delay should be slightly longer than your CSS animation
				return;
            }
	    
	        // LOGIC FOR FINISHING AN APP DRAG            
            // Clean up GPU hint after transition ends
            setTimeout(() => { 
                if (openEmbed) {
                    openEmbed.style.willChange = 'auto'; 
                    openEmbed.style.removeProperty('transition');
                }
            }, 300);
	
	        // Condition to close: swipe up more than 20% of the screen OR a fast flick up
	        if (movementPercentage > 20 || isFlickUp) {
	            // Animate to a shrunken state and then minimize
	            openEmbed.style.transform = 'perspective(100vh) rotateX(40deg) translateY(-40px) scale(0.8)'; // Center and shrink
	            openEmbed.style.opacity = '0';
	            openEmbed.style.filter = 'blur(10px)';
	            openEmbed.style.borderRadius = '50px';
				openEmbed.style.cornerShape = 'superellipse(1.5)';
				openEmbed.style.border = '1px solid var(--glass-border)';
	            document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');

                // NEW: Revert background effects on close
                applyWallpaperEffects();
                document.body.style.setProperty('--bg-transform-scale', '1.05');
	
	            setTimeout(() => {
	                minimizeFullscreenEmbed(false); // Call with false to skip animation
	                swipeOverlay.style.display = 'none';
	                swipeOverlay.style.pointerEvents = 'none';
	                openEmbed.style.border = 'none'; // Clean up border after animation
	            }, 300);
	
				// Reset drawer & dock state
	            dock.classList.remove('show');
	            dock.style.boxShadow = 'none';
	            if (dockHideTimeout) clearTimeout(dockHideTimeout);
	            dockHideTimeout = setTimeout(() => { if (!dock.classList.contains('show')) { dock.style.display = 'none'; } }, 300);
	            appDrawer.classList.remove('open');
                setTimeout(() => {
                    if (!appDrawer.classList.contains('open')) {
                        appDrawer.style.display = 'none';
                        appDrawer.style.bottom = '';
                        appDrawer.style.opacity = '';
                        appDrawer.style.zIndex = '';
                    }
                }, 300);
	            initialDrawerPosition = -100;
	            interactionBlocker.style.display = 'none';
	        } else {
	            // Animate back to the original fullscreen state
	            openEmbed.style.transform = 'perspective(100vh) rotateX(0deg) translateY(0px) scale(1)';
	            openEmbed.style.opacity = '1';
	            openEmbed.style.filter = 'none';
	            openEmbed.style.borderRadius = `${window.systemScreenCurve || 0}px`;
				openEmbed.style.cornerShape = 'superellipse(1.5)';
	            openEmbed.style.border = 'none'; // Animate border removal
	            
	            appDrawer.style.opacity = '0';
				const dynArea = document.getElementById('dynamic-area');
				if (dynArea) dynArea.style.opacity = '1';
                // NEW: Apply opening effects on snap-back
                const brightnessValue = document.getElementById('wallpaper-brightness-slider')?.value || 100;
                const contrastValue = document.getElementById('wallpaper-contrast-slider')?.value || 100;
                const saturateValue = document.getElementById('wallpaper-saturate-slider')?.value || 100;
                const hueValue = document.getElementById('wallpaper-hue-slider')?.value || 0;
                const openFilter = `blur(10px) brightness(${brightnessValue}%) contrast(${contrastValue}%) saturate(${saturateValue}%) hue-rotate(${hueValue}deg)`;
                document.body.style.setProperty('--wallpaper-filter', openFilter);
                document.body.style.setProperty('--bg-transform-scale', '1.25');
	        }

			setTimeout(() => {
		        const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
		        if (activeEmbed) {
		            const activeIframe = activeEmbed.querySelector('iframe');
		            if (activeIframe) {
		                activeIframe.style.pointerEvents = 'auto';
		            }
		        }
		    }, 350); // Delay should be slightly longer than your CSS animation
	
	    } else {
	        // LOGIC FOR FINISHING A DRAWER DRAG (NO APP OPEN)
			const dynArea = document.getElementById('dynamic-area');
			if (dynArea) dynArea.style.opacity = '1';
	        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
	
			const startedOpen = appDrawer.classList.contains('open');
            const closing = startedOpen && (movementPercentage < -10 || isFlickDown);
            const opening = !startedOpen && (movementPercentage > 10 || isFlickUp);
            const significant = closing || opening;
            const smallOpen = false; // Disabled with live drag removal
			
            // Donburi Swipe Down Check
            if (dragSource === 'body' && !startedOpen && movementPercentage < -15) {
                openDonburi();
                isDragging = false;
                return;
            } else if (dragSource === 'body' && !startedOpen) {
                // Cancel Donburi drag if not enough
                const donburi = document.getElementById('donburi-container');
                if(donburi) {
                    donburi.style.transform = 'translateY(-100%)';
                }
				setTimeout(() => {
	                if(donburi) {
	                    donburi.style.display = 'none';
		                donburi.style.contentVisibility = 'none';
					}
				}, 300);
            }
			
	        if (smallOpen && dragSource === 'handle') {
                // Show Dock (Only from Handle)
	            dock.style.display = 'flex';
	            requestAnimationFrame(() => {
	                dock.classList.add('show');
	                dock.style.boxShadow = 'var(--sun-shadow), 0 -2px 10px rgba(0, 0, 0, 0.1)';
	            });
	            appDrawer.style.opacity = '0';
	            appDrawer.classList.remove('open');
	            initialDrawerPosition = -100;
	            interactionBlocker.style.display = 'none';
                applyWallpaperEffects();
                document.body.style.setProperty('--bg-transform-scale', '1.05');				
			    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
				    el.classList.remove('force-hide');
			        el.style.display = el.dataset.originalDisplay;
                    el.style.removeProperty('content-visibility'); 
			        el.style.transition = 'opacity 0.3s ease';
			        requestAnimationFrame(() => { el.style.opacity = '1'; });
			    });
	        } else if (significant) {
                // Execute Action (Open or Close based on direction)
				if (opening) {
                    // Open
                    dock.classList.remove('show');
                    dock.style.boxShadow = 'none';
                    if (dockHideTimeout) clearTimeout(dockHideTimeout);
                    dockHideTimeout = setTimeout(() => { if (!dock.classList.contains('show')) { dock.style.display = 'none'; } }, 300);
                    appDrawer.style.display = 'flex';
                    appDrawer.style.bottom = '0%';
                    appDrawer.style.opacity = '1';
                    appDrawer.classList.add('open');
                    initialDrawerPosition = 0;
                    interactionBlocker.style.display = 'none';
                    updateDockVisibility();
                    applyWallpaperEffects();
                    document.body.style.setProperty('--bg-transform-scale', '1.05');
                    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                        if (!el.dataset.originalDisplay) el.dataset.originalDisplay = window.getComputedStyle(el).display;
                        el.style.transition = 'opacity 0.3s ease';
                        el.style.opacity = '0';
                        setTimeout(() => {
                            el.classList.add('force-hide');
                            el.style.contentVisibility = 'hidden'; 
                        }, 300);
                    });
				} else {
                    // Close
                    dock.classList.remove('show');
                    dock.style.boxShadow = 'none';
                    if (dockHideTimeout) clearTimeout(dockHideTimeout);
                    dockHideTimeout = setTimeout(() => { if (!dock.classList.contains('show')) { dock.style.display = 'none'; } }, 300);
                    appDrawer.classList.remove('open');
                    setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
                    initialDrawerPosition = -100;
                    interactionBlocker.style.display = 'none';
                    updateDockVisibility();
                    applyWallpaperEffects();
                    document.body.style.setProperty('--bg-transform-scale', '1.05');
                    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                        el.classList.remove('force-hide');
                        el.style.display = el.dataset.originalDisplay;
                        el.style.removeProperty('content-visibility');
                        el.style.transition = 'opacity 0.3s ease';
                        requestAnimationFrame(() => { el.style.opacity = '1'; });
                    });
                }
			} else {
                // Snap Back
	            if (startedOpen) {
                    appDrawer.classList.add('open');
                } else {
                    appDrawer.classList.remove('open');
                    setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
                }
	        }
			
            appDrawer.style.bottom = '';
            appDrawer.style.opacity = '';
	        
	        swipeOverlay.style.display = 'none';
	        swipeOverlay.style.pointerEvents = 'none';

			resetIndicatorTimeout();
	    }
		
        // FIX: Unconditionally restore pointer events for ALL iframes
        document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');
	
	    isDragging = false;
        
		// --- Wallpaper Switch Integration ---
        // Only trigger wallpaper swipe if we didn't initiate a vertical drawer move
        // AND we started the gesture on the background (not the drawer handle).
        const swipeDistanceX = touchEndX - touchStartX;
        const swipeDistanceY = touchEndY - touchStartY;
        // Added strict check: vertical movement must be < 40px to prevent diagonal Donburi swipes from switching wallpaper
        if (dragSource === 'body' && Math.abs(swipeDistanceX) > 50 && Math.abs(swipeDistanceY) < 40) {
             handleSwipe();
        }

	    setTimeout(() => {
	        isDrawerInMotion = false;
	    }, 300);
	}

    // --- Wallpaper ---
    let touchStartX = 0, touchStartY = 0;
    let touchEndX = 0, touchEndY = 0;

    function handleSwipe() {
        const swipeDistanceX = touchEndX - touchStartX;
        updatePageIndicator();
        if (recentWallpapers.length >= 2 && Math.abs(swipeDistanceX) > 50) {
            switchWallpaper(swipeDistanceX > 0 ? 'left' : 'right');
        }
    }

    // Add initial swipe detection in app
    function setupAppSwipeDetection() {
        let touchStartY = 0;
        let touchStartTime = 0;
        let isInSwipeMode = false;

	swipeOverlay.addEventListener('touchstart', (e) => {
            // Stop this event from bubbling up to the general document listener.
            // This ensures that when the overlay is active, it takes priority
            // and prevents a double-drag initiation.
            e.stopPropagation(); 
        
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        
            // We also need to start the long-press timer here for the in-app context
            startLongPress(e); 

        }, { passive: true });
        
        swipeOverlay.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });
        
        swipeOverlay.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const deltaY = touchStartY - currentY;
            
            if (deltaY > 25 && !isInSwipeMode) { // Detected upward swipe
                isInSwipeMode = true;
                startDrag(touchStartY);
            }
            
            if (isInSwipeMode) {
                moveDrawer(currentY);
                e.preventDefault(); // Prevent default scrolling when in swipe mode
            }
        }, { passive: false });
        
        swipeOverlay.addEventListener('touchend', () => {
	    cancelLongPress();
		
            if (isInSwipeMode) {
                endDrag();
                isInSwipeMode = false;
            }
        });
        
        // Similar handling for mouse events
        swipeOverlay.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            touchStartY = e.clientY;
            touchStartTime = Date.now();
            startLongPress(e);
        });
        
        swipeOverlay.addEventListener('mousemove', (e) => {
            if (e.buttons !== 1) return; // Only proceed if left mouse button is pressed

	    cancelLongPress();
            
            const deltaY = touchStartY - e.clientY;
            
            if (deltaY > 25 && !isInSwipeMode) {
                isInSwipeMode = true;
                startDrag(touchStartY);
            }
            
            if (isInSwipeMode) {
                moveDrawer(e.clientY);
            }
        });
        
        swipeOverlay.addEventListener('mouseup', () => {
            cancelLongPress();
		
            if (isInSwipeMode) {
                endDrag();
                isInSwipeMode = false;
            }
        });
    }
    
    setupAppSwipeDetection();

	// --- Split Screen Divider Drag Logic ---
    const divider = document.getElementById('split-divider');
    let isDividerDragging = false;
    
    if (divider) {
        const startDividerDrag = (e) => {
            isDividerDragging = true;
            divider.classList.add('active'); 
            e.preventDefault();
            // Disable iframe pointer events so they don't steal the mouse drag
            document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'none');
        };

        const stopDividerDrag = () => {
            if (!isDividerDragging) return;
            isDividerDragging = false;
            divider.classList.remove('active');
            // Restore iframe pointer events
            document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');
        };

        divider.addEventListener('touchstart', startDividerDrag, {passive: false});
        divider.addEventListener('mousedown', startDividerDrag);

        const handleDividerMove = (clientX) => {
            if (!isDividerDragging || !splitScreenState.active) return;
            
            const width = window.innerWidth;
            const percentage = (clientX / width) * 100;
            
            // Snap to close thresholds
            if (percentage < 15) {
                stopDividerDrag();
                exitSplitScreen(splitScreenState.rightAppUrl); // Close Left, Right Survives
            } else if (percentage > 85) {
                stopDividerDrag();
                exitSplitScreen(splitScreenState.leftAppUrl); // Close Right, Left Survives
            } else {
                updateSplitLayout(percentage);
            }
        };

        window.addEventListener('touchmove', (e) => {
            if (isDividerDragging) handleDividerMove(e.touches[0].clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDividerDragging) handleDividerMove(e.clientX);
        });

        window.addEventListener('touchend', stopDividerDrag);
        window.addEventListener('mouseup', stopDividerDrag);
    }

	// --- Helper for Split Gesture Logic ---
    const checkSplitGestureStart = (x, y) => {
        if (oneButtonNavEnabled) return false;
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Only consider if an app is open and not already splitting
        const isOpenSingleApp = document.querySelector('.fullscreen-embed[style*="display: block"]') && !splitScreenState.active && !splitScreenState.isSelecting;
        
        if (isOpenSingleApp && y > height * 0.85) {
            if (x < width * 0.2) { // Bottom-Left Corner
                window.potentialSplitSide = 'left'; // Dragging FROM left = New app on LEFT
                window.splitGestureStart = { x, y };
                return true;
            } else if (x > width * 0.8) { // Bottom-Right Corner
                window.potentialSplitSide = 'right'; // Dragging FROM right = New app on RIGHT
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
    
            // Check for diagonal-up movement
            if (deltaY < -40 && Math.abs(deltaX) > 40) { 
                const side = window.potentialSplitSide;
                
                // Left Corner -> Drag Right -> New App on Left
                if (side === 'left' && deltaX > 0) {
                    initiateSplitScreen('left');
                    window.potentialSplitSide = null;
                    return true;
                }
                // Right Corner -> Drag Left -> New App on Right
                if (side === 'right' && deltaX < 0) {
                    initiateSplitScreen('right');
                    window.potentialSplitSide = null;
                    return true;
                }
            }
        }
        return false;
    };

    // --- Touch Events ---
	document.addEventListener('touchstart', (e) => {
	    if (checkSplitGestureStart(e.touches[0].clientX, e.touches[0].clientY)) return;
        
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const target = e.target;
        
        const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        const isDrawerOpen = appDrawer.classList.contains('open');
        const appDrawerContent = document.querySelector('.app-drawer-content');

        let shouldStart = false;
        dragSource = null;

        if (isAppOpen) {
            // App Open: Handle Only
            if (drawerHandle.contains(target)) {
                shouldStart = true;
                dragSource = 'handle';
            }
        } else {
            if (isDrawerOpen) {
                // Drawer Open: Handle or Top Content
                if (appDrawerHandle.contains(target)) {
                    shouldStart = true;
                    dragSource = 'handle';
                } else if (appDrawer.contains(target) && appDrawerContent && appDrawerContent.scrollTop === 0) {
                    shouldStart = true;
                    dragSource = 'content';
                }
            } else {
                // Home Screen
                const isClockContainer = target.closest('.container');
                if (drawerHandle.contains(target) || appDrawerHandle.contains(target)) {
                    shouldStart = true;
                    dragSource = 'handle';
                } else if (isClockContainer || target === document.body || target.id === 'background-video' || target.id === 'depth-layer' || target.id === 'environment-layer' || target.id === 'time-of-day-overlay') {
                    shouldStart = true;
                    dragSource = 'body';
                }
            }
        }
		
		if (shouldStart) {
            // Set wallpaper start coordinates
            touchStartX = clientX;
            touchStartY = clientY;
            touchEndX = clientX;
            touchEndY = clientY;

            // Ensure logic knows we are starting from open/closed state
            initialDrawerPosition = isDrawerOpen ? 0 : -100;
            prepareDrag(clientX, clientY);
        }
	}, { passive: false });

	document.addEventListener('touchmove', (e) => {
	    if (handleSplitGestureMove(e.touches[0].clientX, e.touches[0].clientY)) {
            e.preventDefault();
            return;
        }
	    if (isDragging) {
            const y = e.touches[0].clientY;
            const isDrawerOpen = appDrawer.classList.contains('open');
            const deltaY = startY - y; // Positive = Up, Negative = Down

            if (isDrawerOpen) {
                // If Drawer Open:
                // Pushing Up (deltaY > 0): Content Scroll. Cancel Drag.
                if (deltaY > 0) {
                    isDragging = false;
                    return; // Allow default scroll
                }
            }

	        e.preventDefault();
	        moveDrawer(e.touches[0].clientX, y);
	    }
	}, { passive: false });

    // --- Mouse Events for Split Gesture ---
    document.addEventListener('mousedown', (e) => {
		if (oneButtonNavEnabled) return;
        if (e.button !== 0) return;
        
        const clientX = e.clientX;
        const clientY = e.clientY;
        const target = e.target;
        
        const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        const isDrawerOpen = appDrawer.classList.contains('open');
        const appDrawerContent = document.querySelector('.app-drawer-content');

        let shouldStart = false;
        dragSource = null;

        if (isAppOpen) {
            if (drawerHandle.contains(target)) {
                shouldStart = true;
                dragSource = 'handle';
            }
        } else {
            if (isDrawerOpen) {
                if (appDrawerHandle.contains(target)) {
                    shouldStart = true;
                    dragSource = 'handle';
                } else if (appDrawer.contains(target) && appDrawerContent && appDrawerContent.scrollTop === 0) {
                    shouldStart = true;
                    dragSource = 'content';
                }
            } else {
                if (drawerHandle.contains(target) || appDrawerHandle.contains(target)) {
                    shouldStart = true;
                    dragSource = 'handle';
                } else {
                    if (target === document.body || target.id === 'background-video' || target.id === 'depth-layer') {
                        shouldStart = true;
                        dragSource = 'body';
                    }
                }
            }
        }

		if (shouldStart) {
            // Set coordinate tracking for mouse-based wallpaper swipes
            touchStartX = clientX;
            touchStartY = clientY;
            touchEndX = clientX;
            touchEndY = clientY;

            initialDrawerPosition = isDrawerOpen ? 0 : -100;
            prepareDrag(clientX, clientY);
        }
    });

	document.addEventListener('mousemove', (e) => {
        // Check split gesture move
        if (e.buttons === 1 && handleSplitGestureMove(e.clientX, e.clientY)) {
            return;
        }

        if (isDragging) {
            // Update coordinates for wallpaper swipe calculation
            touchEndX = e.clientX;
            touchEndY = e.clientY;
            moveDrawer(e.clientX, e.clientY);
        }
    });

    // Reset split gesture on up
    const resetSplitGesture = () => { window.potentialSplitSide = null; };
    document.addEventListener('mouseup', resetSplitGesture);
    document.addEventListener('touchend', resetSplitGesture);

	document.addEventListener('touchmove', (e) => {
	    if (handleSplitGestureMove(e.touches[0].clientX, e.touches[0].clientY)) {
            e.preventDefault();
            return;
        }
        
        if (isPendingDrag && !isDragging) {
            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY = Math.abs(e.touches[0].clientY - startY);
            if (deltaX > 10 || deltaY > 10) {
                startDrag();
            }
        }

	    if (isDragging) {
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;
            const isDrawerOpen = appDrawer.classList.contains('open');
            const deltaX = x - startX;
            const deltaY = startY - y; 
	
	        // Check for a clear DIAGONAL-UP movement
	        if (deltaY < -40 && Math.abs(deltaX) > 40) { 
	            const side = window.potentialSplitSide;
	            // Check direction: swipe inwards from the corner
	            if ((side === 'left' && deltaX > 0) || (side === 'right' && deltaX < 0)) {
	                initiateSplitScreen(side === 'left' ? 'right' : 'left'); // new app opens on opposite side
	                window.potentialSplitSide = null; // Consume gesture
	                e.preventDefault();
	                return;
	            }
	        }
	    }
	    
	    if (isDragging) {
	        e.preventDefault();
	        moveDrawer(e.touches[0].clientX, e.touches[0].clientY);
	    }
	}, { passive: false });

	// Helper to pass click coordinates exactly into the active iframe or system element
    function forwardClickThroughHandle(x, y) {
        const drawerHandle = document.querySelector('.drawer-handle');
        const appDrawerHandle = document.querySelector('.app-drawer-handle');
        const swipeOverlay = document.getElementById('swipe-overlay'); 
        const zoom = (parseFloat(document.body.style.zoom) || 100) / 100;

        // Save original states
        const origDH = drawerHandle ? drawerHandle.style.pointerEvents : '';
        const origADH = appDrawerHandle ? appDrawerHandle.style.pointerEvents : '';
        const origSO = swipeOverlay ? swipeOverlay.style.pointerEvents : '';

        // Temporarily disable pointer events on the handles to "look" through the UI
        if (drawerHandle) drawerHandle.style.pointerEvents = 'none';
        if (appDrawerHandle) appDrawerHandle.style.pointerEvents = 'none';
        if (swipeOverlay) swipeOverlay.style.pointerEvents = 'none';

        // FIX: Ensure all embeds and iframes are temporarily "hittable" so elementFromPoint
        // doesn't fall straight through to the body.
        const hitElements = document.querySelectorAll('.fullscreen-embed, iframe, .dock-icon, .bento-item');
        const origPointerEvents = new Map();
        hitElements.forEach(el => {
            origPointerEvents.set(el, el.style.pointerEvents);
            el.style.pointerEvents = 'auto';
        });

        const el = document.elementFromPoint(x, y);

        // Find the correct iframe (direct hit, or inside the specific embed wrapper we hit)
        let targetIframe = null;
        if (el && el.tagName === 'IFRAME') {
            targetIframe = el;
        } else if (el && el.classList.contains('fullscreen-embed')) {
            targetIframe = el.querySelector('iframe');
        }

		if (targetIframe && targetIframe.contentWindow) {
            // Forward to Gurapp
            const rect = targetIframe.getBoundingClientRect();
            targetIframe.contentWindow.postMessage({
                type: 'forward-click',
                x: (x - rect.left) / zoom,
                y: (y - rect.top) / zoom
            }, '*');
        } else if (el) {
            // System Support - Trigger native click on parent DOM elements (Dock, Home UI, etc.)
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            el.dispatchEvent(clickEvent);
        }

        // Restore original states instantly
        if (drawerHandle) drawerHandle.style.pointerEvents = origDH;
        if (appDrawerHandle) appDrawerHandle.style.pointerEvents = origADH;
        if (swipeOverlay) swipeOverlay.style.pointerEvents = origSO;
        hitElements.forEach(el => {
            el.style.pointerEvents = origPointerEvents.get(el);
        });
    }
	
	document.addEventListener('touchend', (e) => {
		if (oneButtonNavEnabled) return;
        if (isDragging || isPendingDrag) { 
            let isTap = false;
            let tapX = 0, tapY = 0;

            if (e.changedTouches && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const deltaX = Math.abs(touch.clientX - startX);
                const deltaY = Math.abs(touch.clientY - startY);
                const deltaTime = Date.now() - dragStartTime;
                
                // Identify if gesture was a quick tap
                if (deltaX < 15 && deltaY < 15 && deltaTime < 300) {
                    isTap = true;
                    tapX = touch.clientX;
                    tapY = touch.clientY;
                }
            }

            if (isDragging) {
                if (appSwitcherVisible) {
                    selectAndCloseAppSwitcher();
                } else {
                    endDrag();
                }
                isDragging = false; 
            }
            
            isPendingDrag = false;

            // Forward the click if it was a fast tap on the handle
            if (isTap && dragSource === 'handle') {
                forwardClickThroughHandle(tapX, tapY);
            }
        }
    });
	
	// Track global touch time to prevent ghost clicks safely across all scopes
    window.addEventListener('touchstart', () => { window.lastTouchTime = Date.now(); }, { capture: true, passive: true });

    // Handle 3-finger swipe from Gurapps
    window.addEventListener('message', (e) => {
        if (e.data.type === 'three-finger-drag-start') {
            if (document.body.classList.contains('immersive-active')) return;
            dragSource = 'handle';
            const screenY = e.data.y;
            const screenX = window.innerWidth / 2;
            touchStartX = screenX;
            touchStartY = screenY;
            initialDrawerPosition = appDrawer.classList.contains('open') ? 0 : -100;
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

	// Mouse Events for regular drawer interaction
    document.addEventListener('mousedown', (e) => {
		if (oneButtonNavEnabled) return;
        if (e.button !== 0) return;
        // Prevent ghost duplicate clicks when using a touchscreen
        if (Date.now() - (window.lastTouchTime || 0) < 500) return; 

        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // Check if click is on handle area
        if (drawerHandle.contains(element) || appDrawerHandle.contains(element)) {
            startDrag(e.clientX, e.clientY);
        }
    });

	document.addEventListener('mousemove', (e) => {
        // Check split gesture move
        if (e.buttons === 1 && handleSplitGestureMove(e.clientX, e.clientY)) {
            return;
        }

        if (isPendingDrag && !isDragging && e.buttons === 1) {
            const deltaX = Math.abs(e.clientX - startX);
            const deltaY = Math.abs(e.clientY - startY);
            if (deltaX > 10 || deltaY > 10) {
                startDrag();
            }
        }

        if (isDragging) {
            // Update coordinates for wallpaper swipe calculation
            touchEndX = e.clientX;
            touchEndY = e.clientY;
            moveDrawer(e.clientX, e.clientY);
        }
    });

	document.addEventListener('mouseup', (e) => {
		if (oneButtonNavEnabled) return;
        // FIX: Prevent ghost duplicate clicks when using a touchscreen
        // (Browsers fire mouseup a few milliseconds after touchend)
        if (Date.now() - (window.lastTouchTime || 0) < 500) return; 

        if (isDragging || isPendingDrag) { 
            touchEndX = e.clientX;
            touchEndY = e.clientY;

            let isTap = false;
            const deltaX = Math.abs(e.clientX - startX);
            const deltaY = Math.abs(e.clientY - startY);
            const deltaTime = Date.now() - dragStartTime;
            
            // Identify if gesture was a quick tap
            if (deltaX < 15 && deltaY < 15 && deltaTime < 300) {
                isTap = true;
            }

            if (isDragging) {
                if (appSwitcherVisible) {
                    selectAndCloseAppSwitcher();
                } else {
                    endDrag();
                }
                isDragging = false; 
            }
            
            isPendingDrag = false;

            // Forward the click if it was a fast tap on the handle
            if (isTap && dragSource === 'handle') {
                forwardClickThroughHandle(e.clientX, e.clientY);
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (isDrawerInMotion) return; // Do nothing if an animation is in progress

        const isDrawerOpen = appDrawer.classList.contains('open');
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');

		// Close the drawer when clicking outside (on the body)
        if (isDrawerOpen && !openEmbed && !appDrawer.contains(e.target) && !drawerHandle.contains(e.target) && !oneButtonNavHandle.contains(e.target)) {
            appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
            appDrawer.classList.remove('open');
            setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
            initialDrawerPosition = -100;
            interactionBlocker.style.display = 'none';
            applyWallpaperEffects();
            document.body.style.setProperty('--bg-transform-scale', '1.05');			
			// Restore all main UI elements
		    document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
			    el.classList.remove('force-hide');
		        el.style.display = el.dataset.originalDisplay;
                el.style.removeProperty('content-visibility'); // OPTIMIZATION
		        el.style.transition = 'opacity 0.3s ease';
		
		        requestAnimationFrame(() => {
		            el.style.opacity = '1';
		        });
		    });
			resetIndicatorTimeout();
        }

        // Hide the bottom dock if it's visible and the click was outside of it
		const isPinned = localStorage.getItem('dockPinned') === 'true';
        if (!isPinned && dock.classList.contains('show') && !dock.contains(e.target) && !oneButtonNavHandle.contains(e.target)) {
			dock.classList.remove('show');
            dock.style.boxShadow = 'none';
            drawerPill.style.opacity = '1';
            
            // This is the crucial fix: ensure display is set to 'none' after the animation
            if (dockHideTimeout) clearTimeout(dockHideTimeout);
            dockHideTimeout = setTimeout(() => {
                // Check if the dock is still supposed to be hidden before changing display property
                if (!dock.classList.contains('show')) {
                    dock.style.display = 'none';
                }
            }, 300); // Match CSS transition duration
        }
    });

	document.addEventListener('click', (e) => {
	    // Traverse up from target to find the interactive element
	    // We check 5 levels up to catch clicks inside complex buttons
	    let target = e.target;
	    let context = null;
	
	    for (let i = 0; i < 5; i++) {
	        if (!target || target === document.body) break;
	        
	        context = determineSoundContext(target);
	        if (context) break;
	        
	        target = target.parentElement;
	    }
	
	    if (context) {
	        SoundManager.play(context);
	    }
	}, { capture: true }); // Use capture to ensure we hear it even if propagation stops
	
	// Focus sound for text inputs
	document.addEventListener('focus', (e) => {
	    const context = determineSoundContext(e.target);
	    if (context === 'type') {
	        SoundManager.play('type');
	    }
	}, { capture: true });

	document.addEventListener('click', (e) => {
	    const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
	    
	    // Only execute this logic when an embed is open and the dock is showing
	    if (openEmbed && dock.classList.contains('show')) {
	        // If clicked outside the dock
	        if (!dock.contains(e.target)) {
	            dock.classList.remove('show');
	            dock.style.boxShadow = 'none';
	            drawerPill.style.opacity = '1';
	        }
	    }
	});
    
	// Make app drawer transparent when an app is open
    function updateDrawerOpacityForApps() {
        const isDrawerOpen = appDrawer.classList.contains('open');

        // Priority 1: If Drawer is Open, enforce visibility and interaction
        // This prevents the observer from hiding the drawer when it's opened over an app
        if (isDrawerOpen) {
            appDrawer.style.opacity = '1';
            interactionBlocker.style.pointerEvents = 'auto';
            // Hide app swipe overlay so we don't trigger app gestures over the drawer
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
            return;
        }

        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
		const isSelectingSplit = document.querySelector('.fullscreen-embed.split-selecting');
		
		if (openEmbed && !isSelectingSplit) { // Only hide drawer if an app is fully open
		    appDrawer.style.opacity = '0';
            
            // Show the swipe overlay when an app is open
            swipeOverlay.style.display = 'block';
            swipeOverlay.style.pointerEvents = 'auto';
            
            // IMPORTANT FIX: Set pointer-events to none for the blocker when an embed is open
            // so clicks go through to the app (unless blocked by swipeOverlay logic)
            interactionBlocker.style.pointerEvents = 'none';
        } else {
            // Priority 3: Home Screen (No App, No Drawer)
            
            // Hide the swipe overlay
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
            
            // Reset pointer-events. The interaction blocker's visibility (display: none/block)
            // is handled by the drawer gesture logic, so 'auto' here just ensures it works when visible.
            interactionBlocker.style.pointerEvents = 'auto';
        }
    }
    
    // Monitor for opened apps
    const bodyObserver = new MutationObserver(() => {
        updateDrawerOpacityForApps();
    });
    
    bodyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Initial check
    updateDrawerOpacityForApps();
    
    // Ensure box shadow is disabled initially
    dock.style.boxShadow = 'none';
    
	appDrawer.addEventListener('mousemove', resetDrawerInactivityTimer);
    appDrawer.addEventListener('touchstart', resetDrawerInactivityTimer);
    appDrawer.addEventListener('scroll', resetDrawerInactivityTimer);

    interactionBlocker.addEventListener('click', () => {
        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
        appDrawer.classList.remove('open');
        setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
        initialDrawerPosition = -100;
        interactionBlocker.style.display = 'none';
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