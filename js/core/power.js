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
    
    window.isBlackoutActive = true;
    if (typeof window.refreshClockUI === 'function') window.refreshClockUI();

    closeControls();

    // Store previous settings
    previousBlackoutSettings = {
        animationsEnabled: localStorage.getItem('animationsEnabled') || 'true'
    };

    // 1. Handle the currently active app
    const activeEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
    if (activeEmbed) {
        minimizeFullscreenEmbed(); // Minimize if it has media or a live activity
    }
	
    // Apply power saving settings
    setControlValueAndDispatch('animationsEnabled', 'false');

    const sleepStyle = localStorage.getItem('sleepModeStyle') || 'dim-show';
    document.body.classList.add('blackout-active', `blackout-style-${sleepStyle}`);

    // Start OLED Pixel Cleaning sequence
    runPixelCleaningCycle();

    pauseAllAnimations(); // Pause animations on sleep

    // Create a new full-screen overlay to capture all events
    const blockingOverlay = document.createElement('div');
    blockingOverlay.id = 'blackout-event-overlay';
    blockingOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 2000; cursor: pointer; pointer-events: all;
        background-color: transparent; transition: background-color 0.2s;
    `;
    document.body.appendChild(blockingOverlay);
    
    if (localStorage.getItem('autoClearNotificationsOnSleep') === 'true') {
        if (typeof clearAllNotifications === 'function') clearAllNotifications();
    }

    if (localStorage.getItem('emergencySleepScreen') === 'true') {
        const iceContacts = localStorage.getItem('emergencyContacts') || 'No emergency contacts set';
        const iceLabel = document.createElement('div');
        iceLabel.id = 'blackout-ice-info';
        iceLabel.style.cssText = `
            position: fixed; top: 20px; left: 20px;
            color: var(--text-color); font-size: 20px; text-align: center;
            z-index: 2001; text-shadow: 0 0 10px rgba(0,0,0,0.5);
            background-color: var(--modal-background);
            --fx-filter: var(--blur1) glass(0.6, 8, 0);
            box-shadow: var(--sun-shadow);
            padding: 8px 16px; border-radius: 35px; corner-shape: superellipse(1.5);
            border: 4px solid rgba(255,0,0,0.5);
        `;
        iceLabel.innerHTML = `Emergency Contacts:<br>${iceContacts}`;
        document.body.appendChild(iceLabel);
    }

    // After 200ms, enable interaction to prevent immediate dismissal on touch devices
    setTimeout(() => {
        const blocker = document.getElementById('blackout-event-overlay');
        if (blocker) {
            blocker.style.pointerEvents = 'all';
            blocker.addEventListener('click', exitBlackoutMode, { once: true });
            blocker.addEventListener('touchstart', exitBlackoutMode, { once: true });

            if (localStorage.getItem('wakeOnMotion') === 'true') {
                const handleMotion = () => {
                    exitBlackoutMode();
                    blocker.removeEventListener('mousemove', handleMotion);
                    window.removeEventListener('devicemotion', handleDeviceMotion);
                };
                const handleDeviceMotion = (event) => {
                    const acc = event.accelerationIncludingGravity;
                    if (acc) {
                        const total = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
                        if (total > 15) {
                            handleMotion();
                        }
                    }
                };
                blocker.addEventListener('mousemove', handleMotion);
                window.addEventListener('devicemotion', handleDeviceMotion);
            }
        }
    }, 200);
}

function exitBlackoutMode() {
    window.isBlackoutActive = false;
    const iceLabel = document.getElementById('blackout-ice-info');
    if (iceLabel) iceLabel.remove();

    // Stop pixel cleaner if it's currently running
    stopPixelCleaning();

    // Force immediate clock update to bring seconds back to the UI seamlessly
    if (typeof window.refreshClockUI === 'function') window.refreshClockUI();
    
    // Restore previous settings
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

// --- Battery Status Logic ---
function initBattery() {
	if ('getBattery' in navigator) {
		navigator.getBattery().then(battery => {
			const batContainer = document.getElementById('battery-status-indicator');
			const batIcon = batContainer.querySelector('span');
			
			// Only show the indicator if API is supported and active
			batContainer.style.display = 'flex';

			function updateBatteryUI() {
				const level = battery.level * 100;
				const isCharging = battery.charging;

				// Update Globals for Remote
                window.currentBatteryLevel = Math.round(level);
                window.currentBatteryCharging = isCharging;

				// Reset colors
				batIcon.style.color = 'var(--text-color)';

				// Adaptive Eco Mode
                const ecoEnabled = localStorage.getItem('adaptiveBatterySaver') !== 'false';
                let targetTier = 0; // 0 = off, 1 = moderate, 2 = severe, 3 = critical
                
                if (ecoEnabled && !isCharging) {
                    if (level <= 15) targetTier = 3;
                    else if (level <= 30) targetTier = 2;
                    else if (level <= 50) targetTier = 1;
                }

                if (targetTier !== window.currentEcoTier) {
                    document.body.classList.remove('eco-mode-active', 'eco-critical', 'eco-severe', 'eco-moderate');
                    
                    if (targetTier > 0) {
                        document.body.classList.add('eco-mode-active');
                        if (targetTier === 1) document.body.classList.add('eco-moderate');
                        if (targetTier === 2) document.body.classList.add('eco-severe');
                        if (targetTier === 3) {
                            document.body.classList.add('eco-critical', 'reduce-animations');
                            if (window.currentEcoTier < 3) {
                                showNotification(`Eco mode enabled`, {
                                    heading: `Low battery`,
                                    icon: 'battery_android_1',
                                    system: true
                                });
                            }
                        } else if ((!window.currentEcoTier || window.currentEcoTier === 0) && targetTier === 2) {
                            return
                        }
                    } else {
                        if (localStorage.getItem('animationsEnabled') !== 'false') {
                            document.body.classList.remove('reduce-animations');
                        }
                        if (window.currentEcoTier > 0) showPopup('Eco mode disabled');
                    }
                    window.currentEcoTier = targetTier;
                }

				if (isCharging) {
					batIcon.textContent = 'battery_android_bolt';
				} else {
					if (level <= 15) {
						batIcon.textContent = 'battery_android_1';
						// Make it red for low battery
						batIcon.style.color = '#ff5252'; 
					} else if (level <= 30) {
						batIcon.textContent = 'battery_android_2';
					} else if (level <= 50) {
						batIcon.textContent = 'battery_android_3';
					} else if (level <= 65) {
						batIcon.textContent = 'battery_android_4';
					} else if (level <= 85) {
						batIcon.textContent = 'battery_android_5';
					} else if (level <= 99) {
						batIcon.textContent = 'battery_android_6';
					} else {
						batIcon.textContent = 'battery_android_0';
					}
				}

				if (window.WavesHost) window.WavesHost.pushFullState();
			}

			updateBatteryUI();
			battery.addEventListener('chargingchange', updateBatteryUI);
			battery.addEventListener('levelchange', updateBatteryUI);
		});
	}
}

// --- OLED Burn-in Protection ---
let pixelCleanerTimeout = null;

function runPixelCleaningCycle() {
    const enabled = localStorage.getItem('oledBurnInProtection') !== 'false';
    if (!enabled) return;
    if (document.getElementById('pixel-cleaner')) return;

    console.log('[Power] Running OLED Pixel Cleaning cycle...');
    document.body.classList.add('oled-pixel-cleaning');

    const cleaner = document.createElement('div');
    cleaner.id = 'pixel-cleaner';
    cleaner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 9999999; pointer-events: none; overflow: hidden;
        opacity: 0; transition: opacity 2s;
    `;
    
    const bar = document.createElement('div');
    bar.style.cssText = `
        width: 100%; height: 20vh;
        background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 100%);
    `;
    cleaner.appendChild(bar);
    document.body.appendChild(cleaner);
    
    setTimeout(() => cleaner.style.opacity = '1', 100);

    // Run the cleaning cycle for 5 minutes then remove it
    clearTimeout(pixelCleanerTimeout);
    pixelCleanerTimeout = setTimeout(() => {
        stopPixelCleaning();
        console.log('[Power] OLED Pixel Cleaning cycle complete.');
    }, 5 * 60 * 1000);
}

