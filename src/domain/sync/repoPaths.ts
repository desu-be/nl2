/**
 * Layout of the data repository:
 * - `packs/<package_id>.json`: a pack v1, as imported;
 * - `progress/<device>/<YYYY-MM>.jsonl`: the events of one device for one month (UTC), one per line.
 * Every other file (documentation…) is ignored.
 */

export type RepoFile =
  | { kind: 'pack'; packageId: string }
  | { kind: 'progress'; device: string; month: string };

const DEVICE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const PACK_PATH = /^packs\/([a-z0-9][a-z0-9._-]*)\.json$/;
const PROGRESS_PATH = /^progress\/([a-z0-9][a-z0-9-]{0,31})\/(\d{4}-\d{2})\.jsonl$/;

/** Placeholder device of local events written before this device was named. */
export const UNNAMED_DEVICE = 'local';

/** A device name: short, lower-case, readable (`pc-pro`, `pixel`), and not the placeholder. */
export function isValidDeviceName(name: string): boolean {
  return DEVICE.test(name) && name !== UNNAMED_DEVICE;
}

export const packPath = (packageId: string) => `packs/${packageId}.json`;

/** File holding an event written by `device` at `at` (ISO 8601). */
export function progressPath(device: string, at: string): string {
  return `progress/${device}/${new Date(at).toISOString().slice(0, 7)}.jsonl`;
}

export function classifyPath(path: string): RepoFile | null {
  const pack = PACK_PATH.exec(path);
  if (pack) return { kind: 'pack', packageId: pack[1] };
  const progress = PROGRESS_PATH.exec(path);
  if (progress) return { kind: 'progress', device: progress[1], month: progress[2] };
  return null;
}
