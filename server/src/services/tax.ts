import { prisma } from "../models/prisma.js";
import type { ManualDeductionSection, TaxRegime } from "@prisma/client";

// ── Fiscal year helpers ────────────────────────────────────────────────────

export function getFiscalYearRange(fiscalYear: string): { start: Date; end: Date } {
  const startYear = parseInt(fiscalYear.split("-")[0], 10);
  return {
    start: new Date(startYear, 3, 1),               // Apr 1
    end: new Date(startYear + 1, 2, 31, 23, 59, 59), // Mar 31
  };
}

export function currentFiscalYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

// ── Premium frequency → annual multiplier ─────────────────────────────────

function annualPremium(amount: bigint, frequency: string): bigint {
  switch (frequency) {
    case "monthly":    return amount * 12n;
    case "quarterly":  return amount * 4n;
    case "half_yearly":return amount * 2n;
    case "annual":
    case "single":
    default:           return amount;
  }
}

// ── Tax slab computation (FY 2025-26 slabs) ────────────────────────────────
// Amounts in rupees (not paise). Returns tax in rupees including 4% cess.

export function computeTaxOldRegime(taxableIncomeRupees: number): number {
  if (taxableIncomeRupees <= 500000) return 0; // Rebate 87A
  let tax = 0;
  if (taxableIncomeRupees > 250000)
    tax += Math.min(taxableIncomeRupees - 250000, 250000) * 0.05;
  if (taxableIncomeRupees > 500000)
    tax += Math.min(taxableIncomeRupees - 500000, 500000) * 0.2;
  if (taxableIncomeRupees > 1000000)
    tax += (taxableIncomeRupees - 1000000) * 0.3;
  return Math.round(tax * 1.04); // 4% cess
}

export function computeTaxNewRegime(taxableIncomeRupees: number): number {
  if (taxableIncomeRupees <= 700000) return 0; // Rebate 87A
  let tax = 0;
  if (taxableIncomeRupees > 300000)
    tax += Math.min(taxableIncomeRupees - 300000, 400000) * 0.05;
  if (taxableIncomeRupees > 700000)
    tax += Math.min(taxableIncomeRupees - 700000, 300000) * 0.1;
  if (taxableIncomeRupees > 1000000)
    tax += Math.min(taxableIncomeRupees - 1000000, 200000) * 0.15;
  if (taxableIncomeRupees > 1200000)
    tax += Math.min(taxableIncomeRupees - 1200000, 300000) * 0.2;
  if (taxableIncomeRupees > 1500000)
    tax += (taxableIncomeRupees - 1500000) * 0.3;
  return Math.round(tax * 1.04);
}

// ── Main tax summary aggregation ──────────────────────────────────────────

