/** Available themes; each one has a stylesheet in styles/themes/ keyed by `[data-theme]`. */
export const THEMES = ['dark', 'light', 'sepia', 'nord', 'high-contrast'] as const;

export type ThemeId = (typeof THEMES)[number];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}
