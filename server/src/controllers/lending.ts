import { Request, Response } from "express";
import { z } from "zod";
import * as lendingService from "../services/lending.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  direction: z.enum(["lent", "borrowed"]),
  personName: z.string().min(1).max(100),
  personPhone: z.string().regex(/^\d{10}$/).optional(),
  principalAmount: z.number().min(1),
  date: z.string().datetime(),
  purpose: z.string().max(200).optional(),
  expectedRepaymentDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const repaymentSchema = z.object({
  amount: z.number().min(1),
  date: z.string().datetime(),
  notes: z.string().max(200).optional(),
});

export async function list(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const { direction, status } = req.query as Record<string, string | undefined>;
  const data = await lendingService.listLending(userId, direction, status);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await lendingService.createLending(userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createSchema.partial().omit({ direction: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await lendingService.updateLending(getParam(req.params.id), userId, parsed.data);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  await lendingService.deleteLending(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}

export async function addRepayment(req: Request, res: Response) {
  const parsed = repaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await lendingService.addRepayment(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function removeRepayment(req: Request, res: Response) {
  await lendingService.deleteRepayment(getParam(req.params.id), getParam(req.params.repaymentId), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
