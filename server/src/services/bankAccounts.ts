import { prisma } from "../models/prisma.js";
import type { AccountType } from "@prisma/client";

export async function listBankAccounts(userId: string, familyMemberId?: string) {
  return prisma.bankAccount.findMany({
    where: {
      userId,
      isActive: true,
      ...(familyMemberId ? { familyMemberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}

export async function getBankAccount(id: string, userId: string) {
  return prisma.bankAccount.findFirst({
    where: { id, userId },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}

export async function createBankAccount(
  userId: string,
  data: {
    familyMemberId: string;
    bankName: string;
    accountType: AccountType;
    accountNumberLast4: string;
    ifscCode?: string;
    balance: bigint;
  },
) {
  return prisma.bankAccount.create({
    data: {
      ...data,
      userId,
      balanceUpdatedAt: new Date(),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}

export async function updateBankAccount(
  id: string,
  userId: string,
  data: {
    bankName?: string;
    accountType?: AccountType;
    accountNumberLast4?: string;
    ifscCode?: string;
    isActive?: boolean;
    balance?: bigint;
    balanceUpdatedAt?: Date;
  },
) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data,
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}

export async function updateBalance(id: string, userId: string, balance: bigint) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data: { balance, balanceUpdatedAt: new Date() },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteBankAccount(id: string, userId: string) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
