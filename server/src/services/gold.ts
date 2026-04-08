import { prisma } from "../models/prisma.js";
import type { GoldPurity, GoldStorageLocation } from "@prisma/client";

function withComputedValue(holding: any) {
  return {
    ...holding,
    currentValue: holding.weightGrams * Number(holding.currentPricePerGram),
  };
}

export async function listGold(userId: string) {
  const holdings = await prisma.goldHolding.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
  return holdings.map(withComputedValue);
}

export async function createGold(
  userId: string,
  data: {
    familyMemberId: string;
    description: string;
    weightGrams: number;
    purity: GoldPurity;
    purchaseDate?: string;
    purchasePricePerGram?: number;
    currentPricePerGram: number;
    storageLocation?: GoldStorageLocation;
  }
) {
  const holding = await prisma.goldHolding.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      description: data.description,
      weightGrams: data.weightGrams,
      purity: data.purity,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePricePerGram: data.purchasePricePerGram != null ? BigInt(Math.round(data.purchasePricePerGram * 100)) : null,
      currentPricePerGram: BigInt(Math.round(data.currentPricePerGram * 100)),
      storageLocation: data.storageLocation ?? "home",
      priceUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withComputedValue(holding);
}

export async function updateGold(
  id: string,
  userId: string,
  data: { currentPricePerGram?: number; weightGrams?: number; description?: string; storageLocation?: GoldStorageLocation }
) {
  const holding = await prisma.goldHolding.update({
    where: { id, userId },
    data: {
      ...(data.description && { description: data.description }),
      ...(data.weightGrams !== undefined && { weightGrams: data.weightGrams }),
      ...(data.currentPricePerGram !== undefined && { 
        currentPricePerGram: BigInt(Math.round(data.currentPricePerGram * 100)),
        priceUpdatedAt: new Date()
      }),
      ...(data.storageLocation && { storageLocation: data.storageLocation }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withComputedValue(holding);
}

export async function deleteGold(id: string, userId: string) {
  return prisma.goldHolding.update({ where: { id, userId }, data: { isActive: false } });
}
