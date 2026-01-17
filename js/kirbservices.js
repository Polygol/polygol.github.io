// kirbIndustries Services
// Handles fetching, queueing, blocking, and gestures for ads

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
        const blockedAds = JSON.parse(localStorage.getItem('blocked_ads') || '[]');
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
        if (iconEl) iconEl.textContent = ad.icon || 'star'; // Default icon
        
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

function blockAd() {
    if (adQueue.length === 0) return;

    const adToBlock = adQueue[0];
    
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
        const threshold = 100; // px to trigger action

        if (diff > threshold) {
            // Swipe Right -> Next Ad
            element.style.transform = 'translateX(120%)';
            element.style.opacity = '0';
            setTimeout(nextAd, 300);
        } else if (diff < -threshold) {
            // Swipe Left -> Block Ad
            element.style.transform = 'translateX(-120%)';
            element.style.opacity = '0';
            setTimeout(blockAd, 300);
        } else {
            // Snap Back
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
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

// Initialize
document.addEventListener('DOMContentLoaded', initAdsService);
