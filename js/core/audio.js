const SoundManager = {
    audioCtx: null,
    buffers: {},
    soundPaths: {
        'select': '/assets/sound/ui/select.mp3',
        'toggle': '/assets/sound/ui/seltoggle.mp3',
        'check': '/assets/sound/ui/check.mp3',
        'open': '/assets/sound/ui/in.mp3',
        'close': '/assets/sound/ui/out.mp3',
        'popup': '/assets/sound/ui/popup.mp3',
        'error': '/assets/sound/ui/tone2.mp3',
        'success': '/assets/sound/ui/tone1.mp3',
        'type': '/assets/sound/ui/mecha.mp3',
        'expand': '/assets/sound/ui/tridown.mp3',
        'collapse': '/assets/sound/ui/tripuck.mp3',
        'delay': '/assets/sound/ui/seldelay.mp3'
    },

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            
            // Preload all sounds directly into RAM buffers to avoid OS media hooks
            for (const [key, path] of Object.entries(this.soundPaths)) {
                fetch(path)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => this.audioCtx.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        this.buffers[key] = audioBuffer;
                    })
                    .catch(err => console.warn(`Failed to load sound ${key}`, err));
            }
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    },

    play(type) {
        // 1. Check Global Settings
        const mode = localStorage.getItem('uiSoundMode') || 'silent_off';
        const isSilent = localStorage.getItem('silentMode') === 'true';

        if (mode === 'always_off') return;
        if (mode === 'silent_off' && isSilent) return;

        // 2. Play via Web Audio API (Prevents Media Session takeover)
        if (this.audioCtx && this.buffers[type]) {
            // Browser policy workaround (must be resumed on interaction)
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            
            const source = this.audioCtx.createBufferSource();
            source.buffer = this.buffers[type];
            
            const gainNode = this.audioCtx.createGain();
            const volSetting = localStorage.getItem('sfxVolume');
            const volume = volSetting ? parseInt(volSetting) / 100 : 0.4;
            gainNode.gain.value = Math.max(0, Math.min(1, volume));
            
            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            source.start(0);
        }
    }
};

// Initialize immediately on file load
SoundManager.init();

window.SoundManager = SoundManager; // Expose to global scope for API access

// "Smart" Context Detector
function determineSoundContext(element) {
    if (!element) return null;

    const tag = element.tagName;
    
    // FIX: Ignore LABELS to prevent double-audio (Label click -> Input click)
    if (tag === 'LABEL') return null;

    const type = element.getAttribute('type');
    const role = element.getAttribute('role');

    // 1. Forms (Inputs)
    if (tag === 'INPUT') {
        if (type === 'checkbox' || type === 'radio') {
            return (role === 'switch') ? 'toggle' : 'check';
        }
        if (type === 'range') return null;
        if (['text', 'password', 'email', 'number', 'search'].includes(type)) return 'type';
        return 'select';
    }
    
    if (tag === 'TEXTAREA') return 'type';
    if (tag === 'SELECT') return 'expand';

    // 2. Buttons & Links
    if (tag === 'BUTTON' || tag === 'A' || role === 'button') {
        return 'select';
    }

    // 3. "Interactive Divs" (Heuristic: Computed Pointer Cursor)
    // Only check this if we haven't found a specific tag yet
    try {
        const style = window.getComputedStyle(element);
        if (style.cursor === 'pointer') {
            return 'select';
        }
    } catch(e) {}

    return null; 
}

window.systemSpeak = function(text) {
    if (!text || isSilentMode) return;

    const synth = window.speechSynthesis;
    
    // 1. Check Media State
    // If the widget shows the 'pause' icon, it means media is currently playing.
    const playBtn = document.querySelector('#media-widget-play-pause span');
    const wasPlaying = playBtn && playBtn.textContent === 'pause';
    const mediaApp = window.activeMediaSessionApp;

    const speak = () => {
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();
        
        // Robust Voice Selection
        let selectedVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Microsoft Zira"));
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('en'));
        if (!selectedVoice) selectedVoice = voices[0];
        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.rate = 1.0;
        utterance.volume = 1.0;
        
        // 2. Pause Media on Start
        utterance.onstart = () => {
            if (wasPlaying && mediaApp) {
                // Send toggle command to pause
                Gurasuraisu.callApp(mediaApp, 'playPause');
            }
        };

        // 3. Resume Media on End
        const resumeMedia = () => {
            if (wasPlaying && mediaApp) {
                // Check current state to ensure we don't accidentally PAUSE it 
                // if the user manually resumed it during the speech.
                const currentBtn = document.querySelector('#media-widget-play-pause span');
                // Only toggle if it is currently paused (showing 'play_arrow')
                if (currentBtn && currentBtn.textContent === 'play_arrow') {
                    Gurasuraisu.callApp(mediaApp, 'playPause');
                }
            }
        };

        utterance.onend = resumeMedia;
        utterance.onerror = resumeMedia; // Ensure resume happens even if TTS errors out
        
        synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
        synth.onvoiceschanged = speak;
    } else {
        speak();
    }
};