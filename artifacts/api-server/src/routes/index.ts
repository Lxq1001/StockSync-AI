import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import datasetRouter from "./dataset";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(datasetRouter);

export default router;
