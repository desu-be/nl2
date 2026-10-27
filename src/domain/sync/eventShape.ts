/**
 * Shape check of an event read from the data repository: the files may have been edited by hand, so
 * nothing is trusted before it is checked.
 */
import type { ProgressEvent } from '../progressEvents.ts';
import { VERB_SLOTS } from '../verbForms.ts';

const DIRECTIONS = ['fr-nl', 'nl-fr', 'form'];
const GRADES = ['again', 'hard', 'good', 'skipped'];

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 300;

export function isProgressEvent(value: unknown): value is ProgressEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  if (!isText(event.id) || !isText(event.device) || !isText(event.item)) return false;
  if (typeof event.at !== 'string' || Number.isNaN(Date.parse(event.at))) return false;
  switch (event.type) {
    case 'known':
    case 'unknown':
      return true;
    case 'answer':
      return DIRECTIONS.includes(event.dir as string)
        && GRADES.includes(event.grade as string)
        && (event.form === undefined || (VERB_SLOTS as readonly unknown[]).includes(event.form))
        && (event.revealed === undefined || event.revealed === false);
    default:
      return false;
  }
}
