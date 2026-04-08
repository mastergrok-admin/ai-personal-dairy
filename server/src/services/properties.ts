import { prisma } from "../models/prisma.js";
import type { PropertyType } from "@prisma/client";

export async function listProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProperty(
  userId: string,
  data: {
    familyMemberId: string;
    propertyType: PropertyType;
    description: string;
    areaValue: number;
    areaUnit?: string;
    purchaseDate?: string;
    purchasePrice?: number;   // rupees
    currentValue: number;      // rupees
    rentalIncome?: number;     // rupees/month
    saleDeedDate?: string;
    registrationRefLast6?: string;
    linkedLoanId?: string;
  }
) {
  return prisma.property.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      propertyType: data.propertyType,
      description: data.description,
      areaValue: data.areaValue,
      areaUnit: data.areaUnit ?? "sqft",
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice != null ? BigInt(Math.round(data.purchasePrice * 100)) : null,
      currentValue: BigInt(Math.round(data.currentValue * 100)),
      rentalIncome: data.rentalIncome != null ? BigInt(Math.round(data.rentalIncome * 100)) : BigInt(0),
      saleDeedDate: data.saleDeedDate ? new Date(data.saleDeedDate) : null,
      registrationRefLast6: data.registrationRefLast6 ?? null,
      linkedLoanId: data.linkedLoanId ?? null,
      valueUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateProperty(
  id: string,
  userId: string,
  data: { currentValue?: number; rentalIncome?: number; description?: string; areaValue?: number }
) {
  return prisma.property.update({
    where: { id, userId },
    data: {
      ...(data.description && { description: data.description }),
      ...(data.areaValue !== undefined && { areaValue: data.areaValue }),
      ...(data.currentValue !== undefined && { 
        currentValue: BigInt(Math.round(data.currentValue * 100)),
        valueUpdatedAt: new Date()
      }),
      ...(data.rentalIncome !== undefined && { rentalIncome: BigInt(Math.round(data.rentalIncome * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteProperty(id: string, userId: string) {
  return prisma.property.update({ where: { id, userId }, data: { isActive: false } });
}
