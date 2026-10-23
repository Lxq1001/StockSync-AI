// Browser-local procurement records. Actual sends are accepted by the server's Gmail transport.
import type { EmailReceipt } from '@workspace/api-client-react';
export type SKU = {
  id: string; name: string; category: string; onHand: number; unit: string;
  avgDailyDemand: number; leadTimeDays: number; reorderBuffer: number;
  supplierId: string; unitCost: number; recentSales: number[]; batchSize: number;
};
export type Supplier = { id: string; name: string; contactMethod: string; MOQ: number; leadTimeDays: number; email?: string };
/** Tracked purchase-order statuses. Status changes are tracking only and never change stock. */
export const ORDER_STATUSES = ['Sent', 'Pending Delivery', 'Received'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export type SimulatedSend = { to: string; from: string; subject: string; body: string; recordedAt: string; note: 'Demo only - no real email sent' | 'Sent from external mail app; confirmed by user' | 'Real email accepted by Gmail'; receipt?: EmailReceipt };
export type PurchaseOrder = {
  id: string; itemId: string; supplierId: string; quantity: number; unitCost: number;
  totalCost: number; status: OrderStatus; createdAt: string; depletionDays: number;
  approvedBy?: string; send?: SimulatedSend;
};
/** Legacy v1 suggestions (Awaiting approval / Rejected) kept for reference, never shown as Sent. */
export type LegacyOrder = { id: string; itemId: string; supplierId: string; quantity: number; unitCost: number; totalCost: number; status: string; createdAt: string };
export type AuditEntry = { id: string; timestamp: string; actor: string; action: string; details: string; orderId?: string; reference?: string };
export type TemplateDraft = {
  sendId?: string;
  itemId: string; supplierId: string; quantity: number; unitCost: number;
  to: string; from: string; subject: string; body: string; createdAt: string;
};
export type StoreData = {
  version: 2;
  startingStockRandomized?: boolean;
  demoSuggestionsSeeded?: boolean;
  skus: SKU[]; suppliers: Supplier[]; orders: PurchaseOrder[]; audit: AuditEntry[];
  budgetCap: number; rejectedSuggestions: string[]; legacyOrders: LegacyOrder[];
  salesTransactions?: import('./sales-import').SalesRow[];
  draft?: TemplateDraft; lastImport?: { importedAt: string; rows: number; windowStart: string; windowEnd: string };
};

export const MANAGER = 'Aina Rahman';
export const MANAGER_EMAIL = 'aina.rahman@stocksync-demo.example';
export const COVER_ALERT_DAYS = 7;
export const REORDER_ON_HAND_THRESHOLD = 7;
export const REORDER_DAYS = 30;
export const STORE_KEY = 'stocksync-datasets-v1';
export const RETIRED_STORE_KEYS = ['stocksync-demo-v1', 'stocksync-demo-v2'] as const;

export const formatMoney = (value: number) =>
  `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const initialData = (): StoreData => ({
  version: 2,
  skus: [], suppliers: [], orders: [], audit: [],
  budgetCap: 500, rejectedSuggestions: [], legacyOrders: [], salesTransactions: [],
});

/** Days of stock at current average use. Zero demand means no depletion risk. */
export function estimatedCover(sku: SKU): number {
  if (!(sku.avgDailyDemand > 0)) return Infinity;
  return sku.onHand / sku.avgDailyDemand;
}
export const isLowCover = (sku: SKU) => estimatedCover(sku) <= COVER_ALERT_DAYS;
export const formatCover = (sku: SKU) => { const c = estimatedCover(sku); return Number.isFinite(c) ? `${c.toFixed(1)} days` : 'No recent use'; };

/** At seven units on hand or less, suggest 30 days of average use. No stock subtraction or batch rounding. */
export function suggestedQuantity(sku: SKU): number {
  return sku.onHand <= REORDER_ON_HAND_THRESHOLD ? sku.avgDailyDemand * REORDER_DAYS : 0;
}
export type Suggestion = { sku: SKU; quantity: number; totalCost: number; cover: number };
/** Low on-hand stock with positive recent demand, excluding dismissed suggestions. */
export function suggestions(data: StoreData): Suggestion[] {
  return data.skus
    .filter(s => suggestedQuantity(s) > 0 && !data.rejectedSuggestions.includes(s.id))
    .map(sku => { const quantity = suggestedQuantity(sku); return { sku, quantity, totalCost: round2(quantity * sku.unitCost), cover: estimatedCover(sku) }; })
    .sort((a, b) => a.cover - b.cover);
}

const lowCoverSuggestionQuantity = (sku: SKU) => sku.avgDailyDemand * REORDER_DAYS;
/** Shared AI tasks for Inventory and Overview, based on estimated cover. */
export function lowCoverSuggestions(data: StoreData): Suggestion[] {
  return data.skus
    .filter(s => isLowCover(s) && s.avgDailyDemand > 0 && !data.rejectedSuggestions.includes(s.id))
    .map(sku => { const quantity = lowCoverSuggestionQuantity(sku); return { sku, quantity, totalCost: round2(quantity * sku.unitCost), cover: estimatedCover(sku) }; })
    .sort((a, b) => a.cover - b.cover);
}

const log = (action: string, details: string, orderId?: string, actor = MANAGER): AuditEntry =>
  ({ id: uid(), timestamp: new Date().toISOString(), actor, action, details, orderId });

export function rejectSuggestion(data: StoreData, skuId: string): StoreData {
  const sku = data.skus.find(s => s.id === skuId);
  if (!sku) throw new Error('This item no longer exists.');
  if (data.rejectedSuggestions.includes(skuId)) return data;
  return { ...data, rejectedSuggestions: [...data.rejectedSuggestions, skuId], audit: [log('Rejected suggestion', `${sku.name} · suggested ${lowCoverSuggestionQuantity(sku)} ${sku.unit} dismissed`), ...data.audit] };
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

export const supplierEmail = (s: Supplier) => s.email?.trim() ?? '';

export function buildDraft(data: StoreData, skuId: string, quantity: number): TemplateDraft {
  const sku = data.skus.find(s => s.id === skuId);
  if (!sku) throw new Error('This item no longer exists.');
  const supplier = data.suppliers.find(s => s.id === sku.supplierId);
  if (!supplier) throw new Error('The supplier for this item is missing.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Order quantity must be a whole number of 1 or more.');
  const total = round2(quantity * sku.unitCost);
  return {
    sendId: uid(), itemId: sku.id, supplierId: supplier.id, quantity, unitCost: sku.unitCost, createdAt: new Date().toISOString(),
    to: supplierEmail(supplier), from: `${MANAGER} <${MANAGER_EMAIL}>`,
    subject: `Purchase order request: ${quantity} ${sku.unit} ${sku.name}`,
    body: `Hello ${supplier.name} team,\n\nWe would like to order the following for our store:\n\nItem: ${sku.name}\nQuantity: ${quantity} ${sku.unit}\nUnit price: ${formatMoney(sku.unitCost)} per ${sku.unit}\nTotal: ${formatMoney(total)}\n\nPlease confirm availability and your delivery date. Our usual lead time with you is ${supplier.leadTimeDays} day${supplier.leadTimeDays === 1 ? '' : 's'}.\n\nThank you,\n${MANAGER}\nStore manager`,
  };
}
export const setDraft = (data: StoreData, draft: TemplateDraft | undefined): StoreData => ({ ...data, draft });

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function validateEmailContent(d: Pick<TemplateDraft, 'to' | 'subject' | 'body'>): string | null {
  if (!EMAIL.test(d.to.trim())) return 'Enter one valid recipient email address in To.';
  if (!d.subject.trim()) return 'Subject is required.';
  if (d.subject.length > 200) return 'Subject must be 200 characters or fewer.';
  if (!d.body.trim()) return 'Content is required.';
  if (d.body.length > 5000) return 'Content must be 5,000 characters or fewer.';
  return null;
}
export function validateDraft(d: Pick<TemplateDraft, 'to' | 'from' | 'subject' | 'body'>): string | null {
  const problem = validateEmailContent(d);
  if (problem) return problem;
  const fromAddr = d.from.match(/<([^>]+)>/)?.[1] ?? d.from;
  return EMAIL.test(fromAddr.trim()) ? null : 'Enter a valid sender in From.';
}
/** Opens the real Gmail composer; this does not send or verify delivery. */
export function buildGmailComposeUrl(draft: Pick<TemplateDraft, 'to' | 'subject' | 'body'>): string {
  const params = new URLSearchParams({
    view: 'cm', fs: '1', to: draft.to.trim(), su: draft.subject, body: draft.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
/** Builds a prefilled email-app handoff; the app cannot verify whether the user sends it. */
export function buildMailtoUrl(draft: Pick<TemplateDraft, 'to' | 'subject' | 'body'>): string {
  return `mailto:${draft.to.trim()}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}
