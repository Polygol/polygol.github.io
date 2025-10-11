window.addEventListener('GurasuraisuReady', () => {
    
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
                if (key === 'theme') {
                    control.checked = (value === 'light');
                } else {
                    // This correctly handles 'false' and null (unset) as "off".
                    control.checked = (value === 'true');
                }
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
            valueToSet = (key === 'theme') 
                ? (control.checked ? 'light' : 'dark') 
                : control.checked.toString();
        } else {
            valueToSet = control.value;
        }
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
            if (key) updateControl(key, value);
        }
    });
    
    // --- Initialization ---
    bindEventListeners();
});
