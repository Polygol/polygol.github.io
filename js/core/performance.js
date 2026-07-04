// --- Performance Auto-Detection ---
function detectPerformanceProfile() {
    const storedScore = localStorage.getItem('systemPerformanceScore');
    if (localStorage.getItem('performanceConfigured') === 'true' && storedScore !== null) {
        window.systemPerformanceScore = parseInt(storedScore);
        window.isLowEndDevice = (window.systemPerformanceScore <= 2);
        return;
    }

    console.log("[System] Assessing hardware performance...");
    let score = 0;
    
    // 1. CPU Cores
    const cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) score += 3;
    else if (cores >= 6) score += 2;
    else if (cores >= 4) score += 1;
    
    // 2. Memory
    const ram = navigator.deviceMemory || 4; 
    if (ram >= 8) score += 2;
    else if (ram >= 4) score += 1;
    
    // 3. GPU Check
    let isWeakGPU = false;
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                if (renderer.includes('llvm') || renderer.includes('swiftshader') || renderer.includes('mali') || renderer.includes('adreno')) {
                    isWeakGPU = true;
                }
            }
        }
    } catch(e) {}
    
    if (!isWeakGPU) score += 1;

    window.systemPerformanceScore = score;
    window.isLowEndDevice = (score <= 2);

    console.log(`[System] Performance Score: ${score}/6`);

    // 1. Glass Effects - Default to high-end '5' to match custom styles and prevent downgrades [1]
    if (localStorage.getItem('glassEffectsMode') === null) {
        localStorage.setItem('glassEffectsMode', '5');
    }

    // 2. Low End Optimizations (Score <= 2)
    if (score <= 2) {
        console.log("[System] Low-end device detected. Maximizing performance.");
        if (localStorage.getItem('glassEffectsMode') === null) {
            localStorage.setItem('glassEffectsMode', '0');
        }
    } else {
        if (localStorage.getItem('animationsEnabled') === null) localStorage.setItem('animationsEnabled', 'true');
    }

    window.systemPerformanceScore = score;
    window.isLowEndDevice = (score <= 2);
    localStorage.setItem('systemPerformanceScore', score);
    localStorage.setItem('performanceConfigured', 'true');

    if (window.isLowEndDevice) {
        document.body.classList.add('low-end-device');
    }
}

// Run immediately to ensure settings are present before main logic reads them
detectPerformanceProfile();

// Global Interaction Tracker for Performance Heuristics
window.lastUserInteraction = Date.now();
let _interactionThrottle = false;
['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (!_interactionThrottle) {
            window.lastUserInteraction = Date.now();
            _interactionThrottle = true;
            // Only record interaction once per second to avoid freezing the CPU on scroll
            setTimeout(() => _interactionThrottle = false, 1000);
        }
    }, { passive: true, capture: true });
});

