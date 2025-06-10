let currentLanguage = LANG_EN; // Default to English

function applyLanguage(language) {
    console.log('Applying language:', language);
    document.querySelector('.modal-content h2').innerText = language.CONTROLS;
    document.querySelector('#silent_switch_qc .qc-label').innerText = language.SILENT;
    document.querySelector('#temp_control_qc .qc-label').innerText = language.TONE;
    document.querySelector('#minimal_mode_qc .qc-label').innerText = language.MINIMAL;
    document.querySelector('#light_mode_qc .qc-label').innerText = language.DAYLIGHT;

    // Updating text content without removing icons
    document.querySelector('.weather-settings .cust-label').childNodes[2].textContent = language.WEATHER;
    document.querySelector('.gurapps-optional .cust-label').childNodes[2].textContent = language.GURAPPS;
    document.querySelector('.clock-color-settings .cust-label').childNodes[2].textContent = language.CLOCK_COLOR;
    document.querySelector('.clock-settings .cust-label').childNodes[2].textContent = language.SECONDS;
    document.querySelector('.animation-settings .cust-label').childNodes[2].textContent = language.MOTION;
    document.querySelector('.contrast-settings .cust-label').childNodes[2].textContent = language.CONTRAST;
    document.querySelector('.wallpaper-upload .cust-label').childNodes[2].textContent = language.WALLPAPER;
    document.querySelector('#uploadButton').innerText = language.ADD;
    document.querySelector('.clock-stack-settings .cust-label').childNodes[2].textContent = language.CLOCK_STACK;
    document.querySelector('.font-selection .cust-label').childNodes[2].textContent = language.STYLE;
    document.getElementById('language-label').textContent = language.LANGPICK;
    document.querySelector('.version-info button#versionButton').textContent = language.GET_DOCS;
    document.getElementById('reset-label').textContent = language.RESET;
    document.querySelector('.reset-settings button#resetButton').textContent = language.RESET_BTN;

    // Updating font selection options
    const fontSelect = document.getElementById('font-select');
    fontSelect.querySelector('option[value="Inter"]').textContent = language.DEFAULT;
    fontSelect.querySelector('option[value="Roboto"]').textContent = language.WORK;
    fontSelect.querySelector('option[value="DynaPuff"]').textContent = language.PUFFY;
    fontSelect.querySelector('option[value="DM Serif Display"]').textContent = language.CLASSIC;
    fontSelect.querySelector('option[value="Iansui"]').textContent = language.STROKES;
    fontSelect.querySelector('option[value="JetBrains Mono"]').textContent = language.MONO;
    fontSelect.querySelector('option[value="DotGothic16"]').textContent = language.PIXEL;
    fontSelect.querySelector('option[value="Patrick Hand"]').textContent = language.WRITTEN;
    fontSelect.querySelector('option[value="Rampart One"]').textContent = language.RAISED;
    fontSelect.querySelector('option[value="Doto"]').textContent = language.DOT;
    fontSelect.querySelector('option[value="Nunito"]').textContent = language.ROUND;

    const adjustLabel = document.querySelector('#thermostat-popup .adjust-label');
    if (adjustLabel) {
        adjustLabel.textContent = language.ADJUST;
    }

    // Update checkWords and closeWords
    window.checkWords = language.CHECK_WORDS;
    window.closeWords = language.CLOSE_WORDS;
}

function selectLanguage(languageCode) {
    const languageMap = {
        'EN': LANG_EN,
        'JP': LANG_JP,
        'DE': LANG_DE,
        'FR': LANG_FR,
        'ES': LANG_ES,
        'KO': LANG_KO,
        'ZH': LANG_ZH
    };

    currentLanguage = languageMap[languageCode] || LANG_EN;
    console.log('Selected language code:', languageCode);
    console.log('Current language object:', currentLanguage);

    localStorage.setItem('selectedLanguage', languageCode);
    applyLanguage(currentLanguage);

    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.value = languageCode;
    }
}

function consoleLicense() {
    console.info(currentLanguage.LICENCE);
}

consoleLicense()

function consoleLoaded() {
    console.log(currentLanguage.LOAD_SUCCESS);
}

const secondsSwitch = document.getElementById('seconds-switch');
const appUsage = {};
const weatherSwitch = document.getElementById('weather-switch');
const MAX_RECENT_WALLPAPERS = 10;

let showSeconds = localStorage.getItem('showSeconds') !== 'false'; // defaults to true
let showWeather = localStorage.getItem('showWeather') !== 'false'; // defaults to true
let recentWallpapers = [];
let currentWallpaperPosition = 0;
let isSlideshow = false;
let minimizedEmbeds = {}; // Object to store minimized embeds by URL
let appLastOpened = {};

secondsSwitch.checked = showSeconds;

function loadSavedData() {
    // Load existing data if available
    const savedLastOpened = localStorage.getItem('appLastOpened');
    if (savedLastOpened) {
        appLastOpened = JSON.parse(savedLastOpened);
    }
    
    // Load other existing data as before
    const savedUsage = localStorage.getItem('appUsage');
    if (savedUsage) {
        appUsage = JSON.parse(savedUsage);
    }
}

function saveLastOpenedData() {
    localStorage.setItem('appLastOpened', JSON.stringify(appLastOpened));
}

// IndexedDB setup for video storage
const dbName = "WallpaperDB", storeName = "wallpapers", version = 1, VIDEO_VERSION = "1.0";

function initDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("WallpaperDB", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = event => {
            let db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
    });
}

function checkIfPWA() {
  // Check if the app is running as a PWA (in standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    return false;
  }

  return false;
}

function promptToInstallPWA() {
    if (!localStorage.getItem('pwaPromptShown') && !checkIfPWA()) {
        showPopup(currentLanguage.INSTALL_PROMPT);
        localStorage.setItem('pwaPromptShown', 'true');
    }
}

// Add 12/24 hour format functionality
let use12HourFormat = localStorage.getItem('use12HourFormat') === 'true'; // Default to 24-hour format if not set

// Setup the hour format toggle
const hourFormatSwitch = document.getElementById('hour-switch');
hourFormatSwitch.checked = use12HourFormat; // Initialize the switch state

// Add event listener for the hour format toggle
hourFormatSwitch.addEventListener('change', function() {
  use12HourFormat = this.checked;
  localStorage.setItem('use12HourFormat', use12HourFormat);
  updateClockAndDate(); // Update clock immediately after change
});

// Function to get current time in 24-hour format (HH:MM:SS)
function getCurrentTime24() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

const persistentClock = document.getElementById('persistent-clock');

document.addEventListener('DOMContentLoaded', () => {
    const appDrawer = document.getElementById('app-drawer');
    const persistentClock = document.querySelector('.persistent-clock');
    const customizeModal = document.getElementById('customizeModal');
    
function updatePersistentClock() {
  const isModalOpen = 
    (appDrawer && appDrawer.classList.contains('open')) ||
    document.querySelector('.fullscreen-embed[style*="display: block"]');
    
  if (isModalOpen) {
    const now = new Date();
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    
    let displayHours;
    
    if (use12HourFormat) {
      // 12-hour format without AM/PM
      displayHours = hours % 12 || 12;
      displayHours = String(displayHours).padStart(2, '0');
    } else {
      // 24-hour format
      displayHours = String(hours).padStart(2, '0');
    }
    
    persistentClock.textContent = `${displayHours}:${minutes}`;
  } else {
    persistentClock.innerHTML = '<span class="material-symbols-rounded">page_info</span>';
  }
}
    
    // Make sure we re-attach the click event listener
    persistentClock.addEventListener('click', () => {
	customizeModal.style.display = 'block';
	blurOverlayControls.style.display = 'block';
        setTimeout(() => {
	    customizeModal.classList.add('show');
            blurOverlayControls.classList.add('show');
        }, 10);
    });
    
    // Setup observer to watch for embed visibility changes to update clock immediately
    const embedObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && 
                (mutation.target.classList.contains('fullscreen-embed') || 
                 mutation.target.matches('#app-drawer'))) {
                updatePersistentClock();
            }
        });
    });
    
    // Observe fullscreen-embed style changes
    document.querySelectorAll('.fullscreen-embed').forEach(embed => {
        embedObserver.observe(embed, { attributes: true });
    });
    
    // Also observe app drawer for open/close state changes
    if (appDrawer) {
        embedObserver.observe(appDrawer, { attributes: true });
    }
    
    // Watch for new embed elements being added
    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && // Element node
                        node.classList && 
                        node.classList.contains('fullscreen-embed')) {
                        embedObserver.observe(node, { attributes: true });
                        updatePersistentClock();
                    }
                });
            }
        });
    });
    
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    
    // Update clock
    setInterval(updatePersistentClock, 30000);
    
    // Initial update
    updatePersistentClock();
}); 

// Function to update the document title
function updateTitle() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = String(now.getMinutes()).padStart(2, '0');
  let seconds = String(now.getSeconds()).padStart(2, '0');

  let displayHours;
  let period = '';

  if (use12HourFormat) {
    // 12-hour format
    period = hours >= 12 ? ' PM' : ' AM';
    displayHours = hours % 12 || 12;
    displayHours = String(displayHours).padStart(2, '0');
  } else {
    // 24-hour format
    displayHours = String(hours).padStart(2, '0');
  }

  const timeString = showSeconds ? 
    `${displayHours}:${minutes}:${seconds}${period}` : 
    `${displayHours}:${minutes}${period}`;

  // Check if weather is enabled
  const showWeather = localStorage.getItem('showWeather') !== 'false';

  let weatherString = '';
  if (showWeather) {
    const temperatureElement = document.getElementById('temperature');
    const weatherIconElement = document.getElementById('weather-icon');

    if (temperatureElement && weatherIconElement && weatherIconElement.dataset.weatherCode) {
      const temperature = temperatureElement.textContent.replace('°', '');
      const weatherCode = parseInt(weatherIconElement.dataset.weatherCode);

      if (weatherConditionsForTitle[weatherCode]) {
        weatherString = ` | ${temperature}° ${weatherConditionsForTitle[weatherCode].icon}`;
      }
    }
  }

  document.title = `${timeString}${weatherString}`;
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

// Start an interval to update the title
setInterval(updateTitle, 1000);

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
    weatherWidget.style.display = showWeather ? 'block' : 'none';
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

function updateClockAndDate() {
    let clockElement = document.getElementById('clock');
    let dateElement = document.getElementById('date');
    let modalTitle = document.querySelector('#customizeModal h2');
    
    let now = new Date();
    
    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    
    let displayHours;
    let period = '';
    
    if (use12HourFormat) {
        // 12-hour format
        period = hours >= 12 ? ' PM' : ' AM';
        displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        displayHours = String(displayHours).padStart(2, '0');
    } else {
        // 24-hour format
        displayHours = String(hours).padStart(2, '0');
    }
    
    // Function to wrap each digit in a container for monospacing
    function wrapDigits(timeString) {
        return timeString.split('').map(char => {
            if (/\d/.test(char)) {
                return `<span class="digit">${char}</span>`;
            } else {
                return char;
            }
        }).join('');
    }
    
    // Check if stacked layout is enabled
    const stackSwitch = document.getElementById('clock-stack-switch');
    const isStacked = stackSwitch && stackSwitch.checked;
    
    if (isStacked) {
        // Stacked format: each time component on a new line with digit containers
        if (showSeconds) {
            clockElement.innerHTML = `
                <div>${wrapDigits(displayHours)}</div>
                <div>${wrapDigits(minutes)}</div>
                <div>${wrapDigits(seconds)}</div>
                ${period ? `<div>${period.trim()}</div>` : ''}
            `;
        } else {
            clockElement.innerHTML = `
                <div>${wrapDigits(displayHours)}</div>
                <div>${wrapDigits(minutes)}</div>
                ${period ? `<div>${period.trim()}</div>` : ''}
            `;
        }
    } else {
        // Normal format: standard time display with digit containers
        const timeString = showSeconds ? 
            `${displayHours}:${minutes}:${seconds}${period}` : 
            `${displayHours}:${minutes}${period}`;
        clockElement.innerHTML = wrapDigits(timeString);
    }
        
    let formattedDate = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    dateElement.textContent = formattedDate;
    if (modalTitle) modalTitle.textContent = formattedDate;
}

function startSynchronizedClockAndDate() {
  function scheduleNextUpdate() {
    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();
    
    setTimeout(() => {
      updateClockAndDate();
      
      setInterval(updateClockAndDate, 1000);
    }, msUntilNextSecond);
  }
  
  updateClockAndDate(); // Initial update
  scheduleNextUpdate();
}

        async function getTimezoneFromCoords(latitude, longitude) {
            try {
                // Use browser's timezone as the primary method
                return Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch (error) {
                console.warn('Failed to get timezone, using UTC:', error);
                return 'UTC';
            }
        }

function getTemperatureUnit(country) {
    // Countries that primarily use Fahrenheit
    const fahrenheitCountries = ['US', 'USA', 'United States', 'Liberia', 'Myanmar', 'Burma'];
    
    return fahrenheitCountries.some(c => 
        country?.toLowerCase().includes(c.toLowerCase())
    ) ? 'fahrenheit' : 'celsius';
}

async function fetchLocationAndWeather() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const geocodingUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                let city = 'Unknown Location';
                let country = '';
                let timezone = 'UTC';
                
                try {
                    const geocodingResponse = await fetch(geocodingUrl);
                    const geocodingData = await geocodingResponse.json();
                    city = geocodingData.address.city ||
                        geocodingData.address.town ||
                        geocodingData.address.village ||
                        'Unknown Location';
                    country = geocodingData.address.country || '';
                    
                    // Get timezone based on coordinates
                    timezone = await getTimezoneFromCoords(latitude, longitude);
                } catch (geocodingError) {
                    console.warn('Failed to retrieve location details', geocodingError);
                    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
                    hourlyForecast: hourlyForecastData.hourly
                };
 
                localStorage.setItem('lastWeatherData', JSON.stringify(weatherData));
                resolve(weatherData);
                
            } catch (error) {
                console.error('Error fetching weather data:', error);
                if (!navigator.onLine) {
                    showPopup(currentLanguage.OFFLINE);
                }
                // Return cached data if available
                const cachedData = localStorage.getItem('lastWeatherData');
                if (cachedData) {
                    resolve(JSON.parse(cachedData));
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
            maximumAge: 0
        });
    });
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
        showPopup(currentLanguage.FAIL_WEATHER);
    }
    updateTitle();
}

// Updated helper function to determine if a specific hour is daytime based on timezone
function isDaytimeForHour(timeString, timezone = 'UTC') {
    const date = new Date(timeString);
    const hour = new Date(date.toLocaleString("en-US", {timeZone: timezone})).getHours();
    return hour >= 6 && hour <= 18;
}

const clockElement = document.getElementById('clock');
const weatherWidget = document.getElementById('weather');
const dateElement = document.getElementById('date');
const closeModal = document.getElementById('closeModal');
const blurOverlay = document.getElementById('blurOverlay');

clockElement.addEventListener('click', () => {
    if (!gurappsEnabled) return;
    createFullscreenEmbed('/chronos/index.html');
});

weatherWidget.addEventListener('click', () => {
    if (!gurappsEnabled) return;
    createFullscreenEmbed('/weather/index.html');
});

dateElement.addEventListener('click', () => {
    if (!gurappsEnabled) return;
    createFullscreenEmbed('/fantaskical/index.html');
});

startSynchronizedClockAndDate();
setInterval(updateSmallWeather, 600000);
updateSmallWeather();

function showPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.bottom = '10vh';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.backgroundColor = 'var(--search-background)';
    popup.style.backdropFilter = 'blur(20px)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '20px';
    popup.style.borderRadius = '40px';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '10px';
    popup.style.border = '1px solid var(--glass-border)';
    popup.style.filter = 'none';

    // Check for specific words to determine icon
    const checkWords = window.checkWords || ['updated', 'complete', 'done', 'success', 'completed', 'ready', 'successfully', 'accepted', 'accept', 'yes'];
    const closeWords = window.closeWords || ['failed', 'canceled', 'error', 'failure', 'fail', 'cancel', 'rejected', 'reject', 'not', 'no'];

    let shouldShowIcon = false;
    let iconType = '';
    
    // Check if message contains any of the trigger words
    if (checkWords.some(word => message.toLowerCase().includes(word))) {
        shouldShowIcon = true;
        iconType = 'check';
    } else if (closeWords.some(word => message.toLowerCase().includes(word))) {
        shouldShowIcon = true;
        iconType = 'close';
    }
    
    // Add icon if needed
    if (shouldShowIcon) {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = iconType;
        popup.appendChild(icon);
    }
    
    popup.appendChild(document.createTextNode(message));
    
    // Check if the message is about fullscreen and add a button if it is
    if (message === currentLanguage.NOT_FULLSCREEN) {
        // Clear existing text content since we only want to show the button
        while (popup.firstChild) {
            popup.removeChild(popup.firstChild);
        }
        // Make the popup background invisible
        popup.style.backgroundColor = 'transparent';
        popup.style.backdropFilter = 'none';
        popup.style.padding = '0';
        
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.style.padding = '10px 10px';
        fullscreenBtn.style.borderRadius = '25px';
        fullscreenBtn.style.border = 'var(--glass-border)';
        fullscreenBtn.style.backgroundColor = 'var(--search-background)';
        fullscreenBtn.style.backdropFilter = 'blur(20px)';
        fullscreenBtn.style.color = 'var(--text-color)';
        fullscreenBtn.style.cursor = 'pointer';
        fullscreenBtn.style.display = 'flex';
        fullscreenBtn.style.alignItems = 'center'; // This ensures vertical centering
        fullscreenBtn.style.justifyContent = 'center';
        fullscreenBtn.style.gap = '5px'; // Gap between text and icon
        fullscreenBtn.style.fontFamily = 'Inter, sans-serif';
        fullscreenBtn.style.height = '36px'; // Setting a fixed height helps with centering
        
        // Create the icon element
        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = 'fullscreen';
        icon.style.fontFamily = 'Material Symbols Rounded';
        icon.style.fontSize = '20px';
        icon.style.lineHeight = '1'; // Helps with vertical alignment
        icon.style.display = 'flex'; // Makes the icon behave better for alignment
        icon.style.alignItems = 'center';
    
        // Add the text - use the current language's fullscreen text or fallback to English
	const buttonText = document.createElement('span');
	
	buttonText.textContent = (
	    currentLanguage && 
	    currentLanguage.FULLSCREEN
	) || 'Fullscreen';
	
	buttonText.style.lineHeight = '1';
	
	fullscreenBtn.appendChild(icon);
	fullscreenBtn.appendChild(buttonText);
        
        fullscreenBtn.addEventListener('click', function() {
            goFullscreen();
            
            // Remove the popup after clicking the button
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
        });
        
        popup.appendChild(fullscreenBtn);
    }
    
    popup.classList.add('popup');

    // Get all existing popups
    const existingPopups = document.querySelectorAll('.popup');
    
    // If there are already 2 popups, remove the oldest one
    if (existingPopups.length >= 2) {
        document.body.removeChild(existingPopups[0]);
    }
    // Recalculate positions for all popups
    const remainingPopups = document.querySelectorAll('.popup');
    remainingPopups.forEach((p, index) => {
        p.style.bottom = `calc(10vh + ${index * 80}px)`; // Base at 10vh, with 80px spacing between popups
    });
    // Position the new popup
    popup.style.bottom = `calc(10vh + ${remainingPopups.length * 80}px)`;
    
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.style.opacity = '0';
	popup.style.filter = 'blur(5px)';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
                // Readjust positions of remaining popups
                const remainingPopups = document.querySelectorAll('.popup');
                remainingPopups.forEach((p, index) => {
                    p.style.bottom = `calc(10vh + ${index * 80}px)`;
                });
            }
        }, 500);
    }, 3000);
}

function showNotification(message, options = {}) {
    // Create both an on-screen popup and a persistent notification in the shade
    const popupNotification = createOnScreenPopup(message, options);
    const shadeNotification = addToNotificationShade(message, options);
    
    // Return control methods for both notification types
    return {
        closePopup: popupNotification.close,
        closeShade: shadeNotification.close,
        update: (newMessage) => {
            popupNotification.update(newMessage);
            shadeNotification.update(newMessage);
        }
    };
}

// Creates a temporary on-screen popup (similar to original showPopup)
function createOnScreenPopup(message, options = {}) {
    const popup = document.createElement('div');
    popup.className = 'on-screen-notification';
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.backgroundColor = 'var(--modal-background)';
    popup.style.backdropFilter = 'blur(50px)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '20px';
    popup.style.borderRadius = '20px';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '16px';
    popup.style.border = '1px solid var(--glass-border)';
    
    // Check for specific words to determine icon
    const checkWords = window.checkWords || ['updated', 'complete', 'done', 'success', 'completed', 'ready', 'successfully', 'accepted', 'accept', 'yes'];
    const closeWords = window.closeWords || ['failed', 'canceled', 'error', 'failure', 'fail', 'cancel', 'rejected', 'reject', 'not', 'no'];
    
    let iconType = '';
    if (options.icon) {
        iconType = options.icon;
    } else if (checkWords.some(word => message.toLowerCase().includes(word))) {
        iconType = 'check_circle';
    } else if (closeWords.some(word => message.toLowerCase().includes(word))) {
        iconType = 'error';
    } else {
        iconType = 'info';
    }
    
    // Add icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = iconType;
    popup.appendChild(icon);
    
    // Add message text
    const messageText = document.createElement('div');
    messageText.textContent = message;
    popup.appendChild(messageText);
    
    // Check if a button should be added
    if (options.buttonText) {
        const actionButton = document.createElement('button');
        actionButton.textContent = options.buttonText;
        actionButton.style.marginLeft = '10px';
        actionButton.style.padding = '8px 16px';
        actionButton.style.borderRadius = '18px';
        actionButton.style.border = 'none';
        actionButton.style.backgroundColor = 'var(--accent-color, #0084ff)';
        actionButton.style.color = 'white';
        actionButton.style.cursor = 'pointer';
        
        if (options.buttonAction && typeof options.buttonAction === 'function') {
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                options.buttonAction();
            });
        }
        
        popup.appendChild(actionButton);
    }
    
    // Get all existing popups
    const existingPopups = document.querySelectorAll('.on-screen-notification');
    
    // If there are already 2 popups, remove the oldest one
    if (existingPopups.length >= 2) {
        document.body.removeChild(existingPopups[0]);
    }
    
    // Recalculate positions for all popups
    const remainingPopups = document.querySelectorAll('.on-screen-notification');
    remainingPopups.forEach((p, index) => {
        p.style.top = `${20 + (index * 70)}px`;
    });
    
    // Position the new popup
    popup.style.top = `${20 + (remainingPopups.length * 70)}px`;
    
    document.body.appendChild(popup);
    
    // Auto-dismiss on-screen popup after 10 seconds
    const timeoutId = setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
                // Readjust positions of remaining popups
                const remainingPopups = document.querySelectorAll('.on-screen-notification');
                remainingPopups.forEach((p, index) => {
                    p.style.top = `${20 + (index * 70)}px`;
                });
            }
        }, 500);
    }, 10000);
    
    // Return control methods
    return {
        close: () => {
            clearTimeout(timeoutId);
            popup.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(popup)) {
                    document.body.removeChild(popup);
                    // Readjust positions of remaining popups
                    const remainingPopups = document.querySelectorAll('.on-screen-notification');
                    remainingPopups.forEach((p, index) => {
                        p.style.top = `${20 + (index * 70)}px`;
                    });
                }
            }, 500);
        },
        update: (newMessage) => {
            messageText.textContent = newMessage;
        }
    };
}

// Adds a notification to the notification shade
function addToNotificationShade(message, options = {}) {
    // Get or create notification shade
    let shade = document.querySelector('.notification-shade');
    if (!shade) {
        shade = document.createElement('div');
        shade.className = 'notification-shade';
        shade.style.position = 'fixed';
        shade.style.top = '0';
        shade.style.right = '0';
        shade.style.width = '350px';
        shade.style.maxWidth = '100%';
        shade.style.height = '100%';
        shade.style.overflowY = 'auto';
        shade.style.zIndex = '9999995';
        shade.style.padding = '20px';
        shade.style.pointerEvents = 'none';
        document.body.appendChild(shade);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'shade-notification';
    notification.style.backgroundColor = 'var(--search-background)';
    notification.style.backdropFilter = 'blur(50px)';
    notification.style.color = 'var(--text-color)';
    notification.style.padding = '15px';
    notification.style.borderRadius = '20px';
    notification.style.marginBottom = '15px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(50px)';
    notification.style.display = 'flex';
    notification.style.flexDirection = 'column';
    notification.style.gap = '10px';
    notification.style.border = '1px solid var(--glass-border)';
    notification.style.pointerEvents = 'auto';
    
    // Content container
    const contentContainer = document.createElement('div');
    contentContainer.style.display = 'flex';
    contentContainer.style.alignItems = 'center';
    contentContainer.style.gap = '10px';
    contentContainer.style.width = '100%';
    
    let iconType = 'notifications';
    
    // Create icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = iconType;
    icon.style.fontSize = '24px';
    contentContainer.appendChild(icon);
    
    // Create message text
    const messageText = document.createElement('div');
    messageText.style.flex = '1';
    messageText.style.wordBreak = 'break-word';
    messageText.textContent = message;
    contentContainer.appendChild(messageText);
    
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'material-symbols-rounded';
    closeBtn.textContent = 'close';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.opacity = '0.7';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeNotification(notification);
    });
    closeBtn.style.transition = 'opacity 0.2s';
    closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.opacity = '1';
    });
    closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.opacity = '0.7';
    });
    contentContainer.appendChild(closeBtn);
    
    notification.appendChild(contentContainer);
    
    // Add action button if specified
    if (options.buttonText) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        
        const actionButton = document.createElement('button');
        actionButton.textContent = options.buttonText;
        actionButton.style.padding = '8px 16px';
        actionButton.style.borderRadius = '18px';
        actionButton.style.border = 'none';
        actionButton.style.backgroundColor = 'var(--accent-color, #0084ff)';
        actionButton.style.color = 'white';
        actionButton.style.cursor = 'pointer';
        actionButton.style.fontFamily = 'inherit';
        actionButton.style.fontSize = '14px';
        actionButton.style.transition = 'background-color 0.2s';
        
        actionButton.addEventListener('mouseover', () => {
            actionButton.style.backgroundColor = 'var(--accent-hover-color, #0073e6)';
        });
        
        actionButton.addEventListener('mouseout', () => {
            actionButton.style.backgroundColor = 'var(--accent-color, #0084ff)';
        });
        
        if (options.buttonAction && typeof options.buttonAction === 'function') {
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                options.buttonAction();
                closeNotification(notification);
            });
        }
        
        buttonContainer.appendChild(actionButton);
        notification.appendChild(buttonContainer);
    }
    
    // Add fullscreen button if the message is about fullscreen
    if (message === (currentLanguage && currentLanguage.NOT_FULLSCREEN)) {
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.style.display = 'flex';
        fullscreenBtn.style.alignItems = 'center';
        fullscreenBtn.style.justifyContent = 'center';
        fullscreenBtn.style.gap = '5px';
        fullscreenBtn.style.width = '100%';
        fullscreenBtn.style.padding = '10px';
        fullscreenBtn.style.borderRadius = '18px';
        fullscreenBtn.style.border = 'none';
        fullscreenBtn.style.backgroundColor = 'var(--accent-color, #0084ff)';
        fullscreenBtn.style.color = 'white';
        fullscreenBtn.style.cursor = 'pointer';
        
        const fsIcon = document.createElement('span');
        fsIcon.className = 'material-symbols-rounded';
        fsIcon.textContent = 'fullscreen';
        
        const fsText = document.createElement('span');
        fsText.textContent = (currentLanguage && currentLanguage.FULLSCREEN) || 'Fullscreen';
        
        fullscreenBtn.appendChild(fsIcon);
        fullscreenBtn.appendChild(fsText);
        
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof goFullscreen === 'function') {
                goFullscreen();
            }
            closeNotification(notification);
        });
        
        notification.appendChild(fullscreenBtn);
    }
    
    // Add swipe capability
    let startX = 0;
    let currentX = 0;
    
    notification.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });
    
    notification.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        
        // Only allow right swipe (positive diff)
        if (diff > 0) {
            notification.style.transform = `translateX(${diff}px)`;
            notification.style.opacity = 1 - (diff / 200);
        }
    }, { passive: true });
    
    notification.addEventListener('touchend', () => {
        const diff = currentX - startX;
        if (diff > 100) {
            // Swipe threshold reached, dismiss notification
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (shade.contains(notification)) {
                    shade.removeChild(notification);
                }
            }, 300);
        } else {
            // Reset position
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }
    });
    
    // Add to notification shade
    shade.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 50);
    
    // Function to close a notification
    function closeNotification(notif) {
        // Animate out
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(50px)';
        
        // Remove after animation completes
        setTimeout(() => {
            if (shade.contains(notif)) {
                shade.removeChild(notif);
            }
        }, 300);
    }
    
    // Return object with methods for controlling the notification
    return {
        close: () => closeNotification(notification),
        update: (newMessage) => {
            messageText.textContent = newMessage;
        }
    };
}

function isFullScreen() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

function goFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) { // Firefox
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) { // IE/Edge
        element.msRequestFullscreen();
    }
}

function checkFullscreen() {
  if (!isFullScreen()) {
    showPopup(currentLanguage.NOT_FULLSCREEN);
  }
}

function firstSetup() {
    // Check if it's the first visit
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');

    // Get the selected language, defaulting to 'EN'
    const selectedLanguage = localStorage.getItem('selectedLanguage') || 'EN';
    console.log('First setup: selected language:', selectedLanguage);

    // Select and apply the language
    selectLanguage(selectedLanguage);

    // Show setup screen for first-time users
    if (!hasVisitedBefore) {
        createSetupScreen();
    }

    // Mark that the user has visited before
    localStorage.setItem('hasVisitedBefore', 'true');
}

