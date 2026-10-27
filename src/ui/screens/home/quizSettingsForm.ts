import type { Library } from '../../../app/library.ts';
import { quizPool } from '../../../domain/buildQuiz.ts';
import { DIRECTIONS, ITEM_KINDS, QUIZ_SIZES, STATUS_FILTERS, type QuizSettings } from '../../../domain/quizSettings.ts';
import { fr } from '../../../i18n/fr.ts';
import { el } from '../../dom.ts';
import { createToggleGroup } from '../../toggleGroup.ts';

/** Every category used by an item, sorted by display name. */
function categoryOptions(library: Library) {
  const slugs = new Set(library.items.flatMap((item) => item.categoryIds));
  return [...slugs]
    .map((slug) => ({ value: slug, label: library.categoryName(slug) ?? fr.builtinCategories[slug] ?? slug }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/**
 * The custom quiz form: sources, direction, status filters, categories and size, with the number of
 * matching items kept up to date. `onChange` receives every new version of the settings.
 */
export function quizSettingsForm(library: Library, initial: QuizSettings, onChange: (settings: QuizSettings) => void): HTMLElement {
  let settings = { ...initial };
  const matching = el('p', '', 'field-hint matching');
  matching.setAttribute('aria-live', 'polite');

  const update = (patch: Partial<QuizSettings>) => {
    settings = { ...settings, ...patch };
    refresh();
    onChange(settings);
  };
  const refresh = () => {
    matching.textContent = fr.home.matching(quizPool(library.items, library.progress, settings, Date.now()).length);
  };

  const form = el('section', '', 'quiz-form');
  form.append(
    el('h2', fr.home.custom, 'section-title'),
    createToggleGroup(fr.home.sources, ITEM_KINDS.map((value) => ({ value, label: fr.sources[value] })), settings.sources,
      (sources) => update({ sources }), { multiple: true }),
    createToggleGroup(fr.home.direction, DIRECTIONS.map((value) => ({ value, label: fr.directions[value] })), [settings.direction],
      ([direction]) => update({ direction })),
    createToggleGroup(fr.home.statuses, STATUS_FILTERS.map((value) => ({ value, label: fr.statuses[value] })), settings.statuses,
      (statuses) => update({ statuses }), { multiple: true, hint: fr.home.statusesHint }),
  );
  const categories = categoryOptions(library);
  if (categories.length > 1) {
    form.append(createToggleGroup(fr.home.categories, categories, settings.categoryIds,
      (categoryIds) => update({ categoryIds }), { multiple: true, hint: fr.home.categoriesHint }));
  }
  form.append(
    createToggleGroup(fr.home.size, QUIZ_SIZES.map((value) => ({ value, label: String(value) })), [settings.size],
      ([size]) => update({ size })),
    matching,
  );
  refresh();
  return form;
}
