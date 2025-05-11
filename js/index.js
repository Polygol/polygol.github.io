let currentLanguage = LANG_EN; // Default to English

function applyLanguage(language) {
    console.log('Applying language:', language);
    document.getElementById('search-input').placeholder = language.SEARCH_PLACEHOLDER;
    document.querySelector('.modal-content h2').innerText = language.CONTROLS;
    document.querySelector('#silent_switch_qc .qc-label').innerText = language.SILENT;
    document.querySelector('#temp_control_qc .qc-label').innerText = language.TONE;
    document.querySelector('#minimal_mode_qc .qc-label').innerText = language.MINIMAL;
    document.querySelector('#light_mode_qc .qc-label').innerText = language.DAYLIGHT;

    // Updating text content without removing icons
    document.querySelector('.weather-settings .cust-label').childNodes[2].textContent = language.WEATHER;
    document.querySelector('.gurapps-optional .cust-label').childNodes[2].textContent = language.GURAPPS;
    document.querySelector('.search-toggle .cust-label').childNodes[2].textContent = language.SEARCH_ENABLE;
    document.querySelector('.search-engine-options .cust-label').childNodes[2].textContent = language.SEARCH_ENGINE;
    document.querySelector('.search-ai-options .cust-label').childNodes[2].textContent = language.SEARCH_AI;
    document.querySelector('.clock-color-settings .cust-label').childNodes[2].textContent = language.CLOCK_COLOR;
    document.querySelector('.clock-settings .cust-label').childNodes[2].textContent = language.SECONDS;
    document.querySelector('.animation-settings .cust-label').childNodes[2].textContent = language.MOTION;
    document.querySelector('.contrast-settings .cust-label').childNodes[2].textContent = language.CONTRAST;
    document.querySelector('.wallpaper-upload .cust-label').childNodes[2].textContent = language.WALLPAPER;
    document.querySelector('#uploadButton').innerText = language.ADD;
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

    // Ensuring only the text node is updated
    const thermostatPopupHeader = document.querySelector('#thermostat-popup .thermostat-popup-header');
    if (thermostatPopupHeader && thermostatPopupHeader.childNodes.length > 2) {
        thermostatPopupHeader.childNodes[2].textContent = language.ADJUST;
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
const dbName = 'WallpaperDB';
const storeName = 'wallpapers';
const version = 1;
const VIDEO_VERSION = '1.0';

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
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
            timezoneModal.classList.contains('show') || 
            customizeModal.classList.contains('show') ||
            (appDrawer && appDrawer.classList.contains('open')) ||
            document.querySelector('.fullscreen-embed[style*="display: block"]'); // Only count visible embeds
            
        if (isModalOpen) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            persistentClock.textContent = `${hours}:${minutes}`;
        } else {
            persistentClock.innerHTML = '<span class="material-symbols-rounded">page_info</span>';
        }
    }
    
    // Make sure we re-attach the click event listener
    persistentClock.addEventListener('click', () => {
        // Check if there's a visible embed open before showing customize modal
        const visibleEmbed = document.querySelector('.fullscreen-embed[style*="display: block"]');
        if (!visibleEmbed) {
            customizeModal.style.display = 'block';
            setTimeout(() => {
                customizeModal.classList.add('show');
                blurOverlayControls.classList.add('show');
                blurOverlayControls.style.display = 'block';
            }, 5);
        }
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
    setInterval(updatePersistentClock, 500);
    
    // Initial update
    updatePersistentClock();
}); 

// Function to update the document title
function updateTitle() {
    if (timeLeft > 0 && timerId) {
        document.title = `${formatTime(timeLeft)} ⏱️`;
    } else {
        let now = new Date();
        let hours = String(now.getHours()).padStart(2, '0');
        let minutes = String(now.getMinutes()).padStart(2, '0');
        let seconds = String(now.getSeconds()).padStart(2, '0');
        
        const timeString = showSeconds ? 
            `${hours}:${minutes}:${seconds}` : 
            `${hours}:${minutes}`;
            
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

// Start an interval to update the title every second
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
    });
    
    updateWeatherVisibility();
}

function updateClockAndDate() {
    let clockElement = document.getElementById('clock');
    let dateElement = document.getElementById('date');
    let modalTitle = document.querySelector('#customizeModal h2'); // Select the <h2> inside the modal
    
    let now = new Date();
    
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = showSeconds ? 
        `${hours}:${minutes}:${seconds}` : 
        `${hours}:${minutes}`;
        
    let formattedDate = now.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    dateElement.textContent = formattedDate;
    modalTitle.textContent = formattedDate; // Update <h2> with the date
}

async function fetchLocationAndWeather() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const geocodingUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                let city = 'Unknown Location';
                
                try {
                    const geocodingResponse = await fetch(geocodingUrl);
                    const geocodingData = await geocodingResponse.json();
                    city = geocodingData.address.city ||
                        geocodingData.address.town ||
                        geocodingData.address.village ||
                        'Unknown Location';
                } catch (geocodingError) {
                    console.warn('Failed to retrieve your weather location', geocodingError);
                }

                const currentWeatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
                const dailyForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,weathercode&timezone=Europe/London`;
                const hourlyForecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode&timezone=Europe/London`;
                
                const [currentResponse, dailyResponse, hourlyResponse] = await Promise.all([
                    fetch(currentWeatherUrl),
                    fetch(dailyForecastUrl),
                    fetch(hourlyForecastUrl)
                ]);

                const currentWeatherData = await currentResponse.json();
                const dailyForecastData = await dailyResponse.json();
                const hourlyForecastData = await hourlyResponse.json();
 
                resolve({
                    city,
                    current: currentWeatherData.current_weather,
                    dailyForecast: dailyForecastData.daily,
                    hourlyForecast: hourlyForecastData.hourly
                });

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
        temperatureElement.textContent = `${Math.round(weatherData.current.temperature)}°`;
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

// Helper function to determine if a specific hour is daytime
function isDaytimeForHour(timeString) {
    const hour = new Date(timeString).getHours();
    return hour >= 6 && hour <= 18;
}

const clockElement = document.getElementById('clock');
const weatherWidget = document.getElementById('weather');
const dateElement = document.getElementById('date');
const timezoneModal = document.getElementById('timezoneModal');
const closeModal = document.getElementById('closeModal');
const blurOverlay = document.getElementById('blurOverlay');

clockElement.addEventListener('click', () => {
    timezoneModal.style.display = 'block';
    blurOverlay.style.display = 'block';
    setTimeout(() => {
        timezoneModal.classList.add('show');
        blurOverlay.classList.add('show');
        
    }, 10);
});

weatherWidget.addEventListener('click', () => {
    createFullscreenEmbed('/weather/index.html');
});

dateElement.addEventListener('click', () => {
    createFullscreenEmbed('/fantaskical/index.html');
});

closeModal.addEventListener('click', () => {
    timezoneModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        timezoneModal.style.display = 'none';
        blurOverlay.style.display = 'none';
        
    }, 300);
});

setInterval(updateClockAndDate, 1000);
setInterval(updateSmallWeather, 600000);
updateClockAndDate();
updateSmallWeather();

// Timer Variables
let totalTime = 0;
let timeLeft = 0;
let timerId = null;
const display = document.getElementById('display');
const timeInput = document.getElementById('timeInput');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const progressRing = document.querySelector('.progress-ring');
const progressCircle = document.querySelector('.progress-ring circle.progress');
const timerContainer = document.querySelector('.timer-container');

// Load the MP3 sound for the alarm
const alarmSound = new Audio('https://www.gstatic.com/delight/funbox/timer_utilitarian_v2.mp3');

const radius = progressCircle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

function setProgress(percent) {
    const offset = circumference - (percent / 100 * circumference);
    progressCircle.style.strokeDashoffset = offset;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay() {
    const percent = totalTime > 0 ? Math.min(100, Math.max(0, (timeLeft / totalTime) * 100)) : 0;
    display.textContent = formatTime(timeLeft);
    setProgress(percent);
    progressRing.classList[timeLeft > 0 ? 'add' : 'remove']('active');
}

function addTime(seconds) {
    let wasRunning = !!timerId;
    if (timerId) { clearInterval(timerId); timerId = null; startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>'; }
    timeLeft += seconds;
    if (!wasRunning) totalTime = timeLeft;
    totalTime = Math.max(totalTime, timeLeft);
    updateDisplay(); updateTimerWidget(); updateActionButtons();
}

const timerWidget = document.getElementById('timer-widget');
const timerText = document.getElementById('timer-text');

function updateTimerWidget() {
    timerWidget.style.display = timeLeft > 0 ? 'flex' : 'none';
    timerText.textContent = formatTime(timeLeft);
    const timerIcon = document.querySelector('.timer-icon');

    if (timerId) { // If timer is running (not paused)
        timerIcon.textContent = 'timer'; // Show timer icon
    } else { // If timer is paused or not started
        timerIcon.textContent = 'pause'; // Show pause icon
    }
}

function toggleTimer() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
    } else {
        if (timeLeft > 0) {
            timerId = setInterval(() => {
                timeLeft--;
                updateDisplay();
                updateTimerWidget();
                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    timerId = null;
                    startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
                    timerWidget.style.display = 'none';
                    playAlarm();
                }
            }, 1000);
            startBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>';
        }
    }
    updateActionButtons();
    updateTimerWidget(); // Added this line
}