// --- System Garbage Collector ---
const SystemGC = {
    isRunning: false,
    lastRun: 0,
    INTERVAL_MS: 15 * 60 * 1000, // 15 minutes

    async run(force = false) {
        const now = Date.now();
        if (this.isRunning) return;
        const isAggressive = localStorage.getItem('aggressiveGC') === 'true';
        const interval = isAggressive ? 60000 : this.INTERVAL_MS;
        if (!force && (now - this.lastRun < interval)) return;

        this.isRunning = true;
        console.log("[SystemGC] Starting comprehensive garbage collection...");

        try {
            // 1. DOM Sweep: Orphaned Embeds
            const allEmbeds = document.querySelectorAll('.fullscreen-embed');
            const activeUrl = document.querySelector('.fullscreen-embed[style*="display: block"]')?.dataset?.embedUrl;
            let removedEmbeds = 0;

            allEmbeds.forEach(embed => {
                const url = embed.dataset.embedUrl;
                // If it's not the active app, and not in the minimized cache, it's an orphan
                if (url !== activeUrl && window.minimizedEmbeds && !window.minimizedEmbeds[url]) {
                    const iframe = embed.querySelector('iframe');
                    if (iframe) {
                        iframe.src = 'about:blank'; // Free memory
                        iframe.remove();
                    }
                    embed.remove();
                    removedEmbeds++;
                }
            });
            if (removedEmbeds > 0) console.log(`[SystemGC] Cleared ${removedEmbeds} orphaned embeds.`);

            // 2. SwapManager (IndexedDB) Sweep: Stale Snapshots
            if (typeof SwapManager !== 'undefined' && SwapManager.db) {
                const tx = SwapManager.db.transaction(SwapManager.storeName, 'readwrite');
                const store = tx.objectStore(SwapManager.storeName);
                const req = store.getAllKeys();
                
                req.onsuccess = () => {
                    const keys = req.result;
                    let removedKeys = 0;
                    
                    keys.forEach(key => {
                        if (typeof key !== 'string') return;
                        
                        // Clean app snapshots
                        if (key.startsWith('app_snap_')) {
                            const url = key.replace('app_snap_', '');
                            if (url !== activeUrl && window.minimizedEmbeds && !window.minimizedEmbeds[url]) {
                                store.delete(key);
                                removedKeys++;
                            }
                        }
                        
                        // Clean widget snapshots
                        if (key.startsWith('widget_snap_')) {
                            const idx = parseInt(key.replace('widget_snap_', ''));
                            if (isNaN(idx) || (window.activeWidgets && !window.activeWidgets[idx])) {
                                store.delete(key);
                                removedKeys++;
                            }
                        }
                    });
                    if (removedKeys > 0) console.log(`[SystemGC] Cleared ${removedKeys} stale swap entries.`);
                };
            }

            // 3. Memory Tracking Arrays Sweep
            if (window.appHistoryStack && window.appHistoryStack.length > 20) {
                window.appHistoryStack = window.appHistoryStack.slice(-20);
            }

            // 4. Timeout/Interval Sweep
            if (window.minimizeTimeouts) {
                for (const url in window.minimizeTimeouts) {
                    if (window.minimizedEmbeds && !window.minimizedEmbeds[url] && url !== activeUrl) {
                        clearTimeout(window.minimizeTimeouts[url]);
                        delete window.minimizeTimeouts[url];
                    }
                }
            }

            // 5. App Usage Tracking Sweep (Remove uninstalled apps)
            if (window.apps && window.appUsage) {
                let usageChanged = false;
                for (const appName in window.appUsage) {
                    if (!window.apps[appName]) {
                        delete window.appUsage[appName];
                        if (window.appLastOpened) delete window.appLastOpened[appName];
                        usageChanged = true;
                    }
                }
                if (usageChanged) {
                    localStorage.setItem('appUsage', JSON.stringify(window.appUsage));
                    if (window.appLastOpened) localStorage.setItem('appLastOpened', JSON.stringify(window.appLastOpened));
                }
            }

            // 6. Force GC Hint
            let _gcHint = new ArrayBuffer(1024 * 1024 * 2);
            _gcHint = null;

        } catch (e) {
            console.error("[SystemGC] Error during garbage collection:", e);
        } finally {
            this.lastRun = now;
            this.isRunning = false;
            console.log("[SystemGC] GC cycle complete.");
        }
    }
};

