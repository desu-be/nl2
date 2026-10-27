/**
 * Progress is an append-only log of events, one file per device: a device never writes another
 * device's events, so two devices can never conflict. The state is rebuilt by replaying them.
 */
import type { Grade } from './grade.ts';
import type { VerbSlot } from './verbForms.ts';

export type Direction = 'fr-nl' | 'nl-fr' | 'form';

/** The quiz never produces `easy`; `skipped` is history only (not an answer, not « seen »). */
export type AnswerGrade = Exclude<Grade, 'easy'> | 'skipped';

interface EventBase {
  /** ULID: unique without coordination, sortable by time. */
  id: string;
  /** ISO 8601 UTC, from the device clock. */
  at: string;
  device: string;
}

export interface AnswerEvent extends EventBase {
  type: 'answer';
  item: string;
  dir: Direction;
  /** Conjugation questions: the form that was asked. */
  form?: VerbSlot;
  grade: AnswerGrade;
  /** Present and false when « Su » was given without revealing the answer. */
  revealed?: false;
}

/** « Définitivement connu »: the item leaves every quiz until reactivated. */
export interface KnownEvent extends EventBase {
  type: 'known';
  item: string;
}

/** Reactivation from the « Connus » page. */
export interface UnknownEvent extends EventBase {
  type: 'unknown';
  item: string;
}

export type ProgressEvent = AnswerEvent | KnownEvent | UnknownEvent;

/** Replay order: time, then device, then id. Total and independent of file arrival order. */
export function compareEvents(a: ProgressEvent, b: ProgressEvent): number {
  const byTime = Date.parse(a.at) - Date.parse(b.at);
  if (byTime) return byTime;
  if (a.device !== b.device) return a.device < b.device ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
