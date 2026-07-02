export const AssistantUI = {
    show() {
        const overlay = document.getElementById('assistant-overlay');
        if (overlay) overlay.classList.add('show');
    },
    hide() {
        const overlay = document.getElementById('assistant-overlay');
        if (overlay) overlay.classList.remove('show');
        this.clearDecisions();
    },
    setText(text) {
        const el = document.getElementById('assistant-main-text');
        if (el) {
            el.style.transform = 'translateY(10px)';
            el.style.opacity = '0';
            setTimeout(() => {
                el.innerHTML = text;
                el.style.transform = 'translateY(0)';
                el.style.opacity = '1';
            }, 200);
        }
    },
    setLoading() {
        this.setText(`
            <svg class="loading-spinner" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 72px; height: 72px;">
                <rect width="100%" height="100%" fill="currentColor" stroke="none" class="loading-spinner-ind" />
            </svg>
        `);
    },
    setDecisions(title, items) {
        const panel = document.getElementById('assistant-decision-panel');
        const header = panel?.querySelector('.assistant-decision-header');
        const container = document.getElementById('assistant-cards-container');
        if (!panel || !header || !container) return;

        header.innerHTML = title;
        container.innerHTML = '';

        items.forEach((item, index) => {
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

            card.onclick = () => {
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
    setStatus(text) {
        if (text && text.includes('Error')) {
            this.setText(text);
        }
    },
    setTranscript(text) {},
    setResponse(text) { this.setText(text); }
};
window.AssistantUI = AssistantUI;