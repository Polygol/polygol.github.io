// --- Dynamic Brightness & Tone (True Tone) ---
const DynamicEnvironmentManager = {
    lastLux: 0,
    lastTargetBright: 100,
    lastTargetTone: 0,

    init() {
        // Run immediately, then every 2 minutes
        this.update();
        setInterval(() => this.update(), 120000);

        // Optional: Hardware Ambient Light Sensor API (if browser supported)
        try {
            if ('AmbientLightSensor' in window) {
                const sensor = new AmbientLightSensor();
                sensor.onreading = () => this.handleHardwareSensor(sensor.illuminance);
                sensor.start();
            }
        } catch (e) {}
    },

    handleHardwareSensor(lux) {
        const autoBright = localStorage.getItem('autoBrightness') === 'true';
        const brightOverridden = localStorage.getItem('autoBrightness_overridden') === 'true';

        if (brightOverridden) {
            const overrideLux = parseFloat(localStorage.getItem('override_lux'));
            // If lux changed by more than 100 (significant ambient light shift)
            if (isNaN(overrideLux) || Math.abs(lux - overrideLux) > 100) {
                localStorage.setItem('autoBrightness', 'true');
                localStorage.removeItem('autoBrightness_overridden');
                if (typeof broadcastSettingUpdate === 'function') broadcastSettingUpdate('autoBrightness', 'true');
            } else {
                return; // Keep user override active
            }
        } else if (!autoBright) {
            return;
        }

        // Map lux (0 - 1000+) to brightness (20 - 100)
        let targetBrightness = 20 + (Math.min(lux, 1000) / 1000) * 80;
        this.applySmoothly('page_brightness', targetBrightness);
        this.lastLux = lux;
    },

    async update() {
        const autoBright = localStorage.getItem('autoBrightness') === 'true';
        const dynamicTone = localStorage.getItem('dynamicTone') === 'true';
        const brightOverridden = localStorage.getItem('autoBrightness_overridden') === 'true';
        const toneOverridden = localStorage.getItem('dynamicTone_overridden') === 'true';

        if (!autoBright && !dynamicTone && !brightOverridden && !toneOverridden) return;

        const now = new Date();
        const longitude = (now.getTimezoneOffset() / 60) * -15;
        let latitude = 40; 
        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (timeZone && timeZone.startsWith('Australia')) latitude = -25;
        } catch (e) {}

        const sunPosition = SunCalc.getPosition(now, latitude, longitude);
        const altitudeDeg = sunPosition.altitude * (180 / Math.PI); // Convert rad to deg

        // Check Weather Context
        let weatherModifierBright = 1.0;
        let weatherModifierTone = 0;
        const savedWeather = await SwapManager.get('lastWeatherData');
        if (savedWeather) {
            const code = savedWeather.current.weathercode;
            const isClouds = (code >= 1 && code <= 3);
            const isRainSnow = (code >= 51 && code <= 77) || (code >= 80 && code <= 86) || code >= 95;
            
            if (isRainSnow) {
                weatherModifierBright = 0.7; // 30% dimmer during storms
                weatherModifierTone = -3; // Cooler (bluer)
            } else if (isClouds) {
                weatherModifierBright = 0.85; // 15% dimmer
                weatherModifierTone = -1; // Slightly cool
            }
        }

        // --- Calculate Target Brightness ---
        if (autoBright) {
            let targetBright = 100;
            if (altitudeDeg < -10) targetBright = 20; // Night
            else if (altitudeDeg < 0) targetBright = 40; // Twilight
            else if (altitudeDeg < 20) targetBright = 40 + ((altitudeDeg / 20) * 60); // Morning/Late Afternoon
            
            targetBright = Math.max(20, Math.min(100, targetBright * weatherModifierBright));
            this.applySmoothly('page_brightness', targetBright);
        }

        // --- Calculate Target Tone (Temperature) ---
        let targetTone = 0;
        if (altitudeDeg < -5) targetTone = 8; // Deep Night (Warm/Blue light filter)
        else if (altitudeDeg < 15) targetTone = 5; // Golden Hour (Warm)
        else targetTone = 0; // High Noon (Neutral)
        
        targetTone = Math.max(-10, Math.min(10, targetTone + weatherModifierTone));

        // --- Delta Detection for Restoration ---
        if (brightOverridden) {
            const overrideBright = parseFloat(localStorage.getItem('override_target_bright'));
            // If internal target shifted by more than 15 points
            if (isNaN(overrideBright) || Math.abs(targetBright - overrideBright) > 15) {
                localStorage.setItem('autoBrightness', 'true');
                localStorage.removeItem('autoBrightness_overridden');
                if (typeof broadcastSettingUpdate === 'function') broadcastSettingUpdate('autoBrightness', 'true');
            }
        }

        if (toneOverridden) {
            const overrideTone = parseFloat(localStorage.getItem('override_target_tone'));
            // If internal target shifted by more than 3 points
            if (isNaN(overrideTone) || Math.abs(targetTone - overrideTone) > 3) {
                localStorage.setItem('dynamicTone', 'true');
                localStorage.removeItem('dynamicTone_overridden');
                if (typeof broadcastSettingUpdate === 'function') broadcastSettingUpdate('dynamicTone', 'true');
            }
        }

        this.lastTargetBright = targetBright;
        this.lastTargetTone = targetTone;

        if (localStorage.getItem('autoBrightness') === 'true') {
            this.applySmoothly('page_brightness', targetBright);
        }
        if (localStorage.getItem('dynamicTone') === 'true') {
            this.applySmoothly('display_temperature', targetTone);
        }
    },

    applySmoothly(key, targetValue) {
        // Prevent manual slider interaction feedback loop
        window._isSystemAutoAdjusting = true;
        
        const rounded = Math.round(targetValue);
        // Only dispatch if it's a significant change (prevents constant DOM thrashing)
        const current = parseInt(localStorage.getItem(key) || (key === 'page_brightness' ? '100' : '0'));
        
        if (Math.abs(current - rounded) > 2) {
            if (typeof setControlValueAndDispatch === 'function') {
                setControlValueAndDispatch(key, rounded.toString());
            }
        }
        
        setTimeout(() => { window._isSystemAutoAdjusting = false; }, 100);
    }
};

