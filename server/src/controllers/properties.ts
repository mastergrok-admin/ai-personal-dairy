import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/properties.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  propertyType: z.enum(["residential_flat", "independent_house", "plot", "agricultural_land", "commercial", "other"]),
  description: z.string().min(1).max(500),
  areaValue: z.number().min(0),
  areaUnit: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0),
  rentalIncome: z.number().min(0).optional(),
  saleDeedDate: z.string().datetime().optional(),
  registrationRefLast6: z.string().length(6).optional(),
  linkedLoanId: z.string().optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  areaValue: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  rentalIncome: z.number().min(0).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listProperties((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createProperty((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateProperty(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteProperty(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
