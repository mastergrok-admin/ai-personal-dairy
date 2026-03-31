import { prisma } from "../models/prisma.js";

export async function listCreditCards(userId: string, familyMemberId?: string) {
  return prisma.creditCard.findMany({
    where: {
      userId,
      isActive: true,
      ...(familyMemberId ? { familyMemberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function getCreditCard(id: string, userId: string) {
  return prisma.creditCard.findFirst({
    where: { id, userId },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function createCreditCard(
  userId: string,
  data: {
    familyMemberId: string;
    bankName: string;
    cardName: string;
    cardNumberLast4: string;
    creditLimit: bigint;
    currentDue: bigint;
    minimumDue: bigint;
    dueDate: number;
    billingCycleDate: number;
  },
) {
  return prisma.creditCard.create({
    data: {
      ...data,
      userId,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateCreditCard(
  id: string,
  userId: string,
  data: {
    bankName?: string;
    cardName?: string;
    cardNumberLast4?: string;
    creditLimit?: bigint;
    currentDue?: bigint;
    minimumDue?: bigint;
    dueDate?: number;
    billingCycleDate?: number;
    isActive?: boolean;
  },
) {
  return prisma.creditCard.update({
    where: { id, userId },
    data,
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteCreditCard(id: string, userId: string) {
  return prisma.creditCard.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
