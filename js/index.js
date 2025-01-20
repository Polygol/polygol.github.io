function consoleGreeting() {
    const greeting = `
                   --==++++++++++                  
                 :=++**********++++                
               :-++*************+++++              
              :=++**********++++++++++             
            :-=+***#@%#+++++*%@#+++++++            
           .:=+****%@@#+++==*@@%======++           
          :-=+*****%@@*====-*@@%=--====++          
         :-=+******%@@*-----+@@#-----====+         
        :-=+*****++#@@*--:::+@@#-:----=====+       
       :-++*****+++==--::::::::::::----======      
      :-++*****+++==--::::::::::::::-----====      
     :-=++***++++*%%%%%%%%%%%%%%%*::::------==     
    :-=+++*++++=#%@@@@@@@@@@@@@@@@*:::::::::---    
    -=+++++++===%@@@@@@@@@@@@@@@@@%:.........::    
    ==++++++=-::%@@@@@@@@@@@@@@@@@%:        ..:    
    ==++++==-:..#@@@@@@@@@@@@@@@@@%:         .:    
    ======-::...#@@@@@@@@@@@@@@@@@%:        ..:    
     ===--::....*@@@@@@@@@@@@@@@@@*.      ...:     
       =---::....+%@@@@@@@@@@@@@%*.........::      
         =-----::::::::::::::::::::::::::--        
                                                  
               Welcome to Gurasuraisu!            
            https://gurasuraisu.github.io         
    `;

    const license = `
Copyright © 2025 Gurasuraisu, kirbIndustries
Licensed under the GNU General Public License, Version 2.0 (GPL-2.0)
You may obtain a copy of the License at https://www.gnu.org/licenses/gpl-3.0.html
    `;

    const theft = `
THEFT NOTICE
Gurasuraisu is open source, and free for all.
Please make sure to use Gurasuraisu from https://gurasuraisu.github.io to avoid counterfeit versions.
    `;

    console.info(greeting);
    console.info(license);
    console.info(theft);
}
    
consoleGreeting()

const secondsSwitch = document.getElementById('seconds-switch');
const appUsage = {};
const weatherSwitch = document.getElementById('weather-switch');

let showSeconds = localStorage.getItem('showSeconds') !== 'false'; // defaults to true
let showWeather = localStorage.getItem('showWeather') !== 'false'; // defaults to true

secondsSwitch.checked = showSeconds;

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

// Function to get current time in 24-hour format (HH:MM:SS)
function getCurrentTime24() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

const persistentClock = document.getElementById('persistent-clock');

function updatePersistentClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    persistentClock.textContent = `${hours}:${minutes}`;
}

// Update clock every second
setInterval(updatePersistentClock, 1000);
updatePersistentClock(); // Initial update

// Show/hide persistent clock based on modal/drawer state
function updatePersistentClockVisibility() {
    const isModalOpen = 
        timezoneModal.classList.contains('show') || 
        weatherModal.classList.contains('show') || 
        customizeModal.classList.contains('show') ||
        appDrawer.classList.contains('open');

    if (isModalOpen) {
        persistentClock.classList.add('show');
    } else {
        persistentClock.classList.remove('show');
    }
}

let timeLeft = 0; 
let timerId = null; 

