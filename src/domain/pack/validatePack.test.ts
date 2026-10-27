import { describe, expect, it } from 'vitest';
import type { PackIssue } from './packIssue.ts';
import { MAX_PACK_BYTES, validatePack } from './validatePack.ts';

// Test fixtures are mutated freely, so they are left untyped.
type Json = Record<string, any>;

const base = (): Json => ({
  format: 'nl-desu-content-pack',
  schema_version: 1,
  package_id: 'test-pack',
  package_version: '1.0.0',
  title: 'Test',
  language_pair: 'fr-nl',
  categories: [{ id: 'it', name: 'IT' }],
  vocabulary: [{ id: 'v.server', dutch: 'de server', french: 'le serveur', category_ids: ['it'] }],
  phrases: [{ id: 'p.hello', dutch: 'Hallo', french: 'Bonjour', category_ids: ['it'] }],
  verbs: [{
    id: 'verb.zijn', infinitive: 'zijn', french: 'être', verb_type: 'irregular',
    present: { ik: 'ben', jij_je: 'bent', hij_zij_het: 'is', wij_we: 'zijn', jullie: 'zijn', zij_ze: 'zijn' },
    past_singular: 'was', past_plural: 'waren', past_participle: 'geweest', auxiliary: 'zijn', category_ids: ['it'],
  }],
});

const none = new Set<string>();
const check = (pack: Json, known: ReadonlySet<string> = none) => validatePack(JSON.stringify(pack), known);

function errorsOf(pack: Json): PackIssue[] {
  const result = check(pack);
  if (result.ok) throw new Error('expected validation errors');
  return result.errors;
}

const has = (issues: PackIssue[], code: PackIssue['code'], location?: string) =>
  issues.some((issue) => issue.code === code && (location === undefined || issue.location.includes(location)));

function mutated(mutate: (pack: Json) => void): Json {
  const pack = base();
  mutate(pack);
  return pack;
}

