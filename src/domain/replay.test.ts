import { describe, expect, it } from 'vitest';
import { itemStatus } from './itemStatus.ts';
import { replay } from './replay.ts';
import { answer, DAY, flag, MINUTE, T0 } from './testFixtures.ts';

describe('replay', () => {
  it('leaves an item unseen until a non-skipped answer', () => {
    const progress = replay([answer('a', 'skipped', T0)]);
    expect(itemStatus(progress.get('a'), T0).seen).toBe(false);
    const answered = replay([answer('a', 'skipped', T0), answer('a', 'again', T0 + MINUTE)]);
    expect(itemStatus(answered.get('a'), T0 + MINUTE).seen).toBe(true);
  });

  it('applies the scheduler to each answer in time order', () => {
    const progress = replay([answer('a', 'good', T0)]);
    expect(progress.get('a')?.review).toMatchObject({ state: 'review', dueAt: T0 + DAY });
    expect(itemStatus(progress.get('a'), T0 + DAY - 1).due).toBe(false);
    expect(itemStatus(progress.get('a'), T0 + DAY).due).toBe(true);
  });

  it('does not depend on the order in which events arrive', () => {
    const events = [
      answer('a', 'again', T0, 'phone'),
      answer('a', 'good', T0 + 20 * MINUTE, 'pc'),
      answer('a', 'hard', T0 + 20 * MINUTE, 'phone'),
      flag('known', 'b', T0 + MINUTE, 'pc'),
      answer('b', 'good', T0 + 2 * MINUTE, 'phone'),
    ];
    const reference = replay(events);
    for (const order of [[...events].reverse(), [events[3], events[1], events[4], events[0], events[2]]]) {
      expect(replay(order)).toEqual(reference);
    }
  });

  it('excludes a known item and restores it on reactivation', () => {
    const answered = [answer('a', 'again', T0)];
    const known = replay([...answered, flag('known', 'a', T0 + MINUTE)]);
    expect(itemStatus(known.get('a'), T0 + DAY)).toMatchObject({ known: true, due: false, difficult: false });
    const back = replay([...answered, flag('known', 'a', T0 + MINUTE), flag('unknown', 'a', T0 + 2 * MINUTE)]);
    expect(back.get('a')).toEqual({ ...replay(answered).get('a'), known: false });
  });

  it('marks an item difficult after repeated failures', () => {
    const progress = replay([answer('a', 'again', T0), answer('a', 'again', T0 + 11 * MINUTE)]);
    expect(itemStatus(progress.get('a'), T0 + 12 * MINUTE).difficult).toBe(true);
    expect(itemStatus(undefined, T0).difficult).toBe(false);
  });

  it('keeps events about unknown items without effect elsewhere', () => {
    const progress = replay([answer('gone:item', 'good', T0)]);
    expect([...progress.keys()]).toEqual(['gone:item']);
  });
});
