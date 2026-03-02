// --- Keyboard Navigation Manager (Switch Access) ---
const KeyboardNavigationManager = {
    enabled: false,
    focusedIndex: -1,
    interactiveElements: [],
    lastDirection: 'forward',
    
    init() {
        this.enabled = localStorage.getItem('keyboardNavEnabled') === 'true';
        document.addEventListener('keydown', (e) => this.handleKey(e));
    },
    
    scan() {
        // 1. Find everything that looks clickable
        const all = document.querySelectorAll('*');
        this.interactiveElements = [];
        
        // Filter visible elements
        const isVisible = (el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   style.opacity !== '0' &&
                   el.offsetParent !== null;
        };

        for (let el of all) {
            if (!isVisible(el)) continue;

            const tag = el.tagName;
            const style = window.getComputedStyle(el);
            const role = el.getAttribute('role');
            
            // Criteria for interactivity
            const isClickable = 
                style.cursor === 'pointer' || 
                tag === 'BUTTON' || 
                tag === 'INPUT' || 
                tag === 'SELECT' || 
                tag === 'A' || 
                tag === 'TEXTAREA' ||
                tag === 'IFRAME' || // Allow focusing frames to pass control?
                role === 'button' ||
                el.onclick != null;

            // Exclude specific containers that shouldn't be focused directly
            const isExcluded = el.id === 'dynamic-area' || el.classList.contains('widget-grid');

            if (isClickable && !isExcluded) {
                this.interactiveElements.push(el);
            }
        }
    },
    
    handleKey(e) {
        if (!this.enabled) return;
        
        if (e.key === 'Tab') {
            e.preventDefault(); // Stop native browser navigation
            e.stopPropagation();

            if (this.interactiveElements.length === 0) this.scan();
            
            // Re-scan if focused element is gone
            if (this.focusedIndex >= 0 && !document.body.contains(this.interactiveElements[this.focusedIndex])) {
                this.scan();
                this.focusedIndex = -1;
            }
			
            if (e.shiftKey) {
                this.lastDirection = 'backward';
                this.focusedIndex--;
                if (this.focusedIndex < 0) this.focusedIndex = this.interactiveElements.length - 1;
            } else {
                this.lastDirection = 'forward';
                this.focusedIndex++;
                if (this.focusedIndex >= this.interactiveElements.length) this.focusedIndex = 0;
            }
            
            this.updateFocus();
        }
        
        if (e.key === 'Enter' || e.key === ' ') {
            if (this.focusedIndex >= 0 && this.interactiveElements[this.focusedIndex]) {
                e.preventDefault();
                e.stopPropagation();
                
                const el = this.interactiveElements[this.focusedIndex];
                
                // Visual feedback
                el.style.transform = 'scale(0.95)';
                setTimeout(() => el.style.transform = '', 100);
                
                el.click();
                if (el.tagName === 'INPUT') el.focus();
            }
        }
    },

    resumeFromChild(childFrame, direction) {
        this.scan();
        // Find index of the child frame
        const index = this.interactiveElements.indexOf(childFrame);
        if (index === -1) {
            this.focusedIndex = 0;
        } else {
            if (direction === 'forward') {
                this.focusedIndex = index + 1;
                if (this.focusedIndex >= this.interactiveElements.length) this.focusedIndex = 0;
            } else {
                this.focusedIndex = index - 1;
                if (this.focusedIndex < 0) this.focusedIndex = this.interactiveElements.length - 1;
            }
        }
        this.updateFocus();
    },
    
    updateFocus() {
        // Remove old focus
        document.querySelectorAll('.a11y-focused').forEach(el => el.classList.remove('a11y-focused'));
        
        // Apply new focus
        if (this.focusedIndex >= 0 && this.interactiveElements[this.focusedIndex]) {
            const el = this.interactiveElements[this.focusedIndex];
            
            // SPECIAL HANDLING FOR IFRAMES
            if (el.tagName === 'IFRAME') {
                // We need to send the message.
                // To avoid immediate exit, we don't 'focus' the iframe element itself visibly.
                // We hand off control.
                
                const targetOrigin = getOriginFromUrl(el.src);
                el.contentWindow.postMessage({ 
                    type: 'switch-control-enter', 
                    direction: this.lastDirection // Pass the tracked direction
                }, targetOrigin);
                
                // Deselect in parent so we don't have a double-focus ring
                this.focusedIndex = -1; 
                el.focus(); // Give browser focus to iframe so it catches keydowns
                return;
            }

            el.classList.add('a11y-focused');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            SoundManager.play('select');
        }
    }
};

KeyboardNavigationManager.init();

// --- Color Filter Logic ---
function applyColorFilter() {
    const mode = localStorage.getItem('colorFilter') || 'none';
    let overlay = document.getElementById('a11y-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'a11y-overlay';
        document.body.appendChild(overlay);
    }

    overlay.style.display = 'block';
    
    let filterVal = '';
    switch (mode) {
        case 'grayscale': filterVal = 'grayscale(1)'; break;
        case 'invert': filterVal = 'invert(1) hue-rotate(180deg)'; break;
        case 'protanopia': filterVal = 'url("#a11y-protanopia")'; break;
        case 'deuteranopia': filterVal = 'url("#a11y-deuteranopia")'; break;
        case 'tritanopia': filterVal = 'url("#a11y-tritanopia")'; break;
    }
    
    overlay.style.backdropFilter = filterVal;
    overlay.style.webkitBackdropFilter = filterVal;
}

// Inject SVG Filters for Color Blindness
document.addEventListener('DOMContentLoaded', () => {
    const svgFilters = `
    <svg style="display: none">
        <defs>
            <filter id="a11y-protanopia">
                <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0" />
            </filter>
            <filter id="a11y-deuteranopia">
                <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0" />
            </filter>
            <filter id="a11y-tritanopia">
                <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0" />
            </filter>
        </defs>
    </svg>`;
    document.body.insertAdjacentHTML('beforeend', svgFilters);
    applyColorFilter();
});

let cursorIdleTimeout;

/**
 * Hides the cursor by adding a class to the body and broadcasting the state.
 */
function hideCursor() {
    document.body.classList.add('cursor-hidden');
    broadcastCursorState(false);
}
/**
 * Shows the cursor, removes the hiding class, broadcasts the state,
 * and resets the inactivity timer. This is called on mouse movement.
 */
function showCursorAndResetTimer() {
    clearTimeout(cursorIdleTimeout); // Clear any existing timer
    resetAutoSleepTimer(); // Also reset the auto-sleep timer on any activity

    // If the cursor was hidden, make it visible again
    if (document.body.classList.contains('cursor-hidden')) {
        document.body.classList.remove('cursor-hidden');
        broadcastCursorState(true);
    }

    // Set a new timer to hide the cursor after 10 seconds of inactivity
    cursorIdleTimeout = setTimeout(hideCursor, 10000);
}