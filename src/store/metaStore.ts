import { openDatabase, requestResult, transactionDone } from './database.ts';

/** Synchronization access of this device. The token never leaves the device except towards the API. */
export interface SyncConfig {
  token: string;
  /** `owner/name` of the data repository. */
  repo: string;
  /** Branch the data lives on (the repository default branch). */
  branch: string;
  /** Immutable once chosen: the name of this device's progress folder. */
  device: string;
  /** ISO date, when known: the app warns before it. */
  tokenExpiresAt?: string;
}

interface MetaValues {
  sync: SyncConfig;
  /** ISO 8601 time of the last successful synchronization. */
  lastSync: string;
  /** Packs imported locally and not yet written to the repository. */
  pendingPacks: string[];
}

export type MetaKey = keyof MetaValues;

export async function readMeta<K extends MetaKey>(key: K): Promise<MetaValues[K] | undefined> {
  const db = await openDatabase();
  return requestResult(db.transaction('meta').objectStore('meta').get(key) as IDBRequest<MetaValues[K] | undefined>);
}

export async function writeMeta<K extends MetaKey>(key: K, value: MetaValues[K] | undefined) {
  const db = await openDatabase();
  const transaction = db.transaction('meta', 'readwrite');
  if (value === undefined) transaction.objectStore('meta').delete(key);
  else transaction.objectStore('meta').put(value, key);
  await transactionDone(transaction);
}
