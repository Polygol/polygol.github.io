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
        const control = document.querySelector(`[data-key="${key}"]`);
        if (!control) return;

        if (control.type === 'checkbox') {
            // Special handling for theme where 'light' means checked
            let boolValue = (key === 'theme') 
                ? (value === 'light') 
                : (value === 'true' || value === null); // Default to true if not set
            control.checked = boolValue;
        }
    }

    function handleSettingChange(control) {
        const key = control.dataset.key;
        let valueToSet = control.type === 'checkbox' ? control.checked : control.value;
        if (key === 'theme') {
            valueToSet = control.checked ? 'light' : 'dark';
        }
        Gurasuraisu.setLocalStorageItem(key, valueToSet.toString());
    }
    
    function bindEventListeners() {
        document.querySelectorAll('.toggle-switch').forEach(control => {
            control.addEventListener('change', () => handleSettingChange(control));
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

        // Listen for initial values fetched via API
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
