import type { StockDataset } from '@workspace/api-client-react';
import { initialData, RETIRED_STORE_KEYS, saveStore, validV2, type StoreData } from './procurement';
import { averageDailyUse, parseSalesFile, previewImport } from './sales-import';

export type ProvidedDataset = StockDataset;

export function mergeSupplierContacts(data: StoreData, bundle: ProvidedDataset): StoreData {
  const contacts = new Map(bundle.suppliers.map(s => [s.supplier_id, s.email.trim()]));
  const suppliers = data.suppliers.map(s => contacts.has(s.id) ? { ...s, email: contacts.get(s.id) } : s);
  const email = data.draft && contacts.get(data.draft.supplierId);
  const draft = data.draft && email && (!data.draft.to || data.draft.to.endsWith('.example'))
    ? { ...data.draft, to: email } : data.draft;
  if (draft === data.draft && suppliers.every((s, i) => s.email === data.suppliers[i].email)) return data;
  return { ...data, suppliers, draft };
}

export function providedWorkspace(bundle: ProvidedDataset): StoreData {
  const data = initialData();
  data.orders = []; data.audit = []; data.legacyOrders = [];
  data.suppliers = bundle.suppliers.map(s => ({
    id: s.supplier_id, name: s.name, email: s.email.trim(), contactMethod: 'Email', MOQ: 1, leadTimeDays: 2,
  }));
  const suppliers = new Set(data.suppliers.map(s => s.id));
  data.skus = bundle.inventory.map(i => {
    if (!suppliers.has(i.supplier_id)) throw new Error(`No supplier assigned for ${i.id}.`);
    if (![i.stock, i.item_price].every(n => Number.isFinite(n) && n >= 0)) throw new Error(`Invalid stock or price for ${i.id}.`);
    return {
      id: i.id, name: i.name, category: i.category, onHand: i.stock, unitCost: i.item_price,
      supplierId: i.supplier_id, unit: 'unit', avgDailyDemand: 0, recentSales: Array(7).fill(0),
      leadTimeDays: 2, reorderBuffer: 2, batchSize: 1,
    };
  });
  const parsed = parseSalesFile('sales_transaction.json', JSON.stringify(bundle.salesTransactions), data.skus);
  if (!parsed.ok) throw new Error(parsed.errors.join(' '));
  const preview = previewImport(data, parsed.rows);
  data.skus = data.skus.map(s => {
    const result = preview.items.find(i => i.id === s.id);
    return result ? { ...s, avgDailyDemand: result.after, recentSales: result.recentSales } : s;
  });
  data.lastImport = { importedAt: new Date().toISOString(), rows: preview.rows, windowStart: preview.windowStart, windowEnd: preview.windowEnd };
  data.salesTransactions = parsed.rows;
  return data;
}

/** Only supplied product and supplier IDs may survive from a saved workspace. */
export function loadProvidedWorkspace(current: StoreData, bundle: ProvidedDataset): StoreData {
  const next = providedWorkspace(bundle);
  const itemIds = new Set(next.skus.map(s => s.id));
  const mapping = new Map(next.skus.map(s => [s.id, s.supplierId]));
  const linked = (record: { itemId: string; supplierId: string }) => mapping.get(record.itemId) === record.supplierId;
  const orders = current.orders.filter(linked);
  const orderIds = new Set(orders.map(o => o.id));
  const supplierIds = new Set(next.suppliers.map(s => s.id));
  const containsOldData = current.skus.some(s => mapping.get(s.id) !== s.supplierId)
    || current.suppliers.some(s => !supplierIds.has(s.id))
    || current.orders.length !== orders.length || current.legacyOrders.length > 0;
  const history = Array.isArray(current.salesTransactions)
    ? current.salesTransactions.filter(r => itemIds.has(r.itemId) && typeof r.date === 'string' && typeof r.quantity === 'number' && Number.isFinite(r.quantity) && r.quantity >= 0) : [];
  const hasHistory = history.length > 0;
  return mergeSupplierContacts({
    ...current,
    skus: next.skus.map(s => {
      const saved = current.skus.find(old => old.id === s.id && old.supplierId === s.supplierId);
      return saved ? { ...s, name: saved.name, onHand: saved.onHand, unitCost: saved.unitCost,
        ...(hasHistory ? { avgDailyDemand: averageDailyUse(saved.recentSales), recentSales: saved.recentSales } : {}) } : s;
    }),
    suppliers: next.suppliers, orders, legacyOrders: [],
    draft: current.draft && linked(current.draft) ? current.draft : undefined,
    audit: current.audit.filter(a => a.orderId ? orderIds.has(a.orderId) : !containsOldData),
    rejectedSuggestions: current.rejectedSuggestions.filter(id => itemIds.has(id)),
    lastImport: hasHistory ? current.lastImport ?? next.lastImport : next.lastImport,
    salesTransactions: hasHistory ? history : next.salesTransactions,
  }, bundle);
}

type DatasetStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Save the cleaned workspace first; only then remove retired anonymous stores. */
export function activateProvidedWorkspace(current: StoreData, bundle: ProvidedDataset, storage?: DatasetStorage): { data: StoreData; message?: string } {
  let source = current;
  if (!current.skus.length && storage) {
    try {
      const raw = storage.getItem(RETIRED_STORE_KEYS[1]);
      const previous: unknown = raw ? JSON.parse(raw) : null;
      if (validV2(previous)) source = previous;
    } catch { /* Malformed retired records are discarded, never shown. */ }
  }
  const data = loadProvidedWorkspace(source, bundle);
  try {
    saveStore(storage, data);
    for (const key of RETIRED_STORE_KEYS) storage!.removeItem(key);
    return { data };
  } catch (error) {
    return { data, message: error instanceof Error ? error.message : 'Could not finish clearing retired browser data.' };
  }
}