function createSetupScreen() {
    const setupContainer = document.createElement('div');
    setupContainer.className = 'setup-screen';
    
    const style = document.createElement('style');
    style.textContent = `
        .setup-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--background-color);
            backdrop-filter: blur(50px);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-color);
            transition: opacity 0.5s ease;
        }

        .setup-page {
            max-width: 600px;
            padding: 2rem;
            text-align: center;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
	    max-height: 100vh;
	    overflow: auto;
        }

        .setup-page.active {
            opacity: 1;
            transform: translateY(0);
        }

        .setup-title {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }

        .setup-description {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.8;
        }

        .option-content {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
        }
        
        .option-title {
            font-size: 1.1rem;
            font-weight: 500;
        }
        
        .option-description {
            font-size: 0.9rem;
            opacity: 0.7;
        }

        .setup-option {
            background: var(--search-background);
            border: 2px solid transparent;
            border-radius: 25px;
            padding: 1rem;
            margin: 1rem 0;
            cursor: pointer;
            transition: transform 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .setup-option:hover {
            transform: scale(1.02);
        }

        .setup-buttons {
            margin-top: 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
            font-family: 'Inter', sans-serif;
        }

        .setup-button {
            padding: 0.8rem 2rem;
            border-radius: 25px;
            border: none;
            font-size: 1rem;
            cursor: pointer;
            transition: opacity 0.2s ease;
        }

        .setup-button.primary {
            background: var(--search-background);
            color: var(--text-color);
        }

        .setup-button.secondary {
            background: var(--search-background);
            color: var(--text-color);
        }

        .setup-progress {
            position: fixed;
            bottom: 2rem;
            display: flex;
            gap: 0.5rem;
        }

        .progress-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--text-color);
            opacity: 0.3;
            transition: opacity 0.3s ease;
        }

        .progress-dot.active {
            opacity: 1;
        }

        .setup-option.selected {
            border-color: var(--text-color);
        }

        .setup-option .material-symbols-rounded {
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .setup-option.selected .material-symbols-rounded {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    const setupPages = [
        {
            title: "SETUP_SELECT_LANGUAGE",
            description: "",
	    icon: "language",
            options: [
	        { name: "SETUP_SELECT_LANGUAGE_DESC", default: true },
                { name: "English", value: "EN" },
                { name: "日本語", value: "JP" },
                { name: "Deutsch", value: "DE" },
                { name: "Français", value: "FR" },
                { name: "Español", value: "ES" },
                { name: "한국어", value: "KO" },
                { name: "中文", value: "ZH" }
            ]
        },
        {
            title: "SETUP_HI_THERE",
            description: "",
	    icon: "waving_hand",
            options: []
        },
        {
            title: "SETUP_OPEN_PRIVATE",
            description: "SETUP_OPEN_PRIVATE_DESC",
	    icon: "verified_user", // Add icon
            options: []
        },
        {
            title: "SETUP_ALLOW_PERMISSIONS",
            description: "",
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
            title: "SETUP_CANNIBALIZE",
            description: "",
	    icon: "palette", // Add icon
            options: [
                { name: "SETUP_LIGHT", value: "light" },
                { name: "SETUP_DARK", value: "dark", default: true }
            ]
        },
        {
            title: "SETUP_CLOCK_FORMAT",
            description: "",
	    icon: "schedule", // Add icon
            options: [
                { name: "SETUP_SHOW_SECONDS", value: true, default: true },
                { name: "SETUP_HIDE_SECONDS", value: false }
            ]
        },
        {
            title: "SETUP_SHOW_WEATHER",
            description: "",
	    icon: "partly_cloudy_day", // Add icon
            options: [
                { name: "SETUP_SHOW_WEATHER_TRUE", value: true, default: true },
                { name: "SETUP_SHOW_WEATHER_FALSE", value: false }
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
    ];

    let currentPage = 0;

    function createPage(pageData) {
        const page = document.createElement('div');
        page.className = 'setup-page';
        
        // Add title with icon
        const titleContainer = document.createElement('div'); // Container for icon and title
        titleContainer.style.display = 'flex';
        titleContainer.style.flexDirection = 'column'; // Stack icon and title vertically
        titleContainer.style.alignItems = 'center'; // Center horizontally

        const icon = document.createElement('span');
        icon.className = 'material-symbols-rounded';
        icon.textContent = pageData.icon;
        icon.style.fontSize = '48px'; // Set icon size to 48px
        icon.style.marginBottom = '8px'; // Add some spacing between icon and title

        const title = document.createElement('h1');
        title.className = 'setup-title';
        title.textContent = currentLanguage[pageData.title];

        titleContainer.appendChild(icon);
        titleContainer.appendChild(title);
        page.appendChild(titleContainer);
        
        // Add description
        const description = document.createElement('p');
        description.className = 'setup-description';
        description.textContent = currentLanguage[pageData.description] || "";
        page.appendChild(description);
        
        // Add options
        if (pageData.options.length > 0) {
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
                if (pageData.title === "SETUP_SELECT_LANGUAGE") {
                    optionElement.addEventListener('click', () => {
                        localStorage.setItem('selectedLanguage', option.value);
                        selectLanguage(option.value);
                        updateSetup();
                    });
                } else if (option.permission) {
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
                            case "SETUP_CANNIBALIZE":
                                localStorage.setItem('theme', option.value);
                                document.body.classList.toggle('light-theme', option.value === 'light');
                                break;
                            case "SETUP_CLOCK_FORMAT":
                                localStorage.setItem('showSeconds', option.value);
                                showSeconds = option.value;
                                updateClockAndDate();
                                break;
                            case "SETUP_SHOW_WEATHER":
                                localStorage.setItem('showWeather', option.value);
                                showWeather = option.value;
                                document.getElementById('weather').style.display = option.value ? 'block' : 'none';
                                if (option.value) updateSmallWeather();
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
        nextButton.textContent = currentPage === setupPages.length - 1 ? currentLanguage.SETUP_GET_STARTED : currentLanguage.SETUP_CONTINUE;
        nextButton.addEventListener('click', () => {
            if (currentPage === setupPages.length - 1) {
                // Complete setup
                localStorage.setItem('hasVisitedBefore', 'true');
                setupContainer.style.opacity = '0';
                setTimeout(() => {
                    setupContainer.remove();
                    goFullscreen()
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
                }, 10);
            }, 300);
        } else {
            const newPage = createPage(setupPages[currentPage]);
            setupContainer.appendChild(newPage);
            setTimeout(() => {
                newPage.classList.add('active');
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

const customizeModal = document.getElementById('customizeModal');
const themeSwitch = document.getElementById('theme-switch');
const wallpaperInput = document.getElementById('wallpaperInput');
const uploadButton = document.getElementById('uploadButton');
const SLIDESHOW_INTERVAL = 600000; // 10 minutes in milliseconds
const gurappsSwitch = document.getElementById("gurapps-switch");
const contrastSwitch = document.getElementById('contrast-switch');
const animationSwitch = document.getElementById('animation-switch');
let gurappsEnabled = localStorage.getItem("gurappsEnabled") !== "false";
let slideshowInterval = null;
let currentWallpaperIndex = 0;
let minimalMode = localStorage.getItem('minimalMode') === 'true';

// Theme switching functionality
function setupThemeSwitcher() {
    // Check and set initial theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', currentTheme === 'light');
}

// Load saved preference
const highContrastEnabled = localStorage.getItem('highContrast') === 'true';
contrastSwitch.checked = highContrastEnabled;

// Apply high contrast if enabled (initial state)
if (highContrastEnabled) {
    document.body.classList.add('high-contrast');
}

// Event listener for contrast toggle
contrastSwitch.addEventListener('change', function() {
    const highContrast = this.checked;
    localStorage.setItem('highContrast', highContrast);
    document.body.classList.toggle('high-contrast', highContrast);
});

// Load saved preference (default to true/on if not set)
const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
animationSwitch.checked = animationsEnabled;
// Apply initial state
if (!animationsEnabled) {
    document.body.classList.add('reduce-animations');
}
// Event listener for animation toggle
animationSwitch.addEventListener('change', function() {
    const enableAnimations = this.checked;
    localStorage.setItem('animationsEnabled', enableAnimations);
    document.body.classList.toggle('reduce-animations', !enableAnimations);
    
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
        iframe.contentWindow.postMessage({
            type: 'animationsUpdate',
            enabled: animationsEnabled  // true or false
        }, window.location.origin);
    });
});

// Function to handle Gurapps visibility
function updateGurappsVisibility() {
    const drawerHandle = document.querySelector(".drawer-handle");
    const dock = document.getElementById("dock");
    
    if (gurappsEnabled) {
        // Show Gurapps elements
        if (drawerHandle) drawerHandle.style.display = "block";
        if (dock) dock.classList.remove("permanently-hidden");
        
        // Reset app functionality
        document.body.classList.remove("gurapps-disabled");
    } else {
        // Hide Gurapps elements
        if (drawerHandle) drawerHandle.style.display = "none";
        if (dock) dock.classList.add("permanently-hidden");
        
        // Add class to body for CSS targeting
        document.body.classList.add("gurapps-disabled");
        
        // Close app drawer if open
        if (appDrawer.classList.contains("open")) {
            appDrawer.style.transition = "bottom 0.3s ease";
            appDrawer.style.bottom = "-100%";
            appDrawer.style.opacity = "0";
            appDrawer.classList.remove("open");
            initialDrawerPosition = -100;
        }
    }
}

gurappsSwitch.checked = gurappsEnabled;
gurappsSwitch.addEventListener("change", function() {
    gurappsEnabled = this.checked;
    localStorage.setItem("gurappsEnabled", gurappsEnabled);
    updateGurappsVisibility();
});

function updateMinimalMode() {
    const elementsToHide = [
        document.getElementById('weather'),
        document.querySelector('.info'),
        document.querySelector('.clockwidgets')
    ];
    
    if (minimalMode) {
        // Hide elements
        elementsToHide.forEach(el => {
            if (el) el.style.display = 'none';
        });
        // Add minimal-active class to body for potential CSS styling
        document.body.classList.add('minimal-active');
    } else {
        // Show elements
        if (document.getElementById('weather')) {
            document.getElementById('weather').style.display = 
                localStorage.getItem('showWeather') !== 'false' ? 'block' : 'none';
        }
            
        if (document.querySelector('.info'))
            document.querySelector('.info').style.display = '';
            
        if (document.querySelector('.clockwidgets'))
            document.querySelector('.clockwidgets').style.display = '';
        
        // Remove minimal-active class
        document.body.classList.remove('minimal-active');
    }
}

// Initialize minimal mode on page load
document.addEventListener('DOMContentLoaded', function() {
    updateMinimalMode();
});

// Add a CSS rule for minimal mode
const style = document.createElement('style');
style.textContent = `
    body.minimal-active .drawer-pill,
    body.minimal-active .drawer-handle,
    body.minimal-active #date,
    body.minimal-active .persistent-clock {
        opacity: 0.5;
        transition: opacity 0.3s ease, width 0.3s ease;
    }

    body.minimal-active .blur-overlay {
    	backdrop-filter: blur(50px);
    }
    
    body.minimal-active .clock {
    	font-size: clamp(6rem, 20vw, 20rem);
    }
    
    body.minimal-active .drawer-pill {
        width: 10%;
    }
`;
document.head.appendChild(style);

// Wallpaper upload functionality
uploadButton.addEventListener("click", () => {
    wallpaperInput.click();
});

async function storeWallpaper(key, data) {
    let db = await initDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readwrite");
        let store = transaction.objectStore(storeName);
        let wallpaperData = {
            blob: data.blob || null,
            dataUrl: data.dataUrl || null,
            type: data.type,
            version: "1.0",
            timestamp: Date.now()
        };
        let request = store.put(wallpaperData, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function getWallpaper(key) {
    let db = await initDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readonly");
        let store = transaction.objectStore(storeName);
        let request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function deleteWallpaper(key) {
    let db = await initDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readwrite");
        let store = transaction.objectStore(storeName);
        let request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function storeVideo(videoBlob) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const videoData = {
            blob: videoBlob,
            version: VIDEO_VERSION,
            timestamp: Date.now()
        };
        
        const request = store.put(videoData, 'currentVideo');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function getVideo() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.get('currentVideo');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

wallpaperInput.addEventListener("change", async event => {
    let files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    try {
        if (files.length === 1) {
            localStorage.removeItem("wallpapers");
            clearInterval(slideshowInterval);
            slideshowInterval = null;
            isSlideshow = false;
            
            let file = files[0];
            if (["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "video/mp4"].includes(file.type)) {
                saveWallpaper(file);
            } else {
                showPopup(currentLanguage.WALLPAPER_UPDATE_FAIL);
            }
        } else {
            let processedWallpapers = [];
            for (let file of files) {
                if (["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "video/mp4"].includes(file.type)) {
                    const wallpaperId = `slideshow_${Date.now()}_${Math.random()}`;
                    
                    if (file.type.startsWith("video/")) {
                        await storeWallpaper(wallpaperId, {
                            blob: file,
                            type: file.type
                        });
                        processedWallpapers.push({
                            id: wallpaperId,
                            type: file.type,
                            isVideo: true
                        });
                    } else {
                        let compressedData = await compressMedia(file);
                        await storeWallpaper(wallpaperId, {
                            dataUrl: compressedData,
                            type: file.type
                        });
                        processedWallpapers.push({
                            id: wallpaperId,
                            type: file.type,
                            isVideo: false
                        });
                    }
                }
            }
            
	    if (processedWallpapers.length > 0) {
	        // Get current clock styles for the slideshow
	        const currentClockStyles = {
	            font: localStorage.getItem('clockFont') || 'Inter',
	            weight: localStorage.getItem('clockWeight') || '700',
	            color: localStorage.getItem('clockColor') || getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff',
	            colorEnabled: localStorage.getItem('clockColorEnabled') === 'true'
	        };
	    
	        localStorage.setItem("wallpapers", JSON.stringify(processedWallpapers));
	        currentWallpaperIndex = 0;
	        isSlideshow = true;
	    
	        recentWallpapers.unshift({
	            isSlideshow: true,
	            timestamp: Date.now(),
	            clockStyles: currentClockStyles // Store clock styles for slideshow
	        });
                
                while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
                    recentWallpapers.pop();
                }
                
                saveRecentWallpapers();
                currentWallpaperPosition = 0;
                applyWallpaper();
                showPopup(currentLanguage.MULTIPLE_WALLPAPERS_UPDATED);
            } else {
                showPopup(currentLanguage.NO_VALID_WALLPAPERS);
            }
        }
    } catch (error) {
        console.error("Error handling wallpapers:", error);
        showPopup(currentLanguage.WALLPAPER_SAVE_FAIL);
    }
});

// Function to check storage availability
function checkStorageQuota(data) {
    try {
        localStorage.setItem('quotaTest', data);
        localStorage.removeItem('quotaTest');
        return true;
    } catch (e) {
        return false;
    }
}

// Compression utility function
async function compressMedia(file) {
    if (file.type.startsWith("image/")) {
        return new Promise((resolve) => {
            let img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                let canvas = document.createElement("canvas");
                let ctx = canvas.getContext("2d");
                let { width, height } = img;
                
                // Higher resolution limit for better quality
                const maxDimension = 2560;
                if (width > height && width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Use WEBP with higher quality (0.85 instead of 0.7)
                let dataUrl = canvas.toDataURL("image/webp", 0.85);
                
                // Fallback to JPEG if WEBP is not supported
                if (dataUrl.indexOf("data:image/webp") !== 0) {
                    dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                }
                
                URL.revokeObjectURL(img.src);
                resolve(dataUrl);
            };
        });
    }
    
    if (file.type.startsWith("video/")) {
        return URL.createObjectURL(file);
    }
    
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.readAsDataURL(file);
    });
}

async function saveWallpaper(file) {
    try {
        const wallpaperId = `wallpaper_${Date.now()}`;
        
        // Get current clock styles
        const currentClockStyles = {
            font: localStorage.getItem('clockFont') || 'Inter',
            weight: localStorage.getItem('clockWeight') || '700',
            color: localStorage.getItem('clockColor') || getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff',
            colorEnabled: localStorage.getItem('clockColorEnabled') === 'true'
        };
        
        if (file.type.startsWith("video/")) {
            await storeWallpaper(wallpaperId, {
                blob: file,
                type: file.type
            });
            recentWallpapers.unshift({
                id: wallpaperId,
                type: file.type,
                isVideo: true,
                timestamp: Date.now(),
                clockStyles: currentClockStyles // Store current clock styles
            });
        } else {
            let compressedData = await compressMedia(file);
            await storeWallpaper(wallpaperId, {
                dataUrl: compressedData,
                type: file.type
            });
            recentWallpapers.unshift({
                id: wallpaperId,
                type: file.type,
                isVideo: false,
                timestamp: Date.now(),
                clockStyles: currentClockStyles // Store current clock styles
            });
        }
        
        isSlideshow = false;
        localStorage.removeItem("wallpapers");
        
        // Clean up old wallpapers from IndexedDB
        while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
            let removedWallpaper = recentWallpapers.pop();
            if (removedWallpaper.id) {
                await deleteWallpaper(removedWallpaper.id);
            }
        }
        
        saveRecentWallpapers();
        currentWallpaperPosition = 0;
        applyWallpaper();
        showPopup(currentLanguage.WALLPAPER_UPDATED);
    } catch (error) {
        console.error("Error saving wallpaper:", error);
        showPopup(currentLanguage.WALLPAPER_SAVE_FAIL);
    }
}

async function applyWallpaper() {
    let slideshowWallpapers = JSON.parse(localStorage.getItem("wallpapers"));
    if (slideshowWallpapers && slideshowWallpapers.length > 0) {
        async function displaySlideshow() {
            let wallpaper = slideshowWallpapers[currentWallpaperIndex];
            try {
                if (wallpaper.isVideo) {
                    let videoData = await getWallpaper(wallpaper.id);
                    if (videoData && videoData.blob) {
                        let existingVideo = document.querySelector("#background-video");
                        if (existingVideo) {
                            URL.revokeObjectURL(existingVideo.src);
                            existingVideo.remove();
                        }
                        
                        let video = document.createElement("video");
                        video.id = "background-video";
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.style.position = "fixed";
                        video.style.minWidth = "100%";
                        video.style.minHeight = "100%";
                        video.style.width = "auto";
                        video.style.height = "auto";
                        video.style.zIndex = "-1";
                        video.style.objectFit = "cover";
                        
                        let videoUrl = URL.createObjectURL(videoData.blob);
                        video.src = videoUrl;
                        video.onerror = error => {
                            console.error("Video loading error:", error);
                        };
                        video.onloadeddata = () => {
                            document.body.insertBefore(video, document.body.firstChild);
                            document.body.style.backgroundImage = "none";
                        };
                        video.load();
                    }
                } else {
                    let imageData = await getWallpaper(wallpaper.id);
                    if (imageData && imageData.dataUrl) {
                        let existingVideo = document.querySelector("#background-video");
                        if (existingVideo) {
                            URL.revokeObjectURL(existingVideo.src);
                            existingVideo.remove();
                        }
                        document.body.style.setProperty('--bg-image', `url('${imageData.dataUrl}')`);
                        document.body.style.backgroundSize = "cover";
                        document.body.style.backgroundPosition = "center";
                        document.body.style.backgroundRepeat = "no-repeat";
                    }
                }
                currentWallpaperIndex = (currentWallpaperIndex + 1) % slideshowWallpapers.length;
            } catch (error) {
                console.error("Error applying wallpaper:", error);
            }
        }
        
        clearInterval(slideshowInterval);
        await displaySlideshow();
        slideshowInterval = setInterval(displaySlideshow, SLIDESHOW_INTERVAL);
    } else {
        // Apply single wallpaper from recent wallpapers
        if (recentWallpapers.length > 0 && currentWallpaperPosition < recentWallpapers.length) {
            let currentWallpaper = recentWallpapers[currentWallpaperPosition];
            try {
                if (currentWallpaper.isVideo) {
                    let videoData = await getWallpaper(currentWallpaper.id);
                    if (videoData && videoData.blob) {
                        let existingVideo = document.querySelector("#background-video");
                        if (existingVideo) {
                            URL.revokeObjectURL(existingVideo.src);
                            existingVideo.remove();
                        }
                        
                        let video = document.createElement("video");
                        video.id = "background-video";
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.style.position = "fixed";
                        video.style.minWidth = "100%";
                        video.style.minHeight = "100%";
                        video.style.width = "auto";
                        video.style.height = "auto";
                        video.style.zIndex = "-1";
                        video.style.objectFit = "cover";
                        
                        let videoUrl = URL.createObjectURL(videoData.blob);
                        video.src = videoUrl;
                        video.onerror = error => {
                            console.error("Video loading error:", error);
                        };
                        video.onloadeddata = () => {
                            document.body.insertBefore(video, document.body.firstChild);
                            document.body.style.backgroundImage = "none";
                        };
                        video.load();
                    }
                } else {
                    let imageData = await getWallpaper(currentWallpaper.id);
                    if (imageData && imageData.dataUrl) {
                        let existingVideo = document.querySelector("#background-video");
                        if (existingVideo) {
                            URL.revokeObjectURL(existingVideo.src);
                            existingVideo.remove();
                        }
                        document.body.style.setProperty('--bg-image', `url('${imageData.dataUrl}')`);
                        document.body.style.backgroundSize = "cover";
                        document.body.style.backgroundPosition = "center";
                        document.body.style.backgroundRepeat = "no-repeat";
                    }
                }
            } catch (error) {
                console.error("Error applying wallpaper:", error);
            }
        }
    }
}

function ensureVideoLoaded() {
    const video = document.querySelector('#background-video');
    if (video && video.paused) {
        video.play().catch(err => {
            console.error('Error playing video:', err);
        });
    }
}

// Clean up blob URLs when video element is removed
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
            if (node.id === 'background-video' && node.src) {
                URL.revokeObjectURL(node.src);
            }
        });
    });
});

observer.observe(document.body, { childList: true });

// Load recent wallpapers from localStorage on startup
function loadRecentWallpapers() {
  try {
    const savedWallpapers = localStorage.getItem('recentWallpapers');
    if (savedWallpapers) {
      recentWallpapers = JSON.parse(savedWallpapers);
    }
    
	// Migrate existing wallpapers without clock styles
	const defaultClockStyles = {
	    font: 'Inter',
	    weight: '700',
	    color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff',
	    colorEnabled: false,
		stackEnabled: false,
	    showSeconds: true,
	    showWeather: true
	};
    
    let updated = false;
    recentWallpapers.forEach(wallpaper => {
        if (!wallpaper.clockStyles) {
            wallpaper.clockStyles = { ...defaultClockStyles };
            updated = true;
        }
    });
    
    if (updated) {
        saveRecentWallpapers();
    }
    
    // Check if we're in slideshow mode
    const wallpapers = JSON.parse(localStorage.getItem('wallpapers'));
    isSlideshow = wallpapers && wallpapers.length > 0;
    
    // If using a single wallpaper, add it to recent wallpapers if not already there
    if (!isSlideshow) {
      const wallpaperType = localStorage.getItem('wallpaperType');
      const customWallpaper = localStorage.getItem('customWallpaper');
      
      if (wallpaperType && customWallpaper) {
        // Create an entry for the current wallpaper
        const currentWallpaper = {
          type: wallpaperType,
          data: customWallpaper,
          isVideo: wallpaperType.startsWith('video/'),
          timestamp: Date.now()
        };
        
        // Only add if it's not a duplicate
        if (!recentWallpapers.some(wp => wp.data === customWallpaper)) {
          recentWallpapers.unshift(currentWallpaper);
          while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
            recentWallpapers.pop();
          }
          saveRecentWallpapers();
        }
      }
    } else {
      // Add the slideshow as a special entry if not present
      const slideshowEntry = {
        isSlideshow: true,
        timestamp: Date.now()
      };
      
      if (!recentWallpapers.some(wp => wp.isSlideshow)) {
        recentWallpapers.unshift(slideshowEntry);
        while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
          recentWallpapers.pop();
        }
        saveRecentWallpapers();
      }
    }
  } catch (error) {
    console.error('Error loading recent wallpapers:', error);
  }
}

// Save recent wallpapers to localStorage
function saveRecentWallpapers() {
  try {
    localStorage.setItem('recentWallpapers', JSON.stringify(recentWallpapers));
  } catch (error) {
    console.error('Error saving recent wallpapers:', error);
    showPopup(currentLanguage.WALLPAPER_HISTORY_FAIL);
  }
}

// Add these variables to track the indicator
let pageIndicatorTimeout;
const INDICATOR_TIMEOUT = 5000; // 5 seconds
let indicatorActive = false; // Flag to track if indicator interaction is happening

// Variables for dot dragging
let isDragging = false;
let dragIndex = -1;
let dragStartX = 0;
let dragCurrentX = 0;
let lastTapTime = 0;
let tapCount = 0;
let tapTimer = null;
let tapTargetIndex = -1;

function initializeWallpaperTracking() {
  // If not already initialized, set up wallpaper position
  if (currentWallpaperPosition === undefined) {
    currentWallpaperPosition = 0;
  }
  
  // Store the actual order in local storage
  if (!localStorage.getItem('wallpaperOrder')) {
    localStorage.setItem('wallpaperOrder', JSON.stringify({
      position: currentWallpaperPosition,
      timestamp: Date.now()
    }));
  }
}

// Create the page indicator once and update it as needed
function initializePageIndicator() {
  // Create indicator only if it doesn't exist
  if (!document.getElementById('page-indicator')) {
    const pageIndicator = document.createElement('div');
    pageIndicator.id = 'page-indicator';
    pageIndicator.className = 'page-indicator';
    document.body.appendChild(pageIndicator);
    
    // Initial creation of dots
    updatePageIndicatorDots(true);
  } else {
    // Just update dot states
    updatePageIndicatorDots(false);
  }
  
  resetIndicatorTimeout();
}

// Update only the contents of the indicator
function updatePageIndicatorDots(forceRecreate = false) {
  const pageIndicator = document.getElementById('page-indicator');
  if (!pageIndicator) return;
  
  // Make sure any fade-out class is removed when updating
  pageIndicator.classList.remove('fade-out');
  
  // If no wallpapers or only one, show empty/single state
  if (recentWallpapers.length <= 1) {
    // Clear existing content
    pageIndicator.innerHTML = '';
    
    if (recentWallpapers.length === 0) {
      // Empty state - no wallpapers
      const emptyText = document.createElement('span');
      emptyText.className = 'empty-indicator';
      emptyText.textContent = currentLanguage.N_WALL;
      pageIndicator.appendChild(emptyText);
      pageIndicator.classList.add('empty');
    } else {
      // Single wallpaper state
      pageIndicator.classList.remove('empty');
      const dot = document.createElement('span');
      dot.className = 'indicator-dot active';
      dot.dataset.index = 0;
      
      // Add triple tap detection for removal
      dot.addEventListener('mousedown', (e) => handleDotTap(e, 0));
      dot.addEventListener('touchstart', (e) => handleDotTap(e, 0));
      
      pageIndicator.appendChild(dot);
    }
    return;
  }
  
  // Normal case - multiple wallpapers
  pageIndicator.classList.remove('empty');
  
  // If number of dots doesn't match or forced recreation, recreate all dots
  const existingDots = pageIndicator.querySelectorAll('.indicator-dot');
  if (forceRecreate || existingDots.length !== recentWallpapers.length) {
    // Clear existing content
    pageIndicator.innerHTML = '';
    
    // Create dots for each wallpaper in history, in the correct order
    for (let i = 0; i < recentWallpapers.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'indicator-dot';
      dot.dataset.index = i;
      
      if (i === currentWallpaperPosition) {
        dot.classList.add('active');
      }
      
      // Add click event to jump to specific wallpaper
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        // Only jump if we weren't dragging
        if (!isDragging) {
          jumpToWallpaper(i);
        }
      });
      
      // Add drag event listeners
      dot.addEventListener('mousedown', (e) => handleDotDragStart(e, i));
      dot.addEventListener('touchstart', (e) => handleDotDragStart(e, i));
      
      // Add triple tap detection
      dot.addEventListener('mousedown', (e) => handleDotTap(e, i));
      dot.addEventListener('touchstart', (e) => handleDotTap(e, i));
      
      pageIndicator.appendChild(dot);
    }
  } else {
    // Just update active state of existing dots
    existingDots.forEach((dot, i) => {
      if (i === currentWallpaperPosition) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
}

function updatePageIndicator() {
  initializePageIndicator();
}

function saveCurrentPosition() {
  localStorage.setItem('wallpaperOrder', JSON.stringify({
    position: currentWallpaperPosition,
    timestamp: Date.now()
  }));
}

function loadSavedPosition() {
  const savedOrder = localStorage.getItem('wallpaperOrder');
  if (savedOrder) {
    try {
      const orderData = JSON.parse(savedOrder);
      if (orderData.position !== undefined && 
          orderData.position >= 0 && 
          orderData.position < recentWallpapers.length) {
        currentWallpaperPosition = orderData.position;
      }
    } catch(e) {
      console.error('Error parsing saved wallpaper position', e);
    }
  }
}

// Create a new function to manage the indicator timeout
function resetIndicatorTimeout() {
  // Clear any existing timeout
  clearTimeout(pageIndicatorTimeout);
  
  // Only set a new timeout if we're not actively dragging
  if (!isDragging) {
    const pageIndicator = document.getElementById('page-indicator');
    if (pageIndicator) {
      pageIndicator.classList.remove('fade-out');
      
      pageIndicatorTimeout = setTimeout(() => {
        if (pageIndicator) {
          pageIndicator.classList.add('fade-out');
          // We don't remove the element completely anymore, just hide it with CSS
        }
      }, INDICATOR_TIMEOUT);
    }
  }
}

// Handle triple tap on dots to remove wallpaper
function handleDotTap(e, index) {
  e.stopPropagation();
  
  const now = Date.now();
  
  // Check if tapping the same dot
  if (index === tapTargetIndex) {
    if (now - lastTapTime < 500) { // 500ms between taps
      tapCount++;
      
      // If triple tap detected
      if (tapCount === 3) {
        removeWallpaper(index);
        tapCount = 0;
      }
    } else {
      // Too slow, reset counter
      tapCount = 1;
    }
  } else {
    // Tapping a different dot
    tapCount = 1;
    tapTargetIndex = index;
  }
  
  lastTapTime = now;
  
  // Clear existing timeout
  if (tapTimer) {
    clearTimeout(tapTimer);
  }
  
  // Set timeout to reset tap count
  tapTimer = setTimeout(() => {
    tapCount = 0;
  }, 500);
}

// Function to remove a wallpaper
async function removeWallpaper(index) {
    let wallpaperToRemove = recentWallpapers[index];
    
    // Clean up from IndexedDB
    if (wallpaperToRemove.id) {
        await deleteWallpaper(wallpaperToRemove.id);
    }
    
    recentWallpapers.splice(index, 1);
    localStorage.setItem("recentWallpapers", JSON.stringify(recentWallpapers));
    
    if (recentWallpapers.length === 0) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        isSlideshow = false;
        localStorage.removeItem("wallpapers");
        localStorage.removeItem("wallpaperOrder");
        currentWallpaperPosition = 0;
        localStorage.setItem("wallpaperType", "default");
        applyWallpaper();
        showPopup(currentLanguage.ALL_WALLPAPER_REMOVE);
        updatePageIndicatorDots(true);
        return;
    }
    
    if (index === currentWallpaperPosition) {
        currentWallpaperPosition = Math.max(0, currentWallpaperPosition - 1);
        saveCurrentPosition();
        switchWallpaper("none");
    } else if (index < currentWallpaperPosition) {
        currentWallpaperPosition--;
        saveCurrentPosition();
    }
    
    showPopup(currentLanguage.WALLPAPER_REMOVE);
    updatePageIndicatorDots(true);
    resetIndicatorTimeout();
}

// Handle start of dragging a dot
function handleDotDragStart(e, index) {
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    dragIndex = index;

    // Cancel any pending timeout when dragging starts
    clearTimeout(pageIndicatorTimeout);
    
    // Make sure indicator is visible (remove fade-out if present)
    const pageIndicator = document.getElementById('page-indicator');
    if (pageIndicator) {
        pageIndicator.classList.remove('fade-out');
    }

    // Get initial position
    if (e.type === 'touchstart') {
        dragStartX = e.touches[0].clientX;
    } else {
        dragStartX = e.clientX;
    }

    // Add global event listeners for move and end
    document.addEventListener('mousemove', handleDotDragMove);
    document.addEventListener('touchmove', handleDotDragMove, { passive: false });
    document.addEventListener('mouseup', handleDotDragEnd);
    document.addEventListener('touchend', handleDotDragEnd);

    // Add dragging class to the dot
    const dot = document.querySelector(`.indicator-dot[data-index="${index}"]`);
    if (dot) {
        dot.classList.add('dragging');
    }
}

// Handle moving a dot during drag
function handleDotDragMove(e) {
  e.preventDefault();
  
  if (!isDragging) return;
  
  // Get current position
  if (e.type === 'touchmove') {
    dragCurrentX = e.touches[0].clientX;
  } else {
    dragCurrentX = e.clientX;
  }
  
  const distance = dragCurrentX - dragStartX;
  
  // Get all dots
  const dots = document.querySelectorAll('.indicator-dot');
  const dotWidth = dots[0] ? dots[0].offsetWidth : 0;
  const dotSpacing = 10; // Gap between dots
  
  // Calculate the offset
  const offsetX = distance;
  
  // Move the dot being dragged
  const draggedDot = document.querySelector(`.indicator-dot[data-index="${dragIndex}"]`);
  if (draggedDot) {
    draggedDot.style.transform = `translateX(${offsetX}px) scale(1.3)`;
    
    // Check if we need to reorder
    const dotSize = dotWidth + dotSpacing;
    const shift = Math.round(offsetX / dotSize);
    
    if (shift !== 0) {
      const newIndex = Math.max(0, Math.min(recentWallpapers.length - 1, dragIndex + shift));
      
      if (newIndex !== dragIndex) {
        // Update the visual order
        dots.forEach((dot, i) => {
          const index = parseInt(dot.dataset.index);
          if (index === dragIndex) return; // Skip the dragged dot
          
          if ((index > dragIndex && index <= newIndex) || 
              (index < dragIndex && index >= newIndex)) {
            // Move dots that are between old and new position
            const direction = index > dragIndex ? -1 : 1;
            dot.style.transform = `translateX(${direction * dotSize}px)`;
          } else {
            dot.style.transform = '';
          }
        });
      }
    }
  }
}

// Handle end of dragging a dot
function handleDotDragEnd(e) {
  if (!isDragging) return;
  
  // Get final position
  let endX;
  if (e.type === 'touchend') {
    endX = e.changedTouches[0].clientX;
  } else {
    endX = e.clientX;
  }
  
  const distance = endX - dragStartX;
  const dots = document.querySelectorAll('.indicator-dot');
  const dotWidth = dots[0] ? dots[0].offsetWidth : 0;
  const dotSpacing = 10;
  const dotSize = dotWidth + dotSpacing;
  const shift = Math.round(distance / dotSize);
  
  let newIndex = Math.max(0, Math.min(recentWallpapers.length - 1, dragIndex + shift));
  
  // Only do something if the index changed
  if (newIndex !== dragIndex) {
    // Reorder wallpapers in the array
    const [movedWallpaper] = recentWallpapers.splice(dragIndex, 1);
    recentWallpapers.splice(newIndex, 0, movedWallpaper);
    
    // Update local storage
    localStorage.setItem('recentWallpapers', JSON.stringify(recentWallpapers));
    
    // Update current position if needed
    if (currentWallpaperPosition === dragIndex) {
      currentWallpaperPosition = newIndex;
    } else if (
      (currentWallpaperPosition > dragIndex && currentWallpaperPosition <= newIndex) || 
      (currentWallpaperPosition < dragIndex && currentWallpaperPosition >= newIndex)
    ) {
      // Adjust current position if it was in the moved range
      currentWallpaperPosition += (dragIndex > newIndex ? 1 : -1);
    }
    
    // Save the updated position
    saveCurrentPosition();
    
    // Force recreate the dots due to reordering
    updatePageIndicatorDots(true);
  } else {
    // Clean up any dragging visual states
    const draggedDot = document.querySelector(`.indicator-dot[data-index="${dragIndex}"]`);
    if (draggedDot) {
      draggedDot.classList.remove('dragging');
      draggedDot.style.transform = '';
    }
    
    // Reset any other dots that might have been moved
    dots.forEach(dot => {
      dot.style.transform = '';
    });
    
    // Update active state
    updatePageIndicatorDots(false);
  }
  
  // Clean up
  document.removeEventListener('mousemove', handleDotDragMove);
  document.removeEventListener('touchmove', handleDotDragMove);
  document.removeEventListener('mouseup', handleDotDragEnd);
  document.removeEventListener('touchend', handleDotDragEnd);
  
  // Reset state
  isDragging = false;
  dragIndex = -1;
  
  resetIndicatorTimeout();
}

// New function to jump to a specific wallpaper by index
async function jumpToWallpaper(index) {
    if (index < 0 || index >= recentWallpapers.length || index === currentWallpaperPosition) return;
    
    currentWallpaperPosition = index;
    saveCurrentPosition();
    
    let wallpaper = recentWallpapers[currentWallpaperPosition];
    
    if (wallpaper.clockStyles) {
        // Update localStorage
        localStorage.setItem('clockFont', wallpaper.clockStyles.font || 'Inter');
        localStorage.setItem('clockWeight', wallpaper.clockStyles.weight || '700');
        localStorage.setItem('clockColor', wallpaper.clockStyles.color || '#ffffff');
        localStorage.setItem('clockColorEnabled', wallpaper.clockStyles.colorEnabled || false);
        localStorage.setItem('clockStackEnabled', wallpaper.clockStyles.stackEnabled || false);
        localStorage.setItem('showSeconds', wallpaper.clockStyles.showSeconds !== undefined ? wallpaper.clockStyles.showSeconds : true);
        localStorage.setItem('showWeather', wallpaper.clockStyles.showWeather !== undefined ? wallpaper.clockStyles.showWeather : true);
        
        // Update UI elements
        const fontSelect = document.getElementById('font-select');
        const weightSlider = document.getElementById('weight-slider');
        const colorPicker = document.getElementById('clock-color-picker');
        const colorSwitch = document.getElementById('clock-color-switch');
        const stackSwitch = document.getElementById('clock-stack-switch');
        const secondsSwitch = document.getElementById('seconds-switch');
        const weatherSwitch = document.getElementById('weather-switch');
        
        if (fontSelect) fontSelect.value = wallpaper.clockStyles.font || 'Inter';
        if (weightSlider) weightSlider.value = parseInt(wallpaper.clockStyles.weight || '700') / 10;
        if (colorPicker) colorPicker.value = wallpaper.clockStyles.color || '#ffffff';
        if (colorSwitch) colorSwitch.checked = wallpaper.clockStyles.colorEnabled || false;
        if (stackSwitch) stackSwitch.checked = wallpaper.clockStyles.stackEnabled || false;
        
        if (secondsSwitch) {
            secondsSwitch.checked = wallpaper.clockStyles.showSeconds !== false;
            showSeconds = secondsSwitch.checked;
        }
        
        if (weatherSwitch) {
            weatherSwitch.checked = wallpaper.clockStyles.showWeather !== false;
            weatherSwitch.dispatchEvent(new Event('change'));
        }
        
        // Apply the styles
        applyClockStyles();
        updateClockAndDate();
    }
        
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    
    if (wallpaper.isSlideshow) {
        isSlideshow = true;
        let slideshowData = JSON.parse(localStorage.getItem("wallpapers"));
        if (slideshowData && slideshowData.length > 0) {
            localStorage.setItem("wallpapers", JSON.stringify(slideshowData));
            currentWallpaperIndex = 0;
            applyWallpaper();
            showPopup(currentLanguage.SLIDESHOW_WALLPAPER);
        }
    } else {
        isSlideshow = false;
        localStorage.removeItem("wallpapers");
        applyWallpaper();
    }
    
    updatePageIndicatorDots(false);
    resetIndicatorTimeout();
}

// Add CSS to the head
function addPageIndicatorStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .page-indicator {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      z-index: 50;
      transition: all 0.5s;
      opacity: 1;
      background-color: var(--search-background);
      backdrop-filter: blur(10px);
      padding: 5px 6px;
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      filter: none;
    }

    .page-indicator.empty {
      padding: 5px 12px;
    }
    
    .empty-indicator, .info-indicator {
      color: var(--text-color);
      opacity: 0.7;
      font-size: 12px;
    }
    
    .info-indicator {
      margin-left: 8px;
      font-size: 10px;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.5);
      transition: all 0.3s;
    }
    
    .indicator-dot.active {
      background-color: var(--text-color);
      transform: scale(1.3);
    }

    .indicator-dot.dragging {
      z-index: 2;
      transition: none;
      background-color: var(--text-color);
      transform: scale(1.8);
    }
    
    .fade-out {
      opacity: 0;
      pointer-events: none;
      filter: blur(5px);
    }
  `;
  document.head.appendChild(style);
}

