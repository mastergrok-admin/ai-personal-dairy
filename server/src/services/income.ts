import { prisma } from "../models/prisma.js";
import { toFiscalYear } from "@diary/shared";

export async function listIncome(
  userId: string,
  fiscalYear?: string,
  familyMemberId?: string
) {
  return prisma.income.findMany({
    where: {
      userId,
      isActive: true,
      ...(fiscalYear && { fiscalYear }),
      ...(familyMemberId && { familyMemberId }),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getIncomeSummary(userId: string, fiscalYear: string) {
  const entries = await prisma.income.findMany({
    where: { userId, fiscalYear, isActive: true },
    include: { familyMember: { select: { name: true } } },
  });
  const totalPaise = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const bySource: Record<string, number> = {};
  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] ?? 0) + Number(e.amount);
  }
  return { fiscalYear, totalPaise, bySource, entries };
}

export async function createIncome(
  userId: string,
  data: {
    familyMemberId: string;
    source: string;
    amount: number;       // rupees
    month: number;
    year: number;
    description?: string;
  }
) {
  const fiscalYear = toFiscalYear(data.month, data.year);
  return prisma.income.upsert({
    where: {
      userId_familyMemberId_source_month_year: {
        userId,
        familyMemberId: data.familyMemberId,
        source: data.source as any,
        month: data.month,
        year: data.year,
      },
    },
    update: {
      amount: BigInt(Math.round(data.amount * 100)),
      description: data.description ?? null,
      fiscalYear,
      isActive: true,
    },
    create: {
      userId,
      familyMemberId: data.familyMemberId,
      source: data.source as any,
      amount: BigInt(Math.round(data.amount * 100)),
      month: data.month,
      year: data.year,
      fiscalYear,
      description: data.description ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateIncome(
  id: string,
  userId: string,
  data: { amount?: number; description?: string }
) {
  return prisma.income.update({
    where: { id, userId },
    data: {
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteIncome(id: string, userId: string) {
  return prisma.income.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
