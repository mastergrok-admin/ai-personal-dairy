import { Request, Response } from "express";
import { z } from "zod";
import * as incomeService from "../services/income.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const INCOME_SOURCES = ["salary","business","rental","freelance","agricultural","pension","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  source: z.enum(INCOME_SOURCES),
  amount: z.number().min(0),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  description: z.string().max(200).optional(),
});

const updateSchema = z.object({
  amount: z.number().min(0).optional(),
  description: z.string().max(200).optional(),
});

export async function list(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const { fiscalYear, familyMemberId } = req.query as Record<string, string | undefined>;
  const data = await incomeService.listIncome(userId, fiscalYear, familyMemberId);
  res.json({ success: true, data });
}

export async function summary(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const { fiscalYear } = req.query as { fiscalYear?: string };
  if (!fiscalYear) return res.status(400).json({ success: false, error: "fiscalYear is required" });
  const data = await incomeService.getIncomeSummary(userId, fiscalYear);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await incomeService.createIncome(userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const id = getParam(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await incomeService.updateIncome(id, userId, parsed.data);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  await incomeService.deleteIncome(getParam(req.params.id), userId);
  res.json({ success: true });
}
