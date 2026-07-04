let isSilentMode = 'false'; // Global flag to track silent mode state

let activeMediaSessionApp = null; // To track which app controls the media widget

// This object will hold the callback functions sent by the Gurapp
let mediaSessionActions = {
    playPause: null,
    next: null,
    prev: null
};

let currentLanguage = LANG_EN; // Default to English

function applyLanguage(language) {
    console.log('Applying language:', language);
    document.querySelector('.modal-content h2').innerText = language.CONTROLS;
    document.querySelector('#silent_switch_qc .qc-label').innerText = language.SILENT;
    document.querySelector('#temp_control_qc .qc-label').innerText = language.TONE;
    document.querySelector('#minimal_mode_qc .qc-label').innerText = language.MINIMAL;
    document.querySelector('#light_mode_qc .qc-label').innerText = language.DAYLIGHT;

    // Dynamically update labels in the grid
    document.querySelectorAll('.setting-label[data-lang-key]').forEach(label => {
        const key = label.getAttribute('data-lang-key');
        if (language[key]) {
            label.innerText = language[key];
        }
    });

    // Safely update elements that might not always be visible
    const versionButton = document.querySelector('.version-info button#versionButton');
    if (versionButton) versionButton.textContent = language.GET_DOCS;
    
    const resetButton = document.getElementById('resetButton');
    if(resetButton) resetButton.textContent = language.RESET_BTN;
    
    // Safely update font dropdown options
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        const options = {
            "Inter": "DEFAULT", "Roboto": "WORK", "DynaPuff": "PUFFY", "DM Serif Display": "CLASSIC",
            "Iansui": "STROKES", "JetBrains Mono": "MONO", "DotGothic16": "PIXEL",
            "Patrick Hand": "WRITTEN", "Rampart One": "RAISED", "Doto": "DOT", "Nunito": "ROUND"
        };
        for (const [value, langKey] of Object.entries(options)) {
            const optionEl = fontSelect.querySelector(`option[value="${value}"]`);
            if (optionEl) optionEl.textContent = language[langKey];
        }
    }

    const adjustLabel = document.querySelector('#thermostat-popup .adjust-label');
    if (adjustLabel) {
        adjustLabel.textContent = language.ADJUST;
    }

    // Update checkWords and closeWords
    window.checkWords = language.CHECK_WORDS;
    window.closeWords = language.CLOSE_WORDS;
}

function selectLanguage(languageCode) {
	const languageMap = {
	    'EN': LANG_EN,
	    'JP': LANG_JP,
	    'DE': LANG_DE,
	    'FR': LANG_FR,
	    'ES': LANG_ES,
	    'KO': LANG_KO,
	    'ZH': LANG_ZH,
	    'HI': LANG_HI,
	    'PT': LANG_PT,
	    'BN': LANG_BN,
	    'RU': LANG_RU,
	    'PA': LANG_PA,
	    'VI': LANG_VI,
	    'TR': LANG_TR,
	    'AR_EG': LANG_AR_EG,
	    'MR': LANG_MR,
	    'TE': LANG_TE,
	    'TA': LANG_TA,
	    'UR': LANG_UR,
	    'ID': LANG_ID,
	    'JV': LANG_JV,
	    'FA_IR': LANG_FA_IR,
	    'IT': LANG_IT,
	    'HA': LANG_HA,
	    'GU': LANG_GU,
	    'AR_LEV': LANG_AR_LEV,
	    'BHO': LANG_BHO
	};

    currentLanguage = languageMap[languageCode] || LANG_EN;
    console.log('Selected language code:', languageCode);
    console.log('Current language object:', currentLanguage);

    applyLanguage(currentLanguage);

    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.value = languageCode;
    }
}

function consoleLicense() {
    console.info(currentLanguage.LICENCE);
}

consoleLicense()

function consoleLoaded() {
    console.log(currentLanguage.LOAD_SUCCESS);
}

const secondsSwitch = document.getElementById('seconds-switch');
let appUsage = {};
const MAX_RECENT_WALLPAPERS = 10;

let showSeconds = true; // defaults to true
let recentWallpapers = [];
let currentWallpaperPosition = 0;
let isSlideshow = false;
let minimizedEmbeds = {}; // Object to store minimized embeds by URL
let appLastOpened = {};

secondsSwitch.checked = showSeconds;

// Add 12/24 hour format functionality
let use12HourFormat = false; // Default to 24-hour format if not set

// Setup the hour format toggle
const hourFormatSwitch = document.getElementById('hour-switch');
hourFormatSwitch.checked = use12HourFormat; // Initialize the switch state

// Add event listener for the hour format toggle
hourFormatSwitch.addEventListener('change', function() {
  use12HourFormat = this.checked;
  updateClockAndDate(); // Update clock immediately after change
});

// Function to get current time in 24-hour format (HH:MM:SS)
function getCurrentTime24() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

const persistentClock = document.getElementById('persistent-clock');

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
        const rect = sourceElement.getBoundingClientRect();
        controlPopup.style.display = 'block';
        const top = rect.bottom + 8;
        const left = rect.left + (rect.width / 2) - (controlPopup.offsetWidth / 2);
        controlPopup.style.top = `${top}px`;
        controlPopup.style.left = `${left}px`;
    }

    // --- Global click listener to hide the popup ---
    document.addEventListener('click', (e) => {
        if (controlPopup.style.display === 'block' && !controlPopup.contains(e.target) && !e.target.closest('.setting-item')) {
            hideActivePopup();
        }
    });

    // --- Helper to connect grid items to their controls ---
    const connectGridItem = (gridItemId, controlId) => {
        const gridItem = document.getElementById(gridItemId);
        const control = document.getElementById(controlId);
        if (!gridItem || !control) return;

        const isPopupTrigger = control.nodeName === 'SELECT' || control.type === 'range';
        const isToggle = control.type === 'checkbox';

        if (isToggle) {
            const updateActiveState = () => gridItem.classList.toggle('active', control.checked);
            control.addEventListener('change', updateActiveState);
            updateActiveState();
        }
        
        gridItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isPopupTrigger) {
                showControlPopup(gridItem, control);
            } else if (isToggle) {
                control.checked = !control.checked;
                control.dispatchEvent(new Event('change'));
            } else {
                control.click();
            }
        });
    };

    // --- Special Handler for Clock Color ---
    const clockColorItem = document.getElementById('setting-clock-color');
    const colorSwitch = document.getElementById('clock-color-switch');
    const colorPicker = document.getElementById('clock-color-picker');

    if (clockColorItem && colorSwitch && colorPicker) {
        const updateColorActiveState = () => clockColorItem.classList.toggle('active', colorSwitch.checked);
        colorSwitch.addEventListener('change', updateColorActiveState);
        updateColorActiveState();

        clockColorItem.addEventListener('click', (e) => {
            e.stopPropagation();
            colorSwitch.checked = !colorSwitch.checked;
            colorSwitch.dispatchEvent(new Event('change'));
            if (colorSwitch.checked) {
                hideActivePopup(); // Close other popups before opening the color picker
                setTimeout(() => colorPicker.click(), 50);
            }
        });
    }

    // --- Connect all other settings ---
    connectGridItem('setting-wallpaper', 'uploadButton');
    connectGridItem('setting-reset', 'resetButton');
    connectGridItem('setting-seconds', 'seconds-switch');
    connectGridItem('setting-clock-stack', 'clock-stack-switch');
    connectGridItem('setting-gurapps', 'gurapps-switch');
    connectGridItem('setting-animation', 'animation-switch');
    connectGridItem('setting-contrast', 'contrast-switch');
    connectGridItem('setting-hour-format', 'hour-switch');
    connectGridItem('setting-style', 'font-select');
    connectGridItem('setting-weight', 'weight-slider');
    connectGridItem('setting-language', 'language-switcher');
    connectGridItem('setting-ai', 'ai-switch');
	
    const appDrawer = document.getElementById('app-drawer');
    const persistentClock = document.querySelector('.persistent-clock');
    const customizeModal = document.getElementById('customizeModal');
    
function updatePersistentClock() {
  const isModalOpen = 
    (appDrawer && appDrawer.classList.contains('open')) ||
    document.querySelector('.fullscreen-embed[style*="display: block"]');
    
  if (isModalOpen) {
    const now = new Date();
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    
    let displayHours;
    
    if (use12HourFormat) {
      // 12-hour format without AM/PM
      displayHours = hours % 12 || 12;
      displayHours = String(displayHours).padStart(2, '0');
    } else {
      // 24-hour format
      displayHours = String(hours).padStart(2, '0');
    }
    
    persistentClock.textContent = `${displayHours}:${minutes}`;
  } else {
    persistentClock.innerHTML = '<span class="material-symbols-rounded">maximize</span>';
  }
}
    
    // Make sure we re-attach the click event listener
    persistentClock.addEventListener('click', () => {
	customizeModal.style.display = 'block';
	blurOverlayControls.style.display = 'block';
        setTimeout(() => {
	    customizeModal.classList.add('show');
            blurOverlayControls.classList.add('show');
        }, 10);
    });
    
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
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && // Element node
                        node.classList && 
                        node.classList.contains('fullscreen-embed')) {
                        embedObserver.observe(node, { attributes: true });
                        updatePersistentClock();
                    }
                });
            }
        });
    });
    
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    
    // Update clock
    setInterval(updatePersistentClock, 30000);
    
    // Initial update
    updatePersistentClock();
}); 

// Function to check if it's daytime (between 6:00 and 18:00)
function isDaytime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour <= 18;
}

function isDaytimeForHour(timeString) {
    const hour = new Date(timeString).getHours();
    return hour >= 6 && hour <= 18;
}

