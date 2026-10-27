/** Shared test data: a tiny synthetic pack and an event factory. Used by the Vitest suites only. */
import type { Pack } from './pack/packTypes.ts';
import type { AnswerGrade, ProgressEvent } from './progressEvents.ts';

export const T0 = Date.UTC(2026, 10, 3, 7);
export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const testPack = (): Pack => ({
  format: 'nl-desu-content-pack',
  schema_version: 1,
  package_id: 'demo',
  package_version: '1.0.0',
  title: 'Demo',
  language_pair: 'fr-nl',
  categories: [{ id: 'it', name: 'Informatique' }, { id: 'office', name: 'Bureau' }],
  vocabulary: [
    { id: 'w.server', dutch: '  de   server ', french: 'le serveur', category_ids: ['it'], dutch_example: 'De server is down.' },
    { id: 'w.desk', dutch: 'het bureau', french: 'le bureau', category_ids: ['office'] },
    { id: 'w.screen', dutch: 'het scherm', french: "l'écran", category_ids: ['it', 'office'] },
  ],
  phrases: [{ id: 'p.hello', dutch: 'Hallo allemaal.', french: 'Bonjour à tous.', category_ids: ['office'], context: 'Réunion' }],
  verbs: [
    {
      id: 'v.werken', infinitive: 'werken', french: 'travailler', verb_type: 'regular', category_ids: ['office'],
      present: { ik: 'werk', jij_je: null }, past_participle: 'gewerkt', auxiliary: 'hebben',
    },
    { id: 'v.empty', infinitive: 'leeg', french: 'vide', verb_type: 'regular', category_ids: ['office'] },
  ],
});

let counter = 0;

export function answer(item: string, grade: AnswerGrade, at: number, device = 'pc'): ProgressEvent {
  counter += 1;
  return { id: `E${String(counter).padStart(6, '0')}`, at: new Date(at).toISOString(), device, type: 'answer', item, dir: 'fr-nl', grade };
}

export function flag(type: 'known' | 'unknown', item: string, at: number, device = 'pc'): ProgressEvent {
  counter += 1;
  return { id: `E${String(counter).padStart(6, '0')}`, at: new Date(at).toISOString(), device, type, item };
}
