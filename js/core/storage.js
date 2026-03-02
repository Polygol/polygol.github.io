// DB Schemas for backup functionality
const DB_SCHEMAS = {
	WallpaperDB: {
		version: 1,
		stores: ['wallpapers']
	}
};

// --- Virtual Memory ---
// Offloads large objects (Base64 images, heavy arrays) from RAM to Disk
const SwapManager = {
    dbName: 'PolygolSwapDB',
    storeName: 'swap',
    version: 1,
    db: null,

    init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            req.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    },

    async set(key, value) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put(value, key).onsuccess = () => resolve();
        });
    },

    async get(key) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    },

    async remove(key) {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.delete(key).onsuccess = () => resolve();
        });
    },
    
    async clear() {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.clear().onsuccess = () => resolve();
        });
    }
};
window.SwapManager = SwapManager;

// IndexedDB setup for video storage
const dbName = "WallpaperDB", storeName = "wallpapers", version = 1, VIDEO_VERSION = "1.0";

function initDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("WallpaperDB", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = event => {
            let db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
    });
}

async function storeWallpaper(key, data) {
    let db = await initDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readwrite");
        let store = transaction.objectStore(storeName);
        let wallpaperData = {
            blob: data.blob || null,
            dataUrl: data.dataUrl || null,
            type: data.type,
            firstFrameDataUrl: data.firstFrameDataUrl || null, // For animated images
            version: "1.0",
            timestamp: Date.now(),
            clockStyles: data.clockStyles || {},
            widgetLayout: data.widgetLayout || [], // Ensure widget layout is saved
			depthDataUrl: data.depthDataUrl || null, // Save the generated image
            depthEnabled: data.depthEnabled || false // Save the toggle state
        };
        let request = store.put(wallpaperData, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function getWallpaper(key) {
    let db = await initDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readonly");
        let store = transaction.objectStore(storeName);
        let request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function deleteWallpaper(key) {
    let db = await initDB();
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readwrite");
        let store = transaction.objectStore(storeName);
        let request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function storeVideo(videoBlob) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const videoData = {
            blob: videoBlob,
            version: VIDEO_VERSION,
            timestamp: Date.now()
        };
        
        const request = store.put(videoData, 'currentVideo');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

async function getVideo() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.get('currentVideo');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Function to check if an automatic backup is due
function checkForAutomaticBackup() {
    if (localStorage.getItem('automaticBackupsEnabled') !== 'true') {
        return;
    }

    const lastBackupTimestamp = parseInt(localStorage.getItem('lastBackupTimestamp') || '0', 10);
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;

    if (Date.now() - lastBackupTimestamp > oneWeekInMs) {
        console.log('Automatic backup is due. Starting process...');
        createAutomaticBackup();
    } else {
        console.log('Automatic backup not yet due.');
    }
}

// Function to create the backup file and notify the user
async function createAutomaticBackup() {
    // Dynamic load of fflate
    if (typeof fflate === 'undefined') {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/fflate@0.8.0';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    showPopup(currentLanguage.BACKUP_STARTED || 'Starting automatic backup');
    
    try {
        const zipData = {};
        const meta = { version: "2.0", timestamp: new Date().toISOString(), type: "auto-backup" };
        zipData['meta.json'] = fflate.strToU8(JSON.stringify(meta));

        // 1. LocalStorage
        const localStorageData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) localStorageData[key] = localStorage.getItem(key);
        }
        zipData['localStorage.json'] = fflate.strToU8(JSON.stringify(localStorageData));

        // 2. IndexedDB (Binary Efficient)
        const dbs = await indexedDB.databases();
        for (const dbInfo of dbs) {
            const dbName = dbInfo.name;
            try {
                const db = await initDbForBackup(dbName);
                const storeNames = Array.from(db.objectStoreNames);
                const schemaInfo = [];
                
                const tx = db.transaction(storeNames, 'readonly');
                
                for (const storeName of storeNames) {
                    const store = tx.objectStore(storeName);
                    // Schema extraction
                    const indexes = Array.from(store.indexNames).map(idx => {
                        const i = store.index(idx);
                        return { name: i.name, keyPath: i.keyPath, unique: i.unique, multiEntry: i.multiEntry };
                    });
                    schemaInfo.push({
                        name: store.name,
                        keyPath: store.keyPath,
                        autoIncrement: store.autoIncrement,
                        indexes: indexes
                    });

                    // Data extraction
                    const records = await getStoreDataForBackup(db, storeName);
                    
                    // Binary processing
					for (let i = 0; i < records.length; i++) {
                        const rec = records[i];
                        let val = rec.value;
                        const path = `idb/${dbName}/${storeName}/rec_${i}.bin`;

                        if (val instanceof Blob) {
                            zipData[path] = new Uint8Array(await val.arrayBuffer());
                            rec.value = { _type: 'bin_ref', mime: val.type };
                        } else if (val && val.blob instanceof Blob) {
                            zipData[path] = new Uint8Array(await val.blob.arrayBuffer());
                            rec.value.blob = { _type: 'bin_ref', mime: val.blob.type };
                        }
                    }
                    
                    zipData[`indexedDB/${dbName}/${storeName}.json`] = fflate.strToU8(JSON.stringify(records));
                }
                
                zipData[`indexedDB/${dbName}/schema.json`] = fflate.strToU8(JSON.stringify(schemaInfo));
                db.close();
            } catch (e) {
                console.warn(`Backup skipped DB ${dbName}`, e);
            }
        }

		// Cross-Origin External Apps
        const appUrls = JSON.parse(localStorage.getItem('userInstalledApps') || '{}');
        const crossOriginApps = Object.values(appUrls).map(a => a.url).filter(url => {
            try {
                return new URL(url, window.location.origin).origin !== window.location.origin;
            } catch(e) { return false; }
        });

        if (crossOriginApps.length > 0) {
            const extAppsData = {};
            for (const url of crossOriginApps) {
                const result = await processExternalApp(url, 'admin-export');
                if (result.data) extAppsData[url] = result.data;
            }
            zipData['externalApps.json'] = fflate.strToU8(JSON.stringify(extAppsData));
        }

        // 3. Compress
        fflate.zip(zipData, { level: 1 }, (err, data) => {
            if (err) {
                console.error(err);
                showPopup("Backup failed during compression.");
                return;
            }
            
            const backupBlob = new Blob([data], { type: 'application/zip' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `polygol_backup_${timestamp}.guradata`;
            
            localStorage.setItem('lastBackupTimestamp', Date.now().toString());
            
            // Notify user
            showDialog({ 
                type: 'confirm', 
                title: 'Backup Ready', 
                message: currentLanguage.BACKUP_READY || 'Weekly backup is ready. Download now?' 
            }).then((result) => {
                if (result) downloadBackupFile(backupBlob, fileName);
            });
        });

    } catch (error) {
        console.error('Automatic backup failed:', error);
    }
}

// Utility functions adapted from the transfer tool for backup creation
function downloadBackupFile(blob, fileName) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function initDbForBackup(dbName) {
    return new Promise((resolve, reject) => {
        // Open without version for read-only inspection
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getStoreDataForBackup(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const records = [];
        
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                records.push({ key: cursor.key, value: cursor.value });
                cursor.continue();
            } else {
                resolve(records);
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}