function updateClockAndDate() {
    let clockElement = document.getElementById('clock');
    let dateElement = document.getElementById('date');
    let modalTitle = document.querySelector('#customizeModal h2');
    
    let now = new Date();
    
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    
    let displayHours;
    let period = '';
    
    if (use12HourFormat) {
        // 12-hour format
        period = hours >= 12 ? ' PM' : ' AM';
        displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        displayHours = String(displayHours).padStart(2, '0');
    } else {
        // 24-hour format
        displayHours = String(hours).padStart(2, '0');
    }
    
    // Function to wrap each digit in a container for monospacing
    function wrapDigits(timeString) {
        return timeString.split('').map(char => {
            if (/\d/.test(char)) {
                return `<span class="digit">${char}</span>`;
            } else {
                return char;
            }
        }).join('');
    }
    
    // Check if stacked layout is enabled
    const stackSwitch = document.getElementById('clock-stack-switch');
    const isStacked = stackSwitch && stackSwitch.checked;
    
    if (isStacked) {
        // Stacked format: each time component on a new line with digit containers
        if (showSeconds) {
            clockElement.innerHTML = `
                <div>${wrapDigits(displayHours)}</div>
                <div>${wrapDigits(minutes)}</div>
                <div>${wrapDigits(seconds)}</div>
                ${period ? `<div>${period.trim()}</div>` : ''}
            `;
        } else {
            clockElement.innerHTML = `
                <div>${wrapDigits(displayHours)}</div>
                <div>${wrapDigits(minutes)}</div>
                ${period ? `<div>${period.trim()}</div>` : ''}
            `;
        }
    } else {
        // Normal format: standard time display with digit containers
        const timeString = showSeconds ? 
            `${displayHours}:${minutes}:${seconds}${period}` : 
            `${displayHours}:${minutes}${period}`;
        clockElement.innerHTML = wrapDigits(timeString);
    }
        
    let formattedDate = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    dateElement.textContent = formattedDate;
    if (modalTitle) modalTitle.textContent = formattedDate;
}

function startSynchronizedClockAndDate() {
  function scheduleNextUpdate() {
    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();
    
    setTimeout(() => {
      updateClockAndDate();
      
      setInterval(updateClockAndDate, 1000);
    }, msUntilNextSecond);
  }
  
  updateClockAndDate(); // Initial update
  scheduleNextUpdate();
}

        async function getTimezoneFromCoords(latitude, longitude) {
            try {
                // Use browser's timezone as the primary method
                return Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch (error) {
                console.warn('Failed to get timezone, using UTC:', error);
                return 'UTC';
            }
        }

function getDayOfWeek(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function getHourString(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Updated helper function to determine if a specific hour is daytime based on timezone
function isDaytimeForHour(timeString, timezone = 'UTC') {
    const date = new Date(timeString);
    const hour = new Date(date.toLocaleString("en-US", {timeZone: timezone})).getHours();
    return hour >= 6 && hour <= 18;
}

const clockElement = document.getElementById('clock');
const dateElement = document.getElementById('date');
const closeModal = document.getElementById('closeModal');
const blurOverlay = document.getElementById('blurOverlay');

clockElement.addEventListener('click', () => {
    if (!gurappsEnabled) return;
    showPopup('Finish setup to do this action');
});

dateElement.addEventListener('click', () => {
    if (!gurappsEnabled) return;
    showPopup('Finish setup to do this action');
});

startSynchronizedClockAndDate();

function showPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.bottom = '10vh';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.backgroundColor = 'var(--search-background)';
    popup.style.backdropFilter = 'blur(10px)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '20px';
    popup.style.borderRadius = '40px';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '10px';
    popup.style.border = '1px solid var(--glass-border)';
    popup.style.filter = 'none';

    // Check for specific words to determine icon
    const checkWords = window.checkWords || ['updated', 'complete', 'done', 'success', 'completed', 'ready', 'successfully', 'accepted', 'accept', 'yes'];
    const closeWords = window.closeWords || ['failed', 'canceled', 'error', 'failure', 'fail', 'cancel', 'rejected', 'reject', 'not', 'no'];

    let shouldShowIcon = false;
    let iconType = '';
    
    // Check if message contains any of the trigger words
    if (checkWords.some(word => message.toLowerCase().includes(word))) {
        shouldShowIcon = true;
        iconType = 'check';
    } else if (closeWords.some(word => message.toLowerCase().includes(word))) {
        shouldShowIcon = true;
        iconType = 'close';
    }
    
    // Add icon if needed
    if (shouldShowIcon) {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = iconType;
        popup.appendChild(icon);
    }
    
    popup.appendChild(document.createTextNode(message));
    
    // Check if the message is about fullscreen and add a button if it is
    if (message === currentLanguage.NOT_FULLSCREEN) {
        // Clear existing text content since we only want to show the button
        while (popup.firstChild) {
            popup.removeChild(popup.firstChild);
        }
        // Make the popup background invisible
        popup.style.backgroundColor = 'transparent';
        popup.style.backdropFilter = 'none';
        popup.style.padding = '0';
        
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.style.padding = '10px 10px';
        fullscreenBtn.style.borderRadius = '25px';
        fullscreenBtn.style.border = 'var(--glass-border)';
        fullscreenBtn.style.backgroundColor = 'var(--search-background)';
        fullscreenBtn.style.backdropFilter = 'blur(20px)';
        fullscreenBtn.style.color = 'var(--text-color)';
        fullscreenBtn.style.cursor = 'pointer';
        fullscreenBtn.style.display = 'flex';
        fullscreenBtn.style.alignItems = 'center'; // This ensures vertical centering
        fullscreenBtn.style.justifyContent = 'center';
        fullscreenBtn.style.gap = '5px'; // Gap between text and icon
        fullscreenBtn.style.fontFamily = 'Inter, sans-serif';
        fullscreenBtn.style.height = '36px'; // Setting a fixed height helps with centering
        
        // Create the icon element
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = 'fullscreen';
        icon.style.fontFamily = 'Material Symbols Rounded';
        icon.style.fontSize = '20px';
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
    }, 3000);
}

function showNotification(message, options = {}) {
    let popupNotification = null;
    
    // Only create on-screen popup if silent mode is NOT active
    if (!isSilentMode) {
        popupNotification = createOnScreenPopup(message, options);
    }
    
    // Always create persistent notification in the shade
    const shadeNotification = addToNotificationShade(message, options);
    
    // Return control methods
    return {
        closePopup: () => {
            if (popupNotification) popupNotification.close(); // Only call if popup was created
        },
        closeShade: shadeNotification.close,
        update: (newMessage) => {
            if (popupNotification) popupNotification.update(newMessage); // Only update if popup was created
            shadeNotification.update(newMessage);
        }
    };
}

    // Function to close a notification
    function closeNotification(notif) {
        // Animate out
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(50px)';
        
        // Remove after animation completes
        setTimeout(() => {
            if (shade.contains(notif)) {
                shade.removeChild(notif);
            }
        }, 300);
    }

// Creates a temporary on-screen popup (similar to original showPopup)
function createOnScreenPopup(message, options = {}) {
    const popup = document.createElement('div');
    popup.className = 'on-screen-notification';
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.backgroundColor = 'var(--modal-background)';
    popup.style.backdropFilter = 'blur(50px)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '16px';
    popup.style.borderRadius = '25px';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '16px';
    popup.style.border = '1px solid var(--glass-border)';
    
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
    
    // Add icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = iconType;
    popup.appendChild(icon);
    
    // Add message text
    const messageText = document.createElement('div');
    messageText.textContent = message;
    popup.appendChild(messageText);
    
    // Check if a button should be added
    if (options.buttonText) {
        const actionButton = document.createElement('button');
        actionButton.textContent = options.buttonText;
        actionButton.style.marginLeft = '10px';
        actionButton.style.padding = '8px 16px';
        actionButton.style.borderRadius = '18px';
        actionButton.style.border = '1px solid var(--glass-border)';
        actionButton.style.backgroundColor = 'var(--text-color)';
        actionButton.style.color = 'var(--background-color)';
        actionButton.style.cursor = 'pointer';
        
        // Handle local action or Gurapp-specific action
        if (options.buttonAction && typeof options.buttonAction === 'function') { // For parent-local actions
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                options.buttonAction();
                closeNotification(notification);
            });
        } else if (options.gurappAction && options.gurappAction.appName && options.gurappAction.functionName) { // For Gurapp-specific actions
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const { appName, functionName, args } = options.gurappAction;
                const gurappIframe = document.querySelector(`iframe[data-app-id="${appName}"]`);
                if (gurappIframe && gurappIframe.contentWindow) {
                    // Send a message to the specific Gurapp iframe to trigger the function
                    gurappIframe.contentWindow.postMessage({
                        type: 'gurapp-action-request',
                        functionName: functionName,
                        args: args || []
                    }, window.location.origin);
                    console.log(`[Airy] Sent action '${functionName}' to Gurapp '${appName}'.`);
                } else {
                    console.warn(`[Airy] Could not find Gurapp iframe for '${appName}' to send action '${functionName}'.`);
                    showPopup(`Cannot perform action for ${appName}`);
                }
                closeNotification(notification); // Close the notification after click
            });
        }
        
        popup.appendChild(actionButton);
    }
    
    // Get all existing popups
    const existingPopups = document.querySelectorAll('.on-screen-notification');
    
    // If there are already 2 popups, remove the oldest one
    if (existingPopups.length >= 2) {
        document.body.removeChild(existingPopups[0]);
    }
    
    // Recalculate positions for all popups
    const remainingPopups = document.querySelectorAll('.on-screen-notification');
    remainingPopups.forEach((p, index) => {
        p.style.top = `${20 + (index * 70)}px`;
    });
    
    // Position the new popup
    popup.style.top = `${20 + (remainingPopups.length * 70)}px`;
    
    document.body.appendChild(popup);
    
    // Auto-dismiss on-screen popup after 10 seconds
    const timeoutId = setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
                // Readjust positions of remaining popups
                const remainingPopups = document.querySelectorAll('.on-screen-notification');
                remainingPopups.forEach((p, index) => {
                    p.style.top = `${20 + (index * 70)}px`;
                });
            }
        }, 500);
    }, 10000);
    
    // Return control methods
    return {
        close: () => {
            clearTimeout(timeoutId);
            popup.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                    // Readjust positions of remaining popups
                    const remainingPopups = document.querySelectorAll('.on-screen-notification');
                    remainingPopups.forEach((p, index) => {
                        p.style.top = `${20 + (index * 70)}px`;
                    });
                }
            }, 500);
        },
        update: (newMessage) => {
            messageText.textContent = newMessage;
        }
    };
}

