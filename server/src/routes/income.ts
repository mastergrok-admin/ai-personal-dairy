import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/income.js";

const router: Router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as incomeRouter };
