import { describe, expect, it } from 'vitest';
import { buildQuiz, makeQuestion, quizPool } from './buildQuiz.ts';
import { packItems, type Item } from './items.ts';
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from './quizSettings.ts';
import { seededRandom, weightedSample } from './random.ts';
import { replay } from './replay.ts';
import { answer, DAY, flag, MINUTE, T0, testPack } from './testFixtures.ts';

const items = packItems(testPack());
const settings = (overrides: Partial<QuizSettings> = {}): QuizSettings => ({
  ...DEFAULT_QUIZ_SETTINGS,
  sources: ['word', 'phrase', 'verb'],
  ...overrides,
});
const ids = (list: readonly Item[]) => list.map((item) => item.id.replace('demo:', '')).sort();

describe('quizPool', () => {
  it('filters by source and never asks a verb without forms', () => {
    expect(ids(quizPool(items, new Map(), settings({ sources: ['verb'] }), T0))).toEqual(['v.werken']);
    expect(ids(quizPool(items, new Map(), settings({ sources: ['phrase'] }), T0))).toEqual(['p.hello']);
  });

  it('filters by category', () => {
    expect(ids(quizPool(items, new Map(), settings({ sources: ['word'], categoryIds: ['it'] }), T0))).toEqual(['w.screen', 'w.server']);
  });

  it('adds up the status filters and excludes known items', () => {
    const progress = replay([
      answer('demo:w.server', 'good', T0),
      answer('demo:w.desk', 'again', T0),
      answer('demo:w.desk', 'again', T0 + 11 * MINUTE),
      flag('known', 'demo:w.screen', T0),
    ]);
    const later = T0 + DAY;
    const words = (statuses: QuizSettings['statuses']) => ids(quizPool(items, progress, settings({ sources: ['word'], statuses }), later));
    expect(words([])).toEqual(['w.desk', 'w.server']);
    expect(words(['unseen'])).toEqual([]);
    expect(words(['due'])).toEqual(['w.desk', 'w.server']);
    expect(words(['difficult'])).toEqual(['w.desk']);
    expect(ids(quizPool(items, progress, settings({ statuses: ['unseen', 'difficult'] }), later))).toEqual(['p.hello', 'v.werken', 'w.desk']);
  });
});

describe('buildQuiz', () => {
  it('never repeats an item and reports a short pool', () => {
    const plan = buildQuiz(items, new Map(), settings({ size: 10 }), T0, seededRandom(1));
    expect(plan.available).toBe(5);
    expect(new Set(plan.questions.map((q) => q.item.id)).size).toBe(5);
  });

  it('is reproducible with the same seed', () => {
    const a = buildQuiz(items, new Map(), settings({ size: 3 }), T0, seededRandom(7));
    const b = buildQuiz(items, new Map(), settings({ size: 3 }), T0, seededRandom(7));
    expect(a).toEqual(b);
  });

  it('asks words in the chosen direction, and verbs as a supplied form', () => {
    const [server] = items;
    expect(makeQuestion(server, settings({ direction: 'fr-nl' }), seededRandom(1))).toMatchObject({ dir: 'fr-nl', prompt: 'le serveur', answer: 'de server' });
    expect(makeQuestion(server, settings({ direction: 'nl-fr' }), seededRandom(1))).toMatchObject({ dir: 'nl-fr', prompt: 'de server', answer: 'le serveur' });
    const werken = items.find((item) => item.id === 'demo:v.werken')!;
    for (let seed = 0; seed < 20; seed++) {
      const question = makeQuestion(werken, settings(), seededRandom(seed));
      expect(question.dir).toBe('form');
      expect(['werk', 'gewerkt']).toContain(question.answer);
      expect(question.form === 'present.ik' ? 'werk' : 'gewerkt').toBe(question.answer);
    }
  });

  it('mixes both directions', () => {
    const random = seededRandom(3);
    const dirs = new Set(Array.from({ length: 30 }, () => makeQuestion(items[0], settings({ direction: 'mixed' }), random).dir));
    expect(dirs).toEqual(new Set(['fr-nl', 'nl-fr']));
  });
});

describe('weightedSample', () => {
  it('picks heavier entries more often without excluding light ones', () => {
    const random = seededRandom(42);
    const counts = { heavy: 0, light: 0 };
    for (let i = 0; i < 2000; i++) {
      const [picked] = weightedSample([{ value: 'heavy' as const, weight: 5 }, { value: 'light' as const, weight: 1 }], 1, random);
      counts[picked] += 1;
    }
    expect(counts.heavy).toBeGreaterThan(counts.light * 3);
    expect(counts.light).toBeGreaterThan(0);
  });
});
