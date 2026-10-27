import { describe, expect, it } from 'vitest';
import {
  BASELINE, DELAYED_SUCCESS_BONUS, DIFFICULT_MARGIN, HALF_LIFE_DAYS, MAX_SCORE, MIN_SCORE,
  decayed, effectiveScore, isDifficult, selectionWeight, updateScore,
} from './difficulty.ts';

const DAY_MS = 86_400_000;
const day = (d: number) => Date.UTC(2026, 9, d, 12);

describe('difficulty', () => {
  it('raises the score on wrong answers and lowers it on correct ones', () => {
    expect(updateScore(BASELINE, 'again', null, false)).toBe(45);
    expect(updateScore(BASELINE, 'hard', null, false)).toBe(30);
    expect(updateScore(BASELINE, 'good', null, false)).toBe(10);
    expect(updateScore(BASELINE, 'easy', null, false)).toBe(5);
  });

  it('lowers the score more after a successful delayed review, never after a failure', () => {
    expect(updateScore(50, 'good', null, false) - updateScore(50, 'good', null, true)).toBe(DELAYED_SUCCESS_BONUS);
    expect(updateScore(50, 'again', null, true)).toBe(updateScore(50, 'again', null, false));
  });

  it('keeps the score within bounds', () => {
    expect(updateScore(MAX_SCORE, 'again', null, false)).toBe(MAX_SCORE);
    expect(updateScore(MIN_SCORE, 'easy', null, true)).toBe(MIN_SCORE);
  });

  it('decays old evidence towards the baseline', () => {
    expect(decayed(60, 0)).toBe(60);
    expect(decayed(60, HALF_LIFE_DAYS)).toBeCloseTo(40);
    expect(decayed(0, HALF_LIFE_DAYS)).toBeCloseTo(10);
    expect(decayed(100, 20 * HALF_LIFE_DAYS)).toBeCloseTo(BASELINE, 2);
    expect(decayed(60, -5)).toBe(60);
  });

  it('applies the decay before the new evidence', () => {
    expect(updateScore(60, 'again', HALF_LIFE_DAYS, false)).toBeCloseTo(65);
  });

  it('computes the effective score from the last review time', () => {
    expect(effectiveScore(70, null, day(20))).toBe(70);
    expect(effectiveScore(70, day(1), day(1) + 14 * DAY_MS)).toBeCloseTo(45);
  });

  it('favours difficult items without ever excluding easy ones', () => {
    expect(selectionWeight(0)).toBe(1);
    expect(selectionWeight(100)).toBe(5);
    expect(selectionWeight(80)).toBeGreaterThan(selectionWeight(20));
    expect(selectionWeight(-50)).toBeGreaterThanOrEqual(1);
    expect(selectionWeight(500)).toBeLessThanOrEqual(5);
  });

  it('marks an item difficult from the baseline plus the margin', () => {
    expect(isDifficult(BASELINE)).toBe(false);
    expect(isDifficult(BASELINE + DIFFICULT_MARGIN)).toBe(true);
  });
});
