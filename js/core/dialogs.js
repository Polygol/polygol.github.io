// --- Dialog Management ---
let activeDialog = null; // Tracks the currently displayed dialog
let dialogQueue = []; // Queue for pending dialog requests
let dialogOpenTimeout = null; // Timer for entry animation
let dialogCloseTimeout = null; // Timer for exit cleanup

// Dialog Management
function _displayDialog(options) {
    const dialog = document.getElementById('dialogModal');
    const title = document.getElementById('dialogTitle');
    const icon = document.getElementById('dialogIcon');
    const message = document.getElementById('dialogMessage');
    const promptContainer = document.getElementById('dialogPromptContainer');
    const input = document.getElementById('dialogInput');
    const buttons = document.getElementById('dialogButtons');
    const blurOverlay = document.getElementById('blurOverlay');
    const interactionBlocker = document.getElementById('interaction-blocker');

    // Reset any pending close animations to prevent race conditions
    if (dialogCloseTimeout) {
        clearTimeout(dialogCloseTimeout);
        dialogCloseTimeout = null;
    }
    if (dialogOpenTimeout) {
        clearTimeout(dialogOpenTimeout);
        dialogOpenTimeout = null;
    }

    let displayTitle = options.title;
    let displayMessage = options.message;

    // If a dialog has a message but no title, apply the message as the title and leave the message blank
    if (!displayTitle && displayMessage) {
        displayTitle = displayMessage;
        displayMessage = '';
    }
    
    // Legacy handling: Confirm dialogs default to the title 'Confirm'. 
    // We promote the question to the title for better visual hierarchy if it's using the default.
    if (options.type === 'confirm' && displayTitle === 'Confirm' && displayMessage) {
        displayTitle = displayMessage;
        displayMessage = '';
    }

    title.textContent = displayTitle || '';
    message.textContent = displayMessage || '';
    
    if (options.icon) {
        icon.textContent = options.icon;
        icon.style.display = 'block';

        // Clear previous blink if any
        if (icon._blinkInterval) {
            clearInterval(icon._blinkInterval);
            icon._blinkInterval = null;
            icon.style.visibility = 'visible';
        }

        if (options.icon === 'report') {
            icon.style.color = '#ff5252';
            let visible = true;
            icon._blinkInterval = setInterval(() => {
                visible = !visible;
                icon.style.visibility = visible ? 'visible' : 'hidden';
            }, 1000);
        } else {
            icon.style.color = 'var(--text-color)';
        }

    } else {
        icon.style.display = 'none';

        if (icon._blinkInterval) {
            clearInterval(icon._blinkInterval);
            icon._blinkInterval = null;
        }
    }
    
    buttons.innerHTML = '';
    promptContainer.style.display = 'none';

    if (options.type === 'prompt') {
        promptContainer.style.display = 'block';
        input.value = options.defaultValue || '';
        setTimeout(() => input.focus(), 100);
    }
	
    if (options.type === 'confirm') {
        const yesBtn = document.createElement('button');
        yesBtn.textContent = currentLanguage.YES || 'Yes';
        yesBtn.className = 'button-dialog';
        yesBtn.onclick = () => closeDialog(true);
        buttons.appendChild(yesBtn);
		
        const noBtn = document.createElement('button');
        noBtn.textContent = currentLanguage.NO || 'No';
        noBtn.className = 'button-dialog';
        noBtn.onclick = () => closeDialog(false);
        buttons.appendChild(noBtn);
    } else {
        if (options.type === 'prompt') {
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = currentLanguage.CANCEL || 'Cancel';
            cancelBtn.className = 'button-dialog';
            cancelBtn.onclick = () => closeDialog(null);
            buttons.appendChild(cancelBtn);
        }

        const okBtn = document.createElement('button');
        okBtn.textContent = currentLanguage.OK || 'OK';
        okBtn.className = 'button-dialog primary';
		okBtn.onclick = () => closeDialog(options.type === 'prompt' ? input.value : true);
        buttons.appendChild(okBtn);
    }

    // Block interactions during setup
    if (interactionBlocker) {
        interactionBlocker.style.display = 'block';
        interactionBlocker.style.pointerEvents = 'auto';
    }

    // Prepare elements (Hidden but block)
    blurOverlay.style.display = 'block';
    dialog.style.display = 'block';
	
    // Force reflow to ensure display change is registered before adding animation classes
    void dialog.offsetWidth;
    
    // Trigger Animation
    dialogOpenTimeout = setTimeout(() => {
        blurOverlay.classList.add('show');
        dialog.classList.add('show');
        
		// Release interaction blocker after animation stabilizes (300ms)
        setTimeout(() => {
            if (interactionBlocker && activeDialog) interactionBlocker.style.display = 'none';
        }, 300);
        
        dialogOpenTimeout = null;
    }, 20);
}

