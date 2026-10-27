/**
 * Rebuilds the progress of every item from the event log. Pure and deterministic: the result does
 * not depend on the order in which events arrive. Events about items absent from the packs are
 * kept and simply have no visible effect; they apply again if the item comes back.
 */
import { compareEvents, type ProgressEvent } from './progressEvents.ts';
import { applyGrade, newReviewState, type ReviewState } from './scheduler.ts';

export interface ItemProgress {
  /** Null until the first non-skipped answer: the item is « pas encore vu ». */
  review: ReviewState | null;
  known: boolean;
}

export type ProgressMap = Map<string, ItemProgress>;

/** Applies one event on top of `progress`, in place. Events must come in replay order. */
export function applyEvent(progress: ProgressMap, event: ProgressEvent) {
  const current = progress.get(event.item) ?? { review: null, known: false };
  switch (event.type) {
    case 'answer': {
      if (event.grade === 'skipped') return;
      const at = Date.parse(event.at);
      const review = applyGrade(current.review ?? newReviewState(at), event.grade, at);
      progress.set(event.item, { ...current, review });
      return;
    }
    case 'known':
      progress.set(event.item, { ...current, known: true });
      return;
    case 'unknown':
      progress.set(event.item, { ...current, known: false });
  }
}

export function replay(events: readonly ProgressEvent[]): ProgressMap {
  const progress: ProgressMap = new Map();
  for (const event of [...events].sort(compareEvents)) applyEvent(progress, event);
  return progress;
}
