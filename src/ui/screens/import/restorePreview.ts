import type { Library } from '../../../app/library.ts';
import { readExport } from '../../../domain/exportData.ts';
import { fr } from '../../../i18n/fr.ts';
import type { SyncService } from '../../../sync/syncService.ts';
import { el } from '../../dom.ts';
import { formatDate } from '../../formatDate.ts';
import { notice } from '../../notice.ts';

/**
 * Restoration of a full export: what it holds, then « Restaurer ». Packs replace their local copy,
 * events join the log without duplicates; with synchronization, everything is written back.
 * `onDone` runs after a successful restoration.
 */
export function restorePreview(text: string, library: Library, sync: SyncService, onDone: () => void): HTMLElement[] {
  const reading = readExport(text);
  if (!reading.ok) return [notice(fr.import.restoreInvalid, 'error')];

  const card = el('section', '', 'pack-preview');
  card.append(
    el('h2', fr.import.restoreTitle, 'section-title'),
    el('p', fr.import.restoreSummary(formatDate(reading.exportedAt), reading.packs.length, reading.events.length)),
    el('p', fr.import.restoreHint, 'field-hint'),
  );
  if (reading.skipped) card.append(el('p', fr.import.restoreSkipped(reading.skipped), 'pack-status'));

  const message = el('div');
  const confirm = el('button', fr.import.restoreConfirm, 'button button-primary');
  confirm.type = 'button';
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    try {
      await library.restore(reading.packs, reading.events);
      await sync.packImported(...reading.packs.map((pack) => pack.package_id));
      message.replaceChildren(notice(fr.import.restored, 'success'));
      onDone();
    } catch (error) {
      console.error('Restoration failed', error);
      message.replaceChildren(notice(fr.import.saveError, 'error'));
      confirm.disabled = false;
    }
  });
  return [card, confirm, message];
}
