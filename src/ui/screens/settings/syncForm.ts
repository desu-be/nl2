import { isValidDeviceName } from '../../../domain/sync/repoPaths.ts';
import { fr } from '../../../i18n/fr.ts';
import type { SyncConfig } from '../../../store/metaStore.ts';
import { errorKind, type SyncService } from '../../../sync/syncService.ts';
import { el } from '../../dom.ts';
import { notice } from '../../notice.ts';

const REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

/** On `<owner>.github.io`, the data repository is guessed as `<owner>/nl2-data`. */
function guessedRepo(): string {
  const host = location.hostname;
  return host.endsWith('.github.io') ? `${host.slice(0, -'.github.io'.length)}/nl2-data` : '';
}

function field(label: string, input: HTMLInputElement, hint = ''): HTMLElement {
  const wrapper = el('label', '', 'field');
  wrapper.append(el('span', label, 'field-label'), input);
  if (hint) wrapper.append(el('span', hint, 'field-hint'));
  return wrapper;
}

function input(type: string, value = '', autocomplete: AutoFill = 'off'): HTMLInputElement {
  const element = el('input', '', 'text-field');
  element.type = type;
  element.value = value;
  element.autocomplete = autocomplete;
  element.spellcheck = false;
  return element;
}

/**
 * Token, repository and device name, tested against the API before they are stored. The device name
 * can no longer change once chosen. `onDone` runs after a successful save.
 */
export function syncForm(sync: SyncService, previous: Omit<SyncConfig, 'token'> | undefined, onDone: () => void): HTMLElement {
  const form = el('form', '', 'sync-form');
  const token = input('password', '', 'new-password');
  const repo = input('text', previous?.repo ?? guessedRepo());
  repo.placeholder = 'owner/nl2-data';
  const device = input('text', previous?.device ?? '');
  device.placeholder = 'pc-pro';
  device.disabled = Boolean(previous?.device);
  const expires = input('date', previous?.tokenExpiresAt?.slice(0, 10) ?? '');
  const message = el('div');
  const save = el('button', fr.sync.save, 'button button-primary');
  save.type = 'submit';

  form.append(
    el('p', fr.sync.tokenHelp, 'field-hint'),
    field(fr.sync.token, token),
    field(fr.sync.repo, repo),
    field(fr.sync.device, device, previous?.device ? '' : fr.sync.deviceHint),
    field(fr.sync.expires, expires),
    message,
    save,
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = { token: token.value.trim(), repo: repo.value.trim(), device: device.value.trim() };
    if (!REPO.test(values.repo)) return message.replaceChildren(notice(fr.sync.invalidRepo, 'error'));
    if (!previous?.device && !isValidDeviceName(values.device)) return message.replaceChildren(notice(fr.sync.invalidDevice, 'error'));
    if (!values.token) return message.replaceChildren(notice(fr.sync.errors.auth, 'error'));

    save.disabled = true;
    message.replaceChildren(notice(fr.sync.testing));
    try {
      await sync.configure({ ...values, ...(expires.value ? { tokenExpiresAt: new Date(`${expires.value}T00:00:00Z`).toISOString() } : {}) });
      onDone();
    } catch (error) {
      message.replaceChildren(notice(fr.sync.errors[errorKind(error)], 'error'));
      save.disabled = false;
    }
  });
  return form;
}
