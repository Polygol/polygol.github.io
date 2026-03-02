const closeModal = document.getElementById('closeModal');
const blurOverlay = document.getElementById('blurOverlay');

const __clockElement = document.getElementById('clock');
if (__clockElement) {
    __clockElement.addEventListener('click', () => {
        if (typeof window.gurappsEnabled !== 'undefined' && !window.gurappsEnabled) return;
        if (typeof gurappsEnabled !== 'undefined' && !gurappsEnabled) return;
        createFullscreenEmbed('https://polygol.github.io/chronos/index.html');
    });
}

const __weatherWidget = document.getElementById('weather');
if (__weatherWidget) {
    __weatherWidget.addEventListener('click', () => {
        if (typeof window.gurappsEnabled !== 'undefined' && !window.gurappsEnabled) return;
        if (typeof gurappsEnabled !== 'undefined' && !gurappsEnabled) return;
        createFullscreenEmbed('https://polygol.github.io/weather/index.html');
    });
}

const __dateElement = document.getElementById('date');
if (__dateElement) {
    __dateElement.addEventListener('click', () => {
        if (typeof window.gurappsEnabled !== 'undefined' && !window.gurappsEnabled) return;
        if (typeof gurappsEnabled !== 'undefined' && !gurappsEnabled) return;
        createFullscreenEmbed('https://polygol.github.io/fantaskical/index.html');
    });
}

const customizeModal = document.getElementById('customizeModal');
const themeSwitch = document.getElementById('theme-switch');
const wallpaperInput = document.getElementById('wallpaperInput');
const uploadButton = document.getElementById('uploadButton');
const gurappsSwitch = document.getElementById("gurapps-switch");
const contrastSwitch = document.getElementById('contrast-switch');
const animationSwitch = document.getElementById('animation-switch');
let gurappsEnabled = localStorage.getItem("gurappsEnabled") !== "false";
let slideshowInterval = null;
let currentWallpaperIndex = 0;
let minimalMode = localStorage.getItem('minimalMode') === 'true';
let nightMode = localStorage.getItem('nightMode') === 'true';
let oneButtonNavEnabled = localStorage.getItem('oneButtonNavEnabled') === 'true';
let glassEffectsEnabled = localStorage.getItem('glassEffectsEnabled') !== 'false'; // Default to true
let minimizeCleanupTimeout = null; 
const minimizeTimeouts = {}; // Track timeouts per app URL

document.getElementById("versionButton").addEventListener("click", function() {
	closeControls();
	createFullscreenEmbed('https://kirbindustries.gitbook.io/polygol');
});

// Close customizeModal when clicking outside
const __blurOverlayControls = document.getElementById('blurOverlayControls');
if (__blurOverlayControls) {
    __blurOverlayControls.addEventListener('click', () => {
        closeControls();
    });
}

function closeControls() {
	const dynArea = document.getElementById('dynamic-area');
	if (dynArea) dynArea.style.opacity = '1';
	const custModal = document.getElementById('customizeModal');
    if (custModal) custModal.classList.remove('show'); // Start animation
    const blurCtrl = document.getElementById('blurOverlayControls');
    if (blurCtrl) blurCtrl.classList.remove('show');

    // Collapse all settings sections when closing
    const homeSettings = document.querySelector('.settings-grid.home-settings');
    if (homeSettings) {
        homeSettings.querySelectorAll('h4').forEach(heading => {
            const icon = heading.querySelector('.material-symbols-rounded');
            const content = heading.nextElementSibling;
            
            if (content) content.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        });
    }

    setTimeout(() => {
        if (custModal) custModal.style.display = 'none'; // Hide after animation
        if (blurCtrl) blurCtrl.style.display = 'none';
    }, 300);
}