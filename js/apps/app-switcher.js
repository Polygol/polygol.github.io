// --- App Switcher State ---
let appSwitcherVisible = false;
let appSwitcherApps = [];
let appSwitcherIndex = 0;
let isAppSwitcherOpen = false;
let appSwitcherScrollInitialized = false;
let isTabKeyDown = false;
let shiftSpaceSequenceTimer = null;

async function captureAppScreenshot(url) {
    // Find the embed
    const container = document.querySelector(`.fullscreen-embed[data-embed-url="${url}"]`);
    if (!container) return;

    const iframe = container.querySelector('iframe');
    if (!iframe) return;

	try {
        // Try to get screenshot via API (if app supports it)
        const ssData = await new Promise((resolve) => {
            const handler = (e) => {
                if (e.source === iframe.contentWindow && e.data.type === 'screenshot-response') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    resolve(e.data.screenshotDataUrl);
                }
            };
            
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler); // OPTIMIZATION: Prevent event listener memory leak
                resolve(null);
            }, 5000); // 5s timeout
            
            window.addEventListener('message', handler);
            
            // Request
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({ type: 'request-screenshot' }, targetOrigin);
        });

		if (ssData) {
            // Save to IndexedDB swap
            SwapManager.set('app_snap_' + url, ssData);
        } else {
            // Fallback removed to save resources. 
            // If the app doesn't support the screenshot API, we simply don't show a preview.
        }

    } catch (e) {
        console.warn("Snapshot failed for", url, e);
    }
}


async function openAppSwitcherUI() {
    if (isAppSwitcherOpen) return;
    
    // 1. If an app is currently open, snapshot it dynamically
	const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
    if (activeEmbed) {
        const url = activeEmbed.dataset.embedUrl;
        // Fire and forget - update UI when ready
        captureAppScreenshot(url).then(async () => {
            const ssData = await SwapManager.get('app_snap_' + url);
            if (isAppSwitcherOpen && ssData) {
                const card = document.querySelector(`.app-switcher-card[data-app-url="${url}"]`);
                if (card) {
                    card.style.backgroundImage = `url('${ssData}')`;
                    // Remove fallback background if it exists
                    const fallback = card.querySelector('.app-switcher-fallback-bg');
                    if (fallback) fallback.remove();
                }
            }
        });
    }

    isAppSwitcherOpen = true;
	
    // Hide UI
    document.getElementById('dock').classList.remove('show');
    const drawerPill = document.querySelector('.drawer-pill');
    if (drawerPill) drawerPill.style.opacity = '0';
	const drawerHandle = document.querySelector('.drawer-handle');
	if (drawerHandle) drawerHandle.style.pointerEvents = 'none';
    const navBtnSmall = document.querySelector('.nav-btn-small');
    if (navBtnSmall) navBtnSmall.style.display = 'none';
    
    const overlay = document.getElementById('app-switcher-ui');
    const container = document.getElementById('app-cards-container');
    
    renderAppCards(container);
    
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('visible'), 10);
}

function closeAppSwitcherUI() {
    isAppSwitcherOpen = false;
    const overlay = document.getElementById('app-switcher-ui');
    overlay.classList.remove('visible');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        
        // Restore UI
	    const drawerPill = document.querySelector('.drawer-pill');
	    if (drawerPill) drawerPill.style.opacity = '1';
		const drawerHandle = document.querySelector('.drawer-handle');
		if (drawerHandle) drawerHandle.style.pointerEvents = 'auto';
	    const navBtnSmall = document.querySelector('.nav-btn-small');
	    if (navBtnSmall) navBtnSmall.style.display = 'flex';
		updateDockVisibility();
    }, 300);
}

