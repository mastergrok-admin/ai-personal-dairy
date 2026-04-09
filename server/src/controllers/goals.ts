import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/goals.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const GOAL_CATEGORIES = [
  "home_purchase","vehicle","education","wedding","retirement",
  "emergency_fund","travel","medical","other",
] as const;

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(GOAL_CATEGORIES),
  targetAmount: z.number().min(0),
  targetDate: z.string().datetime(),
  currentAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  targetAmount: z.number().min(0).optional(),
  targetDate: z.string().datetime().optional(),
  currentAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  isAchieved: z.boolean().optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listGoals((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createGoal((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateGoal(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteGoal(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
