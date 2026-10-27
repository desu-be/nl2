import { fr } from '../i18n/fr.ts';
import { el } from '../ui/dom.ts';
import type { HashRouter } from './hashRouter.ts';
import { NAV_ROUTES, routeHref } from './routes.ts';

/** Fills the top bar with one link per screen; the current one is marked for screen readers and CSS. */
export function mountNavigation(nav: HTMLElement, router: HashRouter) {
  const links = NAV_ROUTES.map((id) => {
    const link = el('a', fr.nav[id], 'nav-link');
    link.href = routeHref(id);
    link.dataset.route = id;
    return link;
  });
  nav.append(...links);

  const sync = () => links.forEach((link) => {
    if (link.dataset.route === router.current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  sync();
  router.subscribe(sync);
}
