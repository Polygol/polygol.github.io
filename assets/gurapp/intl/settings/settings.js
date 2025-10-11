function initializeSettingsApp() {
    const navigationStack = ['main-settings'];

    const pagesContainer = document.querySelector('.pages-container');
    const pageTitle = document.querySelector('.page-title');
    const backBtn = document.querySelector('.back-btn');

    const pageTitles = {
        'main-settings': 'Settings',
        'page-display': 'Display',
        'page-homescreen': 'Home Screen',
        'page-clock': 'Clock',
        'page-wallpaper': 'Wallpaper',
        'page-system': 'System',
        'page-data': 'Data & Recovery'
    };

    function navigateTo(pageId) {
        const currentPageId = navigationStack[navigationStack.length - 1];
        const currentPage = document.getElementById(currentPageId);
        const nextPage = document.getElementById(pageId);

        if (!nextPage || !currentPage) return;

        currentPage.classList.add('exiting');
        
        nextPage.style.display = 'flex';
        requestAnimationFrame(() => {
            nextPage.classList.add('entering');
            requestAnimationFrame(() => {
                nextPage.classList.remove('entering');
                nextPage.classList.add('active');
            });
        });

        setTimeout(() => {
            currentPage.classList.remove('active');
            currentPage.classList.remove('exiting');
            currentPage.style.display = 'none';
        }, 300);

        navigationStack.push(pageId);
        updateHeader();
    }

    function navigateBack() {
        if (navigationStack.length <= 1) return;

        const currentPageId = navigationStack.pop();
        const previousPageId = navigationStack[navigationStack.length - 1];
        const currentPage = document.getElementById(currentPageId);
        const previousPage = document.getElementById(previousPageId);

        if (!currentPage || !previousPage) return;

        previousPage.style.display = 'flex';
        previousPage.classList.add('exiting'); // Temporarily put it off-screen
        
        requestAnimationFrame(() => {
            currentPage.classList.add('entering'); // Slide out current page
            previousPage.classList.remove('exiting');
            previousPage.classList.add('active');
        });

        setTimeout(() => {
            currentPage.classList.remove('active');
            currentPage.classList.remove('entering');
            currentPage.style.display = 'none';
        }, 300);

        updateHeader();
    }

    function updateHeader() {
        const currentPageId = navigationStack[navigationStack.length - 1];
        pageTitle.textContent = pageTitles[currentPageId] || 'Settings';
        backBtn.style.display = navigationStack.length > 1 ? 'block' : 'none';
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

    // --- UI Update & Event Binding Logic ---
    function updateControl(key, value) {
        const controls = document.querySelectorAll(`[data-key="${key}"]`);
        if (controls.length === 0) return;
        controls.forEach(control => {
            if (control.type === 'checkbox') {
                control.checked = (key === 'theme') ? (value === 'light') : (value === 'true');
            } else if (control.type === 'range' || control.type === 'color' || control.tagName === 'SELECT' || control.type === 'text') {
                control.value = value || control.defaultValue || '';
            }
        });
    }

    function handleSettingChange(control) {
        const key = control.dataset.key;
        let valueToSet;
        if (control.type === 'checkbox') {
            valueToSet = (key === 'theme') ? (control.checked ? 'light' : 'dark') : control.checked.toString();
        } else {
            valueToSet = control.value;
        }
        // This call will now work because the event listeners are guaranteed to be bound.
        Gurasuraisu.setLocalStorageItem(key, valueToSet);
    }

    function bindEventListeners() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo(item.dataset.page);
            });
        });

        backBtn.addEventListener('click', navigateBack);
        
        document.querySelectorAll('.toggle-switch, .styled-select, .styled-slider, .color-picker, .form-input').forEach(control => {
            const eventType = (['range', 'color', 'text'].includes(control.type)) ? 'input' : 'change';
            control.addEventListener(eventType, () => handleSettingChange(control));
        });

        document.getElementById('btn-transfer').onclick = () => Gurasuraisu.openApp('/transfer/index.html');
        document.getElementById('btn-recovery').onclick = () => Gurasuraisu.openApp('/recovery/index.html');
    }

    // --- Real-time Syncing ---
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const { type, key, value } = event.data;
        if ((type === 'localStorageItemValue' || type === 'settingUpdate') && key) {
            updateControl(key, value);
        }
    });

    // --- INITIALIZATION ---
    bindEventListeners();
    // Announce readiness to the parent, which will trigger the initial settings sync.
    if (window.parent) {
        window.parent.postMessage({ type: 'gurapp-ready' }, window.location.origin);
    }
}

// This is the foolproof entry point. It checks if the API is already loaded.
// If yes, it runs the app logic immediately.
// If not, it waits for the event. This covers all timing scenarios.
if (window.GURASURAISU_API_READY) {
    initializeSettingsApp();
} else {
    window.addEventListener('GurasuraisuReady', initializeSettingsApp, { once: true });
}
