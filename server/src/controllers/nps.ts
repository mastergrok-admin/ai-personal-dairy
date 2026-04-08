import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/nps.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  pranLast4: z.string().length(4).optional(),
  tier: z.enum(["tier1", "tier2"]),
  monthlyContrib: z.number().min(0).optional(),
  currentCorpus: z.number().min(0).optional(),
});

const updateSchema = z.object({
  pranLast4: z.string().length(4).optional(),
  monthlyContrib: z.number().min(0).optional(),
  currentCorpus: z.number().min(0).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listNPS((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createNPS((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateNPS(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteNPS(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
