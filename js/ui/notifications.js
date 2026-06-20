let unreadNotifications = 0;

function updateStatusIndicator() {
    const el = document.getElementById('status-indicator');
    if (!el) return;

    // Interaction: Click opens Quick Settings (Clock click)
    el.onclick = (e) => {
        e.stopPropagation();
        const clock = document.getElementById('persistent-clock');
        if (clock) clock.click();
    };

    el.innerHTML = '';

    // Priority Logic: Modes override Notifications
    // 1. Night Mode
    if (typeof nightMode !== 'undefined' && nightMode) {
        el.innerHTML = '<span class="material-symbols-rounded">bedtime</span>';
        return;
    }
    // 2. Silent Mode
    if (typeof isSilentMode !== 'undefined' && isSilentMode) {
        el.innerHTML = '<span class="material-symbols-rounded">notifications_off</span>';
        return;
    }
    // 3. Notifications
    if (unreadNotifications > 0) {
        const dot = document.createElement('div');
        dot.className = 'status-dot';
        el.appendChild(dot);
    }
}

function showPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.bottom = '10vh';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.backgroundColor = 'var(--search-background)';
	popup.style.pointerEvents = 'none'
    popup.style.setProperty(
        '--fx-filter',
        'var(--blur1) glass(0.6, 8, 0)'
    );
    popup.style.boxShadow = 'var(--sun-shadow)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '10px 16px';
    popup.style.borderRadius = '40px';
	popup.style.cornerShape = 'round';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '10px';
    popup.style.border = '1px solid var(--glass-border)';
    popup.style.filter = 'none';

    popup.appendChild(document.createTextNode(message));
    
    // Check if the message is about fullscreen and add a button if it is
    if (message === currentLanguage.NOT_FULLSCREEN) {
        if (isFullScreen()) return; // Don't show the popup if already fullscreen
        popup.id = 'fullscreen-prompt-popup'; // Assign an ID to find it later
		
        // Clear existing text content since we only want to show the button
        while (popup.firstChild) {
            popup.removeChild(popup.firstChild);
        }
        // Make the popup background invisible
        popup.style.backgroundColor = 'transparent';
        popup.style.padding = '0';
        popup.style.borderRadius = '500px';
        popup.style.backgroundColor = 'var(--accent)';
        
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.style.width = '100vw';
        fullscreenBtn.style.height = '20vh';
        fullscreenBtn.style.pointerEvents = 'auto';
        fullscreenBtn.style.borderRadius = '500px';
        fullscreenBtn.style.backgroundColor = 'transparent';
        fullscreenBtn.style.border = 'none';
        fullscreenBtn.style.color = 'var(--background-color)';
        fullscreenBtn.style.cursor = 'pointer';
        fullscreenBtn.style.display = 'flex';
        fullscreenBtn.style.alignItems = 'center';
        fullscreenBtn.style.justifyContent = 'center';
        fullscreenBtn.style.gap = '20px';
        fullscreenBtn.style.fontFamily = '"Open Runde", sans-serif';
        fullscreenBtn.style.fontSize = '60px';
        fullscreenBtn.style.fontWeight = 'bold';
        fullscreenBtn.style.zIndex = '9999'; // keep above other content
        
        // Create the icon element
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = 'expand_content';
        icon.style.fontFamily = 'Material Symbols Rounded';
        icon.style.fontSize = '80px';
        icon.style.lineHeight = '1'; // Helps with vertical alignment
        icon.style.display = 'flex'; // Makes the icon behave better for alignment
        icon.style.alignItems = 'center';
    
        // Add the text - use the current language's fullscreen text or fallback to English
        const buttonText = document.createElement('span');
        
        buttonText.textContent = (
            currentLanguage && 
            currentLanguage.FULLSCREEN
        ) || 'Fullscreen';
        
        buttonText.style.lineHeight = '1';
        
        fullscreenBtn.appendChild(icon);
        fullscreenBtn.appendChild(buttonText);
        
        fullscreenBtn.addEventListener('click', function() {
            goFullscreen();
            
            // Remove the popup after clicking the button
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        });
        
        popup.appendChild(fullscreenBtn);
    }
    
    popup.classList.add('popup');

    // Get all existing popups
    const existingPopups = document.querySelectorAll('.popup');
    
    // If there are already 2 popups, remove the oldest one
    if (existingPopups.length >= 2) {
        document.body.removeChild(existingPopups[0]);
    }
    // Recalculate positions for all popups
    const remainingPopups = document.querySelectorAll('.popup');
    remainingPopups.forEach((p, index) => {
        p.style.bottom = `calc(10vh + ${index * 80}px)`; // Base at 10vh, with 80px spacing between popups
    });
    // Position the new popup
    popup.style.bottom = `calc(10vh + ${remainingPopups.length * 80}px)`;
    
	document.body.appendChild(popup);

    // Set a longer timeout for the fullscreen prompt
    const duration = message === currentLanguage.NOT_FULLSCREEN ? 15000 : 5000;

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.filter = 'blur(5px)';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
                // Readjust positions of remaining popups
                const remainingPopups = document.querySelectorAll('.popup');
                remainingPopups.forEach((p, index) => {
                    p.style.bottom = `calc(10vh + ${index * 80}px)`;
                });
            }
        }, 500);
    }, duration);
}

