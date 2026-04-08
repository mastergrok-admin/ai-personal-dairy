import { Request, Response } from "express";
import { z } from "zod";
import * as expenseService from "../services/expenses.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const EXPENSE_CATEGORIES = ["groceries","vegetables_fruits","fuel","transport","school_fees","medical","utilities","internet_mobile","religious","eating_out","clothing","rent","household","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().min(0),
  date: z.string().datetime(),
  description: z.string().max(200).optional(),
});

const updateSchema = createSchema.partial().omit({ familyMemberId: true });

export async function list(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const { month, year, category } = req.query as Record<string, string | undefined>;
  const data = await expenseService.listExpenses(
    userId,
    month ? parseInt(month) : undefined,
    year ? parseInt(year) : undefined,
    category
  );
  res.json({ success: true, data });
}

export async function summary(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const { month, year } = req.query as Record<string, string>;
  if (!month || !year) return res.status(400).json({ success: false, error: "month and year required" });
  const data = await expenseService.getExpenseSummary(userId, parseInt(month), parseInt(year));
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await expenseService.createExpense(userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await expenseService.updateExpense(getParam(req.params.id), userId, parsed.data);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  await expenseService.deleteExpense(getParam(req.params.id), userId);
  res.json({ success: true });
}
