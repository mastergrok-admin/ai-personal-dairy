import { prisma } from "../models/prisma.js";
import type { NPSTier } from "@prisma/client";

export async function listNPS(userId: string) {
  return prisma.nPSAccount.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNPS(
  userId: string,
  data: {
    familyMemberId: string;
    pranLast4?: string;
    tier: NPSTier;
    monthlyContrib?: number;
    currentCorpus?: number;
  }
) {
  return prisma.nPSAccount.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      pranLast4: data.pranLast4 ?? null,
      tier: data.tier,
      monthlyContrib: data.monthlyContrib != null ? BigInt(Math.round(data.monthlyContrib * 100)) : BigInt(0),
      currentCorpus: data.currentCorpus != null ? BigInt(Math.round(data.currentCorpus * 100)) : BigInt(0),
      corpusUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateNPS(
  id: string,
  userId: string,
  data: { monthlyContrib?: number; currentCorpus?: number; pranLast4?: string }
) {
  return prisma.nPSAccount.update({
    where: { id, userId },
    data: {
      ...(data.pranLast4 !== undefined && { pranLast4: data.pranLast4 }),
      ...(data.monthlyContrib !== undefined && { monthlyContrib: BigInt(Math.round(data.monthlyContrib * 100)) }),
      ...(data.currentCorpus !== undefined && { currentCorpus: BigInt(Math.round(data.currentCorpus * 100)), corpusUpdatedAt: new Date() }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteNPS(id: string, userId: string) {
  return prisma.nPSAccount.update({ where: { id, userId }, data: { isActive: false } });
}
