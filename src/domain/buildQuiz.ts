/**
 * Builds a quiz: filters the pool, draws items weighted by difficulty, then turns each into a
 * question. Words and phrases are asked in a direction; verbs are asked as one supplied
 * conjugation form, drawn at random.
 */
import type { Item } from './items.ts';
import { itemStatus } from './itemStatus.ts';
import type { Direction } from './progressEvents.ts';
import type { QuizSettings } from './quizSettings.ts';
import { weightedSample, type Random } from './random.ts';
import type { ProgressMap } from './replay.ts';
import type { VerbSlot } from './verbForms.ts';

export interface Question {
  item: Item;
  dir: Direction;
  /** Conjugation questions: the slot asked. */
  form?: VerbSlot;
  prompt: string;
  answer: string;
}

export interface QuizPlan {
  questions: Question[];
  /** Size of the matching pool: smaller than the requested size when the quiz is short. */
  available: number;
}

/** Items matching the settings at `now`. Known items never qualify. */
export function quizPool(items: readonly Item[], progress: ProgressMap, settings: QuizSettings, now: number): Item[] {
  return items.filter((item) => {
    if (!settings.sources.includes(item.kind)) return false;
    if (item.kind === 'verb' && item.forms.length === 0) return false;
    if (settings.categoryIds.length && !item.categoryIds.some((id) => settings.categoryIds.includes(id))) return false;
    const status = itemStatus(progress.get(item.id), now);
    if (status.known) return false;
    if (!settings.statuses.length) return true;
    return settings.statuses.some((filter) => (filter === 'unseen' ? !status.seen : status[filter]));
  });
}

export function buildQuiz(items: readonly Item[], progress: ProgressMap, settings: QuizSettings, now: number, random: Random): QuizPlan {
  const pool = quizPool(items, progress, settings, now);
  const picked = weightedSample(
    pool.map((item) => ({ value: item, weight: itemStatus(progress.get(item.id), now).weight })),
    Math.max(1, settings.size),
    random,
  );
  return { questions: picked.map((item) => makeQuestion(item, settings, random)), available: pool.length };
}

export function makeQuestion(item: Item, settings: QuizSettings, random: Random): Question {
  if (item.kind === 'verb') {
    const { slot, value } = item.forms[Math.floor(random() * item.forms.length)];
    return { item, dir: 'form', form: slot, prompt: item.nl, answer: value };
  }
  const dir: Direction = settings.direction === 'mixed' ? (random() < 0.5 ? 'fr-nl' : 'nl-fr') : settings.direction;
  return dir === 'fr-nl'
    ? { item, dir, prompt: item.fr, answer: item.nl }
    : { item, dir, prompt: item.nl, answer: item.fr };
}
