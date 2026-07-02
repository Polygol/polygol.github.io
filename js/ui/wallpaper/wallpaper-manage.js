async function openWallpaperManager() {
    // 1. Generate visual data for the sheet (High-quality Thumbnails)
    const listData = await Promise.all(recentWallpapers.map(async (wp, i) => {
        let thumb = null;
        let previewId = wp.id;
        let isVid = wp.isVideo;

        if (wp.isSlideshow && wp.items && wp.items.length > 0) {
            previewId = wp.items[0].id;
            isVid = wp.items[0].isVideo;
        }

        if (previewId) {
            const data = await getWallpaper(previewId);
            if (data) {
                const src = data.firstFrameDataUrl || data.dataUrl || (data.blob ? URL.createObjectURL(data.blob) : null);
                if (src) {
                    // Small thumbnail for performance in the list
                    thumb = await compressImage(src, 120, 0.5);
                    if (data.blob && !data.firstFrameDataUrl && !data.dataUrl) URL.revokeObjectURL(src);
                }
            }
        }

        return {
            id: wp.id,
            index: i,
            label: wp.isSlideshow ? 'Slideshow' : (wp.isVideo ? 'Video' : 'Image'),
            thumb: thumb,
            isActive: i === currentWallpaperPosition
        };
    }));

    // 2. Definitive CSS and HTML for the Draggable List
    const sheetHtml = `
        <style>
            body { margin: 0; padding: 20px; color: var(--text-color); font-family: 'Inter', sans-serif; user-select: none; background: transparent; }
            .setting-section { background-color: var(--background-mono); border-radius: 35px; corner-shape: superellipse(1.5); padding: 0; margin-bottom: 12px; overflow: hidden; }
            .setting-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; position: relative; transition: transform 0.2s; background: var(--background-mono); }
            .drag-handle { touch-action: none; cursor: grab; margin-left: 5px; opacity: 0.4; padding: 5px; }
            .setting-item:not(:last-child)::after { content: ""; position: absolute; left: 75px; width: calc(100% - 85px); bottom: 0; height: 1.5px; background: var(--glass-border); }
            .wp-thumb { width: 50px; height: 50px; border-radius: 12px; corner-shape: superellipse(1.5); background-size: cover; background-position: center; background-color: #000; flex-shrink: 0; border: 1px solid var(--glass-border); }
            .setting-info { flex-grow: 1; margin-left: 15px; }
            .setting-label { font-weight: 600; font-family: 'Open Runde'; font-size: 1rem; }
            .setting-description { font-size: 0.8rem; color: var(--secondary-text-color); display: flex; align-items: center; gap: 5px; }
            .wp-tag { background: var(--accent); color: white; padding: 1px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; }
            .action-btn { background: transparent; color: var(--text-color); border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
            .setting-item.dragging { opacity: 0.5; background: var(--search-background); z-index: 10; scale: 1.02; }
        </style>
        
        <h2 style="margin-top: 0;">Manage wallpapers</h2>
        <div id="wp-list" class="setting-section"></div>
        
        <script>
            let draggedIdx = null;

            window.addEventListener('message', (e) => {
                if (e.data.type === 'render-data') render(e.data.payload);
            });

            function render(items) {
                const list = document.getElementById('wp-list');
                list.innerHTML = '';
                items.forEach((item, i) => {
                    const div = document.createElement('div');
                    div.className = 'setting-item';
                    div.dataset.index = i;
                    
                    div.innerHTML = \`
                        <button class="action-btn" style="color: #ff5252; margin-right: 10px" onclick="event.stopPropagation(); request('delete', \${i})"><span class="material-symbols-rounded" style="font-size:18px;">cancel</span></button>
                        <div class="wp-thumb" style="background-image: url('\${item.thumb || ""}')"></div>
                        <div class="setting-info">
                            <div class="setting-label">Wallpaper \${i + 1}</div>
                            <div class="setting-description">
                                \${item.label} \${item.isActive ? '<span class="wp-tag">Active</span>' : ''}
                            </div>
                        </div>
                        <div class="setting-control" style="display: flex; align-items: center; gap: 8px;">
                            <button class="action-btn" onclick="event.stopPropagation(); request('duplicate', \${i})"><span class="material-symbols-rounded" style="font-size:18px;">content_copy</span></button>
                            <button class="action-btn" onclick="event.stopPropagation(); request('edit', \${i})"><span class="material-symbols-rounded" style="font-size:18px;">edit</span></button>
                            <div class="drag-handle" style="cursor: grab; margin-left: 5px; opacity: 0.4;"><span class="material-symbols-rounded">reorder</span></div>
                        </div>
                    \`;

                    // Drag Events
                    div.addEventListener('pointerdown', (e) => {
                        if (!e.target.closest('.drag-handle')) return;
                        draggedIdx = i;
                        div.classList.add('dragging');
                        div.style.zIndex = "1000";
                        div.setPointerCapture(e.pointerId);
                    });

                    div.addEventListener('pointermove', (e) => {
                        if (draggedIdx === null) return;
                        div.style.pointerEvents = 'none'; 
                        const target = document.elementFromPoint(e.clientX, e.clientY);
                        div.style.pointerEvents = 'auto';
                        
                        const overItem = target?.closest('.setting-item');
                        document.querySelectorAll('.setting-item').forEach(el => el.style.transform = '');
                        if (overItem && overItem !== div) {
                            const overIdx = parseInt(overItem.dataset.index);
                            overItem.style.transform = (overIdx < draggedIdx) ? 'translateY(15px)' : 'translateY(-15px)';
                        }
                    });

                    div.addEventListener('pointerup', (e) => {
                        if (draggedIdx === null) return;
                        div.classList.remove('dragging');
                        div.style.zIndex = "";
                        div.style.pointerEvents = 'none';
                        const target = document.elementFromPoint(e.clientX, e.clientY);
                        div.style.pointerEvents = 'auto';
                        const overItem = target?.closest('.setting-item');
                        const overIdx = overItem ? parseInt(overItem.dataset.index) : null;
                        
                        if (overIdx !== null && overIdx !== draggedIdx) {
                            request('reorder', { from: draggedIdx, to: overIdx });
                        } else {
                            render(items); // Reset visual shifts
                        }
                        draggedIdx = null;
                    });

                    list.appendChild(div);
                });
            }

            function request(action, payload) {
                // Fixed: Explicitly send to window.parent to bypass iframe sandbox messaging quirks
                window.parent.postMessage({ type: 'wallpaper-manager-action', action, payload }, '*');
            }
        </script>
    `;

    // 3. Display the Sheet
    displaySheet({
        html: sheetHtml,
        height: '100%'
    });

    // 4. Populate with Data
    setTimeout(() => {
        const sheetIframe = document.querySelector('iframe[data-is-sheet="true"]');
        if (sheetIframe) {
            sheetIframe.contentWindow.postMessage({ type: 'render-data', payload: listData }, '*');
        }
    }, 600);
}