function closeDialog(value) {
    if (!activeDialog) return;

    const dialog = document.getElementById('dialogModal');
    const blurOverlay = document.getElementById('blurOverlay');
    const interactionBlocker = document.getElementById('interaction-blocker');

    // Return Data
    if (activeDialog.source && activeDialog.requestId) {
        activeDialog.source.postMessage({
            type: 'dialog-response',
            requestId: activeDialog.requestId,
            value: value
        }, activeDialog.origin);
    } else if (activeDialog.resolve) {
        activeDialog.resolve(value);
    }

    // 1. FAST CLOSE: If opened but animation hasn't started yet, kill it instantly.
    if (dialogOpenTimeout) {
        clearTimeout(dialogOpenTimeout);
        dialogOpenTimeout = null;
        
        dialog.classList.remove('show');
        blurOverlay.classList.remove('show');
        dialog.style.display = 'none';
        
        const isAnyModalOpen = document.querySelector('.modal.show, .widget-drawer.open');
        if (!isAnyModalOpen) {
            blurOverlay.style.display = 'none';
        }

        if (interactionBlocker) interactionBlocker.style.display = 'none';
        
        activeDialog = null;
        processDialogQueue();
        return;
    }

    // 2. NORMAL CLOSE: Animate out
    
    // Block clicks during fade-out
    if (interactionBlocker) {
        interactionBlocker.style.display = 'block';
        interactionBlocker.style.pointerEvents = 'auto';
    }

    dialog.classList.remove('show');
    blurOverlay.classList.remove('show');

    // Wait for CSS transition
    dialogCloseTimeout = setTimeout(() => {
        dialog.style.display = 'none';
        
        const isAnyModalOpen = document.querySelector('.modal.show, .widget-drawer.open');
        if (!isAnyModalOpen) {
            blurOverlay.style.display = 'none';
        }
        
        if (interactionBlocker) interactionBlocker.style.display = 'none';
        
        dialogCloseTimeout = null;
    }, 300);

    activeDialog = null;
    processDialogQueue(); 
}

function processDialogQueue() {
    if (activeDialog || dialogQueue.length === 0) {
        return;
    }
    activeDialog = dialogQueue.shift();
    activeDialog.openTime = Date.now();
    _displayDialog(activeDialog);
}

function showDialog(options) {
    dialogQueue.push(options);
    processDialogQueue();
}

function showCustomConfirm(message, title = 'Confirm', icon = null) {
    return new Promise(resolve => {
        showDialog({ type: 'confirm', message, title, icon, resolve });
    });
}

function showCustomPrompt(message, title = 'Prompt', defaultValue = '', icon = null) {
    return new Promise(resolve => {
        showDialog({ type: 'prompt', message, title, defaultValue, icon, resolve });
    });
}

// --- Sheet Management ---
let activeSheetInfo = null;

function displaySheet(options) {
    if (activeSheetInfo) closeSheetUI();

    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    
    const container = document.createElement('div');
    container.className = 'sheet-container';
    if (options.height) container.style.height = options.height;

    const handle = document.createElement('div');
    handle.className = 'sheet-handle';
    container.appendChild(handle);

    const spinnerContainer = document.createElement('div');
    spinnerContainer.className = 'sheet-loading-spinner';
    spinnerContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center; z-index: 1; transition: opacity 0.3s ease; pointer-events: none;';
    spinnerContainer.innerHTML = `
        <svg class="loading-spinner" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 48px; height: 48px;">
            <rect width="100%" height="100%" fill="currentColor" stroke="none" class="loading-spinner-ind" />
        </svg>
    `;
    container.appendChild(spinnerContainer);

    const iframe = document.createElement('iframe');
    iframe.className = 'sheet-iframe';
    iframe.setAttribute('data-gurasuraisu-iframe', 'true');
    iframe.setAttribute('data-is-sheet', 'true');
    if (options.sourceAppId) iframe.dataset.appId = options.sourceAppId;
    
    iframe.style.opacity = '0';
    iframe.style.transition = 'opacity 0.3s ease';
    iframe.onload = () => {
        iframe.style.opacity = '1';
        spinnerContainer.style.opacity = '0';
        setTimeout(() => {
            if (spinnerContainer.parentNode) spinnerContainer.remove();
        }, 300);
    };

    if (options.url) {
        iframe.src = options.url;
    } else if (options.html) {
        iframe.sandbox = "allow-scripts"; // Secure: No allow-same-origin
        
        let headInjection = '';
        if (options.styleUrls && Array.isArray(options.styleUrls)) {
            options.styleUrls.forEach(url => {
                headInjection += `<link rel="stylesheet" href="${url}">\n`;
            });
        }
        if (options.styles) {
            headInjection += `<style>\n${options.styles}\n</style>\n`;
        }
        
        const apiScriptUrl = new URL('./assets/gurapp/api/gurasuraisu-api.js', window.location.origin).href;
        let htmlContent = options.html;
        if (!htmlContent.includes('gurasuraisu-api.js')) {
            headInjection += `<script src="${apiScriptUrl}"><\/script>\n`;
        }

        if (htmlContent.includes('<head>')) {
            htmlContent = htmlContent.replace('<head>', '<head>\n' + headInjection);
        } else {
            htmlContent = headInjection + htmlContent;
        }
        
        iframe.srcdoc = htmlContent;
    }

    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Close when clicking outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSheetUI();
    });

    // Swipe to close logic
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onDragStart = (y) => {
        startY = y;
        isDragging = true
    };

    const onDragMove = (y) => {
        if (!isDragging) return;
        currentY = y;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
            container.style.transform = `translateX(-50%) translateY(${deltaY}px)`;
        }
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        container.style.transition = 'transform 0.3s cubic-bezier(0.2, 1.3, 0.64, 1)';
        const deltaY = currentY - startY;
        if (deltaY > 100) {
            closeSheetUI();
        } else {
            container.style.transform = 'translateX(-50%) translateY(0)';
        }
    };

    handle.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchend', onDragEnd);
    
    const mouseMoveHandler = (e) => onDragMove(e.clientY);
    const mouseUpHandler = () => {
        onDragEnd();
        window.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
    };
    
    handle.addEventListener('mousedown', (e) => {
        onDragStart(e.clientY);
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
    });

    // Animate in
    overlay.style.display = 'block';
    void overlay.offsetWidth; // Force reflow
    overlay.classList.add('show');
    container.classList.add('open');

    activeSheetInfo = { overlay, container, iframe };
}

function closeSheetUI() {
    if (!activeSheetInfo) return;
    const { overlay, container } = activeSheetInfo;
    
    container.classList.remove('open');
    overlay.classList.remove('show');
    
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    }, 300);

    activeSheetInfo = null;
}