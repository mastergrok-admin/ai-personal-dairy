import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/postOffice.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PO_TYPES = ["nsc","kvp","scss","mis","td","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  schemeType: z.enum(PO_TYPES),
  certificateLast4: z.string().length(4).optional(),
  amount: z.number().min(1),
  interestRate: z.number().min(0),
  purchaseDate: z.string().datetime(),
  maturityDate: z.string().datetime(),
  maturityAmount: z.number().min(1),
});

const updateSchema = z.object({
  certificateLast4: z.string().length(4).optional(),
  amount: z.number().min(1).optional(),
  interestRate: z.number().min(0).optional(),
  maturityDate: z.string().datetime().optional(),
  maturityAmount: z.number().min(1).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listPostOffice((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createPostOffice((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updatePostOffice(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deletePostOffice(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
