
import { Router, type IRouter } from "express";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);

// GET /api/inventory
router.get("/inventory", async (_req, res, next) => {
  try {
    const filePath = join(process.cwd(), "src", "mock_db.json");
    const fileContent = await readFile(filePath, "utf-8");
    const mockData = JSON.parse(fileContent);

    res.json(mockData);
  } catch (error) {
    next(error);
  }
});

// GET /api/suppliers
router.get("/suppliers", async (_req, res, next) => {
  try {
    const filePath = join(process.cwd(), "src", "suppliers.json");
    const fileContent = await readFile(filePath, "utf-8");
    const suppliers = JSON.parse(fileContent);

    res.json(suppliers);
  } catch (error) {
    next(error);
  }
});

// POST /api/dispatch
router.post("/dispatch", (_req, res) => {
  console.log("Purchase Order Sent to WhatsApp!");
  res.json({ status: "success" });
});

export default router;