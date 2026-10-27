/** Source of uniform numbers in [0, 1). `Math.random` in the app, a seeded generator in tests. */
export type Random = () => number;

/** Small deterministic generator (mulberry32), for reproducible tests. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Fisher–Yates shuffle, returning a new array. */
export function shuffled<T>(values: readonly T[], random: Random): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Weighted sampling without replacement (Efraimidis–Spirakis): heavier entries are likelier to be
 * picked, none is excluded, none appears twice. The result is shuffled.
 */
export function weightedSample<T>(entries: readonly { value: T; weight: number }[], count: number, random: Random): T[] {
  const keyed = entries.map(({ value, weight }) => ({ value, key: (1 - random()) ** (1 / weight) }));
  keyed.sort((a, b) => b.key - a.key);
  return shuffled(keyed.slice(0, count).map(({ value }) => value), random);
}
