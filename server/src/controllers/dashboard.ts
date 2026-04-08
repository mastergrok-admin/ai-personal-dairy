import * as dashboardService from "../services/dashboard.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";

export const getOverview = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const overview = await dashboardService.getOverview(userId);
  res.json({ success: true, data: overview });
});

export const getNetWorth = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = await dashboardService.getNetWorth(userId);
  res.json({ success: true, data });
});