// Global listener for Manager actions (The Brain)
window.addEventListener('message', async (event) => {
    if (event.data.type === 'wallpaper-manager-action') {
        const { action, payload } = event.data;
        
        if (action === 'reorder') {
            const { from, to } = payload;
            
            // Move item in array
            const movedItem = recentWallpapers.splice(from, 1)[0];
            recentWallpapers.splice(to, 0, movedItem);
            
            // Update the active wallpaper pointer so the selected wallpaper stays selected
            if (currentWallpaperPosition === from) {
                currentWallpaperPosition = to;
            } else if (currentWallpaperPosition > from && currentWallpaperPosition <= to) {
                currentWallpaperPosition--;
            } else if (currentWallpaperPosition < from && currentWallpaperPosition >= to) {
                currentWallpaperPosition++;
            }

            saveRecentWallpapers();
            saveCurrentPosition();
            updatePageIndicatorDots(true);
            refreshWallpaperManagerUI();

        } else if (action === 'delete') {
            await removeWallpaper(payload);
            refreshWallpaperManagerUI(); 
        } else if (action === 'duplicate') {
            await duplicateWallpaper(payload);
            refreshWallpaperManagerUI(); 
        } else if (action === 'edit') {
            closeSheetUI();
            closeWallpaperSwitcher();
            setTimeout(() => enterEditMode(payload), 300);
        }
    }
});

async function refreshWallpaperManagerUI() {
    const listData = await Promise.all(recentWallpapers.map(async (wp, i) => {
        let thumb = null;
        let previewId = wp.id;
        if (wp.isSlideshow && wp.items && wp.items.length > 0) previewId = wp.items[0].id;
        const data = await getWallpaper(previewId);
        if (data) {
            const src = data.firstFrameDataUrl || data.dataUrl || (data.blob ? URL.createObjectURL(data.blob) : null);
            if (src) thumb = await compressImage(src, 120, 0.5);
        }
        return { id: wp.id, index: i, label: wp.isSlideshow ? 'Slideshow' : (wp.isVideo ? 'Video' : 'Image'), thumb: thumb, isActive: i === currentWallpaperPosition };
    }));

    const sheetIframe = document.querySelector('iframe[data-is-sheet="true"]');
    if (sheetIframe) {
        sheetIframe.contentWindow.postMessage({ type: 'render-data', payload: listData }, '*');
    }
}

// Event listener for the "Manage" button in the switcher
document.addEventListener('DOMContentLoaded', () => {
    const manageBtn = document.getElementById('switcher-manage-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', () => {
            closeWallpaperSwitcher();
            setTimeout(openWallpaperManager, 100);
        });
    }
});