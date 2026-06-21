// Debug Overlay System
function toggleDebugOverlay() {
    const enabled = localStorage.getItem('debugOverlayEnabled') === 'true';
    let overlay = document.getElementById('system-debug-overlay');
    
    if (!enabled) {
        if (overlay) overlay.remove();
        return;
    }
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'system-debug-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; padding: 0;
            background: rgba(0, 255, 0, 0.5); color: red; font-family: monospace;
            font-size: 6px; z-index: 100000; pointer-events: none;
            line-height: 1;
        `;
        document.body.appendChild(overlay);
    }
    
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 60;
    
    const update = () => {
        if (!document.getElementById('system-debug-overlay')) return;
        
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            fps = Math.round((frameCount * 1000) / (now - lastTime));
            frameCount = 0;
            lastTime = now;
            
            const activeAppsCount = Object.keys(minimizedEmbeds).length + (window.currentActiveAppUrl ? 1 : 0);
            overlay.innerHTML = `
                DebugOverlay<br>
                FPS: ${fps}<br>
                AppsOpen: ${activeAppsCount}<br>
                Theme: ${document.body.classList.contains('light-theme') ? 'Light' : 'Dark'}<br>
                EcoTier: ${window.currentEcoTier || 0}
            `;
        }
        requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

// Initialize on boot
document.addEventListener('DOMContentLoaded', () => {
    toggleDebugOverlay();
});