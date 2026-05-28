let activeIslands = []; // Objects: { id, type, content, lastUpdated }
let activeLiveActivities = {}; // Stores info about active activities by ID

const IslandManager = {
    update(id, type, data) {
        const timestamp = Date.now();
        const existingIndex = activeIslands.findIndex(i => i.id === id);
        // Merge existing data if updating to preserve text/icon if only one changes
        const existingData = existingIndex > -1 ? activeIslands[existingIndex].data : {};
        const newData = { ...existingData, ...data };

        const islandData = { id, type, data: newData, lastUpdated: timestamp };

        if (existingIndex > -1) {
            activeIslands[existingIndex] = islandData;
        } else {
            activeIslands.unshift(islandData);
        }

        activeIslands.sort((a, b) => b.lastUpdated - a.lastUpdated);
        this.render();
        updateTitle();
        restoreCorrectFavicon();
    },

    remove(id) {
        activeIslands = activeIslands.filter(i => i.id !== id);
        this.render();
        updateTitle();
        restoreCorrectFavicon();
    },

    render() {
        const container = document.getElementById('activity-island');
        if (!container) return;
        
        const toShow = activeIslands.slice(0, 2);
        const activeIds = new Set(toShow.map(i => i.id));

        // 1. Remove stale elements
        Array.from(container.children).forEach(child => {
            if (!activeIds.has(child.dataset.islandId)) {
                child.remove();
            }
        });
        
        // 2. Create or Update elements
	    toShow.forEach(item => {
            // Try to find existing element for this activity ID
            let el = container.querySelector(`.activity-capsule[data-island-id="${item.id}"]`);
            
            if (!el) {
                el = document.createElement('div');
                el.className = 'activity-capsule';
                el.dataset.islandId = item.id;
                // Append immediately so we can work with it
                container.appendChild(el);
            } else {
                // If it exists, appendChild moves it to the correct sorted position without destroying it
                container.appendChild(el);
            }
	        
	        // Check text first to apply container class
	        const hasText = item.data.text && item.data.text.trim().length > 0;
            if (hasText) el.classList.add('has-text');
            else el.classList.remove('has-text');
	
	        let canonicalAppName = item.data.appName;
	        let appDef = null;
	        if (canonicalAppName) {
	            if (!apps[canonicalAppName]) {
	                const match = Object.keys(apps).find(k => k.toLowerCase() === canonicalAppName.toLowerCase());
	                if (match) canonicalAppName = match;
	            }
	            appDef = apps[canonicalAppName];
	        }
	
	        // --- RENDER CONTENT (Update in place) ---
            
            // 1. Icon Management
            let iconEl = el.firstElementChild;
            let desiredTag = 'IMG'; // Default
            
            if (!item.data.imgUrl && item.data.iconString) {
                desiredTag = 'SPAN';
            }

            // If the existing icon is the wrong type (or missing), replace it
            if (!iconEl || iconEl.tagName !== desiredTag || iconEl.classList.contains('activity-text')) {
                if (iconEl && !iconEl.classList.contains('activity-text')) iconEl.remove();
                
                if (desiredTag === 'IMG') {
                    iconEl = document.createElement('img');
                    iconEl.onerror = () => { iconEl.src = '/assets/appicon/system.png'; };
                    el.prepend(iconEl);
                } else {
                    iconEl = document.createElement('span');
                    iconEl.className = 'material-symbols-rounded';
                    el.prepend(iconEl);
                }
            }

            // Update Icon Data
            if (desiredTag === 'IMG') {
                let targetSrc = item.data.imgUrl;
                if (!targetSrc) {
                    // App Icon Fallback
                    targetSrc = '/assets/appicon/system.png';
                    if (appDef && appDef.icon) {
                        const rawIcon = appDef.icon;
                        if (rawIcon.startsWith('http') || rawIcon.startsWith('/') || rawIcon.startsWith('data:')) {
                            targetSrc = rawIcon;
                        } else {
                            targetSrc = `/assets/appicon/${rawIcon}`;
                        }
                    }
                }
                // Only update DOM if source actually changed to prevent flicker
                if (el.dataset.lastIconSrc !== targetSrc) {
                    iconEl.src = targetSrc;
                    el.dataset.lastIconSrc = targetSrc;
                }
            } else {
                // Material Symbol Update
                if (iconEl.textContent !== item.data.iconString) {
                    iconEl.textContent = item.data.iconString;
                }
            }
	        
	        // 2. Text Management
            let textEl = el.querySelector('.activity-text');
	        if (hasText) {
                if (!textEl) {
                    textEl = document.createElement('span');
                    textEl.className = 'activity-text';
                    el.appendChild(textEl);
                }
                // Only update text content if it changed
                if (textEl.textContent !== item.data.text) {
                    textEl.textContent = item.data.text;
                }
	        } else if (textEl) {
                textEl.remove();
            }
	        
	        // Update Click Action
	        el.onclick = (e) => {
	            e.stopPropagation();
                if (item.data.openUrl) createFullscreenEmbed(item.data.openUrl);
	            else if (appDef) createFullscreenEmbed(appDef.url);
	            else if (item.data.url) createFullscreenEmbed(item.data.url);
	        };
	    });

        // 3. Update Persistent Clock Styling based on Island State
        const persistentClock = document.querySelector('.persistent-clock');
        if (persistentClock) {
            if (toShow.length > 0) {
                persistentClock.classList.add('island-active');
            } else {
                persistentClock.classList.remove('island-active');
            }
        }
    }
};

