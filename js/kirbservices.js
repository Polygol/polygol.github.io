// kirbIndustries Services
// Ad system, Analytics, Content Delivery

// --- Analytics ---
window.Analytics = {
    initialized: false,
    appStartTimes: {},
    wavesStartTimes: {},
    heartbeatTimer: null,

    init() {
        if (this.initialized) return;
        
        // Do not initialize until setup is complete
        const setupComplete = localStorage.getItem('hasVisitedBefore') === 'true';
        if (!setupComplete) return;

        const enabled = localStorage.getItem('telemetryEnabled') === 'true';
        if (!enabled) return;

        if (!document.getElementById('goatcounter-script')) {
            const script = document.createElement('script');
            script.id = 'goatcounter-script';
            script.dataset.goatcounter = "https://kirbindust.goatcounter.com/count";
            script.async = true;
            script.src = "//gc.zgo.at/count.js";
            document.head.appendChild(script);
        }
        
        this.initialized = true;
        
        window.addEventListener('error', (event) => {
            this.trackEvent('error', { 
                title: `JS Error: ${event.message}`, 
                path: `/error/${event.filename}` 
            });
        });

        console.log("[Analytics] Service Started");
    },

    disable() {
        this.initialized = false;
        clearInterval(this.heartbeatTimer);
        const script = document.getElementById('goatcounter-script');
        if (script) script.remove();
        if (window.goatcounter) window.goatcounter.no_onload = true;
        console.log("[Analytics] Service Disabled");
    },

    startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        // Track uptime every 30 minutes
        this.heartbeatTimer = setInterval(() => {
            this.trackEvent('heartbeat', { path: '/system/heartbeat', title: 'System Active' });
        }, 1800000);
    },

    trackEvent(name, options = {}) {
        if (!this.initialized || !window.goatcounter) return;
        let path = options.path || `/event/${name}`;
        if (!path.startsWith('/')) path = '/' + path;

        window.goatcounter.count({
            path: path,
            title: options.title || name,
            event: true
        });

        // Trigger any hot push actions waiting for this event
        if (typeof PushService !== 'undefined') {
            PushService.triggerHotAction(name);
        }
    },

    isUrlValid(url) {
        if (!url || typeof url !== 'string' || url.startsWith('internal://')) return false;
        try {
            new URL(url, window.location.origin);
            return true;
        } catch (e) {
            return false;
        }
    },

    getSanitizedPath(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            // Return only the pathname (e.g., /music/index.html) to strip query params/hashes
            return urlObj.pathname;
        } catch (e) {
            return url;
        }
    },

    trackAppOpen(appUrl) {
        if (!this.initialized || !this.isUrlValid(appUrl)) return;
        const cleanPath = this.getSanitizedPath(appUrl);
        this.appStartTimes[appUrl] = Date.now();
        this.trackEvent('app-open', { path: `/app${cleanPath}`, title: `Open: ${cleanPath}` });
    },

    trackAppClose(appUrl) {
        if (!this.initialized || !this.isUrlValid(appUrl)) return;
        const startTime = this.appStartTimes[appUrl];
        if (startTime) {
            const durationSeconds = Math.round((Date.now() - startTime) / 1000);
            const cleanPath = this.getSanitizedPath(appUrl);
            delete this.appStartTimes[appUrl];
            this.trackEvent('app-duration', { 
                path: `/app${cleanPath}/duration`, 
                title: `${cleanPath}: ${durationSeconds}s` 
            });
        }
    },

    trackWavesConnect(peerId) {
        if (!this.initialized) return;
        this.wavesStartTimes[peerId] = Date.now();
    },

    trackWavesDisconnect(peerId) {
        if (!this.initialized) return;
        const startTime = this.wavesStartTimes[peerId];
        if (startTime) {
            const durationSeconds = Math.round((Date.now() - startTime) / 1000);
            delete this.wavesStartTimes[peerId];
            this.trackEvent('waves-session', { 
                path: '/waves/duration', 
                title: `Remote Session: ${durationSeconds}s` 
            });
        }
    },

    trackWallpaperPreset(presetName) {
        if (!this.initialized) return;
        this.trackEvent('wallpaper-preset', { 
            path: `/wallpaper/preset/${presetName.replace(/\s+/g, '-').toLowerCase()}`, 
            title: `Preset: ${presetName}` 
        });
    }
};

