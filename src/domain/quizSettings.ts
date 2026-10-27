/**
 * Quiz settings chosen on the home screen. Sources and categories restrict the pool; the status
 * filters (due, difficult, unseen) add up: « à réviser » + « pas encore vus » means either.
 */
import type { ItemKind } from './items.ts';

export type DirectionChoice = 'fr-nl' | 'nl-fr' | 'mixed';
export type StatusFilter = 'due' | 'difficult' | 'unseen';

export interface QuizSettings {
  /** Words, phrases, conjugation (verbs are only asked as conjugation forms). */
  sources: ItemKind[];
  direction: DirectionChoice;
  /** Empty: every item that is not known. */
  statuses: StatusFilter[];
  /** Empty: every category. */
  categoryIds: string[];
  size: number;
}

export const ITEM_KINDS: readonly ItemKind[] = ['word', 'phrase', 'verb'];
export const DIRECTIONS: readonly DirectionChoice[] = ['fr-nl', 'nl-fr', 'mixed'];
export const STATUS_FILTERS: readonly StatusFilter[] = ['due', 'unseen', 'difficult'];
export const QUIZ_SIZES = [5, 10, 20, 30, 50] as const;

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  sources: ['word', 'phrase'],
  direction: 'mixed',
  statuses: [],
  categoryIds: [],
  size: 10,
};

const pick = <T>(values: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(values) ? allowed.filter((value) => values.includes(value)) : [];

/** Settings read back from storage: anything unknown or malformed falls back to the default. */
export function sanitizeQuizSettings(raw: unknown): QuizSettings {
  const value = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof QuizSettings, unknown>>;
  const sources = pick(value.sources, ITEM_KINDS);
  return {
    sources: sources.length ? sources : DEFAULT_QUIZ_SETTINGS.sources,
    direction: DIRECTIONS.find((direction) => direction === value.direction) ?? DEFAULT_QUIZ_SETTINGS.direction,
    statuses: pick(value.statuses, STATUS_FILTERS),
    categoryIds: Array.isArray(value.categoryIds) ? value.categoryIds.filter((id): id is string => typeof id === 'string') : [],
    size: QUIZ_SIZES.find((size) => size === value.size) ?? DEFAULT_QUIZ_SETTINGS.size,
  };
}
