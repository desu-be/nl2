/**
 * Scheduler grades. The quiz buttons map to again (« Pas su »), hard (« Partiellement ») and good
 * (« Su »); easy completes the scheduler rules but no button produces it.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

export function isGrade(value: unknown): value is Grade {
  return (GRADES as readonly unknown[]).includes(value);
}
