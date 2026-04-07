import { prisma } from "../models/prisma.js";
import type { FDStatus } from "@prisma/client";

export async function listFixedDeposits(userId: string, bankAccountId: string) {
  return prisma.fixedDeposit.findMany({
    where: { userId, bankAccountId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFixedDeposit(id: string, userId: string) {
  return prisma.fixedDeposit.findFirst({
    where: { id, userId, isActive: true },
  });
}

export async function createFixedDeposit(
  userId: string,
  data: {
    bankAccountId: string;
    fdReferenceNumberLast4?: string;
    principalAmount: bigint;
    interestRate: number;
    tenureMonths: number;
    startDate: Date;
    maturityDate: Date;
    maturityAmount: bigint;
    autoRenewal: boolean;
    status: FDStatus;
  },
) {
  return prisma.fixedDeposit.create({
    data: { ...data, userId },
  });
}

export async function updateFixedDeposit(
  id: string,
  userId: string,
  data: {
    fdReferenceNumberLast4?: string;
    principalAmount?: bigint;
    interestRate?: number;
    tenureMonths?: number;
    startDate?: Date;
    maturityDate?: Date;
    maturityAmount?: bigint;
    autoRenewal?: boolean;
    status?: FDStatus;
  },
) {
  return prisma.fixedDeposit.update({
    where: { id, userId },
    data,
  });
}

export async function deleteFixedDeposit(id: string, userId: string) {
  return prisma.fixedDeposit.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
