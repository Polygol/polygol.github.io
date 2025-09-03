/**
 * Gurasuraisu API for Gurapps
 * This helper script allows an iframe (Gurapp) to safely communicate
 * with the parent Gurasuraisu (Polygol) window and use its core functions.
 */

// Gurasuraisu Font and Cursor Injection
// This block runs as soon as the script is loaded by the Gurapp.
(function() {
    const style = document.createElement('style');
    style.textContent = `
        /* Inject Open Runde Font Faces via jsDelivr CDN */
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

        h1, h2, h3, h4, h5, h6 {
        	font-family: 'Open Runde', sans-serif;
        }
    `;
    
    if (isInsideGurasuraisu) {
        // --- STYLES ONLY FOR GURASURAISU ENVIRONMENT ---
        css += `
            * {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 10.04 10.04"><circle cx="5.02" cy="5.02" r="4.52" style="fill:rgba(0,0,0,0.5);stroke:rgba(255,255,255,0.5);stroke-width:1"/></svg>') 10 10, auto !important;
            }
            /* Style for when parent enables high contrast */
            body.gurasuraisu-high-contrast {
                --background-color-dark-tr: var(--background-color-dark);
                --background-color-light-tr: var(--background-color-light);
            }
        `;
    } else {
        // --- STYLES ONLY FOR STANDALONE ENVIRONMENT ---
        css += `
            body {
                /* Remap transparent colors to solid colors when standalone */
                --background-color-dark-tr: var(--background-color-dark);
                --background-color-light-tr: var(--background-color-light);
            }
        `;
    }

    style.textContent = css;
    document.head.appendChild(style);
})();

const isInsideGurasuraisu = window.frameElement && window.frameElement.hasAttribute('data-gurasuraisu-iframe');

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
      }, window.location.origin);
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
      if (event.origin !== window.location.origin) return;
        if (event.data.type === 'media-control' && actions[event.data.action]) {
          actions[event.data.action]();
        }
    });
  }
};

// --- Event Listener for Messages FROM Gurasuraisu ---

/**
 * Listens for messages from the parent window, such as theme
 * or animation setting changes, and applies them to the Gurapp.
 */
window.addEventListener('message', async (event) => {
  if (event.origin !== window.location.origin) {
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
        document.body.classList.toggle('gurasuraisu-high-contrast', data.enabled);
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
            }, window.location.origin);
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
  try {
    const storedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', storedTheme === 'light');

    const animationsEnabled = localStorage.getItem('animationsEnabled') !== 'false';
    document.body.classList.toggle('reduce-animations', !animationsEnabled);

    const highContrastEnabled = localStorage.getItem('highContrast') === 'true';
    document.body.classList.toggle('gurasuraisu-high-contrast', highContrastEnabled);
  } catch (e) {
    console.error("Gurapp: Could not access localStorage. Settings may not apply.", e);
  }
});

// Announce that the API is ready
const readyEvent = new CustomEvent('GurasuraisuReady');
window.dispatchEvent(readyEvent);