// Initialize immediately upon script load
window.Analytics.init();

// --- PMS ---
const PUSH_SOURCE_URL = 'https://raw.githubusercontent.com/kirbIndustries/assets/refs/heads/main/kirbindustries-ads-service/fournongal/pushserve.json';

const PushService = {
    hotActions: [],

    async init() {
        if (!navigator.onLine) return;
        try {
            const res = await fetch(PUSH_SOURCE_URL, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.messages) {
                this.processMessages(data.messages);
            }
        } catch (e) {
            console.warn('[PushService] Failed to fetch push messages:', e);
        }
    },

    processMessages(messages) {
        const seen = JSON.parse(localStorage.getItem('seenPushMessages') || '[]');
        let updatedSeen = [...seen];
        const now = new Date();

        messages.forEach(msg => {
            if (!msg.id || seen.includes(msg.id)) return;

            // Check Validity Window
            if (msg.startDate && new Date(msg.startDate) > now) return;
            if (msg.endDate && new Date(msg.endDate) < now) return;

            // Random Chance Check
            if (typeof msg.chance === 'number' && Math.random() > msg.chance) {
                updatedSeen.push(msg.id); // Mark seen so it doesn't infinitely roll
                return; 
            }

            // Pick Random Variant (A/B testing or variety)
            let finalMsg = msg;
            if (msg.variants && Array.isArray(msg.variants) && msg.variants.length > 0) {
                const variant = msg.variants[Math.floor(Math.random() * msg.variants.length)];
                finalMsg = { ...msg, ...variant };
            }

            // Hot Action Routing vs Immediate
            if (finalMsg.triggerEvent) {
                this.hotActions.push(finalMsg);
                updatedSeen.push(finalMsg.id); // It's queued, don't queue it again later
            } else {
                this.showMessage(finalMsg);
                updatedSeen.push(finalMsg.id);
            }
        });

        localStorage.setItem('seenPushMessages', JSON.stringify(updatedSeen));
    },

    triggerHotAction(eventName) {
        const triggered = this.hotActions.filter(m => m.triggerEvent === eventName);
        triggered.forEach(msg => {
            setTimeout(() => {
                this.showMessage(msg);
            }, msg.triggerDelay || 0);
            
            // Remove from queue so it only fires once
            this.hotActions = this.hotActions.filter(m => m.id !== msg.id);
        });
    },

    showMessage(msg) {
        let options = {
            heading: msg.title || 'System Message',
            icon: msg.icon || 'info',
            system: !msg.appicon // If it has a custom icon, we render it like an app
        };

        // Support for custom app icons
        if (msg.appicon) {
            options.iconUrl = msg.appicon;
            options.appName = msg.appName || 'Message';
        }

        if (msg.button) {
            options.buttonText = msg.button;
            options.buttonAction = () => {
                if (msg.customFunction && typeof window[msg.customFunction] === 'function') {
                    window[msg.customFunction]();
                } else if (msg.buttonurl) {
                    if (typeof createFullscreenEmbed === 'function') {
                        createFullscreenEmbed(msg.buttonurl);
                    } else {
                        window.open(msg.buttonurl, '_blank');
                    }
                }
            };
        }

        if (typeof showNotification === 'function') {
            showNotification(msg.message, options);
        }
    }
};

// --- Ads ---
const AD_SOURCE_URL = 'https://raw.githubusercontent.com/kirbIndustries/assets/refs/heads/main/kirbindustries-ads-service/octagon/small.json';
const ROTATION_INTERVAL = 600000; // 10 Minutes in ms

