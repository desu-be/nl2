import { fr } from '../../i18n/fr.ts';
import { el } from '../dom.ts';
import type { ThemeManager } from './themeManager.ts';
import { THEMES } from './themes.ts';

/** One large toggle button per theme; the active one is pressed. Kept in sync with the manager. */
export function createThemePicker(themes: ThemeManager): { element: HTMLElement; dispose: () => void } {
  const fieldset = el('fieldset', '', 'theme-picker');
  fieldset.append(el('legend', fr.settings.theme));

  const buttons = THEMES.map((id) => {
    const button = el('button', '', 'button');
    button.type = 'button';
    button.dataset.theme = id;
    const swatch = el('span', '', 'theme-swatch');
    swatch.dataset.swatch = id;
    button.append(swatch, fr.themes[id]);
    button.addEventListener('click', () => themes.set(id));
    return button;
  });
  fieldset.append(...buttons);

  const sync = () => buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.theme === themes.current)));
  sync();
  return { element: fieldset, dispose: themes.subscribe(sync) };
}
