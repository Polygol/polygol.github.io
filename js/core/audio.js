const SoundManager = {
    sounds: {
        'select': new Audio('/assets/sound/ui/select.mp3'),    // Standard Button
        'toggle': new Audio('/assets/sound/ui/seltoggle.mp3'), // Switches
        'check': new Audio('/assets/sound/ui/check.mp3'),      // Checkboxes
        'open': new Audio('/assets/sound/ui/in.mp3'),          // Drawer/App Open
        'close': new Audio('/assets/sound/ui/out.mp3'),        // Drawer/App Close
        'popup': new Audio('/assets/sound/ui/popup.mp3'),      // Alerts/Modals
        'error': new Audio('/assets/sound/ui/tone2.mp3'),      // Errors
        'success': new Audio('/assets/sound/ui/tone1.mp3'),    // Success
        'type': new Audio('/assets/sound/ui/mecha.mp3'),       // Input focus/typing
        'expand': new Audio('/assets/sound/ui/tridown.mp3'),   // Dropdowns open
        'collapse': new Audio('/assets/sound/ui/tripuck.mp3'), // Dropdowns close
        'delay': new Audio('/assets/sound/ui/seldelay.mp3')
    },

    play: function(type) {
        // 1. Check Global Settings
        const mode = localStorage.getItem('uiSoundMode') || 'silent_off';
        const isSilent = localStorage.getItem('silentMode') === 'true';

        if (mode === 'always_off') return;
        if (mode === 'silent_off' && isSilent) return;

        // 2. Play Sound
        const audio = this.sounds[type];
        if (audio) {
            // Clone to allow rapid-fire playback (overlapping sounds)
            const clone = audio.cloneNode();
            
            // Apply volume setting (default 40%)
            const volSetting = localStorage.getItem('sfxVolume');
            const volume = volSetting ? parseInt(volSetting) / 100 : 0.4;
            clone.volume = Math.max(0, Math.min(1, volume));
            
            clone.play().catch(e => { /* Ignore autoplay blocks */ });
        }
    }
};

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