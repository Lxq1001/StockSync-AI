// Local, browser-only procurement helpers. No authentication, server or email provider is involved.
export type SKU = {
  id: string; name: string; category: string; onHand: number; unit: string;
  avgDailyDemand: number; leadTimeDays: number; reorderBuffer: number;
  supplierId: string; unitCost: number; recentSales: number[]; batchSize: number;
};
export type Supplier = { id: string; name: string; contactMethod: string; MOQ: number; leadTimeDays: number; email?: string };
/** Tracked purchase-order statuses. Status changes are tracking only and never change stock. */
export const ORDER_STATUSES = ['Sent', 'Pending Delivery', 'Received'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export type SimulatedSend = { to: string; from: string; subject: string; body: string; recordedAt: string; note: 'Demo only - no real email sent' };
export type PurchaseOrder = {
  id: string; itemId: string; supplierId: string; quantity: number; unitCost: number;
  totalCost: number; status: OrderStatus; createdAt: string; depletionDays: number;
  approvedBy?: string; send?: SimulatedSend;
};
/** Legacy v1 suggestions (Awaiting approval / Rejected) kept for reference, never shown as Sent. */
export type LegacyOrder = { id: string; itemId: string; supplierId: string; quantity: number; unitCost: number; totalCost: number; status: string; createdAt: string };
export type AuditEntry = { id: string; timestamp: string; actor: string; action: string; details: string; orderId?: string; reference?: string };
export type TemplateDraft = {
  itemId: string; supplierId: string; quantity: number; unitCost: number;
  to: string; from: string; subject: string; body: string; createdAt: string;
};
export type StoreData = {
  version: 2;
  skus: SKU[]; suppliers: Supplier[]; orders: PurchaseOrder[]; audit: AuditEntry[];
  budgetCap: number; rejectedSuggestions: string[]; legacyOrders: LegacyOrder[];
  draft?: TemplateDraft; lastImport?: { importedAt: string; rows: number; windowStart: string; windowEnd: string };
};

export const MANAGER = 'Aina Rahman';
export const MANAGER_EMAIL = 'aina.rahman@stocksync-demo.example';
export const COVER_ALERT_DAYS = 7;
export const STORE_KEY = 'stocksync-demo-v2';
export const LEGACY_KEY = 'stocksync-demo-v1';

export const formatMoney = (value: number) =>
  `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const initialData = (): StoreData => ({
  version: 2,
  skus: [
    { id: 'sku-001', name: 'Jasmine rice', category: 'Dry goods', onHand: 18, unit: 'kg', avgDailyDemand: 5.2, leadTimeDays: 2, reorderBuffer: 2, supplierId: 'sup-01', unitCost: 4.8, recentSales: [4, 5, 6, 5, 4, 6, 6], batchSize: 25 },
    { id: 'sku-002', name: 'Fresh milk', category: 'Chilled', onHand: 9, unit: 'L', avgDailyDemand: 8.4, leadTimeDays: 1, reorderBuffer: 1, supplierId: 'sup-02', unitCost: 7.2, recentSales: [8, 9, 7, 9, 8, 10, 8], batchSize: 30 },
    { id: 'sku-003', name: 'Chicken breast', category: 'Fresh protein', onHand: 14, unit: 'kg', avgDailyDemand: 6.1, leadTimeDays: 1, reorderBuffer: 2, supplierId: 'sup-02', unitCost: 18.9, recentSales: [5, 6, 7, 5, 6, 7, 6], batchSize: 20 },
    { id: 'sku-004', name: 'Cooking oil', category: 'Dry goods', onHand: 31, unit: 'L', avgDailyDemand: 3.1, leadTimeDays: 3, reorderBuffer: 3, supplierId: 'sup-03', unitCost: 8.5, recentSales: [3, 4, 3, 3, 2, 4, 3], batchSize: 24 },
    { id: 'sku-005', name: 'Kopi beans, medium roast', category: 'Beverage', onHand: 4.5, unit: 'kg', avgDailyDemand: 1.4, leadTimeDays: 4, reorderBuffer: 1, supplierId: 'sup-04', unitCost: 42, recentSales: [1, 2, 1, 1, 2, 1, 2], batchSize: 12 },
    { id: 'sku-006', name: 'Brown sugar', category: 'Dry goods', onHand: 12, unit: 'kg', avgDailyDemand: 1.8, leadTimeDays: 2, reorderBuffer: 2, supplierId: 'sup-01', unitCost: 5.6, recentSales: [2, 2, 1, 2, 2, 1, 2], batchSize: 20 },
    { id: 'sku-007', name: 'Eggs, grade A', category: 'Fresh protein', onHand: 42, unit: 'tray', avgDailyDemand: 7.2, leadTimeDays: 1, reorderBuffer: 3, supplierId: 'sup-03', unitCost: 13.5, recentSales: [7, 8, 6, 8, 7, 8, 7], batchSize: 30 },
    { id: 'sku-008', name: 'Oat milk', category: 'Chilled', onHand: 16, unit: 'carton', avgDailyDemand: 2.3, leadTimeDays: 2, reorderBuffer: 2, supplierId: 'sup-02', unitCost: 11.9, recentSales: [2, 3, 2, 2, 3, 2, 2], batchSize: 18 },
  ],
  suppliers: [
    { id: 'sup-01', name: 'Sinar Pantry Supply', contactMethod: 'Email', MOQ: 10, leadTimeDays: 2 },
    { id: 'sup-02', name: 'Pasar Segar Wholesale', contactMethod: 'Email', MOQ: 6, leadTimeDays: 1 },
    { id: 'sup-03', name: 'Kedai Mart Trading', contactMethod: 'Email', MOQ: 12, leadTimeDays: 2 },
    { id: 'sup-04', name: 'Bukit Roast Cooperative', contactMethod: 'Email', MOQ: 4, leadTimeDays: 4 },
  ],
  orders: [
    { id: 'PO-2406', itemId: 'sku-001', supplierId: 'sup-01', quantity: 24, unitCost: 4.8, totalCost: 115.2, status: 'Pending Delivery', createdAt: '2025-04-17T14:20:00', depletionDays: 3.4, approvedBy: 'Sample manager' },
    { id: 'PO-2405', itemId: 'sku-003', supplierId: 'sup-02', quantity: 12, unitCost: 18.9, totalCost: 226.8, status: 'Received', createdAt: '2025-04-16T11:10:00', depletionDays: 2.3, approvedBy: 'Sample manager' },
  ],
  audit: [
    { id: 'log-3', timestamp: '2025-04-17T14:20:00', actor: 'Sample manager', action: 'Approved order', details: 'PO-2406 · 24 kg Jasmine rice · RM 115.20 · Pending Delivery' },
    { id: 'log-4', timestamp: '2025-04-16T11:10:00', actor: 'Sample manager', action: 'Marked received', details: 'PO-2405 · 12 kg Chicken breast · received at store' },
  ],
  budgetCap: 500, rejectedSuggestions: [], legacyOrders: [],
});

/** Days of stock at current average use. Zero demand means no depletion risk. */
export function estimatedCover(sku: SKU): number {
  if (!(sku.avgDailyDemand > 0)) return Infinity;
  return sku.onHand / sku.avgDailyDemand;
}
export const isLowCover = (sku: SKU) => estimatedCover(sku) <= COVER_ALERT_DAYS;
export const formatCover = (sku: SKU) => { const c = estimatedCover(sku); return Number.isFinite(c) ? `${c.toFixed(1)} days` : 'No recent use'; };

/** Order enough to reach lead time + buffer + 7 days of cover, rounded up to a whole supplier batch. */
export function suggestedQuantity(sku: SKU): number {
  const target = sku.avgDailyDemand * (sku.leadTimeDays + sku.reorderBuffer + COVER_ALERT_DAYS);
  const batch = Math.max(1, Math.round(sku.batchSize) || 1);
  const need = Math.max(0, target - sku.onHand);
  return Math.max(batch, Math.ceil(need / batch) * batch);
}
export type Suggestion = { sku: SKU; quantity: number; totalCost: number; cover: number };
/** AI suggested tasks: strictly items with estimated cover <= 7 days that were not rejected. */
export function suggestions(data: StoreData): Suggestion[] {
  return data.skus
    .filter(s => isLowCover(s) && !data.rejectedSuggestions.includes(s.id))
    .map(sku => { const quantity = suggestedQuantity(sku); return { sku, quantity, totalCost: round2(quantity * sku.unitCost), cover: estimatedCover(sku) }; })
    .sort((a, b) => a.cover - b.cover);
}

const log = (action: string, details: string, orderId?: string, actor = MANAGER): AuditEntry =>
  ({ id: uid(), timestamp: new Date().toISOString(), actor, action, details, orderId });

export function rejectSuggestion(data: StoreData, skuId: string): StoreData {
  const sku = data.skus.find(s => s.id === skuId);
  if (!sku) throw new Error('This item no longer exists.');
  if (data.rejectedSuggestions.includes(skuId)) return data;
  return { ...data, rejectedSuggestions: [...data.rejectedSuggestions, skuId], audit: [log('Rejected suggestion', `${sku.name} · suggested ${suggestedQuantity(sku)} ${sku.unit} dismissed`), ...data.audit] };
}

export type ItemEdit = { name: string; onHand: string; unitCost: string };
/** Validates raw text input. Returns an error message or the parsed values. */
export function validateItemEdit(input: ItemEdit): { error: string } | { name: string; onHand: number; unitCost: number } {
  const name = input.name.trim();
  if (!name) return { error: 'Item name is required.' };
  if (name.length > 80) return { error: 'Item name must be 80 characters or fewer.' };
  if (!input.onHand.trim()) return { error: 'On hand quantity is required.' };
  if (!input.unitCost.trim()) return { error: 'Unit cost is required.' };
  const onHand = Number(input.onHand), unitCost = Number(input.unitCost);
  if (!Number.isFinite(onHand) || onHand < 0) return { error: 'On hand quantity must be a number of 0 or more.' };
  if (!Number.isFinite(unitCost) || unitCost < 0) return { error: 'Unit cost must be a number of 0 or more.' };
  return { name, onHand, unitCost };
}
export function editItem(data: StoreData, skuId: string, input: ItemEdit): StoreData {
  const v = validateItemEdit(input);
  if ('error' in v) throw new Error(v.error);
  const sku = data.skus.find(s => s.id === skuId);
  if (!sku) throw new Error('This item no longer exists.');
  return {
    ...data, skus: data.skus.map(s => s.id === skuId ? { ...s, name: v.name, onHand: v.onHand, unitCost: v.unitCost } : s),
    audit: [log('Edited item', `${v.name} · on hand ${v.onHand} ${sku.unit} · ${formatMoney(v.unitCost)}/${sku.unit}`), ...data.audit],
  };
}

export const supplierEmail = (s: Supplier) => s.email ?? `orders@${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.example`;

export function buildDraft(data: StoreData, skuId: string, quantity: number): TemplateDraft {
  const sku = data.skus.find(s => s.id === skuId);
  if (!sku) throw new Error('This item no longer exists.');
  const supplier = data.suppliers.find(s => s.id === sku.supplierId);
  if (!supplier) throw new Error('The supplier for this item is missing.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Order quantity must be a whole number of 1 or more.');
  const total = round2(quantity * sku.unitCost);
  return {
    itemId: sku.id, supplierId: supplier.id, quantity, unitCost: sku.unitCost, createdAt: new Date().toISOString(),
    to: supplierEmail(supplier), from: `${MANAGER} <${MANAGER_EMAIL}>`,
    subject: `Purchase order request: ${quantity} ${sku.unit} ${sku.name}`,
    body: `Hello ${supplier.name} team,\n\nWe would like to order the following for our store:\n\nItem: ${sku.name}\nQuantity: ${quantity} ${sku.unit}\nUnit price: ${formatMoney(sku.unitCost)} per ${sku.unit}\nTotal: ${formatMoney(total)}\n\nPlease confirm availability and your delivery date. Our usual lead time with you is ${supplier.leadTimeDays} day${supplier.leadTimeDays === 1 ? '' : 's'}.\n\nThank you,\n${MANAGER}\nStore manager`,
  };
}
export const setDraft = (data: StoreData, draft: TemplateDraft | undefined): StoreData => ({ ...data, draft });

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function validateDraft(d: Pick<TemplateDraft, 'to' | 'from' | 'subject' | 'body'>): string | null {
  if (!EMAIL.test(d.to.trim())) return 'Enter one valid recipient email address in To.';
  const fromAddr = d.from.match(/<([^>]+)>/)?.[1] ?? d.from;
  if (!EMAIL.test(fromAddr.trim())) return 'Enter a valid sender in From.';
  if (!d.subject.trim()) return 'Subject is required.';
  if (d.subject.length > 200) return 'Subject must be 200 characters or fewer.';
  if (!d.body.trim()) return 'Content is required.';
  if (d.body.length > 5000) return 'Content must be 5,000 characters or fewer.';
  return null;
}
/** Records a simulated send and creates one Sent purchase order. Throws if there is no draft (prevents duplicates). */
export function sendDraft(data: StoreData, edited: Pick<TemplateDraft, 'to' | 'from' | 'subject' | 'body'>, now = new Date().toISOString()): { data: StoreData; order: PurchaseOrder } {
  const draft = data.draft;
  if (!draft) throw new Error('This draft was already sent or cleared. No new order was created.');
  const err = validateDraft(edited);
  if (err) throw new Error(err);
  const sku = data.skus.find(s => s.id === draft.itemId);
  if (!sku) throw new Error('The item in this draft no longer exists.');
  const existing = new Set(data.orders.map(o => o.id));
  let id = ''; do { id = `PO-${uid().slice(0, 8).toUpperCase()}`; } while (existing.has(id));
  const order: PurchaseOrder = {
    id, itemId: draft.itemId, supplierId: draft.supplierId, quantity: draft.quantity, unitCost: draft.unitCost,
    totalCost: round2(draft.quantity * draft.unitCost), status: 'Sent', createdAt: now,
    depletionDays: Number.isFinite(estimatedCover(sku)) ? round2(estimatedCover(sku)) : 0, approvedBy: MANAGER,
    send: { to: edited.to.trim(), from: edited.from.trim(), subject: edited.subject.trim(), body: edited.body, recordedAt: now, note: 'Demo only - no real email sent' },
  };
  return {
    order,
    data: {
      ...data, draft: undefined, orders: [order, ...data.orders],
      rejectedSuggestions: data.rejectedSuggestions,
      audit: [log('Simulated email send', `${id} · ${draft.quantity} ${sku.unit} ${sku.name} · ${formatMoney(order.totalCost)} · to ${order.send!.to} · demo only, no real email sent · status Sent`, id), ...data.audit],
    },
  };
}

/** Status-only tracking: never changes stock on hand. */
export function setOrderStatus(data: StoreData, orderId: string, status: OrderStatus): StoreData {
  if (!ORDER_STATUSES.includes(status)) throw new Error('Unknown status.');
  const order = data.orders.find(o => o.id === orderId);
  if (!order) throw new Error('This purchase order no longer exists.');
  if (order.status === status) return data;
  return { ...data, orders: data.orders.map(o => o.id === orderId ? { ...o, status } : o), audit: [log('Changed order status', `${orderId} · ${order.status} to ${status} · tracking only, stock not changed`, orderId), ...data.audit] };
}

// ---------- persistence ----------
type KV = Pick<Storage, 'getItem' | 'setItem'>;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown) => typeof v === 'string';
const validSku = (s: unknown): s is SKU => isObj(s) && str(s.id) && str(s.name) && str(s.category) && str(s.unit) && str(s.supplierId) && num(s.onHand) && num(s.avgDailyDemand) && num(s.unitCost) && num(s.leadTimeDays) && num(s.reorderBuffer) && num(s.batchSize) && Array.isArray(s.recentSales);
const validSupplier = (s: unknown): s is Supplier => isObj(s) && str(s.id) && str(s.name) && num(s.leadTimeDays);
const validOrderBase = (o: unknown): o is LegacyOrder => isObj(o) && str(o.id) && str(o.itemId) && str(o.supplierId) && num(o.quantity) && num(o.unitCost) && num(o.totalCost) && str(o.status) && str(o.createdAt);
const validAudit = (a: unknown): a is AuditEntry => isObj(a) && str(a.id) && str(a.timestamp) && str(a.actor) && str(a.action) && str(a.details);

/** Migrates the anonymous v1 workspace. Legacy Awaiting approval / Rejected entries are kept aside, never relabelled Sent. */
export function migrateV1(raw: unknown): StoreData | null {
  if (!isObj(raw)) return null;
  const { skus, suppliers, orders, audit, budgetCap } = raw;
  if (!Array.isArray(skus) || !Array.isArray(suppliers) || !Array.isArray(orders) || !Array.isArray(audit)) return null;
  if (!skus.every(validSku) || !suppliers.every(validSupplier) || !orders.every(validOrderBase) || !audit.every(validAudit)) return null;
  const tracked: PurchaseOrder[] = [], legacy: LegacyOrder[] = [];
  for (const o of orders) {
    const base = { id: o.id, itemId: o.itemId, supplierId: o.supplierId, quantity: o.quantity, unitCost: o.unitCost, totalCost: o.totalCost, createdAt: o.createdAt };
    if (o.status === 'Pending Delivery' || o.status === 'Received') {
      const r = o as unknown as Record<string, unknown>;
      tracked.push({ ...base, status: o.status, depletionDays: num(r.depletionDays) ? (r.depletionDays as number) : 0, ...(str(r.approvedBy) ? { approvedBy: r.approvedBy as string } : {}) });
    } else legacy.push({ ...base, status: o.status });
  }
  return {
    version: 2, skus: skus.map(s => ({ ...s })), suppliers: suppliers.map(s => ({ ...s })), orders: tracked,
    audit: audit.map(a => ({ id: a.id, timestamp: a.timestamp, actor: a.actor, action: a.action, details: a.details, ...(a.orderId ? { orderId: a.orderId } : {}), ...(a.reference ? { reference: a.reference } : {}) })),
    budgetCap: num(budgetCap) ? (budgetCap as number) : 500, rejectedSuggestions: [], legacyOrders: legacy,
  };
}
export function validV2(raw: unknown): raw is StoreData {
  if (!isObj(raw) || raw.version !== 2) return false;
  const r = raw as Record<string, unknown>;
  return Array.isArray(r.skus) && r.skus.every(validSku) && Array.isArray(r.suppliers) && r.suppliers.every(validSupplier)
    && Array.isArray(r.orders) && r.orders.every(o => validOrderBase(o) && (ORDER_STATUSES as readonly string[]).includes(o.status))
    && Array.isArray(r.audit) && r.audit.every(validAudit) && Array.isArray(r.rejectedSuggestions) && Array.isArray(r.legacyOrders);
}

/**
 * Loads only the anonymous keys (v2, then v1 migration). User-ID-keyed account data
 * (stocksync-demo-v1:<userId>) from the removed sign-in is never read and is left untouched.
 */
export function loadStore(storage: KV | undefined): { data: StoreData; message?: string } {
  if (!storage) return { data: initialData(), message: 'Browser storage is unavailable. Changes will not be saved after reload.' };
  try {
    const v2 = storage.getItem(STORE_KEY);
    if (v2) {
      const parsed = JSON.parse(v2);
      if (validV2(parsed)) {
        if (parsed.draft) {
          parsed.draft.body = parsed.draft.body.replace(
            `\n\nTerima kasih,\n${MANAGER}\nStore manager`,
            `\n\nThank you,\n${MANAGER}\nStore manager`,
          );
        }
        return { data: parsed };
      }
      return { data: initialData(), message: 'Saved demo data was unreadable, so the original sample was loaded. It will be replaced on your next change.' };
    }
    const v1 = storage.getItem(LEGACY_KEY);
    if (v1) {
      const migrated = migrateV1(JSON.parse(v1));
      if (migrated) { storage.setItem(STORE_KEY, JSON.stringify(migrated)); return { data: migrated, message: 'Your earlier local demo workspace was carried over.' }; }
    }
    return { data: initialData() };
  } catch (e) {
    return { data: initialData(), message: `Could not read saved demo data (${e instanceof Error ? e.message : 'storage error'}). The original sample was loaded.` };
  }
}
export function saveStore(storage: KV | undefined, data: StoreData) {
  if (!storage) throw new Error('Browser storage is unavailable. This change was not saved.');
  try { storage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch (e) { throw new Error(`Could not save to browser storage (${e instanceof Error ? e.message : 'unknown error'}). The change was not applied.`); }
}
