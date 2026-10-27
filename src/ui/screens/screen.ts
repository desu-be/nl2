import type { Library } from '../../app/library.ts';
import type { QuizSession } from '../../app/quizSession.ts';
import type { SyncService } from '../../sync/syncService.ts';
import type { ThemeManager } from '../theme/themeManager.ts';

/** Shared services a screen may use. */
export interface ScreenContext {
  themes: ThemeManager;
  library: Library;
  session: QuizSession;
  sync: SyncService;
}

/** Renders a screen into `root`; the returned function, if any, releases its subscriptions. */
export type Screen = (root: HTMLElement, context: ScreenContext) => (() => void) | void;
