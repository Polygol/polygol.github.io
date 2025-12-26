// js/waves.js - Host Side (Polygol System)

const WAVES_CONFIG = { 
    appId: 'polygol-connect-v1',
    trackerUrls: [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.btorrent.xyz',
        'wss://tracker.webtorrent.dev',
        'wss://tracker.files.fm:7073/announce'
    ]
};
const EMOJIS = [
    '🍕','🚀','🦄','🎈','🌵','🎸','🍦','💎','🔥','🌈','📷','🔔',
    '🐶','🐱','🦊','🐼','🐸','🐵','🐔','🐧','🦈','🦋','🐞','🐝',
    '🍎','🍌','🍉','🍇','🍓','🍒','🍍','🥥','🥑','🍆','🥕','🌽',
    '⚽','🏀','🏈','🎾','🎱','🎳','⛳','🛹','🚗','✈️','⚓','🚲',
    '⌚','💡','📚','✏️','🔑','🎁','🏆','👑','🕶️','🎩','☂️','🎵',
    '🦦','🦛','🦣','🦒','🦘','🦔','🦥','🐴','🦚','🐷','🐮','🐯',
    '🦧','🦞','🦐','🦑','🐌','🐚','🦀','🦕','🦓','🦷','🦬','🍠',
    '🍯','🥚','🍢','🍡','🥯','🥒','🥬','🍑','🍅','🍪','🍩','🍫',
    '🍰','🍿','🍷','🍺','🥨','🍻','🥤','🥛','🍹','🍧','🍨','🍬',
    '🧃','🥂','🍸','🧉','🍶','🍽️','🍴','🥄','🥢','🥡','🥧','⚾',
    '🏐','🏑','🎯','🏸','⛷️','🏌️','🏊‍♂️','🤿','🧘‍♀️','🛷','🛸','🚁',
    '🚂','🚟','🚝','🚅','🚤','🛥️','🛳️','🛶','⛴️','🔮','🧩','🎲',
    '🛠️','🔨','🪛','🔧','⚙️','💻','🖥️','📱','📲','🖱️','💾','🧰',
    '💼','🪑','🛋️','📺','🖼️','🖌️','🔗','🪝','🧯','🧴','🧪','🧑‍🔬',
    '🧙‍♂️','⚖️','📏','📐','🧭','🧳','🛎️','🪄','🪙','🪜','🔓','🔒',
    '🔐','💸','🧺','📜','🔖','🎴','📮','📭','💀','✅','❌','🔪'
];
let wavesRoom = null;
let wavesOnData = null;
let wavesSend = null; // Response channel
let wavesBroadcast = null; // State update channel
let pendingAuth = {}; // Stores peerId -> { correctEmoji: '🍕', timestamp: 123 }
let currentAuthPeerId = null; // Track who is currently attempting to pair
let connectedPeers = {}; // Track connected peers and their profiles { peerId: { profile: {}, lastSeen: ts } }
let isDiscoveryActive = localStorage.getItem('waves_discovery_enabled') !== 'false'; // Default true