// Adds a notification to the notification shade
function addToNotificationShade(message, options = {}) {
    // Get or create notification shade
    let shade = document.querySelector('.notification-shade');
    if (!shade) {
        shade = document.createElement('div');
        shade.className = 'notification-shade';
        shade.style.position = 'fixed';
        shade.style.top = '0';
        shade.style.right = '0';
        shade.style.width = '350px';
        shade.style.maxWidth = '100%';
        shade.style.height = '100%';
        shade.style.overflowY = 'auto';
        shade.style.zIndex = '9999995';
        shade.style.padding = '20px';
        shade.style.pointerEvents = 'none';
        document.body.appendChild(shade);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'shade-notification';
    notification.style.backgroundColor = 'var(--search-background)';
    notification.style.backdropFilter = 'blur(20px)';
    notification.style.color = 'var(--text-color)';
    notification.style.padding = '18px';
    notification.style.borderRadius = '25px';
    notification.style.marginBottom = '10px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(50px)';
    notification.style.display = 'flex';
    notification.style.flexDirection = 'column';
    notification.style.gap = '10px';
    notification.style.border = '1px solid var(--glass-border)';
    notification.style.pointerEvents = 'auto';
    
    // Content container
    const contentContainer = document.createElement('div');
    contentContainer.style.display = 'flex';
    contentContainer.style.alignItems = 'center';
    contentContainer.style.gap = '10px';
    contentContainer.style.width = '100%';
    
    let iconType = 'notification';

    let iconTypeForShade = 'notification'; // Default icon
    if (options.icon) { // Prefer explicit icon from options
        iconTypeForShade = options.icon;
    } else {
        iconTypeForShade = 'notification';
    }
    
    // Create icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = iconTypeForShade;
    icon.style.fontSize = '24px';
    contentContainer.appendChild(icon);
    
    // Create message text
    const messageText = document.createElement('div');
    messageText.style.flex = '1';
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
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeNotification(notification);
    });
    closeBtn.style.transition = 'opacity 0.2s';
	
    contentContainer.appendChild(closeBtn);

    function closeNotification(notif) {
        // Animate out
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(50px)';
        
        // Remove after animation completes
        setTimeout(() => {
            if (shade.contains(notif)) {
                shade.removeChild(notif);
            }
        }, 300);
    }
    
    notification.appendChild(contentContainer);
    
    // Add action button if specified
    if (options.buttonText) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        
        const actionButton = document.createElement('button');
        actionButton.textContent = options.buttonText;
        actionButton.style.padding = '8px 16px';
        actionButton.style.borderRadius = '18px';
        actionButton.style.border = '1px solid var(--glass-border)';
        actionButton.style.backgroundColor = 'var(--text-color)';
        actionButton.style.color = 'var(--background-color)';
        actionButton.style.cursor = 'pointer';
        actionButton.style.fontFamily = 'Inter, sans-serif';
        actionButton.style.fontSize = '14px';
        actionButton.style.transition = 'background-color 0.2s';
        
        // Handle local action or Gurapp-specific action
        if (options.buttonAction && typeof options.buttonAction === 'function') { // For parent-local actions
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                options.buttonAction();
                closeNotification(notification);
            });
        } else if (options.gurappAction && options.gurappAction.appName && options.gurappAction.functionName) { // For Gurapp-specific actions
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const { appName, functionName, args } = options.gurappAction;
                const gurappIframe = document.querySelector(`iframe[data-app-id="${appName}"]`);
                if (gurappIframe && gurappIframe.contentWindow) {
                    // Send a message to the specific Gurapp iframe to trigger the function
                    gurappIframe.contentWindow.postMessage({
                        type: 'gurapp-action-request',
                        functionName: functionName,
                        args: args || []
                    }, window.location.origin);
                    console.log(`[Airy] Sent action '${functionName}' to Gurapp '${appName}'.`);
                } else {
                    console.warn(`[Airy] Could not find Gurapp iframe for '${appName}' to send action '${functionName}'.`);
                    showPopup(`Error: Could not perform action for ${appName}.`);
                }
                closeNotification(notification); // Close the notification after click
            });
        }
        
        buttonContainer.appendChild(actionButton);
        notification.appendChild(buttonContainer);
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
            notification.style.opacity = 1 - (diff / 200);
        }
    }, { passive: true });
    
    notification.addEventListener('touchend', () => {
        const diff = currentX - startX;
        if (diff > 100) {
            // Swipe threshold reached, dismiss notification
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (shade.contains(notification)) {
                    shade.removeChild(notification);
                }
            }, 300);
        } else {
            // Reset position
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }
    });
    
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
            messageText.textContent = newMessage;
        }
    };
}

function isFullScreen() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function goFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen();
    }
}

function firstSetup() {
    // Get the selected language, defaulting to 'EN'
    const selectedLanguage = 'EN';
    console.log('First setup: selected language:', selectedLanguage);

    // Select and apply the language
    selectLanguage(selectedLanguage);
}

const customizeModal = document.getElementById('customizeModal');
const themeSwitch = document.getElementById('theme-switch');
const wallpaperInput = document.getElementById('wallpaperInput');
const uploadButton = document.getElementById('uploadButton');
const SLIDESHOW_INTERVAL = 600000; // 10 minutes in milliseconds
const gurappsSwitch = document.getElementById("gurapps-switch");
const contrastSwitch = document.getElementById('contrast-switch');
const animationSwitch = document.getElementById('animation-switch');
let gurappsEnabled = true;
let slideshowInterval = null;
let currentWallpaperIndex = 0;
let minimalMode = false;

// Theme switching functionality
function setupThemeSwitcher() {
    // Check and set initial theme
    const currentTheme = 'dark';
    document.body.classList.toggle('light-theme', currentTheme === 'light');
}

// Load saved preference
const highContrastEnabled = false;
contrastSwitch.checked = highContrastEnabled;

// Apply high contrast if enabled (initial state)
if (highContrastEnabled) {
    document.body.classList.add('high-contrast');
}

// Event listener for contrast toggle
contrastSwitch.addEventListener('change', function() {
    const highContrast = this.checked;
    document.body.classList.toggle('high-contrast', highContrast);
});

// Load saved preference (default to true/on if not set)
const animationsEnabled = true;
animationSwitch.checked = animationsEnabled;
// Apply initial state
if (!animationsEnabled) {
    document.body.classList.add('reduce-animations');
}
// Event listener for animation toggle
animationSwitch.addEventListener('change', function() {
    const enableAnimations = this.checked;
    document.body.classList.toggle('reduce-animations', !enableAnimations);
    
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
        iframe.contentWindow.postMessage({
            type: 'animationsUpdate',
            enabled: animationsEnabled  // true or false
        }, window.location.origin);
    });
});

// Function to handle Gurapps visibility
function updateGurappsVisibility() {
    const drawerHandle = document.querySelector(".drawer-handle");
    const dock = document.getElementById("dock");
    
    if (gurappsEnabled) {
        // Show Gurapps elements
        if (drawerHandle) drawerHandle.style.display = "block";
        if (dock) dock.classList.remove("permanently-hidden");
        
        // Reset app functionality
        document.body.classList.remove("gurapps-disabled");
    } else {
        // Hide Gurapps elements
        if (drawerHandle) drawerHandle.style.display = "none";
        if (dock) dock.classList.add("permanently-hidden");
        
        // Add class to body for CSS targeting
        document.body.classList.add("gurapps-disabled");
        
        // Close app drawer if open
        if (appDrawer.classList.contains("open")) {
            appDrawer.style.transition = "bottom 0.3s ease";
            appDrawer.style.bottom = "-100%";
            appDrawer.style.opacity = "0";
            appDrawer.classList.remove("open");
            initialDrawerPosition = -100;
        }
    }
}

gurappsSwitch.checked = gurappsEnabled;
gurappsSwitch.addEventListener("change", function() {
    gurappsEnabled = this.checked;
    updateGurappsVisibility();
});

function updateMinimalMode() {
    const elementsToHide = [
        document.querySelector('.info'),
        document.querySelector('.clockwidgets')
    ];
    
    if (minimalMode) {
        // Hide elements
        elementsToHide.forEach(el => {
            if (el) el.style.display = 'none';
        });
        // Add minimal-active class to body for potential CSS styling
        document.body.classList.add('minimal-active');
    } else {
        if (document.querySelector('.info'))
            document.querySelector('.info').style.display = '';
            
        if (document.querySelector('.clockwidgets'))
            document.querySelector('.clockwidgets').style.display = '';
        
        // Remove minimal-active class
        document.body.classList.remove('minimal-active');
    }
}

// Add a CSS rule for minimal mode
const style = document.createElement('style');
style.textContent = `
    body.minimal-active .drawer-pill,
    body.minimal-active .drawer-handle,
    body.minimal-active #date,
    body.minimal-active .persistent-clock {
        opacity: 0.5;
        transition: opacity 0.3s ease, width 0.3s ease;
    }

    body.minimal-active .blur-overlay {
    	backdrop-filter: blur(50px);
    }
    
    body.minimal-active .clock {
    	font-size: clamp(6rem, 20vw, 20rem);
    }
    
    body.minimal-active .drawer-pill {
        width: 10%;
    }
`;
document.head.appendChild(style);

// Centralized function to sync the visual state of settings items
function syncUiStates() {
    // Sync all checkbox-based toggles
    document.querySelectorAll('.setting-item').forEach(item => {
        const controlId = item.id.replace('setting-', '');
        // Construct potential IDs for different control types
        const switchControl = document.getElementById(controlId + '-switch');
        const regularControl = document.getElementById(controlId);
        
        const control = switchControl || regularControl;

        if (control && control.type === 'checkbox') {
            item.classList.toggle('active', control.checked);
        }
    });
}

