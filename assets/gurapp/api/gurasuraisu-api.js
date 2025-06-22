/**
 * Gurasuraisuraisu API for Gurapps
 * This helper script allows an iframe (Gurapp) to safely communicate
 * with the parent Gurasuraisuraisu window and use its core functions.
 */

const Gurasuraisuraisu = {
  /**
   * Internal helper to send a structured message to the parent window.
   * @param {string} functionName - The name of the Gurasuraisu function to call.
   * @param {Array} args - An array of arguments to pass to the function.
   */
  _call: function(functionName, args = []) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        action: 'callGurasuraisuFunc',
        functionName: functionName,
        args: args
      }, window.location.origin);
    } else {
      console.warn(`Gurasuraisu API: Could not call '${functionName}'. Not running inside a Gurasuraisu iframe.`);
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
  }
};

// --- Event Listener for Messages FROM Gurasuraisu ---

/**
 * Listens for messages from the parent window, such as theme
 * or animation setting changes, and applies them to the Gurapp.
 */
window.addEventListener('message', (event) => {
  // Ensure the message is from our own origin for security
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
      // You can handle other incoming messages from Gurasuraisu here
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
    } catch (e) {
        console.error("Gurapp: Could not access localStorage. Settings may not apply.", e);
    }
});
