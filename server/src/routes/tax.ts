import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/tax.js";

const router: Router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);
router.get("/deductions", ctrl.listDeductions);
router.post("/deductions", ctrl.createDeduction);
router.put("/deductions/:id", ctrl.updateDeduction);
router.delete("/deductions/:id", ctrl.removeDeduction);
router.put("/profile", ctrl.updateProfile);

export { router as taxRouter };
