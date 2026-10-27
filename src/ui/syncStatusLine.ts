import { routeHref } from '../app/routes.ts';
import { fr } from '../i18n/fr.ts';
import type { SyncService, SyncState } from '../sync/syncService.ts';
import { el } from './dom.ts';
import { formatDate } from './formatDate.ts';
import { formatRelative } from './formatRelative.ts';

const WARN_BEFORE_MS = 14 * 86_400_000;

/** The token expiry date when it is less than 14 days away. */
export function tokenExpiresSoon(state: SyncState, now = Date.now()): string | undefined {
  const expires = state.config?.tokenExpiresAt;
  return expires && Date.parse(expires) - now < WARN_BEFORE_MS ? expires : undefined;
}

/** One-line text of the synchronization state: last sync, items waiting, or the error. */
export function syncSummary(state: SyncState): string {
  if (!state.active) return fr.sync.off;
  if (state.running) return fr.sync.running;
  const last = state.lastSync ? fr.sync.last(formatRelative(state.lastSync)) : fr.sync.never;
  return last + fr.sync.pending(state.pending);
}

/** The state line of the home screen, kept up to date. A token expired or about to expire links to the settings. */
export function syncStatusLine(sync: SyncService): { element: HTMLElement; dispose: () => void } {
  const line = el('div', '', 'sync-status');
  line.setAttribute('aria-live', 'polite');

  const render = (state: SyncState) => {
    line.dataset.error = state.error ?? '';
    if (state.error === 'auth') {
      const link = el('a', fr.sync.settingsLink);
      link.href = routeHref('settings');
      line.replaceChildren(`${fr.sync.authHome} `, link);
    } else {
      const text = state.error ? `${syncSummary({ ...state, running: false })} · ${fr.sync.errors[state.error]}` : syncSummary(state);
      line.replaceChildren(text);
      const expires = state.active ? tokenExpiresSoon(state) : undefined;
      if (expires) {
        const link = el('a', fr.sync.settingsLink);
        link.href = routeHref('settings');
        line.append(el('br'), `${fr.sync.expiresSoon(formatDate(expires))} `, link);
      }
    }
  };
  render(sync.state);
  return { element: line, dispose: sync.subscribe(render) };
}
