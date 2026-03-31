import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { getSettings, updateSetting } from "../controllers/appSettings.js";

export const appSettingsRouter: RouterType = Router();

appSettingsRouter.use(authenticate);
appSettingsRouter.get("/", authorize("admin.settings.read"), getSettings);
appSettingsRouter.put("/", authorize("admin.settings.update"), updateSetting);