describe('validatePack', () => {
  it('accepts a valid pack, whatever its formatting', () => {
    const compact = check(base());
    expect(compact.ok).toBe(true);
    const pretty = validatePack(`﻿${JSON.stringify(base(), null, 2).replace(/\n/g, '\r\n')}`, none);
    expect(pretty.ok && pretty.pack.vocabulary.length).toBe(1);
  });

  it('rejects invalid JSON, empty and non-object documents', () => {
    const invalid = validatePack('{\n  "format": ,\n}', none);
    expect(!invalid.ok && invalid.errors[0].code).toBe('invalid-json');
    const empty = validatePack('  ', none);
    expect(!empty.ok && empty.errors[0].code).toBe('empty');
    const array = validatePack('[]', none);
    expect(!array.ok && array.errors[0].code).toBe('not-object');
  });

  it('rejects an unsupported schema version or format with a dedicated message', () => {
    expect(errorsOf(mutated((p) => { p.schema_version = 2; }))[0]).toMatchObject({ code: 'schema-version', detail: '2' });
    expect(errorsOf(mutated((p) => { p.schema_version = '1'; }))[0].code).toBe('schema-version');
    expect(errorsOf(mutated((p) => { p.format = 'something-else'; }))[0].code).toBe('format');
  });

  it('rejects unknown fields at every level and names the record', () => {
    expect(has(errorsOf(mutated((p) => { p.extra = 1; })), 'unknown-field')).toBe(true);
    const nested = errorsOf(mutated((p) => { p.vocabulary[0].translation = 'oops'; }));
    expect(nested[0]).toMatchObject({ code: 'unknown-field', location: 'vocabulary[0] (v.server)', detail: 'translation' });
    expect(has(errorsOf(mutated((p) => { p.verbs[0].present.u = 'bent'; })), 'unknown-field')).toBe(true);
  });

  it('names the record and the field that is missing', () => {
    const errors = errorsOf(mutated((p) => { delete p.vocabulary[0].french; }));
    expect(errors[0]).toMatchObject({ code: 'required', location: 'vocabulary[0] (v.server)', detail: 'french' });
  });

  it('rejects bad enums, patterns, types and constants', () => {
    expect(has(errorsOf(mutated((p) => { p.vocabulary[0].difficulty = 'expert'; })), 'enum')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.vocabulary[0].id = 'Bad Id!'; })), 'pattern')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.verbs[0].verb_type = 'weird'; })), 'enum')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.verbs[0].auxiliary = 'worden'; })), 'enum')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.language_pair = 'en-nl'; })), 'const')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.vocabulary[0].dutch = 3; })), 'type', 'dutch')).toBe(true);
  });

  it('rejects duplicate ids, shared across words, phrases and verbs', () => {
    expect(has(errorsOf(mutated((p) => {
      p.vocabulary.push({ id: 'v.server', dutch: 'x', french: 'y', category_ids: ['it'] });
    })), 'duplicate-id')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.phrases[0].id = 'v.server'; })), 'duplicate-id')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.categories.push({ id: 'it', name: 'Again' }); })), 'duplicate-category')).toBe(true);
  });

  it('rejects unknown categories unless they already exist', () => {
    const pack = mutated((p) => { p.vocabulary[0].category_ids = ['nowhere']; });
    expect(errorsOf(pack)[0]).toMatchObject({ code: 'unknown-category', detail: 'nowhere' });
    expect(check(pack, new Set(['nowhere'])).ok).toBe(true);
  });

  it('rejects text that is blank after normalization', () => {
    expect(errorsOf(mutated((p) => { p.vocabulary[0].dutch = '   '; }))[0]).toMatchObject({ code: 'blank', detail: 'dutch' });
    expect(has(errorsOf(mutated((p) => { p.title = ' \t '; })), 'blank', 'title')).toBe(true);
    expect(has(errorsOf(mutated((p) => { p.vocabulary[0].accepted_answers = ['  ']; })), 'blank')).toBe(true);
  });

  it('rejects malformed conjugations and accepts gaps without inventing forms', () => {
    expect(errorsOf(mutated((p) => { p.verbs[0].present.ik = '  '; }))[0]).toMatchObject({ code: 'blank-form', detail: 'present.ik' });
    expect(errorsOf(mutated((p) => { p.verbs[0].present.ik = 'ben\nbent'; }))[0]).toMatchObject({ code: 'long-form' });
    const gaps = check(mutated((p) => { p.verbs[0].present.jullie = null; p.verbs[0].past_plural = null; }));
    expect(gaps.ok).toBe(true);
    if (gaps.ok) {
      expect(gaps.pack.verbs[0].present?.jullie).toBeNull();
      expect(has(gaps.warnings, 'half-past')).toBe(true);
    }
  });

  it('warns about a verb without any form and an item without category', () => {
    const result = check(mutated((p) => {
      p.verbs[0] = { id: 'verb.x', infinitive: 'x', french: 'x', verb_type: 'regular', category_ids: [] };
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(has(result.warnings, 'no-form')).toBe(true);
      expect(has(result.warnings, 'no-category')).toBe(true);
    }
  });

  it('rejects control characters but allows newlines and tabs', () => {
    expect(errorsOf(mutated((p) => { p.vocabulary[0].notes = 'bad \u0007 bell'; }))[0].code).toBe('control-char');
    expect(check(mutated((p) => { p.vocabulary[0].notes = 'line one\nline two\tindented'; })).ok).toBe(true);
  });

  it('enforces the size and record limits', () => {
    const huge = mutated((p) => { p.description = 'x'.repeat(MAX_PACK_BYTES); });
    expect(errorsOf(huge)[0].code).toBe('too-large');
    const many = mutated((p) => {
      p.vocabulary = Array.from({ length: 5001 }, (_, i) => ({ id: `v.${i}`, dutch: 'a', french: 'b', category_ids: ['it'] }));
    });
    expect(has(errorsOf(many), 'too-many-records')).toBe(true);
  });

  it('rejects every case of the format contract, whether by schema or semantics', () => {
    const cases: ((p: Json) => void)[] = [
      (p) => { p.package_id = 'UPPER'; },
      (p) => { p.package_version = ''; },
      (p) => { p.categories[0].name = ''; },
      (p) => { p.vocabulary[0].category_ids = ['it', 'it']; },
      (p) => { p.vocabulary[0].accepted_answers = ['a', 'a']; },
      (p) => { p.phrases[0].french = ''; },
      (p) => { p.verbs[0].infinitive = ''; },
      (p) => { p.vocabulary[0].dutch = 'x'.repeat(251); },
    ];
    cases.forEach((mutate, index) => expect(check(mutated(mutate)).ok, `case ${index}`).toBe(false));
  });
});
