import { readPreference, writePreference } from '../preferences.ts';
import { isThemeId, type ThemeId } from './themes.ts';

const STORAGE_KEY = 'nl2.theme';

type Listener = (theme: ThemeId) => void;

/**
 * Active theme, applied as `data-theme` on <html>. Stored per browser; the first visit follows the
 * system light/dark preference. The browser chrome color (`theme-color`) follows the page background.
 */
export class ThemeManager {
  private readonly listeners = new Set<Listener>();
  private theme: ThemeId;

  constructor(private readonly root: HTMLElement = document.documentElement) {
    const stored = readPreference(STORAGE_KEY);
    this.theme = isThemeId(stored) ? stored : systemTheme();
    this.apply();
  }

  get current(): ThemeId { return this.theme; }

  set(theme: ThemeId) {
    if (theme === this.theme) return;
    this.theme = theme;
    writePreference(STORAGE_KEY, theme);
    this.apply();
    for (const listener of this.listeners) listener(theme);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private apply() {
    this.root.dataset.theme = this.theme;
    const background = getComputedStyle(this.root).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }
}

function systemTheme(): ThemeId {
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
