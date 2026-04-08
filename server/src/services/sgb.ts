import { prisma } from "../models/prisma.js";

function withComputedValue(holding: any) {
  return {
    ...holding,
    investedPaise: holding.units * Number(holding.issuePrice),
    currentValue: holding.units * Number(holding.currentPrice),
  };
}

export async function listSGB(userId: string) {
  const holdings = await prisma.sGBHolding.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { issueDate: "desc" },
  });
  return holdings.map(withComputedValue);
}

export async function createSGB(
  userId: string,
  data: {
    familyMemberId: string;
    seriesName: string;
    units: number;
    issuePrice: number;     // rupees per gram
    currentPrice?: number;  // rupees per gram
    issueDate: string;
    maturityDate: string;
    interestRate?: number;
  }
) {
  const holding = await prisma.sGBHolding.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      seriesName: data.seriesName,
      units: data.units,
      issuePrice: BigInt(Math.round(data.issuePrice * 100)),
      currentPrice: data.currentPrice != null ? BigInt(Math.round(data.currentPrice * 100)) : BigInt(0),
      issueDate: new Date(data.issueDate),
      maturityDate: new Date(data.maturityDate),
      interestRate: data.interestRate ?? 2.5,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withComputedValue(holding);
}

export async function updateSGB(
  id: string,
  userId: string,
  data: { currentPrice?: number; units?: number; seriesName?: string }
) {
  const holding = await prisma.sGBHolding.update({
    where: { id, userId },
    data: {
      ...(data.seriesName && { seriesName: data.seriesName }),
      ...(data.units !== undefined && { units: data.units }),
      ...(data.currentPrice !== undefined && { currentPrice: BigInt(Math.round(data.currentPrice * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withComputedValue(holding);
}

export async function deleteSGB(id: string, userId: string) {
  return prisma.sGBHolding.update({ where: { id, userId }, data: { isActive: false } });
}
