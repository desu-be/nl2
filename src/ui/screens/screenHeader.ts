import { el } from '../dom.ts';

/** Title and optional introduction shown at the top of every screen. */
export function screenHeader(title: string, intro = ''): HTMLElement[] {
  const parts: HTMLElement[] = [el('h1', title, 'screen-title')];
  if (intro) parts.push(el('p', intro, 'screen-intro'));
  return parts;
}
