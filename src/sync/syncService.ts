/**
 * Synchronization with the data repository. Reads at start-up, when the network comes back, when the
 * app is shown again and on demand; sends the outbox at most every 30 s while answering, at the end
 * of a quiz, and when the app goes to the background. Nothing is lost offline: the outbox waits.
 */
import type { Library } from '../app/library.ts';
import { UNNAMED_DEVICE } from '../domain/sync/repoPaths.ts';
import { listOutbox, renameDevice } from '../store/eventStore.ts';
import { readMeta, writeMeta, type SyncConfig } from '../store/metaStore.ts';
import { GitHubClient, GitHubError } from './githubClient.ts';
import { pullChanges } from './pullChanges.ts';
import { pushEvents, pushPacks, type CommitTimes } from './pushChanges.ts';

export type SyncError = 'auth' | 'access' | 'network' | 'other';

export interface SyncState {
  config?: Omit<SyncConfig, 'token'>;
  /** A token is stored: synchronization is active. */
  active: boolean;
  running: boolean;
  lastSync?: string;
  /** Answers and packs waiting to be sent. */
  pending: number;
  error?: SyncError;
  /** Repository files that could not be used. */
  problems: string[];
  /** The device clock is more than 5 minutes away from GitHub's. */
  clockOff: boolean;
}

const PUSH_DELAY_MS = 30_000;
const REFRESH_AFTER_MS = 60_000;
const CLOCK_TOLERANCE_MS = 5 * 60_000;

export function errorKind(error: unknown): SyncError {
  if (!(error instanceof GitHubError)) return 'other';
  if (error.status === 401) return 'auth';
  if (error.status === 403 || error.status === 404) return 'access';
  if (error.status === 0) return 'network';
  return 'other';
}

type Listener = (state: SyncState) => void;

export class SyncService {
  private readonly listeners = new Set<Listener>();
  private current: SyncState = { active: false, running: false, pending: 0, problems: [], clockOff: false };
  private token = '';
  private pushTimer: ReturnType<typeof setTimeout> | undefined;
  private queued: 'push' | 'full' | null = null;

  constructor(private readonly library: Library) {}

  get state(): SyncState { return this.current; }

  async init() {
    const [config, lastSync] = await Promise.all([readMeta('sync'), readMeta('lastSync')]);
    if (config) this.library.setDevice(config.device);
    this.token = config?.token ?? '';
    await this.update({ config: config && withoutToken(config), active: Boolean(this.token), lastSync });

    addEventListener('online', () => void this.syncNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flush();
      else if (!this.current.lastSync || Date.now() - Date.parse(this.current.lastSync) > REFRESH_AFTER_MS) void this.syncNow();
    });
    this.library.subscribe(() => this.schedulePush());
    if (this.token) void this.syncNow();
  }

  /**
   * Tests the access, then stores it. The first time, the local events written so far take the device
   * name. Throws a `GitHubError` when the token cannot read the repository.
   */
  async configure(input: { token: string; repo: string; device: string; tokenExpiresAt?: string }) {
    const info = await new GitHubClient(input.token, input.repo).repository();
    const previous = await readMeta('sync');
    const device = previous?.device ?? input.device;
    const config: SyncConfig = {
      token: input.token,
      repo: input.repo,
      branch: info.defaultBranch,
      device,
      ...(info.tokenExpiresAt ?? input.tokenExpiresAt ? { tokenExpiresAt: info.tokenExpiresAt ?? input.tokenExpiresAt } : {}),
    };
    if (!previous) await renameDevice(UNNAMED_DEVICE, device);
    await writeMeta('sync', config);
    this.token = config.token;
    this.library.setDevice(device);
    await this.library.load();
    await this.update({ config: withoutToken(config), active: true, error: undefined });
    await this.syncNow();
  }

  /** Removes the token from this device. The device name, the data and the outbox are kept. */
  async forgetToken() {
    const config = await readMeta('sync');
    if (config) await writeMeta('sync', { ...config, token: '' });
    this.token = '';
    await this.update({ active: false, error: undefined });
  }

  /** Records locally imported packs for sending, then sends them with the outbox. */
  async packImported(...packageIds: string[]) {
    const pending = (await readMeta('pendingPacks')) ?? [];
    const added = packageIds.filter((id) => !pending.includes(id));
    if (added.length) await writeMeta('pendingPacks', [...pending, ...added]);
    await this.refreshPending();
    void this.flush();
  }

  /** Full synchronization: read the repository, then send everything pending. */
  syncNow(): Promise<void> { return this.run('full'); }

  /** Sends what is pending, without reading. */
  flush(): Promise<void> { return this.run('push'); }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private schedulePush() {
    if (!this.token || this.pushTimer) return;
    this.pushTimer = setTimeout(() => {
      this.pushTimer = undefined;
      void this.flush();
    }, PUSH_DELAY_MS);
    void this.refreshPending();
  }

  private async run(mode: 'push' | 'full') {
    if (!this.token || !this.current.config) return;
    if (this.current.running) {
      if (this.queued !== 'full') this.queued = mode;
      return;
    }
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = undefined;
    }
    await this.update({ running: true });
    const { repo, branch } = this.current.config;
    const client = new GitHubClient(this.token, repo, branch);
    const commitTimes: CommitTimes = [];
    const patch: Partial<SyncState> = {};
    try {
      if (mode === 'full') {
        const pulled = await pullChanges(client);
        patch.problems = pulled.problems;
        if (pulled.changed) await this.library.load();
      }
      await pushPacks(client, commitTimes);
      await pushEvents(client, commitTimes);
      const now = new Date().toISOString();
      if (mode === 'full') {
        await writeMeta('lastSync', now);
        patch.lastSync = now;
      }
      patch.error = undefined;
      if (commitTimes.length) patch.clockOff = commitTimes.some((at) => Math.abs(Date.parse(at) - Date.now()) > CLOCK_TOLERANCE_MS);
    } catch (error) {
      console.warn('Synchronization failed', error);
      patch.error = errorKind(error);
    }
    await this.update({ ...patch, running: false });
    const next = this.queued;
    this.queued = null;
    if (next) await this.run(next);
  }

  private async refreshPending() {
    await this.update({});
  }

  private async update(patch: Partial<SyncState>) {
    const [outbox, packs] = await Promise.all([listOutbox(), readMeta('pendingPacks')]);
    this.current = { ...this.current, ...patch, pending: outbox.length + (packs?.length ?? 0) };
    for (const listener of this.listeners) listener(this.current);
  }
}

function withoutToken({ token: _token, ...config }: SyncConfig): Omit<SyncConfig, 'token'> {
  return config;
}
