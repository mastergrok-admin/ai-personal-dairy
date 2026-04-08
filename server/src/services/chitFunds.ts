import { prisma } from "../models/prisma.js";

export async function listChitFunds(userId: string) {
  return prisma.chitFund.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function createChitFund(
  userId: string,
  data: {
    familyMemberId: string;
    organizerName: string;
    totalValue: number;       // rupees
    monthlyContrib: number;   // rupees
    durationMonths: number;
    startDate: string;
    endDate: string;
    monthWon?: number;
    prizeReceived?: number;   // rupees
  }
) {
  return prisma.chitFund.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      organizerName: data.organizerName,
      totalValue: BigInt(Math.round(data.totalValue * 100)),
      monthlyContrib: BigInt(Math.round(data.monthlyContrib * 100)),
      durationMonths: data.durationMonths,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      monthWon: data.monthWon ?? null,
      prizeReceived: data.prizeReceived != null ? BigInt(Math.round(data.prizeReceived * 100)) : null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateChitFund(
  id: string,
  userId: string,
  data: { organizerName?: string; monthWon?: number | null; prizeReceived?: number | null; monthlyContrib?: number }
) {
  return prisma.chitFund.update({
    where: { id, userId },
    data: {
      ...(data.organizerName && { organizerName: data.organizerName }),
      ...(data.monthWon !== undefined && { monthWon: data.monthWon }),
      ...(data.prizeReceived !== undefined && { prizeReceived: data.prizeReceived != null ? BigInt(Math.round(data.prizeReceived * 100)) : null }),
      ...(data.monthlyContrib !== undefined && { monthlyContrib: BigInt(Math.round(data.monthlyContrib * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteChitFund(id: string, userId: string) {
  return prisma.chitFund.update({ where: { id, userId }, data: { isActive: false } });
}
