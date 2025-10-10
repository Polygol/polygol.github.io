document.addEventListener('DOMContentLoaded', () => {
    // Check if running inside Polygol
    const parentWindow = window.parent;
    if (!parentWindow || !parentWindow.document.body.classList) {
        document.body.innerHTML = '<h1>This app must be run inside Polygol.</h1>';
        return;
    }

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

    // --- Direct Polygol Integration ---
    const parentLS = parentWindow.localStorage;

    // --- Functions to Sync UI ---
    function loadInitialSettings() {
        document.querySelectorAll('.toggle-switch').forEach(control => {
            const key = control.dataset.key;
            const value = parentLS.getItem(key);
            updateControl(key, value);
        });
    }
    
    function updateControl(key, value) {
        const control = document.querySelector(`[data-key="${key}"]`);
        if (!control) return;

        if (control.type === 'checkbox') {
            let boolValue = (key === 'theme') ? (value === 'light') 
                                              : (value === 'true' || value === null);
            control.checked = boolValue;
        } else if (control.tagName === 'SELECT') {
            control.value = value || 'EN';
        }
    }

    function handleSettingChange(control) {
        const key = control.dataset.key;
        let valueToSet = control.type === 'checkbox' ? control.checked : control.value;
        if (key === 'theme') {
            valueToSet = control.checked ? 'light' : 'dark';
        }
        // Directly call the parent's setLocalStorageItem function
        // This ensures the parent's own UI sync logic is triggered.
        parentWindow.setLocalStorageItem(key, valueToSet.toString());
    }
    
    // --- Bind Event Listeners ---
    function bindEventListeners() {
        document.querySelectorAll('.toggle-switch').forEach(control => {
            control.addEventListener('change', () => handleSettingChange(control));
        });

        document.getElementById('btn-transfer').onclick = 
            () => parentWindow.createFullscreenEmbed('/transfer/');
        
        document.getElementById('btn-recovery').onclick = 
            () => parentWindow.createFullscreenEmbed('/recovery/');
    }

    // --- Real-time Syncing ---
    // 1. Announce that the settings app is ready
    parentWindow.postMessage({ type: 'settings-app-ready' }, window.location.origin);

    // 2. Listen for updates pushed from the parent
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const { type, key, value } = event.data;
        
        if (type === 'settingUpdate') {
            updateControl(key, value);
        }
    });

    // --- Initialization ---
    loadInitialSettings();
    bindEventListeners();
});
