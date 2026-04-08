# Phase 3 — Tax Planner, Insurance, Dividend & Interest Income

**Date:** 2026-04-08
**Status:** Approved

---

## Features

9. Tax Planner (80C tracker + regime comparison + advance tax reminders)
10. Insurance Manager
11. Dividend & Interest Income Tracker

---

## 1. Data Model

```prisma
# ── Insurance ─────────────────────────────────────────────────────────────────

enum InsuranceType {
  term_life
  whole_life
  ulip
  health_individual
  health_family_floater
  vehicle_car
  vehicle_two_wheeler
  property
  pmjjby           // Pradhan Mantri Jeevan Jyoti Bima Yojana
  pmsby            // Pradhan Mantri Suraksha Bima Yojana
  other
}

enum PremiumFrequency {
  monthly
  quarterly
  half_yearly
  annual
  single
}

model InsurancePolicy {
  id               String           @id @default(cuid())
  userId           String
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId   String
  familyMember     FamilyMember     @relation(fields: [familyMemberId], references: [id])
  insuranceType    InsuranceType
  insurerName      String
  policyLast6      String?
  sumAssured       BigInt                           // paise
  premiumAmount    BigInt                           // paise per frequency period
  premiumFrequency PremiumFrequency
  startDate        DateTime
  renewalDate      DateTime
  nomineeName      String?
  notes            String?
  isActive         Boolean          @default(true)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([userId])
  @@index([familyMemberId])
  @@index([userId, renewalDate])
}

# ── Tax Planner ───────────────────────────────────────────────────────────────

enum TaxRegime {
  old
  new
}

model TaxProfile {
  id             String     @id @default(cuid())
  userId         String     @unique
  user           User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  fiscalYear     String                // "2025-26"
  preferredRegime TaxRegime @default(new)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

# Manual deduction entries (for items not auto-derived from other modules)
# Items auto-derived: EPF (from EPFAccount), PPF (from PPFAccount),
#   ELSS MFs (from MutualFund where schemeType = elss),
#   home loan principal (from Loan where loanType = home),
#   insurance premiums (from InsurancePolicy)

enum ManualDeductionSection {
  sec80C_nsc
  sec80C_kvp
  sec80C_children_tuition
  sec80C_other
  sec80D_self_family
  sec80D_parents
  sec80D_parents_senior
  sec80E_education_loan_interest
  sec80G_donation
  sec24b_home_loan_interest
  hra
  other
}

model TaxDeduction {
  id          String                 @id @default(cuid())
  userId      String
  user        User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  fiscalYear  String
  section     ManualDeductionSection
  amount      BigInt                 // paise
  description String?
  isActive    Boolean                @default(true)
  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt

  @@index([userId, fiscalYear])
}

# ── Dividend & Interest Income ─────────────────────────────────────────────────

enum PassiveIncomeType {
  dividend_stock
  dividend_mf
  interest_fd
  interest_savings
  interest_nsc
  interest_ppf   // tax-exempt
  sgb_interest
  other
}

model PassiveIncome {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  incomeType  PassiveIncomeType
  amount      BigInt            // paise
  date        DateTime
  source      String            // e.g. "TCS dividend", "HDFC FD XXXX4521"
  tdsDeducted BigInt            @default(0) // paise
  notes       String?
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([userId])
  @@index([userId, date])
}
```

### User model additions

```prisma
taxProfile      TaxProfile?
taxDeductions   TaxDeduction[]
passiveIncomes  PassiveIncome[]
insurancePolicies InsurancePolicy[]
```

---

## 2. API Design

### Insurance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/insurance` | List all policies with upcoming renewal alert flag |
| POST | `/api/insurance` | Create policy |
| PUT | `/api/insurance/:id` | Update |
| DELETE | `/api/insurance/:id` | Soft delete |

Response includes computed field `daysUntilRenewal` and boolean `renewalSoon` (≤ 30 days).

### Tax Planner

`GET /api/tax/summary?fiscalYear=2025-26`

Returns the computed tax picture:

```ts
{
  fiscalYear: string
  regime: TaxRegime
  income: {
    salary: number; business: number; rental: number; other: number; total: number
    agriculturalIncome: number  // exempt
  }
  deductions: {
    // Section 80C (max ₹1,50,000)
    epf: number; ppf: number; elss: number; nsc: number; kvp: number
    homeLoanPrincipal: number; lifeInsurance: number; childrenTuition: number
    sec80C_other: number; sec80C_total: number; sec80C_max: number  // 150000 * 100 paise
    sec80C_remaining: number
    // Other sections
    sec80D: number; sec80E: number; sec80G: number; sec24b: number; hra: number
    totalDeductions: number
  }
  taxableIncome: number
  taxLiability: { old: number; new: number }  // both regimes for comparison
  advanceTax: {
    required: boolean  // true if liability > ₹10,000
    q1_by: string; q1_amount: number  // 15% by 15 Jun
    q2_by: string; q2_amount: number  // 45% by 15 Sep
    q3_by: string; q3_amount: number  // 75% by 15 Dec
    q4_by: string; q4_amount: number  // 100% by 15 Mar
  }
  form15GH: {
    fdAccounts: Array<{ bankName: string; accountLast4: string; annualInterest: number; tdsRisk: boolean }>
  }
}
```

**Tax slab computation (configurable via AppSettings):**

