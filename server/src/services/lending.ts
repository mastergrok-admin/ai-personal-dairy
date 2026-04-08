import { prisma } from "../models/prisma.js";

function computeOutstanding(principal: bigint, repayments: { amount: bigint }[]) {
  const repaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
  return Math.max(0, Number(principal) - repaid);
}

function computeStatus(principal: bigint, repayments: { amount: bigint }[]): "outstanding" | "partially_repaid" | "settled" {
  const repaid = repayments.reduce((s, r) => s + Number(r.amount), 0);
  if (repaid === 0) return "outstanding";
  if (repaid >= Number(principal)) return "settled";
  return "partially_repaid";
}

const include = {
  repayments: { where: { }, orderBy: { date: "asc" as const } },
} as const;

export async function listLending(userId: string, direction?: string, status?: string) {
  const records = await prisma.personalLending.findMany({
    where: {
      userId,
      isActive: true,
      ...(direction && { direction: direction as any }),
      ...(status && { status: status as any }),
    },
    include,
    orderBy: { date: "desc" },
  });
  return records.map((r) => ({
    ...r,
    outstandingAmount: BigInt(computeOutstanding(r.principalAmount, r.repayments)),
  }));
}

export async function createLending(
  userId: string,
  data: {
    direction: string; personName: string; personPhone?: string
    principalAmount: number; date: string; purpose?: string
    expectedRepaymentDate?: string; notes?: string
  }
) {
  const record = await prisma.personalLending.create({
    data: {
      userId,
      direction: data.direction as any,
      personName: data.personName,
      personPhone: data.personPhone ?? null,
      principalAmount: BigInt(Math.round(data.principalAmount * 100)),
      date: new Date(data.date),
      purpose: data.purpose ?? null,
      expectedRepaymentDate: data.expectedRepaymentDate ? new Date(data.expectedRepaymentDate) : null,
      notes: data.notes ?? null,
    },
    include,
  });
  return { ...record, outstandingAmount: record.principalAmount };
}

export async function updateLending(
  id: string,
  userId: string,
  data: { personName?: string; personPhone?: string; principalAmount?: number; purpose?: string; expectedRepaymentDate?: string; notes?: string }
) {
  const record = await prisma.personalLending.update({
    where: { id, userId },
    data: {
      ...(data.personName && { personName: data.personName }),
      ...(data.personPhone !== undefined && { personPhone: data.personPhone }),
      ...(data.principalAmount !== undefined && { principalAmount: BigInt(Math.round(data.principalAmount * 100)) }),
      ...(data.purpose !== undefined && { purpose: data.purpose }),
      ...(data.expectedRepaymentDate !== undefined && { expectedRepaymentDate: data.expectedRepaymentDate ? new Date(data.expectedRepaymentDate) : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include,
  });
  const outstanding = computeOutstanding(record.principalAmount, record.repayments);
  const status = computeStatus(record.principalAmount, record.repayments);
  await prisma.personalLending.update({ where: { id }, data: { status } });
  return { ...record, status, outstandingAmount: BigInt(outstanding) };
}

export async function deleteLending(id: string, userId: string) {
  return prisma.personalLending.update({ where: { id, userId }, data: { isActive: false } });
}

export async function addRepayment(
  lendingId: string,
  userId: string,
  data: { amount: number; date: string; notes?: string }
) {
  const lending = await prisma.personalLending.findFirst({ where: { id: lendingId, userId } });
  if (!lending) throw new Error("Not found");
  const repayment = await prisma.lendingRepayment.create({
    data: {
      lendingId,
      amount: BigInt(Math.round(data.amount * 100)),
      date: new Date(data.date),
      notes: data.notes ?? null,
    },
  });
  const allRepayments = await prisma.lendingRepayment.findMany({ where: { lendingId } });
  const status = computeStatus(lending.principalAmount, allRepayments);
  await prisma.personalLending.update({ where: { id: lendingId }, data: { status } });
  return repayment;
}

export async function deleteRepayment(lendingId: string, repaymentId: string, userId: string) {
  const lending = await prisma.personalLending.findFirst({ where: { id: lendingId, userId } });
  if (!lending) throw new Error("Not found");
  await prisma.lendingRepayment.delete({ where: { id: repaymentId } });
  const allRepayments = await prisma.lendingRepayment.findMany({ where: { lendingId } });
  const status = computeStatus(lending.principalAmount, allRepayments);
  await prisma.personalLending.update({ where: { id: lendingId }, data: { status } });
}
