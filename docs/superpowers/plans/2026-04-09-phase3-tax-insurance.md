# Phase 3 — Tax Planner, Insurance, Passive Income Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Insurance Manager, Tax Planner (80C tracker + regime comparison + advance tax), and Dividend & Interest Income Tracker to the AI Personal Diary app.

**Architecture:** Three independent backend modules (insurance, tax, passive-income) follow the existing Controller → Service → Prisma pattern. The tax service aggregates data from multiple existing modules (EPF, PPF, ELSS MFs, loans, insurance) to auto-derive 80C/80D deductions. Three new React pages slot into the existing SidebarLayout with `useEffect`/`fetch` hooks matching existing page patterns.

**Tech Stack:** Express + Prisma + Zod (server), React 19 + Tailwind (client), Vitest + supertest (tests), PostgreSQL with BigInt paise amounts.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/prisma/schema.prisma` | Modify | Add 5 enums + 4 models + User/FamilyMember relations |
| `shared/src/types/finance.ts` | Modify | Add Phase 3 types and label maps |
| `server/src/services/insurance.ts` | Create | CRUD for InsurancePolicy + daysUntilRenewal computation |
| `server/src/controllers/insurance.ts` | Create | Zod validation + async handlers |
| `server/src/routes/insurance.ts` | Create | Router with authenticate middleware |
| `server/src/services/passiveIncome.ts` | Create | CRUD + fiscal year summary |
| `server/src/controllers/passiveIncome.ts` | Create | Zod validation + async handlers |
| `server/src/routes/passiveIncome.ts` | Create | Router with authenticate middleware |
| `server/src/services/tax.ts` | Create | Aggregation from 6 modules + slab computation + advance tax |
| `server/src/controllers/tax.ts` | Create | Handlers for summary, deductions CRUD, profile |
| `server/src/routes/tax.ts` | Create | Router with authenticate middleware |
| `server/src/app.ts` | Modify | Register 3 new routers |
| `server/src/__tests__/insurance.test.ts` | Create | Integration tests for insurance endpoints |
| `server/src/__tests__/passiveIncome.test.ts` | Create | Integration tests for passive income endpoints |
| `server/src/__tests__/tax.test.ts` | Create | Integration tests for tax summary + deductions |
| `client/src/pages/finance/InsurancePage.tsx` | Create | Policy cards grouped by type, renewal badges, add/edit modal |
| `client/src/pages/finance/PassiveIncomePage.tsx` | Create | FY-filtered table, quick-add, annual summary |
| `client/src/pages/finance/TaxPlannerPage.tsx` | Create | 80C progress, regime comparison, advance tax timeline |
| `client/src/App.tsx` | Modify | Add 3 new routes |
| `client/src/components/layout/Sidebar.tsx` | Modify | Add 3 nav items with icons |
| `docs/architecture.md` | Modify | Document new API endpoints and DB models |

---

## Task 1: Prisma Schema — Add Enums and Models

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add 5 enums after the `PropertyType` enum**

Open `server/prisma/schema.prisma` and append after the `PropertyType` enum block (after line ~165):

```prisma
enum InsuranceType {
  term_life
  whole_life
  ulip
  health_individual
  health_family_floater
  vehicle_car
  vehicle_two_wheeler
  property
  pmjjby
  pmsby
  other
}

enum PremiumFrequency {
  monthly
  quarterly
  half_yearly
  annual
  single
}

enum TaxRegime {
  old
  new
}

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

