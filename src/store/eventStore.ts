import type { ProgressEvent } from '../domain/progressEvents.ts';
import { openDatabase, readAll, requestResult, transactionDone } from './database.ts';

export const listEvents = () => readAll<ProgressEvent>('events');

/** Stores a local event and queues it for sending, in one transaction: neither can exist without the other. */
export async function appendLocalEvent(event: ProgressEvent) {
  const db = await openDatabase();
  const transaction = db.transaction(['events', 'outbox'], 'readwrite');
  transaction.objectStore('events').add(event);
  transaction.objectStore('outbox').put(event.at, event.id);
  await transactionDone(transaction);
}

/** Ids of the local events not yet sent. */
export async function listOutbox(): Promise<string[]> {
  const db = await openDatabase();
  return (await requestResult(db.transaction('outbox').objectStore('outbox').getAllKeys())).map(String);
}

export async function removeFromOutbox(ids: readonly string[]) {
  const db = await openDatabase();
  const transaction = db.transaction('outbox', 'readwrite');
  for (const id of ids) transaction.objectStore('outbox').delete(id);
  await transactionDone(transaction);
}

/** Stores events read from the repository. Known ids are left as they are. */
export async function storeRemoteEvents(events: readonly ProgressEvent[]) {
  const db = await openDatabase();
  const transaction = db.transaction('events', 'readwrite');
  const store = transaction.objectStore('events');
  for (const event of events) {
    const existing = store.getKey(event.id);
    existing.onsuccess = () => {
      if (existing.result === undefined) store.add(event);
    };
  }
  await transactionDone(transaction);
}

/**
 * Stores events restored from an export and queues the new ones for sending, so that a restoration
 * on an empty repository rewrites every device's files. Known ids are left as they are.
 */
export async function storeRestoredEvents(events: readonly ProgressEvent[]) {
  const db = await openDatabase();
  const transaction = db.transaction(['events', 'outbox'], 'readwrite');
  const store = transaction.objectStore('events');
  for (const event of events) {
    const existing = store.getKey(event.id);
    existing.onsuccess = () => {
      if (existing.result !== undefined) return;
      store.add(event);
      transaction.objectStore('outbox').put(event.at, event.id);
    };
  }
  await transactionDone(transaction);
}

/** Gives a device name to the local events written before this device was named. */
export async function renameDevice(from: string, to: string) {
  const db = await openDatabase();
  const transaction = db.transaction('events', 'readwrite');
  const store = transaction.objectStore('events');
  const all = store.getAll() as IDBRequest<ProgressEvent[]>;
  all.onsuccess = () => {
    for (const event of all.result) if (event.device === from) store.put({ ...event, device: to });
  };
  await transactionDone(transaction);
}
