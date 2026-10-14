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

// Function to get current time in 24-hour format (h:mm:ss)
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

function ensureMomentLocales() {
    if (typeof moment === 'undefined' || !moment.locales) return;
    const locales = moment.locales();
    if (!locales.includes('ja')) {
        moment.defineLocale('ja', {
            months: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
            monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
            weekdays: '日曜日_月曜日_火曜日_水曜日_木曜日_金曜日_土曜日'.split('_'),
            weekdaysShort: '日_月_火_水_木_金_土'.split('_'),
            weekdaysMin: '日_月_火_水_木_金_土'.split('_'),
            longDateFormat: {
                LT: 'HH:mm',
                LTS: 'h:mm:ss',
                L: 'YYYY/MM/DD',
                LL: 'YYYY年M月D日',
                LLL: 'YYYY年M月D日 HH:mm',
                LLLL: 'YYYY年M月D日 dddd HH:mm'
            },
            meridiemParse: /午前|午後/i,
            isPM: function (input) { return input === '午後'; },
            meridiem: function (hour, minute, isLower) { return hour < 12 ? '午前' : '午後'; }
        });
    }
    if (!locales.includes('ko')) {
        moment.defineLocale('ko', {
            months: '1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월'.split('_'),
            monthsShort: '1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월'.split('_'),
            weekdays: '일요일_월요일_화요일_수요일_목요일_금요일_토요일'.split('_'),
            weekdaysShort: '일_월_화_수_목_금_토'.split('_'),
            weekdaysMin: '일_월_화_수_목_금_토'.split('_'),
            longDateFormat: {
                LT: 'A h:mm',
                LTS: 'A h:mm:ss',
                L: 'YYYY.MM.DD.',
                LL: 'YYYY년 M월 D일',
                LLL: 'YYYY년 M월 D일 A h:mm',
                LLLL: 'YYYY년 M월 D일 dddd A h:mm'
            },
            meridiemParse: /오전|오후/i,
            isPM: function (token) { return token === '오후'; },
            meridiem: function (hour, minute, isUpper) { return hour < 12 ? '오전' : '오후'; }
        });
    }
    if (!locales.includes('zh-cn')) {
        moment.defineLocale('zh-cn', {
            months: '一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月'.split('_'),
            monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
            weekdays: '星期日_星期一_星期二_星期三_星期四_星期五_星期六'.split('_'),
            weekdaysShort: '周日_周一_周二_周三_周四_周五_周六'.split('_'),
            weekdaysMin: '日_一_二_三_四_五_六'.split('_'),
            longDateFormat: {
                LT: 'HH:mm',
                LTS: 'h:mm:ss',
                L: 'YYYY/MM/DD',
                LL: 'YYYY年M月D日',
                LLL: 'YYYY年M月D日Ah点mm分',
                LLLL: 'YYYY年M月D日ddddAh点mm分'
            },
            meridiemParse: /凌晨|早上|上午|中午|下午|晚上/i,
            meridiem: function (hour, minute, isLower) {
                const hm = hour * 100 + minute;
                if (hm < 600) return '凌晨';
                if (hm < 900) return '早上';
                if (hm < 1130) return '上午';
                if (hm < 1230) return '中午';
                if (hm < 1800) return '下午';
                return '晚上';
            }
        });
    }
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

    ensureMomentLocales();
    const selectedLang = (localStorage.getItem('selectedLanguage') || 'EN').toUpperCase();
    const momentLoc = (selectedLang === 'JP' || selectedLang === 'JA') ? 'ja' : (selectedLang === 'KO' ? 'ko' : (selectedLang === 'ZH' ? 'zh-cn' : 'en'));
    const now = moment();
    if (typeof now.locale === 'function') {
        now.locale(momentLoc);
    }
    
    // Apply Timezone selection
    const tzMode = localStorage.getItem('timeZoneSelection') || 'auto';
    if (tzMode === 'UTC') {
        now.utc();
    }

    let defaultDateFormat = 'ddd MMM D $(separator.dot)$ $(smart)50$';
    if (selectedLang === 'JP' || selectedLang === 'JA') {
        defaultDateFormat = 'M月D日(ddd) $(separator.dot)$ $(smart)50$';
    } else if (selectedLang === 'KO') {
        defaultDateFormat = 'M월 D일 (ddd) $(separator.dot)$ $(smart)50$';
    } else if (selectedLang === 'ZH') {
        defaultDateFormat = 'M月D日 ddd $(separator.dot)$ $(smart)50$';
    }

    const sysDateFormat = localStorage.getItem('systemDateFormat') || 'auto';
    if (sysDateFormat && sysDateFormat !== 'auto') {
        let sysDatePattern = 'ddd MMM D';
        if (sysDateFormat === 'YYYY-MM-DD') sysDatePattern = 'YYYY-MM-DD';
        else if (sysDateFormat === 'DD/MM/YYYY') sysDatePattern = 'DD/MM/YYYY';
        else if (sysDateFormat === 'MM/DD/YYYY') sysDatePattern = 'MM/DD/YYYY';
        else if (sysDateFormat === 'medium') {
            sysDatePattern = (selectedLang === 'JP' || selectedLang === 'JA' || selectedLang === 'ZH') ? 'YYYY年M月D日' : (selectedLang === 'KO' ? 'YYYY년 M월 D일' : 'MMM D, YYYY');
        } else if (sysDateFormat === 'long') {
            sysDatePattern = (selectedLang === 'JP' || selectedLang === 'JA') ? 'YYYY年M月D日(dddd)' : (selectedLang === 'ZH' ? 'YYYY年M月D日 dddd' : (selectedLang === 'KO' ? 'YYYY년 M월 D일 dddd' : 'dddd, MMMM D, YYYY'));
        }
        defaultDateFormat = `${sysDatePattern} $(separator.dot)$ $(smart)50$`;
    }

    const savedDateFormat = localStorage.getItem('dateFormat');
    const isDefaultFormat = !savedDateFormat || 
        ['ddd MMM D $(separator.dot)$ $(smart)50$', 'M月D日(ddd) $(separator.dot)$ $(smart)50$', 'M월 D일 (ddd) $(separator.dot)$ $(smart)50$', 'M月D日 ddd $(separator.dot)$ $(smart)50$'].includes(savedDateFormat);

    // Prevent empty strings from causing ISO date flashes during boot
    let defaultClockFormat = 'h:mm:ss A';
    if (localStorage.getItem('use12HourFormat') === 'true') {
        if (selectedLang === 'JP' || selectedLang === 'JA' || selectedLang === 'KO' || selectedLang === 'ZH') {
            defaultClockFormat = 'A h:mm:ss';
        } else {
            defaultClockFormat = 'h:mm:ss A';
        }
    }
    let clockFormat = (clockFormatInput && clockFormatInput.value) ? clockFormatInput.value : defaultClockFormat;
    let dateFormat = (dateFormatInput && dateFormatInput.value) ? dateFormatInput.value : (isDefaultFormat ? defaultDateFormat : savedDateFormat);

    // Apply Timezone label formatting
    if (localStorage.getItem('showTimezoneLabel') === 'true') {
        const zoneAbbr = now.zoneAbbr ? now.zoneAbbr() : (tzMode === 'UTC' ? 'UTC' : 'Local');
        dateFormat += ` [${zoneAbbr}]`;
    }
    
    if (window.isBlackoutActive) {
        clockFormat = clockFormat.replace(/[:.]ss/, '').replace(/ss/, '');
    }

    // --- Dynamic Variable Resolution ---
    let mediaTitle = '';
    let mediaArtist = '';
    if (typeof activeMediaSessionApp !== 'undefined' && activeMediaSessionApp && typeof mediaSessionStack !== 'undefined') {
        const session = mediaSessionStack.find(s => s.appName === activeMediaSessionApp);
        if (session && session.metadata) {
            mediaTitle = session.metadata.title || '';
            mediaArtist = session.metadata.artist || '';
        }
    }

    const weatherEmojis = {
        0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
        56: '🌧️', 57: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️', 71: '🌨️',
        73: '❄️', 75: '❄️', 77: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️', 85: '🌨️', 86: '❄️',
        95: '⛈️', 96: '⛈️', 99: '🌩️'
    };

    let weatherDegrees = '';
    let weatherIconEmoji = '';
    const tempEl = getCachedElement('temperature');
    const iconEl = getCachedElement('weather-icon');
    if (tempEl && iconEl && iconEl.dataset.weatherCode) {
        weatherDegrees = tempEl.textContent;
        const code = parseInt(iconEl.dataset.weatherCode);
        if (weatherEmojis[code]) {
            weatherIconEmoji = weatherEmojis[code];
        }
    }

    const h = now.hours();
    let timeGreeting = window.t ? window.t('GREETING_EVENING') : 'Good evening';
    if (h >= 5 && h < 12) timeGreeting = window.t ? window.t('GREETING_MORNING') : 'Good morning';
    else if (h >= 12 && h < 17) timeGreeting = window.t ? window.t('GREETING_AFTERNOON') : 'Good afternoon';
    
    // --- Hourly Greeting Logic ---
    const updateGreetings = () => {
        window.lastGreetingHour = new Date().getHours();
        if (window.refreshClockUI) window.refreshClockUI();
    };

    // Check for hour rollover to refresh greetings
    const currentHour = new Date().getHours();
    if (currentHour !== window.lastGreetingHour) {
        updateGreetings();
    }

    const resolveVariables = (str) => {
        if (!str) return str;

        // --- Smart Variable Engine (Priority Based) ---
        const getSmartValue = () => {
            const activeSession = (typeof mediaSessionStack !== 'undefined') 
                ? mediaSessionStack.find(s => s.appName === activeMediaSessionApp) 
                : null;
            
            const isPlaying = activeSession && activeSession.playbackState === 'playing';
            const isMediaSmartEnabled = localStorage.getItem('isMediaSmartEnabled') !== 'false';
            if (isMediaSmartEnabled && isPlaying && mediaTitle) {
                return mediaTitle; // Lock display to music while playing
            }

            const items = [];
            
            const isWeatherWidgetVisible = localStorage.getItem('showWeather') !== 'false';
            if (!isWeatherWidgetVisible && weatherIconEmoji && weatherDegrees) {
                items.push(`${weatherIconEmoji} ${weatherDegrees}`);
            }
            
            const isTimeGreetingSmartEnabled = localStorage.getItem('isTimeGreetingSmartEnabled') !== 'false';
            if (isTimeGreetingSmartEnabled) {
                items.push(timeGreeting);
            }

            // Use a stable 10-minute (600,000ms) rotation based on system clock
            const slot = Math.floor(Date.now() / 600000);
            const index = slot % items.length;
            return items[index] || "";
        };
        
        // 1. Resolve standard data variables, with optional numeric length limit
        let resolved = str.replace(/\$\((media\.title|media\.artist|weather\.degrees|weather\.icon|greeting\.time|greeting\.personal|smart)\)(\d*)\$/g, (match, varName, limitStr) => {
            let res = '';
            switch(varName) {
                case 'media.title': res = mediaTitle; break;
                case 'media.artist': res = mediaArtist; break;
                case 'weather.degrees': res = weatherDegrees; break;
                case 'weather.icon': res = weatherIconEmoji; break;
                case 'greeting.time': res = timeGreeting; break;
                case 'smart': res = getSmartValue(); break;
            }

            if (res) {
                res = res.trim();
                const limit = parseInt(limitStr, 10);
                if (!isNaN(limit) && limit > 0) {
                    if (limit > 3 && res.length > limit) {
                        res = res.substring(0, limit - 3) + '...';
                    } else if (limit <= 3 && res.length > limit) {
                        res = res.substring(0, limit);
                    }
                }
                
                // Strip existing brackets from result to avoid moment.js nested bracket breakage, then wrap it
                res = res.replace(/\[/g, '(').replace(/\]/g, ')');
                return `[${res}]`;
            }
            return '';
        });

        // 2. Resolve Smart Separators (only appear if bounded by non-empty content)
        const tokens = resolved.split(/\s*\$\(separator\.(pipe|dot)\)\$\s*/);
        let finalStr = "";
        let pendingSeparator = null;
        
        for (let i = 0; i < tokens.length; i++) {
            if (i % 2 === 0) {
                // It's a content token
                if (tokens[i].trim() !== '') {
                    // Only apply the pending separator if there is already content appended to the final string
                    if (finalStr !== '' && pendingSeparator) {
                        finalStr += (pendingSeparator === 'pipe' ? '[ | ]' : '[ • ]');
                    }
                    finalStr += tokens[i];
                    pendingSeparator = null; // Clear out the separator now that we've used it
                }
            } else {
                // It's a separator token
                pendingSeparator = tokens[i];
            }
        }
        return finalStr;
    };

    if (clockFormat) clockFormat = resolveVariables(clockFormat);
    if (dateFormat) dateFormat = resolveVariables(dateFormat);

    // Handle literal text escaping (convert ```text``` to[text] for moment.js)
    if (clockFormat) clockFormat = clockFormat.replace(/```(.*?)```/g, '[$1]');
    if (dateFormat) dateFormat = dateFormat.replace(/```(.*?)```/g, '[$1]');

    const timeString = now.format(clockFormat);
    const formattedDate = now.format(dateFormat);
    
    // Condition for special AM/PM font
    const useOpenRundeForAmPm = hourSwitch && hourSwitch.checked && 
                                fontSelect && fontSelect.value === 'Inter' && 
                                roundnessSlider && parseInt(roundnessSlider.value, 10) > 0;
    
    function wrapDigits(timeString) {
        // Array.from is used instead of .split('') to properly support Emoji Surrogate Pairs
        return Array.from(timeString).map(char => {
            if (/\d/.test(char)) {
                return `<span class="digit">${char}</span>`;
            } else if (char === ':') {
                return `<span class="colon">${char}</span>`;
            }
            // Also wrap other separators for custom formats, including the new smart separators
            if (/[.,|•]/.test(char)) return `<span class="separator">${char}</span>`;
            return char;
        }).join('');
    }

    function wrapTime(fullTimeStr) {
        const meridiemRegexEnd = /\s*(am|pm|午前|午後|오전|오후|凌晨|早上|上午|中午|下午|晚上)$/i;
        const meridiemRegexStart = /^(am|pm|午前|午後|오전|오후|凌晨|早上|上午|中午|下午|晚上)\s*/i;

        let period = '';
        let timeOnly = fullTimeStr;
        let isPrefix = false;

        const endMatch = fullTimeStr.match(meridiemRegexEnd);
        if (endMatch) {
            period = endMatch[0].trim();
            timeOnly = fullTimeStr.substring(0, endMatch.index).trim();
        } else {
            const startMatch = fullTimeStr.match(meridiemRegexStart);
            if (startMatch) {
                period = startMatch[0].trim();
                timeOnly = fullTimeStr.substring(startMatch[0].length).trim();
                isPrefix = true;
            }
        }

        let wrappedTime = wrapDigits(timeOnly);

        if (period) {
            const periodStyle = useOpenRundeForAmPm ? `style="font-family: 'Open Runde', sans-serif; font-variation-settings: normal; transition: transform 0.3s cubic-bezier(.3,1.2,.64,1), filter 0.3s cubic-bezier(.3,1.2,.64,1), font-size 0.3s cubic-bezier(.3,1.2,.64,1) !important;"` : '';
            const periodHTML = `<span class="period"${periodStyle}>${period}</span>`;
            wrappedTime = isPrefix ? `${periodHTML} ${wrappedTime}` : `${wrappedTime} ${periodHTML}`;
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
    
    let newClockHTML = '';
    if (isStacked) {
        // Hour
        let hourFormat = clockFormat.match(/[hH]{1,2}/);
        if(hourFormat) newClockHTML += `<div>${wrapDigits(now.format(hourFormat[0]))}</div>`;

        // Minute
        let minuteFormat = clockFormat.match(/m{1,2}/);
        if(minuteFormat) newClockHTML += `<div>${wrapDigits(now.format(minuteFormat[0]))}</div>`;
        
        // Second
        let secondFormat = clockFormat.match(/s{1,2}/);
        if(secondFormat) newClockHTML += `<div>${wrapDigits(now.format(secondFormat[0]))}</div>`;

        // AM/PM Period
        let periodFormat = clockFormat.match(/a|A/);
        if (periodFormat) {
            const amPmText = now.format(periodFormat[0]);
            const amPmHtml = useOpenRundeForAmPm 
                ? `<span style="style="font-family: 'Open Runde', sans-serif; font-variation-settings: normal; transition: transform 0.3s cubic-bezier(.3,1.2,.64,1), filter 0.3s cubic-bezier(.3,1.2,.64,1), font-size 0.3s cubic-bezier(.3,1.2,.64,1) !important;">${amPmText}</span>`
                : amPmText;
            newClockHTML += `<div>${amPmHtml}</div>`;
        }
    } else {
        // Non-stacked mode
        newClockHTML = wrapTime(timeString);
    }
        
    if (clockElement._lastHTML !== newClockHTML) {
        clockElement.innerHTML = newClockHTML;
        clockElement._lastHTML = newClockHTML;

        // Force mask repaint ONLY when text actually changed and glass effect is active
        if (clockElement.classList.contains('glass-effect') || clockElement.classList.contains('dynamic-fill-effect')) {
            const hasGlass = clockElement.classList.contains('glass-effect');
            const hasDynamicFill = clockElement.classList.contains('dynamic-fill-effect');
            clockElement.classList.remove('glass-effect', 'dynamic-fill-effect');
            void clockElement.offsetHeight; 
            if (hasGlass) clockElement.classList.add('glass-effect');
            if (hasDynamicFill) clockElement.classList.add('dynamic-fill-effect');
        }
    }
        
    if (dateElement._lastText !== formattedDate) {
        dateElement.textContent = formattedDate;
        dateElement._lastText = formattedDate;
        if (modalTitle) modalTitle.textContent = formattedDate;
    }

    if (typeof window.updateDynamicDate === 'function') {
        window.updateDynamicDate();
    }
    if (typeof window.updatePersistentClock === 'function') {
        window.updatePersistentClock();
    }
}

function startSynchronizedClockAndDate() {
    if (window.clockLoopId) {
        clearTimeout(window.clockLoopId);
        window.clockLoopId = null;
    }

    const isObscured = document.hidden || window.isAppOpen;
    if (!isObscured) {
        updateClockAndDate(); 
    }
    
    const now = new Date();
    
    // Check for time-of-day wallpaper variant transitions on minute boundaries
    if (window._lastWallpaperVariantCheckMinute !== now.getMinutes()) {
        window._lastWallpaperVariantCheckMinute = now.getMinutes();
        if (typeof window.checkAndApplyWallpaperVariant === 'function') {
            window.checkAndApplyWallpaperVariant();
        }
    }
    
    let delay;
    
    // IDLE OPTIMIZATION: If we aren't showing seconds, or tab is hidden, or app is open, or blackout is active,
    // sleep the timer until the next full minute to save CPU and battery.
    const isShowingSeconds = typeof showSeconds !== 'undefined' ? showSeconds : true;
    
    if (isShowingSeconds && !window.isBlackoutActive && !isObscured) {
        delay = 1000 - now.getMilliseconds();
    } else {
        // Next clean minute (:00)
        delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    }
    
    // Recursive setTimeout eliminates drift and allows for immediate restarts
    window.clockLoopId = setTimeout(startSynchronizedClockAndDate, Math.max(delay, 50));
}

// Immediately wake and sync clock when visibility restores or app is closed
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        startSynchronizedClockAndDate();
    }
});
window.addEventListener('polygol-app-closed', () => {
    startSynchronizedClockAndDate();
});

