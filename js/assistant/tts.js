import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';

env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

export class LocalTTS {
    constructor() {
        this.synthesizer = null;
        this.isReady = false;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    async init() {
        if (this.isReady) return;
        this.synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts');
        this.isReady = true;
    }

    async speak(text) {
        if (!this.isReady) await this.init();
        
        try {
            const result = await this.synthesizer(text);
            
            const buffer = this.audioCtx.createBuffer(1, result.audio.length, result.sampling_rate);
            buffer.copyToChannel(result.audio, 0);
            
            const source = this.audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioCtx.destination);
            
            // Apply Assistant Voice Pitch Modifier
            const pitchStr = localStorage.getItem('assistantVoicePitch') || '100';
            source.playbackRate.value = parseInt(pitchStr, 10) / 100;

            source.start(0);
            
            return new Promise(resolve => {
                source.onended = () => {
                    resolve();
                };
            });
        } catch (e) {
            console.error("TTS Error:", e);
        }
    }
}