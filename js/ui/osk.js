let oskLastTouchTime = 0;
let currentTargetFrame = null;
let currentTargetElement = null;
let _isSwitchingOSK = false;
let registeredOSKs = JSON.parse(localStorage.getItem('registeredOSKs') || '[]');
let currentOskIndex = 0;

window.registerCustomOSK = function(appId, name, url) {
    registeredOSKs = registeredOSKs.filter(osk => osk.appId !== appId);
    registeredOSKs.push({ appId, name, url });
    localStorage.setItem('registeredOSKs', JSON.stringify(registeredOSKs));
    updateOskSwitcherVisibility();
};

window.unregisterCustomOSK = function(appId) {
    registeredOSKs = registeredOSKs.filter(osk => osk.appId !== appId);
    localStorage.setItem('registeredOSKs', JSON.stringify(registeredOSKs));
    updateOskSwitcherVisibility();
    
    // If the currently active OSK was uninstalled, revert to default
    if (currentOskIndex > 0) {
        const allOSKs = [{ name: 'Default', url: '/assets/gurapp/intl/overlay/osk/osk.html' }, ...registeredOSKs];
        if (currentOskIndex >= allOSKs.length) {
            currentOskIndex = 0;
            const iframe = document.querySelector('#system-osk-container iframe');
            if (iframe) iframe.src = allOSKs[0].url;
        }
    }
};

function updateOskSwitcherVisibility() {
    const btn = document.getElementById('osk-switcher-btn');
    if (btn) {
        btn.style.display = 'flex'; // Always show to allow emoji toggling
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateOskSwitcherVisibility();
    const btn = document.getElementById('osk-switcher-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            _isSwitchingOSK = true; // Set flag
            
            const allOSKs = [
                { name: 'Default', type: 'internal', mode: 'text' },
                { name: 'Emoji', type: 'internal', mode: 'emoji' },
                ...registeredOSKs.map(osk => ({...osk, type: 'external'}))
            ];

            currentOskIndex = (currentOskIndex + 1) % allOSKs.length;
            const selectedOSK = allOSKs[currentOskIndex];
            
            const iframe = document.querySelector('#system-osk-container iframe');
            if (iframe) {
                if (selectedOSK.type === 'internal') {
                    if (!iframe.src.includes('/assets/gurapp/intl/overlay/osk/osk.html')) {
                        iframe.src = '/assets/gurapp/intl/overlay/osk/osk.html';
                        iframe.onload = () => {
                            iframe.contentWindow.postMessage({ type: 'set-mode', mode: selectedOSK.mode }, '*');
                            const isLight = document.body.classList.contains('light-theme');
                            iframe.contentWindow.postMessage({ type: 'themeUpdate', theme: isLight ? 'light' : 'dark' }, '*');
                        };
                    } else if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'set-mode', mode: selectedOSK.mode }, '*');
                    }
                } else {
                    iframe.src = selectedOSK.url;
                    iframe.onload = null;
                }

                if (window.showPopup) window.showPopup(`${selectedOSK.name}`);
            }
            // Reset flag after a short delay to allow focus to settle
            setTimeout(() => { _isSwitchingOSK = false; }, 100);
        });
    }
});

function isTextInput(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
        const t = el.type;
        return !['button','checkbox','radio','submit','color','range','file','hidden','image'].includes(t);
    }
    return false;
}

if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
}

document.addEventListener('touchstart', (e) => {
    oskLastTouchTime = Date.now();
    const el = e.target;
    if (isTextInput(el)) {
        el.setAttribute('inputmode', 'none');
        if ('virtualKeyboard' in navigator) {
            navigator.virtualKeyboard.hide();
        }
    }
}, { capture: true, passive: true });

document.addEventListener('focusin', (e) => {
    const isTouch = (Date.now() - oskLastTouchTime < 1000);
    if (!isTouch) return;

    if (isTextInput(e.target)) {
        if ('virtualKeyboard' in navigator) {
            navigator.virtualKeyboard.hide();
        }
        currentTargetElement = e.target;
        currentTargetFrame = null;
        openOSK();
    }
});