// Notification Queue System
const notificationQueue = [];
let isShowingNotification = false;

function processNotificationQueue() {
    if (isShowingNotification || notificationQueue.length === 0) return;
    
    isShowingNotification = true;
    const { message, options, resolve } = notificationQueue.shift();
    
    const popupControls = createOnScreenPopup(message, options, () => {
        isShowingNotification = false;
        setTimeout(processNotificationQueue, 300); // Delay before next
    });
    
    window.SoundManager.play('notify');
    resolve(popupControls);
}

function showNotification(message, options = {}) {
    // Always create persistent notification in the shade immediately
    const shadeNotification = addToNotificationShade(message, options);
    
    let popupControls = { close: () => {}, update: () => {} };

    // Only queue on-screen popup if silent mode is NOT active
    if (!isSilentMode) {
        // Return a promise-like object structure to maintain API compatibility
        // though the popup won't appear immediately.
        new Promise((resolve) => {
            notificationQueue.push({ message, options, resolve });
            processNotificationQueue();
        }).then(controls => {
            popupControls = controls;
        });
    }
    
    // Return control methods
    return {
        closePopup: () => popupControls.close(),
        closeShade: shadeNotification.close,
        update: (newMessage) => {
            popupControls.update(newMessage);
            shadeNotification.update(newMessage);
        }
    };
}

