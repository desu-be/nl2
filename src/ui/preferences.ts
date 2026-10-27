// Per-browser preferences. Storage may be unavailable (private browsing, blocked site data):
// reads then return null and writes are dropped. Callers validate what they read.

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* preference not persisted */ }
}