function updateActionButtons() {
    const isAlarmPlaying = alarmSound.currentTime > 0 && !alarmSound.paused;
    if (timeLeft === 0 && isAlarmPlaying){
        startBtn.style.display = 'none';
        resetBtn.style.display = 'block';
    } else if (timeLeft === 0 && !isAlarmPlaying){
        startBtn.style.display = 'none';
        resetBtn.style.display = 'block';
    } else if (timeLeft > 0){
        startBtn.style.display = 'block';
        resetBtn.style.display = 'block';
    } else {
        startBtn.style.display = 'block';
        resetBtn.style.display = 'none';
    }
}

function resetTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null; timeLeft = 0; totalTime = 0; updateDisplay(); updateTimerWidget();
    startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
    alarmSound.pause(); alarmSound.currentTime = 0; updateActionButtons();
}

function playAlarm() {
    alarmSound.play();
    updateActionButtons();
}

display.addEventListener('click', () => {
    timeInput.value = formatTime(timeLeft).replace(':', '');
    timeInput.style.display = 'block'; display.style.display = 'none'; timeInput.focus(); updateActionButtons();
});

timeInput.addEventListener('blur', () => {
    const input = timeInput.value.padStart(4, '0');
    const minutes = parseInt(input.slice(0, -2), 10);
    const seconds = parseInt(input.slice(-2), 10);
    if (!isNaN(minutes) && !isNaN(seconds)) { timeLeft = minutes * 60 + seconds; totalTime = timeLeft; }
    updateDisplay(); updateActionButtons(); timeInput.style.display = 'none'; display.style.display = 'block';
});

timeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') timeInput.blur(); });

updateActionButtons();

function showPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '20px';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.backgroundColor = 'var(--search-background)';
    popup.style.backdropFilter = 'blur(50px)';
    popup.style.color = 'var(--text-color)';
    popup.style.padding = '20px';
    popup.style.borderRadius = '30px';
    popup.style.zIndex = '9999996';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '10px';
    popup.style.border = '1px solid var(--glass-border)';

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
        fullscreenBtn.style.border = 'none';
        fullscreenBtn.style.backgroundColor = 'var(--search-background)';
        fullscreenBtn.style.backdropFilter = 'blur(50px)';
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
        p.style.top = `${20 + (index * 70)}px`; // 70px spacing between popups
    });

    // Position the new popup
    popup.style.top = `${20 + (remainingPopups.length * 70)}px`;
    
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
                // Readjust positions of remaining popups
                const remainingPopups = document.querySelectorAll('.popup');
                remainingPopups.forEach((p, index) => {
                    p.style.top = `${20 + (index * 70)}px`;
                });
            }
        }, 500);
    }, 5000);
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

const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const autocompleteSuggestions = document.getElementById('autocomplete-suggestions');

// Add these variables at the top with your other constants
const searchEngines = {
    "Google": "https://www.google.com/search?q=",
    "Bing": "https://www.bing.com/search?q=",
    "DuckDuckGo": "https://duckduckgo.com/?q=",
    "Brave": "https://search.brave.com/search?q=",
    "Ecosia": "https://www.ecosia.org/search?q="
};

const aiEngines = {
    "Bing AI": "https://www.bing.com/search?showconv=1&sendquery=1&q=",
    "Perplexity": "https://www.perplexity.ai/search?q=",
    "You.com": "https://you.com/search?q="
};

// Default engines
let currentSearchEngine = "Google";
let currentAIEngine = "Bing AI";
let searchEnabled = true;

// Initialize the search engine and AI selectors
function initializeSelectorsSearch() {
    const searchEngineSelect = document.getElementById('search-engine-select');
    const searchAISelect = document.getElementById('search-ai-select');
    const searchSwitch = document.getElementById('search-switch');
    
    // Clear existing options
    searchEngineSelect.innerHTML = '';
    searchAISelect.innerHTML = '';
    
    // Add search engine options
    Object.keys(searchEngines).forEach(engine => {
        const option = document.createElement('option');
        option.value = engine;
        option.textContent = engine;
        option.selected = engine === currentSearchEngine;
        searchEngineSelect.appendChild(option);
    });
    
    // Add AI engine options
    Object.keys(aiEngines).forEach(engine => {
        const option = document.createElement('option');
        option.value = engine;
        option.textContent = engine;
        option.selected = engine === currentAIEngine;
        searchAISelect.appendChild(option);
    });
    
    // Set up event listeners
    searchEngineSelect.addEventListener('change', (e) => {
        currentSearchEngine = e.target.value;
        localStorage.setItem('preferredSearchEngine', currentSearchEngine);
    });
    
    searchAISelect.addEventListener('change', (e) => {
        currentAIEngine = e.target.value;
        localStorage.setItem('preferredAIEngine', currentAIEngine);
    });
    
    searchSwitch.checked = searchEnabled;
    
    // Function to toggle search elements visibility
    function updateSearchElementsVisibility() {
        // Get the search container and toggle its visibility
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.style.display = searchEnabled ? 'flex' : 'none';
        }
        
        // Also hide search engine and AI options
        const searchEngineOptions = document.querySelector('.search-engine-options');
        const searchAIOptions = document.querySelector('.search-ai-options');
        
        if (searchEngineOptions) {
            searchEngineOptions.style.display = searchEnabled ? 'flex' : 'none';
        }
        
        if (searchAIOptions) {
            searchAIOptions.style.display = searchEnabled ? 'flex' : 'none';
        }
    }
    
    // Initial check when DOM loads
    updateSearchElementsVisibility();
    
    searchSwitch.addEventListener('change', (e) => {
        searchEnabled = e.target.checked;
        localStorage.setItem('searchEnabled', searchEnabled.toString());
        updateSearchElementsVisibility();
    });
}

// Load saved preferences
function loadPreferencesSearch() {
    const savedSearchEngine = localStorage.getItem('preferredSearchEngine');
    const savedAIEngine = localStorage.getItem('preferredAIEngine');
    const savedSearchEnabled = localStorage.getItem('searchEnabled');
    
    if (savedSearchEngine && searchEngines[savedSearchEngine]) {
        currentSearchEngine = savedSearchEngine;
    }
    
    if (savedAIEngine && aiEngines[savedAIEngine]) {
        currentAIEngine = savedAIEngine;
    }
    
    if (savedSearchEnabled !== null) {
        searchEnabled = savedSearchEnabled === 'true';
        
        // Apply visibility setting on load
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.style.display = searchEnabled ? 'flex' : 'none';
        }
    }
}

const appLinks = {
    "Chronos": "https://gurasuraisu.github.io/chronos",
    "Ailuator": "https://gurasuraisu.github.io/ailuator",
    "Wordy": "https://gurasuraisu.github.io/wordy",
    "Music": "https://gurasuraisu.github.io/music",
    "Fantaskical": "https://gurasuraisu.github.io/fantaskical",
    "Clapper": "https://gurasuraisu.github.io/clapper",
    "Weather": "https://gurasuraisu.github.io/weather",
};

function fuzzySearch(query, appList) {
    const threshold = 0.5;
    let bestMatch = null;
    let highestScore = 0;

    function similarity(s1, s2) {
        let longer = s1;
        let shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;
        const editDistance = getEditDistance(longer, shorter);
        return (longerLength - editDistance) / parseFloat(longerLength);
    }

    function getEditDistance(s1, s2) {
        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i === 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        }
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }

    Object.keys(appList).forEach(app => {
        const score = similarity(query.toLowerCase(), app.toLowerCase());
        if (score > highestScore && score >= threshold) {
            highestScore = score;
            bestMatch = app;
        }
    });

    return bestMatch;
}

