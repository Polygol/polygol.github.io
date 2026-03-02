let isDuringFirstSetup = false; // Flag to prevent prompts during setup

async function firstSetup() {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    const selectedLanguage = localStorage.getItem('selectedLanguage') || 'EN';
    console.log('First setup: selected language:', selectedLanguage);

    // Wait for the language to be set and applied
    await selectLanguage(selectedLanguage);

    if (!hasVisitedBefore) {
        document.body.classList.add('setup-active'); // Add class to hide UI
        isDuringFirstSetup = true; // Set flag to block initial loads
        
        if (WALLPAPER_PRESETS && WALLPAPER_PRESETS.length > 0) {
            const randomPreset = WALLPAPER_PRESETS[Math.floor(Math.random() * WALLPAPER_PRESETS.length)];
            document.body.style.setProperty('--bg-image', `url('${randomPreset.fullUrl}')`);
        } else {
            // Fallback to a solid color or system default if fetch is slow
            document.body.style.backgroundColor = "#1c1c1c";
        }
        
        createSetupScreen(); // UI now uses the correct currentLanguage
    }
    // Note: 'hasVisitedBefore' is now set inside createSetupScreen upon completion
}

function createSetupScreen() {
    const generateNonsenseName = () => {
        const pre = ["Zork", "Bli", "Phro", "Kran", "Velt", "Spli", "Grom", "Twi", "Quar", "Mox", "Jub", "Vax", "Zym", "Plo", "Ska", "Tro", "Flu", "Bly", "Dwa", "Glo", "Snu", "Kri", "Vle", "Shu", "Pra", "Zon", "Cli", "Fro", "Ste", "Yol"];
        const mid = ["a", "o", "u", "e", "i", "ee", "oo", "ou", "y", "ia"];
        const post = ["nix", "zap", "loid", "tron", "vax", "mutt", "gle", "dax", "kin", "th", "rk", "zz", "nk", "st", "sh", "mp", "rt", "lk", "gn", "pl", "sk", "ch", "ff", "wn", "ly", "xy", "qu", "zt", "rd", "nz"];
        
        const getWord = () => {
            const p = pre[Math.floor(Math.random() * pre.length)];
            const m = mid[Math.floor(Math.random() * mid.length)];
            const s = post[Math.floor(Math.random() * post.length)];
            return p + m + s;
        };

        return `${getWord()} ${getWord()}`;
    };
	
    const setupContainer = document.createElement('div');
    setupContainer.className = 'setup-screen';

    // Ambient Music and Attribution
    const audio = document.createElement('audio');
    audio.id = 'setup-music';
    audio.src = '/assets/sound/setup/swinging.mp3';
    audio.loop = true;
    audio.volume = 0; // Start silently for fade-in

    const attribution = document.createElement('div');
    attribution.className = 'setup-music-attribution';
    attribution.innerHTML = 'Brittle Rille - Reunited • Kevin MacLeod (CC BY 4.0)';
    
    document.body.appendChild(audio); // Append to body to persist
    setupContainer.appendChild(attribution);

    const setupPages = [
        {
            title: "Hi! Welcome to Polygol",
            description: "Let's get set up! Don't worry, it won't take too long...",
            image: "https://github.com/kirbIndustries/assets/blob/main/screwy/img/1/Screwy.png?raw=true",
            options: []
        },
        {
            title: "Privacy & Data",
            description: "To improve Polygol, we collect anonymous usage data and error reports. This is fully compliant with GDPR and no personal data is ever stored.",
            icon: "encrypted",
            options: [
                { name: "Allow collection and sending of data", value: 'true', default: true },
                { name: "Don't collect or send", value: 'false' }
            ]
        },
        {
            title: "SETUP_ALLOW_PERMISSIONS",
            description: "Permissons are required to access certain functionality. Data may be sent to service providers, regardless of privacy settings.",
		    icon: "enable", // Add icon
            options: [
                { 
                    name: "SETUP_BASIC_ACCESS",
                    description: "SETUP_BASIC_ACCESS_DESC",
                    default: true
                },
                { 
                    name: "SETUP_LOCATION_ACCESS",
                    description: "SETUP_LOCATION_ACCESS_DESC",
                    permission: "geolocation"
                },
                { 
                    name: "SETUP_NOTIFICATIONS",
                    description: "SETUP_NOTIFICATIONS_DESC",
                    permission: "notifications"
                }
            ]
        },
        {
            title: "Name this Device",
            description: "I have a name, it's Screwy! I wonder what this thing's name is...",
            image: "https://github.com/kirbIndustries/assets/blob/main/screwy/img/1/Screwy2.png?raw=true",
            isInput: true,
            inputType: "text",
            inputPlaceholder: "Name",
            configKey: "system_device_name",
            default: generateNonsenseName()
        },
        {
            title: "SETUP_CANNIBALIZE",
            description: "",
		    icon: "palette",
            options: [
                { name: "SETUP_LIGHT", value: "light" },
                { name: "SETUP_DARK", value: "dark", default: true }
            ]
        },
        {
            title: "SETUP_CLOCK_FORMAT",
            description: "",
            icon: "schedule",
            options: [
                { name: "24-hour", value: false, default: true },
                { name: "12-hour", value: true }
            ]
        },
        {
            title: "SETUP_SHOW_WEATHER",
            description: "",
		    icon: "partly_cloudy_day",
            options: [
                { name: "SETUP_SHOW_WEATHER_TRUE", value: true, default: true },
                { name: "SETUP_SHOW_WEATHER_FALSE", value: false }
            ]
        },
		{
            title: "Back Up your Data",
            description: "Automatically back up and save your data. A notification will be sent when your data backup is ready.",
            icon: "settings_backup_restore",
            options: [
                { name: "Enable", value: 'true', default: true },
                { name: "Disable", value: 'false' }
            ]
        },
        {
            title: "SETUP_GURAPPS_USAGE",
            description: "SETUP_GURAPPS_USAGE_DESC",
		    icon: "grid_view", // Add icon
            options: []
        },
        {
            title: "SETUP_CONFIGURE_OPTIONS",
            description: "SETUP_CONFIGURE_OPTIONS_DESC",
		    icon: "page_info", // Add icon
            options: []
        },
        {
            title: "Goodbye (for now)",
            description: "Let's talk sometime later! I'm in the App Drawer at any time.",
		    image: "https://github.com/kirbIndustries/assets/blob/main/screwy/img/1/Screwy3.png?raw=true",
            options: []
        },
    ];

	let currentPage = 0;
    let isTransitioning = false; // Flag to prevent button spam

    function createPage(pageData) {
        const page = document.createElement('div');
        page.className = 'setup-page';
        
        // Add title with icon
        const titleContainer = document.createElement('div'); // Container for icon and title
        titleContainer.style.display = 'flex';
        titleContainer.style.flexDirection = 'column'; // Stack icon and title vertically
        titleContainer.style.alignItems = 'center'; // Center horizontally

        let headerVisual;
        if (pageData.image) {
            headerVisual = document.createElement('img');
            headerVisual.src = pageData.image;
            headerVisual.style.cssText = "width: 200px; height: 200px; object-fit: contain; margin-bottom: 8px;";
        } else {
            headerVisual = document.createElement('span');
            headerVisual.className = 'material-symbols-rounded';
            headerVisual.textContent = pageData.icon;
            headerVisual.style.fontSize = '48px';
            headerVisual.style.marginBottom = '8px';
        }

        const title = document.createElement('h1');
        title.className = 'setup-title';
        title.textContent = currentLanguage[pageData.title] || pageData.title;

        titleContainer.appendChild(headerVisual);
        titleContainer.appendChild(title);
        page.appendChild(titleContainer);
        
        // Add description
        const description = document.createElement('p');
        description.className = 'setup-description';
        description.textContent = currentLanguage[pageData.description] || pageData.description;
        page.appendChild(description);
        
        // Add options
        if (pageData.isInput) {
            // Render Text Input for Device Name
            const inputContainer = document.createElement('div');
            inputContainer.className = 'setup-option';
            inputContainer.style.cursor = 'default';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = localStorage.getItem(pageData.configKey) || pageData.default;
            input.placeholder = pageData.inputPlaceholder;
            input.className = 'setup-input-field'; // We'll add css for this
            input.style.cssText = "background: transparent; border: none; color: var(--text-color); font-size: 1.2rem; width: 100%; outline: none; border-bottom: 2px solid var(--accent); padding: 10px;";
            
            input.addEventListener('input', (e) => {
                localStorage.setItem(pageData.configKey, e.target.value);
            });

            inputContainer.appendChild(input);
            page.appendChild(inputContainer);
            
            // Auto-focus
            setTimeout(() => input.focus(), 500);

        } else if (pageData.options.length > 0) {
            pageData.options.forEach(option => {
                const optionElement = document.createElement('div');
                optionElement.className = 'setup-option';
                if (option.default) optionElement.classList.add('selected');
        
                const optionContent = document.createElement('div');
                optionContent.className = 'option-content';
        
                const optionText = document.createElement('span');
                optionText.className = 'option-title';
                optionText.textContent = currentLanguage[option.name] || option.name;
        
                if (option.description) {
                    const optionDesc = document.createElement('span');
                    optionDesc.className = 'option-description';
                    optionDesc.textContent = currentLanguage[option.description] || option.description;
                    optionContent.appendChild(optionDesc);
                }
        
                optionContent.insertBefore(optionText, optionContent.firstChild);
                optionElement.appendChild(optionContent);
        
                const checkIcon = document.createElement('span');
                checkIcon.className = 'material-symbols-rounded';
                checkIcon.textContent = 'check_circle';
                optionElement.appendChild(checkIcon);
        
                // Handle click events based on option type
                if (option.permission) {
                    optionElement.addEventListener('click', async () => {
                        try {
                            let permissionGranted = false;
                            switch (option.permission) {
                                case 'geolocation':
                                    permissionGranted = await new Promise(resolve => {
                                        navigator.geolocation.getCurrentPosition(
                                            () => resolve(true),
                                            () => resolve(false)
                                        );
                                    });
                                    if (permissionGranted) updateSmallWeather();
                                    break;
                                case 'notifications':
                                    const notifResult = await Notification.requestPermission();
                                    permissionGranted = notifResult === 'granted';
                                    break;
                            }
                            if (permissionGranted) optionElement.classList.add('selected');
                        } catch (error) {
                            console.error(`Permission request failed:`, error);
                            optionElement.classList.remove('selected');
                        }
                    });
                } else {
                    optionElement.addEventListener('click', () => {
                        // Deselect all options
                        page.querySelectorAll('.setup-option').forEach(el => el.classList.remove('selected'));
                        optionElement.classList.add('selected');
        
                        // Save the selection
                        switch (pageData.title) {
                            case "Privacy & Data":
                                localStorage.setItem('telemetryEnabled', option.value);
                                break;
                            case "SETUP_CANNIBALIZE":
                                localStorage.setItem('theme', option.value);
                                document.body.classList.toggle('light-theme', option.value === 'light');
                                break;
                            case "SETUP_CLOCK_FORMAT":
                                localStorage.setItem('use12HourFormat', option.value);
                                use12HourFormat = option.value;
                                const hrSwitch = document.getElementById('hour-switch');
                                if (hrSwitch) hrSwitch.checked = use12HourFormat;
                                updateClockAndDate();
                                break;
                            case "SETUP_SHOW_WEATHER":
                                localStorage.setItem('showWeather', option.value);
                                showWeather = option.value;
                                document.getElementById('weather').style.display = option.value ? 'block' : 'none';
                                if (option.value) updateSmallWeather();
                                break;
							case "SETUP_AUTO_BACKUP":
                                localStorage.setItem('automaticBackupsEnabled', option.value);
                                break;
                        }
                    });
                }
        
                page.appendChild(optionElement);
            });
        
            // Ensure a default option is selected if none are selected
            if (!page.querySelector('.setup-option.selected')) {
                page.querySelector('.setup-option').classList.add('selected');
            }
        }
        
        // Add navigation buttons
        const buttons = document.createElement('div');
        buttons.className = 'setup-buttons';
        
        const nextButton = document.createElement('button');
        nextButton.className = 'setup-button primary';
		nextButton.textContent = currentPage === setupPages.length - 1 ? currentLanguage.SETUP_CONTINUE : currentLanguage.SETUP_CONTINUE;
		nextButton.addEventListener('click', () => {
            if (isTransitioning) return; // Prevent spam-clicking
            isTransitioning = true;

            // --- START MUSIC ON FIRST INTERACTION ---
            if (currentPage === 0) {
                const setupMusic = document.getElementById('setup-music');
                if (setupMusic && setupMusic.paused) {
                    setupMusic.play().then(() => {
                        // Fade in volume for a smooth start
                        let volume = 0;
                        const fadeInInterval = setInterval(() => {
                            volume += 0.1;
                            if (volume >= 0.5) {
                                setupMusic.volume = 0.5;
                                clearInterval(fadeInInterval);
                            } else {
                                setupMusic.volume = volume;
                            }
                        }, 50);
                    }).catch(e => console.error("Could not play setup music after interaction:", e));
                }
            }

            if (currentPage === setupPages.length - 1) {
                // --- ONBOARDING FLOW ---
                localStorage.setItem('hasVisitedBefore', 'true');

                window.Analytics?.init();

                // Music continues playing until the final reload.

                setupContainer.style.opacity = '0';
                setTimeout(() => {
                    setupContainer.remove();
                    document.body.classList.remove('setup-active');
                    document.body.classList.add('onboarding-active'); // Lock down UI for onboarding
                    isDuringFirstSetup = false;

                    // 1. Temporarily define Airy for createFullscreenEmbed
                    apps['Airy'] = { url: '/assets/gurapp/intl/airy/index.html', icon: 'airy.png' };

                    // 2. Open the Airy onboarding app
                    createFullscreenEmbed('/assets/gurapp/intl/airy/index.html');
                    
                    // 3. Listen for completion message from Airy
                    const onOnboardingComplete = (event) => {
                        if (event.data.type === 'onboarding-complete') {
                            window.removeEventListener('message', onOnboardingComplete);
                            document.body.classList.remove('onboarding-active');
                            allowPageLeave = true; // Bypass the preventLeaving prompt
                            window.location.reload();
                        }
                    };
                    window.addEventListener('message', onOnboardingComplete);

                }, 500);
            } else {
                currentPage++;
                updateSetup();
            }
        });
        buttons.appendChild(nextButton);
        
        page.appendChild(buttons);
        return page;
    }

	function updateSetup() {
        const currentPageElement = setupContainer.querySelector('.setup-page');
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
            setTimeout(() => {
                currentPageElement.remove();
                const newPage = createPage(setupPages[currentPage]);
                setupContainer.appendChild(newPage);
                setTimeout(() => {
                    newPage.classList.add('active');
                    isTransitioning = false; // Re-enable button after transition
                }, 10);
            }, 300);
        } else {
            const newPage = createPage(setupPages[currentPage]);
            setupContainer.appendChild(newPage);
            setTimeout(() => {
                newPage.classList.add('active');
                isTransitioning = false; // Re-enable button
            }, 10);
        }

        // Update progress dots
        const progressDots = setupContainer.querySelectorAll('.progress-dot');
        progressDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }

    // Create progress dots
    const progressContainer = document.createElement('div');
    progressContainer.className = 'setup-progress';
    setupPages.forEach(() => {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        progressContainer.appendChild(dot);
    });
    setupContainer.appendChild(progressContainer);

    document.body.appendChild(setupContainer);
    updateSetup();
}