function trackActivitySender(appName) {
    try {
        let senders = JSON.parse(localStorage.getItem('appsWithActivities') || '[]');
        if (!senders.includes(appName)) {
            senders.push(appName);
            localStorage.setItem('appsWithActivities', JSON.stringify(senders));
        }
    } catch(e) { console.error("Failed to track activity sender", e); }
}

// --- Home Screen Activity Manager ---
const HomeActivityManager = {
    enabled: true,
    position: 'bl', // tl, tr, bl, br
    items: [], // { id, type, element }
    currentIndex: 0,
    container: null,
    
    init() {
        this.container = document.getElementById('home-activity-container');
        if (!this.container) return;
        
        // Load Settings
        this.enabled = localStorage.getItem('homeActivitiesEnabled') !== 'false';
        this.position = localStorage.getItem('homeActivityPos') || 'bl';
        
        this.container.classList.add(`pos-${this.position}`);
        
        this.setupInteractions();
        this.updateVisibility();
        
        // Bind media buttons
        document.getElementById('home-media-prev')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeMediaSessionApp) Gurasuraisu.callApp(activeMediaSessionApp, 'prev');
        });
        document.getElementById('home-media-play-pause')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeMediaSessionApp) Gurasuraisu.callApp(activeMediaSessionApp, 'playPause');
        });
        document.getElementById('home-media-next')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeMediaSessionApp) Gurasuraisu.callApp(activeMediaSessionApp, 'next');
        });
        document.getElementById('home-media-art')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeMediaSessionApp && apps[activeMediaSessionApp]) {
                createFullscreenEmbed(apps[activeMediaSessionApp].url);
            }
        });
    },
    
    setEnabled(state) {
        this.enabled = state === 'true' || state === true;
        this.updateVisibility();
    },
	
    register(id, type, element) {
        // Prevent duplicates and unnecessary focus switches on updates
        const existingIdx = this.items.findIndex(i => i.id === id);
        if (existingIdx !== -1) {
            // Update reference if needed, but don't switch focus
            this.items[existingIdx].element = element;
            // Ensure it's in DOM
            if (element.parentElement !== this.container) {
                this.container.appendChild(element);
            }
            return;
        }
        
        this.items.push({ id, type, element });
        
        // If element is not already in container (e.g. Media widget is pre-baked), append it
        if (element.parentElement !== this.container) {
            this.container.appendChild(element);
        }
        
        // Switch to new item automatically (Most recently added priority)
        this.currentIndex = this.items.length - 1;
        this.render();
        this.updateVisibility();
    },
    
    unregister(id) {
        const idx = this.items.findIndex(i => i.id === id);
        if (idx === -1) return;
        
        const item = this.items[idx];
        // If it's a dynamic iframe, remove it from DOM. 
        // If it's the static media widget, hide it but keep in DOM.
        if (item.type !== 'media') {
            item.element.remove();
        } else {
            item.element.classList.remove('active');
        }
        
        this.items.splice(idx, 1);
        if (this.currentIndex >= this.items.length) {
            this.currentIndex = Math.max(0, this.items.length - 1);
        }
        this.render();
        this.updateVisibility();
    },
    
    render() {
        // Hide all
        this.items.forEach(i => i.element.classList.remove('active'));
        
        // Show current
        if (this.items.length > 0) {
            this.items[this.currentIndex].element.classList.add('active');
        }
    },
    
    // Forward data to iframes (for Live Activities)
    forwardMessage(id, data) {
        const item = this.items.find(i => i.id === id);
        if (item && item.type === 'iframe' && item.element.contentWindow) {
             const targetOrigin = getOriginFromUrl(item.element.src);
             item.element.contentWindow.postMessage({ type: 'live-activity-update', ...data }, targetOrigin);
        }
    },
    
    updateMediaUI(metadata, playbackState, progressState) {
        const widget = document.getElementById('home-media-widget');
        if (!widget) return;

        // Ensure registered (safe to call repeatedly due to new check in register)
        this.register('sys-media', 'media', widget);
        
        if (metadata) {
            const titleEl = document.getElementById('home-media-title');
            const artistEl = document.getElementById('home-media-artist');
            const artEl = document.getElementById('home-media-art');
            
            if (titleEl) titleEl.textContent = metadata.title || 'Unknown';
            if (artistEl) artistEl.textContent = metadata.artist || 'Unknown';
            if (artEl) artEl.src = metadata.artwork?.[0]?.src || '';
        }
        
        if (playbackState) {
            const icon = document.querySelector('#home-media-play-pause span');
            if(icon) icon.textContent = playbackState === 'playing' ? 'pause' : 'play_arrow';
        }

        if (progressState && progressState.duration > 0) {
            const percent = (progressState.currentTime / progressState.duration) * 100;
            const bar = document.getElementById('home-media-progress');
            if (bar) bar.style.width = `${percent}%`;
        }
    },

	updateVisibility() {
        const hasItems = this.items.length > 0;
        const appOpen = document.body.classList.contains('app-active');
        const drawerOpen = document.getElementById('app-drawer').classList.contains('open');
        const donburiOpen = document.getElementById('donburi-container')?.classList.contains('open');
        
        if (this.enabled && hasItems && !appOpen && !drawerOpen && !donburiOpen && !document.body.classList.contains('blackout-active')) {
            this.container.style.display = 'flex';
            document.body.classList.add('home-activities-visible');
            // Slight delay to allow display:flex to apply before opacity transition
            requestAnimationFrame(() => this.container.style.opacity = '1');
        } else {
            this.container.style.opacity = '0';
            document.body.classList.remove('home-activities-visible');
            setTimeout(() => {
                if (this.container.style.opacity === '0') this.container.style.display = 'none';
            }, 300);
        }
    },

    setupInteractions() {
        let longPressTimer;
        let isDragging = false;
        let startX, startY;
        
        const start = (e) => {
            if (e.target.closest('button')) return; 
            
            startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            this.swiped = false; // Reset swipe state on new interaction
            
            longPressTimer = setTimeout(() => {
                isDragging = true;
                this.container.classList.add('dragging');
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        };
        
        const move = (e) => {
            const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            const dx = cx - startX;
            const dy = cy - startY;

            // 5px Deadzone: Ignore jitter/micro-movements
            if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

            if (!isDragging) {
                // If we've already swiped during this touch/click, don't react again
                if (this.swiped) return;

                // Vertical Swipe logic
                if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) {
                    clearTimeout(longPressTimer);
                    if (this.items.length > 1) {
                        this.swiped = true; // Consume the gesture
                        if (dy > 0) { // Down (Previous)
                             this.currentIndex = (this.currentIndex > 0) ? this.currentIndex - 1 : this.items.length - 1;
                        } else { // Up (Next)
                             this.currentIndex = (this.currentIndex < this.items.length - 1) ? this.currentIndex + 1 : 0;
                        }
                        this.render();
                    }
                }
                return;
            }
			
            e.preventDefault();
            clearTimeout(longPressTimer);
            
            this.container.style.left = `${cx - 160}px`; // Center anchor (width 320)
            this.container.style.top = `${cy - 75}px`;
            this.container.style.bottom = 'auto';
            this.container.style.right = 'auto';
        };
        
        const end = (e) => {
            clearTimeout(longPressTimer);
            if (isDragging) {
                isDragging = false;
                this.container.classList.remove('dragging');
                
                // Snap to corner
                const w = window.innerWidth;
                const h = window.innerHeight;
                const cx = e.type.includes('mouse') ? e.clientX : (e.changedTouches ? e.changedTouches[0].clientX : startX);
                const cy = e.type.includes('mouse') ? e.clientY : (e.changedTouches ? e.changedTouches[0].clientY : startY);
                
                const left = cx < w / 2;
                const top = cy < h / 2;
                
                // Safely remove old position classes without wiping visibility classes
                this.container.classList.remove('pos-tl', 'pos-tr', 'pos-bl', 'pos-br');
                
                if (top && left) this.position = 'tl';
                else if (top && !left) this.position = 'tr';
                else if (!top && left) this.position = 'bl';
                else this.position = 'br';
                
                this.container.classList.add(`pos-${this.position}`);
                this.container.style.left = '';
                this.container.style.top = '';
                this.container.style.bottom = '';
                this.container.style.right = '';
                
                localStorage.setItem('homeActivityPos', this.position);
            }
        };

        this.container.addEventListener('mousedown', start);
        this.container.addEventListener('touchstart', start, {passive:true});
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, {passive:false});
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }
};

