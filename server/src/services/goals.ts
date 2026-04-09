import { prisma } from "../models/prisma.js";
import type { GoalCategory } from "@prisma/client";

function withComputed(goal: any) {
  const targetPaise = Number(goal.targetAmount);
  const currentPaise = Number(goal.currentAmount);
  const progressPercent =
    targetPaise > 0 ? Math.min(100, Math.round((currentPaise / targetPaise) * 100 * 100) / 100) : 0;

  const now = new Date();
  const target = new Date(goal.targetDate);
  const monthsRemaining = Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 +
      (target.getMonth() - now.getMonth())
  );

  const requiredMonthlySaving =
    monthsRemaining > 0
      ? Math.round((targetPaise - currentPaise) / monthsRemaining)
      : 0;

  return { ...goal, progressPercent, monthsRemaining, requiredMonthlySaving };
}

export async function listGoals(userId: string) {
  const goals = await prisma.financialGoal.findMany({
    where: { userId, isActive: true },
    orderBy: { targetDate: "asc" },
  });
  return goals.map(withComputed);
}

export async function createGoal(
  userId: string,
  data: {
    name: string;
    category: GoalCategory;
    targetAmount: number;
    targetDate: string;
    currentAmount?: number;
    notes?: string;
  }
) {
  const goal = await prisma.financialGoal.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      targetAmount: BigInt(Math.round(data.targetAmount * 100)),
      targetDate: new Date(data.targetDate),
      currentAmount: BigInt(Math.round((data.currentAmount ?? 0) * 100)),
      notes: data.notes ?? null,
    },
  });
  return withComputed(goal);
}

export async function updateGoal(
  id: string,
  userId: string,
  data: {
    name?: string;
    targetAmount?: number;
    targetDate?: string;
    currentAmount?: number;
    notes?: string;
    isAchieved?: boolean;
  }
) {
  const goal = await prisma.financialGoal.update({
    where: { id, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.targetAmount !== undefined && {
        targetAmount: BigInt(Math.round(data.targetAmount * 100)),
      }),
      ...(data.targetDate !== undefined && { targetDate: new Date(data.targetDate) }),
      ...(data.currentAmount !== undefined && {
        currentAmount: BigInt(Math.round(data.currentAmount * 100)),
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.isAchieved !== undefined && { isAchieved: data.isAchieved }),
    },
  });
  return withComputed(goal);
}

export async function deleteGoal(id: string, userId: string) {
  return prisma.financialGoal.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
