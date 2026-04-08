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

export async function getNetWorth(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [bankAccounts, loans, creditCards, lendings, incomes, expenses, mfs, ppf, epf, nps, po, sgb, gold, properties] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { userId, isActive: true },
      include: { fixedDeposits: { where: { isActive: true, status: "active" } } },
    }),
    prisma.loan.findMany({ where: { userId, isActive: true } }),
    prisma.creditCard.findMany({ where: { userId, isActive: true } }),
    prisma.personalLending.findMany({
      where: { userId, isActive: true },
      include: { repayments: true },
    }),
    prisma.income.findMany({
      where: { userId, isActive: true, month, year },
    }),
    prisma.expense.findMany({
      where: { userId, isActive: true, date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.mutualFund.findMany({ where: { userId, isActive: true }, include: { transactions: true } }),
    prisma.pPFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.ePFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.nPSAccount.findMany({ where: { userId, isActive: true } }),
    prisma.postOfficeScheme.findMany({ where: { userId, isActive: true } }),
    prisma.sGBHolding.findMany({ where: { userId, isActive: true } }),
    prisma.goldHolding.findMany({ where: { userId, isActive: true } }),
    prisma.property.findMany({ where: { userId, isActive: true } }),
  ]);

  // Assets
  const bankAndFD = bankAccounts.reduce((s, a) => {
    const fdTotal = a.fixedDeposits.reduce((fs, fd) => fs + Number(fd.principalAmount), 0);
    return s + Number(a.balance) + fdTotal;
  }, 0);

  // MF logic (simplistic invested value as current for now)
  const mfValue = mfs.reduce((total, f) => {
    const buyTypes = ["sip", "lumpsum", "bonus"];
    const sellTypes = ["redemption", "switch_out"];
    const buyPaise = f.transactions.filter(t => buyTypes.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const sellPaise = f.transactions.filter(t => sellTypes.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    return total + Math.max(0, buyPaise - sellPaise);
  }, 0);

  const ppfValue = ppf.reduce((s, a) => s + Number(a.currentBalance), 0);
  const epfValue = epf.reduce((s, a) => s + Number(a.currentBalance), 0);
  const npsValue = nps.reduce((s, a) => s + Number(a.currentCorpus), 0);
  const poValue = po.reduce((s, a) => s + Number(a.maturityAmount), 0);
  const sgbValue = sgb.reduce((s, a) => s + (a.units * Number(a.currentPrice)), 0);
  
  const goldValue = gold.reduce((s, l) => s + (l.weightGrams * Number(l.currentPricePerGram)), 0);
  const propertyValue = properties.reduce((s, l) => s + Number(l.currentValue), 0);

  const investments = mfValue + ppfValue + epfValue + npsValue + poValue + sgbValue;

  const lentToOthers = lendings
    .filter((l) => l.direction === "lent" && l.status !== "settled")
    .reduce((s, l) => {
      const repaid = l.repayments.reduce((rs, r) => rs + Number(r.amount), 0);
      return s + Math.max(0, Number(l.principalAmount) - repaid);
    }, 0);

  // Liabilities
  const loanOutstanding = loans.reduce((s, l) => s + Number(l.outstandingAmount), 0);
  const creditCardDues = creditCards.reduce((s, c) => s + Number(c.currentDue), 0);
  const borrowedFromOthers = lendings
    .filter((l) => l.direction === "borrowed" && l.status !== "settled")
    .reduce((s, l) => {
      const repaid = l.repayments.reduce((rs, r) => rs + Number(r.amount), 0);
      return s + Math.max(0, Number(l.principalAmount) - repaid);
    }, 0);

  const totalAssets = bankAndFD + investments + goldValue + propertyValue + lentToOthers;
  const totalLiabilities = loanOutstanding + creditCardDues + borrowedFromOthers;

  // Monthly P&L
  const monthlyIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;

  return {
    assets: { bankAndFD, investments, gold: goldValue, properties: propertyValue, lentToOthers },
    liabilities: { loans: loanOutstanding, creditCards: creditCardDues, borrowedFromOthers },
    netWorth: totalAssets - totalLiabilities,
    monthlySummary: { month, year, income: monthlyIncome, expenses: monthlyExpenses, savingsRate },
  };
}