// 1. State Management
function getWavesHostState() {
    let state = localStorage.getItem('waves_host_config');
    state = state ? JSON.parse(state) : null;
    
    if (state) {
        state.deviceName = localStorage.getItem('system_device_name') || "Polygol Device";
    }
    return state;
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
            roomId: generatePairingCode(), 
            psk: generatePSK()             
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

        // 1. Handle Incoming Messages
        wavesOnData((payload, peerId) => {
            if (payload.type === 'hello') {
                // Check Auth Token
                if (payload.auth === state.psk) {
                    // TRUSTED DEVICE: Add to active list immediately
                    registerPeer(peerId, payload.profile);
                    wavesSend({ type: 'welcome', deviceName: state.deviceName }, peerId);
                } else if (isDiscoveryActive) {
                    // NEW DEVICE: Start Emoji Auth
                    startEmojiAuth(peerId, payload.profile);
                } else {
                    wavesSend({ type: 'discovery_disabled' }, peerId);
                }
            }
            else if (payload.auth === state.psk) {
                
                // 1. ALWAYS update/refresh the peer profile if provided
                // This ensures the UI stays populated and "online"
                if (payload.profile) {
                    registerPeer(peerId, payload.profile);
                } 
                // Fallback: If we don't know this peer yet and no profile sent, register as unknown
                else if (!connectedPeers[peerId]) {
                    registerPeer(peerId, null);
                }
        
                // 2. Handle the specific command
                handleRemoteCommand(payload, peerId);
            } 
            else if (payload.type === 'verify') {
                finalizeEmojiAuth(peerId, payload.answer, state.psk);
            }
        });

        // 2. Handle Disconnects (Removes Icon)
        wavesRoom.onPeerLeave(peerId => {
            if (connectedPeers[peerId]) {
                console.log(`[Waves] Peer disconnected: ${peerId}`);
                delete connectedPeers[peerId];
                notifySystemUI();
            }
        });

        // 3. Ping to wake up existing clients on Host Reload
        setTimeout(() => {
            if (wavesBroadcast) pushFullState(); 
        }, 2000);
    }
}
function registerPeer(peerId, profile) {    
    // 1. Try to find existing profile in history if incoming is null
    let knownDevices = {};
    try {
        knownDevices = JSON.parse(localStorage.getItem('waves_known_devices') || '{}');
    } catch(e) {}
    
    if (connectedPeers[peerId] && connectedPeers[peerId].profile && connectedPeers[peerId].profile.name !== "Unknown") {
        if (!profile || profile.name === "Unknown") {
            // Keep the existing good profile in memory
            profile = connectedPeers[peerId].profile;
        }
    }

    // Fallback defaults
    if (!profile) profile = { name: "Unknown", avatar: null };
    
    // 2. Update In-Memory State (This shows the Icon)
    connectedPeers[peerId] = {
        id: peerId,
        profile: profile,
        connectedAt: Date.now()
    };

    // 3. Persist to LocalStorage (Save "Known Devices" by Name)
    if (profile.name && profile.name !== "Unknown") {
        knownDevices[profile.name] = {
            profile: profile,
            lastSeen: Date.now()
        };
        try {
            localStorage.setItem('waves_known_devices', JSON.stringify(knownDevices));
        } catch(e) {}
    }

    // 4. Update UI
    notifySystemUI();
}

function notifySystemUI() {
    // Check if the UI function exists yet
    if (typeof window.updateActiveWavesPeers === 'function') {
        window.updateActiveWavesPeers(connectedPeers);
    } else {
        // If index.js hasn't loaded the function yet, retry in 100ms
        // This fixes the empty container on page load
        setTimeout(notifySystemUI, 100);
    }
}

// 3. Authentication Logic (2FA)
function startEmojiAuth(peerId, profile) {
    currentAuthPeerId = peerId;
    
    const shuffled = [...EMOJIS].sort(() => 0.5 - Math.random());
    const options = shuffled.slice(0, 16);
    const correct = options[Math.floor(Math.random() * 16)];
    
    // Create the object once with ALL properties so profile isn't lost
    pendingAuth[peerId] = {
        correctEmoji: correct,
        timestamp: Date.now(),
        tempProfile: profile // Store the profile here safely
    };
    
    broadcastSettingUpdate('waves_auth_challenge', correct);
    wavesSend({ type: 'challenge', options: options }, peerId);
}

function finalizeEmojiAuth(peerId, answer, psk) {
    if (peerId === currentAuthPeerId) currentAuthPeerId = null; // Clear tracker
    
    const session = pendingAuth[peerId];
    if (!session) return;

    if (answer === session.correctEmoji) {
        registerPeer(peerId, session.tempProfile);
        const state = getWavesHostState();
        wavesSend({ type: 'authorized', psk: psk, deviceName: state.deviceName }, peerId);
        showNotification(`Paired with ${session.tempProfile?.name || 'New Device'}`, { icon: 'verified_user' });
        // Send initial state
        setTimeout(pushFullState, 500);
    } else {
        // Fail
        wavesSend({ type: 'auth_failed' }, peerId);
        showNotification('Auth failed: Code invalidated.', { icon: 'gpp_bad' });
        
        // SECURITY: Incorrect code entered. Nuke the current room/code and restart.
        setTimeout(() => {
            resetPairingData(); // This clears localStorage and reloads
        }, 1500);
    }
    
    // Cleanup
    delete pendingAuth[peerId];
    broadcastSettingUpdate('waves_auth_challenge', null); // Hide popup
}

