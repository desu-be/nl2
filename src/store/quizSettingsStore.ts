import { sanitizeQuizSettings, type QuizSettings } from '../domain/quizSettings.ts';
import { readPreference, writePreference } from '../ui/preferences.ts';

const STORAGE_KEY = 'nl2.quizSettings';

/** Last quiz settings of this browser. */
export function loadQuizSettings(): QuizSettings {
  try {
    return sanitizeQuizSettings(JSON.parse(readPreference(STORAGE_KEY) ?? 'null'));
  } catch {
    return sanitizeQuizSettings(null);
  }
}

export function saveQuizSettings(settings: QuizSettings) {
  writePreference(STORAGE_KEY, JSON.stringify(settings));
}
