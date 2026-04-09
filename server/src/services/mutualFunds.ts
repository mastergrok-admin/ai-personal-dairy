import { prisma } from "../models/prisma.js";
import type { MFTransactionType, MFSchemeType } from "@prisma/client";

const txInclude = { orderBy: { date: "asc" as const } };

function computeStats(fund: any) {
  const buyTypes: MFTransactionType[] = ["sip", "lumpsum", "bonus"];
  const sellTypes: MFTransactionType[] = ["redemption", "switch_out"];
  
  const buys = fund.transactions.filter((t: any) => buyTypes.includes(t.type));
  const sells = fund.transactions.filter((t: any) => sellTypes.includes(t.type));
  
  const boughtUnits = buys.reduce((s: number, t: any) => s + (t.units ?? 0), 0);
  const soldUnits = sells.reduce((s: number, t: any) => s + (t.units ?? 0), 0);
  const totalUnits = Math.max(0, boughtUnits - soldUnits);
  
  const buyPaise = buys.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const sellPaise = sells.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const investedPaise = Math.max(0, buyPaise - sellPaise);
  
  const avgBuyPrice = boughtUnits > 0 ? buyPaise / boughtUnits : 0;
  
  return { ...fund, totalUnits, investedPaise, avgBuyPrice };
}

export async function listFunds(userId: string) {
  const funds = await prisma.mutualFund.findMany({
    where: { userId, isActive: true },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: txInclude,
    },
    orderBy: { createdAt: "desc" },
  });
  return funds.map(computeStats);
}

export async function createFund(
  userId: string,
  data: {
    familyMemberId: string;
    fundName: string;
    amcName: string;
    schemeType: MFSchemeType;
    folioLast4?: string;
    sipAmount?: number;   // rupees
    sipDate?: number;
    sipStartDate?: string;
  }
) {
  const fund = await prisma.mutualFund.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      fundName: data.fundName,
      amcName: data.amcName,
      schemeType: data.schemeType,
      folioLast4: data.folioLast4 ?? null,
      sipAmount: data.sipAmount != null ? BigInt(Math.round(data.sipAmount * 100)) : null,
      sipDate: data.sipDate ?? null,
      sipStartDate: data.sipStartDate ? new Date(data.sipStartDate) : null,
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: txInclude,
    },
  });
  return computeStats(fund);
}

export async function updateFund(
  id: string,
  userId: string,
  data: {
    fundName?: string;
    amcName?: string;
    folioLast4?: string | null;
    sipAmount?: number | null;
    sipDate?: number | null;
    sipStartDate?: string | null;
  }
) {
  const fund = await prisma.mutualFund.update({
    where: { id, userId },
    data: {
      ...(data.fundName && { fundName: data.fundName }),
      ...(data.amcName && { amcName: data.amcName }),
      ...(data.folioLast4 !== undefined && { folioLast4: data.folioLast4 }),
      ...(data.sipAmount !== undefined && { sipAmount: data.sipAmount != null ? BigInt(Math.round(data.sipAmount * 100)) : null }),
      ...(data.sipDate !== undefined && { sipDate: data.sipDate }),
      ...(data.sipStartDate !== undefined && { sipStartDate: data.sipStartDate ? new Date(data.sipStartDate) : null }),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: txInclude,
    },
  });
  return computeStats(fund);
}

export async function deleteFund(id: string, userId: string) {
  return prisma.mutualFund.update({ where: { id, userId }, data: { isActive: false } });
}

export async function listTransactions(fundId: string, userId: string) {
  const fund = await prisma.mutualFund.findFirst({ where: { id: fundId, userId, isActive: true } });
  if (!fund) throw new Error("Not found");
  return prisma.mFTransaction.findMany({ where: { fundId }, orderBy: { date: "desc" } });
}

export async function addTransaction(
  fundId: string,
  userId: string,
  data: { type: MFTransactionType; amount: number; units?: number; nav?: number; date: string; notes?: string }
) {
  const fund = await prisma.mutualFund.findFirst({ where: { id: fundId, userId, isActive: true } });
  if (!fund) throw new Error("Not found");
  return prisma.mFTransaction.create({
    data: {
      fundId,
      type: data.type,
      amount: BigInt(Math.round(data.amount * 100)),
      units: data.units ?? null,
      nav: data.nav ?? null,
      date: new Date(data.date),
      notes: data.notes ?? null,
    },
  });
}

export async function deleteTransaction(txId: string, fundId: string, userId: string) {
  const fund = await prisma.mutualFund.findFirst({ where: { id: fundId, userId, isActive: true } });
  if (!fund) throw new Error("Not found");
  await prisma.mFTransaction.delete({ where: { id: txId, fundId } });
}