// 3. Command Handler
async function handleRemoteCommand(payload, peerId) {
    const { type, data } = payload;

    switch (type) {
        case 'ping':
            // Received heartbeat. 
            // The registerPeer() call in the main listener has already refreshed the UI.
            break;
            
        case 'setBrightness':
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('page_brightness', data);
            }
            break;

        case 'setTemperature':
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('display_temperature', data);
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

        case 'toggleQS':
            // data.id: 'silent', 'night', 'focus', 'theme'
            const idMap = {
                'silent': 'silent_switch_qc',
                'night': 'night-mode-qc',
                'focus': 'minimal_mode_qc',
                'theme': 'light_mode_qc'
            };
            if(idMap[data.id]) {
                const el = document.getElementById(idMap[data.id]);
                if(el) {
                    el.click();
                    // Force state push after a short delay to ensure UI updated
                    setTimeout(pushFullState, 100);
                }
            }
            break;

        case 'getWallpapers':
            if (window.recentWallpapers && window.recentWallpapers.length > 0) {
                try {
                    // Generate thumbnails for the list
                    const listPromises = window.recentWallpapers.map(async (wp, index) => {
                        if (wp.isVideo || wp.isSlideshow) return null; // Skip complex types
                        
                        let thumb = null;
                        if (window.getWallpaper && wp.id) {
                            try {
                                const record = await window.getWallpaper(wp.id);
                                if (record) {
                                    let src = record.dataUrl;
                                    if (record.blob) src = URL.createObjectURL(record.blob);
                                    
                                    if (src) {
                                        // Compress to very small thumbnail
                                        thumb = await compressImage(src, 200, 0.5); 
                                        if (record.blob) URL.revokeObjectURL(src);
                                    }
                                }
                            } catch(e) {
                                console.warn(`[Waves] Failed to load wallpaper ${index}`, e);
                            }
                        }
                        
                        // Return item even if thumb failed, so grid isn't empty
                        return {
                            index: index,
                            thumbnail: thumb, 
                            active: index === window.currentWallpaperPosition
                        };
                    });

                    const list = await Promise.all(listPromises);
                    const filteredList = list.filter(i => i !== null);
                    wavesSend({ type: 'wallpaperList', data: filteredList }, peerId);
                } catch (e) {
                    console.error("[Waves] Error generating wallpaper list:", e);
                    // Send empty list to stop loading spinner
                    wavesSend({ type: 'wallpaperList', data: [] }, peerId);
                }
            } else {
                wavesSend({ type: 'wallpaperList', data: [] }, peerId);
            }
            break;

        case 'setWallpaper':
            if (typeof window.jumpToWallpaper === 'function' && data.index !== undefined) {
                window.jumpToWallpaper(data.index);
                // Push update immediately
                setTimeout(pushWallpaperUpdate, 500);
                // Refresh list to update active state
                setTimeout(() => handleRemoteCommand({type: 'getWallpapers'}, peerId), 600);
            }
            break;

        case 'clearNotifications':
            if (typeof window.clearAllNotifications === 'function') {
                window.clearAllNotifications();
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

        case 'launchAppSilently':
            if (data.url && typeof window.launchAppSilently === 'function') {
                window.launchAppSilently(data.url);
            }
            break;

        case 'announce':
            if (data.text && typeof window.makeAnnouncement === 'function') {
                window.makeAnnouncement(data.text, data.tts, payload.profile);
            }
            break;

        case 'setSetting':
            // data: { key, value }
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch(data.key, data.value);
            }
            break;

        case 'getAllSettings':
            // Return all LS items formatted for the Settings App
            const items = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items.push({ key, value: localStorage.getItem(key) });
            }
            wavesSend({ type: 'settingsData', data: items }, peerId);
            break;

        case 'getState':
            pushFullState();
            pushWallpaperUpdate();
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
                            url: details.url,
                            hasMiniApp: !!details.hasMiniApp
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
            // Support background apps by looking up iframe by ID
            const targetIframe = document.querySelector(`iframe[data-app-id="${data.appName}"]`);
            
            if (targetIframe) {
                const targetOrigin = getOriginFromUrl(targetIframe.src);
                targetIframe.contentWindow.postMessage({ 
                    type: 'remote-action', 
                    id: data.id, 
                    value: data.value 
                }, targetOrigin);
            }
            break;

        case 'uploadData':
            // data: { name, type, data (base64), requestId (optional) }
            if (typeof window.handleRemoteFileUpload === 'function') {
                window.handleRemoteFileUpload(data, peerId);
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
                    const isLight = document.body.classList.contains('light-theme');
                    const bgColor = isLight ? '#ffffff' : '#000000';

                    const canvas = await html2canvas(document.body, { 
                        useCORS: true, 
                        logging: false,
                        ignoreElements: (el) => el.id === 'ai-assistant-overlay',
                        backgroundColor: bgColor // Fix transparency issues
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
        temperature: localStorage.getItem('display_temperature') || 0,
        media: null,
        mediaState: 'paused',
        appUI: window.activeAppUI || null,
        notifications: [],
        accentColor: window.activeWallpaperColor || [208, 188, 255], 
        systemStatus: window.getSystemStatus ? window.getSystemStatus() : {}
    };
    
    // Gather notifications from System
    if (window.activeNotificationsList) {
        state.notifications = [...window.activeNotificationsList];
    }
    if (window.activeLiveActivityData) {
        state.notifications.unshift(window.activeLiveActivityData);
    }

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
    // Store in global window scope so it persists for new connections
    window.activeAppUI = { appName, components };
    
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'appUI', 
        data: window.activeAppUI 
    });
}

