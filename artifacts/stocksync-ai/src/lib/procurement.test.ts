import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDraft, buildTestEmail, editItem, initialData, LEGACY_KEY, loadStore, migrateV1, recordTestEmail, rejectSuggestion, saveStore, sendDraft,
  setDraft, setOrderStatus, STORE_KEY, suggestions, validateItemEdit, type StoreData,
} from './procurement';
import { applyImport, parseCsv, parseSalesFile, previewImport, sampleCsv } from './sales-import';
import { mockSalesTransactions } from '../data/mockDataset';

class MemStore { m = new Map<string, string>(); fail = false;
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error('QuotaExceededError'); this.m.set(k, v); } }
const roundTrip = (s: MemStore, d: StoreData) => { saveStore(s, d); return loadStore(s).data; };
const testData = () => {
  const data = initialData();
  return { ...data, suppliers: data.suppliers.map(s => ({ ...s, email: `${s.id.toLowerCase()}@example.test` })) };
};

test('synthetic dataset maps all 15 catalog items and transaction rows to their supplier', () => {
  const data = initialData();
  assert.equal(data.skus.length, 15);
  assert.equal(data.suppliers.length, 3);
  assert.equal(data.salesTransactions?.length, mockSalesTransactions.length);
  assert.ok(mockSalesTransactions.length > 150);
  assert.ok(mockSalesTransactions.every(row => row.is_dummy && data.skus.some(s => s.id === row.item_id)));
  assert.ok(data.skus.every(s => data.suppliers.some(v => v.id === s.supplierId)));
  assert.ok(data.skus.every(s => s.recentSales.length === 14 && s.avgDailyDemand > 0));
});

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
  const loaded = roundTrip(s, editItem(initialData(), 'SKU2', { name: ' Susu segar ', onHand: '40', unitCost: '6.5' }));
  const sku = loaded.skus.find(x => x.id === 'SKU2')!;
  assert.deepEqual([sku.name, sku.onHand, sku.unitCost], ['Susu segar', 40, 6.5]);
});

test('email closing uses Thank you for new and previously saved drafts', () => {
  const data = testData();
  const draft = buildDraft(data, 'SKU2', 30);
  assert.match(draft.body, /\n\nThank you,\n/);
  const oldDraft = { ...draft, body: draft.body.replace('\n\nThank you,\n', '\n\nTerima kasih,\n') };
  const loaded = roundTrip(new MemStore(), setDraft(data, oldDraft));
  assert.equal(loaded.draft?.body, draft.body);
});

test('test message is clearly marked and never reads like an order', () => {
  const data = testData();
  const draft = buildDraft(data, 'SKU6', 1);
  const testMessage = buildTestEmail(data, draft);
  assert.equal(testMessage.to, 's2@example.test');
  assert.match(testMessage.subject, /TEST ONLY.*DO NOT FULFILL/);
  assert.match(testMessage.body, /not a purchase order/i);
  assert.match(testMessage.body, /Rice \(5KG\)/);
  assert.match(testMessage.body, /No quantity or payment is requested/);
  const logged = recordTestEmail(data, testMessage.to, 'gmail-test-id');
  assert.equal(logged.orders.length, 0);
  assert.match(logged.audit[0].details, /no purchase order was created/i);
});

test('draft persists, a confirmed Gmail send creates one Sent order and blocks duplicates', () => {
  const s = new MemStore();
  const data = testData();
  const withDraft = roundTrip(s, setDraft(data, buildDraft(data, 'SKU1', 30)));
  assert.equal(withDraft.draft?.quantity, 30);
  assert.match(withDraft.draft!.body, /Fresh Milk/);
  assert.throws(() => sendDraft(withDraft, { ...withDraft.draft!, to: 'not-an-email' }), /recipient/);
  const r = sendDraft(withDraft, withDraft.draft!, new Date().toISOString(), 'gmail-message-1');
  assert.equal(r.order.status, 'Sent');
  assert.equal(r.order.totalCost, 225);
  assert.equal(r.data.orders.length, withDraft.orders.length + 1);
  assert.equal(r.data.draft, undefined);
  assert.match(r.data.audit[0].details, /to s1@example.test/);
  assert.equal(r.order.send?.note, 'Sent via connected Gmail account');
  assert.equal(r.order.send?.gmailMessageId, 'gmail-message-1');
  assert.throws(() => sendDraft(r.data, withDraft.draft!), /already sent/);
});

