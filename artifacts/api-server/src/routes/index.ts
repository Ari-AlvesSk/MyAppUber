import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import ridesRouter from "./rides";
import paymentsRouter from "./payments";
import withdrawalsRouter from "./withdrawals";
import driversRouter from "./drivers";
import couponsRouter from "./coupons";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/rides", ridesRouter);
router.use("/payments", paymentsRouter);
router.use("/withdrawals", withdrawalsRouter);
router.use("/drivers", driversRouter);
router.use("/coupons", couponsRouter);

export default router;
