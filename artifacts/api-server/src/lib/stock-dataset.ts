import { GetStockDatasetResponse } from "@workspace/api-zod";
import inventory from "../data/mock_db.json";
import suppliers from "../data/suppliers.json";
import salesTransactions from "../data/sales_transaction.json";
import importData from "../data/import_data.json";

// Contact addresses are not published by this endpoint. Gmail's secure recipient
// configuration remains authoritative for sending.
export const stockDataset = GetStockDatasetResponse.parse({
  inventory,
  suppliers: suppliers.map(({ supplier_id, name }) => ({ supplier_id, name })),
  salesTransactions,
  importData,
});

const supplierIds = new Set(stockDataset.suppliers.map(s => s.supplier_id));
const itemIds = new Set(stockDataset.inventory.map(i => i.id));
if (supplierIds.size !== stockDataset.suppliers.length || itemIds.size !== stockDataset.inventory.length) {
  throw new Error("StockSync dataset contains duplicate product or supplier IDs.");
}
for (const item of stockDataset.inventory) {
  if (!supplierIds.has(item.supplier_id)) throw new Error(`Unknown supplier for ${item.id}.`);
}
for (const transaction of [...stockDataset.salesTransactions, ...stockDataset.importData]) {
  const items = Array.isArray(transaction.items) ? transaction.items : [transaction.items];
  for (const item of items) {
    if (!itemIds.has(item.id)) throw new Error(`Unknown product in sales transaction ${transaction.sales_id}.`);
  }
}
