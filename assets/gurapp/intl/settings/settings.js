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
        'page-data': 'Your Account',
        'page-general': 'General',
        'page-about': 'About',
        'page-storage': 'Storage',
        'page-db-details': 'Database',
        'page-store-viewer': 'Store Data',
        'page-record-editor': 'Edit Record'
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
        backBtn.style.display = navigationStack.length > 1 ? 'flex' : 'none';
    }

    let currentDbName = null;
    let currentStoreName = null;
    let currentRecordKey = null;

    // --- Storage & DB Logic ---
    async function refreshStoragePage() {
        // 1. Update Visualizer
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const { usage, quota } = await navigator.storage.estimate();
            const usedMB = (usage / 1024 / 1024).toFixed(2);
            const quotaMB = (quota / 1024 / 1024).toFixed(2);
            const percent = Math.min(100, (usage / quota) * 100);
            
            document.getElementById('storage-used-label').textContent = `${usedMB} MB used`;
            document.getElementById('storage-total-label').textContent = `${quotaMB} MB total`;
            document.getElementById('storage-bar-fill').style.width = `${percent}%`;
            
            // Color coding based on usage
            const fillEl = document.getElementById('storage-bar-fill');
            if (percent > 90) fillEl.style.backgroundColor = '#ff5252';
            else if (percent > 70) fillEl.style.backgroundColor = '#ffd740';
            else fillEl.style.backgroundColor = ''; // Reset to default
        }

        // 2. List Databases
        // We use the existing API: listIDBDatabases
        window.parent.postMessage({ 
            action: 'callGurasuraisuFunc', 
            functionName: 'listIDBDatabases', 
            args: [] 
        }, '*');
    }

    async function openDatabase(dbName) {
        currentDbName = dbName;
        document.getElementById('current-db-name-label').textContent = dbName;
        navigateTo('page-db-details');
        
        // Request stores
        window.parent.postMessage({ 
            action: 'callGurasuraisuFunc', 
            functionName: 'listIDBStores', 
            args: [dbName] 
        }, '*');
    }

    async function openStore(storeName) {
        currentStoreName = storeName;
        document.getElementById('current-store-name-label').textContent = storeName;
        navigateTo('page-store-viewer');
        refreshStoreRecords();
    }
    
    function refreshStoreRecords() {
        // Request all records
        window.parent.postMessage({ 
            action: 'callGurasuraisuFunc', 
            functionName: 'getIDBRecord', 
            args: [currentDbName, currentStoreName] 
        }, '*');
    }

    function openRecordEditor(key, value) {
        currentRecordKey = key;
        document.getElementById('record-key-display').value = key;
        
        // Pretty print JSON
        let stringValue = '';
        try {
            stringValue = JSON.stringify(value, null, 2);
        } catch (e) {
            stringValue = String(value);
        }
        
        document.getElementById('record-value-editor').value = stringValue;
        navigateTo('page-record-editor');
    }

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

        // Use postMessage for custom parent functions        
        const wallpaperInput = document.getElementById('wallpaper-input');
        document.getElementById('btn-upload-wallpaper').onclick = () => 
            window.parent.postMessage({ action: 'triggerWallpaperUpload' }, '*');
        
        // This just opens a URL, so Gurasuraisu.openApp is correct
        document.getElementById('btn-version').onclick = () => 
            Gurasuraisu.openApp('https://kirbindustries.gitbook.io/polygol');

        document.getElementById('btn-transfer').onclick = () => Gurasuraisu.openApp('/transfer/index.html');
        document.getElementById('btn-recovery').onclick = () => Gurasuraisu.openApp('/recovery/index.html');
    
        document.getElementById('btn-force-update').onclick = () => {
            // Show immediate feedback in the settings app
            Gurasuraisu.showPopup('Checking for updates'); 
            // Call the new API function
            Gurasuraisu.forceUpdate();
        };

        // Setup Navigation for Storage Page
        const storageBtn = document.querySelector('.nav-item[data-page="page-storage"]');
        if(storageBtn) {
            storageBtn.addEventListener('click', refreshStoragePage);
        }
        
        // DB Actions
        document.getElementById('btn-delete-current-db').onclick = () => {
             window.parent.postMessage({ 
                action: 'callGurasuraisuFunc', 
                functionName: 'deleteIDBDatabase', 
                args: [currentDbName] 
            }, '*');
            navigateBack();
        };

        document.getElementById('btn-clear-current-store').onclick = () => {
             window.parent.postMessage({ 
                action: 'callGurasuraisuFunc', 
                functionName: 'clearIDBStore', 
                args: [currentDbName, currentStoreName] 
            }, '*');
            // Refresh will happen via message listener
        };

        // Record Editor Actions
        document.getElementById('btn-delete-record').onclick = () => {
            // NOTE: This requires the store to use out-of-line keys matching currentRecordKey
            // If keyPath is used, we pass the whole object, but the API expects a key.
            // This is a "best effort" implementation based on the existing simple API.
            window.parent.postMessage({ 
                action: 'callGurasuraisuFunc', 
                functionName: 'removeIDBRecord', 
                args: [currentDbName, currentStoreName, currentRecordKey] 
            }, '*');
            navigateBack();
        };

        document.getElementById('btn-save-record').onclick = () => {
            const jsonStr = document.getElementById('record-value-editor').value;
            // Note: setIDBRecord expects (db, store, key, jsonString)
            window.parent.postMessage({ 
                action: 'callGurasuraisuFunc', 
                functionName: 'setIDBRecord', 
                args: [currentDbName, currentStoreName, currentRecordKey, jsonStr] 
            }, '*');
             navigateBack();
        };
        
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
        const data = event.data; 
        const { type, key, value } = data;
        if ((type === 'localStorageItemValue' || type === 'settingUpdate') && key) {
            updateControl(key, value);
        }

        // New IDB Handlers
        if (data.type === 'idbDatabasesList') {
            const container = document.getElementById('database-list-container');
            container.innerHTML = '';
            
            if (data.databases && data.databases.length > 0) {
                data.databases.forEach(dbName => {
                    const div = document.createElement('div');
                    div.className = 'setting-item nav-item db-item';
                    div.innerHTML = `
                        <div class="setting-info">
                            <span class="material-symbols-rounded">database</span>
                            <span class="setting-label">${dbName}</span>
                        </div>
                        <span class="material-symbols-rounded">arrow_forward_ios</span>
                    `;
                    div.onclick = () => openDatabase(dbName);
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--secondary-text-color)">No databases found.</div>';
            }
        }

        if (data.type === 'idbStoresList') {
            const container = document.getElementById('store-list-container');
            container.innerHTML = '';
            
            if (data.stores && data.stores.length > 0) {
                data.stores.forEach(storeName => {
                    const div = document.createElement('div');
                    div.className = 'setting-item nav-item';
                    div.innerHTML = `
                        <div class="setting-info">
                            <span class="material-symbols-rounded">table_chart</span>
                            <span class="setting-label">${storeName}</span>
                        </div>
                        <span class="material-symbols-rounded">arrow_forward_ios</span>
                    `;
                    div.onclick = () => openStore(storeName);
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--secondary-text-color)">No object stores found.</div>';
            }
        }

        if (data.type === 'idbRecordValue') {
            // We use this same message type for listing all records (array) or one record
            const container = document.getElementById('record-list-container');
            container.innerHTML = '';
            
            // The API returns { value: [...] } when key is null (getAll)
            // However, the current implementation of getIDBRecord in parent just returns the result. 
            // We need to handle the specific return format from 'Terminal' style API.
            // Looking at index.html: idbRecordValue returns data.value
            
            const records = data.value; // This should be the array of records
            
            if (Array.isArray(records) && records.length > 0) {
                // NOTE: Standard getAll() does not return Keys if they are out-of-line.
                // This is a limitation of the simple 'getAll' in the parent. 
                // For a robust viewer, we assume In-Line keys or we just show index.
                // If we want to support deletion, we really need keys. 
                // But for now, let's render what we have.
                
                records.forEach((record, index) => {
                    // Try to find a unique key (id, name, or use index)
                    let displayKey = record.id || record.name || `Index ${index}`;
                    let realKey = record.id || record.name; // Determine key for deletion if possible
                    
                    // Special handling for WallpaperDB blobs to not crash rendering
                    let preview = JSON.stringify(record);
                    if (preview.length > 100) preview = preview.substring(0, 100) + '...';
                    if (record.blob) preview = "[Binary Blob Data]";
                    if (record.base64) preview = "[Base64 Image Data]";

                    const div = document.createElement('div');
                    div.className = 'setting-item record-item';
                    div.innerHTML = `
                        <div class="record-key">${displayKey}</div>
                        <div class="record-preview">${preview}</div>
                    `;
                    
                    // Only allow editing if we can identify a key or if it's just viewing
                    div.onclick = () => openRecordEditor(realKey || index, record);
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--secondary-text-color)">Store is empty.</div>';
            }
        }
        
        if (data.type === 'parentActionSuccess' || data.type === 'parentActionInfo') {
            // Refresh data after actions
            if (currentStoreName) refreshStoreRecords();
        }
    });

    // --- INITIALIZATION ---
    bindEventListeners();
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
