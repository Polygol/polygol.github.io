
// Map for remote control from the settings app
// Maps the 'data-key' from the settings app to the control 'id' in index.html
const controlIdMap = {
    'theme': 'theme-switch',
    'tintEnabled': 'tint-colors-switch',
    'animationsEnabled': 'animation-switch',
    'highContrast': 'contrast-switch',
    'gurappsEnabled': 'gurapps-switch',
    'aiAssistantEnabled': 'ai-switch',
    'oneButtonNavEnabled': 'one-button-nav-switch',
    'font': 'font-select',
    'weight': 'weight-slider',
    'roundness': 'roundness-slider',
    'clockSize': 'clock-size-slider',
    'showSeconds': 'seconds-switch',
    'use12HourFormat': 'hour-switch',
    'stackEnabled': 'clock-stack-switch',
    'clockPosX': 'clock-pos-x-slider',
    'clockPosY': 'clock-pos-y-slider',
    'alignment': 'alignment-select',
    'colorEnabled': 'clock-color-switch',
    'gradientEnabled': 'clock-gradient-switch',
    'glassEnabled': 'clock-glass-switch',
    'clockDynamicFillEnabled': 'clock-dynamicfill-switch',
    'color': 'clock-color-picker',
    'gradientColor': 'clock-gradient-color-picker',
    'shadowEnabled': 'clock-shadow-switch',
    'shadowBlur': 'clock-shadow-blur-slider',
    'shadowColor': 'clock-shadow-color-picker',
    'dateFormat': 'date-format-input',
    'clockFormat': 'clock-format-input',
    'wallpaperBlur': 'wallpaper-blur-slider',
    'wallpaperBrightness': 'wallpaper-brightness-slider',
    'wallpaperContrast': 'wallpaper-contrast-slider',
    'glassEffectsMode': 'glass-effects-mode', 
	'tintEnabled': 'tint-colors-switch',
    'showWeather': 'weather-switch',
    'page_brightness': 'brightness-control',
    'display_temperature': 'thermostat-control',
    'nightMode': 'night-mode-qc',
    'master_volume': 'volume-control',
    'minimalMode': 'minimal_mode_qc',
    'silentMode': 'silent_switch_qc',
    'selectedLanguage': 'language-switcher',
    'sleepModeStyle': 'sleepModeStyleSelect',
    'slideshowInterval': 'slideshowInterval',
    'hideClockIndicator': 'hideClockIndicator',
    'autoSleepDuration': 'autoSleepDuration',
    'autoSleepScope': 'autoSleepScope',
    'persistentPageIndicator': 'persistent-indicator-switch',
    'dockPinned': 'dock-pinned-switch',
    'homeActivitiesEnabled': 'homeActivitiesEnabled',
    'wakeLockMode': 'wake-lock-mode-select',
	'depthEffectEnabled': 'depth-effect-switch',
	'liveEnvironmentEnabled': 'live-environment-switch',
    'uiSoundMode': 'ui-sound-mode',
    'gurappSoundsEnabled': 'gurapp-sounds-switch',
    'screenCurve': 'screen-curve-slider',
    'letterSpacing': 'clock-spacing-slider',
    'textCase': 'text-case-select',
    'dateSize': 'date-size-slider',
    'dateOffset': 'date-offset-slider',
    'clockItalic': 'clock-italic-switch',
    'clockStrokeWidth': 'clock-stroke-width-slider',
    'clockStrokeColor': 'clock-stroke-color-picker',
    'clockBlendMode': 'clock-blend-mode-select',
    'wallpaperSaturate': 'wallpaper-saturate-slider',
    'wallpaperHue': 'wallpaper-hue-slider',
    'wallpaperVignette': 'wallpaper-vignette-slider',
    'nightStandEnabled': 'nightStandEnabled',
    'nightStandStart': 'nightStandStart',
    'nightStandEnd': 'nightStandEnd',
    'nightStandBrightness': 'nightStandBrightness',
    'colorFilter': 'colorFilter',
    'sfxVolume': 'sfxVolume',
    'keyboardNavEnabled': 'keyboardNavEnabled',
    'telemetryEnabled': 'telemetryEnabled',
    'hideHomeAppNames': 'hideHomeAppNames',
    'lockHomeLayout': 'lockHomeLayout',
    'wakeOnMotion': 'wakeOnMotion',
    'standbyOrientation': 'standbyOrientation',
    'wifiEnabled': 'wifiEnabled',
    'dataSaverEnabled': 'dataSaverEnabled',
    'networkDnsMode': 'networkDnsMode',
    'experimentalGpuAccelerate': 'experimentalGpuAccelerate',
    'experimentalWebGL': 'experimentalWebGL',
    'aggressiveGC': 'aggressiveGC',
    'debugOverlayEnabled': 'debugOverlayEnabled',
    'assistantWakeWord': 'assistantWakeWord',
    'assistantLang': 'assistantLang',
    'assistantVoicePitch': 'assistantVoicePitch',
    'assistantHistoryRetention': 'assistantHistoryRetention',
    'focusModeSchedule': 'focusModeSchedule',
    'focusModeStart': 'focusModeStart',
    'focusModeEnd': 'focusModeEnd',
    'focusSilenceNotifications': 'focusSilenceNotifications',
    'focusDimWallpaper': 'focusDimWallpaper',
    'ambientMusicEnabled': 'ambientMusicEnabled',
    'ambientMusicSelection': 'ambientMusicSelection',
    'ambientMusicVolume': 'ambientMusicVolume',
    'timeZoneSelection': 'timeZoneSelection',
    'showTimezoneLabel': 'showTimezoneLabel',
    'appBadgesEnabled': 'appBadgesEnabled',
    'autoClearNotificationsOnSleep': 'autoClearNotificationsOnSleep',
    'notificationPreviewLevel': 'notificationPreviewLevel',
    'oskKey': 'oskKey',
    'oskLang': 'oskLang',
    'oskPredict': 'oskPredict',
    'sedentaryReminderEnabled': 'sedentaryReminderEnabled',
    'screenTimeBreakTimer': 'screenTimeBreakTimer',
    'blueLightReduction': 'blueLightReduction',
    'profilyUserName': 'profilyUserName',
    'profilyUserAvatar': 'profilyUserAvatar',
    'profilySyncStatus': 'profilySyncStatus',
    'emergencySosHotkey': 'emergencySosHotkey',
    'emergencySleepScreen': 'emergencySleepScreen',
    'emergencyContacts': 'emergencyContacts',
    'locationPermissionMode': 'locationPermissionMode',
    'clipboardAccessMode': 'clipboardAccessMode',
    'clearTempCacheOnClose': 'clearTempCacheOnClose',
    'integrationWebhookUrl': 'integrationWebhookUrl',
    'syncWidgetsExternalScreen': 'syncWidgetsExternalScreen',
    'smartHomePairingMode': 'smartHomePairingMode',
    'developerConsoleEnabled': 'developerConsoleEnabled',
    'adaptiveBatterySaver': 'adaptiveBatterySaver',
    'sleepModeStyle': 'sleepModeStyleSelect',
    'autoSleepDuration': 'autoSleepDuration',
    'autoSleepScope': 'autoSleepScope',
    'dockPinned': 'dock-pinned-switch',
    'persistentPageIndicator': 'persistent-indicator-switch',
    'hideClockIndicator': 'hideClockIndicator',
    'system_device_name': 'system_device_name',
    'doubleTapToSleep': 'doubleTapToSleep',
    'sfxVolume': 'sfxVolume',
    'adaptiveVolume': 'adaptive-volume-switch',
    'hapticsEnabled': 'haptics-switch',
    'depthEffectEnabled': 'depth-effect-switch',
    'wakeLockMode': 'wake-lock-mode-select',
    'resourceManagerEnabled': 'resourceManagerEnabled',
    'predictivePreload': 'predictive-preload-switch',
    'selectedLanguage': 'language-switcher',
    'use12HourFormat': 'hour-switch',
    'homeActivitiesEnabled': 'homeActivitiesEnabled',
    'oledBurnInProtection': 'oled-protection-switch'
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

const persistentClock = document.getElementById('persistent-clock');

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