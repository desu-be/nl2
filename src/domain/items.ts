/**
 * Quizzable items: the union of the imported packs. An item id is `<package_id>:<id>`, so reimporting
 * a new version of a pack keeps the progress of every item whose id did not change.
 */
import type { Pack } from './pack/packTypes.ts';
import { normalizeMultiline, normalizeText } from './text.ts';
import { suppliedForms, type VerbForm } from './verbForms.ts';

export type ItemKind = 'word' | 'phrase' | 'verb';

export interface Item {
  id: string;
  kind: ItemKind;
  packageId: string;
  /** Dutch side: term, phrase or infinitive. */
  nl: string;
  /** French side. */
  fr: string;
  categoryIds: readonly string[];
  /** Verbs only: the supplied conjugation forms. */
  forms: readonly VerbForm[];
  partOfSpeech?: string;
  auxiliary?: string;
  exampleNl?: string;
  exampleFr?: string;
  context?: string;
  notes?: string;
}

export const itemId = (packageId: string, id: string) => `${packageId}:${id}`;

const line = (text: string | null | undefined) => (text ? normalizeText(text) || undefined : undefined);
const block = (text: string | null | undefined) => (text ? normalizeMultiline(text) || undefined : undefined);

export function packItems(pack: Pack): Item[] {
  const common = (id: string, categoryIds: string[]) => ({
    id: itemId(pack.package_id, id),
    packageId: pack.package_id,
    categoryIds,
  });
  return [
    ...pack.vocabulary.map((word): Item => ({
      ...common(word.id, word.category_ids),
      kind: 'word',
      nl: normalizeText(word.dutch),
      fr: normalizeText(word.french),
      forms: [],
      partOfSpeech: line(word.part_of_speech),
      exampleNl: line(word.dutch_example),
      exampleFr: line(word.french_example),
      notes: block(word.notes),
    })),
    ...pack.phrases.map((phrase): Item => ({
      ...common(phrase.id, phrase.category_ids),
      kind: 'phrase',
      nl: normalizeText(phrase.dutch),
      fr: normalizeText(phrase.french),
      forms: [],
      context: line(phrase.context),
      notes: block(phrase.notes),
    })),
    ...pack.verbs.map((verb): Item => ({
      ...common(verb.id, verb.category_ids),
      kind: 'verb',
      nl: normalizeText(verb.infinitive),
      fr: normalizeText(verb.french),
      forms: suppliedForms(verb),
      auxiliary: line(verb.auxiliary),
      exampleNl: line(verb.example_dutch),
      exampleFr: line(verb.example_french),
      notes: block(verb.notes),
    })),
  ];
}

/** Every item of every pack, packs taken in `package_id` order. */
export function libraryItems(packs: readonly Pack[]): Item[] {
  return [...packs].sort((a, b) => a.package_id.localeCompare(b.package_id)).flatMap(packItems);
}
