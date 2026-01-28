/**
 * !! DOCUMENTATION: https://kirbindustries.gitbook.io/polygol/developers/developer-materials/gurapp-api !!
 *
 * Gurasuraisu API for Gurapps
 * This helper script allows an iframe (Gurapp) to safely communicate
 * with the parent Gurasuraisu (Polygol) window and use its core functions.
 */

const isInsideGurasuraisu = window.self !== window.top;
let _mediaControlActions = {};
let _actionRequestHandlers = {};
const _dialogCallbacks = {}; // For handling dialog responses
let _dialogRequestId = 0;   // For tracking dialog requests
const _myActiveActivities = new Set(); // Tracks this app's active activities

// Gurasuraisu Font and Cursor Injection
// This block runs as soon as the script is loaded by the Gurapp.
(function() {
    const style = document.createElement('style');
    let css = `
        /* Inject Font Faces */
        
        /* Inter */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');

        /* Material Symbols */
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0');  
        
        /* Roboto */
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap');
        
        /* Bricolage Grotesque */
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');
        
        /* DynaPuff */
        @import url('https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&display=swap');
        
        /* Domine */
        @import url('https://fonts.googleapis.com/css2?family=Domine:wght@400..700&display=swap');
        
        /* Climate Crisis */
        @import url('https://fonts.googleapis.com/css2?family=Climate+Crisis&display=swap');
        
        /* JetBrains Mono */
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap');
        
        /* DotGothic16 (400) */
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
        
        /* Playpen Sans */
        @import url('https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@100..800&display=swap');
        
        /* Jaro */
        @import url('https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&display=swap');
        
        /* Doto */
        @import url('https://fonts.googleapis.com/css2?family=Doto:wght@400;700&display=swap'); 
        
        /* Nunito */
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200..900&display=swap');

        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 400;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Regular.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 500;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Medium.woff2') format('woff2');
        }
        
        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 700;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Semibold.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 800;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Bold.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Inter Numeric';
          src: url('/assets/fonts/InterNumeric.ttf') format('truetype-variations');
          font-weight: 100 900; /* Define the supported variable weight range */
          font-style: normal;
        }
    
        * {
          -webkit-tap-highlight-color: transparent;
        }
        
        *::-webkit-scrollbar {
            width: 8px; /* Thin scrollbar */
        }
        
        *::-webkit-scrollbar-track {
            background: transparent;
        }
        
        *::-webkit-scrollbar-thumb {
        	background-color: var(--search-background);
        	border-radius: 50px;
        }

        /* Set Font Faces */

        h1, h2, h3, h4, h5, h6 {
        	font-family: 'Open Runde', sans-serif;
        }

        .material-symbols-rounded {
            font-variation-settings:
                'FILL' 1,
                'wght' 700,
                'GRAD' 0,
                'opsz' 24;
            vertical-align: middle;
        }

        :root {
            --edge-refraction-filter: url('#edge-refraction-only');
            --sun-shadow: 0 0 0 0 transparent;
            
            /* Dark Theme (Default) Variables */
            --background-mono-dark: #1c1c1c;
            --background-pure-dark: #000000;
            --background-color-dark: #1c1c1c;
            --background-color-dark-tr: rgba(28, 28, 28, 0.7);
            --text-color-dark: #f9f9f9;
            --secondary-text-color-dark: rgba(255, 255, 255, 0.7);
            --accent-dark: rgba(255, 255, 255, 0.7);
            --tonal-dark: rgba(255, 255, 255, 0.7);
            --modal-background-dark: rgba(51, 51, 51, 0.8);
            --modal-transparent-dark: rgba(51, 51, 51, 0.7);
            --search-background-dark: rgba(51, 51, 51, 0.5);
            --dark-overlay: rgba(51, 51, 51, 0.2);
            --dark-transparent: rgba(255, 255, 255, 0.1); 
            --glass-border-dark: rgba(100, 100, 100, 0.2);
            
            /* Light Theme Variables */
            --background-mono-light: #f0f0f0;
            --background-pure-light: #ffffff;
            --background-color-light: #f0f0f0;
        	--background-color-light-tr: rgba(240, 240, 240, 0.7);
            --text-color-light: #333333;
            --secondary-text-color-light: rgba(0, 0, 0, 0.7);
            --accent-light: rgba(0, 0, 0, 0.7);
            --tonal-light: rgba(0, 0, 0, 0.7);
            --modal-background-light: rgba(220, 220, 220, 0.8);
            --modal-transparent-light: rgba(240, 240, 240, 0.7);
            --search-background-light: rgba(220, 220, 220, 0.5);
            --light-overlay: rgba(220, 220, 220, 0.2);
            --light-transparent: rgba(255, 255, 255, 0.1); 
            --glass-border-light: rgba(200, 200, 200, 0.2);
            
            /* High Contrast Dark Theme Variables */
            --background-color-dark-highcontrast: #1c1c1c;
            --background-color-dark-tr-highcontrast: #1c1c1c;
            --text-color-dark-highcontrast: #f9f9f9;
            --secondary-text-color-dark-highcontrast: #b3b3b3;
            --accent-dark-highcontrast: #b3b3b3;
            --tonal-dark-highcontrast: #b3b3b3;
            --modal-background-dark-highcontrast: #333333;
            --modal-transparent-dark-highcontrast: #333333;
            --search-background-dark-highcontrast: #333333;
            --dark-overlay-highcontrast: #1c1c1c;
            --dark-transparent-highcontrast: #000000;
            
            /* High Contrast Light Theme Variables */
            --background-color-light-highcontrast: #f0f0f0;
            --background-color-light-tr-highcontrast: #f0f0f0;
            --text-color-light-highcontrast: #333333;
            --secondary-text-color-light-highcontrast: #4d4d4d;
            --accent-light-highcontrast: #4d4d4d;
            --tonal-light-highcontrast: #4d4d4d;
            --modal-background-light-highcontrast: #dcdcdc;
            --modal-transparent-light-highcontrast: #f0f0f0;
            --search-background-light-highcontrast: #dcdcdc;
            --light-overlay-highcontrast: #f0f0f0;
            --light-transparent-highcontrast: #ffffff;
            
            /* Base Variables */
            --base-font-size: clamp(16px, 2vw + 1rem, 24px);
            
            /* Default to Dark Theme */
            --background-mono: var(--background-mono-dark);
            --background-pure: var(--background-pure-dark);
            --background-color: var(--background-color-dark);
            --background-color-tr: var(--background-color-dark-tr);
            --background-color-tr-op: var(--background-color-light-tr);
            --text-color: var(--text-color-dark);
            --secondary-text-color: var(--secondary-text-color-dark);
            --accent: var(--accent-dark);
            --tonal: var(--tonal-dark);
            --modal-background: var(--modal-background-dark);
            --modal-transparent: var(--modal-transparent-dark);
            --search-background: var(--search-background-dark);
            --search-background-op: var(--search-background-light);
            --overlay-color: var(--dark-overlay);
            --overlay-color-op: var(--light-overlay);
            --transparent-color: var(--dark-transparent);
            --glass-border: var(--glass-border-dark);
        }
        
        body.light-theme {
            --background-mono: var(--background-mono-light);
            --background-pure: var(--background-pure-light);
            --background-color: var(--background-color-light);
            --background-color-tr: var(--background-color-light-tr);
            --background-color-tr-op: var(--background-color-dark-tr);
            --text-color: var(--text-color-light);
            --secondary-text-color: var(--secondary-text-color-light);
            --accent: var(--accent-light);
            --tonal: var(--tonal-light);
            --modal-background: var(--modal-background-light);
            --modal-transparent: var(--modal-transparent-light);
            --search-background: var(--search-background-light);
            --search-background-op: var(--search-background-dark);
            --overlay-color: var(--light-overlay);
            --overlay-color-op: var(--dark-overlay);
            --transparent-color: var(--light-transparent);
            --glass-border: var(--glass-border-light);
        	--polygol-cursor-visible: var(--polygol-cursor-light);
        }
        
        /* For dark theme (default) with high contrast */
        html.gurasuraisu-high-contrast body:not(.light-theme) {
            --background-mono: var(--background-mono-dark);
            --background-pure: var(--background-pure-dark);
            --background-color-tr: var(--background-color-dark-tr-highcontrast);
            --background-color-tr-op: var(--background-color-light-tr-highcontrast);
            --secondary-text-color: var(--secondary-text-color-dark-highcontrast);
            --accent: var(--accent-dark-highcontrast);
            --tonal: var(--tonal-dark-highcontrast);
            --modal-background: var(--modal-background-dark-highcontrast);
            --modal-transparent: var(--modal-transparent-dark-highcontrast);
            --search-background: var(--search-background-dark-highcontrast);
            --search-background-op: var(--search-background-light-highcontrast);
            --overlay-color: var(--dark-overlay-highcontrast);
            --overlay-color-op: var(--light-overlay-highcontrast);
            --transparent-color: var(--dark-transparent-highcontrast);
            --glass-border: var(--accent-dark-highcontrast);
        }
        
        /* For light theme with high contrast */
        html.gurasuraisu-high-contrast body.light-theme {
            --background-mono: var(--background-mono-light);
            --background-pure: var(--background-pure-light);
            --background-color-tr: var(--background-color-light-tr-highcontrast);
            --background-color-tr-op: var(--background-color-dark-tr-highcontrast);
            --secondary-text-color: var(--secondary-text-color-light-highcontrast);
            --accent: var(--accent-light-highcontrast);
            --tonal: var(--tonal-light-highcontrast);
            --modal-background: var(--modal-background-light-highcontrast);
            --modal-transparent: var(--modal-transparent-light-highcontrast);
            --search-background: var(--search-background-light-highcontrast);
        	--search-background-op: var(--search-background-dark-highcontrast);
            --overlay-color: var(--light-overlay-highcontrast);
            --overlay-color-op: var(--dark-overlay-highcontrast);
            --transparent-color: var(--light-transparent-highcontrast);
            --glass-border: var(--accent-light-highcontrast);
        }

        /* Universal backdrop-filter removal for high contrast */
        html.gurasuraisu-high-contrast * {
            backdrop-filter: none !important;
        }

        html.gurasuraisu-glass-disabled {
            --edge-refraction-filter: blur(17.5px); /* Frosted glass appearance */
        }

        :root.standalone {
            --background-color-dark-tr: var(--background-color-dark);
            --background-color-light-tr: var(--background-color-light);
            --edge-refraction-filter: blur(17.5px); /* Frosted glass appearance */
        }

        /* When animations are disabled */
        .reduce-animations * {
            /* Disable all animations */
            animation: none !important;
        
            /* Disable all transitions except opacity */
            transition: opacity 0.3s ease !important;
            transition-property: opacity !important;
        }
        
        /* Special handling for clickable elements */
        .reduce-animations [onclick],
        .reduce-animations button,
        .reduce-animations a,
        .reduce-animations input[type="button"],
        .reduce-animations input[type="submit"],
        .reduce-animations .clickable {
            /* Keep initial state but remove transition */
            transform: scale(1) !important;
            transition: opacity 0.3s ease !important;
        }
        
        /* Keep active state functional but without animation */
        .reduce-animations [onclick]:active,
        .reduce-animations button:active,
        .reduce-animations a:active,
        .reduce-animations input[type="button"]:active,
        .reduce-animations input[type="submit"]:active,
        .reduce-animations .clickable:active {
            /* Apply scale instantly without transition */
            transform: scale(1.1) !important;
            transition: none !important;
        }
        
        /* For all clickable elements */
        [onclick], 
        button, 
        a, 
        input[type="button"], 
        input[type="submit"],
        .clickable {
        	cursor: pointer;
        	transform: scale(1);
        	transition: transform 0.3s cubic-bezier(.2, 1.3, .64, 1), filter 0.3s cubic-bezier(.2, 1.3, .64, 1);
        }
        
        /* Active effect (when clicking down) */
        [onclick]:active, 
        button:active, 
        a:active, 
        input[type="button"]:active, 
        input[type="submit"]:active,
        .clickable:active {
        	transform: scale(1.1);
        	filter: brightness(1.5);
        	transition: transform 0.3s cubic-bezier(.2, 1.3, .64, 1), filter 0.3s cubic-bezier(.2, 1.3, .64, 1);
        }

        input[type="color"] {
            -webkit-appearance: none;
            appearance: none;
            border: 1px solid var(--glass-border);
            width: 30px;
            height: 30px;
            padding: 0;
            background: none;
            border-radius: 999px;
            cursor: pointer;
            overflow: hidden;
        }
        
        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        
        input[type="color"]::-webkit-color-swatch {
          border: none;
          border-radius: 999px;
        }
        
        input[type="color"]::-moz-color-swatch {
          border: 1px solid var(--glass-border);
          border-radius: 999px;
        }
        
        input[type="checkbox"] {
            appearance: none;
            width: 56px;
            height: 32px;
            background-color: var(--search-background);
            border-radius: 16px;
            position: relative;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(.2, 1.3, .64, 1);
            border: 1px solid var(--glass-border);
            cursor: pointer;
            box-shadow: var(--sun-shadow);
        }
        
        input[type="checkbox"]::before {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            background-color: var(--accent);
            border-radius: 50%;
            top: 50%;
            left: 6.5px;
            transform: translateY(-50%);
            border: 1px solid var(--glass-border);
            box-sizing: border-box;
            box-shadow: var(--sun-shadow);
        	transition: all 0.3s cubic-bezier(.2, 1.3, .64, 1);
        }
        
        input[type="checkbox"]:checked {
            background-color: var(--accent);
        }
        
        input[type="checkbox"]:checked::before {
            background-color: var(--tonal);
            transform: translateY(-50%);
            width: 46px;
            height: 40px;
            top: 50%;
            left: 14px;
            backdrop-filter: saturate(2) blur(2.5px);
            border-radius: 36px;
        }

        input[type="range"] {
            -webkit-appearance: none;
            width: 100%;
            height: 34px;
            background: var(--search-background);
            border-radius: 20px;
            padding: 0 8px;
            border: 1px solid var(--glass-border);
            box-shadow: var(--sun-shadow);
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            outline: 1px solid var(--glass-border);
            box-shadow: var(--sun-shadow);
            transition: width 0.3s, height 0.3s, transform 0.3s;
        }
        
        input[type="range"]::-webkit-slider-thumb:active {
            width: 24px;
            height: 24px;
            transform: scale(1.1);
        }
        
        input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            outline: 1px solid var(--glass-border);
            box-shadow: var(--sun-shadow);
            transition: width 0.3s, height 0.3s, transform 0.3s;
        }
        
        input[type="range"]::-moz-range-thumb:active {
            width: 24px;
            height: 24px;
            transform: scale(1.1);
        }

        select {
            background-color: var(--search-background);
            color: var(--text-color);
            padding: 8px 16px;
            border: 1px solid var(--glass-border);
            box-shadow: var(--sun-shadow);
            border-radius: 50px;
            cursor: pointer;
        }

        select option {
            background-color: var(--background-color);
            color: var(--text-color);
            transition: background-color 0.2s, transform 0.1s;
        }

        .toolbar {
            display: flex;
            justify-content: center;
            align-content: center;
            flex-direction: row;
            gap: 14px;
            padding: 15px 20px;
            background-color: transparent;
            border: none;
            position: fixed;
            top: 0px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            transition: top 0.3s ease;
            width: 100%;
            flex-wrap: wrap;
            height: 80px;
        }

        .toolbar.hidden {
            display: none;
        }

        .toolbar::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: -1;
        }

        .toolbar::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            backdrop-filter: blur(2.5px);
            mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 100%);
            -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 100%);
        }

        .tab-btn {
            background-color: var(--search-background);
            color: transparent;
            border-radius: 50%;
            padding: 14px 14px;
            font-size: 0;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(.2, 1.3, .64, 1) ! IMPORTANT;
            display: flex;
            align-items: center;
            backdrop-filter: var(--edge-refraction-filter) saturate(2) blur(2.5px);
            box-shadow: var(--sun-shadow);
            border: 1px solid var(--glass-border);
        }

        .tab-btn.active {
            background-color: var(--accent);
            color: var(--background-color);
            border-radius: 35px;
            corner-shape: superellipse(1.5);
            font-family: 'Open Runde';
            font-weight: 500;
            padding: 14px 22px 14px 18px;
            font-size: revert;
            gap: 12px;
        }

        .toolbar .tab-btn .material-symbols-rounded {
            transition: color 0.3s;
            color: var(--text-color);
            font-size: 20px;
        }

        .toolbar .tab-btn.active .material-symbols-rounded {
            color: var(--background-color) !important;
        }

        @media (max-width: 800px) {
            .toolbar {
                justify-content: flex-start;
            }

            .tab-btn {
                font-size: 0;
                gap: 0 !important;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
        
            .tab-btn.active {
                font-size: 12px;
                padding: 5px 14px;
            }

            .toolbar .tab-btn.active .material-symbols-rounded {
                font-size: 18px !important;
            }
        }

        @media (max-width: 500px) {
            .toolbar {
                justify-content: flex-start;
                gap: 10px;
            }

            .tab-btn {
                font-size: 0;
                gap: 0 !important;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 10px;
            }
        
            .tab-btn.active {
                font-size: 0;
                padding: 10px;
            }

            .toolbar .tab-btn.active .material-symbols-rounded {
                font-size: 20px !important;
            }
        }
    `;
    
    // Conditionally add Gurasuraisu-specific styles.
    if (isInsideGurasuraisu) {
        css += `
            html, body {
                overscroll-behavior: none !important; /* Prevent swipe-to-back navigation */
            }

            /* Disable native focus for all elements to prevent browser interference */
            :focus {
            	outline: none !important;
            }
        
            .a11y-focused {
                outline: 4px solid var(--accent) !important;
                outline-offset: -4px !important;
                z-index: 999999 !important;
                transition: outline 0.1s !important;
            }
        `;
    }

    style.textContent = css;
    document.head.appendChild(style);

    // Disable Ctrl+Wheel (Browser Zoom) inside Gurapps
    if (isInsideGurasuraisu) {
        window.addEventListener('wheel', function(e) {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevent pinch-zoom gestures from scaling the page
        window.addEventListener('touchmove', function(e) {
            if (e.scale !== 1 && e.scale !== undefined) {
                e.preventDefault();
            }
        }, { passive: false });

        // Block navigation keyboard shortcuts inside app
        window.addEventListener('keydown', (e) => {
            const isNavigationKey = 
                (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
                (e.metaKey && (e.key === '[' || e.key === ']'));
            
            if (isNavigationKey) {
                e.preventDefault();
            }
        }, { capture: true });

        // Forward Global Shortcuts to System
        let isTabKeyDown = false;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') isTabKeyDown = true;
            
            if (e.code === 'Space') {
                 if (isTabKeyDown) {
                     // Tab + Space: App Switcher
                     e.preventDefault();
                     Gurasuraisu._call('performSystemShortcut', ['appSwitcher']);
                 } else if (e.shiftKey) {
                     // Shift + Space: Home / Drawer
                     e.preventDefault();
                     Gurasuraisu._call('performSystemShortcut', ['home']);
                 }
            }
            
            // E (after Shift+Space sequence)
            if (e.key.toLowerCase() === 'e') {
                // We send this speculatively; the parent decides if it's valid based on timer
                Gurasuraisu._call('performSystemShortcut', ['actionE']);
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Tab') isTabKeyDown = false;
        });
    }

    // --- Switch Control (Keyboard Navigation) ---
    const KeyboardNavigationManager = {
        enabled: false,
        focusedIndex: -1,
        interactiveElements: [],
        
        init() {
            // Sync initial state
            // Listen for keydown
            window.addEventListener('keydown', (e) => this.handleKey(e));
        },
        
        setEnabled(state) {
            this.enabled = state === 'true' || state === true;
        },

        scan() {
            const all = document.querySelectorAll('*');
            this.interactiveElements = [];
            
            const isVisible = (el) => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0';
            };

            for (let el of all) {
                if (!isVisible(el)) continue;

                const tag = el.tagName;
                const style = window.getComputedStyle(el);
                const role = el.getAttribute('role');
                
                const isClickable = 
                    style.cursor === 'pointer' || 
                    tag === 'BUTTON' || 
                    tag === 'INPUT' || 
                    tag === 'SELECT' || 
                    tag === 'A' || 
                    tag === 'TEXTAREA' ||
                    role === 'button' ||
                    el.onclick != null;

                if (isClickable) {
                    this.interactiveElements.push(el);
                }
            }
        },

        handleKey(e) {
            if (!this.enabled) return;

            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();

                // Scan if empty or invalid
                if (this.interactiveElements.length === 0 || 
                    (this.focusedIndex >= 0 && !document.body.contains(this.interactiveElements[this.focusedIndex]))) {
                    this.scan();
                }
                
                // If still empty, exit immediately
                if (this.interactiveElements.length === 0) {
                     Gurasuraisu._call('switchControlExit', [e.shiftKey ? 'backward' : 'forward']);
                     return;
                }

                if (e.shiftKey) {
                    this.focusedIndex--;
                    if (this.focusedIndex < 0) {
                        // Exit Backward
                        this.focusedIndex = -1;
                        this.updateFocus();
                        Gurasuraisu._call('switchControlExit', ['backward']);
                        return;
                    }
                } else {
                    this.focusedIndex++;
                    if (this.focusedIndex >= this.interactiveElements.length) {
                        // Exit Forward
                        this.focusedIndex = -1;
                        this.updateFocus();
                        Gurasuraisu._call('switchControlExit', ['forward']);
                        return;
                    }
                }
                
                this.updateFocus();
            }

            if (e.key === 'Enter' || e.key === ' ') {
                if (this.focusedIndex >= 0 && this.interactiveElements[this.focusedIndex]) {
                    e.preventDefault();
                    e.stopPropagation();
                    const el = this.interactiveElements[this.focusedIndex];
                    el.click();
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.focus();
                }
            }
        },

        updateFocus() {
            document.querySelectorAll('.a11y-focused').forEach(el => el.classList.remove('a11y-focused'));
            
            if (this.focusedIndex >= 0 && this.interactiveElements[this.focusedIndex]) {
                const el = this.interactiveElements[this.focusedIndex];
                el.classList.add('a11y-focused');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        startNavigation(direction) {
            this.enabled = true; // Ensure enabled when handed off
            this.scan();
            if (this.interactiveElements.length === 0) {
                // If nothing to focus, bounce back
                Gurasuraisu._call('switchControlExit', [direction]);
                return;
            }

            if (direction === 'forward') {
                this.focusedIndex = 0;
            } else {
                this.focusedIndex = this.interactiveElements.length - 1;
            }
            this.updateFocus();
            // Ensure window has focus so key events register
            window.focus();
        }
    };
    
    if (isInsideGurasuraisu) {
        KeyboardNavigationManager.init();
    }

    // Inject SVG Filter for glass effects, overriding if one already exists
    document.addEventListener('DOMContentLoaded', () => {
        const existingFilterSvg = document.querySelector('svg > filter#edge-refraction-only');
        if (existingFilterSvg) {
            const parentSvg = existingFilterSvg.closest('svg');
            if (parentSvg) parentSvg.remove();
        }

        const svgFilterHtml = `
            <svg style="display: none">
                <filter id="edge-refraction-only" color-interpolation-filters="linearRGB" color-rendering="optimizeSpeed">
                    <feComposite operator="out"></feComposite>
                    <feComposite result="distMap"></feComposite>
                    <feDisplacementMap in="SourceGraphic" scale="15" result="pass1"></feDisplacementMap>
                    <feDisplacementMap in="SourceGraphic" scale="-15" in2="distMap"></feDisplacementMap>
                    <feBlend mode="darken" result="blended_image" in="pass1"></feBlend>
                    <feComponentTransfer in="blended_image">
                        <feFuncA slope="0.9" type="linear"></feFuncA>
                    </feComponentTransfer>
                </filter>
            </svg>
        `;
        document.body.insertAdjacentHTML('afterbegin', svgFilterHtml);
    });
})();

// Native JS solutions for when the app is running outside of Polygol
const _fallbacks = {
    showPopup: function(message) {
        // A simple, non-blocking "toast" notification fallback
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background-color: #333; color: white; padding: 10px 20px; border-radius: 20px;
            z-index: 9999; transition: opacity 0.5s; font-family: sans-serif;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },
    showConfirm: function(message) {
        return window.confirm(message);
    },
    showPrompt: function(message, defaultValue) {
        return window.prompt(message, defaultValue);
    },
    // For functions that have no standalone equivalent, we can just log a warning.
    default: function(functionName) {
        console.warn(`Gurasuraisu API: '${functionName}' is only available inside the Polygol environment.`);
    }
};

// Internal State for Sound
let _autoSoundEnabled = true; // App dev override
let _systemSoundsAllowed = true; // User preference from System
let _isSilentMode = false; // Track system Silent Mode
 
const Gurasuraisu = {
  /**
   * Internal helper to send a structured message to the parent window.
   * @param {string} functionName - The name of the Gurasuraisu function to call.
   * @param {Array} args - An array of arguments to pass to the function.
   */
  _call: function(functionName, args = []) {
    if (isInsideGurasuraisu) {
      window.parent.postMessage({
        action: 'callGurasuraisuFunc',
        functionName: functionName,
        args: args
      }, '*');
    } else {
      // Use the fallback if it exists, otherwise use the default fallback
      const fallback = _fallbacks[functionName] || (() => _fallbacks.default(functionName));
      fallback.apply(this, args);
    }
  },

  // --- Public API Functions ---

  /**
   * Shows a temporary popup message at the bottom of the screen.
   * @param {string} message - The text to display in the popup.
   */
  showPopup: function(message) {
    this._call('showPopup', [message]);
  },

  /**
   * Shows a more advanced notification on-screen and in the notification shade.
   * @param {string} message - The text to display.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.icon] - Material Symbols icon name (e.g., 'error', 'check_circle', 'info').
   * @param {string} [options.heading] - Optional heading text to display above the message.
   * @param {string} [options.buttonText] - Optional button text. If provided, a button will be shown.
   * @param {function} [options.buttonAction] - Function to call when button is clicked (only works in parent context, not from iframe).
   * @param {object} [options.gurappAction] - Action to send to a Gurapp when button is clicked. Format: { appName, functionName, args }.
   * @param {boolean} [options.system] - Set to true for system notifications (hides app icon/title).
   */
  showNotification: function(message, options = {}) {
    // Note: 'buttonAction' functions cannot be passed from the iframe.
    // The parent window handles all actions.
    this._call('showNotification', [message, options]);
  },

    /**
     * Plays a system UI sound.
     * @param {string} type - 'select', 'toggle', 'check', 'error', 'success', 'open', 'close', 'type'
     */
    playSound: function(type) {
        if (_systemSoundsAllowed) {
            this._call('playUiSound', [type]);
        }
    },

    /**
     * Configures the automatic UI sound detection for this Gurapp.
     * Use this to disable automatic click sounds if you want to handle them manually.
     * @param {object} config
     * @param {boolean} config.auto - Set to false to disable auto-click detection.
     */
    configureSounds: function(config) {
        if (config && typeof config.auto === 'boolean') {
            _autoSoundEnabled = config.auto;
        }
    },

    /**
     * Sets the UI on the connected Waves remote (Second Screen).
     * @param {Array} components - Array of widget definitions.
     * Example: [{ type: 'button', id: 'btn1', label: 'Next Slide', icon: 'skip_next' }]
     */
    setRemoteUI: function(components) {
        this._call('setRemoteUI', [components]);
    },

    /**
     * Sends a partial update for specific components on the remote UI.
     * @param {object} updates - Key-value pairs where Key is the component ID and Value is the new value.
     */
    sendRemoteUpdate: function(updates) {
        this._call('sendRemoteUpdate', [updates]);
    },

    /**
     * Listen for actions triggered from the Waves remote.
     * @param {function} callback - Function to handle the event (id, value).
     */
    onRemoteAction: function(callback) {
        window.addEventListener('message', (event) => {
            if (event.source !== window.parent) return;
            if (event.data.type === 'remote-action') {
                callback(event.data.id, event.data.value);
            }
        });
    },

    /**
     * Listen for a request to refresh/send the remote UI.
     * Triggered when the app is launched via Mini Apps but is already running.
     * @param {function} callback - Function to execute (usually calling setRemoteUI).
     */
    onRequestRemoteUI: function(callback) {
        window.addEventListener('message', (event) => {
            if (event.source !== window.parent) return;
            if (event.data.type === 'requestRemoteUI') {
                callback();
            }
        });
    },

  /**
   * Requests a file upload from the user. 
   * In Polygol, this triggers both the local file picker and a request to the Waves Remote.
   * @param {object} options
   * @param {string} options.accept - MIME types (e.g., 'image/*', '.png').
   * @param {boolean} options.multiple - Allow multiple files.
   * @returns {Promise<File[]>} - Resolves with an array of File objects.
   */
  requestFile: function(options = {}) {
      const { accept = '*/*', multiple = false } = options;
      
      return new Promise((resolve, reject) => {
          if (!isInsideGurasuraisu) {
              // Standalone Fallback: Create temporary input
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = accept;
              input.multiple = multiple;
              input.style.display = 'none';
              
              input.onchange = (e) => {
                  if (e.target.files.length > 0) {
                      resolve(Array.from(e.target.files));
                  } else {
                      // User cancelled (hard to detect reliably, but we leave promise pending or handle via focus hack if needed)
                  }
                  input.remove();
              };
              document.body.appendChild(input);
              input.click();
          } else {
              // Polygol Mode: Request from Parent
              const requestId = `file_req_${++_dialogRequestId}`;
              _dialogCallbacks[requestId] = (filesData) => {
                  // Reconstruct File objects from data sent by parent
                  // filesData = [{ name, type, data (base64/blob), size }]
                  if (!filesData) return;
                  
                  const files = filesData.map(f => {
                      // Convert Base64 to Blob if necessary, or use existing blob
                      // Parent should send Blob/File if possible, but postMessage clones it.
                      if (f instanceof File) return f;
                      
                      // If data is base64 string
                      if (typeof f.data === 'string') {
                          const arr = f.data.split(',');
                          const bstr = atob(arr[1] || arr[0]);
                          let n = bstr.length;
                          const u8arr = new Uint8Array(n);
                          while (n--) u8arr[n] = bstr.charCodeAt(n);
                          return new File([u8arr], f.name, { type: f.type });
                      }
                      return null;
                  }).filter(f => f !== null);
                  
                  resolve(files);
              };
              
              this._call('requestFileUpload', [{ accept, multiple, requestId }]);
          }
      });
  },

  /**
   * Namespace for Live Activity functions.
   */
  liveActivity: {
    /**
     * Starts a Live Activity.
     * @param {object} options - Configuration object.
     * @param {string} options.activityId - A unique ID for this activity within your app.
     * @param {string} options.url - The URL of the HTML page for the activity's iframe.
     * @param {boolean} [options.homescreen=false] - Set to true if this activity should appear on the homescreen.
     * @param {string} [options.height='120px'] - The desired height of the activity in the notification shade.
     */
    start: function(options) {
      if (options && options.activityId) {
        _myActiveActivities.add(options.activityId); // Add to local tracker
      }
      const appName = document.body.dataset.appName || 'UnknownApp';
      Gurasuraisu._call('startLiveActivity', [appName, options]);
    },

    /**
     * Checks if a live activity with the given ID is currently active for this app.
     * @param {string} activityId - The unique ID of the activity.
     * @returns {boolean} - True if the activity is active, false otherwise.
     */
    isActive: function(activityId) {
      return _myActiveActivities.has(activityId);
    },

    /**
     * Pushes updated data to a running Live Activity.
     * The parent OS will forward this data to the correct iframe.
     * @param {string} activityId - The unique ID of the activity.
     * @param {object} data - The data payload to send (e.g., { timeLeft: 120 }).
     */
    update: function(activityId, data) {
      Gurasuraisu._call('updateLiveActivity', [activityId, data]);
    },

    /**
     * Stops a running Live Activity.
     * @param {string} activityId - The unique ID of the activity you want to stop.
     */
    stop: function(activityId) {
      if (activityId) {
        _myActiveActivities.delete(activityId); // Remove from local tracker
      }
      Gurasuraisu._call('stopLiveActivity', [activityId]);
    },
    
    /**
     * (For use inside a Live Activity iframe) Pushes updated summary data to the parent homescreen.
     * @param {object} data - The data to display.
     * @param {string} data.icon - The Material Symbols icon name.
     * @param {string} data.text - The text to display.
     */
    pushHomescreenUpdate: function(data) {
        if (isInsideGurasuraisu) {
            window.parent.postMessage({
                type: 'live-activity-homescreen-update',
                icon: data.icon,
                text: data.text
            }, '*');
        }
    }
  },

  /**
   * Requests the parent window to minimize the current Gurapp.
   */
  minimize: function() {
    this._call('minimizeFullscreenEmbed');
  },

  /**
   * Requests the parent to open another Gurapp.
   * @param {string} url - The URL of the Gurapp to open (e.g., "/chronos/index.html").
   */
  openApp: function(url) {
    this._call('createFullscreenEmbed', [url]);
  },

  /**
   * Turns the screen black for power-saving or privacy.
   */
  blackout: function() {
    this._call('blackoutScreen');
  },

  /**
   * Closes the current application (Fullscreen Embed).
   */
  close: function() {
    this._call('closeFullscreenEmbed');
  },

  /**
   * Checks if the system is currently in Silent Mode.
   * @returns {boolean}
   */
  isSilent: function() {
    return _isSilentMode;
  },

  /**
   * Uses the System TTS engine to speak text.
   * Bypasses browser autoplay policy.
   * @param {string} text - The text to speak.
   */
  speak: function(text) {
    this._call('speakText', [text]);
  },
 
   /**
   * Asks the parent Gurasuraisu to send back the list of currently installed apps.
   * The parent will respond with a 'installed-apps-list' message.
   */
  requestInstalledApps: function() {
   this._call('requestInstalledApps', []);
  },
   
  /**
  * Requests the parent Gurasuraisu to install a new Gurapp.
  * @param {object} appObject - The complete app object with id, url, iconUrl, etc.
  */
  installApp: function(appObject) {
    this._call('installApp', [appObject]);
  },

  deleteApp: function(appObject) {
    this._call('deleteApp', [appObject]);
  },

  /**
   * Requests the parent Gurasuraisu to install a new App-Link.
   * @param {object} appLinkObject - The app-link object with name, url, iconUrl, etc.
   */
  installAppLink: function(appLinkObject) {
    this._call('installAppLink', [appLinkObject]);
  },

  /**
   * Registers a widget with the Polygol dashboard.
   * Apps should call this for each widget they provide.
   * @param {object} widgetData - An object describing the widget.
   * @param {string} widgetData.appName - The name of the app providing the widget.
   * @param {string} widgetData.widgetId - A unique ID for the widget (e.g., 'weather-current').
   * @param {string} widgetData.title - A user-friendly title (e.g., 'Current Weather').
   * @param {string} widgetData.url - The URL of the widget's content.
   * @param {Array<number>} widgetData.defaultSize - The default [width, height] in grid units (e.g., [1, 1]).
   * @param {string} [widgetData.openUrl] - Optional. The URL to open when the widget is tapped. Defaults to the app's main URL.
   */
  registerWidget: function(widgetData) {
    if (!widgetData || !widgetData.appName || !widgetData.widgetId || !widgetData.url || !widgetData.title) {
      console.error('[Gurasuraisu API] registerWidget requires appName, widgetId, url, and title.');
        return;
    }
    this._call('registerWidget', [widgetData]);
  },
    
  /**
   * Registers a new media session with the parent.
   * This will show the media widget in the Gurasu UI.
   * @param {object} metadata - An object with { title, artist, artwork: [{src}] }.
   * @param {string[]} [supportedActions] - An array of supported actions, e.g., ['playPause', 'next', 'prev'].
   */
  registerMediaSession: function(metadata, supportedActions = ['playPause']) {
    const appName = document.body.dataset.appName || 'UnknownApp';
    // Pass the new 'supportedActions' array to the parent
    this._call('registerMediaSession', [appName, metadata, supportedActions]);
  },

  /**
   * Updates the parent Gurasu with the current playback state.
   * @param {object} state - An object, e.g., { playbackState: 'playing' | 'paused', metadata: (optional) }.
   */
  updatePlaybackState: function(state) {
    const appName = document.body.dataset.appName || 'UnknownApp';
    this._call('updateMediaPlaybackState', [appName, state]);
  },

  /**
   * Tells the parent to clear/hide the media widget.
   */
  clearMediaSession: function() {
    const appName = document.body.dataset.appName || 'UnknownApp';
    this._call('clearMediaSession', [appName]);
  },

  updateMediaProgress: function(progressState) {
    const appName = document.body.dataset.appName || 'UnknownApp';
    this._call('updateMediaProgress', [appName, progressState]);
  },

  /**
   * Sets up listeners for media control actions sent FROM the parent.
   * @param {object} actions - An object with functions, e.g., { playPause: () => {...}, next: () => {...} }
   */
  onMediaControl: function(actions) {
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
        if (event.data.type === 'media-control' && actions[event.data.action]) {
          actions[event.data.action]();
        }
    });
  },
      
  // --- NEW IndexedDB Functions ---
  listIDBDatabases: function() { this._call('listIDBDatabases'); },
  listIDBStores: function(dbName) { this._call('listIDBStores', [dbName]); },
  getIDBRecord: function(dbName, storeName, key) { this._call('getIDBRecord', [dbName, storeName, key]); },
  setIDBRecord: function(dbName, storeName, jsonData) { this._call('setIDBRecord', [dbName, storeName, jsonData]); },
  removeIDBRecord: function(dbName, storeName, key) { this._call('removeIDBRecord', [dbName, storeName, key]); },
  clearIDBStore: function(dbName, storeName) { this._call('clearIDBStore', [dbName, storeName]); },

  getLocalStorageItem: function(key) {
    this._call('getLocalStorageItem', [key]);
  },
  setLocalStorageItem: function(key, value) {
    this._call('setLocalStorageItem', [key, value]);
  },

  /**
   * Asks the parent Polygol to change a specific setting value.
   * This is the correct way for the settings app to apply changes.
   * @param {string} key - The localStorage key of the setting.
   * @param {string} value - The new value for the setting.
   */
  setSettingValue: function(key, value) {
    this._call('setLocalStorageItem', [key, value]);
  },

  /**
   * Asks the parent Polygol to check for a new service worker version
   * and trigger the update flow.
   */
  forceUpdate: function() {
    this._call('forceUpdatePolygol', []);
  },

  /**
   * Asks the parent to trigger a file download.
   * @param {string} filename - The desired name of the file.
   * @param {string} dataUrl - The content of the file as a data URL.
   */
  downloadFile: function(filename, dataUrl) {
    this._call('downloadFile', [filename, dataUrl]);
  },

  showAlert: function(message, title = 'Alert') {
      this._call('showDialog', [{ type: 'alert', message, title }]);
  },

  showConfirm: function(message, title = 'Confirm') {
      return new Promise((resolve) => {
          if (!isInsideGurasuraisu) {
              return resolve(window.confirm(message));
          }
          const requestId = `confirm_${++_dialogRequestId}`;
          _dialogCallbacks[requestId] = resolve;
          this._call('showDialog', [{ type: 'confirm', message, title, requestId }]);
      });
  },

  showPrompt: function(message, title = 'Prompt', defaultValue = '') {
      return new Promise((resolve) => {
          if (!isInsideGurasuraisu) {
              return resolve(window.prompt(message, defaultValue));
          }
          const requestId = `prompt_${++_dialogRequestId}`;
          _dialogCallbacks[requestId] = resolve;
          this._call('showDialog', [{ type: 'prompt', message, title, defaultValue, requestId }]);
      });
  }
};

