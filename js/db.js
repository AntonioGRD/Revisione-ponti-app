/**
 * DB.JS - IndexedDB Database Engine for Ponti & Viadotti PWA (Offline-First)
 */

const DB_NAME = 'PontiViadottiDB';
const DB_VERSION = 2;

class InspectionDB {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store Ponti / Viadotti
        if (!db.objectStoreNames.contains('bridges')) {
          const bridgeStore = db.createObjectStore('bridges', { keyPath: 'id' });
          bridgeStore.createIndex('code', 'code', { unique: true });
          bridgeStore.createIndex('name', 'name', { unique: false });
          bridgeStore.createIndex('route', 'route', { unique: false });
        }

        // Store Ispezioni
        if (!db.objectStoreNames.contains('inspections')) {
          const inspStore = db.createObjectStore('inspections', { keyPath: 'id' });
          inspStore.createIndex('bridgeId', 'bridgeId', { unique: false });
          inspStore.createIndex('date', 'date', { unique: false });
          inspStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Store Foto compresse
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('inspectionId', 'inspectionId', { unique: false });
          photoStore.createIndex('bridgeId', 'bridgeId', { unique: false });
        }

        // Store Bozza in corso (singola riga o per viadotto)
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }

        // Store Coda di Sincronizzazione OneDrive
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store Impostazioni & Lookup Table
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Errore apertura database:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getStore(storeName, mode = 'readonly') {
    await this.initPromise;
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // ==================== BRIDGES API ====================
  async getAllBridges() {
    const store = await this.getStore('bridges');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getBridge(id) {
    const store = await this.getStore('bridges');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveBridge(bridge) {
    if (!bridge.id) bridge.id = 'bridge_' + Date.now();
    bridge.updatedAt = new Date().toISOString();
    const store = await this.getStore('bridges', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(bridge);
      req.onsuccess = () => resolve(bridge);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteBridge(id) {
    const store = await this.getStore('bridges', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== INSPECTIONS API ====================
  async getAllInspections() {
    const store = await this.getStore('inspections');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getInspectionsByBridge(bridgeId) {
    const store = await this.getStore('inspections');
    const index = store.index('bridgeId');
    return new Promise((resolve, reject) => {
      const req = index.getAll(bridgeId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveInspection(inspection) {
    if (!inspection.id) inspection.id = 'insp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    if (!inspection.createdAt) inspection.createdAt = new Date().toISOString();
    inspection.updatedAt = new Date().toISOString();
    
    const store = await this.getStore('inspections', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(inspection);
      req.onsuccess = () => resolve(inspection);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteInspection(id) {
    const store = await this.getStore('inspections', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== PHOTOS API ====================
  async getPhotosByInspection(inspectionId) {
    const store = await this.getStore('photos');
    const index = store.index('inspectionId');
    return new Promise((resolve, reject) => {
      const req = index.getAll(inspectionId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async savePhoto(photo) {
    if (!photo.id) photo.id = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    photo.createdAt = photo.createdAt || new Date().toISOString();
    const store = await this.getStore('photos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(photo);
      req.onsuccess = () => resolve(photo);
      req.onerror = () => reject(req.error);
    });
  }

  async deletePhoto(id) {
    const store = await this.getStore('photos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== DRAFT AUTO-SAVE API ====================
  async saveDraft(draftData) {
    const draft = {
      id: 'current_draft',
      data: draftData,
      savedAt: new Date().toISOString()
    };
    const store = await this.getStore('drafts', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(draft);
      req.onsuccess = () => resolve(draft);
      req.onerror = () => reject(req.error);
    });
  }

  async getDraft() {
    const store = await this.getStore('drafts');
    return new Promise((resolve, reject) => {
      const req = store.get('current_draft');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  }

  async clearDraft() {
    const store = await this.getStore('drafts', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete('current_draft');
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== SYNC QUEUE API ====================
  async getSyncQueue() {
    const store = await this.getStore('syncQueue');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async addToSyncQueue(item) {
    if (!item.id) item.id = 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    item.status = item.status || 'pending';
    item.createdAt = item.createdAt || new Date().toISOString();
    item.attempts = item.attempts || 0;
    
    const store = await this.getStore('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  async updateSyncItem(item) {
    const store = await this.getStore('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  async removeSyncItem(id) {
    const store = await this.getStore('syncQueue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== SETTINGS API ====================
  async getSetting(key, defaultValue = null) {
    const store = await this.getStore('settings');
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting(key, value) {
    const store = await this.getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  // ==================== FULL DB BACKUP / RESTORE ====================
  async exportFullDatabase() {
    const [bridges, inspections, photos, settings, syncQueue] = await Promise.all([
      this.getAllBridges(),
      this.getAllInspections(),
      this.getStore('photos').then(st => new Promise(res => { const r = st.getAll(); r.onsuccess = () => res(r.result || []); })),
      this.getStore('settings').then(st => new Promise(res => { const r = st.getAll(); r.onsuccess = () => res(r.result || []); })),
      this.getSyncQueue()
    ]);

    return {
      appName: 'PontiViadottiPWA',
      exportDate: new Date().toISOString(),
      version: DB_VERSION,
      data: { bridges, inspections, photos, settings, syncQueue }
    };
  }

  async importFullDatabase(importedObj) {
    if (!importedObj || !importedObj.data) throw new Error('Formato backup JSON non valido');
    const { bridges, inspections, photos, settings } = importedObj.data;

    if (bridges && Array.isArray(bridges)) {
      for (const b of bridges) await this.saveBridge(b);
    }
    if (inspections && Array.isArray(inspections)) {
      for (const i of inspections) await this.saveInspection(i);
    }
    if (photos && Array.isArray(photos)) {
      for (const p of photos) await this.savePhoto(p);
    }
    if (settings && Array.isArray(settings)) {
      for (const s of settings) await this.setSetting(s.key, s.value);
    }
    return true;
  }

  async clearAllData() {
    await this.initPromise;
    const storeNames = ['bridges', 'inspections', 'photos', 'drafts', 'syncQueue'];
    const tx = this.db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async purgeSampleData() {
    await this.initPromise;
    const bridges = await this.getAllBridges();
    for (const b of bridges) {
      if (b.id && b.id.startsWith('bridge_sample_')) {
        await this.deleteBridge(b.id);
      }
    }
    const inspections = await this.getAllInspections();
    for (const i of inspections) {
      if (i.id && i.id.startsWith('insp_sample_')) {
        await this.deleteInspection(i.id);
      }
    }
    const syncItems = await this.getSyncQueue();
    for (const s of syncItems) {
      if (s.bridgeCode === 'VIA-SS1-042' || s.bridgeCode === 'VIA-A24-078' || s.bridgeCode === 'VIA-SP22-014' || s.bridgeCode === 'VIA-SS131-105') {
        await this.removeSyncItem(s.id);
      }
    }
  }
}

// Global Singleton Instance
window.db = new InspectionDB();