export async function getTaxSummary(userId: string, fiscalYear: string) {
  const { start, end } = getFiscalYearRange(fiscalYear);
  const startYear = parseInt(fiscalYear.split("-")[0], 10);

  // ── 1. Income ─────────────────────────────────────────────────────────
  const incomes = await prisma.income.findMany({
    where: { userId, isActive: true, fiscalYear },
  });
  const incomeBySource = (src: string) =>
    incomes
      .filter((i) => i.source === src)
      .reduce((s, i) => s + Number(i.amount), 0);
  const salary = incomeBySource("salary");
  const business = incomeBySource("business");
  const rental = incomeBySource("rental");
  const agriculturalIncome = incomeBySource("agricultural");
  const other =
    incomeBySource("freelance") +
    incomeBySource("pension") +
    incomeBySource("other");
  const totalIncome = salary + business + rental + other; // agricultural is exempt

  // ── 2. Auto-derived 80C deductions ────────────────────────────────────

  // EPF: employee contribution only (not employer)
  const epfAccounts = await prisma.ePFAccount.findMany({ where: { userId, isActive: true } });
  const epf = epfAccounts.reduce(
    (s, a) => s + Number(a.monthlyEmployeeContrib) * 12,
    0
  );

  // PPF: annualContribution
  const ppfAccounts = await prisma.pPFAccount.findMany({ where: { userId, isActive: true } });
  const ppf = ppfAccounts.reduce((s, a) => s + Number(a.annualContribution), 0);

  // ELSS mutual funds: SIP * 12 + lumpsum transactions within FY
  const elssFunds = await prisma.mutualFund.findMany({
    where: { userId, isActive: true, schemeType: "elss" },
    include: {
      transactions: {
        where: { type: "lumpsum", date: { gte: start, lte: end } },
      },
    },
  });
  const elss = elssFunds.reduce((s, f) => {
    const sipAnnual = f.sipAmount ? Number(f.sipAmount) * 12 : 0;
    const lumpsums = f.transactions.reduce((ts, t) => ts + Number(t.amount), 0);
    return s + sipAnnual + lumpsums;
  }, 0);

  // Life insurance premiums (80C): term_life, whole_life, ulip, pmjjby
  const lifePolicies = await prisma.insurancePolicy.findMany({
    where: {
      userId,
      isActive: true,
      insuranceType: { in: ["term_life", "whole_life", "ulip", "pmjjby"] },
    },
  });
  const lifeInsurance = lifePolicies.reduce(
    (s, p) => s + Number(annualPremium(p.premiumAmount, p.premiumFrequency)),
    0
  );

  // Home loan principal approximation (80C): annual EMI - annual interest on outstanding
  const homeLoans = await prisma.loan.findMany({
    where: { userId, isActive: true, loanType: "home" },
  });
  const homeLoanPrincipal = homeLoans.reduce((s, l) => {
    const annualEmi = Number(l.emiAmount) * 12;
    const annualInterest =
      (Number(l.outstandingAmount) * l.interestRate) / 100;
    return s + Math.max(0, annualEmi - annualInterest);
  }, 0);

  // ── 3. Manual deductions ─────────────────────────────────────────────
  const manualDeds = await prisma.taxDeduction.findMany({
    where: { userId, fiscalYear, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const sumSection = (...sections: ManualDeductionSection[]) =>
    manualDeds
      .filter((d) => sections.includes(d.section))
      .reduce((s, d) => s + Number(d.amount), 0);

  const nsc = sumSection("sec80C_nsc");
  const kvp = sumSection("sec80C_kvp");
  const childrenTuition = sumSection("sec80C_children_tuition");
  const sec80C_other = sumSection("sec80C_other");

  const sec80C_total_raw =
    epf + ppf + elss + lifeInsurance + homeLoanPrincipal + nsc + kvp + childrenTuition + sec80C_other;
  const sec80C_max = 150000 * 100; // paise: ₹1,50,000 in paise
  const sec80C_total = Math.min(sec80C_total_raw, sec80C_max);
  const sec80C_remaining = Math.max(0, sec80C_max - sec80C_total_raw);

  // Health insurance (80D)
  const sec80D =
    sumSection("sec80D_self_family") +
    sumSection("sec80D_parents") +
    sumSection("sec80D_parents_senior");

  // Also auto-derive health insurance premiums
  const healthPolicies = await prisma.insurancePolicy.findMany({
    where: {
      userId,
      isActive: true,
      insuranceType: { in: ["health_individual", "health_family_floater", "pmsby"] },
    },
  });
  const healthPremiums = healthPolicies.reduce(
    (s, p) => s + Number(annualPremium(p.premiumAmount, p.premiumFrequency)),
    0
  );
  const sec80D_total = sec80D + healthPremiums;

  const sec80E = sumSection("sec80E_education_loan_interest");
  const sec80G = sumSection("sec80G_donation");
  const sec24b = sumSection("sec24b_home_loan_interest");
  const hra = sumSection("hra");

  const totalDeductions = sec80C_total + sec80D_total + sec80E + sec80G + sec24b + hra;

  // ── 4. Taxable income (amounts in paise; convert to rupees for slabs) ─
  const STD_DEDUCTION_OLD_PAISE = 5000000;  // ₹50,000 in paise
  const STD_DEDUCTION_NEW_PAISE = 7500000;  // ₹75,000 in paise

  const taxableOld = Math.max(
    0,
    totalIncome - STD_DEDUCTION_OLD_PAISE - totalDeductions
  );
  const taxableNew = Math.max(
    0,
    totalIncome - STD_DEDUCTION_NEW_PAISE
  );

  const taxOld = computeTaxOldRegime(taxableOld / 100);  // convert paise → rupees
  const taxNew = computeTaxNewRegime(taxableNew / 100);

  // ── 5. Advance tax ────────────────────────────────────────────────────
  // Use preferred regime's liability
  const profile = await prisma.taxProfile.findUnique({ where: { userId } });
  const regime: TaxRegime = profile?.preferredRegime ?? "new";
  const liability = regime === "old" ? taxOld : taxNew;
  const liabilityPaise = liability * 100;
  const required = liabilityPaise > 1000000; // > ₹10,000 in paise

  const advanceTax = {
    required,
    q1_by: `${startYear}-06-15`,
    q1_amount: Math.round(liabilityPaise * 0.15),
    q2_by: `${startYear}-09-15`,
    q2_amount: Math.round(liabilityPaise * 0.45),
    q3_by: `${startYear}-12-15`,
    q3_amount: Math.round(liabilityPaise * 0.75),
    q4_by: `${startYear + 1}-03-15`,
    q4_amount: liabilityPaise,
  };

  // ── 6. Form 15G/H — FD accounts with TDS risk ────────────────────────
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
    include: {
      fixedDeposits: { where: { status: "active" } },
    },
  });
  const fdAccounts = bankAccounts.flatMap((ba) =>
    ba.fixedDeposits.map((fd) => {
      const annualInterest = Math.round(
        (Number(fd.principalAmount) * fd.interestRate) / 100
      );
      return {
        bankName: ba.bankName,
        accountLast4: ba.accountNumberLast4,
        annualInterest,
        tdsRisk: annualInterest > 4000000, // > ₹40,000 in paise
      };
    })
  );

  return {
    fiscalYear,
    regime,
    income: { salary, business, rental, other, agriculturalIncome, total: totalIncome },
    deductions: {
      epf, ppf, elss, nsc, kvp,
      homeLoanPrincipal, lifeInsurance, childrenTuition,
      sec80C_other, sec80C_total, sec80C_max, sec80C_remaining,
      sec80D: sec80D_total, sec80E, sec80G, sec24b, hra,
      totalDeductions,
    },
    taxableIncome: { old: taxableOld, new: taxableNew },
    taxLiability: { old: taxOld * 100, new: taxNew * 100 }, // in paise
    advanceTax,
    form15GH: { fdAccounts },
    manualDeductions: manualDeds,
  };
}

// ── Tax Profile ──────────────────────────────────────────────────────────

export async function upsertTaxProfile(userId: string, fiscalYear: string, preferredRegime: TaxRegime) {
  return prisma.taxProfile.upsert({
    where: { userId },
    create: { userId, fiscalYear, preferredRegime },
    update: { fiscalYear, preferredRegime },
  });
}

export async function getTaxProfile(userId: string) {
  return prisma.taxProfile.findUnique({ where: { userId } });
}

// ── Tax Deductions ────────────────────────────────────────────────────────

export async function listTaxDeductions(userId: string, fiscalYear: string) {
  return prisma.taxDeduction.findMany({
    where: { userId, fiscalYear, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function createTaxDeduction(
  userId: string,
  data: {
    fiscalYear: string;
    section: ManualDeductionSection;
    amount: number;
    description?: string;
  }
) {
  return prisma.taxDeduction.create({
    data: {
      userId,
      fiscalYear: data.fiscalYear,
      section: data.section,
      amount: BigInt(Math.round(data.amount * 100)),
      description: data.description ?? null,
    },
  });
}

export async function updateTaxDeduction(
  id: string,
  userId: string,
  data: { section?: ManualDeductionSection; amount?: number; description?: string }
) {
  return prisma.taxDeduction.update({
    where: { id, userId },
    data: {
      ...(data.section !== undefined && { section: data.section }),
      ...(data.amount !== undefined && {
        amount: BigInt(Math.round(data.amount * 100)),
      }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}

export async function deleteTaxDeduction(id: string, userId: string) {
  return prisma.taxDeduction.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
