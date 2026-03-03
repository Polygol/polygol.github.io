window.activeNotificationsList = []; 
window.activeLiveActivityData = null; // { icon, text }
window.activeRemoteLiveActivity = null; // { url, height, id }
let widgetSnapshotInterval = null; // Timer for widget updates
window.widgetSnapshotCache = {};

window.updateActiveWavesPeers = function(peersMap) {
    const container = document.getElementById('active-peers-container');
    if (!container) return;

    if (!peersMap || typeof peersMap !== 'object') {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const uniqueUsers = new Map();
    const FALLBACK_AVATAR = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffffff'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

    Object.values(peersMap).forEach(p => {
        const profile = p.profile || { name: "Unknown", avatar: null };
        uniqueUsers.set(profile.name || p.id, profile);
    });

    if (uniqueUsers.size === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    // Force display flex to ensure visibility
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '0'; 

    let index = 0;
    uniqueUsers.forEach(profile => {
        const avatar = document.createElement('img');
        
        let src = profile.avatar;
        
        // --- FIX: Smart SVG Encoding ---
        if (src && src.startsWith('data:image/svg+xml')) {
            const commaIndex = src.indexOf(',');
            if (commaIndex > -1) {
                const rawContent = src.substring(commaIndex + 1);
                try {
                    // 1. Decode first to handle existing %23 (colors)
                    const decoded = decodeURIComponent(rawContent);
                    // 2. Re-encode strictly to handle < and > characters
                    src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(decoded);
                } catch (e) {
                    // Fallback if decode fails
                    src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(rawContent);
                }
            }
        }
        
        if (!src) src = FALLBACK_AVATAR;
        
        avatar.src = src;
        avatar.title = profile.name;
        
        avatar.style.cssText = `
            width: 32px; 
            height: 32px; 
            border-radius: 50%; 
            object-fit: cover;
            background: var(--search-background);
            z-index: ${100 - index};
            transition: transform 0.2s;
            display: block; 
            margin-left: ${index > 0 ? '-12px' : '0'};
        `;
        
        avatar.onerror = function() { 
            this.onerror = null; 
            this.src = FALLBACK_AVATAR; 
            this.style.background = '#888';
        };
        
        container.appendChild(avatar);
        index++;
    });
};

window.makeAnnouncement = function(text, forceTTS = null, profile = null) {
    if (!text) return;
    
    let url = `/assets/gurapp/intl/waves/announce.html?text=${encodeURIComponent(text)}`;
    
    if (forceTTS !== null) {
        url += `&tts=${forceTTS}`;
    }

    // Add Sender Info
    if (profile && profile.name) {
        url += `&sender=${encodeURIComponent(profile.name)}`;
        
        // Only pass avatar if it's a valid string and not too huge (URLs have limits)
        if (profile.avatar && profile.avatar.length < 8000) {
            url += `&avatar=${encodeURIComponent(profile.avatar)}`;
        }
    }
    
    createFullscreenEmbed(url);
};

// Function to update remote state
function updateRemoteNotifications() {
    if (window.WavesHost) {
        // Combine standard notifications and live activity
        const list = [...window.activeNotificationsList];
        // If we have a full iframe live activity, prioritize sending that config
        if (window.activeRemoteLiveActivity) {
            window.WavesHost.pushLiveActivityStart(window.activeRemoteLiveActivity);
        }
        if (window.activeLiveActivityData) {
            list.unshift(window.activeLiveActivityData); // Put live activity summary on top
        }
        window.WavesHost.pushNotificationUpdate(list);
    }
}

// Listener for widget snapshots
window.addEventListener('message', (event) => {
    if (event.data.type === 'screenshot-response' && event.data.screenshotDataUrl) {
        // Find which widget sent this
        const iframes = document.querySelectorAll('.widget-instance iframe');
        for (const iframe of iframes) {
            if (iframe.contentWindow === event.source) {
                const widgetInstance = iframe.closest('.widget-instance');
                if (widgetInstance) {
                    const index = widgetInstance.dataset.widgetIndex;
                    // Write to Swap
                    SwapManager.set('widget_snap_' + index, event.data.screenshotDataUrl);
                }
                break;
            }
        }
    }
});

async function broadcastWidgetSnapshots() {
    if (!window.WavesHost || document.hidden) return;
    
    const widgets = document.querySelectorAll('.widget-instance');
    if (widgets.length === 0) {
        window.WavesHost.pushWidgetUpdate([]);
        return;
    }

    // OPTIMIZATION: Defer heavy canvas operations to idle periods
    const requestIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    const snapshots = [];
    // Determine background color based on theme to prevent transparency artifacts
    const isLight = document.body.classList.contains('light-theme');
    const bgColor = isLight ? '#ffffff' : '#000000'; // Adaptive background

    const options = { 
        logging: false, 
        useCORS: true, 
        scale: 0.5, 
        allowTaint: true,
        backgroundColor: bgColor // Force background color
    };
    
    for (const widget of widgets) {
        const index = widget.dataset.widgetIndex;
        const iframe = widget.querySelector('iframe');

        if (iframe) {
            // It's an app widget
            // 1. Send request for NEXT update
            try {
                const targetOrigin = getOriginFromUrl(iframe.src);
                iframe.contentWindow.postMessage({ type: 'request-screenshot' }, targetOrigin);
            } catch(e) {}

            // 2. Use cached image if available, otherwise placeholder or container capture
            const cachedImg = await SwapManager.get('widget_snap_' + index);
            if (cachedImg) {
                snapshots.push({
                    id: index,
                    img: cachedImg
                });
            } else {
                // Fallback: Capture container
                await new Promise(resolve => requestIdle(async () => {
                    try {
                        const canvas = await html2canvas(widget, options);
                        snapshots.push({
                            id: index,
                            img: canvas.toDataURL('image/jpeg', 0.5)
                        });
                    } catch(e) {}
                    resolve();
                }));
            }
        } else {
            // It's a sticker or simple element
            await new Promise(resolve => requestIdle(async () => {
                try {
                    const canvas = await html2canvas(widget, options);
                    snapshots.push({
                        id: index,
                        img: canvas.toDataURL('image/jpeg', 0.5)
                    });
                } catch (e) {}
                resolve();
            }));
        }
    }
    
    if (snapshots.length > 0) {
        window.WavesHost.pushWidgetUpdate(snapshots);
    }
}

// Start snapshot timer
if (widgetSnapshotInterval) clearInterval(widgetSnapshotInterval);
widgetSnapshotInterval = setInterval(broadcastWidgetSnapshots, 600000); // Update every 10m