function renderAppCards(container) {
    container.innerHTML = '';
    
    // Gather all running apps (Active + Minimized)
    const activeUrl = document.querySelector('.fullscreen-embed[style*="display: block"]')?.dataset?.embedUrl;
    const minimizedUrls = Object.keys(minimizedEmbeds);
    
    // Combine unique URLs
    const allRunningApps = [...new Set([activeUrl, ...minimizedUrls].filter(Boolean))];

    allRunningApps.sort((a, b) => {
        const getName = (u) => Object.keys(apps).find(k => apps[k].url === u);
        const timeA = appLastOpened[getName(a)] || 0;
        const timeB = appLastOpened[getName(b)] || 0;
        
        // Force active app to top if timestamps are equal or missing
        if (a === activeUrl) return -1;
        if (b === activeUrl) return 1;
        
        return timeB - timeA;
    });
        
    if (allRunningApps.length === 0) {
        container.innerHTML = 'No recent items';
        // Allow closing by clicking background
        container.onclick = closeAppSwitcherUI;
        return;
    }

	allRunningApps.forEach((url, index) => {
        const appName = Object.keys(apps).find(k => apps[k].url === url) || 'App';
        const appDetails = apps[appName];
        let iconSrc = appDetails?.icon || 'system.png';
        if (iconSrc && (iconSrc.startsWith('http') || iconSrc.startsWith('/') || iconSrc.startsWith('data:'))) {
            // Use as is
        } else {
            iconSrc = `/assets/appicon/${iconSrc}`;
        }
        
        const card = document.createElement('div');
        card.className = `app-switcher-card ${url === activeUrl ? 'active' : ''}`;
        card.dataset.appUrl = url;
        
        // Background Image (Screenshot)
        // Render fast fallback immediately
        const fallbackBg = document.createElement('div');
        fallbackBg.className = 'app-switcher-fallback-bg'; // Assign class for easy removal
        fallbackBg.style.position = 'absolute';
        fallbackBg.style.width = '100%';
        fallbackBg.style.height = '100%';
        fallbackBg.style.top = '0';
        fallbackBg.style.left = '0';
        fallbackBg.style.backgroundImage = `url('${iconSrc}')`;
        fallbackBg.style.backgroundSize = 'cover';
        fallbackBg.style.backgroundPosition = 'center';
        fallbackBg.style.filter = 'blur(50px)';
        fallbackBg.style.transform = 'scale(1.2)'; 
        card.appendChild(fallbackBg);
        card.style.backgroundColor = 'var(--background-color)';
        card.style.overflow = 'hidden';

        // Async load high-res image from Swap Disk
        SwapManager.get('app_snap_' + url).then(ssData => {
            if (ssData) {
                card.style.backgroundImage = `url('${ssData}')`;
                fallbackBg.remove(); // Remove blur once loaded
            }
        });

		// Icon 
        const iconDiv = document.createElement('div');
        iconDiv.className = 'app-icon-img';
        
        const img = document.createElement('img');
        img.alt = appName;
        img.src = iconSrc;
        
        iconDiv.appendChild(img);
        card.appendChild(iconDiv);

        // Gestures (Swipe up to close, tap to open)
        setupAppCardGestures(card, url, container);

        container.appendChild(card);
    });

    // Scroll to active
    setTimeout(() => {
        const activeCard = container.querySelector('.app-switcher-card.active');
        if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'auto', inline: 'center' });
        }
    }, 0);
}

