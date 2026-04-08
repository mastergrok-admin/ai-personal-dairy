import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/lending.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/repayments", ctrl.addRepayment);
router.delete("/:id/repayments/:repaymentId", ctrl.removeRepayment);

export { router as lendingRouter };