test('status change is tracking only, persists, and never changes stock', () => {
  const s = new MemStore();
  const base = testData();
  const draft = buildDraft(base, 'SKU1', 3);
  const d = sendDraft(setDraft(base, draft), draft).data;
  const orderId = d.orders[0].id;
  const stock = d.skus.map(x => x.onHand);
  let n = setOrderStatus(d, orderId, 'Received');
  n = setOrderStatus(n, orderId, 'Pending Delivery');
  n = setOrderStatus(n, orderId, 'Received');
  const loaded = roundTrip(s, n);
  assert.equal(loaded.orders.find(o => o.id === orderId)!.status, 'Received');
  assert.deepEqual(loaded.skus.map(x => x.onHand), stock);
  assert.throws(() => setOrderStatus(d, 'PO-2406', 'Awaiting approval' as never));
});

test('v1 anonymous migration keeps tracked orders and sets legacy aside; account keys ignored', () => {
  const s = new MemStore();
  s.setItem(`${LEGACY_KEY}:user_123`, JSON.stringify({ secret: true }));
  const v1 = { ...initialData(), version: undefined, orders: [
    { id: 'A', itemId: 'sku-001', supplierId: 'sup-01', quantity: 1, unitCost: 1, totalCost: 1, status: 'Awaiting approval', createdAt: 'x', depletionDays: 1 },
    { id: 'B', itemId: 'sku-001', supplierId: 'sup-01', quantity: 1, unitCost: 1, totalCost: 1, status: 'Received', createdAt: 'x', depletionDays: 1 },
    { id: 'C', itemId: 'sku-001', supplierId: 'sup-01', quantity: 1, unitCost: 1, totalCost: 1, status: 'Rejected', createdAt: 'x', depletionDays: 1 },
  ] };
  s.setItem(LEGACY_KEY, JSON.stringify(v1));
  const { data } = loadStore(s);
  assert.deepEqual(data.orders.map(o => o.id), ['B']);
  assert.deepEqual(data.legacyOrders.map(o => o.status), ['Awaiting approval', 'Rejected']);
  assert.ok(s.getItem(STORE_KEY));
  assert.equal(s.getItem(LEGACY_KEY), JSON.stringify(v1));
  assert.equal(migrateV1({ skus: 'bad' }), null);
  const onlyAccount = new MemStore();
  onlyAccount.setItem(`${LEGACY_KEY}:user_123`, JSON.stringify({ ...initialData(), skus: [] }));
  assert.equal(loadStore(onlyAccount).data.skus.length, initialData().skus.length);
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
  const bad = parseSalesFile('s.csv', 'itemId,date,quantity\nSKU1,2025-04-18,3\nSKU999,2025-04-18,1\nSKU1,2025-02-30,1\nSKU1,2025-04-18,-2\n', d.skus);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.errors.length, 3);
  assert.equal(parseSalesFile('s.csv', 'item,date\n', d.skus).ok, false);
  assert.equal(parseSalesFile('.env', 'X=1', d.skus).ok, false);
  assert.equal(parseSalesFile('s.sql', 'select 1', d.skus).ok, false);
  const good = parseSalesFile('s.csv', '"itemId","date","quantity"\nSKU2,2025-04-18,14\nSKU2,2025-04-12,7\nSKU2,2025-04-01,99\n', d.skus);
  assert.ok(good.ok);
  if (!good.ok) return;
  const p = previewImport(d, good.rows);
  assert.equal(p.windowStart, '2025-04-12');
  assert.equal(p.outside, 1);
  assert.equal(p.items[0].after, 3);
  const next = applyImport(d, p, 'Aina Rahman');
  const milk = next.skus.find(s => s.id === 'SKU2')!;
  assert.equal(milk.avgDailyDemand, 3);
  assert.equal(milk.onHand, 8);
  assert.equal(next.skus.find(s => s.id === 'SKU1')!.avgDailyDemand, d.skus.find(s => s.id === 'SKU1')!.avgDailyDemand);
  const json = parseSalesFile('s.json', JSON.stringify([{ itemId: 'SKU1', date: '2025-04-18', quantity: 'x' }]), d.skus);
  assert.equal(json.ok, false);
  assert.ok(parseSalesFile('sample.csv', sampleCsv(d.skus, '2025-04-18'), d.skus).ok);
});
