// --- Color Tinting Logic ---
let tintEnabled = localStorage.getItem('colorPalette') !== 'off';
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

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function applyHueSaturationShift(colorObj, hueShiftDeg, satMultiplierNorm) {
    if (!colorObj) return colorObj;
    let [h, s, l] = rgbToHsl(colorObj.r, colorObj.g, colorObj.b);
    
    // Apply Hue Shift
    if (hueShiftDeg !== 0) {
        let shiftNorm = hueShiftDeg / 360;
        h = (h + shiftNorm) % 1;
        if (h < 0) h += 1; // Wrap around safely
    }
    
    // Apply Saturation Multiplier
    if (satMultiplierNorm !== 1) {
        s = Math.max(0, Math.min(1, s * satMultiplierNorm));
    }
    
    const newRgb = hslToRgb(h, s, l);
    newRgb.a = colorObj.a !== undefined ? colorObj.a : 1;
    return newRgb;
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
    const wallpaperColors = window.activeWallpaperColor; 

    const paletteMode = localStorage.getItem('colorPalette') || 'wallpaper_vibrant';
    tintEnabled = (paletteMode !== 'off');

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
    
    varsToRemove.forEach(v => root.style.removeProperty(v));

    if (!tintEnabled) {
        window.currentTintVariables = null;
        broadcastThemeVariables(null); 
        return;
    }

    let primaryTint = null;
    let backgroundTint = null;

    if (paletteMode.startsWith('wallpaper') && wallpaperColors) {
        let basePrimary = null;
        let baseSecondary = null;
        let baseTertiary = null;
        if (wallpaperColors.primary) {
            basePrimary = wallpaperColors.primary;
            baseSecondary = wallpaperColors.secondary || basePrimary;
            baseTertiary = wallpaperColors.tertiary || baseSecondary;
        } else if (Array.isArray(wallpaperColors)) {
            basePrimary = { r: wallpaperColors[0], g: wallpaperColors[1], b: wallpaperColors[2] };
            baseSecondary = basePrimary;
            baseTertiary = basePrimary;
        } else {
            basePrimary = wallpaperColors;
            baseSecondary = wallpaperColors;
            baseTertiary = wallpaperColors;
        }

        if (paletteMode === 'wallpaper_vibrant') {
            primaryTint = basePrimary;
            backgroundTint = baseSecondary;
        } else if (paletteMode === 'wallpaper_tonal') {
            primaryTint = wallpaperColors.muted || basePrimary;
            backgroundTint = wallpaperColors.dark || baseSecondary;
        } else if (paletteMode === 'wallpaper_muted') {
            primaryTint = wallpaperColors.muted || basePrimary;
            backgroundTint = wallpaperColors.light || baseSecondary;
        } else if (paletteMode === 'wallpaper_pastel') {
            primaryTint = wallpaperColors.light || basePrimary;
            backgroundTint = applyHueSaturationShift(primaryTint, 0, 0.4);
        } else if (paletteMode === 'wallpaper_dark') {
            primaryTint = wallpaperColors.dark || basePrimary;
            backgroundTint = applyHueSaturationShift(primaryTint, 0, 0.6);
        } else if (paletteMode === 'wallpaper_contrasting') {
            primaryTint = basePrimary;
            backgroundTint = baseSecondary; // Since secondary is explicitly complementary
        } else if (paletteMode === 'wallpaper_triadic') {
            primaryTint = basePrimary;
            backgroundTint = baseTertiary; // Since tertiary is explicitly triadic
        } else if (paletteMode === 'wallpaper_analogous') {
            primaryTint = basePrimary;
            backgroundTint = wallpaperColors.analogous || applyHueSaturationShift(basePrimary, 30, 0.9);
        } else if (paletteMode === 'wallpaper_monochromatic') {
            let [h, s, l] = rgbToHsl(basePrimary.r, basePrimary.g, basePrimary.b);
            const rgb1 = hslToRgb(h, s * 0.9, Math.min(l + 0.1, 0.9));
            const rgb2 = hslToRgb(h, s * 0.4, Math.max(l - 0.2, 0.15));
            primaryTint = rgb1;
            backgroundTint = rgb2;
        } else if (paletteMode === 'wallpaper_retro') {
            primaryTint = applyHueSaturationShift(basePrimary, 25, 0.7);
            backgroundTint = { r: 244, g: 228, b: 204 }; 
        } else if (paletteMode === 'wallpaper_nordic') {
            primaryTint = applyHueSaturationShift(basePrimary, 200, 0.5);
            backgroundTint = { r: 46, g: 52, b: 64 }; 
        }
    } else if (paletteMode.startsWith('preset')) {
        const presets = {
            'preset_blue': { primary: { r: 10, g: 132, b: 255 }, secondary: { r: 0, g: 102, b: 204 } },
            'preset_green': { primary: { r: 48, g: 209, b: 88 }, secondary: { r: 34, g: 139, b: 34 } },
            'preset_orange': { primary: { r: 255, g: 159, b: 10 }, secondary: { r: 204, g: 102, b: 0 } },
            'preset_purple': { primary: { r: 191, g: 90, b: 242 }, secondary: { r: 128, g: 0, b: 128 } },
            'preset_red': { primary: { r: 255, g: 69, b: 58 }, secondary: { r: 139, g: 0, b: 0 } },
            'preset_teal': { primary: { r: 100, g: 210, b: 255 }, secondary: { r: 0, g: 128, b: 128 } },
            'preset_rose': { primary: { r: 255, g: 100, b: 130 }, secondary: { r: 199, g: 21, b: 133 } },
            'preset_yellow': { primary: { r: 255, g: 214, b: 10 }, secondary: { r: 218, g: 165, b: 32 } },
            'preset_slate': { primary: { r: 142, g: 142, b: 147 }, secondary: { r: 112, g: 128, b: 144 } },
            'preset_plum': { primary: { r: 94, g: 92, b: 230 }, secondary: { r: 75, g: 0, b: 130 } }
        };
        const activePreset = presets[paletteMode] || presets['preset_blue'];
        primaryTint = activePreset.primary;
        backgroundTint = activePreset.secondary;
    }

    if (!primaryTint || !backgroundTint) return;

    // --- Apply Live Hue & Saturation Adjustments ---
    const hueSlider = document.getElementById('wallpaper-hue-slider');
    const satSlider = document.getElementById('wallpaper-saturate-slider');
    const hueShift = hueSlider ? parseFloat(hueSlider.value) : 0;
    const satMult = satSlider ? (parseFloat(satSlider.value) / 100) : 1;

    if (primaryTint && (hueShift !== 0 || satMult !== 1)) {
        primaryTint = applyHueSaturationShift(primaryTint, hueShift, satMult);
    }
    if (backgroundTint && (hueShift !== 0 || satMult !== 1)) {
        backgroundTint = applyHueSaturationShift(backgroundTint, hueShift, satMult);
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
    
    if (typeof broadcastWallpaperPaletteColors === 'function') {
        broadcastWallpaperPaletteColors(wallpaperColors);
    }
}

function broadcastWallpaperPaletteColors(colors) {
    if (!colors) return;
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'wallpaperPaletteColors',
                colors: colors
            }, targetOrigin);
        }
    });
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

