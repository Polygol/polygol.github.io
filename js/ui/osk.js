let oskLastTouchTime = 0;
let currentTargetFrame = null;
let currentTargetElement = null;

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

document.addEventListener('touchstart', (e) => {
    oskLastTouchTime = Date.now();
    const el = e.target;
    if (isTextInput(el)) {
        el.setAttribute('inputmode', 'none');
    }
}, { capture: true, passive: true });

document.addEventListener('focusin', (e) => {
    const isTouch = (Date.now() - oskLastTouchTime < 1000);
    if (!isTouch) return;

    if (isTextInput(e.target)) {
        currentTargetElement = e.target;
        currentTargetFrame = null;
        openOSK();
    }
});

document.addEventListener('focusout', (e) => {
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
        
        // Notify iframe to clear buffers and state
        const iframe = container.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'osk-closed' }, '*');
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