import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/chitFunds.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  organizerName: z.string().min(1).max(200),
  totalValue: z.number().min(1),
  monthlyContrib: z.number().min(1),
  durationMonths: z.number().int().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  monthWon: z.number().int().min(1).optional(),
  prizeReceived: z.number().min(0).optional(),
});

const updateSchema = z.object({
  organizerName: z.string().min(1).max(200).optional(),
  monthlyContrib: z.number().min(1).optional(),
  monthWon: z.number().int().min(1).nullable().optional(),
  prizeReceived: z.number().min(0).nullable().optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listChitFunds((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createChitFund((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateChitFund(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteChitFund(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
