import { el } from './dom.ts';

export type NoticeTone = 'info' | 'success' | 'error';

/** A short message box. Errors are announced at once to screen readers, other messages politely. */
export function notice(text: string, tone: NoticeTone = 'info'): HTMLElement {
  const box = el('p', text, `notice notice-${tone}`);
  box.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  return box;
}