let currentSunShadow = ''; // To store the calculated sun shadow string
let currentSunShadowStrong = ''; // To store the intensified sun shadow string

/**
 * Calculates a box-shadow string based on the sun's position and sets it as a CSS variable.
 * Uses timezone data to estimate sun position instead of geolocation.
 */
function updateSunEffect() {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('SunShadow')) {
        document.body.style.removeProperty('--sun-shadow');
        document.body.style.removeProperty('--sun-shadow-strong');
        return;
    }

    const now = new Date();
    
    // Estimate Longitude from Timezone Offset (15 degrees per hour)
    // getTimezoneOffset returns positive minutes for zones behind UTC (West)
    // Longitude is negative for West, so we multiply by -15/60 (-0.25)
    const longitude = (now.getTimezoneOffset() / 60) * -15;

    // Estimate Latitude from Timezone Region
    let latitude = 40; // Default to mid-northern latitudes (e.g., US/Europe)
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timeZone) {
            if (timeZone.startsWith('Australia')) latitude = -25;
            else if (timeZone.startsWith('Africa')) latitude = 0;
            else if (timeZone.startsWith('Asia')) latitude = 35;
            else if (timeZone.startsWith('Europe')) latitude = 50;
            else if (timeZone.startsWith('America')) {
                latitude = 40;
                // Basic check for major South American zones to flip latitude
                if (timeZone.includes('Sao_Paulo') || timeZone.includes('Argentina') || timeZone.includes('Santiago') || timeZone.includes('Lima')) {
                    latitude = -20;
                }
            }
            else if (timeZone.startsWith('Pacific')) latitude = 0;
            else if (timeZone.startsWith('Atlantic')) latitude = 30;
            else if (timeZone.startsWith('Indian')) latitude = -10;
            else if (timeZone.startsWith('Antarctica')) latitude = -75;
        }
    } catch (e) {
        console.warn("Could not determine approximate latitude from timezone, using default.");
    }

    const sunPosition = SunCalc.getPosition(now, latitude, longitude);

    // Check for current theme to adjust intensity
    const isLightMode = document.body.classList.contains('light-theme');

	// Define constants for the sharp highlight effect with much more saturated colors
	const SUNRISE_COLOR = [255, 170, 90];     // Highly saturated orange
	const MIDDAY_COLOR = [255, 255, 255];     // Pure white
	const MOONLIGHT_COLOR = [160, 195, 255];  // Highly saturated blue
	const SHADOW_DISTANCE = 1.0;             // A tight, 1px distance for the highlight
	const BLUR_RADIUS = 1.0;                 // A minimal blur to anti-alias the 1px line
	const SPREAD_RADIUS = 0.0;               // No spread, for a crisp line
	const STRONG_BLUR_RADIUS = 4.0;          // Increased blur for a bigger glow
	const STRONG_SPREAD_RADIUS = 1.0;        // Increased spread for thickness
	const MAX_SUN_ALPHA = isLightMode ? 0.95 : 0.7;   // Drastically increased opacity
	const MAX_MOON_ALPHA = isLightMode ? 0.75 : 0.5;  // Drastically increased moonlight opacity

	if (sunPosition.altitude > 0) {
		// --- SUNLIGHT LOGIC ---
		const altitudeFactor = Math.sin(sunPosition.altitude); 
		const finalAlpha = MAX_SUN_ALPHA * Math.max(0.5, altitudeFactor); 
		const finalColor = lerpColor(SUNRISE_COLOR, MIDDAY_COLOR, altitudeFactor);
		const [r, g, b] = finalColor;

		const offsetX = Math.sin(sunPosition.azimuth) * SHADOW_DISTANCE;
		const offsetY = Math.cos(sunPosition.azimuth) * SHADOW_DISTANCE;

		// A: Regular Shadow
		// Sharp specular highlight on the edge facing the light
		const specularHighlight = `inset ${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px 1px -0.5px rgba(255, 255, 255, ${isLightMode ? 1 : 0.5})`;
		const reflectedSpecular = `inset ${-offsetX.toFixed(2)}px ${-offsetY.toFixed(2)}px 1px -0.5px rgba(255, 255, 255, ${isLightMode ? 1 : 0.5})`;
		currentSunShadow = `${specularHighlight}, ${reflectedSpecular}, 0 5px 20px -10px rgba(0, 0, 0, 0.2)`;
		
		// B: Strong Shadow (Same geometry, higher opacity)
		const strongSpecular = `inset ${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px 1px -0.25px rgba(255, 255, 255, 1)`;
		const strongReflectedSpecular = `inset ${-offsetX.toFixed(2)}px ${-offsetY.toFixed(2)}px 1px -0.25px rgba(255, 255, 255, 1)`;
		currentSunShadowStrong = `${strongSpecular}, ${strongReflectedSpecular}, 0 5px 20px -10px rgba(0, 0, 0, 0.2)`;

	} else {
		// --- NIGHT LOGIC (MOONLIGHT OR STARLIGHT) ---
		const moonPosition = SunCalc.getMoonPosition(now, latitude, longitude);

		// A: Regular Starlight
		const starlightSpecular = `inset 0px 1px 1px -0.5px rgba(255, 255, 255, ${isLightMode ? 1 : 0.5})`;
		const starlightReflected = `inset 0px -1px 1px -0.5px rgba(255, 255, 255, ${isLightMode ? 1 : 0.5})`;
		currentSunShadow = `${starlightSpecular}, ${starlightReflected}, 0 5px 20px -10px rgba(0, 0, 0, 0.2)`;

		// B: Strong Starlight (Same geometry, higher opacity)
		const strongStarlightSpecular = `inset 0px 1px 1px -0.25px rgba(255, 255, 255, 1)`;
		const strongStarlightReflected = `inset 0px -1px 1px -0.25px rgba(255, 255, 255, 1)`;
		currentSunShadowStrong = `${strongStarlightSpecular}, ${strongStarlightReflected}, 0 5px 20px -10px rgba(0, 0, 0, 0.2)`;
		
		// If the moon is up, override starlight with brighter, directional moonlight.
		if (moonPosition.altitude > 0) {
			const offsetX = Math.sin(moonPosition.azimuth) * SHADOW_DISTANCE;
			const offsetY = Math.cos(moonPosition.azimuth) * SHADOW_DISTANCE;
			
			const specularHighlight = `inset ${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px 1px -0.5px rgba(255, 255, 255, ${isLightMode ? 1 : 0.5})`;
			const reflectedSpecular = `inset ${-offsetX.toFixed(2)}px ${-offsetY.toFixed(2)}px 1px -0.5px rgba(255, 255, 255, ${isLightMode ? 1 : 0.5})`;
			
			// A: Regular Moonlight
			currentSunShadow = `${specularHighlight}, ${reflectedSpecular}, 0 5px 20px -10px rgba(0, 0, 0, 0.2)`;

			// B: Strong Moonlight (Same geometry, higher opacity)
			const strongSpecular = `inset ${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px 1px -0.5px rgba(255, 255, 255, 1)`;
			const strongReflectedSpecular = `inset ${-offsetX.toFixed(2)}px ${-offsetY.toFixed(2)}px 1px -0.5px rgba(255, 255, 255, 1)`;
							
			currentSunShadowStrong = `${strongSpecular}, ${strongReflectedSpecular}, 0 5px 20px -10px rgba(0, 0, 0, 0.2)`;
		}
	}
	
	// Apply to the main page by setting the CSS variables and broadcast to iframes
	document.body.style.setProperty('--sun-shadow', currentSunShadow);
	document.body.style.setProperty('--sun-shadow-strong', currentSunShadowStrong);
	broadcastSunUpdate();
}

