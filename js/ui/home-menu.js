/**
 * Astatine 27.1 - iOS-Style Widget & App Home Menu Grid & Beginnings State Manager
 * Abolishes app drawer metaphors, placing apps and quick widgets directly on paginated home pages.
 */

(function () {
    let currentHomePageIndex = 0;
    let homePages = [];
    let lastScrollTime = 0;
    let motionWakeAttached = false;

    // Default home pages structure:
    // Page 0: System Media Widget (from availableWidgets), Weather Widget (from home screen), and core apps
    const DEFAULT_PAGES = [
        [
            { type: 'widget', appName: 'System', widgetId: 'system-media', size: 'small' },
            { type: 'widget-weather', size: 'small' },
            { type: 'app', appName: 'Internet' },
            { type: 'app', appName: 'Files' },
            { type: 'app', appName: 'kirbStore' },
            { type: 'app', appName: 'Settings' },
            { type: 'app', appName: 'Assistant' },
            { type: 'app', appName: 'Feedback' }
        ],
        []
    ];

    // --- Standard Grid Auto-Adaptation Presets (6x5, 4x6, 8x12, etc.) ---
    const STANDARD_GRIDS = {
        '4x6': { cols: 4, rows: 6, maxW: 480, maxH: 720, rowH: 92 },
        '6x5': { cols: 6, rows: 5, maxW: 840, maxH: 640, rowH: 90 },
        '8x12': { cols: 8, rows: 12, maxW: 1200, maxH: 88, rowH: 86 },
        '8x6': { cols: 8, rows: 6, maxW: 1200, maxH: 680, rowH: 88 },
        '4x5': { cols: 4, rows: 5, maxW: 460, maxH: 560, rowH: 84 },
        '6x6': { cols: 6, rows: 6, maxW: 820, maxH: 760, rowH: 88 }
    };

    function detectOptimalGridSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isPortrait = h > w;

        // 1. Large Displays / Desktop / Ultrawide / 4K (w >= 1150px)
        if (w >= 1150) {
            if (h >= 850) {
                return '8x12'; // Standard large desktop display
            } else if (h >= 620) {
                return '8x12'; // Standard widescreen 8x12 with smooth vertical scrolling
            } else {
                return '8x6';  // Shorter widescreen
            }
        }

        // 2. Medium Displays / Tablets / Landscape (600px <= w < 1150px, or landscape w >= 550px)
        if (w >= 600 || (!isPortrait && w >= 550)) {
            if (!isPortrait || w >= 740) {
                return '6x5'; // Standard tablet / landscape grid
            } else {
                return h >= 800 ? '6x6' : '4x6'; // Tablet portrait
            }
        }

        // 3. Compact / Mobile Screens (w < 600px)
        if (h >= 640) {
            return '4x6'; // Standard phone portrait grid
        } else {
            return '4x5'; // Compact short phone grid
        }
    }

    function applyGridSize(gridName) {
        const config = STANDARD_GRIDS[gridName] || STANDARD_GRIDS['4x6'];
        const container = document.getElementById('home-menu-container');
        if (container) {
            container.dataset.grid = gridName;
            container.style.setProperty('--home-grid-cols', config.cols);
            container.style.setProperty('--home-grid-rows', config.rows);
            container.style.setProperty('--home-viewport-max-width', `${config.maxW}px`);
            if (gridName === '8x12') {
                container.style.setProperty('--home-viewport-max-height', '88vh');
            } else {
                container.style.setProperty('--home-viewport-max-height', `${config.maxH}px`);
            }
            container.style.setProperty('--home-grid-row-height', `${config.rowH}px`);
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

    // --- State Persistence ---
    function loadHomePages() {
        try {
            const saved = localStorage.getItem('astatine_home_pages');
            if (saved) {
                homePages = JSON.parse(saved);
            } else {
                homePages = JSON.parse(JSON.stringify(DEFAULT_PAGES));
            }
        } catch (e) {
            console.error('[HomeMenu] Error loading pages:', e);
            homePages = JSON.parse(JSON.stringify(DEFAULT_PAGES));
        }

        // Auto-discover all installed apps to ensure grandmothers and fathers never lose an app
        ensureAllAppsPresent();
    }

    function saveHomePages() {
        try {
            localStorage.setItem('astatine_home_pages', JSON.stringify(homePages));
        } catch (e) {
            console.error('[HomeMenu] Error saving pages:', e);
        }
    }

    function ensureAllAppsPresent() {
        if (typeof apps === 'undefined') return;

        const allInstalledNames = Object.keys(apps).filter(name => name.toLowerCase() !== 'apps');
        const presentNames = new Set();

        homePages.forEach(page => {
            page.forEach(item => {
                if (item.type === 'app' && item.appName) {
                    presentNames.add(item.appName);
                }
            });
        });

        const missing = allInstalledNames.filter(name => !presentNames.has(name));
        if (missing.length > 0) {
            const grid = window.currentHomeGrid || { cols: 4, rows: 6 };
            const pageCapacity = Math.max(16, (grid.cols * grid.rows) - 6);
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
    function enterBeginningsState() {
        document.body.classList.add('beginnings-active');
        document.body.classList.remove('home-screen-active', 'home-edit-active');

        // Motion detection ("Look at display") wakes to Home Screen
        attachMotionWakeListener();
    }

    function isWallpaperEditingActive() {
        return document.body.classList.contains('edit-mode-active') ||
            document.getElementById('wallpaper-switcher-overlay')?.classList.contains('show') ||
            document.getElementById('wallpaper-picker-drawer')?.classList.contains('open') ||
            document.getElementById('edit-mode-ui')?.style.display === 'block';
    }

    function exitBeginningsState() {
        if (!document.body.classList.contains('beginnings-active')) return;
        if (isWallpaperEditingActive()) return; // Prevent home screen from being opened when editing wallpaper

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
        if (isWallpaperEditingActive()) return; // Prevent home screen from being opened when editing wallpaper
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
            if (isWallpaperEditingActive()) return; // Do not wake if editing wallpaper

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

    // --- App Icon Resolution ---
    function resolveAppInfo(appName) {
        if (typeof apps !== 'undefined' && apps[appName]) {
            const data = apps[appName];
            let iconSrc = data.icon;
            if (iconSrc && (iconSrc.startsWith('http') || iconSrc.startsWith('/') || iconSrc.startsWith('data:'))) {
                // Keep as is
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

    function updateGridUnitSize() {
        const viewport = document.getElementById('home-pages-viewport');
        if (!viewport) return;
        const vpWidth = viewport.clientWidth || viewport.offsetWidth || 400;
        const grid = window.currentHomeGrid || { cols: 4, rows: 6 };
        const cols = grid.cols;
        const gap = 16;
        const padding = 16;
        const availableWidth = vpWidth - padding - (cols - 1) * gap;
        const unitSize = Math.max(50, Math.floor(availableWidth / cols));

        const container = document.getElementById('home-menu-container');
        if (container) {
            container.style.setProperty('--home-grid-unit-size', `${unitSize}px`);
            container.style.setProperty('--home-grid-gap', `${gap}px`);
        }
    }

    // --- Rendering Home Menu Grid ---
    function renderHomePages() {
        updateGridUnitSize();

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

        homePages.forEach((pageItems, pageIdx) => {
            const pageEl = document.createElement('div');
            pageEl.className = 'home-page';
            pageEl.dataset.pageIndex = pageIdx;

            pageItems.forEach((item, itemIdx) => {
                const itemEl = createGridItemElement(item, pageIdx, itemIdx);
                if (itemEl) pageEl.appendChild(itemEl);
            });

            track.appendChild(pageEl);
        });

        renderPageIndicators();
        updateTrackTransform();
    }

    function createGridItemElement(item, pageIdx, itemIdx) {
        // App Shortcut: MUST use user's CSS classes (<div class="app-icon"><div class="app-icon-img"><img ...></div><span>...</span></div>)
        if (item.type === 'app') {
            const info = resolveAppInfo(item.appName);

            const appIcon = document.createElement('div');
            appIcon.className = 'app-icon';
            appIcon.dataset.app = item.appName;
            appIcon.dataset.pageIndex = pageIdx;
            appIcon.dataset.itemIndex = itemIdx;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'home-item-remove-btn';
            removeBtn.innerHTML = '✕';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeHomeItem(pageIdx, itemIdx);
            });
            appIcon.appendChild(removeBtn);

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

            appIcon.addEventListener('click', (e) => {
                if (document.body.classList.contains('home-edit-active')) return;
                e.preventDefault();
                e.stopPropagation();
                if (typeof createFullscreenEmbed === 'function') {
                    createFullscreenEmbed(info.url);
                }
            });

            setupItemLongPress(appIcon);
            setupItemDragAndDrop(appIcon, pageIdx, itemIdx, item);
            return appIcon;
        }

        // Home Screen Weather Widget (from existing home screen weather component)
        if (item.type === 'widget-weather') {
            const instance = document.createElement('div');
            instance.className = 'widget-instance weather-widget-instance';
            const size = item.size || 'small';
            instance.dataset.size = size;
            instance.classList.add(size === 'large' ? 'size-large' : (size === 'medium' ? 'size-medium' : 'size-small'));
            instance.dataset.pageIndex = pageIdx;
            instance.dataset.itemIndex = itemIdx;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'home-item-remove-btn';
            removeBtn.innerHTML = '✕';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeHomeItem(pageIdx, itemIdx);
            });
            instance.appendChild(removeBtn);

            const resizeBtn = document.createElement('button');
            resizeBtn.className = 'home-item-resize-btn';
            resizeBtn.innerHTML = '<span class="material-symbols-rounded">aspect_ratio</span>';
            resizeBtn.title = 'Resize Widget';
            resizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cycleWidgetSize(pageIdx, itemIdx);
            });
            instance.appendChild(resizeBtn);

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'home-widget-resize-handle';
            resizeHandle.title = 'Drag to Resize';
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

        // Widgets from Polygol's Widget API (availableWidgets / registerWidget)
        if (item.type === 'widget') {
            const widgetDef = (typeof availableWidgets !== 'undefined')
                ? availableWidgets[item.appName]?.find(w => w.widgetId === item.widgetId)
                : null;

            if (!widgetDef) return null;

            const instance = document.createElement('div');
            instance.className = 'widget-instance';
            const size = item.size || 'small';
            instance.dataset.size = size;
            instance.classList.add(size === 'large' ? 'size-large' : (size === 'medium' ? 'size-medium' : 'size-small'));
            instance.dataset.widgetId = item.widgetId;
            instance.dataset.appName = item.appName;
            instance.dataset.pageIndex = pageIdx;
            instance.dataset.itemIndex = itemIdx;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'home-item-remove-btn';
            removeBtn.innerHTML = '✕';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeHomeItem(pageIdx, itemIdx);
            });
            instance.appendChild(removeBtn);

            const resizeBtn = document.createElement('button');
            resizeBtn.className = 'home-item-resize-btn';
            resizeBtn.innerHTML = '<span class="material-symbols-rounded">aspect_ratio</span>';
            resizeBtn.title = 'Resize Widget';
            resizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cycleWidgetSize(pageIdx, itemIdx);
            });
            instance.appendChild(resizeBtn);

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'home-widget-resize-handle';
            resizeHandle.title = 'Drag to Resize';
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

        return null;
    }

    // --- iPadOS Widget Resize Functionality ---
    function cycleWidgetSize(pageIdx, itemIdx) {
        if (!homePages[pageIdx] || !homePages[pageIdx][itemIdx]) return;
        const item = homePages[pageIdx][itemIdx];
        const currentSize = item.size || 'small';
        let nextSize = 'small';
        if (currentSize === 'small') {
            nextSize = 'medium';
        } else if (currentSize === 'medium') {
            nextSize = 'large';
        } else {
            nextSize = 'small';
        }
        item.size = nextSize;
        saveHomePages();
        renderHomePages();
        if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
    }

    function setupWidgetResizeHandle(handle, instance, pageIdx, itemIdx) {
        let startX = 0, startY = 0;
        let isResizing = false;

        const onTouchStart = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.touches.length !== 1) return;
            e.stopPropagation();
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isResizing = true;
        };

        const onTouchMove = (e) => {
            if (!isResizing || e.touches.length !== 1) return;
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;

            if (dx > 40 || dy > 40) {
                instance.style.transform = 'scale(1.04)';
            } else if (dx < -40 || dy < -40) {
                instance.style.transform = 'scale(0.96)';
            } else {
                instance.style.transform = '';
            }
        };

        const onTouchEnd = (e) => {
            if (!isResizing) return;
            isResizing = false;
            instance.style.transform = '';
            e.stopPropagation();

            const endTouch = e.changedTouches ? e.changedTouches[0] : null;
            const dx = endTouch ? endTouch.clientX - startX : 0;
            const dy = endTouch ? endTouch.clientY - startY : 0;

            const item = homePages[pageIdx]?.[itemIdx];
            if (!item) return;

            const currentSize = item.size || 'small';
            let targetSize = currentSize;

            if (dx > 40 || dy > 40) {
                if (currentSize === 'small') targetSize = 'medium';
                else if (currentSize === 'medium') targetSize = 'large';
            } else if (dx < -40 || dy < -40) {
                if (currentSize === 'large') targetSize = 'medium';
                else if (currentSize === 'medium') targetSize = 'small';
            }

            if (targetSize !== currentSize) {
                item.size = targetSize;
                saveHomePages();
                renderHomePages();
                if (navigator.vibrate) try { navigator.vibrate(35); } catch (err) {}
            }
        };

        handle.addEventListener('touchstart', onTouchStart, { passive: false });
        handle.addEventListener('touchmove', onTouchMove, { passive: false });
        handle.addEventListener('touchend', onTouchEnd, { passive: false });
        handle.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }

    // --- iPadOS Drag & Drop Rearranging (Touch-First & Fluid) ---
    function setupItemDragAndDrop(itemEl, pageIdx, itemIdx, itemObj) {
        let startX = 0, startY = 0;
        let isDragging = false;
        let placeholder = null;
        let currentDropTargetIdx = itemIdx;
        let slotCache = [];

        function measureSlots() {
            const pageEl = itemEl.parentNode;
            if (!pageEl) return [];
            const cards = Array.from(pageEl.querySelectorAll('.app-icon, .widget-instance'));
            return cards.map((card, idx) => {
                const rect = card.getBoundingClientRect();
                return {
                    element: card,
                    index: idx,
                    cx: rect.left + rect.width / 2,
                    cy: rect.top + rect.height / 2
                };
            });
        }

        const onTouchStart = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.target.closest('.home-item-remove-btn') || e.target.closest('.home-item-resize-btn') || e.target.closest('.home-widget-resize-handle')) {
                return;
            }
            if (e.touches.length !== 1) return;

            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            isDragging = false;
            currentDropTargetIdx = itemIdx;
        };

        const onTouchMove = (e) => {
            if (!document.body.classList.contains('home-edit-active')) return;
            if (e.touches.length !== 1) return;

            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const dist = Math.hypot(dx, dy);

            // Drag Threshold: must move at least 10px to initiate rearranging
            if (!isDragging && dist > 10) {
                isDragging = true;
                itemEl.classList.add('is-dragging');

                placeholder = document.createElement('div');
                placeholder.className = 'home-grid-placeholder';
                if (itemEl.classList.contains('size-small')) placeholder.classList.add('size-small');
                else if (itemEl.classList.contains('size-medium')) placeholder.classList.add('size-medium');
                else if (itemEl.classList.contains('size-large')) placeholder.classList.add('size-large');

                itemEl.parentNode.insertBefore(placeholder, itemEl.nextSibling);
                slotCache = measureSlots();
                if (navigator.vibrate) try { navigator.vibrate(25); } catch (err) {}
            }

            if (isDragging) {
                if (e.cancelable) e.preventDefault();
                itemEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;

                // Compute closest slot mathematically with zero reflow thrashing
                let closestSlot = null;
                let minDist = Infinity;

                for (let i = 0; i < slotCache.length; i++) {
                    const slot = slotCache[i];
                    const d = Math.hypot(slot.cx - t.clientX, slot.cy - t.clientY);
                    if (d < minDist) {
                        minDist = d;
                        closestSlot = slot;
                    }
                }

                if (closestSlot && closestSlot.index !== currentDropTargetIdx && minDist < 120) {
                    currentDropTargetIdx = closestSlot.index;
                    const pageEl = itemEl.parentNode;
                    if (pageEl && placeholder) {
                        const allChildren = Array.from(pageEl.children);
                        const placeholderPos = allChildren.indexOf(placeholder);
                        const targetPos = allChildren.indexOf(closestSlot.element);

                        if (targetPos > placeholderPos) {
                            closestSlot.element.after(placeholder);
                        } else {
                            closestSlot.element.before(placeholder);
                        }
                        slotCache = measureSlots();
                        if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) {}
                    }
                }
            }
        };

        const onTouchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            itemEl.classList.remove('is-dragging');
            itemEl.style.transform = '';

            if (placeholder && placeholder.parentNode) {
                placeholder.remove();
            }

            if (homePages[pageIdx]) {
                const page = homePages[pageIdx];
                const fromIdx = itemObj ? page.indexOf(itemObj) : itemIdx;
                const actualFrom = fromIdx !== -1 ? fromIdx : itemIdx;

                if (actualFrom !== currentDropTargetIdx && currentDropTargetIdx >= 0 && currentDropTargetIdx < page.length) {
                    const [movedItem] = page.splice(actualFrom, 1);
                    if (movedItem) {
                        page.splice(currentDropTargetIdx, 0, movedItem);
                        saveHomePages();
                        renderHomePages();
                        if (navigator.vibrate) try { navigator.vibrate(35); } catch (err) {}
                        return;
                    }
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

    // --- Page Dots Indicators ---
    function renderPageIndicators() {
        const indicators = document.getElementById('home-page-indicators');
        if (!indicators) return;
        indicators.innerHTML = '';

        homePages.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.className = 'home-page-dot' + (idx === currentHomePageIndex ? ' active' : '');
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

    // UP / DOWN swipes strictly scroll home screen pages
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

    // --- Gesture Handling on Home Container ---
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
            // LEFT/RIGHT: App Switching ALWAYS (Astatine 27.1 fast app switching)
            else if (absX >= 45 && absX > absY * 1.15) {
                if (deltaX < 0) {
                    if (typeof window.switchToNextApp === 'function') window.switchToNextApp();
                } else {
                    if (typeof window.switchToPrevApp === 'function') window.switchToPrevApp();
                }
            }
        }, { passive: true });

        // Tap on empty space dismisses edit mode
        container.addEventListener('click', (e) => {
            if (document.body.classList.contains('home-edit-active')) {
                if (!e.target.closest('.home-item-remove-btn') && !e.target.closest('.app-icon') && !e.target.closest('.widget-instance')) {
                    toggleHomeEditMode(false);
                }
            }
        });
    }

    // --- iPadOS Edit Mode Header Controls ---
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

        // Auto-adapt grid listeners on screen resize and orientation change
        let gridResizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(gridResizeTimer);
            gridResizeTimer = setTimeout(() => {
                autoAdaptGridSize();
                updateGridUnitSize();
            }, 100);
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                autoAdaptGridSize();
                updateGridUnitSize();
            }, 150);
        });

        // Boot into Beginnings (idle start state)
        enterBeginningsState();
    }

    // Export to global scope
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
    window.setHomeGridSize = (name) => {
        if (STANDARD_GRIDS[name]) {
            applyGridSize(name);
            return true;
        }
        return false;
    };
    window.STANDARD_GRIDS = STANDARD_GRIDS;
    window.currentHomePageIndex = currentHomePageIndex;
})();
