let originalConsoleLog = console.log;
let originalConsoleWarn = console.warn;
let originalConsoleError = console.error;

function setupDeveloperConsole() {
    const enabled = localStorage.getItem('developerConsoleEnabled') === 'true';
    let container = document.getElementById('system-debug-console');
    
    if (!enabled) {
        if (container) {
            container.remove();
            console.log = originalConsoleLog;
            console.warn = originalConsoleWarn;
            console.error = originalConsoleError;
        }
        return;
    }
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'system-debug-console';
        container.style.cssText = `
            position: fixed; bottom: 0; right: 0; padding: 0; width: 200px; max-height: 50px;
            background: rgba(0,0,255,0.5); color: yellow; font-family: monospace;
            font-size: 6px; z-index: 100000; overflow-y: auto; pointer-events: auto;
            line-height: 1;
        `;
        document.body.appendChild(container);
    }
    
    const logToScreen = (type, msg) => {
        const consoleEl = document.getElementById('system-debug-console');
        if (!consoleEl) return;
        const line = document.createElement('div');
        line.innerHTML = `[${type}] ${msg}`;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    };

    console.log = function(...args) {
        originalConsoleLog.apply(console, args);
        logToScreen('LOG', args.join(' '));
    };
    console.warn = function(...args) {
        originalConsoleWarn.apply(console, args);
        logToScreen('WRN', args.join(' '));
    };
    console.error = function(...args) {
        originalConsoleError.apply(console, args);
        logToScreen('ERR', args.join(' '));
    };
}

window.updateDevConsoleVisibility = setupDeveloperConsole;

document.addEventListener('DOMContentLoaded', () => {
    setupDeveloperConsole();
});