function setupAppCardGestures(card, url, container) {
    let startY = 0;
    let isSwipingUp = false;
    let startX = 0; // Track X to differentiate scroll from swipe

    const onPointerDown = (e) => {
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        isSwipingUp = false;
        
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('touchmove', onPointerMove, {passive: false});
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
        const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        // If moving vertically significantly more than horizontally
        if (deltaY < -20 && Math.abs(deltaY) > Math.abs(deltaX)) {
            isSwipingUp = true;
            // Visual feedback
            card.style.transform = `translateY(${deltaY}px) scale(0.9)`;
            card.style.opacity = Math.max(0.3, 1 - (Math.abs(deltaY) / 300));
        }
    };

    const onPointerUp = (e) => {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchend', onPointerUp);

        if (isSwipingUp) {
            const currentY = e.type.includes('mouse') ? e.clientY : (e.changedTouches ? e.changedTouches[0].clientY : 0);
            const deltaY = currentY - startY;

			if (deltaY < -150) {
                // CLOSE APP
                card.style.transition = 'transform 0.3s, opacity 0.3s';
                card.style.transform = `translateY(-100vh)`;
                card.style.opacity = '0';
                
                setTimeout(() => {
                    // Use shared function for proper cleanup (Media, Activities, DOM)
                    forceCloseApp(url);
                    
                    // Re-render switcher
                    renderAppCards(container);
                    
                    // If no apps left, close switcher
                    if (container.children.length === 0) closeAppSwitcherUI();
                }, 300);
            } else {
                // Snap back
                card.style.transform = '';
                card.style.opacity = '';
            }
        } else {
            // Tap to Open
            // Only if we didn't drag much
            const currentX = e.type.includes('mouse') ? e.clientX : (e.changedTouches ? e.changedTouches[0].clientX : 0);
            if (Math.abs(currentX - startX) < 10 && Math.abs(e.type.includes('mouse') ? e.clientY : (e.changedTouches ? e.changedTouches[0].clientY : 0) - startY) < 10) {
                closeAppSwitcherUI();
                // Delay slightly to allow UI to fade
                setTimeout(() => {
                    createFullscreenEmbed(url);
                }, 100);
            }
        }
    };

    card.addEventListener('mousedown', onPointerDown);
    card.addEventListener('touchstart', onPointerDown, {passive: false});
}