function updateSearchIcon(query) {
    // First check if the query matches any app
    const bestMatch = fuzzySearch(query, appLinks);
    if (bestMatch) {
        searchIcon.textContent = 'grid_view';
        return;
    }

    const firstWord = query.split(' ')[0].toLowerCase();
    if (firstWord === "how" || firstWord === "help" || firstWord === "ai" || firstWord === "why" ||
       firstWord === "what" || firstWord === "when" || firstWord === "where" || firstWord === "who" ||
       firstWord === "which" || firstWord === "can" || firstWord === "could" || firstWord === "should" ||
       firstWord === "would" || firstWord === "will" || firstWord === "does" || firstWord === "do" ||
       firstWord === "is" || firstWord === "are" || firstWord === "may" || firstWord === "might" ||
       firstWord === "shall" || firstWord === "must" || firstWord === "has" || firstWord === "have" ||
       firstWord === "had" || firstWord === "were" || firstWord === "was" || firstWord === "did" ||
       firstWord === "please" || firstWord === "tell" || firstWord === "explain" || firstWord === "show" ||
       firstWord === "describe" || firstWord === "suggest" || firstWord === "recommend" || firstWord === "need" ||
       firstWord === "anybody" || firstWord === "anyone" || firstWord === "anything" || firstWord === "wonder" ||
       firstWord === "whose" || firstWord === "whom" || firstWord === "whence" || firstWord === "whither" ||
       firstWord === "whether" || firstWord === "hasn't" || firstWord === "haven't" || firstWord === "hadn't" ||
       firstWord === "wouldn't" || firstWord === "won't" || firstWord === "wasn't" || firstWord === "weren't" ||
       firstWord === "shouldn't" || firstWord === "isn't" || firstWord === "aren't" || firstWord === "ain't" ||
       firstWord === "doesn't" || firstWord === "don't" || firstWord === "didn't" || firstWord === "couldn't" ||
       firstWord === "cannot" || firstWord === "can't" || firstWord === "mightn't" || firstWord === "mustn't" ||
       firstWord === "define" || firstWord === "compare" || firstWord === "contrast" || firstWord === "analyze" ||
       firstWord === "evaluate" || firstWord === "assess" || firstWord === "examine" || firstWord === "discuss" ||
       firstWord === "outline" || firstWord === "summarize" || firstWord === "suppose" || firstWord === "consider" ||
       firstWord === "give" || firstWord === "state" || firstWord === "determine" || firstWord === "calculate" ||
       firstWord === "compute" || firstWord === "solve" || firstWord === "find" || firstWord === "identify" ||
       firstWord === "list" || firstWord === "name" || firstWord === "specify" || firstWord === "advise" ||
       firstWord === "assist" || firstWord === "aid" || firstWord === "support" || firstWord === "guide" ||
       firstWord === "clarify" || firstWord === "elaborate" || firstWord === "illustrate" || firstWord === "demonstrate" ||
       firstWord === "somebody" || firstWord === "someone" || firstWord === "something" || firstWord === "somewhere" ||
       firstWord === "let" || firstWord === "kindly" || firstWord === "pray" || firstWord === "assist" ||
       firstWord === "hey" || firstWord === "hi" || firstWord === "hello" || firstWord === "greetings" ||
       firstWord === "excuse" || firstWord === "pardon" || firstWord === "sorry" || firstWord === "appreciate" ||
       firstWord === "thanks" || firstWord === "thank" || firstWord === "help" || firstWord === "lookup" ||
       firstWord === "search" || firstWord === "find" || firstWord === "check" || firstWord === "confirm" ||
       firstWord === "verify" || firstWord === "validate" || firstWord === "review" || firstWord === "investigate" ||
       firstWord === "wondering" || firstWord === "curious" || firstWord === "interested" || firstWord === "seeking") {
        searchIcon.textContent = 'forum';
    } else {
        searchIcon.textContent = 'search';
    }
}

function handleAppRedirect(query) {
    const bestMatch = fuzzySearch(query, appLinks);
    if (bestMatch) {
        const appLink = appLinks[bestMatch];
        createFullscreenEmbed(appLink);
        return true;
    }
    return false;
}

function showAutocomplete(query) {
    autocompleteSuggestions.innerHTML = '';

    if (query.length > 0) {
        const matchedApps = Object.keys(appLinks).filter(app => app.toLowerCase().startsWith(query.toLowerCase()));
        matchedApps.forEach(app => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('autocomplete-suggestion');
            suggestionItem.textContent = app;
            suggestionItem.addEventListener('click', () => {
                searchInput.value = app;
                autocompleteSuggestions.innerHTML = '';
            });
            autocompleteSuggestions.appendChild(suggestionItem);
        });
    }
}

searchInput.addEventListener('input', (event) => {
    const query = searchInput.value.trim();
    updateSearchIcon(query);
    showAutocomplete(query);
});

searchInput.addEventListener('blur', () => {
    // Hide autocomplete suggestions
    autocompleteSuggestions.innerHTML = '';
    
    // Reset the search text to blank (if you want to clear it on blur)
    searchInput.value = '';
    
    // Reset the search icon to default
    searchIcon.textContent = 'search';
});

