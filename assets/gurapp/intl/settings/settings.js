function initializeSettingsApp() {
    console.log('[Settings App] Gurasuraisu API is ready. Initializing...');

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

    // --- UI Update & Event Binding Logic ---
    function updateControl(key, value) {
        const controls = document.querySelectorAll(`[data-key="${key}"]`);
        if (controls.length === 0) return;

        controls.forEach(control => {
            if (control.type === 'checkbox') {
                control.checked = (key === 'theme') ? (value === 'light') : (value === 'true');
            } else if (control.type === 'range' || control.type === 'color' || control.type === 'text') {
                control.value = value || '';
                if (control.type === 'range' && !value) control.value = control.defaultValue;
                if (control.type === 'color' && !value) control.value = '#ffffff';
            } else if (control.tagName === 'SELECT') {
                control.value = value || control.options[0].value;
            }
        });
    }

    function handleSettingChange(control) {
        const key = control.dataset.key;
        let valueToSet;

        if (control.type === 'checkbox') {
            valueToSet = (key === 'theme') 
                ? (control.checked ? 'light' : 'dark') 
                : control.checked.toString();
        } else {
            valueToSet = control.value;
        }
        // Use the correct API function to send the setting change to the parent
        Gurasuraisu.setLocalStorageItem(key, valueToSet);
    }
    
    function bindEventListeners() {
        document.querySelectorAll('.toggle-switch, .styled-select, .styled-slider, .color-picker, .form-input').forEach(control => {
            const eventType = (['range', 'color', 'text'].includes(control.type)) ? 'input' : 'change';
            control.addEventListener(eventType, () => handleSettingChange(control));
        });

        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById(btn.dataset.modal)?.classList.add('show');
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('show');
            });
        });

        document.getElementById('btn-transfer').onclick = () => Gurasuraisu.openApp('/transfer/index.html');
        document.getElementById('btn-recovery').onclick = () => Gurasuraisu.openApp('/recovery/index.html');
    }

    // --- Real-time Syncing ---
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const { type, key, value } = event.data;

        if (type === 'localStorageItemValue' || type === 'settingUpdate') {
            if (key) {
                 console.log(`[Settings App] Received setting '${key}' with value '${value}'`);
                 updateControl(key, value);
            }
        }
    });
    
    // --- Initialization ---
    bindEventListeners();
}


// This is the robust entry point. It checks if the API is already loaded.
// If yes, run immediately. If not, wait for the event.
if (window.Gurasuraisu && typeof window.Gurasuraisu.showPopup === 'function') {
    initializeSettingsApp();
} else {
    window.addEventListener('GurasuraisuReady', initializeSettingsApp, { once: true });
}