// --- App Switcher Functions ---
function openAppSwitcher() {
    if (document.body.classList.contains('immersive-active')) return;
	
    // Force Close App Drawer if it's open
    const appDrawer = document.getElementById('app-drawer');
	if (appDrawer && appDrawer.classList.contains('open')) {
        appDrawer.classList.remove('open');
        appDrawer.style.bottom = '';
        appDrawer.style.opacity = '';
        appDrawer.style.zIndex = '';
        setTimeout(() => { if (!appDrawer.classList.contains('open')) appDrawer.style.display = 'none'; }, 300);
        
        // Restore Main UI visibility
        document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
            el.classList.remove('force-hide');
            el.style.display = el.dataset.originalDisplay || '';
            el.style.opacity = '1';
            el.style.removeProperty('content-visibility');
        });
        
        // Hide Drawer Blocker
        const interactionBlocker = document.getElementById('interaction-blocker');
        if(interactionBlocker) interactionBlocker.style.display = 'none';
    }

    const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
    const openUrl = openEmbed ? openEmbed.dataset.embedUrl : null;
    const minimizedUrls = Object.keys(minimizedEmbeds);

    // --- Group open apps and splits ---
    let displayItems = [];
    const openAndMinimizedUrls = [...new Set([openUrl, ...minimizedUrls].filter(Boolean))];
    const handledUrls = new Set();

    if (splitScreenState.active) {
        const leftUrl = splitScreenState.leftAppUrl;
        const rightUrl = splitScreenState.rightAppUrl;
        
        // Use the most recent timestamp of the pair
        const appNameL = Object.keys(apps).find(n => apps[n].url === leftUrl);
        const appNameR = Object.keys(apps).find(n => apps[n].url === rightUrl);
        const ts = Math.max(appLastOpened[appNameL] || 0, appLastOpened[appNameR] || 0);

        displayItems.push({
            type: 'split',
            leftUrl: leftUrl,
            rightUrl: rightUrl,
            timestamp: ts
        });
        
        handledUrls.add(leftUrl);
        handledUrls.add(rightUrl);
    }
	
    // Then, add any remaining single apps
    openAndMinimizedUrls.forEach(url => {
        if (!handledUrls.has(url)) {
            const appName = Object.keys(apps).find(n => apps[n].url === url);
            displayItems.push({
                type: 'single',
                url: url,
                timestamp: appLastOpened[appName] || 0
            });
        }
    });
    
    // Sort by most recently used
    displayItems.sort((a, b) => b.timestamp - a.timestamp);

    // Add App Library (Drawer) at the start
    displayItems.unshift({
        type: 'drawer',
        name: 'App Library',
        url: 'internal://library'
    });

    if (displayItems.length < 2) return; // Need at least Drawer + 1 App to switch

    appSwitcherVisible = true;
    appSwitcherApps = displayItems; 

    const switcherList = document.getElementById('app-switcher-list');
    switcherList.innerHTML = '';

    const fragment = document.createDocumentFragment();

    appSwitcherApps.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'app-switcher-item';

        if (item.type === 'drawer') {
            // Render Drawer Icon
            const imgContainer = document.createElement('div');
            imgContainer.className = 'app-icon-img';
            imgContainer.style.display = 'flex';
            imgContainer.style.alignItems = 'center';
            imgContainer.style.justifyContent = 'center';
            imgContainer.style.background = 'var(--accent)';
            
            // Use Material Symbol for Apps
            imgContainer.innerHTML = `<span class="material-symbols-rounded" style="font-size: 36px; color: var(--background-color);">action_key</span>`;
            
            itemDiv.appendChild(imgContainer);
            itemDiv.dataset.type = 'drawer';
            switcherList.appendChild(itemDiv);
            return; // Skip standard processing
        }

        const createIcon = (url) => {
            const appName = Object.keys(apps).find(name => apps[name].url === url) || '...';
            const iconSrc = apps[appName]?.icon;
            const imgContainer = document.createElement('div');
            imgContainer.className = 'app-icon-img';
            
            let finalSrc = '';
            if (iconSrc) {
                if (iconSrc.startsWith('http') || iconSrc.startsWith('/') || iconSrc.startsWith('data:')) {
                    finalSrc = iconSrc;
                } else {
                    finalSrc = `/assets/appicon/${iconSrc}`;
                }
            }
            
            imgContainer.innerHTML = `<img src="${finalSrc}" alt="${appName}">`;
            return imgContainer;
        };
        
        if (item.type === 'split') {
            itemDiv.classList.add('is-split-pair');
            const appNameL = Object.keys(apps).find(n => n.url === item.leftUrl) || 'App';
            const appNameR = Object.keys(apps).find(n => n.url === item.rightUrl) || 'App';
            
            itemDiv.appendChild(createIcon(item.leftUrl));
            itemDiv.appendChild(createIcon(item.rightUrl));
            itemDiv.dataset.leftUrl = item.leftUrl;
            itemDiv.dataset.rightUrl = item.rightUrl;

        } else { // Single app
            const appName = Object.keys(apps).find(name => apps[name].url === item.url) || 'Unknown App';
            itemDiv.appendChild(createIcon(item.url));
            itemDiv.dataset.url = item.url;
        }
        
        fragment.appendChild(itemDiv);
    });
    
    switcherList.appendChild(fragment);

	// Determine initial selection
    const currentItemIndex = appSwitcherApps.findIndex(item => 
        (item.type === 'split' && (item.leftUrl === openUrl || item.rightUrl === openUrl)) ||
        (item.type === 'single' && item.url === openUrl)
    );
    const nextIndex = currentItemIndex >= 0 ? (currentItemIndex + 1) % appSwitcherApps.length : 0;
    updateSwitcherSelection(nextIndex);

    const overlay = document.getElementById('app-switcher-overlay');
    overlay.style.display = 'block';
    setTimeout(() => {
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateX(-50%) scale(1)';
    }, 10);
}

function updateSwitcherSelection(index) {
    if (!appSwitcherVisible) return;
    
    // Clamp the index to stay within the bounds of the app list
    const clampedIndex = Math.max(0, Math.min(index, appSwitcherApps.length - 1));
    
    // Only update if the index has actually changed
    if (clampedIndex === appSwitcherIndex) return;

    appSwitcherIndex = clampedIndex;
    
    document.querySelectorAll('.app-switcher-item').forEach((item, i) => {
        item.classList.toggle('selected', i === appSwitcherIndex);
    });
}

