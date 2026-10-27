/**
 * Writing. Each device only ever writes its own monthly event files (a restored export is the one
 * exception: it rewrites the files of every device it holds). Sending the outbox rewrites the files
 * it touches with every local event they hold. A `409`/`422` means the file changed since it
 * was last read (another tab of this device): it is read again, merged by event id, and retried.
 * Packs imported on this device are written whole, the last import winning.
 */
import { packPath, progressPath, UNNAMED_DEVICE } from '../domain/sync/repoPaths.ts';
import { mergeEvents, parseEvents, serializeEvents } from '../domain/sync/eventFile.ts';
import type { ProgressEvent } from '../domain/progressEvents.ts';
import { listEvents, listOutbox, removeFromOutbox, storeRemoteEvents } from '../store/eventStore.ts';
import { readFileShas, writeFileSha } from '../store/fileStore.ts';
import { readMeta, writeMeta } from '../store/metaStore.ts';
import { readPack } from '../store/packStore.ts';
import { GitHubError, type GitHubClient, type WrittenFile } from './githubClient.ts';

const MAX_ATTEMPTS = 3;

const isConflict = (error: unknown) => error instanceof GitHubError && (error.status === 409 || error.status === 422);

/** Commit times returned by the writes, to check the device clock against the server. */
export type CommitTimes = string[];

/** Writes `build(remoteText)` at `path`, rereading the file on a conflict. */
async function writeWithRetry(
  client: GitHubClient,
  path: string,
  sha: string | undefined,
  message: string,
  build: (remoteText: string | null) => Promise<string>,
): Promise<WrittenFile> {
  let currentSha = sha;
  let remoteText: string | null = null;
  for (let attempt = 1; ; attempt++) {
    try {
      return await client.write(path, await build(remoteText), currentSha, message);
    } catch (error) {
      if (!isConflict(error) || attempt >= MAX_ATTEMPTS) throw error;
      const remote = await client.read(path);
      currentSha = remote?.sha;
      remoteText = remote?.text ?? null;
    }
  }
}

export async function pushEvents(client: GitHubClient, commitTimes: CommitTimes) {
  const outbox = new Set(await listOutbox());
  if (!outbox.size) return;
  const [all, shas] = await Promise.all([listEvents(), readFileShas()]);

  // Files touched by the outbox, each rewritten with every local event it holds.
  const touched = new Set(all.filter((event) => outbox.has(event.id) && event.device !== UNNAMED_DEVICE).map((event) => progressPath(event.device, event.at)));
  const byPath = new Map<string, { sent: string[]; events: ProgressEvent[] }>();
  for (const event of all) {
    const path = progressPath(event.device, event.at);
    if (!touched.has(path)) continue;
    const file = byPath.get(path) ?? { sent: [], events: [] };
    file.events.push(event);
    if (outbox.has(event.id)) file.sent.push(event.id);
    byPath.set(path, file);
  }

  for (const [path, file] of byPath) {
    if (!file.sent.length) continue;
    const written = await writeWithRetry(client, path, shas.get(path), `progress: ${path.slice('progress/'.length)}`, async (remoteText) => {
      if (remoteText === null) return serializeEvents(file.events);
      const remote = parseEvents(remoteText).events;
      await storeRemoteEvents(remote);
      return serializeEvents(mergeEvents(file.events, remote));
    });
    await writeFileSha(path, written.sha);
    await removeFromOutbox(file.sent);
    if (written.committedAt) commitTimes.push(written.committedAt);
  }
}

export async function pushPacks(client: GitHubClient, commitTimes: CommitTimes) {
  const pending = (await readMeta('pendingPacks')) ?? [];
  if (!pending.length) return;
  const shas = await readFileShas();
  for (const packageId of pending) {
    const stored = await readPack(packageId);
    if (stored) {
      const path = packPath(packageId);
      const text = `${JSON.stringify(stored.pack, null, 2)}\n`;
      const written = await writeWithRetry(client, path, shas.get(path), `pack: ${packageId} ${stored.pack.package_version}`, async () => text);
      await writeFileSha(path, written.sha);
      if (written.committedAt) commitTimes.push(written.committedAt);
    }
    const remaining = ((await readMeta('pendingPacks')) ?? []).filter((id) => id !== packageId);
    await writeMeta('pendingPacks', remaining.length ? remaining : undefined);
  }
}