function setupFontSelection() {
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
    const colorPicker = document.getElementById('clock-color-picker');
    const colorSwitch = document.getElementById('clock-color-switch');
    const stackSwitch = document.getElementById('clock-stack-switch');
    
    // Get the computed --text-color value for the default
    const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
    
    // Load saved preferences
    const savedFont = 'Inter';
    const savedWeight = '700';
    const savedColor = defaultColor;
    
    fontSelect.value = savedFont;
    weightSlider.value = parseInt(savedWeight) / 10;
    colorPicker.value = savedColor;
    colorSwitch.checked = colorEnabled;
    stackSwitch.checked = stackEnabled;
    
    // Function to save current clock styles to the current wallpaper
    function saveCurrentClockStyles() {
        if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0 && currentWallpaperPosition < recentWallpapers.length) {
            const currentClockStyles = {
                font: fontSelect.value,
                weight: (weightSlider.value * 10).toString(),
                color: colorPicker.value,
                colorEnabled: colorSwitch.checked,
                stackEnabled: stackSwitch.checked,
                showSeconds: document.getElementById('seconds-switch')?.checked || false, // Add this
            };
            
            // Update the current wallpaper's clock styles
            recentWallpapers[currentWallpaperPosition].clockStyles = currentClockStyles;
        }
    }
    
    // Apply initial styles
    applyClockStyles();
    
    // Handle font changes
    fontSelect.addEventListener('change', (e) => {
        const selectedFont = e.target.value;
        // Ensure font is loaded before applying
        document.fonts.load(`16px ${selectedFont}`).then(() => {
            applyClockStyles();
            saveCurrentClockStyles(); // Save to current wallpaper
	    syncUiStates();
        }).catch(() => {
            showPopup(currentLanguage.CLOCK_STYLE_FAILED);
        });
    });
    
    // Handle weight changes with the slider
    weightSlider.addEventListener('input', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
	syncUiStates();
    });
    
    // Handle color changes with the color picker
    colorPicker.addEventListener('input', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    });
    
    // Handle color switch toggle
    colorSwitch.addEventListener('change', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    
        // Show/hide the color picker based on switch state
        colorPicker.style.display = e.target.checked ? 'inline-block' : 'none';
        colorPicker.disabled = !e.target.checked;
    });
    
    // Handle stack switch toggle
    stackSwitch.addEventListener('change', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    });
    
    // Set initial color picker state based on switch
    colorPicker.style.display = colorSwitch.checked ? 'inline-block' : 'none';
    colorPicker.disabled = !colorSwitch.checked;
}

function applyClockStyles() {
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
    const colorPicker = document.getElementById('clock-color-picker');
    const colorSwitch = document.getElementById('clock-color-switch');
    const stackSwitch = document.getElementById('clock-stack-switch');
    
    if (!fontSelect || !weightSlider || !clockElement || !infoElement) return;
    
    const fontFamily = fontSelect.value;
    const fontWeight = weightSlider.value * 10; // Convert slider value to proper font weight
    
    clockElement.style.fontFamily = fontFamily;
    clockElement.style.fontWeight = fontWeight;
    
    // Only apply custom color if the switch is enabled
    if (colorSwitch && colorSwitch.checked) {
        clockElement.style.color = colorPicker.value;
        infoElement.style.color = colorPicker.value;
    } else {
        // Reset to default theme color
        clockElement.style.color = ''; // Empty string removes inline style, reverting to CSS
        infoElement.style.color = '';
    }
    
    // Apply stacked layout if enabled
    if (stackSwitch && stackSwitch.checked) {
        clockElement.style.flexDirection = 'column';
        clockElement.style.lineHeight = '0.9';
    } else {
        clockElement.style.flexDirection = '';
        clockElement.style.lineHeight = '';
    }
    
    infoElement.style.fontFamily = fontFamily;
}

// Initialize theme and wallpaper on load
function initializeCustomization() {
    setupThemeSwitcher();
    setupFontSelection();
}

// App definitions
let apps = {
    "Welcome": { url: "docs:welcome", icon: "/assets/appicon/airy.png" },
    "Gestures": { url: "docs:gestures", icon: "/assets/appicon/tips.png" },
    "Controls": { url: "docs:controls", icon: "/assets/appicon/settings.png" },
    "Customize": { url: "docs:customization", icon: "/assets/appicon/feedback.png" },
    "Finish": { url: "docs:finish", icon: "/assets/appicon/system.png" }
};

window.completeAiryOnboarding = function() {
    // Send the completion signal to the Polygol system
    window.postMessage({ type: 'onboarding-complete' }, '*');
    
    // If running inside a broader environment/iframe, notify the parent system as well
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'onboarding-complete' }, '*');
    }
};

async function createFullscreenEmbed(url) {
    // 0. Check if Gurapps are disabled
    if (!gurappsEnabled) {
        showPopup(currentLanguage.GURAPP_OFF);
        return; 
    }

    // 1. Check for Minimized/Restorable State
    if (minimizedEmbeds[url]) {
        const embedContainer = minimizedEmbeds[url];
        
        embedContainer.style.transition = 'none';
        embedContainer.style.transform = 'scale(0.8)';
        embedContainer.style.opacity = '0';
        embedContainer.style.borderRadius = '25px';
        embedContainer.style.overflow = 'hidden';
        embedContainer.style.display = 'block';
        embedContainer.style.pointerEvents = 'auto';
        embedContainer.style.zIndex = '1001';
        
        void embedContainer.offsetWidth;
        
        embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
        
        document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
        
        setTimeout(() => {
            embedContainer.style.transform = 'scale(1)';
            embedContainer.style.opacity = '1';
            embedContainer.style.borderRadius = '0px';
        }, 10);
        
        document.querySelectorAll('.container, .settings-grid.home-settings').forEach(el => {
            if (!el.dataset.originalDisplay) {
                el.dataset.originalDisplay = window.getComputedStyle(el).display;
            }
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            setTimeout(() => {
                el.classList.add('force-hide');
            }, 300);
        });
        
        const swipeOverlay = document.getElementById('swipe-overlay');
        if (swipeOverlay) swipeOverlay.style.display = url.startsWith('docs:') ? 'none' : 'block';
        
        const interactionBlocker = document.getElementById('interaction-blocker');
        if (interactionBlocker) {
            interactionBlocker.style.pointerEvents = 'none';
            interactionBlocker.style.display = 'none';
        }
        return;
    }

    // 2. Prepare New Embed Container
    const embedContainer = document.createElement('div');
    embedContainer.className = 'fullscreen-embed';
    
    // Initial Animation State
    embedContainer.style.transform = 'scale(0.8)'; 
    embedContainer.style.opacity = '0';
    embedContainer.style.borderRadius = '25px';
    embedContainer.style.overflow = 'hidden';
    embedContainer.style.display = 'block';
    embedContainer.style.pointerEvents = 'auto';
    embedContainer.style.zIndex = '1001';
    
    document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
    
    // Store URL
    embedContainer.dataset.embedUrl = url;

    // 3. Content Loading Logic
    if (url.startsWith('docs:')) {
        // --- NATIVE HTML DOCS LOADING ---
        const pageKey = url.replace('docs:', '');
        embedContainer.classList.add('docs-app');
        embedContainer.style.backgroundColor = 'var(--background-color)';
        embedContainer.style.color = 'var(--text-color)';
        embedContainer.style.padding = '10vw';
        embedContainer.style.boxSizing = 'border-box';
        embedContainer.style.overflowY = 'auto';

        // Loading indicator
        embedContainer.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%;">
                <span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.5; animation: spin 1s linear infinite;">sync</span>
            </div>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
        `;

        // Append early to allow animation
        document.body.appendChild(embedContainer);

        try {
            const response = await fetch('/assets/gurapp/intl/airy/docs/' + pageKey);
            if (!response.ok) throw new Error(`Failed to load ${pageKey}`);
            const htmlContent = await response.text();
            
            embedContainer.innerHTML = `
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', sans-serif; line-height: 1.6; font-size: 1.1rem; padding-bottom: 50px;">
                    ${htmlContent}
                </div>
            `;
        } catch (error) {
            embedContainer.innerHTML = `
                <div style="max-width: 600px; margin: 0 auto; text-align: center; padding-top: 20vh;">
                    <span class="material-symbols-rounded" style="font-size: 48px; color: #ff5252;">error</span>
                    <h2>Failed to load</h2>
                    <p>${error.message}</p>
                </div>
            `;
        }

    } else {
        // --- STANDARD IFRAME LOADING ---
        // 2a. Validate App Installation
        const appEntry = Object.values(apps).find(app => app.url === url);
        if (!appEntry) {
            showPopup(currentLanguage.GURAPP_NOT_INSTALLED);
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.src = url;
        const appId = Object.keys(apps).find(k => apps[k].url === url);
        iframe.dataset.appId = appId;
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        
        let embedFailed = false;
        
        iframe.addEventListener('load', () => {
           try {
               const iframeContent = iframe.contentWindow.document;
               if (iframeContent.body.textContent.includes('X-Frame-Options') || 
                   iframeContent.body.textContent.includes('frame denied')) {
                   embedFailed = true;
                   window.open(url, '_blank');
               }
           } catch (error) {
               embedFailed = true;
               window.open(url, '_blank');
           }
        });
        
        iframe.addEventListener('error', () => {
            embedFailed = true;
            window.open(url, '_blank');
        });

        embedContainer.appendChild(iframe);
        document.body.appendChild(embedContainer);
    }
    
    // 4. Finalize UI Transitions
    document.querySelectorAll('.container, .settings-grid.home-settings').forEach(el => {
        if (!el.dataset.originalDisplay) {
            el.dataset.originalDisplay = window.getComputedStyle(el).display;
        }
        el.style.transition = 'opacity 0.3s ease';
        el.style.opacity = '0';
        setTimeout(() => {
            el.classList.add('force-hide');
        }, 300);
    });
    
    void embedContainer.offsetWidth;
    
    embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
    
    setTimeout(() => {
        embedContainer.style.transform = 'scale(1)';
        embedContainer.style.opacity = '1';
        embedContainer.style.borderRadius = '0px';
        document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
    }, 10);
    
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.display = url.startsWith('docs:') ? 'none' : 'block';
    }
    
    const interactionBlocker = document.getElementById('interaction-blocker');
    if (interactionBlocker) {
        interactionBlocker.style.pointerEvents = 'none';
        interactionBlocker.style.display = 'none';
    }
}

const originalCreateFullscreenEmbed = createFullscreenEmbed;
createFullscreenEmbed = function(url) {
  if (url === "#tasks") {
    showMinimizedEmbeds();
    return;
  }
  originalCreateFullscreenEmbed(url);
};

function minimizeFullscreenEmbed() {
    // IMPORTANT FIX: Be more specific about which embed to minimize
    // Only get embeds that are currently visible with display: block
    const embedContainer = document.querySelector('.fullscreen-embed[style*="display: block"]');
    
    if (embedContainer) {
        // Get the URL before hiding it
        const url = embedContainer.dataset.embedUrl;
        if (url) {
            // Store the embed in our minimized embeds object
            minimizedEmbeds[url] = embedContainer;
            
            // After animation completes, actually hide it completely
	    document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
            embedContainer.style.display = 'none';
            
            // Use a different z-index approach when minimized
            embedContainer.style.pointerEvents = 'none';
            embedContainer.style.zIndex = '0';
        }
    }
    
    // Restore all main UI elements
    document.querySelectorAll('.container, .settings-grid.home-settings').forEach(el => {
	el.classList.remove('force-hide');
        el.style.display = el.dataset.originalDisplay;
        el.style.transition = 'opacity 0.3s ease';

        requestAnimationFrame(() => {
            el.style.opacity = '1';
        });
    });
    
    // Hide all fullscreen embeds that are not being displayed
    document.querySelectorAll('.fullscreen-embed:not([style*="display: block"])').forEach(embed => {
        embed.style.pointerEvents = 'none';
        embed.style.zIndex = '0';
    });
    
    // Hide the swipe overlay when minimizing
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.display = 'none';
        swipeOverlay.style.pointerEvents = 'none';
    }
    
    // Reset interaction blocker to default state
    const interactionBlocker = document.getElementById('interaction-blocker');
    if (interactionBlocker) {
        interactionBlocker.style.pointerEvents = 'auto';
    }
}

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
        if (iconSource && (iconSource.startsWith('http') || iconSource.startsWith('/'))) {
            // If it's a full URL or a root-relative path, use it directly.
            img.src = iconSource;
        } else if (iconSource) {
            // Otherwise, assume it's a local filename and prepend the default path.
            img.src = `//appicon/${iconSource}`;
        } else {
            // Fallback for missing icons.
            img.src = '//assets/appicon/default.png';
        }

	img.onerror = () => { img.src = '//assets/appicon/default.png'; };
        
        dockIcon.appendChild(img);
	 
	dockIcon.addEventListener('click', async () => {
	    // Minimize current fullscreen embed if one is open
	    const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
	    if (openEmbed) {
	        minimizeFullscreenEmbed();
	    }
	
	    // Open the new app
	    createFullscreenEmbed(details.url);
	    populateDock(); // Refresh the dock
	});
        
        dock.appendChild(dockIcon);
    });
}

    const appDrawer = document.getElementById('app-drawer');
    const appGrid = document.getElementById('app-grid');

