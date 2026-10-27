import type { Library } from '../../../app/library.ts';
import { buildExport, exportFileName } from '../../../domain/exportData.ts';
import { fr } from '../../../i18n/fr.ts';
import { downloadJson } from '../../downloadJson.ts';
import { el } from '../../dom.ts';

/** « Données »: download the full export (packs and progress log), a backup outside the data repository. */
export function exportSection(library: Library): HTMLElement {
  const section = el('section', '', 'settings-section');
  const button = el('button', fr.settings.export, 'button');
  button.type = 'button';
  button.addEventListener('click', () => {
    const now = Date.now();
    downloadJson(exportFileName(now), buildExport(library.packs.map((stored) => stored.pack), library.eventLog, now));
  });
  section.append(el('h2', fr.settings.data, 'section-title'), el('p', fr.settings.exportHint, 'field-hint'), button);
  return section;
}
