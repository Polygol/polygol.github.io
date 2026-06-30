const MAX_RECENT_WALLPAPERS = 50;
window.recentWallpapers = [];
let recentWallpapers = window.recentWallpapers; // Alias for local scope use
let currentWallpaperPosition = 0;
Object.defineProperty(window, 'currentWallpaperPosition', {
    get: function() { return currentWallpaperPosition; },
    set: function(val) { currentWallpaperPosition = val; }
});
let isSlideshow = false;

let WALLPAPER_PRESETS = [];
async function fetchWallpaperPresets() {
    try {
        const res = await fetch('/assets/img/wallpapers/index.json');
        if (res.ok) {
            WALLPAPER_PRESETS = await res.json();
        }
    } catch (e) {
        console.warn("Failed to load wallpaper presets", e);
    }
}
// Call this early
fetchWallpaperPresets();
const WALLPAPER_SUBMISSION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeSYSJalaX0HCZe0helcK5NCuc0U47tQc6KaO1OAsBs5HxK1A/viewform?embedded=true';

async function extractWallpaperColor(imageSource) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            try {
                // Local HSL converter to enable procedural mathematical generation
                const hslToRgbLocal = (h, s, l) => {
                    let r, g, b;
                    if (s === 0) { r = g = b = l; } 
                    else {
                        const hue2rgb = (p, q, t) => {
                            if (t < 0) t += 1; if (t > 1) t -= 1;
                            if (t < 1/6) return p + (q - p) * 6 * t;
                            if (t < 1/2) return q;
                            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                            return p;
                        };
                        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        const p = 2 * l - q;
                        r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
                    }
                    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
                };

                const colorThief = new ColorThief();
                const palette = colorThief.getPalette(img, 30);
                
                if (!palette || palette.length === 0) {
                    resolve(null); return;
                }

                let scored = palette.map(rgb => {
                    const hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
                    return {
                        rgb: { r: rgb[0], g: rgb[1], b: rgb[2] },
                        hsl: hsl,
                        h: hsl[0], s: hsl[1], l: hsl[2]
                    };
                }).filter(c => {
                    // Filter out pure black/white, and heavily washed-out neutral gray tones
                    const isBlack = c.l < 0.12;
                    const isWhite = c.l > 0.88;
                    const isGray = c.s < 0.12;
                    return !isBlack && !isWhite && !isGray;
                });

                // Generate a highly pleasing random color scheme fallback if no viable colors remain
                if (scored.length === 0) {
                    const h = Math.random();
                    scored.push({ rgb: hslToRgbLocal(h, 0.65, 0.5), hsl: [h, 0.65, 0.5], h: h, s: 0.65, l: 0.5 });
                }

                // Calculate a "Vibrance" score balancing saturation and middle lightness
                scored.forEach(c => {
                    c.vibrance = c.s * (1 - Math.abs(c.l - 0.5));
                });

                // 1. Primary: Most vibrant color
                scored.sort((a, b) => b.vibrance - a.vibrance);
                const primaryObj = scored[0];
                const primary = primaryObj.rgb;

                const hueDistance = (h1, h2) => {
                    const dist = Math.abs(h1 - h2);
                    return Math.min(dist, 1.0 - dist);
                };

                // 2. Secondary: Most vibrant color that is AT LEAST 36 degrees (0.1) away in hue from Primary
                let secondaryObj = scored.find(c => hueDistance(c.h, primaryObj.h) > 0.1);
                if (!secondaryObj) {
                    // Fallback to strict Color Theory (Complementary / 180 degrees)
                    const compH = (primaryObj.h + 0.5) % 1.0;
                    secondaryObj = { rgb: hslToRgbLocal(compH, primaryObj.s, primaryObj.l), h: compH, s: primaryObj.s, l: primaryObj.l };
                }
                const secondary = secondaryObj.rgb;

                // 3. Tertiary: Most vibrant color distinct from BOTH Primary and Secondary
                let tertiaryObj = scored.find(c => hueDistance(c.h, primaryObj.h) > 0.1 && hueDistance(c.h, secondaryObj.h) > 0.1);
                if (!tertiaryObj) {
                    // Fallback to strict Color Theory (Triadic / 120 degrees)
                    const triH = (primaryObj.h + 0.33) % 1.0;
                    tertiaryObj = { rgb: hslToRgbLocal(triH, primaryObj.s, primaryObj.l), h: triH, s: primaryObj.s, l: primaryObj.l };
                }
                const tertiary = tertiaryObj.rgb;

                // 4. Analogous: 30 degree shift from primary
                const anaH = (primaryObj.h + 0.08) % 1.0;
                const analogous = hslToRgbLocal(anaH, primaryObj.s, primaryObj.l);

                // 5. Muted: Lowest saturation
                const mutedCand = [...scored].sort((a, b) => a.s - b.s);
                const muted = mutedCand[0].rgb;

                // 6. Dark: Lowest lightness
                const darkCand = [...scored].sort((a, b) => a.l - b.l);
                const dark = darkCand[0].rgb;

                // 7. Light: Highest lightness
                const lightCand = [...scored].sort((a, b) => b.l - a.l);
                const light = lightCand[0].rgb;

                resolve({
                    primary, secondary, tertiary, analogous, vibrant: primary, muted, dark, light,
                    all: scored.map(c => c.rgb)
                });

            } catch (e) {
                console.warn("Color extraction failed", e);
                resolve(null);
            }
        };

        img.onerror = () => resolve(null);

        if (imageSource instanceof Blob) {
            img.src = URL.createObjectURL(imageSource);
        } else {
            img.src = imageSource;
        }
    });
}

async function applyPresetWallpaper(preset) {
    window.Analytics?.trackWallpaperPreset(preset.name);
    closeWallpaperPicker();
    showPopup(currentLanguage.APPLYING_WALLPAPER || 'Applying new wallpaper');

    try {
        const response = await fetch(preset.fullUrl);
        if (!response.ok) throw new Error('Failed to fetch wallpaper image');

        const blob = await response.blob();
        const filename = preset.fullUrl.split('/').pop();
        const file = new File([blob], filename, { type: blob.type });

        await saveWallpaper(file, preset.clockStyles);

    } catch (error) {
        console.error('Failed to apply preset wallpaper:', error);
		showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.WALLPAPER_APPLY_FAIL || 'Failed to apply wallpaper'
		});
    }
}

function openWallpaperPicker() {
    const drawer = document.getElementById('wallpaper-picker-drawer');
    const content = drawer.querySelector('.widget-drawer-content');
    const grid = document.getElementById('wallpaper-picker-grid');
    if (!drawer || !grid || !content) return;

    closeControls();
    content.scrollTop = 0;
    grid.innerHTML = '';

    // 1. Add Upload Item (Check Limit)
    const uploadItem = document.createElement('div');
    uploadItem.className = 'wallpaper-picker-item upload-item';
    
    // Check limit for visual feedback
    const isFull = recentWallpapers.length >= MAX_RECENT_WALLPAPERS;
    
    uploadItem.innerHTML = `
        <div class="wallpaper-picker-thumbnail" style="${isFull ? 'opacity: 0.5;' : ''}">
            <span class="material-symbols-rounded">${isFull ? 'error' : 'add'}</span>
        </div>
        <span class="wallpaper-picker-title">${isFull ? 'Storage full' : (currentLanguage.UPLOAD_CUSTOM || 'Add')}</span>
    `;
    
    uploadItem.addEventListener('click', () => {
        if (isFull) {
            showDialog({ 
                type: 'alert', 
                title: 'Wallpaper storage full', 
                message: `You have reached the limit of ${MAX_RECENT_WALLPAPERS} wallpapers.` 
            });
        } else {
            // Trigger the external input
            uploadButton.click(); 
            closeWallpaperPicker(); 
        }
    });
    grid.appendChild(uploadItem);

    // 2. Shuffle a copy of the presets array
    const shuffledPresets = [...WALLPAPER_PRESETS];
    for (let i = shuffledPresets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPresets[i], shuffledPresets[j]] = [shuffledPresets[j], shuffledPresets[i]];
    }

    // 3. Create and append items for each shuffled preset
    shuffledPresets.forEach(preset => {
        const item = document.createElement('div');
        item.className = 'wallpaper-picker-item';
        item.addEventListener('click', () => applyPresetWallpaper(preset));

        let detailsHTML = `<span class="wallpaper-picker-title">${preset.name}</span>`;

        if (preset.description) {
            detailsHTML += `<p class="wallpaper-picker-description">${preset.description}</p>`;
        }
        if (preset.artist) {
            detailsHTML += `<p class="wallpaper-picker-artist">By ${preset.artist}</p>`;
        }

        let linksHTML = '';
        if (preset.sourceUrl) {
            linksHTML += `<a href="${preset.sourceUrl}" target="_blank" class="wallpaper-picker-badge" onclick="event.stopPropagation()">Source<span class="material-symbols-rounded">arrow_outward</span></a>`;
        }
        if (preset.license) {
            linksHTML += `<span class="wallpaper-picker-badge">${preset.license}</span>`;
        }
        if (linksHTML) {
            detailsHTML += `<div class="wallpaper-picker-links">${linksHTML}</div>`;
        }

        item.innerHTML = `
            <div class="wallpaper-picker-thumbnail" style="background-image: url('${preset.thumbnailUrl}')"></div>
            <div class="wallpaper-picker-details">
                ${detailsHTML}
            </div>
        `;
        grid.appendChild(item);
    });

    drawer.style.display = 'flex';
    setTimeout(() => {
        drawer.classList.add('open');
    }, 10);
}

const SlideshowManager = {
    active: false,
    paused: false,
    wallpapers: [],
    currentIndex: 0,
    timer: null,
    intervals: [60000, 300000, 600000, 1800000, 3600000],
    labels: ['1m', '5m', '10m', '30m', '1h'],

    init() {
        window.addEventListener('message', (e) => {
            if (e.data.type === 'slideshow-control') {
                const action = e.data.action;
                if (action === 'next') this.next();
                if (action === 'prev') this.prev();
                if (action === 'toggle') this.toggle();
                if (action === 'cycleSpeed') this.cycleSpeed();
                if (action === 'toggleShuffle') this.toggleShuffle();
            }
        });
    },

    start() {
        const data = JSON.parse(localStorage.getItem("wallpapers"));
        if (!data || data.length === 0) return;

        this.wallpapers = data;
        
        // If already active, don't restart/reset the index
        if (this.active) {
            this.startTimer();
            return;
        }

        this.active = true;
        if (this.currentIndex >= this.wallpapers.length) this.currentIndex = 0;

        this.render();
        this.startTimer();

        // Show Control Widget
        startLiveActivity('System', {
            activityId: 'sys-slideshow',
            url: '/assets/gurapp/intl/liveactivity/slideshow-control.html',
            homescreen: false,
			showInIsland: false,
            height: '40px'
        });
        
        // Sync UI state
        setTimeout(() => this.pushState(), 500);
    },

    stop() {
        this.active = false;
        clearInterval(this.timer);
        stopLiveActivity('sys-slideshow');
    },

    startTimer() {
        clearTimeout(this.timer);
        if (this.paused || !this.active) return;
        
        const currentGroup = window.recentWallpapers[window.currentWallpaperPosition];
        const duration = parseInt(currentGroup?.slideshowInterval || localStorage.getItem('slideshowInterval') || '600000', 10);
        
        // Calculate delay to the next clean interval boundary (e.g. if 5m, fires at :00, :05, :10...)
        const now = Date.now();
        const delay = duration - (now % duration);

        this.timer = setTimeout(() => {
            this.next();
            this.startTimer(); 
        }, delay);
    },

    cycleSpeed() {
        const currentGroup = recentWallpapers[currentWallpaperPosition];
        if (!currentGroup || !currentGroup.isSlideshow) return;

        const currentInt = currentGroup.slideshowInterval || parseInt(localStorage.getItem('slideshowInterval') || '600000', 10);
        let idx = this.intervals.indexOf(currentInt);
        if (idx === -1) idx = 2; // Default to 10m if weird value

        const nextIdx = (idx + 1) % this.intervals.length;
        currentGroup.slideshowInterval = this.intervals[nextIdx];
        
        saveRecentWallpapers();
        this.startTimer();
        this.pushState();
    },
	
    next() {
        const currentGroup = recentWallpapers[currentWallpaperPosition];
        if (currentGroup?.shuffle && this.wallpapers.length > 1) {
            let nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * this.wallpapers.length);
            } while (nextIdx === this.currentIndex);
            this.currentIndex = nextIdx;
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.wallpapers.length;
        }
        this.render();
        this.startTimer(); 
    },

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.wallpapers.length) % this.wallpapers.length;
        this.render();
        this.startTimer();
    },

    toggle() {
        this.paused = !this.paused;
        this.startTimer();
        this.pushState();
    },

    toggleShuffle() {
        const currentGroup = recentWallpapers[currentWallpaperPosition];
        if (!currentGroup || !currentGroup.isSlideshow) return;

        currentGroup.shuffle = !currentGroup.shuffle;
        saveRecentWallpapers();
        this.pushState();
        showPopup(currentGroup.shuffle ? "Shuffle enabled" : "Shuffle disabled");
    },
	
    pushState() {
        const currentGroup = recentWallpapers[currentWallpaperPosition];
        const currentInt = currentGroup?.slideshowInterval || parseInt(localStorage.getItem('slideshowInterval') || '600000', 10);
        const labelIdx = this.intervals.indexOf(currentInt);
        const speedLabel = labelIdx !== -1 ? this.labels[labelIdx] : '--';

		// Update Widget UI via System API
        updateLiveActivity('sys-slideshow', {
            current: this.currentIndex + 1,
            total: this.wallpapers.length,
            paused: this.paused,
            speedLabel: speedLabel,
            shuffle: !!currentGroup?.shuffle
        });
    },

    async render() {
        const wallpaper = this.wallpapers[this.currentIndex];
        if (wallpaper) {
            await renderWallpaperToDOM(wallpaper);
            this.pushState();
        }
    }
};

SlideshowManager.init();

function closeWallpaperPicker() {
    const drawer = document.getElementById('wallpaper-picker-drawer');
    if (!drawer) return;

    drawer.classList.remove('open');
    setTimeout(() => {
        if (!drawer.classList.contains('open')) {
            drawer.style.display = 'none';
            const grid = document.getElementById('wallpaper-picker-grid');
            if (grid) grid.innerHTML = '';
        }
    }, 300);
}

