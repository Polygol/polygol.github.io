// js/waves.js - Host Side (Polygol System)

const WAVES_CONFIG = { 
    appId: 'polygol-connect-v1',
    trackerUrls: [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.btorrent.xyz',
        'wss://tracker.webtorrent.dev',
        'wss://tracker.sloppyta.co:443/announce',
        'wss://tracker.novage.com.ua:443/announce',
        'wss://tracker.nanoha.org:443/announce',
        'wss://tracker.ghostchu-services.top:443/announce',
        'wss://tracker.files.fm:7073/announce'
    ],
    rtcConfig: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    }
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

function generateNonsenseName() {
    const pre = ["Zork", "Bli", "Phro", "Kran", "Velt", "Spli", "Grom", "Twi", "Quar", "Mox", "Jub", "Vax", "Zym", "Plo", "Ska", "Tro", "Flu", "Bly", "Dwa", "Glo", "Snu", "Kri", "Vle", "Shu", "Pra", "Zon", "Cli", "Fro", "Ste", "Yol"];
    const mid = ["a", "o", "u", "e", "i", "ee", "oo", "ou", "y", "ia"];
    const post = ["nix", "zap", "loid", "tron", "vax", "mutt", "gle", "dax", "kin", "th", "rk", "zz", "nk", "st", "sh", "mp", "rt", "lk", "gn", "pl", "sk", "ch", "ff", "wn", "ly", "xy", "qu", "zt", "rd", "nz"];
    
    const getWord = () => {
        const p = pre[Math.floor(Math.random() * pre.length)];
        const m = mid[Math.floor(Math.random() * mid.length)];
        const s = post[Math.floor(Math.random() * post.length)];
        return p + m + s;
    };

    return `${getWord()} ${getWord()}`;
}