// Add a function to check if we need to load or restore default wallpaper
function checkWallpaperState() {
  // If no wallpapers in history, set to default
  if (!recentWallpapers || recentWallpapers.length === 0) {
    localStorage.setItem('wallpaperType', 'default');
    localStorage.removeItem('customWallpaper');
    localStorage.removeItem('wallpapers');
    isSlideshow = false;
    applyWallpaper();
  }
}

// Modify switchWallpaper function to show indicator
function switchWallpaper(direction) {
    if (recentWallpapers.length === 0) return;
    
    // Calculate new position (existing logic)
    let newPosition = currentWallpaperPosition;
    
    if (direction === 'right') {
        newPosition++;
        if (newPosition >= recentWallpapers.length) {
            newPosition = recentWallpapers.length - 1;
            return;
        }
    } else if (direction === 'left') {
        newPosition--;
        if (newPosition < 0) {
            newPosition = 0;
            return;
        }
    }
    
    // Only proceed if position actually changed or we're reapplying
    if (newPosition !== currentWallpaperPosition && direction !== 'none') {
        currentWallpaperPosition = newPosition;
    }
    
    const wallpaper = recentWallpapers[currentWallpaperPosition];
    
    // Apply clock styles for this wallpaper if they exist
    if (wallpaper.clockStyles) {
        // Update localStorage so all functions can read the values
        localStorage.setItem('clockFont', wallpaper.clockStyles.font || 'Inter');
        localStorage.setItem('clockWeight', wallpaper.clockStyles.weight || '700');
        localStorage.setItem('clockColor', wallpaper.clockStyles.color || '#ffffff');
        localStorage.setItem('clockColorEnabled', wallpaper.clockStyles.colorEnabled || false);
        localStorage.setItem('clockStackEnabled', wallpaper.clockStyles.stackEnabled || false);
        localStorage.setItem('showSeconds', wallpaper.clockStyles.showSeconds !== undefined ? wallpaper.clockStyles.showSeconds : true);
        localStorage.setItem('showWeather', wallpaper.clockStyles.showWeather !== undefined ? wallpaper.clockStyles.showWeather : true);
        
        // Update the UI elements
        const fontSelect = document.getElementById('font-select');
        const weightSlider = document.getElementById('weight-slider');
        const colorPicker = document.getElementById('clock-color-picker');
        const colorSwitch = document.getElementById('clock-color-switch');
        const stackSwitch = document.getElementById('clock-stack-switch');
        const secondsSwitch = document.getElementById('seconds-switch');
        const weatherSwitch = document.getElementById('weather-switch');
        
        if (fontSelect) fontSelect.value = wallpaper.clockStyles.font || 'Inter';
        if (weightSlider) weightSlider.value = parseInt(wallpaper.clockStyles.weight || '700') / 10;
        if (colorPicker) colorPicker.value = wallpaper.clockStyles.color || '#ffffff';
        if (colorSwitch) colorSwitch.checked = wallpaper.clockStyles.colorEnabled || false;
        if (stackSwitch) stackSwitch.checked = wallpaper.clockStyles.stackEnabled || false;
        
        if (secondsSwitch) {
            secondsSwitch.checked = wallpaper.clockStyles.showSeconds !== false;
            showSeconds = secondsSwitch.checked; // Update the global variable
        }
        
        if (weatherSwitch) {
            weatherSwitch.checked = wallpaper.clockStyles.showWeather !== false;
            // Trigger the weather visibility update
            weatherSwitch.dispatchEvent(new Event('change'));
        }
        
        // Apply the clock styles
        applyClockStyles();
        
        // Update clock and weather display
        updateClockAndDate();
    }
    
    // Save the position for persistence
    saveCurrentPosition();
    
    // Rest of the existing wallpaper switching logic...
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    
    if (wallpaper.isSlideshow) {
        isSlideshow = true;
        const wallpapers = JSON.parse(localStorage.getItem('wallpapers'));
        if (wallpapers && wallpapers.length > 0) {
            localStorage.setItem('wallpapers', JSON.stringify(wallpapers));
            currentWallpaperIndex = 0;
            applyWallpaper();
            showPopup(currentLanguage.SLIDESHOW_WALLPAPER);
        }
    } else {
        isSlideshow = false;
        localStorage.removeItem('wallpapers');
        applyWallpaper();
    }
    
    updatePageIndicatorDots(false);
    resetIndicatorTimeout();
}