async function exportCurrentWallpaper() {
    if (recentWallpapers.length === 0) {
        showPopup("No wallpaper to export");
        return;
    }

    const current = recentWallpapers[currentWallpaperPosition];
    if (!current.id) return;

    showNotification('Preparing export', { icon: 'ios_share' });

    try {
        const exportObject = {
            version: "1.2",
            type: "guraatmos",
            isSlideshow: !!current.isSlideshow,
            slideshowInterval: current.slideshowInterval || 600000,
            shuffle: !!current.shuffle,
            clockStyles: current.clockStyles,
            widgetLayout: current.widgetLayout,
            items: []
        };

        const itemsToProcess = current.isSlideshow ? current.items : [current];

        for (const item of itemsToProcess) {
            const dbRecord = await getWallpaper(item.id);
            if (!dbRecord) continue;

            const base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                const source = dbRecord.blob || dataURLtoBlob(dbRecord.dataUrl);
                reader.readAsDataURL(source);
            });

            exportObject.items.push({
                wallpaperType: dbRecord.type,
                isVideo: item.isVideo,
                depthEnabled: item.depthEnabled,
                depthDataUrl: dbRecord.depthDataUrl,
                dominantColor: dbRecord.dominantColor,
                imageData: base64Data
            });
        }

        // Provide single imageData at root for legacy compatibility
        if (exportObject.items.length > 0) {
            exportObject.imageData = exportObject.items[0].imageData;
            exportObject.wallpaperType = exportObject.items[0].wallpaperType;
            exportObject.isVideo = exportObject.items[0].isVideo;
        }
		
        const blob = new Blob([JSON.stringify(exportObject)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallpaper_${Date.now()}.guraatmos`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Export failed:", e);
        showDialog({ type: 'alert', title: "Export Failed", message: e.message });
    }
}

async function processWallpaperFiles(files) {
    closeWallpaperPicker();
    if (!files || files.length === 0) return;

    // Check limit: Grouped slideshow counts as 1, otherwise count individual files
    const slotsNeeded = files.length > 1 ? 1 : files.length;
    if (recentWallpapers.length + slotsNeeded > MAX_RECENT_WALLPAPERS) {
		showDialog({ 
			type: 'alert', 
			title: 'Wallpaper storage full', 
			message: `You have reached the limit of ${MAX_RECENT_WALLPAPERS} wallpapers.` 
		});
		return;
    }

	showPopup('Adding wallpaper');

    try {
        const newItems = [];

        for (let file of files) {
            let wallpaperObject = null;

            // --- Handle .guraatmos files ---
            if (file.name.endsWith('.guraatmos')) {
                const text = await file.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    console.error("Invalid GuraAtmosphere file");
                    continue;
                }

                if (data.type !== 'guraatmos') continue;

                const itemsToImport = (data.items && data.items.length > 0) ? data.items : [data];
                const reconstructedItems = [];

                for (const item of itemsToImport) {
                    const wallpaperId = `guraatmos_${Date.now()}_${Math.random()}`;
                    const imageBlob = dataURLtoBlob(item.imageData);
                    let firstFrame = null;
                    let dominantColor = item.dominantColor || null;

                    if (item.wallpaperType.startsWith('video/')) {
                        firstFrame = await extractVideoFrame(imageBlob);
                    } else if (item.wallpaperType.includes('gif') || item.wallpaperType.includes('webp')) {
                        firstFrame = await extractFirstFrame(imageBlob);
                    }

                    if (!dominantColor) {
                        dominantColor = await extractWallpaperColor(firstFrame || imageBlob);
                    }

                    const dbData = {
                        blob: imageBlob,
                        type: item.wallpaperType,
                        clockStyles: data.clockStyles || {},
                        widgetLayout: data.widgetLayout || [],
                        depthDataUrl: item.depthDataUrl || null,
                        depthEnabled: item.depthEnabled || false,
                        firstFrameDataUrl: firstFrame,
                        dominantColor: dominantColor,
                        timestamp: Date.now()
                    };

                    await storeWallpaper(wallpaperId, dbData);

                    reconstructedItems.push({
                        id: wallpaperId,
                        type: item.wallpaperType,
                        isVideo: item.isVideo,
                        timestamp: Date.now(),
                        clockStyles: data.clockStyles,
                        widgetLayout: data.widgetLayout,
                        depthEnabled: item.depthEnabled,
                        dominantColor: dominantColor
                    });
                }

                if (reconstructedItems.length > 1 || data.isSlideshow) {
                    wallpaperObject = {
                        id: `slideshow_${Date.now()}`,
                        isSlideshow: true,
                        slideshowInterval: data.slideshowInterval || 600000,
                        shuffle: !!data.shuffle,
                        items: reconstructedItems,
                        clockStyles: data.clockStyles,
                        widgetLayout: data.widgetLayout,
                        dominantColor: reconstructedItems[0].dominantColor
                    };
                } else {
                    wallpaperObject = reconstructedItems[0];
                }
            } 
            // --- Existing Logic for Standard Images/Videos ---
            else if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                const wallpaperId = `wallpaper_${Date.now()}_${Math.random()}`;
                const isVideo = file.type.startsWith("video/");
                let dbData = { blob: file, type: file.type, clockStyles: resetAndApplyDefaultClockStyles(), widgetLayout: [] };
                
                // Extract Color
                let dominantColor = null;
                let firstFrame = null;
				
                if (isVideo) {
                     try {
                        firstFrame = await extractVideoFrame(file);
                        dbData.firstFrameDataUrl = firstFrame;
                        dominantColor = await extractWallpaperColor(firstFrame);
                     } catch(e) { console.warn("Video process failed", e); }
                } else {
                    if (file.type === 'image/gif' || file.type === 'image/webp') {
                         firstFrame = await extractFirstFrame(file);
                         dbData.firstFrameDataUrl = firstFrame;
                         dominantColor = await extractWallpaperColor(firstFrame);
                    } else {
                         dominantColor = await extractWallpaperColor(file);
                         // Compress static images
                         const compressed = await compressMedia(file);
                         dbData.dataUrl = compressed;
                         delete dbData.blob; 
                    }
                }
                
                dbData.dominantColor = dominantColor;

                await storeWallpaper(wallpaperId, dbData);
                
                wallpaperObject = {
                    id: wallpaperId,
                    type: file.type,
                    isVideo: isVideo,
                    timestamp: Date.now(),
                    clockStyles: dbData.clockStyles,
                    widgetLayout: [],
                    dominantColor: dominantColor 
                };
            }

            if (wallpaperObject) {
                newItems.push(wallpaperObject);
            }
        }

        if (newItems.length > 0) {
            // Logic: Multiple items = Slideshow, Single item = Wallpaper
            if (newItems.length > 1) {
                const slideshowEntry = {
                    id: `slideshow_${Date.now()}`,
                    isSlideshow: true,
                    timestamp: Date.now(),
                    items: newItems,
                    // Inherit properties from first item for preview
                    dominantColor: newItems[0].dominantColor,
                    clockStyles: newItems[0].clockStyles,
                    widgetLayout: []
                };
                
                recentWallpapers.unshift(slideshowEntry);
                localStorage.setItem("wallpapers", JSON.stringify(newItems));
                isSlideshow = true;
                showPopup(currentLanguage.SLIDESHOW_WALLPAPER || "Slideshow created");
            } else {
                recentWallpapers.unshift(newItems[0]);
                localStorage.removeItem("wallpapers");
                isSlideshow = false;
                showPopup(currentLanguage.WALLPAPER_UPDATED);
            }

            // Cleanup old entries
            while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
                let removedWallpaper = recentWallpapers.pop();
                
                if (removedWallpaper.isSlideshow && removedWallpaper.items) {
                    // Cleanup slideshow children
                    for (const item of removedWallpaper.items) {
                        if (item.id) await deleteWallpaper(item.id);
                    }
                } else if (removedWallpaper.id) {
                    // Cleanup single wallpaper
                    await deleteWallpaper(removedWallpaper.id);
                }
            }

            clearInterval(slideshowInterval);
            slideshowInterval = null;

            saveRecentWallpapers();
            currentWallpaperPosition = 0;
            loadWidgets();
            applyWallpaper();
            syncUiStates();
        } else {
            showDialog({ type: 'alert', title: "No valid wallpapers imported." });
        }

    } catch (error) {
        console.error("Error handling wallpapers:", error);
        showDialog({ type: 'alert', title: currentLanguage.WALLPAPER_SAVE_FAIL });
    }
}

/**
 * Replaces an animated image background with its static first frame to pause animation.
 */
async function pauseAnimatedBackground() {
    const wallpaperType = document.body.dataset.wallpaperType;
    if (wallpaperType === 'gif' || wallpaperType === 'webp') {
        const wallpaperId = document.body.dataset.wallpaperId;
        if (wallpaperId) {
            try {
                const wallpaperRecord = await getWallpaper(wallpaperId);
                if (wallpaperRecord && wallpaperRecord.firstFrameDataUrl) {
                    const currentAnimatedUrl = document.body.style.getPropertyValue('--bg-image');
                    if (currentAnimatedUrl.includes('blob:')) {
                        document.body.dataset.animatedImageUrl = currentAnimatedUrl;
                    }
                    document.body.style.setProperty('--bg-image', `url('${wallpaperRecord.firstFrameDataUrl}')`);
                }
            } catch (error) {
                console.error("Failed to pause animated background:", error);
            }
        }
    }
}

/**
 * Restores an animated image background if it was previously paused.
 */
function resumeAnimatedBackground() {
    const wallpaperType = document.body.dataset.wallpaperType;
    if (wallpaperType === 'gif' || wallpaperType === 'webp') {
        const storedAnimatedUrl = document.body.dataset.animatedImageUrl;
        if (storedAnimatedUrl) {
            document.body.style.setProperty('--bg-image', storedAnimatedUrl);
            delete document.body.dataset.animatedImageUrl;
        } else {
            applyWallpaper();
        }
    }
}

/**
 * Extracts the first frame of a GIF or animated WebP as a data URL.
 * @param {File|Blob} file - The image file.
 * @returns {Promise<string>} A promise that resolves with the data URL of the first frame.
 */
function extractFirstFrame(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            
            const dataUrl = canvas.toDataURL("image/png");
            
            URL.revokeObjectURL(url);
            resolve(dataUrl);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };

        img.src = url;
    });
}

/**
 * Smoothly animates the playbackRate of a video element over a given duration.
 * @param {HTMLVideoElement} video - The video element to animate.
 * @param {number} startRate - The starting playback rate.
 * @param {number} endRate - The target playback rate.
 * @param {number} duration - The animation duration in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
function animatePlaybackRate(video, startRate, endRate, duration) {
    // Clear any previous animation interval on this video to prevent conflicts
    if (video.dataset.playbackAnim) clearInterval(Number(video.dataset.playbackAnim));

    return new Promise(resolve => {
        const startTime = performance.now();
		
        const interval = setInterval(() => {
            const now = performance.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Cubic Ease Out
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentRate = startRate + (endRate - startRate) * ease;

            try {
                video.playbackRate = currentRate;
            } catch (e) {
                // Handle case where video is removed from DOM mid-animation
                clearInterval(interval);
                resolve();
                return;
            }

            if (progress >= 1) {
                video.playbackRate = endRate;
                clearInterval(interval);
                delete video.dataset.playbackAnim;
                resolve();
            }
        }, 16); // Target ~60 updates per second independent of render cycle

        video.dataset.playbackAnim = interval.toString();
    });
}

// Compression utility function
async function compressMedia(file) {
    // ALLOW ANIMATED FORMATS TO PASS THROUGH WITHOUT RE-ENCODING
    if (file.type === 'image/gif' || file.type === 'image/webp') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
	
    if (file.type.startsWith("image/")) {
        return new Promise((resolve) => {
            let img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                let canvas = document.createElement("canvas");
                let ctx = canvas.getContext("2d");
                let { width, height } = img;
                
                // Higher resolution limit for better quality
                const maxDimension = 2560;
                if (width > height && width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Use WEBP with higher quality (0.85 instead of 0.7)
                let dataUrl = canvas.toDataURL("image/webp", 0.85);
                
                // Fallback to JPEG if WEBP is not supported
                if (dataUrl.indexOf("data:image/webp") !== 0) {
                    dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                }
                
                URL.revokeObjectURL(img.src);
                resolve(dataUrl);
            };
        });
    }
    
    if (file.type.startsWith("video/")) {
        return URL.createObjectURL(file);
    }
    
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.readAsDataURL(file);
    });
}

// Helper to convert output blob to a compressed WebP string
function blobToCompressedWebP(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            
            // Compress to WebP with 0.85 quality (same as wallpapers)
            const dataUrl = canvas.toDataURL("image/webp", 0.85);
            
            URL.revokeObjectURL(url);
            resolve(dataUrl);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

/**
 * Extracts the first frame of a Video file as a data URL.
 * @param {File|Blob} file - The video file.
 * @returns {Promise<string>} A promise that resolves with the data URL of the first frame.
 */
function extractVideoFrame(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto'; // Need data to render frame
        
        let resolved = false;

        const onComplete = (dataUrl) => {
            if (resolved) return;
            resolved = true;
            URL.revokeObjectURL(video.src);
            video.remove();
            resolve(dataUrl);
        };

        video.onloadeddata = () => {
            // Wait a tick to ensure rendering
            video.currentTime = 0.1; // Seek slightly to ensure frame availability
        };

        video.onseeked = () => {
             try {
                 const canvas = document.createElement('canvas');
                 canvas.width = video.videoWidth;
                 canvas.height = video.videoHeight;
                 const ctx = canvas.getContext('2d');
                 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                 const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                 onComplete(dataUrl);
             } catch (e) {
                 reject(e);
             }
        };

        video.onerror = (e) => {
             if (resolved) return;
             resolved = true;
             URL.revokeObjectURL(video.src);
             reject("Video load error");
        };
        
        video.src = URL.createObjectURL(file);
    });
}

async function saveWallpaper(file, customStyles = null) {
    try {
        const wallpaperId = `wallpaper_${Date.now()}`;

        // Use custom styles if provided, otherwise reset UI to default and get those styles.
        const stylesToApply = customStyles || resetAndApplyDefaultClockStyles();

        // If applying a preset, we need to manually update the UI controls and re-render the clock.
        // This ensures the visuals match immediately, before the new wallpaper is saved and applied.
		if (customStyles) {
            // Manually set the value of each UI control from the preset styles.
            // This avoids dispatching events which could incorrectly save settings to the old wallpaper.
            Object.keys(stylesToApply).forEach(key => {
                const controlId = controlIdMap[key];
                const control = controlId ? document.getElementById(controlId) : null;
                if (!control) return;

                const value = stylesToApply[key];
                if (control.type === 'checkbox' || control.type === 'radio') {
                     control.checked = (value === true || value === 'true');
                } else if (key === 'weight') {
                     control.value = parseInt(value, 10) / 10;
                } else {
                    control.value = value;
                }
            });
            
            const offSwitch = document.getElementById('clock-off-switch');
            if (offSwitch) {
                offSwitch.checked = !(stylesToApply.colorEnabled) && !(stylesToApply.gradientEnabled) && !(stylesToApply.glassEnabled) && !(stylesToApply.clockDynamicFillEnabled);
            }

            // Inject custom CSS/Fonts if provided by the preset
            applyCustomWallpaperStyles(stylesToApply);

            // After updating controls, directly call all rendering functions to apply the new look.
            applyClockLayout();
            applyClockStyles();
            applyWallpaperEffects();
            if (window.refreshClockUI) window.refreshClockUI();
        }

        // Determine Color and Frame
        let dominantColor = null;
        let firstFrame = null;

        if (file.type.startsWith("video/")) {
             try {
                 firstFrame = await extractVideoFrame(file);
                 dominantColor = await extractWallpaperColor(firstFrame);
             } catch (e) { console.warn("Video processing failed", e); }
			
            await storeWallpaper(wallpaperId, {
                blob: file,
                type: file.type,
                clockStyles: stylesToApply,
                widgetLayout: [],
                dominantColor: dominantColor,
                firstFrameDataUrl: firstFrame
            });
            recentWallpapers.unshift({
                id: wallpaperId,
                type: file.type,
                isVideo: true,
                timestamp: Date.now(),
                clockStyles: stylesToApply,
                widgetLayout: [],
                dominantColor: dominantColor
            });
        } else if (file.type === 'image/gif' || file.type === 'image/webp') {
            firstFrame = await extractFirstFrame(file);
            dominantColor = await extractWallpaperColor(firstFrame);
            
            await storeWallpaper(wallpaperId, {
                blob: file,
                type: file.type,
                firstFrameDataUrl: firstFrame,
                clockStyles: stylesToApply,
                widgetLayout: [],
                dominantColor: dominantColor
            });
            recentWallpapers.unshift({
                id: wallpaperId,
                type: file.type,
                isVideo: false,
                timestamp: Date.now(),
                clockStyles: stylesToApply,
                widgetLayout: [],
                dominantColor: dominantColor
            });
        } else {
            // Standard Image
            dominantColor = await extractWallpaperColor(file);
            let compressedData = await compressMedia(file);
            
            await storeWallpaper(wallpaperId, {
                dataUrl: compressedData,
                type: file.type,
                clockStyles: stylesToApply,
                widgetLayout: [],
                dominantColor: dominantColor
            });
            recentWallpapers.unshift({
                id: wallpaperId,
                type: file.type,
                isVideo: false,
                timestamp: Date.now(),
                clockStyles: stylesToApply,
                widgetLayout: [],
                dominantColor: dominantColor
            });
        }
        
        isSlideshow = false;
        localStorage.removeItem("wallpapers");
        
        // Clean up old wallpapers from IndexedDB
        while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
            let removedWallpaper = recentWallpapers.pop();
            if (removedWallpaper.id) {
                await deleteWallpaper(removedWallpaper.id);
            }
        }
        
        saveRecentWallpapers();
        currentWallpaperPosition = 0;
        loadWidgets(); // Load the new empty widget layout
        applyWallpaper();
        showPopup(currentLanguage.WALLPAPER_UPDATED);
	syncUiStates();
    } catch (error) {
        console.error("Error saving wallpaper:", error);
		showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.WALLPAPER_SAVE_FAIL
		});
    }
}

async function renderWallpaperToDOM(wallpaper) {
    if (!wallpaper) return;

    // 1. Color Tinting
    let color = wallpaper.dominantColor;
    if (!color && wallpaper.id) {
        try {
            const data = await getWallpaper(wallpaper.id);
            if (data && data.dominantColor) {
                color = data.dominantColor;
                wallpaper.dominantColor = color;
            }
        } catch(e) {}
    }
    if (color) {
        window.activeWallpaperColor = color;
        applySystemTint();
        if (window.WavesHost) window.WavesHost.pushFullState();
    }

    // 2. Render Media
    try {
        if (wallpaper.isVideo) {
            const videoData = await getWallpaper(wallpaper.id);
            if (videoData && videoData.blob) {
                let existingVideo = document.querySelector("#background-video");
                if (existingVideo) {
                    URL.revokeObjectURL(existingVideo.src);
                    existingVideo.remove();
                }

                const video = document.createElement("video");
                video.id = "background-video";
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                
                const videoUrl = URL.createObjectURL(videoData.blob);
                video.src = videoUrl;
				video.onloadeddata = () => {
                    document.body.insertBefore(video, document.body.firstChild);
                    document.body.style.backgroundImage = "none";
                    document.body.style.removeProperty('--bg-image');
                };
                video.load();

                // Ensure depth layer is cleared for video
                const depthLayer = document.getElementById('depth-layer');
                if (depthLayer) {
                    depthLayer.style.opacity = '0';
                    depthLayer.style.backgroundImage = '';
                }
            }
        } else {
            const imageData = await getWallpaper(wallpaper.id);
            if (imageData) {
                let imageUrl;
                if (imageData.blob) imageUrl = URL.createObjectURL(imageData.blob);
                else if (imageData.dataUrl) imageUrl = imageData.dataUrl;

                if (imageUrl) {
                    let existingVideo = document.querySelector("#background-video");
                    if (existingVideo) {
                        URL.revokeObjectURL(existingVideo.src);
                        existingVideo.remove();
                    }
                    document.body.style.setProperty('--bg-image', `url('${imageUrl}')`);
                    document.body.style.backgroundSize = "cover";
                    document.body.style.backgroundPosition = "center";
                    document.body.style.backgroundRepeat = "no-repeat";

                    if (imageData.type.includes('gif') || imageData.type.includes('webp')) {
                        document.body.dataset.wallpaperType = imageData.type.split('/')[1];
                        document.body.dataset.wallpaperId = wallpaper.id;
                    }
                    
                    // Depth Effect
                    const depthLayer = document.getElementById('depth-layer');
                    if (depthLayer) {
                        if (wallpaper.depthEnabled) {
                            if (imageData.depthDataUrl) {
                                applyDepthLayer(imageData.depthDataUrl);
                            } else {
                                depthLayer.style.opacity = '0';
                                depthLayer.style.backgroundImage = ''; // Clear stale data immediately
                                // Try to generate if enabled but missing
                                setTimeout(processCurrentWallpaperDepth, 100);
                            }
                        } else {
                            depthLayer.style.opacity = '0';
                            depthLayer.style.backgroundImage = '';
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error rendering wallpaper:", e);
    }
}

async function applyWallpaper() {
    applyCustomWallpaperStyles(); 
    resetAutoSleepTimer(); 

    // 1. Cleanup Old Media
    if (document.body.dataset.animatedGifUrl) {
        const oldUrl = document.body.dataset.animatedGifUrl.replace(/url\(['"]?|['"]?\)/g, '');
        URL.revokeObjectURL(oldUrl);
    }
    const oldBg = document.body.style.getPropertyValue('--bg-image');
    if (oldBg.includes('blob:')) {
        URL.revokeObjectURL(oldBg.replace(/url\(['"]?|['"]?\)/g, ''));
    }
    delete document.body.dataset.wallpaperType;
    delete document.body.dataset.wallpaperId;
    delete document.body.dataset.animatedImageUrl;

    // 2. Check Mode
    const slideshowData = JSON.parse(localStorage.getItem("wallpapers"));
    if (slideshowData && slideshowData.length > 0) {
        // Slideshow Mode
        isSlideshow = true;
        SlideshowManager.start();
    } else {
        // Single Mode
        isSlideshow = false;
        SlideshowManager.stop();

        if (recentWallpapers.length > 0 && currentWallpaperPosition < recentWallpapers.length) {
            const currentWallpaper = recentWallpapers[currentWallpaperPosition];
            if (currentWallpaper.clockStyles) {
                applyCustomWallpaperStyles(currentWallpaper.clockStyles);
            }
            await renderWallpaperToDOM(currentWallpaper);
            
            // Sync Waves
            if (window.WavesHost) {
                window.WavesHost.pushFullState();
                window.WavesHost.pushWallpaperUpdate();
            }
        }
    }
    
    // Apply tint (delayed to allow extraction if needed)
    setTimeout(applySystemTint, 100);
}

function ensureVideoLoaded() {
    // Do not attempt to play the video if an app is open
    if (isAppOpen) return;

    const video = document.querySelector('#background-video');
    if (video && video.paused) {
        video.play().catch(err => {
            console.error('Error playing video:', err);
        });
    }
}

// Clean up blob URLs when video element is removed
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
            if (node.id === 'background-video' && node.src) {
                URL.revokeObjectURL(node.src);
            }
        });
    });
});

observer.observe(document.body, { childList: true });

// --- Dynamic Style Manager ---
function applyCustomWallpaperStyles(styles = {}) {
    let styleTag = document.getElementById('custom-wallpaper-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'custom-wallpaper-styles';
        document.head.appendChild(styleTag);
    }

    let css = '';
    // 1. Add @font-face rule if a custom font URL is provided
    if (styles.customFontUrl && styles.customFontName) {
        css += `
            @font-face {
                font-family: '${styles.customFontName}';
                src: url('${styles.customFontUrl}');
            }
        `;
    }

    // 2. Add any raw custom CSS
    if (styles.customCSS) {
        css += styles.customCSS;
    }

    styleTag.textContent = css;
}

async function migrateWallpapersColor() {
    console.log("[System] Checking for wallpaper color migration...");
    let changed = false;

    for (let i = 0; i < recentWallpapers.length; i++) {
        const wp = recentWallpapers[i];
        
        // Force re-extraction if dominantColor is missing OR if it is in the old Array format
        const needsUpdate = !wp.dominantColor || Array.isArray(wp.dominantColor);

        if (needsUpdate && wp.id && !wp.isSlideshow) {
            try {
                const record = await getWallpaper(wp.id);
                if (record && (record.blob || record.dataUrl)) {
                    console.log(`[Migration] Extracting advanced color for ${wp.id}...`);
                    let color = null;
                    
                    if (wp.isVideo) {
                        // Extract frame first
                        let blob = record.blob;
                        if (blob) {
                            try {
                                const frame = await extractVideoFrame(blob);
                                color = await extractWallpaperColor(frame);
                            } catch(e) {}
                        }
                    } else {
                        // Images
                        color = await extractWallpaperColor(record.blob || record.dataUrl);
                    }
                    
                    if (color) {
                        wp.dominantColor = color;
                        record.dominantColor = color;
                        await storeWallpaper(wp.id, record);
                        changed = true;
                    }
                }
            } catch (e) {
                console.warn(`[Migration] Failed for ${wp.id}`, e);
            }
        }
    }

    if (changed) {
        saveRecentWallpapers();
        console.log("[System] Wallpaper color migration complete.");
        
        const current = recentWallpapers[currentWallpaperPosition];
        if (current && current.dominantColor) {
            window.activeWallpaperColor = current.dominantColor;
            applySystemTint();
            if (window.WavesHost) window.WavesHost.pushFullState();
        }
    }
}

// Load recent wallpapers from localStorage on startup
function loadRecentWallpapers() {
  try {
    // --- ONE-TIME MIGRATION FOR OLD LOCALSTORAGE KEYS ---
    const oldKeys = ['clockFont', 'clockWeight', 'clockColor', 'clockColorEnabled', 'clockStackEnabled', 'clockAlignment'];
    oldKeys.forEach(oldKey => {
        if (localStorage.getItem(oldKey) !== null) {
            const newKey = oldKey.replace('clock', '').charAt(0).toLowerCase() + oldKey.replace('clock', '').slice(1);
            localStorage.setItem(newKey, localStorage.getItem(oldKey));
            localStorage.removeItem(oldKey);
        }
    });
	  
    const savedWallpapers = localStorage.getItem('recentWallpapers');
    if (savedWallpapers) {
      recentWallpapers = JSON.parse(savedWallpapers);
      window.recentWallpapers = recentWallpapers; // Sync window property
    }
    
	// Migrate existing wallpapers without clock styles
	const defaultClockStyles = {
	    font: 'Inter',
	    weight: '700',
	    color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff',
	    colorEnabled: false,
	    stackEnabled: false,
	    showSeconds: true,
	    showWeather: true,
        alignment: 'center',
	    clockSize: '0',
	    clockPosX: '50',
	    clockPosY: '50',
	    wallpaperEffects: {
	        light: { blur: '0', brightness: '100', contrast: '100' },
	        dark: { blur: '0', brightness: '100', contrast: '100' }
	    },
        shadowEnabled: false,
        shadowBlur: '10',
        shadowColor: '#000000',
        gradientEnabled: false,
        gradientColor: '#ffffff',
        glassEnabled: false,
        clockDynamicFillEnabled: false,
        roundness: '0',
        letterSpacing: '0',
        textCase: 'none',
        dateSize: '100',
        dateOffset: '0',
		customFontName: null,
        customFontUrl: null,
        customLineHeight: null,
        customCSS: null
	};
    
    let updated = false;
    recentWallpapers.forEach(wallpaper => {
        if (!wallpaper.clockStyles) {
            wallpaper.clockStyles = { ...defaultClockStyles };
            updated = true;
        }
        // Add alignment property to older wallpapers that don't have it
        if (wallpaper.clockStyles.alignment === undefined) {
            wallpaper.clockStyles.alignment = 'center';
            updated = true;
        }
	    if (wallpaper.clockStyles && wallpaper.clockStyles.wallpaperBlur !== undefined && !wallpaper.clockStyles.wallpaperEffects) {
	        wallpaper.clockStyles.wallpaperEffects = {
	            light: {
	                blur: wallpaper.clockStyles.wallpaperBlur,
	                brightness: wallpaper.clockStyles.wallpaperBrightness,
	                contrast: wallpaper.clockStyles.wallpaperContrast
	            },
	            dark: {
	                blur: wallpaper.clockStyles.wallpaperBlur,
	                brightness: wallpaper.clockStyles.wallpaperBrightness,
	                contrast: wallpaper.clockStyles.wallpaperContrast
	            }
	        };
	        delete wallpaper.clockStyles.wallpaperBlur;
	        delete wallpaper.clockStyles.wallpaperBrightness;
	        delete wallpaper.clockStyles.wallpaperContrast;
	        updated = true;
	    }
        if (wallpaper.clockStyles && wallpaper.clockStyles.wallpaperEffects) {
            ['light', 'dark'].forEach(t => {
                if (wallpaper.clockStyles.wallpaperEffects[t].saturate === undefined) { wallpaper.clockStyles.wallpaperEffects[t].saturate = '100'; updated = true; }
                if (wallpaper.clockStyles.wallpaperEffects[t].hue === undefined) { wallpaper.clockStyles.wallpaperEffects[t].hue = '0'; updated = true; }
                if (wallpaper.clockStyles.wallpaperEffects[t].vignette === undefined) { wallpaper.clockStyles.wallpaperEffects[t].vignette = '0'; updated = true; }
            });
        }
        if (wallpaper.clockStyles.clockItalic === undefined) { wallpaper.clockStyles.clockItalic = false; updated = true; }
        if (wallpaper.clockStyles.clockStrokeWidth === undefined) { wallpaper.clockStyles.clockStrokeWidth = '0'; updated = true; }
        if (wallpaper.clockStyles.clockStrokeColor === undefined) { wallpaper.clockStyles.clockStrokeColor = '#000000'; updated = true; }
        if (wallpaper.clockStyles.clockBlendMode === undefined) { wallpaper.clockStyles.clockBlendMode = 'normal'; updated = true; }

        if (wallpaper.clockStyles.shadowEnabled === undefined) {
            wallpaper.clockStyles.shadowEnabled = false;
            wallpaper.clockStyles.shadowBlur = '10';
            wallpaper.clockStyles.shadowColor = '#000000';
            updated = true;
        }
        if (wallpaper.clockStyles.gradientEnabled === undefined) {
            wallpaper.clockStyles.gradientEnabled = false;
            wallpaper.clockStyles.gradientColor = '#ffffff';
            updated = true;
        }
        if (wallpaper.clockStyles.glassEnabled === undefined) {
            wallpaper.clockStyles.glassEnabled = false;
            updated = true;
        }
        if (wallpaper.clockStyles.clockDynamicFillEnabled === undefined) {
            wallpaper.clockStyles.clockDynamicFillEnabled = false;
            updated = true;
		}
        if (wallpaper.clockStyles.roundness === undefined) {
            wallpaper.clockStyles.roundness = '0';
            updated = true;
        }
        if (wallpaper.clockStyles.customFontName === undefined) {
             wallpaper.clockStyles.customFontName = null;
             wallpaper.clockStyles.customFontUrl = null;
             wallpaper.clockStyles.customLineHeight = null;
             wallpaper.clockStyles.customCSS = null;
             updated = true;
        }
        if (wallpaper.clockStyles.dateFormat === undefined) {
            wallpaper.clockStyles.dateFormat = 'ddd MMM D $(separator.dot)$ $(smart)50$';
            wallpaper.clockStyles.clockFormat = 'HH:mm:ss';
            updated = true;
        }
		// Migration for new typography settings
        if (wallpaper.clockStyles.letterSpacing === undefined) {
            wallpaper.clockStyles.letterSpacing = '0';
            wallpaper.clockStyles.textCase = 'none';
            wallpaper.clockStyles.dateSize = '100';
            wallpaper.clockStyles.dateOffset = '0';
            updated = true;
        }
    });
    
    if (updated) {
        saveRecentWallpapers();
    }
    
    // Check if we're in slideshow mode
    const wallpapers = JSON.parse(localStorage.getItem('wallpapers'));
    isSlideshow = wallpapers && wallpapers.length > 0;
    
    // If using a single wallpaper, add it to recent wallpapers if not already there
    if (!isSlideshow) {
      const wallpaperType = localStorage.getItem('wallpaperType');
      const customWallpaper = localStorage.getItem('customWallpaper');
      
      if (wallpaperType && customWallpaper) {
        // Create an entry for the current wallpaper
        const currentWallpaper = {
          type: wallpaperType,
          data: customWallpaper,
          isVideo: wallpaperType.startsWith('video/'),
          timestamp: Date.now()
        };
        
        // Only add if it's not a duplicate
        if (!recentWallpapers.some(wp => wp.data === customWallpaper)) {
          recentWallpapers.unshift(currentWallpaper);
          while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
            recentWallpapers.pop();
          }
          saveRecentWallpapers();
        }
      }
    } else {
      // Add the slideshow as a special entry if not present
      const slideshowEntry = {
        isSlideshow: true,
        timestamp: Date.now()
      };
      
      if (!recentWallpapers.some(wp => wp.isSlideshow)) {
        recentWallpapers.unshift(slideshowEntry);
        while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
          recentWallpapers.pop();
        }
        saveRecentWallpapers();
      }
    }
  } catch (error) {
    console.error('Error loading recent wallpapers:', error);
  }
}

// Save recent wallpapers to localStorage
function saveRecentWallpapers() {
  try {
    localStorage.setItem('recentWallpapers', JSON.stringify(recentWallpapers));
	window.recentWallpapers = recentWallpapers; // Sync window property
  } catch (error) {
    console.error('Error saving recent wallpapers:', error);
	showDialog({ 
		type: 'alert', 
		title: currentLanguage.WALLPAPER_HISTORY_FAIL
	});
  }
}

// --- Wallpaper Switcher Logic ---
let wallpaperPressTimer;
const WALLPAPER_PRESS_DURATION = 500;
let isWallpaperSwitcherOpen = false;

function setupWallpaperInteraction() {
    let startX, startY;

    const startPress = (e) => {
        const t = e.target;
        const isWallpaper = 
            t === document.body ||
            t === document.documentElement ||
            t.id === 'background-video' ||
            t.id === 'depth-layer' ||
            t.id === 'environment-layer' ||
            t.id === 'time-of-day-overlay' ||
            t.id === 'widget-grid' ||
            t.classList.contains('container'); 

        if (!isWallpaper) return;

        // Store start positions to calculate movement jitter
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        wallpaperPressTimer = setTimeout(() => {
            openWallpaperSwitcher();
        }, WALLPAPER_PRESS_DURATION);
    };

    const handleMove = (e) => {
        if (!wallpaperPressTimer) return;
        
        const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const cy = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        // Calculate distance from start
        const dist = Math.sqrt(Math.pow(cx - startX, 2) + Math.pow(cy - startY, 2));

        // FIX: Only cancel if user moves more than 10px (Deadzone for jitters)
        if (dist > 10) {
            clearTimeout(wallpaperPressTimer);
            wallpaperPressTimer = null;
        }
    };

    const cancelPress = () => {
        clearTimeout(wallpaperPressTimer);
        wallpaperPressTimer = null;
    };

    window.addEventListener('mousedown', startPress);
    window.addEventListener('touchstart', startPress, { passive: true });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('mouseup', cancelPress);
    window.addEventListener('touchend', cancelPress);
}

// Run this on load
setupWallpaperInteraction();

function openWallpaperSwitcher() {
    isWallpaperSwitcherOpen = true;
    const overlay = document.getElementById('wallpaper-switcher-overlay');
    
    // Prevent right click on the switcher
    overlay.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
    const container = document.getElementById('wallpaper-cards-container');
    
    // Block pointer events temporarily (200ms) to prevent the "release" of the long-press 
    // from being registered as a click on the card that appears.
    overlay.style.pointerEvents = 'none';
    setTimeout(() => {
        if(isWallpaperSwitcherOpen) overlay.style.pointerEvents = 'auto';
    }, 200);

    // Hide UI
    document.querySelector('.container').classList.add('force-hide');
    document.getElementById('dock').classList.remove('show');

    // Render Cards
    renderSwitcherCards(container, true);
    
    // Setup Scrollbar & Wheel
    setupSwitcherScrolling(container);

    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('visible'), 10);
}

function setupSwitcherScrolling(container) {
    const track = document.getElementById('switcher-track');
    const thumb = document.getElementById('switcher-thumb');

    // 1. Mouse Wheel -> Horizontal Scroll (Vertical delta drives Horizontal scroll)
    // Removed existing onwheel to replace with addEventListener for better control if needed
    container.onwheel = (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            // Scroll 3x faster than standard for snappier feel through cards
            container.scrollLeft += e.deltaY;
        }
    };

    // 2. Update Thumb Position on Scroll
    const updateThumb = () => {
        // Calculate scroll percentage
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        if (maxScrollLeft <= 0) {
            thumb.style.width = '100%';
            thumb.style.transform = `translateX(0px)`;
            return;
        }
        
        const scrollRatio = container.scrollLeft / maxScrollLeft;
        const trackWidth = track.clientWidth;
        
        // Dynamic thumb size based on content ratio
        const thumbWidth = Math.max(30, (container.clientWidth / container.scrollWidth) * trackWidth);
        thumb.style.width = `${thumbWidth}px`;
        
        const maxTranslate = trackWidth - thumbWidth;
        const translate = scrollRatio * maxTranslate;
        
        thumb.style.transform = `translateX(${translate}px)`;
    };

    container.onscroll = updateThumb;
    // Initial calc and resize listener
    setTimeout(updateThumb, 0);
    window.addEventListener('resize', updateThumb);

    // 3. Drag Logic (Mouse & Touch)
    let isDraggingThumb = false;
    let startX = 0;
    let startScrollLeft = 0;

    const handleDragStart = (clientX) => {
        isDraggingThumb = true;
        startX = clientX;
        startScrollLeft = container.scrollLeft;
        thumb.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none'; // Prevent selection while dragging
    };

    const handleDragMove = (clientX) => {
        if (!isDraggingThumb) return;
        
        const delta = clientX - startX;
        const trackWidth = track.clientWidth;
        const thumbWidth = thumb.clientWidth;
        const maxTranslate = trackWidth - thumbWidth;
        
        if (maxTranslate <= 0) return;

        // Calculate percentage moved relative to track
        const moveRatio = delta / maxTranslate;
        
        // Apply to scroll container
        const maxScroll = container.scrollWidth - container.clientWidth;
        container.scrollLeft = startScrollLeft + (moveRatio * maxScroll);
    };

    const handleDragEnd = () => {
        if (isDraggingThumb) {
            isDraggingThumb = false;
            thumb.style.cursor = 'grab';
            document.body.style.userSelect = '';
        }
    };

    // Mouse Events
    thumb.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent card clicks
        handleDragStart(e.clientX);
    });
    
    // Touch Events
    thumb.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default scroll
        e.stopPropagation();
        handleDragStart(e.touches[0].clientX);
    }, { passive: false });

    // Global Move/Up (Passive: false for touch to prevent scrolling page)
    window.addEventListener('mousemove', (e) => handleDragMove(e.clientX));
    window.addEventListener('touchmove', (e) => {
        if (isDraggingThumb) e.preventDefault();
        handleDragMove(e.touches[0].clientX);
    }, { passive: false });

    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
}

function closeWallpaperSwitcher() {
    isWallpaperSwitcherOpen = false;
    const overlay = document.getElementById('wallpaper-switcher-overlay');
    overlay.classList.remove('visible');
    
    setTimeout(() => {
        overlay.style.display = 'none';
        document.getElementById('wallpaper-cards-container').innerHTML = '';
        // Restore UI
        document.querySelector('.container').classList.remove('force-hide');
	    document.querySelector('.widget-grid').classList.remove('force-hide');
        updateDockVisibility();
    }, 300);
}

function renderSwitcherCards(container, isInitialOpen = false) {
    container.innerHTML = '';
    
    recentWallpapers.forEach((wp, index) => {
        const card = document.createElement('div');
        card.className = `switcher-card ${index === currentWallpaperPosition ? 'active' : ''}`;
        
        // Background preview
        let previewId = wp.id;
        let isVid = wp.isVideo;

        if (wp.isSlideshow && wp.items && wp.items.length > 0) {
            previewId = wp.items[0].id;
            isVid = wp.items[0].isVideo;
        }

        if (previewId) {
            // Async fetch for images/video thumbs
            getWallpaper(previewId).then(data => {
                if (data) {
                    const src = data.dataUrl || (data.blob ? URL.createObjectURL(data.blob) : '');
                    // Ideally use firstFrameDataUrl for video
                    const bgSrc = (isVid && data.firstFrameDataUrl) ? data.firstFrameDataUrl : src;
                    card.style.backgroundImage = `url('${bgSrc}')`;
                }
            });
        }

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.className = 'switcher-edit-btn';
        editBtn.innerHTML = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof enterEditMode === 'function') {
                enterEditMode(index);
            }
        };
        
        // Active Check
        if (index === currentWallpaperPosition) {
            const check = document.createElement('div');
            check.className = 'switcher-check';
            check.innerHTML = '<span class="material-symbols-rounded">check</span>';
            card.appendChild(check);
        }

        // Click to select
        card.onclick = () => {
            jumpToWallpaper(index);
            renderSwitcherCards(container); // Re-render to update active state
			setTimeout(() => {
				closeWallpaperSwitcher(); 
			}, 600);
        };

        card.appendChild(editBtn);
        container.appendChild(card);
    });
	
	// Scroll to active (Instant on entry, Smooth on update)
    setTimeout(() => {
        const activeCard = container.querySelector('.switcher-card.active');
        if (activeCard) {
            activeCard.scrollIntoView({ 
                behavior: isInitialOpen ? 'auto' : 'smooth', 
                inline: 'center' 
            });
        }
    }, 0);
}

// --- Edit Menu (Replace Image) ---
async function openWallpaperEditMenu(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        showPopup("Updating wallpaper");

        try {
            const wp = recentWallpapers[index];
            const processedItems = [];

            // If it was a slideshow, clean up old children first
            if (wp.isSlideshow && wp.items) {
                for (const item of wp.items) await deleteWallpaper(item.id);
            } else if (wp.id) {
                await deleteWallpaper(wp.id);
            }

            for (const file of files) {
                const wallpaperId = `wallpaper_${Date.now()}_${Math.random()}`;
                const isVideo = file.type.startsWith("video/");
                let dbData = { blob: file, type: file.type, clockStyles: wp.clockStyles, widgetLayout: [] };
                
                let dominantColor = null;
                let firstFrame = null;
                
                if (isVideo) {
                    firstFrame = await extractVideoFrame(file);
                    dbData.firstFrameDataUrl = firstFrame;
                    dominantColor = await extractWallpaperColor(firstFrame);
                } else {
                    if (file.type === 'image/gif' || file.type === 'image/webp') {
                        firstFrame = await extractFirstFrame(file);
                        dbData.firstFrameDataUrl = firstFrame;
                        dominantColor = await extractWallpaperColor(firstFrame);
                    } else {
                        dominantColor = await extractWallpaperColor(file);
                        dbData.dataUrl = await compressMedia(file);
                        delete dbData.blob;
                    }
                }
                dbData.dominantColor = dominantColor;
                await storeWallpaper(wallpaperId, dbData);
                
                processedItems.push({
                    id: wallpaperId,
                    type: file.type,
                    isVideo: isVideo,
                    dominantColor: dominantColor,
                    clockStyles: wp.clockStyles,
                    widgetLayout: wp.widgetLayout,
                    depthEnabled: false
                });
            }

            if (processedItems.length > 1) {
                recentWallpapers[index] = {
                    ...wp,
                    isSlideshow: true,
                    items: processedItems,
                    dominantColor: processedItems[0].dominantColor
                };
            } else {
                recentWallpapers[index] = processedItems[0];
            }
            
            saveRecentWallpapers();
            if (index === currentWallpaperPosition) applyWallpaper();
            
            renderSwitcherCards(document.getElementById('wallpaper-cards-container'), false);
            showPopup(processedItems.length > 1 ? "Slideshow updated" : "Wallpaper updated");

        } catch (error) {
            console.error(error);
            showDialog({type:'alert', title:'Update Failed'});
        }
    };
    input.click();
}

// --- Edit Mode Logic ---
let editModeWallpaperIndex = -1;

function enterEditMode(index) {
    closeWallpaperSwitcher(); // Close the switcher overlay
    
    editModeWallpaperIndex = index;
    jumpToWallpaper(index);
    
    document.body.classList.add('edit-mode-active');
    const editUI = document.getElementById('edit-mode-ui');
    editUI.style.display = 'block';
    
    setupEditSheetDrag();

    requestAnimationFrame(() => {
        editUI.style.opacity = '1';
    });

    openEditSheet('background');

    showPopup('Tap an element to view its settings')
}

function exitEditMode() {
    document.body.classList.remove('edit-mode-active');
    const editUI = document.getElementById('edit-mode-ui');
    editUI.style.opacity = '0';
    closeEditSheet();
    
    setTimeout(() => {
        editUI.style.display = 'none';
        saveWidgets();
    }, 300);
}

function openEditSheet(target) {
    document.querySelectorAll('#clock, .info').forEach(el => el.classList.remove('edit-selected'));
    if (target === 'clock') document.getElementById('clock').classList.add('edit-selected');
    if (target === 'date') document.querySelector('.info').classList.add('edit-selected');

    const sheet = document.getElementById('edit-bottom-sheet');
    document.getElementById('edit-group-clock').style.display = target === 'clock' ? 'block' : 'none';
    document.getElementById('edit-group-date').style.display = target === 'date' ? 'block' : 'none';
    document.getElementById('edit-group-background').style.display = target === 'background' ? 'block' : 'none';
    
    const titles = {
        'clock': 'Clock',
        'date': 'Date',
        'background': 'Home screen'
    };
    document.getElementById('edit-sheet-title').textContent = titles[target];

    sheet.classList.add('open');
    sheet.style.transform = 'translateY(0) translateX(-50%)'; // Ensure it's visible if dragged down
}

function closeEditSheet() {
    const sheet = document.getElementById('edit-bottom-sheet');
    if (sheet) {
        sheet.classList.remove('open');
        sheet.style.transform = 'translateY(100%) translateX(-50%)';
    }
    document.querySelectorAll('#clock, .info').forEach(el => el.classList.remove('edit-selected'));
}

function setupEditSheetDrag() {
    const sheet = document.getElementById('edit-bottom-sheet');
    const handle = document.getElementById('edit-sheet-handle');
    if (!sheet || !handle) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onDragStart = (y) => {
        startY = y;
        isDragging = true;
        sheet.style.transition = 'none';
    };

    const onDragMove = (y) => {
        if (!isDragging) return;
        currentY = y;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            sheet.style.transform = `translateY(${deltaY}px) translateX(-50%)`;
        }
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.2, 1.3, 0.64, 1)';
        const deltaY = currentY - startY;
        if (deltaY > 100) {
            closeEditSheet();
        } else {
            sheet.style.transform = 'translateY(0) translateX(-50%)';
        }
    };

    // Remove old listeners to prevent duplicates
    const newHandle = handle.cloneNode(true);
    handle.parentNode.replaceChild(newHandle, handle);

    newHandle.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientY), { passive: true });
    newHandle.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientY), { passive: true });
    newHandle.addEventListener('touchend', onDragEnd);
    
    const mouseMoveHandler = (e) => onDragMove(e.clientY);
    const mouseUpHandler = () => {
        onDragEnd();
        window.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
    };
    
    newHandle.addEventListener('mousedown', (e) => {
        onDragStart(e.clientY);
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
    });
}

// Add these variables to track the indicator
let pageIndicatorTimeout;
const INDICATOR_TIMEOUT = 5000; // 5 seconds
let indicatorActive = false; // Flag to track if indicator interaction is happening

// Variables for dot dragging
let isDragging = false;
let dragIndex = -1;
let dragStartX = 0;
let dragCurrentX = 0;
let lastTapTime = 0;
let tapCount = 0;
let tapTimer = null;
let tapTargetIndex = -1;

function initializeWallpaperTracking() {
  // If not already initialized, set up wallpaper position
  if (currentWallpaperPosition === undefined) {
    currentWallpaperPosition = 0;
  }
  
  // Store the actual order in local storage
  if (!localStorage.getItem('wallpaperOrder')) {
    localStorage.setItem('wallpaperOrder', JSON.stringify({
      position: currentWallpaperPosition,
      timestamp: Date.now()
    }));
  }
}

// Create the page indicator once and update it as needed
function initializePageIndicator() {
  // Create indicator only if it doesn't exist
  if (!document.getElementById('page-indicator')) {
    const pageIndicator = document.createElement('div');
    pageIndicator.id = 'page-indicator';
    pageIndicator.className = 'page-indicator';
    document.body.appendChild(pageIndicator);
    
    // Initial creation of dots
    updatePageIndicatorDots(true);
  } else {
    // Just update dot states
    updatePageIndicatorDots(false);
  }
  
  resetIndicatorTimeout();
}

// Update only the contents of the indicator
function updatePageIndicatorDots(forceRecreate = false) {
  const pageIndicator = document.getElementById('page-indicator');
  if (!pageIndicator) return;
  
  // Make sure any fade-out class is removed when updating
  pageIndicator.classList.remove('fade-out');
  
  // If no wallpapers or only one, show empty/single state
  if (recentWallpapers.length <= 1) {
    // Clear existing content
    pageIndicator.innerHTML = '';
    
    if (recentWallpapers.length === 0) {
      // Empty state - no wallpapers
      const emptyText = document.createElement('span');
      emptyText.className = 'empty-indicator';
      emptyText.textContent = currentLanguage.N_WALL;
      pageIndicator.appendChild(emptyText);
      pageIndicator.classList.add('empty');
    } else {
      // Single wallpaper state
      pageIndicator.classList.remove('empty');
      const dot = document.createElement('span');
      dot.className = 'indicator-dot active';
      dot.dataset.index = 0;
      
      // Add triple tap detection for removal
      dot.addEventListener('mousedown', (e) => handleDotTap(e, 0));
      dot.addEventListener('touchstart', (e) => handleDotTap(e, 0));
      
      pageIndicator.appendChild(dot);
    }
    return;
  }
  
  // Normal case - multiple wallpapers
  pageIndicator.classList.remove('empty');
  
  // If number of dots doesn't match or forced recreation, recreate all dots
  const existingDots = pageIndicator.querySelectorAll('.indicator-dot');
  if (forceRecreate || existingDots.length !== recentWallpapers.length) {
    // Clear existing content
    pageIndicator.innerHTML = '';
    
    // Create dots for each wallpaper in history, in the correct order
    for (let i = 0; i < recentWallpapers.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'indicator-dot';
      dot.dataset.index = i;
      
      if (i === currentWallpaperPosition) {
        dot.classList.add('active');
      }
      
      // Add click event to jump to specific wallpaper
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        // Only jump if we weren't dragging
        if (!isDragging) {
          jumpToWallpaper(i);
        }
      });
      
      // Add drag event listeners
      dot.addEventListener('mousedown', (e) => handleDotDragStart(e, i));
      dot.addEventListener('touchstart', (e) => handleDotDragStart(e, i));
      
      // Add triple tap detection
      dot.addEventListener('mousedown', (e) => handleDotTap(e, i));
      dot.addEventListener('touchstart', (e) => handleDotTap(e, i));
      
      pageIndicator.appendChild(dot);
    }
  } else {
    // Just update active state of existing dots
    existingDots.forEach((dot, i) => {
      if (i === currentWallpaperPosition) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
}

function updatePageIndicator() {
  initializePageIndicator();
}

function saveCurrentPosition() {
  localStorage.setItem('wallpaperOrder', JSON.stringify({
    position: currentWallpaperPosition,
    timestamp: Date.now()
  }));
}

function loadSavedPosition() {
  const savedOrder = localStorage.getItem('wallpaperOrder');
  if (savedOrder) {
    try {
      const orderData = JSON.parse(savedOrder);
      if (orderData.position !== undefined && 
          orderData.position >= 0 && 
          orderData.position < recentWallpapers.length) {
        currentWallpaperPosition = orderData.position;
      }
    } catch(e) {
      console.error('Error parsing saved wallpaper position', e);
    }
  }
}

// Create a new function to manage the indicator timeout
function resetIndicatorTimeout() {
  // Clear any existing timeout
  clearTimeout(pageIndicatorTimeout);
  
  const pageIndicator = document.getElementById('page-indicator');
  if (!pageIndicator) return;

  // 1. Check if an app is open (foreground)
  const isAppOpen = !!document.querySelector('.fullscreen-embed[style*="display: block"]');
  
  // 2. Check if the app drawer is open
  const isDrawerOpen = document.getElementById('app-drawer')?.classList.contains('open');

  // 3. Check if Donburi is open
  const isDonburiOpen = document.getElementById('donburi-container')?.classList.contains('open');

  // 3. If either is true, force hide the indicator immediately
  if (isAppOpen || isDrawerOpen || isDonburiOpen) {
      pageIndicator.classList.remove('persistent-mode');
      pageIndicator.classList.add('fade-out');
      return;
  }

  // Only proceed with standard logic if not dragging dots
  if (!isDragging) {
      const isPersistent = localStorage.getItem('persistentPageIndicator') === 'true';
      
      if (isPersistent) {
          // Persistent Mode: Show and scale up
          pageIndicator.classList.remove('fade-out');
          pageIndicator.classList.add('persistent-mode');
          return; 
      }

      // Normal Mode: Ensure standard size, show, then schedule fade out
      pageIndicator.classList.remove('persistent-mode');
      pageIndicator.classList.remove('fade-out');
      
      pageIndicatorTimeout = setTimeout(() => {
        if (pageIndicator) {
          pageIndicator.classList.add('fade-out');
        }
      }, INDICATOR_TIMEOUT);
  }
}

// Handle triple tap on dots to remove wallpaper
async function handleDotTap(e, index) {
  e.stopPropagation();
  
  const now = Date.now();
  
  // Check if tapping the same dot
  if (index === tapTargetIndex) {
    if (now - lastTapTime < 500) { // 500ms between taps
      tapCount++;
      
		// If triple tap detected
		if (tapCount === 3) {
			if (await showCustomConfirm(currentLanguage.WALLPAPER_REMOVE_CONFIRM || 'Delete this wallpaper?', '', 'filter_vintage')) {
				await removeWallpaper(index);
			}
			tapCount = 0;
		}
    } else {
      // Too slow, reset counter
      tapCount = 1;
    }
  } else {
    // Tapping a different dot
    tapCount = 1;
    tapTargetIndex = index;
  }
  
  lastTapTime = now;
  
  // Clear existing timeout
  if (tapTimer) {
    clearTimeout(tapTimer);
  }
  
  // Set timeout to reset tap count
  tapTimer = setTimeout(() => {
    tapCount = 0;
  }, 500);
}

// Function to remove a wallpaper
async function removeWallpaper(index) {
    let wallpaperToRemove = recentWallpapers[index];
    
    // Clean up from IndexedDB
    if (wallpaperToRemove.isSlideshow && wallpaperToRemove.items) {
        // Cleanup slideshow children
        for (const item of wallpaperToRemove.items) {
            if (item.id) await deleteWallpaper(item.id);
        }
    } else if (wallpaperToRemove.id) {
        await deleteWallpaper(wallpaperToRemove.id);
    }
    
    recentWallpapers.splice(index, 1);
    localStorage.setItem("recentWallpapers", JSON.stringify(recentWallpapers));
    
    if (recentWallpapers.length === 0) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        isSlideshow = false;
        localStorage.removeItem("wallpapers");
        localStorage.removeItem("wallpaperOrder");
        currentWallpaperPosition = 0;
        localStorage.setItem("wallpaperType", "default");
        applyWallpaper();
        showPopup(currentLanguage.ALL_WALLPAPER_REMOVE);
        updatePageIndicatorDots(true);
        return;
    }
    
    if (index === currentWallpaperPosition) {
        currentWallpaperPosition = Math.max(0, currentWallpaperPosition - 1);
        saveCurrentPosition();
        // FIX: Pass true to skip saving widgets, as activeWidgets currently holds data for the DELETED wallpaper
        switchWallpaper("none", true);
    } else if (index < currentWallpaperPosition) {
        currentWallpaperPosition--;
        saveCurrentPosition();
    }
    
    showPopup(currentLanguage.WALLPAPER_REMOVE);
    updatePageIndicatorDots(true);
    resetIndicatorTimeout();
    syncUiStates();
}

// Handle start of dragging a dot
function handleDotDragStart(e, index) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dragIndex = index;

    // Cancel any pending timeout when dragging starts
    clearTimeout(pageIndicatorTimeout);
    
    // Make sure indicator is visible (remove fade-out if present)
    const pageIndicator = document.getElementById('page-indicator');
    if (pageIndicator) {
        pageIndicator.classList.remove('fade-out');
    }

    // Get initial position
    if (e.type === 'touchstart') {
        dragStartX = e.touches[0].clientX;
    } else {
        dragStartX = e.clientX;
    }

    // Add global event listeners for move and end
    document.addEventListener('mousemove', handleDotDragMove);
    document.addEventListener('touchmove', handleDotDragMove, { passive: false });
    document.addEventListener('mouseup', handleDotDragEnd);
    document.addEventListener('touchend', handleDotDragEnd);

    // Add dragging class to the dot
    const dot = document.querySelector(`.indicator-dot[data-index="${index}"]`);
    if (dot) {
        dot.classList.add('dragging');
    }
}

// Handle moving a dot during drag
function handleDotDragMove(e) {
  e.preventDefault();
  
  if (!isDragging) return;
  
  // Get current position
  if (e.type === 'touchmove') {
    dragCurrentX = e.touches[0].clientX;
  } else {
    dragCurrentX = e.clientX;
  }
  
  const distance = dragCurrentX - dragStartX;
  
  // Get all dots
  const dots = document.querySelectorAll('.indicator-dot');
  const dotWidth = dots[0] ? dots[0].offsetWidth : 0;
  const dotSpacing = 10; // Gap between dots
  
  // Calculate the offset
  const offsetX = distance;
  
  // Move the dot being dragged
  const draggedDot = document.querySelector(`.indicator-dot[data-index="${dragIndex}"]`);
  if (draggedDot) {
    draggedDot.style.transform = `translateX(${offsetX}px) scale(1.3)`;
    
    // Check if we need to reorder
    const dotSize = dotWidth + dotSpacing;
    const shift = Math.round(offsetX / dotSize);
    
    if (shift !== 0) {
      const newIndex = Math.max(0, Math.min(recentWallpapers.length - 1, dragIndex + shift));
      
      if (newIndex !== dragIndex) {
        // Update the visual order
        dots.forEach((dot, i) => {
          const index = parseInt(dot.dataset.index);
          if (index === dragIndex) return; // Skip the dragged dot
          
          if ((index > dragIndex && index <= newIndex) || 
              (index < dragIndex && index >= newIndex)) {
            // Move dots that are between old and new position
            const direction = index > dragIndex ? -1 : 1;
            dot.style.transform = `translateX(${direction * dotSize}px)`;
          } else {
            dot.style.transform = '';
          }
        });
      }
    }
  }
}

// Handle end of dragging a dot
function handleDotDragEnd(e) {
  if (!isDragging) return;
  
  // Get final position
  let endX;
  if (e.type === 'touchend') {
    endX = e.changedTouches[0].clientX;
  } else {
    endX = e.clientX;
  }
  
  const distance = endX - dragStartX;
  const dots = document.querySelectorAll('.indicator-dot');
  const dotWidth = dots[0] ? dots[0].offsetWidth : 0;
  const dotSpacing = 10;
  const dotSize = dotWidth + dotSpacing;
  const shift = Math.round(distance / dotSize);
  
  let newIndex = Math.max(0, Math.min(recentWallpapers.length - 1, dragIndex + shift));
  
  // Only do something if the index changed
  if (newIndex !== dragIndex) {
    // Reorder wallpapers in the array
    const [movedWallpaper] = recentWallpapers.splice(dragIndex, 1);
    recentWallpapers.splice(newIndex, 0, movedWallpaper);
    
    // Update local storage
    localStorage.setItem('recentWallpapers', JSON.stringify(recentWallpapers));
    
    // Update current position if needed
    if (currentWallpaperPosition === dragIndex) {
      currentWallpaperPosition = newIndex;
    } else if (
      (currentWallpaperPosition > dragIndex && currentWallpaperPosition <= newIndex) || 
      (currentWallpaperPosition < dragIndex && currentWallpaperPosition >= newIndex)
    ) {
      // Adjust current position if it was in the moved range
      currentWallpaperPosition += (dragIndex > newIndex ? 1 : -1);
    }
    
    // Save the updated position
    saveCurrentPosition();
    
    // Force recreate the dots due to reordering
    updatePageIndicatorDots(true);
  } else {
    // Clean up any dragging visual states
    const draggedDot = document.querySelector(`.indicator-dot[data-index="${dragIndex}"]`);
    if (draggedDot) {
      draggedDot.classList.remove('dragging');
      draggedDot.style.transform = '';
    }
    
    // Reset any other dots that might have been moved
    dots.forEach(dot => {
      dot.style.transform = '';
    });
    
    // Update active state
    updatePageIndicatorDots(false);
  }
  
  // Clean up
  document.removeEventListener('mousemove', handleDotDragMove);
  document.removeEventListener('touchmove', handleDotDragMove);
  document.removeEventListener('mouseup', handleDotDragEnd);
  document.removeEventListener('touchend', handleDotDragEnd);
  
  // Reset state
  isDragging = false;
  dragIndex = -1;
  
  resetIndicatorTimeout();
}

// New function to jump to a specific wallpaper by index
async function jumpToWallpaper(index) {
    if (index < 0 || index >= recentWallpapers.length || index === currentWallpaperPosition) return;

    // Save the widget layout for the current wallpaper before switching
    saveWidgets();
    
    currentWallpaperPosition = index;
    saveCurrentPosition();
    
    let wallpaper = recentWallpapers[currentWallpaperPosition];

    activeWidgets = wallpaper.widgetLayout || [];
    
    if (wallpaper.clockStyles) {
        // Update UI elements
        const fontSelect = document.getElementById('font-select');
        const weightSlider = document.getElementById('weight-slider');
        const colorPicker = document.getElementById('clock-color-picker');
        const colorSwitch = document.getElementById('clock-color-switch');
        const stackSwitch = document.getElementById('clock-stack-switch');
        const secondsSwitch = document.getElementById('seconds-switch');
        const weatherSwitch = document.getElementById('weather-switch');
        const alignmentSelect = document.getElementById('alignment-select');
	    const blurSlider = document.getElementById('wallpaper-blur-slider');
	    const brightnessSlider = document.getElementById('wallpaper-brightness-slider');
	    const contrastSlider = document.getElementById('wallpaper-contrast-slider');
        const shadowSwitch = document.getElementById('clock-shadow-switch');
        const shadowBlurSlider = document.getElementById('clock-shadow-blur-slider');
        const shadowColorPicker = document.getElementById('clock-shadow-color-picker');
        const gradientSwitch = document.getElementById('clock-gradient-switch');
        const gradientColorPicker = document.getElementById('clock-gradient-color-picker');
        const italicSwitch = document.getElementById('clock-italic-switch');
        const strokeWidthSlider = document.getElementById('clock-stroke-width-slider');
        const strokeColorPicker = document.getElementById('clock-stroke-color-picker');
        const blendModeSelect = document.getElementById('clock-blend-mode-select');
        const saturateSlider = document.getElementById('wallpaper-saturate-slider');
        const hueSlider = document.getElementById('wallpaper-hue-slider');
        const vignetteSlider = document.getElementById('wallpaper-vignette-slider');
	    const roundnessSlider = document.getElementById('roundness-slider');
	    const sizeSlider = document.getElementById('clock-size-slider');
	    const posXSlider = document.getElementById('clock-pos-x-slider');
	    const posYSlider = document.getElementById('clock-pos-y-slider');
	    const clockFormatInput = document.getElementById('clock-format-input');
        const dateFormatInput = document.getElementById('date-format-input');
        
        if (fontSelect) fontSelect.value = wallpaper.clockStyles.font || 'Inter';
        if (weightSlider) weightSlider.value = parseInt(wallpaper.clockStyles.weight || '700') / 10;
        if (colorPicker) colorPicker.value = wallpaper.clockStyles.color || '#ffffff';
        if (colorSwitch) colorSwitch.checked = wallpaper.clockStyles.colorEnabled || false;
        if (stackSwitch) stackSwitch.checked = wallpaper.clockStyles.stackEnabled || false;
	    if (roundnessSlider) roundnessSlider.value = wallpaper.clockStyles.roundness || '0';
        if (document.getElementById('clock-spacing-slider')) document.getElementById('clock-spacing-slider').value = wallpaper.clockStyles.letterSpacing || '0';
        if (document.getElementById('text-case-select')) document.getElementById('text-case-select').value = wallpaper.clockStyles.textCase || 'none';
        if (document.getElementById('date-size-slider')) document.getElementById('date-size-slider').value = wallpaper.clockStyles.dateSize || '100';
        if (document.getElementById('date-offset-slider')) document.getElementById('date-offset-slider').value = wallpaper.clockStyles.dateOffset || '0';
        if (italicSwitch) italicSwitch.checked = wallpaper.clockStyles.clockItalic || false;
        if (strokeWidthSlider) strokeWidthSlider.value = wallpaper.clockStyles.clockStrokeWidth || '0';
        if (strokeColorPicker) strokeColorPicker.value = wallpaper.clockStyles.clockStrokeColor || '#000000';
        if (blendModeSelect) blendModeSelect.value = wallpaper.clockStyles.clockBlendMode || 'normal';

	    const isLightMode = document.body.classList.contains('light-theme');
	    const theme = isLightMode ? 'light' : 'dark';
	    const effects = wallpaper.clockStyles?.wallpaperEffects?.[theme] || { blur: '0', brightness: '100', contrast: '100' };

        if (saturateSlider) saturateSlider.value = effects.saturate !== undefined ? effects.saturate : '100';
        if (hueSlider) hueSlider.value = effects.hue !== undefined ? effects.hue : '0';
        if (vignetteSlider) vignetteSlider.value = effects.vignette !== undefined ? effects.vignette : '0';
	    if (sizeSlider) sizeSlider.value = wallpaper.clockStyles.clockSize || '0';
	    if (posXSlider) posXSlider.value = wallpaper.clockStyles.clockPosX || '50';
	    if (posYSlider) posYSlider.value = wallpaper.clockStyles.clockPosY || '50';
	    if (alignmentSelect) alignmentSelect.value = wallpaper.clockStyles.alignment || 'center';
        if (dateFormatInput) dateFormatInput.value = wallpaper.clockStyles.dateFormat || 'ddd MMM D $(separator.dot)$ $(smart)50$';
        if (clockFormatInput) clockFormatInput.value = wallpaper.clockStyles.clockFormat || (document.getElementById('hour-switch').checked ? 'h:mm:ss A' : 'HH:mm:ss');

		if (document.getElementById('depth-effect-switch')) {
            document.getElementById('depth-effect-switch').checked = wallpaper.depthEnabled || false;
        }
		
        if (secondsSwitch) {
            secondsSwitch.checked = wallpaper.clockStyles.showSeconds !== false;
            showSeconds = secondsSwitch.checked;
        }
        
        if (weatherSwitch) {
            weatherSwitch.checked = wallpaper.clockStyles.showWeather !== false;
            // FIX: Manually update state and UI instead of dispatching a generic event
            showWeather = weatherSwitch.checked;
            updateWeatherVisibility();
        }
        
        if (alignmentSelect) {
            alignmentSelect.value = wallpaper.clockStyles.alignment || 'center';
        }

	    // Update effect sliders based on current theme
	    if (blurSlider) blurSlider.value = effects.blur;
	    if (brightnessSlider) brightnessSlider.value = effects.brightness;
	    if (contrastSlider) contrastSlider.value = effects.contrast;
		
        if (shadowSwitch) shadowSwitch.checked = wallpaper.clockStyles.shadowEnabled || false;
        if (shadowBlurSlider) shadowBlurSlider.value = wallpaper.clockStyles.shadowBlur || '10';
        if (shadowColorPicker) shadowColorPicker.value = wallpaper.clockStyles.shadowColor || '#000000';
		if (gradientSwitch) gradientSwitch.checked = wallpaper.clockStyles.gradientEnabled || false;
        if (gradientColorPicker) gradientColorPicker.value = wallpaper.clockStyles.gradientColor || '#ffffff';
        
		const glassSwitch = document.getElementById('clock-glass-switch');
        if (glassSwitch) glassSwitch.checked = wallpaper.clockStyles.glassEnabled || false;
        
        const dynamicFillSwitch = document.getElementById('clock-dynamicfill-switch');
        if (dynamicFillSwitch) dynamicFillSwitch.checked = wallpaper.clockStyles.clockDynamicFillEnabled || false;
        
        const offSwitch = document.getElementById('clock-off-switch');
        if (offSwitch) {
            offSwitch.checked = !(wallpaper.clockStyles.colorEnabled) && !(wallpaper.clockStyles.gradientEnabled) && !(wallpaper.clockStyles.glassEnabled) && !(wallpaper.clockStyles.clockDynamicFillEnabled);
        }

        applyCustomWallpaperStyles(wallpaper.clockStyles);

        // Apply the styles
	    applyClockLayout();
        applyClockStyles();
        applyWallpaperEffects();
        applyAlignment(wallpaper.clockStyles.alignment || 'center');
        updateClockAndDate();

		broadcastAllWallpaperSettings(wallpaper);
    }
        
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    
    if (wallpaper.isSlideshow) {
        isSlideshow = true;
        // Restore the slideshow items to localStorage so applyWallpaper finds them
        if (wallpaper.items && wallpaper.items.length > 0) {
            localStorage.setItem("wallpapers", JSON.stringify(wallpaper.items));
            currentWallpaperIndex = 0; // Reset index
        }
        applyWallpaper();
    } else {
        isSlideshow = false;
        localStorage.removeItem("wallpapers");
        applyWallpaper();
    }

    // Re-render the widgets for the new wallpaper
    renderWidgets();
    
    updatePageIndicatorDots(false);
    resetIndicatorTimeout();
}

// Add a function to check if we need to load or restore default wallpaper
function checkWallpaperState() {
  // If no wallpapers in history, set to default
  if (!recentWallpapers || recentWallpapers.length === 0) {
    localStorage.setItem('wallpaperType', 'default');
    localStorage.removeItem('customWallpaper');
    localStorage.removeItem('wallpapers');
    isSlideshow = false;
    applyWallpaper();
  }
}

function switchWallpaper(direction, skipSave = false) {
    if (recentWallpapers.length === 0) return;

    // Save the layout of the current (outgoing) wallpaper
    // Only save if we aren't deleting the current wallpaper
    if (!skipSave) {
        saveWidgets();
    }
    
    // Calculate new position
    let newPosition = currentWallpaperPosition;
    
    if (direction === 'right') {
        newPosition++;
        if (newPosition >= recentWallpapers.length) {
            newPosition = recentWallpapers.length - 1;
            return;
        }
    } else if (direction === 'left') {
        newPosition--;
        if (newPosition < 0) {
            newPosition = 0;
            return;
        }
    }
    
    // Only proceed if position actually changed or we're reapplying
    if (newPosition !== currentWallpaperPosition || direction === 'none') {
        currentWallpaperPosition = newPosition;
    } else {
        return; // No change, no need to proceed
    }
    
    const wallpaper = recentWallpapers[currentWallpaperPosition];

    // Load the widget layout for the NEW wallpaper
    activeWidgets = wallpaper.widgetLayout || [];

    applyCustomWallpaperStyles(wallpaper.clockStyles);
    
    // Apply clock styles for this wallpaper if they exist
    if (wallpaper.clockStyles) {
        // Update UI elements
        const fontSelect = document.getElementById('font-select');
        const weightSlider = document.getElementById('weight-slider');
        const colorPicker = document.getElementById('clock-color-picker');
        const colorSwitch = document.getElementById('clock-color-switch');
        const stackSwitch = document.getElementById('clock-stack-switch');
        const secondsSwitch = document.getElementById('seconds-switch');
        const weatherSwitch = document.getElementById('weather-switch');
        const alignmentSelect = document.getElementById('alignment-select');
        const blurSlider = document.getElementById('wallpaper-blur-slider');
        const brightnessSlider = document.getElementById('wallpaper-brightness-slider');
        const contrastSlider = document.getElementById('wallpaper-contrast-slider');
        const shadowSwitch = document.getElementById('clock-shadow-switch');
        const shadowBlurSlider = document.getElementById('clock-shadow-blur-slider');
        const shadowColorPicker = document.getElementById('clock-shadow-color-picker');
        const gradientSwitch = document.getElementById('clock-gradient-switch');
        const gradientColorPicker = document.getElementById('clock-gradient-color-picker');
	    const glassSwitch = document.getElementById('clock-glass-switch');
	    const dynamicFillSwitch = document.getElementById('clock-dynamicfill-switch');
	    const roundnessSlider = document.getElementById('roundness-slider');
	    const sizeSlider = document.getElementById('clock-size-slider');
	    const posXSlider = document.getElementById('clock-pos-x-slider');
	    const posYSlider = document.getElementById('clock-pos-y-slider');
        const clockFormatInput = document.getElementById('clock-format-input');
        const dateFormatInput = document.getElementById('date-format-input');
        
        if (fontSelect) fontSelect.value = wallpaper.clockStyles.font || 'Inter';
        if (weightSlider) weightSlider.value = parseInt(wallpaper.clockStyles.weight || '700') / 10;
        if (colorPicker) colorPicker.value = wallpaper.clockStyles.color || '#ffffff';
        if (colorSwitch) colorSwitch.checked = wallpaper.clockStyles.colorEnabled || false;
        if (stackSwitch) stackSwitch.checked = wallpaper.clockStyles.stackEnabled || false;
	    if (roundnessSlider) roundnessSlider.value = wallpaper.clockStyles.roundness || '0';
	    if (sizeSlider) sizeSlider.value = wallpaper.clockStyles.clockSize || '0';
	    if (posXSlider) posXSlider.value = wallpaper.clockStyles.clockPosX || '50';
	    if (posYSlider) posYSlider.value = wallpaper.clockStyles.clockPosY || '50';
		if (alignmentSelect) alignmentSelect.value = wallpaper.clockStyles.alignment || 'center';
	    if (glassSwitch) glassSwitch.checked = wallpaper.clockStyles.glassEnabled || false;
		if (dynamicFillSwitch) dynamicFillSwitch.checked = wallpaper.clockStyles.clockDynamicFillEnabled || false;
        const offSwitch = document.getElementById('clock-off-switch');
        if (offSwitch) {
            offSwitch.checked = !(wallpaper.clockStyles.colorEnabled) && !(wallpaper.clockStyles.gradientEnabled) && !(wallpaper.clockStyles.glassEnabled) && !(wallpaper.clockStyles.clockDynamicFillEnabled);
        }
        if (roundnessSlider) roundnessSlider.value = wallpaper.clockStyles.roundness || '0';
        if (dateFormatInput) dateFormatInput.value = wallpaper.clockStyles.dateFormat || 'ddd MMM D $(separator.dot)$ $(smart)50$';
        if (clockFormatInput) clockFormatInput.value = wallpaper.clockStyles.clockFormat || (document.getElementById('hour-switch').checked ? 'h:mm:ss A' : 'HH:mm:ss');

        if (document.getElementById('depth-effect-switch')) {
            document.getElementById('depth-effect-switch').checked = wallpaper.depthEnabled || false;
        }
		
        if (secondsSwitch) {
            secondsSwitch.checked = wallpaper.clockStyles.showSeconds !== false;
            showSeconds = secondsSwitch.checked; // Update the global variable
        }
        
		if (weatherSwitch) {
            weatherSwitch.checked = wallpaper.clockStyles.showWeather !== false;
            // FIX: Manually update state and UI instead of dispatching a generic event
            showWeather = weatherSwitch.checked;
            updateWeatherVisibility();
        }

        if (alignmentSelect) {
            alignmentSelect.value = wallpaper.clockStyles.alignment || 'center';
        }

	    // Update effect sliders based on current theme
	    const isLightMode = document.body.classList.contains('light-theme');
	    const theme = isLightMode ? 'light' : 'dark';
	    const effects = wallpaper.clockStyles?.wallpaperEffects?.[theme] || { blur: '0', brightness: '100', contrast: '100' };
	    if (blurSlider) blurSlider.value = effects.blur;
	    if (brightnessSlider) brightnessSlider.value = effects.brightness;
	    if (contrastSlider) contrastSlider.value = effects.contrast;
        if (document.getElementById('wallpaper-saturate-slider')) document.getElementById('wallpaper-saturate-slider').value = effects.saturate !== undefined ? effects.saturate : '100';
        if (document.getElementById('wallpaper-hue-slider')) document.getElementById('wallpaper-hue-slider').value = effects.hue !== undefined ? effects.hue : '0';
        if (document.getElementById('wallpaper-vignette-slider')) document.getElementById('wallpaper-vignette-slider').value = effects.vignette !== undefined ? effects.vignette : '0';
		
        if (document.getElementById('clock-italic-switch')) document.getElementById('clock-italic-switch').checked = wallpaper.clockStyles.clockItalic || false;
        if (document.getElementById('clock-stroke-width-slider')) document.getElementById('clock-stroke-width-slider').value = wallpaper.clockStyles.clockStrokeWidth || '0';
        if (document.getElementById('clock-stroke-color-picker')) document.getElementById('clock-stroke-color-picker').value = wallpaper.clockStyles.clockStrokeColor || '#000000';
        if (document.getElementById('clock-blend-mode-select')) document.getElementById('clock-blend-mode-select').value = wallpaper.clockStyles.clockBlendMode || 'normal';

        if (shadowSwitch) shadowSwitch.checked = wallpaper.clockStyles.shadowEnabled || false;
        if (shadowBlurSlider) shadowBlurSlider.value = wallpaper.clockStyles.shadowBlur || '10';
        if (shadowColorPicker) shadowColorPicker.value = wallpaper.clockStyles.shadowColor || '#000000';
        if (gradientSwitch) gradientSwitch.checked = wallpaper.clockStyles.gradientEnabled || false;
        if (gradientColorPicker) gradientColorPicker.value = wallpaper.clockStyles.gradientColor || '#ffffff';
        if (glassSwitch) glassSwitch.checked = wallpaper.clockStyles.glassEnabled || false;
        if (dynamicFillSwitch) dynamicFillSwitch.checked = wallpaper.clockStyles.clockDynamicFillEnabled || false;
        if (roundnessSlider) roundnessSlider.value = wallpaper.clockStyles.roundness || '0';
        if (document.getElementById('clock-spacing-slider')) document.getElementById('clock-spacing-slider').value = wallpaper.clockStyles.letterSpacing || '0';
        if (document.getElementById('text-case-select')) document.getElementById('text-case-select').value = wallpaper.clockStyles.textCase || 'none';
        if (document.getElementById('date-size-slider')) document.getElementById('date-size-slider').value = wallpaper.clockStyles.dateSize || '100';
        if (document.getElementById('date-offset-slider')) document.getElementById('date-offset-slider').value = wallpaper.clockStyles.dateOffset || '0';
        
        // Apply the styles
		applyClockLayout();
        applyClockStyles();
        applyWallpaperEffects();
        applyAlignment(wallpaper.clockStyles.alignment || 'center');

        // Update clock and weather display
        if (window.refreshClockUI) window.refreshClockUI();

		broadcastAllWallpaperSettings(wallpaper);
    }
    
    // Save the position for persistence
    saveCurrentPosition();
    
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    
    if (wallpaper.isSlideshow) {
        isSlideshow = true;
        // Correctly restore items from the history object
        if (wallpaper.items && wallpaper.items.length > 0) {
            localStorage.setItem("wallpapers", JSON.stringify(wallpaper.items));
            currentWallpaperIndex = 0;
            applyWallpaper();
            showPopup(currentLanguage.SLIDESHOW_WALLPAPER);
        }
    } else {
        isSlideshow = false;
        localStorage.removeItem('wallpapers');
        applyWallpaper();
    }

    // Re-render the widgets for the new wallpaper
    renderWidgets();
    
    updatePageIndicatorDots(false);
    resetIndicatorTimeout();
    syncUiStates();
}

async function initializeAndApplyWallpaper() {
    loadSavedPosition();
    
    if (recentWallpapers.length > 0) {
        if (currentWallpaperPosition >= recentWallpapers.length) {
            currentWallpaperPosition = recentWallpapers.length - 1;
            saveCurrentPosition();
        }
        
        const wallpaper = recentWallpapers[currentWallpaperPosition];
        
        // Apply styles for the current wallpaper if they exist
        if (wallpaper.clockStyles) {
            // Iterate over all saved styles for the current wallpaper and update localStorage.
            // This ensures all settings are correctly loaded before the UI is rendered.
            for (const [key, value] of Object.entries(wallpaper.clockStyles)) {
                localStorage.setItem(key, value);
            }
        }
        
        if (wallpaper.isSlideshow) {
            isSlideshow = true;
            let slideshowData = JSON.parse(localStorage.getItem("wallpapers"));
            if (slideshowData && slideshowData.length > 0) {
                currentWallpaperIndex = 0;
            }
        } else {
            isSlideshow = false;
            localStorage.removeItem('wallpapers');
        }
        
        // Apply the wallpaper image/video
        await applyWallpaper();
    } else {
        // No wallpapers available, set to default
        isSlideshow = false;
        localStorage.setItem('wallpaperType', 'default');
        localStorage.removeItem('customWallpaper');
        localStorage.removeItem('wallpapers');
        currentWallpaperPosition = 0;
    }
}

// Centralized function to sync the visual state of settings items
function syncUiStates() {
    // Sync all checkbox-based toggles
    document.querySelectorAll('.setting-item').forEach(item => {
        // Exclude alignment from this generic check since it's a select
        if (item.id === 'setting-alignment' || item.id === 'setting-clock-color' || item.id === 'setting-clock-shadow') return;
        
        // Construct potential IDs for different control types
        const controlId = item.id.replace('setting-', '');
        const switchControl = document.getElementById(controlId + '-switch');
        const regularControl = document.getElementById(controlId);
        
        const control = switchControl || regularControl;

        if (control && control.type === 'checkbox') {
            item.classList.toggle('active', control.checked);
        }
    });

    // Sync items with non-boolean active states safely using optional chaining
    document.getElementById('setting-weight')?.classList.toggle('active', document.getElementById('weight-slider').value !== '70');
    document.getElementById('setting-style')?.classList.toggle('active', document.getElementById('font-select').value !== 'Inter');
    document.getElementById('setting-clock-spacing')?.classList.toggle('active', parseInt(document.getElementById('clock-spacing-slider').value) !== 0);
    document.getElementById('setting-text-case')?.classList.toggle('active', document.getElementById('text-case-select').value !== 'none');
    document.getElementById('setting-date-size')?.classList.toggle('active', parseInt(document.getElementById('date-size-slider').value) !== 100);
    document.getElementById('setting-date-offset')?.classList.toggle('active', parseInt(document.getElementById('date-offset-slider').value) !== 0);
    
    // Update to use the new 'setting-position' ID and check all relevant sliders
    const posX = document.getElementById('clock-pos-x-slider').value;
    const posY = document.getElementById('clock-pos-y-slider').value;
    document.getElementById('setting-position')?.classList.toggle('active', posX !== '50' || posY !== '50');
    
    document.getElementById('setting-wallpaper-blur')?.classList.toggle('active', document.getElementById('wallpaper-blur-slider').value !== '0');
    document.getElementById('setting-wallpaper-brightness')?.classList.toggle('active', document.getElementById('wallpaper-brightness-slider').value !== '100');
    document.getElementById('setting-wallpaper-contrast-fx')?.classList.toggle('active', document.getElementById('wallpaper-contrast-slider').value !== '100');
    
    document.getElementById('setting-wallpaper-saturate')?.classList.toggle('active', document.getElementById('wallpaper-saturate-slider').value !== '100');
    document.getElementById('setting-wallpaper-hue')?.classList.toggle('active', document.getElementById('wallpaper-hue-slider').value !== '0');
    document.getElementById('setting-wallpaper-vignette')?.classList.toggle('active', document.getElementById('wallpaper-vignette-slider').value !== '0');

    document.getElementById('setting-italic')?.classList.toggle('active', document.getElementById('clock-italic-switch').checked);
    document.getElementById('setting-blend-mode')?.classList.toggle('active', document.getElementById('clock-blend-mode-select').value !== 'normal');
    document.getElementById('setting-clock-stroke')?.classList.toggle('active', parseInt(document.getElementById('clock-stroke-width-slider').value) !== 0);
    
    // Add roundness and size to sync
    document.getElementById('setting-roundness')?.classList.toggle('active', document.getElementById('roundness-slider').value !== '0');
    document.getElementById('setting-size')?.classList.toggle('active', document.getElementById('clock-size-slider').value !== '0');
	
    // Sync special items
	const isColorActive = !document.getElementById('clock-off-switch').checked;
    document.getElementById('setting-clock-color')?.classList.toggle('active', isColorActive);
    document.getElementById('setting-clock-shadow')?.classList.toggle('active', document.getElementById('clock-shadow-switch').checked);
}

function applyWallpaperEffects() {
    const isLightMode = document.body.classList.contains('light-theme');
    const theme = isLightMode ? 'light' : 'dark';

    const currentWallpaper = recentWallpapers[currentWallpaperPosition];
    const effects = currentWallpaper?.clockStyles?.wallpaperEffects?.[theme] || { blur: '0', brightness: '100', contrast: '100', saturate: '100', hue: '0', vignette: '0' };

    let brightness = parseFloat(effects.brightness);
    const focusActive = document.body.classList.contains('minimal-active');
    if (focusActive && localStorage.getItem('focusDimWallpaper') === 'true') {
        brightness *= 0.5; // Dim by 50%
    }

    const saturate = Math.max(0, parseFloat(effects.saturate !== undefined ? effects.saturate : '100'));
    const hue = effects.hue !== undefined ? effects.hue : '0';
    const vignette = effects.vignette !== undefined ? effects.vignette : '0';

    const filterString = `blur(${effects.blur}px) brightness(${brightness}%) contrast(${effects.contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg)`;
    document.body.style.setProperty('--wallpaper-filter', filterString);

    // Apply Vignette by dynamically creating/updating the overlay
    let vignetteOverlay = document.getElementById('vignette-overlay');
    if (!vignetteOverlay) {
        vignetteOverlay = document.createElement('div');
        vignetteOverlay.id = 'vignette-overlay';
        document.body.appendChild(vignetteOverlay);
    }
    vignetteOverlay.style.opacity = vignette / 100;
}

function setupFontSelection() {
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');

    // --- Get all control elements ---
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const colorSwitch = document.getElementById('clock-color-switch');
    const colorPicker = document.getElementById('clock-color-picker');
    const stackSwitch = document.getElementById('clock-stack-switch');
    const alignmentSelect = document.getElementById('alignment-select');
    const blurSlider = document.getElementById('wallpaper-blur-slider');
    const brightnessSlider = document.getElementById('wallpaper-brightness-slider');
    const contrastSlider = document.getElementById('wallpaper-contrast-slider');
    const shadowSwitch = document.getElementById('clock-shadow-switch');
    const shadowBlurSlider = document.getElementById('clock-shadow-blur-slider');
    const shadowColorPicker = document.getElementById('clock-shadow-color-picker');
    const gradientSwitch = document.getElementById('clock-gradient-switch');
    const gradientColorPicker = document.getElementById('clock-gradient-color-picker');
    const glassSwitch = document.getElementById('clock-glass-switch');
	const dynamicFillSwitch = document.getElementById('clock-dynamicfill-switch');
    const roundnessSlider = document.getElementById('roundness-slider');
    const sizeSlider = document.getElementById('clock-size-slider');
    const posXSlider = document.getElementById('clock-pos-x-slider');
    const posYSlider = document.getElementById('clock-pos-y-slider');
    const positionPopup = document.getElementById('position-controls-popup');
    const clockFormatInput = document.getElementById('clock-format-input');
    const dateFormatInput = document.getElementById('date-format-input');
	const spacingSlider = document.getElementById('clock-spacing-slider');
    const textCaseSelect = document.getElementById('text-case-select');
    const dateSizeSlider = document.getElementById('date-size-slider');
    const dateOffsetSlider = document.getElementById('date-offset-slider');
    const italicSwitch = document.getElementById('clock-italic-switch');
    const strokeWidthSlider = document.getElementById('clock-stroke-width-slider');
    const strokeColorPicker = document.getElementById('clock-stroke-color-picker');
    const blendModeSelect = document.getElementById('clock-blend-mode-select');
    
    // --- Function to save all settings (triggered by user interaction) ---
    async function saveCurrentWallpaperSettings() {
	    const isLightMode = document.body.classList.contains('light-theme');
	    const theme = isLightMode ? 'light' : 'dark';
			
		// Get the current wallpaper's styles to check for a custom font
        const currentWallpaper = recentWallpapers.length > 0 ? recentWallpapers[currentWallpaperPosition] : null;
        const currentStyles = (currentWallpaper && currentWallpaper.clockStyles) ? currentWallpaper.clockStyles : {};
            
        const settingsFromUI = {
            font: currentStyles.customFontName || fontSelect.value, // Prioritize custom font
            weight: (parseInt(weightSlider.value, 10) * 10).toString(),
            color: colorPicker.value,
            colorEnabled: colorSwitch.checked,
            stackEnabled: stackSwitch.checked,
            showSeconds: document.getElementById('seconds-switch')?.checked,
            showWeather: document.getElementById('weather-switch')?.checked,
            clockSize: sizeSlider.value,
            clockPosX: posXSlider.value,
            clockPosY: posYSlider.value,
            alignment: alignmentSelect.value,
            shadowEnabled: shadowSwitch.checked,
            shadowBlur: shadowBlurSlider.value,
            shadowColor: shadowColorPicker.value,
            gradientEnabled: gradientSwitch.checked,
            gradientColor: gradientColorPicker.value,
            glassEnabled: glassSwitch.checked,
            clockDynamicFillEnabled: dynamicFillSwitch.checked,
            roundness: roundnessSlider.value,
            letterSpacing: spacingSlider ? spacingSlider.value : '0',
            textCase: textCaseSelect ? textCaseSelect.value : 'none',
            dateSize: dateSizeSlider ? dateSizeSlider.value : '100',
            dateOffset: dateOffsetSlider ? dateOffsetSlider.value : '0',
            clockItalic: document.getElementById('clock-italic-switch')?.checked || false,
            clockStrokeWidth: document.getElementById('clock-stroke-width-slider')?.value || '0',
            clockStrokeColor: document.getElementById('clock-stroke-color-picker')?.value || '#000000',
            clockBlendMode: document.getElementById('clock-blend-mode-select')?.value || 'normal',
			dateFormat: document.getElementById('date-format-input').value,
            clockFormat: document.getElementById('clock-format-input').value
        };

	    // Save to localStorage and broadcast each change to the settings app
	    for (const key in settingsFromUI) {
	        const value = settingsFromUI[key];
	        localStorage.setItem(key, value);
	        broadcastSettingUpdate(key, value); // Broadcasts the update
	    }

        if (currentWallpaper) {
            // Merge the latest UI settings with the existing styles
            const finalSettings = { ...currentStyles, ...settingsFromUI };

            currentWallpaper.clockStyles = finalSettings;
				
            // --- Handle saving theme-specific wallpaper effects ---
            if (!currentWallpaper.clockStyles.wallpaperEffects) {
                currentWallpaper.clockStyles.wallpaperEffects = { light: {}, dark: {} };
            }
            if (!currentWallpaper.clockStyles.wallpaperEffects[theme]) {
                currentWallpaper.clockStyles.wallpaperEffects[theme] = {};
            }
            currentWallpaper.clockStyles.wallpaperEffects[theme] = {
                blur: blurSlider.value,
                brightness: brightnessSlider.value,
                contrast: contrastSlider.value,
                saturate: document.getElementById('wallpaper-saturate-slider')?.value || '100',
                hue: document.getElementById('wallpaper-hue-slider')?.value || '0',
                vignette: document.getElementById('wallpaper-vignette-slider')?.value || '0'
            };

            saveRecentWallpapers();

            // --- UPDATE IndexedDB record as well ---
            if (currentWallpaper.id) { // Only for non-slideshow wallpapers
                try {
                    const wallpaperRecord = await getWallpaper(currentWallpaper.id);
                    if (wallpaperRecord) {
                        wallpaperRecord.clockStyles = finalSettings;
                        await storeWallpaper(currentWallpaper.id, wallpaperRecord);
                    }
                } catch (error) {
                    console.error("Failed to save clock styles to IndexedDB:", error);
                }
            }
        }
    }

    // --- 1. Load saved preferences and set the state of the UI controls ---
    const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
    const offSwitch = document.getElementById('clock-off-switch');
    if (offSwitch) {
        offSwitch.checked = !colorSwitch.checked && !gradientSwitch.checked && !glassSwitch.checked && (!dynamicFillSwitch || !dynamicFillSwitch.checked);
    }
    fontSelect.value = localStorage.getItem('font') || 'Inter'; // FIX: Use 'font'
    weightSlider.value = parseInt(localStorage.getItem('weight') || '700', 10) / 10; // FIX: Use 'weight'
    colorPicker.value = localStorage.getItem('color') || defaultColor; // FIX: Use 'color'
    colorSwitch.checked = localStorage.getItem('colorEnabled') === 'true';
    stackSwitch.checked = localStorage.getItem('stackEnabled') === 'true'; // FIX: Use 'stackEnabled'
    sizeSlider.value = localStorage.getItem('clockSize') || '0';
    posXSlider.value = localStorage.getItem('clockPosX') || '50';
    posYSlider.value = localStorage.getItem('clockPosY') || '50';
    alignmentSelect.value = localStorage.getItem('alignment') || 'center';
	shadowSwitch.checked = localStorage.getItem('shadowEnabled') === 'true';
    shadowBlurSlider.value = localStorage.getItem('shadowBlur') || '10';
    shadowColorPicker.value = localStorage.getItem('shadowColor') || '#000000';
    gradientSwitch.checked = localStorage.getItem('gradientEnabled') === 'true';
    gradientColorPicker.value = localStorage.getItem('gradientColor') || '#ffffff';
    glassSwitch.checked = localStorage.getItem('glassEnabled') === 'true';
    dynamicFillSwitch.checked = localStorage.getItem('clockDynamicFillEnabled') === 'true';
    roundnessSlider.value = localStorage.getItem('roundness') || '0';
	spacingSlider.value = localStorage.getItem('letterSpacing') || '0';
	textCaseSelect.value = localStorage.getItem('textCase') || 'none';
	dateSizeSlider.value = localStorage.getItem('dateSize') || '100';
	dateOffsetSlider.value = localStorage.getItem('dateOffset') || '0';
    document.getElementById('clock-italic-switch').checked = localStorage.getItem('clockItalic') === 'true';
    document.getElementById('clock-stroke-width-slider').value = localStorage.getItem('clockStrokeWidth') || '0';
    document.getElementById('clock-stroke-color-picker').value = localStorage.getItem('clockStrokeColor') || '#000000';
    document.getElementById('clock-blend-mode-select').value = localStorage.getItem('clockBlendMode') || 'normal';
    const isLightModeOnLoad = document.body.classList.contains('light-theme');
    const initialTheme = isLightModeOnLoad ? 'light' : 'dark';
    const initialWallpaper = recentWallpapers[currentWallpaperPosition];
    const initialEffects = initialWallpaper?.clockStyles?.wallpaperEffects?.[initialTheme] || { blur: '0', brightness: '100', contrast: '100', saturate: '100', hue: '0', vignette: '0' };
    blurSlider.value = initialEffects.blur;
    brightnessSlider.value = initialEffects.brightness;
    contrastSlider.value = initialEffects.contrast;
    document.getElementById('wallpaper-saturate-slider').value = initialEffects.saturate || '100';
    document.getElementById('wallpaper-hue-slider').value = initialEffects.hue || '0';
    document.getElementById('wallpaper-vignette-slider').value = initialEffects.vignette || '0';
    document.getElementById('date-format-input').value = localStorage.getItem('dateFormat') || 'ddd MMM D $(separator.dot)$ $(smart)50$';
    document.getElementById('clock-format-input').value = localStorage.getItem('clockFormat') || (document.getElementById('hour-switch').checked ? 'h:mm:ss A' : 'HH:mm:ss');

    // --- 2. Apply the visual styles based on the now-correct state of the controls ---
    applyClockLayout();
    applyClockStyles();
    applyWallpaperEffects();
    applyAlignment(alignmentSelect.value);

    // Special listener for the font dropdown to handle clearing custom fonts
    fontSelect.addEventListener('change', async () => {
        const currentWallpaper = recentWallpapers[currentWallpaperPosition];
        if (currentWallpaper && currentWallpaper.clockStyles) {
            currentWallpaper.clockStyles.customFontName = null;
            currentWallpaper.clockStyles.customFontUrl = null;
            applyCustomWallpaperStyles({}); // Clear the @font-face rule
        }
        applyClockStyles();
        await saveCurrentWallpaperSettings();
        syncUiStates();
    });
    
    // --- 3. NOW, set up the event listeners for future user interactions ---
    const allControls =[
        weightSlider, colorSwitch, colorPicker, stackSwitch, alignmentSelect,
        blurSlider, brightnessSlider, contrastSlider, shadowSwitch, shadowBlurSlider,
        shadowColorPicker, gradientSwitch, gradientColorPicker, glassSwitch, dynamicFillSwitch, roundnessSlider,
        sizeSlider, posXSlider, posYSlider, alignmentSelect, clockFormatInput, dateFormatInput,
        spacingSlider, textCaseSelect, dateSizeSlider, dateOffsetSlider,
        document.getElementById('clock-italic-switch'),
        document.getElementById('clock-stroke-width-slider'),
        document.getElementById('clock-stroke-color-picker'),
        document.getElementById('clock-blend-mode-select'),
        document.getElementById('wallpaper-saturate-slider'),
        document.getElementById('wallpaper-hue-slider'),
        document.getElementById('wallpaper-vignette-slider')
    ].filter(Boolean);

    allControls.forEach(control => {
        // Use a Set to avoid duplicate event listeners for alignmentSelect
        if(control.id === 'alignment-select' && control.dataset.listenerAttached) return;

        const eventType = (control.type === 'checkbox' || control.tagName === 'SELECT') ? 'change' : 'input';
        control.addEventListener(eventType, async () => {
            applyClockLayout();
            applyClockStyles();
		    applyWallpaperEffects();
            await saveCurrentWallpaperSettings();
            syncUiStates();
        });
        if(control.id === 'alignment-select') control.dataset.listenerAttached = 'true';
    });
	
    // --- Special handler for Alignment Preset Dropdown ---
    alignmentSelect.addEventListener('change', async () => {
        applyClockLayout();
        await saveCurrentWallpaperSettings();
        syncUiStates();
    });

    // Special logic: uncheck gradient if solid color is checked, and vice-versa
	const radioSwitchColor = [
	    document.getElementById('clock-off-switch'),
	    document.getElementById('clock-color-switch'),
	    document.getElementById('clock-gradient-switch'),
	    document.getElementById('clock-glass-switch'),
	    document.getElementById('clock-dynamicfill-switch')
	];
	
    radioSwitchColor.forEach(radio => {
        if (radio) {
            radio.addEventListener('change', async () => {
                applyClockStyles();
                await saveCurrentWallpaperSettings();
                syncUiStates();
            });
        }
    });
}

// Handle layout (size and position)
function applyClockLayout() {
    const container = document.querySelector('.container');
    if (!container) return;

    const sizeSlider = document.getElementById('clock-size-slider');
    const posXSlider = document.getElementById('clock-pos-x-slider');
    const posYSlider = document.getElementById('clock-pos-y-slider');
    const alignmentSelect = document.getElementById('alignment-select');

    // 1. Apply Size
    const sizeValue = parseInt(sizeSlider.value, 10);
    const sizeMultiplier = 1 + (sizeValue / 100);
    container.style.setProperty('--clock-size-multiplier', sizeMultiplier);

    // 2. Apply Position from sliders
    container.style.setProperty('--clock-pos-x', `${posXSlider.value}%`);
    container.style.setProperty('--clock-pos-y', `${posYSlider.value}%`);

    // 3. Apply Alignment from preset dropdown
    container.classList.remove('align-left', 'align-right');
    const alignment = alignmentSelect.value;
    if (alignment === 'left' || alignment === 'right') {
        container.classList.add(`align-${alignment}`);
    }
}

function applyClockStyles() {
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
	const clockWidget = document.querySelector('.clockwidgets');
    const colorPicker = document.getElementById('clock-color-picker');
    const colorSwitch = document.getElementById('clock-color-switch');
    const stackSwitch = document.getElementById('clock-stack-switch');
    const shadowSwitch = document.getElementById('clock-shadow-switch');
    const shadowBlurSlider = document.getElementById('clock-shadow-blur-slider');
    const shadowColorPicker = document.getElementById('clock-shadow-color-picker');
    const italicSwitch = document.getElementById('clock-italic-switch');
    const strokeWidthSlider = document.getElementById('clock-stroke-width-slider');
    const strokeColorPicker = document.getElementById('clock-stroke-color-picker');
    const blendModeSelect = document.getElementById('clock-blend-mode-select');
    const saturateSlider = document.getElementById('wallpaper-saturate-slider');
    const hueSlider = document.getElementById('wallpaper-hue-slider');
    const vignetteSlider = document.getElementById('wallpaper-vignette-slider');    const gradientSwitch = document.getElementById('clock-gradient-switch');
    const gradientColorPicker = document.getElementById('clock-gradient-color-picker');
    const glassSwitch = document.getElementById('clock-glass-switch');
	const dynamicFillSwitch = document.getElementById('clock-dynamicfill-switch');
    const roundnessSlider = document.getElementById('roundness-slider');
    const spacingSlider = document.getElementById('clock-spacing-slider');
    const textCaseSelect = document.getElementById('text-case-select');
    const dateSizeSlider = document.getElementById('date-size-slider');
    const dateOffsetSlider = document.getElementById('date-offset-slider');
    
    if (!clockElement || !infoElement) return;
    
    const currentStyles = (recentWallpapers.length > 0 && recentWallpapers[currentWallpaperPosition] && recentWallpapers[currentWallpaperPosition].clockStyles) ?
                           recentWallpapers[currentWallpaperPosition].clockStyles : {};
    
    // --- Apply New Typography Settings ---
    if (spacingSlider) {
        const spacing = `${spacingSlider.value}px`;
        clockElement.style.letterSpacing = spacing;
        infoElement.style.letterSpacing = spacing;
    }
    if (textCaseSelect) {
        const transform = textCaseSelect.value;
        clockElement.style.textTransform = transform;
        infoElement.style.textTransform = transform;
    }
    if (dateSizeSlider) {
        // Scale date relative to its default size (100%)
        infoElement.style.fontSize = `${dateSizeSlider.value}%`;
    }
    if (dateOffsetSlider) {
        infoElement.style.marginBottom = `${dateOffsetSlider.value}px`;
        clockWidget.style.marginTop = `${dateOffsetSlider.value}px`;
    }
    
    // Use custom font if available, otherwise use font from dropdown
    const fontWeight = parseInt(weightSlider.value, 10) * 10;
    const roundnessValue = parseInt(roundnessSlider.value, 10);
	const selectedFont = fontSelect.value;
    const effectiveFont = currentStyles.customFontName || selectedFont;
    
    let clockFontFamily = `'${effectiveFont}', sans-serif`;
    let infoFontFamily = `'${effectiveFont}', sans-serif`;
    let roundnessAxis = 'ROND';

    // Reset variation settings for all elements
    clockElement.style.fontVariationSettings = 'normal';
    infoElement.style.fontVariationSettings = 'normal';
    
    // --- Special Font Logic ---
    // Only apply special logic if NOT using a custom font.
    if (!currentStyles.customFontName && selectedFont === 'Inter' && roundnessValue > 0) {
        roundnessAxis = 'RDNS';
        clockFontFamily = "'Inter Numeric', sans-serif";
        infoFontFamily = "'Open Runde', sans-serif";
    }

    // --- Apply font variation settings if roundness is active ---
    if (roundnessValue > 0) {
        const roundValue = roundnessValue / 100;
        // Apply to both clock and info, as some custom fonts might support it
        clockElement.style.fontVariationSettings = `'${roundnessAxis}' ${roundValue}`;
        infoElement.style.fontVariationSettings = `'${roundnessAxis}' ${roundValue}`;
    }

    // --- Apply final styles to elements ---
    clockElement.style.fontFamily = clockFontFamily;
    clockElement.style.fontWeight = fontWeight;
    infoElement.style.fontFamily = infoFontFamily;
	
    // Reset all color/background/effect styles first
    clockElement.style.backgroundImage = 'none';
    clockElement.style.color = ''; // Revert to stylesheet color
    clockElement.classList.remove('glass-effect', 'gradient-effect');
    
    infoElement.style.color = '';
    infoElement.classList.remove('glass-effect');
    
    clockElement.style.textShadow = 'none';
    infoElement.style.textShadow = 'none';

    const isItalic = italicSwitch && italicSwitch.checked;
    clockElement.style.fontStyle = isItalic ? 'italic' : 'normal';
    infoElement.style.fontStyle = isItalic ? 'italic' : 'normal';

    if (blendModeSelect) {
        // Apply blend mode to the parent container so it blends with the wallpaper underneath
        const container = document.querySelector('.container');
        if (container) {
            container.style.mixBlendMode = blendModeSelect.value;
        }
        // Clear any isolated blend modes on the children
        clockElement.style.mixBlendMode = '';
        infoElement.style.mixBlendMode = '';
    }

    if (strokeWidthSlider && strokeColorPicker) {
        const sw = strokeWidthSlider.value;
        if (sw > 0) {
            clockElement.style.webkitTextStroke = `${sw}px ${strokeColorPicker.value}`;
        } else {
            // Must use an empty string to properly unset the webkit text stroke property
            clockElement.style.webkitTextStroke = '';
        }
    }
	
	// Reset previous effects and custom colors
	clockElement.classList.remove('glass-effect', 'gradient-effect', 'dynamic-fill-effect');
	clockElement.style.color = '';
	infoElement.classList.remove('glass-effect', 'dynamic-fill-effect');
	infoElement.style.color = '';
	
	if (document.getElementById('clock-off-switch').checked) {
	    // Do nothing else - clock reverts to default CSS color
	} 
	else if (document.getElementById('clock-glass-switch').checked) {
	    clockElement.classList.add('glass-effect');
	    infoElement.classList.add('glass-effect');
	} 
	else if (document.getElementById('clock-gradient-switch').checked) {
	    clockElement.classList.add('gradient-effect');
	    const color1 = document.getElementById('clock-color-picker').value;
	    const color2 = document.getElementById('clock-gradient-color-picker').value;
	    clockElement.style.setProperty('--gradient-color-1', color1);
	    clockElement.style.setProperty('--gradient-color-2', color2);
	    infoElement.style.color = color1;
	} 
	else if (document.getElementById('clock-dynamicfill-switch').checked) {
	    clockElement.classList.add('dynamic-fill-effect');
	    infoElement.classList.add('dynamic-fill-effect');
	} 
	else if (document.getElementById('clock-color-switch').checked) {
	    const color = document.getElementById('clock-color-picker').value;
	    clockElement.style.color = color;
	    infoElement.style.color = color;
	}
	
    // Apply Text Shadow (can be combined with other effects)
    if (shadowSwitch && shadowSwitch.checked) {
        const shadowBlur = shadowBlurSlider.value;
        const shadowColor = shadowColorPicker.value;
        const shadowString = `0 0 ${shadowBlur}px ${shadowColor}`;
        clockElement.style.textShadow = shadowString;
        infoElement.style.textShadow = shadowString;
    }
    
    // Apply Stacked Layout OR Custom Line Height
    const customLineHeight = currentStyles.customLineHeight;
    if (customLineHeight) {
        clockElement.style.lineHeight = customLineHeight;
    } else if (stackSwitch && stackSwitch.checked) {
        clockElement.style.flexDirection = 'column';
        clockElement.style.lineHeight = '0.9';
    } else {
        clockElement.style.flexDirection = '';
        clockElement.style.lineHeight = '';
    }
}

function resetAndApplyDefaultClockStyles() {
    const defaultStyles = {
        font: 'Inter',
        weight: '700',
        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff',
        colorEnabled: false,
        stackEnabled: false,
        showSeconds: true,
        showWeather: true,
        alignment: 'center',
	    clockSize: '0',
	    clockPosX: '50',
	    clockPosY: '50',
        clockItalic: false,
        clockStrokeWidth: '0',
        clockStrokeColor: '#000000',
        clockBlendMode: 'normal',
	    wallpaperEffects: {
	        light: { blur: '0', brightness: '100', contrast: '100', saturate: '100', hue: '0', vignette: '0' },
	        dark: { blur: '0', brightness: '100', contrast: '100', saturate: '100', hue: '0', vignette: '0' }
	    },
        wallpaperBlur: '0',
        wallpaperBrightness: '100',
        wallpaperContrast: '100',
        shadowEnabled: false,
        shadowBlur: '10',
        shadowColor: '#000000',
        gradientEnabled: false,
        gradientColor: '#ffffff',
        glassEnabled: false,
        clockDynamicFillEnabled: false,
        roundness: '0',
        letterSpacing: '0',
        textCase: 'none',
        dateSize: '100',
        dateOffset: '0',
		customFontName: null,
        customFontUrl: null,
        customLineHeight: null,
        customCSS: null,
        dateFormat: 'ddd MMM D $(separator.dot)$ $(smart)50$',
        clockFormat: document.getElementById('hour-switch').checked ? 'h:mm:ss A' : 'HH:mm:ss'
    };

    // Update UI controls to their default values
    document.getElementById('font-select').value = defaultStyles.font;
    document.getElementById('weight-slider').value = parseInt(defaultStyles.weight) / 10;
	document.getElementById('clock-color-picker').value = defaultStyles.color;
    document.getElementById('clock-off-switch').checked = true;
    document.getElementById('clock-color-switch').checked = false;
    document.getElementById('clock-stack-switch').checked = defaultStyles.stackEnabled;
    document.getElementById('seconds-switch').checked = defaultStyles.showSeconds;
    document.getElementById('weather-switch').checked = defaultStyles.showWeather;
	document.getElementById('alignment-select').value = defaultStyles.alignment;
	const isLightMode = document.body.classList.contains('light-theme');
	const theme = isLightMode ? 'light' : 'dark';
	document.getElementById('wallpaper-blur-slider').value = defaultStyles.wallpaperEffects[theme].blur;
	document.getElementById('wallpaper-brightness-slider').value = defaultStyles.wallpaperEffects[theme].brightness;
	document.getElementById('wallpaper-contrast-slider').value = defaultStyles.wallpaperEffects[theme].contrast;
    document.getElementById('wallpaper-saturate-slider').value = defaultStyles.wallpaperEffects[theme].saturate;
    document.getElementById('wallpaper-hue-slider').value = defaultStyles.wallpaperEffects[theme].hue;
    document.getElementById('wallpaper-vignette-slider').value = defaultStyles.wallpaperEffects[theme].vignette;
    document.getElementById('clock-italic-switch').checked = defaultStyles.clockItalic;
    document.getElementById('clock-stroke-width-slider').value = defaultStyles.clockStrokeWidth;
    document.getElementById('clock-stroke-color-picker').value = defaultStyles.clockStrokeColor;
    document.getElementById('clock-blend-mode-select').value = defaultStyles.clockBlendMode;
    document.getElementById('clock-shadow-switch').checked = defaultStyles.shadowEnabled;
    document.getElementById('clock-shadow-blur-slider').value = defaultStyles.shadowBlur;
    document.getElementById('clock-shadow-color-picker').value = defaultStyles.shadowColor;
    document.getElementById('clock-gradient-switch').checked = defaultStyles.gradientEnabled;
    document.getElementById('clock-gradient-color-picker').value = defaultStyles.gradientColor;
    document.getElementById('clock-glass-switch').checked = defaultStyles.glassEnabled;
    document.getElementById('clock-dynamicfill-switch').checked = defaultStyles.clockDynamicFillEnabled;
    document.getElementById('roundness-slider').value = defaultStyles.roundness;
	document.getElementById('clock-spacing-slider').value = defaultStyles.letterSpacing;
	document.getElementById('text-case-select').value = defaultStyles.textCase;
	document.getElementById('date-size-slider').value = defaultStyles.dateSize;
	document.getElementById('date-offset-slider').value = defaultStyles.dateOffset;
	document.getElementById('clock-size-slider').value = defaultStyles.clockSize;
	document.getElementById('clock-pos-x-slider').value = defaultStyles.clockPosX;
	document.getElementById('clock-pos-y-slider').value = defaultStyles.clockPosY;
    document.getElementById('date-format-input').value = defaultStyles.dateFormat;
    document.getElementById('clock-format-input').value = defaultStyles.clockFormat;

	// Update global state variables
    showSeconds = defaultStyles.showSeconds;
    showWeather = defaultStyles.showWeather;

    applyCustomWallpaperStyles({}); // Clear any previous custom CSS/Fonts

    // Apply the visual changes
	applyClockLayout();
    applyClockStyles();
    applyWallpaperEffects();
    updateWeatherVisibility();
    if (window.refreshClockUI) window.refreshClockUI();

    // Update localStorage with the new defaults
    for (const [key, value] of Object.entries(defaultStyles)) {
        localStorage.setItem(key, value);
    }
    
    return defaultStyles;
}

// Initialize theme and wallpaper on load
function initializeCustomization() {
    setupThemeSwitcher();
    setupFontSelection();
    setupFormatControls();
}

// Wallpaper upload functionality
const __uploadButton = document.getElementById('uploadButton');
if (__uploadButton) {
    __uploadButton.addEventListener("click", (e) => {
        // Stop default input click, use Manager
        e.preventDefault(); 
        e.stopPropagation();

        if (recentWallpapers.length >= MAX_RECENT_WALLPAPERS) {
            showDialog({ type: 'alert', title: 'Limit Reached' });
            return;
        }
        
        FileUploadManager.trigger('.png, .jpeg, .jpg, .webp, .gif, .mp4, .guraatmos', true, 'wallpaper');
    });
}

// Helper to pause EVERYTHING (Video, Wallpaper, Stickers)
async function pauseAllAnimations() {
    pauseAnimatedStickers();
    pauseAnimatedBackground(); // Runs in background
    
    const bgVideo = document.getElementById('background-video');
    if (bgVideo && !bgVideo.paused) {
        // Slow down and pause video asynchronously
        animatePlaybackRate(bgVideo, 1.0, 0.1, 1000).then(() => {
            if (isAppOpen) bgVideo.pause();
        });
    }
}

// Helper to resume EVERYTHING
function resumeAllAnimations() {
    resumeAnimatedStickers();
    resumeAnimatedBackground();
    const bgVideo = document.getElementById('background-video');
    if (bgVideo) {
        bgVideo.play().then(() => {
            animatePlaybackRate(bgVideo, bgVideo.playbackRate || 0, 1.0, 1000);
        }).catch(e => console.error("Video play failed on resume:", e));
    }
}