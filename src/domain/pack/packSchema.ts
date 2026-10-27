/**
 * Structural checks of a pack v1, mirroring the JSON Schema of the format rule for rule (types,
 * lengths, patterns, enums, unknown fields). Hand-written rather than run
 * by a JSON Schema library: such libraries compile validators with `new Function`, which the
 * Content Security Policy forbids.
 */
import { describeLocation, packError, type PackIssue } from './packIssue.ts';

type Path = (string | number)[];

type Rule =
  | { kind: 'const'; value: string | number }
  | { kind: 'string'; nullable?: boolean; min?: number; max?: number; pattern?: RegExp; values?: readonly string[] }
  | { kind: 'array'; items: Rule; unique?: boolean }
  | { kind: 'object'; nullable?: boolean; required: readonly string[]; properties: Record<string, Rule> };

const SLUG = /^[a-z0-9][a-z0-9._-]*$/;
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const id: Rule = { kind: 'string', min: 1, max: 120, pattern: SLUG };
const text = (max: number, min = 0): Rule => ({ kind: 'string', min, max });
const optionalText = (max?: number): Rule => ({ kind: 'string', nullable: true, max });
const categoryIds: Rule = { kind: 'array', items: id, unique: true };
const level: Rule = { kind: 'string', nullable: true, values: LEVELS };
const accepted = (max: number): Rule => ({ kind: 'array', items: text(max, 1), unique: true });
const form: Rule = { kind: 'string', nullable: true };

const category: Rule = {
  kind: 'object',
  required: ['id', 'name'],
  properties: { id, name: text(100, 1), description: text(1000) },
};

const vocabulary: Rule = {
  kind: 'object',
  required: ['id', 'dutch', 'french', 'category_ids'],
  properties: {
    id,
    dutch: text(250, 1),
    french: text(500, 1),
    part_of_speech: optionalText(50),
    dutch_example: optionalText(1000),
    french_example: optionalText(1000),
    notes: optionalText(3000),
    difficulty: level,
    category_ids: categoryIds,
    accepted_answers: accepted(500),
  },
};

const phrase: Rule = {
  kind: 'object',
  required: ['id', 'dutch', 'french', 'category_ids'],
  properties: {
    id,
    dutch: text(1000, 1),
    french: text(1000, 1),
    context: optionalText(500),
    notes: optionalText(3000),
    difficulty: level,
    category_ids: categoryIds,
    accepted_answers: accepted(1000),
  },
};

const verb: Rule = {
  kind: 'object',
  required: ['id', 'infinitive', 'french', 'verb_type', 'category_ids'],
  properties: {
    id,
    infinitive: text(100, 1),
    french: text(500, 1),
    verb_type: { kind: 'string', values: ['regular', 'irregular', 'modal'] },
    present: {
      kind: 'object',
      nullable: true,
      required: [],
      properties: { ik: form, jij_je: form, hij_zij_het: form, wij_we: form, jullie: form, zij_ze: form },
    },
    past_singular: form,
    past_plural: form,
    past_participle: form,
    auxiliary: { kind: 'string', nullable: true, values: ['hebben', 'zijn'] },
    example_dutch: optionalText(1000),
    example_french: optionalText(1000),
    notes: optionalText(3000),
    category_ids: categoryIds,
  },
};

const PACK: Rule = {
  kind: 'object',
  required: [
    'format', 'schema_version', 'package_id', 'package_version', 'title', 'language_pair',
    'categories', 'vocabulary', 'phrases', 'verbs',
  ],
  properties: {
    format: { kind: 'const', value: 'nl-desu-content-pack' },
    schema_version: { kind: 'const', value: 1 },
    package_id: { kind: 'string', min: 1, max: 100, pattern: SLUG },
    package_version: text(40, 1),
    title: text(200, 1),
    description: text(2000),
    language_pair: { kind: 'const', value: 'fr-nl' },
    categories: { kind: 'array', items: category },
    vocabulary: { kind: 'array', items: vocabulary },
    phrases: { kind: 'array', items: phrase },
    verbs: { kind: 'array', items: verb },
  },
};

/** Every schema violation of `document`, in document order. */
export function checkPackSchema(document: unknown): PackIssue[] {
  const issues: PackIssue[] = [];
  check(document, PACK, [], (path, code, detail) => issues.push(packError(describeLocation(document, path), code, detail)));
  return issues;
}

type Report = (path: Path, code: PackIssue['code'], detail?: string) => void;

function check(value: unknown, rule: Rule, path: Path, report: Report) {
  if (value === null && 'nullable' in rule && rule.nullable) return;
  switch (rule.kind) {
    case 'const':
      if (value !== rule.value) report(path, 'const', String(rule.value));
      return;
    case 'string': {
      if (typeof value !== 'string') return report(path, 'type', rule.nullable ? 'string|null' : 'string');
      const length = [...value].length;
      if (rule.min !== undefined && length < rule.min) report(path, 'too-short', String(rule.min));
      if (rule.max !== undefined && length > rule.max) report(path, 'too-long', String(rule.max));
      if (rule.pattern && !rule.pattern.test(value)) report(path, 'pattern', rule.pattern.source);
      if (rule.values && !rule.values.includes(value)) report(path, 'enum', rule.values.join(', '));
      return;
    }
    case 'array': {
      if (!Array.isArray(value)) return report(path, 'type', 'array');
      value.forEach((item, index) => check(item, rule.items, [...path, index], report));
      if (rule.unique && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) report(path, 'not-unique');
      return;
    }
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return report(path, 'type', rule.nullable ? 'object|null' : 'object');
      }
      const record = value as Record<string, unknown>;
      for (const key of rule.required) if (!(key in record)) report(path, 'required', key);
      for (const [key, item] of Object.entries(record)) {
        const itemRule = rule.properties[key];
        if (itemRule) check(item, itemRule, [...path, key], report);
        else report(path, 'unknown-field', key);
      }
    }
  }
}

/** Strings holding a control character other than tab and line breaks. */
export function checkControlCharacters(document: unknown): PackIssue[] {
  const issues: PackIssue[] = [];
  const walk = (value: unknown, path: Path) => {
    if (typeof value === 'string') {
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(value)) {
        issues.push(packError(describeLocation(document, path), 'control-char'));
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, index]));
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, item] of Object.entries(value)) walk(item, [...path, key]);
    }
  };
  walk(document, []);
  return issues;
}
