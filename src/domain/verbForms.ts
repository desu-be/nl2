/**
 * Conjugation slots of a verb. Only forms explicitly supplied by a pack are ever asked: nothing is
 * generated from grammatical rules, and a missing or null form is simply not quizzed.
 */
import type { PackVerb } from './pack/packTypes.ts';
import { isBlank, normalizeText } from './text.ts';

export const VERB_SLOTS = [
  'present.ik',
  'present.jij_je',
  'present.hij_zij_het',
  'present.wij_we',
  'present.jullie',
  'present.zij_ze',
  'past_singular',
  'past_plural',
  'past_participle',
] as const;

export type VerbSlot = (typeof VERB_SLOTS)[number];

export interface VerbForm {
  slot: VerbSlot;
  value: string;
}

/** Raw value of a slot, as written in the pack (possibly null, missing or blank). */
export function rawForm(verb: PackVerb, slot: VerbSlot): string | null | undefined {
  if (slot.startsWith('present.')) {
    const person = slot.slice('present.'.length) as keyof NonNullable<PackVerb['present']>;
    return verb.present?.[person];
  }
  return verb[slot as 'past_singular' | 'past_plural' | 'past_participle'];
}

/** The forms a pack supplies for this verb, normalized, in slot order. */
export function suppliedForms(verb: PackVerb): VerbForm[] {
  return VERB_SLOTS.flatMap((slot) => {
    const value = rawForm(verb, slot);
    return typeof value === 'string' && !isBlank(value) ? [{ slot, value: normalizeText(value) }] : [];
  });
}
