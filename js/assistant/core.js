import { LocalSTT } from './stt.js';
import { LocalTTS } from './tts.js';
import { LocalLLM } from './llm.js';
import { AssistantUI } from './ui.js';

const safeInit = (fn, name, timeout = 60000) =>
    Promise.race([
        fn(),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(name + " timeout")), timeout)
        )
    ]);

class AssistantCore {
    constructor() {
        this.stt = new LocalSTT();
        this.tts = new LocalTTS();
        this.llm = new LocalLLM();
        this.isProcessing = false;
        this.activeDecisions = [];
    }

    async init() {
        const wakeWordMode = localStorage.getItem('assistantWakeWord') || 'none';
        
        // Bind shortcut globally if enabled
        window.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.code === 'Space' && localStorage.getItem('assistantWakeWord') === 'shift_space') {
                e.preventDefault();
                this.trigger();
            }
        });

        // Initialize voice if needed
        if (wakeWordMode === 'voice') {
            // Wait for user interaction to satisfy browser AudioContext rules
            const bootstrapVoice = async () => {
                await this.stt.init();
                this.startWakeWordListener();
                document.removeEventListener('click', bootstrapVoice);
            };
            document.addEventListener('click', bootstrapVoice);
        }
    }

    async startWakeWordListener() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            source.connect(processor);
            processor.connect(audioCtx.destination);
            
            let audioChunks = [];
            let isSpeaking = false;
            
            processor.onaudioprocess = async (e) => {
                if (this.isProcessing) return;
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Voice Activity Detection (Energy detection)
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
                const avg = sum / inputData.length;
                
                if (avg > 0.02) {
                    isSpeaking = true;
                    audioChunks.push(new Float32Array(inputData));
                } else if (isSpeaking) {
                    isSpeaking = false;
                    this.isProcessing = true;
                    
                    const totalLength = audioChunks.reduce((acc, val) => acc + val.length, 0);
                    const combined = new Float32Array(totalLength);
                    let offset = 0;
                    audioChunks.forEach(chunk => { combined.set(chunk, offset); offset += chunk.length; });
                    audioChunks = [];
                    
                    const text = await this.stt.transcribe(combined);
                    if (text.toLowerCase().includes('polygol')) {
                        await this.trigger();
                    }
                    
                    this.isProcessing = false;
                }
            };
        } catch (err) {
            console.warn("Wake word disabled: Microphone access denied.");
        }
    }

    async generateSmartSuggestions() {
        const weatherData = await window.SwapManager?.get('lastWeatherData');
        const context = {
            time: new Date().toLocaleTimeString(),
            battery: window.currentBatteryLevel || 100,
            weather: weatherData?.current ? `${weatherData.current.temperature}°` : 'unknown',
            mediaPlaying: window.activeMediaSessionApp ? 'yes' : 'no',
            apps: Object.keys(window.apps || {}),
            customIntents: window.ActivityIntents || []
        };
        
        let llmSuggestions = await this.llm.generateSuggestions(context);
        
        const fallbacks = [
            { label: "Play music", action: { systemAction: 'openApp', payload: 'Music' } },
            { label: "What's the weather?", action: { systemAction: 'weather' } },
            { label: "Turn off display", action: { systemAction: 'sleep' } },
            { label: "Open Settings", action: { systemAction: 'openApp', payload: 'Settings' } }
        ];

        let decisions = fallbacks;

        if (llmSuggestions && Array.isArray(llmSuggestions) && llmSuggestions.length > 0) {
            decisions = llmSuggestions.map(s => ({
                label: s.label || s.action,
                action: { systemAction: s.action, payload: s.payload, intentName: s.payload, appId: s.appId }
            }));
            // Pad with fallbacks if LLM returned too few
            while (decisions.length < 4) {
                decisions.push(fallbacks[decisions.length]);
            }
        }

        const gradients = [
            "linear-gradient(135deg, #000, #333)",
            "linear-gradient(135deg, #4da0b0, #d39d38)",
            "linear-gradient(135deg, #5b86e5, #36d1dc)",
            "linear-gradient(135deg, #9c27b0, #673ab7)"
        ];

        return decisions.slice(0, 4).map((d, i) => ({
            ...d,
            background: gradients[i]
        }));
    }

    async trigger() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        AssistantUI.show();
        
        // Setup initial fallback decisions to avoid empty UI
        this.activeDecisions = [
            { label: "Play music", background: "linear-gradient(135deg, #000, #333)", action: { systemAction: 'openApp', payload: 'Music' } },
            { label: "What's the weather?", background: "linear-gradient(135deg, #4da0b0, #d39d38)", action: { systemAction: 'weather' } },
            { label: "Show photos on this day", background: "linear-gradient(135deg, #5b86e5, #36d1dc)", action: { systemAction: 'openApp', payload: 'Files' } },
            { label: "Turn off display", background: "linear-gradient(135deg, #9c27b0, #673ab7)", action: { systemAction: 'sleep' } }
        ];
        AssistantUI.setDecisions('Suggested &bull; Say a number', this.activeDecisions);

        // Initialize components if cold
        if (!this.stt.isReady || !this.tts.isReady || !this.llm.isReady) {
            AssistantUI.setLoading();

            try {
                await Promise.all([
                    this.stt.isReady ? Promise.resolve() : safeInit(() => this.stt.init(), "STT"),
                ]);

                // LLM loads in background (non-blocking)
                if (!this.llm.isReady) {
                    safeInit(() => this.llm.init(), "LLM", 90000)
                        .catch(e => console.warn("LLM background load failed:", e));
                }

                // TTS also background
                if (!this.tts.isReady) {
                    safeInit(() => this.tts.init(), "TTS", 60000)
                        .catch(e => console.warn("TTS background load failed:", e));
                }
            } catch (e) {
                console.error("Model init failed:", e);
                AssistantUI.setText("Failed to load assistant models.");
                this.isProcessing = false;
                return;
            }
        }

        // Fire LLM Suggestion generation
        this.generateSmartSuggestions().then(decisions => {
            if (this.isProcessing) {
                this.activeDecisions = decisions;
                AssistantUI.setDecisions('Suggested &bull; Say a number', this.activeDecisions);
            }
        });
        
        AssistantUI.setText("I'm listening...");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            
            const bufferSize = 16000 * 3; // Record 3 seconds
            const buffer = new Float32Array(bufferSize);
            let offset = 0;
            
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioCtx.destination);
            
            processor.onaudioprocess = async (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                if (offset + inputData.length < bufferSize) {
                    buffer.set(inputData, offset);
                    offset += inputData.length;
                } else {
                    // Finished recording
                    processor.disconnect();
                    source.disconnect();
                    stream.getTracks().forEach(t => t.stop());
                    
                    AssistantUI.setLoading();
                    const text = await this.stt.transcribe(buffer);
                    await this.handleCommand(text);
                }
            };
        } catch (err) {
            console.error("Microphone error:", err);
            AssistantUI.setText("I need access to your microphone.");
            setTimeout(() => {
                AssistantUI.hide();
                this.isProcessing = false;
            }, 2000);
        } finally {
            // safety net: always unlock even if something breaks earlier
            setTimeout(() => {
                this.isProcessing = false;
            }, 3000);
        }
    }

    executeDecision(index) {
        if (!this.activeDecisions || !this.activeDecisions[index]) return;
        const decision = this.activeDecisions[index];
        this.executeAction(decision.action);
    }

    async executeAction(action) {
        AssistantUI.clearDecisions();
        if (action.systemAction === 'openApp') {
            AssistantUI.setText(`Opening ${action.payload}...`);
            window.createFullscreenEmbed(window.apps[action.payload]?.url || '/');
            await this.tts.speak(`Opening ${action.payload}`);
        } else if (action.systemAction === 'sleep') {
            AssistantUI.setText("Going to sleep...");
            window.blackoutScreen();
            await this.tts.speak("Goodnight.");
        } else if (action.systemAction === 'weather') {
            AssistantUI.setText("Checking the weather...");
            if (window.apps['Weather']) window.createFullscreenEmbed(window.apps['Weather'].url);
            await this.tts.speak("Here is the weather forecast.");
        } else if (action.systemAction === 'mediaToggle') {
            AssistantUI.setText("Controlling media...");
            if (window.Gurasuraisu && window.Gurasuraisu.callApp) {
                window.Gurasuraisu.callApp(action.payload, 'playPause');
            }
            await this.tts.speak("Done.");
        } else if (action.systemAction === 'nightStand') {
            AssistantUI.setText("Activating Night Stand...");
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('nightStandEnabled', 'true');
            }
            await this.tts.speak("Night Stand activated.");
        } else if (action.systemAction === 'ecoMode') {
            AssistantUI.setText("Activating Eco Mode...");
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('adaptiveBatterySaver', 'true');
            }
            await this.tts.speak("Eco Mode activated to save battery.");
        } else if (action.appId && action.intentName) {
            AssistantUI.setText(`Executing intent...`);
            window.triggerActivityIntent(action.appId, action.intentName, action.parameters);
            await this.tts.speak("Executing task.");
        }
        
        setTimeout(() => {
            AssistantUI.hide();
            this.isProcessing = false;
        }, 1000);
    }

    async handleCommand(text) {
        if (!text) {
            AssistantUI.hide();
            this.isProcessing = false;
            return;
        }
        
        // 1. Check if user said a number corresponding to active decisions
        const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
        const map = { '1':0, 'one':0, 'won':0, '2':1, 'two':1, 'to':1, 'too':1, '3':2, 'three':2, 'tree':2, '4':3, 'four':3, 'for':3 };
        const numIndex = map[clean];
        if (numIndex !== undefined && this.activeDecisions && this.activeDecisions[numIndex]) {
            this.executeDecision(numIndex);
            return;
        }

        // 2. Parse as a natural language command using LLM
        const context = {
            apps: Object.keys(window.apps || {}),
            customIntents: window.ActivityIntents || []
        };
        
        AssistantUI.setLoading();

        let match;
        try {
            match = await this.llm.parseCommand(text, context);
        } catch (e) {
            console.error("LLM parse failed:", e);
            match = null;
        }
        
        if (match && match.action) {
            const systemAction = match.action;
            const payload = match.payload;
            const intentName = match.payload;
            const appId = match.appId;

            await this.executeAction({ systemAction, payload, intentName, appId });
        } else {
            AssistantUI.clearDecisions();
            AssistantUI.setText("I didn't quite catch that.");

            try {
                await this.tts.speak("I didn't quite catch that.");
            } catch (e) {
                console.error("TTS fallback failed:", e);
            }
        }

        // ALWAYS CLEAN UP (safe, no finally needed)
        setTimeout(() => {
            AssistantUI.hide();
            this.isProcessing = false;
        }, 2000);
    }
}

// Global Intent Trigger Router
window.triggerActivityIntent = (appId, intentName, parameters) => {
    const iframe = document.querySelector(`iframe[data-app-id="${appId}"]`);
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'executeActivityIntent', intentName, parameters }, '*');
    }
};

/* Uncomment when ready.

document.addEventListener('DOMContentLoaded', () => {
    window.Assistant = new AssistantCore();
    window.Assistant.init();
}); */