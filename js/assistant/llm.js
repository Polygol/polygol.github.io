import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';

env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

export class LocalLLM {
    constructor() {
        this.generator = null;
        this.isReady = false;
    }

    async init() {
        if (this.isReady) return;
        // We use the officially community-quantized SmolLM2-135M model.
        // It fits easily into WASM memory space, bypassing the OOM crashes of the fp32 weight file 
        // and resolving ONNX layout optimization errors.
        this.generator = await pipeline('text-generation', 'onnx-community/SmolLM2-135M-Instruct-ONNX', {
            dtype: 'q4',
            device: 'wasm'
        });
        this.isReady = true;
    }

    _extractAssistantResponse(text) {
        if (!text) return "";
        const assistantTag = '<|im_start|>assistant';
        const index = text.lastIndexOf(assistantTag);
        if (index !== -1) {
            let res = text.slice(index + assistantTag.length);
            if (res.startsWith('\n')) {
                res = res.slice(1);
            }
            return res.trim();
        }
        return text.trim();
    }

    async generateSuggestions(context) {
        if (!this.isReady) await this.init();
        
        const prompt = `<|im_start|>system\nYou are a system OS assistant. The OS is named 'Polygol', and it is an ambient display operating system. Suggest 3 short actions the user can take right now based on the context. Provide the response as a strict JSON array of objects with keys "label" (short text), "action" (openApp, weather, sleep, mediaToggle, ecoMode, customIntent), and "payload" (string or null).\nContext: Time is ${context.time}, Battery is ${context.battery}%, Weather is ${context.weather}.<|im_end|>\n<|im_start|>user\nSuggest actions.<|im_end|>\n<|im_start|>assistant\n`;
        
        try {
            const result = await this.generator(prompt, { max_new_tokens: 150, temperature: 0.3, repetition_penalty: 1.1 });
            const out = this._extractAssistantResponse(result[0]?.generated_text);
            
            const jsonMatch = out.match(/\[\s*\{.*?\}\s*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("LLM Suggestion Error:", e);
        }
        return null;
    }

    async parseCommand(text, context) {
        if (!this.isReady) await this.init();
        
        const intentsList = context.customIntents.map(i => i.intentName).join(', ');
        const appsList = context.apps.join(', ');
        
        const prompt = `<|im_start|>system\nYou are an intent parser. Map the user's command to a JSON object with keys "action" (openApp, sleep, weather, mediaToggle, ecoMode, customIntent), "payload" (app name or intent name), and "appId" (if customIntent).\nApps: ${appsList}\nIntents: ${intentsList}\nReply ONLY with JSON.<|im_end|>\n<|im_start|>user\nCommand: ${text}<|im_end|>\n<|im_start|>assistant\n`;
        
        try {
            const result = await this.generator(prompt, { max_new_tokens: 60, temperature: 0.1 });
            const out = this._extractAssistantResponse(result[0]?.generated_text);
            
            const jsonMatch = out.match(/\{[^}]+\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("LLM Parse Error:", e);
        }
        return null;
    }
}