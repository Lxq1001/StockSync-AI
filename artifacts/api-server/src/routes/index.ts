import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { GetStockDatasetResponse } from "@workspace/api-zod";
import inventory from "../data/mock_db.json";
import suppliers from "../data/suppliers.json";
import salesTransactions from "../data/sales_transaction.json";
import importData from "../data/import_data.json";

const dataset = GetStockDatasetResponse.parse({ inventory, suppliers, salesTransactions, importData });

const router: IRouter = Router();

router.use(healthRouter);
router.get("/stock-dataset", (_req, res) => {
  res.set("Cache-Control", "no-store").json(dataset);
});

export default router;
