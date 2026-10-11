(function () {
    let currentHomePageIndex = 0;
    let homePages = [];
    let lastScrollTime = 0;
    let motionWakeAttached = false;
    let activeFolderContext = null;
    let isPageTransitioning = false;

    // --- Standard Grid Auto-Adaptation Presets (6x5, 4x6, 8x12, 8x6, 4x5, 6x6) ---
    const STANDARD_GRIDS = {
        // --- Extremely Small Screens ---
        '2x1':  { cols: 2, rows: 1, maxW: 320, maxH: 320, density: 'compact' },
        '2x2':  { cols: 2, rows: 2, maxW: 320, maxH: 480, density: 'compact' },
        '3x1':  { cols: 3, rows: 1, maxW: 480, maxH: 320, density: 'compact' },
        '3x2':  { cols: 3, rows: 2, maxW: 540, maxH: 540, density: 'compact' },

        // --- Standard Portrait Screens ---
        '4x3':  { cols: 4, rows: 3, maxW: 600, maxH: 650, density: 'normal' },
        '4x4':  { cols: 4, rows: 4, maxW: 560, maxH: 740, density: 'normal' },
        '4x5':  { cols: 4, rows: 5, maxW: 620, maxH: 900, density: 'normal' },
        '4x6':  { cols: 4, rows: 6, maxW: 620, maxH: 1050, density: 'normal' },
        '4x7':  { cols: 4, rows: 7, maxW: 620, maxH: 1200, density: 'normal' },

        // --- Standard Landscape Screens ---
        '5x3':  { cols: 5, rows: 3, maxW: 1100, maxH: 800, density: 'normal' },
        '6x3':  { cols: 6, rows: 3, maxW: 1200, maxH: 800, density: 'normal' },
        '6x4':  { cols: 6, rows: 4, maxW: 1380, maxH: 820, density: 'normal' },
        '8x4':  { cols: 8, rows: 4, maxW: 1500, maxH: 800, density: 'normal' },
        '8x5':  { cols: 8, rows: 5, maxW: 1400, maxH: 820, density: 'normal' },
        '10x5': { cols: 10, rows: 5, maxW: 1500, maxH: 900, density: 'normal' },
        '12x5': { cols: 12, rows: 5, maxW: 1600, maxH: 900, density: 'normal' },

        // --- Square Displays ---
        '4x3-square': { cols: 4, rows: 3, maxW: 600, maxH: 600, density: 'normal' },
        '6x5':  { cols: 6, rows: 5, maxW: 1000, maxH: 1000, density: 'spacious' },
        '8x7':  { cols: 8, rows: 7, maxW: 1200, maxH: 1200, density: 'spacious' },
        '10x9': { cols: 10, rows: 9, maxW: 1400, maxH: 1400, density: 'spacious' },

        // --- Large Desktop Displays ---
        '7x4':  { cols: 7, rows: 4, maxW: 1400, maxH: 850, density: 'spacious' },
        '7x5':  { cols: 7, rows: 5, maxW: 1400, maxH: 900, density: 'spacious' },
        '9x5':  { cols: 9, rows: 5, maxW: 1500, maxH: 900, density: 'spacious' },
        '10x6': { cols: 10, rows: 6, maxW: 1600, maxH: 1000, density: 'spacious' },
        '12x7': { cols: 12, rows: 7, maxW: 1800, maxH: 1100, density: 'spacious' },
        '12x9': { cols: 12, rows: 9, maxW: 1800, maxH: 1300, density: 'spacious' }
    };

    function getZoomFactor() {
        const raw = document.body.style.zoom || (typeof getComputedStyle === 'function' ? getComputedStyle(document.body).zoom : '1');
        if (!raw) return 1;
        const val = parseFloat(raw);
        if (!val || isNaN(val)) return 1;
        return val > 5 ? val / 100 : val;
    }

    function detectOptimalGridSize() {
        if (!STANDARD_GRIDS || typeof STANDARD_GRIDS !== 'object') {
            return '6x5';
        }

        const zoom = getZoomFactor();
        const w = window.innerWidth / zoom;
        const h = window.innerHeight / zoom;
        const shortSide = Math.min(w, h);
        const screenRatio = w / Math.max(1, h);

        const isSquareish = screenRatio >= 0.80 && screenRatio <= 1.25;
        const isPortrait = !isSquareish && h > w;

        const entries = Object.entries(STANDARD_GRIDS);

        // 1. Filter presets by orientation
        let candidates = entries.filter(([_, cfg]) => {
            if (isSquareish) return cfg.maxW === cfg.maxH || cfg.cols === cfg.rows;
            if (isPortrait) return cfg.maxW < cfg.maxH || cfg.rows > cfg.cols;
            return cfg.maxW > cfg.maxH || cfg.cols > cfg.rows;
        });

        if (candidates.length === 0) candidates = entries;

        // 2. Score based on target cell size and short-side capacity
        let bestGridName = null;
        let bestScore = Infinity;

        candidates.forEach(([name, cfg]) => {
            // Target ideal cell size (~75px to ~110px per cell)
            const cellW = w / cfg.cols;
            const cellH = h / cfg.rows;
            const cellSizeScore = Math.abs(cellW - 88) + Math.abs(cellH - 88);

            // Dimension alignment
            const diffW = Math.abs(cfg.maxW - w);
            const diffH = Math.abs(cfg.maxH - h);

            // Aspect ratio deviation
            const gridAspect = cfg.cols / Math.max(1, cfg.rows);
            const aspectDiff = Math.abs(screenRatio - gridAspect);

            const score = cellSizeScore * 2 + (diffW + diffH) * 0.5 + aspectDiff * 100;

            if (score < bestScore) {
                bestScore = score;
                bestGridName = name;
            }
        });

        return bestGridName || Object.keys(STANDARD_GRIDS)[0] || '6x5';
    }

    function applyGridSize(gridName) {
        const config = STANDARD_GRIDS[gridName] || STANDARD_GRIDS['6x5'];
        const container = document.getElementById('minihompy-container');
        if (container) {
            container.dataset.grid = gridName;
            container.style.setProperty('--home-grid-cols', config.cols);
            container.style.setProperty('--home-grid-rows', config.rows);
            container.style.setProperty('--home-viewport-max-width', `${config.maxW}px`);
            container.style.setProperty('--home-viewport-max-height', `${config.maxH}px`);
        }

        const viewport = document.getElementById('home-pages-viewport');
        if (viewport) {
            viewport.style.maxWidth = `${config.maxW}px`;
            viewport.style.maxHeight = `${config.maxH}px`;
        }

        Object.keys(STANDARD_GRIDS).forEach(name => {
            document.body.classList.remove(`home-grid-${name}`);
        });
        document.body.classList.add(`home-grid-${gridName}`);

        window.currentHomeGrid = { name: gridName, ...config };
    }

    function getViewportDimensions(grid) {
        const zoom = getZoomFactor();
        const activeGrid = grid || window.currentHomeGrid || STANDARD_GRIDS['6x5'];
        const viewport = document.getElementById('home-pages-viewport');
        const maxAvailW = Math.max(300, Math.floor((window.innerWidth / zoom) - 48));
        const maxAvailH = Math.max(300, Math.floor((window.innerHeight / zoom) - 90));

        let vpW = viewport && viewport.clientWidth > 0 ? viewport.clientWidth : maxAvailW;
        let vpH = viewport && viewport.clientHeight > 0 ? viewport.clientHeight : maxAvailH;

        if (activeGrid.maxW) vpW = Math.min(vpW, activeGrid.maxW);
        if (activeGrid.maxH) vpH = Math.min(vpH, activeGrid.maxH);

        return { vpW, vpH, zoom };
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
            const saved = localStorage.getItem('minihompy');
            if (saved) {
                homePages = JSON.parse(saved);
                if (!Array.isArray(homePages) || homePages.length === 0) {
                    buildDefaultPages();
                }
            } else {
                buildDefaultPages();
            }
        } catch (e) {
            console.error('[HomeMenu] Error loading pages:', e);
            buildDefaultPages();
        }

        pruneUninstalledApps();
        ensureAllAppsPresent();
        reflowHomePages();
    }

    function buildDefaultPages() {
        const allAZ = getInstalledAppsListAZ();

        const page0 = [
            { type: 'widget', appName: 'System', widgetId: 'system-media', size: 'small' },
        ];

        // homePages = [page0];

        allAZ.forEach(appName => {
            page0.push({ type: 'app', appName: appName });
        });

        reflowHomePages();
    }

    function saveHomePages() {
        try {
            localStorage.setItem('minihompy', JSON.stringify(homePages));
            const azList = getInstalledAppsListAZ();
            localStorage.setItem('app_az', JSON.stringify(azList));
        } catch (e) {
            console.error('[HomeMenu] Error saving pages:', e);
        }
    }

    function pruneUninstalledApps() {
        if (typeof apps === 'undefined') return;
        const validApps = new Set(Object.keys(apps));
        let changed = false;

        homePages.forEach(page => {
            for (let i = page.length - 1; i >= 0; i--) {
                const item = page[i];
                if (item.type === 'app') {
                    if (!validApps.has(item.appName)) {
                        page.splice(i, 1);
                        changed = true;
                    }
                } else if (item.type === 'folder' && Array.isArray(item.items)) {
                    item.items = item.items.filter(sub => validApps.has(sub.appName));
                    if (item.items.length <= 1) {
                        if (item.items.length === 1) {
                            page.splice(i, 1, { type: 'app', appName: item.items[0].appName });
                        } else {
                            page.splice(i, 1);
                        }
                        changed = true;
                        if (activeFolderContext && activeFolderContext.folderItem === item) {
                            closeFolder();
                        }
                    }
                }
            }
        });

        if (changed) {
            reflowHomePages();
            saveHomePages();
        }
    }

    function syncHomePagesWithApps() {
        if (typeof window.loadUserInstalledApps === 'function') {
            window.loadUserInstalledApps();
        }
        pruneUninstalledApps();
        ensureAllAppsPresent();
        reflowHomePages();
        saveHomePages();
        renderHomePages();
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
            let lastPage = homePages[homePages.length - 1];
            if (!lastPage) {
                lastPage = [];
                homePages.push(lastPage);
            }
            missing.forEach(appName => {
                lastPage.push({ type: 'app', appName: appName });
            });
            reflowHomePages();
            saveHomePages();
        }
    }

    // --- Multi-Page Automatic Empty Space Reflow Engine ---
    function reflowHomePages() {
        const grid = window.currentHomeGrid || STANDARD_GRIDS['6x5'];
        const { vpW, vpH } = getViewportDimensions(grid);

        // 1. Remove empty pages at the end
        while (homePages.length > 1 && homePages[homePages.length - 1].length === 0) {
            homePages.pop();
        }

        // 2. Cascade overflow forward: items that don't fit on page p flow to page p+1
        for (let p = 0; p < homePages.length; p++) {
            const pageItems = homePages[p];
            const { layout } = computePageLayout(pageItems, grid.cols, grid.rows, vpW, vpH);

            const fitting = [];
            const overflow = [];

            layout.forEach(entry => {
                if (entry.overflow) {
                    overflow.push(entry.item);
                } else {
                    fitting.push(entry.item);
                }
            });

            if (overflow.length > 0) {
                homePages[p] = fitting;
                if (!homePages[p + 1]) {
                    homePages[p + 1] = [];
                }
                homePages[p + 1].unshift(...overflow);
            }
        }

        // 3. Pull forward: if page p has available empty space, move items from page p+1 to fill it
        for (let p = 0; p < homePages.length - 1; p++) {
            let changed = true;
            while (changed && homePages[p + 1] && homePages[p + 1].length > 0) {
                changed = false;
                const candidate = homePages[p + 1][0];
                const testList = [...homePages[p], candidate];
                const { layout } = computePageLayout(testList, grid.cols, grid.rows, vpW, vpH);
                const candidateEntry = layout[layout.length - 1];

                if (!candidateEntry.overflow) {
                    homePages[p].push(homePages[p + 1].shift());
                    changed = true;
                }
            }
        }

        // 4. Remove empty trailing pages resulting from pull-forward
        while (homePages.length > 1 && homePages[homePages.length - 1].length === 0) {
            homePages.pop();
        }

        if (currentHomePageIndex >= homePages.length) {
            currentHomePageIndex = Math.max(0, homePages.length - 1);
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
        if (typeof window.updatePersistentClock === 'function') {
            window.updatePersistentClock();
        }
        if (typeof window.updateDynamicDate === 'function') {
            window.updateDynamicDate();
        }
        HomeActivityManager.updateVisibility();
    }

    function exitBeginningsState() {
        if (!document.body.classList.contains('beginnings-active')) return;
        if (isWallpaperEditingActive()) return;

        document.body.classList.remove('beginnings-active');
        document.body.classList.add('home-screen-active');
        detachMotionWakeListener();

        if (typeof window.updatePersistentClock === 'function') {
            window.updatePersistentClock();
        }
        if (typeof window.updateDynamicDate === 'function') {
            window.updateDynamicDate();
        }

        HomeActivityManager.updateVisibility();
    }

    function enterHomeScreen() {
        if (isWallpaperEditingActive()) return;
        exitBeginningsState();
        document.body.classList.add('home-screen-active');
        autoAdaptGridSize();
        renderHomePages();
        if (typeof window.updatePersistentClock === 'function') {
            window.updatePersistentClock();
        }
        if (typeof window.updateDynamicDate === 'function') {
            window.updateDynamicDate();
        }
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

    // --- Custom 2D Packing Positioning Engine (iPadOS Spacing & 1:1 Proportions) ---
    function computePageLayout(items, cols, rows, W, H) {
        const occupied = Array.from({ length: rows }, () => Array(cols).fill(false));
        const layout = [];

        // 1. Initial outer padding
        const padX = Math.max(16, Math.floor(W * 0.03));
        const padY = Math.max(16, Math.floor(H * 0.03));
        const availW = Math.max(100, W - 2 * padX);
        const availH = Math.max(100, H - 2 * padY);

        // 2. Minimum base gap allowance
        const minGap = 10;

        // 3. Calculate max square unit size that fits both horizontally and vertically
        const maxUnitW = Math.floor((availW - Math.max(0, cols - 1) * minGap) / Math.max(1, cols));
        const maxUnitH = Math.floor((availH - Math.max(0, rows - 1) * minGap) / Math.max(1, rows));

        // Base 1:1 square cell size (NEVER stretched)
        const baseSize = Math.max(48, Math.min(maxUnitW, maxUnitH));

        // 4. Adjust the gaps between columns and rows to absorb the remaining space
        const totalUnitsW = cols * baseSize;
        const totalUnitsH = rows * baseSize;

        const remainingW = Math.max(0, availW - totalUnitsW);
        const remainingH = Math.max(0, availH - totalUnitsH);

        let gapX = cols > 1 ? Math.floor(remainingW / (cols - 1)) : 0;
        let gapY = rows > 1 ? Math.floor(remainingH / (rows - 1)) : 0;

        // Cap extreme vertical gaps on tall displays and vertically center the page
        const maxAllowedGapY = Math.max(48, Math.floor(baseSize * 0.85));
        let extraPadY = 0;
        if (gapY > maxAllowedGapY && rows > 1) {
            extraPadY = Math.floor((remainingH - maxAllowedGapY * (rows - 1)) / 2);
            gapY = maxAllowedGapY;
        }

        // Center the entire grid within the available area
        const extraX = Math.floor((remainingW - gapX * Math.max(0, cols - 1)) / 2);
        const extraY = extraPadY > 0 ? extraPadY : Math.floor((remainingH - gapY * Math.max(0, rows - 1)) / 2);

        const startX = padX + Math.max(0, extraX);
        const startY = padY + Math.max(0, extraY);

        // 5. Place and size items
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let spanCols = 1;
            let spanRows = 1;

            if (item.type === 'widget' || item.type === 'widget-weather' || item.type === 'sticker') {
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

                // Allocated slot area
                const slotW = spanCols * baseSize + (spanCols - 1) * gapX;
                const slotH = spanRows * baseSize + (spanRows - 1) * gapY;

                let w = slotW;
                let h = slotH;

                // Enforce strict 1:1 and 2:1 aspect ratios
                if (spanCols === spanRows) {
                    // 1x1 apps/folders, 2x2 small widgets/stickers, 4x4 large widgets -> Perfect 1/1
                    const side = Math.min(slotW, slotH);
                    w = side;
                    h = side;
                } else if (spanCols === 4 && spanRows === 2) {
                    // 4x2 medium widgets -> Perfect 2:1
                    const targetH = Math.min(slotH, Math.floor(slotW / 2));
                    h = targetH;
                    w = targetH * 2;
                }

                // Center the item inside its allocated slot
                const offsetX = Math.floor((slotW - w) / 2);
                const offsetY = Math.floor((slotH - h) / 2);

                const x = startX + placedC * (baseSize + gapX) + offsetX;
                const y = startY + placedR * (baseSize + gapY) + offsetY;

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
                    x: startX,
                    y: startY,
                    w: baseSize,
                    h: baseSize,
                    overflow: true
                });
            }
        }

        return { layout, cellW: baseSize, cellH: baseSize, gapX, gapY, padX, padY };
    }

    // --- Rendering Minihompy Pages ---
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

        // Clean up any orphaned dragged items lingering directly on the container
        const container = document.getElementById('minihompy-container');
        if (container) {
            container.querySelectorAll(':scope > .home-grid-item').forEach(el => {
                if (!el.classList.contains('is-dragging')) {
                    el.remove();
                }
            });
        }

        const grid = window.currentHomeGrid || STANDARD_GRIDS['6x5'];
        const { vpW, vpH } = getViewportDimensions(grid);

        homePages.forEach((pageItems, pageIdx) => {
            const pageEl = document.createElement('div');
            pageEl.className = 'home-page';
            pageEl.dataset.pageIndex = pageIdx;

            const { layout } = computePageLayout(pageItems, grid.cols, grid.rows, vpW, vpH);

            layout.forEach(entry => {
                if (entry.overflow) return;
                const itemEl = createItemElement(entry.item, pageIdx, entry.index, entry);
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

    function createItemElement(item, pageIdx, itemIdx, entry) {
        if (item.type === 'app') {
            return createAppItemElement(item, pageIdx, itemIdx, entry);
        }
        if (item.type === 'folder') {
            return createFolderItemElement(item, pageIdx, itemIdx, entry);
        }
        if (item.type === 'widget') {
            return createSystemWidgetElement(item, pageIdx, itemIdx);
        }
        if (item.type === 'sticker') {
            return createStickerItemElement(item, pageIdx, itemIdx);
        }
        return null;
    }

    // --- Sticker Grid Item ---
    function createStickerItemElement(item, pageIdx, itemIdx) {
        const wrapper = document.createElement('div');
        wrapper.className = 'home-grid-item sticker-grid-item';

        const instance = document.createElement('div');
        instance.className = 'widget-instance sticker-instance';
        if (item.transparent) {
            instance.style.background = 'transparent';
            instance.style.border = 'none';
            instance.style.setProperty('--fx-filter', 'none');
            instance.style.boxShadow = 'none';
        }

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = window.t ? window.t('REMOVE') : 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        instance.appendChild(removeBtn);

        // Touch-Driven Resize Handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'home-widget-resize-handle';
        resizeHandle.title = window.t ? window.t('DRAG_TO_RESIZE') : 'Drag to Resize';
        resizeHandle.innerHTML = '<span class="material-symbols-rounded">drag_pan</span>';
        setupWidgetResizeHandle(resizeHandle, wrapper, pageIdx, itemIdx);
        instance.appendChild(resizeHandle);

        const img = document.createElement('img');
        img.src = item.src;
        img.className = 'sticker-content';
        img.draggable = false;

        if (item.border) {
            img.classList.add('has-border');
            img.style.setProperty('--border-color', item.borderColor || '#ffffff');
            img.style.setProperty('--border-width', `${item.borderWidth || 2}px`);
        }

        instance.appendChild(img);

        const overlay = document.createElement('div');
        overlay.className = 'widget-instance-overlay';
        instance.appendChild(overlay);

        wrapper.appendChild(instance);

        setupItemLongPress(wrapper);
        setupItemDragAndDrop(wrapper, pageIdx, itemIdx, item);
        return wrapper;
    }

    // --- App Icon Item (Strictly using user's CSS classes, never squished) ---
    function createAppItemElement(item, pageIdx, itemIdx, entry) {
        const info = resolveAppInfo(item.appName);

        const wrapper = document.createElement('div');
        wrapper.className = 'home-grid-item app-grid-item';
        wrapper.dataset.app = item.appName;

        // Material Symbol Remove Button - triggers deleteApp rather than deleting shortcut from grid
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = window.t ? window.t('UNINSTALL') : 'Uninstall';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (typeof deleteApp === 'function') {
                await deleteApp(item.appName);
                syncHomePagesWithApps();
            } else if (typeof window.deleteApp === 'function') {
                await window.deleteApp(item.appName);
                syncHomePagesWithApps();
            }
        });
        wrapper.appendChild(removeBtn);

        // Required app-icon markup
        const appIcon = document.createElement('div');
        appIcon.className = 'app-icon';
        appIcon.dataset.app = item.appName;

        const cellW = entry ? entry.w : 120;
        const cellH = entry ? entry.h : 85;

        // Label occupies font-size plus margin-top. Adapt margin and font so they never crowd out the icon.
        const labelGap = Math.max(4, Math.min(14, Math.floor(cellH * 0.08)));
        const approxLabelH = cellH < 75 ? 16 : 20;
        const availH = Math.max(30, cellH - approxLabelH - labelGap);
        const availW = Math.max(30, Math.floor(cellW * 0.72));

        // App Icon MUST ALWAYS be 1:1 square, clamped to max 72px (iOS standard)
        const iconSize = Math.min(72, availW, availH);

        const imgContainer = document.createElement('div');
        imgContainer.className = 'app-icon-img';
        imgContainer.style.width = `${iconSize}px`;
        imgContainer.style.height = `${iconSize}px`;
        imgContainer.style.minWidth = `${iconSize}px`;
        imgContainer.style.minHeight = `${iconSize}px`;
        imgContainer.style.maxWidth = `${iconSize}px`;
        imgContainer.style.maxHeight = `${iconSize}px`;
        imgContainer.style.flexShrink = '0';
        imgContainer.style.aspectRatio = '1 / 1';

        const img = document.createElement('img');
        img.src = info.icon;
        img.alt = info.name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.aspectRatio = '1 / 1';
        img.onerror = () => { img.src = '/assets/img/icon.svg'; };
        imgContainer.appendChild(img);
        appIcon.appendChild(imgContainer);

        const label = document.createElement('span');
        label.textContent = info.name;
        label.style.marginTop = `${labelGap}px`;
        if (cellH < 75) {
            label.style.fontSize = '0.76rem';
        } else if (cellH < 95) {
            label.style.fontSize = '0.82rem';
        }
        appIcon.appendChild(label);

        wrapper.appendChild(appIcon);

        wrapper.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) return;
            if (window._justExitedBeginnings && Date.now() - window._justExitedBeginnings < 450) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
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
    function createFolderItemElement(item, pageIdx, itemIdx, entry) {
        const wrapper = document.createElement('div');
        wrapper.className = 'home-grid-item folder-grid-item';

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = window.t ? window.t('REMOVE') : 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        wrapper.appendChild(removeBtn);

        const folderIcon = document.createElement('div');
        folderIcon.className = 'folder-icon-item';

        const cellW = entry ? entry.w : 120;
        const cellH = entry ? entry.h : 85;

        // Label occupies font-size plus margin-top.
        // Adapt spacing and font size to prevent crowding the icon.
        const labelGap = Math.max(4, Math.min(14, Math.floor(cellH * 0.08)));
        const approxLabelH = cellH < 75 ? 16 : 20;
        const availH = Math.max(30, cellH - approxLabelH - labelGap);
        const availW = Math.max(30, Math.floor(cellW * 0.72));

        // Allow larger icons on larger screens.
        const maxIconSize = cellH >= 130 ? 100
                        : cellH >= 95  ? 84
                        : 64;

        const iconSize = Math.min(maxIconSize, availW, availH);

        const previewBox = document.createElement('div');
        previewBox.className = 'folder-preview-box';
        previewBox.style.width = `${iconSize}px`;
        previewBox.style.height = `${iconSize}px`;
        previewBox.style.minWidth = `${iconSize}px`;
        previewBox.style.minHeight = `${iconSize}px`;
        previewBox.style.maxWidth = `${iconSize}px`;
        previewBox.style.maxHeight = `${iconSize}px`;
        previewBox.style.flexShrink = '0';
        previewBox.style.aspectRatio = '1 / 1';

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
        label.textContent = item.name || window.t('FOLDER');
        label.style.marginTop = `${labelGap}px`;
        if (cellH < 75) {
            label.style.fontSize = '0.76rem';
        } else if (cellH < 95) {
            label.style.fontSize = '0.82rem';
        }
        folderIcon.appendChild(label);

        wrapper.appendChild(folderIcon);

        wrapper.addEventListener('click', (e) => {
            if (e.target.closest('.home-item-remove-btn')) return;
            if (wrapper.dataset.wasDragged === 'true') {
                wrapper.dataset.wasDragged = 'false';
                return;
            }
            e.stopPropagation();
            openFolder(item, pageIdx, itemIdx);
        });

        setupItemLongPress(wrapper);
        setupItemDragAndDrop(wrapper, pageIdx, itemIdx, item);
        return wrapper;
    }

    // --- System / Polygol Widget Element ---
    function createSystemWidgetElement(item, pageIdx, itemIdx) {
        const widgetDef = (typeof availableWidgets !== 'undefined')
            ? availableWidgets[item.appName]?.find(w => w.widgetId === item.widgetId)
            : null;

        if (!widgetDef) return null;

        const wrapper = document.createElement('div');
        wrapper.className = 'home-grid-item widget-grid-item';

        const instance = document.createElement('div');
        instance.className = 'widget-instance';
        const size = item.size || 'small';
        instance.dataset.size = size;
        instance.classList.add(size === 'large' ? 'size-large' : (size === 'medium' ? 'size-medium' : 'size-small'));
        instance.dataset.widgetId = item.widgetId;
        instance.dataset.appName = item.appName;

        // Material Symbol Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'home-item-remove-btn';
        removeBtn.title = window.t ? window.t('REMOVE') : 'Remove';
        removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHomeItem(pageIdx, itemIdx);
        });
        instance.appendChild(removeBtn);

        // Touch-Driven Resize Handle (NO BUTTONS!)
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'home-widget-resize-handle';
        resizeHandle.title = window.t ? window.t('DRAG_TO_RESIZE') : 'Drag to Resize';
        resizeHandle.innerHTML = '<span class="material-symbols-rounded">drag_pan</span>';
        setupWidgetResizeHandle(resizeHandle, wrapper, pageIdx, itemIdx);
        instance.appendChild(resizeHandle);

        const iframe = document.createElement('iframe');
        iframe.src = widgetDef.url;
        iframe.setAttribute('data-polygol-iframe', 'true');
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

        wrapper.appendChild(instance);

        const label = document.createElement('span');
        label.className = 'widget-label';
        label.textContent = widgetDef.title || widgetDef.name || item.appName;
        wrapper.appendChild(label);

        setupItemLongPress(wrapper);
        setupItemDragAndDrop(wrapper, pageIdx, itemIdx, item);
        return wrapper;
    }

    // --- Touch-Only Smooth Widget Resizing (NO BUTTONS) ---
    function setupWidgetResizeHandle(handle, wrapper, pageIdx, itemIdx) {
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
            startW = wrapper.offsetWidth;
            startH = wrapper.offsetHeight;
            isResizing = true;

            wrapper.classList.add('widget-resizing-live');
            if (navigator.vibrate) try { navigator.vibrate(20); } catch (err) {}
        };

        const onTouchMove = (e) => {
            if (!isResizing || e.touches.length !== 1) return;
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();

            const zoom = getZoomFactor();
            const t = e.touches[0];
            const dx = (t.clientX - startX) / zoom;
            const dy = (t.clientY - startY) / zoom;

            const liveW = Math.max(100, startW + dx);
            const liveH = Math.max(100, startH + dy);

            wrapper.style.width = `${liveW}px`;
            wrapper.style.height = `${liveH}px`;
        };

        const onTouchEnd = (e) => {
            if (!isResizing) return;
            isResizing = false;
            e.stopPropagation();

            wrapper.classList.remove('widget-resizing-live');

            const zoom = getZoomFactor();
            const endTouch = e.changedTouches ? e.changedTouches[0] : null;
            const dx = endTouch ? (endTouch.clientX - startX) / zoom : 0;
            const dy = endTouch ? (endTouch.clientY - startY) / zoom : 0;

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
                reflowHomePages();
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

    // --- Smooth Multi-Page iOS Drag & Drop Rearranging (Touch-First & Fluid) ---
    function setupItemDragAndDrop(itemEl, sourcePageIdx, sourceItemIdx, itemObj) {
        let startX = 0, startY = 0;
        let grabOffsetX = 0, grabOffsetY = 0;
        let isDragging = false;
        let holdTimer = null;
        let origRect = null;
        let folderHoverTarget = null;
        let folderHoverTimer = null;
        let edgePageTimer = null;
        let edgeCooldown = false;
        let currentDropIdx = sourceItemIdx;

        let origParent = null;
        let origNextSibling = null;

        const startDrag = (curX, curY) => {
            if (isDragging) return;
            isDragging = true;
            itemEl.dataset.wasDragged = 'true';

            itemEl.classList.add('is-dragging');
            if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) {}

            const zoom = getZoomFactor();
            const itemCSSWidth = origRect.width / zoom;
            const itemCSSHeight = origRect.height / zoom;

            origParent = itemEl.parentElement;
            origNextSibling = itemEl.nextSibling;
            const container = document.getElementById('minihompy-container') || document.body;
            container.appendChild(itemEl);

            itemEl.style.setProperty('position', 'fixed', 'important');
            itemEl.style.setProperty('width', `${itemCSSWidth}px`, 'important');
            itemEl.style.setProperty('height', `${itemCSSHeight}px`, 'important');
            itemEl.style.setProperty('left', '0px', 'important');
            itemEl.style.setProperty('top', '0px', 'important');
            itemEl.style.setProperty('z-index', '99999', 'important');

            updateDragPosition(curX, curY);
        };

        const updateDragPosition = (x, y) => {
            const zoom = getZoomFactor();
            const curCSSX = x / zoom;
            const curCSSY = y / zoom;
            const posX = curCSSX - grabOffsetX;
            const posY = curCSSY - grabOffsetY;
            itemEl.style.setProperty('transform', `translate3d(${posX}px, ${posY}px, 0) scale(1.08)`, 'important');
        };

        const onTouchStart = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.target.closest('.home-item-remove-btn') || e.target.closest('.home-widget-resize-handle')) {
                return;
            }
            if (e.touches.length !== 1) return;

            const zoom = getZoomFactor();
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;

            origRect = itemEl.getBoundingClientRect();
            const itemCSSLeft = origRect.left / zoom;
            const itemCSSTop = origRect.top / zoom;

            grabOffsetX = (startX / zoom) - itemCSSLeft;
            grabOffsetY = (startY / zoom) - itemCSSTop;

            isDragging = false;
            currentDropIdx = sourceItemIdx;

            clearTimeout(holdTimer);
            holdTimer = setTimeout(() => {
                if (!isDragging && document.body.classList.contains('home-edit-active')) {
                    startDrag(startX, startY);
                }
            }, 180);
        };

        const onTouchMove = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.touches.length !== 1) return;

            const zoom = getZoomFactor();
            const t = e.touches[0];
            const dx = (t.clientX - startX) / zoom;
            const dy = (t.clientY - startY) / zoom;
            const dist = Math.hypot(dx, dy);

            if (!isDragging && dist > 8) {
                clearTimeout(holdTimer);
                startDrag(t.clientX, t.clientY);
            }

            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            updateDragPosition(t.clientX, t.clientY);

            const curCSSX = t.clientX / zoom;
            const curCSSY = t.clientY / zoom;

            // 1. Edge of Viewport Detection: Drag to top/bottom to flip pages
            const vp = document.getElementById('home-pages-viewport');
            const vpRect = vp ? vp.getBoundingClientRect() : { top: 60 * zoom, bottom: (window.innerHeight - 60) * zoom };
            const topEdge = (vpRect.top / zoom) + 75;
            const bottomEdge = (vpRect.bottom / zoom) - 75;

            if (curCSSY < topEdge) {
                if (!edgeCooldown && currentHomePageIndex > 0) {
                    if (!edgePageTimer) {
                        edgePageTimer = setTimeout(() => {
                            if (isDragging && currentHomePageIndex > 0) {
                                edgeCooldown = true;
                                goToHomePage(currentHomePageIndex - 1);
                                if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
                                setTimeout(() => { edgeCooldown = false; }, 600);
                            }
                            edgePageTimer = null;
                        }, 380);
                    }
                }
            } else if (curCSSY > bottomEdge) {
                if (!edgeCooldown) {
                    if (!edgePageTimer) {
                        edgePageTimer = setTimeout(() => {
                            if (isDragging) {
                                edgeCooldown = true;
                                if (currentHomePageIndex < homePages.length - 1) {
                                    goToHomePage(currentHomePageIndex + 1);
                                    if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
                                } else {
                                    // Dragging past the last page creates a new page like iPadOS
                                    homePages.push([]);
                                    renderHomePages();
                                    goToHomePage(homePages.length - 1);
                                    if (navigator.vibrate) try { navigator.vibrate(35); } catch (err) {}
                                }
                                setTimeout(() => { edgeCooldown = false; }, 600);
                            }
                            edgePageTimer = null;
                        }, 400);
                    }
                }
            } else {
                if (edgePageTimer) {
                    clearTimeout(edgePageTimer);
                    edgePageTimer = null;
                }
            }

            // 2. Target page item detection on current visible page
            const currentTrack = document.getElementById('home-pages-track');
            const activePageEl = currentTrack?.querySelector(`.home-page[data-page-index="${currentHomePageIndex}"]`);
            if (!activePageEl) return;

            const otherCards = Array.from(activePageEl.querySelectorAll('.home-grid-item')).filter(el => el !== itemEl);

            // Folder hover detection
            let candidateFolderTarget = null;
            if (itemObj.type === 'app') {
                for (let i = 0; i < otherCards.length; i++) {
                    const card = otherCards[i];
                    const rect = card.getBoundingClientRect();
                    const cx = (rect.left + rect.width / 2) / zoom;
                    const cy = (rect.top + rect.height / 2) / zoom;
                    const cardW = rect.width / zoom;
                    const cardH = rect.height / zoom;
                    const distToCenter = Math.hypot(cx - curCSSX, cy - curCSSY);

                    if (distToCenter < Math.min(cardW, cardH) * 0.45) {
                        const targetItem = homePages[currentHomePageIndex]?.[parseInt(card.dataset.itemIndex)];
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

            // Real-time slot shifting
            let closestIdx = 0;
            let minDist = Infinity;

            otherCards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const cx = (rect.left + rect.width / 2) / zoom;
                const cy = (rect.top + rect.height / 2) / zoom;
                const d = Math.hypot(cx - curCSSX, cy - curCSSY);
                if (d < minDist) {
                    minDist = d;
                    closestIdx = parseInt(card.dataset.itemIndex);
                }
            });

            if (otherCards.length === 0) {
                currentDropIdx = 0;
            } else if (closestIdx !== currentDropIdx && minDist < 150) {
                currentDropIdx = closestIdx;

                const tempOrder = [...(homePages[currentHomePageIndex] || [])];
                const from = tempOrder.indexOf(itemObj);
                if (from !== -1) {
                    tempOrder.splice(from, 1);
                }
                tempOrder.splice(currentDropIdx, 0, itemObj);

                const grid = window.currentHomeGrid || { cols: 6, rows: 5 };
                const vpW = vp ? vp.clientWidth : 800;
                const vpH = vp ? vp.clientHeight : 600;

                const { layout } = computePageLayout(tempOrder, grid.cols, grid.rows, vpW, vpH);

                otherCards.forEach(card => {
                    const targetObj = homePages[currentHomePageIndex]?.[parseInt(card.dataset.itemIndex)];
                    const newEntry = layout.find(entry => entry.item === targetObj);
                    if (newEntry && !newEntry.overflow) {
                        card.style.transform = `translate3d(${newEntry.x}px, ${newEntry.y}px, 0)`;
                    }
                });

                if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) {}
            }
        };

        const onTouchEnd = (e) => {
            clearTimeout(holdTimer);
            if (!isDragging) return;
            isDragging = false;
            itemEl.classList.remove('is-dragging');
            itemEl.style.removeProperty('position');
            itemEl.style.removeProperty('width');
            itemEl.style.removeProperty('height');
            itemEl.style.removeProperty('left');
            itemEl.style.removeProperty('top');
            itemEl.style.removeProperty('z-index');
            itemEl.style.removeProperty('transform');
            clearTimeout(folderHoverTimer);
            if (edgePageTimer) {
                clearTimeout(edgePageTimer);
                edgePageTimer = null;
            }

            // Handle Folder Creation / Merging
            if (folderHoverTarget && folderHoverTarget.classList.contains('folder-target-hover')) {
                folderHoverTarget.classList.remove('folder-target-hover');
                const targetIdx = parseInt(folderHoverTarget.dataset.itemIndex);
                const targetPage = homePages[currentHomePageIndex];

                if (targetPage && targetPage[targetIdx]) {
                    const targetItem = targetPage[targetIdx];
                    const fromPage = homePages[sourcePageIdx];
                    const fromIdx = fromPage ? fromPage.indexOf(itemObj) : -1;

                    if (fromIdx !== -1) {
                        const [draggedApp] = fromPage.splice(fromIdx, 1);
                        if (targetItem.type === 'app') {
                            const newFolder = {
                                type: 'folder',
                                name: 'Folder',
                                items: [
                                    { type: 'app', appName: targetItem.appName },
                                    { type: 'app', appName: draggedApp.appName }
                                ]
                            };
                            const insertAt = targetPage.indexOf(targetItem);
                            targetPage.splice(insertAt, 1, newFolder);
                        } else if (targetItem.type === 'folder') {
                            if (!Array.isArray(targetItem.items)) targetItem.items = [];
                            targetItem.items.push({ type: 'app', appName: draggedApp.appName });
                        }
                        reflowHomePages();
                        saveHomePages();
                        itemEl.remove();
                        renderHomePages();
                        if (navigator.vibrate) try { navigator.vibrate(40); } catch (err) {}
                        return;
                    }
                }
            }

            // Move item to target page and slot
            const fromPage = homePages[sourcePageIdx];
            const targetPage = homePages[currentHomePageIndex] || [];
            if (!homePages[currentHomePageIndex]) {
                homePages[currentHomePageIndex] = targetPage;
            }

            const fromIdx = fromPage ? fromPage.indexOf(itemObj) : -1;
            if (fromIdx !== -1) {
                const [moved] = fromPage.splice(fromIdx, 1);
                const safeInsertIdx = Math.max(0, Math.min(currentDropIdx, targetPage.length));
                targetPage.splice(safeInsertIdx, 0, moved);

                reflowHomePages();
                saveHomePages();
                if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
            }

            // Remove the dragged element from minihompy-container so it does not linger as an orphan
            itemEl.remove();
            renderHomePages();
        };

        const onTouchCancel = () => {
            clearTimeout(holdTimer);
            if (!isDragging) return;
            isDragging = false;
            itemEl.classList.remove('is-dragging');
            itemEl.style.removeProperty('position');
            itemEl.style.removeProperty('width');
            itemEl.style.removeProperty('height');
            itemEl.style.removeProperty('left');
            itemEl.style.removeProperty('top');
            itemEl.style.removeProperty('z-index');
            itemEl.style.removeProperty('transform');
            clearTimeout(folderHoverTimer);
            if (edgePageTimer) {
                clearTimeout(edgePageTimer);
                edgePageTimer = null;
            }
            itemEl.remove();
            renderHomePages();
        };

        itemEl.addEventListener('touchstart', onTouchStart, { passive: true });
        itemEl.addEventListener('touchmove', onTouchMove, { passive: false });
        itemEl.addEventListener('touchend', onTouchEnd, { passive: true });
        itemEl.addEventListener('touchcancel', onTouchCancel, { passive: true });
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
        let overlay = document.getElementById('home-folder-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'home-folder-overlay';
            overlay.className = 'home-folder-overlay';
            overlay.innerHTML = `
                <div class="home-folder-modal" id="home-folder-modal">
                    <div class="home-folder-header">
                        <input type="text" class="home-folder-title-input" id="home-folder-title-input" value="Folder" placeholder="Folder Name" />
                        <button class="home-folder-close-btn" id="home-folder-close-btn" title="Close">
                            <span class="material-symbols-rounded">close</span>
                        </button>
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

        const closeBtn = overlay.querySelector('#home-folder-close-btn');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeFolder();
            };
        }

        renderFolderContents(folderItem, pageIdx);

        overlay.onclick = (e) => {
            if (e.target === overlay) closeFolder();
        };

        // Force DOM reflow so entry animation triggers reliably
        void overlay.offsetWidth;
        overlay.classList.add('show');
    }

    function renderFolderContents(folderItem, pageIdx) {
        const overlay = document.getElementById('home-folder-overlay');
        if (!overlay) return;
        const grid = overlay.querySelector('#home-folder-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const isEditMode = document.body.classList.contains('home-edit-active');

        (folderItem.items || []).forEach((appItem, appIdx) => {
            const info = resolveAppInfo(appItem.appName);

            const cell = document.createElement('div');
            cell.className = 'folder-grid-cell';
            cell.dataset.app = appItem.appName;
            cell.dataset.index = appIdx;

            // Remove button for this app in edit mode - triggers deleteApp uninstallation prompt
            const removeBtn = document.createElement('button');
            removeBtn.className = 'home-item-remove-btn';
            removeBtn.title = window.t ? window.t('UNINSTALL') : 'Uninstall';
            removeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (typeof deleteApp === 'function') {
                    await deleteApp(appItem.appName);
                    syncHomePagesWithApps();
                    if (activeFolderContext) {
                        renderFolderContents(folderItem, pageIdx);
                    }
                } else if (typeof window.deleteApp === 'function') {
                    await window.deleteApp(appItem.appName);
                    syncHomePagesWithApps();
                    if (activeFolderContext) {
                        renderFolderContents(folderItem, pageIdx);
                    }
                }
            });
            cell.appendChild(removeBtn);

            const icon = document.createElement('div');
            icon.className = 'app-icon';
            icon.dataset.app = appItem.appName;

            const imgContainer = document.createElement('div');
            imgContainer.className = 'app-icon-img';
            imgContainer.style.width = '60px';
            imgContainer.style.height = '60px';
            imgContainer.style.minWidth = '60px';
            imgContainer.style.minHeight = '60px';
            imgContainer.style.maxWidth = '60px';
            imgContainer.style.maxHeight = '60px';
            imgContainer.style.flexShrink = '0';
            imgContainer.style.aspectRatio = '1 / 1';

            const img = document.createElement('img');
            img.src = info.icon;
            img.alt = info.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.aspectRatio = '1 / 1';
            img.onerror = () => { img.src = '/assets/img/icon.svg'; };
            imgContainer.appendChild(img);
            icon.appendChild(imgContainer);

            const label = document.createElement('span');
            label.textContent = info.name;
            icon.appendChild(label);

            cell.appendChild(icon);

            // Tap to launch app if not in edit mode
            cell.addEventListener('click', (e) => {
                if (document.body.classList.contains('home-edit-active')) return;
                if (e.target.closest('.home-item-remove-btn')) return;
                e.stopPropagation();
                closeFolder();
                if (typeof createFullscreenEmbed === 'function') {
                    createFullscreenEmbed(info.url);
                }
            });

            // Touch Drag: Reorder inside folder or drag out of folder onto home screen
            setupFolderItemTouchDrag(cell, appItem, appIdx, folderItem, pageIdx);

            grid.appendChild(cell);
        });
    }

    function removeAppFromFolder(folderItem, pageIdx, appIdx) {
        if (!folderItem.items || appIdx < 0 || appIdx >= folderItem.items.length) return;
        const appItem = folderItem.items[appIdx];
        if (typeof deleteApp === 'function') {
            deleteApp(appItem.appName).then(() => {
                syncHomePagesWithApps();
                if (activeFolderContext) {
                    renderFolderContents(folderItem, pageIdx);
                }
            });
        } else if (typeof window.deleteApp === 'function') {
            window.deleteApp(appItem.appName).then(() => {
                syncHomePagesWithApps();
                if (activeFolderContext) {
                    renderFolderContents(folderItem, pageIdx);
                }
            });
        }
    }

    function setupFolderItemTouchDrag(cellEl, appItem, itemIdx, folderItem, pageIdx) {
        let startX = 0, startY = 0;
        let grabOffsetX = 0, grabOffsetY = 0;
        let isDragging = false;
        let holdTimer = null;
        let origRect = null;
        let isOutsideModal = false;
        let currentFolderDropIdx = itemIdx;
        let currentHomeDropIdx = -1;
        let edgePageTimer = null;
        let edgeCooldown = false;

        const startFolderDrag = (curX, curY) => {
            if (isDragging) return;
            isDragging = true;
            cellEl.dataset.wasDragged = 'true';

            cellEl.classList.add('is-dragging');
            if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) {}

            const zoom = getZoomFactor();
            const cellCSSWidth = origRect.width / zoom;
            const cellCSSHeight = origRect.height / zoom;

            cellEl.style.setProperty('position', 'fixed', 'important');
            cellEl.style.setProperty('width', `${cellCSSWidth}px`, 'important');
            cellEl.style.setProperty('height', `${cellCSSHeight}px`, 'important');
            cellEl.style.setProperty('left', '0px', 'important');
            cellEl.style.setProperty('top', '0px', 'important');
            cellEl.style.setProperty('z-index', '999999', 'important');

            updateFolderDragPos(curX, curY);
        };

        const updateFolderDragPos = (x, y) => {
            const zoom = getZoomFactor();
            const curCSSX = x / zoom;
            const curCSSY = y / zoom;
            const posX = curCSSX - grabOffsetX;
            const posY = curCSSY - grabOffsetY;
            cellEl.style.setProperty('transform', `translate3d(${posX}px, ${posY}px, 0) scale(1.08)`, 'important');
        };

        const onTouchStart = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.target.closest('.home-item-remove-btn')) return;
            if (e.touches.length !== 1) return;

            const zoom = getZoomFactor();
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;

            origRect = cellEl.getBoundingClientRect();
            const cellCSSLeft = origRect.left / zoom;
            const cellCSSTop = origRect.top / zoom;

            grabOffsetX = (startX / zoom) - cellCSSLeft;
            grabOffsetY = (startY / zoom) - cellCSSTop;

            isDragging = false;
            isOutsideModal = false;
            currentFolderDropIdx = itemIdx;

            clearTimeout(holdTimer);
            holdTimer = setTimeout(() => {
                if (!isDragging && document.body.classList.contains('home-edit-active')) {
                    startFolderDrag(startX, startY);
                }
            }, 180);
        };

        const onTouchMove = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.touches.length !== 1) return;

            const zoom = getZoomFactor();
            const t = e.touches[0];
            const dx = (t.clientX - startX) / zoom;
            const dy = (t.clientY - startY) / zoom;

            if (!isDragging && Math.hypot(dx, dy) > 8) {
                clearTimeout(holdTimer);
                startFolderDrag(t.clientX, t.clientY);
            }

            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            updateFolderDragPos(t.clientX, t.clientY);

            const curCSSX = t.clientX / zoom;
            const curCSSY = t.clientY / zoom;

            const overlay = document.getElementById('home-folder-overlay');
            const modal = document.getElementById('home-folder-modal');
            const modalRect = modal ? modal.getBoundingClientRect() : null;

            // Check if finger moved outside folder modal
            const isOutsideNow = modalRect ? (
                curCSSX < (modalRect.left / zoom) - 15 ||
                curCSSX > (modalRect.right / zoom) + 15 ||
                curCSSY < (modalRect.top / zoom) - 15 ||
                curCSSY > (modalRect.bottom / zoom) + 15
            ) : false;

            if (isOutsideNow) {
                if (!isOutsideModal) {
                    isOutsideModal = true;
                    if (overlay) {
                        overlay.style.opacity = '0';
                        overlay.style.pointerEvents = 'none';
                    }
                    if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) {}
                }

                // Edge page flipping while dragging outside
                const vp = document.getElementById('home-pages-viewport');
                const vpRect = vp ? vp.getBoundingClientRect() : { top: 60 * zoom, bottom: (window.innerHeight - 60) * zoom };
                const topEdge = (vpRect.top / zoom) + 75;
                const bottomEdge = (vpRect.bottom / zoom) - 75;

                if (curCSSY < topEdge && currentHomePageIndex > 0) {
                    if (!edgeCooldown && !edgePageTimer) {
                        edgePageTimer = setTimeout(() => {
                            if (isDragging && currentHomePageIndex > 0) {
                                edgeCooldown = true;
                                goToHomePage(currentHomePageIndex - 1);
                                if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
                                setTimeout(() => { edgeCooldown = false; }, 600);
                            }
                            edgePageTimer = null;
                        }, 380);
                    }
                } else if (curCSSY > bottomEdge) {
                    if (!edgeCooldown && !edgePageTimer) {
                        edgePageTimer = setTimeout(() => {
                            if (isDragging) {
                                edgeCooldown = true;
                                if (currentHomePageIndex < homePages.length - 1) {
                                    goToHomePage(currentHomePageIndex + 1);
                                    if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
                                } else {
                                    homePages.push([]);
                                    renderHomePages();
                                    goToHomePage(homePages.length - 1);
                                    if (navigator.vibrate) try { navigator.vibrate(35); } catch (err) {}
                                }
                                setTimeout(() => { edgeCooldown = false; }, 600);
                            }
                            edgePageTimer = null;
                        }, 380);
                    }
                } else {
                    if (edgePageTimer) {
                        clearTimeout(edgePageTimer);
                        edgePageTimer = null;
                    }
                }

                // Calculate drop slot on active home page
                const track = document.getElementById('home-pages-track');
                const activePageEl = track?.querySelector(`.home-page[data-page-index="${currentHomePageIndex}"]`);
                if (activePageEl) {
                    const cards = Array.from(activePageEl.querySelectorAll('.home-grid-item'));
                    let closest = 0;
                    let minDist = Infinity;
                    cards.forEach(card => {
                        const r = card.getBoundingClientRect();
                        const cx = (r.left + r.width / 2) / zoom;
                        const cy = (r.top + r.height / 2) / zoom;
                        const d = Math.hypot(cx - curCSSX, cy - curCSSY);
                        if (d < minDist) {
                            minDist = d;
                            closest = parseInt(card.dataset.itemIndex);
                        }
                    });

                    currentHomeDropIdx = cards.length === 0 ? 0 : closest;

                    // Real-time slot preview on home page
                    const tempOrder = [...(homePages[currentHomePageIndex] || [])];
                    tempOrder.splice(currentHomeDropIdx, 0, appItem);
                    const grid = window.currentHomeGrid || { cols: 6, rows: 5 };
                    const vpW = vp ? vp.clientWidth : (window.innerWidth / zoom >= 1200 ? 1200 : 800);
                    const vpH = vp ? vp.clientHeight : (window.innerHeight / zoom - 90);
                    const { layout } = computePageLayout(tempOrder, grid.cols, grid.rows, vpW, vpH);

                    cards.forEach(card => {
                        const targetObj = homePages[currentHomePageIndex]?.[parseInt(card.dataset.itemIndex)];
                        const newEntry = layout.find(entry => entry.item === targetObj);
                        if (newEntry && !newEntry.overflow) {
                            card.style.transform = `translate3d(${newEntry.x}px, ${newEntry.y}px, 0)`;
                        }
                    });
                }
            } else {
                // Inside modal
                if (isOutsideModal) {
                    isOutsideModal = false;
                    if (overlay) {
                        overlay.style.opacity = '1';
                        overlay.style.pointerEvents = 'auto';
                    }
                    if (edgePageTimer) {
                        clearTimeout(edgePageTimer);
                        edgePageTimer = null;
                    }
                    renderHomePages();
                }

                // Reorder within folder
                const gridEl = document.getElementById('home-folder-grid');
                if (gridEl) {
                    const cells = Array.from(gridEl.querySelectorAll('.folder-grid-cell')).filter(c => c !== cellEl);
                    let closestFolderIdx = itemIdx;
                    let minDist = Infinity;
                    cells.forEach(c => {
                        const r = c.getBoundingClientRect();
                        const cx = (r.left + r.width / 2) / zoom;
                        const cy = (r.top + r.height / 2) / zoom;
                        const d = Math.hypot(cx - curCSSX, cy - curCSSY);
                        if (d < minDist) {
                            minDist = d;
                            closestFolderIdx = parseInt(c.dataset.index);
                        }
                    });
                    if (closestFolderIdx !== currentFolderDropIdx && minDist < 90) {
                        currentFolderDropIdx = closestFolderIdx;
                        if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) {}
                    }
                }
            }
        };

        const onTouchEnd = () => {
            clearTimeout(holdTimer);
            if (edgePageTimer) {
                clearTimeout(edgePageTimer);
                edgePageTimer = null;
            }

            if (!isDragging) return;
            isDragging = false;

            cellEl.classList.remove('is-dragging');
            cellEl.style.removeProperty('position');
            cellEl.style.removeProperty('width');
            cellEl.style.removeProperty('height');
            cellEl.style.removeProperty('left');
            cellEl.style.removeProperty('top');
            cellEl.style.removeProperty('z-index');
            cellEl.style.removeProperty('transform');

            const overlay = document.getElementById('home-folder-overlay');
            if (overlay) {
                overlay.style.opacity = '';
                overlay.style.pointerEvents = '';
            }

            if (isOutsideModal) {
                // Dragged out of folder: Extract app onto home screen!
                const fromIdx = folderItem.items.indexOf(appItem);
                if (fromIdx !== -1) {
                    folderItem.items.splice(fromIdx, 1);
                }

                const targetPage = homePages[currentHomePageIndex] || [];
                const insertIdx = currentHomeDropIdx >= 0 ? Math.min(currentHomeDropIdx, targetPage.length) : targetPage.length;
                targetPage.splice(insertIdx, 0, { type: 'app', appName: appItem.appName });

                // If folder has 1 app remaining, dissolve it into that single app
                const homePageOfFolder = homePages[pageIdx];
                const folderIdx = homePageOfFolder ? homePageOfFolder.indexOf(folderItem) : -1;
                if (folderItem.items.length === 1 && folderIdx !== -1) {
                    homePageOfFolder.splice(folderIdx, 1, { type: 'app', appName: folderItem.items[0].appName });
                } else if (folderItem.items.length === 0 && folderIdx !== -1) {
                    homePageOfFolder.splice(folderIdx, 1);
                }

                closeFolder();
                reflowHomePages();
                saveHomePages();
                renderHomePages();
                if (navigator.vibrate) try { navigator.vibrate(35); } catch (err) {}
            } else {
                // Rearrange inside folder
                const fromIdx = folderItem.items.indexOf(appItem);
                if (fromIdx !== -1 && currentFolderDropIdx !== fromIdx && currentFolderDropIdx >= 0) {
                    const [moved] = folderItem.items.splice(fromIdx, 1);
                    folderItem.items.splice(currentFolderDropIdx, 0, moved);
                    saveHomePages();
                    renderHomePages();
                    if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) {}
                }
                renderFolderContents(folderItem, pageIdx);
            }
        };

        cellEl.addEventListener('touchstart', onTouchStart, { passive: true });
        cellEl.addEventListener('touchmove', onTouchMove, { passive: false });
        cellEl.addEventListener('touchend', onTouchEnd, { passive: true });
        cellEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
    }

    function closeFolder() {
        const overlay = document.getElementById('home-folder-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.style.opacity = '';
            overlay.style.pointerEvents = '';
            const titleInput = overlay.querySelector('#home-folder-title-input');
            if (titleInput && document.activeElement === titleInput) {
                titleInput.blur();
            }
        }

        if (activeFolderContext) {
            const { folderItem, pageIdx } = activeFolderContext;
            if (folderItem.items && folderItem.items.length === 1) {
                const page = homePages[pageIdx];
                const idx = page ? page.indexOf(folderItem) : -1;
                if (idx !== -1) {
                    page.splice(idx, 1, { type: 'app', appName: folderItem.items[0].appName });
                    reflowHomePages();
                    saveHomePages();
                    renderHomePages();
                }
            } else if (folderItem.items && folderItem.items.length === 0) {
                const page = homePages[pageIdx];
                const idx = page ? page.indexOf(folderItem) : -1;
                if (idx !== -1) {
                    page.splice(idx, 1);
                    reflowHomePages();
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

    // --- Track Transform (Exact 1-page step in pixels, strictly 1 full page per transition) ---
    function updateTrackTransform(immediate = false) {
        const track = document.getElementById('home-pages-track');
        const viewport = document.getElementById('home-pages-viewport');
        if (!track) return;

        const zoom = getZoomFactor();
        const pageH = viewport ? (viewport.clientHeight || (window.innerHeight / zoom - 90)) : (window.innerHeight / zoom - 90);
        const targetY = -currentHomePageIndex * pageH;

        if (immediate) {
            track.style.transition = 'none';
        } else {
            track.style.transition = 'transform 0.42s cubic-bezier(0.2, 1.15, 0.4, 1)';
        }

        track.style.transform = `translate3d(0, ${targetY}px, 0)`;

        const dots = document.querySelectorAll('.home-page-dot');
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === currentHomePageIndex);
        });
    }

    // --- Page Navigation Functions ---
    function goToHomePage(index, immediate = false) {
        if (index < 0) index = 0;
        if (index >= homePages.length) index = homePages.length - 1;
        currentHomePageIndex = index;
        window.currentHomePageIndex = currentHomePageIndex;
        updateTrackTransform(immediate);
    }

    function nextHomePage() {
        if (currentHomePageIndex < homePages.length - 1) {
            goToHomePage(currentHomePageIndex + 1);
        } else {
            updateTrackTransform();
        }
    }

    function prevHomePage() {
        if (currentHomePageIndex > 0) {
            goToHomePage(currentHomePageIndex - 1);
        } else {
            updateTrackTransform();
        }
    }

    function scrollHomePage(direction) {
        const now = Date.now();
        if (now - lastScrollTime < 380) return;
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
        reflowHomePages();
        saveHomePages();
        renderHomePages();
        if (typeof showPopup === 'function') {
            showPopup(window.t('ADDED_TO_HOME'));
        }
    }

    function removeHomeItem(pageIndex, itemIndex) {
        if (homePages[pageIndex] && homePages[pageIndex][itemIndex]) {
            const item = homePages[pageIndex][itemIndex];
            if (item.type === 'folder' && Array.isArray(item.items)) {
                // Dissolve folder: unpack all contained apps back onto the home screen
                homePages[pageIndex].splice(itemIndex, 1, ...item.items);
            } else if (item.type === 'app') {
                if (typeof deleteApp === 'function') {
                    deleteApp(item.appName).then(() => {
                        syncHomePagesWithApps();
                    });
                } else if (typeof window.deleteApp === 'function') {
                    window.deleteApp(item.appName).then(() => {
                        syncHomePagesWithApps();
                    });
                }
                return;
            } else {
                homePages[pageIndex].splice(itemIndex, 1);
            }
            reflowHomePages();
            saveHomePages();
            renderHomePages();
            if (navigator.vibrate) try { navigator.vibrate(30); } catch (err) {}
        }
    }

    function toggleHomeEditMode(forceState = null) {
        const isEditing = forceState !== null
            ? forceState
            : !document.body.classList.contains('home-edit-active');

        document.body.classList.toggle('home-edit-active', isEditing);

        // If a folder is open, re-render its contents to show/hide edit buttons and jiggle
        if (activeFolderContext) {
            renderFolderContents(activeFolderContext.folderItem, activeFolderContext.pageIdx);
        }
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

    // --- Touch Gesture Handling on Home Container & Cards Deck Integration ---
    function setupHomeContainerGestures() {
        const container = document.getElementById('minihompy-container');
        const viewport = document.getElementById('home-pages-viewport');
        const track = document.getElementById('home-pages-track');
        if (!container) return;

        let startX = 0, startY = 0;
        let startTime = 0;
        let isTouching = false;
        let isVerticalSwipe = false;
        let isHorizontalSwipe = false;
        let hasDecidedDirection = false;
        let startTranslateY = 0;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            if (document.body.classList.contains('home-edit-active') || document.body.classList.contains('edit-mode-active')) {
                return;
            }

            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            startTime = Date.now();
            isTouching = true;
            isVerticalSwipe = false;
            isHorizontalSwipe = false;
            hasDecidedDirection = false;

            const zoom = getZoomFactor();
            const pageH = viewport ? (viewport.clientHeight || (window.innerHeight / zoom - 90)) : (window.innerHeight / zoom - 90);
            startTranslateY = -currentHomePageIndex * pageH;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isTouching || e.touches.length !== 1) return;
            if (document.body.classList.contains('home-edit-active') || document.body.classList.contains('edit-mode-active')) {
                return;
            }

            const zoom = getZoomFactor();
            const t = e.touches[0];
            const deltaX = (t.clientX - startX) / zoom;
            const deltaY = (t.clientY - startY) / zoom;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (!hasDecidedDirection) {
                if (absX < 8 && absY < 8) return;
                hasDecidedDirection = true;
                if (absY >= absX) {
                    isVerticalSwipe = true;
                } else {
                    isHorizontalSwipe = true;
                }
            }

            if (isVerticalSwipe) {
                if (e.cancelable) e.preventDefault();
                const pageH = viewport ? (viewport.clientHeight || (window.innerHeight / zoom - 90)) : (window.innerHeight / zoom - 90);

                // Damping at boundaries
                let dampedDeltaY = deltaY;
                if (currentHomePageIndex === 0 && deltaY > 0) {
                    dampedDeltaY = deltaY * 0.35;
                } else if (currentHomePageIndex === homePages.length - 1 && deltaY < 0) {
                    dampedDeltaY = deltaY * 0.35;
                }

                if (track) {
                    track.style.transition = 'none';
                    track.style.transform = `translate3d(0, ${startTranslateY + dampedDeltaY}px, 0)`;
                }
            }
        }, { passive: false });

        container.addEventListener('touchend', (e) => {
            if (!isTouching) return;
            isTouching = false;

            if (document.body.classList.contains('home-edit-active') || document.body.classList.contains('edit-mode-active')) {
                return;
            }

            const endTouch = e.changedTouches ? e.changedTouches[0] : null;
            if (!endTouch) {
                updateTrackTransform();
                return;
            }

            const zoom = getZoomFactor();
            const deltaX = (endTouch.clientX - startX) / zoom;
            const deltaY = (endTouch.clientY - startY) / zoom;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            const elapsed = Math.max(1, Date.now() - startTime);
            const velocityY = deltaY / elapsed;

            const pageH = viewport ? (viewport.clientHeight || (window.innerHeight / zoom - 90)) : (window.innerHeight / zoom - 90);

            // Tap threshold: taps NEVER activate swipe actions
            if (absX < 20 && absY < 20) {
                updateTrackTransform();
                return;
            }

            if (isVerticalSwipe || (!hasDecidedDirection && absY >= 40 && absY > absX)) {
                // Minimum drag distance or velocity flick to advance page
                const swipeThreshold = Math.max(50, pageH * 0.16);
                const isFlickUp = velocityY < -0.38;
                const isFlickDown = velocityY > 0.38;

                if (deltaY < -swipeThreshold || isFlickUp) {
                    // Swiped UP -> Advance to NEXT page
                    if (currentHomePageIndex < homePages.length - 1) {
                        goToHomePage(currentHomePageIndex + 1);
                    } else {
                        updateTrackTransform();
                    }
                } else if (deltaY > swipeThreshold || isFlickDown) {
                    // Swiped DOWN -> Go to PREVIOUS page or beginnings
                    if (currentHomePageIndex > 0) {
                        goToHomePage(currentHomePageIndex - 1);
                    } else {
                        enterBeginningsState();
                        updateTrackTransform();
                    }
                } else {
                    // Snap back to current page
                    updateTrackTransform();
                }
            } else if (isHorizontalSwipe || (!hasDecidedDirection && absX >= 45 && absX > absY * 1.15)) {
                updateTrackTransform();

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
            } else {
                updateTrackTransform();
            }
        }, { passive: true });

        container.addEventListener('touchcancel', () => {
            isTouching = false;
            updateTrackTransform();
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

    function setupHomeSearchBtn() {
        const searchBtn = document.getElementById('home-search-btn');
        if (searchBtn && !searchBtn.dataset.bound) {
            searchBtn.dataset.bound = 'true';
            searchBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // If assistant is available, trigger assistant text input / search
                if (window.assistantCore && typeof window.assistantCore.open === 'function') {
                    window.assistantCore.open();
                    if (window.assistantCore.ui && typeof window.assistantCore.ui.showInput === 'function') {
                        window.assistantCore.ui.showInput(true);
                    }
                } else if (typeof openSearch === 'function') {
                    openSearch();
                } else {
                    const searchInput = document.getElementById('app-search-input');
                    if (searchInput) searchInput.focus();
                }
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
        setupHomeSearchBtn();
        startRealTimeSync();

        let gridResizeTimer = null;
        const handleResize = () => {
            clearTimeout(gridResizeTimer);
            gridResizeTimer = setTimeout(() => {
                autoAdaptGridSize();
                reflowHomePages();
                renderHomePages();
            }, 80);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 100);
        });

        const vpEl = document.getElementById('home-pages-viewport');
        if (vpEl && typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                handleResize();
            });
            ro.observe(vpEl);
        }

        // Boot into Beginnings (idle start state)
        enterBeginningsState();

        // Listen for installed/uninstalled apps changes
        window.addEventListener('polygol-apps-changed', () => {
            if (typeof window.loadUserInstalledApps === 'function') {
                window.loadUserInstalledApps();
            }
            syncHomePagesWithApps();
        });
        window.addEventListener('storage', (e) => {
            if (e.key === 'userInstalledApps' || e.key === 'userInstalledAppsInfo') {
                if (typeof window.loadUserInstalledApps === 'function') {
                    window.loadUserInstalledApps();
                }
                syncHomePagesWithApps();
            }
        });
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
    window.reflowHomePages = reflowHomePages;
    window.syncHomePagesWithApps = syncHomePagesWithApps;
    window.pruneUninstalledApps = pruneUninstalledApps;
    window.openFolder = openFolder;
    window.closeFolder = closeFolder;
    window.setHomeGridSize = (name) => {
        if (STANDARD_GRIDS[name]) {
            applyGridSize(name);
            reflowHomePages();
            renderHomePages();
            return true;
        }
        return false;
    };
    window.STANDARD_GRIDS = STANDARD_GRIDS;
    window.currentHomePageIndex = currentHomePageIndex;
    window.getZoomFactor = getZoomFactor;
})();
