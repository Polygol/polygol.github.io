// --- Color Tinting Logic ---
let tintEnabled = localStorage.getItem('tintEnabled') === 'true';
window.currentTintVariables = null; // Store calculated vars for new apps

// Helper to parse CSS color strings (rgb, rgba, hex) into {r,g,b,a}
function parseCssColor(str) {
    if (!str) return null;
    str = str.trim();
    
    // Create a temporary element to let the browser normalize the color
    const div = document.createElement('div');
    div.style.color = str;
    document.body.appendChild(div);
    const computed = getComputedStyle(div).color;
    document.body.removeChild(div);
    
    // Computed is always rgb() or rgba()
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] !== undefined ? parseFloat(match[4]) : 1
        };
    }
    return null;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function mixColors(base, tint, weight) {
    if (!base || !tint) return base;
    const r = Math.round(base.r * (1 - weight) + tint.r * weight);
    const g = Math.round(base.g * (1 - weight) + tint.g * weight);
    const b = Math.round(base.b * (1 - weight) + tint.b * weight);
    return { r, g, b, a: base.a }; // Preserve base alpha
}

function applySystemTint() {
    const root = document.documentElement;
    const wallpaperColors = window.activeWallpaperColor; // Now expects { primary, secondary }

    // Normalize input
    let primaryTint = null;
    let backgroundTint = null;

    if (wallpaperColors) {
        if (wallpaperColors.primary) {
            primaryTint = wallpaperColors.primary;
            backgroundTint = wallpaperColors.secondary || primaryTint;
        } else if (Array.isArray(wallpaperColors)) {
            primaryTint = { r: wallpaperColors[0], g: wallpaperColors[1], b: wallpaperColors[2] };
            backgroundTint = primaryTint;
        } else {
             primaryTint = wallpaperColors;
             backgroundTint = wallpaperColors;
        }
    }

    // Check if transparency is off to apply stronger tints
    const isTransOff = localStorage.getItem('glassEffectsMode') === 'off';

    // Define variables to tint and their intensity weights
	let tintWeights = {
	    '--background-color-dark': { w: 0.2, type: 'bg' },
	    '--background-color-dark-tr': { w: 0.2, type: 'bg' },
	    '--modal-background-dark': { w: 0.2, type: 'bg' },
	    '--modal-transparent-dark': { w: 0.2, type: 'bg' },
	    '--search-background-dark': { w: 0.2, type: 'bg' },
	    '--dark-overlay': { w: 0.4, type: 'bg' },
	    '--dark-transparent': { w: 0.2, type: 'bg' },
	    '--glass-border-dark': { w: 0.2, type: 'primary' },
	    '--text-color-dark': { w: 0.1, type: 'primary' },
	    '--secondary-text-color-dark': { w: 0.1, type: 'primary' },
	    '--accent-dark': { w: 0.6, type: 'primary' },
	    '--tonal-dark': { w: 0.6, type: 'bg' },
	
	    '--background-color-light': { w: 0.2, type: 'bg' },
	    '--background-color-light-tr': { w: 0.2, type: 'bg' },
	    '--modal-background-light': { w: 0.2, type: 'bg' },
	    '--modal-transparent-light': { w: 0.2, type: 'bg' },
	    '--search-background-light': { w: 0.2, type: 'bg' },
	    '--light-overlay': { w: 0.4, type: 'bg' },
	    '--light-transparent': { w: 0.2, type: 'bg' },
	    '--glass-border-light': { w: 0.2, type: 'primary' },
	    '--text-color-light': { w: 0.1, type: 'primary' },
	    '--secondary-text-color-light': { w: 0.1, type: 'primary' },
	    '--accent-light': { w: 0.6, type: 'primary' },
	    '--tonal-light': { w: 0.6, type: 'bg' },

	    '--background-color-dark-highcontrast': { w: 0.2, type: 'bg' },
	    '--background-color-dark-tr-highcontrast': { w: 0.2, type: 'bg' },
	    '--modal-background-dark-highcontrast': { w: 0.2, type: 'bg' },
	    '--modal-transparent-dark-highcontrast': { w: 0.2, type: 'bg' },
	    '--search-background-dark-highcontrast': { w: 0.4, type: 'bg' },
	    '--dark-overlay-highcontrast': { w: 0.8, type: 'bg' },
	    '--text-color-dark-highcontrast': { w: 0.3, type: 'primary' },
	    '--secondary-text-color-dark-highcontrast': { w: 0.3, type: 'primary' },
	    '--accent-dark-highcontrast': { w: 0.6, type: 'primary' },
	    '--tonal-dark-highcontrast': { w: 0.6, type: 'bg' },
	
	    '--background-color-light-highcontrast': { w: 0.2, type: 'bg' },
	    '--background-color-light-tr-highcontrast': { w: 0.2, type: 'bg' },
	    '--modal-background-light-highcontrast': { w: 0.2, type: 'bg' },
	    '--modal-transparent-light-highcontrast': { w: 0.2, type: 'bg' },
	    '--search-background-light-highcontrast': { w: 0.4, type: 'bg' },
	    '--light-overlay-highcontrast': { w: 0.8, type: 'bg' },
	    '--text-color-light-highcontrast': { w: 0.3, type: 'primary' },
	    '--secondary-text-color-light-highcontrast': { w: 0.3, type: 'primary' },
	    '--accent-light-highcontrast': { w: 0.6, type: 'primary' },
	    '--tonal-light-highcontrast': { w: 0.6, type: 'bg' }
	};

    if (isTransOff) {
        tintWeights = {
            ...tintWeights,
            '--background-color-dark': { w: 0.35, type: 'bg' },
            '--background-color-dark-tr': { w: 0.2, type: 'bg' },
            '--modal-background-dark': { w: 0.35, type: 'bg' },
            '--modal-transparent-dark': { w: 0.35, type: 'bg' },
            '--search-background-dark': { w: 0.35, type: 'bg' },
            '--dark-overlay': { w: 0.5, type: 'bg' },
            '--dark-transparent': { w: 0.3, type: 'bg' },
            '--glass-border-dark': { w: 0.3, type: 'primary' },
            
            '--background-color-light': { w: 0.35, type: 'bg' },
            '--background-color-light-tr': { w: 0.2, type: 'bg' },
            '--modal-background-light': { w: 0.35, type: 'bg' },
            '--modal-transparent-light': { w: 0.35, type: 'bg' },
            '--search-background-light': { w: 0.35, type: 'bg' },
            '--light-overlay': { w: 0.5, type: 'bg' },
            '--light-transparent': { w: 0.3, type: 'bg' },
            '--glass-border-light': { w: 0.3, type: 'primary' }
        };
    }

    Object.keys(tintWeights).forEach(key => root.style.removeProperty(key));

    if (!tintEnabled || !primaryTint) {
        window.currentTintVariables = null;
        broadcastThemeVariables(null); 
        return;
    }

    const newVars = {};
    const computedStyle = getComputedStyle(root);

    // 2. Mix Colors
    Object.entries(tintWeights).forEach(([key, config]) => {
        const cssValue = computedStyle.getPropertyValue(key);
        const baseColor = parseCssColor(cssValue);
        
        if (baseColor) {
            // Select Primary or Secondary/Background tint based on config
            const tint = config.type === 'bg' ? backgroundTint : primaryTint;
            
            const mixed = mixColors(baseColor, tint, config.w);
            const val = `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, ${mixed.a})`;
            newVars[key] = val;
        }
    });

    // 3. Apply
    Object.entries(newVars).forEach(([key, val]) => root.style.setProperty(key, val));
    
    // 4. Update global state and broadcast
    window.currentTintVariables = newVars;
    broadcastThemeVariables(newVars);
}

