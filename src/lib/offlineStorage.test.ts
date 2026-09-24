import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { offlineStorage, registerBackgroundSync, requestPersistentStorage, type PendingAction } from './offlineStorage';

// ── Minimal in-memory IndexedDB fake ────────────────────────────────────
// jsdom does not implement IndexedDB. offlineStorage.ts only touches a
// small surface of it (open/transaction/objectStore/index, get/getAll/put/
// delete/clear, keyPath-based stores), so rather than pull in a new
// dependency this reproduces just that surface — including the async
// timing IndexedDB actually has (request.onsuccess fires on a later tick,
// transaction.oncomplete fires only once every request issued against it
// has settled) — so the Promise-wrapping code under test exercises the
// same await/resolve paths it would against a real browser.

type StoreRecord = Record<string, unknown>;

class FakeStoreData {
  rows = new Map<string, StoreRecord>();
  indexes = new Map<string, { keyPath: string }>();
  constructor(public keyPath: string) {}
}

// Lets a single test force the next matching operation to fail, the way a
// real IndexedDB write can fail (quota exceeded, version conflict, etc.).
let failNext: { store: string; op: string } | null = null;
function armFailure(store: string, op: string) {
  failNext = { store, op };
}
function shouldFail(store: string, op: string): boolean {
  if (failNext && failNext.store === store && failNext.op === op) {
    failNext = null;
    return true;
  }
  return false;
}

class FakeRequest<T> {
  result: T | undefined;
  error: Error | null = null;
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;

  succeed(result: T) {
    this.result = result;
    queueMicrotask(() => this.onsuccess?.());
  }

  fail(error: Error) {
    this.error = error;
    queueMicrotask(() => this.onerror?.());
  }
}

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private failed = false;

  constructor(private db: FakeDatabase) {
    // A macrotask, so it always runs after every request queued above via
    // queueMicrotask — mirroring how a real IDBTransaction only auto-commits
    // once its microtask-scheduled work has actually drained.
    setTimeout(() => {
      if (!this.failed) this.oncomplete?.();
    }, 0);
  }

  objectStore(name: string) {
    return new FakeObjectStore(name, this.db.getStoreData(name), this);
  }

  markFailed() {
    this.failed = true;
    queueMicrotask(() => this.onerror?.());
  }
}

class FakeObjectStore {
  constructor(
    private storeName: string,
    private data: FakeStoreData,
    private transaction: FakeTransaction,
  ) {}

  put(item: StoreRecord) {
    const req = new FakeRequest<undefined>();
    if (shouldFail(this.storeName, 'put')) {
      req.fail(new Error(`mock put failure on ${this.storeName}`));
      this.transaction.markFailed();
      return req;
    }
    this.data.rows.set(String(item[this.data.keyPath]), item);
    req.succeed(undefined);
    return req;
  }

  get(key: string) {
    const req = new FakeRequest<StoreRecord | undefined>();
    if (shouldFail(this.storeName, 'get')) {
      req.fail(new Error(`mock get failure on ${this.storeName}`));
      this.transaction.markFailed();
      return req;
    }
    req.succeed(this.data.rows.get(String(key)));
    return req;
  }

  getAll() {
    const req = new FakeRequest<StoreRecord[]>();
    if (shouldFail(this.storeName, 'getAll')) {
      req.fail(new Error(`mock getAll failure on ${this.storeName}`));
      this.transaction.markFailed();
      return req;
    }
    req.succeed(Array.from(this.data.rows.values()));
    return req;
  }

  delete(key: string) {
    const req = new FakeRequest<undefined>();
    if (shouldFail(this.storeName, 'delete')) {
      req.fail(new Error(`mock delete failure on ${this.storeName}`));
      this.transaction.markFailed();
      return req;
    }
    this.data.rows.delete(String(key));
    req.succeed(undefined);
    return req;
  }

  clear() {
    const req = new FakeRequest<undefined>();
    if (shouldFail(this.storeName, 'clear')) {
      req.fail(new Error(`mock clear failure on ${this.storeName}`));
      this.transaction.markFailed();
      return req;
    }
    this.data.rows.clear();
    req.succeed(undefined);
    return req;
  }

