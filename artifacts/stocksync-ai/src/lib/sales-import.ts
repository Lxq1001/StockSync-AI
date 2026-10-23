import type { SKU, StoreData } from './procurement';

/**
 * Local sales import. Supported formats ONLY:
 *  - CSV with header row: itemId,date,quantity
 *  - JSON array of { "itemId": string, "date": "YYYY-MM-DD", "quantity": number }
 * Not a database connector. All rows must be valid or nothing is applied.
 */
export const IMPORT_MAX_BYTES = 512 * 1024;
export const IMPORT_MAX_ROWS = 5000;
export const DEMAND_WINDOW_DAYS = 7;
/** Whole-unit daily use from the latest seven daily sales totals. */
export const averageDailyUse = (recentSales: readonly number[]) =>
  Math.ceil(recentSales.reduce((total, quantity) => total + quantity, 0) / DEMAND_WINDOW_DAYS);
export type SalesRow = { itemId: string; date: string; quantity: number };
export type ImportResult = { ok: true; rows: SalesRow[] } | { ok: false; errors: string[] };

/** Minimal RFC 4180 style CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('A quoted field is not closed.');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function validDate(s: string) {
  const m = DATE.exec(s); if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function parseSalesFile(name: string, text: string, skus: SKU[]): ImportResult {
  if (new Blob([text]).size > IMPORT_MAX_BYTES) return { ok: false, errors: [`File is larger than ${IMPORT_MAX_BYTES / 1024} KB.`] };
  const lower = name.toLowerCase();
  if (lower.startsWith('.env') || lower.includes('.env')) return { ok: false, errors: ['Environment files are not accepted.'] };
  let raw: { line: number; itemId: unknown; date: unknown; quantity: unknown }[] = [];
  try {
    if (lower.endsWith('.json')) {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return { ok: false, errors: ['JSON must be an array of { itemId, date, quantity } objects.'] };
      const seen = new Set<string>();
      raw = data.flatMap((r, i) => {
        if (r && typeof r === 'object' && 'items' in r) {
          const date = normalizeReceiptDate(r.orderDate);
          if (typeof r.sales_id !== 'string' || !r.sales_id.trim()) throw new Error(`Entry ${i + 1}: missing sales_id.`);
          const key = `${date}:${r.sales_id}`;
          if (seen.has(key)) throw new Error(`Entry ${i + 1}: duplicate receipt on the same date.`);
          seen.add(key);
          const items = Array.isArray(r.items) ? r.items : [r.items];
          if (!items.length) throw new Error(`Entry ${i + 1}: items cannot be empty.`);
          return items.map((item: { id?: unknown; quantity?: unknown } | null) => ({ line: i + 1, itemId: item?.id, date, quantity: item?.quantity }));
        }
        return [{ line: i + 1, itemId: r?.itemId, date: r?.date, quantity: r?.quantity }];
      });
    } else if (lower.endsWith('.csv')) {
      const rows = parseCsv(text.replace(/^\uFEFF/, ''));
      if (!rows.length) return { ok: false, errors: ['The file is empty.'] };
      const header = rows[0].map(h => h.trim());
      const idx = { itemId: header.indexOf('itemId'), date: header.indexOf('date'), quantity: header.indexOf('quantity') };
      if (idx.itemId < 0 || idx.date < 0 || idx.quantity < 0) return { ok: false, errors: ['CSV header must include itemId,date,quantity.'] };
      raw = rows.slice(1).map((r, i) => ({ line: i + 2, itemId: r[idx.itemId]?.trim(), date: r[idx.date]?.trim(), quantity: r[idx.quantity]?.trim() === '' || r[idx.quantity] === undefined ? NaN : Number(r[idx.quantity]) }));
    } else return { ok: false, errors: ['Choose a .csv or .json file.'] };
  } catch (e) {
    return { ok: false, errors: [`Could not read the file: ${e instanceof Error ? e.message : 'parse error'}`] };
  }
  if (!raw.length) return { ok: false, errors: ['No sales rows found.'] };
  if (raw.length > IMPORT_MAX_ROWS) return { ok: false, errors: [`Too many rows (max ${IMPORT_MAX_ROWS}).`] };
  const known = new Set(skus.map(s => s.id)); const errors: string[] = []; const rows: SalesRow[] = [];
  for (const r of raw) {
    const where = lower.endsWith('.json') ? `Entry ${r.line}` : `Line ${r.line}`;
    if (typeof r.itemId !== 'string' || !known.has(r.itemId)) { errors.push(`${where}: unknown itemId "${String(r.itemId ?? '')}".`); continue; }
    if (typeof r.date !== 'string' || !validDate(r.date)) { errors.push(`${where}: date must be a real YYYY-MM-DD date.`); continue; }
    if (typeof r.quantity !== 'number' || !Number.isFinite(r.quantity) || r.quantity < 0) { errors.push(`${where}: quantity must be a number of 0 or more.`); continue; }
    rows.push({ itemId: r.itemId, date: r.date, quantity: r.quantity });
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 8).concat(errors.length > 8 ? [`...and ${errors.length - 8} more problems.`] : []) };
  return { ok: true, rows };
}

const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

function normalizeReceiptDate(value: unknown): unknown {
  if (typeof value !== 'string' || validDate(value)) return value;
  const match = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) (\d{4})$/.exec(value);
  if (!match) return value;
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(match[1]) + 1;
  return `${match[3]}-${String(month).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}
export type ImportPreview = { windowStart: string; windowEnd: string; items: { id: string; name: string; before: number; after: number; recentSales: number[]; stockBefore: number; stockAfter: number; importedQuantity: number; stockDeducted: number; stockShortfall: number }[]; rows: number; outside: number; salesRows: SalesRow[] };
/**
 * The 7-day window ends on the latest date in the file. Each item that appears in the file gets
 * recentSales = daily totals over those 7 days (missing days = 0) and avgDailyDemand = ceil(total / 7).
 * Imported quantities reduce on-hand stock only up to the available amount, including rows outside
 * the demand window. Full historical quantities remain in demand history; any excess is reported.
 * Items absent from the file are unchanged.
 */
