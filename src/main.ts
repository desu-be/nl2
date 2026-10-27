import './styles/index.css';
import { HashRouter } from './app/hashRouter.ts';
import { Library } from './app/library.ts';
import { mountNavigation } from './app/navigation.ts';
import { QuizSession } from './app/quizSession.ts';
import { mountScreenHost } from './app/screenHost.ts';
import { registerServiceWorker } from './app/serviceWorker.ts';
import { fr } from './i18n/fr.ts';
import { requestPersistentStorage } from './store/database.ts';
import { SyncService } from './sync/syncService.ts';
import { byId } from './ui/dom.ts';
import { notice } from './ui/notice.ts';
import { ThemeManager } from './ui/theme/themeManager.ts';

// Composition root: wires modules together, holds no logic of its own.

const themes = new ThemeManager();
const router = new HashRouter();
const library = new Library();
const session = new QuizSession();
const sync = new SyncService(library);
const screen = byId('screen');

mountNavigation(byId('app-nav'), router);
registerServiceWorker();
void requestPersistentStorage();

screen.replaceChildren(notice(fr.loading));
library.load().then(
  async () => {
    await sync.init();
    mountScreenHost(screen, router, { themes, library, session, sync });
  },
  (error: unknown) => {
    console.error('Local data unavailable', error);
    screen.replaceChildren(notice(fr.loadError, 'error'));
  },
);
