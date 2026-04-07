import { z } from "zod";
import * as fdService from "../services/fixedDeposits.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import {
  calculateFDMaturityAmount,
  calculateFDTenureMonths,
} from "@diary/shared";
import type { FDStatus } from "@prisma/client";

const dateField = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const createSchema = z.object({
  bankAccountId: z.string().min(1),
  fdReferenceNumberLast4: z.string().length(4).optional(),
  principalAmount: z.number().min(0),
  interestRate: z.number().min(0),
  startDate: dateField,
  maturityDate: dateField,
  autoRenewal: z.boolean().default(false),
  status: z.enum(["active", "matured", "broken"]).default("active"),
});

const updateSchema = z.object({
  fdReferenceNumberLast4: z.string().length(4).optional(),
  principalAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).optional(),
  startDate: dateField.optional(),
  maturityDate: dateField.optional(),
  autoRenewal: z.boolean().optional(),
  status: z.enum(["active", "matured", "broken"]).optional(),
});

function deriveFields(
  principalRupees: number,
  interestRate: number,
  startDate: Date,
  maturityDate: Date,
) {
  const tenureMonths = calculateFDTenureMonths(startDate, maturityDate);
  const maturityRupees = calculateFDMaturityAmount(
    principalRupees,
    interestRate,
    startDate,
    maturityDate,
  );
  return {
    tenureMonths,
    maturityAmount: BigInt(Math.round(maturityRupees * 100)),
  };
}

export const listFixedDeposits = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const bankAccountId = req.query.bankAccountId as string;
  if (!bankAccountId) {
    res.status(400).json({ success: false, error: "bankAccountId is required" });
    return;
  }
  const fds = await fdService.listFixedDeposits(userId, bankAccountId);
  res.json({ success: true, data: fds });
});

export const createFixedDeposit = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createSchema.parse(req.body);
  const startDate = new Date(parsed.startDate);
  const maturityDate = new Date(parsed.maturityDate);
  const { tenureMonths, maturityAmount } = deriveFields(
    parsed.principalAmount,
    parsed.interestRate,
    startDate,
    maturityDate,
  );
  const fd = await fdService.createFixedDeposit(userId, {
    bankAccountId: parsed.bankAccountId,
    fdReferenceNumberLast4: parsed.fdReferenceNumberLast4,
    principalAmount: BigInt(Math.round(parsed.principalAmount * 100)),
    interestRate: parsed.interestRate,
    tenureMonths,
    startDate,
    maturityDate,
    maturityAmount,
    autoRenewal: parsed.autoRenewal,
    status: parsed.status as FDStatus,
  });
  res.status(201).json({ success: true, data: fd });
});

export const updateFixedDeposit = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = getParam(req.params.id);
  const parsed = updateSchema.parse(req.body);

  // Re-derive tenureMonths + maturityAmount if any calc input changed
  let derived: { tenureMonths?: number; maturityAmount?: bigint } = {};
  if (
    parsed.principalAmount !== undefined ||
    parsed.interestRate !== undefined ||
    parsed.startDate !== undefined ||
    parsed.maturityDate !== undefined
  ) {
    const existing = await fdService.getFixedDeposit(id, userId);
    if (!existing) throw new NotFoundError("Fixed deposit not found");
    const principal =
      parsed.principalAmount ?? Number(existing.principalAmount) / 100;
    const rate = parsed.interestRate ?? existing.interestRate;
    const start = parsed.startDate
      ? new Date(parsed.startDate)
      : existing.startDate;
    const maturity = parsed.maturityDate
      ? new Date(parsed.maturityDate)
      : existing.maturityDate;
    derived = deriveFields(principal, rate, start, maturity);
  }

  const fd = await fdService.updateFixedDeposit(id, userId, {
    ...(parsed.fdReferenceNumberLast4 !== undefined
      ? { fdReferenceNumberLast4: parsed.fdReferenceNumberLast4 }
      : {}),
    ...(parsed.principalAmount !== undefined
      ? { principalAmount: BigInt(Math.round(parsed.principalAmount * 100)) }
      : {}),
    ...(parsed.interestRate !== undefined
      ? { interestRate: parsed.interestRate }
      : {}),
    ...(parsed.startDate ? { startDate: new Date(parsed.startDate) } : {}),
    ...(parsed.maturityDate
      ? { maturityDate: new Date(parsed.maturityDate) }
      : {}),
    ...(parsed.autoRenewal !== undefined
      ? { autoRenewal: parsed.autoRenewal }
      : {}),
    ...(parsed.status ? { status: parsed.status as FDStatus } : {}),
    ...(derived.tenureMonths !== undefined
      ? { tenureMonths: derived.tenureMonths }
      : {}),
    ...(derived.maturityAmount !== undefined
      ? { maturityAmount: derived.maturityAmount }
      : {}),
  });
  res.json({ success: true, data: fd });
});

export const deleteFixedDeposit = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await fdService.deleteFixedDeposit(getParam(req.params.id), userId);
  res.json({ success: true });
});
