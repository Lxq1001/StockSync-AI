import { Router } from "express";
import { stockDataset } from "../lib/stock-dataset";

const router = Router();
router.get("/stock-dataset", (_req, res) => {
  res.set("Cache-Control", "no-store").json(stockDataset);
});
export default router;
