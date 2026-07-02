
// Map for remote control from the settings app
// Maps the 'data-key' from the settings app to the control 'id' in index.html
const controlIdMap = {
    'adaptiveBatterySaver': 'adaptiveBatterySaver',
    'adaptiveVolume': 'adaptive-volume-switch',
    'aggressiveGC': 'aggressiveGC',
    'aiAssistantEnabled': 'ai-switch',
    'alignment': 'alignment-select',
    'ambientMusicEnabled': 'ambientMusicEnabled',
    'ambientMusicSelection': 'ambientMusicSelection',
    'ambientMusicVolume': 'ambientMusicVolume',
    'animationsEnabled': 'animation-switch',
    'appBadgesEnabled': 'appBadgesEnabled',
    'assistantHistoryRetention': 'assistantHistoryRetention',
    'assistantLang': 'assistantLang',
    'assistantVoicePitch': 'assistantVoicePitch',
    'assistantWakeWord': 'assistantWakeWord',
    'autoClearNotificationsOnSleep': 'autoClearNotificationsOnSleep',
    'autoSleepDuration': 'autoSleepDuration',
    'autoSleepScope': 'autoSleepScope',
    'blueLightReduction': 'blueLightReduction',
    'clearTempCacheOnClose': 'clearTempCacheOnClose',
    'clipboardAccessMode': 'clipboardAccessMode',
    'clockBlendMode': 'clock-blend-mode-select',
    'clockDynamicFillEnabled': 'clock-dynamicfill-switch',
    'clockFormat': 'clock-format-input',
    'clockItalic': 'clock-italic-switch',
    'clockPosX': 'clock-pos-x-slider',
    'clockPosY': 'clock-pos-y-slider',
    'clockSize': 'clock-size-slider',
    'clockStrokeColor': 'clock-stroke-color-picker',
    'clockStrokeWidth': 'clock-stroke-width-slider',
    'color': 'clock-color-picker',
    'colorEnabled': 'clock-color-switch',
    'colorFilter': 'colorFilter',
    'dataSaverEnabled': 'dataSaverEnabled',
    'dateFormat': 'date-format-input',
    'dateOffset': 'date-offset-slider',
    'dateSize': 'date-size-slider',
    'debugOverlayEnabled': 'debugOverlayEnabled',
    'depthEffectEnabled': 'depth-effect-switch',
    'developerConsoleEnabled': 'developerConsoleEnabled',
    'display_temperature': 'thermostat-control',
    'dockPinned': 'dock-pinned-switch',
    'doubleTapToSleep': 'doubleTapToSleep',
    'emergencyContacts': 'emergencyContacts',
    'emergencySleepScreen': 'emergencySleepScreen',
    'emergencySosHotkey': 'emergencySosHotkey',
    'experimentalGpuAccelerate': 'experimentalGpuAccelerate',
    'experimentalWebGL': 'experimentalWebGL',
    'focusDimWallpaper': 'focusDimWallpaper',
    'focusModeEnd': 'focusModeEnd',
    'focusModeSchedule': 'focusModeSchedule',
    'focusModeStart': 'focusModeStart',
    'focusSilenceNotifications': 'focusSilenceNotifications',
    'font': 'font-select',
    'glassEffectsMode': 'glass-effects-mode',
    'glassEnabled': 'clock-glass-switch',
    'gradientColor': 'clock-gradient-color-picker',
    'gradientEnabled': 'clock-gradient-switch',
    'gurappsEnabled': 'gurapps-switch',
    'gurappSoundsEnabled': 'gurapp-sounds-switch',
    'hapticsEnabled': 'haptics-switch',
    'highContrast': 'contrast-switch',
    'hideClockIndicator': 'hideClockIndicator',
    'hideHomeAppNames': 'hideHomeAppNames',
    'homeActivitiesEnabled': 'homeActivitiesEnabled',
    'integrationWebhookUrl': 'integrationWebhookUrl',
    'keyboardNavEnabled': 'keyboardNavEnabled',
    'letterSpacing': 'clock-spacing-slider',
    'liveEnvironmentEnabled': 'live-environment-switch',
    'locationPermissionMode': 'locationPermissionMode',
    'lockHomeLayout': 'lockHomeLayout',
    'master_volume': 'volume-control',
    'minimalMode': 'minimal_mode_qc',
    'networkDnsMode': 'networkDnsMode',
    'nightMode': 'night-mode-qc',
    'nightStandBrightness': 'nightStandBrightness',
    'nightStandEnabled': 'nightStandEnabled',
    'nightStandEnd': 'nightStandEnd',
    'nightStandStart': 'nightStandStart',
    'notificationPreviewLevel': 'notificationPreviewLevel',
    'oledBurnInProtection': 'oled-protection-switch',
    'oneButtonNavEnabled': 'one-button-nav-switch',
    'oskKey': 'oskKey',
    'oskLang': 'oskLang',
    'oskPredict': 'oskPredict',
    'page_brightness': 'brightness-control',
    'predictivePreload': 'predictive-preload-switch',
    'profilySyncStatus': 'profilySyncStatus',
    'profilyUserAvatar': 'profilyUserAvatar',
    'profilyUserName': 'profilyUserName',
    'resourceManagerEnabled': 'resourceManagerEnabled',
    'roundness': 'roundness-slider',
    'screenCurve': 'screen-curve-slider',
    'screenTimeBreakTimer': 'screenTimeBreakTimer',
    'selectedLanguage': 'language-switcher',
    'sedentaryReminderEnabled': 'sedentaryReminderEnabled',
    'sfxVolume': 'sfxVolume',
    'shadowBlur': 'clock-shadow-blur-slider',
    'shadowColor': 'clock-shadow-color-picker',
    'shadowEnabled': 'clock-shadow-switch',
    'showSeconds': 'seconds-switch',
    'showTimezoneLabel': 'showTimezoneLabel',
    'showWeather': 'weather-switch',
    'silentMode': 'silent_switch_qc',
    'sleepModeStyle': 'sleepModeStyleSelect',
    'slideshowInterval': 'slideshowInterval',
    'smartHomePairingMode': 'smartHomePairingMode',
    'stackEnabled': 'clock-stack-switch',
    'standbyOrientation': 'standbyOrientation',
    'syncWidgetsExternalScreen': 'syncWidgetsExternalScreen',
    'system_device_name': 'system_device_name',
    'telemetryEnabled': 'telemetryEnabled',
    'textCase': 'text-case-select',
    'theme': 'theme-switch',
    'timeZoneSelection': 'timeZoneSelection',
    'tintEnabled': 'tint-colors-switch',
    'uiSoundMode': 'ui-sound-mode',
    'use12HourFormat': 'hour-switch',
    'wakeLockMode': 'wake-lock-mode-select',
    'wakeOnMotion': 'wakeOnMotion',
    'wallpaperBlur': 'wallpaper-blur-slider',
    'wallpaperBrightness': 'wallpaper-brightness-slider',
    'wallpaperContrast': 'wallpaper-contrast-slider',
    'wallpaperHue': 'wallpaper-hue-slider',
    'wallpaperSaturate': 'wallpaper-saturate-slider',
    'wallpaperVignette': 'wallpaper-vignette-slider',
    'weight': 'weight-slider',
    'wifiEnabled': 'wifiEnabled'
};

