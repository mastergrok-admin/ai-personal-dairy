import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/gold.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  description: z.string().min(1).max(200),
  weightGrams: z.number().min(0.001),
  purity: z.enum(["k24", "k22", "k18", "k14", "other"]),
  purchaseDate: z.string().datetime().optional(),
  purchasePricePerGram: z.number().min(0).optional(),
  currentPricePerGram: z.number().min(0),
  storageLocation: z.enum(["home", "bank_locker", "relative", "other"]).optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  weightGrams: z.number().min(0.001).optional(),
  currentPricePerGram: z.number().min(0).optional(),
  storageLocation: z.enum(["home", "bank_locker", "relative", "other"]).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listGold((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createGold((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateGold(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteGold(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
