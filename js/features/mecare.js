let activeSessionStartTime = Date.now();
let lastSedentaryAlertTime = Date.now();

function checkFocusSchedule() {
    const scheduleEnabled = localStorage.getItem('focusModeSchedule') === 'true';
    if (!scheduleEnabled) return;

    const start = localStorage.getItem('focusModeStart') || '22:00';
    const end = localStorage.getItem('focusModeEnd') || '07:00';
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    
    let shouldBeFocus = false;
    if (endMins < startMins) {
        shouldBeFocus = currentMins >= startMins || currentMins < endMins;
    } else {
        shouldBeFocus = currentMins >= startMins && currentMins < endMins;
    }

    if (shouldBeFocus !== minimalMode) {
        minimalMode = shouldBeFocus;
        localStorage.setItem('minimalMode', minimalMode);
        updateMinimalMode();
        broadcastSettingUpdate('minimalMode', minimalMode.toString());
    }
}