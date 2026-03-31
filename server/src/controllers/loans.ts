import { z } from "zod";
import { LoanType } from "@prisma/client";
import * as loansService from "../services/loans.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  lenderName: z.string().min(1),
  loanType: z.enum(["home", "car", "personal", "education", "gold", "other"]),
  principalAmount: z.number().min(0),
  outstandingAmount: z.number().min(0),
  emiAmount: z.number().min(0),
  interestRate: z.number().min(0),
  tenureMonths: z.number().int().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  emiDueDate: z.number().int().min(1).max(31),
});

const updateSchema = z.object({
  lenderName: z.string().min(1).optional(),
  loanType: z.enum(["home", "car", "personal", "education", "gold", "other"]).optional(),
  principalAmount: z.number().min(0).optional(),
  outstandingAmount: z.number().min(0).optional(),
  emiAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).optional(),
  tenureMonths: z.number().int().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  emiDueDate: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
});

export const getLoans = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const familyMemberId = req.query.familyMemberId as string | undefined;
  const loans = await loansService.listLoans(userId, familyMemberId);
  res.json({ success: true, data: loans });
});

export const getLoan = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const loan = await loansService.getLoan(getParam(req.params.id), userId);
  if (!loan) {
    throw new NotFoundError("Loan not found");
  }
  res.json({ success: true, data: loan });
});

export const createLoan = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createSchema.parse(req.body);
  const loan = await loansService.createLoan(userId, {
    familyMemberId: data.familyMemberId,
    lenderName: data.lenderName,
    loanType: data.loanType as LoanType,
    principalAmount: BigInt(Math.round(data.principalAmount * 100)),
    outstandingAmount: BigInt(Math.round(data.outstandingAmount * 100)),
    emiAmount: BigInt(Math.round(data.emiAmount * 100)),
    interestRate: data.interestRate,
    tenureMonths: data.tenureMonths,
    startDate: new Date(data.startDate),
    ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
    emiDueDate: data.emiDueDate,
  });
  res.status(201).json({ success: true, data: loan });
});

export const updateLoan = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const updateData: Parameters<typeof loansService.updateLoan>[2] = {
    lenderName: data.lenderName,
    loanType: data.loanType as LoanType | undefined,
    interestRate: data.interestRate,
    tenureMonths: data.tenureMonths,
    emiDueDate: data.emiDueDate,
    isActive: data.isActive,
    ...(data.principalAmount !== undefined
      ? { principalAmount: BigInt(Math.round(data.principalAmount * 100)) }
      : {}),
    ...(data.outstandingAmount !== undefined
      ? { outstandingAmount: BigInt(Math.round(data.outstandingAmount * 100)) }
      : {}),
    ...(data.emiAmount !== undefined
      ? { emiAmount: BigInt(Math.round(data.emiAmount * 100)) }
      : {}),
    ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
    ...(data.endDate !== undefined ? { endDate: new Date(data.endDate) } : {}),
  };
  const loan = await loansService.updateLoan(getParam(req.params.id), userId, updateData);
  res.json({ success: true, data: loan });
});

export const deleteLoan = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await loansService.deleteLoan(getParam(req.params.id), userId);
  res.json({ success: true });
});
