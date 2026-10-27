import type { Question } from '../../../domain/buildQuiz.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';

/** What is asked under the prompt: the target language, or the person and tense of a verb form. */
function askLine(question: Question): string {
  if (question.dir === 'form' && question.form) {
    const { person, tense } = fr.verbSlots[question.form];
    return person ? `${person} (${tense})` : tense;
  }
  return question.dir === 'fr-nl' ? fr.quiz.askNl : fr.quiz.askFr;
}

/** Details shown with the answer: examples, context, notes, auxiliary. Imported text is never parsed as HTML. */
function details(question: Question): HTMLElement[] {
  const { item } = question;
  const parts: HTMLElement[] = [];
  if (item.exampleNl || item.exampleFr) {
    const example = el('div', '', 'answer-example');
    if (item.exampleNl) example.append(el('p', item.exampleNl, 'example-nl'));
    if (item.exampleFr) example.append(el('p', item.exampleFr, 'example-fr'));
    parts.push(example);
  }
  if (item.context) parts.push(el('p', item.context, 'answer-context'));
  if (item.auxiliary && question.form === 'past_participle') parts.push(el('p', fr.quiz.auxiliary(item.auxiliary), 'answer-note'));
  if (item.notes) parts.push(el('p', item.notes, 'answer-note'));
  return parts;
}

/** The question card: prompt, then the answer and its details once revealed. */
export function questionCard(question: Question, revealed: boolean): HTMLElement {
  const card = el('article', '', 'question-card');
  card.append(el('p', question.prompt, 'question-prompt'));
  if (question.dir === 'form') card.append(el('p', question.item.fr, 'question-translation'));
  card.append(el('p', askLine(question), 'question-ask'));
  if (revealed) {
    const answer = el('div', '', 'question-answer');
    answer.append(el('p', question.answer, 'answer-text'), ...details(question));
    card.append(answer);
  }
  return card;
}
