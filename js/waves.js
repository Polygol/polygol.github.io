// js/waves.js - Host Side (Polygol System)

const WAVES_CONFIG = { appId: 'polygol-connect-v1' };
const EMOJIS = [
    '🍕', '🚀', '🦄', '🎈', '🌵', '🎸', '🍦', '💎', '🔥', '🌈', '📷', '🔔',
    '🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🐔', '🐧', '🦈', '🦋', '🐞', '🐝',
    '🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍍', '🥥', '🥑', '🍆', '🥕', '🌽',
    '⚽', '🏀', '🏈', '🎾', '🎱', '🎳', '⛳', '🛹', '🚗', '✈️', '⚓', '🚲',
    '⌚', '💡', '📚', '✏️', '🔑', '🎁', '🏆', '👑', '🕶️', '🎩', '☂️', '🎵'
];
let wavesRoom = null;
let wavesOnData = null;
let wavesSend = null; // Response channel
let wavesBroadcast = null; // State update channel
let pendingAuth = {}; // Stores peerId -> { correctEmoji: '🍕', timestamp: 123 }

// 1. State Management
function getWavesHostState() {
    const stored = localStorage.getItem('waves_host_config');
    return stored ? JSON.parse(stored) : null;
}

function generatePairingCode() {
    // Generates 8-character alphanumeric code (No hyphens)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generatePSK() {
    return 'psk_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
}

function initWavesHost() {
    if (!window.Trystero) {
        window.addEventListener('trystero-ready', initWavesHost, { once: true });
        return;
    }

    let state = getWavesHostState();
    
    // Generate persistent credentials if missing
    if (!state) {
        state = { 
            roomId: generatePairingCode(), // Short code for discovery
            psk: generatePSK()             // Long secret for authorization
        };
        localStorage.setItem('waves_host_config', JSON.stringify(state));
    }

    console.log(`[Waves] Room: ${state.roomId}`);
    
    wavesRoom = window.Trystero.joinRoom(WAVES_CONFIG, state.roomId);
    
    if(wavesRoom.makeAction) {
        const [sendCmd, getCmd] = wavesRoom.makeAction('waves-cmd');
        wavesSend = sendCmd;
        wavesOnData = getCmd;

        const [sendUpdate, getUpdate] = wavesRoom.makeAction('waves-update');
        wavesBroadcast = sendUpdate;

        wavesOnData((payload, peerId) => {
            // If valid PSK, execute command
            if (payload.auth === state.psk) {
                handleRemoteCommand(payload, peerId);
            } 
            // If auth handshake
            else if (payload.type === 'hello') {
                startEmojiAuth(peerId);
            }
            else if (payload.type === 'verify') {
                finalizeEmojiAuth(peerId, payload.answer, state.psk);
            }
        });

        wavesRoom.onPeerJoin(peerId => {
            // Do nothing until they say hello. 
            // This prevents spamming anyone who accidentally joins the room.
        });
    }
}

// 3. Authentication Logic (2FA)
function startEmojiAuth(peerId) {
    // Pick 1 correct emoji and 3 distractors
    const shuffled = [...EMOJIS].sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, 4);
    const correct = options[Math.floor(Math.random() * 4)];

    // Store pending state
    pendingAuth[peerId] = {
        correctEmoji: correct,
        timestamp: Date.now()
    };

    // Show the correct emoji on the Host screen (Settings App)
    // We use the broadcast channel to tell the settings iframe to show it
    broadcastSettingUpdate('waves_auth_challenge', correct);
    
    // Send options to the phone
    wavesSend({ type: 'challenge', options: options }, peerId);
}

function finalizeEmojiAuth(peerId, answer, psk) {
    const session = pendingAuth[peerId];
    if (!session) return;

    if (answer === session.correctEmoji) {
        // Success! Send the keys to the castle
        wavesSend({ type: 'authorized', psk: psk }, peerId);
        showNotification('New device authorized', { icon: 'verified_user' });
        // Send initial state
        setTimeout(pushFullState, 500);
    } else {
        // Fail
        wavesSend({ type: 'auth_failed' }, peerId);
        showNotification('Auth failed: Wrong emoji', { icon: 'gpp_bad' });
    }
    
    // Cleanup
    delete pendingAuth[peerId];
    broadcastSettingUpdate('waves_auth_challenge', null); // Hide popup
}

// 3. Command Handler
async function handleRemoteCommand(payload, peerId) {
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

        case 'appAction':
            // Route custom event back to the app
            // data: { appName: 'Slides', id: 'nextBtn', value: null }
            const activeApp = document.querySelector('.fullscreen-embed[style*="display: block"]');
            if (activeApp) {
                const iframe = activeApp.querySelector('iframe');
                // Security: Ensure the remote is talking to the app that is actually open
                if (iframe && iframe.dataset.appId === data.appName) {
                    const targetOrigin = getOriginFromUrl(iframe.src);
                    iframe.contentWindow.postMessage({ 
                        type: 'remote-action', 
                        id: data.id, 
                        value: data.value 
                    }, targetOrigin);
                }
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

function pushAppUI(appName, components) {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'appUI', 
        data: { appName, components } 
    });
}

function clearAppUI() {
    if(!wavesBroadcast) return;
    wavesBroadcast({ type: 'appUI', data: null }); // Null tells remote to show default
}

function getPairingCode() {
    const state = getWavesHostState();
    return state ? state.roomId : "ERROR";
}

function resetPairingData() {
    localStorage.removeItem('waves_host_config');
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', initWavesHost);

// Expose Public API
window.WavesHost = {
    getPairingCode,
    resetPairingData,
    pushMediaUpdate,
    pushFullState,
    pushAppUI,
    clearAppUI
};

// Helper for URL origin
function getOriginFromUrl(url) {
    try { return new URL(url).origin; } catch (e) { return window.location.origin; }
}
