import { z } from "zod";
import * as appSettingsService from "../services/appSettings.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await appSettingsService.getAllSettings();
  res.json({ success: true, data: settings });
});

export const updateSetting = asyncHandler(async (req, res) => {
  const { key, value } = updateSettingSchema.parse(req.body);
  await appSettingsService.updateSetting(key, value);
  res.json({ success: true });
});
