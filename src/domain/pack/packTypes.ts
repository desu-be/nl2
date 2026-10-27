/** Content pack v1 (`nl-desu-content-pack`), stored as imported. */

export const PACK_FORMAT = 'nl-desu-content-pack';
export const PACK_SCHEMA_VERSION = 1;

export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface PackCategory {
  id: string;
  name: string;
  description?: string;
}

export interface PackVocabulary {
  id: string;
  dutch: string;
  french: string;
  category_ids: string[];
  part_of_speech?: string | null;
  dutch_example?: string | null;
  french_example?: string | null;
  notes?: string | null;
  difficulty?: Level | null;
  /** Accepted by validation, ignored by the app. */
  accepted_answers?: string[];
}

export interface PackPhrase {
  id: string;
  dutch: string;
  french: string;
  category_ids: string[];
  context?: string | null;
  notes?: string | null;
  difficulty?: Level | null;
  accepted_answers?: string[];
}

export interface PresentForms {
  ik?: string | null;
  jij_je?: string | null;
  hij_zij_het?: string | null;
  wij_we?: string | null;
  jullie?: string | null;
  zij_ze?: string | null;
}

export interface PackVerb {
  id: string;
  infinitive: string;
  french: string;
  verb_type: 'regular' | 'irregular' | 'modal';
  category_ids: string[];
  present?: PresentForms | null;
  past_singular?: string | null;
  past_plural?: string | null;
  past_participle?: string | null;
  auxiliary?: 'hebben' | 'zijn' | null;
  example_dutch?: string | null;
  example_french?: string | null;
  notes?: string | null;
}

export interface Pack {
  format: typeof PACK_FORMAT;
  schema_version: typeof PACK_SCHEMA_VERSION;
  package_id: string;
  package_version: string;
  title: string;
  description?: string;
  language_pair: 'fr-nl';
  categories: PackCategory[];
  vocabulary: PackVocabulary[];
  phrases: PackPhrase[];
  verbs: PackVerb[];
}

export function recordCount(pack: Pack): number {
  return pack.categories.length + pack.vocabulary.length + pack.phrases.length + pack.verbs.length;
}
