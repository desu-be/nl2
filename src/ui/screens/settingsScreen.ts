import { fr } from '../../i18n/fr.ts';
import { createThemePicker } from '../theme/themePicker.ts';
import type { Screen } from './screen.ts';
import { screenHeader } from './screenHeader.ts';
import { exportSection } from './settings/exportSection.ts';
import { syncSection } from './settings/syncSection.ts';

/** Settings: synchronization access, theme, full export. */
export const settingsScreen: Screen = (root, { themes, library, sync }) => {
  const picker = createThemePicker(themes);
  const syncPart = syncSection(sync);
  root.append(...screenHeader(fr.screens.settings.title, fr.screens.settings.intro), syncPart.element, picker.element, exportSection(library));
  return () => {
    picker.dispose();
    syncPart.dispose();
  };
};
