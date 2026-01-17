// kirbIndustries Services
// Handles fetching and displaying ads from the octagon repository

const AD_SOURCE_URL = 'https://raw.githubusercontent.com/kirbIndustries/assets/refs/heads/main/kirbindustries-ads-service/octagon/small.json';

async function initAdsService() {
    const container = document.getElementById('kirbindustries-ads-service');
    if (!container) return;

    try {
        // Fetch the ad data
        const response = await fetch(AD_SOURCE_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check if ads exist in the JSON
        if (!data || !data.ads || !Array.isArray(data.ads) || data.ads.length === 0) {
            console.log('[Ads] No ads available in feed.');
            container.style.display = 'none';
            return;
        }

        // Select a random ad from the list
        const ad = data.ads[Math.floor(Math.random() * data.ads.length)];

        // Get DOM Elements
        const imgEl = container.querySelector('#kirbindustries-ads-service-img img');
        const headerEl = document.getElementById('kirbindustries-ads-service-header');
        const iconEl = document.getElementById('kirbindustries-ads-service-icon');
        const descEl = document.getElementById('kirbindustries-ads-service-description');
        const ctaBtn = document.getElementById('kirbindustries-ads-service-cta');

        // Apply Data
        if (headerEl) headerEl.textContent = ad.name;
        if (descEl) descEl.textContent = ad.description;
        
        // Update Icon (Material Symbol)
        if (iconEl && ad.icon) {
            iconEl.textContent = ad.icon;
        }

        // Update Image
        if (imgEl && ad.image) {
            imgEl.src = ad.image;
            imgEl.alt = ad.name;
        }

        // Update CTA Button
        if (ctaBtn) {
            // Update the text part of the button (preserving the icon inside if specific logic isn't applied)
            // Or just update the click handler
            ctaBtn.onclick = (e) => {
                e.stopPropagation();
                if (ad.url) {
                    window.open(ad.url, '_blank');
                }
            };
        }

        // Ensure container is visible
        container.style.display = 'flex';

    } catch (error) {
        console.warn('[Ads] Service unavailable:', error);
        // Hide the ad container if the service fails
        container.style.display = 'none';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initAdsService);