// Creates a temporary on-screen popup (similar to original showPopup)
function createOnScreenPopup(message, options = {}, onClosed) {
    const popup = document.createElement('div');
    popup.className = 'on-screen-notification';
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.right = '20px';
	popup.style.transform = 'translateY(-150%) scale(0.8)';
	popup.style.transformOrigin = 'right top';
    popup.style.width = 'clamp(200px, 90%, 500px)';
    popup.style.backgroundColor = 'var(--search-background)';
    popup.style.setProperty(
        '--fx-filter',
        'var(--blur1) glass(0.6, 8, 0)'
    );
    popup.style.boxShadow = 'var(--sun-shadow), 0 0 10px rgba(0, 0, 0, 0.2)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '10px 14px 10px 12px';
    popup.style.borderRadius = '35px';
	popup.style.cornerShape = 'superellipse(1.5)';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '12px';
    popup.style.border = '1px solid var(--glass-border)';

    const closeMe = () => {
        clearTimeout(timeoutId);
        popup.style.transform = 'translateY(-150%) scale(0.8)'; // Slide back up
        popup.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(popup)) document.body.removeChild(popup);
            if (onClosed) onClosed();
        }, 300);
    };
    
    // --- Swipe to Dismiss Logic ---
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleStart = (y) => {
        startY = y;
        isDragging = true;
        popup.style.cursor = 'grabbing';
    };

    const handleMove = (y) => {
        if (!isDragging) return;
        currentY = y;
        const deltaY = currentY - startY;
        // Allow dragging up (negative delta) freely, resist dragging down
        const translateY = deltaY < 0 ? deltaY : deltaY * 0.2; 
        popup.style.transform = `translateY(${translateY}px)`;
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        popup.style.cursor = 'grab';
        const deltaY = currentY - startY;

        if (deltaY < -50) { // Swiped up enough
            closeMe();
        } else {
            // Snap back
            popup.style.transform = 'translateY(0)';
        }
    };

    popup.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientY), {passive: true});
    popup.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientY), {passive: true});
    popup.addEventListener('touchend', handleEnd);
    popup.addEventListener('mousedown', (e) => handleStart(e.clientY));
    document.addEventListener('mousemove', (e) => isDragging && handleMove(e.clientY));
    document.addEventListener('mouseup', () => isDragging && handleEnd());
    
    // Check for specific words to determine icon
    const checkWords = window.checkWords || ['updated', 'complete', 'done', 'success', 'completed', 'ready', 'successfully', 'accepted', 'accept', 'yes'];
    const closeWords = window.closeWords || ['failed', 'canceled', 'error', 'failure', 'fail', 'cancel', 'rejected', 'reject', 'not', 'no'];
    
    let iconType = '';
    if (options.icon) {
        iconType = options.icon;
    } else if (checkWords.some(word => message.toLowerCase().includes(word))) {
        iconType = 'check_circle';
    } else if (closeWords.some(word => message.toLowerCase().includes(word))) {
        iconType = 'error';
    } else {
        iconType = 'info';
    }
    
    // Add app icon and title if appName or iconUrl is provided and not a system notification
    const showAppInfo = (!options.system) && (options.iconUrl || (options.appName && apps[options.appName]));
    if (showAppInfo) {
        const appIconContainer = document.createElement('div');
        appIconContainer.className = 'app-icon-img';
        appIconContainer.style.width = '42px';
		appIconContainer.style.flexShrink = '0';
        
        const appIconImg = document.createElement('img');
        appIconImg.className = 'media-widget-app-icon';
        appIconImg.style.display = 'block';
        
        let iconUrl = options.iconUrl;
        if (!iconUrl && apps[options.appName]) {
            iconUrl = apps[options.appName].icon;
            if (!(iconUrl.startsWith('http') || iconUrl.startsWith('/') || iconUrl.startsWith('data:'))) {
                iconUrl = `/assets/appicon/${iconUrl}`;
            }
        }
        appIconImg.src = iconUrl || '/assets/appicon/system.png';
        appIconContainer.appendChild(appIconImg);
        popup.appendChild(appIconContainer);
    }
    
    // Content container
    const contentContainer = document.createElement('div');
    contentContainer.style.width = '-webkit-fill-available';
    contentContainer.style.display = 'flex';
    contentContainer.style.flexDirection = 'column';
    contentContainer.style.gap = '4px';
    
    // Header with icon and heading (Supports 'header' or 'heading' keys)
    const headerTitle = options.header || options.heading;
    if (headerTitle) {
        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.gap = '6px';
        
        const notificationIcon = document.createElement('span');
        notificationIcon.className = 'material-symbols-rounded';
        notificationIcon.style.fontSize = '18px';
        notificationIcon.textContent = iconType;
        headerContainer.appendChild(notificationIcon);
        
        const headingText = document.createElement('span');
        headingText.style.fontWeight = '500';
        headingText.style.fontFamily = "'Open Runde', 'Inter'";
        headingText.textContent = headerTitle;
        headerContainer.appendChild(headingText);
        
        contentContainer.appendChild(headerContainer);
    } else {
        // If no heading, show icon inline (for backward compatibility)
        const headerContainer = document.createElement('div');
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.gap = '6px';
        
        const notificationIcon = document.createElement('span');
        notificationIcon.className = 'material-symbols-rounded';
        notificationIcon.style.fontSize = '18px';
        notificationIcon.textContent = iconType;
        headerContainer.appendChild(notificationIcon);
        
        contentContainer.appendChild(headerContainer);
    }
    
    // Body text
    const messageText = document.createElement('span');
    messageText.textContent = message;
    contentContainer.appendChild(messageText);
    
    popup.appendChild(contentContainer);
    
    // Check if a button should be added
    if (options.buttonText) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.marginTop = '4px';
        
        const actionButton = document.createElement('button');
        actionButton.textContent = options.buttonText;
        actionButton.style.padding = '8px 14px';
        actionButton.style.borderRadius = '40px';
        actionButton.style.border = '1px solid var(--glass-border)';
	    actionButton.style.boxShadow = 'var(--sun-shadow)';
        actionButton.style.backgroundColor = 'var(--accent)';
        actionButton.style.color = 'var(--background-color)';
        actionButton.style.cursor = 'pointer';
		actionButton.style.fontFamily = 'Inter, sans-serif';
		actionButton.style.fontWeight = '500';
        
        // Handle local action or Gurapp-specific action
        if (options.buttonAction && typeof options.buttonAction === 'function') {
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                options.buttonAction();
                closeMe(); // FIX: Call the local close function
            });
        } else if (options.gurappAction && options.gurappAction.appName && options.gurappAction.functionName) {
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const { appName, functionName, args } = options.gurappAction;

                // FIX: Case-insensitive iframe lookup
                let gurappIframe = null;
                const allIframes = document.querySelectorAll('iframe[data-app-id]');
                for (const iframe of allIframes) {
                    if (iframe.dataset.appId.toLowerCase() === appName.toLowerCase()) {
                        gurappIframe = iframe;
                        break;
                    }
                }

                if (gurappIframe && gurappIframe.contentWindow) {
                    const targetOrigin = getOriginFromUrl(gurappIframe.src);
                    gurappIframe.contentWindow.postMessage({
                        type: 'gurapp-action-request',
                        functionName: functionName,
                        args: args || []
                    }, targetOrigin);
                    console.log(`[Polygol] Sent action '${functionName}' to Gurapp '${appName}'.`);
                } else {
                    console.warn(`[Polygol] Could not find Gurapp iframe for '${appName}' to send action '${functionName}'.`);
					showDialog({ 
					    type: 'alert', 
					    title: 'Notification Action Error', 
					    message: `Could not perform action for ${appName}.`
					});
                }
                closeMe(); // FIX: Call the local close function
            });
        }
        
        buttonContainer.appendChild(actionButton);
        contentContainer.appendChild(buttonContainer);
    }
    
	document.body.appendChild(popup);

    void popup.offsetHeight;
    
    // Trigger Entry Animation
    requestAnimationFrame(() => {
        popup.style.transform = 'translateY(0)';
        popup.style.opacity = '1';
    });
    
    // Auto-dismiss duration (Queue system handles one at a time)
    const timeoutId = setTimeout(closeMe, 5000);
    
    // Return control methods
    return {
        close: closeMe,
        update: (newMessage) => {
            const textElement = contentContainer.querySelector('span:last-of-type');
            if (textElement) {
                textElement.textContent = newMessage;
            }
        }
    };
}

