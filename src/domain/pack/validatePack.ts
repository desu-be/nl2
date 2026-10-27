/**
 * Full validation of a pack file: size, JSON, format and version first (the two things an AI most
 * often gets wrong get their own message), then the schema, control characters and semantics.
 */
import { packError, type PackIssue } from './packIssue.ts';
import { checkControlCharacters, checkPackSchema } from './packSchema.ts';
import { checkPackSemantics } from './packSemantics.ts';
import { PACK_FORMAT, PACK_SCHEMA_VERSION, type Pack } from './packTypes.ts';

export const MAX_PACK_BYTES = 2 * 1024 * 1024;
const MAX_REPORTED_ERRORS = 50;

export type PackValidation =
  | { ok: true; pack: Pack; warnings: PackIssue[] }
  | { ok: false; errors: PackIssue[] };

const fail = (...errors: PackIssue[]): PackValidation => ({ ok: false, errors });

export function validatePack(text: string, knownCategories: ReadonlySet<string>): PackValidation {
  if (new TextEncoder().encode(text).length > MAX_PACK_BYTES) return fail(packError('document', 'too-large', String(MAX_PACK_BYTES)));
  const source = text.replace(/^﻿/, '');
  if (source.trim() === '') return fail(packError('document', 'empty'));

  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch (error) {
    return fail(packError('document', 'invalid-json', error instanceof Error ? error.message : String(error)));
  }
  if (typeof document !== 'object' || document === null || Array.isArray(document)) return fail(packError('document', 'not-object'));

  const top = document as Record<string, unknown>;
  if (top.format !== PACK_FORMAT) return fail(packError('format', 'format', JSON.stringify(top.format ?? null)));
  if (top.schema_version !== PACK_SCHEMA_VERSION) return fail(packError('schema_version', 'schema-version', JSON.stringify(top.schema_version ?? null)));

  const schemaErrors = checkPackSchema(document);
  if (schemaErrors.length) {
    const shown = schemaErrors.slice(0, MAX_REPORTED_ERRORS);
    if (schemaErrors.length > MAX_REPORTED_ERRORS) {
      shown.push(packError('document', 'more-errors', String(schemaErrors.length - MAX_REPORTED_ERRORS)));
    }
    return fail(...shown);
  }

  const controlErrors = checkControlCharacters(document);
  if (controlErrors.length) return fail(...controlErrors);

  const pack = document as Pack;
  const issues = checkPackSemantics(pack, knownCategories);
  const errors = issues.filter((issue) => issue.severity === 'error');
  if (errors.length) return fail(...errors);
  return { ok: true, pack, warnings: issues.filter((issue) => issue.severity === 'warning') };
}
