function initializeSettingsApp() {
    const navigationStack = ['main-settings'];
    const pageContainer = document.querySelector('.pages-container');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.querySelector('.page-title');
    const backBtn = document.querySelector('.back-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    let editMode = 'idb'; // 'idb' or 'ls'

    const pageTitles = {
        'main-settings': 'Settings',
        'page-display': 'Display',
        'page-sound': 'Sound & Haptics',
        'page-apps': 'Apps',
        'page-app-details': 'Details',
        'page-homescreen': 'Home Screen',
        'page-wallpaper': 'Wallpaper',
        'page-system': 'System',
        'page-data': 'Your Account',
        'page-general': 'General',
        'page-a11y': 'Accessibility',
        'page-about': 'About',
        'page-storage': 'Manage Storage',
        'page-db-details': 'Database',
        'page-store-viewer': 'Store Data',
        'page-record-editor': 'Edit Record',
        'page-localstorage': 'Local Storage',
        'page-cache': 'Cache Storage',
        'page-connect': 'Connections',
        'page-licenses': 'Acknowledgements'
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

    function refreshLocalStorage() {
        window.parent.postMessage({ 
            action: 'callGurasuraisuFunc', 
            functionName: 'getLocalStorageAll', 
            args: [] 
        }, '*');
    }

    function refreshCacheStorage() {
        window.parent.postMessage({ 
            action: 'callGurasuraisuFunc', 
            functionName: 'listCaches', 
            args: [] 
        }, '*');
    }
    
    function openRecordEditor(key, value, mode = 'idb') {
        editMode = mode; // Set current mode
        currentRecordKey = key;
        document.getElementById('record-key-display').value = key;
        
        let stringValue = '';
        try {
            // If it's an object (IDB), stringify. If it's a string (LS), keep it.
            // LS values are always strings, but might be JSON strings.
            if (typeof value === 'object') {
                stringValue = JSON.stringify(value, null, 2);
            } else {
                // Try to prettify if it looks like JSON
                try {
                    const parsed = JSON.parse(value);
                    stringValue = JSON.stringify(parsed, null, 2);
                } catch {
                    stringValue = value;
                }
            }
        } catch (e) {
            stringValue = String(value);
        }
        
        document.getElementById('record-value-editor').value = stringValue;
        navigateTo('page-record-editor');
    }

    // --- UI Update & Event Binding Logic ---
    function updateControl(key, value) {
        const controls = document.querySelectorAll(`[data-key="${key}"]`);
        
        // Handle Smart Zoom Visibility logic side-effect (Default: true if empty string/null)
        if (key === 'smartDisplayZoom') {
            const manualContainer = document.getElementById('manual-zoom-container');
            if (manualContainer) {
                const isSmart = (value === 'true' || value === '' || value === null);
                manualContainer.style.display = isSmart ? 'none' : 'flex';
            }
        }

        // Handle Night Stand Config Visibility
        if (key === 'nightStandEnabled') {
            const configContainer = document.getElementById('night-stand-config');
            if (configContainer) {
                configContainer.style.display = (value === 'true') ? 'block' : 'none';
            }
        }

        if (controls.length === 0) return;
        controls.forEach(control => {
            // Prevent overwriting the value while the user is actively adjusting the slider
            if (document.activeElement === control && control.type === 'range') return;

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
    
    // --- Markdown Parser for Licenses ---
    async function loadLicenses() {
        const container = document.getElementById('licenses-container');
        if (container.dataset.loaded) return;

        try {
            const response = await fetch('/about/external.md');
            if (!response.ok) throw new Error('Network response was not ok');
            const text = await response.text();
            
            let html = '';
            const lines = text.split('\n');

            lines.forEach(line => {
                const indentMatch = line.match(/^(\s*)/);
                const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 4) : 0;
                let cleanLine = line.trim();
                
                if (cleanLine.startsWith('# ')) {
                    html += `<h1 style="font-size: 1.4rem; font-weight: 700; margin: 20px 0 15px; font-family: 'Open Runde';">${cleanLine.substring(2)}</h1>`;
                } else if (cleanLine.startsWith('## ')) {
                    html += `<h2 style="font-size: 1.1rem; font-weight: 600; margin: 20px 0 10px; color: var(--accent); font-family: 'Open Runde';">${cleanLine.substring(3)}</h2>`;
                } else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
                    let content = cleanLine.substring(2)
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--accent); text-decoration: underline;">$1</a>');
                    
                    const marginLeft = 5 + (indentLevel * 20);
                    html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 6px; display: flex; align-items: flex-start; line-height: 1.4; font-size: 0.95rem;"><span style="margin-right: 8px; opacity: 0.7;">•</span><span>${content}</span></div>`;
                } else if (cleanLine.startsWith('---')) {
                    html += `<hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 25px 0;">`;
                } else if (cleanLine.length > 0) {
                     let content = cleanLine
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--accent); text-decoration: underline;">$1</a>');
                     html += `<p style="margin-bottom: 10px; line-height: 1.5; opacity: 0.9; font-size: 0.95rem;">${content}</p>`;
                }
            });
            
            container.innerHTML = html;
            container.dataset.loaded = 'true';
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff5252;">Failed to load license information.</div>';
        }
    }

    function refreshAppsListPage() {
        const container = document.getElementById('apps-list-container');
        container.innerHTML = '';
        
        const perms = JSON.parse(window.parent.localStorage.getItem('appPermissions') || '{}');
        const systemAppsObj = window.parent.apps || {};
        const installedAppsObj = JSON.parse(window.parent.localStorage.getItem('userInstalledApps') || '{}');
        
        // Define System Components
        const systemComponents = {
            'kirbServices': { iconSymbol: 'auto_awesome', url: 'internal://kirbservices', type: 'component', desc: 'Communication service with kirbIndustries' },
            'Waves': { iconSymbol: 'cell_tower', url: 'internal://waves', type: 'component', desc: 'Communication service with phone remote control' },
            'SunShadow': { iconSymbol: 'light_mode', url: 'internal://sunshadow', type: 'component', desc: 'Dynamic directional shadows based on time' },
            'Donburi': { iconSymbol: 'dashboard', url: 'internal://donburi', type: 'component', desc: 'Dashboard and assistant menu' },
            'SystemUpdate': { iconSymbol: 'update', url: 'internal://systemupdate', type: 'component', desc: 'Background updates and caching' },
            'TitleFavicon': { iconSymbol: 'tab', url: 'internal://titlefavicon', type: 'component', desc: 'Dynamic browser tab title and icon updates' },
            'NavBlocker': { iconSymbol: 'block', url: 'internal://navblocker', type: 'component', desc: 'Prevents browser navigation' },
            'Weather': { iconSymbol: 'partly_cloudy_day', url: 'internal://weather', type: 'component', desc: 'Weather fetching and rendering' },
            'Location': { iconSymbol: 'location_on', url: 'internal://location', type: 'component', desc: 'Hardware geolocation access for services' }
        };

        const allApps = new Set([...Object.keys(installedAppsObj), ...Object.keys(perms)]);
        const excludedApps = ['Settings', 'Terminal', 'Donburi', 'kirbStore', 'Apps'];

        // Render normal apps (Sorted Alphabetically)
        const sortedApps = Array.from(allApps)
            .filter(appName => !excludedApps.includes(appName))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        sortedApps.forEach(appName => {
            const appDef = systemAppsObj[appName] || installedAppsObj[appName] || {};
            let iconSrc = appDef.icon || 'system.png';
            if (!iconSrc.startsWith('http') && !iconSrc.startsWith('/') && !iconSrc.startsWith('data:')) {
                iconSrc = `/assets/appicon/${iconSrc}`;
            }

            const item = document.createElement('div');
            item.className = 'setting-item nav-item';
            item.innerHTML = `
                <div class="setting-info" style="display: flex; align-items: center; gap: 12px; flex-direction: row;">
                    <img src="${iconSrc}" style="width: 36px; height: 36px; border-radius: 35%; object-fit: cover; corner-shape: superellipse(1.25);">
                    <span class="setting-label">${appName}</span>
                </div>
                <span class="material-symbols-rounded">arrow_forward_ios</span>
            `;
            item.onclick = () => openAppDetails(appName, appDef);
            container.appendChild(item);
        });

        // Render System Components
        Object.keys(systemComponents).forEach(compName => {
            const comp = systemComponents[compName];
            const item = document.createElement('div');
            item.className = 'setting-item nav-item';
            item.innerHTML = `
                <div class="setting-info" style="display: flex; align-items: center; gap: 12px; flex-direction: row;">
                    <div style="width: 36px; height: 36px; border-radius: 35%; background: var(--accent); display:flex; align-items:center; justify-content:center; color: var(--background-color); corner-shape: superellipse(1.25);">
                        <span class="material-symbols-rounded" style="color: var(--background-color); font-size: 20px;">${comp.iconSymbol}</span>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span class="setting-label" style="margin-top: 0; font-size: 15px;">${compName}</span>
                        <span class="setting-description" style="font-size: 11px; opacity: 0.7;">System component</span>
                    </div>
                </div>
                <span class="material-symbols-rounded">arrow_forward_ios</span>
            `;
            item.onclick = () => openAppDetails(compName, comp);
            container.appendChild(item);
        });
    }

    function openAppDetails(appName, appDef) {
        // Cleanup injected component toggles
        const existingToggle = document.getElementById('component-toggle-container');
        if (existingToggle) existingToggle.remove();

        // Setup Header
        document.getElementById('detail-app-name').textContent = appName;
        document.getElementById('detail-app-url').textContent = appDef.desc || appDef.url || 'System App / Unknown URL';
        
        const iconEl = document.getElementById('detail-app-icon');
        if (appDef.type === 'component') {
            // Setup generic icon for components
            iconEl.src = '/assets/appicon/system.png';
        } else {
            let iconSrc = appDef.icon || 'system.png';
            if (!iconSrc.startsWith('http') && !iconSrc.startsWith('/') && !iconSrc.startsWith('data:')) {
                iconSrc = `/assets/appicon/${iconSrc}`;
            }
            iconEl.src = iconSrc;
        }

        // Component vs Standard App UI Routing
        const forceBtn = document.getElementById('btn-app-force-stop');
        const uninstallBtn = document.getElementById('btn-app-uninstall');
        const clearTrackingBtn = document.getElementById('btn-app-clear-tracking-data');
        const permsSection = document.getElementById('detail-app-permissions').parentElement;

        if (appDef.type === 'component') {
            forceBtn.style.display = 'none';
            uninstallBtn.style.display = 'none';
            clearTrackingBtn.style.display = 'none';
            permsSection.style.display = 'none';

            // Inject Custom Component Toggle
            const disabledSys = JSON.parse(window.parent.localStorage.getItem('disabledSystemComponents') || '[]');
            const isEnabled = !disabledSys.includes(appName);

            const toggleContainer = document.createElement('div');
            toggleContainer.id = 'component-toggle-container';
            toggleContainer.className = 'setting-item';
            toggleContainer.style.width = '100%';
            toggleContainer.style.marginTop = '20px';
            toggleContainer.innerHTML = `
                <div class="setting-info"><span class="setting-label">Enable Component</span></div>
                <input type="checkbox" class="toggle-switch" ${isEnabled ? 'checked' : ''}>
            `;
            
            toggleContainer.querySelector('input').onchange = (e) => {
                let currentDisabled = JSON.parse(window.parent.localStorage.getItem('disabledSystemComponents') || '[]');
                if (e.target.checked) {
                    currentDisabled = currentDisabled.filter(c => c !== appName);
                } else {
                    if (!currentDisabled.includes(appName)) currentDisabled.push(appName);
                }
                window.parent.localStorage.setItem('disabledSystemComponents', JSON.stringify(currentDisabled));
                
                Gurasuraisu.showConfirm('A system restart is required to apply component changes. Reboot now?', 'Restart Required', 'power_settings_new').then(res => {
                    if (res) window.parent.location.reload();
                });
            };
            document.getElementById('detail-app-url').parentElement.appendChild(toggleContainer);

        } else {
            forceBtn.style.display = 'flex';
            uninstallBtn.style.display = 'flex';
            clearTrackingBtn.style.display = 'flex';
            permsSection.style.display = 'block';

            // Standard Buttons
            forceBtn.onclick = () => {
                window.parent.postMessage({ action: 'callGurasuraisuFunc', functionName: 'forceCloseAppByName', args: [appName] }, '*');
                Gurasuraisu.showPopup(`Force stopped ${appName}`);
            };
            
            uninstallBtn.onclick = async () => {
                if (await Gurasuraisu.showConfirm(`Are you sure you want to uninstall ${appName}?`)) {
                    Gurasuraisu.deleteApp(appName);
                    navigateBack();
                    setTimeout(refreshAppsListPage, 300);
                }
            };

            clearTrackingBtn.onclick = async () => {
                if (await Gurasuraisu.showConfirm(`Clear all tracking data and revoke all permissions for ${appName}?`, '', 'warning')) {
                    window.parent.postMessage({ action: 'callGurasuraisuFunc', functionName: 'clearAppData', args: [appName] }, '*');
                    Gurasuraisu.showPopup(`Data cleared for ${appName}`);
                    openAppDetails(appName, appDef); // Refresh view to update toggles
                }
            };

            // Permissions List
            const permContainer = document.getElementById('detail-app-permissions');
            permContainer.innerHTML = '';

            const availablePerms = [
                { id: 'notifications', name: 'Notifications' },
                { id: 'live-activity', name: 'Live Activities' },
                { id: 'sheets', name: 'App content' },
                { id: 'immersive-mode', name: 'Immersive mode' },
                { id: 'file-upload', name: 'File access' },
                { id: 'widgets', name: 'Widgets' },
                { id: 'media-session', name: 'Media session' },
                { id: 'tts', name: 'Text-to-Speech' },
                { id: 'waves', name: 'Waves remote' },
                { id: 'ui-sounds', name: 'Sound effects' },
                { id: 'app-management', name: 'App management' },
                { id: 'system-admin', name: 'Modify core system settings (root access)' }
            ];

            let currentPerms = JSON.parse(window.parent.localStorage.getItem('appPermissions') || '{}');
            let appPerms = currentPerms[appName] || {};

            availablePerms.forEach(p => {
                const isGranted = appPerms[p.id] === 'granted';
                
                const item = document.createElement('div');
                item.className = 'setting-item';
                item.innerHTML = `
                    <span class="setting-label">${p.name}</span>
                    <input type="checkbox" class="toggle-switch" ${isGranted ? 'checked' : ''}>
                `;
                
                item.querySelector('input').onchange = (e) => {
                    currentPerms = JSON.parse(window.parent.localStorage.getItem('appPermissions') || '{}');
                    if (!currentPerms[appName]) currentPerms[appName] = {};
                    currentPerms[appName][p.id] = e.target.checked ? 'granted' : 'denied';
                    window.parent.localStorage.setItem('appPermissions', JSON.stringify(currentPerms));
                    
                    // Real-time cleanup if a feature is revoked
                    if (p.id === 'live-activity' && !e.target.checked) {
                        window.parent.postMessage({ action: 'callGurasuraisuFunc', functionName: 'stopActivitiesForApp', args: [appName] }, '*');
                    }
                    if (p.id === 'media-session' && !e.target.checked) {
                        window.parent.postMessage({ action: 'callGurasuraisuFunc', functionName: 'clearMediaSession', args: [appName] }, '*');
                    }
                };
                permContainer.appendChild(item);
            });
        }

        navigateTo('page-app-details');
    }

    function bindEventListeners() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo(item.dataset.page);
            });
        });

        const licenseBtn = document.querySelector('.nav-item[data-page="page-licenses"]');
        if (licenseBtn) {
            licenseBtn.addEventListener('click', loadLicenses);
        }

        const aboutBtn = document.querySelector('.nav-item[data-page="page-about"]');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', updateVersionDisplay);
        }
        const appsListBtn = document.querySelector('.nav-item[data-page="page-apps"]');
        if (appsListBtn) {
            appsListBtn.addEventListener('click', refreshAppsListPage);
        }

        backBtn.addEventListener('click', navigateBack);
        
        document.querySelectorAll('.toggle-switch, .styled-select, .styled-slider, .color-picker, .form-input').forEach(control => {
            const eventType = (['range', 'color', 'text'].includes(control.type)) ? 'input' : 'change';
            control.addEventListener(eventType, () => handleSettingChange(control));
        });

        // Use postMessage for custom parent functions        
        const wallpaperInput = document.getElementById('wallpaper-input');
        document.getElementById('btn-upload-wallpaper').onclick = () => 
            window.parent.postMessage({ action: 'triggerWallpaperUpload' }, '*');
    
        document.getElementById('btn-force-update').onclick = () => {
            // Show immediate feedback in the settings app
            Gurasuraisu.showPopup('Checking for updates'); 
            // Call the new API function
            Gurasuraisu.forceUpdate();
        };

        // Display Zoom Reset
        const resetZoomBtn = document.getElementById('btn-reset-zoom');
        if (resetZoomBtn) {
            resetZoomBtn.onclick = () => {
                // Update local slider UI
                updateControl('displayScale', '100');
                // Send update to parent
                Gurasuraisu.setSettingValue('displayScale', '100');
            };
        }

        // Setup Navigation for Storage Page
        const storageBtn = document.querySelector('.nav-item[data-page="page-storage"]');
        if(storageBtn) {
            storageBtn.addEventListener('click', refreshStoragePage);
        }

        document.getElementById('btn-open-ls').onclick = () => {
            navigateTo('page-localstorage');
            refreshLocalStorage();
        };
        
        document.getElementById('btn-open-cache').onclick = () => {
            navigateTo('page-cache');
            refreshCacheStorage();
        };
        
        document.getElementById('btn-clear-ls').onclick = () => {
             window.parent.postMessage({ 
                action: 'callGurasuraisuFunc', 
                functionName: 'clearLocalStorage', 
                args: [] 
            }, '*');
            // Parent reloads on clear, so no need to refresh UI manually
        };
        
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
            if (editMode === 'idb') {
                window.parent.postMessage({ 
                    action: 'callGurasuraisuFunc', 
                    functionName: 'removeIDBRecord', 
                    args: [currentDbName, currentStoreName, currentRecordKey] 
                }, '*');
            } else {
                 window.parent.postMessage({ 
                    action: 'callGurasuraisuFunc', 
                    functionName: 'removeLocalStorageItem', 
                    args: [currentRecordKey] 
                }, '*');
            }
            navigateBack();
            setTimeout(() => {
                if (editMode === 'ls') refreshLocalStorage();
                else refreshStoreRecords();
            }, 100);
        };
        
        document.getElementById('btn-save-record').onclick = () => {
            const val = document.getElementById('record-value-editor').value;
            
            if (editMode === 'idb') {
                // Existing IDB logic
                window.parent.postMessage({ 
                    action: 'callGurasuraisuFunc', 
                    functionName: 'setIDBRecord', 
                    args: [currentDbName, currentStoreName, currentRecordKey, val] 
                }, '*');
            } else {
                // LocalStorage logic
                // Note: setLocalStorageItem expects (key, value)
                window.parent.postMessage({ 
                    action: 'callGurasuraisuFunc', 
                    functionName: 'setLocalStorageItem', 
                    args: [currentRecordKey, val] 
                }, '*');
            }
            navigateBack();
            
            // Trigger refresh based on mode
            setTimeout(() => {
                if (editMode === 'ls') refreshLocalStorage();
                else refreshStoreRecords();
            }, 100);
        };

        document.getElementById('btn-refresh-waves').onclick = () => {
            const code = window.parent.WavesHost.getPairingCode();
            document.getElementById('waves-code-display').innerText = code;
        };
    
        document.getElementById('btn-reset-waves').onclick = async () => {
            if (await Gurasuraisu.showConfirm("This will disconnect and unpair all existing remotes. A new code will be generated. Confirm?")) {
                window.parent.WavesHost.resetPairingData();
            }
        };

        const discSwitch = document.getElementById('waves-discovery-switch');
        if (discSwitch) {
            // Get initial state from parent
            discSwitch.checked = window.parent.WavesHost.isDiscoveryEnabled();
            
            discSwitch.addEventListener('change', (e) => {
                window.parent.WavesHost.setDiscovery(e.target.checked);
            });
        }

        const rejectBtn = document.getElementById('btn-reject-auth');
        if (rejectBtn) {
            rejectBtn.onclick = () => {
                window.parent.WavesHost.rejectCurrentAuth();
            };
        }

        const updatesSwitch = document.getElementById('updates-switch');
        if (updatesSwitch) {
            // Default to true if not set
            const currentVal = window.parent.localStorage.getItem('updatesEnabled');
            updatesSwitch.checked = currentVal !== 'false'; 
            
            updatesSwitch.addEventListener('change', (e) => {
                 window.parent.postMessage({ 
                    action: 'setSetting', 
                    args: { key: 'updatesEnabled', value: e.target.checked.toString() }
                }, '*');
            });
        }

        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', () => document.getElementById(btn.dataset.modal)?.classList.add('show'));
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('show');
            });
        });
    }
    
    function updateVersionDisplay() {
        const versionLabel = document.querySelector('#page-about .setting-info .setting-label');
        const parentVersion = window.parent.systemVersion;
        
        if (versionLabel && parentVersion) {
            versionLabel.textContent = `Polygol ${parentVersion}`;
        }
    }

    // --- Real-time Syncing ---
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data; 
        const { type, key, value } = data;
        if ((type === 'localStorageItemValue' || type === 'settingUpdate') && key) {
            updateControl(key, value);
        }

        if (key === 'waves_auth_challenge') {
            const modal = document.getElementById('waves-auth-modal');
            const emojiDisplay = document.getElementById('waves-auth-emoji');
            
            if (value) {
                // Show Modal
                emojiDisplay.innerText = value;
                modal.classList.add('show');
            } else {
                // Hide Modal
                modal.classList.remove('show');
            }
        }

        if (data.type === 'localStorageAllValues') {
            const container = document.getElementById('ls-list-container');
            container.innerHTML = '';
            const items = data.value; // Array of {key, value}
            
            if (items && items.length > 0) {
                items.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'setting-item record-item';
                    let preview = String(item.value);
                    if (preview.length > 100) preview = preview.substring(0, 100) + '...';
                    
                    div.innerHTML = `
                        <div class="record-key">${item.key}</div>
                        <div class="record-preview">${preview}</div>
                    `;
                    // Open editor in 'ls' mode
                    div.onclick = () => openRecordEditor(item.key, item.value, 'ls');
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--secondary-text-color)">Storage is empty.</div>';
            }
        }

        // Handle Cache List
        if (data.type === 'cachesList') {
            const container = document.getElementById('cache-list-container');
            container.innerHTML = '';
            const caches = data.value; // Array of strings
            
            if (caches && caches.length > 0) {
                caches.forEach(name => {
                    const div = document.createElement('div');
                    div.className = 'setting-item nav-item';
                    div.innerHTML = `
                        <div class="setting-info">
                            <span class="material-symbols-rounded">folder_zip</span>
                            <span class="setting-label">${name}</span>
                        </div>
                        <button class="action-btn" style="background-color: #ff5252; color: white; border: none; padding: 4px 12px;">Delete</button>
                    `;
                    
                    // Delete button handler
                    const delBtn = div.querySelector('button');
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                         window.parent.postMessage({ 
                            action: 'callGurasuraisuFunc', 
                            functionName: 'deleteCache', 
                            args: [name] 
                        }, '*');
                        // Refresh happens via parentActionSuccess, but we can force it too
                        setTimeout(refreshCacheStorage, 200);
                    };
                    
                    container.appendChild(div);
                });
            } else {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--secondary-text-color)">No caches found.</div>';
            }
        }
        
        // Refresh cache page if action success
        if ((data.type === 'parentActionSuccess' || data.type === 'parentActionInfo') && 
            document.getElementById('page-cache').classList.contains('active')) {
             refreshCacheStorage();
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
        Gurasuraisu.getLocalStorageItem('displayScale');
        Gurasuraisu.getLocalStorageItem('smartDisplayZoom');
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