export function previewImport(data: StoreData, rows: SalesRow[]): ImportPreview {
  const windowEnd = rows.reduce((m, r) => r.date > m ? r.date : m, rows[0].date);
  const windowStart = shift(windowEnd, -(DEMAND_WINDOW_DAYS - 1));
  const days = Array.from({ length: DEMAND_WINDOW_DAYS }, (_, i) => shift(windowStart, i));
  const ids = Array.from(new Set(rows.map(r => r.itemId)));
  let outside = 0;
  const totals = new Map<string, number[]>(ids.map(id => [id, days.map(() => 0)]));
  for (const r of rows) { const i = days.indexOf(r.date); if (i < 0) { outside++; continue; } totals.get(r.itemId)![i] += r.quantity; }
  const items = ids.map(id => {
    const sku = data.skus.find(s => s.id === id)!; const recentSales = totals.get(id)!.map(n => Math.round(n * 100) / 100);
    const importedQuantity = rows.filter(row => row.itemId === id).reduce((sum, row) => sum + row.quantity, 0);
    const stockDeducted = Math.min(sku.onHand, importedQuantity);
    const stockShortfall = Math.max(0, importedQuantity - stockDeducted);
    return {
      id, name: sku.name, before: sku.avgDailyDemand, after: averageDailyUse(recentSales), recentSales,
      stockBefore: sku.onHand, stockAfter: Math.max(0, sku.onHand - stockDeducted), importedQuantity, stockDeducted, stockShortfall,
    };
  });
  return { windowStart, windowEnd, items, rows: rows.length, outside, salesRows: rows };
}
export function applyImport(data: StoreData, preview: ImportPreview, actor: string): StoreData {
  const byId = new Map(preview.items.map(i => [i.id, i]));
  const incomingDays = new Set(preview.salesRows.map(r => `${r.itemId}:${r.date}`));
  return {
    ...data,
    skus: data.skus.map(s => { const p = byId.get(s.id); return p ? { ...s, onHand: p.stockAfter, avgDailyDemand: p.after, recentSales: p.recentSales } : s; }),
    rejectedSuggestions: data.rejectedSuggestions.filter(id => !byId.has(id)),
    salesTransactions: [...(data.salesTransactions ?? []).filter(r => typeof r.itemId === 'string' && !incomingDays.has(`${r.itemId}:${r.date}`)), ...preview.salesRows],
    lastImport: { importedAt: new Date().toISOString(), rows: preview.rows, windowStart: preview.windowStart, windowEnd: preview.windowEnd },
    audit: [{ id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()), timestamp: new Date().toISOString(), actor, action: 'Imported sales', details: `${preview.rows} rows · ${preview.items.length} items · demand window ${preview.windowStart} to ${preview.windowEnd} · stock deducted up to available quantity` }, ...data.audit],
  };
}
export function sampleCsv(skus: SKU[], end = new Date().toISOString().slice(0, 10)): string {
  const lines = ['itemId,date,quantity'];
  const demoSkus = skus.filter(sku => sku.onHand > 1).slice(0, 3);
  for (const sku of demoSkus) {
    const quantity = Math.min(3, Math.max(0, Math.floor(sku.onHand - 1)));
    for (let index = 0; index < quantity; index++) {
      const daysAgo = [6, 3, 0][index];
      lines.push(`${sku.id},${shift(end, -daysAgo)},1`);
    }
  }
  if (lines.length === 1 && skus[0]) lines.push(`${skus[0].id},${end},0`);
  return lines.join('\n') + '\n';
}
