import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, isExportDocument, readExport } from './exportData.ts';
import { answer, T0, testPack } from './testFixtures.ts';

describe('buildExport', () => {
  it('holds every pack and every event, in a stable order', () => {
    const later = answer('demo:w.desk', 'good', T0 + 1000);
    const earlier = answer('demo:w.server', 'again', T0);
    const other = { ...testPack(), package_id: 'alpha' };
    const document = buildExport([testPack(), other], [later, earlier], T0);
    expect(document).toMatchObject({ format: 'nl2-export', version: 1, exportedAt: new Date(T0).toISOString() });
    expect(document.packs.map((pack) => pack.package_id)).toEqual(['alpha', 'demo']);
    expect(document.events).toEqual([earlier, later]);
  });

  it('reads back what it wrote', () => {
    const events = [answer('demo:w.server', 'again', T0), answer('demo:w.desk', 'good', T0 + 1000)];
    const text = JSON.stringify(buildExport([testPack()], events, T0));
    expect(isExportDocument(text)).toBe(true);
    expect(readExport(text)).toEqual({ ok: true, exportedAt: new Date(T0).toISOString(), packs: [testPack()], events, skipped: 0 });
  });

  it('skips invalid packs and malformed events, and refuses anything else', () => {
    const document = buildExport([testPack(), { ...testPack(), package_id: 'Bad Id' }], [answer('a', 'good', T0)], T0);
    const text = JSON.stringify({ ...document, events: [...document.events, { id: 'x', type: 'answer' }] });
    expect(readExport(text)).toMatchObject({ ok: true, skipped: 2 });
    expect(readExport('{"format":"nl-desu-content-pack"}')).toEqual({ ok: false });
    expect(readExport('not json')).toEqual({ ok: false });
    expect(isExportDocument(JSON.stringify(testPack()))).toBe(false);
  });

  it('names the file after the export date', () => {
    expect(exportFileName(Date.UTC(2026, 10, 3, 23))).toBe('nl2-export-2026-11-03.json');
  });
});
