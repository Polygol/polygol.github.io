let activeMediaSessionApp = null; // To track which app controls the media widget
let mediaSessionStack = []; // A stack to manage multiple media sessions
let mediaInactivityTimer = null; // Timer to auto-dismiss inactive media
const MEDIA_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

function _handleMediaInactivity(appName, state) {
    if (mediaInactivityTimer) {
        clearTimeout(mediaInactivityTimer);
        mediaInactivityTimer = null;
    }
    if (state === 'paused') {
        mediaInactivityTimer = setTimeout(() => {
            console.log(`[Media] Auto-dismissing inactive media session for ${appName}`);
            clearMediaSession(appName);
        }, MEDIA_TIMEOUT_MS);
    }
}

// --- Media Session Management Functions ---

function showMediaWidget(metadata) {
    const widget = document.getElementById('media-session-widget');
    if (!widget) return;

    localStorage.setItem('lastMediaMetadata', JSON.stringify(metadata));

	// Fallback
    document.getElementById('media-widget-art').src = metadata.artwork[0]?.src || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    document.getElementById('media-widget-title').textContent = metadata.title || 'Unknown Title';
    document.getElementById('media-widget-artist').textContent = metadata.artist || 'Unknown Artist';
    
    widget.style.display = 'flex';
    // Use a timeout to allow the display property to apply before animating opacity/transform
    setTimeout(() => {
        widget.style.opacity = '1';
        widget.style.height = '';
        widget.style.transform = 'scale(1)';
    }, 10);
}

function hideMediaWidget() {
    const widget = document.getElementById('media-session-widget');
    if (!widget) return;

    widget.style.opacity = '0';
    widget.style.height = '0';
    widget.style.transform = 'scale(0.95)';
    setTimeout(() => {
        widget.style.display = 'none';

        // Reset UI elements to default state for the next use
        const appIconEl = document.getElementById('media-widget-app-icon');
        if (appIconEl) appIconEl.style.display = 'none';
        const currentTimeEl = document.getElementById('media-widget-current-time');
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        const durationEl = document.getElementById('media-widget-duration');
        if (durationEl) durationEl.textContent = '0:00';
        const progressEl = document.getElementById('media-widget-progress');
        if (progressEl) progressEl.style.width = '0%';
	    
		const prevBtn = document.getElementById('media-widget-prev');
        const playPauseBtn = document.getElementById('media-widget-play-pause');
        const nextBtn = document.getElementById('media-widget-next');

        if(prevBtn) { prevBtn.disabled = false; prevBtn.style.display = 'block'; }
        if(playPauseBtn) { playPauseBtn.disabled = false; playPauseBtn.style.display = 'block'; }
        if(nextBtn) { nextBtn.disabled = false; nextBtn.style.display = 'block'; }
		
        // RESTORE FAVICON when media widget hides
        restoreCorrectFavicon();
    }, 300);
}

/**
 * Central function to update the media widget based on the current session stack.
 * This should be called any time the stack is modified.
 * @private
 */
