import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/vehicles.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/:id/service", ctrl.serviceHistory);
router.post("/:id/service", ctrl.addService);
router.delete("/:id/service/:serviceId", ctrl.deleteService);

export { router as vehiclesRouter };
