import type { Item } from '../../domain/items.ts';
import { normalizeText } from '../../domain/text.ts';
import { fr } from '../../i18n/fr.ts';
import { el } from '../dom.ts';
import { notice } from '../notice.ts';
import type { Screen } from './screen.ts';
import { screenHeader } from './screenHeader.ts';

/** Case- and accent-insensitive key for the text filter. */
const searchKey = (text: string) => normalizeText(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** « Connus »: every definitely known item, with a text filter and a button to reactivate each one. */
export const knownScreen: Screen = (root, { library }) => {
  root.append(...screenHeader(fr.screens.known.title, fr.screens.known.intro));

  const filter = el('input', '', 'text-field');
  filter.type = 'search';
  filter.placeholder = fr.known.filter;
  filter.setAttribute('aria-label', fr.known.filter);
  const count = el('p', '', 'field-hint');
  const list = el('ul', '', 'known-list');
  const errors = el('div');

  const knownItems = (): Item[] => library.items.filter((item) => library.progress.get(item.id)?.known);

  const row = (item: Item) => {
    const line = el('li', '', 'known-row');
    const text = el('div', '', 'known-text');
    text.append(el('span', item.nl, 'known-nl'), el('span', item.fr, 'known-fr'));
    const button = el('button', fr.known.reactivate, 'button');
    button.type = 'button';
    button.addEventListener('click', () => {
      button.disabled = true;
      library.record({ type: 'unknown', item: item.id }).then(render, (error: unknown) => {
        console.error('Reactivation not saved', error);
        button.disabled = false;
        errors.replaceChildren(notice(fr.quiz.saveError, 'error'));
      });
    });
    line.append(text, button);
    return line;
  };

  const render = () => {
    const all = knownItems();
    const query = searchKey(filter.value);
    const shown = query ? all.filter((item) => searchKey(`${item.nl} ${item.fr}`).includes(query)) : all;
    count.textContent = fr.known.count(all.length);
    list.replaceChildren(...shown.map(row));
    if (!all.length) list.replaceChildren(el('li', fr.known.empty, 'known-empty'));
    else if (!shown.length) list.replaceChildren(el('li', fr.known.noMatch, 'known-empty'));
  };

  filter.addEventListener('input', render);
  root.append(filter, count, errors, list);
  render();
};
