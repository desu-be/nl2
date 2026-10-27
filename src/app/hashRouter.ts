import { parseRoute, type RouteId } from './routes.ts';

type Listener = (route: RouteId) => void;

/** Current route, read from `location.hash`; subscribers are notified on every change. */
export class HashRouter {
  private readonly listeners = new Set<Listener>();
  private route: RouteId = parseRoute(location.hash);

  constructor() {
    addEventListener('hashchange', () => {
      this.route = parseRoute(location.hash);
      for (const listener of this.listeners) listener(this.route);
    });
  }

  get current(): RouteId { return this.route; }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
