import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listFixedDeposits,
  createFixedDeposit,
  updateFixedDeposit,
  deleteFixedDeposit,
} from "../controllers/fixedDeposits.js";

export const fixedDepositsRouter: RouterType = Router();

fixedDepositsRouter.use(authenticate);
fixedDepositsRouter.get("/", listFixedDeposits);
fixedDepositsRouter.post("/", createFixedDeposit);
fixedDepositsRouter.put("/:id", updateFixedDeposit);
fixedDepositsRouter.delete("/:id", deleteFixedDeposit);