  createIndex(name: string, keyPath: string) {
    this.data.indexes.set(name, { keyPath });
  }

  index(name: string) {
    const def = this.data.indexes.get(name);
    if (!def) throw new Error(`Unknown index "${name}" on store "${this.storeName}"`);
    const { rows } = this.data;
    const storeName = this.storeName;
    const transaction = this.transaction;
    return {
      getAll(value: unknown) {
        const req = new FakeRequest<StoreRecord[]>();
        if (shouldFail(storeName, 'indexGetAll')) {
          req.fail(new Error(`mock index getAll failure on ${storeName}`));
          transaction.markFailed();
          return req;
        }
        req.succeed(Array.from(rows.values()).filter((row) => row[def.keyPath] === value));
        return req;
      },
    };
  }
}

class FakeDatabase {
  private stores = new Map<string, FakeStoreData>();

  get objectStoreNames() {
    const names = Array.from(this.stores.keys());
    return {
      contains: (name: string) => this.stores.has(name),
      [Symbol.iterator]: () => names[Symbol.iterator](),
    };
  }

  createObjectStore(name: string, options: { keyPath: string }) {
    const data = new FakeStoreData(options.keyPath);
    this.stores.set(name, data);
    return {
      createIndex: (indexName: string, keyPath: string) => data.indexes.set(indexName, { keyPath }),
    };
  }

  getStoreData(name: string): FakeStoreData {
    const data = this.stores.get(name);
    if (!data) throw new Error(`Unknown object store "${name}"`);
    return data;
  }

  transaction(_storeNames: string | string[]) {
    return new FakeTransaction(this);
  }
}

// Keyed by DB name, so re-opening (simulating a reload — see the
// "reload / persistence" tests) returns the same database instead of a
// blank one, the way a real on-disk IndexedDB database would.
const fakeDatabases = new Map<string, FakeDatabase>();

function installFakeIndexedDB() {
  const open = vi.fn((name: string) => {
    const request: {
      result: FakeDatabase | undefined;
      error: Error | null;
      onupgradeneeded: ((event: { target: { result: FakeDatabase } }) => void) | null;
      onsuccess: (() => void) | null;
      onerror: (() => void) | null;
    } = { result: undefined, error: null, onupgradeneeded: null, onsuccess: null, onerror: null };

    queueMicrotask(() => {
      let db = fakeDatabases.get(name);
      const isNew = !db;
      if (!db) {
        db = new FakeDatabase();
        fakeDatabases.set(name, db);
      }
      request.result = db;
      if (isNew) request.onupgradeneeded?.({ target: { result: db } });
      request.onsuccess?.();
    });

    return request;
  });

  Object.defineProperty(globalThis, 'indexedDB', { value: { open }, writable: true, configurable: true });
}

installFakeIndexedDB();

function makeAction(id: string, overrides: Partial<PendingAction> = {}): PendingAction {
  return {
    id,
    type: 'update_job',
    payload: { jobId: id },
    createdAt: '2026-01-01T00:00:00.000Z',
    retryCount: 0,
    priority: 'normal',
    ...overrides,
  };
}

// Reach into the singleton's private handle so each test starts from a
// "freshly reloaded page" — a new `indexedDB.open()` call — without
// exporting the manager class just for tests.
function resetManagerHandle() {
  (offlineStorage as unknown as { db: unknown; initPromise: unknown }).db = null;
  (offlineStorage as unknown as { db: unknown; initPromise: unknown }).initPromise = null;
}

