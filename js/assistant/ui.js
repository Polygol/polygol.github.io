// Polygol Assistant UI (kirbAI)
export const AssistantUI = {
    isOpen: false,

    show() {
        const overlay = document.getElementById('assistant-overlay');
        if (overlay) {
            overlay.classList.add('show');
            this.isOpen = true;
        }
    },

    hide() {
        const overlay = document.getElementById('assistant-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            this.isOpen = false;
        }
        this.clearDecisions();
        this.showInput(false);
        this.clearTranscript();
        this.setState('listening');
    },

    showInput(show = true) {
        const inputBar = document.getElementById('assistant-input-bar');
        if (inputBar) {
            inputBar.style.display = show ? 'flex' : 'none';
            if (show) {
                const input = document.getElementById('assistant-text-input');
                if (input) setTimeout(() => input.focus(), 150);
            } else {
                const input = document.getElementById('assistant-text-input');
                if (input) {
                    input.value = '';
                    input.blur();
                }
            }
        }
    },

    currentState: 'listening',
    _currentMouth: [3.75, 12.5, 5.8, 13.8, 7.8, 15, 10, 15, 12.2, 15, 14.2, 13.8, 16.25, 12.5],
    _morphRaf: null,

    _morphMouth(target) {
        if (!target) return;
        const mouthPath = document.getElementById('kirbai-mouth');
        if (!mouthPath) return;

        if (this._morphRaf) {
            cancelAnimationFrame(this._morphRaf);
            this._morphRaf = null;
        }

        const start = [...this._currentMouth];
        const startTime = performance.now();
        const duration = 300; // 300ms matches transition curve

        const easeOvershoot = (t) => {
            const s = 1.15;
            const t1 = t - 1;
            return t1 * t1 * ((s + 1) * t1 + s) + 1;
        };

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const factor = easeOvershoot(progress);

            const interpolated = start.map((val, i) => val + (target[i] - val) * factor);
            this._currentMouth = interpolated;

            const d = `M ${interpolated[0].toFixed(2)} ${interpolated[1].toFixed(2)} C ${interpolated[2].toFixed(2)} ${interpolated[3].toFixed(2)} ${interpolated[4].toFixed(2)} ${interpolated[5].toFixed(2)} ${interpolated[6].toFixed(2)} ${interpolated[7].toFixed(2)} C ${interpolated[8].toFixed(2)} ${interpolated[9].toFixed(2)} ${interpolated[10].toFixed(2)} ${interpolated[11].toFixed(2)} ${interpolated[12].toFixed(2)} ${interpolated[13].toFixed(2)}`;
            mouthPath.setAttribute('d', d);

            if (progress < 1) {
                this._morphRaf = requestAnimationFrame(tick);
            } else {
                this._currentMouth = [...target];
                const finalD = `M ${target[0]} ${target[1]} C ${target[2]} ${target[3]} ${target[4]} ${target[5]} ${target[6]} ${target[7]} C ${target[8]} ${target[9]} ${target[10]} ${target[11]} ${target[12]} ${target[13]}`;
                mouthPath.setAttribute('d', finalD);
                this._morphRaf = null;
            }
        };

        this._morphRaf = requestAnimationFrame(tick);
    },

    setEyebrows(style) {
        const charSvg = document.getElementById('assistant-character');
        if (!charSvg) return;

        const eyebrowClasses = [
            'eyebrows-confused',
            'eyebrows-thinking',
            'eyebrows-deep_thought',
            'eyebrows-upsidedown',
            'eyebrows-angry',
            'eyebrows-frowning',
            'eyebrows-sad',
            'eyebrows-stern',
            'eyebrows-none',
            'eyebrows-custom'
        ];
        charSvg.classList.remove(...eyebrowClasses);

        if (!style || style === 'none' || style === 'neutral') {
            charSvg.classList.add('eyebrows-none');
            return;
        }

        if (typeof style === 'string') {
            charSvg.classList.add(`eyebrows-${style}`);
        } else if (typeof style === 'object') {
            charSvg.classList.add('eyebrows-custom');
            if (style.left) {
                if (style.left.x !== undefined) charSvg.style.setProperty('--eb-l-x', `${style.left.x}px`);
                if (style.left.y !== undefined) charSvg.style.setProperty('--eb-l-y', `${style.left.y}px`);
                if (style.left.rot !== undefined) charSvg.style.setProperty('--eb-l-rot', `${style.left.rot}deg`);
                if (style.left.scaleY !== undefined) charSvg.style.setProperty('--eb-l-scale-y', style.left.scaleY);
            }
            if (style.right) {
                if (style.right.x !== undefined) charSvg.style.setProperty('--eb-r-x', `${style.right.x}px`);
                if (style.right.y !== undefined) charSvg.style.setProperty('--eb-r-y', `${style.right.y}px`);
                if (style.right.rot !== undefined) charSvg.style.setProperty('--eb-r-rot', `${style.right.rot}deg`);
                if (style.right.scaleY !== undefined) charSvg.style.setProperty('--eb-r-scale-y', style.right.scaleY);
            }
            if (style.opacity !== undefined) {
                charSvg.style.setProperty('--eb-opacity', style.opacity);
            } else {
                charSvg.style.setProperty('--eb-opacity', '1');
            }
        }
    },

    setState(state) {
        this.currentState = state;
        const charSvg = document.getElementById('assistant-character');
        if (!charSvg) return;

        charSvg.classList.remove('state-listening', 'state-thinking', 'state-speaking', 'state-error', 'state-dont_understand');
        charSvg.classList.add(`state-${state}`);

        // Conditional eyebrows: strictly hidden when neutral (listening) or speaking
        if (state === 'listening' || state === 'speaking') {
            this.setEyebrows('none');
        } else if (state === 'dont_understand') {
            this.setEyebrows('confused'); // Quizzical, curious
        } else if (state === 'thinking') {
            this.setEyebrows('thinking'); // Concentrating
        } else if (state === 'error') {
            this.setEyebrows('frowning'); // Apologetic / sad that mic is unavailable, NOT angry!
        }

        const MOUTH_PRESETS = {
            listening: [3.75, 12.5, 5.8, 13.8, 7.8, 15, 10, 15, 12.2, 15, 14.2, 13.8, 16.25, 12.5],
            speaking: [10, 10.4, 13.5, 10.4, 13.5, 15.6, 10, 15.6, 6.5, 15.6, 6.5, 10.4, 10, 10.4], // Morphs smile into circle when talking!
            thinking: [10, 10.4, 13.5, 10.4, 13.5, 15.6, 10, 15.6, 6.5, 15.6, 6.5, 10.4, 10, 10.4], // Circle!
            dont_understand: [4.5, 14.5, 6.8, 13.6, 8.2, 13.2, 10, 13.2, 11.8, 13.2, 13.2, 13.6, 15.5, 14.5], // Gentle curious pout
            error: [4.5, 14.8, 6.8, 13.8, 8.2, 13.2, 10, 13.2, 11.8, 13.2, 13.2, 13.8, 15.5, 14.8] // Soft apologetic pout
        };

        const targetCoords = MOUTH_PRESETS[state] || MOUTH_PRESETS.listening;
        this._morphMouth(targetCoords);
    },

    setTranscript(text) {
        const transcriptEl = document.getElementById('assistant-transcript');
        if (!transcriptEl) return;

        const statusPhrases = [
            "listening",
            "error",
            "understand",
            "catch that",
            "unavailable",
            "type a command",
            "suggestion"
        ];
        const lower = (text || '').toLowerCase().trim();
        const isStatusPhrase = statusPhrases.some(p => lower.includes(p));

        if (!text || isStatusPhrase) {
            transcriptEl.textContent = '';
            transcriptEl.classList.remove('show');
            return;
        }

        transcriptEl.style.transform = 'translateY(6px)';
        transcriptEl.style.opacity = '0';
        transcriptEl.classList.add('show');
        setTimeout(() => {
            transcriptEl.textContent = text;
            transcriptEl.style.transform = 'translateY(0)';
            transcriptEl.style.opacity = '1';
        }, 60);
    },

    clearTranscript() {
        const transcriptEl = document.getElementById('assistant-transcript');
        if (transcriptEl) {
            transcriptEl.textContent = '';
            transcriptEl.classList.remove('show');
        }
    },

    setText(text) {
        if (!text) {
            this.clearTranscript();
            return;
        }
        const lower = text.toLowerCase();
        if (lower.includes("listening")) {
            this.setState('listening');
            this.clearTranscript();
        } else if (lower.includes("error") || lower.includes("unavailable")) {
            this.setState('error');
            this.clearTranscript();
        } else if (lower.includes("catch that") || lower.includes("understand")) {
            this.setState('dont_understand');
            this.clearTranscript();
        } else if (lower.includes("opening") || lower.includes("activating") || lower.includes("going to sleep") || lower.includes("checking") || lower.includes("executing") || lower.includes("controlling")) {
            this.setState('speaking');
            this.setTranscript(text);
        } else {
            this.setTranscript(text);
        }
    },

    setLoading() {
        this.setState('thinking');
        this.clearTranscript();
    },

    setDecisions(title, items) {
        const panel = document.getElementById('assistant-decision-panel');
        const header = panel?.querySelector('.assistant-decision-header');
        const container = document.getElementById('assistant-cards-container');
        if (!panel || !header || !container) return;

        header.innerHTML = title;
        container.innerHTML = '';

        (items || []).forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'assistant-card';
            card.style.background = item.background;

            const num = document.createElement('div');
            num.className = 'assistant-card-number';
            num.innerText = (index + 1).toString();

            const titleEl = document.createElement('div');
            titleEl.className = 'assistant-card-title';
            titleEl.innerText = item.label;

            card.appendChild(num);
            card.appendChild(titleEl);

            card.onclick = (e) => {
                e.stopPropagation();
                if (window.Assistant) window.Assistant.executeDecision(index);
            };

            container.appendChild(card);
        });

        panel.classList.add('show');
    },

    clearDecisions() {
        const panel = document.getElementById('assistant-decision-panel');
        if (panel) panel.classList.remove('show');
    },

    setMicActive(isActive) {
        const btn = document.getElementById('assistant-mic-btn');
        if (btn) {
            if (isActive) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    },

    // Shims for legacy compatibility
    setStatus(text) {
        if (text && text.includes('Error')) {
            this.setState('error');
        }
    },
    setResponse(text) {
        this.setTranscript(text);
    }
};

if (typeof window !== 'undefined') {
    window.AssistantUI = AssistantUI;
}