// --- Performance Auto-Detection ---
function detectPerformanceProfile() {
    if (localStorage.getItem('performanceConfigured') === 'true') return;

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

    console.log(`[System] Performance Score: ${score}/6`);

    // 1. Glass Effects
    if (localStorage.getItem('glassEffectsMode') === null) {
        if (score >= 5 && !isWeakGPU) {
            // High-end: Enable full Liquid effects
            localStorage.setItem('glassEffectsMode', 'on');
        } else if (score >= 4) {
            // Mid-range: Use Frosted (Blur only, cheaper than SVG)
            console.log("[System] Defaulting Glass Effects to Focused.");
            localStorage.setItem('glassEffectsMode', 'focused');
        } else {
            // Low-end: Disable effects
            console.log("[System] Disabling Glass Effects for performance.");
            localStorage.setItem('glassEffectsMode', 'off');
        }
    }

    // 2. Low End Optimizations (Score <= 2)
    if (score <= 2) {
        console.log("[System] Low-end device detected. Maximizing performance.");
        
        // Enable High Contrast (Removes all backdrop-filters entirely)
        if (localStorage.getItem('highContrast') === null) {
            localStorage.setItem('highContrast', 'true');
        }
        
        // Disable Animations
        if (localStorage.getItem('animationsEnabled') === null) {
            localStorage.setItem('animationsEnabled', 'false');
        }
    } else {
        if (localStorage.getItem('animationsEnabled') === null) localStorage.setItem('animationsEnabled', 'true');
    }

    localStorage.setItem('performanceConfigured', 'true');
}

// Run immediately to ensure settings are present before main logic reads them
detectPerformanceProfile();

// Global Interaction Tracker for Performance Heuristics
window.lastUserInteraction = Date.now();
['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'].forEach(evt => {
    window.addEventListener(evt, () => {
        window.lastUserInteraction = Date.now();
    }, { passive: true, capture: true });
});

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
        if (this.rafId) return; // Already running

        console.log("[System] Resource Manager Initialized");
        this.lastFpsCheck = performance.now();
        this.rafId = requestAnimationFrame(t => this.loop(t));
        this.intervalId = setInterval(() => this.checkMemory(), this.MEMORY_CHECK_INTERVAL);
        
        this.initPressureObserver();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isStruggling = false;
                this.recoveryCounter = 0;
                // Don't count frames when hidden to avoid messing up averages
                this.lastFpsCheck = performance.now();
                this.frameCount = 0;
            }
        });

        window.addEventListener('message', (e) => {
            if (e.data.type === 'gurapp-performance-report') {
                this.gurappMetrics[e.data.appId] = {
                    fps: e.data.fps,
                    memory: e.data.memory,
                    lastUpdate: Date.now()
                };
            }
        });
    },

    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
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

    loop(now) {
        this.frameCount++;
        
        if (now - this.lastFpsCheck > this.FPS_CHECK_INTERVAL) {
            const duration = now - this.lastFpsCheck;
            const fps = (this.frameCount / duration) * 1000;
            
            // Calculate Global FPS (System + Active Apps)
            let totalFps = fps;
            let count = 1;
            
            Object.values(this.gurappMetrics).forEach(m => {
                // Only count recent reports (last 5s)
                if (Date.now() - m.lastUpdate < 5000) {
                    totalFps += m.fps;
                    count++;
                }
            });
            
            // FIX: Change 'const' to 'let' to allow reassignment below
            let averageFps = totalFps / count;
            
            // Dynamic Baseline: Learn the screen's refresh rate capabilities
            if (fps > averageFps) {
                averageFps = fps;
            }

            const hasWindows = document.querySelector('.fullscreen-embed') || Object.keys(minimizedEmbeds).length > 0;
			const isInteracting = (Date.now() - window.lastUserInteraction) < 5000;
            const isPressureHigh = this.pressureState === 'critical' || this.pressureState === 'serious';

            if (!document.hidden && hasWindows) {
                this.fpsHistory.push(fps);
                if (this.fpsHistory.length > 5) this.fpsHistory.shift();

                const relativeThreshold = averageFps * 0.7;
                const threshold = Math.max(this.MIN_ABSOLUTE_FPS, relativeThreshold);
                const isLaggy = fps < threshold && fps > this.THROTTLE_FPS_THRESHOLD;

                // Predictive CPU Trend Analysis
                // If FPS drops consistently over 4 checks, preemptively adapt before it gets worse
                const isDegrading = this.fpsHistory.length === 5 && 
                                    this.fpsHistory[4] < this.fpsHistory[3] && 
                                    this.fpsHistory[3] < this.fpsHistory[2] &&
                                    this.fpsHistory[4] < (threshold * 1.1);

                if ((isLaggy && (isInteracting || isPressureHigh)) || this.pressureState === 'critical' || isDegrading) {
                    if (isDegrading && !isLaggy) console.warn(`[System] Predictive adaptation: FPS steadily degrading.`);
                    else if (isLaggy) console.warn(`[System] Visual Lag Detected (${fps.toFixed(1)} / ${averageFps.toFixed(0)} FPS).`);
                    
                    this.handleHighLoad();
                    this.recoveryCounter = 0;
                    
                    // Increase penalty if we keep struggling
                    if (isDegrading || this.pressureState === 'critical') {
                        this.penaltyMultiplier = Math.min(this.penaltyMultiplier + 0.5, 3);
                    }
                } 
                else if (fps >= threshold) {
                    if (this.isStruggling) {
                        if (!isPressureHigh) {
                            this.recoveryCounter++;
                            // Require more stable frames if we've repeatedly failed
                            if (this.recoveryCounter >= (this.RECOVERY_THRESHOLD * this.penaltyMultiplier)) {
                                this.attemptRecovery();
                            }
                        } else {
                            this.recoveryCounter = 0; 
                        }
                    } else {
                        // Slowly forgive penalty over long stable periods
                        this.penaltyMultiplier = Math.max(this.penaltyMultiplier - 0.1, 1);
                    }
                }
            }

            this.lastFpsCheck = now;
            this.frameCount = 0;
        }
        
        this.rafId = requestAnimationFrame(t => this.loop(t));
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
        if (this.isStruggling) return; 
        this.isStruggling = true;

        const currentMode = localStorage.getItem('glassEffectsMode') || 'on';
        
        if (!this.originalGlassMode) {
            this.originalGlassMode = currentMode;
        }
        
        if (currentMode === 'on' || currentMode === 'frosted') {
            console.log("[System] Downgrading Glass to Focused.");
            this.applyDowngrade('focused');
        }
    },

    attemptRecovery() {
        if (!this.originalGlassMode) return;
        
        console.log("[System] Performance stabilized. Restoring settings.");
        this.applyDowngrade(this.originalGlassMode);
        
        this.isStruggling = false;
        this.originalGlassMode = null;
        this.recoveryCounter = 0;
    },

    applyDowngrade(mode) {
        localStorage.setItem('glassEffectsMode', mode);
        const select = document.getElementById('glass-effects-mode');
        if (select) select.value = mode;
        broadcastSettingUpdate('glassEffectsMode', mode);
        applyGlassEffects();
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
        }
    }
};