function pushAppUIUpdate(appName, updates) {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'appUIUpdate', 
        data: { appName, updates }
    });
}

function pushNotificationUpdate(notifications) {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'notificationUpdate', 
        data: notifications 
    });
}

function pushLiveActivityStart(activityConfig) {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'liveActivityStart', 
        data: activityConfig 
    });
}

function pushWidgetUpdate(widgets) {
    if(!wavesBroadcast) return;
    wavesBroadcast({ 
        type: 'widgetUpdate', 
        data: widgets 
    });
}

async function compressImage(source, maxWidth, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        // Cross-origin safe if using Blobs/DataURLs
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (e) {
                console.warn("[Waves] Image compression error:", e);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.warn("[Waves] Image load error");
            resolve(null);
        };
        img.src = source;
    });
}

async function pushWallpaperUpdate() {
    if(!wavesBroadcast) return;
    
    let wallpaperStr = null;
    if (typeof window.recentWallpapers !== 'undefined' && typeof window.currentWallpaperPosition !== 'undefined') {
        const wp = window.recentWallpapers[window.currentWallpaperPosition];
        // Only handle standard images (skip video/slideshow for bandwidth)
        if (wp && !wp.isVideo && !wp.isSlideshow && wp.id && typeof window.getWallpaper === 'function') {
             try {
                 const record = await window.getWallpaper(wp.id);
                 if (record) {
                     let rawData = null;
                     if (record.dataUrl) {
                         rawData = record.dataUrl;
                     } else if (record.blob) {
                         rawData = URL.createObjectURL(record.blob);
                     }
                     
                     if (rawData) {
                         // Compress for transmission
                         wallpaperStr = await compressImage(rawData, 1080, 0.6);
                         if (record.blob) URL.revokeObjectURL(rawData);
                     }
                 }
             } catch (e) { console.warn("[Waves] Wallpaper fetch failed", e); }
        }
    }
    
    wavesBroadcast({ type: 'wallpaperUpdate', data: wallpaperStr });
}

function requestRemoteUpload(accept = '*/*', multiple = false, requestId = null) {
    if(!wavesSend) return;
    // Broadcast to all connected peers (or specific if needed, currently broadcast)
    wavesSend({ 
        type: 'requestUpload', 
        data: { accept, multiple, requestId } 
    });
}

function clearAppUI() {
    window.activeAppUI = null; // Clear stored state
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

function setDiscovery(enabled) {
    isDiscoveryActive = enabled;
    localStorage.setItem('waves_discovery_enabled', enabled);
    
    if (enabled) {
        showNotification('New device pairing is now enabled', { icon: 'cell_tower' });
    } else {
        showNotification('New device pairing is now disabled', { icon: 'portable_wifi_off' });
    }
}

function rejectCurrentAuth() {
    if (currentAuthPeerId && pendingAuth[currentAuthPeerId]) {
        // Send failure message to remote
        wavesSend({ type: 'auth_failed' }, currentAuthPeerId);
        
        // Cleanup local state
        delete pendingAuth[currentAuthPeerId];
        currentAuthPeerId = null;
        
        // Hide UI
        broadcastSettingUpdate('waves_auth_challenge', null);
        showNotification('Pairing request rejected', { icon: 'block' });
    }
}

document.addEventListener('DOMContentLoaded', initWavesHost);

// Expose Public API
window.WavesHost = {
    getPairingCode,
    resetPairingData,
    pushMediaUpdate,
    pushFullState,
    pushAppUI,
    pushAppUIUpdate,
    pushNotificationUpdate,
    pushLiveActivityStart,
    pushWidgetUpdate,
    pushWallpaperUpdate,
    clearAppUI,
    requestRemoteUpload,
    setDiscovery,
    rejectCurrentAuth,
    isDiscoveryEnabled: () => isDiscoveryActive
};

// Helper for URL origin
function getOriginFromUrl(url) {
    try { return new URL(url).origin; } catch (e) { return window.location.origin; }
}