describe('offlineStorage', () => {
  beforeEach(() => {
    fakeDatabases.clear();
    failNext = null;
    resetManagerHandle();
  });

  describe('generic CRUD against an object store', () => {
    it('put/get round-trips a record', async () => {
      await offlineStorage.put('jobs', { id: 'job-1', status: 'pending' });
      const job = await offlineStorage.get<{ id: string; status: string }>('jobs', 'job-1');
      expect(job).toEqual({ id: 'job-1', status: 'pending' });
    });

    it('get returns undefined for a key that was never stored', async () => {
      expect(await offlineStorage.get('jobs', 'nope')).toBeUndefined();
    });

    it('getAll returns every record in a store', async () => {
      await offlineStorage.put('machines', { id: 'm1' });
      await offlineStorage.put('machines', { id: 'm2' });
      expect(await offlineStorage.getAll('machines')).toHaveLength(2);
    });

    it('putMany writes a whole batch inside one transaction', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: `job-${i}` }));
      await offlineStorage.putMany('jobs', items);
      expect(await offlineStorage.getAll('jobs')).toHaveLength(50);
    });

    it('delete removes a single record and leaves the rest untouched', async () => {
      await offlineStorage.put('techniques', { id: 't1' });
      await offlineStorage.put('techniques', { id: 't2' });
      await offlineStorage.delete('techniques', 't1');
      expect(await offlineStorage.get('techniques', 't1')).toBeUndefined();
      expect(await offlineStorage.getAll('techniques')).toHaveLength(1);
    });

    it('clear empties one store without touching others', async () => {
      await offlineStorage.put('jobs', { id: 'j1' });
      await offlineStorage.put('machines', { id: 'm1' });
      await offlineStorage.clear('jobs');
      expect(await offlineStorage.getAll('jobs')).toEqual([]);
      expect(await offlineStorage.getAll('machines')).toHaveLength(1);
    });

    it('clearAll empties every object store, including pendingActions', async () => {
      await offlineStorage.put('jobs', { id: 'j1' });
      await offlineStorage.put('machines', { id: 'm1' });
      await offlineStorage.addPendingAction(makeAction('a1'));
      await offlineStorage.clearAll();
      expect(await offlineStorage.getAll('jobs')).toEqual([]);
      expect(await offlineStorage.getAll('machines')).toEqual([]);
      expect(await offlineStorage.getPendingActions()).toEqual([]);
    });

    it('getByIndex filters records by a secondary index', async () => {
      await offlineStorage.put('jobs', { id: 'j1', machine_id: 'M1' });
      await offlineStorage.put('jobs', { id: 'j2', machine_id: 'M2' });
      await offlineStorage.put('jobs', { id: 'j3', machine_id: 'M1' });
      const forM1 = await offlineStorage.getByIndex<{ id: string }>('jobs', 'machine_id', 'M1');
      expect(forM1.map((j) => j.id).sort()).toEqual(['j1', 'j3']);
    });
  });

  describe('pending actions queue (sync)', () => {
    it('addPendingAction/getPendingActions round-trips an action', async () => {
      const action = makeAction('a1');
      await offlineStorage.addPendingAction(action);
      expect(await offlineStorage.getPendingActions()).toEqual([action]);
    });

    it('orders the queue by priority (high, then normal, then low)', async () => {
      await offlineStorage.addPendingAction(makeAction('low-1', { priority: 'low', createdAt: '2026-01-01T00:00:00.000Z' }));
      await offlineStorage.addPendingAction(makeAction('normal-1', { priority: 'normal', createdAt: '2026-01-01T00:00:01.000Z' }));
      await offlineStorage.addPendingAction(makeAction('high-1', { priority: 'high', createdAt: '2026-01-01T00:00:02.000Z' }));

      const ordered = await offlineStorage.getPendingActions();
      expect(ordered.map((a) => a.id)).toEqual(['high-1', 'normal-1', 'low-1']);
    });

    it('breaks ties within the same priority by creation date, oldest first', async () => {
      await offlineStorage.addPendingAction(makeAction('newer', { priority: 'normal', createdAt: '2026-01-02T00:00:00.000Z' }));
      await offlineStorage.addPendingAction(makeAction('older', { priority: 'normal', createdAt: '2026-01-01T00:00:00.000Z' }));

      const ordered = await offlineStorage.getPendingActions();
      expect(ordered.map((a) => a.id)).toEqual(['older', 'newer']);
    });

    it('handles a large sync backlog without dropping items (no queue cap exists in code)', async () => {
      const bulk = Array.from({ length: 500 }, (_, i) =>
        makeAction(`bulk-${i}`, { createdAt: new Date(2026, 0, 1, 0, 0, i % 60, i).toISOString() })
      );
      await Promise.all(bulk.map((action) => offlineStorage.addPendingAction(action)));
      expect(await offlineStorage.getPendingActions()).toHaveLength(500);
    });

    it('does not throw when a queued action is malformed (unknown priority)', async () => {
      // Nothing in offlineStorage.ts validates a PendingAction's shape before
      // storing it — a corrupted or legacy-format record (e.g. a priority
      // value from a since-removed app version) must not crash the read of
      // the whole queue, just sort unpredictably relative to valid entries.
      const corrupted = {
        id: 'corrupt-1',
        type: 'update_job',
        payload: {},
        createdAt: '2026-01-01T00:00:00.000Z',
        retryCount: 0,
        priority: 'urgent',
      } as unknown as PendingAction;
      await offlineStorage.put('pendingActions', corrupted);
      await offlineStorage.addPendingAction(makeAction('normal-1'));

      const actions = await offlineStorage.getPendingActions();
      expect(actions).toHaveLength(2);
      expect(actions.some((a) => a.id === 'corrupt-1')).toBe(true);
    });

    it('removePendingAction drops only the targeted action', async () => {
      await offlineStorage.addPendingAction(makeAction('keep'));
      await offlineStorage.addPendingAction(makeAction('drop'));
      await offlineStorage.removePendingAction('drop');
      expect((await offlineStorage.getPendingActions()).map((a) => a.id)).toEqual(['keep']);
    });

    it('clearPendingActions empties the whole queue', async () => {
      await offlineStorage.addPendingAction(makeAction('a1'));
      await offlineStorage.addPendingAction(makeAction('a2'));
      await offlineStorage.clearPendingActions();
      expect(await offlineStorage.getPendingActions()).toEqual([]);
    });

    it('propagates an IndexedDB write failure instead of swallowing it', async () => {
      armFailure('pendingActions', 'put');
      await expect(offlineStorage.addPendingAction(makeAction('will-fail'))).rejects.toThrow();
      // Nothing partially applied — the queue is unaffected by the failed write.
      expect(await offlineStorage.getPendingActions()).toEqual([]);
    });

    it('propagates an IndexedDB read failure from getPendingActions', async () => {
      armFailure('pendingActions', 'getAll');
      await expect(offlineStorage.getPendingActions()).rejects.toThrow();
    });

    it('propagates a transaction-level failure from a putMany batch sync', async () => {
      armFailure('pendingActions', 'put');
      await expect(offlineStorage.putMany('pendingActions', [makeAction('batch-1')])).rejects.toThrow();
    });
  });

  describe('sync metadata', () => {
    it('returns safe defaults when no metadata was ever persisted', async () => {
      expect(await offlineStorage.getSyncMetadata()).toEqual({
        lastFullSync: null,
        lastPartialSync: null,
        syncInProgress: false,
        offlineSince: null,
      });
    });

    it('updateSyncMetadata merges partial updates onto the existing record instead of replacing it', async () => {
      await offlineStorage.updateSyncMetadata({ lastFullSync: '2026-01-01T00:00:00.000Z' });
      await offlineStorage.updateSyncMetadata({ syncInProgress: true });

      const metadata = await offlineStorage.getSyncMetadata();
      expect(metadata.lastFullSync).toBe('2026-01-01T00:00:00.000Z');
      expect(metadata.syncInProgress).toBe(true);
      expect(metadata.lastPartialSync).toBeNull();
    });
  });

  describe('updateJobLocally (local edit vs. last-synced server copy)', () => {
    it('merges local updates onto the cached job and tags it as locally modified', async () => {
      await offlineStorage.put('jobs', { id: 'job-1', status: 'pending', produced_quantity: 0 });
      await offlineStorage.updateJobLocally('job-1', { status: 'in_progress', produced_quantity: 10 });

      const job = await offlineStorage.get<Record<string, unknown>>('jobs', 'job-1');
      expect(job).toMatchObject({
        id: 'job-1',
        status: 'in_progress',
        produced_quantity: 10,
        _locallyModified: true,
      });
      expect(typeof job?._modifiedAt).toBe('string');
    });

    it('is a no-op when the job was never cached locally', async () => {
      await offlineStorage.updateJobLocally('missing-job', { status: 'in_progress' });
      expect(await offlineStorage.get('jobs', 'missing-job')).toBeUndefined();
    });
  });

  describe('reload / persistence', () => {
    it('data written before a reload is still there after the manager reopens the database', async () => {
      await offlineStorage.put('jobs', { id: 'persist-1', status: 'pending' });
      await offlineStorage.addPendingAction(makeAction('persist-action'));

      // Simulate a page reload: the manager's in-memory handle is discarded,
      // but the underlying IndexedDB database is not (our fake's
      // module-level registry stands in for the browser's on-disk store).
      resetManagerHandle();

      const job = await offlineStorage.get<{ id: string; status: string }>('jobs', 'persist-1');
      const actions = await offlineStorage.getPendingActions();
      expect(job).toEqual({ id: 'persist-1', status: 'pending' });
      expect(actions.map((a) => a.id)).toEqual(['persist-action']);
    });

    it('concurrent callers awaiting init share the same open() instead of racing two opens', async () => {
      const openSpy = vi.mocked(globalThis.indexedDB.open);
      openSpy.mockClear();
      await Promise.all([
        offlineStorage.put('jobs', { id: 'a' }),
        offlineStorage.put('machines', { id: 'b' }),
        offlineStorage.get('jobs', 'a'),
      ]);
      expect(openSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStorageInfo', () => {
    afterEach(() => {
      delete (navigator as unknown as Record<string, unknown>).storage;
    });

    it('reports usage/quota/percentUsed when the Storage API is available', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: vi.fn().mockResolvedValue({ usage: 50, quota: 200 }) },
        configurable: true,
      });
      expect(await offlineStorage.getStorageInfo()).toEqual({ usage: 50, quota: 200, percentUsed: 25 });
    });

    it('falls back to zeros when the Storage API is unavailable', async () => {
      delete (navigator as unknown as Record<string, unknown>).storage;
      expect(await offlineStorage.getStorageInfo()).toEqual({ usage: 0, quota: 0, percentUsed: 0 });
    });

    it('does not divide by zero when the reported quota is zero', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }) },
        configurable: true,
      });
      expect((await offlineStorage.getStorageInfo()).percentUsed).toBe(0);
    });
  });
});