// Update handleSwipe to show indicator even if no swipe is detected
function handleSwipe() {
  const swipeDistance = touchEndX - touchStartX;
  
  // Always show the indicator when swiping, regardless of wallpaper count
  updatePageIndicator();
  
  // Only process wallpaper changes if we have at least 2 wallpapers
  if (recentWallpapers.length >= 2) {
    if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
      if (swipeDistance > 0) {
        // Swipe right - previous wallpaper
        switchWallpaper('left');
      } else {
        // Swipe left - next wallpaper
        switchWallpaper('right');
      }
    }
  }
}

// Add swipe detection for wallpaper switching
let touchStartX = 0;
let touchEndX = 0;
const MIN_SWIPE_DISTANCE = 50;

// Update the touch event listeners to specifically check if we're touching the body or background
document.addEventListener('touchstart', (e) => {
  // Only track touch start if touching the body or background video directly
  if ((e.target === document.body || e.target.id === 'background-video') && 
      !e.target.classList.contains('indicator-dot')) {
    touchStartX = e.touches[0].clientX;
  }
}, false);

document.addEventListener('touchend', (e) => {
  // Only process the swipe if the touch started on body or background video
  if ((e.target === document.body || e.target.id === 'background-video') && 
      !e.target.classList.contains('indicator-dot')) {
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe();
  }
}, false);

// Handle mouse swipes too for desktop testing
let mouseDown = false;
let mouseStartX = 0;

document.addEventListener('mousedown', (e) => {
  // Detect swipes regardless of wallpaper count
  if ((e.target === document.body || e.target.id === 'background-video') &&
      !e.target.classList.contains('indicator-dot')) {
    mouseDown = true;
    mouseStartX = e.clientX;
  }
}, false);

document.addEventListener('mouseup', (e) => {
  if (mouseDown) {
    mouseDown = false;
    touchEndX = e.clientX;
    touchStartX = mouseStartX;
    handleSwipe();
  }
}, false);

async function initializeAndApplyWallpaper() {
    loadSavedPosition();
    
    if (recentWallpapers.length > 0) {
        if (currentWallpaperPosition >= recentWallpapers.length) {
            currentWallpaperPosition = recentWallpapers.length - 1;
            saveCurrentPosition();
        }
        
        const wallpaper = recentWallpapers[currentWallpaperPosition];
        
        // Apply clock styles for the current wallpaper if they exist
        if (wallpaper.clockStyles) {
            localStorage.setItem('clockFont', wallpaper.clockStyles.font);
            localStorage.setItem('clockWeight', wallpaper.clockStyles.weight);
            localStorage.setItem('clockColor', wallpaper.clockStyles.color);
            localStorage.setItem('clockColorEnabled', wallpaper.clockStyles.colorEnabled);
        }
        
        if (wallpaper.isSlideshow) {
            isSlideshow = true;
            // Keep the existing wallpapers array in localStorage for slideshow
            let slideshowData = JSON.parse(localStorage.getItem("wallpapers"));
            if (slideshowData && slideshowData.length > 0) {
                currentWallpaperIndex = 0;
            }
        } else {
            isSlideshow = false;
            localStorage.removeItem('wallpapers');
            
            // Since we're now using IndexedDB, we don't need to set localStorage values
            // The applyWallpaper() function will fetch data directly from IndexedDB
            if (wallpaper.isVideo) {
                // Video wallpaper - data will be fetched from IndexedDB by applyWallpaper()
                localStorage.setItem('wallpaperType', wallpaper.type);
                localStorage.removeItem('customWallpaper'); // Clean up old localStorage data
            } else {
                // Image wallpaper - data will be fetched from IndexedDB by applyWallpaper()
                localStorage.setItem('wallpaperType', wallpaper.type);
                localStorage.removeItem('customWallpaper'); // Clean up old localStorage data
            }
        }
        
        // Apply the wallpaper now that everything is set up
        await applyWallpaper();
    } else {
        // No wallpapers available, set to default
        isSlideshow = false;
        localStorage.setItem('wallpaperType', 'default');
        localStorage.removeItem('customWallpaper');
        localStorage.removeItem('wallpapers');
        currentWallpaperPosition = 0;
    }
}

function setupFontSelection() {
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
    const colorPicker = document.getElementById('clock-color-picker');
    const colorSwitch = document.getElementById('clock-color-switch');
    const stackSwitch = document.getElementById('clock-stack-switch');
    
    // Get the computed --text-color value for the default
    const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
    
    // Load saved preferences
    const savedFont = localStorage.getItem('clockFont') || 'Inter';
    const savedWeight = localStorage.getItem('clockWeight') || '700';
    const savedColor = localStorage.getItem('clockColor') || defaultColor;
    const colorEnabled = localStorage.getItem('clockColorEnabled') === 'true';
    const stackEnabled = localStorage.getItem('clockStackEnabled') === 'true';
    const showSeconds = localStorage.getItem('showSeconds') !== 'false'; // Add this
    const showWeather = localStorage.getItem('showWeather') !== 'false'; // Add this
    
    fontSelect.value = savedFont;
    weightSlider.value = parseInt(savedWeight) / 10;
    colorPicker.value = savedColor;
    colorSwitch.checked = colorEnabled;
    stackSwitch.checked = stackEnabled;
    
    // Function to save current clock styles to the current wallpaper
    function saveCurrentClockStyles() {
        if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0 && currentWallpaperPosition < recentWallpapers.length) {
            const currentClockStyles = {
                font: fontSelect.value,
                weight: (weightSlider.value * 10).toString(),
                color: colorPicker.value,
                colorEnabled: colorSwitch.checked,
                stackEnabled: stackSwitch.checked,
                showSeconds: document.getElementById('seconds-switch')?.checked || false, // Add this
                showWeather: document.getElementById('weather-switch')?.checked !== false // Add this
            };
            
            // Update the current wallpaper's clock styles
            recentWallpapers[currentWallpaperPosition].clockStyles = currentClockStyles;
            
            // Save to localStorage
            saveRecentWallpapers();
        }
        
        // Also update localStorage for immediate use
        localStorage.setItem('clockFont', fontSelect.value);
        localStorage.setItem('clockWeight', (weightSlider.value * 10).toString());
        localStorage.setItem('clockColor', colorPicker.value);
        localStorage.setItem('clockColorEnabled', colorSwitch.checked.toString());
        localStorage.setItem('clockStackEnabled', stackSwitch.checked.toString());
        localStorage.setItem('showSeconds', document.getElementById('seconds-switch')?.checked.toString() || 'true'); // Add this
        localStorage.setItem('showWeather', document.getElementById('weather-switch')?.checked.toString() || 'true'); // Add this
    }
    
    // Apply initial styles
    applyClockStyles();
    
    // Handle font changes
    fontSelect.addEventListener('change', (e) => {
        const selectedFont = e.target.value;
        // Ensure font is loaded before applying
        document.fonts.load(`16px ${selectedFont}`).then(() => {
            applyClockStyles();
            saveCurrentClockStyles(); // Save to current wallpaper
        }).catch(() => {
            showPopup(currentLanguage.CLOCK_STYLE_FAILED);
        });
    });
    
    // Handle weight changes with the slider
    weightSlider.addEventListener('input', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    });
    
    // Handle color changes with the color picker
    colorPicker.addEventListener('input', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    });
    
    // Handle color switch toggle
    colorSwitch.addEventListener('change', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    
        // Show/hide the color picker based on switch state
        colorPicker.style.display = e.target.checked ? 'inline-block' : 'none';
        colorPicker.disabled = !e.target.checked;
    });
    
    // Handle stack switch toggle
    stackSwitch.addEventListener('change', (e) => {
        applyClockStyles();
        saveCurrentClockStyles(); // Save to current wallpaper
    });
    
    // Set initial color picker state based on switch
    colorPicker.style.display = colorSwitch.checked ? 'inline-block' : 'none';
    colorPicker.disabled = !colorSwitch.checked;
}