// --- Dynamic Resource Manager ---
const ResourceManager = {
    // Configuration
    FPS_CHECK_INTERVAL: 2000,
    MEMORY_CHECK_INTERVAL: 20000,
    // We rely on relative drops now, but keep a sanity floor
    MIN_ABSOLUTE_FPS: 15, 
    THROTTLE_FPS_THRESHOLD: 10, 
    RECOVERY_THRESHOLD: 5, 
    
    // State
    lastFrameTime: 0,
    frameCount: 0,
    lastFpsCheck: 0,
    isStruggling: false,
    recoveryCounter: 0,
    originalGlassMode: null, 
    appActivity: {},
    gurappMetrics: {},
    pressureState: 'nominal',
    maxObservedFps: 0, // Baseline for relative drop detection
    
    // Predictive History Arrays
    fpsHistory: [],
    memoryHistory: [],
    penaltyMultiplier: 1, // Makes it harder to recover if we keep failing
    
    // IDs for cancellation
    rafId: null,
    intervalId: null,
    
    // Limits (bytes)
    softMemoryLimit: (navigator.deviceMemory || 4) * 1024 * 1024 * 1024 * 0.5,
    
    init() {
        if (localStorage.getItem('resourceManagerEnabled') === 'false') {
            console.log("[System] Resource Manager disabled by user settings.");
            return;
        }
        if (this.isInitialized) return; 

        console.log("[System] Resource Manager Initialized");
        
        // CPU OPTIMIZATION: Replace manual 60fps rAF polling with native PerformanceObserver
        try {
            this.observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    // A task longer than 100ms indicates heavy main-thread blocking (jank/lag)
                    if (entry.duration > 100) {
                        const hasWindows = document.querySelector('.fullscreen-embed') || Object.keys(minimizedEmbeds).length > 0;
                        if (hasWindows && !document.hidden) {
                            console.warn(`[System] Main thread lag detected (${entry.duration.toFixed(0)}ms). Adaptating...`);
                            this.handleHighLoad();
                            this.recoveryCounter = 0;
                        }
                    }
                }
            });
            this.observer.observe({ type: 'longtask', buffered: false });
        } catch (e) {
            console.warn("[System] PerformanceObserver (longtask) not supported.");
        }

        this.intervalId = setInterval(() => {
            this.checkMemory();
            SystemGC.run(); // Will self-throttle to 15 mins unless forced
            
            // If we are struggling but tasks are clearing up, attempt recovery
            if (this.isStruggling) {
                this.recoveryCounter++;
                if (this.recoveryCounter >= (this.RECOVERY_THRESHOLD * this.penaltyMultiplier)) {
                    this.attemptRecovery();
                }
            } else {
                this.penaltyMultiplier = Math.max(this.penaltyMultiplier - 0.1, 1);
            }
        }, this.MEMORY_CHECK_INTERVAL);
        
        this.initPressureObserver();

        window.addEventListener('message', (e) => {
            if (e.data.type === 'gurapp-performance-report') {
                this.gurappMetrics[e.data.appId] = {
                    fps: e.data.fps,
                    memory: e.data.memory,
                    lastUpdate: Date.now()
                };
            }
        });

        this.isInitialized = true;
    },

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isInitialized = false;
        console.log("[System] Resource Manager Stopped");
    },

    async initPressureObserver() {
        if ('PressureObserver' in window) {
            try {
                const observer = new PressureObserver((records) => {
                    const lastRecord = records[records.length - 1];
                    this.pressureState = lastRecord.state;
                    
                    // Trigger adaptation immediately on critical thermal/CPU pressure
                    if (this.pressureState === 'critical') {
                        console.warn(`[System] Critical CPU Pressure detected.`);
                        this.handleHighLoad();
                        this.recoveryCounter = 0;
                    }
                });
                await observer.observe('cpu', { sampleInterval: 2000 });
                console.log("[System] Compute Pressure API active.");
            } catch (e) {
                console.log("[System] Compute Pressure API not available:", e);
            }
        }
    },

    markAppActive(url) {
        this.appActivity[url] = Date.now();
    },

    async checkMemory() {
        // --- Unknown Background Cleanup Logic ---
        const now = Date.now();
        const UNKNOWN_TIMEOUT = 5 * 60 * 1000; // 5 Minutes
        const backgroundUrls = Object.keys(minimizedEmbeds);

        // --- Strict App Limit ---
        // Safely restrict max background apps to prevent DOM/Memory bloat over long uptimes
        const maxApps = (navigator.deviceMemory || 4) + 16; 
        if (backgroundUrls.length > maxApps) {
            console.warn(`[ResourceManager] Strict App Count Limit Reached (${backgroundUrls.length}/${maxApps}).`);
            this.killLeastUsedApp(); 
        }

        backgroundUrls.forEach(url => {
            // 1. Identify if the app is "Officially Installed"
            const isInstalled = Object.values(apps).some(app => app.url === url);
            
            if (!isInstalled) {
                const lastActive = this.appActivity[url] || 0;
                
                // 2. If it hasn't been focused for > 5 minutes, kill it
                if (now - lastActive > UNKNOWN_TIMEOUT) {
                    console.log(`[ResourceManager] Closing inactive unknown app: ${url}`);
                    
                    // 3. Safety check: Don't kill it if it's the current Media App
                    const appName = Object.keys(apps).find(name => apps[name].url === url);
                    if (appName !== activeMediaSessionApp) {
                        forceCloseApp(url);
                    }
                }
            }
        });
		
        if (!performance.measureUserAgentSpecificMemory) return;
        if (!window.crossOriginIsolated) {
            // Heuristic Fallback
            const appCount = Object.keys(minimizedEmbeds).length;
            const maxApps = (navigator.deviceMemory || 4);
            if (appCount > maxApps) {
                console.warn("[System] Heuristic Memory Pressure.");
                this.handleHighLoad(); // Downgrade visuals
                this.killLeastUsedApp(); // Free memory
            }
            return;
        }

		try {
            const result = await performance.measureUserAgentSpecificMemory();
            const used = result.bytes;
            
            this.memoryHistory.push(used);
            if (this.memoryHistory.length > 5) this.memoryHistory.shift();

            // Predictive Memory Analysis
            let isSpiking = false;
            if (this.memoryHistory.length === 5) {
                const growth = this.memoryHistory[4] - this.memoryHistory[0];
                const growthRate = growth / 4; // Bytes grown per check
                // If growing faster than 25MB per check and we're over 60% of limit
                if (growthRate > 25 * 1024 * 1024 && used > this.softMemoryLimit * 0.6) {
                    console.warn(`[System] Predictive Memory Warning: Growing at ${(growthRate/1024/1024).toFixed(1)}MB/tick.`);
                    isSpiking = true;
                }
            }

            if (used > this.softMemoryLimit || isSpiking) {
                console.warn(`[System] Memory Critical/Spiking: ${(used / 1024 / 1024).toFixed(0)}MB used.`);
                this.handleHighLoad(); 
                this.killLeastUsedApp(); 
            }
        } catch (error) {}
    },

    handleHighLoad() {
        const now = Date.now();
        // Prevent rapid cascading downgrades (10s cooldown)
        if (this.isStruggling && this._lastDowngrade && (now - this._lastDowngrade < 10000)) return;

        this.isStruggling = true;
        this._lastDowngrade = now;

        // Bypassed automated glass downgrades to protect visual fidelity [1]
        console.log("[System] Resource Manager detected high load, but Glass downgrading is explicitly disabled.");
    },

    attemptRecovery() {
        this.isStruggling = false;
        this.recoveryCounter = 0;
        this._lastDowngrade = 0;
        console.log("[System] Performance stabilized. Recovery processed.");
    },

    killLeastUsedApp() {
        const bgApps = Object.keys(minimizedEmbeds);
        if (bgApps.length === 0) return;

        let oldestUrl = null;
        let oldestTime = Infinity;

        bgApps.forEach(url => {
            const time = this.appActivity[url] || 0;
            if (time < oldestTime) {
                oldestTime = time;
                oldestUrl = url;
            }
        });
		
		if (oldestUrl) {
            const appName = Object.keys(apps).find(n => apps[n].url === oldestUrl) || "an app";
            console.log(`[System] OOM Killer closing: ${appName}`);
            
            forceCloseApp(oldestUrl);
            
            showPopup(`Closed ${appName} to free memory`);
            SystemGC.run(true); // Force GC immediately after OOM kill
        }
    }
};