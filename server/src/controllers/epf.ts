import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/epf.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  uanLast4: z.string().length(4).optional(),
  employerName: z.string().min(1).max(200),
  monthlyEmployeeContrib: z.number().min(0).optional(),
  monthlyEmployerContrib: z.number().min(0).optional(),
  currentBalance: z.number().min(0).optional(),
});

const updateSchema = z.object({
  employerName: z.string().min(1).max(200).optional(),
  monthlyEmployeeContrib: z.number().min(0).optional(),
  monthlyEmployerContrib: z.number().min(0).optional(),
  currentBalance: z.number().min(0).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listEPF((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createEPF((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateEPF(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteEPF(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