// Function to update the document title
function updateTitle() {
    if (timeLeft > 0 && timerId) {
        document.title = `${formatTime(timeLeft)} • Gurasuraisu`;
    } else {
        let now = new Date();
        let hours = String(now.getHours()).padStart(2, '0');
        let minutes = String(now.getMinutes()).padStart(2, '0');
        let seconds = String(now.getSeconds()).padStart(2, '0');
        document.title = showSeconds ? 
            `${hours}:${minutes}:${seconds} • Gurasuraisu` : 
            `${hours}:${minutes} • Gurasuraisu`;
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
        description: 'Thunderstorm with Hail', 
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
    if (!weatherSwitch) return; // Guard clause in case element isn't found
    
    let showWeather = localStorage.getItem('showWeather') !== 'false'; // defaults to true
    
    // Initialize weather switch state
    weatherSwitch.checked = showWeather;
    
    // Update weather visibility based on saved preference
    function updateWeatherVisibility() {
        const weatherWidget = document.getElementById('weather');
        if (weatherWidget) {
            weatherWidget.style.display = showWeather ? 'block' : 'none';
        }
    }
    
    // Add event listener for weather switch
    weatherSwitch.addEventListener('change', function() {
        showWeather = this.checked;
        localStorage.setItem('showWeather', showWeather);
        updateWeatherVisibility();
        if (showWeather) {
            updateSmallWeather(); // Refresh weather data when enabling
            showPopup('Weather widget enabled');
        } else {
            showPopup('Weather widget disabled');
        }
    });
    
    // Set initial visibility
    updateWeatherVisibility();
}

function updateClockAndDate() {
    let clockElement = document.getElementById('clock');
    let dateElement = document.getElementById('date');
    let now = new Date();
    
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = showSeconds ? 
        `${hours}:${minutes}:${seconds}` : 
        `${hours}:${minutes}`;
        
    dateElement.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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
                    console.warn('Failed to retrieve city name', geocodingError);
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
                    showPopup('You are currently offline');
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
            timeout: 5000,
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
    if (!showWeather) return; // Don't update if weather is hidden
    
    try {
        const weatherData = await fetchLocationAndWeather();
        if (!weatherData) throw new Error('Weather data not available');

        const temperatureElement = document.getElementById('temperature');
        const weatherIconElement = document.getElementById('weather-icon');
        const weatherInfo = weatherConditions[weatherData.current.weathercode] || { description: 'Unknown', icon: () => '❓' };

        document.getElementById('weather').style.display = showWeather ? 'block' : 'none';
        temperatureElement.textContent = `${weatherData.current.temperature}°C`;
        weatherIconElement.className = 'material-symbols-rounded';
        weatherIconElement.textContent = weatherInfo.icon(true);
    } catch (error) {
        console.error('Error updating small weather widget:', error);
        document.getElementById('weather').style.display = 'none';
        showPopup('Failed to retrieve weather information');
    }
}

async function displayDetailedWeather() {
    const weatherData = await fetchLocationAndWeather();
    if (!weatherData) {
        document.getElementById('detailedWeather').innerHTML = 'Failed to load weather data.';
        return;
    }

    const { city, current, dailyForecast, hourlyForecast } = weatherData;
    const currentWeather = weatherConditions[current.weathercode] || { description: 'Unknown', icon: () => '❓' };

    const currentTime = new Date();
    const nextDayMidnight = new Date(currentTime);
    nextDayMidnight.setHours(24, 0, 0, 0);

    const validHourlyForecast = hourlyForecast.time
        .map((time, index) => {
            const forecastTime = new Date(time);
            if (forecastTime > currentTime && forecastTime < nextDayMidnight) {
                return {
                    time: time,
                    temperature: hourlyForecast.temperature_2m[index],
                    weatherCode: hourlyForecast.weathercode[index]
                };
            }
            return null;
        })
        .filter(Boolean);

    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    let backgroundColor = isDaytime ? '#2F4F4F' : '#0C0C0C';

    // Set background color based on weather code
    switch (current.weathercode) {
        case 0: backgroundColor = '#2C3539'; break; // Clear Sky
        case 1: backgroundColor = '#3E474D'; break; // Mainly Clear
        case 2: backgroundColor = '#4E5A61'; break; // Partly Cloudy
        case 3: backgroundColor = '#36454F'; break; // Overcast
        case 45: case 48: backgroundColor = '#556B2F'; break; // Fog
        case 51: case 53: case 55: backgroundColor = '#696969'; break; // Light Drizzle
        case 56: case 57: backgroundColor = '#5C5C5C'; break; // Light Freezing Drizzle
        case 61: case 63: case 65: backgroundColor = '#4F4F4F'; break; // Rain
        case 66: case 67: backgroundColor = '#4B4B4B'; break; // Freezing Rain
        case 71: case 73: case 75: backgroundColor = '#E0E0E0'; break; // Snow
        case 77: backgroundColor = '#E8E8E8'; break; // Snow Grains
        case 80: case 81: case 82: backgroundColor = '#606060'; break; // Showers
        case 85: case 86: backgroundColor = '#A9A9A9'; break; // Snow Showers
        case 95: backgroundColor = '#B8860B'; break; // Thunderstorm
        case 96: case 99: backgroundColor = '#B5651D'; break; // Thunderstorm with Hail
        default: backgroundColor = '#2F4F4F'; break;
    }
    
    document.getElementById('detailedWeather').style.backgroundColor = backgroundColor;

    document.getElementById('detailedWeather').innerHTML = `
        <h2>${current.temperature}°C</h2>
        <p class="location-text">${city}</p>
        <span class="weather-icon material-symbols-rounded">${currentWeather.icon(isDaytime)}</span>
        <p>${currentWeather.description}</p>
        <p class="additional-info">Wind Speed: ${current.windspeed} km/h</p>
        <div class="hourly-forecast">
            ${validHourlyForecast.map((hour, index) => {
                const hourClass = index === 0 ? 'hour first' :
                    index === validHourlyForecast.length - 1 ? 'hour last' : 'hour';
                const hourString = getHourString(hour.time);
                const hourWeather = weatherConditions[hour.weatherCode] || { description: 'Unknown', icon: () => '❓' };

                return `
                    <div class="${hourClass}">
                        <span>${hourString}</span>
                        <span>${hour.temperature}°C</span>
                        <span class="material-symbols-rounded">${hourWeather.icon(isDaytimeForHour(hour.time))}</span>
                        <span>${hourWeather.description}</span>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="forecast-container">
            ${dailyForecast.time.slice(1, 6).map((date, index) => {
                const dayName = getDayOfWeek(date);
                const weatherCode = dailyForecast.weathercode[index + 1];
                const maxTemp = dailyForecast.temperature_2m_max[index + 1];
                const forecastWeather = weatherConditions[weatherCode] || { description: 'Unknown', icon: () => '❓' };

                return `
                    <div class="forecast-day">
                        <p class="day-name">${dayName}</p>
                        <p class="forecast-icon material-symbols-rounded">${forecastWeather.icon(true)}</p>
                        <p>${maxTemp}°C</p>
                        <p>${forecastWeather.description}</p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Helper function to determine if a specific hour is daytime
function isDaytimeForHour(timeString) {
    const hour = new Date(timeString).getHours();
    return hour >= 6 && hour <= 18;
}

const clockElement = document.getElementById('clock');
const weatherWidget = document.getElementById('weather');
const timezoneModal = document.getElementById('timezoneModal');
const weatherModal = document.getElementById('weatherModal');
const closeModal = document.getElementById('closeModal');
const closeWeatherModal = document.getElementById('closeWeatherModal');
const blurOverlay = document.getElementById('blurOverlay');

clockElement.addEventListener('click', () => {
    timezoneModal.style.display = 'block';
    blurOverlay.style.display = 'block';
    setTimeout(() => {
        timezoneModal.classList.add('show');
        blurOverlay.classList.add('show');
        updatePersistentClockVisibility();
    }, 10);
});

weatherWidget.addEventListener('click', () => {
    weatherModal.style.display = 'block';
    blurOverlay.style.display = 'block';
    setTimeout(() => {
        weatherModal.classList.add('show');
        blurOverlay.classList.add('show');
        updatePersistentClockVisibility();
    }, 10);
    displayDetailedWeather();
});

closeModal.addEventListener('click', () => {
    timezoneModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        timezoneModal.style.display = 'none';
        blurOverlay.style.display = 'none';
        updatePersistentClockVisibility();
    }, 300);
});

closeWeatherModal.addEventListener('click', () => {
    weatherModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        weatherModal.style.display = 'none';
        blurOverlay.style.display = 'none';
        updatePersistentClockVisibility();
    }, 300);
});

setInterval(updateClockAndDate, 1000);
updateClockAndDate();
updateSmallWeather();

// Timer Variables
let totalTime = 0;
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
    display.textContent = formatTime(timeLeft);
    const percent = (timeLeft / totalTime) * 100;
    setProgress(percent);

    // Show/hide progress ring based on whether there's time set
    if (timeLeft > 0) {
        progressRing.classList.add('active');
    } else {
        progressRing.classList.remove('active');
    }
}

function addTime(seconds) {
    if (!timezoneModal.classList.contains('show')) return;
    if (!timerId) {
        timeLeft += seconds;
        totalTime = timeLeft;
        updateDisplay();
        updateTimerWidget();
    }
}

const timerWidget = document.getElementById('timer-widget');
const timerText = document.getElementById('timer-text');

function updateTimerWidget() {
    if (timeLeft > 0) {
        timerWidget.style.display = 'flex';
        timerText.textContent = formatTime(timeLeft);
    } else {
        timerWidget.style.display = 'none';
    }
}

function toggleTimer() {
    if (!timezoneModal.classList.contains('show')) return;
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
    updateTimerWidget();
}

function resetTimer() {
    if (!timezoneModal.classList.contains('show')) return;
    if (timerId) clearInterval(timerId);
    timerId = null;
    timeLeft = 0;
    totalTime = 0;
    updateDisplay();
    updateTimerWidget();
    startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
    alarmSound.pause(); // Stop the alarm sound
    alarmSound.currentTime = 0; // Reset the sound to the beginning
}

function playAlarm() {
    alarmSound.play();
}

display.addEventListener('click', () => {
    timeInput.value = formatTime(timeLeft).replace(':', '');
    timeInput.style.display = 'block';
    display.style.display = 'none';
    timeInput.focus();
});

timeInput.addEventListener('blur', () => {
    const input = timeInput.value.padStart(4, '0'); // Ensure at least 4 digits by padding with leading zeros
    const minutes = parseInt(input.slice(0, -2), 10); // First two digits (or first digit for 3-digit inputs)
    const seconds = parseInt(input.slice(-2), 10); // Last two digits

    if (!isNaN(minutes) && !isNaN(seconds)) {
        timeLeft = minutes * 60 + seconds; // Convert to total seconds
        totalTime = timeLeft;
    }
    updateDisplay();
    timeInput.style.display = 'none';
    display.style.display = 'block';
});

timeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') timeInput.blur();
});

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
    popup.style.zIndex = '1000';
    popup.style.transition = 'opacity 0.5s';
    popup.style.display = 'flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '10px';

    // Check for specific words to determine icon
    const checkWords = ['updated', 'complete', 'done', 'success'];
    const closeWords = ['failed', 'canceled'];
    
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
    }, 3000);
}

setInterval(() => {
    if (weatherModal.classList.contains('show')) {
        displayDetailedWeather();
    }
}, 60000);

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

function firstSetup() {
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');

    if (!hasVisitedBefore) {
        createSetupScreen(); // Show setup screen for first-time users
    }

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!localStorage.getItem('hasSeenPopupTouchscreen') && !isTouchDevice) {
        showPopup('For optimal experience, use a touchscreen device');
        localStorage.setItem('hasSeenPopupTouchscreen', 'true');
    }

    // Set the visited flag after setup is complete
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
            border-radius: 15px;
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
            title: "Welcome to Gurasuraisu",
            description: "Let's set up your personalized experience.",
            options: []
        },
        {
            title: "Data & Privacy",
            description: "We will never send your data to anyone, not even our servers. Your information stays on your device at all times.",
            options: []
        },
        {
            title: "Allow Permissions",
            description: "Gurasuraisu needs some permissions to provide the best experience.",
            options: [
                { 
                    name: "Location Access",
                    description: "Enable local weather information",
                    permission: "geolocation",
                    default: true 
                },
                { 
                    name: "Notifications",
                    description: "For timer alerts and updates",
                    permission: "notifications",
                    default: true 
                }
            ]
        },
        {
            title: "Choose Your Theme",
            description: "Select a theme that matches your style.",
            options: [
                { name: "Light Mode", value: "light" },
                { name: "Dark Mode", value: "dark", default: true }
            ]
        },
        {
            title: "Clock Format",
            description: "Choose what format you'd like to view time.",
            options: [
                { name: "Show Seconds", value: true, default: true },
                { name: "Hide Seconds", value: false }
            ]
        },
        {
            title: "Weather Widget",
            description: "Choose to show or hide weather widget. To get weather information, allow location access.",
            options: [
                { name: "Show Weather", value: true, default: true },
                { name: "Hide Weather", value: false }
            ]
        },
        {
            title: "Configure more options in Settings",
            description: "To configure your Gurasuraisu, click on the gear icon on the bottom right.",
            options: []
        },
    ];

    let currentPage = 0;

    function createPage(pageData) {
        const page = document.createElement('div');
        page.className = 'setup-page';
    
        // Add title
        const title = document.createElement('h1');
        title.className = 'setup-title';
        title.textContent = pageData.title;
        page.appendChild(title);
    
        // Add description
        const description = document.createElement('p');
        description.className = 'setup-description';
        description.textContent = pageData.description;
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
                optionText.textContent = option.name;
    
                if (option.description) {
                    const optionDesc = document.createElement('span');
                    optionDesc.className = 'option-description';
                    optionDesc.textContent = option.description;
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
                            case "Choose Your Theme":
                                localStorage.setItem('theme', option.value);
                                document.body.classList.toggle('light-theme', option.value === 'light');
                                break;
                            case "Clock Style":
                                localStorage.setItem('showSeconds', option.value);
                                showSeconds = option.value;
                                updateClockAndDate();
                                break;
                            case "Weather Widget":
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
    
        if (currentPage > 0) {
            const backButton = document.createElement('button');
            backButton.className = 'setup-button secondary';
            backButton.textContent = 'Back';
            backButton.addEventListener('click', () => {
                currentPage--;
                updateSetup();
            });
            buttons.appendChild(backButton);
        }
    
        const nextButton = document.createElement('button');
        nextButton.className = 'setup-button primary';
        nextButton.textContent = currentPage === setupPages.length - 1 ? 'Get Started' : 'Continue';
        nextButton.addEventListener('click', () => {
            if (currentPage === setupPages.length - 1) {
                // Complete setup
                localStorage.setItem('hasVisitedBefore', 'true');
                setupContainer.style.opacity = '0';
                setTimeout(() => {
                    setupContainer.remove();
                    showPopup('Welcome to Gurasuraisu!');
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

const appLinks = {
    "Chronos": "https://gurasuraisu.github.io/chronos",
    "Ailuator": "https://gurasuraisu.github.io/ailuator",
    "Wordy": "https://gurasuraisu.github.io/wordy",
    "Music": "https://gurasuraisu.github.io/music",
    "Stickies": "https://gurasuraisu.github.io/stickies",
    "Moments": "https://gurasuraisu.github.io/moments",
    "SketchPad": "https://photos.google.com",
    "Fantaskical": "https://gurasuraisu.github.io/fantaskical",
    "Clapper": "https://gurasuraisu.github.io/clapper",
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
    const firstWord = query.split(' ')[0].toLowerCase();
    if (firstWord === "how" || firstWord === "help" || firstWord === "ai" || firstWord === "why") {
        searchIcon.textContent = 'forum';
    } else {
        searchIcon.textContent = 'search';
    }
}

function handleAppRedirect(query) {
    const bestMatch = fuzzySearch(query, appLinks);
    if (bestMatch) {
        const appLink = appLinks[bestMatch];
        window.open(appLink, '_blank');
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

searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        updateSearchIcon(query);
        if (handleAppRedirect(query)) {
            return;
        }
        const firstWord = query.split(' ')[0].toLowerCase();
        if (firstWord === "how" || firstWord === "help" || firstWord === "ai" || firstWord === "why") {
            const bingUrl = `https://www.bing.com/search?showconv=1&sendquery=1&q=${encodeURIComponent(query)}`;
            window.open(bingUrl, '_blank');
        } else if (query) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }
    }
});

