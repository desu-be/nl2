import type { Pack } from '../domain/pack/packTypes.ts';
import { openDatabase, readAll, requestResult, transactionDone } from './database.ts';

export interface StoredPack {
  pack: Pack;
  /** ISO 8601. */
  importedAt: string;
}

export const listPacks = () => readAll<StoredPack>('packs');

export async function readPack(packageId: string): Promise<StoredPack | undefined> {
  const db = await openDatabase();
  return requestResult(db.transaction('packs').objectStore('packs').get(packageId) as IDBRequest<StoredPack | undefined>);
}

/** Saves a pack, replacing any previous version with the same `package_id`. */
export async function savePack(stored: StoredPack) {
  const db = await openDatabase();
  const transaction = db.transaction('packs', 'readwrite');
  transaction.objectStore('packs').put(stored);
  await transactionDone(transaction);
}