let adQueue = [];
let adTimer = null;
let isAdDragging = false;
let adStartX = 0;
let adCurrentX = 0;

async function initAdsService() {
    const container = document.getElementById('kirbindustries-ads-service');
    if (!container) return;

    // 0. Check Connectivity
    if (!navigator.onLine) {
        container.style.display = 'none';
        if (adTimer) clearInterval(adTimer);
        return;
    }

    try {
        // 1. Fetch Data
        const response = await fetch(AD_SOURCE_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!data || !data.ads || !Array.isArray(data.ads) || data.ads.length === 0) {
            container.style.display = 'none';
            return;
        }

        // 2. Filter Blocked Ads
        const blockedAds = JSON.parse(localStorage.getItem('kirbindustriesAdsService_blockedAds') || '[]');
        adQueue = data.ads.filter(ad => !blockedAds.includes(ad.id));

        if (adQueue.length === 0) {
            console.log('[Ads] All ads blocked by user.');
            container.style.display = 'none';
            return;
        }

        // 3. Shuffle Queue
        shuffleQueue();

        // 4. Initial Render
        renderCurrentAd();

        // 5. Start Rotation Timer
        resetAdTimer();

        // 6. Setup Gestures
        setupAdGestures(container);

        // Ensure visible
        container.style.display = 'flex';
    } catch (error) {
        console.warn('[Ads] Service unavailable:', error);
        container.style.display = 'none';
    }
}

function shuffleQueue() {
    for (let i = adQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [adQueue[i], adQueue[j]] = [adQueue[j], adQueue[i]];
    }
}

function renderCurrentAd() {
    const container = document.getElementById('kirbindustries-ads-service');
    if (!container || adQueue.length === 0) return;

    const ad = adQueue[0];

    // Get Elements
    const imgEl = container.querySelector('#kirbindustries-ads-service-img img');
    const headerEl = document.getElementById('kirbindustries-ads-service-header');
    const iconEl = document.getElementById('kirbindustries-ads-service-icon');
    const descEl = document.getElementById('kirbindustries-ads-service-description');
    const ctaBtn = document.getElementById('kirbindustries-ads-service-cta');

    // Apply Content with Fade Effect
    container.style.opacity = '0';
    
    setTimeout(() => {
        if (headerEl) headerEl.textContent = ad.name;
        if (descEl) descEl.textContent = ad.description;
        if (iconEl) iconEl.textContent = ad.icon || 'star'; 
        
        if (imgEl) {
            imgEl.src = ad.image || ''; 
            imgEl.alt = ad.name;
        }

        if (ctaBtn) {
            // Remove old listeners by cloning
            const newBtn = ctaBtn.cloneNode(true);
            ctaBtn.parentNode.replaceChild(newBtn, ctaBtn);
            
            newBtn.onclick = (e) => {
                e.stopPropagation();
                window.Analytics?.trackEvent('ad-click', { 
                    path: `/ads/click/${ad.id}`, 
                    title: `Ad Click: ${ad.name}` 
                });
                if (ad.url) window.open(ad.url, '_blank');
            };
        }
        
        // Reset Transform from swipes
        container.style.transform = 'translateX(0)';
        container.style.opacity = '1';
    }, 200);
}

function nextAd() {
    if (adQueue.length <= 1) return; // No rotation needed if 1 or 0 items
    
    // Rotate queue: Move first item to end
    const current = adQueue.shift();
    adQueue.push(current);
    
    renderCurrentAd();
    resetAdTimer();
}

async function confirmBlockAd(container) {
    if (adQueue.length === 0) return;
    const adToBlock = adQueue[0];

    let confirmed = false;
    if (typeof showCustomConfirm === 'function') {
        confirmed = await showCustomConfirm(`Hide ads for ${adToBlock.name}?`);
    }

    if (confirmed) {
        blockAd();
    } else {
        // User cancelled, snap back
        container.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        container.style.transform = 'translateX(0)';
        container.style.opacity = '1';
        resetAdTimer();
    }
}

