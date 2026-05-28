window.onload = function() {
    if (window.polygolHasCrashed) { return; } // Abort if a crash was detected
    ensureVideoLoaded();
    consoleLoaded();
	checkFullscreen();
    promptToInstallPWA();
};

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Swap Partition and clear stale data from previous sessions
    await SwapManager.init();
    await SwapManager.clear();
	
    // --- Load ALL data and settings first ---
    requestPersistentStorage();
    loadUserInstalledApps(); // **CRITICAL: Load user apps before creating any UI**
    loadSavedData();         // Load usage and lastOpened data
    startOledProtection();
	loadRecentWallpapers();
    applyWallpaper();
    loadAvailableWidgets(); 
	setupStickerControls();
    initializeWallpaperTracking();
    DynamicEnvironmentManager.init();
    ResourceManager.init();
    HomeActivityManager.init(); // Initialize Home Activity Manager
    initPredictivePreload();
    setTimeout(migrateWallpapersColor, 2000); 

    // --- Perform initial setup that depends on the loaded data ---
    await firstSetup(); // This handles language and sets isDuringFirstSetup flag
    
    // --- Initialize UI components ---
    await initializeAndApplyWallpaper().catch(error => {
        console.error("Error initializing wallpaper:", error);
    });

    setInterval(ensureVideoLoaded, 60000);

    setTimeout(() => {
        if (typeof updateClockAndDate === 'function') updateClockAndDate();
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 1000);
        }

        setTimeout(() => {
            document.querySelectorAll('.container, .widget-grid, #dynamic-area').forEach(el => {
                el.style.opacity = '';
                el.style.scale = '';
            });
        }, 300);
    }, 2000);

    const oneButtonNavSwitch = document.getElementById('one-button-nav-switch');
    if (oneButtonNavSwitch) {
        oneButtonNavSwitch.checked = oneButtonNavEnabled;
        updateOneButtonNavVisibility(); // Set initial state
    
        oneButtonNavSwitch.addEventListener('change', function() {
            oneButtonNavEnabled = this.checked;
            localStorage.setItem('oneButtonNavEnabled', oneButtonNavEnabled);
            updateOneButtonNavVisibility();
        });
    }
    setupOneButtonNav();

    // Sound Settings
    const soundModeSelect = document.getElementById('ui-sound-mode');
    if (soundModeSelect) {
        soundModeSelect.value = localStorage.getItem('uiSoundMode') || 'silent_off';
        soundModeSelect.addEventListener('change', function() {
            localStorage.setItem('uiSoundMode', this.value);
            broadcastSettingUpdate('uiSoundMode', this.value);
        });
    }

    const gurappSoundSwitch = document.getElementById('gurapp-sounds-switch');
    if (gurappSoundSwitch) {
        const val = localStorage.getItem('gurappSoundsEnabled');
        gurappSoundSwitch.checked = val === null ? true : val === 'true'; // Default true
        gurappSoundSwitch.addEventListener('change', function() {
            localStorage.setItem('gurappSoundsEnabled', this.checked);
            broadcastSettingUpdate('gurappSoundsEnabled', this.checked.toString());
        });
    }

    const persistentIndicatorSwitch = document.getElementById('persistent-indicator-switch');
    if (persistentIndicatorSwitch) {
        // Load initial state
        persistentIndicatorSwitch.checked = localStorage.getItem('persistentPageIndicator') === 'true';
        
        // Add listener
        persistentIndicatorSwitch.addEventListener('change', function() {
            localStorage.setItem('persistentPageIndicator', this.checked);
            // Broadcast to settings if needed, though direct interaction handles local
            resetIndicatorTimeout(); // Apply visual changes immediately
        });
        
        // Apply immediately on load
        resetIndicatorTimeout();
    }

    const dockPinnedSwitch = document.getElementById('dock-pinned-switch');
    if (dockPinnedSwitch) {
        dockPinnedSwitch.checked = localStorage.getItem('dockPinned') === 'true';
        dockPinnedSwitch.addEventListener('change', function() {
            localStorage.setItem('dockPinned', this.checked);
            updateDockVisibility(); // Apply immediately
        });
    }
    
    // Initial check
    updateDockVisibility();

    const wakeLockSelect = document.getElementById('wake-lock-mode-select');
    if (wakeLockSelect) {
        wakeLockSelect.value = localStorage.getItem('wakeLockMode') || 'modern';
        
        wakeLockSelect.addEventListener('change', function() {
            localStorage.setItem('wakeLockMode', this.value);
            // Apply immediately
            applyWakeLockSettings();
        });
    }

    const tintSwitch = document.getElementById('tint-colors-switch');
    if (tintSwitch) {
        tintSwitch.checked = tintEnabled;
        tintSwitch.addEventListener('change', function() {
            tintEnabled = this.checked;
            localStorage.setItem('tintEnabled', tintEnabled);
            broadcastSettingUpdate('tintEnabled', tintEnabled.toString());
            applySystemTint();
        });
    }

    const glassModeSelect = document.getElementById('glass-effects-mode');
    if (glassModeSelect) {
        // Set initial value
        let currentMode = localStorage.getItem('glassEffectsMode');
        if (!currentMode) {
             const old = localStorage.getItem('glassEffectsEnabled');
             currentMode = (old === 'false') ? 'frosted' : 'on';
        }
        glassModeSelect.value = currentMode;
        
        // Listener
        glassModeSelect.addEventListener('change', function() {
            localStorage.setItem('glassEffectsMode', this.value);
            broadcastSettingUpdate('glassEffectsMode', this.value);
            applyGlassEffects();
            applySystemTint();
        });
    }
    
    // Apply immediately
    applyGlassEffects();
    updateSunEffect();
    
    initAppDraw(); // Now this will use the fully populated 'apps' object
    initializeCustomization(); // Now reads correct styles and applies them to DOM
    setupWeatherToggle();
    initializePageIndicator();
	loadWidgets(); // Now renders into a correctly styled layout
    checkWallpaperState();
    updateGurappsVisibility();
	updateMinimalMode();
    updateNightMode();
    syncUiStates();

	// Initialize features that might require permissions
    // This runs for returning users. For new users, it's called after setup is complete.
    if (!isDuringFirstSetup) {
        initializeGeolocationFeatures();
    }
	
    // Initialize control states
    const storedLightMode = localStorage.getItem('theme') || 'dark';
    const storedMinimalMode = localStorage.getItem('minimalMode') === 'true';
    const storedSilentMode = localStorage.getItem('silentMode') === 'true';
    const storedTemperature = localStorage.getItem('display_temperature') || '0';
    const storedBrightness = localStorage.getItem('page_brightness') || '100';
    const storedDisplayScale = localStorage.getItem('displayScale') || '100';

    // Night Stand Variables
    let nightStandActive = false;
    let preNightStandBrightness = '100';
    let preNightStandTheme = 'dark';
    let preNightStandTint = 'true';
    let nightStandTimer = null;
	
    // Get elements using your existing IDs
    const lightModeControl = document.getElementById('light_mode_qc');
    const minimalModeControl = document.getElementById('minimal_mode_qc');
    const silentModeControl = document.getElementById('silent_switch_qc');
    const temperatureControl = document.getElementById('temp_control_qc');
    const nightModeControl = document.getElementById('night-mode-qc');
    
    const silentModeSwitch = document.getElementById('silent_switch');
    const minimalModeSwitch = document.getElementById('focus-switch');
    const lightModeSwitch = document.getElementById('theme-switch');
    
    const temperatureValue = document.getElementById('thermostat-value');
    const temperaturePopup = document.getElementById('thermostat-popup');
    const temperatureSlider = document.getElementById('thermostat-control');
    const temperaturePopupValue = document.getElementById('thermostat-popup-value');
    
    // Brightness elements
	const brightnessSlider = document.getElementById('brightness-control');
    const screenCurveSlider = document.getElementById('screen-curve-slider');

    // --- Night Stand Logic ---
    function checkNightStand() {
        clearTimeout(nightStandTimer);

        const enabled = localStorage.getItem('nightStandEnabled') === 'true';
        if (!enabled) {
            if (nightStandActive) toggleNightStand(false);
            return;
        }

        const start = localStorage.getItem('nightStandStart') || '22:00';
        const end = localStorage.getItem('nightStandEnd') || '07:00';
        
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        
        let shouldBeActive = false;
        
        if (endMins < startMins) {
            // Spans midnight
            shouldBeActive = currentMins >= startMins || currentMins < endMins;
        } else {
            // Same day
            shouldBeActive = currentMins >= startMins && currentMins < endMins;
        }
        
        if (shouldBeActive !== nightStandActive) {
            toggleNightStand(shouldBeActive);
        }

        // Schedule next check
        const nextEvent = new Date(now);
        nextEvent.setSeconds(0, 0); // Align to minute
        
        if (shouldBeActive) {
            // Active -> Wait for End
            nextEvent.setHours(endH, endM);
        } else {
            // Inactive -> Wait for Start
            nextEvent.setHours(startH, startM);
        }

        // If target time passed today, move to tomorrow
        if (nextEvent <= now) {
            nextEvent.setDate(nextEvent.getDate() + 1);
        }

        const delay = nextEvent - now;
        // Buffer by 1 second to ensure we land safely in the new minute
        nightStandTimer = setTimeout(checkNightStand, delay + 1000);
    }

    function toggleNightStand(active) {
        nightStandActive = active;
		let overlay = document.getElementById('nightstand-overlay');
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.id = 'nightstand-overlay';
			document.body.appendChild(overlay);
		}
	        
        if (active) {
            console.log('[System] Entering Night Stand Mode');
            preNightStandBrightness = localStorage.getItem('page_brightness') || '100';
            preNightStandTheme = localStorage.getItem('theme') || 'dark';
            preNightStandTint = localStorage.getItem('tintEnabled') || 'true';

            if (preNightStandTheme === 'light') {
                setControlValueAndDispatch('theme', 'dark');
            }
            if (preNightStandTint === 'true') {
                setControlValueAndDispatch('tintEnabled', 'false');
            }
			
            document.body.classList.add('night-stand-active');
			overlay.style.display = 'block';
            const dimLevel = localStorage.getItem('nightStandBrightness') || '40';
            if (brightnessSlider) brightnessSlider.value = dimLevel;
            updateBrightness(dimLevel);
        } else {
            console.log('[System] Exiting Night Stand Mode');
            document.body.classList.remove('night-stand-active');
		    overlay.style.display = 'none';
            
            if (brightnessSlider) brightnessSlider.value = preNightStandBrightness;
	            updateBrightness(preNightStandBrightness);
            if (preNightStandTheme === 'light') {
                setControlValueAndDispatch('theme', 'light');
            }
            if (preNightStandTint === 'true') {
                setControlValueAndDispatch('tintEnabled', 'true');
            }
        }
    }

    // Initial check
    setTimeout(checkNightStand, 2000);

	if (screenCurveSlider) {
        const applyScreenCurve = (val) => {
            // Update global variable for other JS modules
            window.systemScreenCurve = parseInt(val) || 0;

            // Update the CSS variable on the overlay
            const overlay = document.getElementById('screen-curve-overlay');
            if (overlay) {
                overlay.style.setProperty('--curve', `${val}px`);
            }
            
            // Dynamically adjust the split screen trigger SVG
            let r = parseInt(val) / 2 || 0;
            r = Math.max(5, r);
            
            const padding = 3; 
            const tails = 1;
            const s = r + tails + padding * 2;
            const d = `M ${padding} ${padding} L ${padding} ${padding + tails} A ${r} ${r} 0 0 0 ${padding + r} ${padding + tails + r} L ${padding + tails + r} ${padding + tails + r}`;
                
            const svgPath = document.getElementById('split-trigger-path');
            const svgEl = document.getElementById('split-trigger-svg');
            
            if (svgPath) svgPath.setAttribute('d', d);
            if (svgEl) {
                svgEl.setAttribute('width', s);
                svgEl.setAttribute('height', s);
                svgEl.setAttribute('viewBox', `0 0 ${s} ${s}`);
            }

            // Encode the SVG as a mask for the glassmorphism effect
            const triggerDiv = document.getElementById('split-screen-trigger');
            if (triggerDiv) {
                // Update the physical container size to match the dynamic SVG
                svgEl.style.width = `${s}px`;
                svgEl.style.height = `${s}px`;
                
                const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><path d="${d}" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"./></svg>`;
                const encoded = "data:image/svg+xml;base64," + btoa(svgData);
                triggerDiv.style.setProperty('--trigger-mask', `url("${encoded}")`);
            }
        };

        // Init
        const savedCurve = localStorage.getItem('screenCurve') || '0';
        screenCurveSlider.value = savedCurve;
        applyScreenCurve(savedCurve);

        // Listener
        screenCurveSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            applyScreenCurve(val);
            localStorage.setItem('screenCurve', val);
            broadcastSettingUpdate('screenCurve', val);
        });
    }
    
    // Create brightness overlay div if it doesn't exist
    if (!document.getElementById('brightness-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'brightness-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999999';
        overlay.style.display = 'block';
        document.body.appendChild(overlay);
    }
    
    // Create temperature overlay div if it doesn't exist
    if (!document.getElementById('temperature-overlay')) {
        const tempOverlay = document.createElement('div');
        tempOverlay.id = 'temperature-overlay';
        tempOverlay.style.position = 'fixed';
        tempOverlay.style.top = '0';
        tempOverlay.style.left = '0';
        tempOverlay.style.width = '100%';
        tempOverlay.style.height = '100%';
        tempOverlay.style.pointerEvents = 'none';
        tempOverlay.style.zIndex = '9999997';
        tempOverlay.style.mixBlendMode = 'multiply';
        tempOverlay.style.display = 'block';
        document.body.appendChild(tempOverlay);
    }
    
    const brightnessOverlay = document.getElementById('brightness-overlay');
    const temperatureOverlay = document.getElementById('temperature-overlay');
    
    // Set temperature slider range
    temperatureSlider.min = -10;
    temperatureSlider.max = 10;
    
    // Set initial states from localStorage or defaults
    lightModeSwitch.checked = storedLightMode === 'light';
    if (lightModeSwitch.checked) lightModeControl.classList.add('active');
	
	const feBlend = document.querySelector('#edge-refraction-only feBlend');
    if (feBlend) {
        feBlend.setAttribute('mode', lightModeSwitch.checked ? 'lighten' : 'darken');
    }
    
    minimalModeSwitch.checked = storedMinimalMode;
    if (minimalModeSwitch.checked) minimalModeControl.classList.add('active');

    if (nightMode) nightModeControl.classList.add('active');
    
    silentModeSwitch.checked = storedSilentMode;
    if (silentModeSwitch.checked) silentModeControl.classList.add('active');

    if (storedTemperature !== '0') {
        temperatureControl.classList.add('active');
    }
    
    // Initialize temperature
    if (storedTemperature) {
        temperatureSlider.value = storedTemperature;
        temperatureValue.textContent = `${storedTemperature}`;
        temperaturePopupValue.textContent = `${storedTemperature}`;
        updateTemperature(storedTemperature);
    }
    
    // Initialize brightness
    if (storedBrightness) {
        brightnessSlider.value = storedBrightness;
        updateBrightness(storedBrightness);
    }

    // Initialize display scale
    const smartZoomPref = localStorage.getItem('smartDisplayZoom');
    if (smartZoomPref === 'true' || smartZoomPref === null) {
        const smartScale = calculateSmartZoom();
        document.body.style.zoom = `${smartScale}%`;
    } else if (storedDisplayScale !== '100') {
        document.body.style.zoom = `${storedDisplayScale}%`;
    }
    
    // Initialize icons based on current states
    updateLightModeIcon(lightModeSwitch.checked);
    updateMinimalModeIcon(minimalModeSwitch.checked);
    updateSilentModeIcon(silentModeSwitch.checked);
    updateTemperatureIcon(storedTemperature);
    
    // Function to update light mode icon
    function updateLightModeIcon(isLightMode) {
        const lightModeIcon = lightModeControl.querySelector('.material-symbols-rounded');
        if (!lightModeIcon) return;
        
        if (isLightMode) {
            lightModeIcon.textContent = 'radio_button_checked'; // Light mode ON
        } else {
            lightModeIcon.textContent = 'radio_button_partial'; // Light mode OFF (dark mode)
        }
    }
    
    // Function to update minimal mode icon
    function updateMinimalModeIcon(isMinimalMode) {
        const minimalModeIcon = minimalModeControl.querySelector('.material-symbols-rounded');
        if (!minimalModeIcon) return;
        
        if (isMinimalMode) {
            minimalModeIcon.textContent = 'screen_record'; // Minimal mode ON
        } else {
            minimalModeIcon.textContent = 'filter_tilt_shift'; // Minimal mode OFF
        }
		updateStatusIndicator();
    }
    
    // Function to update silent mode icon
    function updateSilentModeIcon(isSilentMode) {
        const silentModeIcon = silentModeControl.querySelector('.material-symbols-rounded');
        if (!silentModeIcon) return;
        
        if (isSilentMode) {
            silentModeIcon.textContent = 'notifications_off'; // Silent mode ON
        } else {
            silentModeIcon.textContent = 'notifications'; // Silent mode OFF
        }
		updateStatusIndicator();
    }
    
    // Function to update the temperature icon based on value
    function updateTemperatureIcon(value) {
        const temperatureIcon = temperatureControl.querySelector('.material-symbols-rounded');
        if (!temperatureIcon) return;
        
        const tempValue = parseInt(value);
        if (tempValue <= -1) {
            temperatureIcon.textContent = 'mode_cool'; // Cold
        } else if (tempValue >= 1) {
            temperatureIcon.textContent = 'mode_heat'; // Hot
        } else {
            temperatureIcon.textContent = 'thermometer'; // Neutral
        }
    }
    
    // Function to update brightness
    function updateBrightness(value) {        
        // Calculate darkness level (inverse of brightness)
        const darknessLevel = (100 - value) / 100;
        
        // Update the overlay opacity
        brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${darknessLevel})`;
        
        // Update the icon based on brightness level
        const brightnessIcon = document.querySelector('label[for="brightness-control"] .material-symbols-rounded');
        
        if (brightnessIcon) {
            if (value <= 60) {
                brightnessIcon.textContent = 'wb_sunny'; // Low brightness icon
            } else {
                brightnessIcon.textContent = 'sunny'; // High brightness icon
            }
        }
    }
    
    // Function to update temperature
    function updateTemperature(value) {
        // Convert to number to ensure proper comparison
        const tempValue = parseInt(value);
        
        // Calculate intensity based on distance from 0
        const intensity = Math.abs(tempValue) / 10;
        
        // Calculate RGB values for overlay
        let r, g, b, a;
        
        if (tempValue < 0) {
            // Cool/blue tint (more blue as value decreases)
            r = 200;
            g = 220;
            b = 255;
            a = intensity;
        } else if (tempValue > 0) {
            // Warm/yellow tint (more yellow as value increases)
            r = 255;
            g = 220;
            b = 180;
            a = intensity;
        } else {
            // Neutral (no tint at 0)
            r = 255;
            g = 255;
            b = 255;
            a = 0;
        }
        
        // Update the overlay color
        temperatureOverlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    }

	let sunEffectTimeout;
    
    // Event listener for light mode control
    lightModeControl.addEventListener('click', function() {
        // This simulates a click on the label, which is the correct behavior.
        lightModeSwitch.click(); 
    });
	
    themeSwitch.addEventListener('change', function() {
        const isLight = this.checked;
        const newTheme = isLight ? 'light' : 'dark';

        // Update UI, localStorage, and broadcast
        lightModeControl.classList.toggle('active', isLight);
        localStorage.setItem('theme', newTheme);
        broadcastSettingUpdate('theme', newTheme);
        document.body.classList.toggle('light-theme', isLight);
        updateLightModeIcon(isLight);

		// Update SVG Filter Mode
		const feBlend = document.querySelector('#edge-refraction-only feBlend');
        if (feBlend) {
            feBlend.setAttribute('mode', isLight ? 'lighten' : 'darken');
        }

        // Inform all iframes of the specific theme update
        const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
        iframes.forEach((iframe) => {
            if (iframe.contentWindow) {
				const targetOrigin = getOriginFromUrl(iframe.src);
                iframe.contentWindow.postMessage({
                    type: 'themeUpdate',
                    theme: newTheme
                }, targetOrigin);
            }
        });

        clearTimeout(sunEffectTimeout);
	    sunEffectTimeout = setTimeout(updateSunEffect, 3000);
		
	    // Update sliders to match the new theme's values
	    const currentWallpaper = recentWallpapers[currentWallpaperPosition];
	    const effects = currentWallpaper?.clockStyles?.wallpaperEffects?.[newTheme] || { blur: '0', brightness: '100', contrast: '100' };
	    document.getElementById('wallpaper-blur-slider').value = effects.blur;
	    document.getElementById('wallpaper-brightness-slider').value = effects.brightness;
	    document.getElementById('wallpaper-contrast-slider').value = effects.contrast;
	    
	    // Only re-apply effects and sync UI if no app is open
	    if (!document.querySelector('.fullscreen-embed[style*="display: block"]')) {
	        // Re-apply wallpaper effects as they are theme-dependent
	        applyWallpaperEffects();
	        syncUiStates();
	    }
	});
	
    // Event listener for minimal mode control
    minimalModeControl.addEventListener('click', function() {
        // Toggle minimalMode state
        minimalMode = !minimalMode;

	    const value = minimalMode.toString(); // Define value before using it

        // Save state to localStorage (if needed)
        localStorage.setItem('minimalMode', minimalMode);
	    broadcastSettingUpdate('minimalMode', value);

        // Update UI based on the new state
        updateMinimalMode();

        // Toggle active class for visual feedback
        this.classList.toggle('active');
        
        // Update icon
        updateMinimalModeIcon(minimalMode);

		if (window.WavesHost) window.WavesHost.pushFullState();
    });

    // Event listener for night mode control
    nightModeControl.addEventListener('click', () => {
        nightMode = !nightMode;
        localStorage.setItem('nightMode', nightMode);
        broadcastSettingUpdate('nightMode', nightMode.toString());
        updateNightMode();

		if (window.WavesHost) window.WavesHost.pushFullState(); 
    });

    // Event listener for silent mode control
    silentModeControl.addEventListener('click', function() {
        silentModeSwitch.checked = !silentModeSwitch.checked;
        this.classList.toggle('active');

		const value = isSilentMode.toString(); // Define value before using it
		
        isSilentMode = silentModeSwitch.checked; // Update global flag
        localStorage.setItem('silentMode', isSilentMode); // Save to localStorage
		broadcastSettingUpdate('silentMode', value);
        
        // Update icon
        updateSilentModeIcon(isSilentMode);
        
		if (window.WavesHost) window.WavesHost.pushFullState();
    });
    
    // Initialize silent mode on page load
    (function initSilentMode() {
        isSilentMode = localStorage.getItem('silentMode') === 'true'; // Initialize global flag
        
        // showNotification is handled by its own internal logic, no override needed here.
    })();
    
    // Temperature control popup
    temperatureControl.addEventListener('click', function(e) {
        if (
            temperaturePopup.style.display === 'block' &&
            !temperaturePopup.contains(e.target) &&
            e.target !== temperatureControl
        ) {
            temperaturePopup.style.display = 'none';
            return;
        }

        const rect = temperatureControl.getBoundingClientRect();
        const zoom = parseFloat(document.body.style.zoom) / 100 || 1;
        temperaturePopup.style.top = `${(rect.bottom + 5) / zoom}px`;
        temperaturePopup.style.left = `${(rect.left + (rect.width / 2) - (155 / 2)) / zoom}px`;
        temperaturePopup.style.display = 'block';
    });
    
    document.addEventListener('click', function(e) {
        if (temperaturePopup.style.display === 'block' && 
            !temperaturePopup.contains(e.target) && 
            e.target !== temperatureControl) {
            temperaturePopup.style.display = 'none';
        }
    });
    
    // Temperature slider event listener
    temperatureSlider.addEventListener('input', function(e) {
        // MANUAL OVERRIDE: Turn off Dynamic Tone if user touches the slider
        if (!window._isSystemAutoAdjusting && localStorage.getItem('dynamicTone') !== 'false') {
            localStorage.setItem('dynamicTone', 'false');
            localStorage.setItem('dynamicTone_overridden', 'true');
            if (window.DynamicEnvironmentManager) {
                localStorage.setItem('override_target_tone', window.DynamicEnvironmentManager.lastTargetTone || 0);
            }
            broadcastSettingUpdate('dynamicTone', 'false');
        }

        const value = e.target.value;
        temperaturePopupValue.textContent = `${value}`;
        temperatureValue.textContent = `${value}`;
        localStorage.setItem('display_temperature', value);
		broadcastSettingUpdate('display_temperature', value);
        updateTemperatureIcon(value);
        updateTemperature(value);
		temperatureControl.classList.toggle('active', value !== '0');

		if (window.WavesHost) window.WavesHost.pushFullState();
    });

    // Master Volume control logic
    const masterVolumeSlider = document.getElementById('volume-control');
    masterVolumeSlider.value = localStorage.getItem('master_volume') || 100;
    
    masterVolumeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('master_volume', val);
        
        // Update Icon based on level
        const icon = masterVolumeSlider.parentElement.querySelector('.material-symbols-rounded');
        if (val == 0) icon.textContent = 'volume_off';
        else if (val < 50) icon.textContent = 'volume_down';
        else icon.textContent = 'volume_up';
        
        // Update all running apps with their new limited volume
        const iframes = document.querySelectorAll('iframe[data-app-id]');
        iframes.forEach(f => {
            if (typeof syncAppVolume === 'function') syncAppVolume(f);
        });

        // 2. Sync UI Sound volume instantly
        if (window.SoundManager) localStorage.setItem('sfxVolume', val);
    });

    // Volume Mixer Button & Outside Click Logic
    document.getElementById('sound-opt-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        const popup = document.getElementById('volume-mixer-popup');
        if (popup.style.display === 'block') { popup.style.display = 'none'; return; }
        
        if (typeof updateVolumeMixerUI === 'function') updateVolumeMixerUI();
        const rect = this.getBoundingClientRect();
        const zoom = parseFloat(document.body.style.zoom) / 100 || 1;
        popup.style.top = `${(rect.bottom + 10) / zoom}px`;
        popup.style.left = `${(rect.right - 220) / zoom}px`;
        popup.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        const popup = document.getElementById('volume-mixer-popup');
        if (popup && popup.style.display === 'block' && !popup.contains(e.target) && e.target.id !== 'sound-opt-btn') {
            popup.style.display = 'none';
        }
    });
    
    // Brightness control event listener
    brightnessSlider.addEventListener('input', (e) => {
        // MANUAL OVERRIDE: Turn off Auto-Brightness if user touches the slider
        if (!window._isSystemAutoAdjusting && localStorage.getItem('autoBrightness') !== 'false') {
            localStorage.setItem('autoBrightness', 'false');
            localStorage.setItem('autoBrightness_overridden', 'true');
            if (window.DynamicEnvironmentManager) {
                localStorage.setItem('override_lux', window.DynamicEnvironmentManager.lastLux || 0);
                localStorage.setItem('override_target_bright', window.DynamicEnvironmentManager.lastTargetBright || 100);
            }
            broadcastSettingUpdate('autoBrightness', 'false');
        }

        updateBrightness(e.target.value);
        localStorage.setItem('page_brightness', e.target.value);
        broadcastSettingUpdate('page_brightness', e.target.value);

		if (window.WavesHost) window.WavesHost.pushFullState();
    });
    
    // Add CSS for the overlays
    const style = document.createElement('style');
    style.textContent = `
        #brightness-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999999;
            display: block !important;
        }
        
        #temperature-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999998;
            mix-blend-mode: multiply;
            display: block !important;
        }
    `;
    document.head.appendChild(style);

	document.getElementById('app-switcher-ui').addEventListener('click', (e) => {
	    if (e.target.id === 'app-switcher-ui') {
	        closeAppSwitcherUI();
	    }
	});

    // --- Add other event listeners ---
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', function () {
            selectLanguage(this.value);
		    broadcastSettingUpdate('selectedLanguage', this.value);
        });
    }
	
    const depthEffectSwitch = document.getElementById('depth-effect-switch');
    if (depthEffectSwitch) {
        // Listener for wallpaper-specific toggling
        depthEffectSwitch.addEventListener('change', async function() {
            const isEnabled = this.checked;
            
            if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0) {
                const wp = recentWallpapers[currentWallpaperPosition];
                
                // 1. Update Memory
                wp.depthEnabled = isEnabled;
                
                // 2. Update LocalStorage (Persistence)
                saveRecentWallpapers();
                
                // 3. Update IDB (Deep Persistence)
                if (wp.id) {
                    try {
                        const record = await getWallpaper(wp.id);
                        if (record) {
                            record.depthEnabled = isEnabled;
                            await storeWallpaper(wp.id, record);
                        }
                    } catch(e) { console.error(e); }
                }

                // 4. Trigger Action
                if (isEnabled) {
                    processCurrentWallpaperDepth();
                } else {
                    const depthLayer = document.getElementById('depth-layer');
                    if(depthLayer) {
                        depthLayer.style.opacity = '0';
                        // Delayed clear to allow fade out
                        setTimeout(() => {
                             if(depthLayer.style.opacity === '0') depthLayer.style.backgroundImage = '';
                        }, 500);
                    }
                }
            }
        });
    }

    // --- Edit Mode Button Bindings ---
    document.getElementById('edit-replace-bg-btn')?.addEventListener('click', () => {
        if (typeof editModeWallpaperIndex !== 'undefined' && editModeWallpaperIndex > -1) {
            openWallpaperEditMenu(editModeWallpaperIndex);
        }
    });
    document.getElementById('edit-done-btn')?.addEventListener('click', () => {
        if (typeof exitEditMode === 'function') exitEditMode();
    });

    const liveEnvSwitch = document.getElementById('live-environment-switch');
    const liveEnvItem = document.getElementById('setting-live-environment'); // The UI Grid Item
    if (liveEnvSwitch && liveEnvItem) {
        // Load State
        const isLive = localStorage.getItem('liveEnvironmentEnabled') === 'true';
        liveEnvSwitch.checked = isLive;
        liveEnvItem.classList.toggle('active', isLive);

        // Sync Helper for click
        liveEnvItem.addEventListener('click', () => {
            liveEnvSwitch.click(); // Trigger change
        });

        liveEnvSwitch.addEventListener('change', async function() {
            const active = this.checked;
            localStorage.setItem('liveEnvironmentEnabled', active);
            broadcastSettingUpdate('liveEnvironmentEnabled', active.toString());
            
            liveEnvItem.classList.toggle('active', active);

            if (active) {
                await EnvironmentManager.init();
                // FIX: Updated method name from updateTimeEffect to updateSunCycle
                EnvironmentManager.updateSunCycle(); 
                EnvironmentManager.updateWeatherEffect();
            } else {
                EnvironmentManager.destroy();
                // Also reset the overlay opacity manually here just in case
                const overlay = document.getElementById('time-of-day-overlay');
                if(overlay) overlay.style.opacity = 0;
            }
        });

        // Initialize if active
        if (isLive) {
            await EnvironmentManager.init();
        }
    }

    function clearCookies() {
        const cookies = document.cookie.split(";");

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
    }

    // NEW: Dynamically create the homescreen live activity widget container if it doesn't exist
    if (!document.getElementById('live-activity-homescreen')) {
        const clockWidgetsContainer = document.querySelector('.clockwidgets');
        if (clockWidgetsContainer) {
            const homescreenWidget = document.createElement('div');
            homescreenWidget.id = 'live-activity-homescreen';
            homescreenWidget.className = 'weather-widget'; // Reuse existing styles
            homescreenWidget.style.display = 'none'; // Initially hidden
            homescreenWidget.innerHTML = `
                <span class="material-symbols-rounded"></span>
                <span></span>
            `;
            clockWidgetsContainer.appendChild(homescreenWidget);
        }
    }

    // --- Cursor Inactivity Setup ---
    window.addEventListener('mousemove', showCursorAndResetTimer);
    showCursorAndResetTimer(); // Start the timer on initial load

    // --- 5. Final checks and ongoing processes ---
    preventLeaving();
    window.addEventListener('resize', handleViewportResize);

    // Call to check for automatic backup on page load
    checkForAutomaticBackup();

    setupServiceWorkerUpdateListener(); 

    // Request screen wake lock to prevent sleep
    applyWakeLockSettings();
    document.addEventListener('visibilitychange', handleWakeLockVisibilityChange);

    // Interaction listener to help Legacy Video autoplay policies
    const unlockAudio = () => {
        if (localStorage.getItem('wakeLockMode') === 'legacy' && legacyVideoElement && legacyVideoElement.paused) {
            legacyVideoElement.play().catch(() => {});
        }
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    if (window.pendingManageUrl) {
        const hasUserData = localStorage.getItem('hasVisitedBefore') === 'true';
        let proceed = true;

        if (hasUserData) {
            // User exists: Demand confirmation
            proceed = await showCustomConfirm(
                "An external configuration script is requesting to be imported. Unknown scripts can harm the device and your data. Allow this to control Polygol?",
            );
        }

        if (proceed) {
            try {
                showNotification('Importing configuration...', { icon: 'cloud_download' });
                const response = await fetch(window.pendingManageUrl);
                if (response.ok) {
                    const scriptContent = await response.text();
                    localStorage.setItem('customStartupScript', scriptContent);
                    // Mark setup as complete so next boot is normal
                    localStorage.setItem('hasVisitedBefore', 'true'); 
                    
                    console.log("Management script imported.");
                    // Reload to ensure a clean state with the new script applied
                    window.location.reload();
                    return; 
                } else {
                    showDialog({ type: 'alert', title: 'Import Failed', message: `HTTP Error: ${response.status}` });
                }
            } catch (e) {
                console.error("Manage Import Error:", e);
                showDialog({ type: 'alert', title: 'Import Error', message: e.message });
            }
        }
    }

    // --- Handle Pending App Launch (from ?s=[app] passed by HTML) ---
    if (window.pendingBootApp) {
        // Search for app case-insensitively
        const searchName = window.pendingBootApp.toLowerCase();
        const targetAppName = Object.keys(apps).find(k => k.toLowerCase() === searchName);
        
        if (targetAppName && apps[targetAppName]) {
            console.log(`[System] Auto-launching requested app: ${targetAppName}`);
            // Small delay to ensure transitions look right after load
            setTimeout(() => {
                createFullscreenEmbed(apps[targetAppName].url);
            }, 500);
        } else {
            console.warn(`[System] Requested boot app '${window.pendingBootApp}' not found.`);
            // Only show notification if UI is actually ready
            setTimeout(() => {
                showNotification(`App '${window.pendingBootApp}' not found`, { icon: 'error' });
            }, 1000);
        }
        window.pendingBootApp = null; // Clear
    }

    setTimeout(() => {
        if (window.WavesHost) {
            console.log("[System] Initializing Waves State Sync...");
            
            // 1. Send Basic State (Brightness, Volume, Media)
            window.WavesHost.pushFullState();
            
            // 2. Send Current Wallpaper Image
            window.WavesHost.pushWallpaperUpdate();

            // 3. Send Widget Snapshots
            if (typeof broadcastWidgetSnapshots === 'function') {
                broadcastWidgetSnapshots();
            }
        }
    }, 10000); // 10s delay to ensure the DOM and Trystero are fully settled
});

document.addEventListener('DOMContentLoaded', () => {	
    // --- Get references to key elements ---
    const controlPopup = document.createElement('div');
    controlPopup.className = 'control-popup';
    document.body.appendChild(controlPopup);

    const hiddenControlsContainer = document.getElementById('hidden-controls-container');

    // --- Function to correctly hide the popup and return the control ---
    function hideActivePopup() {
        if (controlPopup.style.display === 'block' && controlPopup.firstElementChild) {
            // **THE FIX**: Put the control back into its hidden container.
            hiddenControlsContainer.appendChild(controlPopup.firstElementChild);
            controlPopup.style.display = 'none';
        }
    }

    // --- Function to show and position the popup ---
    function showControlPopup(sourceElement, controlElement) {
        if (controlPopup.style.display === 'block' && controlPopup.contains(controlElement)) {
            hideActivePopup();
            return;
        }
        hideActivePopup();

        controlPopup.appendChild(controlElement);
        controlPopup.style.display = 'block'; // Display block first to get offsetWidth

        const rect = sourceElement.getBoundingClientRect();
        const zoom = parseFloat(document.body.style.zoom) / 100 || 1;
        const screenWidth = window.innerWidth / zoom;
        const screenHeight = window.innerHeight / zoom;
        const popupWidth = controlPopup.offsetWidth;
        const popupHeight = controlPopup.offsetHeight;

        // Calculate horizontal position with clamping
        let left = (rect.left + (rect.width / 2)) / zoom - (popupWidth / 2);
        left = Math.max(10, Math.min(left, screenWidth - popupWidth - 10));

        // Calculate vertical position (prefer bottom, flip to top if no space)
        let top = (rect.bottom + 8) / zoom;
        if (top + popupHeight > screenHeight - 10) {
            top = (rect.top - 8) / zoom - popupHeight;
        }

        controlPopup.style.top = `${top}px`;
        controlPopup.style.left = `${left}px`;
    }

    // --- Global click listener to hide the popup ---
    document.addEventListener('click', (e) => {
        if (controlPopup.style.display === 'block' && !controlPopup.contains(e.target) && !e.target.closest('.setting-item')) {
            hideActivePopup();
        }
    });
	
    // --- Helper to connect grid items to their controls and popups ---
    const connectGridItem = (gridItemId, primaryControlId, popupId = null) => {
        const gridItem = document.getElementById(gridItemId);
        if (!gridItem) return;

        const primaryControl = primaryControlId ? document.getElementById(primaryControlId) : null;
        const popup = popupId ? document.getElementById(popupId) : null;

        // --- 1. Click / Toggle Logic ---
        if (popup) {
            // Complex item with a dedicated popup container
            gridItem.addEventListener('click', (e) => {
                e.stopPropagation();
                showControlPopup(gridItem, popup);
            });
        } else if (primaryControl) {
            // Simple item (Checkbox, Select, Range)
            const isPopupTrigger = primaryControl.nodeName === 'SELECT' || primaryControl.type === 'range';
            const isToggle = primaryControl.type === 'checkbox';

            if (isToggle) {
                const updateActiveState = () => gridItem.classList.toggle('active', primaryControl.checked);
                primaryControl.addEventListener('change', updateActiveState);
                updateActiveState();
            }
            
            gridItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isPopupTrigger) {
                    showControlPopup(gridItem, primaryControl);
                } else if (isToggle) {
                    primaryControl.checked = !primaryControl.checked;
                    primaryControl.dispatchEvent(new Event('change'));
                } else {
                    primaryControl.click();
                }
            });
        }

        // --- 2. Long Press to Reset Logic (Reads directly from HTML defaults) ---
        let pressTimer;
        let isLongPress = false;
        let startX, startY;

        const startPress = (e) => {
            // Only attach long press if there is a control to reset
            if (!primaryControl && !popup) return;

            isLongPress = false;
            startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            pressTimer = setTimeout(async () => {
                isLongPress = true;
                const labelElement = gridItem.querySelector('.setting-label');
                const label = labelElement ? labelElement.textContent : 'this setting';
                
                if (await showCustomConfirm(`Reset ${label}?`)) {
                    // Gather all inputs connected to this grid item
                    const controlsToReset = popup 
                        ? Array.from(popup.querySelectorAll('input, select'))
                        : [primaryControl].filter(Boolean);

                    controlsToReset.forEach(ctrl => {
                        // Revert inputs to their original HTML attribute state
                        if (ctrl.type === 'checkbox' || ctrl.type === 'radio') {
                            ctrl.checked = ctrl.defaultChecked;
                        } else if (ctrl.tagName === 'SELECT') {
                            const defaultOption = Array.from(ctrl.options).find(opt => opt.defaultSelected) || ctrl.options[0];
                            if (defaultOption) ctrl.value = defaultOption.value;
                        } else {
                            ctrl.value = ctrl.defaultValue;
                        }
                        
                        // Fire event so the engine naturally detects and saves the reset value
                        const eventType = (ctrl.type === 'checkbox' || ctrl.type === 'radio' || ctrl.tagName === 'SELECT') ? 'change' : 'input';
                        ctrl.dispatchEvent(new Event(eventType, { bubbles: true }));
                    });
                }
            }, 500); // 500ms hold to trigger
        };

        const cancelPress = (e) => {
            if (pressTimer) {
                if (e && e.type.includes('move')) {
                    const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
                    const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
                    // Cancel if finger moved more than 10px
                    if (Math.abs(cx - startX) > 10 || Math.abs(cy - startY) > 10) {
                        clearTimeout(pressTimer);
                    }
                } else {
                    clearTimeout(pressTimer);
                }
            }
        };

        gridItem.addEventListener('mousedown', startPress);
        gridItem.addEventListener('touchstart', startPress, { passive: true });
        gridItem.addEventListener('mousemove', cancelPress);
        gridItem.addEventListener('touchmove', cancelPress, { passive: true });
        gridItem.addEventListener('mouseup', cancelPress);
        gridItem.addEventListener('mouseleave', cancelPress);
        gridItem.addEventListener('touchend', cancelPress);

        // Block the standard click from firing if we triggered a long press
        gridItem.addEventListener('click', (e) => {
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { capture: true });
    };

    // --- Connect Popups ---
    connectGridItem('setting-clock-color', null, 'clock-color-popup');
    connectGridItem('setting-clock-shadow', null, 'shadow-controls-popup');
    connectGridItem('setting-position', null, 'position-controls-popup');
    connectGridItem('setting-clock-stroke', null, 'stroke-controls-popup');
    connectGridItem('setting-format', null, 'format-popup');

    // --- Connect all other settings ---
    connectGridItem('setting-wallpaper-blur', 'wallpaper-blur-slider');
    connectGridItem('setting-wallpaper-brightness', 'wallpaper-brightness-slider');
    connectGridItem('setting-wallpaper-contrast-fx', 'wallpaper-contrast-slider');
    connectGridItem('setting-seconds', 'seconds-switch');
    connectGridItem('setting-clock-stack', 'clock-stack-switch');
    connectGridItem('setting-weather', 'weather-switch');
    connectGridItem('setting-gurapps', 'gurapps-switch');
    connectGridItem('setting-animation', 'animation-switch');
    connectGridItem('setting-contrast', 'contrast-switch');
    connectGridItem('setting-hour-format', 'hour-switch');
    connectGridItem('setting-style', 'font-select');
    connectGridItem('setting-weight', 'weight-slider');
    connectGridItem('setting-roundness', 'roundness-slider');
    connectGridItem('setting-size', 'clock-size-slider');
    connectGridItem('setting-clock-spacing', 'clock-spacing-slider');
    connectGridItem('setting-text-case', 'text-case-select');
    connectGridItem('setting-date-size', 'date-size-slider');
    connectGridItem('setting-date-offset', 'date-offset-slider');
    connectGridItem('setting-alignment', 'alignment-select');
    connectGridItem('setting-italic', 'clock-italic-switch');
    connectGridItem('setting-blend-mode', 'clock-blend-mode-select');
    connectGridItem('setting-wallpaper-saturate', 'wallpaper-saturate-slider');
    connectGridItem('setting-wallpaper-hue', 'wallpaper-hue-slider');
    connectGridItem('setting-wallpaper-vignette', 'wallpaper-vignette-slider');
    connectGridItem('setting-language', 'language-switcher');
    connectGridItem('setting-ai', 'ai-switch');
    connectGridItem('setting-one-button-nav', 'one-button-nav-switch');

    // --- NEW: Special Handler for Widget Picker ---
    const widgetPickerItem = document.getElementById('setting-widgets');
    if (widgetPickerItem) {
        widgetPickerItem.addEventListener('click', (e) => {
            e.stopPropagation();
			closeControls();
            openWidgetPicker();
        });
    }

	// --- Special handler for Wallpaper Picker ---
    const wallpaperPickerItem = document.getElementById('setting-wallpaper');
    if (wallpaperPickerItem) {
        wallpaperPickerItem.addEventListener('click', () => {
            closeControls();
            openWallpaperPicker();
        });
    }
	
	document.getElementById('wallpaper-switcher-overlay').addEventListener('click', (e) => {
	    if (e.target.id === 'wallpaper-switcher-overlay') {
	        closeWallpaperSwitcher();
	    }
	});
	
	const switcherAddBtn = document.getElementById('switcher-add-btn');
	if (switcherAddBtn) {
	    switcherAddBtn.onclick = () => {
	        closeWallpaperSwitcher(); // Close switcher first
	        setTimeout(() => {
	             openWallpaperPicker(); // Open drawer after slight delay for transition
	        }, 100);
	    };
	}

	// --- Add event listeners to close drawers ---
    const blurOverlay = document.getElementById('blurOverlay');

    const widgetDrawer = document.getElementById('widget-picker-drawer');
    if (widgetDrawer) {
        const handle = widgetDrawer.querySelector('.widget-drawer-handle');
        if (handle) handle.addEventListener('click', closeWidgetPicker);
    }

    const wallpaperDrawer = document.getElementById('wallpaper-picker-drawer');
     if (wallpaperDrawer) {
        const handle = wallpaperDrawer.querySelector('.wallpaper-drawer-handle');
        if (handle) handle.addEventListener('click', closeWallpaperPicker);
    }

	const wallpaperSubmitBtn = document.getElementById('wallpaper-submit-btn');
    if (wallpaperSubmitBtn) {
        wallpaperSubmitBtn.addEventListener('click', () => {
            closeWallpaperPicker();
            createFullscreenEmbed(WALLPAPER_SUBMISSION_URL);
        });
    }

    const exportBtn = document.getElementById('wallpaper-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            closeWallpaperPicker(); // Close drawer first
            exportCurrentWallpaper();
        });
    }
	
    // Generic overlay click to close any active modal/drawer
    if (blurOverlay) {
        blurOverlay.addEventListener('click', () => {
            // Priority 1: Close active dialog.
            if (activeDialog) {
                // Prevent accidental dismissals within the first 500ms
                if (Date.now() - (activeDialog.openTime || 0) < 500) return;

                let cancelValue = true; // Default for alerts
                if (activeDialog.type === 'confirm') cancelValue = false;
                if (activeDialog.type === 'prompt') cancelValue = null;
                closeDialog(cancelValue); // Close any type of dialog
                return; 
            }

            // Priority 2: Close open drawers.
            if (document.querySelector('.widget-drawer.open')) {
                closeWidgetPicker();
                closeWallpaperPicker();
                return;
            }

            // Priority 3: Close the main controls panel.
            if (document.getElementById('customizeModal').classList.contains('show')) {
                closeControls();
            }
        });
    }

    // Album Art click listener (using event delegation for reliability)
    document.getElementById('media-session-widget').addEventListener('click', (e) => {
        // Check if the click happened specifically on the album art
        if (e.target.id === 'media-widget-art') {
            let appNameToOpen = null;

            // 1. Prioritize the app with the currently active session.
            if (activeMediaSessionApp) {
                appNameToOpen = activeMediaSessionApp;
            } else {
                // 2. Fallback to the last app that controlled media, from localStorage.
                appNameToOpen = localStorage.getItem('lastMediaSessionApp');
            }

            // Find the correct, case-sensitive key from the apps object
            let canonicalAppName = null;
            if (appNameToOpen) {
                canonicalAppName = Object.keys(apps).find(
                    key => key.toLowerCase() === appNameToOpen.toLowerCase()
                );
            }

            // 3. Verify the canonical app name was found and then open it.
            if (canonicalAppName && apps[canonicalAppName]) {
                const appToOpen = apps[canonicalAppName];
                closeControls();
                createFullscreenEmbed(appToOpen.url);
            } else {
                // 4. If no app is found, provide a sensible default action.
                console.warn('[Media Widget] No active or cached app found. Falling back to default Music app.');
                closeControls();
                createFullscreenEmbed('./music/index.html');
            }
        }
    });
	
	const appDrawer = document.getElementById('app-drawer');
    const dynamicArea = document.getElementById('dynamic-area');
    const persistentClock = document.querySelector('.persistent-clock');
    const customizeModal = document.getElementById('customizeModal');
    const quickActions = document.getElementById('persistent-clock-quick-actions');
    const interactionBlocker = document.getElementById('interaction-blocker');
    let hideActionsTimeout, longPressTimeout, quickActionsInactivityTimeout;
    let isLongPress = false;

    const showQuickActions = (isTouch = false) => {
        const appIsOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (appIsOpen) {
            clearTimeout(hideActionsTimeout);
            clearTimeout(quickActionsInactivityTimeout); // Clear previous inactivity timer

            quickActions.style.display = 'flex';
            interactionBlocker.style.display = 'block';
            interactionBlocker.style.pointerEvents = 'auto';
            interactionBlocker.style.zIndex = '9994'; // Below actions menu but above app
            dynamicArea.style.opacity = '0';

            document.getElementById('quick-action-controls').style.display = isTouch ? 'none' : 'flex';

            setTimeout(() => {
                quickActions.classList.add('show');
            }, 10); // next frame

            if (isTouch) {
                quickActionsInactivityTimeout = setTimeout(hideQuickActions, 5000);
            }
        }
    };

    const hideQuickActions = () => {
        clearTimeout(quickActionsInactivityTimeout); // Always clear the inactivity timer on close
        const delay = isLongPress ? 0 : 100; // Immediate for touch, delayed for mouse
        clearTimeout(hideActionsTimeout);
        hideActionsTimeout = setTimeout(() => {
            quickActions.classList.remove('show');
            interactionBlocker.style.display = 'none';
            interactionBlocker.style.zIndex = '999';
            dynamicArea.style.opacity = '1';
            // Wait for transition to finish before setting display to none
            setTimeout(() => {
                if (!quickActions.classList.contains('show')) {
                    quickActions.style.display = 'none';
                }
            }, 200);
        }, delay);
    };

    // --- Mouse Hover Logic ---
    let lastTouchTime = 0;
    document.addEventListener('touchstart', () => { lastTouchTime = Date.now(); }, true);

    dynamicArea.addEventListener('mouseenter', () => {
        // Ignore hover if a touch event happened recently to prevent conflicts
        if (Date.now() - lastTouchTime < 500) return;

        const appIsOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (appIsOpen) {
            showQuickActions(false);
        }
    });
    quickActions.addEventListener('mouseenter', () => clearTimeout(hideActionsTimeout));
    persistentClock.addEventListener('mouseleave', hideQuickActions);
    quickActions.addEventListener('mouseleave', hideQuickActions);
    interactionBlocker.addEventListener('click', hideQuickActions); // Tap outside to close
    document.addEventListener('contextmenu', e => e.preventDefault());

    // --- Touch Long-Press Logic ---
    persistentClock.addEventListener('touchstart', (e) => {
        isLongPress = false; // Reset on new touch
        const appIsOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (!appIsOpen) return;

        clearTimeout(longPressTimeout);
        longPressTimeout = setTimeout(() => {
            isLongPress = true;
            showQuickActions(true);
        }, 500);
    }, { passive: true });

    persistentClock.addEventListener('touchmove', () => {
        clearTimeout(longPressTimeout);
    });

    persistentClock.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimeout);
        if (!isLongPress) {
            // It was a regular tap, not a long press that was just initiated
            persistentClock.click();
        }
        // If it was a long press, the menu is now open. The user will tap an action or outside.
        isLongPress = false; // Reset for next interaction
    });
    
    interactionBlocker.addEventListener('touchend', hideQuickActions);

    // --- Quick Action Button Listeners ---
    document.getElementById('quick-action-minimize').addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeFullscreenEmbed();
        hideQuickActions();
    });
    document.getElementById('quick-action-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeFullscreenEmbed();
        hideQuickActions();
    });
    document.getElementById('quick-action-controls').addEventListener('click', (e) => {
        e.stopPropagation();
        persistentClock.click();
        hideQuickActions();
    });

    const blackoutBtn = document.getElementById('blackout-btn');
    const startBlackoutHold = () => {
        cancelBlackoutHold(); // Clear any existing timer
        blackoutHoldTimer = setTimeout(() => {
            blackoutScreen();
            blackoutHoldTimer = null;
        }, 500);
    };
    const cancelBlackoutHold = () => {
        if (blackoutHoldTimer) { // If the timer is still active, it was a short tap
            showPopup("Tap and hold to enter sleep mode");
        }
        clearTimeout(blackoutHoldTimer);
        blackoutHoldTimer = null; // Ensure it's nullified
    };
    blackoutBtn.addEventListener('mousedown', startBlackoutHold);
    blackoutBtn.addEventListener('touchstart', startBlackoutHold, { passive: true });
    blackoutBtn.addEventListener('mouseup', cancelBlackoutHold);
    blackoutBtn.addEventListener('mouseleave', cancelBlackoutHold);
    blackoutBtn.addEventListener('touchend', cancelBlackoutHold);

	// Initial calls
	updateNetworkInfo();
    initBattery();

	// Listen for changes
	const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	if (connection) {
		connection.addEventListener('change', updateNetworkInfo);
	}
	
	window.addEventListener('online', () => {
	    showPopup(currentLanguage.ONLINE);
		updateNetworkInfo();
	    updateSmallWeather(); // Refresh weather data
		if(window.WavesHost) window.WavesHost.pushFullState();
	});
	
	window.addEventListener('offline', () => {
	    showPopup(currentLanguage.OFFLINE);
		updateNetworkInfo();
		if(window.WavesHost) window.WavesHost.pushFullState();
	});

    if ('getBattery' in navigator) {
        navigator.getBattery().then(batt => {
            const push = () => { if(window.WavesHost) window.WavesHost.pushFullState(); };
            batt.addEventListener('levelchange', push);
            batt.addEventListener('chargingchange', push);
        });
    }
    
	function updatePersistentClock() {
	  const isModalOpen = 
	    (appDrawer && appDrawer.classList.contains('open')) ||
	    document.querySelector('.fullscreen-embed[style*="display: block"]');

	    const hasActivities = (typeof activeIslands !== 'undefined' && activeIslands.length > 0);
	    
	  if (isModalOpen) {
	    const now = new Date();
	    let hours = now.getHours();
	    let minutes = String(now.getMinutes()).padStart(2, '0');
	    
	    let displayHours;
	    
	    if (use12HourFormat) {
	      // 12-hour format without AM/PM
	      displayHours = hours % 12 || 12;
	    } else {
	      // 24-hour format
	      displayHours = String(hours).padStart(2, '0');
	    }
	    
	    persistentClock.innerHTML = `<span class="persistent-clock-digit">${displayHours}</span><span class="persistent-colon">:</span><span class="persistent-clock-digit">${minutes}</span>`;
        persistentClock.style.display = 'flex';
	  } else {
		if (hasActivities) {
			// Priority goes to Content (Activities)
            persistentClock.innerHTML = '<span class="material-symbols-rounded">keyboard_arrow_down</span>';
        } else {
	        const hideIndicator = localStorage.getItem('hideClockIndicator') === 'true';
	        if (hideIndicator) {
	            persistentClock.innerHTML = '<span class="material-symbols-rounded"><br></span>';
	            persistentClock.style.opacity = '0';
	        } else {
	            persistentClock.innerHTML = '<span class="material-symbols-rounded">maximize</span>';
	            persistentClock.style.opacity = '1';
	        }
		}
	  }
	}
    
	// Make sure we re-attach the click event listener
	persistentClock.addEventListener('click', () => {
        // Prevent re-opening if already visible/opening
        if (customizeModal.style.display === 'block') return;

        clearTimeout(hideActionsTimeout); 
        syncUiStates();

        const appManagementInfo = document.getElementById('app-management-info');
        const currentAppLabel = document.getElementById('current-app-label');
        const appControls = document.getElementById('app-controls');
        
        // Clean up any previously injected split container
        const existingSplit = document.getElementById('split-management-container');
        if(existingSplit) existingSplit.remove();
        
        // Default state: Show standard label (with safety checks)
        if (currentAppLabel) currentAppLabel.style.display = '';
        if (appControls) appControls.style.display = '';

        // CHECK: Are we in a Split Screen state?
        const isSplitVisible = splitScreenState.active && document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        if (isSplitVisible && appManagementInfo) {
             // --- SPLIT MODE UI ---
             if (currentAppLabel) currentAppLabel.style.display = 'none';
             if (appControls) appControls.style.display = 'none';
             
             const splitContainer = document.createElement('div');
             splitContainer.id = 'split-management-container';
             splitContainer.style.cssText = 'display: flex; gap: 18px; width: 100%; justify-content: space-between;';
             
             // Helper to build a mini-card for each app
             const createSplitCard = (url, side) => {
                 const appName = Object.keys(apps).find(k => apps[k].url === url) || 'Unknown';
                 const card = document.createElement('div');
                 card.className = 'setting-item'; // Reuse existing style class for look
                 card.style.cssText = 'flex: 1; display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 10px; cursor: default;';
                 
                 const img = document.createElement('img');
                 let iconUrl = apps[appName]?.icon;
                 if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('./') && !iconUrl.startsWith('data:')) {
                     iconUrl = `./assets/appicon/${iconUrl}`;
                 }
                 img.src = iconUrl || '';
                 img.style.cssText = 'width: 32px; height: 32px; border-radius: 35%; corner-shape: superellipse(1.25); object-fit: cover;';
                 
                 const closeBtn = document.createElement('button');
                 closeBtn.className = 'btn-qc';
                 closeBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size: 18px;">cancel</span>';
                 closeBtn.onclick = (e) => {
                     e.stopPropagation();
                     closeControls();
                     // Close THIS side, expand the OTHER side
                     const survivor = (side === 'left') ? splitScreenState.rightAppUrl : splitScreenState.leftAppUrl;
                     exitSplitScreen(survivor);
                 };
                 
                 card.appendChild(img);
                 card.appendChild(closeBtn);
                 return card;
             };

             if (splitScreenState.leftAppUrl) splitContainer.appendChild(createSplitCard(splitScreenState.leftAppUrl, 'left'));
             if (splitScreenState.rightAppUrl) splitContainer.appendChild(createSplitCard(splitScreenState.rightAppUrl, 'right'));
             
             appManagementInfo.appendChild(splitContainer);
             appManagementInfo.style.display = 'flex';

        } else if (appManagementInfo) {
            // --- STANDARD SINGLE APP UI ---
            const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
            if (activeEmbed) {
                const url = activeEmbed.dataset.embedUrl;
                const appName = Object.keys(apps).find(name => apps[name].url === url);
                const appDetails = appName ? apps[appName] : null;
    
                if (appDetails && currentAppLabel) {
                    const img = currentAppLabel.querySelector('img');
                    const span = currentAppLabel.querySelector('span');
                    let iconUrl = appDetails.icon;
                    if (iconUrl && !(iconUrl.startsWith('http') || iconUrl.startsWith('./') || iconUrl.startsWith('data:'))) {
                        iconUrl = `./assets/appicon/${iconUrl}`;
                    }
                    if (img) {
                        img.src = iconUrl || '';
                        img.alt = appName;
                    }
                    if (span) span.textContent = appName;
                    appManagementInfo.style.display = 'flex';
                } else {
                    appManagementInfo.style.display = 'none';
                }
            } else {
                appManagementInfo.style.display = 'none';
            }
        }

        // "Read" logic: Clear Home Screen notification activities when panel is opened
        HomeActivityManager.items.forEach(item => {
            if (item.id.startsWith('home-notif-')) {
                // We unregister them from Home Screen only; they stay in the Shade
                HomeActivityManager.unregister(item.id);
            }
        });

		dynamicArea.style.opacity = '0';
		customizeModal.style.display = 'flex';
        customizeModal.style.pointerEvents = 'none'; 
		customizeModal.scrollTop = 0; 
		blurOverlayControls.style.display = 'block';
        blurOverlayControls.style.pointerEvents = 'none'; 

        setTimeout(() => {
            customizeModal.classList.add('show');
            blurOverlayControls.classList.add('show');
            setTimeout(() => {
                customizeModal.style.pointerEvents = 'auto';
                blurOverlayControls.style.pointerEvents = 'auto';
            }, 150);
        }, 10);
    });

    const minimizeBtn = document.getElementById('app-minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            closeControls();
            minimizeFullscreenEmbed();
        });
    }

    const closeBtn = document.getElementById('app-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeControls();
            closeFullscreenEmbed();
        });
    }
    
    // Setup observer to watch for embed visibility changes to update clock immediately
    const embedObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && 
                (mutation.target.classList.contains('fullscreen-embed') || 
                 mutation.target.matches('#app-drawer'))) {
                updatePersistentClock();
            }
        });
    });
    
    // Observe fullscreen-embed style changes
    document.querySelectorAll('.fullscreen-embed').forEach(embed => {
        embedObserver.observe(embed, { attributes: true });
    });
    
    // Also observe app drawer for open/close state changes
    if (appDrawer) {
        embedObserver.observe(appDrawer, { attributes: true });
    }
    
    // Watch for new embed elements being added
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                let changed = false;
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 &&
                        node.classList &&
                        node.classList.contains('fullscreen-embed')) {
                        embedObserver.observe(node, { attributes: true });
                        changed = true;
                    }
                });
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1 &&
                        node.classList &&
                        node.classList.contains('fullscreen-embed')) {
                        changed = true;
                    }
                });
                if (changed) {
                    updatePersistentClock();
                }
            }
        });
    });
    
    bodyObserver.observe(document.body, { childList: true, subtree: true });

	// Update clock to be precise to the minute, saving power.
	// Uses a recursive setTimeout to prevent browser timer drift.
	function synchronizePersistentClock() {
	    updatePersistentClock();
	    
	    const now = new Date();
	    // Calculate exact milliseconds until the start of the next minute
	    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
	
	    // Schedule the next update to happen exactly at XX:XX:00
	    setTimeout(synchronizePersistentClock, msUntilNextMinute);
	}
	
	// Start the synchronized loop
	synchronizePersistentClock();
	
    // --- NEW: Autorun Script ---
    const startupScript = localStorage.getItem('customStartupScript');
    if (startupScript) {
        console.log("[System] Running startup script...");
        setTimeout(() => {
            try {
                // Wrap in async IIFE to allow await in the script
                (async () => {
                    eval(startupScript);
                })();
            } catch (e) {
                console.error("[System] Startup Script Error:", e);
                showNotification("Startup script failed", { icon: 'terminal' });
            }
        }, 1000); // 1s delay to ensure DOM is fully settled
    }
});