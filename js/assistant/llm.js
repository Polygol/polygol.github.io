// Polygol Assistant LLM & System AI (kirbAI)
// Powered by asynchronous Web Worker execution with zero main-thread freezing

const WORKER_CODE = `
let generator = null;
let isInitializing = false;

self.onmessage = async (e) => {
    const { id, type, payload } = e.data;

    if (type === 'init') {
        if (generator) {
            self.postMessage({ id, success: true, ready: true });
            return;
        }
        if (isInitializing) return;
        isInitializing = true;

        try {
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');
            env.allowLocalModels = false;
            env.backends.onnx.wasm.numThreads = 1;

            let device = 'wasm';
            if (typeof navigator !== 'undefined' && navigator.gpu) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) device = 'webgpu';
                } catch (_) {}
            }

            generator = await pipeline('text-generation', 'onnx-community/SmolLM2-135M-Instruct-ONNX', {
                dtype: device === 'webgpu' ? 'fp32' : 'q4',
                device: device
            });

            isInitializing = false;
            self.postMessage({ id, success: true, ready: true });
        } catch (err) {
            isInitializing = false;
            self.postMessage({ id, success: false, error: err.message });
        }
    } else if (type === 'generate') {
        if (!generator) {
            self.postMessage({ id, success: false, error: 'Model not initialized' });
            return;
        }
        try {
            const { prompt, options } = payload;
            const res = await generator(prompt, {
                max_new_tokens: options?.max_new_tokens || 80,
                temperature: options?.temperature || 0.3,
                repetition_penalty: options?.repetition_penalty || 1.1
            });
            self.postMessage({ id, success: true, result: res[0]?.generated_text });
        } catch (err) {
            self.postMessage({ id, success: false, error: err.message });
        }
    }
};
`;

