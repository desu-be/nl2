import { fr } from '../i18n/fr.ts';
import type { ScreenContext } from '../ui/screens/screen.ts';
import type { HashRouter } from './hashRouter.ts';
import type { RouteId } from './routes.ts';
import { SCREENS } from './screens.ts';

/** Renders the screen of the current route into `host`, replacing (and releasing) the previous one. */
export function mountScreenHost(host: HTMLElement, router: HashRouter, context: ScreenContext) {
  let dispose: (() => void) | void;

  const show = (route: RouteId) => {
    dispose?.();
    host.replaceChildren();
    dispose = SCREENS[route](host, context);
    document.title = route === 'home' ? fr.appTitle : `${fr.nav[route]} · ${fr.appTitle}`;
    scrollTo(0, 0);
  };

  show(router.current);
  router.subscribe(show);
}
