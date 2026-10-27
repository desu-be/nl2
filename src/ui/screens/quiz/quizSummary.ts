import { routeHref } from '../../../app/routes.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';

export type Tally = Record<keyof typeof fr.quiz.summary, number>;

export const emptyTally = (): Tally => ({ again: 0, hard: 0, good: 0, known: 0, skipped: 0 });

/** End of a quiz: what was answered, then restart with the same settings or go home. */
export function quizSummary(tally: Tally, restart: () => void): HTMLElement[] {
  const list = el('dl', '', 'counters summary');
  for (const key of Object.keys(fr.quiz.summary) as (keyof Tally)[]) {
    if (!tally[key] && (key === 'known' || key === 'skipped')) continue;
    const cell = el('div', '', `counter counter-${key}`);
    cell.append(el('dt', fr.quiz.summary[key]), el('dd', String(tally[key])));
    list.append(cell);
  }

  const again = el('button', fr.quiz.again, 'button button-primary button-wide');
  again.type = 'button';
  again.addEventListener('click', restart);
  const home = el('a', fr.quiz.backHome, 'button button-wide');
  home.href = routeHref('home');

  const buttons = el('div', '', 'stack');
  buttons.append(again, home);
  return [el('h1', fr.quiz.done, 'screen-title'), list, buttons];
}
