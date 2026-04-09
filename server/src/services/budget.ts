import { prisma } from "../models/prisma.js";
import type { ExpenseCategory } from "@prisma/client";
import { EXPENSE_CATEGORY_LABELS } from "@diary/shared";

function getFiscalYear(month: number, year: number): string {
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getMonthRange(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59), // last day of month
  };
}

export async function getBudget(userId: string, month: number, year: number) {
  return prisma.budget.findUnique({
    where: { userId_month_year: { userId, month, year } },
    include: { items: { orderBy: { category: "asc" } } },
  });
}

export async function createBudget(
  userId: string,
  data: {
    month: number;
    year: number;
    items: Array<{ category: ExpenseCategory; budgetAmount: number }>;
    copyFromMonth?: number;
    copyFromYear?: number;
  }
) {
  let items = data.items;

  // Copy items from a previous month if requested and no items provided
  if (items.length === 0 && data.copyFromMonth && data.copyFromYear) {
    const prev = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: data.copyFromMonth,
          year: data.copyFromYear,
        },
      },
      include: { items: true },
    });
    if (prev) {
      items = prev.items.map((i) => ({
        category: i.category,
        budgetAmount: Number(i.budgetAmount) / 100, // will be converted back below
      }));
    }
  }

  return prisma.budget.create({
    data: {
      userId,
      month: data.month,
      year: data.year,
      fiscalYear: getFiscalYear(data.month, data.year),
      items: {
        create: items.map((i) => ({
          category: i.category,
          budgetAmount: BigInt(Math.round(i.budgetAmount * 100)),
        })),
      },
    },
    include: { items: { orderBy: { category: "asc" } } },
  });
}

export async function updateBudget(
  id: string,
  userId: string,
  items: Array<{ category: ExpenseCategory; budgetAmount: number }>
) {
  // Replace all items atomically
  await prisma.budgetItem.deleteMany({ where: { budgetId: id } });
  return prisma.budget.update({
    where: { id, userId },
    data: {
      items: {
        create: items.map((i) => ({
          category: i.category,
          budgetAmount: BigInt(Math.round(i.budgetAmount * 100)),
        })),
      },
    },
    include: { items: { orderBy: { category: "asc" } } },
  });
}

export async function getBudgetVsActual(userId: string, month: number, year: number) {
  const { start, end } = getMonthRange(month, year);

  const [budget, expenses, incomes] = await Promise.all([
    prisma.budget.findUnique({
      where: { userId_month_year: { userId, month, year } },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { userId, isActive: true, date: { gte: start, lte: end } },
    }),
    prisma.income.findMany({
      where: { userId, isActive: true, month, year },
    }),
  ]);

  // Build actual map: category → total paise
  const actualMap = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    const current = actualMap.get(e.category) ?? 0;
    actualMap.set(e.category, current + Number(e.amount));
  }

  // Collect all categories (union of budget + actual)
  const budgetMap = new Map<ExpenseCategory, number>();
  for (const item of budget?.items ?? []) {
    budgetMap.set(item.category, Number(item.budgetAmount));
  }
  const allCategories = new Set<ExpenseCategory>([
    ...budgetMap.keys(),
    ...actualMap.keys(),
  ]);

  const items = Array.from(allCategories).map((category) => {
    const budgeted = budgetMap.get(category) ?? 0;
    const actual = actualMap.get(category) ?? 0;
    const variance = budgeted - actual;
    let status: "under" | "warning" | "over";
    if (budgeted === 0) {
      status = actual > 0 ? "over" : "under";
    } else {
      const ratio = actual / budgeted;
      status = ratio > 1 ? "over" : ratio >= 0.8 ? "warning" : "under";
    }
    return {
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      budgeted,
      actual,
      variance,
      status,
    };
  });

  const totalBudget = items.reduce((s, i) => s + i.budgeted, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalActual) / totalIncome) * 100 * 100) / 100
      : 0;

  return { month, year, totalBudget, totalActual, items, savingsRate };
}
