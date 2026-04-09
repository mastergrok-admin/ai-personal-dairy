import { prisma } from "../models/prisma.js";
import type { PassiveIncomeType } from "@prisma/client";

function getFiscalYearRange(fiscalYear: string): { start: Date; end: Date } {
  const startYear = parseInt(fiscalYear.split("-")[0], 10);
  return {
    start: new Date(startYear, 3, 1),           // Apr 1
    end: new Date(startYear + 1, 2, 31, 23, 59, 59), // Mar 31
  };
}

export async function listPassiveIncome(userId: string, fiscalYear?: string) {
  const where: any = { userId, isActive: true };
  if (fiscalYear) {
    const { start, end } = getFiscalYearRange(fiscalYear);
    where.date = { gte: start, lte: end };
  }
  return prisma.passiveIncome.findMany({
    where,
    orderBy: { date: "desc" },
  });
}

export async function createPassiveIncome(
  userId: string,
  data: {
    incomeType: PassiveIncomeType;
    amount: number;
    date: string;
    source: string;
    tdsDeducted?: number;
    notes?: string;
  }
) {
  return prisma.passiveIncome.create({
    data: {
      userId,
      incomeType: data.incomeType,
      amount: BigInt(Math.round(data.amount * 100)),
      date: new Date(data.date),
      source: data.source,
      tdsDeducted: BigInt(Math.round((data.tdsDeducted ?? 0) * 100)),
      notes: data.notes ?? null,
    },
  });
}

export async function updatePassiveIncome(
  id: string,
  userId: string,
  data: {
    incomeType?: PassiveIncomeType;
    amount?: number;
    date?: string;
    source?: string;
    tdsDeducted?: number;
    notes?: string;
  }
) {
  return prisma.passiveIncome.update({
    where: { id, userId },
    data: {
      ...(data.incomeType !== undefined && { incomeType: data.incomeType }),
      ...(data.amount !== undefined && {
        amount: BigInt(Math.round(data.amount * 100)),
      }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.tdsDeducted !== undefined && {
        tdsDeducted: BigInt(Math.round(data.tdsDeducted * 100)),
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deletePassiveIncome(id: string, userId: string) {
  return prisma.passiveIncome.update({
    where: { id, userId },
    data: { isActive: false },
  });
}

export async function getPassiveIncomeSummary(userId: string, fiscalYear: string) {
  const { start, end } = getFiscalYearRange(fiscalYear);
  const entries = await prisma.passiveIncome.findMany({
    where: { userId, isActive: true, date: { gte: start, lte: end } },
  });

  const byTypeMap = new Map<PassiveIncomeType, { amount: bigint; tdsDeducted: bigint }>();
  let totalAmount = 0n;
  let totalTds = 0n;

  for (const e of entries) {
    totalAmount += e.amount;
    totalTds += e.tdsDeducted;
    const existing = byTypeMap.get(e.incomeType) ?? { amount: 0n, tdsDeducted: 0n };
    byTypeMap.set(e.incomeType, {
      amount: existing.amount + e.amount,
      tdsDeducted: existing.tdsDeducted + e.tdsDeducted,
    });
  }

  return {
    fiscalYear,
    totalAmount: Number(totalAmount),
    totalTdsDeducted: Number(totalTds),
    byType: Array.from(byTypeMap.entries()).map(([type, vals]) => ({
      type,
      amount: Number(vals.amount),
      tdsDeducted: Number(vals.tdsDeducted),
    })),
  };
}