function setupFormatControls() {
    const clockFormatInput = document.getElementById('clock-format-input');
    const dateFormatInput = document.getElementById('date-format-input');
    const secondsSwitch = document.getElementById('seconds-switch');
    const hourSwitch = document.getElementById('hour-switch');

    // Listen for user input
    clockFormatInput.addEventListener('input', () => {
        updateClockAndDate();
    });

    dateFormatInput.addEventListener('input', () => {
        updateClockAndDate();
    });

    // Make the toggles act as quick settings
    secondsSwitch.addEventListener('change', function() {
        let currentFormat = clockFormatInput.value;
        if (this.checked) {
            if (!currentFormat.includes('ss')) {
                currentFormat = currentFormat.replace(/mm(?!:)/, 'mm:ss');
            }
        } else {
            currentFormat = currentFormat.replace(/[:.]ss/, '');
        }
        clockFormatInput.value = currentFormat;
        clockFormatInput.dispatchEvent(new Event('input')); 
        
        // Force immediate loop restart
        if (window.refreshClockUI) window.refreshClockUI();
    });

    hourSwitch.addEventListener('change', function() {
        let currentFormat = clockFormatInput.value;
        if (this.checked) { // 12-hour
            currentFormat = currentFormat.replace(/HH/g, 'h').replace(/H/g, 'h');
            if (!currentFormat.match(/\sA/i)) {
                currentFormat += ' A';
            }
        } else { // 24-hour
            currentFormat = currentFormat.replace(/h/g, 'H');
            currentFormat = currentFormat.replace(/\sA/i, '').trim();
        }
        clockFormatInput.value = currentFormat;
        clockFormatInput.dispatchEvent(new Event('input'));

        // Force immediate loop restart
        if (window.refreshClockUI) window.refreshClockUI();
    });
}

