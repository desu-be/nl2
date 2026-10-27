import { categoryNames } from '../domain/categories.ts';
import { libraryItems, type Item } from '../domain/items.ts';
import type { Pack } from '../domain/pack/packTypes.ts';
import type { AnswerEvent, KnownEvent, ProgressEvent, UnknownEvent } from '../domain/progressEvents.ts';
import { applyEvent, replay, type ProgressMap } from '../domain/replay.ts';
import { UNNAMED_DEVICE } from '../domain/sync/repoPaths.ts';
import { ulid } from '../domain/ulid.ts';
import { appendLocalEvent, listEvents, storeRestoredEvents } from '../store/eventStore.ts';
import { listPacks, savePack, type StoredPack } from '../store/packStore.ts';

type Listener = () => void;
type NewEvent = Omit<AnswerEvent, 'id' | 'at' | 'device'> | Omit<KnownEvent, 'id' | 'at' | 'device'> | Omit<UnknownEvent, 'id' | 'at' | 'device'>;

/**
 * In-memory view of the local data: packs, items, and the progress rebuilt from the event log.
 * Screens read it and subscribe to changes; every write goes to IndexedDB first.
 */
export class Library {
  private readonly listeners = new Set<Listener>();
  private storedPacks: StoredPack[] = [];
  private events: ProgressEvent[] = [];
  private itemList: Item[] = [];
  private names = new Map<string, string>();
  private progressMap: ProgressMap = new Map();
  private device = UNNAMED_DEVICE;
  private loading = false;
  private recordedWhileLoading = false;

  /** Reads everything from IndexedDB and replays the log. Reads again if an answer came in meanwhile. */
  async load(): Promise<void> {
    this.loading = true;
    this.recordedWhileLoading = false;
    try {
      [this.storedPacks, this.events] = await Promise.all([listPacks(), listEvents()]);
    } finally {
      this.loading = false;
    }
    if (this.recordedWhileLoading) return this.load();
    this.rebuildItems();
    this.progressMap = replay(this.events);
    this.notify();
  }

  get packs(): readonly StoredPack[] { return this.storedPacks; }
  get items(): readonly Item[] { return this.itemList; }
  get progress(): ProgressMap { return this.progressMap; }
  get eventLog(): readonly ProgressEvent[] { return this.events; }

  /** Device written in new events: the placeholder until synchronization names this device. */
  setDevice(name: string) { this.device = name; }

  /** Display name of a category defined by a pack, or undefined for a built-in or unknown slug. */
  categoryName(slug: string): string | undefined { return this.names.get(slug); }

  async importPack(pack: Pack) {
    const stored: StoredPack = { pack, importedAt: new Date().toISOString() };
    await savePack(stored);
    this.storedPacks = [...this.storedPacks.filter((p) => p.pack.package_id !== pack.package_id), stored];
    this.rebuildItems();
    this.notify();
  }

  /**
   * Restores an export: its packs replace the local copies, its events join the log. Events of an
   * unnamed device take this device's name.
   */
  async restore(packs: readonly Pack[], events: readonly ProgressEvent[]) {
    const importedAt = new Date().toISOString();
    for (const pack of packs) await savePack({ pack, importedAt });
    await storeRestoredEvents(events.map((event) => (event.device === UNNAMED_DEVICE ? { ...event, device: this.device } : event)));
    await this.load();
  }

  /** Records a local event. Being the latest event, it is applied on top of the current progress. */
  async record(fields: NewEvent) {
    const now = Date.now();
    const event = { ...fields, id: ulid(now, (n) => crypto.getRandomValues(new Uint8Array(n))), at: new Date(now).toISOString(), device: this.device } as ProgressEvent;
    await appendLocalEvent(event);
    if (this.loading) this.recordedWhileLoading = true;
    this.events.push(event);
    applyEvent(this.progressMap, event);
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private rebuildItems() {
    const packs = this.storedPacks.map((stored) => stored.pack);
    this.itemList = libraryItems(packs);
    this.names = categoryNames(packs);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }
}
