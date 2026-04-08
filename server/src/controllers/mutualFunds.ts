import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/mutualFunds.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MF_SCHEME_TYPES = ["equity","debt","hybrid","elss","liquid","index","other"] as const;
const MF_TX_TYPES = ["sip","lumpsum","redemption","switch_in","switch_out","dividend","bonus"] as const;

const createFundSchema = z.object({
  familyMemberId: z.string().min(1),
  fundName: z.string().min(1).max(200),
  amcName: z.string().min(1).max(200),
  schemeType: z.enum(MF_SCHEME_TYPES),
  folioLast4: z.string().length(4).optional(),
  sipAmount: z.number().min(0).optional(),
  sipDate: z.number().int().min(1).max(28).optional(),
  sipStartDate: z.string().datetime().optional(),
});

const updateFundSchema = z.object({
  fundName: z.string().min(1).max(200).optional(),
  amcName: z.string().min(1).max(200).optional(),
  folioLast4: z.string().length(4).nullable().optional(),
  sipAmount: z.number().min(0).nullable().optional(),
  sipDate: z.number().int().min(1).max(28).nullable().optional(),
  sipStartDate: z.string().datetime().nullable().optional(),
});

const createTxSchema = z.object({
  type: z.enum(MF_TX_TYPES),
  amount: z.number().min(0),
  units: z.number().min(0).optional(),
  nav: z.number().min(0).optional(),
  date: z.string().datetime(),
  notes: z.string().max(200).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  res.json({ success: true, data: await svc.listFunds(userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createFundSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createFund(userId, data) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateFundSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateFund(getParam(req.params.id), userId, data) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  await svc.deleteFund(getParam(req.params.id), userId);
  res.json({ success: true });
});

export const listTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  res.json({ success: true, data: await svc.listTransactions(getParam(req.params.id), userId) });
});

export const addTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createTxSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.addTransaction(getParam(req.params.id), userId, data) });
});

export const removeTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  await svc.deleteTransaction(getParam(req.params.txId), getParam(req.params.id), userId);
  res.json({ success: true });
});
