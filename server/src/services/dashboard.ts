import { prisma } from "../models/prisma.js";

export async function getOverview(userId: string) {
  // Fetch all data in parallel
  const [bankAccounts, creditCards, loans, familyMembers] = await Promise.all([
    prisma.bankAccount.findMany({ where: { userId, isActive: true } }),
    prisma.creditCard.findMany({ where: { userId, isActive: true } }),
    prisma.loan.findMany({ where: { userId, isActive: true } }),
    prisma.familyMember.findMany({ where: { userId } }),
  ]);

  // Calculate totals (BigInt to number conversion via Number())
  const totalBankBalance = bankAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalCardDues = creditCards.reduce((sum, c) => sum + Number(c.currentDue), 0);
  const totalLoanOutstanding = loans.reduce((sum, l) => sum + Number(l.outstandingAmount), 0);
  const totalLoanEmi = loans.reduce((sum, l) => sum + Number(l.emiAmount), 0);

  // Assets = bank balances (in paise), Liabilities = card dues + loan outstanding (in paise)
  // Convert to rupees for response
  const assets = totalBankBalance / 100;
  const liabilities = (totalCardDues + totalLoanOutstanding) / 100;

  // Upcoming dues — combine card dues and loan EMIs
  const now = new Date();

  function daysUntilDay(dayOfMonth: number): number {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    const target = thisMonth >= now ? thisMonth : nextMonth;
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const upcomingDues = [
    ...creditCards
      .filter((c) => Number(c.currentDue) > 0)
      .map((c) => ({
        type: "credit_card" as const,
        name: `${c.bankName} ${c.cardName}`,
        amount: Number(c.currentDue) / 100,
        dueDate: c.dueDate,
        daysLeft: daysUntilDay(c.dueDate),
      })),
    ...loans.map((l) => ({
      type: "loan" as const,
      name: `${l.lenderName} ${l.loanType}`,
      amount: Number(l.emiAmount) / 100,
      dueDate: l.emiDueDate,
      daysLeft: daysUntilDay(l.emiDueDate),
    })),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

  // Next due date info
  const nextDue = upcomingDues[0] ?? null;

  // Needs attention — stale bank balances (>30 days old)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const currentDay = now.getDate();

  const needsAttention: Array<{
    type: "stale_balance" | "overdue";
    title: string;
    description: string;
    entityId: string;
    entityType: string;
  }> = bankAccounts
    .filter((a) => a.balanceUpdatedAt < thirtyDaysAgo)
    .map((a) => {
      const daysDiff = Math.floor((now.getTime() - a.balanceUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        type: "stale_balance" as const,
        title: `${a.bankName} balance is ${daysDiff} days old`,
        description: "Tap to update",
        entityId: a.id,
        entityType: "bank_account",
      };
    });

  // Overdue credit card dues
  for (const card of creditCards) {
    if (Number(card.currentDue) > 0 && card.dueDate < currentDay) {
      needsAttention.push({
        type: "overdue" as const,
        title: `${card.bankName} ${card.cardName} payment overdue`,
        description: `Due date was ${card.dueDate}th, outstanding ₹${(Number(card.currentDue) / 100).toLocaleString("en-IN")}`,
        entityId: card.id,
        entityType: "credit_card",
      });
    }
  }

  // Overdue loan EMIs
  for (const loan of loans) {
    if (loan.emiDueDate < currentDay) {
      needsAttention.push({
        type: "overdue" as const,
        title: `${loan.lenderName} ${loan.loanType} EMI overdue`,
        description: `Due date was ${loan.emiDueDate}th, EMI ₹${(Number(loan.emiAmount) / 100).toLocaleString("en-IN")}`,
        entityId: loan.id,
        entityType: "loan",
      });
    }
  }

  return {
    netWorth: {
      total: assets - liabilities,
      assets,
      liabilities,
    },
    quickStats: {
      bankBalance: totalBankBalance / 100,
      cardDues: totalCardDues / 100,
      nextDueDate: nextDue ? `${nextDue.dueDate}` : null,
      nextDueDays: nextDue ? nextDue.daysLeft : null,
      loanEmiTotal: totalLoanEmi / 100,
      familyMemberCount: familyMembers.length,
    },
    upcomingDues,
    needsAttention,
  };
}
