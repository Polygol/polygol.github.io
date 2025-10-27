/**
 * Gurasuraisu API for Gurapps
 * This helper script allows an iframe (Gurapp) to safely communicate
 * with the parent Gurasuraisu (Polygol) window and use its core functions.
 */

const isInsideGurasuraisu = window.self !== window.top;
let _mediaControlActions = {};
let _actionRequestHandlers = {};
const _myActiveActivities = new Set(); // NEW: Tracks this app's active activities

// Gurasuraisu Font and Cursor Injection
// This block runs as soon as the script is loaded by the Gurapp.
(function() {
    const style = document.createElement('style');
    let css = `
        /* Inject Font Faces */
        
        /* Inter */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');

        /* Material Symbols */
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,0');  
        
        /* Roboto */
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100..900&display=swap');
        
        /* Bricolage Grotesque */
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');
        
        /* DynaPuff */
        @import url('https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&display=swap');
        
        /* Domine */
        @import url('https://fonts.googleapis.com/css2?family=Domine:wght@400..700&display=swap');
        
        /* Climate Crisis */
        @import url('https://fonts.googleapis.com/css2?family=Climate+Crisis&display=swap');
        
        /* JetBrains Mono */
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100..800&display=swap');
        
        /* DotGothic16 (400) */
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
        
        /* Playpen Sans */
        @import url('https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@100..800&display=swap');
        
        /* Jaro */
        @import url('https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&display=swap');
        
        /* Doto */
        @import url('https://fonts.googleapis.com/css2?family=Doto:wght@400;700&display=swap'); 
        
        /* Nunito */
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@200..900&display=swap');

        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 400;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Regular.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 500;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Medium.woff2') format('woff2');
        }
        
        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 700;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Semibold.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Open Runde';
          font-style: normal;
          font-weight: 800;
          src: url('https://cdn.jsdelivr.net/gh/lauridskern/open-runde@main/src/web/OpenRunde-Bold.woff2') format('woff2');
        }

        @font-face {
          font-family: 'Inter Numeric';
          src: url('/assets/fonts/InterNumeric.ttf') format('truetype-variations');
          font-weight: 100 900; /* Define the supported variable weight range */
          font-style: normal;
        }
    
        * {
          -webkit-tap-highlight-color: transparent;
        }
        
        *::-webkit-scrollbar {
            width: 8px; /* Thin scrollbar */
        }
        
        *::-webkit-scrollbar-track {
            background: transparent;
        }
        
        *::-webkit-scrollbar-thumb {
        	background-color: var(--search-background);
        	border-radius: 50px;
        }

        /* Set Font Faces */

        h1, h2, h3, h4, h5, h6 {
        	font-family: 'Open Runde', sans-serif;
        }

        .material-symbols-rounded {
            font-variation-settings:
                'FILL' 1,
                'wght' 700,
                'GRAD' 0,
                'opsz' 24;
            vertical-align: middle;
        }

        :root {
            --edge-refraction-filter: url('#edge-refraction-only');
            --sun-shadow: 0 0 0 0 transparent;
            
            /* Dark Theme (Default) Variables */
            --background-color-dark: #1c1c1c;
            --background-color-dark-tr: rgba(28, 28, 28, 0.7);
            --text-color-dark: #f9f9f9;
            --secondary-text-color-dark: rgba(255, 255, 255, 0.7);
            --modal-background-dark: rgba(51, 51, 51, 0.8);
            --modal-transparent-dark: rgba(51, 51, 51, 0.7);
            --search-background-dark: rgba(51, 51, 51, 0.5);
            --dark-overlay: rgba(51, 51, 51, 0.2);
            --dark-transparent: rgba(255, 255, 255, 0.1); 
            --glass-border-dark: rgba(100, 100, 100, 0.2);
            
            /* Light Theme Variables */
            --background-color-light: #f0f0f0;
        	--background-color-light-tr: rgba(240, 240, 240, 0.7);
            --text-color-light: #333333;
            --secondary-text-color-light: rgba(0, 0, 0, 0.7);
            --modal-background-light: rgba(220, 220, 220, 0.8);
            --modal-transparent-light: rgba(240, 240, 240, 0.7);
            --search-background-light: rgba(220, 220, 220, 0.5);
            --light-overlay: rgba(220, 220, 220, 0.2);
            --light-transparent: rgba(255, 255, 255, 0.1); 
            --glass-border-light: rgba(200, 200, 200, 0.2);
            
            /* High Contrast Dark Theme Variables */
            --background-color-dark-highcontrast: #1c1c1c;
            --background-color-dark-tr-highcontrast: #1c1c1c;
            --text-color-dark-highcontrast: #f9f9f9;
            --secondary-text-color-dark-highcontrast: #b3b3b3;
            --modal-background-dark-highcontrast: #333333;
            --modal-transparent-dark-highcontrast: #333333;
            --search-background-dark-highcontrast: #333333;
            --dark-overlay-highcontrast: #1c1c1c;
            --dark-transparent-highcontrast: #000000;
            
            /* High Contrast Light Theme Variables */
            --background-color-light-highcontrast: #f0f0f0;
            --background-color-light-tr-highcontrast: #f0f0f0;
            --text-color-light-highcontrast: #333333;
            --secondary-text-color-light-highcontrast: #4d4d4d;
            --modal-background-light-highcontrast: #dcdcdc;
            --modal-transparent-light-highcontrast: #f0f0f0;
            --search-background-light-highcontrast: #dcdcdc;
            --light-overlay-highcontrast: #f0f0f0;
            --light-transparent-highcontrast: #ffffff;
            
            /* Base Variables */
            --base-font-size: clamp(16px, 2vw + 1rem, 24px);
            
            /* Default to Dark Theme */
            --background-color: var(--background-color-dark);
            --background-color-tr: var(--background-color-dark-tr);
            --background-color-tr-op: var(--background-color-light-tr);
            --text-color: var(--text-color-dark);
            --secondary-text-color: var(--secondary-text-color-dark);
            --modal-background: var(--modal-background-dark);
            --modal-transparent: var(--modal-transparent-dark);
            --search-background: var(--search-background-dark);
            --overlay-color: var(--dark-overlay);
            --transparent-color: var(--dark-transparent);
            --glass-border: var(--glass-border-dark);
        }
        
        body.light-theme {
            --background-color: var(--background-color-light);
            --background-color-tr: var(--background-color-light-tr);
            --background-color-tr-op: var(--background-color-dark-tr);
            --text-color: var(--text-color-light);
            --secondary-text-color: var(--secondary-text-color-light);
            --modal-background: var(--modal-background-light);
            --modal-transparent: var(--modal-transparent-light);
            --search-background: var(--search-background-light);
            --search-background-op: var(--search-background-dark);
            --overlay-color: var(--light-overlay);
            --transparent-color: var(--light-transparent);
            --glass-border: var(--glass-border-light);
        }
        
        /* For dark theme (default) with high contrast */
        html.gurasuraisu-high-contrast body:not(.light-theme) {
            --background-color-tr: var(--background-color-dark-tr-highcontrast);
            --background-color-tr-op: var(--background-color-light-tr-highcontrast);
            --secondary-text-color: var(--secondary-text-color-dark-highcontrast);
            --modal-background: var(--modal-background-dark-highcontrast);
            --modal-transparent: var(--modal-transparent-dark-highcontrast);
            --search-background: var(--search-background-dark-highcontrast);
            --overlay-color: var(--dark-overlay-highcontrast);
            --transparent-color: var(--dark-transparent-highcontrast);
            --glass-border: var(--secondary-text-color-dark-highcontrast);
        }
        
        /* For light theme with high contrast */
        html.gurasuraisu-high-contrast body.light-theme {
            --background-color-tr: var(--background-color-light-tr-highcontrast);
            --background-color-tr-op: var(--background-color-dark-tr-highcontrast);
            --secondary-text-color: var(--secondary-text-color-light-highcontrast);
            --modal-background: var(--modal-background-light-highcontrast);
            --modal-transparent: var(--modal-transparent-light-highcontrast);
            --search-background: var(--search-background-light-highcontrast);
            --overlay-color: var(--light-overlay-highcontrast);
            --transparent-color: var(--light-transparent-highcontrast);
            --glass-border: var(--secondary-text-color-light-highcontrast);
        }

        /* Universal backdrop-filter removal for high contrast */
        html.gurasuraisu-high-contrast * {
            backdrop-filter: none !important;
        }

        html.gurasuraisu-glass-disabled {
            --edge-refraction-filter: blur(17.5px); /* Frosted glass appearance */
        }

        :root.standalone {
            --background-color-dark-tr: var(--background-color-dark);
            --background-color-light-tr: var(--background-color-light);
        }

        /* When animations are disabled */
        .reduce-animations * {
            /* Disable all animations */
            animation: none !important;
        
            /* Disable all transitions except opacity */
            transition: opacity 0.3s ease !important;
            transition-property: opacity !important;
        }
        
        /* Special handling for clickable elements */
        .reduce-animations [onclick],
        .reduce-animations button,
        .reduce-animations a,
        .reduce-animations input[type="button"],
        .reduce-animations input[type="submit"],
        .reduce-animations .clickable {
            /* Keep initial state but remove transition */
            transform: scale(1) !important;
            transition: opacity 0.3s ease !important;
        }
        
        /* Keep active state functional but without animation */
        .reduce-animations [onclick]:active,
        .reduce-animations button:active,
        .reduce-animations a:active,
        .reduce-animations input[type="button"]:active,
        .reduce-animations input[type="submit"]:active,
        .reduce-animations .clickable:active {
            /* Apply scale instantly without transition */
            transform: scale(0.98) !important;
            transition: none !important;
        }

        input[type="color"] {
            -webkit-appearance: none;
            appearance: none;
            border: 1px solid var(--glass-border);
            width: 30px;
            height: 30px;
            padding: 0;
            background: none;
            border-radius: 999px;
            cursor: pointer;
            overflow: hidden;
        }
        
        input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 0;
        }
        
        input[type="color"]::-webkit-color-swatch {
          border: none;
          border-radius: 999px;
        }
        
        input[type="color"]::-moz-color-swatch {
          border: 1px solid var(--glass-border);
          border-radius: 999px;
        }
    `;
    
    // Conditionally add Gurasuraisu-specific styles.
    if (isInsideGurasuraisu) {
        css += `
            :root {
                /* Define the two cursor styles as variables */
                --gurasu-cursor-dark: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 10.04 10.04"><circle cx="5.02" cy="5.02" r="4.52" style="fill:rgba(255,255,255,0.7);stroke:rgba(0,0,0,0.5);stroke-width:1"/></svg>') 10 10, auto;
                --gurasu-cursor-light: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 10.04 10.04"><circle cx="5.02" cy="5.02" r="4.52" style="fill:rgba(0,0,0,0.5);stroke:rgba(255,255,255,0.5);stroke-width:1"/></svg>') 10 10, auto;
                --gurasu-cursor-hidden: none;
                
                /* Set the default active cursor (for dark theme) */
                --gurasu-cursor-visible: var(--gurasu-cursor-dark);
                --gurasu-active-cursor: var(--gurasu-cursor-visible);
            }

            /* Switch cursor for light theme */
            body.light-theme {
                --gurasu-cursor-visible: var(--gurasu-cursor-light);
            }
        
            /* Apply the correct visible cursor to all elements by default */
            * {
                cursor: var(--gurasu-cursor-visible) !important;
            }
    
            /* When the parent signals inactivity, override all elements to have the hidden cursor */
            html.gurasuraisu-cursor-hidden * {
                cursor: var(--gurasu-cursor-hidden) !important;
            }
        `;
    }

    style.textContent = css;
    document.head.appendChild(style);
})();

