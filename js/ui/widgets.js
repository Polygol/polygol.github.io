let lastWidgetTapTime = 0; // To debounce taps on widgets
let availableWidgets; // Stores info about all possible widgets from apps
let activeWidgets; // Stores the user's current layout
const MARGIN = 20;

function registerWidget(widgetData) {
    if (!availableWidgets[widgetData.appName]) {
        availableWidgets[widgetData.appName] = [];
    }
    // Only add it if it's not already registered
    if (!availableWidgets[widgetData.appName].some(w => w.widgetId === widgetData.widgetId)) {
        availableWidgets[widgetData.appName].push(widgetData);
        saveAvailableWidgets(); // Save the updated list
    }
}

function saveAvailableWidgets() {
    localStorage.setItem('availableWidgets', JSON.stringify(availableWidgets));
}

function loadAvailableWidgets() {
    const saved = localStorage.getItem('availableWidgets');
    availableWidgets = saved ? JSON.parse(saved) : {};

    // Define and register built-in system widgets
    const systemWidgets = {
        'System': [
            {
                appName: 'System',
                widgetId: 'system-media',
                title: 'Now Playing',
                url: '/assets/system-widgets/media-widget.html',
                defaultSize: [1, 1],
                openUrl: '#open-last-media-app' // Special action handled by the dashboard
            }
        ]
    };

    // Merge system widgets with widgets from apps
    availableWidgets = { ...availableWidgets, ...systemWidgets };
}

function adjustWidgetsForViewportResize() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    let hasChanges = false;

    activeWidgets.forEach(widget => {
        // Calculate the maximum allowed x and y coordinates for this widget
        const maxX = windowW - widget.w - MARGIN;
        const maxY = windowH - widget.h - MARGIN;

        // Store original position
        const originalX = widget.x;
        const originalY = widget.y;

        // Clamp the widget's position to be within the viewport boundaries
        // This ensures it never goes off the left/top or right/bottom edges.
        widget.x = Math.max(MARGIN, Math.min(widget.x, maxX));
        widget.y = Math.max(MARGIN, Math.min(widget.y, maxY));

        // Check if the position was changed
        if (widget.x !== originalX || widget.y !== originalY) {
            hasChanges = true;
        }
    });

    // If any widget positions were updated, save the changes
    if (hasChanges) {
        saveWidgets();
    }
}

function handleViewportResize() {
    const smartZoomPref = localStorage.getItem('smartDisplayZoom');
    if (smartZoomPref === 'true' || smartZoomPref === null) {
        const smartScale = calculateSmartZoom();
        document.body.style.zoom = `${smartScale}%`;
    }
    adjustWidgetsForViewportResize(); // First, fix the data
    renderWidgets();                  // Then, re-render with the corrected data
}

function saveWidgets() {
    // This function now saves the current widget layout.
    // It saves to the active wallpaper object if one exists, otherwise saves to a default localStorage key.
    (async () => {
        if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0) {
            const currentWallpaper = recentWallpapers[currentWallpaperPosition];
            if (!currentWallpaper) return;

            // Update the layout in the main recentWallpapers array
            currentWallpaper.widgetLayout = activeWidgets;

            // Save the entire updated array back to localStorage
            saveRecentWallpapers();

            // Also update the corresponding record in IndexedDB for persistence
            if (currentWallpaper.id) { // Slideshows don't have individual IDs here
                try {
                    const wallpaperRecord = await getWallpaper(currentWallpaper.id);
                    if (wallpaperRecord) {
                        wallpaperRecord.widgetLayout = activeWidgets;
                        await storeWallpaper(currentWallpaper.id, wallpaperRecord);
                    }
                } catch (error) {
                    console.error("Failed to save widget layout to IndexedDB:", error);
                }
            }
        } else {
            // No wallpaper, save to a default key in localStorage
            localStorage.setItem('defaultWidgetLayout', JSON.stringify(activeWidgets));
        }
    })();
}

function loadWidgets() {
    // This function now loads the widget layout from the current wallpaper, or a default if no wallpaper exists.
    if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0 && recentWallpapers[currentWallpaperPosition]) {
        activeWidgets = recentWallpapers[currentWallpaperPosition].widgetLayout || [];
    } else {
        // No wallpaper, load from the default key in localStorage
        const defaultLayout = localStorage.getItem('defaultWidgetLayout');
        activeWidgets = defaultLayout ? JSON.parse(defaultLayout) : [];
    }
    renderWidgets();
}

