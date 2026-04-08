import { prisma } from "../models/prisma.js";

export async function listExpenses(
  userId: string,
  month?: number,
  year?: number,
  category?: string
) {
  const start = month && year ? new Date(year, month - 1, 1) : undefined;
  const end = month && year ? new Date(year, month, 0, 23, 59, 59) : undefined;
  return prisma.expense.findMany({
    where: {
      userId,
      isActive: true,
      ...(start && end && { date: { gte: start, lte: end } }),
      ...(category && { category: category as any }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { date: "desc" },
  });
}

export async function getExpenseSummary(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const expenses = await prisma.expense.findMany({
    where: { userId, isActive: true, date: { gte: start, lte: end } },
  });
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const e of expenses) {
    const amt = Number(e.amount);
    byCategory[e.category] = (byCategory[e.category] ?? 0) + amt;
    total += amt;
  }
  return { month, year, totalPaise: total, byCategory };
}

export async function createExpense(
  userId: string,
  data: {
    familyMemberId: string;
    category: string;
    amount: number;       // rupees
    date: string;
    description?: string;
  }
) {
  return prisma.expense.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      category: data.category as any,
      amount: BigInt(Math.round(data.amount * 100)),
      date: new Date(data.date),
      description: data.description ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateExpense(
  id: string,
  userId: string,
  data: { category?: string; amount?: number; date?: string; description?: string }
) {
  return prisma.expense.update({
    where: { id, userId },
    data: {
      ...(data.category && { category: data.category as any }),
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteExpense(id: string, userId: string) {
  return prisma.expense.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