function _updateActiveMediaSession() {
    if (mediaSessionStack.length === 0) {
        // If stack is empty, hide the widget and clear all state.
		activeMediaSessionApp = null;
        window.activeMediaSessionApp = null;
        hideMediaWidget();
        IslandManager.remove('system-media');
        HomeActivityManager.unregister('sys-media'); // Hide Home Activity
        // localStorage.removeItem('lastMediaMetadata');
        // localStorage.removeItem('lastMediaSessionApp');
        restoreCorrectFavicon();
        
        if (window.refreshClockUI) window.refreshClockUI();
        return;
    }

    // Get the session at the top of the stack.
    const activeSession = mediaSessionStack[mediaSessionStack.length - 1];
    const { appName, metadata, supportedActions, playbackState } = activeSession;

    // Check Blocking
    const blocked = JSON.parse(localStorage.getItem('blockedActivities') || '[]');
    if (blocked.includes(appName)) {
        hideMediaWidget();
        IslandManager.remove('system-media');
        HomeActivityManager.unregister('sys-media');
        return;
    }
	
    // Update global state and localStorage.
    activeMediaSessionApp = appName;
 	window.activeMediaSessionApp = appName;
    localStorage.setItem('lastMediaSessionApp', appName);

    // Update the widget's UI with the new session's data.
    showMediaWidget(metadata);
    
    // Update Home Screen Activity
    HomeActivityManager.updateMediaUI(metadata, playbackState || 'paused');

    // BROADCAST TO DONBURI
    const donburiFrame = document.querySelector('#donburi-container iframe');
    if (donburiFrame && donburiFrame.contentWindow) {
        const targetOrigin = getOriginFromUrl(donburiFrame.src);
        donburiFrame.contentWindow.postMessage({
            type: 'mediaUpdate',
            metadata: metadata,
            appName: appName,
            playbackState: playbackState || 'paused'
        }, targetOrigin);
    }

    // Restore the playback state (default to paused if not set)
    updateMediaWidgetState(playbackState || 'paused');
    _handleMediaInactivity(appName, playbackState || 'paused');
    
    restoreCorrectFavicon();

    const appIconEl = document.getElementById('media-widget-app-icon');
    if (appIconEl && apps[appName] && apps[appName].icon) {
        let iconUrl = apps[appName].icon;
        if (!(iconUrl.startsWith('http') || iconUrl.startsWith('/') || iconUrl.startsWith('data:'))) {
            iconUrl = `/assets/appicon/${iconUrl}`;
        }
        appIconEl.src = iconUrl;
        appIconEl.style.display = 'block';
        // Ensure parent container is visible if handled via CSS
        if(appIconEl.parentElement) appIconEl.parentElement.style.display = 'block';
    } else if (appIconEl) {
        appIconEl.style.display = 'none';
        if(appIconEl.parentElement) appIconEl.parentElement.style.display = 'none';
    }

    // Refresh clock UI to update media format variables immediately
    if (window.refreshClockUI) window.refreshClockUI();

    // Update control button visibility and state.
    const prevBtn = document.getElementById('media-widget-prev');
    const playPauseBtn = document.getElementById('media-widget-play-pause');
    const nextBtn = document.getElementById('media-widget-next');

    if (prevBtn) {
        prevBtn.disabled = !supportedActions.includes('prev');
        prevBtn.style.display = prevBtn.disabled ? 'none' : 'block';
    }
    if (playPauseBtn) {
        playPauseBtn.disabled = !supportedActions.includes('playPause');
        playPauseBtn.style.display = playPauseBtn.disabled ? 'none' : 'block';
    }
    if (nextBtn) {
        nextBtn.disabled = !supportedActions.includes('next');
        nextBtn.style.display = nextBtn.disabled ? 'none' : 'block';
    }
	
    // Sync with Waves Remote
    if (window.WavesHost) {
        // When a session first loads/activates, we assume 'paused' until the app tells us otherwise
        window.WavesHost.pushMediaUpdate(metadata, appName, 'paused');
    }
	
    const art = metadata.artwork && metadata.artwork[0] ? metadata.artwork[0].src : null;
    IslandManager.update('system-media', 'media', {
        appName: appName,
        imgUrl: art,
        iconString: art ? null : 'music_note'
    });
}

function updateMediaWidgetState(playbackState) {
    // --- Update Icons ---
    const cPanelBtn = document.querySelector('#media-widget-play-pause');
    const cPanelIcon = cPanelBtn?.querySelector('.material-symbols-rounded');

    if (cPanelIcon && cPanelBtn) {
        if (playbackState === 'playing') {
            cPanelIcon.textContent = 'pause';
            cPanelBtn.style.borderRadius = '25px';
			cPanelBtn.style.cornerShape = 'superellipse(1.5)';
        } else {
            cPanelIcon.textContent = 'play_arrow';
			cPanelBtn.style.cornerShape = 'round';
        }
    }
    
    const homeBtn = document.querySelector('#home-media-play-pause');
    const homeIcon = homeBtn?.querySelector('.material-symbols-rounded');
    if (homeIcon) {
        if (playbackState === 'playing') {
            homeIcon.textContent = 'pause';
            homeBtn.style.borderRadius = '25px';
			homeBtn.style.cornerShape = 'superellipse(1.5)';
        } else {
            homeIcon.textContent = 'play_arrow';
			homeBtn.style.cornerShape = 'round';
        }
	}

    // --- Update Progress Bar Visuals (Wave/Straight) ---
    const bars = [
        document.getElementById('media-widget-progress'),
        document.getElementById('home-media-progress')
    ];

    const WAVE_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 10'%3E%3Cpath d='M0,5 Q5,10 10,5 T20,5' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' /%3E%3C/svg%3E\")";
    const LINE_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 10'%3E%3Cpath d='M0,5 L20,5' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' /%3E%3C/svg%3E\")";

    bars.forEach(bar => {
        if (!bar) return;
        
        if (playbackState === 'playing') {
            bar.style.setProperty('--wave', WAVE_SVG);
            bar.style.animation = 'wave-move 1s linear infinite';
        } else {
            bar.style.setProperty('--wave', LINE_SVG);
            bar.style.animation = 'none';
        }
    });

    // BROADCAST TO DONBURI
    const donburiFrame = document.querySelector('#donburi-container iframe');
    if (donburiFrame && donburiFrame.contentWindow) {
        const targetOrigin = getOriginFromUrl(donburiFrame.src);
        donburiFrame.contentWindow.postMessage({
            type: 'playback-state',
            state: playbackState
        }, targetOrigin);
    }
}

