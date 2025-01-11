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
Copyright © 2025 Gurasuraisu
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

// Function to get current time in 24-hour format (HH:MM:SS)
function getCurrentTime24() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Function to update the document title
function updateTitle() {
    if (timeLeft > 0 && timerId) {
        // If timer is active, show remaining time
        document.title = `${formatTime(timeLeft)} • Gurasuraisu`;
    } else {
        // Otherwise, show current 24-hour time
        document.title = `${getCurrentTime24()} • Gurasuraisu`;
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

function updateClockAndDate() {
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date');
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = now.toLocaleDateString(undefined, options);
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
                    console.warn('Could not retrieve city name', geocodingError);
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
            } catch (error) {
                console.error('Error fetching weather data:', error);
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
    try {
        const weatherData = await fetchLocationAndWeather();
        if (!weatherData) throw new Error('Weather data not available');

        const temperatureElement = document.getElementById('temperature');
        const weatherIconElement = document.getElementById('weather-icon');
        const weatherInfo = weatherConditions[weatherData.current.weathercode] || { description: 'Unknown', icon: () => '❓' };

        document.getElementById('weather').style.display = 'block';
        temperatureElement.textContent = `${weatherData.current.temperature}°C`;
        weatherIconElement.className = 'material-symbols-rounded';
        weatherIconElement.textContent = weatherInfo.icon(true); // Assuming daytime for small weather widget
    } catch (error) {
        console.error('Error updating small weather widget:', error);
        document.getElementById('weather').style.display = 'none';
        showPopup('Could not retrieve weather information');
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
    }, 10);
});

weatherWidget.addEventListener('click', () => {
    weatherModal.style.display = 'block';
    blurOverlay.style.display = 'block';
    setTimeout(() => {
        weatherModal.classList.add('show');
        blurOverlay.classList.add('show');
    }, 10);
    displayDetailedWeather();
});

closeModal.addEventListener('click', () => {
    timezoneModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        timezoneModal.style.display = 'none';
        blurOverlay.style.display = 'none';
    }, 300);
});

closeWeatherModal.addEventListener('click', () => {
    weatherModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        weatherModal.style.display = 'none';
        blurOverlay.style.display = 'none';
    }, 300);
});

setInterval(updateClockAndDate, 1000);
updateClockAndDate();
updateSmallWeather();

// Timer Variables
let timeLeft = 0;
let totalTime = 0;
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
                if (timeLeft <= 0) {
                    clearInterval(timerId);
                    timerId = null;
                    startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
                    playAlarm();
                }
            }, 1000);
            startBtn.innerHTML = '<span class="material-symbols-rounded">pause</span>';
        }
    }
}

function resetTimer() {
    if (!timezoneModal.classList.contains('show')) return;
    if (timerId) clearInterval(timerId);
    timerId = null;
    timeLeft = 0;
    totalTime = 0;
    updateDisplay();
    startBtn.innerHTML = '<span class="material-symbols-rounded">play_arrow</span>';
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
    popup.style.backgroundColor = 'rgba(51, 51, 51, 0.9)';
    popup.style.color = 'white';
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
        showPopup('Welcome to Gurasuraisu!');
        localStorage.setItem('hasVisitedBefore', 'true');
    }

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!localStorage.getItem('hasSeenPopupTouchscreen') && !isTouchDevice) {
        showPopup('For optimal experience, use a touchscreen device');
        localStorage.setItem('hasSeenPopupTouchscreen', 'true');
    }
}

const searchInput = document.getElementById('search-input');
const searchIcon = document.getElementById('search-icon');
const autocompleteSuggestions = document.getElementById('autocomplete-suggestions');

const appLinks = {
    "youtube": "https://youtube.com",
    "yt": "https://youtube.com",
    "drive": "https://drive.google.com",
    "calendar": "https://calendar.google.com",
    "cal": "https://calendar.google.com",
    "docs": "https://docs.google.com",
    "photos": "https://photos.google.com",
    "notes": "https://keep.google.com",
    "keep": "https://keep.google.com",
    "calculator": "https://calculator.apps.chrome",
    "music": "https://music.apple.com",
    "notion": "https://notion.so",
    "find my": "https://www.icloud.com/find",
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
    }, 10);
});