// Native JS solutions for when the app is running outside of Polygol
const _fallbacks = {
    showPopup: function(message) {
        // A simple, non-blocking "toast" notification fallback
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background-color: #333; color: white; padding: 10px 20px; border-radius: 20px;
            z-index: 9999; transition: opacity 0.5s; font-family: sans-serif;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },
    // For functions that have no standalone equivalent, we can just log a warning.
    default: function(functionName) {
        console.warn(`Gurasuraisu API: '${functionName}' is only available inside the Polygol environment.`);
    }
};
 
const Gurasuraisu = {
  /**
   * Internal helper to send a structured message to the parent window.
   * @param {string} functionName - The name of the Gurasuraisu function to call.
   * @param {Array} args - An array of arguments to pass to the function.
   */
  _call: function(functionName, args = []) {
    if (isInsideGurasuraisu) {
      window.parent.postMessage({
        action: 'callGurasuraisuFunc',
        functionName: functionName,
        args: args
      }, '*');
    } else {
      // Use the fallback if it exists, otherwise use the default fallback
      const fallback = _fallbacks[functionName] || (() => _fallbacks.default(functionName));
      fallback.apply(this, args);
    }
  },

  // --- Public API Functions ---

  /**
   * Shows a temporary popup message at the bottom of the screen.
   * @param {string} message - The text to display in the popup.
   */
  showPopup: function(message) {
    this._call('showPopup', [message]);
  },

  /**
   * Shows a more advanced notification on-screen and in the notification shade.
   * @param {string} message - The text to display.
   * @param {object} [options] - Optional parameters like icon and button text.
   */
  showNotification: function(message, options = {}) {
    // Note: 'buttonAction' functions cannot be passed from the iframe.
    // The parent window handles all actions.
    this._call('showNotification', [message, options]);
  },

  /**
   * Namespace for Live Activity functions.
   */
  liveActivity: {
    /**
     * Starts a Live Activity.
     * @param {object} options - Configuration object.
     * @param {string} options.activityId - A unique ID for this activity within your app.
     * @param {string} options.url - The URL of the HTML page for the activity's iframe.
     * @param {boolean} [options.homescreen=false] - Set to true if this activity should appear on the homescreen.
     * @param {string} [options.height='120px'] - The desired height of the activity in the notification shade.
     */
    start: function(options) {
      if (options && options.activityId) {
        _myActiveActivities.add(options.activityId); // Add to local tracker
      }
      Gurasuraisu._call('startLiveActivity', [options]);
    },

    /**
     * Checks if a live activity with the given ID is currently active for this app.
     * @param {string} activityId - The unique ID of the activity.
     * @returns {boolean} - True if the activity is active, false otherwise.
     */
    isActive: function(activityId) {
      return _myActiveActivities.has(activityId);
    },

    /**
     * Pushes updated data to a running Live Activity.
     * The parent OS will forward this data to the correct iframe.
     * @param {string} activityId - The unique ID of the activity.
     * @param {object} data - The data payload to send (e.g., { timeLeft: 120 }).
     */
    update: function(activityId, data) {
      Gurasuraisu._call('updateLiveActivity', [activityId, data]);
    },

    /**
     * Stops a running Live Activity.
     * @param {string} activityId - The unique ID of the activity you want to stop.
     */
    stop: function(activityId) {
      if (activityId) {
        _myActiveActivities.delete(activityId); // Remove from local tracker
      }
      Gurasuraisu._call('stopLiveActivity', [activityId]);
    },
    
    /**
     * (For use inside a Live Activity iframe) Pushes updated summary data to the parent homescreen.
     * @param {object} data - The data to display.
     * @param {string} data.icon - The Material Symbols icon name.
     * @param {string} data.text - The text to display.
     */
    pushHomescreenUpdate: function(data) {
        if (isInsideGurasuraisu) {
            window.parent.postMessage({
                type: 'live-activity-homescreen-update',
                icon: data.icon,
                text: data.text
            }, '*');
        }
    }
  },

  /**
   * Requests the parent window to minimize the current Gurapp.
   */
  minimize: function() {
    this._call('minimizeFullscreenEmbed');
  },

  /**
   * Requests the parent to open another Gurapp.
   * @param {string} url - The URL of the Gurapp to open (e.g., "/chronos/index.html").
   */
  openApp: function(url) {
    this._call('createFullscreenEmbed', [url]);
  },

  /**
   * Turns the screen black for power-saving or privacy.
   */
  blackout: function() {
    this._call('blackoutScreen');
  },
 
   /**
   * Asks the parent Gurasuraisu to send back the list of currently installed apps.
   * The parent will respond with a 'installed-apps-list' message.
   */
  requestInstalledApps: function() {
   this._call('requestInstalledApps', []);
  },
   
  /**
  * Requests the parent Gurasuraisu to install a new Gurapp.
  * @param {object} appObject - The complete app object with id, url, iconUrl, etc.
  */
  installApp: function(appObject) {
    this._call('installApp', [appObject]);
  },

  deleteApp: function(appObject) {
    this._call('deleteApp', [appObject]);
  },

  /**
   * Requests the parent Gurasuraisu to install a new App-Link.
   * @param {object} appLinkObject - The app-link object with name, url, iconUrl, etc.
   */
  installAppLink: function(appLinkObject) {
    this._call('installAppLink', [appLinkObject]);
  },

  /**
   * Registers a widget with the Polygol dashboard.
   * Apps should call this for each widget they provide.
   * @param {object} widgetData - An object describing the widget.
   * @param {string} widgetData.appName - The name of the app providing the widget.
   * @param {string} widgetData.widgetId - A unique ID for the widget (e.g., 'weather-current').
   * @param {string} widgetData.title - A user-friendly title (e.g., 'Current Weather').
   * @param {string} widgetData.url - The URL of the widget's content.
   * @param {Array<number>} widgetData.defaultSize - The default [width, height] in grid units (e.g., [1, 1]).
   * @param {string} [widgetData.openUrl] - Optional. The URL to open when the widget is tapped. Defaults to the app's main URL.
   */
  registerWidget: function(widgetData) {
    if (!widgetData || !widgetData.appName || !widgetData.widgetId || !widgetData.url || !widgetData.title) {
      console.error('[Gurasuraisu API] registerWidget requires appName, widgetId, url, and title.');
        return;
    }
    this._call('registerWidget', [widgetData]);
  },
    
  /**
   * Registers a new media session with the parent.
   * This will show the media widget in the Gurasu UI.
   * @param {object} metadata - An object with { title, artist, artwork: [{src}] }.
   * @param {string[]} [supportedActions] - An array of supported actions, e.g., ['playPause', 'next', 'prev'].
   */
  registerMediaSession: function(metadata, supportedActions = ['playPause']) {
    const appName = document.body.dataset.appName || 'UnknownApp';
    // Pass the new 'supportedActions' array to the parent
    this._call('registerMediaSession', [appName, metadata, supportedActions]);
  },

  /**
   * Updates the parent Gurasu with the current playback state.
   * @param {object} state - An object, e.g., { playbackState: 'playing' | 'paused', metadata: (optional) }.
   */
  updatePlaybackState: function(state) {
    const appName = document.body.dataset.appName || 'UnknownApp';
    this._call('updateMediaPlaybackState', [appName, state]);
  },

  /**
   * Tells the parent to clear/hide the media widget.
   */
  clearMediaSession: function() {
    const appName = document.body.dataset.appName || 'UnknownApp';
    this._call('clearMediaSession', [appName]);
  },

  updateMediaProgress: function(progressState) {
    const appName = document.body.dataset.appName || 'UnknownApp';
    this._call('updateMediaProgress', [appName, progressState]);
  },

  /**
   * Sets up listeners for media control actions sent FROM the parent.
   * @param {object} actions - An object with functions, e.g., { playPause: () => {...}, next: () => {...} }
   */
  onMediaControl: function(actions) {
    window.addEventListener('message', (event) => {
      if (event.source !== window.parent) return;
        if (event.data.type === 'media-control' && actions[event.data.action]) {
          actions[event.data.action]();
        }
    });
  },
      
  // --- NEW IndexedDB Functions ---
  listIDBDatabases: function() { this._call('listIDBDatabases'); },
  listIDBStores: function(dbName) { this._call('listIDBStores', [dbName]); },
  getIDBRecord: function(dbName, storeName, key) { this._call('getIDBRecord', [dbName, storeName, key]); },
  setIDBRecord: function(dbName, storeName, jsonData) { this._call('setIDBRecord', [dbName, storeName, jsonData]); },
  removeIDBRecord: function(dbName, storeName, key) { this._call('removeIDBRecord', [dbName, storeName, key]); },
  clearIDBStore: function(dbName, storeName) { this._call('clearIDBStore', [dbName, storeName]); },

  getLocalStorageItem: function(key) {
    this._call('getLocalStorageItem', [key]);
  },
  setLocalStorageItem: function(key, value) {
    this._call('setLocalStorageItem', [key, value]);
  },

  /**
   * Asks the parent Polygol to change a specific setting value.
   * This is the correct way for the settings app to apply changes.
   * @param {string} key - The localStorage key of the setting.
   * @param {string} value - The new value for the setting.
   */
  setSettingValue: function(key, value) {
    this._call('setLocalStorageItem', [key, value]);
  },

  /**
   * Asks the parent Polygol to check for a new service worker version
   * and trigger the update flow.
   */
  forceUpdate: function() {
    this._call('forceUpdatePolygol', []);
  }
};

