/**
 * Reading: one tree request lists every file with its `sha`; only the files whose `sha` changed are
 * downloaded. Packs are validated before they replace the local copy; event files are merged by id.
 */
import { validateImport } from '../domain/pack/validateImport.ts';
import { parseEvents } from '../domain/sync/eventFile.ts';
import { classifyPath } from '../domain/sync/repoPaths.ts';
import { storeRemoteEvents } from '../store/eventStore.ts';
import { readFileShas, writeFileSha } from '../store/fileStore.ts';
import { readMeta } from '../store/metaStore.ts';
import { listPacks, savePack } from '../store/packStore.ts';
import type { GitHubClient } from './githubClient.ts';

export interface PullResult {
  /** Something new was stored: the library must be reloaded. */
  changed: boolean;
  /** Repository files that could not be used (invalid pack, malformed lines). */
  problems: string[];
}

export async function pullChanges(client: GitHubClient): Promise<PullResult> {
  const [entries, shas, pendingPacks] = await Promise.all([client.tree(), readFileShas(), readMeta('pendingPacks')]);
  const result: PullResult = { changed: false, problems: [] };

  for (const entry of entries) {
    const file = classifyPath(entry.path);
    if (!file || shas.get(entry.path) === entry.sha) continue;
    // A pack imported here and not sent yet wins over the repository copy: it is sent next.
    if (file.kind === 'pack' && pendingPacks?.includes(file.packageId)) continue;

    const remote = await client.read(entry.path);
    if (!remote) continue;
    if (file.kind === 'pack') {
      const installed = (await listPacks()).map((stored) => stored.pack);
      const validation = validateImport(remote.text, installed);
      if (validation.ok && validation.pack.package_id === file.packageId) {
        await savePack({ pack: validation.pack, importedAt: new Date().toISOString() });
        result.changed = true;
      } else {
        result.problems.push(entry.path);
      }
    } else {
      const { events, skipped } = parseEvents(remote.text);
      await storeRemoteEvents(events);
      if (events.length) result.changed = true;
      if (skipped) result.problems.push(entry.path);
    }
    await writeFileSha(entry.path, remote.sha);
  }
  return result;
}