function applyClockStyles() {
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
    const colorPicker = document.getElementById('clock-color-picker');
    const colorSwitch = document.getElementById('clock-color-switch');
    const stackSwitch = document.getElementById('clock-stack-switch');
    
    if (!fontSelect || !weightSlider || !clockElement || !infoElement) return;
    
    const fontFamily = fontSelect.value;
    const fontWeight = weightSlider.value * 10; // Convert slider value to proper font weight
    
    clockElement.style.fontFamily = fontFamily;
    clockElement.style.fontWeight = fontWeight;
    
    // Only apply custom color if the switch is enabled
    if (colorSwitch && colorSwitch.checked) {
        clockElement.style.color = colorPicker.value;
        infoElement.style.color = colorPicker.value;
    } else {
        // Reset to default theme color
        clockElement.style.color = ''; // Empty string removes inline style, reverting to CSS
        infoElement.style.color = '';
    }
    
    // Apply stacked layout if enabled
    if (stackSwitch && stackSwitch.checked) {
        clockElement.style.flexDirection = 'column';
        clockElement.style.lineHeight = '0.9';
    } else {
        clockElement.style.flexDirection = '';
        clockElement.style.lineHeight = '';
    }
    
    infoElement.style.fontFamily = fontFamily;
}

// Initialize theme and wallpaper on load
function initializeCustomization() {
    setupThemeSwitcher();
    applyWallpaper();
    setupFontSelection();
}

// App definitions
const apps = {
    "Chronos": {
        url: "/chronos/index.html",
        icon: "alarm.png"
    },
    "Ailuator": {
        url: "/ailuator/index.html",
        icon: "calculator.png"
    },
    "Wordy": {
        url: "/wordy/index.html",
        icon: "docs.png"
    },
    "Fantaskical": {
        url: "/fantaskical/index.html",
        icon: "tasks.png"
    },
    "Moments": {
        url: "/moments/index.html",
        icon: "photos.png"
    },
    "Music": {
        url: "/music/index.html",
        icon: "music.png"
    },
    "Clapper": {
        url: "/clapper/index.html",
        icon: "video.png"
    },
    "Waves": {
        url: "/waves/index.html",
        icon: "home.png"
    },
    "SketchPad": {
        url: "/sketchpad/index.html",
        icon: "sketch.png"
    },
    "Invitations": {
        url: "/invitations/index.html",
        icon: "mail.png"
    },
    "Weather": {
        url: "/weather/index.html",
        icon: "weather.png"
    },
    "Camera": {
        url: "/camera/index.html",
        icon: "camera.png"
    }
};

function createFullscreenEmbed(url) {
    // Check if we have this URL minimized already
    if (minimizedEmbeds[url]) {
        // Restore the minimized embed
        const embedContainer = minimizedEmbeds[url];
        
        // First, remove any existing transitions
        embedContainer.style.transition = 'none';
        
        // Set initial state with rounded corners
        embedContainer.style.transform = 'scale(0.8)';
        embedContainer.style.opacity = '0';
        embedContainer.style.borderRadius = '25px';
        embedContainer.style.overflow = 'hidden';
        embedContainer.style.display = 'block';
        
        // IMPORTANT FIX: Restore proper z-index and pointer events
        embedContainer.style.pointerEvents = 'auto';
        embedContainer.style.zIndex = '1001';
        
        // Force reflow to apply the immediate style changes
        void embedContainer.offsetWidth;
        
        // Add transition for all properties (removed filter)
        embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
        
        // Clear background blur when restoring app
        document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
	    
        // Trigger the animation
        setTimeout(() => {
            embedContainer.style.transform = 'scale(1)';
            embedContainer.style.opacity = '1';
            embedContainer.style.borderRadius = '0px';
        }, 10);
        
        // Hide container with a smooth fade animation
        document.querySelectorAll('.container').forEach(el => {
            // Store original display value if not already stored
            if (!el.dataset.originalDisplay) {
                el.dataset.originalDisplay = window.getComputedStyle(el).display === 'none' ? 'none' : el.style.display || 'block';
            }
            
            // Preserve existing transitions and add opacity transition if needed
            const currentTransition = window.getComputedStyle(el).transition;
            const hasOpacityTransition = currentTransition.includes('opacity');
            
            if (!hasOpacityTransition) {
                // If there's already a transition, add to it; otherwise, set a new one
                if (currentTransition && currentTransition !== 'none') {
                    el.style.transition = `${currentTransition}, opacity 0.3s ease`;
                } else {
                    el.style.transition = 'opacity 0.3s ease';
                }
            }
            
            // Start fade out
            el.style.opacity = '0';
            
            // Hide element after fade out animation completes
            setTimeout(() => {
                el.style.display = 'none';
            }, 300);
        });

        const controlElements = document.querySelectorAll('.weather-settings, .gurapps-optional, .clock-color-settings, .clock-settings, .wallpaper-upload, .clock-stack-settings, .font-selection, .weight-slider-container');
        controlElements.forEach(el => {
            // Store ALL relevant original styles
            if (!el.dataset.originalStyles) {
                el.dataset.originalStyles = JSON.stringify({
                    display: window.getComputedStyle(el).display,
                    opacity: window.getComputedStyle(el).opacity,
                    visibility: window.getComputedStyle(el).visibility,
                    position: window.getComputedStyle(el).position,
                    transform: window.getComputedStyle(el).transform
                });
            }
            
            // Add transition for smooth fade
            el.style.transition = 'opacity 0.3s ease';
            
            // Start fade out
            el.style.opacity = '0';
            
            // Hide element after fade out animation completes
            setTimeout(() => {
                el.style.display = 'none';
            }, 300);
        });
        
        // Show the swipe overlay when restoring an app
        const swipeOverlay = document.getElementById('swipe-overlay');
        if (swipeOverlay) {
            swipeOverlay.style.display = 'block';
        }
        
        // IMPORTANT FIX: Make sure interaction blocker doesn't block embed
        const interactionBlocker = document.getElementById('interaction-blocker');
        if (interactionBlocker) {
            interactionBlocker.style.pointerEvents = 'none';
            interactionBlocker.style.display = 'none';
        }
        
        return;
    }
    
    // Create new embed if not already minimized
    const iframe = document.createElement('iframe');
    iframe.src = url;
    const appId = Object.keys(apps).find(k => apps[k].url === url);
    iframe.dataset.appId = appId;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    
    const embedContainer = document.createElement('div');
    embedContainer.className = 'fullscreen-embed';
    
    // Set initial styles BEFORE adding to DOM (removed filter)
    embedContainer.style.transform = 'scale(0.8)'; 
    embedContainer.style.opacity = '0';
    embedContainer.style.borderRadius = '25px';
    embedContainer.style.overflow = 'hidden';
    embedContainer.style.display = 'block';
    
    // Set initial background blur
    document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
    
    // IMPORTANT FIX: Set proper z-index and pointer events
    embedContainer.style.pointerEvents = 'auto';
    embedContainer.style.zIndex = '1001';
    embedContainer.appendChild(iframe);
    
    // Store the URL as a data attribute
    embedContainer.dataset.embedUrl = url;
    
    // Flag to track embedding status
    let embedFailed = false;
    
    // Try to detect if embedding is blocked
    iframe.addEventListener('load', () => {
       try {
           // Attempt to access iframe content
           const iframeContent = iframe.contentWindow.document;
           
           // Specific check for embedding blockage
           if (iframeContent.body.textContent.includes('X-Frame-Options') || 
               iframeContent.body.textContent.includes('frame denied')) {
               embedFailed = true;
               window.open(url, '_blank');
           }
       } catch (error) {
           // If accessing content fails, it might be blocked
           embedFailed = true;
           window.open(url, '_blank');
       }
    });
    
    // Handle iframe loading error
    iframe.addEventListener('error', () => {
        embedFailed = true;
        window.open(url, '_blank');
        // Don't remove the container or close the embed
    });
    
    // Hide all containers with a smooth fade animation
    document.querySelectorAll('.container').forEach(el => {
        // Store original display value if not already stored
        if (!el.dataset.originalDisplay) {
            el.dataset.originalDisplay = window.getComputedStyle(el).display === 'none' ? 'none' : el.style.display || 'block';
        }
        
        // Preserve existing transitions and add opacity transition if needed
        const currentTransition = window.getComputedStyle(el).transition;
        const hasOpacityTransition = currentTransition.includes('opacity');
        
        if (!hasOpacityTransition) {
            // If there's already a transition, add to it; otherwise, set a new one
            if (currentTransition && currentTransition !== 'none') {
                el.style.transition = `${currentTransition}, opacity 0.3s ease`;
            } else {
                el.style.transition = 'opacity 0.3s ease';
            }
        }
        
        // Start fade out
        el.style.opacity = '0';
        
        // Hide element after fade out animation completes
        setTimeout(() => {
            el.style.display = 'none';
        }, 300);
    });

    const controlElements = document.querySelectorAll('.weather-settings, .gurapps-optional, .clock-color-settings, .clock-settings, .wallpaper-upload, .clock-stack-settings, .font-selection, .weight-slider-container');
    controlElements.forEach(el => {
        // Store ALL relevant original styles
        if (!el.dataset.originalStyles) {
            el.dataset.originalStyles = JSON.stringify({
                display: window.getComputedStyle(el).display,
                opacity: window.getComputedStyle(el).opacity,
                visibility: window.getComputedStyle(el).visibility,
                position: window.getComputedStyle(el).position,
                transform: window.getComputedStyle(el).transform
            });
        }
        
        // Add transition for smooth fade
        el.style.transition = 'opacity 0.3s ease';
        
        // Start fade out
        el.style.opacity = '0';
        
        // Hide element after fade out animation completes
        setTimeout(() => {
            el.style.display = 'none';
        }, 300);
    });
	
    // Append the container to the DOM
    document.body.appendChild(embedContainer);
    
    // Force reflow to ensure the initial styles are applied
    void embedContainer.offsetWidth;
    
    // Now add the transition AFTER the element is in the DOM (removed filter)
    embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
    
    // Clear background blur and trigger the animation
    setTimeout(() => {
        embedContainer.style.transform = 'scale(1)';
        embedContainer.style.opacity = '1';
        embedContainer.style.borderRadius = '0px';
        document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
    }, 10);
    
    // Show the swipe overlay when opening an app
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.display = 'block';
    }
    
    // IMPORTANT FIX: Make sure interaction blocker doesn't block embed
    const interactionBlocker = document.getElementById('interaction-blocker');
    if (interactionBlocker) {
        interactionBlocker.style.pointerEvents = 'none';
        interactionBlocker.style.display = 'none';
    }
}

const originalCreateFullscreenEmbed = createFullscreenEmbed;
createFullscreenEmbed = function(url) {
  if (url === "#tasks") {
    showMinimizedEmbeds();
    return;
  }
  originalCreateFullscreenEmbed(url);
};

function minimizeFullscreenEmbed() {
    // IMPORTANT FIX: Be more specific about which embed to minimize
    // Only get embeds that are currently visible with display: block
    const embedContainer = document.querySelector('.fullscreen-embed[style*="display: block"]');
    
    if (embedContainer) {
        // Get the URL before hiding it
        const url = embedContainer.dataset.embedUrl;
        if (url) {
            // Store the embed in our minimized embeds object
            minimizedEmbeds[url] = embedContainer;
            
            // After animation completes, actually hide it completely
	    document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
            embedContainer.style.display = 'none';
            
            // Use a different z-index approach when minimized
            embedContainer.style.pointerEvents = 'none';
            embedContainer.style.zIndex = '0';
        }
    }
    
    // Restore previously hidden containers with a smooth fade animation
    document.querySelectorAll('.container').forEach(el => {
        // Set initial state for visible elements
        el.style.opacity = '0';
        el.style.display = '';
        
        // Preserve existing transitions and add opacity transition if needed
        const currentTransition = window.getComputedStyle(el).transition;
        const hasOpacityTransition = currentTransition.includes('opacity');
        
        if (!hasOpacityTransition) {
            // If there's already a transition, add to it; otherwise, set a new one
            if (currentTransition && currentTransition !== 'none') {
                el.style.transition = `${currentTransition}, opacity 0.3s ease`;
            } else {
                el.style.transition = 'opacity 0.3s ease';
            }
        }
        
        // Trigger fade in animation
        requestAnimationFrame(() => {
            el.style.opacity = '1';
        });
    });
	
    const controlElements = document.querySelectorAll('.weather-settings, .gurapps-optional, .clock-color-settings, .clock-settings, .wallpaper-upload, .clock-stack-settings, .font-selection, .weight-slider-container');
    controlElements.forEach(el => {
        // Get original styles from stored data
        let originalStyles = {};
        try {
            if (el.dataset.originalStyles) {
                originalStyles = JSON.parse(el.dataset.originalStyles);
            }
        } catch (e) {
            console.error('Error parsing original styles', e);
        }
        
        // First set to invisible but in the DOM
        el.style.opacity = '0';
        el.style.display = originalStyles.display || 'flex';
        
        // Restore any other original properties we've stored
        if (originalStyles.visibility) el.style.visibility = originalStyles.visibility;
        if (originalStyles.position) el.style.position = originalStyles.position;
        if (originalStyles.transform) el.style.transform = originalStyles.transform;
        
        // Add transition for smooth fade
        el.style.transition = 'opacity 0.3s ease';
        
        // Trigger fade in animation
        requestAnimationFrame(() => {
            el.style.opacity = originalStyles.opacity || '1';
        });
    });
    
    // Hide all fullscreen embeds that are not being displayed
    document.querySelectorAll('.fullscreen-embed:not([style*="display: block"])').forEach(embed => {
        embed.style.pointerEvents = 'none';
        embed.style.zIndex = '0';
    });
    
    // Hide the swipe overlay when minimizing
    const swipeOverlay = document.getElementById('swipe-overlay');
    if (swipeOverlay) {
        swipeOverlay.style.display = 'none';
        swipeOverlay.style.pointerEvents = 'none';
    }
    
    // Reset interaction blocker to default state
    const interactionBlocker = document.getElementById('interaction-blocker');
    if (interactionBlocker) {
        interactionBlocker.style.pointerEvents = 'auto';
    }
}

function populateDock() {
    // Clear only the app icons
    const appIcons = dock.querySelectorAll('.dock-icon');
    appIcons.forEach(icon => icon.remove());
    
    const sortedApps = Object.entries(apps)
        .filter(([appName]) => appName !== "Apps")  // Filter out Apps
        .map(([appName, appDetails]) => ({
            name: appName,
            details: appDetails,
            lastOpened: appLastOpened[appName] || 0
        }))
        .sort((a, b) => b.lastOpened - a.lastOpened)
        .slice(0, 4);  // Only take 4 more
    
    sortedApps.forEach(({ name, details }) => {
        const dockIcon = document.createElement('div');
        dockIcon.className = 'dock-icon';
        
        const img = document.createElement('img');
        img.src = `/assets/appicon/${details.icon}`;
        img.alt = name;
        
        dockIcon.appendChild(img);
	dockIcon.addEventListener('click', async () => {
	    // Minimize current fullscreen embed if one is open
	    const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
	    if (openEmbed) {
	        minimizeFullscreenEmbed();
	    }
	
	    // Update the last opened timestamp for this app
	    appLastOpened[name] = Date.now();
	    saveLastOpenedData();
	
	    // Open the new app
	    createFullscreenEmbed(details.url);
	    populateDock(); // Refresh the dock
	});
        
        dock.appendChild(dockIcon);
    });
}

    const appDrawer = document.getElementById('app-drawer');
    const appGrid = document.getElementById('app-grid');

// Function to create app icons
function createAppIcons() {
    appGrid.innerHTML = '';
    
    const appsArray = Object.entries(apps)
        .filter(([appName]) => appName !== "Apps") // Filter out the Apps app
        .map(([appName, appDetails]) => ({
            name: appName,
            details: appDetails,
            usage: appUsage[appName] || 0
        }))
        .sort((a, b) => b.usage - a.usage);
    
    appsArray.forEach((app) => {
        const appIcon = document.createElement('div');
        appIcon.classList.add('app-icon');
        appIcon.dataset.app = app.name;
        
        const img = document.createElement('img');
        img.src = `/assets/appicon/${app.details.icon}`;
        img.alt = app.name;
        img.onerror = () => {
            img.src = '/assets/appicon/default.png';
        };
        
        const label = document.createElement('span');
        label.textContent = app.name;
        
        appIcon.appendChild(img);
        appIcon.appendChild(label);
        
        const handleAppOpen = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                // Update usage count as before
                appUsage[app.name] = (appUsage[app.name] || 0) + 1;
                saveUsageData();
                
                // Also save the timestamp when the app was opened
                appLastOpened[app.name] = Date.now();
                saveLastOpenedData();
		populateDock();
                
                if (app.details.url.startsWith('#')) {
                    switch (app.details.url) {
                        case '#settings':
                            showPopup(currentLanguage.OPEN_SETTINGS);
                            break;
                        case '#tasks':
                            showMinimizedEmbeds(); // Add this case to call your new function
                            break;
                        default:
                            showPopup(currentLanguage.APP_OPENED.replace("{app}", app));
                    }
                } else {
                    createFullscreenEmbed(app.details.url);
                }
                
                appDrawer.classList.remove('open');
                appDrawer.style.bottom = '-100%';
                initialDrawerPosition = -100;
            } catch (error) {
                showPopup(currentLanguage.APP_OPEN_FAIL.replace("{app}", app));
                console.error(`App open error: ${error}`);
            }
        };
        
        appIcon.addEventListener('click', handleAppOpen);
        appIcon.addEventListener('touchend', handleAppOpen);
        appGrid.appendChild(appIcon);
    });
}

