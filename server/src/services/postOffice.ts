import { prisma } from "../models/prisma.js";
import type { PostOfficeSchemeType } from "@prisma/client";

export async function listPostOffice(userId: string) {
  return prisma.postOfficeScheme.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { purchaseDate: "desc" },
  });
}

export async function createPostOffice(
  userId: string,
  data: {
    familyMemberId: string;
    schemeType: PostOfficeSchemeType;
    certificateLast4?: string;
    amount: number;         // rupees
    interestRate: number;
    purchaseDate: string;
    maturityDate: string;
    maturityAmount: number; // rupees
  }
) {
  return prisma.postOfficeScheme.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      schemeType: data.schemeType,
      certificateLast4: data.certificateLast4 ?? null,
      amount: BigInt(Math.round(data.amount * 100)),
      interestRate: data.interestRate,
      purchaseDate: new Date(data.purchaseDate),
      maturityDate: new Date(data.maturityDate),
      maturityAmount: BigInt(Math.round(data.maturityAmount * 100)),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updatePostOffice(
  id: string,
  userId: string,
  data: {
    certificateLast4?: string;
    amount?: number;
    interestRate?: number;
    maturityDate?: string;
    maturityAmount?: number;
  }
) {
  return prisma.postOfficeScheme.update({
    where: { id, userId },
    data: {
      ...(data.certificateLast4 !== undefined && { certificateLast4: data.certificateLast4 }),
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
      ...(data.maturityDate && { maturityDate: new Date(data.maturityDate) }),
      ...(data.maturityAmount !== undefined && { maturityAmount: BigInt(Math.round(data.maturityAmount * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deletePostOffice(id: string, userId: string) {
  return prisma.postOfficeScheme.update({ where: { id, userId }, data: { isActive: false } });
}
