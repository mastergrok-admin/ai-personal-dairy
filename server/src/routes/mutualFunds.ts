import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/mutualFunds.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/:id/transactions", ctrl.listTransactions);
router.post("/:id/transactions", ctrl.addTransaction);
router.delete("/:id/transactions/:txId", ctrl.removeTransaction);

export { router as mutualFundsRouter };
