import { LoanType } from "@prisma/client";
import { prisma } from "../models/prisma.js";

export async function listLoans(userId: string, familyMemberId?: string) {
  return prisma.loan.findMany({
    where: {
      userId,
      isActive: true,
      ...(familyMemberId ? { familyMemberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function getLoan(id: string, userId: string) {
  return prisma.loan.findFirst({
    where: { id, userId },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function createLoan(
  userId: string,
  data: {
    familyMemberId: string;
    lenderName: string;
    loanType: LoanType;
    principalAmount: bigint;
    outstandingAmount: bigint;
    emiAmount: bigint;
    interestRate: number;
    tenureMonths: number;
    startDate: Date;
    endDate?: Date;
    emiDueDate: number;
  },
) {
  return prisma.loan.create({
    data: {
      ...data,
      userId,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateLoan(
  id: string,
  userId: string,
  data: {
    lenderName?: string;
    loanType?: LoanType;
    principalAmount?: bigint;
    outstandingAmount?: bigint;
    emiAmount?: bigint;
    interestRate?: number;
    tenureMonths?: number;
    startDate?: Date;
    endDate?: Date;
    emiDueDate?: number;
    isActive?: boolean;
  },
) {
  return prisma.loan.update({
    where: { id, userId },
    data,
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteLoan(id: string, userId: string) {
  return prisma.loan.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
