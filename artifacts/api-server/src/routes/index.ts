import { Router, type IRouter } from "express";
import healthRouter from "./health";
import examioRouter from "./examio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(examioRouter);

export default router;