// Global helper to trigger an immediate UI refresh
window.refreshClockUI = function() {
    startSynchronizedClockAndDate();
};

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
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');

    if (['Weather', 'Location'].some(item => disabledSys.includes(item))) {
        return;
    }

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
                else reject(new Error(window.t ? window.t('LOCATION_DISABLED') : 'Location Component Disabled'));
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
                let city = window.t ? window.t('LOCATION_UNKNOWN') : 'Unknown Location';
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
                            city = cachedGeo.city || (window.t ? window.t('LOCATION_UNKNOWN') : 'Unknown Location');
                            country = cachedGeo.country || '';
                        } else if (!geocodingResponse.ok) {
                            throw new Error("Geocoding API error");
						} else {
                            const geocodingData = await geocodingResponse.json();
                            city = geocodingData.address.city ||
                                geocodingData.address.town ||
                                geocodingData.address.village ||
                                (window.t ? window.t('LOCATION_UNKNOWN') : 'Unknown Location');
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
                    attribution: window.t ? window.t('WEATHER_ATTRIBUTION') : "Weather data by Open-Meteo.com, Geocoding by OpenStreetMap"
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
    const lang = localStorage.getItem('selectedLanguage') || 'EN';
    const locale = (typeof window.getBcp47Locale === 'function') 
        ? window.getBcp47Locale(lang)
        : ((lang === 'JP' || lang === 'JA') ? 'ja-JP' : (lang === 'KO' ? 'ko-KR' : (lang === 'ZH' ? 'zh-CN' : 'en-US')));
    return date.toLocaleDateString(locale, { weekday: 'long' });
}

