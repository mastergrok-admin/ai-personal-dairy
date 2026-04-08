import { Request, Response } from "express";
import * as svc from "../services/investments.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getInvestmentSummary((req as AuthenticatedRequest).userId);
  res.json({ success: true, data });
});
