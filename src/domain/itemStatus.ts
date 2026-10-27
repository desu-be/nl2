/** What the quiz filters and the home counters need to know about an item at a given time. */
import { effectiveScore, isDifficult, selectionWeight, BASELINE } from './difficulty.ts';
import type { ItemProgress } from './replay.ts';
import { isDue } from './scheduler.ts';

const NEVER_SEEN: ItemProgress = { review: null, known: false };

export interface ItemStatus {
  known: boolean;
  /** At least one non-skipped answer, whatever the direction. */
  seen: boolean;
  /** Seen, not known, and due now. */
  due: boolean;
  /** Seen, not known, and the decayed difficulty score is above the threshold. */
  difficult: boolean;
  /** Selection weight: difficult items are picked more often, none is excluded. */
  weight: number;
}

export function itemStatus(progress: ItemProgress | undefined, now: number): ItemStatus {
  const { review, known } = progress ?? NEVER_SEEN;
  const score = review ? effectiveScore(review.difficulty, review.lastReviewedAt, now) : BASELINE;
  return {
    known,
    seen: review !== null,
    due: !known && review !== null && isDue(review, now),
    difficult: !known && review !== null && isDifficult(score),
    weight: selectionWeight(score),
  };
}
