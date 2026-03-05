const secondsSwitch = document.getElementById('seconds-switch');
const weatherSwitch = document.getElementById('weather-switch');
let showSeconds = localStorage.getItem('showSeconds') !== 'false'; // defaults to true
let showWeather = localStorage.getItem('showWeather') !== 'false'; // defaults to true
secondsSwitch.checked = showSeconds;
let use12HourFormat = localStorage.getItem('use12HourFormat') === 'true'; // Default to 24-hour format if not set
const hourFormatSwitch = document.getElementById('hour-switch');
hourFormatSwitch.checked = use12HourFormat; // Initialize the switch state
const clockElement = document.getElementById('clock');
const weatherWidget = document.getElementById('weather');
const dateElement = document.getElementById('date');

function applyAlignment(alignment) {
    const container = document.querySelector('.container');
    if (!container) return;
    // Remove all possible alignment classes
    container.classList.remove('align-left', 'align-center', 'align-right');
    if (alignment === 'left' || alignment === 'right') {
        container.classList.add(`align-${alignment}`);
    }
}

// Name the listener for clarity
function handleHourFormatChange() {
    use12HourFormat = this.checked;
    const value = use12HourFormat.toString();
    localStorage.setItem('use12HourFormat', value);
    broadcastSettingUpdate('use12HourFormat', value);
    updateClockAndDate();
}
hourFormatSwitch.addEventListener('change', handleHourFormatChange);

// Function to get current time in 24-hour format (HH:MM:SS)
function getCurrentTime24() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// DOM Cache for the clock loop to prevent 10 DOM queries every second
const clockCache = { elements: {} };
function getCachedElement(id, selector = false) {
    if (!clockCache.elements[id] || !document.body.contains(clockCache.elements[id])) {
        clockCache.elements[id] = selector ? document.querySelector(id) : document.getElementById(id);
    }
    return clockCache.elements[id];
}

