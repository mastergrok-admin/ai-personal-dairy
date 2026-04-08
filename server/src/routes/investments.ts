import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/investments.js";

const router: Router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);

export { router as investmentsRouter };
