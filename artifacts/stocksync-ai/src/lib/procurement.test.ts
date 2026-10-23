import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  buildDraft, buildMailtoUrl, buildGmailComposeUrl, editItem, initialData as emptyData, RETIRED_STORE_KEYS, loadStore, rejectSuggestion, saveStore, sendDraft,
  setDraft, setOrderStatus, STORE_KEY, suggestedQuantity, suggestions, validateItemEdit, type StoreData,
} from './procurement';
import { applyImport, averageDailyUse, parseCsv, parseSalesFile, previewImport, sampleCsv } from './sales-import';
import { activateProvidedWorkspace, loadProvidedWorkspace, mergeSupplierContacts, providedWorkspace } from './provided-dataset';
import type { ProvidedDataset } from './provided-dataset';
import { readDatasetResponse } from './dataset-request';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../api-server/src/data/${name}`, import.meta.url), 'utf8'));
const provided: ProvidedDataset = {
  inventory: fixture('mock_db.json'), suppliers: fixture('suppliers.json'),
  salesTransactions: fixture('sales_transaction.json'), importData: fixture('import_data.json'),
};
const initialData = () => providedWorkspace(provided);

test('a provider-accepted send stores the real sender and receipt without claiming delivery', () => {
  const data = initialData();
  const draft = buildDraft(data, data.skus[0].id, 2);
  const receipt = {
    sendId: draft.sendId!, messageId: 'mock-accepted-message', from: 'store@example.test',
    acceptedAt: '2026-10-22T00:00:00Z', transport: 'gmail' as const,
  };
  const sent = sendDraft(setDraft(data, draft), { ...draft, from: receipt.from }, receipt.acceptedAt, receipt);
  assert.equal(sent.order.send?.note, 'Real email accepted by Gmail');
  assert.equal(sent.order.send?.from, receipt.from);
  assert.deepEqual(sent.order.send?.receipt, receipt);
  assert.equal(sent.data.draft, undefined);
  assert.match(sent.data.audit[0].details, /delivery not verified/);
  const storage = new MemStore();
  saveStore(storage, sent.data);
  assert.deepEqual(loadStore(storage).data.orders[0].send?.receipt, receipt);
});

test('dataset response explains local HTML routing mistakes without a JSON parsing crash', async () => {
  await assert.rejects(readDatasetResponse(new Response('<!DOCTYPE html>', {
    headers: { 'content-type': 'text/html' },
  })), /run pnpm dev from the repository root/);
  await assert.rejects(readDatasetResponse(new Response('unavailable', { status: 502 })), /API server is running/);
  const response = await readDatasetResponse(new Response(JSON.stringify(provided), {
    headers: { 'content-type': 'application/json' },
  }));
  assert.equal(response.inventory.length, 15);
});

class MemStore { m = new Map<string, string>(); fail = false;
  getItem(k: string) { return this.m.get(k) ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, v); } }
const roundTrip = (s: MemStore, d: StoreData) => { saveStore(s, d); return loadStore(s).data; };

test('average use is latest weekly sales divided by seven, rounded up', () => {
  assert.equal(averageDailyUse([1, 2, 1, 2, 1, 2, 2]), 2);
  assert.equal(averageDailyUse([2, 2, 2, 2, 2, 2, 2]), 2);
  assert.equal(averageDailyUse([0, 0, 0, 0, 0, 0, 1]), 1);
  assert.equal(averageDailyUse([0, 0, 0, 0, 0, 0, 0]), 0);
  for (const sku of initialData().skus)
    assert.equal(sku.avgDailyDemand, Math.ceil(sku.recentSales.reduce((a, b) => a + b, 0) / 7));
});

test('suggestions include only on-hand stock <= 7 with demand and use 30 days of average use', () => {
  const d = providedWorkspace(provided);
  const eligible = d.skus.find(s => s.avgDailyDemand > 0)!;
  d.skus = d.skus.map(s => s.id === eligible.id ? { ...s, onHand: 7 } : s);
  const ids = suggestions(d).map(s => s.sku.id);
  for (const sku of d.skus) {
    assert.equal(ids.includes(sku.id), sku.onHand <= 7 && sku.avgDailyDemand > 0, sku.name);
  }
  const t = suggestions(d)[0];
  assert.equal(t.totalCost, Math.round(t.quantity * t.sku.unitCost * 100) / 100);
  assert.equal(t.quantity, t.sku.avgDailyDemand * 30);
});

test('suggestions include every eligible item without a five-item limit', () => {
  const data = initialData();
  data.skus = Array.from({ length: 8 }, (_, index) => ({
    ...data.skus[0], id: `eligible-${index}`, onHand: index, avgDailyDemand: 1,
  }));
  assert.equal(suggestions(data).length, 8);
  assert.deepEqual(suggestions(data).map(task => task.quantity), Array(8).fill(30));
});

test('provided starting stock is randomized within 15 to 30 units', () => {
  const data = providedWorkspace(provided);
  assert.equal(data.skus.length, provided.inventory.length);
  for (const sku of data.skus) {
    assert.ok(Number.isInteger(sku.onHand) && sku.onHand >= 15 && sku.onHand <= 30, sku.name);
  }
});

test('existing workspaces randomize untouched starting stock once and preserve edited quantities', () => {
  const oldWorkspace = providedWorkspace(provided);
  oldWorkspace.startingStockRandomized = undefined;
  oldWorkspace.skus = oldWorkspace.skus.map(sku => ({
    ...sku, onHand: provided.inventory.find(item => item.id === sku.id)!.stock,
  }));
  const migrated = loadProvidedWorkspace(oldWorkspace, provided);
  assert.equal(migrated.startingStockRandomized, true);
  for (const sku of migrated.skus) {
    assert.ok(Number.isInteger(sku.onHand) && sku.onHand >= 15 && sku.onHand <= 30, sku.name);
  }
  const edited = { ...oldWorkspace, skus: oldWorkspace.skus.map(sku => sku.id === 'SKU1' ? { ...sku, onHand: 42 } : sku) };
  assert.equal(loadProvidedWorkspace(edited, provided).skus.find(sku => sku.id === 'SKU1')!.onHand, 42);
});

test('the seven-unit threshold is inclusive, not seven days of cover or batch rounding', () => {
  const data = initialData();
  const sku = { ...data.skus[0], onHand: 7, avgDailyDemand: 2, batchSize: 17, leadTimeDays: 99 };
  assert.equal(suggestedQuantity(sku), 60);
  assert.equal(suggestedQuantity({ ...sku, onHand: 0 }), 60);
  assert.equal(suggestedQuantity({ ...sku, onHand: 8 }), 0);
  assert.equal(suggestedQuantity({ ...sku, avgDailyDemand: 0 }), 0);
  const d = { ...data, skus: [sku, { ...sku, id: 'above-threshold', onHand: 8, avgDailyDemand: 100 }] };
  assert.deepEqual(suggestions(d).map(s => s.sku.id), [sku.id]);
  const draft = buildDraft(data, sku.id, suggestions(d)[0].quantity);
  assert.equal(draft.quantity, 60);
  assert.match(draft.body, /Quantity: 60 unit/);
});

test('rejecting a suggestion persists across reload', () => {
  const s = new MemStore();
  const data = providedWorkspace(provided);
  const eligible = data.skus.find(sku => sku.avgDailyDemand > 0)!;
  data.skus = data.skus.map(sku => sku.id === eligible.id ? { ...sku, onHand: 1 } : sku);
  const id = suggestions(data)[0].sku.id;
  const loaded = roundTrip(s, rejectSuggestion(data, id));
  assert.ok(!suggestions(loaded).some(x => x.sku.id === id));
  assert.throws(() => rejectSuggestion(data, 'nope'));
});

test('item edit validates blank, negative and non-finite and persists', () => {
  assert.ok('error' in validateItemEdit({ name: ' ', onHand: '1', unitCost: '1' }));
  assert.ok('error' in validateItemEdit({ name: 'x', onHand: '', unitCost: '1' }));
  assert.ok('error' in validateItemEdit({ name: 'x', onHand: '-1', unitCost: '1' }));
  assert.ok('error' in validateItemEdit({ name: 'x', onHand: '1', unitCost: 'Infinity' }));
  assert.ok('error' in validateItemEdit({ name: 'x', onHand: 'abc', unitCost: '1' }));
  const s = new MemStore();
  const loaded = roundTrip(s, editItem(initialData(), 'SKU1', { name: ' Susu segar ', onHand: '40', unitCost: '6.5' }));
  const sku = loaded.skus.find(x => x.id === 'SKU1')!;
  assert.deepEqual([sku.name, sku.onHand, sku.unitCost], ['Susu segar', 40, 6.5]);
});

test('email closing uses Thank you for new and previously saved drafts', () => {
  const data = initialData();
  const draft = buildDraft(data, 'SKU1', 30);
  assert.match(draft.body, /\n\nThank you,\n/);
  const oldDraft = { ...draft, body: draft.body.replace('\n\nThank you,\n', '\n\nTerima kasih,\n') };
  const loaded = roundTrip(new MemStore(), setDraft(data, oldDraft));
  assert.equal(loaded.draft?.body, draft.body);
});

test('mailto link carries the editable recipient, subject, and complete encoded body', () => {
  const draft = buildDraft(initialData(), 'SKU1', 30);
  const url = buildMailtoUrl({ ...draft, to: 'buyer@example.com', subject: 'Order & delivery', body: 'Hello team,\nPlease confirm.' });
  assert.equal(url, 'mailto:buyer@example.com?subject=Order%20%26%20delivery&body=Hello%20team%2C%0APlease%20confirm.');
});

test('Gmail composer carries the saved recipient, subject, Unicode and full multiline template', () => {
  const data = initialData();
  const draft = buildDraft(data, 'SKU1', 20);
  const before = JSON.stringify(data);
  const content = { to: 'supplier@example.test', subject: 'Order & delivery + 50% ✓', body: 'Hello team,\n\nMilk & rice: RM 150.00\nThank you,\nStore + Manager' };
  const url = new URL(buildGmailComposeUrl(content));
  assert.equal(url.origin, 'https://mail.google.com');
  assert.equal(url.pathname, '/mail/');
  assert.equal(url.searchParams.get('view'), 'cm');
  assert.equal(url.searchParams.get('fs'), '1');
  assert.equal(url.searchParams.get('to'), content.to);
  assert.equal(url.searchParams.get('su'), content.subject);
  assert.equal(url.searchParams.get('body'), content.body);
  assert.equal(new URL(buildGmailComposeUrl(draft)).searchParams.get('body'), draft.body);
  assert.equal(JSON.stringify(data), before, 'building a Gmail link must not create an order or send');
});

test('draft persists, send creates exactly one Sent order and blocks duplicates', () => {
  const s = new MemStore();
  const data = initialData();
  data.suppliers = data.suppliers.map(supplier => ({ ...supplier, email: 'orders@example.test' }));
  const withDraft = roundTrip(s, setDraft(data, buildDraft(data, 'SKU1', 30)));
  assert.equal(withDraft.draft?.quantity, 30);
  assert.match(withDraft.draft!.body, /Fresh Milk/);
  assert.throws(() => sendDraft(withDraft, { ...withDraft.draft!, to: 'not-an-email' }), /recipient/);
  const r = sendDraft(withDraft, withDraft.draft!);
  assert.equal(r.order.status, 'Sent');
  assert.equal(r.order.totalCost, 225);
  assert.equal(r.data.orders.length, withDraft.orders.length + 1);
  assert.equal(r.data.draft, undefined);
  assert.match(r.data.audit[0].details, /user confirmed sent from external mail app/);
  assert.equal(r.order.send?.note, 'Sent from external mail app; confirmed by user');
  assert.throws(() => sendDraft(r.data, withDraft.draft!), /already sent/);
});

test('approving items from each supplier fills the assigned contact without creating orders', () => {
  const data = providedWorkspace(provided);
  assert.equal(data.skus.length, 15);
  assert.equal(data.suppliers.length, 3);
  assert.equal(data.salesTransactions?.length, 42);
  for (const id of ['SKU1', 'SKU6', 'SKU11']) {
    const draft = buildDraft(data, id, 2);
    const expected = provided.suppliers.find(s => s.supplier_id === draft.supplierId)!;
    assert.equal(draft.to, expected.email);
    assert.equal(roundTrip(new MemStore(), setDraft(data, draft)).draft?.to, expected.email);
  }
  assert.equal(data.orders.length, 0);
  const missing = { ...data, suppliers: data.suppliers.map(s => ({ ...s, email: undefined })) };
  assert.equal(buildDraft(missing, 'SKU1', 2).to, '');
});

test('contact refresh fills missing saved recipients but retains manually edited valid recipients', () => {
  const data = providedWorkspace(provided);
  const draft = { ...buildDraft(data, 'SKU1', 2), to: '' };
  const linked = mergeSupplierContacts(setDraft(data, draft), provided);
  assert.equal(linked.draft?.to, data.suppliers[0].email);
  const custom = setDraft(data, { ...draft, to: 'custom@example.test' });
  assert.equal(mergeSupplierContacts(custom, provided).draft?.to, 'custom@example.test');
});

test('provided import accepts receipt objects and arrays, subtracting stock and retaining duplicate-safe history', () => {
  const data = providedWorkspace(provided);
  const parsed = parseSalesFile('import_data.json', JSON.stringify(provided.importData), data.skus);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  assert.equal(parsed.rows.length, 55);
  const preview = previewImport(data, parsed.rows);
  const next = applyImport(data, preview, 'Tester');
  assert.equal(next.skus.find(s => s.id === 'SKU1')?.avgDailyDemand, 2);
  for (const sku of data.skus) {
    const importedQuantity = parsed.rows.filter(row => row.itemId === sku.id).reduce((sum, row) => sum + row.quantity, 0);
    assert.equal(next.skus.find(item => item.id === sku.id)?.onHand, Math.max(0, sku.onHand - importedQuantity));
  }
  assert.equal(next.salesTransactions?.length, 97);
  assert.equal(applyImport(next, preview, 'Tester').salesTransactions?.length, 97);
});

test('status change is tracking only, persists, and never changes stock', () => {
  const s = new MemStore();
  const base = initialData(), draft = buildDraft(base, 'SKU1', 2);
  const d = sendDraft(setDraft(base, draft), draft).data;
  const id = d.orders[0].id;
  const stock = d.skus.map(x => x.onHand);
  let n = setOrderStatus(d, id, 'Received');
  n = setOrderStatus(n, id, 'Pending Delivery');
  n = setOrderStatus(n, id, 'Received');
  const loaded = roundTrip(s, n);
  assert.equal(loaded.orders.find(o => o.id === id)!.status, 'Received');
  assert.deepEqual(loaded.skus.map(x => x.onHand), stock);
  assert.throws(() => setOrderStatus(d, id, 'Awaiting approval' as never));
});

test('retired browser stores are deleted and no old products, orders, or activity return', () => {
  const s = new MemStore();
  const old = initialData();
  old.skus = [{ ...old.skus[0], id: 'retired-product', supplierId: 'retired-supplier' }];
  old.suppliers = [{ ...old.suppliers[0], id: 'retired-supplier' }];
  old.orders = [{ id: 'OLD', itemId: 'retired-product', supplierId: 'retired-supplier', quantity: 1, unitCost: 1, totalCost: 1, status: 'Received', createdAt: 'x', depletionDays: 1 }];
  old.audit = [{ id: 'old-log', timestamp: 'x', actor: 'sample', action: 'Old sample', details: 'Retired product' }];
  old.draft = { ...buildDraft(initialData(), 'SKU1', 2), itemId: 'retired-product', supplierId: 'retired-supplier' };
  old.salesTransactions = [{ itemId: 'retired-product', date: '2025-01-01', quantity: 99 }];
  for (const key of RETIRED_STORE_KEYS) s.setItem(key, JSON.stringify(old));
  const accountKey = `${RETIRED_STORE_KEYS[0]}:private-account`;
  s.setItem(accountKey, 'private account data');
  assert.equal(loadStore(s).data.skus.length, 0); // No old content appears while the API loads.
  const result = activateProvidedWorkspace(loadStore(s).data, provided, s);
  assert.equal(result.message, undefined);
  assert.equal(result.data.skus.length, 15);
  assert.equal(result.data.suppliers.length, 3);
  assert.deepEqual(result.data.orders, []);
  assert.deepEqual(result.data.audit, []);
  assert.equal(result.data.draft, undefined);
  assert.equal(result.data.salesTransactions?.length, 42);
  for (const key of RETIRED_STORE_KEYS) assert.equal(s.getItem(key), null);
  assert.equal(s.getItem(accountKey), 'private account data');
  assert.equal(loadStore(s).data.skus.length, 15);
});

test('cleanup preserves valid new-dataset orders, edits, drafts, imported sales, and reloads', () => {
  const base = initialData(), draft = buildDraft(base, 'SKU6', 2);
  const sent = sendDraft(setDraft(base, draft), draft).data;
  const edited = editItem(setDraft(sent, buildDraft(sent, 'SKU1', 3)), 'SKU1', { name: 'Fresh Milk (1L)', onHand: '77', unitCost: '7.5' });
  const parsed = parseSalesFile('update.json', JSON.stringify(provided.importData), edited.skus);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  const imported = applyImport(edited, previewImport(edited, parsed.rows), 'Tester');
  const cleaned = loadProvidedWorkspace(imported, provided);
  assert.deepEqual(cleaned.orders, imported.orders);
  assert.deepEqual(cleaned.draft, imported.draft);
  assert.deepEqual(cleaned.audit, imported.audit);
  const importedSku1Quantity = parsed.rows.filter(row => row.itemId === 'SKU1').reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(cleaned.skus[0].onHand, Math.max(0, 77 - importedSku1Quantity));
  assert.equal(cleaned.skus[0].avgDailyDemand, 2);
  assert.equal(cleaned.salesTransactions?.length, 97);
  assert.deepEqual(roundTrip(new MemStore(), cleaned), JSON.parse(JSON.stringify(cleaned)));
});

test('opening an existing workspace recalculates old fractional averages without changing orders or stock', () => {
  const base = initialData();
  const draft = buildDraft(base, 'SKU1', 3);
  const saved = sendDraft(setDraft(base, draft), draft).data;
  const legacy = { ...saved, skus: saved.skus.map(s => ({ ...s, avgDailyDemand: s.recentSales.reduce((a, b) => a + b, 0) / 7 })) };
  const next = loadProvidedWorkspace(legacy, provided);
  for (const sku of next.skus) assert.equal(sku.avgDailyDemand, averageDailyUse(sku.recentSales));
  assert.deepEqual(next.orders, legacy.orders);
  assert.deepEqual(next.salesTransactions, legacy.salesTransactions);
  assert.deepEqual(next.skus.map(s => s.onHand), legacy.skus.map(s => s.onHand));
  assert.deepEqual(next.audit, legacy.audit);
});

test('retired data is not deleted until the cleaned workspace saves successfully', () => {
  const storage = new MemStore();
  storage.setItem(RETIRED_STORE_KEYS[1], JSON.stringify(initialData()));
  storage.fail = true;
  const result = activateProvidedWorkspace(emptyData(), provided, storage);
  assert.match(result.message!, /Could not save/);
  assert.ok(storage.getItem(RETIRED_STORE_KEYS[1]));
  assert.equal(storage.getItem(STORE_KEY), null);
  assert.deepEqual(emptyData().skus, []);
});

test('storage errors are explicit', () => {
  const s = new MemStore(); s.fail = true;
  assert.throws(() => saveStore(s, initialData()), /Could not save/);
  assert.match(loadStore(undefined).message!, /unavailable/);
  const bad = new MemStore(); bad.setItem(STORE_KEY, '{oops');
  assert.match(loadStore(bad).message!, /Could not read/);
});

test('CSV parser handles quotes, escaped quotes and CRLF', () => {
  assert.deepEqual(parseCsv('a,b\r\n"x,1","say ""hi"""\n'), [['a', 'b'], ['x,1', 'say "hi"']]);
  assert.throws(() => parseCsv('"open'));
});

test('import validates atomically, recomputes demand, and deducts imported sales from stock', () => {
  const d = initialData();
  const bad = parseSalesFile('s.csv', 'itemId,date,quantity\nSKU6,2025-04-18,3\nSKU999,2025-04-18,1\nSKU6,2025-02-30,1\nSKU6,2025-04-18,-2\n', d.skus);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.errors.length, 3);
  assert.equal(parseSalesFile('s.csv', 'item,date\n', d.skus).ok, false);
  assert.equal(parseSalesFile('.env', 'X=1', d.skus).ok, false);
  assert.equal(parseSalesFile('s.sql', 'select 1', d.skus).ok, false);
  const good = parseSalesFile('s.csv', '"itemId","date","quantity"\nSKU1,2025-04-18,14\nSKU1,2025-04-12,7\nSKU1,2025-04-01,99\n', d.skus);
  assert.ok(good.ok);
  if (!good.ok) return;
  const p = previewImport(d, good.rows);
  assert.equal(p.windowStart, '2025-04-12');
  assert.equal(p.outside, 1);
  assert.equal(p.items[0].after, 3);
  assert.equal(p.items[0].importedQuantity, 120);
  assert.equal(p.items[0].stockAfter, 0);
  d.rejectedSuggestions = ['SKU1'];
  const next = applyImport(d, p, 'Aina Rahman');
  const milk = next.skus.find(s => s.id === 'SKU1')!;
  assert.equal(milk.avgDailyDemand, 3);
  assert.equal(milk.onHand, 0);
  assert.deepEqual(next.rejectedSuggestions, []);
  assert.ok(suggestions(next).some(task => task.sku.id === 'SKU1'));
  assert.equal(next.skus.find(s => s.id === 'SKU6')!.avgDailyDemand, 1);
  const json = parseSalesFile('s.json', JSON.stringify([{ itemId: 'SKU6', date: '2025-04-18', quantity: 'x' }]), d.skus);
  assert.equal(json.ok, false);
  assert.ok(parseSalesFile('sample.csv', sampleCsv(d.skus, '2025-04-18'), d.skus).ok);
});
