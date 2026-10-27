import { routeHref } from '../../../app/routes.ts';
import { STATUS_FILTERS, type QuizSettings, type StatusFilter } from '../../../domain/quizSettings.ts';
import { fr } from '../../../i18n/fr.ts';
import { loadQuizSettings, saveQuizSettings } from '../../../store/quizSettingsStore.ts';
import { el } from '../../dom.ts';
import { onKeys } from '../../keys.ts';
import { notice } from '../../notice.ts';
import { syncStatusLine } from '../../syncStatusLine.ts';
import type { Screen, ScreenContext } from '../screen.ts';
import { screenHeader } from '../screenHeader.ts';
import { countItems, homeCounters } from './homeCounters.ts';
import { quizSettingsForm } from './quizSettingsForm.ts';
import { startQuiz } from './startQuiz.ts';

/** The launcher itself: counters, quick starts and the custom quiz form, or an invitation to import. */
function launcher({ library, session }: ScreenContext): { parts: HTMLElement[]; launchCustom?: () => void } {
  if (!library.items.length) {
    const link = el('a', fr.home.emptyAction, 'button button-primary');
    link.href = routeHref('import');
    return { parts: [notice(fr.home.empty), link] };
  }

  const slugs = new Set(library.items.flatMap((item) => item.categoryIds));
  const stored = loadQuizSettings();
  let settings: QuizSettings = { ...stored, categoryIds: stored.categoryIds.filter((slug) => slugs.has(slug)) };
  const message = el('div', '', 'home-message');

  const launch = (chosen: QuizSettings) => {
    message.replaceChildren();
    if (!startQuiz(library, session, chosen)) message.append(notice(fr.home.nothing, 'error'));
  };

  const counts = countItems(library, Date.now());
  const quick = el('div', '', 'quick-starts');
  const quickCount: Record<StatusFilter, number> = { due: counts.due, unseen: counts.unseen, difficult: counts.difficult };
  for (const status of STATUS_FILTERS) {
    const button = el('button', '', 'button quick-start');
    button.type = 'button';
    button.append(el('span', fr.home.quick[status]), el('span', String(quickCount[status]), 'badge'));
    button.disabled = quickCount[status] === 0;
    button.addEventListener('click', () => launch({ ...settings, sources: ['word', 'phrase', 'verb'], statuses: [status], categoryIds: [] }));
    quick.append(button);
  }

  const start = el('button', fr.home.start, 'button button-primary button-wide');
  start.type = 'button';
  start.addEventListener('click', () => launch(settings));

  const form = quizSettingsForm(library, settings, (next) => {
    settings = next;
    saveQuizSettings(settings);
  });
  return {
    parts: [homeCounters(counts), el('h2', fr.home.quickStart, 'section-title'), quick, form, message, start],
    launchCustom: () => launch(settings),
  };
}

/**
 * Home: the quiz launcher, under the synchronization state. Quick starts (due, new, difficult) take
 * all the content, as counted on their badge, with the current direction and size. Enter launches
 * the custom quiz. The launcher is rebuilt when a synchronization brings new data, unless the quiz
 * form is being used.
 */
export const homeScreen: Screen = (root, context) => {
  const status = syncStatusLine(context.sync);
  const body = el('div');
  let launchCustom: (() => void) | undefined;

  const render = () => {
    const built = launcher(context);
    launchCustom = built.launchCustom;
    body.replaceChildren(...built.parts);
  };
  root.append(...screenHeader(fr.screens.home.title), status.element, body);
  render();

  let lastCount = context.library.items.length;
  const stopListening = context.library.subscribe(() => {
    const count = context.library.items.length;
    const usingForm = body.contains(document.activeElement) && document.activeElement !== document.body;
    if (count !== lastCount || !usingForm) render();
    lastCount = count;
  });
  const removeKeys = onKeys({ Enter: () => launchCustom?.() });
  return () => {
    status.dispose();
    stopListening();
    removeKeys();
  };
};