const originalUpdateSunEffect = updateSunEffect;
updateSunEffect = function() {
    originalUpdateSunEffect(); // Run original shadow calculation
    
    // Add our update hook (Method name updated to match new Three.js manager)
    if (EnvironmentManager.active && typeof EnvironmentManager.updateSunCycle === 'function') {
        EnvironmentManager.updateSunCycle();
    }
};

/**
 * Sends the updated sun shadow value to all active Gurapp iframes.
 */
function broadcastSunUpdate() {
    const iframes = document.querySelectorAll('iframe[data-gurasuraisu-iframe]');
    iframes.forEach(iframe => {
        if (iframe.contentWindow) {
            const targetOrigin = getOriginFromUrl(iframe.src);
            iframe.contentWindow.postMessage({
                type: 'sunUpdate',
                shadow: currentSunShadow,
                shadowStrong: currentSunShadowStrong
            }, targetOrigin);
        }
    });
}

const EnvironmentManager = {
    active: false,
    app: null, 
    weatherType: 'clear', 
    
    async init() {
        if (this.app) return;

        try {
            console.log("[Env] Booting Physics-Based Sky...");
            
            const THREE = await import('three');
            const { createNoise3D } = await import('https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/+esm');

            const container = document.getElementById('environment-layer');

            // 1. SCENE SETUP
            const scene = new THREE.Scene();
            // Create a camera with a wide field of view
            const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 50000); 
            camera.position.set(0, 50, 200);
            camera.lookAt(0, 300, 0); 

            // IMPORTANT: setClearColor alpha to 0 for transparency
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0); // Transparent background
            container.appendChild(renderer.domElement);

            // 2. REMOVED SKY MESH (Fixed gray screen issue)
            // The Sky mesh is opaque and blocks the wallpaper. We will simulate sky color
            // via the HTML #time-of-day-overlay and lighting.

            // 3. LIGHTING (Reacts to SunCalc)
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6); 
            scene.add(hemiLight);

            const sunLight = new THREE.DirectionalLight(0xffffff, 1);
            scene.add(sunLight);

            // 4. CLOUD SYSTEM
            const noise3D = createNoise3D();
            const cloudTexture = this.generateCloudTexture(THREE, noise3D);
            
            // Volumetric Cloud Shader
            const cloudMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uMap: { value: cloudTexture },
                    uSunPosition: { value: new THREE.Vector3(0, 1, 0) },
                    uTime: { value: 0 },
                    uCloudColor: { value: new THREE.Color(0xffffff) }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vWorldPosition;
                    void main() {
                        vUv = uv;
                        vec4 worldPos = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPos.xyz;
                        gl_Position = projectionMatrix * viewMatrix * worldPos;
                    }
                `,
                fragmentShader: `
                    uniform sampler2D uMap;
                    uniform vec3 uSunPosition;
                    uniform vec3 uCloudColor;
                    varying vec2 vUv;
                    varying vec3 vWorldPosition;

                    void main() {
                        vec4 texColor = texture2D(uMap, vUv);
                        if(texColor.a < 0.01) discard; // Hard cut for performance
                        
                        // Lighting Calculation
                        vec3 sunDir = normalize(uSunPosition);
                        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                        
                        // "Silver Lining" effect (Backlighting)
                        float sunViewDot = max(0.0, dot(sunDir, viewDir));
                        float rim = pow(sunViewDot, 12.0) * 4.0; // Sharp bright rim
                        
                        // Diffuse lighting (Day vs Night darkness)
                        float lightStrength = max(0.3, sunDir.y); // Darker base at night
                        vec3 finalColor = uCloudColor * (lightStrength + rim * 0.5);

                        // Output color with Rim light alpha boost
                        gl_FragColor = vec4(finalColor, texColor.a * (0.6 + rim * 0.4));
                    }
                `,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            const clouds = [];
            const cloudGeometry = new THREE.PlaneGeometry(1000, 500);
            
            // Create Cloud Banks
            for(let i=0; i<15; i++) {
                const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
                // Distribute in a semi-circle horizon
                cloud.position.x = (Math.random() - 0.5) * 4000;
                cloud.position.y = Math.random() * 400 + 300; 
                cloud.position.z = -1500 - Math.random() * 1000; 
                
                cloud.scale.setScalar(Math.random() * 2 + 1);
                cloud.lookAt(0, 0, 0); // Face center
                
                cloud.userData = { speed: Math.random() * 2 + 0.5 };
                clouds.push(cloud);
                scene.add(cloud);
            }

            // 5. STORE STATE
            this.app = { 
                THREE, renderer, scene, camera, 
                sunLight, hemiLight, clouds, cloudMaterial, 
                sunPosition: new THREE.Vector3() 
            };

            this.initPrecipitation(THREE, scene);

            this.active = true;
            this.updateSunCycle();
            this.updateWeatherEffect(); // Initial check
            this.startLoop();

            window.addEventListener('resize', this.onResize.bind(this));

        } catch (e) {
            console.error("Three.js init failed:", e);
        }
    },

	destroy() {
        if (this.app) {
            // Deep dispose WebGL Resources to prevent massive VRAM memory leak
            this.app.scene.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });

            // Cleanup WebGL context
            this.app.renderer.dispose();
            this.app.renderer.domElement.remove();
            
            // Reset Overlay
            const overlay = document.getElementById('time-of-day-overlay');
            if(overlay) {
                overlay.style.backgroundColor = 'transparent';
                overlay.style.opacity = 0;
            }
            this.app = null;
        }
        this.active = false;
        document.body.classList.remove('heavy-weather');
        window.removeEventListener('resize', this.onResize);
    },

    generateCloudTexture(THREE, noise3D) {
        const size = 256; // Reduced texture size for perf
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        const cx = size / 2;
        const cy = size / 2;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Circular falloff
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const alpha = Math.max(0, 1 - (dist / (size * 0.45))); // Soft edge

                if (alpha > 0) {
                    const scale = 0.02;
                    // FBM Noise
                    let n = noise3D(x * scale, y * scale, 0);
                    n += 0.5 * noise3D(x * scale * 2, y * scale * 2, 10);
                    
                    const c = Math.floor(Math.max(0, n + 0.5) * 255); // Cloud whiteness
                    
                    const cell = (x + y * size) * 4;
                    data[cell] = 255;
                    data[cell + 1] = 255;
                    data[cell + 2] = 255;
                    data[cell + 3] = c * alpha; 
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        return tex;
    },

    initPrecipitation(THREE, scene) {
        const geometry = new THREE.BufferGeometry();
        const count = 4000;
        const positions = [];

        for (let i = 0; i < count; i++) {
            positions.push((Math.random() - 0.5) * 3000); // X
            positions.push(Math.random() * 2000);         // Y
            positions.push((Math.random() - 0.5) * 1500 - 500); // Z
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        this.rainMat = new THREE.PointsMaterial({
            color: 0xaaaaaa, size: 3, transparent: true, opacity: 0.8,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        
        this.snowMat = new THREE.PointsMaterial({
            color: 0xffffff, size: 6, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false
        });

        // Initialize System attached to app
        this.app.precipSystem = new THREE.Points(geometry, this.rainMat);
        this.app.precipSystem.visible = false;
        scene.add(this.app.precipSystem);
    },

    updateSunCycle() {
        if (!this.app) return;
        
        const now = new Date();
        
        // Calculate approximate longitude from browser time offset (15 degrees per hour)
        // getTimezoneOffset is positive for West (behind UTC), negative for East.
        // Longitude: West is negative, East is positive.
        const timeOffset = now.getTimezoneOffset(); // in minutes
        const lon = (timeOffset / 60) * -15; 

        // Estimate Latitude from Timezone Region string (Approximation for sun angle)
        let lat = 40; // Default to mid-northern (Europe/US/Asia)
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) {
                if (tz.startsWith('Australia') || tz.startsWith('Africa/South') || tz.includes('Sao_Paulo') || tz.includes('Argentina')) {
                    lat = -30; // Southern Hemisphere
                } else if (tz.startsWith('Africa')) {
                    lat = 0; // Equator
                }
            }
        } catch(e) {}
        
        // SunCalc to get physical position
        const sunPos = SunCalc.getPosition(now, lat, lon);
        const phi = Math.PI / 2 - sunPos.altitude;
        const theta = sunPos.azimuth;

        // Convert to Vector3
        const r = 5000;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        const sunVec = new this.app.THREE.Vector3(x, y, z);
        this.app.sunPosition.copy(sunVec);

        // Update Scene Lighting
        const sunNorm = sunVec.clone().normalize();
        this.app.sunLight.position.copy(sunNorm);
        
        // Update Cloud Shader
        if (this.app.cloudMaterial) {
            this.app.cloudMaterial.uniforms['uSunPosition'].value.copy(sunNorm);
        }

        // HTML Overlay Tint (Day/Night cycle on the 2D background)
        const elevation = sunPos.altitude * (180/Math.PI);
        const overlay = document.getElementById('time-of-day-overlay');
        
        // Colors for HTML overlay (The background behind clouds)
        if (elevation < -6) { // Deep Night
            overlay.style.backgroundColor = '#000022'; 
            overlay.style.opacity = 0.5;
            this.app.hemiLight.intensity = 0.1; 
            this.app.sunLight.intensity = 0.0;
            this.app.cloudMaterial.uniforms['uCloudColor'].value.setHex(0x112233);
        } else if (elevation < 0) { // Civil Twilight (Dusk/Dawn)
            overlay.style.backgroundColor = '#441133';
            overlay.style.opacity = 0.3;
            this.app.hemiLight.intensity = 0.3;
            this.app.sunLight.intensity = 0.2;
            this.app.cloudMaterial.uniforms['uCloudColor'].value.setHex(0x664455);
        } else if (elevation < 15) { // Golden Hour
            overlay.style.backgroundColor = '#ff6600';
            overlay.style.opacity = 0.25;
            this.app.hemiLight.intensity = 0.6;
            this.app.sunLight.intensity = 0.8;
            this.app.cloudMaterial.uniforms['uCloudColor'].value.setHex(0xffaa88); 
        } else { // Day
            overlay.style.backgroundColor = '#ffffff';
            overlay.style.opacity = 0;
            this.app.hemiLight.intensity = 1.0;
            this.app.sunLight.intensity = 1.2;
            this.app.cloudMaterial.uniforms['uCloudColor'].value.setHex(0xffffff); 
        }
    },

	async updateWeatherEffect() {
        if (!this.app || !this.app.precipSystem) return;
        
        const saved = await SwapManager.get('lastWeatherData');
        let code = 0;
        if(saved) try{code=saved.current.weathercode}catch(e){}

        // Map Codes
        const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
        const isSnow = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
        // Force clouds if precipitating or code says cloudy
        const isClouds = (code >= 1 && code <= 48) || isRain || isSnow;

        // Apply
        this.app.clouds.forEach(c => c.visible = isClouds);
        
        this.app.precipSystem.visible = (isRain || isSnow);
        if (isRain) {
            this.app.precipSystem.material = this.rainMat;
            this.weatherType = 'rain';
        } else if (isSnow) {
            this.app.precipSystem.material = this.snowMat;
            this.weatherType = 'snow';
        } else {
            this.weatherType = isClouds ? 'clouds' : 'clear';
        }
        
        document.body.classList.toggle('heavy-weather', isRain || isSnow);
    },

    onResize() {
        if (!this.app) return;
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            if (!this.app) return;
            this.app.camera.aspect = window.innerWidth / window.innerHeight;
            this.app.camera.updateProjectionMatrix();
            this.app.renderer.setSize(window.innerWidth, window.innerHeight);
        }, 100); // 100ms debounce
    },

	startLoop() {
        const loop = () => {
            if (!this.active || !this.app) return;
            requestAnimationFrame(loop);

            // Suspend 3D rendering and physics math when obscured by an app, when in blackout (sleep) mode, or when the browser tab is hidden.
            const isObscured = document.hidden || window.isAppOpen || document.body.classList.contains('blackout-active');
            if (isObscured) return;

            const { renderer, scene, camera, cloudMaterial, precipSystem, clouds } = this.app;
            
            // Cloud Shader Time
            if(cloudMaterial) cloudMaterial.uniforms['uTime'].value += 0.005;

            // Animate Cloud Movement
            clouds.forEach(c => {
                if(c.visible) {
                    c.position.x -= c.userData.speed; 
                    if (c.position.x < -3000) c.position.x = 3000; // Loop
                }
            });

            // Animate Rain/Snow
            if (precipSystem && precipSystem.visible) {
                const pos = precipSystem.geometry.attributes.position.array;
                const isRain = this.weatherType === 'rain';
                const speed = isRain ? 15 : 2;

                for(let i=1; i<pos.length; i+=3) {
                    pos[i] -= speed; // Fall Down
                    
                    // Simple wind wiggle for snow
                    if (!isRain) pos[i-1] -= Math.sin(Date.now()*0.002 + i) * 0.2;

                    // Reset when below screen
                    if (pos[i] < -200) {
                        pos[i] = 1000;
                        pos[i-1] = (Math.random()-0.5)*3000;
                    }
                }
                precipSystem.geometry.attributes.position.needsUpdate = true;
            }

            renderer.render(scene, camera);
        };
        loop();
        
        // Refresh sun pos every 60s
        setInterval(() => this.updateSunCycle(), 60000);
    }
};

let skippedDepthWallpapers = new Set(); // Tracks wallpapers user declined to process

// Depth Effect
async function processCurrentWallpaperDepth() {
    const currentWallpaper = recentWallpapers[currentWallpaperPosition];
    
    // Basic validation
    if (!currentWallpaper || currentWallpaper.isVideo || currentWallpaper.isSlideshow) {
        const depthLayer = document.getElementById('depth-layer');
        if(depthLayer) depthLayer.style.opacity = '0';
        return;
    }

    // Check if user enabled it
    if (!currentWallpaper.depthEnabled) {
         const depthLayer = document.getElementById('depth-layer');
         if(depthLayer) depthLayer.style.opacity = '0';
         return;
    }

    try {
        const dbRecord = await getWallpaper(currentWallpaper.id);
        if (!dbRecord) return;
        
        // 1. Check for cached Data URL (Fast Path)
        if (dbRecord.depthDataUrl) {
            console.log("[Depth] Loaded from IDB cache.");
            applyDepthLayer(dbRecord.depthDataUrl); // Pass string directly
            return;
        }

		// --- NEW: Session Skip Check ---
        if (skippedDepthWallpapers.has(currentWallpaper.id)) {
            console.log("[Depth] Skipped by user for this session.");
            // Visually uncheck to reflect status
            const sw = document.getElementById('depth-effect-switch');
            if(sw) sw.checked = false;
            return;
        }
		
        // --- NEW: Confirmation Dialog ---
        // We use showCustomConfirm because it returns a Promise<boolean>
        const confirmed = await showCustomConfirm(
            'Analyzing wallpaper may slow down your device for a moment. Continue anyway?',
        );
		
		if (!confirmed) {
            // User clicked No: Add to skip list
            skippedDepthWallpapers.add(currentWallpaper.id);
            
            // Turn off the switch visually
            const sw = document.getElementById('depth-effect-switch');
            if(sw) sw.checked = false;
            
            // Update memory object so it doesn't try again immediately on resize/reload
            currentWallpaper.depthEnabled = false;
            return;
        }

		// Continue (Only runs if confirmed)
		
        // 2. Prepare Image Source as Blob
        let imageBlob;
        if (dbRecord.blob) {
            imageBlob = dbRecord.blob;
        } else if (dbRecord.dataUrl) {
            imageBlob = dataURLtoBlob(dbRecord.dataUrl);
        } else {
            throw new Error("No image source");
        }

        // 3. Create Inline Module Worker
        // We use type="module" to support 'import'
        const workerCode = `
            import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
            
            self.onmessage = async function(e) {
                try {
                    const blob = await removeBackground(e.data, {
                        progress: (key, current, total) => {
                            // Optional progress tracking
                        }
                    });
                    self.postMessage({ type: 'success', blob: blob });
                } catch (error) {
                    self.postMessage({ type: 'error', message: error.toString() });
                }
            };
        `;

        const workerBlob = new Blob([workerCode], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(workerBlob);
        
        // IMPORTANT: { type: "module" } enables imports in the worker
        const worker = new Worker(workerUrl, { type: "module" });

        // 4. Handle Worker Communication
        const resultBlob = await new Promise((resolve, reject) => {
            worker.onmessage = function(e) {
                if (e.data.type === 'success') {
                    resolve(e.data.blob);
                } else {
                    reject(new Error(e.data.message));
                }
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            };
            
            worker.onerror = function(e) {
                reject(new Error("Worker Error: " + e.message));
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
            };

            showNotification('Generating depth', { icon: 'auto_awesome' });
            
            // Send data to worker
            worker.postMessage(imageBlob);
        });

        // 5. Compress and Save (Back on Main Thread)
        console.log("[Depth] Compressing result...");
        const compressedDataUrl = await blobToCompressedWebP(resultBlob);
        
        dbRecord.depthDataUrl = compressedDataUrl;
        dbRecord.depthEnabled = true; 
        
        await storeWallpaper(currentWallpaper.id, dbRecord);
        console.log("[Depth] Saved to IDB.");

        // 6. Apply
        applyDepthLayer(compressedDataUrl);
        showNotification('Task completed', { icon: 'auto_awesome' });

    } catch (error) {
        console.error("Depth effect failed:", error);
        showNotification('Failed to complete', { icon: 'auto_awesome' });
        
        currentWallpaper.depthEnabled = false;
        saveRecentWallpapers();
        const sw = document.getElementById('depth-effect-switch');
        if(sw) sw.checked = false;
        
        const depthLayer = document.getElementById('depth-layer');
        if(depthLayer) depthLayer.style.opacity = '0';
    }
}

function applyDepthLayer(source) {
    const depthLayer = document.getElementById('depth-layer');
    if (!depthLayer) return;

    let url = source;
    
    // If it's a Blob (legacy check), create URL. If string (DataURL), use as is.
    if (source instanceof Blob) {
        url = URL.createObjectURL(source);
    }
    
    // Clean up previous blob URL if it exists
    if (depthLayer.dataset.url && depthLayer.dataset.url.startsWith('blob:')) {
        URL.revokeObjectURL(depthLayer.dataset.url);
    }

    depthLayer.style.backgroundImage = `url('${url}')`;
    depthLayer.dataset.url = url; // Store for reference/cleanup
    depthLayer.style.opacity = '1';
}
