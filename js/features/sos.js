let sosTapCount = 0;
let sosLastTapTime = 0;

const TAP_WINDOW = 800;
const REQUIRED_FINGERS = 1;
const REQUIRED_TAPS = 5;
const SOS_DELAY_MS = 5000;

let activeTouches = new Set();
let pendingSOS = false;
let pendingTimeout = null;

function resetIfNeeded(now) {
    if (now - sosLastTapTime > TAP_WINDOW) {
        sosTapCount = 0;
    }
    sosLastTapTime = now;
}

function startSiren() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    osc.type = "square";
    osc2.type = "sawtooth";

    const startFreq = 600;
    const endFreq = 1800;

    osc.frequency.value = startFreq;
    osc2.frequency.value = startFreq / 1.5; // slight detune

    gain.gain.value = 1.0;

    osc.connect(gain);
    osc2.connect(gain);

    gain.connect(ctx.destination);

    osc.start();
    osc2.start();

    const cycleLength = 1200; // 1 second rising + 0.2 seconds silence

    const sirenInterval = setInterval(() => {
        const cycleTime = Date.now() % cycleLength;

        if (cycleTime < 1000) {
            // Rising phase
            const progress = cycleTime / 1000;

            const freq =
                startFreq +
                progress * (endFreq - startFreq);

            osc.frequency.setTargetAtTime(
                freq,
                ctx.currentTime,
                0.02
            );
    
            osc2.frequency.setTargetAtTime(
                freq / 1.5,
                ctx.currentTime,
                0.02
            );

            // sound ON
            gain.gain.setTargetAtTime(
                1.0,
                ctx.currentTime,
                0.02
            );

        } else {
            // Actual silence for 0.2 seconds
            gain.gain.setTargetAtTime(
                0,
                ctx.currentTime,
                0.02
            );

            // reset pitch ready for next rise
            osc.frequency.setTargetAtTime(
                startFreq,
                ctx.currentTime,
                0.02
            );

            osc2.frequency.setTargetAtTime(
                startFreq * 1.01,
                ctx.currentTime,
                0.02
            );
        }

        if (navigator.vibrate) {
            if (cycleTime < 1000) {
                navigator.vibrate([250, 80]);
            }
        }

    }, 20);
    
    const overlay = document.createElement("div");
    overlay.id = "sos-overlay";
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        font-size: 5rem;
        font-weight: bold;
        color: white;
        white-space: pre-line;
        text-align: center;
        background: rgb(255 0 0);
    `;

    const text = document.createElement("div");
    text.textContent = "Emergency SOS!\nPlease help me, or call emergency services";

    const iceContacts = localStorage.getItem('emergencyContacts') || 'No emergency contacts set';
    const iceLabel = document.createElement('div');
    iceLabel.id = 'blackout-ice-info';
    iceLabel.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        color: white; font-size: 24px; text-align: center;
    `;
    iceLabel.innerHTML = `Emergency Contacts:<br>${iceContacts}`;

    const stopBtn = document.createElement("button");
    stopBtn.textContent = "Stop";
    stopBtn.style.cssText = `
        font-family: 'Inter';
        color: black;
        background-color: white;
        padding: 8px 16px;
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
    `;

    overlay.appendChild(text);
    overlay.appendChild(stopBtn);
    overlay.appendChild(iceLabel);
    document.body.appendChild(overlay);

    const flashInterval = setInterval(() => {
        text.style.display = "none";

        setTimeout(() => {
            text.style.display = "block";
        }, 1500);
    }, 3000);

    function stop() {
        clearInterval(sirenInterval);
        clearInterval(flashInterval);
        osc.stop();
        osc2.stop();
        ctx.close();

        if (navigator.vibrate) {
            navigator.vibrate(0);
        }

        overlay.remove();
        style.remove();
    }

    stopBtn.addEventListener("click", stop);

    return stop;
}

// Trigger SOS with delay + cancel option
function triggerSOS() {
    if (pendingSOS) return;
    pendingSOS = true;

    const contacts =
        localStorage.getItem("emergencyContacts") || "None";

    const overlay = document.createElement("div");
    overlay.id = "sos-pending";
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        font-size: 2rem;
        background: rgb(255 0 0);
        color: white;
    `;

    const text = document.createElement("div");
    text.textContent = "Emergency SOS will activate in 5 seconds.";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
        font-family: 'Inter';
        color: black;
        background-color: white;
        padding: 8px 16px;
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
    `;

    overlay.appendChild(text);
    overlay.appendChild(cancelBtn);
    document.body.appendChild(overlay);

    cancelBtn.onclick = () => {
        pendingSOS = false;
        clearTimeout(pendingTimeout);
        overlay.remove();
    };

    pendingTimeout = setTimeout(() => {
        overlay.remove();
        pendingSOS = false;

        showNotification(
            "Notifying emergency contacts: " + contacts,
            {
                heading: "Emergency SOS",
                icon: "sos",
                system: true
            }
        );

        startSiren();
    }, SOS_DELAY_MS);
}

// Track fingers DOWN
document.addEventListener("touchstart", (e) => {
    for (let t of e.touches) {
        activeTouches.add(t.identifier);
    }
});

// Track fingers UP
document.addEventListener("touchend", (e) => {
    const now = Date.now();

    for (let t of e.changedTouches) {
        activeTouches.delete(t.identifier);
    }

    if (activeTouches.size === 0) {
        const fingersUsed = e.changedTouches.length;

        if (fingersUsed === REQUIRED_FINGERS) {
            resetIfNeeded(now);
            sosTapCount++;

            if (
                sosTapCount >= REQUIRED_TAPS &&
                localStorage.getItem("emergencySosHotkey") === "true"
            ) {
                sosTapCount = 0;
                triggerSOS();
            }
        }
    }
});