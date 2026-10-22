export type SKU = {
  id: string; name: string; category: string; onHand: number; unit: string;
  avgDailyDemand: number; leadTimeDays: number; reorderBuffer: number;
  supplierId: string; unitCost: number; recentSales: number[]; batchSize: number;
};
export type Supplier = { id: string; name: string; contactMethod: string; MOQ: number; leadTimeDays: number };
export type OrderStatus = 'Awaiting approval' | 'Pending Delivery' | 'Received' | 'Rejected';
export type DispatchChannel = 'email' | 'whatsapp';
export type FinalizedPO = {
  documentId: string; orderId: string; createdAt: string; approvedAt: string;
  approvedBy: string; supplierName: string; itemName: string; quantity: number;
  unit: string; unitCost: number; totalCost: number; note: string;
};
export type MockDispatch = {
  id: string; channel: DispatchChannel; recipient: string; subject: string;
  body: string; attachment: string; acceptedAt: string; status: 'Mock accepted';
};
export type PurchaseOrder = {
  id: string; itemId: string; supplierId: string; quantity: number; unitCost: number;
  totalCost: number; status: OrderStatus; createdAt: string; depletionDays: number;
  approvalDetails?: string; approvedBy?: string; finalized?: FinalizedPO; dispatch?: MockDispatch;
};
export type AuditEntry = {
  id: string; timestamp: string; actor: string; action: string; details: string;
  orderId?: string; reference?: string;
};
export type StoreData = {
  skus: SKU[]; suppliers: Supplier[]; orders: PurchaseOrder[]; audit: AuditEntry[];
  budgetCap: number; dispatchChannel?: DispatchChannel;
};

export const formatMoney = (value: number) =>
  `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// One local transaction: no live provider, authentication, or external API call.
// The finalized snapshot is never edited by the UI, but browser storage is NOT immutable.
export function finalizeApproval(
  data: StoreData,
  orderId: string,
  quantity: number,
  note = '',
  timestamp = new Date().toISOString(),
  actor = 'Aina Rahman',
): { data: StoreData; order: PurchaseOrder } {
  const order = data.orders.find(o => o.id === orderId);
  if (!order || order.status !== 'Awaiting approval') {
    throw new Error('Only an awaiting-approval order can be approved. This order may already have been processed.');
  }
  const sku = data.skus.find(s => s.id === order.itemId);
  const supplier = data.suppliers.find(s => s.id === order.supplierId);
  if (!sku || !supplier) throw new Error('The item or supplier is missing. Approval was not saved.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > sku.batchSize * 2) {
    throw new Error(`Enter a whole quantity between 1 and ${sku.batchSize * 2}.`);
  }
  if (!Number.isFinite(order.unitCost) || order.unitCost < 0) throw new Error('The unit cost is invalid.');
  const totalCost = Math.round(quantity * order.unitCost * 100) / 100;
  if (!Number.isFinite(data.budgetCap) || data.budgetCap < 1 || totalCost > data.budgetCap) {
    throw new Error(`Approval blocked: the order exceeds the ${formatMoney(data.budgetCap)} budget cap. Review the quantity or update Controls.`);
  }
  const finalized: FinalizedPO = {
    documentId: `DOC-${crypto.randomUUID()}`, orderId, createdAt: order.createdAt,
    approvedAt: timestamp, approvedBy: actor, supplierName: supplier.name,
    itemName: sku.name, quantity, unit: sku.unit, unitCost: order.unitCost,
    totalCost, note: (note.trim() || order.approvalDetails || 'Approved by manager').slice(0, 800),
  };
  const channel = data.dispatchChannel ?? 'whatsapp';
  const dispatch: MockDispatch = {
    id: `MOCK-${crypto.randomUUID()}`, channel,
    recipient: channel === 'email' ? `${supplier.id}@supplier.example` : `${supplier.name} (demo WhatsApp contact)`,
    subject: `Purchase order ${orderId} — ${formatMoney(totalCost)}`,
    body: `Hello ${supplier.name},\n\nPlease find purchase order ${orderId} attached.\n${quantity} ${sku.unit} ${sku.name}\nTotal: ${formatMoney(totalCost)}\nApproved by: ${actor}\n\nPlease confirm availability and the delivery date.\n\nDEMO ONLY: this message was recorded locally, not sent.`,
    attachment: `${orderId}-final.pdf`, acceptedAt: timestamp, status: 'Mock accepted',
  };
  const approved: PurchaseOrder = {
    ...order, quantity, totalCost, status: 'Pending Delivery', approvedBy: finalized.approvedBy,
    approvalDetails: finalized.note, finalized, dispatch,
  };
  const stages = [
    ['Manager approved order', `${quantity} ${sku.unit} ${sku.name} · ${formatMoney(totalCost)} · ${finalized.note}`, finalized.documentId],
    ['Finalized PDF generated', `${dispatch.attachment} · fixed approval snapshot`, finalized.documentId],
    [`Mock ${channel === 'email' ? 'email' : 'WhatsApp'} dispatch accepted`, `${dispatch.recipient} · attachment: ${dispatch.attachment} · no external message sent`, dispatch.id],
    ['Status changed to Pending Delivery', 'Awaiting supplier delivery · receipt is a separate action', dispatch.id],
  ];
  const entries: AuditEntry[] = stages.map(([action, details, reference], index) => ({
    id: crypto.randomUUID(), timestamp: new Date(Date.parse(timestamp) + index).toISOString(),
    actor: index === 0 ? actor : 'StockSync AI · demo',
    action, details: `${orderId} · ${details}`, orderId, reference,
  }));
  return {
    order: approved,
    data: { ...data, orders: data.orders.map(o => o.id === orderId ? approved : o), audit: [...entries.reverse(), ...data.audit] },
  };
}

export function receivePurchaseOrder(data: StoreData, orderId: string, actor = 'Aina Rahman'): StoreData {
  const order = data.orders.find(o => o.id === orderId);
  if (!order || order.status !== 'Pending Delivery') {
    throw new Error('Only a Pending Delivery order can be received. Stock was not added again.');
  }
  const sku = data.skus.find(s => s.id === order.itemId);
  if (!sku) throw new Error('This inventory item could not be found. Receipt was not saved.');
  return {
    ...data,
    orders: data.orders.map(o => o.id === orderId ? { ...o, status: 'Received' } : o),
    skus: data.skus.map(s => s.id === sku.id ? { ...s, onHand: s.onHand + order.quantity } : s),
    audit: [{
      id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor,
      action: 'Simulated delivery received', orderId,
      details: `${orderId} · ${sku.name} · +${order.quantity} ${sku.unit} added to local stock`,
    }, ...data.audit],
  };
}