/** Records a user-confirmed external send and creates one Sent purchase order. Throws if there is no draft (prevents duplicates). */
export function sendDraft(data: StoreData, edited: Pick<TemplateDraft, 'to' | 'from' | 'subject' | 'body'>, now = new Date().toISOString(), receipt?: EmailReceipt): { data: StoreData; order: PurchaseOrder } {
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
    send: { to: edited.to.trim(), from: receipt?.from ?? 'Not captured (external mail app)', subject: edited.subject.trim(), body: edited.body, recordedAt: now, note: receipt ? 'Real email accepted by Gmail' : 'Sent from external mail app; confirmed by user', ...(receipt ? { receipt } : {}) },
  };
  return {
    order,
    data: {
      ...data, draft: undefined, orders: [order, ...data.orders],
      rejectedSuggestions: data.rejectedSuggestions,
      audit: [log(receipt ? 'Email sent via Gmail' : 'Email marked as sent', `${id} · ${draft.quantity} ${sku.unit} ${sku.name} · ${formatMoney(order.totalCost)} · to ${order.send!.to} · ${receipt ? `Gmail accepted message ${receipt.messageId}; delivery not verified` : 'user confirmed sent from external mail app'} · status Sent`, id), ...data.audit],
    },
  };
}

/** Status-only tracking: never changes stock on hand. */
export function setOrderStatus(data: StoreData, orderId: string, status: OrderStatus): StoreData {
  if (!ORDER_STATUSES.includes(status)) throw new Error('Unknown status.');
  const order = data.orders.find(o => o.id === orderId);
  if (!order) throw new Error('This purchase order no longer exists.');
  if (order.status === status) return data;
  return { ...data, orders: data.orders.map(o => o.id === orderId ? { ...o, status } : o), audit: [log('Changed order status', `${orderId} · ${order.status} to ${status}`, orderId), ...data.audit] };
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

export function validV2(raw: unknown): raw is StoreData {
  if (!isObj(raw) || raw.version !== 2) return false;
  const r = raw as Record<string, unknown>;
  return (r.startingStockRandomized === undefined || typeof r.startingStockRandomized === 'boolean')
    && (r.demoSuggestionsSeeded === undefined || typeof r.demoSuggestionsSeeded === 'boolean')
    && Array.isArray(r.skus) && r.skus.every(validSku) && Array.isArray(r.suppliers) && r.suppliers.every(validSupplier)
    && Array.isArray(r.orders) && r.orders.every(o => validOrderBase(o) && (ORDER_STATUSES as readonly string[]).includes(o.status))
    && Array.isArray(r.audit) && r.audit.every(validAudit) && Array.isArray(r.rejectedSuggestions) && Array.isArray(r.legacyOrders);
}

/**
 * Loads only the dataset-only workspace. The retired sample stores are never
 * rendered or migrated here. Account-specific keys are never read.
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
      return { data: initialData(), message: 'Saved workspace was unreadable. Loading only the supplied datasets.' };
    }
    return { data: initialData() };
  } catch (e) {
    return { data: initialData(), message: `Could not read saved workspace (${e instanceof Error ? e.message : 'storage error'}). Loading only the supplied datasets.` };
  }
}
export function saveStore(storage: KV | undefined, data: StoreData) {
  if (!storage) throw new Error('Browser storage is unavailable. This change was not saved.');
  try { storage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch (e) { throw new Error(`Could not save to browser storage (${e instanceof Error ? e.message : 'unknown error'}). The change was not applied.`); }
}
