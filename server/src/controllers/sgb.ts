import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/sgb.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  seriesName: z.string().min(1).max(200),
  units: z.number().min(0.001),
  issuePrice: z.number().min(1),
  currentPrice: z.number().min(0).optional(),
  issueDate: z.string().datetime(),
  maturityDate: z.string().datetime(),
  interestRate: z.number().min(0).optional(),
});

const updateSchema = z.object({
  seriesName: z.string().min(1).max(200).optional(),
  units: z.number().min(0).optional(),
  currentPrice: z.number().min(0).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listSGB((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createSGB((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateSGB(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteSGB(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