// --- Event Listener for Messages FROM Gurasuraisu ---

/**
 * Listens for messages from the parent window, such as theme
 * or animation setting changes, and applies them to the Gurapp.
 */
window.addEventListener('message', async (event) => {
  if (event.source !== window.parent) {
    return;
  }

  const data = event.data;
  if (data && data.type) {
    switch (data.type) {
      case 'themeUpdate':
        document.body.classList.toggle('light-theme', data.theme === 'light');
        break;
      case 'animationsUpdate':
        document.body.classList.toggle('reduce-animations', !data.enabled);
        break;
      case 'contrastUpdate':
        document.documentElement.classList.toggle('gurasuraisu-high-contrast', data.enabled);
        break;
      case 'sunUpdate':
        document.documentElement.style.setProperty('--sun-shadow', data.shadow);
        document.documentElement.style.setProperty('--sun-shadow-strong', data.shadowStrong);
        break;
      case 'cursorStateUpdate':
        document.documentElement.classList.toggle('gurasuraisu-cursor-hidden', !data.visible);
        break;
      case 'glassEffectsUpdate':
        document.documentElement.classList.toggle('gurasuraisu-glass-disabled', !data.enabled);
        break;
          
      // --- NEW: Handles screenshot requests from the parent ---
      case 'request-screenshot':
        try {
            // Check if html2canvas is loaded in the Gurapp's window
            if (typeof html2canvas !== 'function') {
                console.error("html2canvas script not found in this Gurapp. Cannot fulfill screenshot request.");
                return; 
            }
            // Generate the screenshot of the app's content
            const canvas = await html2canvas(document.body, { useCORS: true, logging: false });
            const screenshotDataUrl = canvas.toDataURL('image/jpeg', 0.5);

            // Send the generated screenshot data back to the parent
            window.parent.postMessage({
                type: 'screenshot-response',
                screenshotDataUrl: screenshotDataUrl
            }, '*');
        } catch (e) {
            console.error("This Gurapp failed to generate its screenshot:", e);
        }
        break;
    }
  }
});

