/**
 * Polygol INTERNAL Mode - System Engineering & Factory Testing Patch
 *
 * This patch is modular and only activates when internal mode is enabled
 * (via 3 taps on /assets/img/text-about-banner-transparent.png in Settings).
 * It unhides and registers internal apps, exposes internal diagnostic variables,
 * and allows existing features to be toggled on/off and changed dynamically.
 */

(function () {
    'use strict';

    const INTERNAL_APPS = {
        "Airy OOBE Management": {
            url: "/assets/intl/gurapp/airy-oobe-mgmt/index.html",
            icon: "airy.png",
            description: "Manage the Airy OOBE setup process and states"
        },
        "Airy": {
            url: "/assets/gurapp/intl/airy/index.html",
            icon: "airy.png",
            description: "Polygol Out-of-box Experience and system tutorial"
        },
        "CITMode": {
            url: "/assets/intl/gurapp/citmode/index.html",
            icon: "system.png",
            description: "Factory hardware test and component inspection"
        },
        "Remote Desktop": {
            url: "/assets/intl/gurapp/remote-desktop/index.html",
            icon: "transfer.png",
            description: "Complete remote control and screen mirroring"
        },
        "ShekaShake": {
            url: "/assets/intl/gurapp/shekashake/index.html",
            icon: "default.png",
            description: "Sensor diagnostics, orientation, motion and shake test"
        },
        "softness test": {
            url: "/assets/intl/gurapp/softness-test/index.html",
            icon: "settings.png",
            description: "Rendering performance, compositor latency and GPU blur benchmark"
        },
        "Utah 730hr test": {
            url: "/assets/intl/gurapp/utah-730hr/index.html",
            icon: "default.png",
            description: "Continuous 730-hour Utah Teapot 3D rendering stress test"
        },
        "BurninUI": {
            url: "/assets/intl/gurapp/burnin-ui/index.html",
            icon: "system.png",
            description: "UI monkey stress tester rapidly exercising interface patterns"
        },
        "BurninLog": {
            url: "/assets/intl/gurapp/burnin-log/index.html",
            icon: "system.png",
            description: "Code logic, algorithmic stress, and memory churn benchmark"
        },
        "BurninDvc": {
            url: "/assets/intl/gurapp/burnin-dvc/index.html",
            icon: "system.png",
            description: "Full device hardware and thermal stress test"
        },
        "SoundModuTest": {
            url: "/assets/intl/gurapp/sound-modu-test/index.html",
            icon: "tips.png",
            description: "Audio subsystem, frequency sweeps, channels and sound effects test"
        },
        "Rideset": {
            url: "/assets/intl/gurapp/rideset/index.html",
            icon: "settings.png",
            description: "System UI metric overrides and fine-grained visual customization"
        },
        "System Config": {
            url: "/assets/intl/gurapp/system-config/index.html",
            icon: "system.png",
            description: "Low-level system state manipulation, registry, and storage viewer"
        },
        "AiNany": {
            url: "/assets/intl/gurapp/ai-nany/index.html",
            icon: "assistant.png",
            description: "kirbAI system LLM diagnostic, prompt testing, and override tools"
        },
        "APIAval": {
            url: "/assets/intl/gurapp/api-aval/index.html",
            icon: "system.png",
            description: "GurappAPI and SystemAPI override, fuzzing, and mock harness"
        },
        "Loggy": {
            url: "/assets/intl/gurapp/loggy/index.html",
            icon: "feedback.png",
            description: "Real-time system event viewer, console interceptor, and log saver"
        },
        "Dump": {
            url: "/assets/intl/gurapp/dump/index.html",
            icon: "files.png",
            description: "Instant full system state, storage, and diagnostic dump utility"
        },
        "Gaty": {
            url: "/assets/intl/gurapp/gaty/index.html",
            icon: "appstore.png",
            description: "Advanced application lifecycle and permissions manager"
        },
        "Sammysapp": {
            url: "/assets/intl/gurapp/sammysapp/index.html",
            icon: "default.png",
            description: "Reference GurappAPI component testing showcase"
        },
        "Valtedit": {
            url: "/assets/intl/gurapp/valtedit/index.html",
            icon: "system.png",
            description: "CacheStorage inspector, asset cache purger, and vault editor"
        },
        "TEXTY": {
            url: "/assets/intl/gurapp/texty/index.html",
            icon: "files.png",
            description: "Lightweight text and code editor with file system access"
        },
        "intlStore": {
            url: "/assets/intl/gurapp/intl-store/index.html",
            icon: "appstore.png",
            description: "App updater, catalog, and management for internal tools"
        },
        "Sysinfo": {
            url: "/assets/intl/gurapp/sysinfo/index.html",
            icon: "settings.png",
            description: "Hardware specifications, system architecture, and runtime metrics"
        },
        "Onabilify": {
            url: "/assets/intl/gurapp/onabilify/index.html",
            icon: "system.png",
            description: "Master switchboard for experimental system feature flags"
        },
        "Videoman": {
            url: "/assets/intl/gurapp/videoman/index.html",
            icon: "default.png",
            description: "Camera device diagnostic, resolution test, and sensor feed"
        },
        "Signals": {
            url: "/assets/intl/gurapp/signals/index.html",
            icon: "transfer.png",
            description: "WiFi, Cellular, Bluetooth, GPS, and peripheral diagnostic"
        },
        "Reliability": {
            url: "/assets/intl/gurapp/reliability/index.html",
            icon: "system.png",
            description: "Long-term user activity simulation and system stability analysis"
        },
        "ImgDisp": {
            url: "/assets/intl/gurapp/imgdisp/index.html",
            icon: "default.png",
            description: "Image viewer with WebGPU and WebGL compute shader filters"
        }
    };

    // Circular log buffer for Loggy and Dump
    const _systemLogs = [];
    const MAX_LOGS = 1000;

    function captureLog(type, args) {
        const text = Array.from(args).map(a => {
            if (typeof a === 'object') {
                try { return JSON.stringify(a); } catch (e) { return String(a); }
            }
            return String(a);
        }).join(' ');

        _systemLogs.push({
            time: new Date().toISOString(),
            type: type,
            message: text
        });

        if (_systemLogs.length > MAX_LOGS) {
            _systemLogs.shift();
        }

        // Notify active loggy instances if any
        window.dispatchEvent(new CustomEvent('polygol-internal-log', {
            detail: { time: new Date().toISOString(), type, message: text }
        }));
    }

    // Intercept console calls
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    const origInfo = console.info;

    console.log = function (...args) {
        captureLog('log', args);
        origLog.apply(console, args);
    };
    console.warn = function (...args) {
        captureLog('warn', args);
        origWarn.apply(console, args);
    };
    console.error = function (...args) {
        captureLog('error', args);
        origError.apply(console, args);
    };
    console.info = function (...args) {
        captureLog('info', args);
        origInfo.apply(console, args);
    };

    window.addEventListener('error', (e) => {
        captureLog('error', [`Uncaught error: ${e.message} at ${e.filename}:${e.lineno}`]);
    });

    window.addEventListener('unhandledrejection', (e) => {
        captureLog('error', [`Unhandled rejection: ${e.reason}`]);
    });

    // Patch state management
    window.InternalPatch = {
        isApplied: false,
        apps: INTERNAL_APPS,

        // Variable controls that Internal can change to toggle existing features
        variables: {
            animationsEnabled: true,
            debugOverlayEnabled: false,
            developerConsoleEnabled: false,
            aiAssistantEnabled: true,
            ambientMusicEnabled: false,
            gurappsEnabled: true,
            gurappSoundsEnabled: true,
            hapticsEnabled: true,
            highContrast: false,
            liveEnvironmentEnabled: true,
            experimentalWebGL: true,
            experimentalGpuAccelerate: true,
            adaptiveBatterySaver: false,
            dataSaverEnabled: false,
            oledBurnInProtection: false,
            predictivePreload: true,
            dockPinned: false,
            oneButtonNavEnabled: false,
            glassEffectsMode: 'default',
            ecoTier: 0,
            simulateBatteryLevel: null,
            simulateOffline: false,
            mockSensors: false,
            bypassPermissions: true,
            uiScaleOverride: 100,
            blurStrengthOverride: null,
            borderRadiusOverride: null
        },

        init() {
            this.syncVariablesFromStorage();
            if (localStorage.getItem('internalMode') === 'true') {
                this.apply();
            }
            this.setupMessageListener();
        },

        syncVariablesFromStorage() {
            // Read existing system variables from localStorage
            for (const key in this.variables) {
                const stored = localStorage.getItem(key);
                if (stored !== null) {
                    if (stored === 'true') this.variables[key] = true;
                    else if (stored === 'false') this.variables[key] = false;
                    else if (!isNaN(stored) && stored.trim() !== '') this.variables[key] = Number(stored);
                    else this.variables[key] = stored;
                }
            }
        },

        setVariable(key, value) {
            this.variables[key] = value;
            localStorage.setItem(key, String(value));

            // Apply change to Polygol system
            if (typeof broadcastSettingUpdate === 'function') {
                broadcastSettingUpdate(key, String(value));
            }

            // Sync with DOM controls if present
            if (window.controlIdMap && window.controlIdMap[key]) {
                const control = document.getElementById(window.controlIdMap[key]);
                if (control) {
                    if (control.type === 'checkbox') {
                        control.checked = (value === true || value === 'true');
                    } else {
                        control.value = value;
                    }
                    control.dispatchEvent(new Event('change'));
                }
            }

            // Trigger specific runtime hooks
            this.applyVariableSideEffect(key, value);

            // Notify iframes
            document.querySelectorAll('iframe[data-gurasuraisu-iframe], .fullscreen-embed').forEach(frame => {
                if (frame.contentWindow) {
                    frame.contentWindow.postMessage({
                        type: 'internalVariableChange',
                        key: key,
                        value: value
                    }, '*');
                }
            });

            console.log(`[Internal Patch] Variable updated: ${key} = ${value}`);
        },

        applyVariableSideEffect(key, value) {
            switch (key) {
                case 'animationsEnabled':
                    document.body.classList.toggle('reduce-animations', !value);
                    break;
                case 'highContrast':
                    document.body.classList.toggle('high-contrast', !!value);
                    break;
                case 'debugOverlayEnabled':
                    if (typeof toggleDebugOverlay === 'function') toggleDebugOverlay();
                    break;
                case 'developerConsoleEnabled':
                    if (typeof toggleConsoleOverlay === 'function') toggleConsoleOverlay();
                    break;
                case 'simulateOffline':
                    window.dispatchEvent(new Event(value ? 'offline' : 'online'));
                    if (typeof updateNetworkInfo === 'function') updateNetworkInfo();
                    break;
                case 'uiScaleOverride':
                    document.documentElement.style.setProperty('--internal-ui-scale', `${value / 100}`);
                    break;
                case 'blurStrengthOverride':
                    if (value !== null) {
                        document.documentElement.style.setProperty('--blur1', `blur(${value}px)`);
                    } else {
                        document.documentElement.style.removeProperty('--blur1');
                    }
                    break;
                case 'borderRadiusOverride':
                    if (value !== null) {
                        document.documentElement.style.setProperty('--border-radius-base', `${value}px`);
                    } else {
                        document.documentElement.style.removeProperty('--border-radius-base');
                    }
                    break;
            }
        },

        apply() {
            if (this.isApplied) return;
            this.isApplied = true;
            console.log("[Internal Patch] Applying INTERNAL Mode patch to Polygol...");

            // 1. Merge internal apps into global apps list
            if (typeof window.apps === 'object' && window.apps !== null) {
                for (const [name, appDef] of Object.entries(INTERNAL_APPS)) {
                    window.apps[name] = appDef;
                }
            }

            // 2. Wrap loadUserInstalledApps & createFullscreenEmbed to safeguard internal apps
            if (typeof window.loadUserInstalledApps === 'function' && !window._origLoadUserInstalledApps) {
                window._origLoadUserInstalledApps = window.loadUserInstalledApps;
                window.loadUserInstalledApps = function () {
                    window._origLoadUserInstalledApps();
                    if (window.InternalPatch && window.InternalPatch.isApplied && typeof window.apps === 'object') {
                        for (const [name, appDef] of Object.entries(INTERNAL_APPS)) {
                            window.apps[name] = appDef;
                        }
                    }
                };
            }

            if (typeof window.createFullscreenEmbed === 'function' && !window._origCreateFullscreenEmbed) {
                window._origCreateFullscreenEmbed = window.createFullscreenEmbed;
                window.createFullscreenEmbed = function (url, options) {
                    if (window.InternalPatch && window.InternalPatch.isApplied && typeof window.apps === 'object') {
                        for (const [name, appDef] of Object.entries(INTERNAL_APPS)) {
                            if (!window.apps[name]) window.apps[name] = appDef;
                        }
                    }
                    return window._origCreateFullscreenEmbed(url, options);
                };
            }

            if (typeof window.normalizeUrlPath === 'function') {
                const origNormalize = window.normalizeUrlPath;
                window.normalizeUrlPath = function (url) {
                    if (url && url.includes('/assets/intl/gurapp/')) return url;
                    return origNormalize(url);
                };
            }

            // 3. Grant root and all permissions in appPermissions registry for internal apps
            try {
                const perms = JSON.parse(localStorage.getItem('appPermissions') || '{}');
                const ROOT_PERMS = {
                    'system-admin': 'granted',
                    'app-management': 'granted',
                    'notifications': 'granted',
                    'live-activity': 'granted',
                    'sheets': 'granted',
                    'immersive-mode': 'granted',
                    'file-upload': 'granted',
                    'widgets': 'granted',
                    'media-session': 'granted',
                    'tts': 'granted',
                    'waves': 'granted',
                    'custom-osk': 'granted',
                    'ui-sounds': 'granted'
                };
                for (const name in INTERNAL_APPS) {
                    perms[name] = { ...ROOT_PERMS };
                }
                localStorage.setItem('appPermissions', JSON.stringify(perms));
            } catch(e) {}

            // 4. Patch permission checks to ensure 100% root access for internal apps
            if (typeof window.checkAppPermission === 'function' && !window._origCheckAppPermission) {
                window._origCheckAppPermission = window.checkAppPermission;
                window.checkAppPermission = async function (sourceAppId, targetAction, origin) {
                    if (window.InternalPatch && window.InternalPatch.isApplied) {
                        const isInternalApp = INTERNAL_APPS[sourceAppId] ||
                            (origin && (origin.includes('/assets/intl/gurapp/') || origin.includes('/assets/gurapp/intl/'))) ||
                            Array.from(document.querySelectorAll('iframe')).some(f =>
                                (f.src && (f.src.includes('/assets/intl/gurapp/') || f.src.includes('/assets/gurapp/intl/'))) &&
                                f.contentWindow === window.event?.source
                            );
                        if (isInternalApp) {
                            return true; // Auto-grant root access to all actions
                        }
                    }
                    return window._origCheckAppPermission(sourceAppId, targetAction, origin);
                };
            }

            // 4. Refresh Dock and App Drawer if already populated
            if (typeof populateDock === 'function') {
                try { populateDock(); } catch (e) { console.warn(e); }
            }
            if (typeof createAppIcons === 'function') {
                try { createAppIcons(); } catch (e) { console.warn(e); }
            }

            // 5. Add custom CSS variables if needed
            document.body.classList.add('internal-mode-active');

            // 6. Notify active settings iframe to unhide Internal section
            this.notifySettings(true);
        },

        remove() {
            if (!this.isApplied) return;
            this.isApplied = false;
            console.log("[Internal Patch] Disabling INTERNAL Mode patch...");

            // Remove internal apps from global apps object
            if (typeof window.apps === 'object' && window.apps !== null) {
                for (const name in INTERNAL_APPS) {
                    delete window.apps[name];
                }
            }

            document.body.classList.remove('internal-mode-active');

            // Refresh UI
            if (typeof populateDock === 'function') {
                try { populateDock(); } catch (e) {}
            }
            if (typeof createAppIcons === 'function') {
                try { createAppIcons(); } catch (e) {}
            }

            this.notifySettings(false);
        },

        notifySettings(enabled) {
            document.querySelectorAll('iframe').forEach(frame => {
                try {
                    frame.contentWindow.postMessage({
                        type: 'internalModeUpdate',
                        enabled: enabled
                    }, '*');
                } catch (e) {}
            });
        },

        getLogs() {
            return _systemLogs;
        },

        clearLogs() {
            _systemLogs.length = 0;
        },

        setupMessageListener() {
            window.addEventListener('message', (e) => {
                const data = e.data;
                if (!data) return;

                // Handle internal mode toggle requests
                if (data.action === 'setInternalMode') {
                    if (data.enabled) {
                        localStorage.setItem('internalMode', 'true');
                        this.apply();
                    } else {
                        localStorage.setItem('internalMode', 'false');
                        this.remove();
                    }
                }

                // Handle variable updates from internal apps
                if (data.action === 'setInternalVariable' && data.key) {
                    this.setVariable(data.key, data.value);
                }

                // Request internal state
                if (data.action === 'getInternalState' && e.source) {
                    e.source.postMessage({
                        type: 'internalStateResponse',
                        enabled: this.isApplied,
                        variables: this.variables,
                        apps: INTERNAL_APPS
                    }, '*');
                }

                // Request logs for Loggy
                if (data.action === 'getInternalLogs' && e.source) {
                    e.source.postMessage({
                        type: 'internalLogsResponse',
                        logs: _systemLogs
                    }, '*');
                }

                // Clear logs
                if (data.action === 'clearInternalLogs') {
                    this.clearLogs();
                }

                // Direct Root JS Execution for Internal Apps
                if (data.action === 'rootExec' && data.code) {
                    try {
                        const result = eval(data.code);
                        let resultString;
                        if (typeof result === 'object' && result !== null) {
                            try { resultString = JSON.stringify(result); } catch (err) { resultString = String(result); }
                        } else {
                            resultString = String(result);
                        }
                        if (e.source) {
                            e.source.postMessage({ type: 'rootExecResult', result: resultString, success: true }, '*');
                        }
                    } catch(err) {
                        if (e.source) {
                            e.source.postMessage({ type: 'rootExecResult', error: err.message, success: false }, '*');
                        }
                    }
                }

                // Execute system GC or care
                if (data.action === 'executeInternalCare') {
                    if (window.SystemGC && typeof window.SystemGC.run === 'function') {
                        window.SystemGC.run(true);
                    }
                }
            }, true); // Capture phase to identify internal senders before api.js
        }
    };

    // Auto-initialize once DOM is ready or immediately if loaded defer
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.InternalPatch.init());
    } else {
        window.InternalPatch.init();
    }

})();