function addWidget(widgetData, isTransparent = false) {
    const baseUnit = 200; // The size of a 1x1 widget block
    const gridW = widgetData.defaultSize ? widgetData.defaultSize[0] : 1;
    const gridH = widgetData.defaultSize ? widgetData.defaultSize[1] : 1;
	
    const defaultWidth = (gridW * baseUnit) + ((gridW - 1) * MARGIN);
    const defaultHeight = (gridH * baseUnit) + ((gridH - 1) * MARGIN);
	
    activeWidgets.push({
        widgetId: widgetData.widgetId,
        appName: widgetData.appName,
        w: defaultWidth,
        h: defaultHeight,
        x: 10,
        y: 80,
        transparent: isTransparent // Save transparency state
    });
    renderWidgets();
    saveWidgets();
}

async function removeWidget(index) {
    if (await showCustomConfirm('Remove this widget?')) {
        activeWidgets.splice(index, 1);
        
		// CLEANUP: Free base64 string from memory and Swap cache
        if (window.widgetSnapshotCache && window.widgetSnapshotCache[index]) {
            delete window.widgetSnapshotCache[index];
        }
        if (typeof SwapManager !== 'undefined') {
            SwapManager.remove('widget_snap_' + index);
        }
        
        renderWidgets();
        saveWidgets();
    }
}

