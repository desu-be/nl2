/**
 * Screen-level keyboard shortcuts, keyed by `KeyboardEvent.key` (`' '` for the space bar). Ignored
 * while typing in a field, inside an open dialog, or with Ctrl, Alt or ⌘ held. Returns the
 * function that removes them.
 */
export function onKeys(handlers: Record<string, () => void>): () => void {
  const listener = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
    if (target instanceof Element && target.closest('dialog[open]')) return;
    // A focused button or link keeps its own Enter and Space.
    if ((event.key === 'Enter' || event.key === ' ') && target instanceof HTMLElement && target.closest('button, a[href]')) return;
    const handler = handlers[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  };
  document.addEventListener('keydown', listener);
  return () => document.removeEventListener('keydown', listener);
}