describe('registerBackgroundSync', () => {
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it('registers the sync tag when Background Sync is supported', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ sync: { register } }) },
      configurable: true,
    });

    expect(await registerBackgroundSync()).toBe(true);
    expect(register).toHaveBeenCalledWith('sync-pending-actions');
  });

  it('returns false when the registration has no sync manager', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({}) },
      configurable: true,
    });
    expect(await registerBackgroundSync()).toBe(false);
  });

  it('returns false (does not throw) when serviceWorker.ready rejects', async () => {
    const readyRejection = Promise.reject(new Error('no active service worker'));
    readyRejection.catch(() => { /* also observed below via registerBackgroundSync's own try/catch */ });
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: readyRejection }, configurable: true });

    expect(await registerBackgroundSync()).toBe(false);
  });

  it('returns false when the browser has no serviceWorker support at all', async () => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    expect(await registerBackgroundSync()).toBe(false);
  });
});

describe('requestPersistentStorage', () => {
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).storage;
  });

  it('returns the browser grant/deny decision when supported', async () => {
    Object.defineProperty(navigator, 'storage', { value: { persist: vi.fn().mockResolvedValue(true) }, configurable: true });
    expect(await requestPersistentStorage()).toBe(true);
  });

  it('returns false when the Storage API is unavailable', async () => {
    delete (navigator as unknown as Record<string, unknown>).storage;
    expect(await requestPersistentStorage()).toBe(false);
  });
});
