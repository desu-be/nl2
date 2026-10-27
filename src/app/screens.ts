import { homeScreen } from '../ui/screens/home/homeScreen.ts';
import { importScreen } from '../ui/screens/import/importScreen.ts';
import { knownScreen } from '../ui/screens/knownScreen.ts';
import { quizScreen } from '../ui/screens/quiz/quizScreen.ts';
import type { Screen } from '../ui/screens/screen.ts';
import { settingsScreen } from '../ui/screens/settingsScreen.ts';
import type { RouteId } from './routes.ts';

/** The screen rendered for each route. */
export const SCREENS: Record<RouteId, Screen> = {
  home: homeScreen,
  quiz: quizScreen,
  known: knownScreen,
  import: importScreen,
  settings: settingsScreen,
};
