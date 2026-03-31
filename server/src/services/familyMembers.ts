import { prisma } from "../models/prisma.js";
import type { Relationship } from "@prisma/client";
import { ConflictError } from "../utils/errors.js";

export async function ensureSelfMember(userId: string) {
  const existing = await prisma.familyMember.findFirst({
    where: { userId, relationship: "self" },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return prisma.familyMember.create({
    data: {
      userId,
      name: user?.name ?? "Self",
      relationship: "self",
    },
  });
}

export async function listFamilyMembers(userId: string) {
  return prisma.familyMember.findMany({
    where: { userId },
    orderBy: [{ relationship: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { bankAccounts: true },
      },
    },
  });
}

export async function createFamilyMember(
  userId: string,
  data: { name: string; relationship: Relationship },
) {
  return prisma.familyMember.create({
    data: { ...data, userId },
    include: {
      _count: {
        select: { bankAccounts: true },
      },
    },
  });
}

export async function updateFamilyMember(
  id: string,
  userId: string,
  data: { name?: string; relationship?: Relationship },
) {
  return prisma.familyMember.update({
    where: { id, userId },
    data,
    include: {
      _count: {
        select: { bankAccounts: true },
      },
    },
  });
}

export async function deleteFamilyMember(id: string, userId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id, userId },
    include: { _count: { select: { bankAccounts: true } } },
  });

  if (!member) return null;

  if (member.relationship === "self") {
    throw new ConflictError("Cannot delete the Self member");
  }

  if (member._count.bankAccounts > 0) {
    throw new ConflictError("Cannot delete a family member with linked accounts. Remove their accounts first.");
  }

  return prisma.familyMember.delete({ where: { id } });
}
