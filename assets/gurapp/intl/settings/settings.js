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
        'color', 'gradientColor', 'shadowEnabled', 'shadowBlur', 
        'shadowColor', 'dateFormat', 'clockFormat', 'wallpaperBlur', 
        'wallpaperBrightness', 'wallpaperContrast', 'showWeather'
    ];

    function requestInitialSettings() {
        if (typeof Gurasuraisu === 'undefined') {
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
                let boolValue = (key === 'theme') ? (value === 'light') 
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
        let valueToSet = control.value;

        if (control.type === 'checkbox') {
            valueToSet = control.checked;
            if (key === 'theme') {
                valueToSet = control.checked ? 'light' : 'dark';
            }
        }
        Gurasuraisu.setLocalStorageItem(key, valueToSet.toString());
    }
    
    function bindEventListeners() {
        document.querySelectorAll('.toggle-switch, .styled-select, .styled-slider, .color-picker, .form-input').forEach(control => {
            const eventType = (control.type === 'range' || control.type === 'color') 
                              ? 'input' : 'change';
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
            () => Gurasuraisu.openApp('/transfer/');
        
        document.getElementById('btn-recovery').onclick = 
            () => Gurasuraisu.openApp('/recovery/');
    }

    // --- Real-time Syncing ---
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const { type, key, value } = event.data;

        if (type === 'localStorageItemValue' && key) {
            updateControl(key, value);
        }
        if (type === 'settingUpdate' && key) {
            updateControl(key, value);
        }
    });
    
    // --- Initialization ---
    window.addEventListener('GurasuraisuReady', () => {
        requestInitialSettings();
        bindEventListeners();
        
        if(window.parent) {
            window.parent.postMessage({ type: 'settings-app-ready' }, 
                                      window.location.origin);
        }
    });
});