// --- Event Listener for Messages FROM Gurasuraisu ---

/**
 * Listens for messages from the parent window, such as theme
 * or animation setting changes, and applies them to the Gurapp.
 */
window.addEventListener('message', async (event) => {
  if (event.source !== window.parent) {
    return;
  }

  const data = event.data;
  if (data && data.type) {
    switch (data.type) {
      case 'themeUpdate':
        document.body.classList.toggle('light-theme', data.theme === 'light');
        // Update Filter
        const feBlend = document.querySelector('#edge-refraction-only feBlend');
        if (feBlend) {
            feBlend.setAttribute('mode', data.theme === 'light' ? 'lighten' : 'darken');
        }
        break;
      case 'themeVariablesUpdate':
        if (data.variables) {
            // Apply overrides
            Object.entries(data.variables).forEach(([key, val]) => {
                document.documentElement.style.setProperty(key, val);
            });
        } else {
            // Reset to defaults (remove overrides)
            const varsToRemove = [
                '--background-color-dark', '--background-color-dark-tr',
                '--modal-background-dark', '--modal-transparent-dark',
                '--search-background-dark', '--dark-overlay', '--dark-transparent', '--glass-border-dark',
                '--text-color-dark', '--secondary-text-color-dark', '--accent-dark', '--tonal-dark',
                
                '--background-color-light', '--background-color-light-tr',
                '--modal-background-light', '--modal-transparent-light',
                '--search-background-light', '--light-overlay', '--light-transparent', '--glass-border-light',
                '--text-color-light', '--secondary-text-color-light', '--accent-light', '--tonal-light',

                '--background-color-dark-highcontrast', '--background-color-dark-tr-highcontrast',
                '--modal-background-dark-highcontrast', '--modal-transparent-dark-highcontrast',
                '--search-background-dark-highcontrast', '--dark-overlay-highcontrast', '--dark-transparent-highcontrast',
                '--text-color-dark-highcontrast', '--secondary-text-color-dark-highcontrast', '--accent-dark-highcontrast', '--tonal-dark-highcontrast',
                
                '--background-color-light-highcontrast', '--background-color-light-tr-highcontrast',
                '--modal-background-light-highcontrast', '--modal-transparent-light-highcontrast',
                '--search-background-light-highcontrast', '--light-overlay-highcontrast', '--light-transparent-highcontrast',
                '--text-color-light-highcontrast', '--secondary-text-color-light-highcontrast', '--accent-light-highcontrast', '--tonal-light-highcontrast'
            ];
            varsToRemove.forEach(v => document.documentElement.style.removeProperty(v));
        }
        break;
      case 'animationsUpdate':
        document.body.classList.toggle('reduce-animations', !data.enabled);
        break;
      case 'contrastUpdate':
        document.documentElement.classList.toggle('gurasuraisu-high-contrast', data.enabled);
        break;
      case 'sunUpdate':
        document.documentElement.style.setProperty('--sun-shadow', data.shadow);
        document.documentElement.style.setProperty('--sun-shadow-strong', data.shadowStrong);
        break;
      case 'glassEffectsUpdate':
        // data.value contains the CSS string (e.g. "blur(17.5px)")
        if (data.value) {
            document.documentElement.style.setProperty('--edge-refraction-filter', data.value);
        }
        break;
      case 'settingUpdate':
        if (data.key === 'gurappSoundsEnabled') {
          _systemSoundsAllowed = (data.value === 'true');
        }
        if (data.key === 'silentMode') {
            _isSilentMode = (data.value === 'true');
        }
        if (data.key === 'keyboardNavEnabled') {
            KeyboardNavigationManager.setEnabled(data.value);
        }
        break;
      case 'switch-control-enter':
          KeyboardNavigationManager.startNavigation(data.direction);
          break;
      case 'dialog-response':
        if (data.requestId && _dialogCallbacks[data.requestId]) {
            _dialogCallbacks[data.requestId](data.value);
            delete _dialogCallbacks[data.requestId];
        }
        break;
            
      // --- Handles screenshot requests from the parent ---
      case 'request-screenshot':
        // Helper function to perform the capture
        const doCapture = async () => {
            // Save current shadow state to prevent html2canvas artifacts
            const root = document.documentElement;
            const originalShadow = root.style.getPropertyValue('--sun-shadow');
            const originalShadowStrong = root.style.getPropertyValue('--sun-shadow-strong');
            
            // Temporarily hide shadows
            root.style.setProperty('--sun-shadow', 'none');
            root.style.setProperty('--sun-shadow-strong', 'none');

            try {
                // Determine theme-based background color
                // Gurapps sync the 'light-theme' class from the parent
                const isLight = document.body.classList.contains('light-theme');
                const bgColor = isLight ? '#ffffff' : '#000000';

                // Generate the screenshot of the app's content
                const canvas = await html2canvas(document.body, { 
                    useCORS: true, 
                    logging: false,
                    backgroundColor: bgColor // Explicitly set background
                });
                const screenshotDataUrl = canvas.toDataURL('image/jpeg', 0.5);

                // Send the generated screenshot data back to the parent
                window.parent.postMessage({
                    type: 'screenshot-response',
                    screenshotDataUrl: screenshotDataUrl
                }, '*');
            } catch (e) {
                console.error("Gurapp screenshot failed:", e);
            } finally {
                // Restore shadows
                if (originalShadow) root.style.setProperty('--sun-shadow', originalShadow);
                if (originalShadowStrong) root.style.setProperty('--sun-shadow-strong', originalShadowStrong);
            }
        };

        // Check if html2canvas is loaded
        if (typeof html2canvas !== 'function') {
            // Inject it dynamically
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = doCapture;
            script.onerror = () => console.error("Failed to load html2canvas for Gurapp");
            document.head.appendChild(script);
        } else {
            doCapture();
        }
        break;
    }
  }
});

