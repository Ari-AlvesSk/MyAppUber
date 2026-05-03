import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import ridesRouter from "./rides";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/rides", ridesRouter);
router.use("/payments", paymentsRouter);

export default router;
