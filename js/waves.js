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
            setControlValueAndDispatch('page_brightness', data);
            break;
        
        case 'blackout':
            blackoutScreen();
            break;
        
        case 'wake':
            showCursorAndResetTimer();
            document.body.classList.remove('blackout-active', 'blackout-style-dim-show', 'blackout-style-dim-hide', 'blackout-style-hide-show', 'blackout-style-off');
            const overlay = document.getElementById('blackout-event-overlay');
            if(overlay) overlay.remove();
            break;

        case 'media':
            // Robust media handling
            const targetApp = data.app || window.activeMediaSessionApp;
            const action = data.action; // prev, next, playPause

            if(targetApp) {
                // 1. Try finding the iframe
                const iframe = document.querySelector(`iframe[data-app-id="${targetApp}"]`);
                if (iframe) {
                    const targetOrigin = getOriginFromUrl(iframe.src);
                    iframe.contentWindow.postMessage({ type: 'media-control', action: action }, targetOrigin);
                }
                // 2. Fallback: Check if we can trigger via main window helpers
                // (This part is redundant if the iframe method works, but good for safety)
            }
            break;
            
        case 'launchApp':
            // data = { url: '/path/to/app' }
            if(data.url) {
                createFullscreenEmbed(data.url);
            }
            break;
            
        case 'getApps':
            // Send list of installed apps
            const appList = Object.entries(window.apps || {}).map(([name, details]) => ({
                name: name,
                icon: details.icon,
                url: details.url
            }));
            wavesSend({ type: 'appList', data: appList }, peerId);
            break;

        case 'requestScreenshot':
            try {
                const canvas = await html2canvas(document.body, { 
                    useCORS: true, 
                    logging: false,
                    ignoreElements: (el) => el.id === 'ai-assistant-overlay' || el.id === 'camera-preview'
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.4);
                wavesSend({ type: 'screenshot', data: imgData }, peerId);
            } catch (e) {
                console.error("Screenshot failed", e);
            }
            break;
    }
}

// 4. Broadcasting State (To Client)
function pushFullState() {
    if(!wavesBroadcast) return;
    
    // Gather state
    const state = {
        brightness: localStorage.getItem('page_brightness') || 100,
        media: null
    };

    // Get Media State from DOM/LocalStorage
    const lastMediaMeta = localStorage.getItem('lastMediaMetadata');
    if (lastMediaMeta) {
        state.media = JSON.parse(lastMediaMeta);
        state.mediaApp = localStorage.getItem('lastMediaSessionApp');
    }
    
    wavesBroadcast({ type: 'state', data: state });
}

function pushMediaUpdate(metadata, appName) {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'mediaUpdate', 
        data: { metadata, appName } 
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
