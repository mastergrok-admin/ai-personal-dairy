import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/insurance.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const INSURANCE_TYPES = [
  "term_life", "whole_life", "ulip", "health_individual", "health_family_floater",
  "vehicle_car", "vehicle_two_wheeler", "property", "pmjjby", "pmsby", "other",
] as const;

const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "half_yearly", "annual", "single"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  insuranceType: z.enum(INSURANCE_TYPES),
  insurerName: z.string().min(1).max(200),
  policyLast6: z.string().length(6).optional(),
  sumAssured: z.number().min(0),
  premiumAmount: z.number().min(0),
  premiumFrequency: z.enum(PREMIUM_FREQUENCIES),
  startDate: z.string().datetime(),
  renewalDate: z.string().datetime(),
  nomineeName: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial().omit({ familyMemberId: true, insuranceType: true, startDate: true });

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listInsurance((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createInsurance((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateInsurance(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteInsurance(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