function renderWidgets() {
    const gridContainer = document.getElementById('widget-grid');
    if (!gridContainer) return;
    const gridRect = gridContainer.getBoundingClientRect(); // CAPTURE THE GRID'S OFFSET
    gridContainer.innerHTML = '';

    const SNAP_DISTANCE = 15;
    const widgetElements = new Map();

    // 1. Create and position all widget elements from the activeWidgets array
    activeWidgets.forEach((widget, index) => {
        const instance = document.createElement('div');
        instance.className = 'widget-instance';
        instance.dataset.widgetIndex = index;
        instance.style.width = `${widget.w}px`;
        instance.style.height = `${widget.h}px`;
        instance.style.left = `${widget.x}px`;
        instance.style.top = `${widget.y}px`;

		// Apply transparency styles if flag is set
        if (widget.transparent) {
            instance.style.background = 'transparent';
            instance.style.border = 'none';
            instance.style.backdropFilter = 'none';
            instance.style.boxShadow = 'none';
        }

		if (widget.type === 'sticker') {
            // --- STICKER WIDGET LOGIC ---
            instance.classList.add('sticker-widget');
            
            const img = document.createElement('img');
            img.src = widget.src;
            img.className = 'sticker-content';
            
            // Apply border styles if enabled for this sticker
            if (widget.border) {
                img.classList.add('has-border');
                img.style.setProperty('--border-color', widget.borderColor);
                img.style.setProperty('--border-width', `${widget.borderWidth}px`);
            }

			if (widget.transparent) {
                instance.style.overflow = 'visible';
            }
            
            instance.appendChild(img);

        } else {
            // --- STANDARD APP WIDGET LOGIC ---
            // Look up the widget definition ONLY for non-sticker widgets.
            const widgetDef = availableWidgets[widget.appName]?.find(w => w.widgetId === widget.widgetId);
            
            // If the definition isn't found (e.g., app was uninstalled), skip rendering this widget.
            if (!widgetDef) return; 

            const iframe = document.createElement('iframe');
            iframe.src = widgetDef.url;
            iframe.setAttribute('data-gurasuraisu-iframe', 'true');
            instance.appendChild(iframe);
        }

        const overlay = document.createElement('div');
        overlay.className = 'widget-instance-overlay';
        if (widget.transparent) overlay.style.boxShadow = 'none';

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'widget-resize-handle';
        
        instance.appendChild(overlay);
        instance.appendChild(resizeHandle);
        gridContainer.appendChild(instance);
        widgetElements.set(index.toString(), instance);
    });

    // Trigger snapshot update for remote
    if (window.WavesHost) {
    	setTimeout(broadcastWidgetSnapshots, 5000);
    }

    // 2. Add interaction listeners to all newly created widgets
    widgetElements.forEach((instance, indexKey) => {
        const index = parseInt(indexKey);
        const widgetData = activeWidgets[index]; 
        const overlay = instance.querySelector('.widget-instance-overlay');
        const resizeHandle = instance.querySelector('.widget-resize-handle');
        
        // --- 1. APPLY SAVED ROTATION ---
        const currentRotation = widgetData.rotation || 0;
        instance.style.transform = `rotate(${currentRotation}deg)`;

        // --- 2. ADD ROTATION HANDLE (Stickers Only) ---
        let rotateHandle;
        if (widgetData.type === 'sticker') {
            rotateHandle = document.createElement('div');
            rotateHandle.className = 'widget-rotate-handle';
            // Optional: Add an icon
            rotateHandle.innerHTML = '<span class="material-symbols-rounded" style="font-size: 16px; pointer-events: none;">refresh</span>';
            instance.appendChild(rotateHandle);
        }
        
        let isDragging = false, longPressTimer, longPressFired = false;
        let initialMouseX, initialMouseY, initialWidgetX, initialWidgetY;
        const snapLineV = document.getElementById('snap-line-v');
        const snapLineH = document.getElementById('snap-line-h');

        // --- 3. ROTATION LOGIC ---
        let isRotating = false;
        let initialRotation = 0;
        let rotationStartAngle = 0;
        let widgetCenter = { x: 0, y: 0 };

        const onRotateStart = (e) => {
            e.stopPropagation();
            e.preventDefault(); // Prevent text selection
            isRotating = true;
            
            // Allow styling parent during rotation
            instance.classList.add('is-resizing'); // Reuse resizing style for interaction feedback

            const rect = instance.getBoundingClientRect();
            widgetCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Calculate initial angle of mouse relative to center (in radians)
            rotationStartAngle = Math.atan2(clientY - widgetCenter.y, clientX - widgetCenter.x);
            initialRotation = widgetData.rotation || 0;

            document.addEventListener('mousemove', onRotateMove);
            document.addEventListener('mouseup', onRotateEnd);
            document.addEventListener('touchmove', onRotateMove, { passive: false });
            document.addEventListener('touchend', onRotateEnd);
        };

		const onRotateMove = (e) => {
            if (!isRotating) return;
            e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Calculate current angle
            const currentAngle = Math.atan2(clientY - widgetCenter.y, clientX - widgetCenter.x);
            
            // Difference in radians
            const deltaAngle = currentAngle - rotationStartAngle;
            
            // Convert to degrees
            const deltaDegrees = deltaAngle * (180 / Math.PI);
            
            let newRotation = initialRotation + deltaDegrees;

            // --- SNAP LOGIC ---
            const snapThreshold = 5; // Degrees to snap within
            const nearest90 = Math.round(newRotation / 90) * 90;
            
            // If we are close to a 90-degree angle (0, 90, 180, 270...), snap to it
            if (Math.abs(newRotation - nearest90) < snapThreshold) {
                newRotation = nearest90;
            }

            // Keep Shift key behavior for strict 45-degree increments
            if (e.shiftKey) {
                newRotation = Math.round(newRotation / 45) * 45;
            }

            instance.style.transform = `rotate(${newRotation}deg)`;
            
            // Store temporarily on DOM for the end event to grab
            instance.dataset.tempRotation = newRotation;
        };

        const onRotateEnd = () => {
            if (!isRotating) return;
            isRotating = false;
            instance.classList.remove('is-resizing');

            document.removeEventListener('mousemove', onRotateMove);
            document.removeEventListener('mouseup', onRotateEnd);
            document.removeEventListener('touchmove', onRotateMove);
            document.removeEventListener('touchend', onRotateEnd);

            // Save final rotation
            const tempRot = parseFloat(instance.dataset.tempRotation);
            const finalRotation = isNaN(tempRot) ? initialRotation : tempRot;
            const widgetToUpdate = activeWidgets[index];
            if (widgetToUpdate) {
                widgetToUpdate.rotation = finalRotation;
                saveWidgets();
            }
        };

        // Attach listeners
        if (rotateHandle) {
            rotateHandle.addEventListener('mousedown', onRotateStart);
            rotateHandle.addEventListener('touchstart', onRotateStart, { passive: false });
        }

        const onDragStart = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            isDragging = false;
            longPressFired = false; // Reset the flag
            initialMouseX = clientX;
            initialMouseY = clientY;
            initialWidgetX = instance.offsetLeft;
            initialWidgetY = instance.offsetTop;

            longPressTimer = setTimeout(() => {
                longPressFired = true;
                removeWidget(index);
            }, 500);

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('touchend', onDragEnd);
        };

		const onDragMove = (e) => {
            e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            if (!isDragging && (Math.abs(clientX - initialMouseX) > 5 || Math.abs(clientY - initialMouseY) > 5)) {
                isDragging = true;
                clearTimeout(longPressTimer);
                instance.classList.add('is-dragging');
            }

            if (!isDragging) return;

            let newX = initialWidgetX + (clientX - initialMouseX);
            let newY = initialWidgetY + (clientY - initialMouseY);

            // --- JS-Controlled Spacing & Snapping ---
            snapLineV.style.display = 'none';
            snapLineH.style.display = 'none';
            
            // --- FIX: Get the grid's current position on every move event ---
            const gridRect = gridContainer.getBoundingClientRect();

            let finalX = newX;
            let finalY = newY;
            const draggedRect = { w: instance.offsetWidth, h: instance.offsetHeight };

            // Find the single best snap point for each axis
            let bestX = { dist: SNAP_DISTANCE, pos: newX };
            let bestY = { dist: SNAP_DISTANCE, pos: newY };

            // 1. Check against other widgets using their direct offset properties for accuracy
            widgetElements.forEach((otherInstance, otherIndexKey) => {
                if (indexKey === otherIndexKey) return;
                
                // Use offsetLeft/Top which are relative to the grid container, avoiding conversion errors.
                const otherLeft = otherInstance.offsetLeft;
                const otherTop = otherInstance.offsetTop;
                const otherRight = otherInstance.offsetLeft + otherInstance.offsetWidth;
                const otherBottom = otherInstance.offsetTop + otherInstance.offsetHeight;
                const otherCenterX = otherLeft + otherInstance.offsetWidth / 2;
                const otherCenterY = otherTop + otherInstance.offsetHeight / 2;

                const xPoints = [
                    otherLeft, otherRight - draggedRect.w, otherCenterX - draggedRect.w / 2, // Flush
                    otherRight + MARGIN, otherLeft - draggedRect.w - MARGIN              // Adjacent
                ];
                for (const p of xPoints) {
                    const dist = Math.abs(newX - p);
                    if (dist < bestX.dist) bestX = { dist, pos: p };
                }

                const yPoints = [
                    otherTop, otherBottom - draggedRect.h, otherCenterY - draggedRect.h / 2, // Flush
                    otherBottom + MARGIN, otherTop - draggedRect.h - MARGIN              // Adjacent
                ];
                for (const p of yPoints) {
                    const dist = Math.abs(newY - p);
                    if (dist < bestY.dist) bestY = { dist, pos: p };
                }
            });
            
            // 2. Check against grid container edges
            const gridW = gridContainer.offsetWidth;
            const gridH = gridContainer.offsetHeight;
            const screenXPoints = [MARGIN, gridW - draggedRect.w - MARGIN];
            for (const p of screenXPoints) {
                const dist = Math.abs(newX - p);
                if (dist < bestX.dist) bestX = { dist, pos: p };
            }
            const screenYPoints = [MARGIN, gridH - draggedRect.h - MARGIN];
            for (const p of screenYPoints) {
                const dist = Math.abs(newY - p);
                if (dist < bestY.dist) bestY = { dist, pos: p };
            }

            // 3. Apply the winning snaps and draw the guide lines in the correct coordinate space
            if (bestX.dist < SNAP_DISTANCE) {
                finalX = bestX.pos;
                // FIX: Offset the fixed-position snap line by the grid's viewport position
                snapLineV.style.left = `${finalX + gridRect.left}px`;
                snapLineV.style.display = 'block';
            }
            if (bestY.dist < SNAP_DISTANCE) {
                finalY = bestY.pos;
                // FIX: Offset the fixed-position snap line by the grid's viewport position
                snapLineH.style.top = `${finalY + gridRect.top}px`;
                snapLineH.style.display = 'block';
            }
			
            // Boundary and Clock Collision Check
            const clockRect = document.querySelector('.container').getBoundingClientRect();
            
            // Grid boundary clamp (keep inside screen)
            finalX = Math.max(MARGIN, Math.min(finalX, gridContainer.offsetWidth - instance.offsetWidth - MARGIN));
            finalY = Math.max(MARGIN, Math.min(finalY, gridContainer.offsetHeight - instance.offsetHeight - MARGIN));

            const widgetRect = { left: finalX, top: finalY, right: finalX + instance.offsetWidth, bottom: finalY + instance.offsetHeight };

			instance.style.left = `${finalX}px`;
            instance.style.top = `${finalY}px`;
        };
		
        const onDragEnd = () => {
            clearTimeout(longPressTimer);
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('touchend', onDragEnd);
            snapLineV.style.display = 'none';
            snapLineH.style.display = 'none';

            // FIX: If a long press was handled, just reset state and exit.
            if (longPressFired) {
                isDragging = false;
                return;
            }

            if (isDragging) {
                instance.classList.remove('is-dragging');
                const widgetToUpdate = activeWidgets[index];
                if (!widgetToUpdate) return; // <-- FIX: Prevents crash if widget is deleted mid-drag
                widgetToUpdate.x = instance.offsetLeft;
                widgetToUpdate.y = instance.offsetTop;
                saveWidgets();
            } else {
                // FIX: Debounce tap events to prevent multiple instances from opening on touch devices.
                if (Date.now() - lastWidgetTapTime < 300) {
                    return;
                }
                lastWidgetTapTime = Date.now();

                const widgetData = availableWidgets[activeWidgets[index].appName]?.find(w => w.widgetId === activeWidgets[index].widgetId);
                if (!widgetData) return;

                // Handle special system widget actions
                if (widgetData.openUrl === '#open-last-media-app') {
                    const lastApp = localStorage.getItem('lastMediaSessionApp');
                    // Check if a last app is stored AND if that app is still installed
                    if (lastApp && apps[lastApp]) {
                        createFullscreenEmbed(apps[lastApp].url);
                    } else {
                        // SENSIBLE FALLBACK: If no app is found, open Music
                        createFullscreenEmbed('/music/index.html');
                    }
                } else {
                    // Standard app widget behavior
                    const appData = apps[activeWidgets[index].appName];
                    const openUrl = widgetData.openUrl || appData?.url;
                    if (openUrl) createFullscreenEmbed(openUrl);
                }
            }
            isDragging = false;
        };

        // --- Add Resizing Logic ---
        let isResizing = false;
        let initialResizeMouseX, initialResizeMouseY, initialWidgetW, initialWidgetH;
		let initialResizeWidgetX, initialResizeWidgetY; 
        let isAnchoredRight, isAnchoredBottom; // Flags to track edge snapping

        const onResizeStart = (e) => {
            e.stopPropagation(); 
            isResizing = true;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            initialResizeMouseX = clientX;
            initialResizeMouseY = clientY;
            initialWidgetW = instance.offsetWidth;
            initialWidgetH = instance.offsetHeight;
            initialResizeWidgetX = instance.offsetLeft; // Capture initial X
            initialResizeWidgetY = instance.offsetTop;  // Capture initial Y

            // Determine if the widget is anchored to the right or bottom edge
            // A small tolerance (5px) helps catch slight imprecisions
            isAnchoredRight = (initialResizeWidgetX + initialWidgetW) >= (window.innerWidth - MARGIN - 5);
            isAnchoredBottom = (initialResizeWidgetY + initialWidgetH) >= (window.innerHeight - MARGIN - 5);

            document.addEventListener('mousemove', onResizeMove);
            document.addEventListener('mouseup', onResizeEnd);
            document.addEventListener('touchmove', onResizeMove, { passive: false });
            document.addEventListener('touchend', onResizeEnd);
        };
        
        const onResizeMove = (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

			let newWidth = initialWidgetW + (clientX - initialResizeMouseX);
            let newHeight = initialWidgetH + (clientY - initialResizeMouseY);

			if (widgetData.type === 'sticker') {
                newWidth = Math.max(15, Math.min(window.innerWidth - initialResizeWidgetX, newWidth));
                newHeight = Math.max(15, Math.min(window.innerHeight - initialResizeWidgetY, newHeight));

                instance.style.width = `${newWidth}px`;
                instance.style.height = `${newHeight}px`;
            } else {
	            // --- Grid Snapping for Size ---
	            const baseUnit = 200;
	            const maxUnits = 4;
	            let newWidth = initialWidgetW + (clientX - initialResizeMouseX);
	            let newHeight = initialWidgetH + (clientY - initialResizeMouseY);
	            
	            let gridW = Math.round((newWidth + MARGIN) / (baseUnit + MARGIN));
	            let gridH = Math.round((newHeight + MARGIN) / (baseUnit + MARGIN));
	            gridW = Math.max(1, Math.min(maxUnits, gridW));
	            gridH = Math.max(1, Math.min(maxUnits, gridH));
	
	            const snappedWidth = (gridW * baseUnit) + ((gridW - 1) * MARGIN);
	            const snappedHeight = (gridH * baseUnit) + ((gridH - 1) * MARGIN);
	            
	            // --- Positional Adjustment and Boundary Enforcement ---
	            let finalX = initialResizeWidgetX;
	            let finalY = initialResizeWidgetY;
	
	            // If anchored right, adjust the 'left' position to grow inwards
	            if (isAnchoredRight) {
	                finalX = window.innerWidth - snappedWidth - MARGIN;
	            }
	            
	            // If anchored bottom, adjust the 'top' position to grow inwards
	            if (isAnchoredBottom) {
	                finalY = window.innerHeight - snappedHeight - MARGIN;
	            }
				
				// Final clamp to ensure the widget never leaves the viewport
	            finalX = Math.max(MARGIN, Math.min(finalX, window.innerWidth - snappedWidth - MARGIN));
	            finalY = Math.max(MARGIN, Math.min(finalY, window.innerHeight - snappedHeight - MARGIN));
				
	            instance.style.width = `${snappedWidth}px`;
	            instance.style.height = `${snappedHeight}px`;
	            instance.style.left = `${finalX}px`;
	            instance.style.top = `${finalY}px`;
			};
        };

        const onResizeEnd = () => {
            if (!isResizing) return;
            isResizing = false;
            
            document.removeEventListener('mousemove', onResizeMove);
            document.removeEventListener('mouseup', onResizeEnd);
            document.removeEventListener('touchmove', onResizeMove);
            document.removeEventListener('touchend', onResizeEnd);

            const widgetToUpdate = activeWidgets[index];
            if (!widgetToUpdate) return;
			widgetToUpdate.w = instance.offsetWidth;
            widgetToUpdate.h = instance.offsetHeight;
            widgetToUpdate.x = instance.offsetLeft; // Save the new X position
            widgetToUpdate.y = instance.offsetTop;  // Save the new Y position
            saveWidgets();
        };

        // Attach listeners to the handle
        resizeHandle.addEventListener('mousedown', onResizeStart);
        resizeHandle.addEventListener('touchstart', onResizeStart, { passive: false });
                
        overlay.addEventListener('mousedown', onDragStart);
        overlay.addEventListener('touchstart', onDragStart, { passive: false });
    });
}