function createHomeNotificationElement(message, options, notifId) {
    const div = document.createElement('div');
    div.className = 'home-media-widget home-activity-item';
    div.style.cssText = 'padding: 12px 18px 12px 12px; flex-direction: row; align-items: center; height: 100%;';
    
    let iconUrl = options.iconUrl || '/assets/appicon/default.png';
    if (!options.iconUrl && options.appName && apps[options.appName]) {
        iconUrl = apps[options.appName].icon;
        if (!iconUrl.startsWith('http') && !iconUrl.startsWith('/') && !iconUrl.startsWith('data:')) {
            iconUrl = `/assets/appicon/${iconUrl}`;
        }
    }
    
    const headerTitle = options.header || options.heading || 'Notification';
    const iconType = options.icon || 'notifications';

    div.innerHTML = `
        <div class="app-icon-img" style="width: 42px; flex-shrink: 0; margin-right: 12px;">
            <img src="${iconUrl}" style="display: block; width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div style="display: flex; align-items: flex-start; gap: 12px; width: 100%;">
            <div style="width: -webkit-fill-available; display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="material-symbols-rounded" style="font-size: 18px;">${iconType}</span>
                    <span style="font-weight: 500; font-family: 'Open Runde', Inter;">${headerTitle}</span>
                </div>
                <span style="word-break: break-word;">${message}</span>
            </div>
            <span class="material-symbols-rounded close-home-notif" style="cursor: pointer; font-size: 16px; opacity: 0.5; margin-left: auto; align-self: flex-start; transition: opacity 0.2s;">cancel</span>
        </div>
    `;

    div.querySelector('.close-home-notif').onclick = (e) => {
        e.stopPropagation();
        const shadeNotif = document.querySelector(`.shade-notification[data-notif-id="${notifId}"]`);
        if (shadeNotif) {
            const closeBtn = Array.from(shadeNotif.querySelectorAll('.material-symbols-rounded')).find(el => el.textContent === 'cancel');
            closeBtn?.click();
        }
        HomeActivityManager.unregister(`home-notif-${notifId}`);
    };

    return div;
}