searchInput.addEventListener('click', () => {
    searchInput.select();
});
searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        updateSearchIcon(query);
        
        if (handleAppRedirect(query)) {
            searchInput.value = ''; // Clear search input
            autocompleteSuggestions.innerHTML = ''; // Clear autocomplete suggestions
            searchIcon.textContent = 'search'; // Reset icon to default
            searchInput.blur(); // Remove focus
            return;
        }
        
        if (searchEnabled) {
            const firstWord = query.split(' ')[0].toLowerCase();
            if (firstWord === "how" || firstWord === "help" || firstWord === "ai" || firstWord === "why" ||
            firstWord === "what" || firstWord === "when" || firstWord === "where" || firstWord === "who" ||
            firstWord === "which" || firstWord === "can" || firstWord === "could" || firstWord === "should" ||
            firstWord === "would" || firstWord === "will" || firstWord === "does" || firstWord === "do" ||
            firstWord === "is" || firstWord === "are" || firstWord === "may" || firstWord === "might" ||
            firstWord === "shall" || firstWord === "must" || firstWord === "has" || firstWord === "have" ||
            firstWord === "had" || firstWord === "were" || firstWord === "was" || firstWord === "did" ||
            firstWord === "please" || firstWord === "tell" || firstWord === "explain" || firstWord === "show" ||
            firstWord === "describe" || firstWord === "suggest" || firstWord === "recommend" || firstWord === "need" ||
            firstWord === "anybody" || firstWord === "anyone" || firstWord === "anything" || firstWord === "wonder" ||
            firstWord === "whose" || firstWord === "whom" || firstWord === "whence" || firstWord === "whither" ||
            firstWord === "whether" || firstWord === "hasn't" || firstWord === "haven't" || firstWord === "hadn't" ||
            firstWord === "wouldn't" || firstWord === "won't" || firstWord === "wasn't" || firstWord === "weren't" ||
            firstWord === "shouldn't" || firstWord === "isn't" || firstWord === "aren't" || firstWord === "ain't" ||
            firstWord === "doesn't" || firstWord === "don't" || firstWord === "didn't" || firstWord === "couldn't" ||
            firstWord === "cannot" || firstWord === "can't" || firstWord === "mightn't" || firstWord === "mustn't" ||
            firstWord === "define" || firstWord === "compare" || firstWord === "contrast" || firstWord === "analyze" ||
            firstWord === "evaluate" || firstWord === "assess" || firstWord === "examine" || firstWord === "discuss" ||
            firstWord === "outline" || firstWord === "summarize" || firstWord === "suppose" || firstWord === "consider" ||
            firstWord === "give" || firstWord === "state" || firstWord === "determine" || firstWord === "calculate" ||
            firstWord === "compute" || firstWord === "solve" || firstWord === "find" || firstWord === "identify" ||
            firstWord === "list" || firstWord === "name" || firstWord === "specify" || firstWord === "advise" ||
            firstWord === "assist" || firstWord === "aid" || firstWord === "support" || firstWord === "guide" ||
            firstWord === "clarify" || firstWord === "elaborate" || firstWord === "illustrate" || firstWord === "demonstrate" ||
            firstWord === "somebody" || firstWord === "someone" || firstWord === "something" || firstWord === "somewhere" ||
            firstWord === "let" || firstWord === "kindly" || firstWord === "pray" || firstWord === "assist" ||
            firstWord === "hey" || firstWord === "hi" || firstWord === "hello" || firstWord === "greetings" ||
            firstWord === "excuse" || firstWord === "pardon" || firstWord === "sorry" || firstWord === "appreciate" ||
            firstWord === "thanks" || firstWord === "thank" || firstWord === "help" || firstWord === "lookup" ||
            firstWord === "search" || firstWord === "find" || firstWord === "check" || firstWord === "confirm" ||
            firstWord === "verify" || firstWord === "validate" || firstWord === "review" || firstWord === "investigate" ||
            firstWord === "wondering" || firstWord === "curious" || firstWord === "interested" || firstWord === "seeking") {
                createFullscreenEmbed(`${aiEngines[currentAIEngine]}${encodeURIComponent(query)}`);
            } else if (query) {
                createFullscreenEmbed(`${searchEngines[currentSearchEngine]}${encodeURIComponent(query)}`);
            }
        }
        
        searchInput.value = ''; // Clear search input
        autocompleteSuggestions.innerHTML = ''; // Clear autocomplete suggestions
        searchIcon.textContent = 'search'; // Reset icon to default
        searchInput.blur(); // Remove focus
    }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadPreferencesSearch();
    initializeSelectorsSearch();
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize control states
    const storedLightMode = localStorage.getItem('theme') || 'dark';
    const storedMinimalMode = localStorage.getItem('minimalMode') === 'true';
    const storedSilentMode = localStorage.getItem('silentMode') === 'true';
    const storedTemperature = localStorage.getItem('display_temperature') || '30';
    
    // Get elements using your existing IDs
    const lightModeControl = document.getElementById('light_mode_qc');
    const minimalModeControl = document.getElementById('minimal_mode_qc');
    const silentModeControl = document.getElementById('silent_switch_qc');
    const temperatureControl = document.getElementById('temp_control_qc');
    
    const silentModeSwitch = document.getElementById('silent_switch');
    const minimalModeSwitch = document.getElementById('security-switch');
    const lightModeSwitch = document.getElementById('camera-switch');
    
    const temperatureValue = document.getElementById('thermostat-value');
    const temperaturePopup = document.getElementById('thermostat-popup');
    const temperatureSlider = document.getElementById('thermostat-control');
    const temperaturePopupValue = document.getElementById('thermostat-popup-value');
    const closePopupBtn = document.getElementById('close-thermostat-popup');
    
    // Set initial states from localStorage or defaults
    lightModeSwitch.checked = storedLightMode === 'light';
    if (lightModeSwitch.checked) lightModeControl.classList.add('active');
    
    minimalModeSwitch.checked = storedMinimalMode;
    if (minimalModeSwitch.checked) minimalModeControl.classList.add('active');
    
    silentModeSwitch.checked = storedSilentMode;
    if (silentModeSwitch.checked) silentModeControl.classList.add('active');
    
    if (storedTemperature) {
        temperatureSlider.value = storedTemperature;
        temperatureValue.textContent = `${storedTemperature}°`;
        temperaturePopupValue.textContent = `${storedTemperature}°`;
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

        // Notify other components via postMessage
        window.postMessage(
           { 
                type: 'themeUpdate', 
                theme: newTheme 
            }, 
            window.location.origin
        );
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
    });

    // Event listener for silent mode control
    silentModeControl.addEventListener('click', function() {
        silentModeSwitch.checked = !silentModeSwitch.checked;
        this.classList.toggle('active');
        
        const silentMode = silentModeSwitch.checked;
        localStorage.setItem('silentMode', silentMode);
        
        // Override the showPopup function based on silent mode state
        if (silentMode) {
            // Store the original function if not already stored
            if (!window.originalShowPopup) {
                window.originalShowPopup = window.showPopup;
            }
            
            // Replace with silent version (that does nothing)
            window.showPopup = function(message) {
                console.log('Silent mode suppressing popup:', message);
                // Do nothing - this effectively hides all popups
            };
            
            console.log('Silent mode enabled');
        } else {
            // Restore the original function if we have it stored
            if (window.originalShowPopup) {
                window.showPopup = window.originalShowPopup;
                console.log('Silent mode disabled');
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
                console.log('Silent mode active, suppressing popup:', message);
                // Do nothing - this effectively hides all popups
            };
            
            console.log('Silent mode initialized - popups will be suppressed');
        }
    })();
    
    // Temperature popup functionality - reusing your existing thermostat code
    temperatureControl.addEventListener('click', function(e) {
        // Position the popup below the temperature control
        const rect = temperatureControl.getBoundingClientRect();
        temperaturePopup.style.top = `${rect.bottom + 5}px`;
        temperaturePopup.style.left = `${rect.left + (rect.width / 2) - 125}px`; // Center the popup
        
        // Show the popup
        temperaturePopup.style.display = 'block';
        
        // Prevent propagation to avoid immediate closing
        e.stopPropagation();
    });
    
    closePopupBtn.addEventListener('click', function() {
        temperaturePopup.style.display = 'none';
    });
    
    // Close popup when clicking outside - reusing your existing pattern
    document.addEventListener('click', function(e) {
        if (temperaturePopup.style.display === 'block' && 
            !temperaturePopup.contains(e.target) && 
            e.target !== temperatureControl) {
            temperaturePopup.style.display = 'none';
        }
    });
    
    temperatureSlider.addEventListener('input', function(e) {
        const value = e.target.value;
        temperaturePopupValue.textContent = `${value}°`;
        temperatureValue.textContent = `${value}°`;
        localStorage.setItem('display_temperature', value);
        updateTemperatureIcon(value);
    });
    
    // Function to update the temperature icon based on value
    function updateTemperatureIcon(value) {
        const temperatureIcon = temperatureControl.querySelector('.material-symbols-rounded');
        if (!temperatureIcon) return;
        
        if (parseInt(value) <= 15) {
            temperatureIcon.textContent = 'thermometer_minus'; // Cold
        } else if (parseInt(value) <= 25) {
            temperatureIcon.textContent = 'thermostat_auto'; // Normal
        } else {
            temperatureIcon.textContent = 'thermometer_add'; // Hot
        }
    }
    
    // Initialize the temperature icon on page load
    updateTemperatureIcon(storedTemperature);
    
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
});

const customizeButton = document.getElementById('customize');
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
    
    // Send message to app side to sync animation preference
    window.postMessage({
        type: 'animationsUpdate',
        enabled: enableAnimations
    }, window.location.origin);
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
        
        // Re-enable search for apps
        const appKeys = Object.keys(appLinks);
        appKeys.forEach(key => {
            if (key !== "Google") { // Keep Google search available
                appLinks[key] = apps[key].url;
            }
        });
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
        
        // Disable search for apps
        const appKeys = Object.keys(appLinks);
        appKeys.forEach(key => {
            if (key !== "Google") { // Keep Google search available
                delete appLinks[key];
            }
        });
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
        document.getElementById('search-container'),
        document.getElementById('weather'),
        document.getElementById('customize'),
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
        
        if (document.getElementById('search-container'))
            document.getElementById('search-container').style.display = 'flex';
        
        if (document.getElementById('customize'))
            document.getElementById('customize').style.display = 'block';
            
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
    body.minimal-active #date,
    body.minimal-active .persistent-clock,
    body.minimal-active .drawer-handle {
        opacity: 0.5;
        transition: opacity 0.3s ease;
    }
    
    body.minimal-active .drawer-pill:hover,
    body.minimal-active #date:hover,
    body.minimal-active .persistent-clock:hover,
    body.minimal-active .drawer-handle:hover {
        opacity: 1;
    }

    body.minimal-active .blur-overlay {
    	backdrop-filter: blur(50px);
    }
    
    body.minimal-active .clock {
    	font-size: clamp(6rem, 20vw, 20rem);
    }
    
    body.minimal-active .drawer-pill {
        background: rgba(255, 255, 255, 0);
    }
