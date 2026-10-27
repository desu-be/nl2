import type { Pack } from '../../../domain/pack/packTypes.ts';
import { isExportDocument } from '../../../domain/exportData.ts';
import { validateImport } from '../../../domain/pack/validateImport.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';
import { notice } from '../../notice.ts';
import type { Screen } from '../screen.ts';
import { screenHeader } from '../screenHeader.ts';
import { issueList } from './issueList.ts';
import { packList } from './packList.ts';
import { packPreview } from './packPreview.ts';
import { restorePreview } from './restorePreview.ts';

/**
 * « Import »: pick a pack file, read the validation report and preview, then confirm. Reimporting a
 * pack replaces its previous version and keeps the progress of every item whose id is unchanged.
 * A full export picked here is restored instead.
 */
export const importScreen: Screen = (root, { library, sync }) => {
  root.append(...screenHeader(fr.screens.import.title, fr.screens.import.intro));

  const input = el('input', '', 'visually-hidden');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.id = 'pack-file';
  const picker = el('label', fr.import.choose, 'button button-primary');
  picker.htmlFor = input.id;

  const result = el('div', '', 'import-result');
  const installed = el('div');
  const showInstalled = () => installed.replaceChildren(packList(library.packs));

  const confirm = (pack: Pack) => {
    const save = el('button', fr.import.confirm, 'button button-primary');
    save.type = 'button';
    const cancel = el('button', fr.import.cancel, 'button');
    cancel.type = 'button';
    cancel.addEventListener('click', () => result.replaceChildren());
    save.addEventListener('click', async () => {
      save.disabled = cancel.disabled = true;
      try {
        await library.importPack(pack);
        void sync.packImported(pack.package_id);
        result.replaceChildren(notice(fr.import.saved(pack.title), 'success'));
        showInstalled();
      } catch (error) {
        console.error('Pack not saved', error);
        result.append(notice(fr.import.saveError, 'error'));
        save.disabled = cancel.disabled = false;
      }
    });
    const row = el('div', '', 'button-row');
    row.append(save, cancel);
    return row;
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    result.replaceChildren(notice(fr.import.reading));
    const text = await file.text();
    if (isExportDocument(text)) {
      result.replaceChildren(...restorePreview(text, library, sync, showInstalled));
      return;
    }
    const validation = validateImport(text, library.packs.map((stored) => stored.pack));
    if (!validation.ok) {
      result.replaceChildren(issueList(fr.import.invalid, validation.errors, 'error'));
      return;
    }
    const { pack, warnings } = validation;
    const previous = library.packs.find((stored) => stored.pack.package_id === pack.package_id);
    result.replaceChildren(packPreview(pack, previous));
    if (warnings.length) result.append(issueList(fr.import.warnings, warnings, 'warning'));
    result.append(confirm(pack));
  });

  root.append(input, picker, result, installed);
  showInstalled();
};