// Adds a notification to the notification shade
function addToNotificationShade(message, options = {}) {
    let shade = document.querySelector('.notification-shade');
    let clearBtn = document.getElementById('notification-clear-btn');
    
    // Only create button if this is a standard notification (Live Activities aren't cleared by it)
    if (!options.liveActivityUrl && !clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.id = 'notification-clear-btn';
        clearBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 16px;">close</span>';
        clearBtn.className = 'btn-qc'; // Reuse quick control style
        clearBtn.style.cssText = `
            background: var(--search-background); backdrop-filter: none; flex-shrink: 0; margin-left: auto; margin-bottom: 10px;
        `;
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            clearAllNotifications();
        };
        shade.appendChild(clearBtn);
    }

    // Helper to check if button should be removed
    const checkShadeState = () => {
        const clearable = shade.querySelectorAll('.shade-notification:not(.live-activity-notification)');
        const btn = document.getElementById('notification-clear-btn');

        // Only remove the button if no clearable notifications remain.
        // We do NOT remove the shade container itself.
        if (clearable.length === 0 && btn) {
            btn.remove();
        }
    };

    if (!options.liveActivityUrl) {
        unreadNotifications++;
        updateStatusIndicator();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'shade-notification';
    notification.style.backgroundColor = 'var(--search-background)';
    notification.style.boxShadow = 'var(--sun-shadow)';
    notification.style.color = 'var(--text-color)';
    notification.style.padding = '10px 14px 10px 12px';
    notification.style.borderRadius = '35px';
    notification.style.cornerShape = 'superellipse(1.5)';
    notification.style.marginBottom = '10px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(50px)';
    notification.style.display = 'flex';
    notification.style.flexDirection = 'row';
	notification.style.alignItems = 'center';
	notification.style.gap = '12px';
    notification.style.border = '1px solid var(--glass-border)';
    notification.style.setProperty(
        '--fx-filter',
        'var(--blur1) glass(0.6, 8, 0)'
    );
    notification.style.pointerEvents = 'auto';
	
	function closeNotification(notif) {
	    // Animate out
	    notification.style.transform = 'translateX(100%)';
		
	    if (options.liveActivityUrl && options.activityId) {
            if (activeLiveActivities[options.activityId]) {
                stopLiveActivity(options.activityId, true);
            }
        } else if (!options.liveActivityUrl) {
            // Standard Notification dismissal
            unreadNotifications = Math.max(0, unreadNotifications - 1);
            updateStatusIndicator();
            // Remove from Home Screen Activity
            HomeActivityManager.unregister(`home-notif-${notif.dataset.notifId}`);
            // Remove from global list
            window.activeNotificationsList = window.activeNotificationsList.filter(n => n.id !== notif.dataset.notifId);
            updateRemoteNotifications();
        }
	        
	    // Remove from shade after animation completes
	    setTimeout(() => {
	        if (shade.contains(notification)) {
	            notification.remove();
				checkShadeState();
	        }
	    }, 300);
	}

    if (options.liveActivityUrl) {
        notification.classList.add('live-activity-notification'); // For custom styling
        notification.dataset.activityId = options.activityId; // For later removal

        const iframe = document.createElement('iframe');
        iframe.src = options.liveActivityUrl;
        iframe.setAttribute('data-gurasuraisu-iframe', 'true');
        iframe.style.width = '100%';
        iframe.style.height = options.height || '60px'; // Default height
        iframe.style.border = 'none';
        iframe.style.padding = '20px 25px';

        notification.style.padding = '0'; // Remove padding for iframe to fit
        notification.appendChild(iframe);
    } else {
        // Add ID for tracking
        notification.dataset.notifId = Date.now() + Math.random();
        
        // Add to global list for remote
        window.activeNotificationsList.push({
            id: notification.dataset.notifId,
            message: message,
            icon: options.icon || 'notifications'
        });
        updateRemoteNotifications();

        // Register as Home Screen Live Activity (Max 2)
        const currentHomeNotifs = HomeActivityManager.items.filter(i => i.id.startsWith('home-notif-'));
        if (currentHomeNotifs.length < 2) {
            const homeEl = createHomeNotificationElement(message, options, notification.dataset.notifId);
            HomeActivityManager.register(`home-notif-${notification.dataset.notifId}`, 'notification', homeEl);
        }
		
		// Add app icon and title if appName is provided and not a system notification
		const showAppInfo = (!options.system) && (options.iconUrl || (options.appName && apps[options.appName]));
		if (showAppInfo) {
			const appIconContainer = document.createElement('div');
			appIconContainer.className = 'app-icon-img';
			appIconContainer.style.width = '42px';
			appIconContainer.style.flexShrink = '0';
			
			const appIconImg = document.createElement('img');
			appIconImg.className = 'media-widget-app-icon';
			appIconImg.style.display = 'block';
            
            let iconUrl = options.iconUrl;
            if (!iconUrl && apps[options.appName]) {
                iconUrl = apps[options.appName].icon;
                if (!(iconUrl.startsWith('http') || iconUrl.startsWith('/') || iconUrl.startsWith('data:'))) {
                    iconUrl = `/assets/appicon/${iconUrl}`;
                }
            }
			appIconImg.src = iconUrl || '/assets/appicon/system.png';
			appIconContainer.appendChild(appIconImg);
			notification.appendChild(appIconContainer);
		}
		
		// Content container
	    const contentContainer = document.createElement('div');
	    contentContainer.style.width = '-webkit-fill-available';
	    contentContainer.style.display = 'flex';
	    contentContainer.style.flexDirection = 'column';
	    contentContainer.style.gap = '4px';
	    
	    let iconTypeForShade = 'notifications'; // Default icon
	    if (options.icon) { // Prefer explicit icon from options
	        iconTypeForShade = options.icon;
	    } else {
	        iconTypeForShade = 'notifications';
	    }
	    
	    // Header with icon and heading (Supports 'header' or 'heading' keys)
        const headerTitle = options.header || options.heading;
	    if (headerTitle) {
	        const headerContainer = document.createElement('div');
	        headerContainer.style.display = 'flex';
	        headerContainer.style.alignItems = 'center';
	        headerContainer.style.gap = '6px';
	        
	        const notificationIcon = document.createElement('span');
	        notificationIcon.className = 'material-symbols-rounded';
	        notificationIcon.style.fontSize = '18px';
	        notificationIcon.textContent = iconTypeForShade;
	        headerContainer.appendChild(notificationIcon);
	        
	        const headingText = document.createElement('span');
	        headingText.style.fontWeight = '500';
	        headingText.style.fontFamily = "'Open Runde', 'Inter'";
	        headingText.textContent = headerTitle;
	        headerContainer.appendChild(headingText);
	        
	        contentContainer.appendChild(headerContainer);
	    } else {
	        // If no heading, show icon inline (for backward compatibility)
	        const headerContainer = document.createElement('div');
	        headerContainer.style.display = 'flex';
	        headerContainer.style.alignItems = 'center';
	        headerContainer.style.gap = '6px';
	        
	        const notificationIcon = document.createElement('span');
	        notificationIcon.className = 'material-symbols-rounded';
	        notificationIcon.style.fontSize = '18px';
	        notificationIcon.textContent = iconTypeForShade;
	        headerContainer.appendChild(notificationIcon);
	        
	        contentContainer.appendChild(headerContainer);
	    }
	    
	    // Create message text
	    const messageText = document.createElement('span');
	    messageText.style.wordBreak = 'break-word';
	    messageText.textContent = message;
	    contentContainer.appendChild(messageText);
	    
	    // Close button
	    const closeBtn = document.createElement('span');
	    closeBtn.className = 'material-symbols-rounded';
	    closeBtn.textContent = 'cancel';
	    closeBtn.style.cursor = 'pointer';
	    closeBtn.style.fontSize = '16px';
	    closeBtn.style.opacity = '0.5';
	    closeBtn.style.marginLeft = 'auto';
	    closeBtn.style.alignSelf = 'flex-start';
	    closeBtn.addEventListener('click', (e) => {
	        e.stopPropagation();
	        closeNotification(notification);
	    });
	    closeBtn.style.transition = 'opacity 0.2s';
		
	    // Wrap content and close button
	    const wrapperContainer = document.createElement('div');
	    wrapperContainer.style.display = 'flex';
	    wrapperContainer.style.alignItems = 'flex-start';
	    wrapperContainer.style.gap = '12px';
	    wrapperContainer.style.width = '100%';
	    
	    wrapperContainer.appendChild(contentContainer);
	    wrapperContainer.appendChild(closeBtn);
	    
	    notification.appendChild(wrapperContainer);
	    
	    // Add action button if specified
	    if (options.buttonText) {
	        const buttonContainer = document.createElement('div');
	        buttonContainer.style.display = 'flex';
	        buttonContainer.style.marginTop = '4px';
	        
	        const actionButton = document.createElement('button');
	        actionButton.textContent = options.buttonText;
	        actionButton.style.padding = '8px 14px';
	        actionButton.style.borderRadius = '40px';
	        actionButton.style.border = '1px solid var(--glass-border)';
	        actionButton.style.backgroundColor = 'var(--accent)';
	        actionButton.style.color = 'var(--background-color)';
	        actionButton.style.cursor = 'pointer';
	        actionButton.style.fontFamily = 'Inter, sans-serif';
			actionButton.style.fontWeight = '500';
	        actionButton.style.transition = 'background-color 0.2s';
			actionButton.style.boxShadow = 'var(--sun-shadow)';
	        
	        // Handle local action or Gurapp-specific action
	        if (options.buttonAction && typeof options.buttonAction === 'function') { // For parent-local actions
	            actionButton.addEventListener('click', (e) => {
	                e.stopPropagation();
	                options.buttonAction();
	                closeNotification(notification);
	            });
	        } else if (options.gurappAction && options.gurappAction.appName && options.gurappAction.functionName) {
	            actionButton.addEventListener('click', (e) => {
	                e.stopPropagation();
	                const { appName, functionName, args } = options.gurappAction;
	
	                // FIX: Case-insensitive iframe lookup
	                let gurappIframe = null;
	                const allIframes = document.querySelectorAll('iframe[data-app-id]');
	                for (const iframe of allIframes) {
	                    if (iframe.dataset.appId.toLowerCase() === appName.toLowerCase()) {
	                        gurappIframe = iframe;
	                        break;
	                    }
	                }
	
	                if (gurappIframe && gurappIframe.contentWindow) {
	                    const targetOrigin = getOriginFromUrl(gurappIframe.src);
	                    gurappIframe.contentWindow.postMessage({
	                        type: 'gurapp-action-request',
	                        functionName: functionName,
	                        args: args || []
	                    }, targetOrigin);
	                    console.log(`[Polygol] Sent action '${functionName}' to Gurapp '${appName}'.`);
	                } else {
	                    console.warn(`[Polygol] Could not find Gurapp iframe for '${appName}' to send action '${functionName}'.`);
						showDialog({ 
						    type: 'alert', 
						    title: 'Notification Action Error', 
						    message: `Could not perform action for ${appName}.`
						});
					}
	                closeNotification(notification); // Close the notification after click
	            });
	        }
	        
	        buttonContainer.appendChild(actionButton);
	        contentContainer.appendChild(buttonContainer);
	    }
	}
    
    // Add swipe capability
    let startX = 0;
    let currentX = 0;
    
    notification.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });
    
    notification.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        
        // Only allow right swipe (positive diff)
        if (diff > 0) {
            notification.style.transform = `translateX(${diff}px)`;
        }
    }, { passive: true });
    
	notification.addEventListener('touchend', () => {
        const diff = currentX - startX;
        if (diff > 100) {
            // Swipe threshold reached: Call the centralized closure function
            closeNotification(notification);
        } else {
            // Snap back
            notification.style.transform = 'translateX(0)';
        }
    });
    
    // Add to notification shade.
    // If clearBtn exists, insert before it. If null (no button), appends to end.
    shade.insertBefore(notification, clearBtn);
    
    // Add to notification shade
    shade.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 50);
    
    // Return object with methods for controlling the notification
    return {
        close: () => closeNotification(notification),
        update: (newMessage) => {
            if (!options.liveActivityUrl) { // Can't update an iframe's content this way
                const textElement = contentContainer.querySelector('span:last-of-type');
                if (textElement) {
                    textElement.textContent = newMessage;
                }
            }
        }
    };
}

function clearAllNotifications() {
    const shade = document.querySelector('.notification-shade');
    if (shade) {
        // 1. Remove Button immediately
        const btn = document.getElementById('notification-clear-btn');
        if (btn) btn.remove();

        // 2. Animate out notifications
        const notifs = shade.querySelectorAll('.shade-notification:not(.live-activity-notification)');
        
        if (notifs.length > 0) {
            notifs.forEach((n, index) => {
                setTimeout(() => {
                    n.style.transform = 'translateX(100px)';
                    n.style.opacity = '0';
                    setTimeout(() => {
                        n.remove();
                        // No shade removal logic here
                    }, 300);
                }, index * 50);
            });
        }
    }
    window.activeNotificationsList = [];
    updateRemoteNotifications();
    unreadNotifications = 0;
    updateStatusIndicator();
}