closeCustomizeModal.addEventListener('click', () => {
    customizeModal.classList.remove('show');
    blurOverlay.classList.remove('show');
    setTimeout(() => {
        customizeModal.style.display = 'none';
        blurOverlay.style.display = 'none';
    }, 300);
});

// Wallpaper upload functionality
uploadButton.addEventListener('click', () => {
    wallpaperInput.click();
});

wallpaperInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        saveWallpaper(file);
        showPopup('Wallpaper updated');
    } else {
        showPopup('Please upload a PNG or JPEG image');
    }
});

// Existing wallpaper save and apply functions remain the same
function saveWallpaper(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const imageDataUrl = event.target.result;
        localStorage.setItem('customWallpaper', imageDataUrl);
        applyWallpaper();
    };
    reader.readAsDataURL(file);
}

function applyWallpaper() {
    const savedWallpaper = localStorage.getItem('customWallpaper');
    if (savedWallpaper) {
        document.body.style.backgroundImage = `url('${savedWallpaper}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    }
}

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
            showPopup('Font updated');
        }).catch(() => {
            showPopup('Failed to load font');
        });
    });
}

// Initialize theme and wallpaper on load
function initializeCustomization() {
    setupThemeSwitcher();
    applyWallpaper();
    setupFontSelection();
}

document.addEventListener('DOMContentLoaded', () => {
    // Popup Function
    function showPopup(message) {
        const popup = document.createElement('div');
        popup.classList.add('popup');
        popup.textContent = message;

        document.body.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 500);
        }, 3000);
    }
});

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
    };

    const appDrawer = document.getElementById('app-drawer');
    const appGrid = document.getElementById('app-grid');
    const appDrawerToggle = document.getElementById('app-drawer-toggle');

    // Function to create app icons
    function createAppIcons() {
        appGrid.innerHTML = '';

        Object.entries(apps).forEach(([appName, appDetails]) => {
            const appIcon = document.createElement('div');
            appIcon.classList.add('app-icon');
            appIcon.dataset.app = appName;

            // Create icon image
            const img = document.createElement('img');
            img.src = `/assets/appicon/${appDetails.icon}`;
            img.alt = appName;
            img.onerror = () => {
                img.src = '/assets/default-app-icon.png'; // Fallback icon
            };

            // Create app name label
            const label = document.createElement('span');
            label.textContent = appName;

            appIcon.appendChild(img);
            appIcon.appendChild(label);

            // Add click event to open app
            appIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    // Special handling for local apps
                    if (appDetails.url.startsWith('#')) {
                        switch (appDetails.url) {
                            case '#settings':
                                showPopup('Opening Settings');
                                break;
                            case '#weather':
                                showPopup('Opening Weather');
                                break;
                            default:
                                showPopup(`${appName} app opened`);
                        }
                    } else {
                        // Open external apps in new tab
                        window.open(appDetails.url, '_blank', 'noopener,noreferrer');
                    }

                    // Close the drawer
                    appDrawer.classList.remove('open');
                } catch (error) {
                    showPopup(`Failed to open ${appName}`);
                    console.error(`App open error: ${error}`);
                }
            });

            appGrid.appendChild(appIcon);
        });
    }

function setupDrawerInteractions() {
    let startY = 0;
    let currentY = 0;
    let initialDrawerPosition = -100; // Initial bottom position in percentage (hidden)
    let isDragging = false;
    const flickVelocityThreshold = 0.4; // Flick velocity in percentage/ms
    const openThreshold = -50; // Drawer opens if above this position

    // Start interaction (common for touch and mouse)
    function startDrag(yPosition) {
        startY = yPosition;
        currentY = yPosition;
        isDragging = true;
        appDrawer.style.transition = 'none'; // Disable smooth transition during dragging
    }

    // Move drawer (dragging interaction)
    function moveDrawer(yPosition) {
        if (!isDragging) return;

        currentY = yPosition;
        const deltaY = startY - currentY;
        const windowHeight = window.innerHeight;
        const movementPercentage = (deltaY / windowHeight) * 100;

        // Calculate and clamp the drawer's position
        const newPosition = Math.max(-100, Math.min(0, initialDrawerPosition + movementPercentage));
        appDrawer.style.bottom = `${newPosition}%`;
    }

    // End interaction (handle swipe or drag release)
    function endDrag() {
        if (!isDragging) return;

        const deltaY = startY - currentY;
        const deltaTime = 100; // Fixed frame duration for reliable velocity calculation
        const velocity = deltaY / deltaTime; // Approximate swipe velocity in percentage/ms

        appDrawer.style.transition = 'bottom 0.3s ease'; // Smooth transition for snap animation

        if (velocity > flickVelocityThreshold || deltaY > 50) {
            // Flick up or significant drag up -> Open drawer
            appDrawer.style.bottom = '0%';
            appDrawer.classList.add('open');
            initialDrawerPosition = 0;
        } else if (velocity < -flickVelocityThreshold || deltaY < -50) {
            // Flick down or significant drag down -> Close drawer
            appDrawer.style.bottom = '-100%';
            appDrawer.classList.remove('open');
            initialDrawerPosition = -100;
        } else {
            // Otherwise, snap based on current position
            const currentBottom = parseFloat(appDrawer.style.bottom);
            if (currentBottom >= openThreshold) {
                appDrawer.style.bottom = '0%';
                appDrawer.classList.add('open');
                initialDrawerPosition = 0;
            } else {
                appDrawer.style.bottom = '-100%';
                appDrawer.classList.remove('open');
                initialDrawerPosition = -100;
            }
        }

        isDragging = false;
    }

    // Touch Events
    appDrawer.addEventListener('touchstart', (e) => {
        startDrag(e.touches[0].clientY);
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        moveDrawer(e.touches[0].clientY);
    }, { passive: false });

    document.addEventListener('touchend', () => {
        endDrag();
    });

    // Mouse Events
    document.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only handle left mouse button
        if (e.clientY > window.innerHeight * 0.8 || appDrawer.classList.contains('open')) {
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

    // Toggle button for opening the drawer
    appDrawerToggle.addEventListener('click', () => {
        appDrawer.style.transition = 'bottom 0.3s ease';
        appDrawer.style.bottom = '0%';
        appDrawer.classList.add('open');
        initialDrawerPosition = 0;
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
}

// Close modals when clicking outside
blurOverlay.addEventListener('click', (event) => {
    // Only close if clicking directly on the blur overlay
    if (event.target === blurOverlay) {
        // Close timezone modal
        if (timezoneModal.classList.contains('show')) {
            timezoneModal.classList.remove('show');
            blurOverlay.classList.remove('show');
            setTimeout(() => {
                timezoneModal.style.display = 'none';
                blurOverlay.style.display = 'none';
            }, 300);
        }
        
        // Close weather modal
        if (weatherModal.classList.contains('show')) {
            weatherModal.classList.remove('show');
            blurOverlay.classList.remove('show');
            setTimeout(() => {
                weatherModal.style.display = 'none';
                blurOverlay.style.display = 'none';
            }, 300);
        }
        
        // Close customize modal
        if (customizeModal.classList.contains('show')) {
            customizeModal.classList.remove('show');
            blurOverlay.classList.remove('show');
            setTimeout(() => {
                customizeModal.style.display = 'none';
                blurOverlay.style.display = 'none';
            }, 300);
        }
    }
});

// Add event listener for ESC key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Close timezone modal
        if (timezoneModal.classList.contains('show')) {
            timezoneModal.classList.remove('show');
            blurOverlay.classList.remove('show');
            setTimeout(() => {
                timezoneModal.style.display = 'none';
                blurOverlay.style.display = 'none';
            }, 300);
        }
        
        // Close weather modal
        if (weatherModal.classList.contains('show')) {
            weatherModal.classList.remove('show');
            blurOverlay.classList.remove('show');
            setTimeout(() => {
                weatherModal.style.display = 'none';
                blurOverlay.style.display = 'none';
            }, 300);
        }
        
        // Close customize modal
        if (customizeModal.classList.contains('show')) {
            customizeModal.classList.remove('show');
            blurOverlay.classList.remove('show');
            setTimeout(() => {
                customizeModal.style.display = 'none';
                blurOverlay.style.display = 'none';
            }, 300);
        }
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

    // Initialize everything
    function initAppDraw() {
        createAppIcons();
        setupDrawerInteractions();
    }


    // Call initialization
    initializeCustomization();
    firstSetup();
    goFullscreen();
    updateDisplay();
    initAppDraw();
