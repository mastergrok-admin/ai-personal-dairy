import { prisma } from "../models/prisma.js";
import type { InsuranceType, PremiumFrequency } from "@prisma/client";

function withRenewalInfo(policy: any) {
  const daysUntilRenewal = Math.ceil(
    (new Date(policy.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return { ...policy, daysUntilRenewal, renewalSoon: daysUntilRenewal <= 30 };
}

export async function listInsurance(userId: string) {
  const policies = await prisma.insurancePolicy.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { renewalDate: "asc" },
  });
  return policies.map(withRenewalInfo);
}

export async function createInsurance(
  userId: string,
  data: {
    familyMemberId: string;
    insuranceType: InsuranceType;
    insurerName: string;
    policyLast6?: string;
    sumAssured: number;
    premiumAmount: number;
    premiumFrequency: PremiumFrequency;
    startDate: string;
    renewalDate: string;
    nomineeName?: string;
    notes?: string;
  }
) {
  const policy = await prisma.insurancePolicy.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      insuranceType: data.insuranceType,
      insurerName: data.insurerName,
      policyLast6: data.policyLast6 ?? null,
      sumAssured: BigInt(Math.round(data.sumAssured * 100)),
      premiumAmount: BigInt(Math.round(data.premiumAmount * 100)),
      premiumFrequency: data.premiumFrequency,
      startDate: new Date(data.startDate),
      renewalDate: new Date(data.renewalDate),
      nomineeName: data.nomineeName ?? null,
      notes: data.notes ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withRenewalInfo(policy);
}

export async function updateInsurance(
  id: string,
  userId: string,
  data: {
    insurerName?: string;
    policyLast6?: string;
    sumAssured?: number;
    premiumAmount?: number;
    premiumFrequency?: PremiumFrequency;
    renewalDate?: string;
    nomineeName?: string;
    notes?: string;
  }
) {
  const policy = await prisma.insurancePolicy.update({
    where: { id, userId },
    data: {
      ...(data.insurerName !== undefined && { insurerName: data.insurerName }),
      ...(data.policyLast6 !== undefined && { policyLast6: data.policyLast6 }),
      ...(data.sumAssured !== undefined && {
        sumAssured: BigInt(Math.round(data.sumAssured * 100)),
      }),
      ...(data.premiumAmount !== undefined && {
        premiumAmount: BigInt(Math.round(data.premiumAmount * 100)),
      }),
      ...(data.premiumFrequency !== undefined && {
        premiumFrequency: data.premiumFrequency,
      }),
      ...(data.renewalDate !== undefined && {
        renewalDate: new Date(data.renewalDate),
      }),
      ...(data.nomineeName !== undefined && { nomineeName: data.nomineeName }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withRenewalInfo(policy);
}

export async function deleteInsurance(id: string, userId: string) {
  return prisma.insurancePolicy.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
