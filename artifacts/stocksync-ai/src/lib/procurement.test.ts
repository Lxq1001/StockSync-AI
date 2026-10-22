import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  buildDraft, buildMailtoUrl, editItem, initialData as emptyData, RETIRED_STORE_KEYS, loadStore, rejectSuggestion, saveStore, sendDraft,
  setDraft, setOrderStatus, STORE_KEY, suggestions, validateItemEdit, type StoreData,
} from './procurement';
import { applyImport, parseCsv, parseSalesFile, previewImport, sampleCsv } from './sales-import';
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

test('suggestions include only items with cover <= 7 days', () => {
  const d = initialData();
  const ids = suggestions(d).map(s => s.sku.id);
  for (const sku of d.skus) {
    const cover = sku.onHand / sku.avgDailyDemand;
    assert.equal(ids.includes(sku.id), cover <= 7, sku.name);
  }
  const t = suggestions(d)[0];
  assert.equal(t.totalCost, Math.round(t.quantity * t.sku.unitCost * 100) / 100);
  assert.equal(t.quantity % t.sku.batchSize, 0);
});

test('rejecting a suggestion persists across reload', () => {
  const s = new MemStore();
  const id = suggestions(initialData())[0].sku.id;
  const loaded = roundTrip(s, rejectSuggestion(initialData(), id));
  assert.ok(!suggestions(loaded).some(x => x.sku.id === id));
  assert.throws(() => rejectSuggestion(initialData(), 'nope'));
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

test('provided import accepts receipt objects and arrays, preserving stock and duplicate safety', () => {
  const data = providedWorkspace(provided);
  const parsed = parseSalesFile('import_data.json', JSON.stringify(provided.importData), data.skus);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  assert.equal(parsed.rows.length, 55);
  const preview = previewImport(data, parsed.rows);
  const next = applyImport(data, preview, 'Tester');
  assert.equal(next.skus.find(s => s.id === 'SKU1')?.avgDailyDemand, 1.57);
  assert.deepEqual(next.skus.map(s => s.onHand), data.skus.map(s => s.onHand));
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
  assert.equal(cleaned.skus[0].onHand, 77);
  assert.equal(cleaned.skus[0].avgDailyDemand, 1.57);
  assert.equal(cleaned.salesTransactions?.length, 97);
  assert.deepEqual(roundTrip(new MemStore(), cleaned), JSON.parse(JSON.stringify(cleaned)));
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

test('import validates atomically and recomputes a 7-day window without touching stock', () => {
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
  const next = applyImport(d, p, 'Aina Rahman');
  const milk = next.skus.find(s => s.id === 'SKU1')!;
  assert.equal(milk.avgDailyDemand, 3);
  assert.equal(milk.onHand, 10);
  assert.equal(next.skus.find(s => s.id === 'SKU6')!.avgDailyDemand, 0.14);
  const json = parseSalesFile('s.json', JSON.stringify([{ itemId: 'SKU6', date: '2025-04-18', quantity: 'x' }]), d.skus);
  assert.equal(json.ok, false);
  assert.ok(parseSalesFile('sample.csv', sampleCsv(d.skus, '2025-04-18'), d.skus).ok);
});
