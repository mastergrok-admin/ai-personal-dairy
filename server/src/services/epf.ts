import { prisma } from "../models/prisma.js";

export async function listEPF(userId: string) {
  return prisma.ePFAccount.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createEPF(
  userId: string,
  data: {
    familyMemberId: string;
    uanLast4?: string;
    employerName: string;
    monthlyEmployeeContrib?: number;
    monthlyEmployerContrib?: number;
    currentBalance?: number;
  }
) {
  return prisma.ePFAccount.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      uanLast4: data.uanLast4 ?? null,
      employerName: data.employerName,
      monthlyEmployeeContrib: data.monthlyEmployeeContrib != null ? BigInt(Math.round(data.monthlyEmployeeContrib * 100)) : BigInt(0),
      monthlyEmployerContrib: data.monthlyEmployerContrib != null ? BigInt(Math.round(data.monthlyEmployerContrib * 100)) : BigInt(0),
      currentBalance: data.currentBalance != null ? BigInt(Math.round(data.currentBalance * 100)) : BigInt(0),
      balanceUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateEPF(
  id: string,
  userId: string,
  data: {
    employerName?: string;
    monthlyEmployeeContrib?: number;
    monthlyEmployerContrib?: number;
    currentBalance?: number;
  }
) {
  return prisma.ePFAccount.update({
    where: { id, userId },
    data: {
      ...(data.employerName && { employerName: data.employerName }),
      ...(data.monthlyEmployeeContrib !== undefined && { monthlyEmployeeContrib: BigInt(Math.round(data.monthlyEmployeeContrib * 100)) }),
      ...(data.monthlyEmployerContrib !== undefined && { monthlyEmployerContrib: BigInt(Math.round(data.monthlyEmployerContrib * 100)) }),
      ...(data.currentBalance !== undefined && { currentBalance: BigInt(Math.round(data.currentBalance * 100)), balanceUpdatedAt: new Date() }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteEPF(id: string, userId: string) {
  return prisma.ePFAccount.update({ where: { id, userId }, data: { isActive: false } });
}