// Function to create app icons
function createAppIcons() {
    appGrid.innerHTML = '';

    const appsArray = Object.entries(apps)
        .filter(([appName]) => appName !== "Apps")
        .map(([appName, appDetails]) => ({ name: appName, details: appDetails }))
        .sort((a, b) => a.name.localeCompare(b.name));

    appsArray.forEach((app) => {
        const appIcon = document.createElement('div');
        appIcon.classList.add('app-icon');
        appIcon.dataset.app = app.name;

        const img = document.createElement('img');
        img.alt = app.name;
        
        // 1. Get the icon source from the app's details.
        const iconSource = app.details.icon;

        // 2. Check the source type and set img.src only ONCE.
        if (iconSource && (iconSource.startsWith('http') || iconSource.startsWith('/'))) {
            // If it's an absolute URL or a root-relative path, use it directly.
            img.src = iconSource;
        } else if (iconSource) {
            // Otherwise, assume it's a local filename and prepend the default path.
            img.src = `//appicon/${iconSource}`;
        } else {
            // Fallback for cases where the icon is missing entirely.
            img.src = '//assets/appicon/default.png';
        }

        // 3. Set the error handler AFTER defining the initial source.
        img.onerror = () => {
            img.src = '//assets/appicon/default.png';
        };
        
        const label = document.createElement('span');
        label.textContent = app.name;
        
        appIcon.appendChild(img);
        appIcon.appendChild(label);
        
        const handleAppOpen = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                populateDock();
                
                if (app.details.url.startsWith('#')) {
                    switch (app.details.url) {
                        case '#settings':
                            showPopup(currentLanguage.OPEN_SETTINGS);
                            break;
                        case '#tasks':
                            showMinimizedEmbeds(); // Add this case to call your new function
                            break;
                        default:
                            showPopup(currentLanguage.APP_OPENED.replace("{app}", app));
                    }
                } else {
                    createFullscreenEmbed(app.details.url);
                }
                
                appDrawer.classList.remove('open');
                appDrawer.style.bottom = '-100%';
                initialDrawerPosition = -100;
            } catch (error) {
                showPopup(currentLanguage.APP_OPEN_FAIL.replace("{app}", app));
                console.error(`App open error: ${error}`);
            }
        };
        
        appIcon.addEventListener('click', handleAppOpen);
        appIcon.addEventListener('touchend', handleAppOpen);
        appGrid.appendChild(appIcon);
    });
}

Object.keys(apps).forEach(appName => {
    appUsage[appName] = 0;
});