// This is the new function that Gurapps will call
function registerMediaSession(appName, metadata, supportedActions = []) {
    if (!appName) return;

    // Find the canonical app name with a case-insensitive search
    const canonicalAppName = Object.keys(apps).find(key => key.toLowerCase() === appName.toLowerCase());

    if (!canonicalAppName) {
        console.warn(`[Polygol Media] Received media session request from an unknown app: "${appName}"`);
        return;
    } 
	
    // Track sender for permissions
    trackActivitySender(canonicalAppName);

	// Remove any previous session from the same app to prevent duplicates
    mediaSessionStack = mediaSessionStack.filter(session => session.appName !== canonicalAppName);

    // Push the new session to the top of the stack
    mediaSessionStack.push({
        appName: canonicalAppName,
        metadata: metadata,
        supportedActions: supportedActions
    });
    
    // Update the UI based on the new stack state
    _updateActiveMediaSession();
}

// A function to clear the session, called when an app is closed/minimized
function clearMediaSession(appName) {
    if (!appName) return;

    // Find the canonical app name to ensure we remove the right one
    const canonicalAppName = Object.keys(apps).find(key => key.toLowerCase() === appName.toLowerCase());
    
    if (canonicalAppName) {
        console.log(`[Polygol] Deregistering media session for "${canonicalAppName}".`);
        // Filter the app out of the stack
        mediaSessionStack = mediaSessionStack.filter(session => session.appName !== canonicalAppName);
        // Update the UI based on the new stack state
        _updateActiveMediaSession();
    }
}

// A function for the Gurapp to update the parent's state
function updateMediaPlaybackState(appName, state) {
    const canonicalName = Object.keys(apps).find(key => key.toLowerCase() === appName.toLowerCase());
    
    // Update the state in the stack storage so it persists if we switch away and back
    if (canonicalName) {
        const session = mediaSessionStack.find(s => s.appName === canonicalName);
        if (session) {
            session.playbackState = state.playbackState;
        }
    }

    // Update UI if this is the active app
    if (activeMediaSessionApp && activeMediaSessionApp.toLowerCase() === appName.toLowerCase()) {
        updateMediaWidgetState(state.playbackState);
        _handleMediaInactivity(appName, state.playbackState);
        
        if (state.metadata) {
            showMediaWidget(state.metadata);
        }

        // Keep clock text variables in sync with metadata updates
        if (window.refreshClockUI) window.refreshClockUI();

		if (window.WavesHost) {
            window.WavesHost.pushMediaUpdate(
                state.metadata || JSON.parse(localStorage.getItem('lastMediaMetadata')), 
                appName, 
                state.playbackState
            );
        }
    }
}

// Add listeners for the new widget's buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('media-widget-play-pause').addEventListener('click', () => {
        if (activeMediaSessionApp) Gurasuraisu.callApp(activeMediaSessionApp, 'playPause');
    });
    document.getElementById('media-widget-next').addEventListener('click', () => {
        if (activeMediaSessionApp) Gurasuraisu.callApp(activeMediaSessionApp, 'next');
    });
    document.getElementById('media-widget-prev').addEventListener('click', () => {
        if (activeMediaSessionApp) Gurasuraisu.callApp(activeMediaSessionApp, 'prev');
    });
});

function updateMediaProgress(appName, progressState) {
    if (activeMediaSessionApp && activeMediaSessionApp.toLowerCase() === appName.toLowerCase()) {
        const progressEl = document.getElementById('media-widget-progress');
        const currentTimeEl = document.getElementById('media-widget-current-time');
        const durationEl = document.getElementById('media-widget-duration');
        
        // Update Home Activity as well (Pass progressState)
        HomeActivityManager.updateMediaUI(null, null, progressState);

        // Update Controls Widget
        if (progressState.duration > 0) {
            const percentage = (progressState.currentTime / progressState.duration) * 100;
            
            if (progressEl) progressEl.style.width = `${percentage}%`;
            
            // Helper to format seconds into MM:SS
            const formatTime = (seconds) => {
                if (isNaN(seconds)) return '0:00';
                const min = Math.floor(seconds / 60);
                const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
                return `${min}:${sec}`;
            };
            
            if (currentTimeEl) currentTimeEl.textContent = formatTime(progressState.currentTime);
            if (durationEl) durationEl.textContent = formatTime(progressState.duration);
        }

	    // BROADCAST TO DONBURI
	    const donburiFrame = document.querySelector('#donburi-container iframe');
	    if (donburiFrame && donburiFrame.contentWindow) {
	        const targetOrigin = getOriginFromUrl(donburiFrame.src);
	        donburiFrame.contentWindow.postMessage({
	            type: 'mediaProgress',
	            currentTime: progressState.currentTime,
	            duration: progressState.duration
	        }, targetOrigin);
	    }
    }
}