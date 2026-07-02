const closeModal = document.getElementById('closeModal');
const blurOverlay = document.getElementById('blurOverlay');

const __clockElement = document.getElementById('clock');
if (__clockElement) {
    __clockElement.addEventListener('click', (e) => {
        if (document.body.classList.contains('edit-mode-active')) {
            e.stopPropagation();
            if (typeof openEditSheet === 'function') openEditSheet('clock');
            return;
        }
        if (typeof window.gurappsEnabled !== 'undefined' && !window.gurappsEnabled) return;
        if (typeof gurappsEnabled !== 'undefined' && !gurappsEnabled) return;
        createFullscreenEmbed('https://polygol.github.io/chronos/index.html');
    });
}

const __weatherWidget = document.getElementById('weather');
if (__weatherWidget) {
    __weatherWidget.addEventListener('click', (e) => {
        if (document.body.classList.contains('edit-mode-active')) {
            e.stopPropagation();
            if (typeof openEditSheet === 'function') openEditSheet('background');
            return;
        }
        if (typeof window.gurappsEnabled !== 'undefined' && !window.gurappsEnabled) return;
        if (typeof gurappsEnabled !== 'undefined' && !gurappsEnabled) return;
        createFullscreenEmbed('https://polygol.github.io/weather/index.html');
    });
}

const __dateElement = document.getElementById('date');
if (__dateElement) {
    __dateElement.addEventListener('click', (e) => {
        if (document.body.classList.contains('edit-mode-active')) {
            e.stopPropagation();
            if (typeof openEditSheet === 'function') openEditSheet('date');
            return;
        }
        if (typeof window.gurappsEnabled !== 'undefined' && !window.gurappsEnabled) return;
        if (typeof gurappsEnabled !== 'undefined' && !gurappsEnabled) return;
        createFullscreenEmbed('https://polygol.github.io/fantaskical/index.html');
    });
}

// Catch background clicks in edit mode to open Background Settings
document.addEventListener('click', (e) => {
    if (document.body.classList.contains('edit-mode-active')) {
        const isClickInsideSheet = e.target.closest('#edit-mode-ui');
        const isClickInsideClock = e.target.closest('#clock');
        const isClickInsideDate = e.target.closest('.info');
        const isClickInsideWidget = e.target.closest('.widget-instance');
        const isControlPopup = e.target.closest('.control-popup');

        if (!isClickInsideSheet && !isClickInsideClock && !isClickInsideDate && !isClickInsideWidget && !isControlPopup) {
            if (typeof openEditSheet === 'function') openEditSheet('background');
        }
    }
});

const customizeModal = document.getElementById('customizeModal');
const customizeModalContent = document.getElementById('customizeModalContent');
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

// --- bottom-Up Swipe on Controls ---
let controlsSwipeStartY = 0;
let isControlsSwipe = false;

if (customizeModal) {
    customizeModal.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            const isAtBottom = customizeModalContent.scrollHeight - customizeModalContent.scrollTop <= customizeModalContent.clientHeight + 10;
            const hasNoScroll = customizeModalContent.scrollHeight <= customizeModalContent.clientHeight;
            
            if (isAtBottom || hasNoScroll) {
                isControlsSwipe = true;
                controlsSwipeStartY = e.touches[0].clientY;
            } else {
                isControlsSwipe = false;
            }
        }
    }, { passive: true });

    customizeModal.addEventListener('touchmove', (e) => {
        if (isControlsSwipe && e.touches && e.touches.length > 0) {
            const deltaY = controlsSwipeStartY - e.touches[0].clientY;
            if (deltaY > 50) {
                isControlsSwipe = false;
                closeControls();
            }
        }
    }, { passive: true });

    customizeModal.addEventListener('touchend', () => {
        isControlsSwipe = false;
    }, { passive: true });
}