/**
 * On initial load, apply settings that might have been set by Gurasuraisu
 * in localStorage for a seamless appearance.
 */
document.addEventListener('DOMContentLoaded', () => {
  // NEW: Automatically request persistent storage for the Gurapp
  if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
          if (granted) {
              console.log("[Gurapp API] Persistent storage automatically granted.");
          } else {
              console.log("[Gurapp API] Persistent storage not granted (Browser may manage eviction).");
          }
      }).catch(e => console.warn("[Gurapp API] Storage persistence request failed:", e));
  }
    
  // Apply the 'standalone' class to the <html> element if not in Gurasuraisu
  if (!isInsideGurasuraisu) {
      document.documentElement.classList.add('standalone');

      // Standalone: Polygol Advertisement/Promotional Modal
      // Developers, please do not try to bypass this!
      try {
          const hidePromo = localStorage.getItem('gurappapi_polygol_ad_openenviroment_hide_user') === 'true';
          if (!hidePromo) {
              const promoHtml = `
                  <div id="polygol-promo-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2147483647; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); font-family: 'Inter', sans-serif;">
                      <div style="background: var(--modal-background); border: 1px solid var(--glass-border); padding: 30px; border-radius: 50px; corner-shape: superellipse(1.5); max-width: 380px; width: 90%; text-align: center; box-shadow: var(--sun-shadow), 0 20px 50px rgba(0,0,0,0.3); backdrop-filter: var(--edge-refraction-only) saturate(2) blur(5px);">
                          <img src="https://polygol.github.io/assets/img/regular-expressive-onload.webp" style="width: 72px; height: 72px; margin-bottom: 20px;">
                          <h2 style="margin: 0 0 10px 0; font-size: 1.6rem; color: var(--text-color); font-family: 'Open Runde', sans-serif; font-weight: 600;">Open in Polygol</h2>
                          <p style="margin: 0 0 25px 0; color: var(--secondary-text-color); font-size: 0.95rem; line-height: 1.5;">
                              This app is part of the Polygol ecosystem. Experience the full environment, with smart AI across your apps, multitasking tools and extensive customization options.
                          </p>
                          <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 25px;">
                              <button id="polygol-promo-close" class="clickable" style="background: transparent; border: 1px solid var(--glass-border); padding: 12px 24px; border-radius: 50px; color: var(--text-color); cursor: pointer; font-size: 14px; font-weight: 500;">Close</button>
                              <a href="https://polygol.github.io" target="_blank" class="clickable" style="display: inline-block; background: var(--text-color); color: var(--background-color); border: none; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; cursor: pointer; font-size: 14px;">Open Polygol</a>
                          </div>
                          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; color: var(--secondary-text-color);">
                              <label for="polygol-promo-dontshow" style="cursor: pointer;">Don't show again</label>
                              <input type="checkbox" id="polygol-promo-dontshow"> 
                          </div>
                      </div>
                  </div>
              `;
              document.body.insertAdjacentHTML('beforeend', promoHtml);

              document.getElementById('polygol-promo-close').addEventListener('click', () => {
                  if (document.getElementById('polygol-promo-dontshow').checked) {
                      localStorage.setItem('gurappapi_polygol_ad_openenviroment_hide_user', 'true');
                  }
                  document.getElementById('polygol-promo-overlay').remove();
              });
          }
      } catch (e) {
          console.error("Please do not block Gurasuraisu API promotions! Failed to show Polygol promo:", e);
      }
  }

  try {
    // --- Theme Logic ---
    if (!isInsideGurasuraisu) {
        // Standalone: Priority System Preference with Live Switching
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const updateTheme = (e) => {
            const isLight = e.matches;
            document.body.classList.toggle('light-theme', isLight);
        };
        
        // Apply immediately and listen for changes
        updateTheme(mediaQuery);
        mediaQuery.addEventListener('change', updateTheme);
    } else {
        // Polygol: Use LocalStorage or Default
        let theme = localStorage.getItem('theme');
        if (theme === null) theme = 'dark';
        document.body.classList.toggle('light-theme', theme === 'light');
    }

    // --- Animation Logic ---
    let animValue = localStorage.getItem('animationsEnabled');
    let animationsEnabled = true;
    if (!isInsideGurasuraisu && animValue === null) {
        // Standalone Default: System Preference (prefers-reduced-motion)
        animationsEnabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } else {
        animationsEnabled = animValue !== 'false'; // Default true if null in Polygol
    }
    document.body.classList.toggle('reduce-animations', !animationsEnabled);

    // --- High Contrast Logic ---
    let contrastValue = localStorage.getItem('highContrast');
    let highContrastEnabled = false;
    if (!isInsideGurasuraisu && contrastValue === null) {
        // Standalone Default: System Preference
        highContrastEnabled = window.matchMedia('(prefers-contrast: more)').matches;
    } else {
        highContrastEnabled = contrastValue === 'true';
    }

    // FIX: Target the <html> element for the initial high contrast check
    document.documentElement.classList.toggle('gurasuraisu-high-contrast', highContrastEnabled);
      
    // We use setTimeout to ensure the SVG injection (which happens in another listener) has completed
    setTimeout(() => {
        const feBlend = document.querySelector('#edge-refraction-only feBlend');
        if (feBlend) {
            const isLight = document.body.classList.contains('light-theme');
            feBlend.setAttribute('mode', isLight ? 'lighten' : 'darken');
        }
    }, 0);
  } catch (e) {
    console.error("Gurapp: Could not access localStorage. Settings may not apply.", e);
  }

  // Handle initial silent mode state if sent via localStorage dump
  window.addEventListener('message', (event) => {
      if (event.data.type === 'localStorageItemValue' && event.data.key === 'silentMode') {
          _isSilentMode = (event.data.value === 'true');
      }
  });

  if (isInsideGurasuraisu) {
    let lastActivitySignal = 0;
    const throttleInterval = 500; // Throttle messages to the parent

    const handleLocalActivity = () => {
        // Step 2: Notify the parent to reset the global hide timer (throttled).
        const now = Date.now();
        if (now - lastActivitySignal > throttleInterval) {
            window.parent.postMessage({ action: 'userActivity' }, '*');
            lastActivitySignal = now;
        }
    };
    
    // Listen for any user activity within this iframe.
    window.addEventListener('mousemove', handleLocalActivity);
    window.addEventListener('click', handleLocalActivity);
    window.addEventListener('keydown', handleLocalActivity);

    function getLocalSoundContext(element) {
        if (!element) return null;
        const tag = element.tagName;
        
        // Ignore Labels to prevent double sounds
        if (tag === 'LABEL') return null;

        const type = element.getAttribute('type');
        const role = element.getAttribute('role');

        if (tag === 'INPUT') {
            if (type === 'checkbox' || type === 'radio') return (role === 'switch') ? 'toggle' : 'check';
            if (type === 'range') return null;
            if (['text', 'password', 'email', 'number', 'search'].includes(type)) return 'type';
            return 'select';
        }
        if (tag === 'TEXTAREA') return 'type';
        if (tag === 'SELECT') return 'expand';
        if (tag === 'BUTTON' || tag === 'A' || role === 'button') return 'select';

        // Heuristic: Computed Pointer Cursor
        const style = window.getComputedStyle(element);
        if (style.cursor === 'pointer') return 'select';

        return null;
    }
      
    document.addEventListener('click', (e) => {
        if (!_autoSoundEnabled || !_systemSoundsAllowed) return;

        let target = e.target;
        let soundType = null;

        // Traverse up 5 levels to find interactive parent (e.g. span inside button)
        for (let i = 0; i < 5; i++) {
            if (!target || target === document) break;
            
            soundType = getLocalSoundContext(target);
            if (soundType) break;
            
            target = target.parentElement;
        }

        if (soundType) {
            Gurasuraisu.playSound(soundType);
        }
    }, { capture: true });

    // Input Focus Sounds
    document.addEventListener('focus', (e) => {
         if (!_autoSoundEnabled || !_systemSoundsAllowed) return;
         const type = getLocalSoundContext(e.target);
         if (type === 'type') {
             Gurasuraisu.playSound('type');
         }
    }, { capture: true });
  }

    // --- Performance Reporting ---
    let frameCount = 0;
    let lastTime = performance.now();
    const REPORT_INTERVAL = 2000;

    function reportPerformance() {
        const now = performance.now();
        frameCount++;

        if (now - lastTime >= REPORT_INTERVAL) {
            const fps = (frameCount / (now - lastTime)) * 1000;
            
            // Send metrics to parent
            window.parent.postMessage({
                type: 'gurapp-performance-report',
                appId: document.body.dataset.appName || 'Unknown',
                fps: fps,
                memory: performance.memory ? performance.memory.usedJSHeapSize : 0
            }, '*');

            frameCount = 0;
            lastTime = now;
        }
        requestAnimationFrame(reportPerformance);
    }
    
    // Start reporting
    requestAnimationFrame(reportPerformance);

  // Announce API presence to enable full-screen mode and readiness for settings.
  if (isInsideGurasuraisu) {
    window.parent.postMessage({ type: 'gurasuraisu-api-present' }, '*');
    window.parent.postMessage({ type: 'gurapp-ready' }, '*');
  }

  // --- System Admin Listeners (Backup/Restore/Wipe) ---
  if (isInsideGurasuraisu) {
      window.addEventListener('message', async (event) => {
          if (event.source !== window.parent) return;
          const data = event.data;
  
          // Helper: Blob to Base64
          const blobToBase64 = (blob) => {
              return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
              });
          };
  
          // Helper: Base64 to Blob
          const base64ToBlob = (dataUrl) => {
              const arr = dataUrl.split(',');
              const mime = arr[0].match(/:(.*?);/)[1];
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) u8arr[n] = bstr.charCodeAt(n);
              return new Blob([u8arr], { type: mime });
          };
  
          if (data.type === 'admin-export') {
              try {
                  const exportPayload = { 
                      localStorage: { ...localStorage },
                      indexedDB: {} 
                  };
  
                  if (window.indexedDB && window.indexedDB.databases) {
                      const dbs = await window.indexedDB.databases();
                      for (const dbInfo of dbs) {
                          const dbName = dbInfo.name;
                          const db = await new Promise(r => {
                              const req = indexedDB.open(dbName);
                              req.onsuccess = () => r(req.result);
                          });
  
                          exportPayload.indexedDB[dbName] = { stores: {}, storeInfo: [] };
                          const storeNames = Array.from(db.objectStoreNames);
  
                          for (const sName of storeNames) {
                              const tx = db.transaction(sName, 'readonly');
                              const store = tx.objectStore(sName);
                              
                              // Save Schema Info
                              exportPayload.indexedDB[dbName].storeInfo.push({
                                  name: store.name,
                                  keyPath: store.keyPath,
                                  autoIncrement: store.autoIncrement,
                                  indexes: Array.from(store.indexNames).map(n => {
                                      const i = store.index(n);
                                      return { name: i.name, keyPath: i.keyPath, unique: i.unique };
                                  })
                              });
  
                              // Collect Records via Cursor
                              const records = [];
                              await new Promise(r => {
                                  store.openCursor().onsuccess = (e) => {
                                      const cursor = e.target.result;
                                      if (cursor) {
                                          records.push({ key: cursor.key, value: cursor.value });
                                          cursor.continue();
                                      } else { r(); }
                                  };
                              });
                              exportPayload.indexedDB[dbName].stores[sName] = records;
                          }
                          db.close();
                      }
                  }
  
                  window.parent.postMessage({
                      type: 'admin-export-response',
                      appUrl: window.location.href,
                      data: exportPayload
                  }, '*');
  
              } catch (e) {
                  console.error("Export failed", e);
                  window.parent.postMessage({ type: 'admin-export-response', error: e.message }, '*');
              }
          }
  
          if (data.type === 'admin-import') {
              try {
                  const { localStorage: lsData, indexedDB: idbData } = data.payload;
  
                  // 1. Restore LS
                  localStorage.clear();
                  for (const k in lsData) localStorage.setItem(k, lsData[k]);
  
                  // 2. Restore IDB
                  if (window.indexedDB && window.indexedDB.databases) {
                      const currentDbs = await window.indexedDB.databases();
                      for (const db of currentDbs) {
                          await new Promise(r => { const req = indexedDB.deleteDatabase(db.name); req.onsuccess = r; req.onerror = r; });
                      }
  
                      for (const dbName in idbData) {
                          const dbInfo = idbData[dbName];
                          const req = indexedDB.open(dbName);
                          
                          req.onupgradeneeded = (e) => {
                              const db = e.target.result;
                              dbInfo.storeInfo.forEach(s => {
                                  if (!db.objectStoreNames.contains(s.name)) {
                                      const store = db.createObjectStore(s.name, { keyPath: s.keyPath, autoIncrement: s.autoIncrement });
                                      if(s.indexes) s.indexes.forEach(idx => store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multiEntry }));
                                  }
                              });
                          };
  
                          const db = await new Promise((res, rej) => {
                              req.onsuccess = () => res(req.result);
                              req.onerror = rej;
                          });
  
                          const tx = db.transaction(Object.keys(dbInfo.stores), 'readwrite');
                          for (const storeName in dbInfo.stores) {
                              const store = tx.objectStore(storeName);
                              const records = dbInfo.stores[storeName];
                              const sInfo = dbInfo.storeInfo.find(x => x.name === storeName);
                              
                              // Optimization: Clear store first to ensure clean overwrite
                              store.clear();
  
                              for (const rec of records) {
                                  let val = rec.value;
                                  let key = rec.key;
                                  
                                  // Legacy Base64 check
                                  if (val && val._isBlob && typeof val.data === 'string') val = base64ToBlob(val.data);
  
                                  try {
                                      // CRITICAL: If store has keyPath, don't provide key param
                                      // If store uses out-of-line keys, the key is required
                                      if (sInfo && (sInfo.keyPath !== null && sInfo.keyPath !== "")) {
                                          store.put(val);
                                      } else {
                                          store.put(val, key);
                                      }
                                  } catch (err) {
                                      console.error(`Store ${storeName} put failed:`, err);
                                  }
                              }
                          }
                          await new Promise(r => { tx.oncomplete = r; tx.onerror = r; });
                          db.close();
                      }
                  }
                  window.parent.postMessage({ type: 'admin-action-complete' }, '*');
              } catch (e) {
                  console.error("Import failed", e);
                  window.parent.postMessage({ type: 'admin-action-complete', error: e.message }, '*');
              }
          }
  
          if (data.type === 'admin-wipe') {
              try {
                  localStorage.clear();
                  sessionStorage.clear();
                  if (window.indexedDB && window.indexedDB.databases) {
                      const dbs = await window.indexedDB.databases();
                      for (const db of dbs) {
                          await new Promise(r => { 
                              const req = indexedDB.deleteDatabase(db.name); 
                              req.onsuccess = r; req.onerror = r; 
                          });
                      }
                  }
                  if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for(const reg of regs) await reg.unregister();
                  }
                  window.parent.postMessage({ type: 'admin-action-complete' }, '*');
              } catch (e) {
                  window.parent.postMessage({ type: 'admin-action-complete', error: e.message }, '*');
              }
          }
      });
  }
});

// Announce that the API is ready
window.GURASURAISU_API_READY = true;
const readyEvent = new CustomEvent('GurasuraisuReady');
window.dispatchEvent(readyEvent);
