// Polygol Assistant TTS (kirbAI)
export class LocalTTS {
    constructor() {
        this.isReady = true;
    }

    async init() {
        this.isReady = true;
        return Promise.resolve();
    }

    async speak(text) {
        if (!text || typeof window === 'undefined') return;

        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                console.warn("[AssistantTTS] Web SpeechSynthesis not available in this browser.");
                return resolve();
            }

            try {
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);

                // Apply Assistant Voice Pitch Modifier from Polygol Settings (50-150 -> 0.5-1.5)
                const pitchStr = localStorage.getItem('assistantVoicePitch') || '100';
                utterance.pitch = Math.max(0.5, Math.min(2.0, parseInt(pitchStr, 10) / 100));
                utterance.rate = 1.0;

                const lang = localStorage.getItem('assistantLang') || localStorage.getItem('polygol_language') || 'en-US';
                utterance.lang = lang;

                utterance.onstart = () => {
                    if (typeof window !== 'undefined' && window.AssistantUI) {
                        window.AssistantUI.setState('speaking');
                    }
                };

                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    if (typeof window !== 'undefined' && window.AssistantUI && window.AssistantUI.currentState === 'speaking') {
                        window.AssistantUI.setState('listening');
                    }
                    resolve();
                };

                utterance.onend = finish;
                utterance.onerror = (e) => {
                    console.warn("[AssistantTTS] Speech error:", e);
                    finish();
                };

                // Safety timeout in case speech engine hangs or onend fails to fire
                const maxDuration = Math.max(1500, text.length * 120);
                setTimeout(finish, maxDuration);

                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.warn("[AssistantTTS] Speak error:", err);
                resolve();
            }
        });
    }

    stop() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }
        if (typeof window !== 'undefined' && window.AssistantUI && window.AssistantUI.currentState === 'speaking') {
            window.AssistantUI.setState('listening');
        }
    }
}