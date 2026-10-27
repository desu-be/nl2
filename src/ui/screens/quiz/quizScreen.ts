import { routeHref } from '../../../app/routes.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';
import { onKeys } from '../../keys.ts';
import { notice } from '../../notice.ts';
import { startQuiz } from '../home/startQuiz.ts';
import type { Screen } from '../screen.ts';
import { questionCard } from './questionCard.ts';
import { ACTION_KEYS, quizActions, type QuizAction } from './quizActions.ts';
import { emptyTally, quizSummary } from './quizSummary.ts';

/**
 * The quiz: prompt, reveal, grade, next question, with no page in between. Every answer is recorded
 * at once, so stopping midway keeps what was answered. Keys: Space or Enter reveal, K « Su » without
 * revealing, S skip, 1 2 3 grade, 0 definitely known, Escape stop.
 */
export const quizScreen: Screen = (root, { library, session, sync }) => {
  const run = session.current;
  if (!run) {
    const link = el('a', fr.quiz.backHome, 'button');
    link.href = routeHref('home');
    root.append(notice(fr.quiz.none), link);
    return;
  }

  const { questions, available } = run.plan;
  const tally = emptyTally();
  let index = 0;
  let revealed = false;
  let finished = false;
  const errors = el('div', '', 'quiz-errors');

  const record = (fields: Parameters<typeof library.record>[0]) => {
    library.record(fields).catch((error: unknown) => {
      console.error('Answer not saved', error);
      errors.replaceChildren(notice(fr.quiz.saveError, 'error'));
    });
  };

  const finish = () => {
    finished = true;
    session.clear();
    void sync.flush();
    root.replaceChildren(...quizSummary(tally, () => startQuiz(library, session, run.settings)), errors);
  };

  const next = () => {
    index += 1;
    revealed = false;
    if (index >= questions.length) finish();
    else render();
  };

  const act = (action: QuizAction) => {
    if (finished) return;
    const question = questions[index];
    const answer = { type: 'answer' as const, item: question.item.id, dir: question.dir, ...(question.form ? { form: question.form } : {}) };
    if (!revealed) {
      if (action === 'reveal') {
        revealed = true;
        return render();
      }
      if (action === 'knewIt') {
        record({ ...answer, grade: 'good', revealed: false });
        tally.good += 1;
      } else if (action === 'skip') {
        record({ ...answer, grade: 'skipped' });
        tally.skipped += 1;
      } else return;
      return next();
    }
    if (action === 'known') {
      record({ type: 'known', item: question.item.id });
      tally.known += 1;
    } else if (action === 'again' || action === 'hard' || action === 'good') {
      record({ ...answer, grade: action });
      tally[action] += 1;
    } else return;
    next();
  };

  const render = () => {
    const header = el('div', '', 'quiz-header');
    const quit = el('button', fr.quiz.quit, 'button button-ghost');
    quit.type = 'button';
    quit.addEventListener('click', finish);
    header.append(el('p', fr.quiz.progress(index + 1, questions.length), 'quiz-progress'), quit);

    const parts: HTMLElement[] = [header];
    if (index === 0 && available < run.settings.size) parts.push(notice(fr.quiz.short(available, run.settings.size)));
    parts.push(questionCard(questions[index], revealed), quizActions(revealed, act), errors);
    root.replaceChildren(...parts);
    // Keep the focus off the action buttons: Space must reveal, not press the last clicked button.
    (document.activeElement as HTMLElement | null)?.blur();
  };

  render();
  const keys = Object.fromEntries(
    (Object.entries(ACTION_KEYS) as [QuizAction, string][]).map(([action, key]) => [key, () => act(action)]),
  );
  const removeKeys = onKeys({ ...keys, Enter: () => act('reveal'), Escape: () => { if (!finished) finish(); } });
  return () => {
    removeKeys();
    // Leaving the screen abandons the quiz; the answers already given stay recorded.
    if (session.current === run) session.clear();
  };
};
