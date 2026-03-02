async function handleWakeLockVisibilityChange() {
    // Only re-acquire if we are in Modern mode and the tab becomes visible
    // Legacy video usually keeps playing or resumes automatically depending on browser
    const mode = localStorage.getItem('wakeLockMode') || 'modern';
    
    if (document.visibilityState === 'visible') {
        if (mode === 'modern' && wakeLockSentinel === null) {
            await applyWakeLockSettings();
        } else if (mode === 'legacy' && legacyVideoElement && legacyVideoElement.paused) {
            legacyVideoElement.play().catch(e => console.warn("Resume legacy failed", e));
        }
    }
}

// --- Screen Wake Lock ---
const LEGACY_WAKE_LOCK_VIDEO = "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=";
let wakeLockSentinel = null;
let legacyVideoElement = null;

async function applyWakeLockSettings() {
    const mode = localStorage.getItem('wakeLockMode') || 'modern';
    
    // 1. Cleanup existing locks
    if (wakeLockSentinel) {
        await wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
    }
    if (legacyVideoElement) {
        legacyVideoElement.pause();
        legacyVideoElement.src = "";
        legacyVideoElement.remove();
        legacyVideoElement = null;
    }

    if (mode === 'disabled') {
        console.log('[WakeLock] Disabled by user settings.');
        return;
    }

    if (mode === 'modern') {
        if ('wakeLock' in navigator) {
            try {
                wakeLockSentinel = await navigator.wakeLock.request('screen');
                wakeLockSentinel.addEventListener('release', () => {
                    console.log('[WakeLock] Modern lock released.');
                    // If released by system (tab switch), we rely on visibilitychange to re-acquire
                    wakeLockSentinel = null;
                });
                console.log('[WakeLock] Modern API active.');
            } catch (err) {
                console.error(`[WakeLock] Modern API failed: ${err.name}, ${err.message}`);
            }
        } else {
            console.warn('[WakeLock] Modern API selected but not supported by this browser.');
        }
    } else if (mode === 'legacy') {
        console.log('[WakeLock] Activating Legacy Video Loop.');
        legacyVideoElement = document.createElement('video');
        legacyVideoElement.setAttribute('playsinline', '');
        legacyVideoElement.setAttribute('loop', '');
        legacyVideoElement.setAttribute('muted', '');
        legacyVideoElement.style.position = 'fixed';
        legacyVideoElement.style.top = '0';
        legacyVideoElement.style.left = '0';
        legacyVideoElement.style.width = '1px';
        legacyVideoElement.style.height = '1px';
        legacyVideoElement.style.opacity = '0.01';
        legacyVideoElement.style.pointerEvents = 'none';
        legacyVideoElement.src = LEGACY_WAKE_LOCK_VIDEO;
        
        document.body.appendChild(legacyVideoElement);
        
        try {
            await legacyVideoElement.play();
        } catch (e) {
            console.warn('[WakeLock] Legacy video autoplay failed (interaction required?):', e);
        }
    }
}

function blackoutScreen() {
    // FIX: Don't re-apply if already in blackout mode
    if (document.body.classList.contains('blackout-active')) return;

    closeControls();

    // Store previous settings
    previousBlackoutSettings = {
        highContrast: localStorage.getItem('highContrast') || 'false',
        animationsEnabled: localStorage.getItem('animationsEnabled') || 'true'
    };

    // 1. Handle the currently active app
    const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
    if (activeEmbed) {
        const activeUrl = activeEmbed.dataset.embedUrl;
        const activeAppName = Object.keys(apps).find(name => apps[name].url === activeUrl);
        if (activeAppName === activeMediaSessionApp || doesAppHaveActiveLiveActivity(activeAppName)) {
            minimizeFullscreenEmbed(); // Minimize if it has media or a live activity
        } else {
            closeFullscreenEmbed(); // Close active non-essential app
        }
    }

    // 2. Clean up all other minimized apps that are not essential
    const urlsToRemove = [];
    for (const url in minimizedEmbeds) {
        const appName = Object.keys(apps).find(name => apps[name].url === url);
        // Add to removal list if it's NOT the media app AND does NOT have a live activity
        if (appName !== activeMediaSessionApp && !doesAppHaveActiveLiveActivity(appName)) {
            urlsToRemove.push(url);
        }
    }

	urlsToRemove.forEach(url => {
        forceCloseApp(url);
    });
	
    // Apply power saving settings
    setControlValueAndDispatch('highContrast', 'true');
    setControlValueAndDispatch('animationsEnabled', 'false');

    const sleepStyle = localStorage.getItem('sleepModeStyle') || 'dim-show';
    document.body.classList.add('blackout-active', `blackout-style-${sleepStyle}`);

    pauseAllAnimations(); // Pause animations on sleep

    // Create a new full-screen overlay to capture all events
    const blockingOverlay = document.createElement('div');
    blockingOverlay.id = 'blackout-event-overlay';
    blockingOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 48; cursor: pointer; pointer-events: all;
        background-color: transparent; transition: background-color 0.2s;
    `;
    document.body.appendChild(blockingOverlay);
    
    // After 200ms, enable interaction to prevent immediate dismissal on touch devices
    setTimeout(() => {
        const blocker = document.getElementById('blackout-event-overlay');
        if (blocker) {
            blocker.style.pointerEvents = 'all';
            blocker.addEventListener('click', exitBlackoutMode, { once: true });
            blocker.addEventListener('touchstart', exitBlackoutMode, { once: true });
        }
    }, 200);
}

function exitBlackoutMode() {
    // Restore previous settings
    setControlValueAndDispatch('highContrast', previousBlackoutSettings.highContrast || 'false');
    setControlValueAndDispatch('animationsEnabled', previousBlackoutSettings.animationsEnabled || 'true');

    document.body.classList.remove('blackout-active', 'blackout-style-dim-show', 'blackout-style-dim-hide', 'blackout-style-hide-show', 'blackout-style-off');

	resumeAllAnimations(); // Resume animations on wake

    const blocker = document.getElementById('blackout-event-overlay');
    if (blocker) {
        blocker.style.backgroundColor = 'transparent';
        blocker.style.pointerEvents = 'none';
        setTimeout(() => {
            blocker.remove();
        }, 200);
    }
}

function resetAutoSleepTimer() {
    clearTimeout(autoSleepTimer);

    // Don't start the sleep timer if a legacy app is active,
    // as we can't detect user activity within it.
    const isLegacyAppOpen = !!document.querySelector('.fullscreen-embed.legacy[style*="display: block"]');
    if (isLegacyAppOpen) {
        return;
    }

    const duration = parseInt(localStorage.getItem('autoSleepDuration') || '0', 10);
    const scope = localStorage.getItem('autoSleepScope') || 'home';

    if (duration === 0) return; // If set to "Never", do nothing.

    const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
    const isDrawerOpen = appDrawer.classList.contains('open');

    let shouldBeActive = false;
    if (scope === 'home') {
        // Only active on the home screen
        if (!isAppOpen && !isDrawerOpen) {
            shouldBeActive = true;
        }
    } else if (scope === 'home-apps') {
        // Always active, regardless of home screen, app, or drawer state.
        // The legacy app check at the top of the function is the only exclusion.
        shouldBeActive = true;
    }

    if (shouldBeActive) {
        autoSleepTimer = setTimeout(blackoutScreen, duration);
    }
}