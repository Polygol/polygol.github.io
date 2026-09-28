/**
 * Polygol Settings INTERNAL Mode Patch
 *
 * Activated only when tapping on /assets/img/text-about-banner-transparent.png 3 times.
 * Injects the "Internal" section into main-settings and provides the page-internal
 * interface for toggling internal variables, testing hardware, and launching internal apps.
 */

(function () {
    'use strict';

    let tapCount = 0;
    let tapResetTimer = null;

    function isInternalModeEnabled() {
        try {
            return (window.parent && window.parent.localStorage.getItem('internalMode') === 'true') ||
                   (localStorage.getItem('internalMode') === 'true');
        } catch (e) {
            return localStorage.getItem('internalMode') === 'true';
        }
    }

    function setInternalMode(enabled) {
        const val = enabled ? 'true' : 'false';
        localStorage.setItem('internalMode', val);
        try {
            if (window.parent && window.parent.localStorage) {
                window.parent.localStorage.setItem('internalMode', val);
            }
            window.parent.postMessage({ action: 'setInternalMode', enabled: enabled }, '*');
        } catch (e) {
            console.warn("[Internal Settings Patch] Could not access parent localStorage:", e);
        }
    }

    function initPatch() {
        attachBannerTapListener();
        if (isInternalModeEnabled()) {
            injectInternalSectionAndPage();
        }

        // Listen for parent messages
        window.addEventListener('message', (e) => {
            const data = e.data;
            if (data && data.type === 'internalModeUpdate') {
                if (data.enabled) {
                    injectInternalSectionAndPage();
                } else {
                    removeInternalSectionAndPage();
                }
            }
        });
    }

    function attachBannerTapListener() {
        const bannerImg = document.querySelector('img[src*="text-about-banner-transparent.png"]');
        if (!bannerImg) {
            // Retry if DOM is still rendering
            setTimeout(attachBannerTapListener, 250);
            return;
        }

        bannerImg.style.cursor = 'pointer';
        bannerImg.style.touchAction = 'manipulation';
        bannerImg.style.userSelect = 'none';
        bannerImg.style.webkitUserSelect = 'none';

        const onBannerTap = (e) => {
            e.preventDefault();
            tapCount++;
            clearTimeout(tapResetTimer);
            tapResetTimer = setTimeout(() => {
                tapCount = 0;
            }, 1800);

            if (tapCount === 1 || tapCount === 2) {
                if (window.Gurasuraisu && Gurasuraisu.playSound) Gurasuraisu.playSound('click');
            } else if (tapCount >= 3) {
                tapCount = 0;
                handleThreeTapsTrigger();
            }
        };

        bannerImg.addEventListener('click', onBannerTap);
    }

    function handleThreeTapsTrigger() {
        const alreadyActive = isInternalModeEnabled();

        if (!alreadyActive) {
            setInternalMode(true);
            injectInternalSectionAndPage();

            if (window.Gurasuraisu) {
                if (Gurasuraisu.playSound) Gurasuraisu.playSound('notify');
                if (Gurasuraisu.showPopup) Gurasuraisu.showPopup('INTERNAL mode activated');
            }

            // Navigate directly to the newly unlocked page
            setTimeout(() => {
                const navItem = document.querySelector('.nav-item[data-page="page-internal"]');
                if (navItem) navItem.click();
            }, 300);
        } else {
            if (window.Gurasuraisu && Gurasuraisu.showPopup) {
                Gurasuraisu.showPopup('INTERNAL mode is active');
            }
        }
    }

    function injectInternalSectionAndPage() {
        // 1. Inject "Internal" item in main-settings menu
        let section = document.getElementById('internal-settings-section');
        if (!section) {
            const mainSettings = document.getElementById('main-settings');
            if (!mainSettings) return;

            section = document.createElement('div');
            section.className = 'setting-section';
            section.id = 'internal-settings-section';
            section.innerHTML = `
                <div class="setting-item nav-item" data-page="page-internal">
                    <div class="setting-info">
                        <span class="material-symbols-rounded" style="background: #ff9800;">build_circle</span>
                        <span class="setting-label">Internal</span>
                    </div>
                    <span class="material-symbols-rounded">arrow_forward_ios</span>
                </div>
            `;

            // Insert right before About section
            const aboutItem = mainSettings.querySelector('.nav-item[data-page="page-about"]');
            if (aboutItem && aboutItem.parentElement) {
                mainSettings.insertBefore(section, aboutItem.parentElement);
            } else {
                mainSettings.appendChild(section);
            }

            // Bind click to navigate
            section.querySelector('.nav-item').addEventListener('click', () => {
                navigateToPage('page-internal');
            });
        }

        // 2. Inject page-internal into .pages-container
        let internalPage = document.getElementById('page-internal');
        if (!internalPage) {
            const pagesContainer = document.querySelector('.pages-container');
            if (!pagesContainer) return;

            internalPage = document.createElement('div');
            internalPage.className = 'page';
            internalPage.id = 'page-internal';
            internalPage.style.display = 'none';

            internalPage.innerHTML = `
                <!-- Master Status & Exit -->
                <div class="setting-section">
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">INTERNAL Mode</span>
                            <span class="setting-description" style="color: #ff9800; font-weight: 500;">ACTIVE — Factory & Developer Build</span>
                        </div>
                        <div class="setting-control">
                            <button class="action-btn" id="btn-turn-off-internal" style="background: rgba(255, 82, 82, 0.2); color: #ff5252; border-color: rgba(255, 82, 82, 0.4);">
                                Turn Off
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Diagnostics & Quick Actions -->
                <div class="setting-section">
                    <h2 class="section-title">Diagnostic Quick Actions</h2>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Factory Hardware Test (CIT)</span>
                            <span class="setting-description">Run full factory inspection suite</span>
                        </div>
                        <button class="action-btn" onclick="if(window.Gurasuraisu) Gurasuraisu.openApp('/assets/intl/gurapp/citmode/index.html');">Launch</button>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Instant System Dump</span>
                            <span class="setting-description">Capture full environment, storage, and metrics</span>
                        </div>
                        <button class="action-btn" onclick="if(window.Gurasuraisu) Gurasuraisu.openApp('/assets/intl/gurapp/dump/index.html');">Dump</button>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Memory Care (Force GC)</span>
                            <span class="setting-description">Trigger aggressive garbage collection immediately</span>
                        </div>
                        <button class="action-btn" id="btn-internal-care">Run Care</button>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Event & Console Viewer (Loggy)</span>
                            <span class="setting-description">Inspect captured logs and save to file</span>
                        </div>
                        <button class="action-btn" onclick="if(window.Gurasuraisu) Gurasuraisu.openApp('/assets/intl/gurapp/loggy/index.html');">Open</button>
                    </div>
                </div>

                <!-- Internal Feature Flags & Overrides -->
                <div class="setting-section">
                    <h2 class="section-title">Internal Feature Variables</h2>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Bypass App Permissions</span>
                            <span class="setting-description">Grant internal apps root execution without dialogs</span>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" class="toggle-switch" id="internal-bypass-perm" checked>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Debug FPS Overlay</span>
                            <span class="setting-description">Real-time framerate and active app counter</span>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" class="toggle-switch" id="internal-debug-overlay">
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Developer Console</span>
                            <span class="setting-description">On-screen floating diagnostic console</span>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" class="toggle-switch" id="internal-dev-console">
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Simulate Offline Mode</span>
                            <span class="setting-description">Force network disconnection events</span>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" class="toggle-switch" id="internal-sim-offline">
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">Experimental WebGL Acceleration</span>
                            <span class="setting-description">Enable GPU experimental canvas pipelines</span>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" class="toggle-switch" id="internal-exp-webgl">
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label">System Animations</span>
                            <span class="setting-description">Toggle UI transitions and framerate pacing</span>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" class="toggle-switch" id="internal-animations">
                        </div>
                    </div>
                </div>

                <!-- All Hidden Internal Apps -->
                <div class="setting-section" id="internal-apps-list-container">
                    <h2 class="section-title">Internal Applications (28)</h2>
                    <div class="setting-item" style="padding: 10px 14px; background: var(--search-background); border-radius: 12px; margin-bottom: 8px;">
                        <input type="text" id="internal-app-filter" class="form-input" placeholder="Search internal apps..." style="width: 100%; border: none; background: transparent; padding: 4px 0;">
                    </div>
                    <div id="internal-apps-grid" style="display: flex; flex-direction: column; gap: 8px;">
                        <!-- Generated dynamically -->
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="setting-section">
                    <h2 class="section-title" style="color: #ff5252;">Danger Zone</h2>
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-label" style="color: #ff5252;">Deactivate INTERNAL Mode</span>
                            <span class="setting-description">Reverts system to production state and hides all internal tools</span>
                        </div>
                        <div class="setting-control">
                            <button class="action-btn" id="btn-deactivate-internal-danger" style="background: #ff5252; color: white; border: none;">
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            `;

            pagesContainer.appendChild(internalPage);
            bindInternalPageEvents(internalPage);
            populateInternalAppsList(internalPage);
        }
    }

    function removeInternalSectionAndPage() {
        const section = document.getElementById('internal-settings-section');
        if (section) section.remove();

        const internalPage = document.getElementById('page-internal');
        if (internalPage) {
            if (internalPage.classList.contains('active')) {
                navigateToPage('main-settings');
            }
            internalPage.remove();
        }
    }

    function bindInternalPageEvents(page) {
        // Turn Off Buttons
        const turnOffAction = async () => {
            if (window.Gurasuraisu && Gurasuraisu.showConfirm) {
                const confirmed = await Gurasuraisu.showConfirm("Are you sure you want to exit INTERNAL mode? Internal apps will be hidden.", "Exit INTERNAL Mode");
                if (!confirmed) return;
            }
            setInternalMode(false);
            removeInternalSectionAndPage();
            if (window.Gurasuraisu && Gurasuraisu.showPopup) {
                Gurasuraisu.showPopup('INTERNAL mode disabled');
            }
        };

        const turnOffBtn = page.querySelector('#btn-turn-off-internal');
        if (turnOffBtn) turnOffBtn.onclick = turnOffAction;

        const dangerDeactivate = page.querySelector('#btn-deactivate-internal-danger');
        if (dangerDeactivate) dangerDeactivate.onclick = turnOffAction;

        // Force GC
        const careBtn = page.querySelector('#btn-internal-care');
        if (careBtn) {
            careBtn.onclick = () => {
                window.parent.postMessage({ action: 'executeInternalCare' }, '*');
                if (window.Gurasuraisu && Gurasuraisu.showPopup) {
                    Gurasuraisu.showPopup('Memory Care GC executed');
                }
            };
        }

        // Bind Variables Toggles
        const bindToggle = (elementId, variableKey) => {
            const el = page.querySelector('#' + elementId);
            if (!el) return;

            // Load initial state
            const current = window.parent ? window.parent.localStorage.getItem(variableKey) : localStorage.getItem(variableKey);
            if (variableKey === 'animationsEnabled') {
                el.checked = current !== 'false';
            } else {
                el.checked = current === 'true';
            }

            el.addEventListener('change', () => {
                const val = el.checked;
                window.parent.postMessage({
                    action: 'setInternalVariable',
                    key: variableKey,
                    value: val
                }, '*');
            });
        };

        bindToggle('internal-bypass-perm', 'bypassPermissions');
        bindToggle('internal-debug-overlay', 'debugOverlayEnabled');
        bindToggle('internal-dev-console', 'developerConsoleEnabled');
        bindToggle('internal-sim-offline', 'simulateOffline');
        bindToggle('internal-exp-webgl', 'experimentalWebGL');
        bindToggle('internal-animations', 'animationsEnabled');

        // Search Filter for Apps
        const filterInput = page.querySelector('#internal-app-filter');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                page.querySelectorAll('.internal-app-card').forEach(card => {
                    const name = card.dataset.appName.toLowerCase();
                    const desc = (card.dataset.appDesc || '').toLowerCase();
                    if (name.includes(q) || desc.includes(q)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    }

    const ALL_INTERNAL_APPS = [
        { name: "Airy OOBE Management", desc: "Manage the Airy app and OOBE setup", url: "/assets/intl/gurapp/airy-oobe-mgmt/index.html", icon: "airy.png" },
        { name: "Airy", desc: "Polygol Out-of-box experience tutorial", url: "/assets/gurapp/intl/airy/index.html", icon: "airy.png" },
        { name: "CITMode", desc: "Factory testing & component inspection test", url: "/assets/intl/gurapp/citmode/index.html", icon: "system.png" },
        { name: "Remote Desktop", desc: "Allow complete control of device remotely", url: "/assets/intl/gurapp/remote-desktop/index.html", icon: "transfer.png" },
        { name: "ShekaShake", desc: "Sensor info, orientation and shake testing", url: "/assets/intl/gurapp/shekashake/index.html", icon: "default.png" },
        { name: "softness test", desc: "Rendering info, blur benchmark and testing", url: "/assets/intl/gurapp/softness-test/index.html", icon: "settings.png" },
        { name: "Utah 730hr test", desc: "Render the Utah teapot for 730 hrs", url: "/assets/intl/gurapp/utah-730hr/index.html", icon: "default.png" },
        { name: "BurninUI", desc: "Stress test system with rapid user-like patterns", url: "/assets/intl/gurapp/burnin-ui/index.html", icon: "system.png" },
        { name: "BurninLog", desc: "Stress test system by code logic and churn", url: "/assets/intl/gurapp/burnin-log/index.html", icon: "system.png" },
        { name: "BurninDvc", desc: "Stress test device CPU, GPU and hardware", url: "/assets/intl/gurapp/burnin-dvc/index.html", icon: "system.png" },
        { name: "SoundModuTest", desc: "Test sound system, frequencies and effects", url: "/assets/intl/gurapp/sound-modu-test/index.html", icon: "tips.png" },
        { name: "Rideset", desc: "Configure system UI with custom values", url: "/assets/intl/gurapp/rideset/index.html", icon: "settings.png" },
        { name: "System Config", desc: "Advanced UI settings, registry and state config", url: "/assets/intl/gurapp/system-config/index.html", icon: "system.png" },
        { name: "AiNany", desc: "Testing and configuration of kirbAI", url: "/assets/intl/gurapp/ai-nany/index.html", icon: "assistant.png" },
        { name: "APIAval", desc: "Manually configure & override GurappAPI/SystemAPI", url: "/assets/intl/gurapp/api-aval/index.html", icon: "system.png" },
        { name: "Loggy", desc: "Event viewer and console log saver", url: "/assets/intl/gurapp/loggy/index.html", icon: "feedback.png" },
        { name: "Dump", desc: "Dump the system state right now", url: "/assets/intl/gurapp/dump/index.html", icon: "files.png" },
        { name: "Gaty", desc: "Advanced app and permission manager", url: "/assets/intl/gurapp/gaty/index.html", icon: "appstore.png" },
        { name: "Sammysapp", desc: "Example GurappAPI app testing components", url: "/assets/intl/gurapp/sammysapp/index.html", icon: "default.png" },
        { name: "Valtedit", desc: "Edit system cache and storage vault", url: "/assets/intl/gurapp/valtedit/index.html", icon: "system.png" },
        { name: "TEXTY", desc: "Clean text and code editor", url: "/assets/intl/gurapp/texty/index.html", icon: "files.png" },
        { name: "intlStore", desc: "App updater & management for internal apps", url: "/assets/intl/gurapp/intl-store/index.html", icon: "appstore.png" },
        { name: "Sysinfo", desc: "General information about system and OS", url: "/assets/intl/gurapp/sysinfo/index.html", icon: "settings.png" },
        { name: "Onabilify", desc: "Enable and disable system feature flags", url: "/assets/intl/gurapp/onabilify/index.html", icon: "system.png" },
        { name: "Videoman", desc: "Camera and media device diagnostic", url: "/assets/intl/gurapp/videoman/index.html", icon: "default.png" },
        { name: "Signals", desc: "WiFi, Bluetooth, GPS, and NFC diagnostic", url: "/assets/intl/gurapp/signals/index.html", icon: "transfer.png" },
        { name: "Reliability", desc: "Simulate user activity over time and report", url: "/assets/intl/gurapp/reliability/index.html", icon: "system.png" },
        { name: "ImgDisp", desc: "Display image and apply WebGPU filters", url: "/assets/intl/gurapp/imgdisp/index.html", icon: "default.png" }
    ];

    function populateInternalAppsList(page) {
        const grid = page.querySelector('#internal-apps-grid');
        if (!grid) return;
        grid.innerHTML = '';

        ALL_INTERNAL_APPS.forEach(app => {
            const card = document.createElement('div');
            card.className = 'setting-item internal-app-card';
            card.dataset.appName = app.name;
            card.dataset.appDesc = app.desc;
            card.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 12px 14px;';

            let iconPath = app.icon.startsWith('/') ? app.icon : `/assets/appicon/${app.icon}`;

            card.innerHTML = `
                <div class="setting-info" style="gap: 12px; display:flex; align-items:center; max-width: 75%;">
                    <img src="${iconPath}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;" onerror="this.src='/assets/appicon/default.png';">
                    <div style="display:flex; flex-direction:column;">
                        <span class="setting-label" style="font-weight:600;">${app.name}</span>
                        <span class="setting-description" style="font-size:12px;">${app.desc}</span>
                    </div>
                </div>
                <button class="action-btn" style="min-width: 60px;">Open</button>
            `;

            card.querySelector('button').onclick = () => {
                if (window.Gurasuraisu && Gurasuraisu.openApp) {
                    Gurasuraisu.openApp(app.url);
                } else {
                    window.open(app.url, '_blank');
                }
            };

            grid.appendChild(card);
        });
    }

    function navigateToPage(pageId) {
        const titleEl = document.querySelector('.page-title');
        const backBtn = document.querySelector('.back-btn');
        const activePage = document.querySelector('.page.active');
        const targetPage = document.getElementById(pageId);

        if (!targetPage) return;

        if (activePage) {
            activePage.classList.remove('active');
            activePage.style.display = 'none';
        }

        targetPage.style.display = 'flex';
        targetPage.classList.add('active');

        if (titleEl) {
            titleEl.textContent = (pageId === 'page-internal') ? 'Internal' : 'Settings';
        }

        if (backBtn) {
            if (pageId === 'page-internal') {
                backBtn.style.display = 'flex';
                backBtn.onclick = (e) => {
                    e.stopImmediatePropagation();
                    navigateToPage('main-settings');
                };
            } else if (pageId === 'main-settings') {
                backBtn.style.display = 'none';
                backBtn.onclick = null;
            }
        }
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPatch);
    } else {
        initPatch();
    }

})();
