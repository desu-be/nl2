/**
 * Full export: every imported pack and the whole progress log, as one JSON document. It is a backup
 * kept outside the data repository; the access token is never part of it.
 */
import { knownCategorySlugs } from './categories.ts';
import type { Pack } from './pack/packTypes.ts';
import { validatePack } from './pack/validatePack.ts';
import { compareEvents, type ProgressEvent } from './progressEvents.ts';
import { isProgressEvent } from './sync/eventShape.ts';

export const EXPORT_FORMAT = 'nl2-export';
export const EXPORT_VERSION = 1;

export interface ExportDocument {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  packs: Pack[];
  events: ProgressEvent[];
}

export function buildExport(packs: readonly Pack[], events: readonly ProgressEvent[], now: number): ExportDocument {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date(now).toISOString(),
    packs: [...packs].sort((a, b) => a.package_id.localeCompare(b.package_id)),
    events: [...events].sort(compareEvents),
  };
}

export type ExportReading =
  | { ok: true; exportedAt: string; packs: Pack[]; events: ProgressEvent[]; skipped: number }
  | { ok: false };

/** True when `text` looks like a full export rather than a pack (its `format` says so). */
export function isExportDocument(text: string): boolean {
  try {
    return (JSON.parse(text.replace(/^﻿/, '')) as { format?: unknown } | null)?.format === EXPORT_FORMAT;
  } catch {
    return false;
  }
}

/**
 * Reads an export for restoration. Each pack goes through the full pack validation (it may reference
 * the categories of the packs before it); invalid packs and malformed events are counted in
 * `skipped` rather than failing the whole restoration.
 */
export function readExport(text: string): ExportReading {
  let document: Partial<ExportDocument>;
  try {
    document = JSON.parse(text.replace(/^﻿/, '')) as Partial<ExportDocument>;
  } catch {
    return { ok: false };
  }
  if (document?.format !== EXPORT_FORMAT || document.version !== EXPORT_VERSION || !Array.isArray(document.packs) || !Array.isArray(document.events)) {
    return { ok: false };
  }
  const packs: Pack[] = [];
  let skipped = 0;
  for (const candidate of document.packs) {
    const validation = validatePack(JSON.stringify(candidate), knownCategorySlugs(packs));
    if (validation.ok) packs.push(validation.pack);
    else skipped += 1;
  }
  const events = document.events.filter(isProgressEvent);
  skipped += document.events.length - events.length;
  return { ok: true, exportedAt: typeof document.exportedAt === 'string' ? document.exportedAt : '', packs, events, skipped };
}

/** `nl2-export-2026-11-03.json`. */
export function exportFileName(now: number): string {
  return `nl2-export-${new Date(now).toISOString().slice(0, 10)}.json`;
}
