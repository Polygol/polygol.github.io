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

    // --- Gurasuraisu Communication ---
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
    
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const { type, key, value } = event.data;
        if (type === 'localStorageItemValue') {
            updateControl(key, value);
        }
    });

    // --- UI Update & Event Binding Logic ---
    function updateControl(key, value) {
        const control = document.querySelector(`[data-key="${key}"]`);
        if (!control) return;

        if (control.type === 'checkbox') {
            let boolValue = (key === 'theme') ? (value === 'light') 
                                              : (value === 'true');
            control.checked = boolValue;
        } else if (control.tagName === 'SELECT') {
            control.value = value || 'EN';
        }
    }
    
    function bindEventListeners() {
        document.querySelectorAll('.toggle-switch, .styled-select')
        .forEach(control => {
            control.addEventListener('change', () => {
                const key = control.dataset.key;
                let value = control.type === 'checkbox' 
                            ? control.checked 
                            : control.value;

                if (key === 'theme') {
                    value = control.checked ? 'light' : 'dark';
                }
                
                Gurasuraisu.setLocalStorageItem(key, value.toString());
            });
        });

        const btnTransfer = document.getElementById('btn-transfer');
        if (btnTransfer) {
            btnTransfer.onclick = () => Gurasuraisu.openApp('/transfer/');
        }
        
        const btnRecovery = document.getElementById('btn-recovery');
        if (btnRecovery) {
            btnRecovery.onclick = () => Gurasuraisu.openApp('/recovery/');
        }
    }

    // --- Initialization ---
    window.addEventListener('GurasuraisuReady', () => {
        requestInitialSettings();
        bindEventListeners();
    });
});
