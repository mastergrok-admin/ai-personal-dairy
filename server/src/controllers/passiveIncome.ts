import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/passiveIncome.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PASSIVE_INCOME_TYPES = [
  "dividend_stock", "dividend_mf", "interest_fd", "interest_savings",
  "interest_nsc", "interest_ppf", "sgb_interest", "other",
] as const;

const createSchema = z.object({
  incomeType: z.enum(PASSIVE_INCOME_TYPES),
  amount: z.number().min(0),
  date: z.string().datetime(),
  source: z.string().min(1).max(200),
  tdsDeducted: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial();

const fiscalYearSchema = z.string().regex(/^\d{4}-\d{2}$/).optional();

export const list = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = fiscalYearSchema.parse(req.query.fiscalYear);
  res.json({
    success: true,
    data: await svc.listPassiveIncome((req as AuthenticatedRequest).userId, fiscalYear),
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createPassiveIncome((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updatePassiveIncome(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deletePassiveIncome(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.fiscalYear);
  res.json({
    success: true,
    data: await svc.getPassiveIncomeSummary((req as AuthenticatedRequest).userId, fiscalYear),
  });
});
