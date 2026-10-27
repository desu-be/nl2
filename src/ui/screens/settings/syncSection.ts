import { fr } from '../../../i18n/fr.ts';
import type { SyncService, SyncState } from '../../../sync/syncService.ts';
import { el } from '../../dom.ts';
import { formatDate } from '../../formatDate.ts';
import { notice } from '../../notice.ts';
import { syncSummary, tokenExpiresSoon } from '../../syncStatusLine.ts';
import { syncForm } from './syncForm.ts';

function button(label: string, run: () => void, className = 'button'): HTMLButtonElement {
  const element = el('button', label, className);
  element.type = 'button';
  element.addEventListener('click', run);
  return element;
}

/** Messages about the current state: error, token expiry, device clock, ignored files. */
function stateNotices(state: SyncState): HTMLElement[] {
  const parts: HTMLElement[] = [];
  if (state.error) parts.push(notice(fr.sync.errors[state.error], 'error'));
  const expires = state.config?.tokenExpiresAt;
  if (expires) {
    const soon = tokenExpiresSoon(state) !== undefined;
    parts.push(soon ? notice(fr.sync.expiresSoon(formatDate(expires)), 'error') : el('p', fr.sync.expiresOn(formatDate(expires)), 'field-hint'));
  }
  if (state.clockOff) parts.push(notice(fr.sync.clockOff, 'error'));
  if (state.problems.length) parts.push(notice(fr.sync.problems(state.problems.join(', ')), 'error'));
  return parts;
}

/**
 * « Synchronisation »: the access form when no token is stored; otherwise the state, with « sync
 * now », « replace the token » and « forget the token ».
 */
export function syncSection(sync: SyncService): { element: HTMLElement; dispose: () => void } {
  const section = el('section', '', 'settings-section');
  const body = el('div');
  section.append(el('h2', fr.sync.title, 'section-title'), el('p', fr.sync.intro, 'field-hint'), body);
  let editing = false;

  const render = (state: SyncState) => {
    if (!state.active || editing) {
      if (!body.querySelector('form')) body.replaceChildren(syncForm(sync, state.config, () => { editing = false; render(sync.state); }));
      return;
    }
    const actions = el('div', '', 'button-row');
    const now = button(fr.sync.syncNow, () => void sync.syncNow(), 'button button-primary');
    now.disabled = state.running;
    actions.append(
      now,
      button(fr.sync.replace, () => { editing = true; body.replaceChildren(); render(sync.state); }),
      button(fr.sync.forget, () => void sync.forgetToken()),
    );
    body.replaceChildren(
      el('p', fr.sync.repoLine(state.config?.repo ?? '', state.config?.device ?? ''), 'sync-repo'),
      el('p', syncSummary(state), 'sync-summary'),
      ...stateNotices(state),
      actions,
    );
  };

  render(sync.state);
  return { element: section, dispose: sync.subscribe(render) };
}