function openWidgetPicker() {
    const drawer = document.getElementById('widget-picker-drawer');
    const content = drawer.querySelector('.widget-drawer-content');
    const grid = document.getElementById('widget-picker-grid');
    if (!drawer || !grid || !content) return;
    
    content.scrollTop = 0; // Scroll to top
    grid.innerHTML = ''; // Clear old items

	// Reset transparency toggle
    const transparentSwitch = document.getElementById('widget-transparent-switch');
    if (transparentSwitch) transparentSwitch.checked = false;

    // Check if there are any available widgets
    if (Object.keys(availableWidgets).length === 0) {
        grid.innerHTML = `<p style="text-align: center; opacity: 0.7;">No widgets available. Install apps that provide widgets.</p>`;
    } else {
        for (const appName in availableWidgets) {
            availableWidgets[appName].forEach(widgetData => {
                const item = document.createElement('div');
                item.className = 'widget-picker-item';

                // --- Live Preview Implementation ---
                const previewContainer = document.createElement('div');
                previewContainer.className = 'widget-picker-preview';

                const iframe = document.createElement('iframe');
                iframe.src = widgetData.url;
				iframe.setAttribute('data-gurasuraisu-iframe', 'true');
                iframe.scrolling = 'no';
                iframe.style.pointerEvents = 'none'; // Make the preview non-interactive

                // Calculate the widget's actual size
                const baseUnit = 200;
                const widgetWidth = widgetData.defaultSize ? widgetData.defaultSize[0] * baseUnit : baseUnit;
                const widgetHeight = widgetData.defaultSize ? widgetData.defaultSize[1] * baseUnit : baseUnit;
                iframe.style.width = `${widgetWidth}px`;
                iframe.style.height = `${widgetHeight}px`;

                // Scale the iframe down to fit into the preview container 
                const previewBoxWidth = 200;
                const scale = previewBoxWidth / widgetWidth;
                iframe.style.transform = `scale(${scale})`;
                iframe.style.transformOrigin = 'center';
                
                previewContainer.appendChild(iframe);
                // --- End of Live Preview ---

                const title = document.createElement('span');
                title.className = 'widget-picker-title';
                title.textContent = widgetData.title;

                item.appendChild(previewContainer);
                item.appendChild(title);

                item.addEventListener('click', () => {
                    const isTransparent = document.getElementById('widget-transparent-switch')?.checked || false;
                    addWidget(widgetData, isTransparent);
                    closeWidgetPicker();
                });
                grid.appendChild(item);
            });
        }
    }
    
    drawer.style.display = 'flex';
    setTimeout(() => {
        drawer.classList.add('open');
    }, 10);
}

