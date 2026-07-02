// --- On-Screen Display (OSD) ---
let osdTimeout = null;
window.showOSD = function(type, value) {
    const osd = document.getElementById('system-osd');
    const iconEl = document.getElementById('osd-icon');
    const fillEl = document.getElementById('osd-fill');
    if (!osd || !iconEl || !fillEl) return;

    if (type === 'brightness') {
        iconEl.textContent = value < 50 ? 'wb_sunny' : 'sunny';
    } else if (type === 'volume') {
        iconEl.textContent = value == 0 ? 'volume_off' : (value < 50 ? 'volume_down' : 'volume_up');
    }

    fillEl.style.width = `${value}%`;

    osd.classList.add('show');

    clearTimeout(osdTimeout);
    osdTimeout = setTimeout(() => {
        osd.classList.remove('show');
    }, 2000);
};