import { describe, expect, it } from 'vitest';
import { sanitizeQuizSettings, DEFAULT_QUIZ_SETTINGS } from './quizSettings.ts';
import { ulid } from './ulid.ts';

const zeros = (length: number) => new Uint8Array(length);
const ones = (length: number) => new Uint8Array(length).fill(255);

describe('ulid', () => {
  it('encodes the time in the first ten characters and has 26 characters', () => {
    expect(ulid(0, zeros)).toBe('0'.repeat(26));
    expect(ulid(1469918176385, zeros).slice(0, 10)).toBe('01ARYZ6S41');
    expect(ulid(0, ones)).toBe('0'.repeat(10) + 'Z'.repeat(16));
  });

  it('sorts by time', () => {
    expect(ulid(1000, ones) < ulid(1001, zeros)).toBe(true);
  });
});

describe('sanitizeQuizSettings', () => {
  it('falls back to the defaults for anything malformed', () => {
    expect(sanitizeQuizSettings(null)).toEqual(DEFAULT_QUIZ_SETTINGS);
    expect(sanitizeQuizSettings({ sources: ['bogus'], direction: 'up', size: 7, statuses: 'due', categoryIds: [1, 'it'] }))
      .toEqual({ ...DEFAULT_QUIZ_SETTINGS, categoryIds: ['it'] });
  });

  it('keeps valid values', () => {
    const settings = { sources: ['verb'], direction: 'nl-fr', statuses: ['due', 'unseen'], categoryIds: ['it'], size: 20 };
    expect(sanitizeQuizSettings(settings)).toEqual(settings);
  });
});
