/**
 * Categories are global slugs. A pack may reference a category defined by another pack or one of
 * the built-in slugs below. The display name comes from the first pack, by
 * `package_id`, that defines the slug; built-in slugs are named by the interface.
 */
import type { Pack } from './pack/packTypes.ts';

export const BUILTIN_CATEGORIES = ['general', 'it-computing', 'meetings', 'time-and-dates', 'directions', 'daily-life'] as const;

/** Slug → name defined by the packs (built-in slugs without a pack definition are absent). */
export function categoryNames(packs: readonly Pack[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const pack of [...packs].sort((a, b) => a.package_id.localeCompare(b.package_id))) {
    for (const category of pack.categories) if (!names.has(category.id)) names.set(category.id, category.name);
  }
  return names;
}

/** Slugs a new pack may reference without defining them, excluding the pack it replaces. */
export function knownCategorySlugs(packs: readonly Pack[], replacedPackageId?: string): Set<string> {
  const slugs = new Set<string>(BUILTIN_CATEGORIES);
  for (const pack of packs) {
    if (pack.package_id === replacedPackageId) continue;
    for (const category of pack.categories) slugs.add(category.id);
  }
  return slugs;
}
