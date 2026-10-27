import { recordCount } from '../../../domain/pack/packTypes.ts';
import { fr } from '../../../i18n/fr.ts';
import type { StoredPack } from '../../../store/packStore.ts';
import { el } from '../../dom.ts';
import { formatDate } from '../../formatDate.ts';

/** The packs already imported, by title. */
export function packList(packs: readonly StoredPack[]): HTMLElement {
  const section = el('section', '', 'pack-list');
  section.append(el('h2', fr.import.installed, 'section-title'));
  if (!packs.length) {
    section.append(el('p', fr.import.none, 'field-hint'));
    return section;
  }
  const list = el('ul');
  for (const { pack, importedAt } of [...packs].sort((a, b) => a.pack.title.localeCompare(b.pack.title, 'fr'))) {
    const items = recordCount(pack) - pack.categories.length;
    const line = el('li', '', 'pack-row');
    line.append(el('span', pack.title, 'pack-title'), el('span', fr.import.packLine(pack.package_version, formatDate(importedAt), items), 'field-hint'));
    list.append(line);
  }
  section.append(list);
  return section;
}
