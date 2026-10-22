export type MockSaleTransaction = {
  transaction_id: string;
  date: string;
  item_id: string;
  quantity_sold: number;
  unit_price: number;
  total: number;
  is_dummy: true;
};

export const mockSuppliers = [
  { id: 'S1', name: 'DailySun Sdn Bhd', MOQ: 1, leadTimeDays: 2 },
  { id: 'S2', name: 'PadiMas Sdn Bhd', MOQ: 1, leadTimeDays: 2 },
  { id: 'S3', name: 'LifeThings Sdn Bhd', MOQ: 1, leadTimeDays: 2 },
] as const;

export const mockItems = [
  { id: 'SKU1', name: 'Fresh Milk (1L)', category: 'Dairy & Refrigerated', onHand: 10, unitCost: 7.5, supplierId: 'S1', dailyRate: 4.2 },
  { id: 'SKU2', name: 'Butter (250G)', category: 'Dairy & Refrigerated', onHand: 8, unitCost: 10, supplierId: 'S1', dailyRate: 1.8 },
  { id: 'SKU3', name: 'Eggs (10 pcs)', category: 'Dairy & Refrigerated', onHand: 3, unitCost: 6.5, supplierId: 'S1', dailyRate: 3.1 },
  { id: 'SKU4', name: 'Cheese (200G)', category: 'Dairy & Refrigerated', onHand: 5, unitCost: 12, supplierId: 'S1', dailyRate: 1.3 },
  { id: 'SKU5', name: 'Yogurt (500G)', category: 'Dairy & Refrigerated', onHand: 18, unitCost: 8, supplierId: 'S1', dailyRate: 2 },
  { id: 'SKU6', name: 'Rice (5KG)', category: 'Staples & Grains', onHand: 7, unitCost: 30, supplierId: 'S2', dailyRate: 1.5 },
  { id: 'SKU7', name: 'Bread (400g)', category: 'Staples & Grains', onHand: 6, unitCost: 4, supplierId: 'S2', dailyRate: 3.7 },
  { id: 'SKU8', name: 'Instant Noodles (5 PACK)', category: 'Staples & Grains', onHand: 45, unitCost: 5.5, supplierId: 'S2', dailyRate: 3.4 },
  { id: 'SKU9', name: 'Flour (1KG)', category: 'Staples & Grains', onHand: 18, unitCost: 3.5, supplierId: 'S2', dailyRate: 1 },
  { id: 'SKU10', name: 'Cooking Oil (1KG)', category: 'Staples & Grains', onHand: 8, unitCost: 7, supplierId: 'S2', dailyRate: 1.4 },
  { id: 'SKU11', name: 'Toothpaste (150G)', category: 'Personal & Household Care', onHand: 55, unitCost: 7, supplierId: 'S3', dailyRate: 1.2 },
  { id: 'SKU12', name: 'Shampoo (650ML)', category: 'Personal & Household Care', onHand: 17, unitCost: 18, supplierId: 'S3', dailyRate: 1.1 },
  { id: 'SKU13', name: 'Body Wash (500ML)', category: 'Personal & Household Care', onHand: 5, unitCost: 12, supplierId: 'S3', dailyRate: 1.8 },
  { id: 'SKU14', name: 'Laundry Detergent (2KG)', category: 'Personal & Household Care', onHand: 11, unitCost: 15, supplierId: 'S3', dailyRate: 0.9 },
  { id: 'SKU15', name: 'Dishwashing Liquid (900ML)', category: 'Personal & Household Care', onHand: 10, unitCost: 6, supplierId: 'S3', dailyRate: 1.1 },
] as const;

const dailyPattern = [0.82, 1.08, 1.21, 0.93, 1.14, 1.31, 0.71];
const start = Date.UTC(2026, 9, 8);

/** Fourteen deterministic, synthetic daily sales rows for each catalog item. */
export const mockSalesTransactions: MockSaleTransaction[] = mockItems.flatMap((item, itemIndex) =>
  Array.from({ length: 14 }, (_, day) => {
    const quantity = Math.max(0, Math.round(item.dailyRate * dailyPattern[(day + itemIndex) % dailyPattern.length]));
    const date = new Date(start + day * 86_400_000).toISOString().slice(0, 10);
    return {
      transaction_id: `DUMMY-${item.id}-${date.replaceAll('-', '')}`,
      date,
      item_id: item.id,
      quantity_sold: quantity,
      unit_price: item.unitCost,
      total: Number((quantity * item.unitCost).toFixed(2)),
      is_dummy: true as const,
    };
  }).filter(row => row.quantity_sold > 0),
);

export const mockSalesWindow = { start: '2026-10-08', end: '2026-10-21' };
