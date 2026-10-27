import type { Pack } from '../../../domain/pack/packTypes.ts';
import { fr } from '../../../i18n/fr.ts';
import type { StoredPack } from '../../../store/packStore.ts';
import { el } from '../../dom.ts';
import { formatDate } from '../../formatDate.ts';

/** Summary of a valid pack before import: title, version, contents, and whether it replaces one. */
export function packPreview(pack: Pack, previous: StoredPack | undefined): HTMLElement {
  const card = el('section', '', 'pack-preview');
  const status = previous
    ? fr.import.update(previous.pack.package_version, formatDate(previous.importedAt))
    : fr.import.newPack;
  card.append(
    el('h2', pack.title, 'section-title'),
    el('p', fr.import.identity(pack.package_id, pack.package_version), 'field-hint'),
    el('p', fr.import.contents(pack.categories.length, pack.vocabulary.length, pack.phrases.length, pack.verbs.length)),
    el('p', status, 'pack-status'),
  );
  if (pack.description) card.append(el('p', pack.description, 'field-hint'));
  return card;
}
