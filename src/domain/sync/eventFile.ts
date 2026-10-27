/** Progress files: JSON Lines, one event per line, in replay order. */
import { compareEvents, type ProgressEvent } from '../progressEvents.ts';
import { isProgressEvent } from './eventShape.ts';

export function serializeEvents(events: readonly ProgressEvent[]): string {
  return [...events].sort(compareEvents).map((event) => `${JSON.stringify(event)}\n`).join('');
}

/** The valid events of a file, and how many lines had to be skipped (blank lines are not counted). */
export function parseEvents(text: string): { events: ProgressEvent[]; skipped: number } {
  const events: ProgressEvent[] = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const value: unknown = JSON.parse(line);
      if (isProgressEvent(value)) events.push(value);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { events, skipped };
}

/** Union of two event lists by id; on a duplicate id the first list wins. */
export function mergeEvents(first: readonly ProgressEvent[], second: readonly ProgressEvent[]): ProgressEvent[] {
  const byId = new Map<string, ProgressEvent>();
  for (const event of [...second, ...first]) byId.set(event.id, event);
  return [...byId.values()].sort(compareEvents);
}
