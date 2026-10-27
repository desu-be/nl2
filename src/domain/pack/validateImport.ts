import { knownCategorySlugs } from '../categories.ts';
import type { Pack } from './packTypes.ts';
import { validatePack, type PackValidation } from './validatePack.ts';

/** `package_id` of a document, when it parses and has one. */
function peekPackageId(text: string): string | undefined {
  try {
    const id = (JSON.parse(text.replace(/^﻿/, '')) as { package_id?: unknown } | null)?.package_id;
    return typeof id === 'string' ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validates a file about to be imported next to `installed` packs. Categories may be referenced from
 * other packs or the built-in list, but not from the version of the same pack being replaced.
 */
export function validateImport(text: string, installed: readonly Pack[]): PackValidation {
  return validatePack(text, knownCategorySlugs(installed, peekPackageId(text)));
}