export class LocalLLM {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.isLoading = false;
        this._pendingRequests = new Map();
        this._msgId = 0;
    }

    async init() {
        if (this.isReady || this.isLoading) return;
        this.isLoading = true;

        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
            this.isLoading = false;
            return;
        }

        try {
            const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            this.worker = new Worker(workerUrl);

            this.worker.onmessage = (e) => {
                const { id, success, ready, result, error } = e.data;
                if (ready) {
                    this.isReady = true;
                    this.isLoading = false;
                }

                if (id && this._pendingRequests.has(id)) {
                    const { resolve, reject, timer } = this._pendingRequests.get(id);
                    clearTimeout(timer);
                    this._pendingRequests.delete(id);
                    if (success) {
                        resolve(result);
                    } else {
                        reject(new Error(error || 'Worker generation error'));
                    }
                }
            };

            this.worker.onerror = (err) => {
                console.warn("[kirbAI-LLM] Worker encountered an error:", err);
                this.isLoading = false;
            };

            // Post init to worker in background (non-blocking)
            this.worker.postMessage({ id: ++this._msgId, type: 'init' });
        } catch (e) {
            console.warn("[kirbAI-LLM] Worker creation skipped or failed:", e);
            this.isLoading = false;
        }
    }

    _callWorker(type, payload, timeoutMs = 3500) {
        if (!this.worker) return Promise.reject(new Error("Worker not available"));

        return new Promise((resolve, reject) => {
            const id = ++this._msgId;
            const timer = setTimeout(() => {
                if (this._pendingRequests.has(id)) {
                    this._pendingRequests.delete(id);
                    reject(new Error("Worker request timed out"));
                }
            }, timeoutMs);

            this._pendingRequests.set(id, { resolve, reject, timer });
            this.worker.postMessage({ id, type, payload });
        });
    }

    _extractAssistantResponse(text) {
        if (!text) return "";
        const assistantTag = '<|im_start|>assistant';
        const index = text.lastIndexOf(assistantTag);
        let res = (index !== -1) ? text.slice(index + assistantTag.length) : text;
        const endTag = '<|im_end|>';
        const endIndex = res.indexOf(endTag);
        if (endIndex !== -1) {
            res = res.slice(0, endIndex);
        }
        return res.trim();
    }

    /**
     * General AI completion for system and Gurapps
     * @param {string} promptText
     * @param {object} [options]
     * @returns {Promise<{ text: string, json?: object }>}
     */
    async prompt(promptText, options = {}) {
        // 1. If options specify a structured task
        if (options.type === 'suggestions') {
            const suggestions = await this.generateSuggestions(options.context || {});
            return { text: JSON.stringify(suggestions), json: suggestions };
        }
        if (options.type === 'parse') {
            const parsed = await this.parseCommand(promptText, options.context || {});
            return { text: JSON.stringify(parsed), json: parsed };
        }

        // 2. Try neural worker generation if ready
        if (this.isReady) {
            try {
                const formattedPrompt = `<|im_start|>system\nYou are kirbAI, the intelligent system assistant for Polygol OS. Be concise, direct, and helpful.<|im_end|>\n<|im_start|>user\n${promptText}<|im_end|>\n<|im_start|>assistant\n`;
                const raw = await this._callWorker('generate', { prompt: formattedPrompt, options }, 9000);
                const text = this._extractAssistantResponse(raw);

                let json = null;
                try {
                    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                    if (match) json = JSON.parse(match[0]);
                } catch (_) {}

                return { text, json };
            } catch (err) {
                console.warn("[kirbAI-LLM] Neural worker prompt fallback:", err.message);
            }
        }

        // 3. Instant semantic responder fallback (always responsive, never blocks)
        return this._semanticPrompt(promptText, options);
    }

    async generate(promptText, options = {}) {
        return this.prompt(promptText, options);
    }

    /**
     * Generates intelligent, dynamic suggestion cards for the top bar
     * @param {object} context
     * @returns {Promise<Array<{ label: string, action: object, background: string }>>}
     */
    async generateSuggestions(context = {}) {
        // 1. If explicitly requested neural generation AND ready
        if (context.neural && this.isReady) {
            try {
                const timeStr = context.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const batteryStr = context.battery !== undefined ? `${context.battery}%` : '100%';
                const weatherStr = context.weather || 'Clear';

                const prompt = `<|im_start|>system\nYou are kirbAI in Polygol OS. Suggest 4 short, distinct actions for the user based on context. Return ONLY a JSON array of objects with keys: "label" (string under 25 chars), "action" (openApp, weather, sleep, mediaToggle, ecoMode, nightStand), "payload" (string or null). No conversational text.\nContext: Time ${timeStr}, Battery ${batteryStr}, Weather ${weatherStr}.<|im_end|>\n<|im_start|>user\nSuggest actions.<|im_end|>\n<|im_start|>assistant\n`;
                const raw = await this._callWorker('generate', { prompt, options: { max_new_tokens: 100, temperature: 0.2 } }, 5000);
                const out = this._extractAssistantResponse(raw);
                const jsonMatch = out.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return this._enrichSuggestions(parsed);
                    }
                }
            } catch (e) {
                console.warn("[kirbAI-LLM] Dynamic neural suggestions fallback:", e.message);
            }
        }

        // 2. High-speed contextual intelligence generator (instant < 1ms response)
        return this._generateContextualSuggestions(context);
    }

    _enrichSuggestions(cards) {
        const GRADIENTS = [
            "linear-gradient(135deg, #2b5876, #4e4376)",
            "linear-gradient(135deg, #11998e, #38ef7d)",
            "linear-gradient(135deg, #5b86e5, #36d1dc)",
            "linear-gradient(135deg, #f857a6, #ff5858)",
            "linear-gradient(135deg, #667eea, #764ba2)",
            "linear-gradient(135deg, #0f2027, #203a43, #2c5364)"
        ];

        return cards.slice(0, 4).map((c, i) => ({
            label: c.label || "Action",
            action: typeof c.action === 'object' ? c.action : { systemAction: c.action || 'openApp', payload: c.payload },
            background: c.background || GRADIENTS[i % GRADIENTS.length]
        }));
    }

    _generateContextualSuggestions(context) {
        const now = new Date();
        const hour = context.hour !== undefined ? context.hour : now.getHours();
        const battery = context.battery !== undefined ? context.battery : 100;
        const mediaPlaying = !!context.mediaPlaying;
        const temp = context.temperature ? `${context.temperature}°` : null;

        const cards = [];

        // 1. Weather / Ambient State
        cards.push({
            label: temp ? `Weather forecast (${temp})` : "What's the weather?",
            action: { systemAction: 'weather' },
            background: "linear-gradient(135deg, #2b5876, #4e4376)"
        });

        // 2. Media / Audio
        if (mediaPlaying) {
            cards.push({
                label: "Control playback",
                action: { systemAction: 'mediaToggle', payload: 'Music' },
                background: "linear-gradient(135deg, #11998e, #38ef7d)"
            });
        } else {
            cards.push({
                label: "Play music",
                action: { systemAction: 'openApp', payload: 'Music' },
                background: "linear-gradient(135deg, #5b86e5, #36d1dc)"
            });
        }

        // 3. Power or Time State
        if (battery <= 30) {
            cards.push({
                label: "Activate Eco Mode",
                action: { systemAction: 'ecoMode' },
                background: "linear-gradient(135deg, #f857a6, #ff5858)"
            });
        } else if (hour >= 21 || hour < 6) {
            cards.push({
                label: "Activate Night Stand",
                action: { systemAction: 'nightStand' },
                background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)"
            });
        } else {
            cards.push({
                label: "Browse files",
                action: { systemAction: 'openApp', payload: 'Files' },
                background: "linear-gradient(135deg, #667eea, #764ba2)"
            });
        }

        // 4. Activity Intent or System Tool
        const customIntents = context.customIntents || (typeof window !== 'undefined' ? window.ActivityIntents : []);
        if (customIntents && customIntents.length > 0) {
            const first = customIntents[0];
            cards.push({
                label: first.intentName.replace(/([A-Z])/g, ' $1').trim(),
                action: { appId: first.appId, intentName: first.intentName },
                background: "linear-gradient(135deg, #89f7fe, #66a6ff)"
            });
        } else if (hour >= 22 || hour < 6) {
            cards.push({
                label: "Turn off display",
                action: { systemAction: 'sleep' },
                background: "linear-gradient(135deg, #141e30, #243b55)"
            });
        } else {
            cards.push({
                label: "Open Settings",
                action: { systemAction: 'openApp', payload: 'Settings' },
                background: "linear-gradient(135deg, #434343, #000000)"
            });
        }

        return cards;
    }

    async parseCommand(text, context = {}) {
        if (!text || !text.trim()) return null;

        // 1. Try neural worker if ready
        if (this.isReady) {
            try {
                const intentsList = (context.customIntents || []).map(i => i.intentName).join(', ');
                const appsList = (context.apps || []).join(', ');

                const prompt = `<|im_start|>system\nYou are a command parser for Polygol OS. Map the command to a JSON object: {"action": "openApp"|"sleep"|"weather"|"mediaToggle"|"ecoMode"|"nightStand"|"customIntent"|"info", "payload": string|null, "appId": string|null, "responseText": string|null}.\nApps: ${appsList}\nIntents: ${intentsList}\nRespond ONLY with JSON.<|im_end|>\n<|im_start|>user\nCommand: ${text}<|im_end|>\n<|im_start|>assistant\n`;
                const raw = await this._callWorker('generate', { prompt, options: { max_new_tokens: 35, temperature: 0.1 } }, 7000);
                const out = this._extractAssistantResponse(raw);
                const jsonMatch = out.match(/\{[^}]+\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed && (parsed.action || parsed.systemAction)) {
                        return {
                            action: parsed.action || parsed.systemAction,
                            systemAction: parsed.systemAction || parsed.action,
                            payload: parsed.payload,
                            appId: parsed.appId,
                            intentName: parsed.intentName || parsed.payload,
                            responseText: parsed.responseText
                        };
                    }
                }
            } catch (e) {
                console.warn("[kirbAI-LLM] Command neural parse fallback:", e.message);
            }
        }

        // 2. High-speed rule-based semantic parser fallback
        return this._semanticParse(text, context);
    }

    _semanticParse(text, context = {}) {
        const lower = text.toLowerCase().trim();

        if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
            return { action: 'weather', systemAction: 'weather' };
        }
        if (lower.includes('sleep') || lower.includes('goodnight') || lower.includes('turn off screen') || lower.includes('blackout')) {
            return { action: 'sleep', systemAction: 'sleep' };
        }
        if (lower.includes('play') || lower.includes('pause') || lower.includes('resume') || lower.includes('stop music')) {
            return { action: 'mediaToggle', systemAction: 'mediaToggle', payload: 'Music' };
        }
        if (lower.includes('night stand') || lower.includes('bedside')) {
            return { action: 'nightStand', systemAction: 'nightStand' };
        }
        if (lower.includes('eco mode') || lower.includes('battery saver') || lower.includes('save battery')) {
            return { action: 'ecoMode', systemAction: 'ecoMode' };
        }

        // Conversational queries
        if (lower.includes('who are you') || lower.includes('what are you')) {
            return { action: 'info', systemAction: 'info', responseText: "I'm kirbAI, your Polygol system assistant." };
        }
        if (lower.startsWith('hello') || lower.startsWith('hi') || lower === 'hey') {
            return { action: 'info', systemAction: 'info', responseText: "Hello! How can I help you today?" };
        }
        if (lower.includes('how are you')) {
            return { action: 'info', systemAction: 'info', responseText: "I'm doing well, thank you! Ready to help." };
        }
        if (lower.includes('what is polygol') || lower.includes('about polygol')) {
            return { action: 'info', systemAction: 'info', responseText: "Polygol OS is a lightweight, web-based operating system designed for simplicity and speed." };
        }
        if (lower === 'help' || lower.includes('what can you do')) {
            return { action: 'info', systemAction: 'info', responseText: "You can ask me to open apps, check the weather, control media, turn on eco mode, or go to sleep." };
        }
        if (lower.includes('thank')) {
            return { action: 'info', systemAction: 'info', responseText: "You're very welcome!" };
        }

        // App matching
        const apps = context.apps || (typeof window !== 'undefined' ? Object.keys(window.apps || {}) : []);
        for (const app of apps) {
            if (lower.includes(app.toLowerCase())) {
                return { action: 'openApp', systemAction: 'openApp', payload: app };
            }
        }

        // Custom activity intents
        const intents = context.customIntents || (typeof window !== 'undefined' ? window.ActivityIntents : []);
        if (intents) {
            for (const item of intents) {
                if (item.keywords && item.keywords.some(k => lower.includes(k.toLowerCase()))) {
                    return { action: 'customIntent', systemAction: 'customIntent', appId: item.appId, intentName: item.intentName };
                }
                if (lower.includes(item.intentName.toLowerCase())) {
                    return { action: 'customIntent', systemAction: 'customIntent', appId: item.appId, intentName: item.intentName };
                }
            }
        }

        return null;
    }

    _semanticPrompt(promptText, options) {
        const lower = promptText.toLowerCase().trim();

        // Summarization query
        if (lower.startsWith('summarize') || lower.includes('summary')) {
            const body = promptText.replace(/^summarize:?\s*/i, '').trim();
            const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const summary = sentences.slice(0, 3).map(s => s.trim()).join('. ') + (sentences.length > 0 ? '.' : '');
            return { text: summary || "Summary not available." };
        }

        // General assistance
        return {
            text: `kirbAI: Ready to assist. System status optimal.`,
            json: { status: 'ok', query: promptText }
        };
    }

    async summarize(text, options = {}) {
        const res = await this.prompt(text, { ...options, type: 'summarize' });
        return res.text;
    }
}