`;
document.head.appendChild(style);

// Customize modal functionality
customizeButton.addEventListener('click', () => {
    customizeModal.style.display = 'block';
    blurOverlayControls.style.display = 'block';
    setTimeout(() => {
        customizeModal.classList.add('show');
        blurOverlayControls.classList.add('show');
    }, 10);
});

// Wallpaper upload functionality
uploadButton.addEventListener('click', () => {
    wallpaperInput.click();
});

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

wallpaperInput.addEventListener('change', async (event) => {
  let files = Array.from(event.target.files);
  if (files.length === 0) return;
  
  try {
    if (files.length === 1) {
      localStorage.removeItem('wallpapers');
      clearInterval(slideshowInterval);
      slideshowInterval = null;
      isSlideshow = false;
      
      let file = files[0];
      if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'video/mp4'].includes(file.type)) {
        saveWallpaper(file);
      } else {
        showPopup(currentLanguage.WALLPAPER_UPDATE_FAIL);
      }
    } else {
      let wallpaperEntries = [];
      
      for (let file of files) {
        if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'video/mp4'].includes(file.type)) {
          if (file.type.startsWith('video/')) {
            await storeVideo(file);
            wallpaperEntries.push({
              type: file.type,
              isVideo: true
            });
          } else {
            let dataUrl = await compressMedia(file);
            wallpaperEntries.push({
              type: file.type,
              data: dataUrl,
              isVideo: false
            });
          }
        }
      }
      
      if (wallpaperEntries.length > 0) {
        localStorage.setItem('wallpapers', JSON.stringify(wallpaperEntries));
        currentWallpaperIndex = 0;
        isSlideshow = true;
        
        // Add slideshow as an entry in recent wallpapers
        recentWallpapers.unshift({
          isSlideshow: true,
          timestamp: Date.now()
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
    console.error('Error handling wallpapers:', error);
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
    // For images, try storing without compression first
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const uncompressedData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });

        // Check if uncompressed data can be stored
        if (checkStorageQuota(uncompressedData)) {
            return uncompressedData;
        }

        // If quota exceeded, compress the image
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                const maxDimension = 1920;
                
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
                
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                URL.revokeObjectURL(img.src);
                resolve(compressedDataUrl);
            };
        });
    }
    
    // For videos, use object URL
    if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        return url;
    }
    
    // For other files, return as is
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

async function saveWallpaper(file) {
  try {
    if (file.type.startsWith('video/')) {
      await storeVideo(file);
      localStorage.setItem('wallpaperType', file.type);
      
      // Add to recent wallpapers
      recentWallpapers.unshift({
        type: file.type,
        isVideo: true,
        timestamp: Date.now()
      });
      
    } else {
      let dataUrl = await compressMedia(file);
      try {
        localStorage.setItem('wallpaperType', file.type);
        localStorage.setItem('customWallpaper', dataUrl);
        
        // Add to recent wallpapers
        recentWallpapers.unshift({
          type: file.type,
          data: dataUrl,
          isVideo: false,
          timestamp: Date.now()
        });
        
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          showPopup(currentLanguage.WALLPAPER_UPDATE_FAIL);
          return;
        }
        throw error;
      }
    }
    
    // Clear slideshow flag and settings when uploading a single wallpaper
    isSlideshow = false;
    localStorage.removeItem('wallpapers');
    
    // Limit to MAX_RECENT_WALLPAPERS
    while (recentWallpapers.length > MAX_RECENT_WALLPAPERS) {
      recentWallpapers.pop();
    }
    
    saveRecentWallpapers();
    currentWallpaperPosition = 0;
    applyWallpaper();
    showPopup(currentLanguage.WALLPAPER_UPDATED);
  } catch (error) {
    console.error('Error saving wallpaper:', error);
    showPopup(currentLanguage.WALLPAPER_SAVE_FAIL);
  }
}

async function applyWallpaper() {
    const wallpapers = JSON.parse(localStorage.getItem('wallpapers'));
    
    if (wallpapers && wallpapers.length > 0) {
        // Clear existing interval if any
        clearInterval(slideshowInterval);
        
        // Function to show next wallpaper
        async function showNextWallpaper() {
            const wallpaper = wallpapers[currentWallpaperIndex];
            
            try {
                if (wallpaper.isVideo) {
                    const videoData = await getVideo();
                    if (videoData && videoData.blob) {
                        const existingVideo = document.querySelector('#background-video');
                        if (existingVideo) {
                            URL.revokeObjectURL(existingVideo.src);
                            existingVideo.remove();
                        }

                        const video = document.createElement('video');
                        video.id = 'background-video';
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.style.position = 'fixed';
                        video.style.minWidth = '100%';
                        video.style.minHeight = '100%';
                        video.style.width = 'auto';
                        video.style.height = 'auto';
                        video.style.zIndex = '-1';
                        video.style.objectFit = 'cover';
                        
                        const blobUrl = URL.createObjectURL(videoData.blob);
                        video.src = blobUrl;

                        video.onerror = (e) => {
                            console.error('Video loading error:', e);
                        };

                        video.onloadeddata = () => {
                            document.body.insertBefore(video, document.body.firstChild);
                            document.body.style.backgroundImage = 'none';
                        };

                        video.load();
                    }
                } else {
                    const existingVideo = document.querySelector('#background-video');
                    if (existingVideo) {
                        URL.revokeObjectURL(existingVideo.src);
                        existingVideo.remove();
                    }

                    document.body.style.backgroundImage = `url('${wallpaper.data}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundRepeat = 'no-repeat';
                }
                
                currentWallpaperIndex = (currentWallpaperIndex + 1) % wallpapers.length;
            } catch (error) {
                console.error('Error applying wallpaper:', error);
            }
        }
        
        // Show first wallpaper immediately
        await showNextWallpaper();
        
        // Set up interval for slideshow
        slideshowInterval = setInterval(showNextWallpaper, SLIDESHOW_INTERVAL);
    } else {
        const wallpaperType = localStorage.getItem('wallpaperType');
        
        try {
            if (wallpaperType && wallpaperType.startsWith('video/')) {
                const videoData = await getVideo();
                if (videoData && videoData.blob) {
                    const existingVideo = document.querySelector('#background-video');
                    if (existingVideo) {
                        URL.revokeObjectURL(existingVideo.src);
                        existingVideo.remove();
                    }

                    const video = document.createElement('video');
                    video.id = 'background-video';
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.style.position = 'fixed';
                    video.style.minWidth = '100%';
                    video.style.minHeight = '100%';
                    video.style.width = 'auto';
                    video.style.height = 'auto';
                    video.style.zIndex = '-1';
                    video.style.objectFit = 'cover';
                    
                    const blobUrl = URL.createObjectURL(videoData.blob);
                    video.src = blobUrl;

                    video.onerror = (e) => {
                        console.error('Video loading error:', e);
                    };

                    video.onloadeddata = () => {
                        document.body.insertBefore(video, document.body.firstChild);
                        document.body.style.backgroundImage = 'none';
                    };

                    video.load();
                }
            } else {
                const savedWallpaper = localStorage.getItem('customWallpaper');
                if (savedWallpaper) {
                    const existingVideo = document.querySelector('#background-video');
                    if (existingVideo) {
                        URL.revokeObjectURL(existingVideo.src);
                        existingVideo.remove();
                    }

                    document.body.style.backgroundImage = `url('${savedWallpaper}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundRepeat = 'no-repeat';
                }
            }
        } catch (error) {
            console.error('Error applying wallpaper:', error);
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
function removeWallpaper(index) {
  // Remove the wallpaper from history
  recentWallpapers.splice(index, 1);
  
  // Update local storage
  localStorage.setItem('recentWallpapers', JSON.stringify(recentWallpapers));
  
  // Handle case where all wallpapers are removed
  if (recentWallpapers.length === 0) {
    // Reset to default wallpaper or empty state
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    isSlideshow = false;
    
    // Remove custom wallpaper settings
    localStorage.removeItem('customWallpaper');
    localStorage.removeItem('wallpapers');
    localStorage.removeItem('wallpaperOrder'); // Clear saved position
    
    currentWallpaperPosition = 0;
    
    // Set to default wallpaper type
    localStorage.setItem('wallpaperType', 'default');
    
    // Apply default wallpaper
    applyWallpaper();
    
    // Show confirmation
    showPopup(currentLanguage.ALL_WALLPAPER_REMOVE);
    
    // Update the indicator
    updatePageIndicatorDots(true);
    return;
  }
  
  // Adjust current position if needed
  if (index === currentWallpaperPosition) {
    // If we removed the current wallpaper, go to the previous one
    currentWallpaperPosition = Math.max(0, currentWallpaperPosition - 1);
    
    // Save the updated position
    saveCurrentPosition();
    
    // Apply the new current wallpaper (passing 'none' to not change position)
    switchWallpaper('none');
  } else if (index < currentWallpaperPosition) {
    // If we removed a wallpaper before the current one, adjust the position
    currentWallpaperPosition--;
    
    // Save the updated position
    saveCurrentPosition();
  }
  
  // Show confirmation
  showPopup(currentLanguage.WALLPAPER_REMOVE);
  
  // Force recreate dots when removing a wallpaper
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
function jumpToWallpaper(index) {
  if (index < 0 || index >= recentWallpapers.length || index === currentWallpaperPosition) {
    return;
  }
  
  currentWallpaperPosition = index;
  
  // Save the position for persistence
  saveCurrentPosition();
  
  const wallpaper = recentWallpapers[currentWallpaperPosition];
  
  // Clear current slideshow if it's running
  clearInterval(slideshowInterval);
  slideshowInterval = null;
  
  // Apply the selected wallpaper
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
    // Apply a single wallpaper
    isSlideshow = false;
    localStorage.removeItem('wallpapers');
    
    if (wallpaper.isVideo) {
      localStorage.setItem('wallpaperType', wallpaper.type);
      applyWallpaper();
    } else {
      localStorage.setItem('wallpaperType', wallpaper.type);
      localStorage.setItem('customWallpaper', wallpaper.data);
      applyWallpaper();
    }
  }
  
  // Only update the active state of dots
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
  
  // Calculate new position
  let newPosition = currentWallpaperPosition;
  
  if (direction === 'right') {
    newPosition++;
    if (newPosition >= recentWallpapers.length) {
      // Implement wrapping or stop at the end
      // For UX consistency, let's not wrap around
      newPosition = recentWallpapers.length - 1;
      return;
    }
  } else if (direction === 'left') {
    newPosition--;
    if (newPosition < 0) {
      // Don't go below zero
      newPosition = 0;
      return;
    }
  } else {
    // If 'none' is passed, we still want to apply the current position's wallpaper
    // without changing the position
  }
  
  // Only proceed if position actually changed or we're reapplying
  if (newPosition !== currentWallpaperPosition && direction !== 'none') {
    currentWallpaperPosition = newPosition;
  }
  
  const wallpaper = recentWallpapers[currentWallpaperPosition];
  
  // Save the position for persistence
  saveCurrentPosition();
  
  // Clear current slideshow if it's running
  clearInterval(slideshowInterval);
  slideshowInterval = null;
  
  // Apply the selected wallpaper
  if (wallpaper.isSlideshow) {
    // If it's the slideshow entry, restart the slideshow
    isSlideshow = true;
    const wallpapers = JSON.parse(localStorage.getItem('wallpapers'));
    if (wallpapers && wallpapers.length > 0) {
      localStorage.setItem('wallpapers', JSON.stringify(wallpapers));
      currentWallpaperIndex = 0;
      applyWallpaper();
      showPopup(currentLanguage.SLIDESHOW_WALLPAPER);
    }
  } else {
    // Apply a single wallpaper
    isSlideshow = false;
    localStorage.removeItem('wallpapers');
    
    if (wallpaper.isVideo) {
      localStorage.setItem('wallpaperType', wallpaper.type);
      // Video is already stored in IndexedDB
      applyWallpaper();
    } else {
      localStorage.setItem('wallpaperType', wallpaper.type);
      localStorage.setItem('customWallpaper', wallpaper.data);
      applyWallpaper();
    }
  }
  
  // Only update the active state of dots
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

function initializeAndApplyWallpaper() {
  // Load saved position
  loadSavedPosition();
  
  // Make sure current position is valid
  if (recentWallpapers.length > 0) {
    if (currentWallpaperPosition >= recentWallpapers.length) {
      currentWallpaperPosition = recentWallpapers.length - 1;
      saveCurrentPosition();
    }
    
    // Apply the correct wallpaper
    const wallpaper = recentWallpapers[currentWallpaperPosition];
    
    // We don't need to call applyWallpaper() here as it will be called
    // by the existing page initialization code, just set up the correct 
    // localStorage values for it to use
    
    if (wallpaper.isSlideshow) {
      isSlideshow = true;
      // Keep the existing wallpapers array in localStorage
    } else {
      isSlideshow = false;
      localStorage.removeItem('wallpapers');
      
      if (wallpaper.isVideo) {
        localStorage.setItem('wallpaperType', wallpaper.type);
      } else {
        localStorage.setItem('wallpaperType', wallpaper.type);
        localStorage.setItem('customWallpaper', wallpaper.data);
      }
    }
  }
}

function setupFontSelection() {
    const fontSelect = document.getElementById('font-select');
    const weightSlider = document.getElementById('weight-slider');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
    const colorPicker = document.getElementById('clock-color-picker');
    const colorSwitch = document.getElementById('clock-color-switch');
    
    // Get the computed --text-color value for the default
    const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
    
    // Load saved preferences
    const savedFont = localStorage.getItem('clockFont') || 'Inter';
    const savedWeight = localStorage.getItem('clockWeight') || '700'; // Default 700
    const savedColor = localStorage.getItem('clockColor') || defaultColor;
    const colorEnabled = localStorage.getItem('clockColorEnabled') === 'true';
    
    fontSelect.value = savedFont;
    weightSlider.value = parseInt(savedWeight) / 10;
    colorPicker.value = savedColor;
    colorSwitch.checked = colorEnabled;
    
    // Apply font to both elements but weight only to clock
    function applyStyles() {
        const fontFamily = fontSelect.value;
        const fontWeight = weightSlider.value * 10; // Convert slider value to proper font weight
        
        clockElement.style.fontFamily = fontFamily;
        clockElement.style.fontWeight = fontWeight;
        
        // Only apply custom color if the switch is enabled
        if (colorSwitch.checked) {
            clockElement.style.color = colorPicker.value;
        } else {
            // Reset to default theme color
            clockElement.style.color = ''; // Empty string removes inline style, reverting to CSS
        }
        
        infoElement.style.fontFamily = fontFamily;
    }
    
    // Apply initial styles
    applyStyles();
    
    // Handle font changes
    fontSelect.addEventListener('change', (e) => {
        const selectedFont = e.target.value;
        // Ensure font is loaded before applying
        document.fonts.load(`16px ${selectedFont}`).then(() => {
            applyStyles();
            localStorage.setItem('clockFont', selectedFont);
        }).catch(() => {
            showPopup(currentLanguage.CLOCK_STYLE_FAILED);
        });
    });
    
    // Handle weight changes with the slider
    weightSlider.addEventListener('input', (e) => {
        const weightValue = e.target.value * 10; // Convert slider value to font weight
        localStorage.setItem('clockWeight', weightValue);
        applyStyles();
    });
    
    // Handle color changes with the color picker
    colorPicker.addEventListener('input', (e) => {
        localStorage.setItem('clockColor', e.target.value);
        applyStyles();
    });
    
    // Handle color switch toggle
    colorSwitch.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        localStorage.setItem('clockColorEnabled', isEnabled);
        applyStyles();
    
        // Show/hide the color picker based on switch state
        colorPicker.style.display = isEnabled ? 'inline-block' : 'none';
	colorPicker.disabled = !isEnabled;
    });
    
    // Set initial color picker state based on switch
    colorPicker.style.display = colorSwitch.checked ? 'inline-block' : 'none';
    colorPicker.disabled = !colorSwitch.checked;
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
    "Music": {
        url: "/music/index.html",
        icon: "music.png"
    },
    "Fantaskical": {
        url: "/fantaskical/index.html",
        icon: "tasks.png"
    },
    "Clapper": {
        url: "/clapper/index.html",
        icon: "video.png"
    },
    "Weather": {
        url: "/weather/index.html",
        icon: "weather.png"
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
        embedContainer.style.overflow = 'hidden'; // Ensure border radius works
        embedContainer.style.display = 'block';
        
        // IMPORTANT FIX: Restore proper z-index and pointer events
        embedContainer.style.pointerEvents = 'auto';
        embedContainer.style.zIndex = '1001'; // Higher than interaction-blocker (999)
        
        // Force reflow to apply the immediate style changes
        void embedContainer.offsetWidth;
        
        // Add transition for all properties
        embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
        
        // Trigger the animation
        setTimeout(() => {
            embedContainer.style.transform = 'scale(1)';
            embedContainer.style.opacity = '1';
            embedContainer.style.borderRadius = '0px'; // Remove border radius when fully opened
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

        const controlElements = document.querySelectorAll('.weather-settings, .gurapps-optional, .clock-color-settings, .clock-settings, .wallpaper-upload, .font-selection, .search-toggle, .search-engine-options, .search-ai-options, .weight-slider-container');
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
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    
    // Create a container for the iframe
    const embedContainer = document.createElement('div');
    embedContainer.className = 'fullscreen-embed';
    
    // Set initial styles BEFORE adding to DOM
    // No transitions yet - just set initial values
    embedContainer.style.transform = 'scale(0.8)'; 
    embedContainer.style.opacity = '0';
    embedContainer.style.borderRadius = '25px';
    embedContainer.style.overflow = 'hidden'; // Ensure border radius works with iframe
    embedContainer.style.display = 'block';
    
    // IMPORTANT FIX: Set proper z-index and pointer events
    embedContainer.style.pointerEvents = 'auto';
    embedContainer.style.zIndex = '1001'; // Higher than interaction-blocker (999)
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

    const controlElements = document.querySelectorAll('.weather-settings, .gurapps-optional, .clock-color-settings, .clock-settings, .wallpaper-upload, .font-selection, .search-toggle, .search-engine-options, .search-ai-options, .weight-slider-container');
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
    
    // Now add the transition AFTER the element is in the DOM with initial styles applied
    embedContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
    
    // Trigger the animation in the next event loop
    setTimeout(() => {
        embedContainer.style.transform = 'scale(1)';
        embedContainer.style.opacity = '1';
        embedContainer.style.borderRadius = '0px'; // Remove border radius when fully opened
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
	
    const controlElements = document.querySelectorAll('.weather-settings, .gurapps-optional, .clock-color-settings, .clock-settings, .wallpaper-upload, .font-selection, .search-toggle, .search-engine-options, .search-ai-options, .weight-slider-container');
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
    // Only add the search container if it's not already there
    if (!dock.querySelector('.search-container')) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <span id="search-icon" class="material-symbols-rounded search-icon">search</span>
            <input type="text" class="search-input" id="search-input" placeholder="LANG_SEARCH_PLACEHOLDER">
            <div id="autocomplete-suggestions" class="autocomplete-suggestions"></div>
        `;
        dock.appendChild(searchContainer);
    }
    
    // Clear only the app icons (not the search bar)
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
        dockIcon.addEventListener('click', () => {
            // Update the last opened timestamp for this app
            appLastOpened[name] = Date.now();
            saveLastOpenedData();
            createFullscreenEmbed(details.url);
            populateDock();  // Refresh the dock after clicking
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
            img.src = '/assets/appicon/question.png';
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
    const flickVelocityThreshold = 0.4;
    const dockThreshold = -25; // Threshold for dock appearance
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
        appDrawer.style.transition = 'opacity 0.3s';
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
            // Add transition class for smooth animation
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = `scale(${1 - (movementPercentage - 25) / 100})`;
            openEmbed.style.opacity = 1 - ((movementPercentage - 25) / 75);
            
            // Add dynamic border radius during drag
            const borderRadius = Math.min(25, (movementPercentage - 25) * 0.5);
            openEmbed.style.borderRadius = `${borderRadius}px`;
            
            // Make app drawer transparent when in an app
            appDrawer.style.opacity = '0';
            
            // IMPORTANT FIX: Set pointer-events to none when an embed is open
            interactionBlocker.style.pointerEvents = 'none';
        }
        
        // Show dock and hide drawer-pill
        if (movementPercentage > 10 && movementPercentage < 25) {
            dock.classList.add('show');
            dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)'; 
            drawerPill.style.opacity = '0';
        } else {
            dock.classList.remove('show');
            dock.style.boxShadow = 'none'; 
            drawerPill.style.opacity = '1';
        }
    
        const newPosition = Math.max(-100, Math.min(0, initialDrawerPosition + movementPercentage));
        
        // Only update opacity if no embed is open
        if (!openEmbed) {
            const opacity = (newPosition + 100) / 100;
            appDrawer.style.opacity = opacity;
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
            // Close embed with animation
            openEmbed.style.transition = 'transform 0.3s ease, opacity 0.3s ease, border-radius 0.3s ease';
            openEmbed.style.transform = 'scale(0.8)';
            openEmbed.style.opacity = '0';
            openEmbed.style.borderRadius = '25px'; // Fully rounded when minimized
            
            setTimeout(() => {
                minimizeFullscreenEmbed();
                
                // Hide the swipe overlay
                swipeOverlay.style.display = 'none';
                swipeOverlay.style.pointerEvents = 'none';
            }, 300);
            
            // Reset drawer state
            dock.classList.remove('show');
            dock.style.boxShadow = 'none';
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
            interactionBlocker.style.display = 'none';
        } else if (openEmbed) {
            // Reset embed if swipe wasn't enough
            openEmbed.style.transform = 'scale(1)';
            openEmbed.style.opacity = '1';
            openEmbed.style.borderRadius = '0px'; // Reset to no border radius
            
            // Keep app drawer transparent when in an app
            appDrawer.style.opacity = '0';
            
            // Handle dock visibility for smaller swipes
            if (movementPercentage > 10 && movementPercentage <= 25) {
                dock.classList.add('show');
                dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)'; // Enable box shadow when visible
                appDrawer.style.bottom = '-100%';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
            } else {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none'; // Disable box shadow when not visible
                appDrawer.style.bottom = '-100%';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
            }
        } else {
            // Normal drawer behavior when no embed is open
            // Consider both movement percentage and velocity for flick gestures
            const isSignificantSwipe = movementPercentage > 25 || isFlickUp;
            const isSmallSwipe = movementPercentage > 10 && movementPercentage <= 25;
            
            // Small swipe - show dock
            if (isSmallSwipe && !isFlickUp) {
                dock.classList.add('show');
                dock.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)'; // Enable box shadow when visible
                appDrawer.style.bottom = '-100%';
                appDrawer.style.opacity = '0';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
            } 
            // Large swipe or flick up - show full drawer
            else if (isSignificantSwipe) {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none'; // Disable box shadow when not visible
                appDrawer.style.bottom = '0%';
                appDrawer.style.opacity = '1';
                appDrawer.classList.add('open');
                initialDrawerPosition = 0;
                interactionBlocker.style.display = 'none';
            } 
            // Close everything
            else {
                dock.classList.remove('show');
                dock.style.boxShadow = 'none'; // Disable box shadow when not visible
                appDrawer.style.bottom = '-100%';
                appDrawer.style.opacity = '0';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
                interactionBlocker.style.display = 'none';
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
            
            if (deltaY > 20 && !isInSwipeMode) { // Detected upward swipe
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
            
            if (deltaY > 20 && !isInSwipeMode) {
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
	
    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (appDrawer.classList.contains('open') &&
            !appDrawer.contains(e.target) &&
            !appDrawerToggle.contains(e.target)) {
            appDrawer.style.transition = 'bottom 0.3s ease';
            appDrawer.style.bottom = '-100%';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
            interactionBlocker.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!isDrawerInMotion && 
            !dock.contains(e.target) && 
            !drawerHandle.contains(e.target) && 
            !appDrawer.classList.contains('open')) { // Only hide dock if drawer is closed
            dock.classList.remove('show');
            dock.style.boxShadow = 'none'; // Disable box shadow when hiding dock
            drawerPill.style.opacity = '1'; // Restore drawer-pill opacity when dock is hidden
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
  blockingOverlay.style.zIndex = '9999999'; // Highest z-index to block everything
  blockingOverlay.style.cursor = 'pointer';
  blockingOverlay.style.backgroundColor = 'black'; // Ensure it's completely black
  
  // Add it to the document
  document.body.appendChild(blockingOverlay);
  
  // Pause all videos, embeds, and animations
  document.querySelectorAll('video, iframe, canvas, [data-animation]').forEach(el => {
    if (el.tagName === 'VIDEO') {
      if (!el.paused) {
        el.pause();
        el.dataset.wasPlaying = 'true';
      }
    } else if (el.tagName === 'IFRAME') {
      // For iframe embeds, we'll pause them without destroying
      try {
        // Store the current state so we can resume later
        el.dataset.wasActive = 'true';
        
        // For YouTube embeds
        if (el.src.includes('youtube.com') || el.src.includes('youtu.be')) {
          el.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
        // For Vimeo embeds
        else if (el.src.includes('vimeo.com')) {
          el.contentWindow.postMessage('{"method":"pause"}', '*');
        }
        // For other embeds, we can use CSS to reduce energy usage without destroying
        el.style.pointerEvents = 'none';
      } catch (e) {
        console.error('Failed to pause embed:', e);
      }
    } else if (el.style.animationPlayState) {
      el.dataset.animationState = el.style.animationPlayState;
      el.style.animationPlayState = 'paused';
    }
  });
  
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
          // For YouTube embeds
          if (el.src.includes('youtube.com') || el.src.includes('youtu.be')) {
            el.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
          // For Vimeo embeds
          else if (el.src.includes('vimeo.com')) {
            el.contentWindow.postMessage('{"method":"play"}', '*');
          }
          // Re-enable pointer events
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

timerWidget.addEventListener('click', () => {
    toggleTimer();
});

secondsSwitch.addEventListener('change', function() {
    showSeconds = this.checked;
    localStorage.setItem('showSeconds', showSeconds);
    updateClockAndDate();
});

blurOverlay.addEventListener('click', (event) => {
    if (event.target === blurOverlay) {
        // Close all modals
        [timezoneModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                blurOverlay.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    blurOverlay.style.display = 'none';
                    
                }, 300);
            }
        });
    }
});

persistentClock.addEventListener('click', () => {
    customizeModal.style.display = 'block';
    blurOverlayControls.style.display = 'block';
    setTimeout(() => {
        customizeModal.classList.add('show');
        blurOverlayControls.classList.add('show');
    }, 10);
});

document.getElementById("versionButton").addEventListener("click", function() {
    window.open("https://kirbindustries.gitbook.io/gurasuraisu", "_blank");
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeFullscreenEmbed();
        // Close all modals
        [timezoneModal, customizeModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                blurOverlay.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    blurOverlay.style.display = 'none';
                    
                }, 300);
            }
        });
    }
});

