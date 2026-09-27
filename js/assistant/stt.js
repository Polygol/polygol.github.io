// Polygol Assistant STT (kirbAI)
export class LocalSTT {
    constructor() {
        this.recognition = null;
        this.transcriber = null;
        this.isReady = false;
        this.isListening = false;
    }

    async init() {
        const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (SpeechRec) {
            try {
                this.recognition = new SpeechRec();
                this.recognition.continuous = false;
                this.recognition.interimResults = true;
                this.recognition.maxAlternatives = 1;
                const lang = localStorage.getItem('assistantLang') || localStorage.getItem('polygol_language') || 'en-US';
                this.recognition.lang = lang;
                this.isReady = true;
                return;
            } catch (e) {
                console.warn("[LocalSTT] SpeechRecognition init error:", e);
            }
        }

        // Secondary fallback: Whisper ONNX via dynamic ESM import
        try {
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
            env.allowLocalModels = false;
            env.backends.onnx.wasm.numThreads = 1;
            this.transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
            this.isReady = true;
        } catch (e) {
            console.warn("[LocalSTT] Secondary Whisper STT unavailable:", e);
            this.isReady = false;
        }
    }

    listen({ onInterim, onFinal, onError }) {
        const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!this.recognition && SpeechRec) {
            try {
                this.recognition = new SpeechRec();
                this.recognition.continuous = false;
                this.recognition.interimResults = true;
                this.recognition.maxAlternatives = 1;
            } catch (e) {
                if (onError) onError(e);
                return false;
            }
        }

        if (this.recognition) {
            try {
                this.isListening = true;
                const lang = localStorage.getItem('assistantLang') || localStorage.getItem('polygol_language') || 'en-US';
                this.recognition.lang = lang;

                this.recognition.onresult = (event) => {
                    let interim = '';
                    let final = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            final += transcript;
                        } else {
                            interim += transcript;
                        }
                    }
                    if (interim && onInterim) onInterim(interim);
                    if (final && onFinal) {
                        this.isListening = false;
                        onFinal(final.trim());
                    }
                };

                this.recognition.onerror = (e) => {
                    this.isListening = false;
                    if (onError) onError(e);
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                };

                this.recognition.start();
                return true;
            } catch (err) {
                console.warn("[LocalSTT] SpeechRecognition start error:", err);
                this.isListening = false;
                if (onError) onError(err);
                return false;
            }
        }

        return false;
    }

    stop() {
        this.isListening = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {}
        }
    }

    async transcribe(audioBuffer) {
        if (!this.transcriber) return "";
        try {
            const result = await this.transcriber(audioBuffer);
            return result.text ? result.text.trim() : "";
        } catch (e) {
            console.error("[LocalSTT] Transcribe error:", e);
            return "";
        }
    }
}