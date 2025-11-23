// Waves

const WAVES_CONFIG = { appId: 'polygol-connect-v1' };
let wavesRoom = null;
let wavesSendAction = null;
let wavesOnData = null;

// --- 1. Persistence & State ---
function getWavesState() {
    const stored = localStorage.getItem('waves_connection');
    return stored ? JSON.parse(stored) : null;
}

function saveWavesState(roomId, psk, role) {
    localStorage.setItem('waves_connection', JSON.stringify({ roomId, psk, role }));
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- 2. Connection Logic ---

function initWaves() {
    const state = getWavesState();
    if (state) {
        console.log(`[Waves] Initializing P2P in ${state.role} mode...`);
        connectToRoom(state.roomId, state.psk);
    }
}

function connectToRoom(roomId, psk) {
    // Join the Trystero room
    wavesRoom = Trystero.joinRoom(WAVES_CONFIG, roomId);
    
    // Create data channels
    const [send, get] = wavesRoom.makeAction('waves-cmd');
    wavesSendAction = send;
    wavesOnData = get;

    // Handle incoming data
    wavesOnData((payload, peerId) => {
        handleIncomingPayload(payload, psk);
    });

    wavesRoom.onPeerJoin(peerId => {
        console.log(`[Waves] Peer joined: ${peerId}`);
        showNotification('New device connected via Waves', { icon: 'cast_connected' });
    });

    // If we are the Host, update our status so settings UI knows
    document.body.dataset.wavesConnected = "true";
}

// --- 3. Security & Commands ---

function sendCommand(type, data) {
    const state = getWavesState();
    if (!state) return;

    const payload = {
        auth: state.psk, // Send Pre-Shared Key for verification
        type: type,
        data: data,
        timestamp: Date.now()
    };
    
    if (wavesSendAction) {
        wavesSendAction(payload);
    }
}

async function handleIncomingPayload(payload, localPsk) {
    // 1. Security Check: Does the payload contain the correct Pre-Shared Key?
    if (payload.auth !== localPsk) {
        console.warn("[Waves] Unauthorized command received. Dropping.");
        return;
    }

    const { type, data } = payload;
    console.log(`[Waves] Executing: ${type}`, data);

    // 2. Command Routing
    switch (type) {
        case 'setBrightness':
            setControlValueAndDispatch('page_brightness', data);
            break;
        
        case 'setTheme':
            setControlValueAndDispatch('theme', data); // 'light' or 'dark'
            break;

        case 'blackout':
            blackoutScreen();
            break;
        
        case 'wake':
            // Simulate user activity to wake screen
            showCursorAndResetTimer();
            // If blackout is active, remove it (requires custom logic if blackout removes listeners)
            document.body.classList.remove('blackout-active'); 
            break;

        case 'mediaControl':
             // data = { appName: 'Music', action: 'playPause' }
             if(window.Gurasuraisu) Gurasuraisu.callApp(data.appName, data.action);
             break;

        case 'requestScreenshot':
            // Capture screen and send back
            const canvas = await html2canvas(document.body, { 
                useCORS: true, 
                logging: false,
                ignoreElements: (el) => el.id === 'ai-assistant-overlay' 
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.4); // Low quality for speed
            sendCommand('screenshotResponse', imgData);
            break;

        case 'screenshotResponse':
            // We are the Phone, receiving the Display's screen
            const remoteView = document.getElementById('waves-remote-view');
            if(remoteView) remoteView.src = data;
            break;
        
        case 'setWallpaper':
            // Jump to specific index
            jumpToWallpaper(parseInt(data));
            break;
    }
}

// --- 4. Pairing Logic ---

// Call this to become a Host (Display)
function startHostSession() {
    const roomId = generateUUID(); // Unique secure room
    const psk = generateUUID();    // Pre-Shared Key (Password)
    
    saveWavesState(roomId, psk, 'host');
    connectToRoom(roomId, psk);
    
    // Return data for QR Code
    return JSON.stringify({ r: roomId, k: psk });
}

// Call this to become a Client (Phone)
function joinClientSession(qrDataString) {
    try {
        const data = JSON.parse(qrDataString);
        if(data.r && data.k) {
            saveWavesState(data.r, data.k, 'client');
            connectToRoom(data.r, data.k);
            return true;
        }
    } catch(e) {
        console.error("Invalid Pairing Code");
        return false;
    }
}

function disconnectWaves() {
    localStorage.removeItem('waves_connection');
    if(wavesRoom) {
        // Trystero doesn't have a clean 'disconnect' method in doc, reload is safest
        window.location.reload();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initWaves);

// Expose for UI
window.Waves = {
    startHost: startHostSession,
    joinClient: joinClientSession,
    disconnect: disconnectWaves,
    send: sendCommand
};
