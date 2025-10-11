document.addEventListener('DOMContentLoaded', () => {
    // --- Tab Switching Logic ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            const tabId = button.dataset.tab + '-content';
            document.getElementById(tabId).classList.add('active');
        });
    });

    // --- Gurasuraisu API Communication ---
    const keysToRequest = [
        'theme', 'animationsEnabled', 'highContrast', 
        'gurappsEnabled', 'aiAssistantEnabled', 'oneButtonNavEnabled',
        'font', 'weight', 'roundness', 'clockSize', 'showSeconds', 
        'use12HourFormat', 'stackEnabled', 'clockPosX', 'clockPosY', 
        'alignment', 'colorEnabled', 'gradientEnabled', 'glassEnabled',
        'color', 'gradientColor', 'shadowEnabled', 'shadowBlur', 'shadowColor',
        'dateFormat', 'clockFormat', 'wallpaperBlur', 'wallpaperBrightness', 
        'wallpaperContrast', 'showWeather'
    ];

    function requestInitialSettings() {
        if (typeof Gurasuraisu === 'undefined') {
            console.error("Gurasuraisu API not found. Retrying...");
            setTimeout(requestInitialSettings, 100);
            return;
        }
        keysToRequest.forEach(key => Gurasuraisu.getLocalStorageItem(key));
    }

    // --- UI Update & Event Binding Logic ---
    function updateControl(key, value) {
        const controls = document.querySelectorAll(`[data-key="${key}"]`);
        if (controls.length === 0) return;

        controls.forEach(control => {
            if (control.type === 'checkbox') {
                // Special case for theme: 'light' is checked, 'dark' is not.
                // For others, 'true' is checked. If value is null, default to checked.
                let boolValue = (key === 'theme') 
                    ? (value === 'light') 
                    : (value === 'true' || value === null);
                control.checked = boolValue;
            } else if (control.type === 'range') {
                control.value = value || control.defaultValue;
            } else if (control.type === 'color') {
                control.value = value || '#ffffff';
            } else if (control.tagName === 'SELECT') {
                control.value = value || control.options[0].value;
            } else { // text inputs
                control.value = value || '';
            }
        });
    }

    function handleSettingChange(control) {
        const key = control.dataset.key;
        let valueToSet;

        if (control.type === 'checkbox') {
            // Special case for theme
            if (key === 'theme') {
                valueToSet = control.checked ? 'light' : 'dark';
            } else {
                valueToSet = control.checked.toString();
            }
        } else {
            valueToSet = control.value;
        }
        Gurasuraisu.setLocalStorageItem(key, valueToSet);
    }
    
    function bindEventListeners() {
        const allControls = document.querySelectorAll(
            '.toggle-switch, .styled-select, .styled-slider, .color-picker, .form-input'
        );
        allControls.forEach(control => {
            const eventType = (control.type === 'range' || control.type === 'color' || control.type === 'text') ? 'input' : 'change';
            control.addEventListener(eventType, () => handleSettingChange(control));
        });

        // Modal triggers
        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.modal;
                document.getElementById(modalId)?.classList.add('show');
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('show');
                }
            });
        });

        document.getElementById('btn-transfer').onclick = 
            () => Gurasuraisu.openApp('/transfer/index.html');
        
        document.getElementById('btn-recovery').onclick = 
            () => Gurasuraisu.openApp('/recovery/index.html');
    }

    // --- Real-time Syncing ---
    window.addEventListener('message', (event) => {
        // Basic security check
        if (event.origin !== window.location.origin) return;

        const { type, key, value } = event.data;

        // Listen for initial values fetched via API call
        if (type === 'localStorageItemValue' && key) {
            updateControl(key, value);
        }
        // Listen for real-time updates pushed from the parent
        if (type === 'settingUpdate' && key) {
            updateControl(key, value);
        }
    });
    
    // --- Initialization ---
    window.addEventListener('GurasuraisuReady', () => {
        requestInitialSettings();
        bindEventListeners();
        
        // Announce that the settings app is ready to receive real-time updates
        if(window.parent) {
            window.parent.postMessage({ type: 'settings-app-ready' }, window.location.origin);
        }
    });
});
--- END OF FILE settings.js ---