function closeWidgetPicker() {
    const drawer = document.getElementById('widget-picker-drawer');
    if (!drawer) return;

    drawer.classList.remove('open');
    setTimeout(() => {
        if (!drawer.classList.contains('open')) {
            drawer.style.display = 'none';
            // Clear content to free up resources (iframe processes)
            const grid = document.getElementById('widget-picker-grid');
            if (grid) grid.innerHTML = ''; 
        }
    }, 300);
}

async function processStickerFiles(files) {
    if (files.length === 0) return;

    // If we are just receiving files (e.g. from drag/drop or direct upload), 
    // we apply default settings.
    const isTransparent = document.getElementById('widget-transparent-switch')?.checked || false;

    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;

        try {
            // Use existing compression
            const compressedSrc = await compressMedia(file);
            
            const stickerData = {
                type: 'sticker',
                src: compressedSrc,
                border: false, // Default to no border for quick add
                borderColor: '#ffffff',
                borderWidth: '0',
                transparent: isTransparent,
                w: 150, 
                h: 150,
                x: 50,
                y: 50
            };

            activeWidgets.push(stickerData);
        } catch (e) {
            console.error("Sticker processing failed", e);
        }
    }

    renderWidgets();
    saveWidgets();
    showPopup("Sticker added");
    // If this was triggered from the drawer, close it
    closeWidgetPicker();
}

