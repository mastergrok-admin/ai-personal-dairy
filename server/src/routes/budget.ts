import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/budget.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.get);
router.get("/vs-actual", ctrl.vsActual);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);

export { router as budgetRouter };
