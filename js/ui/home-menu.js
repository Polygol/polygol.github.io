/**
 * Astatine 27.1 - iPadOS-Style Fluid Widget, Folder & App Home Menu
 * Custom absolute positioning layout engine with smooth iOS rearranging,
 * touch-driven widget resizing, folders, and Cards deck integration.
 */

(function () {
    let currentHomePageIndex = 0;
    let homePages = [];
    let lastScrollTime = 0;
    let motionWakeAttached = false;
    let activeFolderContext = null;

    // --- Standard Grid Auto-Adaptation Presets (6x5, 4x6, 8x12, 8x6, 4x5, 6x6) ---
    const STANDARD_GRIDS = {
        '6x5': { cols: 6, rows: 5, maxW: 1380, maxH: 820 },
        '4x6': { cols: 4, rows: 6, maxW: 620, maxH: 900 },
        '8x12': { cols: 8, rows: 12, maxW: 1400, maxH: 920 },
        '8x6': { cols: 8, rows: 6, maxW: 1400, maxH: 820 },
        '4x5': { cols: 4, rows: 5, maxW: 560, maxH: 740 },
        '6x6': { cols: 6, rows: 6, maxW: 1200, maxH: 880 }
    };

    function detectOptimalGridSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isPortrait = h > w;

        if (isPortrait) {
            return h >= 740 ? '4x6' : '4x5';
        }

        // Landscape / Tablet / Desktop
        if (w >= 1200) {
            return h >= 850 ? '8x6' : '6x5';
        }
        return '6x5';
    }

    function applyGridSize(gridName) {
        const config = STANDARD_GRIDS[gridName] || STANDARD_GRIDS['6x5'];
        const container = document.getElementById('home-menu-container');
        if (container) {
            container.dataset.grid = gridName;
            container.style.setProperty('--home-grid-cols', config.cols);
            container.style.setProperty('--home-grid-rows', config.rows);
        }

        Object.keys(STANDARD_GRIDS).forEach(name => {
            document.body.classList.remove(`home-grid-${name}`);
        });
        document.body.classList.add(`home-grid-${gridName}`);

        window.currentHomeGrid = { name: gridName, ...config };
    }

    function autoAdaptGridSize() {
        const optimal = detectOptimalGridSize();
        applyGridSize(optimal);
    }

    // --- State Persistence & A-Z App Ordering ---
    function getInstalledAppsListAZ() {
        if (typeof apps === 'undefined') return [];
        return Object.keys(apps)
            .filter(name => name.toLowerCase() !== 'apps')
            .sort((a, b) => a.localeCompare(b));
    }

    function loadHomePages() {
        try {
            const saved = localStorage.getItem('astatine_home_pages');
            if (saved) {
                homePages = JSON.parse(saved);
            } else {
                buildDefaultPages();
            }
        } catch (e) {
            console.error('[HomeMenu] Error loading pages:', e);
            buildDefaultPages();
        }

        ensureAllAppsPresent();
    }

    function buildDefaultPages() {
        const allAZ = getInstalledAppsListAZ();
        const grid = window.currentHomeGrid || { cols: 6, rows: 5 };
        const capacity = Math.max(12, grid.cols * grid.rows - 6);

        // Page 0: System Media Widget + Weather Widget + first batch of A-Z apps
        const page0 = [
            { type: 'widget', appName: 'System', widgetId: 'system-media', size: 'small' },
            { type: 'widget-weather', size: 'small' }
        ];

        let curPage = page0;
        homePages = [curPage];

        allAZ.forEach(appName => {
            if (curPage.length >= capacity) {
                curPage = [];
                homePages.push(curPage);
            }
            curPage.push({ type: 'app', appName: appName });
        });
    }

    function saveHomePages() {
        try {
            localStorage.setItem('astatine_home_pages', JSON.stringify(homePages));
            const azList = getInstalledAppsListAZ();
            localStorage.setItem('astatine_app_list_az', JSON.stringify(azList));
        } catch (e) {
            console.error('[HomeMenu] Error saving pages:', e);
        }
    }

    function ensureAllAppsPresent() {
        if (typeof apps === 'undefined') return;

        const allAZ = getInstalledAppsListAZ();
        const present = new Set();

        homePages.forEach(page => {
            page.forEach(item => {
                if (item.type === 'app' && item.appName) {
                    present.add(item.appName);
                } else if (item.type === 'folder' && Array.isArray(item.items)) {
                    item.items.forEach(sub => {
                        if (sub.appName) present.add(sub.appName);
                    });
                }
            });
        });

        const missing = allAZ.filter(name => !present.has(name));
        if (missing.length > 0) {
            const grid = window.currentHomeGrid || { cols: 6, rows: 5 };
            const pageCapacity = Math.max(14, grid.cols * grid.rows - 4);
            let targetPage = homePages[homePages.length - 1];
            if (!targetPage || targetPage.length >= pageCapacity) {
                targetPage = [];
                homePages.push(targetPage);
            }
            missing.forEach(appName => {
                if (targetPage.length >= pageCapacity) {
                    targetPage = [];
                    homePages.push(targetPage);
                }
                targetPage.push({ type: 'app', appName: appName });
            });
            saveHomePages();
        }
    }

    // --- Beginnings State (Idle Start State) ---
    function isWallpaperEditingActive() {
        return document.body.classList.contains('edit-mode-active') ||
            document.getElementById('wallpaper-switcher-overlay')?.classList.contains('show') ||
            document.getElementById('wallpaper-picker-drawer')?.classList.contains('open') ||
            document.getElementById('edit-mode-ui')?.style.display === 'block';
    }

    function enterBeginningsState() {
        document.body.classList.add('beginnings-active');
        document.body.classList.remove('home-screen-active', 'home-edit-active');
        attachMotionWakeListener();
    }

    function exitBeginningsState() {
        if (!document.body.classList.contains('beginnings-active')) return;
        if (isWallpaperEditingActive()) return;

        document.body.classList.remove('beginnings-active');
        document.body.classList.add('home-screen-active');
        detachMotionWakeListener();

        if (navigator.vibrate) {
            try { navigator.vibrate(20); } catch (e) {}
        }
        if (window.SoundManager && typeof window.SoundManager.play === 'function') {
            try { window.SoundManager.play('open'); } catch (e) {}
        }
    }

    function enterHomeScreen() {
        if (isWallpaperEditingActive()) return;
        exitBeginningsState();
        document.body.classList.add('home-screen-active');
    }

    function attachMotionWakeListener() {
        if (motionWakeAttached) return;
        motionWakeAttached = true;

        const onMotion = (event) => {
            if (!document.body.classList.contains('beginnings-active')) {
                detachMotionWakeListener();
                return;
            }
            if (isWallpaperEditingActive()) return;

            const acc = event.accelerationIncludingGravity;
            if (acc) {
                const total = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
                if (total > 14) {
                    exitBeginningsState();
                }
            }
        };

        window.addEventListener('devicemotion', onMotion, { passive: true });
        window._homeMotionWakeHandler = onMotion;
    }

    function detachMotionWakeListener() {
        if (!motionWakeAttached) return;
        motionWakeAttached = false;
        if (window._homeMotionWakeHandler) {
            window.removeEventListener('devicemotion', window._homeMotionWakeHandler);
            window._homeMotionWakeHandler = null;
        }
    }

    // --- App Info Resolution ---
    function resolveAppInfo(appName) {
        if (typeof apps !== 'undefined' && apps[appName]) {
            const data = apps[appName];
            let iconSrc = data.icon;
            if (iconSrc && (iconSrc.startsWith('http') || iconSrc.startsWith('/') || iconSrc.startsWith('data:'))) {
                // As is
            } else if (iconSrc) {
                iconSrc = `/assets/appicon/${iconSrc}`;
            } else {
                iconSrc = '/assets/img/icon.svg';
            }
            return {
                name: appName,
                url: data.url,
                icon: iconSrc
            };
        }
        return {
            name: appName,
            url: '#',
            icon: '/assets/img/icon.svg'
        };
    }

    // --- Custom 2D Packing Positioning Engine (iPadOS Spacing) ---
    function computePageLayout(items, cols, rows, W, H) {
        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        const layout = [];

        const padX = Math.max(16, Math.floor(W * 0.03));
        const padY = Math.max(16, Math.floor(H * 0.03));
        const availW = W - 2 * padX;
        const availH = H - 2 * padY;

        const cellW = Math.floor(availW / cols);
        const cellH = Math.floor(availH / rows);

        const gapX = Math.max(12, Math.floor(cellW * 0.12));
        const gapY = Math.max(12, Math.floor(cellH * 0.14));

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let spanCols = 1;
            let spanRows = 1;

            if (item.type === 'widget' || item.type === 'widget-weather') {
                const sz = item.size || 'small';
                if (sz === 'small') {
                    spanCols = Math.min(2, cols);
                    spanRows = Math.min(2, rows);
                } else if (sz === 'medium') {
                    spanCols = Math.min(4, cols);
                    spanRows = Math.min(2, rows);
                } else if (sz === 'large') {
                    spanCols = Math.min(4, cols);
                    spanRows = Math.min(4, rows);
                }
            }

            let placedR = -1;
            let placedC = -1;

            for (let r = 0; r <= rows - spanRows; r++) {
                for (let c = 0; c <= cols - spanCols; c++) {
                    let fits = true;
                    for (let dr = 0; dr < spanRows; dr++) {
                        for (let dc = 0; dc < spanCols; dc++) {
                            if (occupied[r + dr][c + dc]) {
                                fits = false;
                                break;
                            }
                        }
                        if (!fits) break;
                    }
                    if (fits) {
                        placedR = r;
                        placedC = c;
                        break;
                    }
                }
                if (placedR !== -1) break;
            }

            if (placedR !== -1) {
                for (let dr = 0; dr < spanRows; dr++) {
                    for (let dc = 0; dc < spanCols; dc++) {
                        occupied[placedR + dr][placedC + dc] = true;
                    }
                }

                const x = padX + placedC * cellW + Math.floor(gapX / 2);
                const y = padY + placedR * cellH + Math.floor(gapY / 2);
                const w = spanCols * cellW - gapX;
                const h = spanRows * cellH - gapY;

                layout.push({
                    item,
                    index: i,
                    r: placedR,
                    c: placedC,
                    spanCols,
                    spanRows,
                    x,
                    y,
                    w,
                    h,
                    overflow: false
                });
            } else {
                layout.push({
                    item,
                    index: i,
                    r: 0,
                    c: 0,
                    spanCols: 1,
                    spanRows: 1,
                    x: 0,
                    y: 0,
                    w: cellW - gapX,
                    h: cellH - gapY,
                    overflow: true
                });
            }
        }

        return { layout, cellW, cellH, gapX, gapY, padX, padY };
    }

    // --- Rendering Home Menu Pages ---
    function renderHomePages() {
        const viewport = document.getElementById('home-pages-viewport');
        if (!viewport) return;

        let track = document.getElementById('home-pages-track');
        if (!track) {
            track = document.createElement('div');
            track.id = 'home-pages-track';
            track.className = 'home-pages-track';
            viewport.appendChild(track);
        }
        track.innerHTML = '';

        const grid = window.currentHomeGrid || { cols: 6, rows: 5 };
        const vpW = viewport.clientWidth || 800;
        const vpH = viewport.clientHeight || 600;

        homePages.forEach((pageItems, pageIdx) => {
            const pageEl = document.createElement('div');
            pageEl.className = 'home-page';
            pageEl.dataset.pageIndex = pageIdx;

            const { layout } = computePageLayout(pageItems, grid.cols, grid.rows, vpW, vpH);

            layout.forEach(entry => {
                if (entry.overflow) return;
                const itemEl = createItemElement(entry.item, pageIdx, entry.index);
                if (itemEl) {
                    itemEl.classList.add('home-grid-item');
                    itemEl.style.width = `${entry.w}px`;
                    itemEl.style.height = `${entry.h}px`;
                    itemEl.style.transform = `translate3d(${entry.x}px, ${entry.y}px, 0)`;
                    itemEl.dataset.origX = entry.x;
                    itemEl.dataset.origY = entry.y;
                    itemEl.dataset.origW = entry.w;
                    itemEl.dataset.origH = entry.h;
                    itemEl.dataset.pageIndex = pageIdx;
                    itemEl.dataset.itemIndex = entry.index;
                    pageEl.appendChild(itemEl);
                }
            });

            track.appendChild(pageEl);
        });

        renderPageIndicators();
        updateTrackTransform();
    }

    function createItemElement(item, pageIdx, itemIdx) {
        if (item.type === 'app') {
            return createAppItemElement(item, pageIdx, itemIdx);
        }
        if (item.type === 'folder') {
            return createFolderItemElement(item, pageIdx, itemIdx);
        }
        if (item.type === 'widget-weather') {
            return createWeatherWidgetElement(item, pageIdx, itemIdx);
        }
        if (item.type === 'widget') {
            return createSystemWidgetElement(item, pageIdx, itemIdx);
        }
        return null;
    }

    // --- App Icon Item (Strictly using user's CSS classes) ---
    function createAppItemElement(item, pageIdx, itemIdx) {
        const info = resolveAppInfo(item.appName);

        const wrapper = document.createElement('div');
        wrapper.className = 'home-grid-item app-grid-item';
        wrapper.dataset.app = item.appName;

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        wrapper.appendChild(removeBtn);

        // Required app-icon markup
        const appIcon = document.createElement('div');
        appIcon.className = 'app-icon';
        appIcon.dataset.app = item.appName;

        const imgContainer = document.createElement('div');
        imgContainer.className = 'app-icon-img';

        const img = document.createElement('img');
        img.src = info.icon;
        img.alt = info.name;
        img.onerror = () => { img.src = '/assets/img/icon.svg'; };
        imgContainer.appendChild(img);
        appIcon.appendChild(imgContainer);

        const label = document.createElement('span');
        label.textContent = info.name;
        appIcon.appendChild(label);

        wrapper.appendChild(appIcon);

        wrapper.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) return;
            e.preventDefault();
            e.stopPropagation();
            if (typeof createFullscreenEmbed === 'function') {
                createFullscreenEmbed(info.url);
            }
        });

        setupItemLongPress(wrapper);
        setupItemDragAndDrop(wrapper, pageIdx, itemIdx, item);
        return wrapper;
    }

    // --- Folder Item ---
    function createFolderItemElement(item, pageIdx, itemIdx) {
        const wrapper = document.createElement('div');
        wrapper.className = 'home-grid-item folder-grid-item';

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        wrapper.appendChild(removeBtn);

        const folderIcon = document.createElement('div');
        folderIcon.className = 'folder-icon-item';

        const previewBox = document.createElement('div');
        previewBox.className = 'folder-preview-box';

        const subItems = Array.isArray(item.items) ? item.items.slice(0, 4) : [];
        subItems.forEach(sub => {
            const subInfo = resolveAppInfo(sub.appName);
            const miniImg = document.createElement('img');
            miniImg.className = 'folder-preview-mini-img';
            miniImg.src = subInfo.icon;
            miniImg.alt = subInfo.name;
            miniImg.onerror = () => { miniImg.src = '/assets/img/icon.svg'; };
            previewBox.appendChild(miniImg);
        });

        folderIcon.appendChild(previewBox);

        const label = document.createElement('span');
        label.className = 'folder-label';
        label.textContent = item.name || 'Folder';
        folderIcon.appendChild(label);

        wrapper.appendChild(folderIcon);

        wrapper.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) return;
            e.stopPropagation();
            openFolder(item, pageIdx, itemIdx);
        });

        setupItemLongPress(wrapper);
        setupItemDragAndDrop(wrapper, pageIdx, itemIdx, item);
        return wrapper;
    }

    // --- Weather Widget Element ---
    function createWeatherWidgetElement(item, pageIdx, itemIdx) {
        const instance = document.createElement('div');
        instance.className = 'home-grid-item widget-grid-item widget-instance weather-widget-instance';
        const size = item.size || 'small';
        instance.dataset.size = size;
        instance.classList.add(size === 'large' ? 'size-large' : (size === 'medium' ? 'size-medium' : 'size-small'));

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        instance.appendChild(removeBtn);

        // Touch-Driven Resize Handle (NO BUTTONS!)
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'home-widget-resize-handle';
        resizeHandle.title = 'Drag to Resize';
        resizeHandle.innerHTML = '<span class="material-symbols-rounded">drag_pan</span>';
        setupWidgetResizeHandle(resizeHandle, instance, pageIdx, itemIdx);
        instance.appendChild(resizeHandle);

        const tempEl = document.getElementById('temperature');
        const currentTemp = tempEl ? tempEl.textContent.trim() : '21°';
        const iconEl = document.getElementById('weather-icon');
        const iconHtml = iconEl ? iconEl.innerHTML : '<span class="material-symbols-rounded">partly_cloudy_day</span>';

        const content = document.createElement('div');
        content.className = 'weather-widget-content';
        content.innerHTML = `
            <div class="weather-top-row">
                <span class="weather-title" data-lang-key="WEATHER">Weather</span>
                <span class="weather-icon" id="home-grid-weather-icon">${iconHtml}</span>
            </div>
            <div class="temperature" id="home-grid-weather-temp">${currentTemp || '21°'}</div>
            <span class="weather-subtext">Current</span>
        `;
        instance.appendChild(content);

        const overlay = document.createElement('div');
        overlay.className = 'widget-instance-overlay';
        instance.appendChild(overlay);

        instance.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) return;
            e.stopPropagation();
            if (typeof createFullscreenEmbed === 'function') {
                createFullscreenEmbed('https://polygol.github.io/weather/index.html');
            }
        });

        setupItemLongPress(instance);
        setupItemDragAndDrop(instance, pageIdx, itemIdx, item);
        return instance;
    }

    // --- System / Gurasuraisu Widget Element ---
    function createSystemWidgetElement(item, pageIdx, itemIdx) {
        const widgetDef = (typeof availableWidgets !== 'undefined')
            ? availableWidgets[item.appName]?.find(w => w.widgetId === item.widgetId)
            : null;

        if (!widgetDef) return null;

        const instance = document.createElement('div');
        instance.className = 'home-grid-item widget-grid-item widget-instance';
        const size = item.size || 'small';
        instance.dataset.size = size;
        instance.classList.add(size === 'large' ? 'size-large' : (size === 'medium' ? 'size-medium' : 'size-small'));
        instance.dataset.widgetId = item.widgetId;
        instance.dataset.appName = item.appName;

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        instance.appendChild(removeBtn);

        // Touch-Driven Resize Handle (NO BUTTONS!)
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'home-widget-resize-handle';
        resizeHandle.title = 'Drag to Resize';
        resizeHandle.innerHTML = '<span class="material-symbols-rounded">drag_pan</span>';
        setupWidgetResizeHandle(resizeHandle, instance, pageIdx, itemIdx);
        instance.appendChild(resizeHandle);

        const iframe = document.createElement('iframe');
        iframe.src = widgetDef.url;
        iframe.setAttribute('data-gurasuraisu-iframe', 'true');
        iframe.scrolling = 'no';
        instance.appendChild(iframe);

        const overlay = document.createElement('div');
        overlay.className = 'widget-instance-overlay';
        instance.appendChild(overlay);

        instance.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) return;
            e.stopPropagation();
            if (widgetDef.openUrl) {
                if (widgetDef.openUrl === '#open-last-media-app') {
                    if (typeof activeMediaSessionApp !== 'undefined' && activeMediaSessionApp && apps[activeMediaSessionApp]) {
                        createFullscreenEmbed(apps[activeMediaSessionApp].url);
                    } else {
                        createFullscreenEmbed('/music/index.html');
                    }
                } else if (typeof createFullscreenEmbed === 'function') {
                    createFullscreenEmbed(widgetDef.openUrl);
                }
            }
        });

        setupItemLongPress(instance);
        setupItemDragAndDrop(instance, pageIdx, itemIdx, item);
        return instance;
    }

    // --- Touch-Only Smooth Widget Resizing (NO BUTTONS) ---
    function setupWidgetResizeHandle(handle, instance, pageIdx, itemIdx) {
        let startX = 0, startY = 0;
        let startW = 0, startH = 0;
        let isResizing = false;

        const onTouchStart = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.touches.length !== 1) return;
            e.stopPropagation();

            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startW = instance.offsetWidth;
            startH = instance.offsetHeight;
            isResizing = true;

            instance.classList.add('widget-resizing-live');
            if (navigator.vibrate) try { navigator.vibrate(20); } catch (err) {}
        };

        const onTouchMove = (e) => {
            if (!isResizing || e.touches.length !== 1) return;
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();

            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;

            const liveW = Math.max(100, startW + dx);
            const liveH = Math.max(100, startH + dy);

            instance.style.width = `${liveW}px`;
            instance.style.height = `${liveH}px`;
        };

        const onTouchEnd = (e) => {
            if (!isResizing) return;
            isResizing = false;
            e.stopPropagation();

            instance.classList.remove('widget-resizing-live');

            const endTouch = e.changedTouches ? e.changedTouches[0] : null;
            const dx = endTouch ? endTouch.clientX - startX : 0;
            const dy = endTouch ? endTouch.clientY - startY : 0;

            const item = homePages[pageIdx]?.[itemIdx];
            if (!item) return;

            const currentSize = item.size || 'small';
            let targetSize = currentSize;

            if (dx > 60 || dy > 60) {
                if (currentSize === 'small') targetSize = 'medium';
                else if (currentSize === 'medium') targetSize = 'large';
            } else if (dx < -60 || dy < -60) {
                if (currentSize === 'large') targetSize = 'medium';
                else if (currentSize === 'medium') targetSize = 'small';
            }

            if (targetSize !== currentSize) {
                item.size = targetSize;
                saveHomePages();
                renderHomePages();
                if (navigator.vibrate) try { navigator.vibrate(35); } catch (err) {}
            } else {
                renderHomePages();
            }
        };

        handle.addEventListener('touchstart', onTouchStart, { passive: false });
        handle.addEventListener('touchmove', onTouchMove, { passive: false });
        handle.addEventListener('touchend', onTouchEnd, { passive: false });
        handle.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }

    // --- Smooth iOS-Style Drag & Drop Rearranging (Touch-First & Fluid) ---
    function setupItemDragAndDrop(itemEl, pageIdx, itemIdx, itemObj) {
        let startX = 0, startY = 0;
        let origX = 0, origY = 0;
        let isDragging = false;
        let currentDropIdx = itemIdx;
        let folderHoverTarget = null;
        let folderHoverTimer = null;
        let currentOrder = [];

        const onTouchStart = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.target.closest('.home-item-remove-btn') || e.target.closest('.home-widget-resize-handle')) {
                return;
            }
            if (e.touches.length !== 1) return;

            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            origX = parseFloat(itemEl.dataset.origX || 0);
            origY = parseFloat(itemEl.dataset.origY || 0);
            isDragging = false;
            currentDropIdx = itemIdx;
            currentOrder = [...(homePages[pageIdx] || [])];
        };

        const onTouchMove = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.touches.length !== 1) return;

            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const dist = Math.hypot(dx, dy);

            if (!isDragging && dist > 10) {
                isDragging = true;
                itemEl.classList.add('is-dragging');
                if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) {}
            }

            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            // Dragged item moves immediately with finger
            itemEl.style.transform = `translate3d(${origX + dx}px, ${origY + dy}px, 0) scale(1.08)`;

            const pageEl = itemEl.parentNode;
            if (!pageEl) return;

            const otherCards = Array.from(pageEl.querySelectorAll('.home-grid-item')).filter(el => el !== itemEl);

            // 1. Detect if hovering over another app to create folder
            let candidateFolderTarget = null;
            if (itemObj.type === 'app') {
                for (let i = 0; i < otherCards.length; i++) {
                    const card = otherCards[i];
                    const rect = card.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const distToCenter = Math.hypot(cx - t.clientX, cy - t.clientY);

                    if (distToCenter < Math.min(rect.width, rect.height) * 0.45) {
                        const targetItem = homePages[pageIdx]?.[parseInt(card.dataset.itemIndex)];
                        if (targetItem && (targetItem.type === 'app' || targetItem.type === 'folder')) {
                            candidateFolderTarget = card;
                            break;
                        }
                    }
                }
            }

            if (candidateFolderTarget) {
                if (folderHoverTarget !== candidateFolderTarget) {
                    clearTimeout(folderHoverTimer);
                    if (folderHoverTarget) folderHoverTarget.classList.remove('folder-target-hover');
                    folderHoverTarget = candidateFolderTarget;
                    folderHoverTimer = setTimeout(() => {
                        if (isDragging && folderHoverTarget === candidateFolderTarget) {
                            folderHoverTarget.classList.add('folder-target-hover');
                            if (navigator.vibrate) try { navigator.vibrate(20); } catch (err) {}
                        }
                    }, 350);
                }
                return;
            } else {
                if (folderHoverTarget) {
                    clearTimeout(folderHoverTimer);
                    folderHoverTarget.classList.remove('folder-target-hover');
                    folderHoverTarget = null;
                }
            }

            // 2. Smoothly rearrange items in real time
            let closestIdx = itemIdx;
            let minDist = Infinity;

            otherCards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const d = Math.hypot(cx - t.clientX, cy - t.clientY);
                if (d < minDist) {
                    minDist = d;
                    closestIdx = parseInt(card.dataset.itemIndex);
                }
            });

            if (closestIdx !== currentDropIdx && minDist < 140) {
                currentDropIdx = closestIdx;

                // Recompute prospective positions for other cards
                const tempOrder = [...(homePages[pageIdx] || [])];
                const from = tempOrder.indexOf(itemObj);
                if (from !== -1 && currentDropIdx >= 0 && currentDropIdx < tempOrder.length) {
                    const [moved] = tempOrder.splice(from, 1);
                    tempOrder.splice(currentDropIdx, 0, moved);

                    const grid = window.currentHomeGrid || { cols: 6, rows: 5 };
                    const vp = document.getElementById('home-pages-viewport');
                    const vpW = vp ? vp.clientWidth : 800;
                    const vpH = vp ? vp.clientHeight : 600;

                    const { layout } = computePageLayout(tempOrder, grid.cols, grid.rows, vpW, vpH);

                    // Animate other items smoothly to shifted coordinates
                    otherCards.forEach(card => {
                        const targetObj = homePages[pageIdx]?.[parseInt(card.dataset.itemIndex)];
                        const newEntry = layout.find(entry => entry.item === targetObj);
                        if (newEntry && !newEntry.overflow) {
                            card.style.transform = `translate3d(${newEntry.x}px, ${newEntry.y}px, 0)`;
                        }
                    });

                    if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) {}
                }
            }
        };

        const onTouchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            itemEl.classList.remove('is-dragging');
            clearTimeout(folderHoverTimer);

            // Handle Folder Creation / Merging
            if (folderHoverTarget && folderHoverTarget.classList.contains('folder-target-hover')) {
                folderHoverTarget.classList.remove('folder-target-hover');
                const targetIdx = parseInt(folderHoverTarget.dataset.itemIndex);
                const page = homePages[pageIdx];

                if (page && page[targetIdx]) {
                    const targetItem = page[targetIdx];
                    const fromIdx = page.indexOf(itemObj);

                    if (fromIdx !== -1) {
                        const [draggedApp] = page.splice(fromIdx, 1);
                        if (targetItem.type === 'app') {
                            const newFolder = {
                                type: 'folder',
                                name: 'Folder',
                                items: [
                                    { type: 'app', appName: targetItem.appName },
                                    { type: 'app', appName: draggedApp.appName }
                                ]
                            };
                            const insertAt = page.indexOf(targetItem);
                            page.splice(insertAt, 1, newFolder);
                        } else if (targetItem.type === 'folder') {
                            if (!Array.isArray(targetItem.items)) targetItem.items = [];
                            targetItem.items.push({ type: 'app', appName: draggedApp.appName });
                        }
                        saveHomePages();
                        renderHomePages();
                        if (navigator.vibrate) try { navigator.vibrate(40); } catch (err) {}
                        return;
                    }
                }
            }

            // Normal Rearranging
            const page = homePages[pageIdx];
            if (page) {
                const fromIdx = page.indexOf(itemObj);
                if (fromIdx !== -1 && currentDropIdx !== fromIdx && currentDropIdx >= 0 && currentDropIdx < page.length) {
                    const [moved] = page.splice(fromIdx, 1);
                    page.splice(currentDropIdx, 0, moved);
                    saveHomePages();
                    if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
                }
            }

            renderHomePages();
        };

        itemEl.addEventListener('touchstart', onTouchStart, { passive: true });
        itemEl.addEventListener('touchmove', onTouchMove, { passive: false });
        itemEl.addEventListener('touchend', onTouchEnd, { passive: true });
        itemEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    function setupItemLongPress(el) {
        let pressTimer = null;
        let isPressing = false;
        let startX = 0, startY = 0;

        el.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            isPressing = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                if (isPressing) {
                    toggleHomeEditMode(true);
                    if (navigator.vibrate) try { navigator.vibrate(40); } catch (err) {}
                }
            }, 550);
        }, { passive: true });

        const cancel = (e) => {
            if (e && e.touches && e.touches.length > 0) {
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                if (Math.hypot(dx, dy) > 10) {
                    isPressing = false;
                    clearTimeout(pressTimer);
                }
                return;
            }
            isPressing = false;
            clearTimeout(pressTimer);
        };

        el.addEventListener('touchmove', cancel, { passive: true });
        el.addEventListener('touchend', cancel, { passive: true });
        el.addEventListener('touchcancel', cancel, { passive: true });
    }

    // --- Folder Overlay Modal ---
    function openFolder(folderItem, pageIdx, itemIdx) {
        if (document.body.classList.contains('home-edit-active')) return;

        let overlay = document.getElementById('home-folder-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'home-folder-overlay';
            overlay.className = 'home-folder-overlay';
            overlay.innerHTML = `
                <div class="home-folder-modal" id="home-folder-modal">
                    <div class="home-folder-header">
                        <input type="text" class="home-folder-title-input" id="home-folder-title-input" value="Folder" placeholder="Folder Name" />
                    </div>
                    <div class="home-folder-grid" id="home-folder-grid"></div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        activeFolderContext = { folderItem, pageIdx, itemIdx };

        const titleInput = overlay.querySelector('#home-folder-title-input');
        if (titleInput) {
            titleInput.value = folderItem.name || 'Folder';
            titleInput.oninput = () => {
                folderItem.name = titleInput.value.trim() || 'Folder';
                saveHomePages();
                renderHomePages();
            };
        }

        const grid = overlay.querySelector('#home-folder-grid');
        if (grid) {
            grid.innerHTML = '';
            (folderItem.items || []).forEach((appItem, appIdx) => {
                const info = resolveAppInfo(appItem.appName);

                const icon = document.createElement('div');
                icon.className = 'app-icon';
                icon.dataset.app = appItem.appName;

                const imgContainer = document.createElement('div');
                imgContainer.className = 'app-icon-img';
                const img = document.createElement('img');
                img.src = info.icon;
                img.alt = info.name;
                img.onerror = () => { img.src = '/assets/img/icon.svg'; };
                imgContainer.appendChild(img);
                icon.appendChild(imgContainer);

                const label = document.createElement('span');
                label.textContent = info.name;
                icon.appendChild(label);

                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeFolder();
                    if (typeof createFullscreenEmbed === 'function') {
                        createFullscreenEmbed(info.url);
                    }
                });

                grid.appendChild(icon);
            });
        }

        overlay.onclick = (e) => {
            if (e.target === overlay) closeFolder();
        };

        overlay.classList.add('show');
    }

    function closeFolder() {
        const overlay = document.getElementById('home-folder-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }

        if (activeFolderContext) {
            const { folderItem, pageIdx } = activeFolderContext;
            // If folder has only 1 item remaining, unpack it into a single app
            if (folderItem.items && folderItem.items.length === 1) {
                const page = homePages[pageIdx];
                const idx = page ? page.indexOf(folderItem) : -1;
                if (idx !== -1) {
                    page.splice(idx, 1, { type: 'app', appName: folderItem.items[0].appName });
                    saveHomePages();
                    renderHomePages();
                }
            } else if (folderItem.items && folderItem.items.length === 0) {
                // If folder is empty, remove it
                const page = homePages[pageIdx];
                const idx = page ? page.indexOf(folderItem) : -1;
                if (idx !== -1) {
                    page.splice(idx, 1);
                    saveHomePages();
                    renderHomePages();
                }
            }
        }
        activeFolderContext = null;
    }

    // --- Page Dots Indicators ---
    function renderPageIndicators() {
        const indicators = document.getElementById('home-page-indicators');
        if (!indicators) return;
        indicators.innerHTML = '';

        homePages.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = `home-page-dot${idx === currentHomePageIndex ? ' active' : ''}`;
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                goToHomePage(idx);
            });
            indicators.appendChild(dot);
        });
    }

    function updateTrackTransform() {
        const track = document.getElementById('home-pages-track');
        if (track) {
            track.style.transform = `translateY(-${currentHomePageIndex * 100}%)`;
        }
        const dots = document.querySelectorAll('.home-page-dot');
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentHomePageIndex);
        });
    }

    // --- Page Navigation Functions ---
    function goToHomePage(index) {
        if (index < 0) index = 0;
        if (index >= homePages.length) index = homePages.length - 1;
        currentHomePageIndex = index;
        window.currentHomePageIndex = currentHomePageIndex;
        updateTrackTransform();
    }

    function nextHomePage() {
        if (currentHomePageIndex < homePages.length - 1) {
            goToHomePage(currentHomePageIndex + 1);
        }
    }

    function prevHomePage() {
        if (currentHomePageIndex > 0) {
            goToHomePage(currentHomePageIndex - 1);
        }
    }

    function scrollHomePage(direction) {
        const now = Date.now();
        if (now - lastScrollTime < 280) return;
        lastScrollTime = now;

        if (direction === 'next' || direction === 'down') {
            nextHomePage();
        } else if (direction === 'prev' || direction === 'up') {
            prevHomePage();
        }
    }

    // --- Home Items Management ---
    function addHomeItem(pageIndex, itemData) {
        if (typeof pageIndex !== 'number' || pageIndex < 0) {
            pageIndex = currentHomePageIndex;
        }
        if (!homePages[pageIndex]) {
            homePages[pageIndex] = [];
        }
        homePages[pageIndex].push(itemData);
        saveHomePages();
        renderHomePages();
        if (typeof showPopup === 'function') {
            showPopup('Added to Home Screen');
        }
    }

    function removeHomeItem(pageIndex, itemIndex) {
        if (homePages[pageIndex] && homePages[pageIndex][itemIndex]) {
            homePages[pageIndex].splice(itemIndex, 1);
            if (homePages[pageIndex].length === 0 && homePages.length > 1) {
                homePages.splice(pageIndex, 1);
                if (currentHomePageIndex >= homePages.length) {
                    currentHomePageIndex = homePages.length - 1;
                }
            }
            saveHomePages();
            renderHomePages();
        }
    }

    function toggleHomeEditMode(forceState = null) {
        const isEditing = forceState !== null
            ? forceState
            : !document.body.classList.contains('home-edit-active');

        document.body.classList.toggle('home-edit-active', isEditing);
    }

    // --- Sync Weather Widget from Existing Home Screen Weather ---
    function startRealTimeSync() {
        function syncWeather() {
            const origTemp = document.getElementById('temperature');
            const gridTemp = document.getElementById('home-grid-weather-temp');
            if (origTemp && gridTemp && origTemp.textContent) {
                gridTemp.textContent = origTemp.textContent;
            }

            const origIcon = document.getElementById('weather-icon');
            const gridIcon = document.getElementById('home-grid-weather-icon');
            if (origIcon && gridIcon && origIcon.innerHTML) {
                gridIcon.innerHTML = origIcon.innerHTML;
            }
        }
        setInterval(syncWeather, 3000);
    }

    // --- Gesture Handling on Home Container & Cards Deck Integration ---
    function setupHomeContainerGestures() {
        const container = document.getElementById('home-menu-container');
        if (!container) return;

        let startX = 0, startY = 0;
        let isTouch = false;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isTouch = true;
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (!isTouch) return;
            isTouch = false;

            if (document.body.classList.contains('home-edit-active') || document.body.classList.contains('edit-mode-active')) {
                return;
            }

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            // Tap threshold: taps NEVER activate swipe actions
            if (absX < 20 && absY < 20) {
                return;
            }

            // UP/DOWN: Page Switching ONLY
            if (absY >= 45 && absY > absX * 1.15) {
                if (deltaY < 0) {
                    nextHomePage();
                } else {
                    if (currentHomePageIndex > 0) {
                        prevHomePage();
                    } else if (startY < 140) {
                        if (typeof openControls === 'function') openControls();
                    } else {
                        enterBeginningsState();
                    }
                }
            }
            // LEFT/RIGHT: Cards Deck API (Interactive full-screen widgets)
            else if (absX >= 45 && absX > absY * 1.15) {
                // Strictly guard: DO NOT allow Cards to be swiped on Beginning screen
                if (document.body.classList.contains('beginnings-active')) {
                    return;
                }

                // If Quick menu mode is enabled, gestures are disabled
                if (typeof isQuickMenuEnabled === 'function' && isQuickMenuEnabled()) {
                    return;
                }

                // Open Cards Deck API
                if (window.CardsManager && typeof window.CardsManager.openCardsDeck === 'function') {
                    window.CardsManager.openCardsDeck();
                }
            }
        }, { passive: true });

        // Tap on empty space dismisses edit mode
        container.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) {
                if (!e.target.closest('.home-item-remove-btn') && !e.target.closest('.app-icon') && !e.target.closest('.widget-instance') && !e.target.closest('.folder-icon-item')) {
                    toggleHomeEditMode(false);
                }
            }
        });
    }

    // --- iPadOS Edit Mode Header Controls (Material Symbols Only) ---
    function setupEditModeHeader() {
        const addBtn = document.getElementById('home-edit-add-btn');
        if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = 'true';
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof openWidgetPicker === 'function') {
                    openWidgetPicker();
                }
            });
        }

        const doneBtn = document.getElementById('home-edit-done-btn');
        if (doneBtn && !doneBtn.dataset.bound) {
            doneBtn.dataset.bound = 'true';
            doneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleHomeEditMode(false);
            });
        }
    }

    // --- Main Initializer ---
    function initHomeMenu() {
        autoAdaptGridSize();
        loadHomePages();
        renderHomePages();
        setupHomeContainerGestures();
        setupEditModeHeader();
        startRealTimeSync();

        let gridResizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(gridResizeTimer);
            gridResizeTimer = setTimeout(() => {
                autoAdaptGridSize();
                renderHomePages();
            }, 100);
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                autoAdaptGridSize();
                renderHomePages();
            }, 150);
        });

        // Boot into Beginnings (idle start state)
        enterBeginningsState();
    }

    // Global Exposure
    window.initHomeMenu = initHomeMenu;
    window.enterBeginningsState = enterBeginningsState;
    window.exitBeginningsState = exitBeginningsState;
    window.enterHomeScreen = enterHomeScreen;
    window.goToHomePage = goToHomePage;
    window.nextHomePage = nextHomePage;
    window.prevHomePage = prevHomePage;
    window.scrollHomePage = scrollHomePage;
    window.addHomeItem = addHomeItem;
    window.removeHomeItem = removeHomeItem;
    window.toggleHomeEditMode = toggleHomeEditMode;
    window.autoAdaptGridSize = autoAdaptGridSize;
    window.detectOptimalGridSize = detectOptimalGridSize;
    window.openFolder = openFolder;
    window.closeFolder = closeFolder;
    window.setHomeGridSize = (name) => {
        if (STANDARD_GRIDS[name]) {
            applyGridSize(name);
            renderHomePages();
            return true;
        }
        return false;
    };
    window.STANDARD_GRIDS = STANDARD_GRIDS;
    window.currentHomePageIndex = currentHomePageIndex;
})();
