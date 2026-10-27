const DATE = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });

/** `2026-11-03T07:42:10Z` → « 3 novembre 2026 ». */
export function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : DATE.format(time);
}