function setupDrawerInteractions() {
    let startY = 0;
    let currentY = 0;
    let initialDrawerPosition = -100;
    let isDragging = false;
    let isDrawerInMotion = false;
    let dragStartTime = 0;
    let lastY = 0;
    let velocities = [];
    let dockHideTimeout = null;
    let longPressTimer;
    const longPressDuration = 200; // 200ms for a long press
    const flickVelocityThreshold = 0.4;
    const dockThreshold = -2.5; // Threshold for dock appearance
    const openThreshold = -50;
    const drawerPill = document.querySelector('.drawer-pill');
    const drawerHandle = document.querySelector('.drawer-handle');
        
    // Create interaction blocker overlay
    const interactionBlocker = document.createElement('div');
    interactionBlocker.id = 'interaction-blocker';
    interactionBlocker.style.position = 'fixed';
    interactionBlocker.style.top = '0';
    interactionBlocker.style.left = '0';
    interactionBlocker.style.width = '100%';
    interactionBlocker.style.height = '100%';
    interactionBlocker.style.zIndex = '999'; // Below the drawer but above other content
    interactionBlocker.style.display = 'none';
    interactionBlocker.style.background = 'transparent';
    document.body.appendChild(interactionBlocker);
    
    populateDock();
    
    // Create transparent overlay for app swipe detection
    const swipeOverlay = document.createElement('div');
    swipeOverlay.id = 'swipe-overlay';
    swipeOverlay.style.position = 'fixed';
    swipeOverlay.style.bottom = '0';
    swipeOverlay.style.left = '0';
    swipeOverlay.style.width = '100%';
    swipeOverlay.style.height = '15%'; // Bottom 15% of screen for swipe detection
    swipeOverlay.style.zIndex = '1000';
    swipeOverlay.style.display = 'none';
    swipeOverlay.style.pointerEvents = 'none'; // Start with no interaction
    document.body.appendChild(swipeOverlay);

    function startDrag(yPosition) {
        startY = yPosition;
        lastY = yPosition;
        currentY = yPosition;
        isDragging = true;
        isDrawerInMotion = true;
        dragStartTime = Date.now();
        velocities = [];
        appDrawer.style.transition = 'opacity 0.3s, filter 0.3s';
    }

    function moveDrawer(yPosition) {	    
        if (!isDragging) return;
        
        // Calculate and store velocity data
        const now = Date.now();
        const deltaTime = now - dragStartTime;
        if (deltaTime > 0) {
            const velocity = (lastY - yPosition) / deltaTime;
            velocities.push(velocity);
            // Keep only the last 5 velocity measurements
            if (velocities.length > 5) {
                velocities.shift();
            }
        }
        lastY = yPosition;
        
        currentY = yPosition;
        const deltaY = startY - currentY;
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;
    
        // Check if there's an open embed
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        if (openEmbed && movementPercentage > 25) {
            // Add transition class for smooth animation (removed filter)
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = `scale(${1 - (movementPercentage - 25) / 100})`;
            openEmbed.style.opacity = 1 - ((movementPercentage - 25) / 75);
            
            // Add dynamic border radius and background blur during drag
            const borderRadius = Math.min(25, (movementPercentage - 25) * 0.5);
            const blurRadius = Math.min(5, (movementPercentage - 25) * 0.2);
            openEmbed.style.borderRadius = `${borderRadius}px`;
            
            // Apply blur to body instead of embed
            document.querySelector('body').style.setProperty('--bg-blur', `blur(${5 - blurRadius}px)`);
		
            // Make app drawer transparent when in an app
            appDrawer.style.opacity = '0';
            
            // IMPORTANT FIX: Set pointer-events to none when an embed is open
            interactionBlocker.style.pointerEvents = 'none';
        }
        
	    if (movementPercentage > 2.5 && movementPercentage < 25) {
	        // Ensure display is block/flex before adding 'show' class for animation
	        if (dock.style.display === 'none' || dock.style.display === '') {
	            dock.style.display = 'flex';
	            // Use requestAnimationFrame to ensure the display change is rendered before adding the class
	            requestAnimationFrame(() => {
	                dock.classList.add('show');
	            });
	        } else {
	            dock.classList.add('show');
	        }
	        dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
	        if (dockHideTimeout) clearTimeout(dockHideTimeout);
	        drawerPill.style.opacity = '0';
	    } else {
	        dock.classList.remove('show');
	        dock.style.boxShadow = 'none';
	        if (dockHideTimeout) clearTimeout(dockHideTimeout);
	        dockHideTimeout = setTimeout(() => {
	            dock.style.display = 'none';
	        }, 300); // 300ms matches your CSS transition duration
	        drawerPill.style.opacity = '1';
	    }
    
        const newPosition = Math.max(-100, Math.min(0, initialDrawerPosition + movementPercentage));
        
        // Only update opacity if no embed is open
        if (!openEmbed) {
            const opacity = (newPosition + 100) / 100;
            const blurRadius = Math.max(0, Math.min(5, ((-newPosition) / 20)));
            appDrawer.style.opacity = opacity;
            
            // Apply blur to body for drawer instead
            document.querySelector('body').style.setProperty('--bg-blur', `blur(${5 - blurRadius}px)`);
	}
        
        appDrawer.style.bottom = `${newPosition}%`;
        
        // Show interaction blocker if drawer is partially visible (not at 0% or -100%)
        if (newPosition > -100 && newPosition < 0) {
            interactionBlocker.style.display = 'block';
            // IMPORTANT FIX: Only capture pointer events if no embed is open
            interactionBlocker.style.pointerEvents = openEmbed ? 'none' : 'auto';
        } else {
            interactionBlocker.style.display = 'none';
        }
    }

    function endDrag() {
        if (!isDragging) return;
    
        const deltaY = startY - currentY;
        const deltaTime = Date.now() - dragStartTime;
        
        // Calculate average velocity from the stored values
        let avgVelocity = 0;
        if (velocities.length > 0) {
            avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
        }
        
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;
    
        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
    
        // IMPORTANT FIX: Be specific about which embed is open
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        // Handle flick gesture to close app
        const isFlickUp = avgVelocity > flickVelocityThreshold;
        
        if (openEmbed && (movementPercentage > 10 || isFlickUp)) {
            // Close embed with animation (removed filter)
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = 'scale(0.8)';
            openEmbed.style.opacity = '0';
            openEmbed.style.borderRadius = '25px';
            
            // Apply blur to body when minimizing
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
		
            setTimeout(() => {
                minimizeFullscreenEmbed();
                
                // Hide the swipe overlay
                swipeOverlay.style.display = 'none';
                swipeOverlay.style.pointerEvents = 'none';
            }, 300);
            
            // Reset drawer state and clear background blur
            dock.classList.remove('show');
            dock.style.boxShadow = 'none';
	    if (dockHideTimeout) clearTimeout(dockHideTimeout);
            dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
            interactionBlocker.style.display = 'none';
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
		} else if (openEmbed) {
            // Reset embed if swipe wasn't enough (removed filter)
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = 'scale(1)';
            openEmbed.style.opacity = '1';
            openEmbed.style.borderRadius = '0px';
            
            // Clear background blur when resetting
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
		
            // Keep app drawer transparent when in an app
            appDrawer.style.opacity = '0';
            
            // Handle dock visibility for smaller swipes
		    if (movementPercentage > 2.5 && movementPercentage <= 25) {
		        // Ensure display is block/flex before adding 'show' class for animation
		        if (dock.style.display === 'none' || dock.style.display === '') {
		            dock.style.display = 'flex';
		            requestAnimationFrame(() => {
		                dock.classList.add('show');
		            });
		        } else {
		            dock.classList.add('show');
		        }
		        dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)'; // Enable box shadow when visible
		        appDrawer.style.bottom = '-100%';
		        appDrawer.classList.remove('open');
		        initialDrawerPosition = -100;
		        interactionBlocker.style.display = 'none';
		        document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
		    }
        } else {
            // Normal drawer behavior when no embed is open
            // Consider both movement percentage and velocity for flick gestures
            const isSignificantSwipe = movementPercentage > 25 || isFlickUp;
            const isSmallSwipe = movementPercentage > 2.5 && movementPercentage <= 25;
            
            // Small swipe - show dock
            if (isSmallSwipe && !isFlickUp) {
                dock.classList.add('show');
                dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
		dock.style.display = 'flex';
                appDrawer.style.bottom = '-100%';
                appDrawer.style.opacity = '0';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
                document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
	    } 
            // Large swipe or flick up - show full drawer
            else if (isSignificantSwipe) {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none';
                if (dockHideTimeout) clearTimeout(dockHideTimeout);
                dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
                appDrawer.style.bottom = '0%';
                appDrawer.style.opacity = '1';
                appDrawer.classList.add('open');
                initialDrawerPosition = 0;
                interactionBlocker.style.display = 'none';
                document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
	    } 
            // Close everything
            else {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none';
                if (dockHideTimeout) clearTimeout(dockHideTimeout);
                dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
                appDrawer.style.bottom = '-100%';
                appDrawer.style.opacity = '0';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
                document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
	    }
            
            // Hide the swipe overlay when not in an app
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
        }
    
        isDragging = false;
    
        setTimeout(() => {
            isDrawerInMotion = false;
        }, 300); // 300ms matches the transition duration in the CSS
    }

    // Add initial swipe detection in app
    function setupAppSwipeDetection() {
        let touchStartY = 0;
        let touchStartTime = 0;
        let isInSwipeMode = false;
        
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
                // Capture all further events
                swipeOverlay.style.pointerEvents = 'auto';
            }
            
            if (isInSwipeMode) {
                moveDrawer(currentY);
                e.preventDefault(); // Prevent default scrolling when in swipe mode
            }
        }, { passive: false });
        
        swipeOverlay.addEventListener('touchend', () => {
            if (isInSwipeMode) {
                endDrag();
                isInSwipeMode = false;
            }
            // Return to passive mode
            swipeOverlay.style.pointerEvents = 'none';
        });
        
        // Similar handling for mouse events
        swipeOverlay.addEventListener('mousedown', (e) => {
            touchStartY = e.clientY;
            touchStartTime = Date.now();
        });
        
        swipeOverlay.addEventListener('mousemove', (e) => {
            if (e.buttons !== 1) return; // Only proceed if left mouse button is pressed
            
            const deltaY = touchStartY - e.clientY;
            
            if (deltaY > 25 && !isInSwipeMode) {
                isInSwipeMode = true;
                startDrag(touchStartY);
                swipeOverlay.style.pointerEvents = 'auto';
            }
            
            if (isInSwipeMode) {
                moveDrawer(e.clientY);
            }
        });
        
        swipeOverlay.addEventListener('mouseup', () => {
            if (isInSwipeMode) {
                endDrag();
                isInSwipeMode = false;
            }
            swipeOverlay.style.pointerEvents = 'none';
        });
    }
    
    setupAppSwipeDetection();

    // Touch Events for regular drawer interaction
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Check if touch is on handle area or if drawer is already open
        if (drawerHandle.contains(element) || (appDrawer.classList.contains('open') && appDrawer.contains(element))) {
            startDrag(touch.clientY);
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            moveDrawer(e.touches[0].clientY);
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        endDrag();
    });

    // Mouse Events for regular drawer interaction
    document.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // Check if click is on handle area or if drawer is already open
        if (drawerHandle.contains(element) || (appDrawer.classList.contains('open') && appDrawer.contains(element))) {
            startDrag(e.clientY);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            moveDrawer(e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        endDrag();
    });

    document.addEventListener('click', (e) => {
        if (isDrawerInMotion) return; // Do nothing if an animation is in progress

        const isDrawerOpen = appDrawer.classList.contains('open');
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');

        // --- ADDITION: Close the drawer when clicking outside (on the body) ---
        // This runs only if the drawer is fully open and no app is active.
        if (isDrawerOpen && !openEmbed && !appDrawer.contains(e.target) && !drawerHandle.contains(e.target)) {
            // Animate the drawer closed
            appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
            interactionBlocker.style.display = 'none';
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
        }

        // --- Logic to hide the bottom dock ---
        // This runs if the dock is visible and the click was outside of it.
        if (dock.classList.contains('show') && !dock.contains(e.target)) {
            dock.classList.remove('show');
            dock.style.boxShadow = 'none';
            drawerPill.style.opacity = '1';
        }
    });

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
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (openEmbed) {
            appDrawer.style.opacity = '0';
            
            // Show the swipe overlay when an app is open
            swipeOverlay.style.display = 'block';
            
            // IMPORTANT FIX: Set pointer-events to none when an embed is open
            interactionBlocker.style.pointerEvents = 'none';
        } else {
            // Only update opacity if drawer is open
            if (appDrawer.classList.contains('open')) {
                appDrawer.style.opacity = '1';
            }
            
            // Hide the swipe overlay when no app is open
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
            
            // IMPORTANT FIX: Reset pointer-events when no embed is open
            if (appDrawer.classList.contains('open')) {
                interactionBlocker.style.pointerEvents = 'auto';
            }
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
    
    // Add interaction blocker click handler to close drawer on click outside
    interactionBlocker.addEventListener('click', () => {
        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
        appDrawer.style.bottom = '-100%';
        appDrawer.style.opacity = '0';
        appDrawer.classList.remove('open');
        initialDrawerPosition = -100;
        interactionBlocker.style.display = 'none';
    });
}

const appDrawerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (appDrawer.classList.contains('open')) {
                createAppIcons(); // Populate when opening
            } else {
                setTimeout(() => {
                    if (!appDrawer.classList.contains('open')) {
                        document.getElementById('app-grid').innerHTML = '';
                    }
                }, 350);
            }
        }
    });
});

appDrawerObserver.observe(appDrawer, {
    attributes: true
});

secondsSwitch.addEventListener('change', function() {
    showSeconds = this.checked;
    updateClockAndDate();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Close all modals
        [customizeModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                blurOverlayControls.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    blurOverlayControls.style.display = 'none';
                }, 300);
            }
        });
    }
});

window.addEventListener('online', () => {
    showPopup(currentLanguage.ONLINE);
});