function getHourString(dateString) {
    const date = new Date(dateString);
    const use12 = localStorage.getItem('use12HourFormat') === 'true';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: use12 });
}

async function updateSmallWeather() {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
    if (disabledSys.includes('Weather')) {
        const weatherWidget = document.getElementById('weather');
        if (weatherWidget) weatherWidget.style.display = 'none';
        return;
    }

    const showWeather = localStorage.getItem('showWeather') !== 'false';
    
    try {
        const weatherData = await fetchLocationAndWeather();
        if (!weatherData) throw new Error(window.t ? window.t('WEATHER_UNAVAILABLE') : 'Weather data not available');
        
        const temperatureElement = document.getElementById('temperature');
        const weatherIconElement = document.getElementById('weather-icon');
        const weatherInfo = weatherConditions[weatherData.current.weathercode] || { description: (window.t ? window.t('UNKNOWN') : 'Unknown'), icon: () => '❓' };
        
        document.getElementById('weather').style.display = showWeather ? 'block' : 'none';
        
        // Display temperature with appropriate unit symbol
        const tempUnit = weatherData.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
        temperatureElement.textContent = `${Math.round(weatherData.current.temperature)}${tempUnit}`;
        
        weatherIconElement.className = 'material-symbols-rounded';
        weatherIconElement.textContent = weatherInfo.icon(true);
        weatherIconElement.dataset.weatherCode = weatherData.current.weathercode;

        // Force clock format to update immediately with the new weather data
        if (window.refreshClockUI) window.refreshClockUI();
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

function getWeatherConditionDescription(code) {
    const keyMap = {
        0: 'WEATHER_CLEAR_SKY',
        1: 'WEATHER_MAINLY_CLEAR',
        2: 'WEATHER_PARTLY_CLOUDY',
        3: 'WEATHER_OVERCAST',
        45: 'WEATHER_FOG',
        48: 'WEATHER_RIME_FOG',
        51: 'WEATHER_LIGHT_DRIZZLE',
        53: 'WEATHER_MODERATE_DRIZZLE',
        55: 'WEATHER_DENSE_DRIZZLE',
        56: 'WEATHER_LIGHT_FREEZING_DRIZZLE',
        57: 'WEATHER_DENSE_FREEZING_DRIZZLE',
        61: 'WEATHER_SLIGHT_RAIN',
        63: 'WEATHER_MODERATE_RAIN',
        65: 'WEATHER_HEAVY_RAIN',
        66: 'WEATHER_LIGHT_FREEZING_RAIN',
        67: 'WEATHER_HEAVY_FREEZING_RAIN',
        71: 'WEATHER_SLIGHT_SNOW',
        73: 'WEATHER_MODERATE_SNOW',
        75: 'WEATHER_HEAVY_SNOW',
        77: 'WEATHER_SNOW_GRAINS',
        80: 'WEATHER_SLIGHT_SHOWERS',
        81: 'WEATHER_MODERATE_SHOWERS',
        82: 'WEATHER_VIOLENT_SHOWERS',
        85: 'WEATHER_SLIGHT_SNOW_SHOWERS',
        86: 'WEATHER_HEAVY_SNOW_SHOWERS',
        95: 'WEATHER_THUNDERSTORM',
        96: 'WEATHER_THUNDERSTORM_HAIL',
        99: 'WEATHER_HEAVY_THUNDERSTORM_HAIL'
    };
    const key = keyMap[code];
    if (key && window.t) return window.t(key);
    return 'Clear Sky';
}

// Title weather conditions using emojis
const weatherConditionsForTitle = {
    0: { get description() { return getWeatherConditionDescription(0); }, icon: '☀️' },
    1: { get description() { return getWeatherConditionDescription(1); }, icon: '🌤️' },
    2: { get description() { return getWeatherConditionDescription(2); }, icon: '⛅' },
    3: { get description() { return getWeatherConditionDescription(3); }, icon: '☁️' },
    45: { get description() { return getWeatherConditionDescription(45); }, icon: '🌫️' },
    48: { get description() { return getWeatherConditionDescription(48); }, icon: '🌫️' },
    51: { get description() { return getWeatherConditionDescription(51); }, icon: '🌦️' },
    53: { get description() { return getWeatherConditionDescription(53); }, icon: '🌦️' },
    55: { get description() { return getWeatherConditionDescription(55); }, icon: '🌧️' },
    56: { get description() { return getWeatherConditionDescription(56); }, icon: '🌧️' },
    57: { get description() { return getWeatherConditionDescription(57); }, icon: '🌧️' },
    61: { get description() { return getWeatherConditionDescription(61); }, icon: '🌧️' },
    63: { get description() { return getWeatherConditionDescription(63); }, icon: '🌧️' },
    65: { get description() { return getWeatherConditionDescription(65); }, icon: '🌧️' },
    66: { get description() { return getWeatherConditionDescription(66); }, icon: '🌧️' },
    67: { get description() { return getWeatherConditionDescription(67); }, icon: '🌧️' },
    71: { get description() { return getWeatherConditionDescription(71); }, icon: '🌨️' },
    73: { get description() { return getWeatherConditionDescription(73); }, icon: '❄️' },
    75: { get description() { return getWeatherConditionDescription(75); }, icon: '❄️' },
    77: { get description() { return getWeatherConditionDescription(77); }, icon: '❄️' },
    80: { get description() { return getWeatherConditionDescription(80); }, icon: '🌦️' },
    81: { get description() { return getWeatherConditionDescription(81); }, icon: '🌧️' },
    82: { get description() { return getWeatherConditionDescription(82); }, icon: '⛈️' },
    85: { get description() { return getWeatherConditionDescription(85); }, icon: '🌨️' },
    86: { get description() { return getWeatherConditionDescription(86); }, icon: '❄️' },
    95: { get description() { return getWeatherConditionDescription(95); }, icon: '⛈️' },
    96: { get description() { return getWeatherConditionDescription(96); }, icon: '⛈️' },
    99: { get description() { return getWeatherConditionDescription(99); }, icon: '🌩️' }
};

const weatherConditions = {
    0: { 
        get description() { return getWeatherConditionDescription(0); }, 
        icon: () => isDaytime() ? 'clear_day' : 'clear_night'
    },
    1: { 
        get description() { return getWeatherConditionDescription(1); }, 
        icon: () => isDaytime() ? 'partly_cloudy_day' : 'partly_cloudy_night'
    },
    2: { 
        get description() { return getWeatherConditionDescription(2); }, 
        icon: () => isDaytime() ? 'partly_cloudy_day' : 'partly_cloudy_night'
    },
    3: { get description() { return getWeatherConditionDescription(3); }, icon: () => 'cloudy' },
    45: { get description() { return getWeatherConditionDescription(45); }, icon: () => 'foggy' },
    48: { get description() { return getWeatherConditionDescription(48); }, icon: () => 'foggy' },
    51: { 
        get description() { return getWeatherConditionDescription(51); }, 
        icon: () => isDaytime() ? 'rainy_light' : 'rainy_light'
    },
    53: { 
        get description() { return getWeatherConditionDescription(53); }, 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    55: { 
        get description() { return getWeatherConditionDescription(55); }, 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    56: { 
        get description() { return getWeatherConditionDescription(56); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    57: { 
        get description() { return getWeatherConditionDescription(57); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    61: { 
        get description() { return getWeatherConditionDescription(61); }, 
        icon: () => isDaytime() ? 'rainy_light' : 'rainy_light'
    },
    63: { 
        get description() { return getWeatherConditionDescription(63); }, 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    65: { 
        get description() { return getWeatherConditionDescription(65); }, 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    66: { 
        get description() { return getWeatherConditionDescription(66); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    67: { 
        get description() { return getWeatherConditionDescription(67); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    71: { 
        get description() { return getWeatherConditionDescription(71); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    73: { 
        get description() { return getWeatherConditionDescription(73); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    75: { 
        get description() { return getWeatherConditionDescription(75); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    77: { 
        get description() { return getWeatherConditionDescription(77); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    }, 
    80: { 
        get description() { return getWeatherConditionDescription(80); }, 
        icon: () => isDaytime() ? 'rainy_light' : 'rainy_light'
    },
    81: { 
        get description() { return getWeatherConditionDescription(81); }, 
        icon: () => isDaytime() ? 'rainy' : 'rainy'
    },
    82: { 
        get description() { return getWeatherConditionDescription(82); }, 
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    },
    85: { 
        get description() { return getWeatherConditionDescription(85); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    86: { 
        get description() { return getWeatherConditionDescription(86); }, 
        icon: () => isDaytime() ? 'cloudy_snowing' : 'cloudy_snowing'
    },
    95: { 
        get description() { return getWeatherConditionDescription(95); }, 
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    },
    96: { 
        get description() { return getWeatherConditionDescription(96); },
        icon: () => isDaytime() ? 'thunderstorm' : 'thunderstorm'
    },
    99: { 
        get description() { return getWeatherConditionDescription(99); }, 
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
                title = isStorm(code) ? window.t('STORM_COMING') : window.t('RAIN_COMING');
                text = window.t('EXPECTED_IN_HOURS', { hours: nextBadIndex });
            } else if (!isCloudy(currentCode) && nextCloudIndex !== -1) {
                event = 'incoming';
                icon = 'cloud';
                title = window.t('CLOUDS_COMING');
                text = window.t('SKIES_CHANGING_IN_HOURS', { hours: nextCloudIndex });
            }
        } 
        // 2. Check for clearing events
        else if (isBad(currentCode)) {
            const nextClearIndex = forecastSlice.findIndex((c, i) => i > 0 && !isBad(c));
            if (nextClearIndex !== -1) {
                event = 'clearing';
                icon = 'wb_sunny';
                title = window.t('CLEARING_SOON');
                text = window.t('CONDITIONS_IMPROVING_IN_HOURS', { hours: nextClearIndex });
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
            url: '/assets/polygolapp/intl/liveactivity/weather-alert.html',
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
    setInterval(updateSunEffect, 10 * 60 * 1000); // Update every 10 minutes
    updateSmallWeather();
    setInterval(updateSmallWeather, 600000); // Update weather every 10 minutes
}

secondsSwitch.addEventListener('change', function() {
    showSeconds = this.checked;
    localStorage.setItem('showSeconds', showSeconds);
    refreshClockUI();
    
    // Save to current wallpaper's clock styles
    if (recentWallpapers.length > 0 && currentWallpaperPosition >= 0 && currentWallpaperPosition < recentWallpapers.length) {
        if (!recentWallpapers[currentWallpaperPosition].clockStyles) {
            recentWallpapers[currentWallpaperPosition].clockStyles = {};
        }
        recentWallpapers[currentWallpaperPosition].clockStyles.showSeconds = showSeconds;
        saveRecentWallpapers();
    }
});