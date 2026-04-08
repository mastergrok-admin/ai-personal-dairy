import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getOverview, getNetWorth } from "../controllers/dashboard.js";

export const dashboardRouter: RouterType = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get("/overview", getOverview);
dashboardRouter.get("/net-worth", getNetWorth);
