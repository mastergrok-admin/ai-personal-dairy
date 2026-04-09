import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/tax.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MANUAL_DEDUCTION_SECTIONS = [
  "sec80C_nsc", "sec80C_kvp", "sec80C_children_tuition", "sec80C_other",
  "sec80D_self_family", "sec80D_parents", "sec80D_parents_senior",
  "sec80E_education_loan_interest", "sec80G_donation",
  "sec24b_home_loan_interest", "hra", "other",
] as const;

const fiscalYearSchema = z.string().regex(/^\d{4}-\d{2}$/);

const deductionCreateSchema = z.object({
  fiscalYear: fiscalYearSchema,
  section: z.enum(MANUAL_DEDUCTION_SECTIONS),
  amount: z.number().min(0),
  description: z.string().max(300).optional(),
});

const deductionUpdateSchema = deductionCreateSchema.partial().omit({ fiscalYear: true });

const profileSchema = z.object({
  fiscalYear: fiscalYearSchema,
  preferredRegime: z.enum(["old", "new"]),
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = fiscalYearSchema.parse(
    req.query.fiscalYear ?? svc.currentFiscalYear()
  );
  res.json({
    success: true,
    data: await svc.getTaxSummary((req as AuthenticatedRequest).userId, fiscalYear),
  });
});

export const listDeductions = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = fiscalYearSchema.parse(
    req.query.fiscalYear ?? svc.currentFiscalYear()
  );
  res.json({
    success: true,
    data: await svc.listTaxDeductions((req as AuthenticatedRequest).userId, fiscalYear),
  });
});

export const createDeduction = asyncHandler(async (req: Request, res: Response) => {
  const parsed = deductionCreateSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createTaxDeduction((req as AuthenticatedRequest).userId, parsed),
  });
});

export const updateDeduction = asyncHandler(async (req: Request, res: Response) => {
  const parsed = deductionUpdateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateTaxDeduction(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const removeDeduction = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteTaxDeduction(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = profileSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.upsertTaxProfile(
      (req as AuthenticatedRequest).userId,
      parsed.fiscalYear,
      parsed.preferredRegime
    ),
  });
});
