const RELATIVE = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', Infinity],
];

/** `iso` relative to now: « il y a 3 minutes », « hier ». */
export function formatRelative(iso: string, now = Date.now()): string {
  let value = (Date.parse(iso) - now) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return iso;
}
