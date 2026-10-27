/**
 * Difficult-item score: a transparent heuristic, not machine learning.
 *
 * - Every item starts at `BASELINE` (20) on a 0–100 scale.
 * - A wrong or partial answer raises the score, a correct one lowers it; a correct answer to an item
 *   that was due (a successful delayed review) lowers it a little more.
 * - Before each update, and when displayed, the score decays towards `BASELINE` with a half-life of
 *   `HALF_LIFE_DAYS`, so old failures stop dominating (and old successes stop protecting).
 * - The score only changes how likely an item is to be selected: the weight is always at least 1.
 */
import type { Grade } from './grade.ts';

export const BASELINE = 20;
export const MIN_SCORE = 0;
export const MAX_SCORE = 100;
export const HALF_LIFE_DAYS = 14;
const DELTA: Record<Grade, number> = { again: 25, hard: 10, good: -10, easy: -15 };
/** Extra decrease for a correct answer to an item that was due. */
export const DELAYED_SUCCESS_BONUS = 5;
/** An item is difficult when its decayed score is at least this much above the baseline. */
export const DIFFICULT_MARGIN = 5;

const DAY_MS = 86_400_000;

const clamp = (value: number) => Math.min(MAX_SCORE, Math.max(MIN_SCORE, value));

/** Pulls the score back towards the baseline according to the elapsed time. */
export function decayed(score: number, daysSince: number): number {
  const factor = 0.5 ** (Math.max(0, daysSince) / HALF_LIFE_DAYS);
  return BASELINE + (score - BASELINE) * factor;
}

/** Score after one answered review. */
export function updateScore(score: number, grade: Grade, daysSinceLast: number | null, wasDue: boolean): number {
  const base = decayed(score, daysSinceLast ?? 0);
  let delta = DELTA[grade];
  if (wasDue && (grade === 'good' || grade === 'easy')) delta -= DELAYED_SUCCESS_BONUS;
  return clamp(base + delta);
}

/** Score as it stands at `now` (decay applied since the last review). */
export function effectiveScore(score: number, lastReviewedAt: number | null, now: number): number {
  return lastReviewedAt === null ? score : decayed(score, (now - lastReviewedAt) / DAY_MS);
}

/** Selection weight: 1 for an item at score 0, 5 at score 100. Never zero. */
export function selectionWeight(score: number): number {
  return 1 + clamp(score) / 25;
}

export function isDifficult(effective: number): boolean {
  return effective >= BASELINE + DIFFICULT_MARGIN;
}