Object.keys(apps).forEach(appName => {
    appUsage[appName] = 0;
});

// Load saved usage data from localStorage
const savedUsage = localStorage.getItem('appUsage');
if (savedUsage) {
    Object.assign(appUsage, JSON.parse(savedUsage));
}

// Save usage data whenever an app is opened
function saveUsageData() {
    localStorage.setItem('appUsage', JSON.stringify(appUsage));
}

function setupDrawerInteractions() {
    let startY = 0;
    let currentY = 0;
    let initialDrawerPosition = -100;
    let isDragging = false;
    let isDrawerInMotion = false;
    let dragStartTime = 0;
    let lastY = 0;
    let velocities = [];
    let dockHideTimeout = null;
    const flickVelocityThreshold = 0.4;
    const dockThreshold = -2.5; // Threshold for dock appearance
    const openThreshold = -50;
    const drawerPill = document.querySelector('.drawer-pill');
    const drawerHandle = document.querySelector('.drawer-handle');
        
    // Create interaction blocker overlay
    const interactionBlocker = document.createElement('div');
    interactionBlocker.id = 'interaction-blocker';
    interactionBlocker.style.position = 'fixed';
    interactionBlocker.style.top = '0';
    interactionBlocker.style.left = '0';
    interactionBlocker.style.width = '100%';
    interactionBlocker.style.height = '100%';
    interactionBlocker.style.zIndex = '999'; // Below the drawer but above other content
    interactionBlocker.style.display = 'none';
    interactionBlocker.style.background = 'transparent';
    document.body.appendChild(interactionBlocker);
    
    populateDock();
    
    // Create transparent overlay for app swipe detection
    const swipeOverlay = document.createElement('div');
    swipeOverlay.id = 'swipe-overlay';
    swipeOverlay.style.position = 'fixed';
    swipeOverlay.style.bottom = '0';
    swipeOverlay.style.left = '0';
    swipeOverlay.style.width = '100%';
    swipeOverlay.style.height = '15%'; // Bottom 15% of screen for swipe detection
    swipeOverlay.style.zIndex = '1000';
    swipeOverlay.style.display = 'none';
    swipeOverlay.style.pointerEvents = 'none'; // Start with no interaction
    document.body.appendChild(swipeOverlay);

    function startDrag(yPosition) {
        startY = yPosition;
        lastY = yPosition;
        currentY = yPosition;
        isDragging = true;
        isDrawerInMotion = true;
        dragStartTime = Date.now();
        velocities = [];
        appDrawer.style.transition = 'opacity 0.3s, filter 0.3s';
    }

    function moveDrawer(yPosition) {
        if (!isDragging) return;
        
        // Calculate and store velocity data
        const now = Date.now();
        const deltaTime = now - dragStartTime;
        if (deltaTime > 0) {
            const velocity = (lastY - yPosition) / deltaTime;
            velocities.push(velocity);
            // Keep only the last 5 velocity measurements
            if (velocities.length > 5) {
                velocities.shift();
            }
        }
        lastY = yPosition;
        
        currentY = yPosition;
        const deltaY = startY - currentY;
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;
    
        // Check if there's an open embed
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        if (openEmbed && movementPercentage > 25) {
            // Add transition class for smooth animation (removed filter)
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = `scale(${1 - (movementPercentage - 25) / 100})`;
            openEmbed.style.opacity = 1 - ((movementPercentage - 25) / 75);
            
            // Add dynamic border radius and background blur during drag
            const borderRadius = Math.min(25, (movementPercentage - 25) * 0.5);
            const blurRadius = Math.min(5, (movementPercentage - 25) * 0.2);
            openEmbed.style.borderRadius = `${borderRadius}px`;
            
            // Apply blur to body instead of embed
            document.querySelector('body').style.setProperty('--bg-blur', `blur(${5 - blurRadius}px)`);
		
            // Make app drawer transparent when in an app
            appDrawer.style.opacity = '0';
            
            // IMPORTANT FIX: Set pointer-events to none when an embed is open
            interactionBlocker.style.pointerEvents = 'none';
        }
        
		if (movementPercentage > 2.5 && movementPercentage < 25) {
            dock.classList.add('show');
            dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)'; 
            dock.style.display = 'flex';
            if (dockHideTimeout) clearTimeout(dockHideTimeout);
            drawerPill.style.opacity = '0';
        } else {
            dock.classList.remove('show');
            dock.style.boxShadow = 'none'; 
            if (dockHideTimeout) clearTimeout(dockHideTimeout);
            dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
            drawerPill.style.opacity = '1';
        }
    
        const newPosition = Math.max(-100, Math.min(0, initialDrawerPosition + movementPercentage));
        
        // Only update opacity if no embed is open
        if (!openEmbed) {
            const opacity = (newPosition + 100) / 100;
            const blurRadius = Math.max(0, Math.min(5, ((-newPosition) / 20)));
            appDrawer.style.opacity = opacity;
            
            // Apply blur to body for drawer instead
            document.querySelector('body').style.setProperty('--bg-blur', `blur(${5 - blurRadius}px)`);
	}
        
        appDrawer.style.bottom = `${newPosition}%`;
        
        // Show interaction blocker if drawer is partially visible (not at 0% or -100%)
        if (newPosition > -100 && newPosition < 0) {
            interactionBlocker.style.display = 'block';
            // IMPORTANT FIX: Only capture pointer events if no embed is open
            interactionBlocker.style.pointerEvents = openEmbed ? 'none' : 'auto';
        } else {
            interactionBlocker.style.display = 'none';
        }
    }

    function endDrag() {
        if (!isDragging) return;
    
        const deltaY = startY - currentY;
        const deltaTime = Date.now() - dragStartTime;
        
        // Calculate average velocity from the stored values
        let avgVelocity = 0;
        if (velocities.length > 0) {
            avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
        }
        
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;
    
        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
    
        // IMPORTANT FIX: Be specific about which embed is open
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        
        // Handle flick gesture to close app
        const isFlickUp = avgVelocity > flickVelocityThreshold;
        
        if (openEmbed && (movementPercentage > 10 || isFlickUp)) {
            // Close embed with animation (removed filter)
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = 'scale(0.8)';
            openEmbed.style.opacity = '0';
            openEmbed.style.borderRadius = '25px';
            
            // Apply blur to body when minimizing
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
		
            setTimeout(() => {
                minimizeFullscreenEmbed();
                
                // Hide the swipe overlay
                swipeOverlay.style.display = 'none';
                swipeOverlay.style.pointerEvents = 'none';
            }, 300);
            
            // Reset drawer state and clear background blur
            dock.classList.remove('show');
            dock.style.boxShadow = 'none';
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
            interactionBlocker.style.display = 'none';
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
	} else if (openEmbed) {
            // Reset embed if swipe wasn't enough (removed filter)
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = 'scale(1)';
            openEmbed.style.opacity = '1';
            openEmbed.style.borderRadius = '0px';
            
            // Clear background blur when resetting
            document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
		
            // Keep app drawer transparent when in an app
            appDrawer.style.opacity = '0';
            
            // Handle dock visibility for smaller swipes
            if (movementPercentage > 2.5 && movementPercentage <= 25) {
                dock.classList.add('show');
                dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)'; // Enable box shadow when visible
		        dock.style.display = 'flex';
                appDrawer.style.bottom = '-100%';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
            } else {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none';
                if (dockHideTimeout) clearTimeout(dockHideTimeout);
                dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
                appDrawer.style.bottom = '-100%';
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
            }
        } else {
            // Normal drawer behavior when no embed is open
            // Consider both movement percentage and velocity for flick gestures
            const isSignificantSwipe = movementPercentage > 25 || isFlickUp;
            const isSmallSwipe = movementPercentage > 2.5 && movementPercentage <= 25;
            
            // Small swipe - show dock
            if (isSmallSwipe && !isFlickUp) {
                dock.classList.add('show');
                dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
		dock.style.display = 'flex';
                appDrawer.style.bottom = '-100%';
                appDrawer.style.opacity = '0';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
                document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
	    } 
            // Large swipe or flick up - show full drawer
            else if (isSignificantSwipe) {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none';
                if (dockHideTimeout) clearTimeout(dockHideTimeout);
                dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
                appDrawer.style.bottom = '0%';
                appDrawer.style.opacity = '1';
                appDrawer.classList.add('open');
                initialDrawerPosition = 0;
                interactionBlocker.style.display = 'none';
                document.querySelector('body').style.setProperty('--bg-blur', 'blur(5px)');
	    } 
            // Close everything
            else {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none';
                if (dockHideTimeout) clearTimeout(dockHideTimeout);
                dockHideTimeout = setTimeout(() => { dock.style.display = 'none'; }, 300);
                appDrawer.style.bottom = '-100%';
                appDrawer.style.opacity = '0';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
                document.querySelector('body').style.setProperty('--bg-blur', 'blur(0px)');
	    }
            
            // Hide the swipe overlay when not in an app
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
        }
    
        isDragging = false;
    
        setTimeout(() => {
            isDrawerInMotion = false;
        }, 300); // 300ms matches the transition duration in the CSS
    }

    // Add initial swipe detection in app
    function setupAppSwipeDetection() {
        let touchStartY = 0;
        let touchStartTime = 0;
        let isInSwipeMode = false;
        
        swipeOverlay.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });
        
        swipeOverlay.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const deltaY = touchStartY - currentY;
            
            if (deltaY > 25 && !isInSwipeMode) { // Detected upward swipe
                isInSwipeMode = true;
                startDrag(touchStartY);
                // Capture all further events
                swipeOverlay.style.pointerEvents = 'auto';
            }
            
            if (isInSwipeMode) {
                moveDrawer(currentY);
                e.preventDefault(); // Prevent default scrolling when in swipe mode
            }
        }, { passive: false });
        
        swipeOverlay.addEventListener('touchend', () => {
            if (isInSwipeMode) {
                endDrag();
                isInSwipeMode = false;
            }
            // Return to passive mode
            swipeOverlay.style.pointerEvents = 'none';
        });
        
        // Similar handling for mouse events
        swipeOverlay.addEventListener('mousedown', (e) => {
            touchStartY = e.clientY;
            touchStartTime = Date.now();
        });
        
        swipeOverlay.addEventListener('mousemove', (e) => {
            if (e.buttons !== 1) return; // Only proceed if left mouse button is pressed
            
            const deltaY = touchStartY - e.clientY;
            
            if (deltaY > 25 && !isInSwipeMode) {
                isInSwipeMode = true;
                startDrag(touchStartY);
                swipeOverlay.style.pointerEvents = 'auto';
            }
            
            if (isInSwipeMode) {
                moveDrawer(e.clientY);
            }
        });
        
        swipeOverlay.addEventListener('mouseup', () => {
            if (isInSwipeMode) {
                endDrag();
                isInSwipeMode = false;
            }
            swipeOverlay.style.pointerEvents = 'none';
        });
    }
    
    setupAppSwipeDetection();

    // Touch Events for regular drawer interaction
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Check if touch is on handle area or if drawer is already open
        if (drawerHandle.contains(element) || (appDrawer.classList.contains('open') && appDrawer.contains(element))) {
            startDrag(touch.clientY);
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            moveDrawer(e.touches[0].clientY);
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        endDrag();
    });

    // Mouse Events for regular drawer interaction
    document.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        // Check if click is on handle area or if drawer is already open
        if (drawerHandle.contains(element) || (appDrawer.classList.contains('open') && appDrawer.contains(element))) {
            startDrag(e.clientY);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            moveDrawer(e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        endDrag();
    });

    document.addEventListener('click', (e) => {
        // First check if a fullscreen embed is open
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
    
        if (!isDrawerInMotion && 
            !dock.contains(e.target) && 
            !drawerHandle.contains(e.target) && 
            (openEmbed || !appDrawer.classList.contains('open'))) { // Close dock if embed is open OR drawer is closed
            dock.classList.remove('show');
            dock.style.boxShadow = 'none'; // Disable box shadow when hiding dock
            drawerPill.style.opacity = '1'; // Restore drawer-pill opacity when dock is hidden
        }
    });

	document.addEventListener('click', (e) => {
	    const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
	    
	    // Only execute this logic when an embed is open and the dock is showing
	    if (openEmbed && dock.classList.contains('show')) {
	        // If clicked outside the dock
	        if (!dock.contains(e.target)) {
	            dock.classList.remove('show');
	            dock.style.boxShadow = 'none';
	            drawerPill.style.opacity = '1';
	        }
	    }
	});
    
    // Make app drawer transparent when an app is open
    function updateDrawerOpacityForApps() {
        const openEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (openEmbed) {
            appDrawer.style.opacity = '0';
            
            // Show the swipe overlay when an app is open
            swipeOverlay.style.display = 'block';
            
            // IMPORTANT FIX: Set pointer-events to none when an embed is open
            interactionBlocker.style.pointerEvents = 'none';
        } else {
            // Only update opacity if drawer is open
            if (appDrawer.classList.contains('open')) {
                appDrawer.style.opacity = '1';
            }
            
            // Hide the swipe overlay when no app is open
            swipeOverlay.style.display = 'none';
            swipeOverlay.style.pointerEvents = 'none';
            
            // IMPORTANT FIX: Reset pointer-events when no embed is open
            if (appDrawer.classList.contains('open')) {
                interactionBlocker.style.pointerEvents = 'auto';
            }
        }
    }
    
    // Monitor for opened apps
    const bodyObserver = new MutationObserver(() => {
        updateDrawerOpacityForApps();
    });
    
    bodyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Initial check
    updateDrawerOpacityForApps();
    
    // Ensure box shadow is disabled initially
    dock.style.boxShadow = 'none';
    
    // Add interaction blocker click handler to close drawer on click outside
    interactionBlocker.addEventListener('click', () => {
        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';
        appDrawer.style.bottom = '-100%';
        appDrawer.style.opacity = '0';
        appDrawer.classList.remove('open');
        initialDrawerPosition = -100;
        interactionBlocker.style.display = 'none';
    });
}

const appDrawerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            
        }
    });
});

appDrawerObserver.observe(appDrawer, {
    attributes: true
});

