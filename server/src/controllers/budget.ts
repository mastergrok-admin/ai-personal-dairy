import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/budget.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const EXPENSE_CATEGORIES = [
  "groceries","vegetables_fruits","fuel","transport","school_fees","medical",
  "utilities","internet_mobile","religious","eating_out","clothing","rent",
  "household","other",
] as const;

const monthYearQuery = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

const itemSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  budgetAmount: z.number().min(0),
});

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  items: z.array(itemSchema).default([]),
  copyFromMonth: z.number().int().min(1).max(12).optional(),
  copyFromYear: z.number().int().min(2000).max(2100).optional(),
});

const updateSchema = z.object({
  items: z.array(itemSchema),
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = monthYearQuery.parse(req.query);
  const budget = await svc.getBudget((req as AuthenticatedRequest).userId, month, year);
  if (!budget) {
    res.status(404).json({ success: false, message: "No budget set for this month" });
    return;
  }
  res.json({ success: true, data: budget });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createBudget((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { items } = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateBudget(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      items
    ),
  });
});

export const vsActual = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = monthYearQuery.parse(req.query);
  res.json({
    success: true,
    data: await svc.getBudgetVsActual((req as AuthenticatedRequest).userId, month, year),
  });
});
