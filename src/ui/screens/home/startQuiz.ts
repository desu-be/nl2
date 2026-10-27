import type { Library } from '../../../app/library.ts';
import type { QuizSession } from '../../../app/quizSession.ts';
import { routeHref } from '../../../app/routes.ts';
import { buildQuiz } from '../../../domain/buildQuiz.ts';
import type { QuizSettings } from '../../../domain/quizSettings.ts';

/** Draws a quiz with `settings` and opens the quiz screen. Returns false when no item matches. */
export function startQuiz(library: Library, session: QuizSession, settings: QuizSettings): boolean {
  const plan = buildQuiz(library.items, library.progress, settings, Date.now(), Math.random);
  if (!plan.questions.length) return false;
  session.start({ plan, settings });
  const target = routeHref('quiz');
  // Restarting from the quiz screen itself: the hash does not change, so announce the route again.
  if (location.hash === target) dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
  return true;
}
