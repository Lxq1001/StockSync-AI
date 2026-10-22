import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finalizeApproval, receivePurchaseOrder, type StoreData } from './procurement';
import { createPurchaseOrderPdf } from './purchase-order-pdf';

function fixture(): StoreData {
  return {
    budgetCap: 500, dispatchChannel: 'whatsapp', audit: [],
    skus: [{ id: 'milk', name: 'Fresh milk', category: 'Chilled', onHand: 9, unit: 'L', avgDailyDemand: 8.4, leadTimeDays: 1, reorderBuffer: 1, supplierId: 'supplier', unitCost: 7.2, recentSales: [8, 9], batchSize: 30 }],
    suppliers: [{ id: 'supplier', name: 'Demo supplier', contactMethod: 'Phone', MOQ: 6, leadTimeDays: 1 }],
    orders: [{ id: 'PO-TEST', itemId: 'milk', supplierId: 'supplier', quantity: 18, unitCost: 7.2, totalCost: 129.6, status: 'Awaiting approval', createdAt: '2026-10-22T05:00:00Z', depletionDays: 1.1 }],
  };
}

test('approval finalizes a fixed snapshot, mock attachment and four linked audit events without adding stock', () => {
  const original = fixture();
  const result = finalizeApproval(original, 'PO-TEST', 20, 'Weekend stock', '2026-10-22T05:30:00Z');
  assert.equal(result.order.status, 'Pending Delivery');
  assert.equal(result.order.totalCost, 144);
  assert.equal(result.order.finalized?.quantity, 20);
  assert.equal(result.order.finalized?.note, 'Weekend stock');
  assert.equal(result.order.dispatch?.channel, 'whatsapp');
  assert.equal(result.order.dispatch?.attachment, 'PO-TEST-final.pdf');
  assert.equal(result.data.audit.length, 4);
  assert.ok(result.data.audit.every(a => a.orderId === 'PO-TEST' && a.reference));
  assert.equal(result.data.skus[0].onHand, 9);
  assert.equal(original.orders[0].status, 'Awaiting approval');
  assert.throws(() => finalizeApproval(result.data, 'PO-TEST', 20), /already/);
  const reloaded = JSON.parse(JSON.stringify(result.data)) as StoreData;
  assert.deepEqual(reloaded.orders[0].finalized, result.order.finalized);
});

test('email is explicitly mocked and uses reserved example destination', () => {
  const data = fixture();
  data.dispatchChannel = 'email';
  const { order } = finalizeApproval(data, 'PO-TEST', 18);
  assert.equal(order.dispatch?.channel, 'email');
  assert.match(order.dispatch!.recipient, /\.example$/);
  assert.match(order.dispatch!.body, /not sent/);
});

test('budget and invalid quantity block approval without partial state', () => {
  const data = fixture();
  data.budgetCap = 100;
  assert.throws(() => finalizeApproval(data, 'PO-TEST', 18), /budget cap/);
  for (const qty of [0, -1, 1.5, NaN, Infinity, 61]) {
    assert.throws(() => finalizeApproval(data, 'PO-TEST', qty), /whole quantity/);
  }
  assert.equal(data.orders[0].status, 'Awaiting approval');
  assert.equal(data.audit.length, 0);
});

test('generated file is a genuine PDF with order totals and simulation disclosure', async () => {
  const { order } = finalizeApproval(fixture(), 'PO-TEST', 20, 'Weekend stock');
  const pdf = createPurchaseOrderPdf(order.finalized!);
  assert.equal(pdf.type, 'application/pdf');
  const text = new TextDecoder().decode(await pdf.arrayBuffer());
  assert.match(text, /^%PDF-/);
  assert.match(text, /PO-TEST/);
  assert.match(text, /RM 144.00/);
  assert.match(text, /Supplier dispatch is mocked/);
  assert.match(text, /%%EOF/);
});

test('receipt adds finalized quantity once and never changes the finalized PO', () => {
  const approved = finalizeApproval(fixture(), 'PO-TEST', 20);
  const received = receivePurchaseOrder(approved.data, 'PO-TEST');
  assert.equal(received.skus[0].onHand, 29);
  assert.equal(received.orders[0].status, 'Received');
  assert.deepEqual(received.orders[0].finalized, approved.order.finalized);
  assert.equal(received.audit.length, 5);
  assert.throws(() => receivePurchaseOrder(received, 'PO-TEST'), /not added again/);
  assert.equal(received.skus[0].onHand, 29);
});
