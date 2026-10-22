import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDraft, editItem, initialData, LEGACY_KEY, loadStore, migrateV1, rejectSuggestion, saveStore, sendDraft,
  setDraft, setOrderStatus, STORE_KEY, suggestions, validateItemEdit, type StoreData,
} from './procurement';
import { applyImport, parseCsv, parseSalesFile, previewImport, sampleCsv } from './sales-import';

class MemStore { m = new Map<string, string>(); fail = false;
  getItem(k: string) { return this.m.get(k) ?? null; }
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
  const loaded = roundTrip(s, editItem(initialData(), 'sku-002', { name: ' Susu segar ', onHand: '40', unitCost: '6.5' }));
  const sku = loaded.skus.find(x => x.id === 'sku-002')!;
  assert.deepEqual([sku.name, sku.onHand, sku.unitCost], ['Susu segar', 40, 6.5]);
});

test('email closing uses Thank you for new and previously saved drafts', () => {
  const data = initialData();
  const draft = buildDraft(data, 'sku-002', 30);
  assert.match(draft.body, /\n\nThank you,\n/);
  const oldDraft = { ...draft, body: draft.body.replace('\n\nThank you,\n', '\n\nTerima kasih,\n') };
  const loaded = roundTrip(new MemStore(), setDraft(data, oldDraft));
  assert.equal(loaded.draft?.body, draft.body);
});

test('draft persists, send creates exactly one Sent order and blocks duplicates', () => {
  const s = new MemStore();
  const withDraft = roundTrip(s, setDraft(initialData(), buildDraft(initialData(), 'sku-002', 30)));
  assert.equal(withDraft.draft?.quantity, 30);
  assert.match(withDraft.draft!.body, /Fresh milk/);
  assert.throws(() => sendDraft(withDraft, { ...withDraft.draft!, to: 'not-an-email' }), /recipient/);
  const r = sendDraft(withDraft, withDraft.draft!);
  assert.equal(r.order.status, 'Sent');
  assert.equal(r.order.totalCost, 216);
  assert.equal(r.data.orders.length, withDraft.orders.length + 1);
  assert.equal(r.data.draft, undefined);
  assert.match(r.data.audit[0].details, /no real email/);
  assert.throws(() => sendDraft(r.data, withDraft.draft!), /already sent/);
});

test('status change is tracking only, persists, and never changes stock', () => {
  const s = new MemStore();
  const d = initialData();
  const stock = d.skus.map(x => x.onHand);
  let n = setOrderStatus(d, 'PO-2406', 'Received');
  n = setOrderStatus(n, 'PO-2406', 'Pending Delivery');
  n = setOrderStatus(n, 'PO-2406', 'Received');
  const loaded = roundTrip(s, n);
  assert.equal(loaded.orders.find(o => o.id === 'PO-2406')!.status, 'Received');
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
  const bad = parseSalesFile('s.csv', 'itemId,date,quantity\nsku-001,2025-04-18,3\nsku-999,2025-04-18,1\nsku-001,2025-02-30,1\nsku-001,2025-04-18,-2\n', d.skus);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.errors.length, 3);
  assert.equal(parseSalesFile('s.csv', 'item,date\n', d.skus).ok, false);
  assert.equal(parseSalesFile('.env', 'X=1', d.skus).ok, false);
  assert.equal(parseSalesFile('s.sql', 'select 1', d.skus).ok, false);
  const good = parseSalesFile('s.csv', '"itemId","date","quantity"\nsku-002,2025-04-18,14\nsku-002,2025-04-12,7\nsku-002,2025-04-01,99\n', d.skus);
  assert.ok(good.ok);
  if (!good.ok) return;
  const p = previewImport(d, good.rows);
  assert.equal(p.windowStart, '2025-04-12');
  assert.equal(p.outside, 1);
  assert.equal(p.items[0].after, 3);
  const next = applyImport(d, p, 'Aina Rahman');
  const milk = next.skus.find(s => s.id === 'sku-002')!;
  assert.equal(milk.avgDailyDemand, 3);
  assert.equal(milk.onHand, 9);
  assert.equal(next.skus.find(s => s.id === 'sku-001')!.avgDailyDemand, 5.2);
  const json = parseSalesFile('s.json', JSON.stringify([{ itemId: 'sku-001', date: '2025-04-18', quantity: 'x' }]), d.skus);
  assert.equal(json.ok, false);
  assert.ok(parseSalesFile('sample.csv', sampleCsv(d.skus, '2025-04-18'), d.skus).ok);
});