/**
 * On initial load, apply settings that might have been set by Gurasuraisu
 * in localStorage for a seamless appearance.
 */
document.addEventListener('DOMContentLoaded', () => {
  // FIX: Apply the 'standalone' class to the <html> element if not in Gurasuraisu
  if (!isInsideGurasuraisu) {
      document.documentElement.classList.add('standalone');
  }

  try {
    const storedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', storedTheme === 'light');

    const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
    document.body.classList.toggle('reduce-animations', !animationsEnabled);

    // FIX: Target the <html> element for the initial high contrast check
    const highContrastEnabled = localStorage.getItem('highContrast') === 'true';
    document.documentElement.classList.toggle('gurasuraisu-high-contrast', highContrastEnabled);
  } catch (e) {
    console.error("Gurapp: Could not access localStorage. Settings may not apply.", e);
  }

  if (isInsideGurasuraisu) {
    let lastActivitySignal = 0;
    const throttleInterval = 500; // Throttle messages to the parent

    const handleLocalActivity = () => {
        // Step 1: Show this iframe's cursor immediately.
        document.documentElement.classList.remove('gurasuraisu-cursor-hidden');

        // Step 2: Notify the parent to reset the global hide timer (throttled).
        const now = Date.now();
        if (now - lastActivitySignal > throttleInterval) {
            window.parent.postMessage({ action: 'userActivity' }, '*');
            lastActivitySignal = now;
        }
    };
    
    // Listen for any user activity within this iframe.
    window.addEventListener('mousemove', handleLocalActivity);
    window.addEventListener('click', handleLocalActivity);
    window.addEventListener('keydown', handleLocalActivity);
  }

  // Tell the parent that this app is ready to receive settings
  if (isInsideGurasuraisu) {
    window.parent.postMessage({ type: 'gurapp-ready' }, '*');
  }
});

// Announce that the API is ready
window.GURASURAISU_API_READY = true;
const readyEvent = new CustomEvent('GurasuraisuReady');
window.dispatchEvent(readyEvent);