window.addEventListener('offline', () => {
    showPopup(currentLanguage.OFFLINE);
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize control states
    const storedLightMode = localStorage.getItem('theme') || 'dark';
    const storedMinimalMode = localStorage.getItem('minimalMode') || 'true';
    const storedSilentMode = localStorage.getItem('silentMode') || 'false';
    const storedTemperature = '0';
    const storedBrightness = '100';
    
    // Get elements using your existing IDs
    const lightModeControl = document.getElementById('light_mode_qc');
    const minimalModeControl = document.getElementById('minimal_mode_qc');
    const silentModeControl = document.getElementById('silent_switch_qc');
    const temperatureControl = document.getElementById('temp_control_qc');
    
    const silentModeSwitch = document.getElementById('silent_switch');
    const minimalModeSwitch = document.getElementById('focus-switch');
    const lightModeSwitch = document.getElementById('theme-switch');
    
    const temperatureValue = document.getElementById('thermostat-value');
    const temperaturePopup = document.getElementById('thermostat-popup');
    const temperatureSlider = document.getElementById('thermostat-control');
    const temperaturePopupValue = document.getElementById('thermostat-popup-value');
    
    // Brightness elements
    const brightnessSlider = document.getElementById('brightness-control');
    const brightnessValue = document.getElementById('brightness-value');
    
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
    
    lightModeSwitch.checked = storedLightMode === 'light';
    if (lightModeSwitch.checked) lightModeControl.classList.add('active');
    
    minimalModeSwitch.checked = storedMinimalMode === 'false';
    if (minimalModeSwitch.checked) minimalModeControl.classList.add('active');
    
    silentModeSwitch.checked = storedSilentMode === 'false';
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
    }
    
    // Function to update the temperature icon based on value
    function updateTemperatureIcon(value) {
        const temperatureIcon = temperatureControl.querySelector('.material-symbols-rounded');
        if (!temperatureIcon) return;
        
        const tempValue = parseInt(value);
        if (tempValue <= -3) {
            temperatureIcon.textContent = 'thermometer_minus'; // Cold
        } else if (tempValue >= 3) {
            temperatureIcon.textContent = 'thermometer_add'; // Hot
        } else {
            temperatureIcon.textContent = 'thermostat_auto'; // Neutral
        }
    }
    
    // Function to update brightness
    function updateBrightness(value) {
        brightnessValue.textContent = `${value}%`;
        
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
    
    // Event listener for light mode control
    lightModeControl.addEventListener('click', function() {
        lightModeSwitch.checked = !lightModeSwitch.checked;
        this.classList.toggle('active');

        const newTheme = lightModeSwitch.checked ? 'light' : 'dark';

        // Update current document
        document.body.classList.toggle('light-theme', newTheme === 'light');

        // Update icon
        updateLightModeIcon(lightModeSwitch.checked);

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
            iframe.contentWindow.postMessage({
                type: 'themeUpdate',
                theme: newTheme
            }, window.location.origin);
        });
    });
    
    // Event listener for minimal mode control
    minimalModeControl.addEventListener('click', function() {
        // Toggle minimalMode state
        minimalMode = !minimalMode;

        // Update UI based on the new state
        updateMinimalMode();

        // Toggle active class for visual feedback
        this.classList.toggle('active');
        
        // Update icon
        updateMinimalModeIcon(minimalMode);
    });

    // Event listener for silent mode control
    silentModeControl.addEventListener('click', function() {
        silentModeSwitch.checked = !silentModeSwitch.checked;
        this.classList.toggle('active');
        
        isSilentMode = silentModeSwitch.checked; // Update global flag
        
        // Update icon
        updateSilentModeIcon(isSilentMode);
        
        // Only override showPopup based on silent mode state
        if (isSilentMode) { // Silent mode is being turned ON
            if (!window.originalShowPopup) {
                window.originalShowPopup = window.showPopup;
            }
            window.showPopup = function(message) {
                console.log('Silent ON; suppressing popup:', message);
            };
        } else { // Silent mode is being turned OFF
            if (window.originalShowPopup) {
                window.showPopup = window.originalShowPopup;
            }
        }
        // showNotification is handled by its own internal logic, no override needed here.
    });
    
    // Temperature control popup
    temperatureControl.addEventListener('click', function(e) {
        // If the popup is already open, and the click is NOT inside the popup or on the control, close it
        if (
            temperaturePopup.style.display === 'block' &&
            !temperaturePopup.contains(e.target) &&
            e.target !== temperatureControl
        ) {
            temperaturePopup.style.display = 'none';
            return;
        }

        // Otherwise, open it as usual
        const rect = temperatureControl.getBoundingClientRect();
        temperaturePopup.style.top = `${rect.bottom + 5}px`;
        temperaturePopup.style.left = `${rect.left + (rect.width / 2) - (155 / 2)}px`; // Center the popup
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
        const value = e.target.value;
        temperaturePopupValue.textContent = `${value}`;
        temperatureValue.textContent = `${value}`;
        updateTemperatureIcon(value);
        updateTemperature(value);
	temperatureControl.classList.toggle('active', value !== '0');
    });
    
    // Brightness control event listener
    brightnessSlider.addEventListener('input', function(e) {
        const value = e.target.value;
        updateBrightness(value);
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

    firstSetup(); // This handles language
    initAppDraw(); // Now this will use the fully populated 'apps' object
    updateGurappsVisibility();
    syncUiStates();

    // --- 4. Add other event listeners ---
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', function () {
            selectLanguage(this.value);
        });
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
});

window.addEventListener('load', () => {
    consoleLoaded();
});

// Close customizeModal when clicking outside
blurOverlayControls.addEventListener('click', () => {
    customizeModal.classList.remove('show'); // Start animation
    blurOverlayControls.classList.remove('show');

    setTimeout(() => {
        customizeModal.style.display = 'none'; // Hide after animation
        blurOverlayControls.style.display = 'none';
    }, 300);
});

function closeControls() {
    customizeModal.classList.remove('show'); // Start animation
    blurOverlayControls.classList.remove('show');

    setTimeout(() => {
        customizeModal.style.display = 'none'; // Hide after animation
        blurOverlayControls.style.display = 'none';
    }, 300);
}

    function initAppDraw() {
        createAppIcons();
        setupDrawerInteractions();
    }

let isDuringFirstSetup = false; // Flag to prevent prompts during setup
let WALLPAPER_PRESETS = [];
async function fetchWallpaperPresets() {
    try {
        const res = await fetch('/assets/img/wallpapers/index.json');
        if (res.ok) {
            WALLPAPER_PRESETS = await res.json();
        }
    } catch (e) {
        console.warn("Failed to load wallpaper presets", e);
    }
}
// Call this early
fetchWallpaperPresets();

async function firstSetup() {
    document.body.classList.add('setup-active');
    isDuringFirstSetup = true;
    
    // 1. If presets haven't loaded yet, wait for them
    if (WALLPAPER_PRESETS.length === 0) {
        await fetchWallpaperPresets();
    }

    if (WALLPAPER_PRESETS.length > 0) {
        const randomPreset = WALLPAPER_PRESETS[Math.floor(Math.random() * WALLPAPER_PRESETS.length)];
        
        if (randomPreset && randomPreset.fullUrl) {
            document.body.style.setProperty('--bg-image', `url('${randomPreset.fullUrl}')`);
        }
    } else {
        console.warn("No wallpaper presets found. Using fallback.");
        document.body.style.setProperty('--bg-image', "url('/assets/gurapp/intl/airy/img.jpg')");
    }

    createSetupScreen();
}

