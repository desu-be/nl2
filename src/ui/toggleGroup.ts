import { el } from './dom.ts';

export interface ToggleOption<T> {
  value: T;
  label: string;
}

/**
 * A labelled row of toggle buttons. `multiple`: any number may be pressed; otherwise exactly one.
 * `onChange` receives the pressed values, in option order.
 */
export function createToggleGroup<T>(
  legend: string,
  options: readonly ToggleOption<T>[],
  selected: readonly T[],
  onChange: (values: T[]) => void,
  { multiple = false, hint = '' } = {},
): HTMLElement {
  const fieldset = el('fieldset', '', 'toggle-group');
  fieldset.append(el('legend', legend));
  const row = el('div', '', 'toggle-row');
  let values = options.map((option) => option.value).filter((value) => selected.includes(value));

  const buttons = options.map((option) => {
    const button = el('button', option.label, 'toggle');
    button.type = 'button';
    button.addEventListener('click', () => {
      if (!multiple) values = [option.value];
      else if (values.includes(option.value)) values = values.filter((value) => value !== option.value);
      else values = options.map((o) => o.value).filter((value) => value === option.value || values.includes(value));
      sync();
      onChange(values);
    });
    return button;
  });
  const sync = () => buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(values.includes(options[index].value))));
  sync();

  row.append(...buttons);
  fieldset.append(row);
  if (hint) fieldset.append(el('p', hint, 'field-hint'));
  return fieldset;
}