/**
 * Starts a new Live Activity.
 * @param {object} options - Configuration for the activity.
 * @param {string} options.activityId - A unique ID from the calling app for this activity.
 * @param {string} options.url - The URL for the iframe content.
 * @param {boolean} [options.homescreen=false] - If true, this activity can show a summary on the homescreen.
 * @param {boolean} [options.showInIsland=true] - Set to false to hide this from the Dynamic Area (Activity Island).
 * @param {string} [options.height='120px'] - The height of the activity in the notification shade.
 */
function startLiveActivity(appName, options) {
    if (!appName || !options || !options.activityId || !options.url) {
        console.error('[Live Activity] Start failed: appName, activityId and url are required.');
        return;
    }

    // 1. Check Blocking
    const blocked = JSON.parse(localStorage.getItem('blockedActivities') || '[]');
    if (blocked.includes(appName)) return;

    // 2. Track Sender
    trackActivitySender(appName);

    const canonicalName = Object.keys(apps).find(k => k.toLowerCase() === appName.toLowerCase()) || appName;

    // If an activity with this ID already exists, stop it first.
    if (activeLiveActivities[options.activityId]) {
        stopLiveActivity(options.activityId);
    }

    const notificationControl = addToNotificationShade('', {
        liveActivityUrl: options.url,
        activityId: options.activityId,
        height: options.height
    });

    activeLiveActivities[options.activityId] = {
        appName: appName,
        options: options,
        notificationControl: notificationControl
    };

    // Inform Donburi that a new activity has started
    const donburiFrame = document.querySelector('#donburi-container iframe');
    if (donburiFrame && donburiFrame.contentWindow) {
        donburiFrame.contentWindow.postMessage({
            type: 'system-live-activity-start',
            appName,
            options
        }, getOriginFromUrl(donburiFrame.src));
    }

    // If it's a homescreen activity, show the container.
    if (options.homescreen) {
        // Create Iframe for Home Activity
        const iframe = document.createElement('iframe');
        iframe.src = options.url;
        iframe.setAttribute('data-gurasuraisu-iframe', 'true');
        iframe.style.cssText = "width: 100%; padding: 20px 25px; overflow: hidden;";
        iframe.className = 'home-activity-item';
        
	    HomeActivityManager.register(options.activityId, 'iframe', iframe);
    }
	
    if (options.showInIsland !== false) {
        IslandManager.update(options.activityId, 'live-activity', {
            appName: canonicalName, 
            url: options.url,
            openUrl: options.openUrl,
            iconString: options.icon || null
        });
    } else {
        IslandManager.remove(options.activityId);
    }
}

