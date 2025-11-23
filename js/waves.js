// js/waves.js - Host Side (Polygol System)

// The CDN script exposes joinRoom directly on window, not under Trystero.
if (typeof Trystero === 'undefined') {
    window.Trystero = {
        joinRoom: window.joinRoom || ((...args) => console.error("Trystero joinRoom not found. Library not loaded?")),
        selfId: window.selfId,
        getPeers: window.getPeers
    };
}

const WAVES_CONFIG = { appId: 'polygol-connect-v1' };
let wavesRoom = null;
let wavesOnData = null;
let wavesSend = null; // To send screenshots back

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
    let state = getWavesHostState();
    
    // auto-generate credentials on first run so it's always ready
    if (!state) {
        state = { roomId: generateUUID(), psk: generateUUID() };
        localStorage.setItem('waves_host_config', JSON.stringify(state));
    }

    console.log(`[Waves Host] Listening on Room: ${state.roomId}`);
    
    wavesRoom = Trystero.joinRoom(WAVES_CONFIG, state.roomId);
    const [send, get] = wavesRoom.makeAction('waves-cmd');
    wavesSend = send;
    wavesOnData = get;

    wavesOnData((payload, peerId) => {
        handleRemoteCommand(payload, state.psk, peerId);
    });

    wavesRoom.onPeerJoin(peerId => {
        showNotification('Waves Remote Connected', { icon: 'phonelink_ring' });
    });
}

// 3. Command Handler
async function handleRemoteCommand(payload, localPsk, peerId) {
    // Security Check
    if (payload.auth !== localPsk) {
        console.warn("[Waves Host] Unauthorized command attempt.");
        return;
    }

    const { type, data } = payload;

    switch (type) {
        case 'setBrightness':
            // Call the internal helper found in index.js
            setControlValueAndDispatch('page_brightness', data);
            break;
        
        case 'blackout':
            blackoutScreen();
            break;
        
        case 'wake':
            // Simulate activity
            showCursorAndResetTimer();
            // Remove blackout classes
            document.body.classList.remove('blackout-active', 'blackout-style-dim-show', 'blackout-style-dim-hide', 'blackout-style-hide-show', 'blackout-style-off');
            const overlay = document.getElementById('blackout-event-overlay');
            if(overlay) overlay.remove();
            break;

        case 'media':
            // data: { app: 'Music', action: 'next' }
            // If 'app' is null, use the active global variable
            const targetApp = data.app || window.activeMediaSessionApp;
            if(targetApp) {
                // Use the Gurasuraisu helper to talk to the iframe
                const iframe = document.querySelector(`iframe[data-app-id="${targetApp}"]`);
                if (iframe) {
                    const targetOrigin = new URL(iframe.src).origin;
                    iframe.contentWindow.postMessage({ type: 'media-control', action: data.action }, targetOrigin);
                }
            }
            break;

        case 'requestScreenshot':
            try {
                // Capture body, ignoring the AI overlay
                const canvas = await html2canvas(document.body, { 
                    useCORS: true, 
                    logging: false,
                    ignoreElements: (el) => el.id === 'ai-assistant-overlay' || el.tagName === 'VIDEO' // Videos often crash canvas
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.3); // Low quality for speed
                
                // Send back to the specific peer
                wavesSend({ type: 'screenshot', data: imgData }, peerId);
            } catch (e) {
                console.error("Screenshot failed", e);
            }
            break;
            
        case 'reload':
            window.location.reload();
            break;
    }
}

// 4. Pairing Helper (Called by Settings App)
function getPairingData() {
    return JSON.stringify(getWavesHostState());
}

function resetPairingData() {
    localStorage.removeItem('waves_host_config');
    // Reload to bind new room
    window.location.reload();
}

// Init
document.addEventListener('DOMContentLoaded', initWavesHost);

// Expose to Settings App
window.WavesHost = {
    getPairingData,
    resetPairingData
};