Old regime slabs (FY 2025-26):
- 0 – 2.5L: nil
- 2.5L – 5L: 5%
- 5L – 10L: 20%
- >10L: 30%
- Rebate 87A: tax nil if income ≤ 5L (old regime)

New regime slabs (FY 2025-26):
- 0 – 3L: nil
- 3L – 7L: 5%
- 7L – 10L: 10%
- 10L – 12L: 15%
- 12L – 15L: 20%
- >15L: 30%
- Rebate 87A: tax nil if income ≤ 7L (new regime)

Store slab config in `AppSetting` table as JSON so it can be updated annually.

`GET /api/tax/deductions?fiscalYear=2025-26` — list manual deductions
`POST /api/tax/deductions` — add manual deduction
`PUT /api/tax/deductions/:id` — update
`DELETE /api/tax/deductions/:id` — remove

`PUT /api/tax/profile` — update preferred regime for FY

### Passive Income (Dividend & Interest)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/passive-income?fiscalYear=2025-26` | List with FY filter |
| POST | `/api/passive-income` | Create |
| PUT | `/api/passive-income/:id` | Update |
| DELETE | `/api/passive-income/:id` | Soft delete |
| GET | `/api/passive-income/summary?fiscalYear=2025-26` | Totals by type (for ITR) |

---

## 3. Shared Types

```ts
export type InsuranceType = 'term_life' | 'whole_life' | 'ulip' | 'health_individual' | 'health_family_floater' | 'vehicle_car' | 'vehicle_two_wheeler' | 'property' | 'pmjjby' | 'pmsby' | 'other'
export type PremiumFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'single'
export type TaxRegime = 'old' | 'new'
export type PassiveIncomeType = 'dividend_stock' | 'dividend_mf' | 'interest_fd' | 'interest_savings' | 'interest_nsc' | 'interest_ppf' | 'sgb_interest' | 'other'

export interface InsurancePolicyResponse {
  id: string; familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  insuranceType: InsuranceType; insurerName: string; policyLast6: string | null
  sumAssured: string; premiumAmount: string; premiumFrequency: PremiumFrequency
  startDate: string; renewalDate: string; nomineeName: string | null
  daysUntilRenewal: number; renewalSoon: boolean
  isActive: boolean; createdAt: string; updatedAt: string
}

export interface TaxSummaryResponse { /* matches API response above */ }

export interface PassiveIncomeResponse {
  id: string; incomeType: PassiveIncomeType; amount: string; date: string
  source: string; tdsDeducted: string; notes: string | null
  createdAt: string; updatedAt: string
}

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  term_life: 'Term Life Insurance', whole_life: 'Whole Life / Endowment',
  ulip: 'ULIP', health_individual: 'Health Insurance (Individual)',
  health_family_floater: 'Health Insurance (Family Floater)',
  vehicle_car: 'Car Insurance', vehicle_two_wheeler: 'Two-Wheeler Insurance',
  property: 'Property Insurance', pmjjby: 'PMJJBY', pmsby: 'PMSBY', other: 'Other',
}
```

---

## 4. UI Design

### Insurance page (`/insurance`)

Cards per policy grouped by type. Renewal-due cards shown first with amber/red badge.

**Add/Edit modal:** Type, insurer, policy last 6, sum assured, premium amount + frequency, start date, renewal date, nominee, family member.

**Dashboard widget:** "Renewing soon" list — pulled into the main Overview.

### Tax Planner page (`/tax`)

**FY selector** at top (defaults to current fiscal year).

**Section 1 — 80C Tracker**
Progress bar: ₹X invested of ₹1,50,000 limit. Breakdown table showing each bucket (EPF, PPF, ELSS, etc.) auto-populated from other modules, plus manual entries. "Remaining room: ₹X" with recommendations.

**Section 2 — Other Deductions**
Table of 80D, 80E, 24b, HRA, 80G entries.

**Section 3 — Tax Comparison**
Side-by-side: Old Regime vs New Regime. Shows taxable income, deductions applied, tax liability, and recommended regime highlighted in green.

**Section 4 — Advance Tax**
Timeline showing 4 installment dates and amounts. Overdue installments flagged in red.

**Section 5 — Form 15G/H**
FD accounts that may trigger TDS — flag with "file 15G" reminder.

### Passive Income page (`/passive-income`)

Simple table grouped by fiscal year. Quick-add button. Annual summary for ITR ("Income from Other Sources": ₹X total, TDS deducted: ₹X).

---

## 5. Files to Create / Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add InsurancePolicy, TaxProfile, TaxDeduction, PassiveIncome |
| `shared/src/types/finance.ts` | Add insurance, tax, passive income types |
| `server/src/services/insurance.ts` | New |
| `server/src/controllers/insurance.ts` | New |
| `server/src/routes/insurance.ts` | New |
| `server/src/services/tax.ts` | New — complex aggregation + slab calc |
| `server/src/controllers/tax.ts` | New |
| `server/src/routes/tax.ts` | New |
| `server/src/services/passiveIncome.ts` | New |
| `server/src/controllers/passiveIncome.ts` | New |
| `server/src/routes/passiveIncome.ts` | New |
| `server/src/app.ts` | Register 3 new routers |
| `client/src/pages/finance/InsurancePage.tsx` | New |
| `client/src/pages/finance/TaxPlannerPage.tsx` | New |
| `client/src/pages/finance/PassiveIncomePage.tsx` | New |
