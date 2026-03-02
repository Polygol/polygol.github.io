// File Upload Routing System
const FileUploadManager = {
    pendingRequests: {}, // Map requestId -> callback(files)
    activeSystemRequest: null, // 'wallpaper' | 'sticker' | null

    // Register a request from a Gurapp
    registerAppRequest(requestId, sourceAppId, callback) {
        this.pendingRequests[requestId] = {
            appId: sourceAppId,
            callback: callback
        };
    },

    // Trigger the unified flow (Local + Remote)
    trigger(accept, multiple, contextId = null) {
        // 1. Open Local Input
        // We reuse a hidden global input for system actions or create dynamic ones
        let input = document.getElementById('global-file-input');
        if (!input) {
            input = document.createElement('input');
            input.id = 'global-file-input';
            input.type = 'file';
            input.style.display = 'none';
            document.body.appendChild(input);
        }
        
        // Reset and Configure
        input.value = '';
        input.accept = accept;
        input.multiple = multiple;
        
        // Store context (is this for Wallpaper? Sticker? Or an App Request ID?)
        input.dataset.context = contextId || 'system';

        // Local Handler
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files, contextId);
        };
        
        input.click();

        // 2. Trigger Remote Input (if Waves connected)
        if (window.WavesHost) {
            // Pass contextId as requestId to remote so it comes back with the file
            window.WavesHost.requestRemoteUpload(accept, multiple, contextId);
        }
    },

    // Handle incoming files (from Local OR Remote)
    async handleFiles(files, contextId) {
        // Convert to array if single file
        const fileArray = Array.isArray(files) ? files : [files];
        if (fileArray.length === 0) return;

        console.log(`[UploadManager] Received ${fileArray.length} files for context: ${contextId}`);

        if (contextId === 'wallpaper') {
            processWallpaperFiles(fileArray);
        } else if (contextId === 'sticker') {
            processStickerFiles(fileArray);
        } else if (this.pendingRequests[contextId]) {
            // It's a Gurapp request
            const req = this.pendingRequests[contextId];
            
            const filePromises = fileArray.map(async (f) => {
                // Read to Data URL to ensure safe transfer across iframe boundary
                const reader = new FileReader();
                return new Promise(resolve => {
                    reader.onload = () => resolve({
                        name: f.name,
                        type: f.type,
                        size: f.size,
                        data: reader.result // Base64
                    });
                    reader.readAsDataURL(f);
                });
            });

            const processedFiles = await Promise.all(filePromises);
            req.callback(processedFiles);
            
            delete this.pendingRequests[contextId];
        }
    }
};

window.handleRemoteFileUpload = function(data, peerId) {
    // data: { name, type, data (base64), requestId }
    const { name, type, data: base64, requestId } = data;
    
    // Convert Base64 back to File object
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    
    const file = new File([u8arr], name, { type: type });
    
    // Route it
    FileUploadManager.handleFiles([file], requestId);

    showPopup(`Received ${name}`);
};