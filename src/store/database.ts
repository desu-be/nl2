/**
 * The local IndexedDB database. Stores:
 * - `packs`: imported packs, keyed by `package_id`;
 * - `events`: every known progress event, local and remote, keyed by id;
 * - `outbox`: ids of local events not yet sent to the data repository;
 * - `meta`: small key-value settings (synchronization access, last sync…);
 * - `files`: `sha` of every repository file already read or written, keyed by path.
 */
const NAME = 'nl2';
const VERSION = 2;

export type StoreName = 'packs' | 'events' | 'outbox' | 'meta' | 'files';

let opening: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        db.createObjectStore('packs', { keyPath: 'pack.package_id' });
        db.createObjectStore('events', { keyPath: 'id' });
        db.createObjectStore('outbox');
      }
      if (event.oldVersion < 2) {
        db.createObjectStore('meta');
        db.createObjectStore('files');
      }
    };
    request.onsuccess = () => {
      // Another tab upgrading the schema: let it, this one reloads with the new code.
      request.result.onversionchange = () => {
        request.result.close();
        location.reload();
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  });
  return opening;
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function readAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return requestResult(db.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
}

/** Asks the browser not to evict the data under storage pressure. Best effort. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported: data stays best-effort */
  }
}
