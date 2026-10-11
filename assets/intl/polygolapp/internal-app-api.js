/**
 * Polygol Internal Root API
 *
 * Provides internal engineering apps with root access (system-admin)
 * and deep system interaction capabilities across Polygol.
 */

(function () {
    'use strict';

    const RootAPI = {
        isRoot: true,

        /**
         * Executes arbitrary JavaScript directly in the parent Polygol window
         * and returns the evaluation result.
         * @param {string} code - JavaScript string to evaluate in Polygol root context
         * @returns {Promise<any>}
         */
        execute: function (code) {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (e.data && (e.data.type === 'commandOutput' || e.data.type === 'rootExecResult')) {
                        window.removeEventListener('message', handler);
                        resolve(e.data.message !== undefined ? e.data.message : e.data.result);
                    }
                };
                window.addEventListener('message', handler);

                window.parent.postMessage({
                    action: 'callPolygolFunc',
                    functionName: 'executeParentJS',
                    args: [code]
                }, '*');

                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    resolve(null);
                }, 8000);
            });
        },

        /**
         * Reads a key from parent Polygol localStorage.
         * @param {string} key
         * @returns {Promise<string|null>}
         */
        getStorage: function (key) {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (e.data && e.data.type === 'localStorageItemValue' && e.data.key === key) {
                        window.removeEventListener('message', handler);
                        resolve(e.data.value);
                    }
                };
                window.addEventListener('message', handler);

                window.parent.postMessage({
                    action: 'callPolygolFunc',
                    functionName: 'getLocalStorageItem',
                    args: [key]
                }, '*');

                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    resolve(null);
                }, 4000);
            });
        },

        /**
         * Sets a key in parent Polygol localStorage and dispatches setting update.
         * @param {string} key
         * @param {any} value
         */
        setStorage: function (key, value) {
            window.parent.postMessage({
                action: 'callPolygolFunc',
                functionName: 'setLocalStorageItem',
                args: [key, String(value)]
            }, '*');
        },

        /**
         * Removes a key from parent Polygol localStorage.
         * @param {string} key
         */
        removeStorage: function (key) {
            window.parent.postMessage({
                action: 'callPolygolFunc',
                functionName: 'removeLocalStorageItem',
                args: [key]
            }, '*');
        },

        /**
         * Returns all localStorage keys and values from parent Polygol.
         * @returns {Promise<Array<{key: string, value: any}>>}
         */
        getAllStorage: function () {
            return new Promise((resolve) => {
                const handler = (e) => {
                    if (e.data && e.data.type === 'localStorageAllValues') {
                        window.removeEventListener('message', handler);
                        resolve(e.data.value || []);
                    }
                };
                window.addEventListener('message', handler);

                window.parent.postMessage({
                    action: 'callPolygolFunc',
                    functionName: 'getLocalStorageAll',
                    args: []
                }, '*');

                setTimeout(() => {
                    window.removeEventListener('message', handler);
                    resolve([]);
                }, 4000);
            });
        },

        /**
         * Reboots Polygol.
         */
        reboot: function () {
            window.parent.postMessage({
                action: 'callPolygolFunc',
                functionName: 'rebootPolygol',
                args: []
            }, '*');
        },

        /**
         * Force closes a running application by name.
         * @param {string} appName
         */
        forceCloseApp: function (appName) {
            window.parent.postMessage({
                action: 'callPolygolFunc',
                functionName: 'forceCloseAppByName',
                args: [appName]
            }, '*');
        },

        /**
         * Clears all stored data for an application.
         * @param {string} appName
         */
        clearAppData: function (appName) {
            window.parent.postMessage({
                action: 'callPolygolFunc',
                functionName: 'clearAppData',
                args: [appName]
            }, '*');
        },

        /**
         * Dismisses and clears all active notifications in Polygol.
         */
        clearAllNotifications: function () {
            window.parent.postMessage({
                action: 'callPolygolFunc',
                functionName: 'clearAllNotifications',
                args: []
            }, '*');
        },

        /**
         * Triggers system-wide memory care and garbage collection.
         */
        runMemoryCare: function () {
            window.parent.postMessage({
                action: 'executeInternalCare'
            }, '*');
        },

        /**
         * Modifies an internal engineering variable or feature flag.
         * @param {string} key
         * @param {any} value
         */
        setInternalVariable: function (key, value) {
            window.parent.postMessage({
                action: 'setInternalVariable',
                key: key,
                value: value
            }, '*');
        },

        /**
         * Launches any installed app or internal tool URL.
         * @param {string} url
         */
        launchApp: function (url) {
            if (window.Polygol && Polygol.openApp) {
                Polygol.openApp(url);
            } else {
                window.parent.postMessage({
                    action: 'callPolygolFunc',
                    functionName: 'createFullscreenEmbed',
                    args: [url]
                }, '*');
            }
        },

        /**
         * Fetches real-time system state (active windows, eco tier, memory).
         * @returns {Promise<object>}
         */
        getSystemState: function () {
            return this.execute(`({
                version: window.systemVersion || 'Astatine 17',
                activeAppUrl: window.currentActiveAppUrl || null,
                minimizedApps: Object.keys(window.minimizedEmbeds || {}),
                ecoTier: window.currentEcoTier || 0,
                theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
                animations: !document.body.classList.contains('reduce-animations'),
                highContrast: document.body.classList.contains('high-contrast')
            })`).then(res => {
                try { return typeof res === 'string' ? JSON.parse(res) : res; }
                catch(e) { return {}; }
            });
        }
    };

    window.RootAPI = RootAPI;

    // Extend Polygol when available
    if (window.Polygol) {
        window.Polygol.root = RootAPI;
    } else {
        window.addEventListener('PolygolReady', () => {
            if (window.Polygol) window.Polygol.root = RootAPI;
        });
    }

})();