// 1. State Management
function getWavesHostState() {
    let state = localStorage.getItem('waves_host_config');
    state = state ? JSON.parse(state) : null;
    
    if (state) {
        state.deviceName = localStorage.getItem('system_device_name') || generateNonsenseName();
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
                // Reject connections without a profile
                if (!payload.profile || !payload.profile.name) {
                    console.warn(`[Waves] Rejected connection from ${peerId}: Missing profile`);
                    wavesSend({ type: 'auth_failed', reason: 'profile_missing' }, peerId);
                    return;
                }
                
                // Check Auth Token
                if (payload.auth === state.psk) {
                    window.Analytics?.trackWavesConnect(peerId);
                    // TRUSTED DEVICE: Add to active list immediately
                    registerPeer(peerId, payload.profile);
                    wavesSend({ type: 'welcome', deviceName: state.deviceName }, peerId);
                    
                    // UNICAST state push immediately to this peer (Critical for background recovery)
                    console.log(`[Waves] Trusted peer ${payload.profile.name} reconnected. Refreshing state...`);
                    
                    // Priority push
                    pushFullState(peerId);
                    
                    // Secondary data
                    setTimeout(() => {
                        pushWallpaperUpdate(peerId);
                        pushWidgetUpdate(null, peerId); 
                        getApps(peerId); // Ensure app list is synced
                    }, 100);
                } else if (isDiscoveryActive) {
                    // NEW DEVICE: Start Emoji Auth
                    startEmojiAuth(peerId, payload.profile);
                } else {
                    wavesSend({ type: 'discovery_disabled' }, peerId);
                }
                return;
            }
            
            // Standard Command Handling
            if (payload.auth === state.psk) {
                if (payload.profile) {
                    registerPeer(peerId, payload.profile);
                } 
                else if (!connectedPeers[peerId]) {
                    registerPeer(peerId, null);
                }
        
                handleRemoteCommand(payload, peerId);
            } 
            else if (payload.type === 'verify') {
                finalizeEmojiAuth(peerId, payload.answer, state.psk);
            }
        });

        wavesRoom.onPeerLeave(peerId => {
            if (connectedPeers[peerId]) {
                window.Analytics?.trackWavesDisconnect(peerId);
                console.log(`[Waves] Peer disconnected: ${peerId}`);
                delete connectedPeers[peerId];
                notifySystemUI();
            }
        });

        // Handle Incoming Screenshare Streams
        wavesRoom.onPeerStream((stream, peerId) => {
            console.log(`[Waves] Incoming stream from ${peerId}`);
            
            // 1. Launch the Cast Gurapp
            const castAppUrl = '/assets/gurapp/intl/waves/cast.html';
            if (typeof window.createFullscreenEmbed === 'function') {
                window.createFullscreenEmbed(castAppUrl);
            }

            // 2. Inject Stream into the App (Retry loop until DOM is ready)
            const injectStream = () => {
                const iframe = document.querySelector(`iframe[src*="cast.html"]`);
                
                // Ensure we have the iframe and it has a contentWindow
                if (iframe && iframe.contentWindow) {
                    try {
                        const videoEl = iframe.contentWindow.document.getElementById('cast-video');
                        if (videoEl) {
                            videoEl.srcObject = stream;
                            videoEl.play().catch(e => console.warn("[Waves] Autoplay blocked", e));
                            console.log("[Waves] Stream injected successfully");
                            
                            // 3. Cleanup: If stream ends (Sender stops), close the app
                            stream.getVideoTracks()[0].onended = () => {
                                console.log("[Waves] Stream ended by sender. Closing app.");
                                if (typeof window.closeFullscreenEmbed === 'function') {
                                    // Only close if the current app is still the cast app
                                    const active = document.querySelector('.fullscreen-embed[style*="display: block"]');
                                    if (active && active.dataset.embedUrl && active.dataset.embedUrl.includes('cast.html')) {
                                        window.closeFullscreenEmbed();
                                    }
                                }
                            };
                            return; // Success
                        }
                    } catch (e) {
                        console.warn("[Waves] DOM Injection error", e);
                    }
                }
                
                // Retry if not ready
                setTimeout(injectStream, 500);
            };

            injectStream();
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
        showNotification('Waves will accept automatic connections to this device.', {
            heading: `Paired with ${session.tempProfile?.name || 'New Device'}`,
            icon: 'verified_user',
            system: true
        });
        // Send initial state
        setTimeout(pushFullState, 500);
    } else {
        // Fail
        wavesSend({ type: 'auth_failed' }, peerId);
        showNotification('Your code is now invalidated for security. Re-pair all connected devices with the new code.', {
            heading: 'Waves authentication failed',
            icon: 'gpp_bad',
            system: true
        });
        
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
            // Received heartbeat. Update timestamp to keep alive.
            if (connectedPeers[peerId]) {
                connectedPeers[peerId].connectedAt = Date.now();
            }
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
            // Explicit request: Unicast response
            pushFullState(peerId);
            getApps(peerId);
            pushWallpaperUpdate(peerId);
            pushWidgetUpdate(null, peerId);
            break;
            
        case 'getApps':
            getApps(peerId);
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

// Helper for getApps to support unicast
function getApps(targetPeerId = null) {
    try {
        const sysApps = window.apps || {};
        const appList = Object.entries(sysApps)
            .filter(([name]) => name !== "Apps") 
            .map(([name, details]) => {
                let iconUrl = details.icon || 'system.png'; 
                if (!iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
                    if (!iconUrl.startsWith('/')) iconUrl = `/assets/appicon/${iconUrl}`;
                    iconUrl = new URL(iconUrl, window.location.origin).href;
                }
                return {
                    name: name,
                    icon: iconUrl,
                    url: details.url,
                    hasMiniApp: !!details.hasMiniApp
                };
            });
        
        if (targetPeerId) {
            wavesSend({ type: 'appList', data: appList }, targetPeerId);
        } else if (wavesSend) {
            // Fallback to broadcast if no ID (though wavesSend is technically unicast in this lib, 
            // usually we don't broadcast large lists without a target)
        }
    } catch (e) {
        console.error("[Waves] getApps error:", e);
    }
}

function pushFullState(targetPeerId = null) {
    if(!wavesBroadcast) return;
    
    // Convert activeWallpaperColor to simple array for Remote compatibility
    let accentColor = [208, 188, 255]; // Default
    if (window.activeWallpaperColor) {
        if (window.activeWallpaperColor.primary) {
            // New Object Structure: Use Primary
            const p = window.activeWallpaperColor.primary;
            accentColor = [p.r, p.g, p.b];
        } else if (Array.isArray(window.activeWallpaperColor)) {
            // Old Array Structure
            accentColor = window.activeWallpaperColor;
        }
    }

    const state = {
        brightness: localStorage.getItem('page_brightness') || 100,
        temperature: localStorage.getItem('display_temperature') || 0,
        media: null,
        mediaState: 'paused',
        appUI: window.activeAppUI || null,
        notifications: [],
        accentColor: accentColor, 
        systemStatus: window.getSystemStatus ? window.getSystemStatus() : {}
    };
    
    if (window.activeNotificationsList) state.notifications = [...window.activeNotificationsList];
    if (window.activeLiveActivityData) state.notifications.unshift(window.activeLiveActivityData);

    const lastMediaMeta = localStorage.getItem('lastMediaMetadata');
    if (lastMediaMeta) {
        state.media = JSON.parse(lastMediaMeta);
        const playBtn = document.querySelector('#media-widget-play-pause span');
        if (playBtn && playBtn.textContent === 'pause') state.mediaState = 'playing';
    }
    
    if (targetPeerId) {
        wavesBroadcast({ type: 'state', data: state }, targetPeerId);
    } else {
        wavesBroadcast({ type: 'state', data: state });
    }
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

function pushWidgetUpdate(widgets, targetPeerId = null) {
    if(!wavesBroadcast) return;
    
    // If specific widgets not passed, try to get from cache (for new connection init)
    if (!widgets && window.widgetSnapshotCache) {
        widgets = Object.entries(window.widgetSnapshotCache).map(([id, img]) => ({ id, img }));
    }

    if (widgets) {
        const payload = { type: 'widgetUpdate', data: widgets };
        if (targetPeerId) {
            wavesBroadcast(payload, targetPeerId);
        } else {
            wavesBroadcast(payload);
        }
    }
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

function pushWallpaperUpdate(targetPeerId = null) {
    // We defer the async logic to ensure this function returns immediately
    (async () => {
        if(!wavesBroadcast) return;
        
        let wallpaperStr = null;
        if (typeof window.recentWallpapers !== 'undefined' && typeof window.currentWallpaperPosition !== 'undefined') {
            const wp = window.recentWallpapers[window.currentWallpaperPosition];
            if (wp && !wp.isVideo && !wp.isSlideshow && wp.id && typeof window.getWallpaper === 'function') {
                 try {
                     const record = await window.getWallpaper(wp.id);
                     if (record) {
                         let rawData = record.dataUrl || (record.blob ? URL.createObjectURL(record.blob) : null);
                         if (rawData) {
                             wallpaperStr = await compressImage(rawData, 1080, 0.6);
                             if (record.blob) URL.revokeObjectURL(rawData);
                         }
                     }
                 } catch (e) { console.warn("[Waves] Wallpaper fetch failed", e); }
            }
        }
        
        const payload = { type: 'wallpaperUpdate', data: wallpaperStr };
        if (targetPeerId) {
            wavesBroadcast(payload, targetPeerId);
        } else {
            wavesBroadcast(payload);
        }
    })();
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
        showPopup('New device pairing is now enabled');
    } else {
        showPopup('New device pairing is now disabled');
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
        showPopup('Pairing request rejected');
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
