/**
 * Spaced-repetition scheduler: simple, deterministic and explainable (loosely SM-2 shaped). It spaces
 * reviews further apart on success and brings items back soon on failure.
 *
 * | state | again | hard | good | easy |
 * |---|---|---|---|---|
 * | new / learning | learning, due in 10 min | learning, due in 6 h | review, 1 day | review, 3 days |
 * | review / relearning | relearning, due in 10 min, lapse +1, interval × 0.5 (min 1 day), ease −0.2 | interval × 1.2, ease −0.15 | interval × ease (relearning: keep the reduced interval) | interval × ease × 1.3, ease +0.15 |
 *
 * - Ease never drops below 1.3; intervals never exceed 365 days; a good/easy interval always grows by
 *   at least one day.
 * - A successful answer given before a review item is due leaves the schedule untouched (reviewing
 *   early must not push the next review further out); a failure always reschedules.
 *
 * Times are epoch milliseconds.
 */
import { BASELINE, updateScore } from './difficulty.ts';
import type { Grade } from './grade.ts';

export type LearnState = 'new' | 'learning' | 'review' | 'relearning';

export interface ReviewState {
  state: LearnState;
  intervalDays: number;
  ease: number;
  dueAt: number;
  streak: number;
  lapses: number;
  lastReviewedAt: number | null;
  lastGrade: Grade | null;
  difficulty: number;
}

export const SCHEDULER = {
  againMinutes: 10,
  hardLearningMinutes: 360,
  firstIntervalGoodDays: 1,
  firstIntervalEasyDays: 3,
  hardMultiplier: 1.2,
  easyBonus: 1.3,
  lapseMultiplier: 0.5,
  defaultEase: 2.5,
  minEase: 1.3,
  easeHardPenalty: 0.15,
  easeAgainPenalty: 0.2,
  easeEasyBonus: 0.15,
  maxIntervalDays: 365,
} as const;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const afterDays = (now: number, days: number) => now + Math.round(days * 86_400) * 1000;
const afterMinutes = (now: number, minutes: number) => now + minutes * MINUTE_MS;

/** State of an item never reviewed: due immediately. */
export function newReviewState(now: number): ReviewState {
  return {
    state: 'new',
    intervalDays: 0,
    ease: SCHEDULER.defaultEase,
    dueAt: now,
    streak: 0,
    lapses: 0,
    lastReviewedAt: null,
    lastGrade: null,
    difficulty: BASELINE,
  };
}

export function isDue(state: ReviewState, now: number): boolean {
  return state.dueAt <= now;
}

/** The state after answering with `grade` at `now`. */
export function applyGrade(state: ReviewState, grade: Grade, now: number): ReviewState {
  const cfg = SCHEDULER;
  const wasDue = now >= state.dueAt;
  const daysSince = state.lastReviewedAt === null ? null : (now - state.lastReviewedAt) / DAY_MS;
  const next: ReviewState = {
    ...state,
    lastReviewedAt: now,
    lastGrade: grade,
    difficulty: updateScore(state.difficulty, grade, daysSince, wasDue),
  };

  const success = grade === 'good' || grade === 'easy';
  // Early success: keep the schedule, record the success.
  if (success && !wasDue && state.state === 'review') {
    next.streak += 1;
    return next;
  }

  if (state.state === 'new' || state.state === 'learning') {
    switch (grade) {
      case 'again':
        return { ...next, state: 'learning', intervalDays: 0, dueAt: afterMinutes(now, cfg.againMinutes), streak: 0 };
      case 'hard':
        return { ...next, state: 'learning', intervalDays: 0, dueAt: afterMinutes(now, cfg.hardLearningMinutes), streak: 0 };
      case 'good':
        return { ...next, state: 'review', intervalDays: cfg.firstIntervalGoodDays, dueAt: afterDays(now, cfg.firstIntervalGoodDays), streak: next.streak + 1 };
      case 'easy':
        return {
          ...next,
          state: 'review',
          intervalDays: cfg.firstIntervalEasyDays,
          ease: next.ease + cfg.easeEasyBonus,
          dueAt: afterDays(now, cfg.firstIntervalEasyDays),
          streak: next.streak + 1,
        };
    }
  }

  const relearning = state.state === 'relearning';
  const interval = Math.max(state.intervalDays, 1);
  const grown = (value: number) => Math.min(Math.max(value, interval + 1), cfg.maxIntervalDays);
  switch (grade) {
    case 'again':
      return {
        ...next,
        state: 'relearning',
        lapses: next.lapses + 1,
        ease: Math.max(state.ease - cfg.easeAgainPenalty, cfg.minEase),
        intervalDays: Math.max(interval * cfg.lapseMultiplier, 1),
        dueAt: afterMinutes(now, cfg.againMinutes),
        streak: 0,
      };
    case 'hard': {
      const intervalDays = Math.min(Math.max(interval * cfg.hardMultiplier, interval + 0.5), cfg.maxIntervalDays);
      return {
        ...next,
        state: 'review',
        ease: Math.max(state.ease - cfg.easeHardPenalty, cfg.minEase),
        intervalDays,
        dueAt: afterDays(now, intervalDays),
      };
    }
    case 'good': {
      const intervalDays = relearning ? interval : grown(interval * state.ease);
      return { ...next, state: 'review', intervalDays, dueAt: afterDays(now, intervalDays), streak: next.streak + 1 };
    }
    case 'easy': {
      const intervalDays = grown(relearning ? interval * cfg.easyBonus : interval * state.ease * cfg.easyBonus);
      return {
        ...next,
        state: 'review',
        ease: state.ease + cfg.easeEasyBonus,
        intervalDays,
        dueAt: afterDays(now, intervalDays),
        streak: next.streak + 1,
      };
    }
  }
}