/**
 * Forwards an update message from a main app to its corresponding live activity iframe.
 * @param {string} activityId - The ID of the activity to update.
 * @param {object} data - The payload to send to the iframe.
 */
function updateLiveActivity(activityId, data) {
    const activity = activeLiveActivities[activityId];
    if (activity) {
        const notificationElem = document.querySelector(`.live-activity-notification[data-activity-id="${activityId}"]`);
        if (notificationElem) {
			const iframe = notificationElem.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                const targetOrigin = getOriginFromUrl(iframe.src);
                iframe.contentWindow.postMessage({ type: 'live-activity-update', ...data }, targetOrigin);
            }
        }
        
        // Forward to Home Screen Activity (if exists)
        HomeActivityManager.forwardMessage(activityId, data);

        // REDIRECT TO DONBURI: Forward data updates
        const donburiFrame = document.querySelector('#donburi-container iframe');
        if (donburiFrame && donburiFrame.contentWindow) {
            donburiFrame.contentWindow.postMessage({
                type: 'system-live-activity-update',
                activityId,
                data
            }, getOriginFromUrl(donburiFrame.src));
        }
		
        // Only update the island if allowed by initial start options
        if (activity.options.showInIsland !== false) {
            const islandUpdate = {
                appName: activity.appName,
                url: activity.options.url
            };

            let hasUpdates = false;

            if (data.icon) {
                islandUpdate.iconString = data.icon;
                hasUpdates = true;
            }
            
            if (data.text) {
                islandUpdate.text = data.text;
                hasUpdates = true;
            }

            if (hasUpdates) {
                 IslandManager.update(activityId, 'live-activity', islandUpdate);
                 updateStatusIndicator();
            }
        }
    }
}

