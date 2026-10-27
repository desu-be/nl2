/** Single-line text as stored and compared: Unicode NFC, whitespace runs collapsed, trimmed. */
export function normalizeText(text: string): string {
  return text.normalize('NFC').split(/\s+/u).filter(Boolean).join(' ');
}

/** Multi-line text (notes): NFC, line endings folded to `\n`, trailing spaces and outer blank lines removed. */
export function normalizeMultiline(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

export function isBlank(text: string): boolean {
  return normalizeText(text) === '';
}
