import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';

// Force use of remote CDN since we don't bundle models locally
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

export class LocalSTT {
    constructor() {
        this.transcriber = null;
        this.isReady = false;
    }

    async init() {
        if (this.isReady) return;

        try {
            this.transcriber = await pipeline(
                'automatic-speech-recognition',
                'Xenova/whisper-tiny.en'
            );
            this.isReady = true;
        } catch (e) {
            console.error("STT init failed:", e);
            this.isReady = false;
        }
    }

    async transcribe(audioBuffer) {
        if (!this.isReady) return "";
        try {
            const result = await this.transcriber(audioBuffer);
            return result.text.trim();
        } catch (e) {
            console.error("STT Error:", e);
            return "";
        }
    }
}