function updateClockAndDate() {
    const clockElement = getCachedElement('clock');
    const dateElement = getCachedElement('date');
    const modalTitle = getCachedElement('#customizeModal h3', true);
    if (!clockElement || !dateElement) return;

    const fontSelect = getCachedElement('font-select');
    const roundnessSlider = getCachedElement('roundness-slider');
    const hourSwitch = getCachedElement('hour-switch');
    const clockFormatInput = getCachedElement('clock-format-input');
    const dateFormatInput = getCachedElement('date-format-input');

	const now = moment();

    // Prevent empty strings from causing ISO date flashes during boot
    let clockFormat = (clockFormatInput && clockFormatInput.value) ? clockFormatInput.value : (localStorage.getItem('use12HourFormat') === 'true' ? 'h:mm:ss A' : 'HH:mm:ss');
    let dateFormat = (dateFormatInput && dateFormatInput.value) ? dateFormatInput.value : (localStorage.getItem('dateFormat') || 'dddd, MMMM D');

    if (window.isBlackoutActive) {
        clockFormat = clockFormat.replace(/[:.]ss/, '').replace(/ss/, '');
    }

    // Handle literal text escaping (convert ```text``` to [text] for moment.js)
    if (clockFormat) clockFormat = clockFormat.replace(/```(.*?)```/g, '[$1]');
    if (dateFormat) dateFormat = dateFormat.replace(/```(.*?)```/g, '[$1]');

    const timeString = now.format(clockFormat);
    const formattedDate = now.format(dateFormat);
    
    // Condition for special AM/PM font
    const useOpenRundeForAmPm = hourSwitch && hourSwitch.checked && 
                                fontSelect && fontSelect.value === 'Inter' && 
                                roundnessSlider && parseInt(roundnessSlider.value, 10) > 0;
    
    function wrapDigits(timeString) {
        return timeString.split('').map(char => {
            if (/\d/.test(char)) {
                return `<span class="digit">${char}</span>`;
            } else if (char === ':') {
                return `<span class="colon">${char}</span>`;
            }
            // Also wrap other separators for custom formats
            if (/[.,]/.test(char)) return `<span class="separator">${char}</span>`;
            return char;
        }).join('');
    }

    function wrapTime(fullTimeStr) {
        const amPmMatch = fullTimeStr.match(/\s?(am|pm)$/i);
        const timeOnly = amPmMatch ? fullTimeStr.substring(0, amPmMatch.index) : fullTimeStr;
        const period = amPmMatch ? amPmMatch[0] : '';
        
        let wrappedTime = wrapDigits(timeOnly);

        if (period) {
            const periodStyle = useOpenRundeForAmPm ? `style="font-family: 'Open Runde', sans-serif; font-variation-settings: normal; transition: transform 0.3s cubic-bezier(.3,1.2,.64,1), filter 0.3s cubic-bezier(.3,1.2,.64,1), font-size 0.3s cubic-bezier(.3,1.2,.64,1) !important;"` : '';
            wrappedTime += `<span class="period"${periodStyle}>${period}</span>`;
        }
        return wrappedTime;
    }
    
    // Trust recentWallpapers/localStorage during early boot before the switch is populated by JS
    let isStacked = false;
    const stackSwitch = document.getElementById('clock-stack-switch');
    if (window.recentWallpapers && window.recentWallpapers.length > 0 && window.recentWallpapers[window.currentWallpaperPosition]) {
        isStacked = window.recentWallpapers[window.currentWallpaperPosition].clockStyles?.stackEnabled === true;
    } else {
        isStacked = localStorage.getItem('stackEnabled') === 'true';
    }
    
    // If DOM is fully loaded and switch exists, it becomes the source of truth for the UI
    if (stackSwitch && document.readyState === 'complete') {
        isStacked = stackSwitch.checked;
    }
    
    if (isStacked) {
        let html = '';
        
        // Hour
        let hourFormat = clockFormat.match(/[hH]{1,2}/);
        if(hourFormat) html += `<div>${wrapDigits(now.format(hourFormat[0]))}</div>`;

        // Minute
        let minuteFormat = clockFormat.match(/m{1,2}/);
        if(minuteFormat) html += `<div>${wrapDigits(now.format(minuteFormat[0]))}</div>`;
        
        // Second
        let secondFormat = clockFormat.match(/s{1,2}/);
        if(secondFormat) html += `<div>${wrapDigits(now.format(secondFormat[0]))}</div>`;

        // AM/PM Period
        let periodFormat = clockFormat.match(/a|A/);
        if (periodFormat) {
            const amPmText = now.format(periodFormat[0]);
            const amPmHtml = useOpenRundeForAmPm 
                ? `<span style="style="font-family: 'Open Runde', sans-serif; font-variation-settings: normal; transition: transform 0.3s cubic-bezier(.3,1.2,.64,1), filter 0.3s cubic-bezier(.3,1.2,.64,1), font-size 0.3s cubic-bezier(.3,1.2,.64,1) !important;">${amPmText}</span>`
                : amPmText;
            html += `<div>${amPmHtml}</div>`;
        }
        
        clockElement.innerHTML = html;

    } else {
        // Non-stacked mode
        clockElement.innerHTML = wrapTime(timeString);
    }
        
    dateElement.textContent = formattedDate;
    if (modalTitle) modalTitle.textContent = formattedDate;

    // --- FIX to force mask repaint ---
    if (clockElement.classList.contains('glass-effect') || clockElement.classList.contains('dynamic-fill-effect')) {
        const hasGlass = clockElement.classList.contains('glass-effect');
        const hasDynamicFill = clockElement.classList.contains('dynamic-fill-effect');
        clockElement.classList.remove('glass-effect', 'dynamic-fill-effect');
        // Reading offsetHeight is a trick to force the browser to reflow
        void clockElement.offsetHeight; 
        if (hasGlass) clockElement.classList.add('glass-effect');
        if (hasDynamicFill) clockElement.classList.add('dynamic-fill-effect');
    }
}

function startSynchronizedClockAndDate() {
    updateClockAndDate(); 
    
    const now = new Date();
    let delay;
    
    // If we aren't showing seconds (or screen is asleep), sleep the CPU until the next minute starts.
    const isShowingSeconds = typeof showSeconds !== 'undefined' ? showSeconds : true;
    if (isShowingSeconds && !window.isBlackoutActive) {
        delay = 1000 - now.getMilliseconds();
    } else {
        delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    }
    
    // Recursive setTimeout eliminates drift
    setTimeout(startSynchronizedClockAndDate, delay);
}
startSynchronizedClockAndDate();

async function getTimezoneFromCoords(latitude, longitude) {
	try {
		// Use browser's timezone as the primary method
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch (error) {
		console.warn('Failed to get timezone, using UTC:', error);
		return 'UTC';
	}
}

// Helper to calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getTemperatureUnit(country) {
    // Countries that primarily use Fahrenheit
    const fahrenheitCountries = ['US', 'USA', 'United States', 'Liberia', 'Myanmar', 'Burma'];
    
    return fahrenheitCountries.some(c => 
        country?.toLowerCase().includes(c.toLowerCase())
    ) ? 'fahrenheit' : 'celsius';
}