function stopPixelCleaning() {
    clearTimeout(pixelCleanerTimeout);
    document.body.classList.remove('oled-pixel-cleaning');
    const cleaner = document.getElementById('pixel-cleaner');
    if (cleaner) {
        cleaner.style.opacity = '0';
        setTimeout(() => cleaner.remove(), 2000);
    }
}

function startOledProtection() {
    let angle = 0;
    const radius = 0.5;
    
    // Add CSS for advanced OLED techniques (Pixel Sweep & Logo Luminance Dimming)
    if (!document.getElementById('oled-advanced-style')) {
        const style = document.createElement('style');
        style.id = 'oled-advanced-style';
        style.textContent = `
            @keyframes pixel-sweep {
                0% { transform: translateY(-20vh); }
                100% { transform: translateY(100vh); }
            }
            /* High specificity to override the .reduce-animations global pause during sleep */
            #pixel-cleaner > div {
                animation: pixel-sweep 6s linear infinite !important;
            }
            .oled-dimmed .persistent-clock, 
            .oled-dimmed .widget-instance,
            .oled-dimmed .info,
            .oled-dimmed .nav-btn-small,
            .oled-dimmed .drawer-pill,
            .oled-dimmed .dock {
                opacity: 0.5 !important;
                transition: opacity 5s ease-in-out, filter 5s ease-in-out !important;
                filter: saturate(0.6) !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    setInterval(() => {
        const enabled = localStorage.getItem('oledBurnInProtection') !== 'false';
        if (!enabled) {
            document.body.classList.remove('oled-dimmed');
            return;
        }

        // Technique 1: Ultra-subtle sub-pixel shifting
        const elements = document.querySelectorAll('body > *:not(#screen-curve-overlay):not(#a11y-overlay):not(#blackout-event-overlay):not(#brightness-overlay):not(#temperature-overlay):not(#pixel-cleaner)');
        
        let x = 0, y = 0;
        if (!window.isBlackoutActive) {
            angle += 0.5;
            if (angle >= Math.PI * 2) angle -= Math.PI * 2;
            x = (Math.cos(angle) * radius).toFixed(2);
            y = (Math.sin(angle) * radius).toFixed(2);
        }
        
        elements.forEach(el => {
            el.style.translate = `${x}px ${y}px`;
        });

    }, 60000); // Check every 1 minute
}