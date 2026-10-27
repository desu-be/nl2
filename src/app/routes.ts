/** Screens reachable by URL. The hash keeps routing working on a static host (`#/known`). */
export const ROUTES = ['home', 'quiz', 'known', 'import', 'settings'] as const;

export type RouteId = (typeof ROUTES)[number];

/** Screens listed in the top bar, in display order. The quiz is started from the home screen. */
export const NAV_ROUTES: readonly RouteId[] = ['home', 'known', 'import', 'settings'];

export function routeHref(id: RouteId): string {
  return id === 'home' ? '#/' : `#/${id}`;
}

/** Route of a location hash; anything unknown falls back to the home screen. */
export function parseRoute(hash: string): RouteId {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return (ROUTES as readonly string[]).includes(name) ? (name as RouteId) : 'home';
}
