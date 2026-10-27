/**
 * A problem found while validating a pack. The message is built by the interface from `code` and
 * `detail`; `location` reads like `vocabulary[3] (it.server) → dutch` and is not translated.
 */
export type IssueCode =
  // Document
  | 'too-large' | 'empty' | 'invalid-json' | 'not-object' | 'format' | 'schema-version' | 'more-errors'
  // Schema
  | 'type' | 'required' | 'unknown-field' | 'too-short' | 'too-long' | 'pattern' | 'enum' | 'const'
  | 'not-unique' | 'control-char'
  // Semantics
  | 'too-many-records' | 'blank' | 'duplicate-category' | 'duplicate-id' | 'unknown-category'
  | 'blank-form' | 'long-form'
  // Warnings
  | 'no-category' | 'no-form' | 'half-past';

export interface PackIssue {
  severity: 'error' | 'warning';
  location: string;
  code: IssueCode;
  detail?: string;
}

export const packError = (location: string, code: IssueCode, detail?: string): PackIssue =>
  ({ severity: 'error', location, code, ...(detail === undefined ? {} : { detail }) });

export const packWarning = (location: string, code: IssueCode, detail?: string): PackIssue =>
  ({ severity: 'warning', location, code, ...(detail === undefined ? {} : { detail }) });

/** `['vocabulary', 3, 'dutch']` → `vocabulary[3] (it.server) → dutch`, with the record id when known. */
export function describeLocation(root: unknown, path: readonly (string | number)[]): string {
  if (path.length === 0) return 'document';
  const [first, second, ...rest] = path;
  let out = String(first);
  let remaining = rest;
  if (typeof second === 'number') {
    out += `[${second}]`;
    const record = (root as Record<string, unknown[]> | null)?.[String(first)]?.[second];
    const id = (record as { id?: unknown } | undefined)?.id;
    if (typeof id === 'string') out += ` (${id})`;
  } else if (second !== undefined) {
    remaining = [second, ...rest];
  }
  return remaining.length ? `${out} → ${remaining.join(' → ')}` : out;
}
