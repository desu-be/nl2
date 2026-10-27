import type { QuizPlan } from '../domain/buildQuiz.ts';
import type { QuizSettings } from '../domain/quizSettings.ts';

export interface QuizRun {
  plan: QuizPlan;
  settings: QuizSettings;
}

/**
 * The quiz in progress, handed from the home screen to the quiz screen. Kept in memory only: a quiz
 * is never persisted, but every answer already given is.
 */
export class QuizSession {
  private run: QuizRun | null = null;

  get current(): QuizRun | null { return this.run; }

  start(run: QuizRun) { this.run = run; }

  clear() { this.run = null; }
}
