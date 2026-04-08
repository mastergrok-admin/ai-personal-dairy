import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/ppf.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  accountLast4: z.string().length(4).optional(),
  bankOrPostOffice: z.string().min(1).max(100),
  openingDate: z.string().datetime(),
  maturityDate: z.string().datetime(),
  currentBalance: z.number().min(0).optional(),
  annualContribution: z.number().min(0).optional(),
});

const updateSchema = z.object({
  accountLast4: z.string().length(4).optional(),
  bankOrPostOffice: z.string().min(1).max(100).optional(),
  currentBalance: z.number().min(0).optional(),
  annualContribution: z.number().min(0).optional(),
  maturityDate: z.string().datetime().optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listPPF((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createPPF((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updatePPF(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deletePPF(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
