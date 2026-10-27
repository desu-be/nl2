import { describe, expect, it } from 'vitest';
import type { ProgressEvent } from '../progressEvents.ts';
import { answer, flag, T0 } from '../testFixtures.ts';
import { mergeEvents, parseEvents, serializeEvents } from './eventFile.ts';
import { isProgressEvent } from './eventShape.ts';
import { classifyPath, isValidDeviceName, packPath, progressPath } from './repoPaths.ts';

describe('repository paths', () => {
  it('files an event under its device and UTC month', () => {
    expect(progressPath('pixel', '2026-11-30T23:59:59.999Z')).toBe('progress/pixel/2026-11.jsonl');
    expect(progressPath('pixel', '2026-12-01T00:00:00+01:00')).toBe('progress/pixel/2026-11.jsonl');
  });

  it('recognizes pack and progress files, and ignores everything else', () => {
    expect(classifyPath(packPath('work-dev'))).toEqual({ kind: 'pack', packageId: 'work-dev' });
    expect(classifyPath('progress/pc-pro/2026-11.jsonl')).toEqual({ kind: 'progress', device: 'pc-pro', month: '2026-11' });
    for (const path of ['docs/contexte.md', 'packs/Bad.json', 'packs/sub/x.json', 'progress/pc/2026-11.json', 'progress/pc/x/2026-11.jsonl']) {
      expect(classifyPath(path), path).toBeNull();
    }
  });

  it('accepts short lower-case device names, never the placeholder', () => {
    expect(isValidDeviceName('pc-pro')).toBe(true);
    expect(isValidDeviceName('pixel8')).toBe(true);
    for (const name of ['', 'PC', 'pc pro', '-pc', 'local', 'x'.repeat(33)]) expect(isValidDeviceName(name), name).toBe(false);
  });
});

describe('event files', () => {
  const events = [answer('a', 'good', T0 + 1000, 'pixel'), answer('a', 'again', T0, 'pixel'), flag('known', 'b', T0 + 2000, 'pixel')];

  it('round-trips through JSON Lines, in replay order', () => {
    const text = serializeEvents(events);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.split('\n').filter(Boolean)).toHaveLength(3);
    expect(parseEvents(text)).toEqual({ events: [events[1], events[0], events[2]], skipped: 0 });
  });

  it('skips malformed lines instead of failing the whole file', () => {
    const text = `${serializeEvents(events)}not json\n{"id":"x","type":"answer"}\n\n`;
    expect(parseEvents(text)).toMatchObject({ skipped: 2 });
    expect(parseEvents(text).events).toHaveLength(3);
  });

  it('merges by id', () => {
    const extra = answer('c', 'hard', T0 + 500, 'pixel');
    const changed = { ...events[0], grade: 'hard' } as ProgressEvent;
    const merged = mergeEvents([events[0], extra], [changed, events[1]]);
    expect(merged.map((event) => event.id)).toEqual([events[1].id, extra.id, events[0].id]);
    expect(merged.find((event) => event.id === events[0].id)).toBe(events[0]);
  });
});

describe('isProgressEvent', () => {
  const base = { id: '01J', at: '2026-11-03T07:42:10.123Z', device: 'pixel', item: 'demo:w.desk' };

  it('accepts the three event types', () => {
    expect(isProgressEvent({ ...base, type: 'answer', dir: 'form', form: 'present.ik', grade: 'hard' })).toBe(true);
    expect(isProgressEvent({ ...base, type: 'answer', dir: 'fr-nl', grade: 'good', revealed: false })).toBe(true);
    expect(isProgressEvent({ ...base, type: 'known' })).toBe(true);
    expect(isProgressEvent({ ...base, type: 'unknown' })).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isProgressEvent(null)).toBe(false);
    expect(isProgressEvent({ ...base, type: 'deleted' })).toBe(false);
    expect(isProgressEvent({ ...base, type: 'answer', dir: 'fr-nl', grade: 'easy' })).toBe(false);
    expect(isProgressEvent({ ...base, type: 'answer', dir: 'up', grade: 'good' })).toBe(false);
    expect(isProgressEvent({ ...base, type: 'answer', dir: 'form', form: 'future', grade: 'good' })).toBe(false);
    expect(isProgressEvent({ ...base, at: 'yesterday', type: 'known' })).toBe(false);
    expect(isProgressEvent({ ...base, device: '', type: 'known' })).toBe(false);
  });
});
