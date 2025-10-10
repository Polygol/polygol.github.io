document.addEventListener('DOMContentLoaded', () => {
    // Check if running inside Polygol
    if (!window.parent || !window.parent.document.body.classList) {
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
    const parentDoc = window.parent.document;
    const parentLS = window.parent.localStorage;
    const parentWindow = window.parent;

    // Map settings keys to the IDs of the controls in the PARENT window
    const parentControlMap = {
        'animationsEnabled': 'animation-switch',
        'highContrast': 'contrast-switch',
        'gurappsEnabled': 'gurapps-switch',
        'aiAssistantEnabled': 'ai-switch',
        'oneButtonNavEnabled': 'one-button-nav-switch'
    };

    // --- Functions to Sync UI ---
    function loadInitialSettings() {
        document.querySelectorAll('.toggle-switch').forEach(control => {
            const key = control.dataset.key;
            const value = parentLS.getItem(key);
            
            if (key === 'theme') {
                control.checked = (value === 'light');
            } else {
                // Default to true for most toggles if they're not explicitly set to 'false'
                control.checked = (value !== 'false');
            }
        });
    }

    function handleSettingChange(control) {
        const key = control.dataset.key;
        const parentControlId = parentControlMap[key];
        
        // Special case for theme, which uses a clickable div in parent
        if (key === 'theme') {
            const lightModeControl = parentDoc.getElementById('light_mode_qc');
            const isParentLight = parentDoc.body.classList.contains('light-theme');
            if (lightModeControl && (control.checked !== isParentLight)) {
                lightModeControl.click();
            }
            return;
        }

        const parentControl = parentDoc.getElementById(parentControlId);
        if (parentControl) {
            parentControl.checked = control.checked;
            // Trigger the parent's own change event to run all its logic
            parentControl.dispatchEvent(new Event('change'));
        } else {
            console.warn(`Parent control for setting '${key}' not found.`);
        }
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

    // --- Initialization ---
    loadInitialSettings();
    bindEventListeners();
});
