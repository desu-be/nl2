import type { PackIssue } from '../../../domain/pack/packIssue.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';

/** Validation problems, each with its location (as in the file) and a French message. */
export function issueList(title: string, issues: readonly PackIssue[], tone: 'error' | 'warning'): HTMLElement {
  const box = el('section', '', `issues issues-${tone}`);
  if (tone === 'error') box.setAttribute('role', 'alert');
  const list = el('ul');
  for (const issue of issues) {
    const line = el('li');
    line.append(el('code', issue.location, 'issue-location'), ` ${fr.packIssues[issue.code](issue.detail ?? '')}`);
    list.append(line);
  }
  box.append(el('p', title, 'issues-title'), list);
  return box;
}
