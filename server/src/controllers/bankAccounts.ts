import { z } from "zod";
import * as bankAccountsService from "../services/bankAccounts.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  bankName: z.string().min(1).max(100),
  accountType: z.enum(["savings", "current"]),
  accountNumberLast4: z.string().length(4),
  ifscCode: z.string().max(11).optional(),
  balance: z.number().min(0),
});

const updateSchema = z.object({
  bankName: z.string().min(1).max(100).optional(),
  accountType: z.enum(["savings", "current"]).optional(),
  accountNumberLast4: z.string().length(4).optional(),
  ifscCode: z.string().max(11).optional(),
  isActive: z.boolean().optional(),
  balance: z.number().min(0).optional(),
});

const balanceSchema = z.object({
  balance: z.number().min(0),
});

export const getBankAccounts = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const familyMemberId = req.query.familyMemberId as string | undefined;
  const accounts = await bankAccountsService.listBankAccounts(userId, familyMemberId);
  res.json({ success: true, data: accounts });
});

export const getBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const account = await bankAccountsService.getBankAccount(getParam(req.params.id), userId);
  if (!account) {
    throw new NotFoundError("Bank account not found");
  }
  res.json({ success: true, data: account });
});

export const createBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createSchema.parse(req.body);
  const account = await bankAccountsService.createBankAccount(userId, {
    ...data,
    balance: BigInt(Math.round(data.balance * 100)),
  });
  res.status(201).json({ success: true, data: account });
});

export const updateBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const { balance, ...rest } = data;
  const account = await bankAccountsService.updateBankAccount(
    getParam(req.params.id),
    userId,
    {
      ...rest,
      ...(balance !== undefined
        ? { balance: BigInt(Math.round(balance * 100)), balanceUpdatedAt: new Date() }
        : {}),
    },
  );
  res.json({ success: true, data: account });
});

export const updateBalance = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { balance } = balanceSchema.parse(req.body);
  const account = await bankAccountsService.updateBalance(
    getParam(req.params.id),
    userId,
    BigInt(Math.round(balance * 100)),
  );
  res.json({ success: true, data: account });
});

export const deleteBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await bankAccountsService.deleteBankAccount(getParam(req.params.id), userId);
  res.json({ success: true });
});