function applyGlassEffects() {
    let mode = localStorage.getItem('glassEffectsMode');
    if (!mode) {
        const oldSetting = localStorage.getItem('glassEffectsEnabled');
        mode = (oldSetting === 'false') ? '0' : '5';
        localStorage.setItem('glassEffectsMode', mode);
        localStorage.removeItem('glassEffectsEnabled');
    }

    const root = document.documentElement;
    const val = parseInt(mode, 10);
    const isOff = isNaN(val) ? (mode === 'off') : (val <= 0);
    const activeVal = isOff ? 0 : (isNaN(val) ? 5 : val);

    // Provide 4 distinct blur variables based on the slider value
    root.style.setProperty('--blur0', isOff ? 'none' : `blur(${(activeVal * 0.2).toFixed(1)}px)`);
    root.style.setProperty('--blur1', isOff ? 'none' : `blur(${(activeVal * 0.5).toFixed(1)}px)`);
    root.style.setProperty('--blur2', isOff ? 'none' : `blur(${(activeVal * 1.0).toFixed(1)}px)`);
    root.style.setProperty('--blur3', isOff ? 'none' : `blur(${(activeVal * 2.0).toFixed(1)}px)`);

    if (!isOff) {
        root.classList.remove('trans-off');
    } else {
        root.classList.add('trans-off');
    }

    // Clean up legacy global properties
    root.style.removeProperty('--fx-filter');
    root.style.removeProperty('--edge-refraction-filter');

    // Broadcast update to Gura iframes
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'glassEffectsUpdate',
                mode: isOff ? 'off' : 'on',
                val: activeVal
            }, targetOrigin);
        }
    });
}