function setupStickerControls() {
    const addBtn = document.getElementById('add-sticker-btn');
    const popup = document.getElementById('sticker-settings-popup');
    const fileInput = document.getElementById('sticker-file-input');
    const fileBtn = document.getElementById('sticker-select-file-btn');
    const borderSwitch = document.getElementById('sticker-border-switch');
    const borderOptions = document.getElementById('sticker-border-options');
    const createBtn = document.getElementById('sticker-create-btn');
    const transSwitch = document.getElementById('widget-transparent-switch');
    const transLabel = document.querySelector('label[for="widget-transparent-switch"]');

    if (!addBtn || !popup) return;

	// Prevent Transparency toggle from closing the popup
    const stopProp = (e) => e.stopPropagation();
    if (transSwitch) transSwitch.addEventListener('click', stopProp);
    if (transLabel) transLabel.addEventListener('click', stopProp);

    // Toggle Border Options visibility
    borderSwitch.addEventListener('change', () => {
        borderOptions.style.display = borderSwitch.checked ? 'flex' : 'none';
    });

    // Handle Button Click to show popup
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const controlPopup = document.querySelector('.control-popup');
        const hiddenContainer = document.getElementById('hidden-controls-container');
        
        fileInput.value = '';
        fileBtn.textContent = 'Select Image';
        borderSwitch.checked = false;
        borderOptions.style.display = 'none';

        if (controlPopup.style.display === 'block' && controlPopup.contains(popup)) {
            controlPopup.style.display = 'none';
            hiddenContainer.appendChild(popup);
        } else {
            if (controlPopup.firstElementChild) {
                hiddenContainer.appendChild(controlPopup.firstElementChild);
            }
            controlPopup.appendChild(popup);
            
            const rect = addBtn.getBoundingClientRect();
            const zoom = parseFloat(document.body.style.zoom) / 100 || 1;
            controlPopup.style.display = 'block';
            controlPopup.style.top = `${(rect.bottom + 10) / zoom}px`;
            let left = (rect.left + (rect.width / 2) - 100) / zoom;
            controlPopup.style.left = `${Math.max(10, Math.min((window.innerWidth / zoom) - 220, left))}px`;
        }
    });

    let selectedFile = null;

    // "Select Image" triggers the Unified Manager
    if (fileBtn) {
        // Clone to remove old listeners to be safe
        const newBtn = fileBtn.cloneNode(true);
        fileBtn.parentNode.replaceChild(newBtn, fileBtn);
        
        newBtn.addEventListener('click', () => {
            const requestId = 'sticker-popup-select';
            
            // Register callback for when file arrives (Local or Remote)
            FileUploadManager.registerAppRequest(requestId, 'System', (files) => {
                if (files && files.length > 0) {
                    selectedFile = files[0]; // Store for "Create" click
                    newBtn.textContent = selectedFile.name;
                }
            });

            // Trigger UI
            FileUploadManager.trigger('image/*', false, requestId);
        });
    }

    // "Create" uses the captured file
    if (createBtn) {
        const newCreate = createBtn.cloneNode(true);
        createBtn.parentNode.replaceChild(newCreate, createBtn);

        newCreate.addEventListener('click', async () => {
            if (!selectedFile) {
                showPopup('Please select an image');
                return;
            }

            try {
                let compressedSrc;
                // Handle File object (Local) or Data Object (Remote)
                if (selectedFile instanceof File) {
                    compressedSrc = await compressMedia(selectedFile);
                } else if (selectedFile.data) {
                    // It's a remote file object {name, type, data: base64}
                    // compressMedia expects Blob/File. Convert base64 to Blob.
                    const res = await fetch(selectedFile.data);
                    const blob = await res.blob();
                    // Re-wrap as file for compressor if needed, or just use blob
                    compressedSrc = await compressMedia(blob);
                }

                const isTransparent = document.getElementById('widget-transparent-switch')?.checked;
                
                const stickerData = {
                    type: 'sticker',
                    src: compressedSrc,
                    border: document.getElementById('sticker-border-switch').checked,
                    borderColor: document.getElementById('sticker-border-color').value,
                    borderWidth: document.getElementById('sticker-border-width').value,
                    transparent: isTransparent,
                    w: 150, 
                    h: 150,
                    x: 50,
                    y: 50
                };
        
                activeWidgets.push(stickerData);
                
                // Close popup logic...
                const controlPopup = document.querySelector('.control-popup');
                const hiddenContainer = document.getElementById('hidden-controls-container');
                if(controlPopup) controlPopup.style.display = 'none';
                if(hiddenContainer) hiddenContainer.appendChild(popup);
                
                renderWidgets();
                saveWidgets();
                closeWidgetPicker();
                
                // Reset
                selectedFile = null;
                document.getElementById('sticker-select-file-btn').textContent = 'Select Image';

            } catch (e) {
                console.error("Sticker creation error", e);
                showPopup("Failed to create sticker");
            }
        });
    }
}

function pauseAnimatedStickers() {
    document.querySelectorAll('.sticker-widget img').forEach(img => {
        // Skip if already paused or image not fully loaded
        if (img.dataset.isPaused === 'true' || !img.complete || img.naturalWidth === 0) return;

        // 1. Save original source if not already saved
        if (!img.dataset.originalSrc) {
            img.dataset.originalSrc = img.src;
        }

        // 2. Create static frame using canvas
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // 3. Swap src to static data URL
            img.src = canvas.toDataURL();
            img.dataset.isPaused = 'true';
        } catch(e) {
            console.warn("Could not freeze sticker animation:", e);
        }
    });
}

function resumeAnimatedStickers() {
    document.querySelectorAll('.sticker-widget img').forEach(img => {
        if (img.dataset.isPaused === 'true' && img.dataset.originalSrc) {
            img.src = img.dataset.originalSrc;
            img.dataset.isPaused = 'false';
        }
    });
}