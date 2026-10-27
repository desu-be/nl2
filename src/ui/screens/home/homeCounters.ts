import type { Library } from '../../../app/library.ts';
import { itemStatus } from '../../../domain/itemStatus.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';

export interface Counts {
  due: number;
  unseen: number;
  difficult: number;
  known: number;
}

/** Counters over every quizzable item (verbs without any form are never asked, so not counted). */
export function countItems(library: Library, now: number): Counts {
  const counts: Counts = { due: 0, unseen: 0, difficult: 0, known: 0 };
  for (const item of library.items) {
    if (item.kind === 'verb' && !item.forms.length) continue;
    const status = itemStatus(library.progress.get(item.id), now);
    if (status.known) counts.known += 1;
    else if (!status.seen) counts.unseen += 1;
    if (status.due) counts.due += 1;
    if (status.difficult) counts.difficult += 1;
  }
  return counts;
}

/** Three figures at the top of the home screen: due, never seen, known. */
export function homeCounters(counts: Counts): HTMLElement {
  const list = el('dl', '', 'counters');
  for (const key of ['due', 'unseen', 'known'] as const) {
    const cell = el('div', '', 'counter');
    cell.append(el('dt', fr.home.counters[key]), el('dd', String(counts[key])));
    list.append(cell);
  }
  return list;
}
