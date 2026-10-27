import type { Screen } from './screen.ts';
import { screenHeader } from './screenHeader.ts';

/** Screen not built yet: shows its title and a short notice. */
export function placeholderScreen(title: string, intro: string): Screen {
  return (root) => root.append(...screenHeader(title, intro));
}