const customizeButton = document.getElementById('customize');
const customizeModal = document.getElementById('customizeModal');
const closeCustomizeModal = document.getElementById('closeCustomizeModal');
const themeSwitch = document.getElementById('theme-switch');
const wallpaperInput = document.getElementById('wallpaperInput');
const uploadButton = document.getElementById('uploadButton');

// Theme switching functionality
function setupThemeSwitcher() {
    // Check and set initial theme
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', currentTheme === 'light');
    themeSwitch.checked = currentTheme === 'light';
}

// Theme switch event listener
themeSwitch.addEventListener('change', () => {
    document.body.classList.toggle('light-theme');
    const newTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
});

// Customize modal functionality
customizeButton.addEventListener('click', () => {
    customizeModal.style.display = 'block';
    blurOverlay.style.display = 'block';
    setTimeout(() => {
        customizeModal.classList.add('show');
        blurOverlay.classList.add('show');
        updatePersistentClockVisibility();
    }, 10);
});

closeCustomizeModal.addEventListener('click', () => {
    customizeModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        customizeModal.style.display = 'none';
        blurOverlay.style.display = 'none';
        updatePersistentClockVisibility();
    }, 300);
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

wallpaperInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'video/mp4'].includes(file.type)) {
        saveWallpaper(file);
        showPopup('Wallpaper updated');
    } else {
        showPopup('Failed to update wallpaper');
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
            // Store video in IndexedDB
            await storeVideo(file);
            localStorage.setItem('wallpaperType', file.type);
            applyWallpaper();
        } else {
            // Handle images as before
            const mediaData = await compressMedia(file);
            try {
                localStorage.setItem('wallpaperType', file.type);
                localStorage.setItem('customWallpaper', mediaData);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    showPopup('File too large. Please choose a smaller file.');
                    return;
                }
                throw e;
            }
            applyWallpaper();
        }
        showPopup('Wallpaper updated');
    } catch (error) {
        console.error('Error saving wallpaper:', error);
        showPopup('Failed to save wallpaper');
    }
}

