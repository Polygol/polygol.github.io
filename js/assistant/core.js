// Polygol Assistant Core (kirbAI)
import { LocalSTT } from './stt.js';
import { LocalTTS } from './tts.js';
import { LocalLLM } from './llm.js';
import { AssistantNLP } from './nlp.js';
import { AssistantUI } from './ui.js';

class AssistantCore {
    constructor() {
        this.stt = new LocalSTT();
        this.tts = new LocalTTS();
        this.llm = new LocalLLM();
        this.nlp = new AssistantNLP();
        this.isProcessing = false;
        this.isOpen = false;
        this.activeDecisions = [];
        this._initialized = false;
        this._wakeWordStream = null;
        this._inactivityTimer = null;
        this._touchStartY = 0;
        this._touchStartX = 0;
        this._isSwiping = false;
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;

        // 1. Initialize audio/speech subsystems
        this.tts.init().catch(() => {});
        this.stt.init().catch(() => {});

        // 2. Bind global keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            // Shift + Space triggers kirbAI
            if (e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
                const wakeWordPref = localStorage.getItem('assistantWakeWord');
                // Active by default or if explicitly set to 'shift_space'
                if (!wakeWordPref || wakeWordPref === 'shift_space' || wakeWordPref === 'default') {
                    e.preventDefault();
                    this.toggle();
                }
            }

            // Escape key closes kirbAI if open
            if (e.code === 'Escape' || e.key === 'Escape') {
                if (this.isOpen) {
                    e.preventDefault();
                    this.close();
                }
            }
        });

        // 3. Bind UI interactions & gestures
        this._bindUIEvents();
        this._initEdgeSwipeListener();

        // 4. Voice wake word listener if requested
        const wakeWordMode = localStorage.getItem('assistantWakeWord') || 'none';
        if (wakeWordMode === 'voice') {
            const bootstrapVoice = async () => {
                await this.startWakeWordListener();
                document.removeEventListener('click', bootstrapVoice);
            };
            document.addEventListener('click', bootstrapVoice, { once: true });
        }
    }

    resetInactivityTimer() {
        clearTimeout(this._inactivityTimer);
        if (this.isOpen && !this.isProcessing) {
            this._inactivityTimer = setTimeout(() => {
                if (this.isOpen && !this.isProcessing) {
                    this.close();
                }
            }, 10000); // 10 seconds of inactivity closes kirbAI
        }
    }

    _bindUIEvents() {
        const overlay = document.getElementById('assistant-overlay');
        const sendBtn = document.getElementById('assistant-send-btn');
        const micBtn = document.getElementById('assistant-mic-btn');
        const textInput = document.getElementById('assistant-text-input');

        if (overlay) {
            // Inactivity resets on any interaction inside the overlay
            ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'keydown', 'input', 'scroll'].forEach(evt => {
                overlay.addEventListener(evt, () => this.resetInactivityTimer(), { passive: true });
            });

            // Tap on background dismisses
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            });

            // Swipe up gesture detection (Touch)
            overlay.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) {
                    this._touchStartX = e.touches[0].clientX;
                    this._touchStartY = e.touches[0].clientY;
                    this._isSwiping = true;
                }
                this.resetInactivityTimer();
            }, { passive: true });

            overlay.addEventListener('touchend', (e) => {
                if (!this._isSwiping) return;
                this._isSwiping = false;
                if (e.changedTouches.length > 0) {
                    const endX = e.changedTouches[0].clientX;
                    const endY = e.changedTouches[0].clientY;
                    const deltaY = this._touchStartY - endY; // positive = swipe up
                    const deltaX = this._touchStartX - endX;

                    // Swipe up threshold: 50px upward and predominantly vertical
                    if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
                        this.close();
                    }
                }
            });

            // Swipe up gesture detection (Mouse drag for desktop)
            let mouseDownY = 0;
            let mouseDownX = 0;
            let isMouseDown = false;

            overlay.addEventListener('mousedown', (e) => {
                if (e.target.closest('#assistant-decision-panel') || e.target.closest('#assistant-input-bar')) {
                    return;
                }
                isMouseDown = true;
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
                this.resetInactivityTimer();
            });

            overlay.addEventListener('mouseup', (e) => {
                if (!isMouseDown) return;
                isMouseDown = false;
                const deltaY = mouseDownY - e.clientY; // positive = swipe up
                const deltaX = mouseDownX - e.clientX;

                if (deltaY > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
                    this.close();
                }
            });
        }

        const submitText = () => {
            if (!textInput) return;
            const text = textInput.value.trim();
            if (text) {
                this.resetInactivityTimer();
                this.stt.stop();
                AssistantUI.setMicActive(false);
                AssistantUI.setTranscript(text);
                textInput.value = '';
                this.handleCommand(text);
            }
        };

        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                submitText();
            });
        }

        if (textInput) {
            textInput.addEventListener('keydown', (e) => {
                this.resetInactivityTimer();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitText();
                }
            });
        }

        if (micBtn) {
            micBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.resetInactivityTimer();
                if (this.stt.isListening) {
                    this.stt.stop();
                    AssistantUI.setMicActive(false);
                    AssistantUI.setState('listening');
                    AssistantUI.clearTranscript();
                } else {
                    this.startListening();
                }
            });
        }
    }

    _initEdgeSwipeListener() {
        const HANDLE_THICKNESS = 28; // Thickness of edge gesture capture zone in px
        const SWIPE_THRESHOLD = 35;  // Distance required to trigger swipe
        let suppressClickUntil = 0;

        // 1. Helper: Forward click through the handle to underlying content (identical to Quick Menu)
        const forwardClick = (clientX, clientY) => {
            const handles = document.querySelectorAll('.kirbai-edge-handle');
            handles.forEach(h => h.style.pointerEvents = 'none');

            const passthrough = document.querySelectorAll('.fullscreen-embed, iframe');
            const original = new Map();
            passthrough.forEach(el => {
                original.set(el, el.style.pointerEvents);
                el.style.pointerEvents = 'auto';
            });

            const target = document.elementFromPoint(clientX, clientY);

            if (target) {
                if (target.tagName === 'IFRAME') {
                    const rect = target.getBoundingClientRect();
                    const zoom = (parseFloat(document.body.style.zoom) || 100) / 100;
                    target.contentWindow?.postMessage({
                        type: 'forward-click',
                        x: (clientX - rect.left) / zoom,
                        y: (clientY - rect.top) / zoom
                    }, '*');
                } else {
                    target.dispatchEvent(new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX,
                        clientY
                    }));
                }
            }

            handles.forEach(h => {
                if (!this.isOpen) h.style.pointerEvents = 'auto';
            });
            passthrough.forEach(el => el.style.pointerEvents = original.get(el));
        };

        // 2. Global capture-phase click suppressor to prevent actions when swiped
        window.addEventListener('click', (e) => {
            if (Date.now() < suppressClickUntil) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);

        // 3. Create Edge Handles for Top, Left, and Right (Bottom removed as requested)
        const createHandle = (id, styles, edgeName) => {
            let handle = document.getElementById(id);
            if (!handle) {
                handle = document.createElement('div');
                handle.id = id;
                handle.className = 'kirbai-edge-handle';
                Object.assign(handle.style, {
                    position: 'fixed',
                    zIndex: '99998',
                    background: 'transparent',
                    touchAction: 'none',
                    userSelect: 'none',
                    pointerEvents: 'auto',
                    ...styles
                });
                document.body.appendChild(handle);
            }

            let startX = 0;
            let startY = 0;
            let isDragging = false;
            let hasSwiped = false;

            const onStart = (clientX, clientY) => {
                if (this.isOpen) return;
                startX = clientX;
                startY = clientY;
                isDragging = true;
                hasSwiped = false;
            };

            const onMove = (clientX, clientY, e) => {
                if (!isDragging || hasSwiped || this.isOpen) return;
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;

                let triggered = false;
                if (edgeName === 'top' && deltaY >= SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX) * 0.6) {
                    triggered = true;
                } else if (edgeName === 'left' && deltaX >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 0.6) {
                    triggered = true;
                } else if (edgeName === 'right' && deltaX <= -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY) * 0.6) {
                    triggered = true;
                }

                if (triggered) {
                    hasSwiped = true;
                    isDragging = false;
                    suppressClickUntil = Date.now() + 400;
                    if (e && e.cancelable) e.preventDefault();
                    if (typeof closeQuickMenu === 'function') closeQuickMenu();
                    this.trigger();
                }
            };

            const onEnd = (clientX, clientY) => {
                if (isDragging) {
                    isDragging = false;
                    // If not swiped, forward the tap to whatever was underneath
                    if (!hasSwiped && !this.isOpen) {
                        forwardClick(clientX, clientY);
                    }
                }
            };

            // Touch events
            handle.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    onStart(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            handle.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1) {
                    onMove(e.touches[0].clientX, e.touches[0].clientY, e);
                }
            }, { passive: false });

            handle.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 1) {
                    onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                }
            });

            handle.addEventListener('touchcancel', () => {
                isDragging = false;
            });

            // Mouse events
            const onMouseMove = (e) => {
                onMove(e.clientX, e.clientY, e);
            };

            const onMouseUp = (e) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                onEnd(e.clientX, e.clientY);
            };

            handle.addEventListener('mousedown', (e) => {
                onStart(e.clientX, e.clientY);
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        };

        // Create handles: Top, Left, Right
        createHandle('kirbai-edge-top', {
            top: '0',
            left: '0',
            width: '100%',
            height: `${HANDLE_THICKNESS}px`
        }, 'top');

        createHandle('kirbai-edge-left', {
            top: `${HANDLE_THICKNESS}px`,
            left: '0',
            width: `${HANDLE_THICKNESS}px`,
            height: `calc(100% - ${HANDLE_THICKNESS}px)`
        }, 'left');

        createHandle('kirbai-edge-right', {
            top: `${HANDLE_THICKNESS}px`,
            right: '0',
            width: `${HANDLE_THICKNESS}px`,
            height: `calc(100% - ${HANDLE_THICKNESS}px)`
        }, 'right');
    }

    async startWakeWordListener() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._wakeWordStream = stream;
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(audioCtx.destination);

            let audioChunks = [];
            let isSpeaking = false;

            processor.onaudioprocess = async (e) => {
                if (this.isOpen || this.isProcessing) return;
                const inputData = e.inputBuffer.getChannelData(0);

                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
                const avg = sum / inputData.length;

                if (avg > 0.02) {
                    isSpeaking = true;
                    audioChunks.push(new Float32Array(inputData));
                } else if (isSpeaking) {
                    isSpeaking = false;
                    const totalLength = audioChunks.reduce((acc, val) => acc + val.length, 0);
                    const combined = new Float32Array(totalLength);
                    let offset = 0;
                    audioChunks.forEach(chunk => { combined.set(chunk, offset); offset += chunk.length; });
                    audioChunks = [];

                    const text = await this.stt.transcribe(combined);
                    if (text && (text.toLowerCase().includes('polygol') || text.toLowerCase().includes('kirb'))) {
                        await this.trigger();
                    }
                }
            };
        } catch (err) {
            console.warn("[Assistant] Wake word initialization skipped (mic denied):", err);
        }
    }

    async generateSmartSuggestions() {
        const weatherData = (typeof window !== 'undefined' && window.SwapManager) ? await window.SwapManager.get('lastWeatherData') : null;
        const now = new Date();
        const battery = (typeof window !== 'undefined' && window.currentBatteryLevel) || 100;
        const mediaPlaying = (typeof window !== 'undefined' && !!window.activeMediaSessionApp);
        const temp = weatherData?.current?.temperature || null;

        const context = {
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            hour: now.getHours(),
            battery: battery,
            temperature: temp,
            weather: weatherData?.current ? `${temp}°C, ${weatherData.current.weathercode || 'Clear'}` : 'Clear',
            mediaPlaying: mediaPlaying,
            apps: typeof window !== 'undefined' ? Object.keys(window.apps || {}) : [],
            customIntents: typeof window !== 'undefined' ? (window.ActivityIntents || []) : []
        };

        // Power the top Suggestion bar with kirbAI LLM
        return await this.llm.generateSuggestions(context);
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.trigger();
        }
    }

    async trigger() {
        if (this.isOpen) {
            this.close();
            return;
        }

        this.isOpen = true;
        this.isProcessing = false;

        document.querySelectorAll('.kirbai-edge-handle').forEach(h => h.style.pointerEvents = 'none');

        // Hide command input by default (ONLY shows when microphone is unavailable)
        AssistantUI.showInput(false);
        AssistantUI.show();

        // Start 10-second inactivity countdown
        this.resetInactivityTimer();

        // 1. Setup smart contextual decisions immediately
        this.activeDecisions = await this.generateSmartSuggestions();
        AssistantUI.setDecisions('Suggested &bull; Tap or say a number', this.activeDecisions);

        // 2. Clear transcript and set animated SVG character to listening state
        AssistantUI.clearTranscript();
        AssistantUI.setState('listening');
        this.startListening();

        // 3. Lazy-init LLM in background if WebGPU/WASM available (completely non-blocking)
        if (!this.llm.isReady && !this.llm.isLoading) {
            setTimeout(() => this.llm.init().catch(() => {}), 1000);
        }
    }

    startListening() {
        AssistantUI.setMicActive(true);
        AssistantUI.setState('listening');

        const started = this.stt.listen({
            onInterim: (text) => {
                this.resetInactivityTimer();
                AssistantUI.setTranscript(text);
            },
            onFinal: (text) => {
                this.resetInactivityTimer();
                AssistantUI.setMicActive(false);
                AssistantUI.setTranscript(text);
                this.handleCommand(text);
            },
            onError: (err) => {
                AssistantUI.setMicActive(false);
                console.warn("[Assistant] STT warning:", err);
                // Microphone is unavailable: show text input bar and error character state
                AssistantUI.showInput(true);
                AssistantUI.setState('error');
                AssistantUI.clearTranscript();
                this.resetInactivityTimer();
            }
        });

        if (!started) {
            // Microphone unavailable or not supported: show text input bar and error character state
            AssistantUI.setMicActive(false);
            AssistantUI.showInput(true);
            AssistantUI.setState('error');
            AssistantUI.clearTranscript();
            this.resetInactivityTimer();
        }
    }

    close() {
        clearTimeout(this._inactivityTimer);
        this._inactivityTimer = null;
        this.isOpen = false;
        this.isProcessing = false;
        this.stt.stop();
        this.tts.stop();
        document.querySelectorAll('.kirbai-edge-handle').forEach(h => h.style.pointerEvents = 'auto');
        AssistantUI.setMicActive(false);
        AssistantUI.showInput(false);
        AssistantUI.hide();
    }

    executeDecision(index) {
        if (!this.activeDecisions || !this.activeDecisions[index]) return;
        this.resetInactivityTimer();
        const decision = this.activeDecisions[index];
        this.executeAction(decision.action);
    }

    async executeAction(action) {
        if (!action) return;
        this.isProcessing = true;
        clearTimeout(this._inactivityTimer);
        this.stt.stop();
        AssistantUI.setMicActive(false);
        AssistantUI.clearDecisions();
        AssistantUI.showInput(false);

        const openEmbed = (url) => {
            if (typeof window.createFullscreenEmbed === 'function') {
                window.createFullscreenEmbed(url);
            } else if (typeof createFullscreenEmbed === 'function') {
                createFullscreenEmbed(url);
            }
        };

        const actionType = action.systemAction || action.action;

        if (actionType === 'openApp') {
            const rawName = action.payload || 'App';
            const apps = window.apps || {};

            let targetUrl = '/';
            let displayName = rawName;

            if (apps[rawName]) {
                targetUrl = apps[rawName].url;
                displayName = rawName;
            } else if (rawName.toLowerCase() === 'music') {
                targetUrl = '/music/index.html';
                displayName = 'Music';
            } else if (rawName.toLowerCase() === 'weather') {
                targetUrl = 'https://polygol.github.io/weather/index.html';
                displayName = 'Weather';
            } else {
                const foundKey = Object.keys(apps).find(k => k.toLowerCase() === rawName.toLowerCase());
                if (foundKey) {
                    targetUrl = apps[foundKey].url;
                    displayName = foundKey;
                }
            }

            AssistantUI.setState('speaking');
            AssistantUI.setTranscript(`Opening ${displayName}...`);
            openEmbed(targetUrl);
            await this.tts.speak(`Opening ${displayName}`);

        } else if (actionType === 'sleep') {
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript("Going to sleep...");
            await this.tts.speak("Goodnight.");
            if (typeof window.blackoutScreen === 'function') {
                window.blackoutScreen();
            } else if (typeof blackoutScreen === 'function') {
                blackoutScreen();
            }

        } else if (actionType === 'weather') {
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript("Checking the weather...");
            const weatherUrl = window.apps?.['Weather']?.url || 'https://polygol.github.io/weather/index.html';
            openEmbed(weatherUrl);
            await this.tts.speak("Here is the weather forecast.");

        } else if (actionType === 'mediaToggle') {
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript("Controlling media...");
            if (window.Gurasuraisu && typeof window.Gurasuraisu.callApp === 'function') {
                window.Gurasuraisu.callApp(action.payload || 'Music', 'playPause');
            }
            await this.tts.speak("Done.");

        } else if (actionType === 'nightStand') {
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript("Activating Night Stand...");
            if (typeof window.setControlValueAndDispatch === 'function') {
                window.setControlValueAndDispatch('nightStandEnabled', 'true');
            } else if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('nightStandEnabled', 'true');
            }
            await this.tts.speak("Night Stand activated.");

        } else if (actionType === 'ecoMode') {
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript("Activating Eco Mode...");
            if (typeof window.setControlValueAndDispatch === 'function') {
                window.setControlValueAndDispatch('adaptiveBatterySaver', 'true');
            } else if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch('adaptiveBatterySaver', 'true');
            }
            await this.tts.speak("Eco Mode activated.");

        } else if (actionType === 'info' || action.responseText) {
            const resp = action.responseText || "Done.";
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript(resp);
            await this.tts.speak(resp);

        } else if (action.appId && (action.intentName || action.payload)) {
            AssistantUI.setState('speaking');
            AssistantUI.setTranscript(`Executing task...`);
            if (typeof window.triggerActivityIntent === 'function') {
                window.triggerActivityIntent(action.appId, action.intentName || action.payload, action.parameters);
            }
            await this.tts.speak("Executing task.");
        }

        setTimeout(() => {
            this.close();
        }, 1200);
    }

    async handleCommand(text) {
        if (!text || !text.trim()) {
            return;
        }

        this.resetInactivityTimer();

        // 1. Check if user specified a card number (1, 2, 3, 4)
        const numIndex = this.nlp.parseNumber(text);
        if (numIndex !== null && this.activeDecisions && this.activeDecisions[numIndex]) {
            this.executeDecision(numIndex);
            return;
        }

        // 2. Check rule-based NLP parser (instant response)
        const parsed = this.nlp.parse(text);
        if (parsed) {
            await this.executeAction(parsed);
            return;
        }

        // 3. Fallback to LLM / semantic parser
        if (this.llm) {
            AssistantUI.setLoading();
            const context = {
                apps: Object.keys(window.apps || {}),
                customIntents: window.ActivityIntents || []
            };

            try {
                const match = await this.llm.parseCommand(text, context);
                if (match && (match.action || match.systemAction || match.appId || match.responseText)) {
                    await this.executeAction({
                        systemAction: match.action || match.systemAction,
                        payload: match.payload,
                        intentName: match.intentName || match.payload,
                        appId: match.appId,
                        responseText: match.responseText
                    });
                    return;
                }
            } catch (e) {
                console.warn("[Assistant] LLM parse error:", e);
            }

            // If it's a general question and LLM is ready, generate conversational response
            if (this.llm.isReady) {
                try {
                    const ans = await this.llm.prompt(text, { max_new_tokens: 60 });
                    if (ans && ans.text && ans.text.trim()) {
                        await this.executeAction({
                            systemAction: 'info',
                            responseText: ans.text.trim()
                        });
                        return;
                    }
                } catch (err) {
                    console.warn("[Assistant] General LLM prompt error:", err);
                }
            }
        }

        // 4. Default fallback when unhandled: show don't understand state on character (no status text)
        AssistantUI.clearDecisions();
        AssistantUI.clearTranscript();
        AssistantUI.setState('dont_understand');
        try {
            await this.tts.speak("Sorry, I don't understand.");
        } catch (e) {}

        setTimeout(() => {
            if (this.isOpen) {
                AssistantUI.setState('listening');
                AssistantUI.clearTranscript();
                AssistantUI.setDecisions('Suggested &bull; Tap or say a number', this.activeDecisions);
                this.resetInactivityTimer();
            }
        }, 2200);
    }
}

// Global Intent Trigger Router
window.triggerActivityIntent = (appId, intentName, parameters) => {
    const iframe = document.querySelector(`iframe[data-app-id="${appId}"]`);
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'executeActivityIntent', intentName, parameters }, '*');
    }
};

// Instantiate and expose globally
const assistantInstance = new AssistantCore();
window.Assistant = assistantInstance;
window.kirbAI = assistantInstance;

// Global System AI API (available to OS services, apps, and widgets)
const systemAI = {
    prompt: (text, options) => assistantInstance.llm.prompt(text, options),
    generate: (text, options) => assistantInstance.llm.generate(text, options),
    generateSuggestions: (context) => assistantInstance.llm.generateSuggestions(context),
    parseCommand: (text, context) => assistantInstance.llm.parseCommand(text, context),
    summarize: (text, options) => assistantInstance.llm.summarize(text, options),
    isReady: () => assistantInstance.llm.isReady
};

window.SystemAI = systemAI;
window.PolygolAI = systemAI;
assistantInstance.ai = systemAI;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Assistant.init();
    });
} else {
    window.Assistant.init();
}

export default assistantInstance;