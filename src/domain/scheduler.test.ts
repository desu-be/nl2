import { describe, expect, it } from 'vitest';
import { BASELINE } from './difficulty.ts';
import { applyGrade, isDue, newReviewState, SCHEDULER, type ReviewState } from './scheduler.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const t0 = Date.UTC(2026, 9, 1, 9);

const inReview = (interval: number): ReviewState => ({
  state: 'review',
  intervalDays: interval,
  ease: 2.5,
  dueAt: t0,
  streak: 3,
  lapses: 0,
  lastReviewedAt: t0 - interval * DAY,
  lastGrade: 'good',
  difficulty: 20,
});

describe('scheduler', () => {
  it('makes a new item due immediately', () => {
    expect(isDue(newReviewState(t0), t0)).toBe(true);
  });

  it('schedules a new item about one day out on good', () => {
    const s = applyGrade(newReviewState(t0), 'good', t0);
    expect(s.state).toBe('review');
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(t0 + DAY);
    expect(s.streak).toBe(1);
    expect(s.lastGrade).toBe('good');
    expect(s.lastReviewedAt).toBe(t0);
  });

  it('sends a new item further on easy and raises the ease', () => {
    const s = applyGrade(newReviewState(t0), 'easy', t0);
    expect(s.intervalDays).toBe(3);
    expect(s.ease).toBeGreaterThan(2.5);
  });

  it('brings a new item back in ten minutes on again and in six hours on hard', () => {
    const again = applyGrade(newReviewState(t0), 'again', t0);
    expect(again.state).toBe('learning');
    expect(again.dueAt).toBe(t0 + 10 * MINUTE);
    expect(again.streak).toBe(0);
    const hard = applyGrade(newReviewState(t0), 'hard', t0);
    expect(hard.state).toBe('learning');
    expect(hard.dueAt).toBe(t0 + 6 * HOUR);
  });

  it('graduates a learning item on good', () => {
    const learning = applyGrade(newReviewState(t0), 'again', t0);
    const s = applyGrade(learning, 'good', t0 + 11 * MINUTE);
    expect(s.state).toBe('review');
    expect(s.intervalDays).toBe(1);
  });

  it('multiplies the interval by the ease on good', () => {
    const s = applyGrade(inReview(4), 'good', t0);
    expect(s.intervalDays).toBe(10);
    expect(s.dueAt).toBe(t0 + 10 * DAY);
    expect(s.streak).toBe(4);
  });

  it('always grows a good interval by at least a day', () => {
    const s = applyGrade({ ...inReview(1), ease: 1.3 }, 'good', t0);
    expect(s.intervalDays).toBeGreaterThanOrEqual(2);
  });

  it('grows the interval slightly and lowers the ease on hard', () => {
    const s = applyGrade(inReview(10), 'hard', t0);
    expect(s.intervalDays).toBe(12);
    expect(s.ease).toBeCloseTo(2.35);
    expect(s.streak).toBe(3);
  });

  it('gives easy a larger interval and ease than good', () => {
    const good = applyGrade(inReview(10), 'good', t0);
    const easy = applyGrade(inReview(10), 'easy', t0);
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
    expect(easy.ease).toBeGreaterThan(good.ease);
  });

  it('halves the interval and counts a lapse', () => {
    const s = applyGrade(inReview(20), 'again', t0);
    expect(s.state).toBe('relearning');
    expect(s.lapses).toBe(1);
    expect(s.intervalDays).toBe(10);
    expect(s.dueAt).toBe(t0 + 10 * MINUTE);
    expect(s.streak).toBe(0);
    expect(s.ease).toBeCloseTo(2.3);
  });

  it('keeps reducing the interval on repeated lapses, down to one day', () => {
    let s = inReview(16);
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = applyGrade(s, 'again', t0 + i * HOUR);
      seen.push(s.intervalDays);
    }
    expect(seen.slice(0, 4)).toEqual([8, 4, 2, 1]);
    expect(seen.every((interval) => interval >= 1)).toBe(true);
    expect(s.lapses).toBe(6);
    expect(s.ease).toBeGreaterThanOrEqual(SCHEDULER.minEase);
  });

  it('graduates relearning back with the reduced interval', () => {
    const lapsed = applyGrade(inReview(20), 'again', t0);
    const later = t0 + 15 * MINUTE;
    const s = applyGrade(lapsed, 'good', later);
    expect(s.state).toBe('review');
    expect(s.intervalDays).toBe(10);
    expect(s.dueAt).toBe(later + 10 * DAY);
  });

  it('caps intervals', () => {
    expect(applyGrade({ ...inReview(300), ease: 3 }, 'easy', t0).intervalDays).toBe(365);
  });

  it('keeps a floor on the ease', () => {
    expect(applyGrade({ ...inReview(5), ease: 1.3 }, 'hard', t0).ease).toBe(1.3);
  });

  it('leaves the schedule alone after an early success', () => {
    const early = { ...inReview(10), dueAt: t0 + 5 * DAY };
    const s = applyGrade(early, 'good', t0);
    expect(s.dueAt).toBe(early.dueAt);
    expect(s.intervalDays).toBe(early.intervalDays);
    expect(s.streak).toBe(4);
    expect(s.lastReviewedAt).toBe(t0);
    expect(s.difficulty).toBeLessThan(early.difficulty);
  });

  it('still reschedules after an early failure', () => {
    const s = applyGrade({ ...inReview(10), dueAt: t0 + 5 * DAY }, 'again', t0);
    expect(s.state).toBe('relearning');
    expect(s.lapses).toBe(1);
  });

  it('moves the difficulty score with each review', () => {
    const s = applyGrade(newReviewState(t0), 'again', t0);
    expect(s.difficulty).toBeGreaterThan(BASELINE);
    expect(applyGrade(s, 'good', t0 + 11 * MINUTE).difficulty).toBeLessThan(s.difficulty);
  });

  it('never mutates the state it is given', () => {
    const state = inReview(10);
    const copy = structuredClone(state);
    applyGrade(state, 'again', t0);
    expect(state).toEqual(copy);
  });
});