// Load saved preference
const highContrastEnabled = localStorage.getItem('highContrast') === 'true';

// Apply high contrast if enabled (initial state)
if (highContrastEnabled) {
    document.body.classList.add('high-contrast');
}

// Event listener for contrast toggle
function handleContrastChange(e) {
    const highContrast = e.target.checked;
    const value = highContrast.toString();
    localStorage.setItem('highContrast', value);
    if (typeof broadcastSettingUpdate === 'function') broadcastSettingUpdate('highContrast', value);
    document.body.classList.toggle('high-contrast', highContrast);
    
    // Inform iframes
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach((iframe) => {
        if (iframe.contentWindow) {
            const targetOrigin = typeof getOriginFromUrl === 'function' ? getOriginFromUrl(iframe.src) : '*';
            iframe.contentWindow.postMessage({
                type: 'contrastUpdate',
                enabled: highContrast
            }, targetOrigin);
        }
    });
}

// Attach safely once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const __contrastSwitch = document.getElementById('contrast-switch');
    if (__contrastSwitch) {
        __contrastSwitch.checked = highContrastEnabled;
        __contrastSwitch.addEventListener('change', handleContrastChange);
    }
});

// Load saved preference (default to true/on if not set)
const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
const __animationSwitch = document.getElementById('animation-switch');
if (__animationSwitch) {
    __animationSwitch.checked = animationsEnabled;
    __animationSwitch.addEventListener('change', handleAnimationChange);
}
// Apply initial state
if (!animationsEnabled) {
    document.body.classList.add('reduce-animations');
}
// Event listener for animation toggle
function handleAnimationChange() {
    const enableAnimations = this.checked;
    const value = enableAnimations.toString();
    localStorage.setItem('animationsEnabled', value);
    broadcastSettingUpdate('animationsEnabled', value);
    document.body.classList.toggle('reduce-animations', !enableAnimations);
    
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach((iframe) => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'animationsUpdate',
                enabled: enableAnimations
            }, targetOrigin);
        }
    });
}

function updateNetworkInfo() {
    const netIcon = document.querySelector('#network-status-indicator span');
    if (localStorage.getItem('wifiEnabled') === 'false') {
        if (netIcon) netIcon.textContent = 'signal_disconnected';
        return;
    }
	// Check if API is supported
	const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	
	if (!navigator.onLine) {
		if (netIcon) netIcon.textContent = 'signal_disconnected';
		return;
	}

	if (!connection) {
		if (netIcon) netIcon.textContent = 'network_wifi'; // Fallback
		return;
	}

	const type = connection.type; 

	if (type === 'ethernet') {
		if (netIcon) netIcon.textContent = 'settings_ethernet';
		return;
	}

	if (type === 'wifi' || type === 'wimax') {
		// WiFi specific mappings
		switch (connection.effectiveType) {
			case '4g':
				if (netIcon) netIcon.textContent = 'network_wifi'; // Full signal (4)
				break;
			case '3g':
				if (netIcon) netIcon.textContent = 'network_wifi_3_bar';
				break;
			case '2g':
				if (netIcon) netIcon.textContent = 'network_wifi_2_bar';
				break;
			case 'slow-2g':
				if (netIcon) netIcon.textContent = 'network_wifi_1_bar';
				break;
			default:
				if (netIcon) netIcon.textContent = 'signal_wifi_0_bar';
		}
	} else {
		// Cellular mappings (default)
		let iconBase = 'signal_cellular_';
		switch (connection.effectiveType) {
			case '4g':
				if (netIcon) netIcon.textContent = iconBase + '4_bar';
				break;
			case '3g':
				if (netIcon) netIcon.textContent = iconBase + '3_bar';
				break;
			case '2g':
				if (netIcon) netIcon.textContent = iconBase + '2_bar';
				break;
			case 'slow-2g':
				if (netIcon) netIcon.textContent = iconBase + '1_bar';
				break;
			default:
				if (netIcon) netIcon.textContent = iconBase + 'null';
		}
	}
}