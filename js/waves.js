// js/waves.js - Host Side (Polygol System)

const WAVES_CONFIG = { appId: 'polygol-connect-v1' };
let wavesRoom = null;
let wavesOnData = null;
let wavesSend = null; // Response channel
let wavesBroadcast = null; // State update channel

// 1. State Management
function getWavesHostState() {
    const stored = localStorage.getItem('waves_host_config');
    return stored ? JSON.parse(stored) : null;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 2. Connection Logic
function initWavesHost() {
    // Wait for Trystero to load
    if (!window.Trystero) {
        window.addEventListener('trystero-ready', initWavesHost, { once: true });
        return;
    }

    let state = getWavesHostState();
    
    if (!state) {
        state = { roomId: generateUUID(), psk: generateUUID() };
        localStorage.setItem('waves_host_config', JSON.stringify(state));
    }

    console.log(`[Waves Host] Listening on Room: ${state.roomId}`);
    
    wavesRoom = window.Trystero.joinRoom(WAVES_CONFIG, state.roomId);
    
    if(wavesRoom.makeAction) {
        // Channel for Commands (Incoming)
        const [sendCmd, getCmd] = wavesRoom.makeAction('waves-cmd');
        wavesSend = sendCmd;
        wavesOnData = getCmd;

        // Channel for State Updates (Outgoing)
        const [sendUpdate, getUpdate] = wavesRoom.makeAction('waves-update');
        wavesBroadcast = sendUpdate;

        wavesOnData((payload, peerId) => {
            handleRemoteCommand(payload, state.psk, peerId);
        });

        wavesRoom.onPeerJoin(peerId => {
            showNotification('Waves Remote Connected', { icon: 'phonelink_ring' });
            // Send initial state snapshot
            pushFullState();
        });
    }
}

// 3. Command Handler
async function handleRemoteCommand(payload, localPsk, peerId) {
    if (payload.auth !== localPsk) return;

    const { type, data } = payload;

    switch (type) {
        case 'setBrightness':
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('page_brightness', data);
            }
            break;
        
        case 'toggleSleep':
            if (document.body.classList.contains('blackout-active')) {
                if (typeof window.exitBlackoutMode === 'function') {
                    window.exitBlackoutMode();
                }
            } else {
                if (typeof window.blackoutScreen === 'function') {
                    window.blackoutScreen();
                }
            }
            break;

        case 'home':
            if (typeof window.minimizeFullscreenEmbed === 'function') {
                window.minimizeFullscreenEmbed();
            }
            break;
            
        case 'media':
            // FIX: Check window global first, then localStorage fallback
            const targetApp = window.activeMediaSessionApp || localStorage.getItem('lastMediaSessionApp');
            const action = data.action; 

            if (targetApp && window.Gurasuraisu) {
                window.Gurasuraisu.callApp(targetApp, action);
            } else {
                console.warn("[Waves] Media action failed: Target app unknown or System API missing");
            }
            break;
            
        case 'launchApp':
            if (data.url && typeof window.createFullscreenEmbed === 'function') {
                window.createFullscreenEmbed(data.url);
            }
            break;
            
        case 'getApps':
            try {
                const sysApps = window.apps || {};
                const appList = Object.entries(sysApps)
                    .filter(([name]) => name !== "Apps") 
                    .map(([name, details]) => {
                        // Ensure we have a valid icon URL
                        let iconUrl = details.icon || 'system.png'; 
                        if (!iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
                            if (!iconUrl.startsWith('/')) {
                                iconUrl = `/assets/appicon/${iconUrl}`;
                            }
                            // Convert to absolute URL
                            iconUrl = new URL(iconUrl, window.location.origin).href;
                        }
                        return {
                            name: name,
                            icon: iconUrl,
                            url: details.url
                        };
                    });
                wavesSend({ type: 'appList', data: appList }, peerId);
            } catch (e) {
                console.error("[Waves] getApps error:", e);
            }
            break;
            
        case 'requestScreenshot':
            // FIX: Use createCompositeScreenshot from index.js to handle iframes correctly
            if (typeof window.createCompositeScreenshot === 'function') {
                try {
                    const imgData = await window.createCompositeScreenshot();
                    wavesSend({ type: 'screenshot', data: imgData }, peerId);
                } catch (e) {
                    console.error("[Waves] System screenshot failed:", e);
                }
            } else if (window.html2canvas) {
                // Fallback
                try {
                    const canvas = await html2canvas(document.body, { 
                        useCORS: true, 
                        logging: false,
                        ignoreElements: (el) => el.id === 'ai-assistant-overlay'
                    });
                    const imgData = canvas.toDataURL('image/jpeg', 0.4);
                    wavesSend({ type: 'screenshot', data: imgData }, peerId);
                } catch (e) {
                    console.error("[Waves] Fallback screenshot failed:", e);
                }
            }
            break;
    }
}

// 4. Broadcasting State (To Client)
function pushFullState() {
    if(!wavesBroadcast) return;
    
    const state = {
        brightness: localStorage.getItem('page_brightness') || 100,
        media: null,
        mediaState: 'paused' // Default
    };

    const lastMediaMeta = localStorage.getItem('lastMediaMetadata');
    if (lastMediaMeta) {
        state.media = JSON.parse(lastMediaMeta);
        // Check if the play button in DOM currently shows 'pause' icon (meaning it's playing)
        const playBtn = document.querySelector('#media-widget-play-pause span');
        if (playBtn && playBtn.textContent === 'pause') {
            state.mediaState = 'playing';
        }
    }
    
    wavesBroadcast({ type: 'state', data: state });
}

function pushMediaUpdate(metadata, appName, playbackState = 'paused') {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'mediaUpdate', 
        data: { metadata, appName, playbackState } 
    });
}

function getPairingData() {
    return JSON.stringify(getWavesHostState());
}

function resetPairingData() {
    localStorage.removeItem('waves_host_config');
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', initWavesHost);

// Expose Public API
window.WavesHost = {
    getPairingData,
    resetPairingData,
    pushMediaUpdate,
    pushFullState
};

// Helper for URL origin
function getOriginFromUrl(url) {
    try { return new URL(url).origin; } catch (e) { return window.location.origin; }
}