function broadcastThemeVariables(variables) {
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'themeVariablesUpdate',
                variables: variables
            }, targetOrigin);
        }
    });
}

// Theme switching functionality
function setupThemeSwitcher() {
    // Check and set initial theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', currentTheme === 'light');
}

function getGlassFilterValue(mode) {
    switch (mode) {
        case 'focused': return 'grayscale(0)';
        case 'frosted': return 'blur(17.5px)';
        case 'off': return 'none'; // Will effectively disable backdrop-filter due to CSS syntax rules or explicit override
        case 'on': 
        default: return "url('#edge-refraction-only')";
    }
}

function applyGlassEffects() {
    // 1. Get Mode (Migration Logic)
    let mode = localStorage.getItem('glassEffectsMode');
    if (!mode) {
        // Migrate old boolean setting
        const oldSetting = localStorage.getItem('glassEffectsEnabled');
        if (oldSetting === 'false') mode = 'frosted'; // Old behavior for disabled was frosted
        else mode = 'on';
        localStorage.setItem('glassEffectsMode', mode);
        localStorage.removeItem('glassEffectsEnabled');
    }

    const root = document.documentElement;
    const filterValue = getGlassFilterValue(mode);

    // 2. Apply to Host
    root.style.setProperty('--edge-refraction-filter', filterValue);
    root.classList.toggle('trans-off', mode === 'off');

    // 3. Broadcast to Gurapps
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'glassEffectsUpdate',
                value: filterValue, // Send the raw CSS value
                mode: mode
            }, targetOrigin);
        }
    });
}