document.addEventListener('focusout', (e) => {
    if (_isSwitchingOSK) return; // Abort cleanup
    if (currentTargetElement === e.target) {
        setTimeout(() => {
            if (document.activeElement !== currentTargetElement && 
                (!document.getElementById('system-osk-container') || 
                 !document.getElementById('system-osk-container').contains(document.activeElement))) {
                closeOSK();
            }
        }, 50);
    }
});

window.addEventListener('message', (e) => {
    if (e.data.type === 'osk-request-open') {
        const frames = document.querySelectorAll('iframe');
        frames.forEach(f => {
            if (f.contentWindow === e.source) currentTargetFrame = f;
        });
        currentTargetElement = null;
        openOSK();
    } else if (e.data.type === 'osk-request-close') {
        closeOSK();
    } else if (e.data.type === 'osk-keypress') {
        handleOSKKeypress(e.data);
    }
});

function openOSK() {
    const container = document.getElementById('system-osk-container');
    if (container) {
        container.classList.add('open');
        document.body.classList.add('osk-active');
        
        const isLight = document.body.classList.contains('light-theme');
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'themeUpdate',
                theme: isLight ? 'light' : 'dark'
            }, '*');
        }
    }
}

function closeOSK() {
    const container = document.getElementById('system-osk-container');
    if (container) {
        container.classList.remove('open');
        document.body.classList.remove('osk-active');
        
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'osk-closed' }, '*');
        }

        // Reset OSK to default text mode when closed
        currentOskIndex = 0;
        if (iframe && !iframe.src.includes('/assets/gurapp/intl/overlay/osk/osk.html')) {
            iframe.src = '/assets/gurapp/intl/overlay/osk/osk.html';
        } else if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'set-mode', mode: 'text' }, '*');
        }
    }
    currentTargetElement = null;
    currentTargetFrame = null;
}

function handleOSKKeypress(data) {
    if (window.SoundManager) window.SoundManager.play('type');
    if (currentTargetFrame) {
        currentTargetFrame.contentWindow.postMessage({
            type: 'osk-insert',
            action: data.action,
            key: data.key
        }, '*');
    } else if (currentTargetElement) {
        insertTextLocal(currentTargetElement, data);
    }
}

function insertTextLocal(el, data) {
    try {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = el.value || '';
        
        if (data.action === 'insert') {
            el.value = val.slice(0, start) + data.key + val.slice(end);
            el.selectionStart = el.selectionEnd = start + data.key.length;
        } else if (data.action === 'backspace') {
            if (start === end && start > 0) {
                el.value = val.slice(0, start - 1) + val.slice(end);
                el.selectionStart = el.selectionEnd = start - 1;
            } else if (start !== end) {
                el.value = val.slice(0, start) + val.slice(end);
                el.selectionStart = el.selectionEnd = start;
            }
        } else if (data.action === 'replace-word') {
            const len = data.length;
            const word = data.word;
            if (start >= len) {
                el.value = val.slice(0, start - len) + word + ' ' + val.slice(end);
                el.selectionStart = el.selectionEnd = start - len + word.length + 1;
            }
        } else if (data.action === 'enter') {
            const enterEventDown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
            el.dispatchEvent(enterEventDown);
            el.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
            el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));

            if (!enterEventDown.defaultPrevented) {
                if (el.tagName === 'TEXTAREA') {
                    el.value = val.slice(0, start) + '\n' + val.slice(end);
                    el.selectionStart = el.selectionEnd = start + 1;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    if (el.form && el.form.requestSubmit) el.form.requestSubmit();
                    else if (el.form) el.form.submit();
                    el.blur();
                    closeOSK();
                }
            } else {
                if (el.tagName !== 'TEXTAREA') {
                    el.blur();
                    closeOSK();
                }
            }
        }
    } catch (err) {
        if (data.action === 'insert') el.value += data.key;
        else if (data.action === 'backspace') el.value = el.value.slice(0, -1);
        else if (data.action === 'replace-word') el.value = el.value.slice(0, -data.length) + data.word + ' ';
        else if (data.action === 'enter') {
            const enterEventDown = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 });
            el.dispatchEvent(enterEventDown);
            el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
            if (!enterEventDown.defaultPrevented) {
                if (el.form && el.form.requestSubmit) el.form.requestSubmit();
                else if (el.form) el.form.submit();
            }
            el.blur();
            closeOSK();
        }
    }
    if (data.action !== 'enter') {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}