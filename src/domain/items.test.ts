import { describe, expect, it } from 'vitest';
import { categoryNames, knownCategorySlugs } from './categories.ts';
import { libraryItems, packItems } from './items.ts';
import { validateImport } from './pack/validateImport.ts';
import { testPack } from './testFixtures.ts';

describe('items', () => {
  it('prefixes ids with the package id and normalizes text', () => {
    const [server] = packItems(testPack());
    expect(server).toMatchObject({ id: 'demo:w.server', kind: 'word', nl: 'de server', fr: 'le serveur', exampleNl: 'De server is down.' });
  });

  it('keeps only the conjugation forms the pack supplies', () => {
    const werken = packItems(testPack()).find((item) => item.id === 'demo:v.werken');
    expect(werken?.forms).toEqual([
      { slot: 'present.ik', value: 'werk' },
      { slot: 'past_participle', value: 'gewerkt' },
    ]);
    expect(werken?.auxiliary).toBe('hebben');
  });

  it('lists the items of every pack, in package id order', () => {
    const other = { ...testPack(), package_id: 'alpha' };
    expect(libraryItems([testPack(), other])[0].id).toBe('alpha:w.server');
  });

  it('names a category after the first pack defining it, by package id', () => {
    const other = { ...testPack(), package_id: 'zeta', categories: [{ id: 'it', name: 'IT' }] };
    expect(categoryNames([other, testPack()]).get('it')).toBe('Informatique');
  });

  it('knows built-in slugs and those of other packs, not those of the pack being replaced', () => {
    const slugs = knownCategorySlugs([testPack()], 'demo');
    expect(slugs.has('general')).toBe(true);
    expect(slugs.has('it')).toBe(false);
    expect(knownCategorySlugs([testPack()]).has('it')).toBe(true);
  });

  it('lets a new pack use the categories of another pack, not of the version it replaces', () => {
    const borrower = { ...testPack(), package_id: 'borrower', categories: [] };
    expect(validateImport(JSON.stringify(borrower), [testPack()]).ok).toBe(true);
    const shrunk = { ...testPack(), categories: [] };
    expect(validateImport(JSON.stringify(shrunk), [testPack()]).ok).toBe(false);
  });
});
