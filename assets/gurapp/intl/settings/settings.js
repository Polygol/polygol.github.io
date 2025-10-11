function initializeSettingsApp() {
    const navigationStack = ['main-settings'];
    const pageContainer = document.querySelector('.pages-container');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.querySelector('.page-title');
    const backBtn = document.querySelector('.back-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');

    const pageTitles = {
        'main-settings': 'Settings',
        'page-display': 'Display',
        'page-homescreen': 'Home Screen',
        'page-clock': 'Clock',
        'page-wallpaper': 'Wallpaper',
        'page-system': 'System',
        'page-data': 'Data & Recovery'
    };

    // --- Tab Switching Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const activeTab = button.dataset.tab;
            if (activeTab === 'home') {
                pageContainer.style.display = 'block';
                tabContents.forEach(c => c.style.display = 'none');
            } else {
                pageContainer.style.display = 'none';
                tabContents.forEach(c => c.style.display = 'none');
                const tabId = activeTab + '-content';
                document.getElementById(tabId).style.display = 'block';
            }
        });
    });

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

    // --- Search Logic ---
    const searchInput = document.getElementById('search-input');
    const searchResultsList = document.getElementById('search-results-list');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        searchResultsList.innerHTML = '';
        if (query.length < 2) return;

        document.querySelectorAll('.page .setting-item').forEach(item => {
            const label = item.querySelector('.setting-label')?.textContent.toLowerCase();
            const description = item.querySelector('.setting-description')?.textContent.toLowerCase();
            
            if ((label && label.includes(query)) || (description && description.includes(query))) {
                const resultItem = item.cloneNode(true);
                const pageId = item.closest('.page').id;
                
                resultItem.addEventListener('click', () => {
                    // Switch to home tab and navigate to the correct page
                    document.querySelector('.tab-btn[data-tab="home"]').click();
                    navigateTo(pageId);
                });
                searchResultsList.appendChild(resultItem);
            }
        });
    });
    
    // --- Preset Saving/Loading Logic ---
    const savePresetBtn = document.getElementById('save-preset-btn');
    const presetsList = document.getElementById('presets-list');

    function loadAndRenderPresets() {
        const presets = JSON.parse(localStorage.getItem('settingPresets') || '{}');
        presetsList.innerHTML = '';
        Object.keys(presets).forEach(name => {
            const presetItem = document.createElement('div');
            presetItem.className = 'setting-item';
            presetItem.innerHTML = `<span class="setting-label">${name}</span>`;
            presetItem.addEventListener('click', () => {
                if (confirm(`Apply the "${name}" preset?`)) {
                    applyPreset(name);
                }
            });
            presetsList.appendChild(presetItem);
        });
    }

    function applyPreset(name) {
        const presets = JSON.parse(localStorage.getItem('settingPresets') || '{}');
        const preset = presets[name];
        if (preset) {
            Object.keys(preset).forEach(key => {
                Gurasuraisu.setLocalStorageItem(key, preset[key]);
            });
            alert(`"${name}" preset applied.`);
        }
    }

    savePresetBtn.addEventListener('click', () => {
        const name = prompt("Enter a name for this preset:");
        if (name) {
            const presets = JSON.parse(localStorage.getItem('settingPresets') || '{}');
            const currentSettings = {};
            document.querySelectorAll('[data-key]').forEach(control => {
                const key = control.dataset.key;
                currentSettings[key] = localStorage.getItem(key) || control.value;
            });
            presets[name] = currentSettings;
            localStorage.setItem('settingPresets', JSON.stringify(presets));
            loadAndRenderPresets();
        }
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

        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', () => document.getElementById(btn.dataset.modal)?.classList.add('show'));
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('show');
            });
        });
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
    loadAndRenderPresets();
    updateHeader();
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