/**
 * Stops an active Live Activity.
 * @param {string} activityId - The ID of the activity to stop.
 */
function stopLiveActivity(activityId, fromNotification = false) {
    const activity = activeLiveActivities[activityId];
    if (activity) {
        // 1. Remove from Home Screen Activity
        if (activity.options.homescreen) {
            HomeActivityManager.unregister(activityId);
        }

        // 2. Remove from Dynamic Area (Island)
        IslandManager.remove(activityId);

        // 3. Remove from Registry
        // We delete it before closing the notification to ensure any side-effects don't see it as active
        delete activeLiveActivities[activityId];

        // REDIRECT TO DONBURI: Inform Donburi to clear the smart area
        const donburiFrame = document.querySelector('#donburi-container iframe');
        if (donburiFrame && donburiFrame.contentWindow) {
            donburiFrame.contentWindow.postMessage({
                type: 'system-live-activity-stop',
                activityId
            }, getOriginFromUrl(donburiFrame.src));
        }

        // 4. Close the notification shade item
        // Only do this if the stop command didn't come FROM the notification itself (e.g. swipe dismiss)
        if (!fromNotification && activity.notificationControl) {
            activity.notificationControl.close(); 
        }
    }
}

function doesAppHaveActiveLiveActivity(appName) {
    if (!appName) return false;
    return Object.values(activeLiveActivities).some(activity => activity.appName === appName);
}