// Add event listener for spacebar
document.addEventListener('keydown', (event) => {
    // Check if the key pressed is spacebar
    if (event.code === 'Space' || event.key === ' ') {
        // Check if no modals are open by checking the blur overlay's display state
        if (
            document.activeElement.tagName !== 'INPUT' && 
            blurOverlay.style.display !== 'block'
        ) {
            event.preventDefault(); // Prevent spacebar from scrolling the page
            searchInput.focus();
        }
    }
});

// Add event listener for keydown
document.addEventListener('keydown', (event) => {
    // Only handle keys if timer modal is open and we're not in an input field
    if (timezoneModal.classList.contains('show') && document.activeElement.tagName !== 'INPUT') {
        // Handle number keys (0-9)
        if (/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            // Only add time if timer isn't running
            const minutes = parseInt(event.key);
            addTime(minutes * 60); // Convert minutes to seconds
        }
        // Handle enter key to toggle timer
        else if (event.key === 'Enter') {
            event.preventDefault();
            toggleTimer();
        }
        // Handle backspace key to reset timer
        else if (event.key === 'Backspace') {
            event.preventDefault();
            resetTimer();
        }
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
    // Create brightness overlay div if it doesn't exist
    if (!document.getElementById('brightness-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'brightness-overlay';
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
	tempOverlay.style.display = 'block !important';
        document.body.appendChild(tempOverlay);
    }
    
    // Initialize brightness control
    const brightnessSlider = document.getElementById('brightness-control');
    const brightnessValue = document.getElementById('brightness-value');
    const brightnessOverlay = document.getElementById('brightness-overlay');
    
    // Initialize temperature control
    const temperatureSlider = document.getElementById('thermostat-control');
    const temperatureValue = document.getElementById('thermostat-value');
    const temperaturePopupValue = document.getElementById('thermostat-popup-value');
    const temperatureOverlay = document.getElementById('temperature-overlay');
    
    // Update slider range to -10 to 10
    temperatureSlider.min = -10;
    temperatureSlider.max = 10;
    
    // Get stored brightness or use default (100%)
    const storedBrightness = localStorage.getItem('page_brightness');
    
    if (storedBrightness) {
        brightnessSlider.value = storedBrightness;
        updateBrightness(storedBrightness);
    }
    
    // Get stored temperature or use default (0)
    const storedTemperature = localStorage.getItem('display_temperature') || '0';
    
    if (storedTemperature) {
        temperatureSlider.value = storedTemperature;
        temperatureValue.textContent = `${storedTemperature}`;
        temperaturePopupValue.textContent = `${storedTemperature}`;
        updateTemperature(storedTemperature);
    }
    
    // Brightness control event listener
    brightnessSlider.addEventListener('input', function(e) {
        const value = e.target.value;
        updateBrightness(value);
        localStorage.setItem('page_brightness', value);
    });
    
    // Temperature control event listener
    temperatureSlider.addEventListener('input', function(e) {
        const value = e.target.value;
        temperaturePopupValue.textContent = value;
        temperatureValue.textContent = value;
        updateTemperature(value);
        localStorage.setItem('display_temperature', value);
    });
    
    // Function to update brightness
    function updateBrightness(value) {
        brightnessValue.textContent = `${value}%`;
        
        // Calculate darkness level (inverse of brightness)
        const darknessLevel = (100 - value) / 100;
        
        // Update the overlay opacity
        brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${darknessLevel})`;
        
        // Update the icon based on brightness level
        const brightnessIcon = document.querySelector('label[for="brightness-control"] .material-symbols-rounded');
        
        if (value <= 33) {
            brightnessIcon.textContent = 'brightness_5'; // Low brightness icon
        } else if (value <= 66) {
            brightnessIcon.textContent = 'brightness_6'; // Medium brightness icon
        } else {
            brightnessIcon.textContent = 'brightness_7'; // High brightness icon
        }
    }
    
    // Function to update temperature
    function updateTemperature(value) {
        // Convert to number to ensure proper comparison
        const tempValue = parseInt(value);
        
        // Calculate intensity based on distance from 0
        const intensity = Math.abs(tempValue) / 10 * 1; // Max intensity of 1
        
        // Calculate RGB values for overlay
        let r, g, b, a;
        
        if (tempValue < 0) {
            // Cool/blue tint (more blue as value decreases)
            r = 240;
            g = 240;
            b = 255;
            a = intensity;
        } else if (tempValue > 0) {
            // Warm/yellow tint (more yellow as value increases)
            r = 255;
            g = 240;
            b = 230;
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
        
        // Update the icon based on temperature level
        const temperatureIcon = document.querySelector('#temp_control_qc .material-symbols-rounded');
        if (temperatureIcon) {
            if (tempValue <= -3) {
                temperatureIcon.textContent = 'thermometer_minus'; // Cold
            } else if (tempValue >= 3) {
                temperatureIcon.textContent = 'thermometer_add'; // Hot
            } else {
                temperatureIcon.textContent = 'thermostat_auto'; // Neutral
            }
        }
    }
    
    // Add CSS for the new temperature overlay
    const style = document.createElement('style');
    style.textContent = `
        #temperature-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999998;
            mix-blend-mode: screen;
	    display: block !important;
        }
    `;
    document.head.appendChild(style);
    
    // Temperature popup functionality - reusing existing thermostat code
    const temperatureControl = document.getElementById('temp_control_qc');
    const temperaturePopup = document.getElementById('thermostat-popup');
    const closePopupBtn = document.getElementById('close-thermostat-popup');
    
    temperatureControl.addEventListener('click', function(e) {
        // Position the popup below the temperature control
        const rect = temperatureControl.getBoundingClientRect();
        temperaturePopup.style.top = `${rect.bottom + 5}px`;
        temperaturePopup.style.left = `${rect.left + (rect.width / 2) - 125}px`; // Center the popup
        
        // Show the popup
        temperaturePopup.style.display = 'block';
        
        // Prevent propagation to avoid immediate closing
        e.stopPropagation();
    });
    
    closePopupBtn.addEventListener('click', function() {
        temperaturePopup.style.display = 'none';
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', function(e) {
        if (temperaturePopup.style.display === 'block' && 
            !temperaturePopup.contains(e.target) && 
            e.target !== temperatureControl) {
            temperaturePopup.style.display = 'none';
        }
    });
    
    // Initialize the temperature display
    updateTemperature(storedTemperature);
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
window.addEventListener('click', (event) => {
    if (!customizeModal.contains(event.target) && !persistentClock.contains(event.target)) {
        customizeModal.classList.remove('show'); // Start animation
	blurOverlayControls.classList.remove('show');
        setTimeout(() => {
            customizeModal.style.display = 'none'; // Hide after animation
	    blurOverlayControls.style.display = 'none';
        }, 300); 
    }
});

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

// Add this to the page initialization code
document.addEventListener('DOMContentLoaded', function() {
  // Initialize wallpaper tracking
  initializeWallpaperTracking();
  
  // Initialize and prepare to apply the correct wallpaper
  initializeAndApplyWallpaper();
    
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

    // Initialize app drawer
    function initAppDraw() {
        createAppIcons();
        setupDrawerInteractions();
    }

    // Call initialization
    initializeCustomization();
    setupWeatherToggle()
    updateDisplay();
    initAppDraw();
    updateWeatherVisibility();
    preventLeaving();
