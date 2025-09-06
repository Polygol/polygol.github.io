class SharedFileManager {
    constructor(appName, appUrl) {
        this.appName = appName;
        this.appUrl = appUrl;
        this.db = null;
        this.DB_NAME = "GurasuraisuSharedFilesDB";
        this.DB_VERSION = 1;
        this.STORE_NAME = "files";
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = () => reject("Error opening shared files DB.");
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    store.createIndex('appName', 'appName', { unique: false });
                    store.createIndex('lastModified', 'lastModified', { unique: false });
                    store.createIndex('fileName', 'fileName', { unique: false });
                }
            };
        });
    }

    async registerFile({ originalId, fileName, fileType, openParam }) {
        if (!this.db) await this.init();
        const fileRecord = {
            id: `${this.appName}_${originalId}`,
            appName: this.appName,
            fileName,
            fileType,
            lastModified: Date.now(),
            openUrl: this.appUrl,
            originalId,
            openParam: { type: 'openFile', payload: openParam }
        };

        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        await tx.objectStore(this.STORE_NAME).put(fileRecord);
        await tx.done;
        this.notifyParent();
    }

    async deleteFile(originalId) {
        if (!this.db) await this.init();
        const sharedId = `${this.appName}_${originalId}`;
        const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
        await tx.objectStore(this.STORE_NAME).delete(sharedId);
        await tx.done;
        this.notifyParent();
    }

    notifyParent() {
        // Inform the Files app (and any other listeners) that something changed
        window.parent.postMessage({
            targetApp: 'Files', // Can be received by any app listening for this type
            type: 'fileSystemUpdate'
        }, window.location.origin);
    }

    listenForRequests(handler) {
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data.type === 'openFile' || event.data.type === 'deleteFile') {
                handler(event.data);
            }
        });
    }
}