function discardAndCloseAppSwitcher() {
    if (!appSwitcherVisible) return;

    appSwitcherVisible = false;
    isDragging = false; // Stop the current drag operation completely

    // FIX: Ensure pointer events are restored for iframes if drag was abandoned
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');

    const overlay = document.getElementById('app-switcher-overlay');
    overlay.style.transition = 'opacity 0.2s ease'; // Simple fade
    overlay.style.opacity = '0';
    // Remove transform modification to prevent jumping/scaling
    
    setTimeout(() => {
        overlay.style.display = 'none';
        // Reset transform for next opening if needed, though default CSS usually handles it
        overlay.style.transform = ''; 
    }, 200);

    // Make the gesture overlay non-interactive since the action is cancelled
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.pointerEvents = 'none';
    }
}

function selectAndCloseAppSwitcher() {
    if (!appSwitcherVisible) return;
    
    appSwitcherVisible = false; // Immediately disable further input.
    isDragging = false; // Ensure dragging state is always reset.

    // FIX: Ensure pointer events are restored for iframes
    document.querySelectorAll('iframe').forEach(f => f.style.pointerEvents = 'auto');

	const selectedItem = appSwitcherApps[appSwitcherIndex];
    
	if (selectedItem.type === 'drawer') {
        // Open App Drawer
        const appDrawer = document.getElementById('app-drawer');
        const dock = document.getElementById('dock');
        
        // 1. Hide Dock if showing
        if (dock) {
             dock.classList.remove('show');
             dock.style.boxShadow = 'none';
        }

        // 2. Open Drawer (Ensure Z-Index is above current app)
        appDrawer.style.display = 'flex';
        requestAnimationFrame(() => {
            appDrawer.classList.add('open');
            appDrawer.style.zIndex = '1005';
            appDrawer.style.bottom = '0%';
            appDrawer.style.opacity = '1';
            createAppIcons(); 
        });
        createAppIcons(); 
        
        // 3. Only restore background UI if NO app is open (Optimization)
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (!openEmbed) {
            document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid').forEach(el => {
                el.classList.remove('force-hide');
                el.style.display = el.dataset.originalDisplay || '';
                el.style.opacity = '1';
                el.style.removeProperty('content-visibility');
            });
        }

        // 4. Update Indicators & Interaction Blocker
        const interactionBlocker = document.getElementById('interaction-blocker');
        if(interactionBlocker) {
            interactionBlocker.style.display = 'block';
            interactionBlocker.style.pointerEvents = 'auto';
        }
        resetIndicatorTimeout();
        
    } else if (selectedItem.type === 'split') {
	    // This is a split pair, restore it
	    if (!splitScreenState.active) { // only restore if not already active
	        exitSplitScreen(null); // Clear any single app
	        splitScreenState.active = true;
	        splitScreenState.leftAppUrl = selectedItem.leftUrl;
	        splitScreenState.rightAppUrl = selectedItem.rightUrl;
            splitScreenState.lastSplitPair = { left: selectedItem.leftUrl, right: selectedItem.rightUrl };
	
	        createFullscreenEmbed(selectedItem.leftUrl, { isSplitActivation: true, splitSide: 'left' });
	        createFullscreenEmbed(selectedItem.rightUrl, { isSplitActivation: true, splitSide: 'right' });
	        
	        document.getElementById('split-divider').style.display = 'flex';
	        updateSplitLayout(50);
	    }
	} else {
	    // This is a single app
        // FIX: Handle "creating split with existing app" logic if currently selecting
        if (splitScreenState.isSelecting) {
            finalizeSplitScreen(selectedItem.url);
        } else {
    	    createFullscreenEmbed(selectedItem.url);
        }
	}

    const overlay = document.getElementById('app-switcher-overlay');
    overlay.style.transition = 'opacity 0.2s ease'; // Simple fade
    overlay.style.opacity = '0';
    // Remove transform modification to prevent jumping/scaling
    
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.transform = ''; 
    }, 200);
}