let _activeWeatherPromise = null;
async function fetchLocationAndWeather() {
    // DEDUPLICATION: If a request is already in flight, return that promise.
    // This prevents hammering the API during boot or multi-widget refreshes.
    if (_activeWeatherPromise) return _activeWeatherPromise;

    _activeWeatherPromise = new Promise((resolve, reject) => {
        const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
        if (disabledSys.includes('Location')) {
            console.warn("[System] Location service disabled by user. Falling back to cache.");
            // Resolve with cached data if available, to gracefully fail without throwing
            SwapManager.get('lastWeatherData').then(cached => {
                if (cached) resolve(cached);
                else reject(new Error('Location Component Disabled'));
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                
                // Timezone
                let timezone = 'UTC';
                try {
                    timezone = await getTimezoneFromCoords(latitude, longitude);
                } catch (e) {
                    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                }

                // --- Geocoding with Caching (Nominatim Policy Compliance) ---
                let city = 'Unknown Location';
                let country = '';
                
                // Retrieve cached geocoding data
                const cachedGeo = (await SwapManager.get('cached_geo_data')) || {};
                const CACHE_RADIUS_KM = 2.0; // Reuse address if within 2km
                
                let useCachedAddress = false;
                if (cachedGeo.latitude && cachedGeo.longitude) {
                    const dist = getDistanceFromLatLonInKm(latitude, longitude, cachedGeo.latitude, cachedGeo.longitude);
                    // Use cache if we haven't moved significantly
                    if (dist < CACHE_RADIUS_KM) {
                        useCachedAddress = true;
                    }
                }

                if (useCachedAddress) {
                    // console.log("[Weather] Using cached address info.");
                    city = cachedGeo.city;
                    country = cachedGeo.country;
                } else {
                    // Fetch new address from Nominatim
                    // Policy: Max 1 req/sec. This app updates weather every 10m, so we are compliant per client.
                    const geocodingUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                    
                    try {
                        const geocodingResponse = await fetch(geocodingUrl);
                        
                        // Handle 425 (Too Early) or 429 (Too Many Requests) gracefully
                        if (geocodingResponse.status === 425 || geocodingResponse.status === 429) {
                            console.warn("[Weather] Geocoding throttled. Using fallback data.");
                            city = cachedGeo.city || 'Unknown Location';
                            country = cachedGeo.country || '';
                        } else if (!geocodingResponse.ok) {
                            throw new Error("Geocoding API error");
						} else {
                            const geocodingData = await geocodingResponse.json();
                            city = geocodingData.address.city ||
                                geocodingData.address.town ||
                                geocodingData.address.village ||
                                'Unknown Location';
                            country = geocodingData.address.country || '';

                            // Update cache
                            SwapManager.set('cached_geo_data', {
                                latitude,
                                longitude,
                                city,
                                country,
                                timestamp: Date.now()
                            });
                        }
                    } catch (geocodingError) {
                        console.warn('Geocoding failed:', geocodingError);
                        // Fallback to cache if available
                        if (cachedGeo.city) {
                            city = cachedGeo.city;
                            country = cachedGeo.country;
                        }
                    }
                }

                // Determine temperature unit based on location
                const temperatureUnit = getTemperatureUnit(country);
                const tempUnitParam = temperatureUnit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '';
                
                const currentWeatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=${encodeURIComponent(timezone)}${tempUnitParam}`;
                const dailyForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,weathercode&timezone=${encodeURIComponent(timezone)}${tempUnitParam}`;
                const hourlyForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode&timezone=${encodeURIComponent(timezone)}${tempUnitParam}`;
                
                const [currentResponse, dailyResponse, hourlyResponse] = await Promise.all([
                    fetch(currentWeatherUrl),
                    fetch(dailyForecastUrl),
                    fetch(hourlyForecastUrl)
                ]);
                
                const currentWeatherData = await currentResponse.json();
                const dailyForecastData = await dailyResponse.json();
                const hourlyForecastData = await hourlyResponse.json();

                const weatherData = {
                    city,
                    country,
                    timezone,
                    temperatureUnit,
                    current: currentWeatherData.current_weather,
                    dailyForecast: dailyForecastData.daily,
                    hourlyForecast: hourlyForecastData.hourly,
                    attribution: "Weather data by Open-Meteo.com, Geocoding by OpenStreetMap"
                };
 
				SwapManager.set('lastWeatherData', weatherData);
                resolve(weatherData);
                
            } catch (error) {
                console.error('Error fetching weather data:', error);
                if (!navigator.onLine) {
                    showPopup(currentLanguage.OFFLINE);
                }
                // Return cached data if available
                const cachedData = await SwapManager.get('lastWeatherData');
                if (cachedData) {
                    resolve(cachedData);
                    return;
                }
                reject(error);
            }
        }, (error) => {
            console.error('Geolocation error:', error);
			reject(error);
        }, {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 300000 // Use hardware-cached location for 5 minutes to reduce re-firing
        });
    }).finally(() => {
        _activeWeatherPromise = null;
    });
    return _activeWeatherPromise;
}

function getDayOfWeek(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function getHourString(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function updateSmallWeather() {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('Weather')) {
        const weatherWidget = document.getElementById('weather');
        if (weatherWidget) weatherWidget.style.display = 'none';
        return;
    }

    const showWeather = localStorage.getItem('showWeather') !== 'false';
    if (!showWeather) return;
    
    try {
        const weatherData = await fetchLocationAndWeather();
        if (!weatherData) throw new Error('Weather data not available');
        
        const temperatureElement = document.getElementById('temperature');
        const weatherIconElement = document.getElementById('weather-icon');
        const weatherInfo = weatherConditions[weatherData.current.weathercode] || { description: 'Unknown', icon: () => '❓' };
        
        document.getElementById('weather').style.display = showWeather ? 'block' : 'none';
        
        // Display temperature with appropriate unit symbol
        const tempUnit = weatherData.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
        temperatureElement.textContent = `${Math.round(weatherData.current.temperature)}${tempUnit}`;
        
        weatherIconElement.className = 'material-symbols-rounded';
        weatherIconElement.textContent = weatherInfo.icon(true);
        weatherIconElement.dataset.weatherCode = weatherData.current.weathercode;
    } catch (error) {
        console.error('Error updating small weather widget:', error);
        document.getElementById('weather').style.display = 'none';
		showDialog({ 
		    type: 'alert', 
		    title: currentLanguage.FAIL_WEATHER 
		});
    }
    updateTitle();
}

// Function to check if it's daytime (between 6:00 and 18:00)
function isDaytime() {
    const hour = new Date().getHours();
    return hour >= 6 && hour <= 18;
}

function isDaytimeForHour(timeString) {
    const hour = new Date(timeString).getHours();
    return hour >= 6 && hour <= 18;
}

// Title weather conditions using emojis
const weatherConditionsForTitle = {
    0: { description: 'Clear Sky', icon: '☀️' },
    1: { description: 'Mainly Clear', icon: '🌤️' },
    2: { description: 'Partly Cloudy', icon: '⛅' },
    3: { description: 'Overcast', icon: '☁️' },
    45: { description: 'Fog', icon: '🌫️' },
    48: { description: 'Depositing Rime Fog', icon: '🌫️' },
    51: { description: 'Light Drizzle', icon: '🌦️' },
    53: { description: 'Moderate Drizzle', icon: '🌦️' },
    55: { description: 'Dense Drizzle', icon: '🌧️' },
    56: { description: 'Light Freezing Drizzle', icon: '🌧️' },
    57: { description: 'Dense Freezing Drizzle', icon: '🌧️' },
    61: { description: 'Slight Rain', icon: '🌧️' },
    63: { description: 'Moderate Rain', icon: '🌧️' },
    65: { description: 'Heavy Rain', icon: '🌧️' },
    66: { description: 'Light Freezing Rain', icon: '🌧️' },
    67: { description: 'Heavy Freezing Rain', icon: '🌧️' },
    71: { description: 'Slight Snow', icon: '🌨️' },
    73: { description: 'Moderate Snow', icon: '❄️' },
    75: { description: 'Heavy Snow', icon: '❄️' },
    77: { description: 'Snow Grains', icon: '❄️' },
    80: { description: 'Slight Showers', icon: '🌦️' },
    81: { description: 'Moderate Showers', icon: '🌧️' },
    82: { description: 'Violent Showers', icon: '⛈️' },
    85: { description: 'Slight Snow Showers', icon: '🌨️' },
    86: { description: 'Heavy Snow Showers', icon: '❄️' },
    95: { description: 'Thunderstorm', icon: '⛈️' },
    96: { description: 'Thunderstorm with Hail', icon: '⛈️' },
    99: { description: 'Heavy Thunderstorm with Hail', icon: '🌩️' }
};

const weatherConditions = {
    0: { 
        description: 'Clear Sky', 
        icon: () => isDaytime() ? 'clear_day' : 'clear_night'
    },
    1: { 
        description: 'Mainly Clear', 
        icon: () => isDaytime() ? 'partly_cloudy_day' : 'partly_cloudy_night'
    },
    2: { 
        description: 'Partly Cloudy', 
        icon: () => isDaytime() ? 'partly_cloudy_day' : 'partly_cloudy_night'
    },
    3: { description: 'Overcast', icon: () => 'cloudy' },
    45: { description: 'Fog', icon: () => 'foggy' },
    48: { description: 'Depositing Rime Fog', icon: () => 'foggy' },
    51: { 
        description: 'Light Drizzle', 
        icon: () => isDaytime() ? 'rainy_light' : 'rainy_light'
    },
    53: { 
        description: 'Moderate Drizzle', 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    55: { 
        description: 'Dense Drizzle', 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    56: { 
        description: 'Light Freezing Drizzle', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    57: { 
        description: 'Dense Freezing Drizzle', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    61: { 
        description: 'Slight Rain', 
        icon: () => isDaytime() ? 'rainy_light' : 'rainy_light'
    },
    63: { 
        description: 'Moderate Rain', 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    65: { 
        description: 'Heavy Rain', 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    66: { 
        description: 'Light Freezing Rain', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    67: { 
        description: 'Heavy Freezing Rain', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    71: { 
        description: 'Slight Snow', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    73: { 
        description: 'Moderate Snow', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    75: { 
        description: 'Heavy Snow', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    77: { 
        description: 'Snow Grains', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    }, 
    80: { 
        description: 'Slight Showers', 
        icon: () => isDaytime() ? 'rainy_light' : 'rainy_light'
    },
    81: { 
        description: 'Moderate Showers', 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    82: { 
        description: 'Violent Showers', 
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    },
    85: { 
        description: 'Slight Snow Showers', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    86: { 
        description: 'Heavy Snow Showers', 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    95: { 
        description: 'Thunderstorm', 
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    },
    96: { 
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    },
    99: { 
        description: 'Heavy Thunderstorm with Hail', 
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    }
};

function updateWeatherVisibility() {
    const weatherWidget = document.getElementById('weather');
    weatherWidget.style.display = showWeather ? 'flex' : 'none';
}

function setupWeatherToggle() {
    const weatherSwitch = document.getElementById('weather-switch');
    if (!weatherSwitch) return;
    
    let showWeather = localStorage.getItem('showWeather') !== 'false';
    
    weatherSwitch.checked = showWeather;
    
    function updateWeatherVisibility() {
        const weatherWidget = document.getElementById('weather');
        if (weatherWidget) {
            weatherWidget.style.display = showWeather ? 'block' : 'none';
        }
        
        // Force title update without weather when weather is hidden
        if (!showWeather) {
            let now = new Date();
            let hours = String(now.getHours()).padStart(2, '0');
            let minutes = String(now.getMinutes()).padStart(2, '0');
            let seconds = String(now.getSeconds()).padStart(2, '0');
            document.title = showSeconds ? 
                `${hours}:${minutes}:${seconds}` : 
                `${hours}:${minutes}`;
        }
    }
    
    weatherSwitch.addEventListener('change', function() {
        showWeather = this.checked;
        localStorage.setItem('showWeather', showWeather);
        updateWeatherVisibility();
        if (showWeather) {
            updateSmallWeather();
        }
        
        // Save to current wallpaper's clock styles
        if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0 && currentWallpaperPosition < recentWallpapers.length) {
            if (!recentWallpapers[currentWallpaperPosition].clockStyles) {
                recentWallpapers[currentWallpaperPosition].clockStyles = {};
            }
            recentWallpapers[currentWallpaperPosition].clockStyles.showWeather = showWeather;
            saveRecentWallpapers();
        }
    });
    
    updateWeatherVisibility();
}

const WeatherAlertManager = {
    activityId: 'sys-weather-alert',
    activeCondition: null, // 'rain', 'storm', 'clouds'

    check(weatherData) {
        if (!weatherData || !weatherData.hourlyForecast) return;

        const hourly = weatherData.hourlyForecast;
        const now = new Date();
        const currentHour = now.getHours();
        const currentIndex = hourly.time.findIndex(t => new Date(t).getHours() === currentHour);

        if (currentIndex === -1) return;

        // Look ahead
        const forecastSlice = hourly.weathercode.slice(currentIndex, currentIndex + 3);
        const currentCode = forecastSlice[0];
        
        const isBad = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
        const isCloudy = (c) => (c >= 1 && c <= 3);
        const isStorm = (c) => (c >= 95);

        let event = null;
        let icon = '';
        let title = '';
        let text = '';

        // 1. Check for incoming events
        const nextBadIndex = forecastSlice.findIndex((c, i) => i > 0 && isBad(c));
        const nextCloudIndex = forecastSlice.findIndex((c, i) => i > 0 && isCloudy(c));

        if (!isBad(currentCode)) {
            if (nextBadIndex !== -1) {
                const code = forecastSlice[nextBadIndex];
                event = 'incoming';
                icon = isStorm(code) ? 'thunderstorm' : 'rainy';
                title = isStorm(code) ? 'Storm coming' : 'Rain coming';
                text = `Expected in ${nextBadIndex}h`;
            } else if (!isCloudy(currentCode) && nextCloudIndex !== -1) {
                event = 'incoming';
                icon = 'cloud';
                title = 'Clouds coming';
                text = `Skies changing in ${nextCloudIndex}h`;
            }
        } 
        // 2. Check for clearing events
        else if (isBad(currentCode)) {
            const nextClearIndex = forecastSlice.findIndex((c, i) => i > 0 && !isBad(c));
            if (nextClearIndex !== -1) {
                event = 'clearing';
                icon = 'wb_sunny';
                title = 'Clearing soon';
                text = `Conditions improving in ${nextClearIndex}h`;
            }
        }

        if (event) {
            this.updateActivity(icon, title, text);
        } else {
            this.stop();
        }
    },

    updateActivity(icon, title, text) {
        // Concise formatting for clockwidget
        const conciseText = text.match(/\d+h/)?.[0] || text;

        const options = {
            activityId: this.activityId,
            url: '/assets/gurapp/intl/liveactivity/weather-alert.html',
            openUrl: 'https://polygol.github.io/weather/index.html',
            homescreen: true,
            icon: icon,
            height: '50px'
        };

        const data = { icon, title, text: conciseText };

        if (!activeLiveActivities[this.activityId]) {
            startLiveActivity('System', options);
            // Slight delay to allow iframe to load before first data push
            setTimeout(() => updateLiveActivity(this.activityId, data), 1000);
        } else {
            updateLiveActivity(this.activityId, data);
        }
    },

	 stop() {
        this.active = false;
        clearTimeout(this.timer);
        stopLiveActivity('sys-slideshow');
    }
};

const originalUpdateSmallWeather = updateSmallWeather;
updateSmallWeather = async function() {
    // Run original (respects showWeather toggle)
    await originalUpdateSmallWeather(); 
    
    // Check for alerts independently of showWeather setting
    fetchLocationAndWeather().then(data => {
        WeatherAlertManager.check(data);
    }).catch(() => {});

    // Add our update hook
    EnvironmentManager.updateWeatherEffect();
};

// Updated helper function to determine if a specific hour is daytime based on timezone
function isDaytimeForHour(timeString, timezone = 'UTC') {
    const date = new Date(timeString);
    const hour = new Date(date.toLocaleString("en-US", {timeZone: timezone})).getHours();
    return hour >= 6 && hour <= 18;
}

function initializeGeolocationFeatures() {
    console.log("Initializing features requiring geolocation permission.");
    updateSunEffect();
    setInterval(updateSunEffect, 10 * 60 * 1000); // Update every 10 minutes
    updateSmallWeather();
    setInterval(updateSmallWeather, 600000); // Update weather every 10 minutes
}

secondsSwitch.addEventListener('change', function() {
    showSeconds = this.checked;
    localStorage.setItem('showSeconds', showSeconds);
    updateClockAndDate();
    
    // Save to current wallpaper's clock styles
    if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0 && currentWallpaperPosition < recentWallpapers.length) {
        if (!recentWallpapers[currentWallpaperPosition].clockStyles) {
            recentWallpapers[currentWallpaperPosition].clockStyles = {};
        }
        recentWallpapers[currentWallpaperPosition].clockStyles.showSeconds = showSeconds;
        saveRecentWallpapers();
    }
});