async function applyWallpaper() {
    const wallpaperType = localStorage.getItem('wallpaperType');

    try {
        if (wallpaperType && wallpaperType.startsWith('video/')) {
            const videoData = await getVideo();
            if (videoData && videoData.blob) {
                // Remove any existing video element
                const existingVideo = document.querySelector('#background-video');
                if (existingVideo) {
                    URL.revokeObjectURL(existingVideo.src);
                    existingVideo.remove();
                }

                // Create and configure video element
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
                
                // Create new blob URL with cache busting
                const blobUrl = URL.createObjectURL(videoData.blob);
                video.src = blobUrl;

                // Add error handling for video loading
                video.onerror = (e) => {
                    console.error('Video loading error:', e);
                    showPopup('Error loading video wallpaper');
                };

                // Ensure video loads before adding to DOM
                video.onloadeddata = () => {
                    document.body.insertBefore(video, document.body.firstChild);
                    document.body.style.backgroundImage = 'none';
                };

                // Force video to load
                video.load();
            }
        } else {
            // Handle image wallpaper (existing code)
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
        showPopup('Failed to apply wallpaper');
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

function setupFontSelection() {
    const fontSelect = document.getElementById('font-select');
    const clockElement = document.getElementById('clock');
    const infoElement = document.querySelector('.info');
    
    // Load saved font preference
    const savedFont = localStorage.getItem('clockFont') || 'Inter';
    fontSelect.value = savedFont;
    
    // Apply font to both elements
    function applyFont(fontFamily) {
        clockElement.style.fontFamily = fontFamily;
        infoElement.style.fontFamily = fontFamily;
    }
    
    // Apply initial font
    applyFont(savedFont);
    
    // Handle font changes
    fontSelect.addEventListener('change', (e) => {
        const selectedFont = e.target.value;
        // Ensure font is loaded before applying
        document.fonts.load(`16px ${selectedFont}`).then(() => {
            applyFont(selectedFont);
            localStorage.setItem('clockFont', selectedFont);
            showPopup('Clock Style updated');
        }).catch(() => {
            showPopup('Failed to load Clock Style');
        });
    });
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
            url: "https://gurasuraisu.github.io/chronos",
            icon: "alarm.png"
        },
        
        "Ailuator": {
            url: "https://gurasuraisu.github.io/ailuator",
            icon: "calculator.png"
        },

        "Wordy": {
            url: "https://gurasuraisu.github.io/wordy",
            icon: "docs.png"
        },

        "Music": {
            url: "https://gurasuraisu.github.io/music",
            icon: "music.png"
        },

        "Stickies": {
            url: "https://gurasuraisu.github.io/stickies",
            icon: "notes.png"
        },

        "Moments": {
            url: "https://gurasuraisu.github.io/moments",
            icon: "photos.png"
        },

        "SketchPad": {
            url: "https://gurasuraisu.github.io/sketchpad",
            icon: "sketch.png"
        },

        "Fantaskical": {
            url: "https://gurasuraisu.github.io/fantaskical",
            icon: "tasks.png"
        },

        "Clapper": {
            url: "https://gurasuraisu.github.io/clapper",
            icon: "video.png"
        },
    };

function populateDock() {
    dock.innerHTML = '';
    
    // Create drawer opener as first icon
    const drawerIcon = document.createElement('div');
    drawerIcon.className = 'dock-icon drawer-opener';
    
    const drawerImg = document.createElement('img');
    drawerImg.src = '/assets/appicon/appoff.png'; // Make sure to have this icon
    drawerImg.alt = 'Open Apps';
    
    drawerIcon.appendChild(drawerImg);
    drawerIcon.addEventListener('click', () => {
        if (appDrawer.classList.contains('open')) {
            // Close drawer
            appDrawer.style.transition = 'bottom 0.3s ease';
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
        } else {
            // Open drawer
            appDrawer.style.transition = 'bottom 0.3s ease';
            appDrawer.style.bottom = '0%';
            appDrawer.style.opacity = '1';
            appDrawer.classList.add('open');
            initialDrawerPosition = 0;
        }
    });
    
    dock.appendChild(drawerIcon);
    
    // Add the most used apps (now only 5 since drawer opener takes first spot)
    const sortedApps = Object.entries(apps)
        .map(([appName, appDetails]) => ({
            name: appName,
            details: appDetails,
            usage: appUsage[appName] || 0
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5); // Take top 5 most used apps
    
    sortedApps.forEach(({name, details}) => {
        const dockIcon = document.createElement('div');
        dockIcon.className = 'dock-icon';
        
        const img = document.createElement('img');
        img.src = `/assets/appicon/${details.icon}`;
        img.alt = name;
        
        dockIcon.appendChild(img);
        dockIcon.addEventListener('click', () => {
            appUsage[name] = (appUsage[name] || 0) + 1;
            saveUsageData();
            window.open(details.url, '_blank');
            populateDock();
        });
        
        dock.appendChild(dockIcon);
    });
}

    const appDrawer = document.getElementById('app-drawer');
    const appGrid = document.getElementById('app-grid');
    const appDrawerToggle = document.getElementById('app-drawer-toggle');

// Function to create app icons
function createAppIcons() {
    appGrid.innerHTML = '';
    
    const appsArray = Object.entries(apps)
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
            img.src = '/assets/default-app-icon.png';
        };

        const label = document.createElement('span');
        label.textContent = app.name;

        appIcon.appendChild(img);
        appIcon.appendChild(label);

        const handleAppOpen = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                appUsage[app.name] = (appUsage[app.name] || 0) + 1;
                saveUsageData();
                
                populateDock(); // Now this should work

                if (app.details.url.startsWith('#')) {
                    switch (app.details.url) {
                        case '#settings':
                            showPopup('Opening Settings');
                            break;
                        case '#weather':
                            showPopup('Opening Weather');
                            break;
                        default:
                            showPopup(`${app.name} app opened`);
                    }
                } else {
                    window.open(app.details.url, '_blank', 'noopener,noreferrer');
                }
                appDrawer.classList.remove('open');
                appDrawer.style.bottom = '-100%';
                initialDrawerPosition = -100;
            } catch (error) {
                showPopup(`Failed to open ${app.name}`);
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
    const flickVelocityThreshold = 0.4;
    const dockThreshold = -25; // Threshold for dock appearance
    const openThreshold = -50;
    const drawerPill = document.querySelector('.drawer-pill');
    const drawerHandle = document.querySelector('.drawer-handle');
    
    // Create dock element
    const dock = document.createElement('div');
    dock.id = 'dock';
    dock.className = 'dock';
    document.body.appendChild(dock);
    
    // Style for the dock
    const style = document.createElement('style');
    style.textContent = `
        .dock {
            position: fixed;
            bottom: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--search-background);
            backdrop-filter: blur(50px);
            border: 2px solid var(--transparent-color);
            border-radius: 34px;
            padding: 8px 9px;
            display: flex;
            gap: 8px;
            transition: bottom 0.3s ease;
            z-index: 1001;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        
        .dock.show {
            bottom: 10px;
        }
        
        .dock-icon {
            width: 75px;
            height: 75px;
            transition: transform 0.2s ease;
            cursor: pointer;
        }
        
        .dock-icon:hover {
            transform: scale(1.1);
        }
        
        .dock-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .dock-icon.drawer-opener::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--accent-color);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .app-drawer.open ~ .dock .drawer-opener::after {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
    
    populateDock();
    
    function startDrag(yPosition) {
        startY = yPosition;
        currentY = yPosition;
        isDragging = true;
        isDrawerInMotion = true;
        appDrawer.style.transition = 'none';
    }

    function moveDrawer(yPosition) {
        if (!isDragging) return;
        currentY = yPosition;
        const deltaY = startY - currentY;
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;
    
        // Show dock and hide drawer-pill
        if (movementPercentage > 10 && movementPercentage < 25) {
            dock.classList.add('show');
            drawerPill.style.opacity = '0';
        } else {
            dock.classList.remove('show');
            drawerPill.style.opacity = '1';
        }

        const newPosition = Math.max(-100, Math.min(0, initialDrawerPosition + movementPercentage));
    
        // Calculate opacity based on drawer position
        // When newPosition is -100 (fully hidden), opacity is 0
        // When newPosition is 0 (fully shown), opacity is 1
        const opacity = (newPosition + 100) / 100;
        appDrawer.style.opacity = opacity;
    
        appDrawer.style.bottom = `${newPosition}%`;
    }

    function endDrag() {
        if (!isDragging) return;

        const deltaY = startY - currentY;
        const deltaTime = 100;
        const velocity = deltaY / deltaTime;
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;

        appDrawer.style.transition = 'bottom 0.3s ease, opacity 0.3s ease';

        // Small swipe - show dock
        if (movementPercentage > 10 && movementPercentage <= 25) {
            dock.classList.add('show');
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
        } 
        // Large swipe - show full drawer
        else if (movementPercentage > 25) {
            dock.classList.remove('show');
            appDrawer.style.bottom = '0%';
            appDrawer.style.opacity = '1';
            appDrawer.classList.add('open');
            initialDrawerPosition = 0;
        } 
        // Close everything
        else {
            dock.classList.remove('show');
            appDrawer.style.bottom = '-100%';
            appDrawer.style.opacity = '0';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
        }

        isDragging = false;

        setTimeout(() => {
            isDrawerInMotion = false;
        }, 300); // 300ms matches the transition duration in the CSS
    }

    // Touch Events
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

    // Mouse Events
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
        }
    });

    document.addEventListener('click', (e) => {
        if (!isDrawerInMotion && 
            !dock.contains(e.target) && 
            !drawerHandle.contains(e.target) && 
            !appDrawer.classList.contains('open')) { // Only hide dock if drawer is closed
            dock.classList.remove('show');
            drawerPill.style.opacity = '1'; // Restore drawer-pill opacity when dock is hidden
        }
    });
}

const appDrawerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            updatePersistentClockVisibility();
        }
    });
});

appDrawerObserver.observe(appDrawer, {
    attributes: true
});

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
        [timezoneModal, weatherModal, customizeModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                blurOverlay.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    blurOverlay.style.display = 'none';
                    updatePersistentClockVisibility();
                }, 300);
            }
        });
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Close all modals
        [timezoneModal, weatherModal, customizeModal].forEach(modal => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                blurOverlay.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    blurOverlay.style.display = 'none';
                    updatePersistentClockVisibility();
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
    showPopup('You are back online');
    updateSmallWeather(); // Refresh weather data
});

window.addEventListener('offline', () => {
    showPopup('You are offline');
});

// Call applyWallpaper on page load
document.addEventListener('DOMContentLoaded', () => {
    applyWallpaper();
});

window.addEventListener('load', () => {
    ensureVideoLoaded();
});

setInterval(ensureVideoLoaded, 1000);

    // Initialize app drawer
    function initAppDraw() {
        createAppIcons();
        setupDrawerInteractions();
    }

    // Call initialization
    initializeCustomization();
    setupWeatherToggle()
    firstSetup();
    goFullscreen();
    updateDisplay();
    initAppDraw();
    updateWeatherVisibility();