function blockAd() {
    if (adQueue.length === 0) return;

    const adToBlock = adQueue[0];

    window.Analytics?.trackEvent('ad-block', { 
        path: `/ads/block/${adToBlock.id}`, 
        title: `Ad Blocked: ${adToBlock.name}` 
    });
    
    // Save to LocalStorage
    const blockedAds = JSON.parse(localStorage.getItem('blocked_ads') || '[]');
    if (!blockedAds.includes(adToBlock.id)) {
        blockedAds.push(adToBlock.id);
        localStorage.setItem('blocked_ads', JSON.stringify(blockedAds));
    }

    // Remove from queue
    adQueue.shift();

    if (adQueue.length === 0) {
        // No ads left
        const container = document.getElementById('kirbindustries-ads-service');
        if (container) container.style.display = 'none';
    } else {
        renderCurrentAd();
        resetAdTimer();
    }
}

function resetAdTimer() {
    if (adTimer) clearInterval(adTimer);
    adTimer = setInterval(nextAd, ROTATION_INTERVAL);
}

function setupAdGestures(element) {
    const handleStart = (x) => {
        isAdDragging = true;
        adStartX = x;
        element.style.transition = 'none';
        // Pause rotation while user interacts
        if (adTimer) clearInterval(adTimer);
    };

    const handleMove = (x) => {
        if (!isAdDragging) return;
        adCurrentX = x;
        const diff = adCurrentX - adStartX;
        
        // Visual Feedback
        element.style.transform = `translateX(${diff}px)`;
        
        // Opacity fade based on distance
        const opacity = 1 - (Math.abs(diff) / 300);
        element.style.opacity = Math.max(0, opacity);
    };

    const handleEnd = () => {
        if (!isAdDragging) return;
        isAdDragging = false;
        element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

        const diff = adCurrentX - adStartX;
        const threshold = 80; // px to trigger action

        if (diff < -threshold) {
            // Swipe LEFT -> Next Ad
            const activeAd = adQueue[0];
            if (activeAd) {
                window.Analytics?.trackEvent('ad-next', { 
                    path: `/ads/next/${activeAd.id}`, 
                    title: `Ad Swipe Next: ${activeAd.name}` 
                });
            }
            element.style.transform = 'translateX(-120%)';
            element.style.opacity = '0';
            setTimeout(nextAd, 300);
        } else if (diff > threshold) {
            // Swipe RIGHT -> Confirm Block
            element.style.transform = 'translateX(120%)';
            element.style.opacity = '0';
            closeControls();
            // Wait for animation to finish before showing dialog
            setTimeout(() => confirmBlockAd(element), 300);
        } else {
            // Snap Back
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
            resetAdTimer();
        }
    };

    // Touch
    element.addEventListener('touchstart', e => handleStart(e.touches[0].clientX), {passive: true});
    element.addEventListener('touchmove', e => handleMove(e.touches[0].clientX), {passive: true});
    element.addEventListener('touchend', handleEnd);

    // Mouse
    element.addEventListener('mousedown', e => { e.preventDefault(); handleStart(e.clientX); });
    document.addEventListener('mousemove', e => { if(isAdDragging) { e.preventDefault(); handleMove(e.clientX); } });
    document.addEventListener('mouseup', handleEnd);
}

// Connectivity Listeners
window.addEventListener('online', () => {
    // Re-initialize (fetch new data/resume) when connection returns
    initAdsService();
});

window.addEventListener('offline', () => {
    // Immediately hide and pause when connection is lost
    const container = document.getElementById('kirbindustries-ads-service');
    if (container) container.style.display = 'none';
    if (adTimer) clearInterval(adTimer);
});

// Initialize Services (Only if not disabled by user)
document.addEventListener('DOMContentLoaded', () => {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    
    if (disabledSys.includes('kirbServices')) {
        console.log("[System] kirbServices disabled by user.");
    } else {
        window.Analytics.init();
        initAdsService();
        PushService.init();
    }
});