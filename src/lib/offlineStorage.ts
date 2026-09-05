/**
 * Robust Offline Storage using IndexedDB
 * Provides persistent storage for offline data with better performance than localStorage
 */

const DB_NAME = 'fastgravacoes_offline';
const DB_VERSION = 1;

interface OfflineStore {
  jobs: Record<string, unknown>[];
  machines: Record<string, unknown>[];
  techniques: Record<string, unknown>[];
  operators: Record<string, unknown>[];
  maintenanceSchedules: Record<string, unknown>[];
  pendingActions: PendingAction[];
  syncMetadata: SyncMetadata;
}

export interface PendingAction {
  id: string;
  type: 'update_job' | 'register_production' | 'qr_scan' | 'create_lot' | 'record_maintenance';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
}

export interface SyncMetadata {
  lastFullSync: string | null;
  lastPartialSync: string | null;
  syncInProgress: boolean;
  offlineSince: string | null;
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('jobs')) {
          const jobsStore = db.createObjectStore('jobs', { keyPath: 'id' });
          jobsStore.createIndex('status', 'status', { unique: false });
          jobsStore.createIndex('machine_id', 'machine_id', { unique: false });
          jobsStore.createIndex('technique_id', 'technique_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('machines')) {
          db.createObjectStore('machines', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('techniques')) {
          db.createObjectStore('techniques', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('operators')) {
          db.createObjectStore('operators', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('maintenanceSchedules')) {
          const maintenanceStore = db.createObjectStore('maintenanceSchedules', { keyPath: 'id' });
          maintenanceStore.createIndex('machine_id', 'machine_id', { unique: false });
          maintenanceStore.createIndex('next_due_at', 'next_due_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', { keyPath: 'id' });
          actionsStore.createIndex('createdAt', 'createdAt', { unique: false });
          actionsStore.createIndex('priority', 'priority', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('lotData')) {
          const lotsStore = db.createObjectStore('lotData', { keyPath: 'id' });
          lotsStore.createIndex('lot_number', 'lot_number', { unique: false });
          lotsStore.createIndex('job_id', 'job_id', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  // Generic methods
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDb();
    const storeNames = Array.from(db.objectStoreNames);
    await Promise.allSettled(storeNames.map((name) => this.clear(name)));
  }

  async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Pending Actions specific methods
  async addPendingAction(action: PendingAction): Promise<void> {
    await this.put('pendingActions', action);
  }

  async getPendingActions(): Promise<PendingAction[]> {
    const actions = await this.getAll<PendingAction>('pendingActions');
    // Sort by priority and then by creation date
    return actions.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  async removePendingAction(id: string): Promise<void> {
    await this.delete('pendingActions', id);
  }

  async clearPendingActions(): Promise<void> {
    await this.clear('pendingActions');
  }

  // Sync metadata methods
  async getSyncMetadata(): Promise<SyncMetadata> {
    const metadata = await this.get<SyncMetadata & { id: string }>('syncMetadata', 'main');
    return metadata || {
      lastFullSync: null,
      lastPartialSync: null,
      syncInProgress: false,
      offlineSince: null,
    };
  }

  async updateSyncMetadata(updates: Partial<SyncMetadata>): Promise<void> {
    const current = await this.getSyncMetadata();
    await this.put('syncMetadata', { id: 'main', ...current, ...updates });
  }

  // Jobs with local modifications tracking
  async updateJobLocally(jobId: string, updates: Record<string, unknown>): Promise<void> {
    const job = await this.get<Record<string, unknown>>('jobs', jobId);
    if (job) {
      await this.put('jobs', {
        ...job,
        ...updates,
        _locallyModified: true,
        _modifiedAt: new Date().toISOString()
      });
    }
  }

  // Check storage quota
  async getStorageInfo(): Promise<{ usage: number; quota: number; percentUsed: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
}

export const offlineStorage = new OfflineStorageManager();

// Background sync registration
export async function registerBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-pending-actions');
        return true;
      }
    } catch (error) {
      return false;
    }
  }
  return false;
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const persistent = await navigator.storage.persist();
    return persistent;
  }
  return false;
}
