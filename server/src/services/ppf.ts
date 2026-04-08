import { prisma } from "../models/prisma.js";

export async function listPPF(userId: string) {
  return prisma.pPFAccount.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPPF(
  userId: string,
  data: {
    familyMemberId: string;
    accountLast4?: string;
    bankOrPostOffice: string;
    openingDate: string;
    maturityDate: string;
    currentBalance?: number;   // rupees
    annualContribution?: number; // rupees
  }
) {
  return prisma.pPFAccount.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      accountLast4: data.accountLast4 ?? null,
      bankOrPostOffice: data.bankOrPostOffice,
      openingDate: new Date(data.openingDate),
      maturityDate: new Date(data.maturityDate),
      currentBalance: data.currentBalance != null ? BigInt(Math.round(data.currentBalance * 100)) : BigInt(0),
      annualContribution: data.annualContribution != null ? BigInt(Math.round(data.annualContribution * 100)) : BigInt(0),
      balanceUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updatePPF(
  id: string,
  userId: string,
  data: {
    accountLast4?: string;
    bankOrPostOffice?: string;
    currentBalance?: number;
    annualContribution?: number;
    maturityDate?: string;
  }
) {
  return prisma.pPFAccount.update({
    where: { id, userId },
    data: {
      ...(data.accountLast4 !== undefined && { accountLast4: data.accountLast4 }),
      ...(data.bankOrPostOffice && { bankOrPostOffice: data.bankOrPostOffice }),
      ...(data.currentBalance !== undefined && {
        currentBalance: BigInt(Math.round(data.currentBalance * 100)),
        balanceUpdatedAt: new Date(),
      }),
      ...(data.annualContribution !== undefined && { annualContribution: BigInt(Math.round(data.annualContribution * 100)) }),
      ...(data.maturityDate && { maturityDate: new Date(data.maturityDate) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deletePPF(id: string, userId: string) {
  return prisma.pPFAccount.update({ where: { id, userId }, data: { isActive: false } });
}