function blackoutScreen() {
  // Get the brightness overlay element
  const brightnessOverlay = document.getElementById('brightness-overlay');
  
  // Store the current brightness value
  const currentBrightness = localStorage.getItem('page_brightness') || '100';
  
  // Save the current brightness value for later restoration
  localStorage.setItem('previous_brightness', currentBrightness);
  
  // Set brightness to 0 (completely dark)
  brightnessOverlay.style.backgroundColor = 'rgba(0, 0, 0, 1)';
  
  // Create a new full-screen overlay to capture all events
  const blockingOverlay = document.createElement('div');
  blockingOverlay.id = 'blackout-event-overlay';
  blockingOverlay.style.position = 'fixed';
  blockingOverlay.style.top = '0';
  blockingOverlay.style.left = '0';
  blockingOverlay.style.width = '100%';
  blockingOverlay.style.height = '100%';
  blockingOverlay.style.zIndex = '999999999999999'; // Highest z-index to block everything
  blockingOverlay.style.cursor = 'pointer';
  blockingOverlay.style.pointerEvents = 'all';
  blockingOverlay.style.backgroundColor = 'black'; // Ensure it's completely black
  
  // Add it to the document
  document.body.appendChild(blockingOverlay);

  // Start fade-out animation
  customizeModal.classList.remove('show');
  blurOverlayControls.classList.remove('show');

  // Wait for the animation to finish before hiding elements and pausing media
  setTimeout(() => {
      // Hide elements
      customizeModal.style.display = 'none';
      blurOverlayControls.style.display = 'none';

      // Pause all videos, embeds, and animations
      document.querySelectorAll('video, iframe, canvas, [data-animation]').forEach(el => {
          if (el.tagName === 'VIDEO') {
              if (!el.paused) {
                  el.pause();
                  el.dataset.wasPlaying = 'true';
              }
          } else if (el.tagName === 'IFRAME') {
              try {
                  el.dataset.wasActive = 'true';
                  el.style.pointerEvents = 'none';
              } catch (e) {
                  console.error('Failed to pause embed:', e);
              }
          } else if (el.style.animationPlayState) {
              el.dataset.animationState = el.style.animationPlayState;
              el.style.animationPlayState = 'paused';
          }
      });
  }, 300);
  
  // Stop animations and reduce energy consumption
  document.body.classList.add('power-save-mode');
  
  // Function to handle the event and cleanup
  function restoreScreenAndMinimize() {
    // Restore previous brightness
    const previousBrightness = localStorage.getItem('previous_brightness') || '100';
    brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${(100-previousBrightness)/100})`;
    
    // Remove power save mode
    document.body.classList.remove('power-save-mode');
    
    // Resume videos, embeds, and animations
    document.querySelectorAll('video, iframe, canvas, [data-animation]').forEach(el => {
      if (el.tagName === 'VIDEO' && el.dataset.wasPlaying === 'true') {
        el.play();
        delete el.dataset.wasPlaying;
      } else if (el.tagName === 'IFRAME' && el.dataset.wasActive === 'true') {
        try {
          el.style.pointerEvents = 'auto';
          delete el.dataset.wasActive;
        } catch (e) {
          console.error('Failed to resume embed:', e);
        }
      } else if (el.dataset.animationState) {
        el.style.animationPlayState = el.dataset.animationState;
        delete el.dataset.animationState;
      }
    });
    
    // Call the minimize function
    minimizeFullscreenEmbed();
    
    // Remove the blocking overlay
    document.body.removeChild(blockingOverlay);
  }
  
  // Add event listeners only to the blocking overlay
  blockingOverlay.addEventListener('click', restoreScreenAndMinimize);
  blockingOverlay.addEventListener('touchstart', restoreScreenAndMinimize);
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

document.getElementById("versionButton").addEventListener("click", function() {
    window.open("https://kirbindustries.gitbook.io/gurasuraisu", "_blank");
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Close all modals
        [customizeModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                blurOverlayControls.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    blurOverlayControls.style.display = 'none';
                }, 300);
            }
        });
    }
});

window.addEventListener('online', () => {
    showPopup(currentLanguage.ONLINE);
    updateSmallWeather(); // Refresh weather data
});

window.addEventListener('offline', () => {
    showPopup(currentLanguage.OFFLINE);
});

// Call applyWallpaper on page load
document.addEventListener('DOMContentLoaded', () => {
    applyWallpaper();
	loadRecentWallpapers();
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize control states
    const storedLightMode = localStorage.getItem('theme') || 'dark';
    const storedMinimalMode = localStorage.getItem('minimalMode') === 'true';
    const storedSilentMode = localStorage.getItem('silentMode') === 'true';
    const storedTemperature = localStorage.getItem('display_temperature') || '0';
    const storedBrightness = localStorage.getItem('page_brightness') || '100';
    
    // Get elements using your existing IDs
    const lightModeControl = document.getElementById('light_mode_qc');
    const minimalModeControl = document.getElementById('minimal_mode_qc');
    const silentModeControl = document.getElementById('silent_switch_qc');
    const temperatureControl = document.getElementById('temp_control_qc');
    
    const silentModeSwitch = document.getElementById('silent_switch');
    const minimalModeSwitch = document.getElementById('focus-switch');
    const lightModeSwitch = document.getElementById('theme-switch');
    
    const temperatureValue = document.getElementById('thermostat-value');
    const temperaturePopup = document.getElementById('thermostat-popup');
    const temperatureSlider = document.getElementById('thermostat-control');
    const temperaturePopupValue = document.getElementById('thermostat-popup-value');
    
    // Brightness elements
    const brightnessSlider = document.getElementById('brightness-control');
    const brightnessValue = document.getElementById('brightness-value');
    
    // Create brightness overlay div if it doesn't exist
    if (!document.getElementById('brightness-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'brightness-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '9999999';
        overlay.style.display = 'block';
        document.body.appendChild(overlay);
    }
    
    // Create temperature overlay div if it doesn't exist
    if (!document.getElementById('temperature-overlay')) {
        const tempOverlay = document.createElement('div');
        tempOverlay.id = 'temperature-overlay';
        tempOverlay.style.position = 'fixed';
        tempOverlay.style.top = '0';
        tempOverlay.style.left = '0';
        tempOverlay.style.width = '100%';
        tempOverlay.style.height = '100%';
        tempOverlay.style.pointerEvents = 'none';
        tempOverlay.style.zIndex = '9999997';
        tempOverlay.style.mixBlendMode = 'multiply';
        tempOverlay.style.display = 'block';
        document.body.appendChild(tempOverlay);
    }
    
    const brightnessOverlay = document.getElementById('brightness-overlay');
    const temperatureOverlay = document.getElementById('temperature-overlay');
    
    // Set temperature slider range
    temperatureSlider.min = -10;
    temperatureSlider.max = 10;
    
    // Set initial states from localStorage or defaults
    lightModeSwitch.checked = storedLightMode === 'light';
    if (lightModeSwitch.checked) lightModeControl.classList.add('active');
    
    minimalModeSwitch.checked = storedMinimalMode;
    if (minimalModeSwitch.checked) minimalModeControl.classList.add('active');
    
    silentModeSwitch.checked = storedSilentMode;
    if (silentModeSwitch.checked) silentModeControl.classList.add('active');
    
    // Initialize temperature
    if (storedTemperature) {
        temperatureSlider.value = storedTemperature;
        temperatureValue.textContent = `${storedTemperature}`;
        temperaturePopupValue.textContent = `${storedTemperature}`;
        updateTemperature(storedTemperature);
    }
    
    // Initialize brightness
    if (storedBrightness) {
        brightnessSlider.value = storedBrightness;
        updateBrightness(storedBrightness);
    }
    
    // Initialize icons based on current states
    updateLightModeIcon(lightModeSwitch.checked);
    updateMinimalModeIcon(minimalModeSwitch.checked);
    updateSilentModeIcon(silentModeSwitch.checked);
    updateTemperatureIcon(storedTemperature);
    
    // Function to update light mode icon
    function updateLightModeIcon(isLightMode) {
        const lightModeIcon = lightModeControl.querySelector('.material-symbols-rounded');
        if (!lightModeIcon) return;
        
        if (isLightMode) {
            lightModeIcon.textContent = 'radio_button_checked'; // Light mode ON
        } else {
            lightModeIcon.textContent = 'radio_button_partial'; // Light mode OFF (dark mode)
        }
    }
    
    // Function to update minimal mode icon
    function updateMinimalModeIcon(isMinimalMode) {
        const minimalModeIcon = minimalModeControl.querySelector('.material-symbols-rounded');
        if (!minimalModeIcon) return;
        
        if (isMinimalMode) {
            minimalModeIcon.textContent = 'screen_record'; // Minimal mode ON
        } else {
            minimalModeIcon.textContent = 'filter_tilt_shift'; // Minimal mode OFF
        }
    }
    
    // Function to update silent mode icon
    function updateSilentModeIcon(isSilentMode) {
        const silentModeIcon = silentModeControl.querySelector('.material-symbols-rounded');
        if (!silentModeIcon) return;
        
        if (isSilentMode) {
            silentModeIcon.textContent = 'notifications_off'; // Silent mode ON
        } else {
            silentModeIcon.textContent = 'notifications'; // Silent mode OFF
        }
    }
    
    // Function to update the temperature icon based on value
    function updateTemperatureIcon(value) {
        const temperatureIcon = temperatureControl.querySelector('.material-symbols-rounded');
        if (!temperatureIcon) return;
        
        const tempValue = parseInt(value);
        if (tempValue <= -3) {
            temperatureIcon.textContent = 'thermometer_minus'; // Cold
        } else if (tempValue >= 3) {
            temperatureIcon.textContent = 'thermometer_add'; // Hot
        } else {
            temperatureIcon.textContent = 'thermostat_auto'; // Neutral
        }
    }
    
    // Function to update brightness
    function updateBrightness(value) {
        brightnessValue.textContent = `${value}%`;
        
        // Calculate darkness level (inverse of brightness)
        const darknessLevel = (100 - value) / 100;
        
        // Update the overlay opacity
        brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${darknessLevel})`;
        
        // Update the icon based on brightness level
        const brightnessIcon = document.querySelector('label[for="brightness-control"] .material-symbols-rounded');
        
        if (brightnessIcon) {
            if (value <= 60) {
                brightnessIcon.textContent = 'wb_sunny'; // Low brightness icon
            } else {
                brightnessIcon.textContent = 'sunny'; // High brightness icon
            }
        }
    }
    
    // Function to update temperature
    function updateTemperature(value) {
        // Convert to number to ensure proper comparison
        const tempValue = parseInt(value);
        
        // Calculate intensity based on distance from 0
        const intensity = Math.abs(tempValue) / 10;
        
        // Calculate RGB values for overlay
        let r, g, b, a;
        
        if (tempValue < 0) {
            // Cool/blue tint (more blue as value decreases)
            r = 200;
            g = 220;
            b = 255;
            a = intensity;
        } else if (tempValue > 0) {
            // Warm/yellow tint (more yellow as value increases)
            r = 255;
            g = 220;
            b = 180;
            a = intensity;
        } else {
            // Neutral (no tint at 0)
            r = 255;
            g = 255;
            b = 255;
            a = 0;
        }
        
        // Update the overlay color
        temperatureOverlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    // Event listener for light mode control
    lightModeControl.addEventListener('click', function() {
        lightModeSwitch.checked = !lightModeSwitch.checked;
        this.classList.toggle('active');

        const newTheme = lightModeSwitch.checked ? 'light' : 'dark';

        // Update localStorage
        localStorage.setItem('theme', newTheme);

        // Update current document
        document.body.classList.toggle('light-theme', newTheme === 'light');

        // Update icon
        updateLightModeIcon(lightModeSwitch.checked);

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
            iframe.contentWindow.postMessage({
                type: 'themeUpdate',
                theme: newTheme
            }, window.location.origin);
        });
    });
    
    // Event listener for minimal mode control
    minimalModeControl.addEventListener('click', function() {
        // Toggle minimalMode state
        minimalMode = !minimalMode;

        // Save state to localStorage (if needed)
        localStorage.setItem('minimalMode', minimalMode);

        // Update UI based on the new state
        updateMinimalMode();

        // Toggle active class for visual feedback
        this.classList.toggle('active');
        
        // Update icon
        updateMinimalModeIcon(minimalMode);
    });

    // Event listener for silent mode control
    silentModeControl.addEventListener('click', function() {
        silentModeSwitch.checked = !silentModeSwitch.checked;
        this.classList.toggle('active');
        
        const silentMode = silentModeSwitch.checked;
        localStorage.setItem('silentMode', silentMode);
        
        // Update icon
        updateSilentModeIcon(silentMode);
        
        // Override the showPopup function based on silent mode state
        if (silentMode) {
            // Store the original function if not already stored
            if (!window.originalShowPopup) {
                window.originalShowPopup = window.showPopup;
            }
            
            // Replace with silent version (that does nothing)
            window.showPopup = function(message) {
                console.log('Silent ON; suppressing popup:', message);
                // Do nothing - this effectively hides all popups
            };
        } else {
            // Restore the original function if we have it stored
            if (window.originalShowPopup) {
                window.showPopup = window.originalShowPopup;
            }
        }
    });
    
    // Initialize silent mode on page load
    (function initSilentMode() {
        const silentMode = localStorage.getItem('silentMode') === 'true';
        
        if (silentMode) {
            // Store the original function if not already stored
            if (!window.originalShowPopup) {
                window.originalShowPopup = window.showPopup;
            }
            
            // Replace with silent version
            window.showPopup = function(message) {
                console.log('Silent ON; suppressing popup:', message);
                // Do nothing - this effectively hides all popups
            };
        }
    })();
    
    // Temperature control popup
    temperatureControl.addEventListener('click', function(e) {
        // If the popup is already open, and the click is NOT inside the popup or on the control, close it
        if (
            temperaturePopup.style.display === 'block' &&
            !temperaturePopup.contains(e.target) &&
            e.target !== temperatureControl
        ) {
            temperaturePopup.style.display = 'none';
            return;
        }

        // Otherwise, open it as usual
        const rect = temperatureControl.getBoundingClientRect();
        temperaturePopup.style.top = `${rect.bottom + 5}px`;
        temperaturePopup.style.left = `${rect.left + (rect.width / 2) - (155 / 2)}px`; // Center the popup
        temperaturePopup.style.display = 'block';
    });
    
    document.addEventListener('click', function(e) {
        if (temperaturePopup.style.display === 'block' && 
            !temperaturePopup.contains(e.target) && 
            e.target !== temperatureControl) {
            temperaturePopup.style.display = 'none';
        }
    });
    
    // Temperature slider event listener
    temperatureSlider.addEventListener('input', function(e) {
        const value = e.target.value;
        temperaturePopupValue.textContent = `${value}`;
        temperatureValue.textContent = `${value}`;
        localStorage.setItem('display_temperature', value);
        updateTemperatureIcon(value);
        updateTemperature(value);
    });
    
    // Brightness control event listener
    brightnessSlider.addEventListener('input', function(e) {
        const value = e.target.value;
        updateBrightness(value);
        localStorage.setItem('page_brightness', value);
    });
    
    // Override showPopup function to respect silent mode
    const originalShowPopup = window.showPopup;
    if (typeof originalShowPopup === 'function') {
        window.showPopup = function(message) {
            // Check if silent mode is enabled
            if (localStorage.getItem('silentMode') === 'true') {
                console.log('Silent mode active, suppressing popup:', message);
                return; // Don't show popup if silent mode is enabled
            }
            
            // Otherwise, call the original function
            originalShowPopup(message);
        };
    }
    
    // Add CSS for the overlays
    const style = document.createElement('style');
    style.textContent = `
        #brightness-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999999;
            display: block !important;
        }
        
        #temperature-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999998;
            mix-blend-mode: multiply;
            display: block !important;
        }
    `;
    document.head.appendChild(style);
});

window.addEventListener('load', checkFullscreen);

// Listen for fullscreen change events across different browsers
document.addEventListener('fullscreenchange', checkFullscreen);
document.addEventListener('webkitfullscreenchange', checkFullscreen);
document.addEventListener('mozfullscreenchange', checkFullscreen);
document.addEventListener('MSFullscreenChange', checkFullscreen);

window.addEventListener('load', () => {
    ensureVideoLoaded();
    consoleLoaded();
});

// Close customizeModal when clicking outside
blurOverlayControls.addEventListener('click', () => {
    customizeModal.classList.remove('show'); // Start animation
    blurOverlayControls.classList.remove('show');

    setTimeout(() => {
        customizeModal.style.display = 'none'; // Hide after animation
        blurOverlayControls.style.display = 'none';
    }, 300);
});

function closeControls() {
    customizeModal.classList.remove('show'); // Start animation
    blurOverlayControls.classList.remove('show');

    setTimeout(() => {
        customizeModal.style.display = 'none'; // Hide after animation
        blurOverlayControls.style.display = 'none';
    }, 300);
}

document.addEventListener("DOMContentLoaded", function() {
    updateGurappsVisibility();
});

document.addEventListener('DOMContentLoaded', function() {
    // Perform the initial setup
    firstSetup();

    // Add event listener to the language switcher
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.addEventListener('change', function () {
            const selectedLanguage = this.value;
            selectLanguage(selectedLanguage);
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const resetButton = document.getElementById('resetButton');

    resetButton.addEventListener('click', function() {
        // Use language variable for confirmation message
        const confirmReset = confirm(currentLanguage.RESET_CONFIRM);

        if (confirmReset) {
            localStorage.clear();
            sessionStorage.clear();
            clearCookies();

            // Use language variable for success alert
            alert(currentLanguage.RESET_SUCCESS);

            window.location.reload();
        }
    });

    function clearCookies() {
        const cookies = document.cookie.split(";");

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
  // Initialize wallpaper tracking
  initializeWallpaperTracking();
  
  // Initialize and prepare to apply the correct wallpaper
  initializeAndApplyWallpaper().catch(error => {
      console.error("Error initializing wallpaper:", error);
  });
    
  // Create the initial page indicator
  initializePageIndicator();
  addPageIndicatorStyles();
  checkWallpaperState();
});

window.addEventListener('load', () => {
    promptToInstallPWA();
});

setInterval(ensureVideoLoaded, 1000);

function preventLeaving() {
  window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    e.returnValue = ''; // Standard for most browsers
    return ''; // For some older browsers
  });
}

function checkScreenSize() {
  if (window.innerWidth < 680) {
    showPopup(currentLanguage.LARGE_SCR_REQ);
  }
}

// Check on page load
window.addEventListener('load', checkScreenSize);

// Check when window is resized
window.addEventListener('resize', checkScreenSize);

// Gurapp to Gurapp functionality
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin) return;

  const { targetApp, ...payload } = event.data;
  if (!targetApp) return;         // ignore if no target specified

  // find the iframe for that app
  const iframe = document.querySelector(
    `iframe[data-app-id="${targetApp}"]`
  );
  if (!iframe) {
    console.warn(`No iframe for app "${targetApp}"`);
    return;
  }

  iframe.contentWindow.postMessage(payload, window.location.origin);
});

    // Initialize app drawer
    function initAppDraw() {
        createAppIcons();
        setupDrawerInteractions();
    }

    // Call initialization
    initializeCustomization();
    setupWeatherToggle()
    initAppDraw();
    updateWeatherVisibility();
    preventLeaving();