enum PassiveIncomeType {
  dividend_stock
  dividend_mf
  interest_fd
  interest_savings
  interest_nsc
  interest_ppf
  sgb_interest
  other
}
```

- [ ] **Step 2: Add 4 models after the `Property` model**

Append after the `Property` model block (end of file):

```prisma
model InsurancePolicy {
  id               String           @id @default(cuid())
  userId           String
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId   String
  familyMember     FamilyMember     @relation(fields: [familyMemberId], references: [id])
  insuranceType    InsuranceType
  insurerName      String
  policyLast6      String?
  sumAssured       BigInt
  premiumAmount    BigInt
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

model TaxProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  fiscalYear      String
  preferredRegime TaxRegime @default(new)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model TaxDeduction {
  id          String                 @id @default(cuid())
  userId      String
  user        User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  fiscalYear  String
  section     ManualDeductionSection
  amount      BigInt
  description String?
  isActive    Boolean                @default(true)
  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt

  @@index([userId, fiscalYear])
}

model PassiveIncome {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  incomeType  PassiveIncomeType
  amount      BigInt
  date        DateTime
  source      String
  tdsDeducted BigInt            @default(0)
  notes       String?
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([userId])
  @@index([userId, date])
}
```

- [ ] **Step 3: Add relations to `User` model**

In the `User` model, after `properties Property[]`, add:

```prisma
  insurancePolicies InsurancePolicy[]
  taxProfile        TaxProfile?
  taxDeductions     TaxDeduction[]
  passiveIncomes    PassiveIncome[]
```

- [ ] **Step 4: Add relation to `FamilyMember` model**

In the `FamilyMember` model, after `properties Property[]`, add:

```prisma
  insurancePolicies InsurancePolicy[]
```

- [ ] **Step 5: Run migration**

```bash
cd server && npx prisma migrate dev --name phase3_tax_insurance_passive_income
```

Expected: "Your database is now in sync with your schema."

- [ ] **Step 6: Verify Prisma client is regenerated**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 7: Commit**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Phase 3 Prisma models (InsurancePolicy, TaxProfile, TaxDeduction, PassiveIncome)"
```

---

## Task 2: Shared Types

**Files:**
- Modify: `shared/src/types/finance.ts`

- [ ] **Step 1: Append Phase 3 types to `shared/src/types/finance.ts`**

Add at the end of the file:

```typescript
// ── Phase 3 — Tax, Insurance, Passive Income ──────────────────────────────

export type InsuranceType =
  | 'term_life' | 'whole_life' | 'ulip'
  | 'health_individual' | 'health_family_floater'
  | 'vehicle_car' | 'vehicle_two_wheeler'
  | 'property' | 'pmjjby' | 'pmsby' | 'other'

export type PremiumFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'single'

export type TaxRegime = 'old' | 'new'

export type ManualDeductionSection =
  | 'sec80C_nsc' | 'sec80C_kvp' | 'sec80C_children_tuition' | 'sec80C_other'
  | 'sec80D_self_family' | 'sec80D_parents' | 'sec80D_parents_senior'
  | 'sec80E_education_loan_interest' | 'sec80G_donation'
  | 'sec24b_home_loan_interest' | 'hra' | 'other'

export type PassiveIncomeType =
  | 'dividend_stock' | 'dividend_mf'
  | 'interest_fd' | 'interest_savings' | 'interest_nsc' | 'interest_ppf'
  | 'sgb_interest' | 'other'

export interface InsurancePolicyResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  insuranceType: InsuranceType
  insurerName: string
  policyLast6: string | null
  sumAssured: number        // paise
  premiumAmount: number     // paise per frequency period
  premiumFrequency: PremiumFrequency
  startDate: string
  renewalDate: string
  nomineeName: string | null
  notes: string | null
  daysUntilRenewal: number
  renewalSoon: boolean      // daysUntilRenewal <= 30
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxDeductionResponse {
  id: string
  fiscalYear: string
  section: ManualDeductionSection
  amount: number            // paise
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxProfileResponse {
  id: string
  fiscalYear: string
  preferredRegime: TaxRegime
}

export interface TaxSummaryResponse {
  fiscalYear: string
  regime: TaxRegime
  income: {
    salary: number; business: number; rental: number; other: number
    agriculturalIncome: number; total: number
  }
  deductions: {
    epf: number; ppf: number; elss: number; nsc: number; kvp: number
    homeLoanPrincipal: number; lifeInsurance: number; childrenTuition: number
    sec80C_other: number; sec80C_total: number; sec80C_max: number
    sec80C_remaining: number
    sec80D: number; sec80E: number; sec80G: number; sec24b: number; hra: number
    totalDeductions: number
  }
  taxableIncome: { old: number; new: number }
  taxLiability: { old: number; new: number }
  advanceTax: {
    required: boolean
    q1_by: string; q1_amount: number
    q2_by: string; q2_amount: number
    q3_by: string; q3_amount: number
    q4_by: string; q4_amount: number
  }
  form15GH: {
    fdAccounts: Array<{
      bankName: string; accountLast4: string
      annualInterest: number; tdsRisk: boolean
    }>
  }
  manualDeductions: TaxDeductionResponse[]
}

export interface PassiveIncomeResponse {
  id: string
  incomeType: PassiveIncomeType
  amount: number            // paise
  date: string
  source: string
  tdsDeducted: number       // paise
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PassiveIncomeSummaryResponse {
  fiscalYear: string
  totalAmount: number       // paise
  totalTdsDeducted: number  // paise
  byType: Array<{ type: PassiveIncomeType; amount: number; tdsDeducted: number }>
}

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  term_life: 'Term Life Insurance',
  whole_life: 'Whole Life / Endowment',
  ulip: 'ULIP',
  health_individual: 'Health Insurance (Individual)',
  health_family_floater: 'Health Insurance (Family Floater)',
  vehicle_car: 'Car Insurance',
  vehicle_two_wheeler: 'Two-Wheeler Insurance',
  property: 'Property Insurance',
  pmjjby: 'PMJJBY',
  pmsby: 'PMSBY',
  other: 'Other',
}

export const PREMIUM_FREQUENCY_LABELS: Record<PremiumFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-Yearly',
  annual: 'Annual',
  single: 'Single Premium',
}

export const MANUAL_DEDUCTION_LABELS: Record<ManualDeductionSection, string> = {
  sec80C_nsc: '80C — NSC',
  sec80C_kvp: '80C — KVP',
  sec80C_children_tuition: '80C — Children Tuition',
  sec80C_other: '80C — Other',
  sec80D_self_family: '80D — Health (Self & Family)',
  sec80D_parents: '80D — Health (Parents)',
  sec80D_parents_senior: '80D — Health (Senior Citizen Parents)',
  sec80E_education_loan_interest: '80E — Education Loan Interest',
  sec80G_donation: '80G — Donations',
  sec24b_home_loan_interest: '24b — Home Loan Interest',
  hra: 'HRA',
  other: 'Other',
}

export const PASSIVE_INCOME_TYPE_LABELS: Record<PassiveIncomeType, string> = {
  dividend_stock: 'Dividend — Stocks',
  dividend_mf: 'Dividend — Mutual Funds',
  interest_fd: 'Interest — Fixed Deposit',
  interest_savings: 'Interest — Savings Account',
  interest_nsc: 'Interest — NSC',
  interest_ppf: 'Interest — PPF (Tax Exempt)',
  sgb_interest: 'SGB Interest',
  other: 'Other',
}
```

- [ ] **Step 2: Build shared package to verify types compile**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy/shared && pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy
git add shared/src/types/finance.ts
git commit -m "feat: add Phase 3 shared types (insurance, tax, passive income)"
```

---

## Task 3: Insurance Backend

**Files:**
- Create: `server/src/services/insurance.ts`
- Create: `server/src/controllers/insurance.ts`
- Create: `server/src/routes/insurance.ts`

- [ ] **Step 1: Create `server/src/services/insurance.ts`**

```typescript
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
```

- [ ] **Step 2: Create `server/src/controllers/insurance.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/insurance.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const INSURANCE_TYPES = [
  "term_life", "whole_life", "ulip", "health_individual", "health_family_floater",
  "vehicle_car", "vehicle_two_wheeler", "property", "pmjjby", "pmsby", "other",
] as const;

const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "half_yearly", "annual", "single"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  insuranceType: z.enum(INSURANCE_TYPES),
  insurerName: z.string().min(1).max(200),
  policyLast6: z.string().length(6).optional(),
  sumAssured: z.number().min(0),
  premiumAmount: z.number().min(0),
  premiumFrequency: z.enum(PREMIUM_FREQUENCIES),
  startDate: z.string().datetime(),
  renewalDate: z.string().datetime(),
  nomineeName: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial().omit({ familyMemberId: true, insuranceType: true, startDate: true });

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listInsurance((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createInsurance((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateInsurance(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteInsurance(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
```

- [ ] **Step 3: Create `server/src/routes/insurance.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/insurance.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as insuranceRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/insurance.ts server/src/controllers/insurance.ts server/src/routes/insurance.ts
git commit -m "feat: add insurance service, controller, and routes"
```

---

## Task 4: Passive Income Backend

**Files:**
- Create: `server/src/services/passiveIncome.ts`
- Create: `server/src/controllers/passiveIncome.ts`
- Create: `server/src/routes/passiveIncome.ts`

- [ ] **Step 1: Create `server/src/services/passiveIncome.ts`**

```typescript
import { prisma } from "../models/prisma.js";
import type { PassiveIncomeType } from "@prisma/client";

function getFiscalYearRange(fiscalYear: string): { start: Date; end: Date } {
  const startYear = parseInt(fiscalYear.split("-")[0], 10);
  return {
    start: new Date(startYear, 3, 1),           // Apr 1
    end: new Date(startYear + 1, 2, 31, 23, 59, 59), // Mar 31
  };
}

export async function listPassiveIncome(userId: string, fiscalYear?: string) {
  const where: any = { userId, isActive: true };
  if (fiscalYear) {
    const { start, end } = getFiscalYearRange(fiscalYear);
    where.date = { gte: start, lte: end };
  }
  return prisma.passiveIncome.findMany({
    where,
    orderBy: { date: "desc" },
  });
}

export async function createPassiveIncome(
  userId: string,
  data: {
    incomeType: PassiveIncomeType;
    amount: number;
    date: string;
    source: string;
    tdsDeducted?: number;
    notes?: string;
  }
) {
  return prisma.passiveIncome.create({
    data: {
      userId,
      incomeType: data.incomeType,
      amount: BigInt(Math.round(data.amount * 100)),
      date: new Date(data.date),
      source: data.source,
      tdsDeducted: BigInt(Math.round((data.tdsDeducted ?? 0) * 100)),
      notes: data.notes ?? null,
    },
  });
}

export async function updatePassiveIncome(
  id: string,
  userId: string,
  data: {
    incomeType?: PassiveIncomeType;
    amount?: number;
    date?: string;
    source?: string;
    tdsDeducted?: number;
    notes?: string;
  }
) {
  return prisma.passiveIncome.update({
    where: { id, userId },
    data: {
      ...(data.incomeType !== undefined && { incomeType: data.incomeType }),
      ...(data.amount !== undefined && {
        amount: BigInt(Math.round(data.amount * 100)),
      }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.tdsDeducted !== undefined && {
        tdsDeducted: BigInt(Math.round(data.tdsDeducted * 100)),
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deletePassiveIncome(id: string, userId: string) {
  return prisma.passiveIncome.update({
    where: { id, userId },
    data: { isActive: false },
  });
}

export async function getPassiveIncomeSummary(userId: string, fiscalYear: string) {
  const { start, end } = getFiscalYearRange(fiscalYear);
  const entries = await prisma.passiveIncome.findMany({
    where: { userId, isActive: true, date: { gte: start, lte: end } },
  });

  const byTypeMap = new Map<PassiveIncomeType, { amount: bigint; tdsDeducted: bigint }>();
  let totalAmount = 0n;
  let totalTds = 0n;

  for (const e of entries) {
    totalAmount += e.amount;
    totalTds += e.tdsDeducted;
    const existing = byTypeMap.get(e.incomeType) ?? { amount: 0n, tdsDeducted: 0n };
    byTypeMap.set(e.incomeType, {
      amount: existing.amount + e.amount,
      tdsDeducted: existing.tdsDeducted + e.tdsDeducted,
    });
  }

  return {
    fiscalYear,
    totalAmount: Number(totalAmount),
    totalTdsDeducted: Number(totalTds),
    byType: Array.from(byTypeMap.entries()).map(([type, vals]) => ({
      type,
      amount: Number(vals.amount),
      tdsDeducted: Number(vals.tdsDeducted),
    })),
  };
}
```

- [ ] **Step 2: Create `server/src/controllers/passiveIncome.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/passiveIncome.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const PASSIVE_INCOME_TYPES = [
  "dividend_stock", "dividend_mf", "interest_fd", "interest_savings",
  "interest_nsc", "interest_ppf", "sgb_interest", "other",
] as const;

const createSchema = z.object({
  incomeType: z.enum(PASSIVE_INCOME_TYPES),
  amount: z.number().min(0),
  date: z.string().datetime(),
  source: z.string().min(1).max(200),
  tdsDeducted: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial();

const fiscalYearSchema = z.string().regex(/^\d{4}-\d{2}$/).optional();

export const list = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = fiscalYearSchema.parse(req.query.fiscalYear);
  res.json({
    success: true,
    data: await svc.listPassiveIncome((req as AuthenticatedRequest).userId, fiscalYear),
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createPassiveIncome((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updatePassiveIncome(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deletePassiveIncome(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = z.string().regex(/^\d{4}-\d{2}$/).parse(req.query.fiscalYear);
  res.json({
    success: true,
    data: await svc.getPassiveIncomeSummary((req as AuthenticatedRequest).userId, fiscalYear),
  });
});
```

- [ ] **Step 3: Create `server/src/routes/passiveIncome.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/passiveIncome.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.get("/summary", ctrl.summary);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as passiveIncomeRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/passiveIncome.ts server/src/controllers/passiveIncome.ts server/src/routes/passiveIncome.ts
git commit -m "feat: add passive income service, controller, and routes"
```

---

## Task 5: Tax Service — Helpers and Aggregation

**Files:**
- Create: `server/src/services/tax.ts` (partial — helpers + aggregation logic)

- [ ] **Step 1: Create `server/src/services/tax.ts` with fiscal year helpers and tax slab computation**

```typescript
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
```

- [ ] **Step 2: Append `getTaxSummary` to `server/src/services/tax.ts`**

```typescript
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
```

- [ ] **Step 3: Append CRUD helpers for TaxProfile and TaxDeduction to `server/src/services/tax.ts`**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/tax.ts
git commit -m "feat: add tax service with 80C aggregation, slab computation, and advance tax"
```

---

## Task 6: Tax Controller and Routes

**Files:**
- Create: `server/src/controllers/tax.ts`
- Create: `server/src/routes/tax.ts`

- [ ] **Step 1: Create `server/src/controllers/tax.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/tax.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MANUAL_DEDUCTION_SECTIONS = [
  "sec80C_nsc", "sec80C_kvp", "sec80C_children_tuition", "sec80C_other",
  "sec80D_self_family", "sec80D_parents", "sec80D_parents_senior",
  "sec80E_education_loan_interest", "sec80G_donation",
  "sec24b_home_loan_interest", "hra", "other",
] as const;

const fiscalYearSchema = z.string().regex(/^\d{4}-\d{2}$/);

const deductionCreateSchema = z.object({
  fiscalYear: fiscalYearSchema,
  section: z.enum(MANUAL_DEDUCTION_SECTIONS),
  amount: z.number().min(0),
  description: z.string().max(300).optional(),
});

const deductionUpdateSchema = deductionCreateSchema.partial().omit({ fiscalYear: true });

const profileSchema = z.object({
  fiscalYear: fiscalYearSchema,
  preferredRegime: z.enum(["old", "new"]),
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = fiscalYearSchema.parse(
    req.query.fiscalYear ?? svc.currentFiscalYear()
  );
  res.json({
    success: true,
    data: await svc.getTaxSummary((req as AuthenticatedRequest).userId, fiscalYear),
  });
});

export const listDeductions = asyncHandler(async (req: Request, res: Response) => {
  const fiscalYear = fiscalYearSchema.parse(
    req.query.fiscalYear ?? svc.currentFiscalYear()
  );
  res.json({
    success: true,
    data: await svc.listTaxDeductions((req as AuthenticatedRequest).userId, fiscalYear),
  });
});

export const createDeduction = asyncHandler(async (req: Request, res: Response) => {
  const parsed = deductionCreateSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createTaxDeduction((req as AuthenticatedRequest).userId, parsed),
  });
});

export const updateDeduction = asyncHandler(async (req: Request, res: Response) => {
  const parsed = deductionUpdateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateTaxDeduction(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const removeDeduction = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteTaxDeduction(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = profileSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.upsertTaxProfile(
      (req as AuthenticatedRequest).userId,
      parsed.fiscalYear,
      parsed.preferredRegime
    ),
  });
});
```

- [ ] **Step 2: Create `server/src/routes/tax.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/tax.js";

const router: Router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);
router.get("/deductions", ctrl.listDeductions);
router.post("/deductions", ctrl.createDeduction);
router.put("/deductions/:id", ctrl.updateDeduction);
router.delete("/deductions/:id", ctrl.removeDeduction);
router.put("/profile", ctrl.updateProfile);

export { router as taxRouter };
```

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/tax.ts server/src/routes/tax.ts
git commit -m "feat: add tax controller and routes"
```

---

## Task 7: Register All Three Routers in app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add imports to `server/src/app.ts`**

After the existing imports (after `import { investmentsRouter }...`), add:

```typescript
import { insuranceRouter } from "./routes/insurance.js";
import { taxRouter } from "./routes/tax.js";
import { passiveIncomeRouter } from "./routes/passiveIncome.js";
```

- [ ] **Step 2: Register routes in `server/src/app.ts`**

After `app.use("/api/investments", investmentsRouter);`, add:

```typescript
app.use("/api/insurance", insuranceRouter);
app.use("/api/tax", taxRouter);
app.use("/api/passive-income", passiveIncomeRouter);
```

- [ ] **Step 3: Start the server to verify no import errors**

```bash
cd server && pnpm dev
```

Expected: Server starts on port 3001 with no errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: register insurance, tax, and passive-income routers"
```

---

## Task 8: Backend Tests — Insurance

**Files:**
- Create: `server/src/__tests__/insurance.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "insurance-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let policyId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Insurance Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app)
    .post("/api/family-members")
    .set("Cookie", cookies)
    .send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Insurance API", () => {
  it("POST /api/insurance creates a policy", async () => {
    const res = await request(app)
      .post("/api/insurance")
      .set("Cookie", cookies)
      .send({
        familyMemberId: memberId,
        insuranceType: "term_life",
        insurerName: "HDFC Life",
        sumAssured: 10000000,
        premiumAmount: 12000,
        premiumFrequency: "annual",
        startDate: "2024-01-01T00:00:00.000Z",
        renewalDate: "2025-01-01T00:00:00.000Z",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.insurerName).toBe("HDFC Life");
    expect(typeof res.body.data.daysUntilRenewal).toBe("number");
    expect(typeof res.body.data.renewalSoon).toBe("boolean");
    policyId = res.body.data.id;
  });

  it("GET /api/insurance returns list with computed fields", async () => {
    const res = await request(app).get("/api/insurance").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty("daysUntilRenewal");
    expect(res.body.data[0]).toHaveProperty("renewalSoon");
  });

  it("PUT /api/insurance/:id updates a policy", async () => {
    const res = await request(app)
      .put(`/api/insurance/${policyId}`)
      .set("Cookie", cookies)
      .send({ insurerName: "LIC" });
    expect(res.status).toBe(200);
    expect(res.body.data.insurerName).toBe("LIC");
  });

  it("DELETE /api/insurance/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/insurance/${policyId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/insurance").set("Cookie", cookies);
    expect(list.body.data.find((p: any) => p.id === policyId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run insurance tests**

```bash
cd server && pnpm test --reporter=verbose src/__tests__/insurance.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/insurance.test.ts
git commit -m "test: add insurance API integration tests"
```

---

## Task 9: Backend Tests — Passive Income and Tax

**Files:**
- Create: `server/src/__tests__/passiveIncome.test.ts`
- Create: `server/src/__tests__/tax.test.ts`

- [ ] **Step 1: Write `server/src/__tests__/passiveIncome.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "passive-income-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let entryId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "PI Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Passive Income API", () => {
  it("POST /api/passive-income creates an entry", async () => {
    const res = await request(app)
      .post("/api/passive-income")
      .set("Cookie", cookies)
      .send({
        incomeType: "dividend_stock",
        amount: 5000,
        date: "2025-07-15T00:00:00.000Z",
        source: "TCS",
        tdsDeducted: 500,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe("TCS");
    entryId = res.body.data.id;
  });

  it("GET /api/passive-income?fiscalYear=2025-26 filters by FY", async () => {
    const res = await request(app)
      .get("/api/passive-income?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("GET /api/passive-income/summary?fiscalYear=2025-26 returns totals", async () => {
    const res = await request(app)
      .get("/api/passive-income/summary?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.totalAmount).toBe(500000); // ₹5000 in paise
    expect(res.body.data.totalTdsDeducted).toBe(50000); // ₹500 in paise
    expect(res.body.data.byType[0].type).toBe("dividend_stock");
  });

  it("PUT /api/passive-income/:id updates entry", async () => {
    const res = await request(app)
      .put(`/api/passive-income/${entryId}`)
      .set("Cookie", cookies)
      .send({ source: "Infosys" });
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("Infosys");
  });

  it("DELETE /api/passive-income/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/passive-income/${entryId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app)
      .get("/api/passive-income")
      .set("Cookie", cookies);
    expect(list.body.data.find((e: any) => e.id === entryId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Write `server/src/__tests__/tax.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "tax-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let deductionId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Tax Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Tax API", () => {
  it("GET /api/tax/summary returns full summary structure", async () => {
    const res = await request(app)
      .get("/api/tax/summary?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty("fiscalYear", "2025-26");
    expect(d).toHaveProperty("income");
    expect(d).toHaveProperty("deductions");
    expect(d).toHaveProperty("taxableIncome");
    expect(d).toHaveProperty("taxLiability");
    expect(d).toHaveProperty("advanceTax");
    expect(d).toHaveProperty("form15GH");
    expect(d.advanceTax.q1_by).toBe("2025-06-15");
    expect(d.advanceTax.q4_by).toBe("2026-03-15");
  });

  it("PUT /api/tax/profile updates preferred regime", async () => {
    const res = await request(app)
      .put("/api/tax/profile")
      .set("Cookie", cookies)
      .send({ fiscalYear: "2025-26", preferredRegime: "old" });
    expect(res.status).toBe(200);
    expect(res.body.data.preferredRegime).toBe("old");
  });

  it("POST /api/tax/deductions adds a manual deduction", async () => {
    const res = await request(app)
      .post("/api/tax/deductions")
      .set("Cookie", cookies)
      .send({
        fiscalYear: "2025-26",
        section: "sec80C_nsc",
        amount: 50000,
        description: "NSC purchased",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.section).toBe("sec80C_nsc");
    deductionId = res.body.data.id;
  });

  it("GET /api/tax/deductions?fiscalYear=2025-26 returns deductions", async () => {
    const res = await request(app)
      .get("/api/tax/deductions?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("PUT /api/tax/deductions/:id updates a deduction", async () => {
    const res = await request(app)
      .put(`/api/tax/deductions/${deductionId}`)
      .set("Cookie", cookies)
      .send({ amount: 60000 });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(6000000); // ₹60,000 in paise
  });

  it("DELETE /api/tax/deductions/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/tax/deductions/${deductionId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app)
      .get("/api/tax/deductions?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(list.body.data.find((d: any) => d.id === deductionId)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run all new tests**

```bash
cd server && pnpm test --reporter=verbose src/__tests__/passiveIncome.test.ts src/__tests__/tax.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Run full test suite to ensure nothing is broken**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/__tests__/passiveIncome.test.ts server/src/__tests__/tax.test.ts
git commit -m "test: add passive income and tax API integration tests"
```

---

## Task 10: Insurance Client Page

**Files:**
- Create: `client/src/pages/finance/InsurancePage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/InsurancePage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Shield, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import type {
  InsurancePolicyResponse,
  InsuranceType,
  PremiumFrequency,
  Relationship,
} from "@ai-personal-diary/shared/types/finance";
import {
  INSURANCE_TYPE_LABELS,
  PREMIUM_FREQUENCY_LABELS,
} from "@ai-personal-diary/shared/types/finance";

interface FamilyMember { id: string; name: string; relationship: Relationship }

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function paiseToRupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

const INSURANCE_TYPE_VALUES: InsuranceType[] = [
  "term_life","whole_life","ulip","health_individual","health_family_floater",
  "vehicle_car","vehicle_two_wheeler","property","pmjjby","pmsby","other",
];
const PREMIUM_FREQUENCY_VALUES: PremiumFrequency[] = [
  "monthly","quarterly","half_yearly","annual","single",
];

const emptyForm = {
  familyMemberId: "",
  insuranceType: "term_life" as InsuranceType,
  insurerName: "",
  policyLast6: "",
  sumAssured: "",
  premiumAmount: "",
  premiumFrequency: "annual" as PremiumFrequency,
  startDate: "",
  renewalDate: "",
  nomineeName: "",
  notes: "",
};

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicyResponse[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicyResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/insurance`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/family-members`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([insRes, memRes]) => {
      if (insRes.success) setPolicies(insRes.data);
      if (memRes.success) setMembers(memRes.data);
      setLoading(false);
    });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, familyMemberId: members[0]?.id ?? "" });
    setShowModal(true);
  }

  function openEdit(p: InsurancePolicyResponse) {
    setEditing(p);
    setForm({
      familyMemberId: p.familyMemberId,
      insuranceType: p.insuranceType,
      insurerName: p.insurerName,
      policyLast6: p.policyLast6 ?? "",
      sumAssured: String(p.sumAssured / 100),
      premiumAmount: String(p.premiumAmount / 100),
      premiumFrequency: p.premiumFrequency,
      startDate: p.startDate.slice(0, 10),
      renewalDate: p.renewalDate.slice(0, 10),
      nomineeName: p.nomineeName ?? "",
      notes: p.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      sumAssured: parseFloat(form.sumAssured),
      premiumAmount: parseFloat(form.premiumAmount),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      renewalDate: form.renewalDate ? new Date(form.renewalDate).toISOString() : undefined,
      policyLast6: form.policyLast6 || undefined,
      nomineeName: form.nomineeName || undefined,
      notes: form.notes || undefined,
    };
    const url = editing
      ? `${API}/api/insurance/${editing.id}`
      : `${API}/api/insurance`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      if (editing) {
        setPolicies((prev) => prev.map((p) => (p.id === editing.id ? data.data : p)));
      } else {
        setPolicies((prev) => [...prev, data.data]);
      }
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this policy?")) return;
    const res = await fetch(`${API}/api/insurance/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) {
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    }
  }

  const renewingSoon = policies.filter((p) => p.renewalSoon);
  const others = policies.filter((p) => !p.renewalSoon);

  if (loading) {
    return (
      <div className="p-6 text-slate-500 dark:text-slate-400">Loading...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Insurance
          </h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Policy
        </button>
      </div>

      {/* Renewing soon */}
      {renewingSoon.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
            Renewing Within 30 Days
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {renewingSoon.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p.id)}
                urgent
              />
            ))}
          </div>
        </section>
      )}

      {/* All other policies */}
      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            All Policies
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p.id)}
                urgent={false}
              />
            ))}
          </div>
        </section>
      )}

      {policies.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Shield className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No insurance policies added yet.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Policy" : "Add Policy"}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Family Member
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.familyMemberId}
                    onChange={(e) => setForm({ ...form, familyMemberId: e.target.value })}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Insurance Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.insuranceType}
                    onChange={(e) =>
                      setForm({ ...form, insuranceType: e.target.value as InsuranceType })
                    }
                    disabled={!!editing}
                  >
                    {INSURANCE_TYPE_VALUES.map((t) => (
                      <option key={t} value={t}>
                        {INSURANCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Insurer Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.insurerName}
                    onChange={(e) => setForm({ ...form, insurerName: e.target.value })}
                    placeholder="e.g. HDFC Life"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Policy Last 6 Digits
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.policyLast6}
                    maxLength={6}
                    onChange={(e) => setForm({ ...form, policyLast6: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Sum Assured (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.sumAssured}
                    onChange={(e) => setForm({ ...form, sumAssured: e.target.value })}
                    placeholder="e.g. 10000000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Premium (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.premiumAmount}
                    onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })}
                    placeholder="e.g. 12000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Premium Frequency
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.premiumFrequency}
                  onChange={(e) =>
                    setForm({ ...form, premiumFrequency: e.target.value as PremiumFrequency })
                  }
                >
                  {PREMIUM_FREQUENCY_VALUES.map((f) => (
                    <option key={f} value={f}>
                      {PREMIUM_FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    disabled={!!editing}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.renewalDate}
                    onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Nominee Name (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.nomineeName}
                  onChange={(e) => setForm({ ...form, nomineeName: e.target.value })}
                  placeholder="Nominee full name"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Notes (optional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyCard({
  policy,
  onEdit,
  onDelete,
  urgent,
}: {
  policy: InsurancePolicyResponse;
  onEdit: () => void;
  onDelete: () => void;
  urgent: boolean;
}) {
  function paiseToRupees(paise: number) {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        urgent
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {policy.insurerName}
            </span>
            {urgent && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {INSURANCE_TYPE_LABELS[policy.insuranceType]}
            {policy.policyLast6 ? ` — ••${policy.policyLast6}` : ""}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Sum Assured</span>
          <p className="font-medium text-slate-900 dark:text-white">
            {paiseToRupees(policy.sumAssured)}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Premium</span>
          <p className="font-medium text-slate-900 dark:text-white">
            {paiseToRupees(policy.premiumAmount)}{" "}
            <span className="text-slate-400">/ {PREMIUM_FREQUENCY_LABELS[policy.premiumFrequency]}</span>
          </p>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500">Renews</span>
          <p className={`font-medium ${urgent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
            {new Date(policy.renewalDate).toLocaleDateString("en-IN")}{" "}
            <span className="text-slate-400">
              ({policy.daysUntilRenewal > 0 ? `${policy.daysUntilRenewal}d` : "Overdue"})
            </span>
          </p>
        </div>
        {policy.familyMember && (
          <div className="col-span-2">
            <span className="text-slate-500">For</span>
            <p className="font-medium text-slate-900 dark:text-white capitalize">
              {policy.familyMember.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/InsurancePage.tsx
git commit -m "feat: add InsurancePage client"
```

---

## Task 11: Passive Income Client Page

**Files:**
- Create: `client/src/pages/finance/PassiveIncomePage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/PassiveIncomePage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Coins, Plus, Trash2, Edit2 } from "lucide-react";
import type { PassiveIncomeResponse, PassiveIncomeType } from "@ai-personal-diary/shared/types/finance";
import {
  PASSIVE_INCOME_TYPE_LABELS,
} from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const PASSIVE_INCOME_TYPES: PassiveIncomeType[] = [
  "dividend_stock","dividend_mf","interest_fd","interest_savings",
  "interest_nsc","interest_ppf","sgb_interest","other",
];

function currentFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getFiscalYears() {
  const fy = currentFiscalYear();
  const [sy] = fy.split("-").map(Number);
  return [fy, `${sy - 1}-${String(sy).slice(2)}`, `${sy - 2}-${String(sy - 1).slice(2)}`];
}

const emptyForm = {
  incomeType: "dividend_stock" as PassiveIncomeType,
  amount: "",
  date: "",
  source: "",
  tdsDeducted: "",
  notes: "",
};

export default function PassiveIncomePage() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [entries, setEntries] = useState<PassiveIncomeResponse[]>([]);
  const [summary, setSummary] = useState<{ totalAmount: number; totalTdsDeducted: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PassiveIncomeResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/passive-income?fiscalYear=${fiscalYear}`, { credentials: "include" })
        .then((r) => r.json()),
      fetch(`${API}/api/passive-income/summary?fiscalYear=${fiscalYear}`, { credentials: "include" })
        .then((r) => r.json()),
    ]).then(([listRes, sumRes]) => {
      if (listRes.success) setEntries(listRes.data);
      if (sumRes.success) setSummary(sumRes.data);
      setLoading(false);
    });
  }, [fiscalYear]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  }

  function openEdit(e: PassiveIncomeResponse) {
    setEditing(e);
    setForm({
      incomeType: e.incomeType,
      amount: String(e.amount / 100),
      date: e.date.slice(0, 10),
      source: e.source,
      tdsDeducted: String(e.tdsDeducted / 100),
      notes: e.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      amount: parseFloat(form.amount),
      tdsDeducted: parseFloat(form.tdsDeducted) || 0,
      date: new Date(form.date).toISOString(),
      notes: form.notes || undefined,
    };
    const url = editing ? `${API}/api/passive-income/${editing.id}` : `${API}/api/passive-income`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      if (editing) {
        setEntries((prev) => prev.map((e) => (e.id === editing.id ? data.data : e)));
      } else {
        setEntries((prev) => [data.data, ...prev]);
      }
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`${API}/api/passive-income/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  function rupees(paise: number) {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dividend & Interest Income
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
          >
            {getFiscalYears().map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Total Income (FY {fiscalYear})</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {rupees(summary.totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500">TDS Deducted</p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {rupees(summary.totalTdsDeducted)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Net Received</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {rupees(summary.totalAmount - summary.totalTdsDeducted)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Coins className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No income entries for FY {fiscalYear}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Source</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">TDS</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((e) => (
                <tr key={e.id} className="bg-white dark:bg-slate-800">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {new Date(e.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">
                    {PASSIVE_INCOME_TYPE_LABELS[e.incomeType]}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.source}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                    {rupees(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                    {e.tdsDeducted > 0 ? rupees(e.tdsDeducted) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Entry" : "Add Income"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.incomeType}
                  onChange={(e) => setForm({ ...form, incomeType: e.target.value as PassiveIncomeType })}
                >
                  {PASSIVE_INCOME_TYPES.map((t) => (
                    <option key={t} value={t}>{PASSIVE_INCOME_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">TDS Deducted (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.tdsDeducted}
                    onChange={(e) => setForm({ ...form, tdsDeducted: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Source</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="e.g. TCS dividend"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes (optional)</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/PassiveIncomePage.tsx
git commit -m "feat: add PassiveIncomePage client"
```

---

## Task 12: Tax Planner Client Page

**Files:**
- Create: `client/src/pages/finance/TaxPlannerPage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/TaxPlannerPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Calculator, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import type {
  TaxSummaryResponse,
  ManualDeductionSection,
  TaxRegime,
} from "@ai-personal-diary/shared/types/finance";
import { MANUAL_DEDUCTION_LABELS } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const MANUAL_SECTIONS: ManualDeductionSection[] = [
  "sec80C_nsc","sec80C_kvp","sec80C_children_tuition","sec80C_other",
  "sec80D_self_family","sec80D_parents","sec80D_parents_senior",
  "sec80E_education_loan_interest","sec80G_donation",
  "sec24b_home_loan_interest","hra","other",
];

function currentFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getFiscalYears() {
  const fy = currentFiscalYear();
  const [sy] = fy.split("-").map(Number);
  return [fy, `${sy - 1}-${String(sy).slice(2)}`, `${sy - 2}-${String(sy - 1).slice(2)}`];
}

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function lakhFormat(paise: number) {
  const r = paise / 100;
  if (r >= 10_000_00) return `₹${(r / 10_00_000).toFixed(2)}Cr`;
  if (r >= 1_00_000) return `₹${(r / 1_00_000).toFixed(2)}L`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default function TaxPlannerPage() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [summary, setSummary] = useState<TaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [newSection, setNewSection] = useState<ManualDeductionSection>("sec80C_nsc");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadSummary() {
    setLoading(true);
    const res = await fetch(`${API}/api/tax/summary?fiscalYear=${fiscalYear}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) setSummary(data.data);
    setLoading(false);
  }

  useEffect(() => {
    loadSummary();
  }, [fiscalYear]);

  async function handleRegimeChange(regime: TaxRegime) {
    await fetch(`${API}/api/tax/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscalYear, preferredRegime: regime }),
    });
    loadSummary();
  }

  async function handleAddDeduction() {
    setSaving(true);
    const res = await fetch(`${API}/api/tax/deductions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiscalYear,
        section: newSection,
        amount: parseFloat(newAmount),
        description: newDesc || undefined,
      }),
    });
    if ((await res.json()).success) {
      setShowAddDeduction(false);
      setNewAmount("");
      setNewDesc("");
      loadSummary();
    }
    setSaving(false);
  }

  async function handleDeleteDeduction(id: string) {
    if (!confirm("Remove this deduction?")) return;
    const res = await fetch(`${API}/api/tax/deductions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) loadSummary();
  }

  if (loading || !summary) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  const d = summary.deductions;
  const sec80CPercent = Math.min(100, Math.round((d.sec80C_total / d.sec80C_max) * 100));
  const oldBetter = summary.taxLiability.old < summary.taxLiability.new;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Planner</h1>
        </div>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
        >
          {getFiscalYears().map((fy) => (
            <option key={fy} value={fy}>FY {fy}</option>
          ))}
        </select>
      </div>

      {/* Section 1 — 80C Tracker */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Section 80C</h2>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {lakhFormat(d.sec80C_total)} invested
          </span>
          <span className="text-slate-500">Limit: ₹1,50,000</span>
        </div>
        <div className="mb-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${
              sec80CPercent >= 100 ? "bg-green-500" : "bg-ocean-accent"
            }`}
            style={{ width: `${sec80CPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {d.sec80C_remaining > 0
            ? `₹${(d.sec80C_remaining / 100).toLocaleString("en-IN")} remaining room`
            : "80C limit fully utilised"}
        </p>

        <div className="mt-4 space-y-1.5">
          {[
            { label: "EPF (Employee)", val: d.epf },
            { label: "PPF", val: d.ppf },
            { label: "ELSS MFs", val: d.elss },
            { label: "Life Insurance", val: d.lifeInsurance },
            { label: "Home Loan Principal", val: d.homeLoanPrincipal },
            { label: "NSC", val: d.nsc },
            { label: "KVP", val: d.kvp },
            { label: "Children Tuition", val: d.childrenTuition },
            { label: "Other 80C", val: d.sec80C_other },
          ]
            .filter((r) => r.val > 0)
            .map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{r.label}</span>
                <span className="font-medium text-slate-900 dark:text-white">{rupees(r.val)}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Section 2 — Other Deductions */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Other Deductions</h2>
          <button
            onClick={() => setShowAddDeduction(true)}
            className="flex items-center gap-1.5 rounded-lg bg-ocean-accent/10 px-3 py-1.5 text-xs font-medium text-ocean-accent hover:bg-ocean-accent/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {/* Auto-derived health insurance */}
        {d.sec80D > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">80D — Health Insurance</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec80D)}</span>
          </div>
        )}
        {d.sec80E > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">80E — Education Loan Interest</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec80E)}</span>
          </div>
        )}
        {d.sec80G > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">80G — Donations</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec80G)}</span>
          </div>
        )}
        {d.sec24b > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">24b — Home Loan Interest</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec24b)}</span>
          </div>
        )}
        {d.hra > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">HRA</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.hra)}</span>
          </div>
        )}

        {/* Manual deductions list */}
        {summary.manualDeductions.map((md) => (
          <div key={md.id} className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {MANUAL_DEDUCTION_LABELS[md.section]}
              {md.description && <span className="ml-1 text-slate-400">({md.description})</span>}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-white">{rupees(md.amount)}</span>
              <button
                onClick={() => handleDeleteDeduction(md.id)}
                className="text-slate-300 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {summary.manualDeductions.length === 0 && d.sec80D === 0 && d.sec80E === 0 && (
          <p className="text-sm text-slate-400">No deductions added yet.</p>
        )}

        {/* Add deduction inline form */}
        {showAddDeduction && (
          <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Section</label>
                <select
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value as ManualDeductionSection)}
                >
                  {MANUAL_SECTIONS.map((s) => (
                    <option key={s} value={s}>{MANUAL_DEDUCTION_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Amount (₹)</label>
                <input
                  type="number"
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-xs text-slate-500">Description (optional)</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowAddDeduction(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDeduction}
                disabled={saving || !newAmount}
                className="rounded bg-ocean-accent px-3 py-1 text-xs text-white hover:bg-ocean-accent/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 3 — Regime Comparison */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Tax Regime Comparison</h2>
        <div className="grid grid-cols-2 gap-4">
          {(["old", "new"] as TaxRegime[]).map((regime) => {
            const isSelected = summary.regime === regime;
            const isBetter = regime === "old" ? oldBetter : !oldBetter;
            const taxable = summary.taxableIncome[regime];
            const liability = summary.taxLiability[regime];
            return (
              <div
                key={regime}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? "border-ocean-accent bg-ocean-accent/5"
                    : "border-slate-200 dark:border-slate-600"
                }`}
                onClick={() => handleRegimeChange(regime)}
              >
                {isBetter && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" /> Better
                  </span>
                )}
                <p className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {regime} Regime
                </p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable Income</span>
                    <span className="font-medium text-slate-900 dark:text-white">{rupees(taxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax + Cess</span>
                    <span className={`font-bold ${isBetter ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {rupees(liability)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Click a regime to set it as preferred. Includes 4% cess. Standard deduction applied automatically.
        </p>
      </section>

      {/* Section 4 — Advance Tax */}
      {summary.advanceTax.required && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Advance Tax</h2>
          <div className="space-y-3">
            {[
              { by: summary.advanceTax.q1_by, amount: summary.advanceTax.q1_amount, label: "Q1 (15%)" },
              { by: summary.advanceTax.q2_by, amount: summary.advanceTax.q2_amount, label: "Q2 (45%)" },
              { by: summary.advanceTax.q3_by, amount: summary.advanceTax.q3_amount, label: "Q3 (75%)" },
              { by: summary.advanceTax.q4_by, amount: summary.advanceTax.q4_amount, label: "Q4 (100%)" },
            ].map((q) => {
              const isPast = new Date(q.by) < new Date();
              return (
                <div
                  key={q.by}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                    isPast
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-slate-50 dark:bg-slate-700/50"
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{q.label}</span>
                    <span className="ml-2 text-xs text-slate-500">by {q.by}</span>
                    {isPast && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" /> Due
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">{rupees(q.amount)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 5 — Form 15G/H */}
      {summary.form15GH.fdAccounts.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Form 15G/H — FD TDS Risk</h2>
          <div className="space-y-2">
            {summary.form15GH.fdAccounts.map((fd, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  fd.tdsRisk ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-700/50"
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{fd.bankName}</span>
                  <span className="ml-1 text-xs text-slate-500">••{fd.accountLast4}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    ~{rupees(fd.annualInterest)} interest
                  </span>
                  {fd.tdsRisk && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> File 15G/H
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            TDS risk when annual interest exceeds ₹40,000. File Form 15G (age &lt; 60) or 15H (age ≥ 60) to avoid TDS.
          </p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/TaxPlannerPage.tsx
git commit -m "feat: add TaxPlannerPage client with 80C tracker, regime comparison, advance tax"
```

---

## Task 13: Wire Client Routes and Sidebar

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add imports and routes to `client/src/App.tsx`**

After `import InvestmentsPage from "./pages/finance/InvestmentsPage";`, add:

```tsx
import InsurancePage from "./pages/finance/InsurancePage";
import TaxPlannerPage from "./pages/finance/TaxPlannerPage";
import PassiveIncomePage from "./pages/finance/PassiveIncomePage";
```

After `<Route path="investments" element={<InvestmentsPage />} />`, add:

```tsx
<Route path="insurance" element={<InsurancePage />} />
<Route path="tax" element={<TaxPlannerPage />} />
<Route path="passive-income" element={<PassiveIncomePage />} />
```

- [ ] **Step 2: Add icons and nav items to `client/src/components/layout/Sidebar.tsx`**

In the import from `lucide-react`, add `Shield`, `Calculator`, `Coins`:

```tsx
import {
  // ... existing imports
  Shield,
  Calculator,
  Coins,
} from "lucide-react";
```

In `mainNavItems`, after the `investments` entry, add:

```tsx
  { to: "/insurance", label: "Insurance", icon: Shield },
  { to: "/tax", label: "Tax Planner", icon: Calculator },
  { to: "/passive-income", label: "Passive Income", icon: Coins },
```

- [ ] **Step 3: Start the client and verify pages load**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm dev
```

Navigate to `/insurance`, `/tax`, `/passive-income` in the browser. Verify each page renders without errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add insurance, tax, and passive-income client routes and sidebar nav"
```

---

## Task 14: Documentation Update

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add Phase 3 API endpoints to the API Reference section of `docs/architecture.md`**

Add under an "API Reference" or equivalent section:

```markdown
### Insurance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/insurance` | List all policies (includes `daysUntilRenewal`, `renewalSoon`) |
| POST | `/api/insurance` | Create policy |
| PUT | `/api/insurance/:id` | Update policy |
| DELETE | `/api/insurance/:id` | Soft delete |

### Tax Planner
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tax/summary?fiscalYear=2025-26` | Full tax picture (80C, regime comparison, advance tax, Form 15G/H) |
| GET | `/api/tax/deductions?fiscalYear=2025-26` | List manual deductions |
| POST | `/api/tax/deductions` | Add manual deduction |
| PUT | `/api/tax/deductions/:id` | Update deduction |
| DELETE | `/api/tax/deductions/:id` | Remove deduction |
| PUT | `/api/tax/profile` | Update preferred regime for FY |

### Passive Income
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/passive-income?fiscalYear=2025-26` | List with FY filter |
| GET | `/api/passive-income/summary?fiscalYear=2025-26` | Totals by type |
| POST | `/api/passive-income` | Create entry |
| PUT | `/api/passive-income/:id` | Update entry |
| DELETE | `/api/passive-income/:id` | Soft delete |
```

- [ ] **Step 2: Add Phase 3 models to the Database Schema section**

```markdown
### Phase 3 Models (Tax / Insurance / Passive Income)

- **InsurancePolicy** — Policies linked to familyMember. BigInt amounts in paise. `daysUntilRenewal` and `renewalSoon` computed at query time.
- **TaxProfile** — One per user. Stores preferred regime and current fiscal year.
- **TaxDeduction** — Manual deduction entries per user+fiscalYear. Auto-derived items (EPF, PPF, ELSS, home loan principal, insurance premiums) are computed live in `getTaxSummary`.
- **PassiveIncome** — Individual dividend/interest entries. `date` field used for fiscal year filtering (Apr 1 – Mar 31).
```

- [ ] **Step 3: Add new client pages to the folder structure section**

Add under client pages:
```markdown
- `client/src/pages/finance/InsurancePage.tsx` — Insurance Manager
- `client/src/pages/finance/TaxPlannerPage.tsx` — Tax Planner (80C + regime comparison + advance tax)
- `client/src/pages/finance/PassiveIncomePage.tsx` — Dividend & Interest Income Tracker
```

- [ ] **Step 4: Run quality checks**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm test
```

Expected: All tests pass.

```bash
pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: update architecture.md for Phase 3 (insurance, tax, passive income)"
```

---

## Self-Review Against Spec

**Spec Coverage Check:**

| Spec Requirement | Covered |
|-----------------|---------|
| InsurancePolicy model (all fields) | Task 1 |
| TaxProfile, TaxDeduction, PassiveIncome models | Task 1 |
| User/FamilyMember relations | Task 1 |
| Shared types + label maps | Task 2 |
| `GET /api/insurance` with `daysUntilRenewal` + `renewalSoon` | Task 3 |
| Insurance CRUD | Task 3 |
| Passive Income CRUD + summary | Task 4 |
| `GET /api/tax/summary` with full structure | Task 5 |
| 80C auto-derived (EPF, PPF, ELSS, life insurance, home loan) | Task 5 |
| Manual deductions CRUD | Tasks 5–6 |
| Tax slab computation (old + new regime, FY 2025-26) | Task 5 |
| Rebate 87A | Task 5 |
| Advance tax (4 installments, required if liability > ₹10k) | Task 5 |
| Form 15G/H FD TDS risk | Task 5 |
| Insurance page with renewal badges | Task 10 |
| Passive Income page with FY filter + summary | Task 11 |
| Tax Planner — 80C progress bar | Task 12 |
| Tax Planner — regime comparison | Task 12 |
| Tax Planner — advance tax timeline | Task 12 |
| Tax Planner — Form 15G/H section | Task 12 |
| Client routes + sidebar | Task 13 |
| Documentation | Task 14 |

**Placeholder scan:** No TBD, TODO, or "implement later" strings. All code is complete.

**Type consistency:** `InsurancePolicyResponse`, `TaxSummaryResponse`, `PassiveIncomeResponse` defined in Task 2 and used consistently in Tasks 3–12. `ManualDeductionSection` enum values match across service, controller, and client.
