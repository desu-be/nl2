import { openDatabase, requestResult, transactionDone } from './database.ts';

/** `sha` of every repository file already read or written, by path. */
export async function readFileShas(): Promise<Map<string, string>> {
  const db = await openDatabase();
  const store = db.transaction('files').objectStore('files');
  const [keys, values] = await Promise.all([
    requestResult(store.getAllKeys()),
    requestResult(store.getAll() as IDBRequest<string[]>),
  ]);
  return new Map(keys.map((key, index) => [String(key), values[index]]));
}

export async function writeFileSha(path: string, sha: string) {
  const db = await openDatabase();
  const transaction = db.transaction('files', 'readwrite');
  transaction.objectStore('files').put(sha, path);
  await transactionDone(transaction);
}
