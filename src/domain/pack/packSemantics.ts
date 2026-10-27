/**
 * Checks the schema cannot express: blank text after normalization, unique ids, category references
 * and conjugation forms.
 */
import { isBlank } from '../text.ts';
import { rawForm, VERB_SLOTS } from '../verbForms.ts';
import { packError, packWarning, type PackIssue } from './packIssue.ts';
import { recordCount, type Pack } from './packTypes.ts';

export const MAX_RECORDS = 5_000;
const MAX_FORM_LENGTH = 100;

const where = (kind: string, index: number, id: string) => `${kind}[${index}] (${id})`;

/**
 * `knownCategories`: slugs that exist outside this pack (other imported packs, built-in categories).
 */
export function checkPackSemantics(pack: Pack, knownCategories: ReadonlySet<string>): PackIssue[] {
  const issues: PackIssue[] = [];

  if (recordCount(pack) > MAX_RECORDS) issues.push(packError('document', 'too-many-records', String(MAX_RECORDS)));
  if (isBlank(pack.title)) issues.push(packError('title', 'blank', 'title'));
  if (isBlank(pack.package_version)) issues.push(packError('package_version', 'blank', 'package_version'));

  // Categories form one namespace; words, phrases and verbs share another.
  const categoryIndex = new Map<string, number>();
  pack.categories.forEach((category, index) => {
    const here = where('categories', index, category.id);
    if (isBlank(category.name)) issues.push(packError(here, 'blank', 'name'));
    const first = categoryIndex.get(category.id);
    if (first === undefined) categoryIndex.set(category.id, index);
    else issues.push(packError(here, 'duplicate-category', `categories[${first}]`));
  });

  const itemIndex = new Map<string, string>();
  const checkRecord = (kind: string, index: number, record: { id: string; category_ids: string[] }, texts: Record<string, string>) => {
    const here = where(kind, index, record.id);
    const previous = itemIndex.get(record.id);
    if (previous === undefined) itemIndex.set(record.id, `${kind}[${index}]`);
    else issues.push(packError(here, 'duplicate-id', previous));
    for (const [field, value] of Object.entries(texts)) if (isBlank(value)) issues.push(packError(here, 'blank', field));
    if (record.category_ids.length === 0) issues.push(packWarning(here, 'no-category'));
    for (const slug of record.category_ids) {
      if (!categoryIndex.has(slug) && !knownCategories.has(slug)) issues.push(packError(here, 'unknown-category', slug));
    }
    return here;
  };

  // Accepted answers are ignored by the app, but they are part of the format and must stay valid.
  const checkAccepted = (here: string, answers: string[] | undefined) => {
    if (answers?.some(isBlank)) issues.push(packError(here, 'blank', 'accepted_answers'));
  };
  pack.vocabulary.forEach((word, index) =>
    checkAccepted(checkRecord('vocabulary', index, word, { dutch: word.dutch, french: word.french }), word.accepted_answers));
  pack.phrases.forEach((phrase, index) =>
    checkAccepted(checkRecord('phrases', index, phrase, { dutch: phrase.dutch, french: phrase.french }), phrase.accepted_answers));
  pack.verbs.forEach((verb, index) => {
    const here = checkRecord('verbs', index, verb, { infinitive: verb.infinitive, french: verb.french });
    let supplied = 0;
    for (const slot of VERB_SLOTS) {
      const value = rawForm(verb, slot);
      if (typeof value !== 'string') continue;
      if (isBlank(value)) issues.push(packError(here, 'blank-form', slot));
      else if ([...value].length > MAX_FORM_LENGTH || value.includes('\n')) issues.push(packError(here, 'long-form', slot));
      else supplied += 1;
    }
    if (supplied === 0) issues.push(packWarning(here, 'no-form'));
    else if ((verb.past_singular == null) !== (verb.past_plural == null)) issues.push(packWarning(here, 'half-past'));
  });

  return issues;
}