function createSetupScreen() {
    const generateNonsenseName = () => {
        const pre = ["Zork", "Bli", "Phro", "Kran", "Velt", "Spli", "Grom", "Twi", "Quar", "Mox", "Jub", "Vax", "Zym", "Plo", "Ska", "Tro", "Flu", "Bly", "Dwa", "Glo", "Snu", "Kri", "Vle", "Shu", "Pra", "Zon", "Cli", "Fro", "Ste", "Yol"];
        const mid = ["a", "o", "u", "e", "i", "ee", "oo", "ou", "y", "ia"];
        const post = ["nix", "zap", "loid", "tron", "vax", "mutt", "gle", "dax", "kin", "th", "rk", "zz", "nk", "st", "sh", "mp", "rt", "lk", "gn", "pl", "sk", "ch", "ff", "wn", "ly", "xy", "qu", "zt", "rd", "nz"];
        
        const getWord = () => {
            const p = pre[Math.floor(Math.random() * pre.length)];
            const m = mid[Math.floor(Math.random() * mid.length)];
            const s = post[Math.floor(Math.random() * post.length)];
            return p + m + s;
        };

        return `${getWord()} ${getWord()}`;
    };
	
    const setupContainer = document.createElement('div');
    setupContainer.className = 'setup-screen';

    // Ambient Music and Attribution
    const audio = document.createElement('audio');
    audio.id = 'setup-music';
    audio.src = '/assets/sound/setup/swinging.mp3';
    audio.loop = true;
    audio.volume = 0; // Start silently for fade-in

    const attribution = document.createElement('div');
    attribution.className = 'setup-music-attribution';
    attribution.innerHTML = '🎵 Brittle Rille - Reunited • Kevin MacLeod (CC BY 4.0)';
    
    document.body.appendChild(audio); // Append to body to persist
    setupContainer.appendChild(attribution);

    const setupPages = [
        {
            title: "Hello",
            description: "",
            options: []
        },
        {
            title: "SETUP_CLOCK_FORMAT",
            description: "",
            icon: "schedule",
            options: [
                { name: "24-hour", value: false, default: true },
                { name: "12-hour", value: true }
            ]
        },
        {
            title: "Name this Device",
            description: "I have a name, it's Screwy! I wonder what this thing's name is...",
            image: "https://github.com/kirbIndustries/assets/blob/main/screwy/img/1/Screwy2.png?raw=true",
            isInput: true,
            inputType: "text",
            inputPlaceholder: "Name",
            configKey: "system_device_name",
            default: generateNonsenseName()
        },
        {
            title: "SETUP_ALLOW_PERMISSIONS",
            description: "Permissions are required to access certain functionality. Data may be sent to service providers.",
		    icon: "data_check", // Add icon
            options: [
                { 
                    name: "SETUP_BASIC_ACCESS",
                    default: true
                },
                { 
                    name: "SETUP_LOCATION_ACCESS",
                    description: "SETUP_LOCATION_ACCESS_DESC",
                    permission: "geolocation"
                },
                { 
                    name: "SETUP_NOTIFICATIONS",
                    description: "SETUP_NOTIFICATIONS_DESC",
                    permission: "notifications"
                }
            ]
        },
        {
            title: "Choose a display theme",
            description: "",
		    icon: "palette",
            options: [
                { name: "SETUP_LIGHT", value: "light" },
                { name: "SETUP_DARK", value: "dark", default: true }
            ]
        },
        {
            title: "SETUP_SHOW_WEATHER",
            description: "Data will be shared to service providers if enabled. Data is anonymized and sent securely.",
		    icon: "partly_cloudy_day",
            options: [
                { name: "SETUP_SHOW_WEATHER_TRUE", value: true, default: true },
                { name: "SETUP_SHOW_WEATHER_FALSE", value: false }
            ]
        },
        {
            title: "Keep your device up to date",
            description: "Get the latest security, features and improvements by updating Polygol automatically. You will recieve a notification before updates are installed.",
		    icon: "deployed_code_update", // Add icon
            options: []
        },
		{
            title: "Back Up your Data",
            description: "Automatically back up and save your data. A notification will be sent when your data backup is ready.",
            icon: "settings_backup_restore",
            options: [
                { name: "Enable", value: 'true', default: true },
                { name: "Disable", value: 'false' }
            ]
        },
        {
            title: "Privacy & Data",
            description: "To improve your experience, the device will collect anonymous usage data and error reports. No personal data is stored.",
            icon: "encrypted",
            options: [
                { name: "Allow collection and sending of data", value: 'true', default: true },
                { name: "Don't collect or send", value: 'false' }
            ]
        },
        {
            title: "To continue using the software, you must agree to the terms of the software license agreement.",
            description: "To decline, stop and close the software now. A copy of the License can be found at https://kirbindustries.gitbook.io/polygol/legal/license",
		    icon: "partner_exchange",
            options: []
        },
        {
            title: "Goodbye (for now)",
            description: "Let's talk sometime later! I'm in the App Drawer at any time.",
		    image: "https://github.com/kirbIndustries/assets/blob/main/screwy/img/1/Screwy3.png?raw=true",
            options: []
        },
    ];

	let currentPage = 0;
    let isTransitioning = false; // Flag to prevent button spam

    function createPage(pageData) {
        const page = document.createElement('div');
        page.className = 'setup-page';
        
        // Add title with icon
        const titleContainer = document.createElement('div'); // Container for icon and title
        titleContainer.style.display = 'flex';
        titleContainer.style.flexDirection = 'column'; // Stack icon and title vertically
        titleContainer.style.alignItems = 'center'; // Center horizontally

        let headerVisual;
        if (pageData.image) {
            headerVisual = document.createElement('img');
            headerVisual.src = pageData.image;
            headerVisual.style.cssText = "width: 100px; height: 100px; object-fit: contain; margin-bottom: 8px;";
        } else {
            headerVisual = document.createElement('span');
            headerVisual.className = 'material-symbols-rounded';
            headerVisual.textContent = pageData.icon;
            headerVisual.style.fontSize = '64px';
            headerVisual.style.marginBottom = '8px';
        }

        const title = document.createElement('h1');
        title.className = 'setup-title';
        title.textContent = currentLanguage[pageData.title] || pageData.title;

        titleContainer.appendChild(headerVisual);
        titleContainer.appendChild(title);
        page.appendChild(titleContainer);
        
        // Add description
        const description = document.createElement('p');
        description.className = 'setup-description';
        description.textContent = currentLanguage[pageData.description] || pageData.description;
        page.appendChild(description);
        
        // Add options
        if (pageData.isInput) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = localStorage.getItem(pageData.configKey) || pageData.default;
            input.placeholder = pageData.inputPlaceholder;
            input.className = 'setup-input-field'; 
            input.style.cssText = "background: transparent;border-top: none;border-right: none;border-left: none;border-image: initial;color: var(--text-color);font-size: 1.2rem;outline: none;border-bottom: 2px solid var(--accent);padding: 10px;font-family: 'Inter';";
            
            input.addEventListener('input', (e) => {
                localStorage.setItem(pageData.configKey, e.target.value);
            });

            page.appendChild(input);
            
            // Auto-focus
            setTimeout(() => input.focus(), 500);

        } else if (pageData.options.length > 0) {
            // 1. Determine if we already have a saved value for this specific page
            let savedValue = null;
            switch (pageData.title) {
                case "Privacy & Data": 
                    savedValue = localStorage.getItem('telemetryEnabled'); 
                    break;
                case "Choose a display theme": 
                    savedValue = localStorage.getItem('theme'); 
                    break;
                case "SETUP_CLOCK_FORMAT": 
                    savedValue = localStorage.getItem('use12HourFormat'); 
                    break;
                case "SETUP_SHOW_WEATHER": 
                    savedValue = localStorage.getItem('showWeather'); 
                    break;
                case "Back Up your Data": 
                    savedValue = localStorage.getItem('automaticBackupsEnabled'); 
                    break;
            }

            pageData.options.forEach(option => {
                const optionElement = document.createElement('div');
                optionElement.className = 'setup-option';
                
                // 2. Logic to persist the selection:
                // If we have a saved value, check if this option matches it.
                // Otherwise, fall back to the hardcoded default.
                let isSelected = false;
                if (savedValue !== null) {
                    // Convert both to string for reliable comparison (handles "true" vs true)
                    isSelected = String(option.value) === String(savedValue);
                } else {
                    isSelected = !!option.default;
                }

                if (isSelected) optionElement.classList.add('selected');

                const optionContent = document.createElement('div');
                optionContent.className = 'option-content';

                const optionText = document.createElement('span');
                optionText.className = 'option-title';
                optionText.textContent = currentLanguage[option.name] || option.name;

                if (option.description) {
                    const optionDesc = document.createElement('span');
                    optionDesc.className = 'option-description';
                    optionDesc.textContent = currentLanguage[option.description] || option.description;
                    optionContent.appendChild(optionDesc);
                }

                optionContent.insertBefore(optionText, optionContent.firstChild);
                optionElement.appendChild(optionContent);

                const checkIcon = document.createElement('span');
                checkIcon.className = 'material-symbols-rounded';
                checkIcon.textContent = 'check_circle';
                optionElement.appendChild(checkIcon);
        
                // Handle click events based on option type
                if (option.permission) {
                    optionElement.addEventListener('click', async () => {
                        try {
                            let permissionGranted = false;
                            switch (option.permission) {
                                case 'geolocation':
                                    permissionGranted = await new Promise(resolve => {
                                        navigator.geolocation.getCurrentPosition(
                                            () => resolve(true),
                                            () => resolve(false)
                                        );
                                    });
                                    break;
                                case 'notifications':
                                    const notifResult = await Notification.requestPermission();
                                    permissionGranted = notifResult === 'granted';
                                    break;
                            }
                            if (permissionGranted) optionElement.classList.add('selected');
                        } catch (error) {
                            console.error(`Permission request failed:`, error);
                            optionElement.classList.remove('selected');
                        }
                    });
                } else {
                    optionElement.addEventListener('click', () => {
                        // Deselect all options
                        page.querySelectorAll('.setup-option').forEach(el => el.classList.remove('selected'));
                        optionElement.classList.add('selected');
        
                        // Save the selection
                        switch (pageData.title) {
                            case "Privacy & Data":
                                localStorage.setItem('telemetryEnabled', option.value);
                                break;
                            case "Choose a display theme":
                                localStorage.setItem('theme', option.value);
                                document.body.classList.toggle('light-theme', option.value === 'light');
                                break;
                            case "SETUP_CLOCK_FORMAT":
                                localStorage.setItem('use12HourFormat', option.value);
                                use12HourFormat = option.value;
                                const hrSwitch = document.getElementById('hour-switch');
                                if (hrSwitch) hrSwitch.checked = use12HourFormat;
                                break;
                            case "SETUP_SHOW_WEATHER":
                                localStorage.setItem('showWeather', option.value);
                                showWeather = option.value;
                                break;
							case "Back Up your Data":
                                localStorage.setItem('automaticBackupsEnabled', option.value);
                                break;
                        }
                    });
                }
        
                page.appendChild(optionElement);
            });
        
            // Ensure a default option is selected if none are selected
            if (!page.querySelector('.setup-option.selected')) {
                page.querySelector('.setup-option').classList.add('selected');
            }
        }
        
        // --- Navigation buttons ---
        const buttons = document.createElement('div');
        buttons.className = 'setup-buttons';
        
        // Back
        if (currentPage > 0) {
            const backButton = document.createElement('button');
            backButton.className = 'setup-top-btn';
            // Use a language key if available, otherwise default to "Back"
            backButton.innerHTML = '<span class="material-symbols-rounded">arrow_back</span>';
            backButton.addEventListener('click', () => {
                if (isTransitioning) return;
                isTransitioning = true;
                currentPage--;
                updateSetup();
            });
            page.appendChild(backButton);
        }

        const nextButton = document.createElement('button');
        nextButton.className = 'setup-button primary';
        
        if (currentPage === 0) {
            nextButton.textContent = currentLanguage.SETUP_START || "Start";
        } else if (currentPage === setupPages.length - 1) {
            nextButton.textContent = currentLanguage.SETUP_FINISH || "Finish setup";
        } else {
            nextButton.textContent = currentLanguage.SETUP_CONTINUE || "Continue";
        }

        nextButton.addEventListener('click', () => {
            if (isTransitioning) return;
            isTransitioning = true;

            // Music Start on first interaction
            if (currentPage === 0) {
                const setupMusic = document.getElementById('setup-music');
                if (setupMusic && setupMusic.paused) {
                    setupMusic.play().then(() => {
                        let volume = 0;
                        const fadeInInterval = setInterval(() => {
                            volume += 0.1;
                            if (volume >= 0.5) {
                                setupMusic.volume = 0.5;
                                clearInterval(fadeInInterval);
                            } else {
                                setupMusic.volume = volume;
                            }
                        }, 50);
                    }).catch(e => console.error("Music blocked:", e));
                }
            }

            if (currentPage === setupPages.length - 1) {
                setupContainer.style.opacity = '0';
                setTimeout(() => {
                    setupContainer.remove();
                    document.body.classList.remove('setup-active');
                    isDuringFirstSetup = false;
                    completeAiryOnboarding();
                }, 300);
            } else {
                currentPage++;
                updateSetup();
            }
        });
        
        buttons.appendChild(nextButton);
        page.appendChild(buttons);
        return page;
    }

    function updateSetup() {
        if (currentPage === 0) {
            setupContainer.classList.add('startimpression');
        } else {
            setupContainer.classList.remove('startimpression');
        }

        const currentPageElement = setupContainer.querySelector('.setup-page');
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
            setTimeout(() => {
                currentPageElement.remove();
                const newPage = createPage(setupPages[currentPage]);
                setupContainer.appendChild(newPage);
                setTimeout(() => {
                    newPage.classList.add('active');
                    isTransitioning = false; 
                }, 10);
            }, 300);
        } else {
            const newPage = createPage(setupPages[currentPage]);
            setupContainer.appendChild(newPage);
            setTimeout(() => {
                newPage.classList.add('active');
                isTransitioning = false; 
            }, 10);
        }

        const progressDots = setupContainer.querySelectorAll('.progress-dot');
        progressDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }

    // Create progress dots
    const progressContainer = document.createElement('div');
    progressContainer.className = 'setup-progress';
    setupPages.forEach(() => {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        progressContainer.appendChild(dot);
    });
    setupContainer.appendChild(progressContainer);

    document.body.appendChild(setupContainer);
    updateSetup();
}