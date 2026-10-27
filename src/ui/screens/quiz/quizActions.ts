import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';

export type QuizAction = 'reveal' | 'knewIt' | 'skip' | 'again' | 'hard' | 'good' | 'known';

/** Keyboard key of each action, shown on the button for desktop use. */
export const ACTION_KEYS: Record<QuizAction, string> = {
  reveal: ' ',
  knewIt: 'k',
  skip: 's',
  again: '1',
  hard: '2',
  good: '3',
  known: '0',
};

const KEY_LABELS: Partial<Record<string, string>> = { ' ': 'Espace' };

const LABELS: Record<QuizAction, string> = {
  reveal: fr.quiz.reveal,
  knewIt: fr.quiz.knewIt,
  skip: fr.quiz.skip,
  again: fr.quiz.grades.again,
  hard: fr.quiz.grades.hard,
  good: fr.quiz.grades.good,
  known: fr.quiz.grades.known,
};

function actionButton(action: QuizAction, run: (action: QuizAction) => void): HTMLButtonElement {
  const button = el('button', '', `button quiz-action action-${action}`);
  button.type = 'button';
  const key = ACTION_KEYS[action];
  button.append(el('span', LABELS[action]), el('kbd', KEY_LABELS[key] ?? key.toUpperCase(), 'key-hint'));
  button.addEventListener('click', () => run(action));
  return button;
}

/** Before the reveal: reveal, « Su » without revealing, skip. After: the four grades. */
export function quizActions(revealed: boolean, run: (action: QuizAction) => void): HTMLElement {
  const bar = el('div', '', `quiz-actions ${revealed ? 'quiz-actions-grades' : 'quiz-actions-ask'}`);
  const actions: QuizAction[] = revealed ? ['again', 'hard', 'good', 'known'] : ['reveal', 'knewIt', 'skip'];
  bar.append(...actions.map((action) => actionButton(action, run)));
  return bar;
}
