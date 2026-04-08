# Phase 1 — Income, Expenses, Personal Lending & Net Worth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add income tracking, expense tracking, personal lending/borrowing, and an enhanced net worth page to the FinDiary app.

**Architecture:** Four independent CRUD modules (income, expenses, lending + repayments, net worth aggregation) following the existing Controller → Service → Prisma pattern. Each gets its own route file registered in `server/src/app.ts`. Four new client pages under `/income`, `/expenses`, `/lending`, `/net-worth` follow the BankAccountsPage modal pattern.

**Tech Stack:** Prisma (PostgreSQL), Express + Zod, React 19 + Tailwind, Vitest + supertest, TypeScript strict mode.

**Spec:** `docs/superpowers/specs/2026-04-08-phase1-income-expenses-lending.md`

---

## File Map

| File | Action |
|------|--------|
| `shared/src/utils/fiscalYear.ts` | Create — fiscal year utilities |
| `shared/src/types/finance.ts` | Modify — add 8 new types + label constants |
| `shared/src/index.ts` | Modify — export fiscal year utils |
| `server/prisma/schema.prisma` | Modify — 4 enums + 4 models + User/FamilyMember relations |
| `server/prisma/migrations/…` | Created by `prisma migrate dev` |
| `server/src/services/income.ts` | Create |
| `server/src/controllers/income.ts` | Create |
| `server/src/routes/income.ts` | Create |
| `server/src/services/expenses.ts` | Create |
| `server/src/controllers/expenses.ts` | Create |
| `server/src/routes/expenses.ts` | Create |
| `server/src/services/lending.ts` | Create |
| `server/src/controllers/lending.ts` | Create |
| `server/src/routes/lending.ts` | Create |
| `server/src/services/dashboard.ts` | Modify — enhance net worth calculation |
| `server/src/app.ts` | Modify — register 3 new routers |
| `server/src/__tests__/income.test.ts` | Create |
| `server/src/__tests__/expenses.test.ts` | Create |
| `server/src/__tests__/lending.test.ts` | Create |
| `client/src/pages/finance/IncomePage.tsx` | Create |
| `client/src/pages/finance/ExpensesPage.tsx` | Create |
| `client/src/pages/finance/LendingPage.tsx` | Create |
| `client/src/pages/finance/NetWorthPage.tsx` | Create |
| `client/src/App.tsx` | Modify — add 4 routes |
| `client/src/components/layout/Sidebar.tsx` | Modify — add 4 nav items |
| `docs/architecture.md` | Modify — update schema + API sections |

---

## Task 1: Shared fiscal year utilities + new types

**Files:**
- Create: `shared/src/utils/fiscalYear.ts`
- Modify: `shared/src/types/finance.ts`
- Modify: `shared/src/index.ts`
- Test: `shared/src/__tests__/fiscalYear.test.ts`

- [ ] **Step 1: Write failing tests for fiscal year utilities**

Create `shared/src/__tests__/fiscalYear.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toFiscalYear, currentFiscalYear } from "../utils/fiscalYear";

describe("toFiscalYear", () => {
  it("April–December belong to the year that starts in April", () => {
    expect(toFiscalYear(4, 2025)).toBe("2025-26");
    expect(toFiscalYear(12, 2025)).toBe("2025-26");
  });
  it("January–March belong to the previous FY start", () => {
    expect(toFiscalYear(1, 2026)).toBe("2025-26");
    expect(toFiscalYear(3, 2026)).toBe("2025-26");
  });
  it("April is the first month of a new FY", () => {
    expect(toFiscalYear(4, 2026)).toBe("2026-27");
  });
});

describe("currentFiscalYear", () => {
  it("returns a string matching YYYY-YY pattern", () => {
    expect(currentFiscalYear()).toMatch(/^\d{4}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd shared && pnpm test
```
Expected: FAIL — "Cannot find module '../utils/fiscalYear'"

- [ ] **Step 3: Create fiscal year utilities**

Create `shared/src/utils/fiscalYear.ts`:

```ts
export function toFiscalYear(month: number, year: number): string {
  const fyStartYear = month <= 3 ? year - 1 : year;
  return `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
}

export function currentFiscalYear(): string {
  const now = new Date();
  return toFiscalYear(now.getMonth() + 1, now.getFullYear());
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd shared && pnpm test
```
Expected: all fiscal year tests PASS

- [ ] **Step 5: Export from shared index**

In `shared/src/index.ts`, add:
```ts
export * from "./utils/fiscalYear";
```

- [ ] **Step 6: Add new types to `shared/src/types/finance.ts`**

Append to the end of the file (before the `INDIAN_BANKS` export):

```ts
// ── Phase 1 types ──────────────────────────────────────────────────────────

export type IncomeSource = 'salary' | 'business' | 'rental' | 'freelance' | 'agricultural' | 'pension' | 'other'
export type ExpenseCategory = 'groceries' | 'vegetables_fruits' | 'fuel' | 'transport' | 'school_fees' | 'medical' | 'utilities' | 'internet_mobile' | 'religious' | 'eating_out' | 'clothing' | 'rent' | 'household' | 'other'
export type LendingDirection = 'lent' | 'borrowed'
export type LendingStatus = 'outstanding' | 'partially_repaid' | 'settled'

export interface IncomeResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  source: IncomeSource
  amount: string          // BigInt → string (paise)
  month: number
  year: number
  fiscalYear: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  category: ExpenseCategory
  amount: string          // paise
  date: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface LendingRepaymentResponse {
  id: string
  amount: string          // paise
  date: string
  notes: string | null
  createdAt: string
}

export interface PersonalLendingResponse {
  id: string
  direction: LendingDirection
  personName: string
  personPhone: string | null
  principalAmount: string   // paise
  outstandingAmount: string // paise — computed: principal - sum(repayments)
  date: string
  purpose: string | null
  expectedRepaymentDate: string | null
  status: LendingStatus
  notes: string | null
  repayments: LendingRepaymentResponse[]
  createdAt: string
  updatedAt: string
}

export interface NetWorthResponse {
  assets: {
    bankAndFD: number
    investments: number    // 0 until Phase 2
    gold: number           // 0 until Phase 2
    properties: number     // 0 until Phase 2
    lentToOthers: number
  }
  liabilities: {
    loans: number
    creditCards: number
    borrowedFromOthers: number
  }
  netWorth: number
  monthlySummary: {
    month: number
    year: number
    income: number
    expenses: number
    savingsRate: number   // (income - expenses) / income * 100, or 0 if income = 0
  }
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: 'Groceries & Kirana',
  vegetables_fruits: 'Vegetables & Fruits',
  fuel: 'Fuel',
  transport: 'Auto / Cab / Bus',
  school_fees: 'School & Tuition',
  medical: 'Medical & Medicines',
  utilities: 'Electricity / Gas / Water',
  internet_mobile: 'Internet & Mobile',
  religious: 'Temple & Donations',
  eating_out: 'Eating Out / Delivery',
  clothing: 'Clothing',
  rent: 'Rent',
  household: 'Household & Repairs',
  other: 'Other',
}

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary',
  business: 'Business / Self-employment',
  rental: 'Rental Income',
  freelance: 'Freelance / Consulting',
  agricultural: 'Agricultural Income',
  pension: 'Pension',
  other: 'Other',
}
```

- [ ] **Step 7: Run shared tests to confirm nothing broke**

```bash
cd shared && pnpm test
```
Expected: all 31+ tests PASS

- [ ] **Step 8: Commit**

```bash
git add shared/src/utils/fiscalYear.ts shared/src/__tests__/fiscalYear.test.ts shared/src/types/finance.ts shared/src/index.ts
git commit -m "feat: add fiscal year utils and Phase 1 shared types"
```

---

## Task 2: Prisma schema — add Income, Expense, PersonalLending, LendingRepayment

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add enums before the User model**

Open `server/prisma/schema.prisma`. After the existing enums (after `ReminderFrequency`, `FDStatus` etc.), add:

```prisma
enum IncomeSource {
  salary
  business
  rental
  freelance
  agricultural
  pension
  other
}

enum ExpenseCategory {
  groceries
  vegetables_fruits
  fuel
  transport
  school_fees
  medical
  utilities
  internet_mobile
  religious
  eating_out
  clothing
  rent
  household
  other
}

enum LendingDirection {
  lent
  borrowed
}

enum LendingStatus {
  outstanding
  partially_repaid
  settled
}
```

- [ ] **Step 2: Add new models after the Reminder model**

```prisma
model Income {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  source         IncomeSource
  amount         BigInt
  month          Int
  year           Int
  fiscalYear     String
  description    String?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([userId, familyMemberId, source, month, year])
  @@index([userId])
  @@index([userId, fiscalYear])
}

model Expense {
  id             String          @id @default(cuid())
  userId         String
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember    @relation(fields: [familyMemberId], references: [id])
  category       ExpenseCategory
  amount         BigInt
  date           DateTime
  description    String?
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([userId])
  @@index([userId, date])
}

model PersonalLending {
  id                    String           @id @default(cuid())
  userId                String
  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  direction             LendingDirection
  personName            String
  personPhone           String?
  principalAmount       BigInt
  date                  DateTime
  purpose               String?
  expectedRepaymentDate DateTime?
  status                LendingStatus    @default(outstanding)
  notes                 String?
  isActive              Boolean          @default(true)
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  repayments LendingRepayment[]

  @@index([userId])
  @@index([userId, status])
}

model LendingRepayment {
  id        String          @id @default(cuid())
  lendingId String
  lending   PersonalLending @relation(fields: [lendingId], references: [id], onDelete: Cascade)
  amount    BigInt
  date      DateTime
  notes     String?
  createdAt DateTime        @default(now())

  @@index([lendingId])
}
```

- [ ] **Step 3: Extend User model relations**

In the `User` model, after the `fixedDeposits FixedDeposit[]` line, add:

```prisma
  incomes          Income[]
  expenses         Expense[]
  personalLendings PersonalLending[]
```

- [ ] **Step 4: Extend FamilyMember model relations**

In the `FamilyMember` model, after the `loans Loan[]` line, add:

```prisma
  incomes  Income[]
  expenses Expense[]
```

- [ ] **Step 5: Run migration**

```bash
cd server && npx prisma migrate dev --name add_income_expenses_lending
```
Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 6: Verify Prisma client generated correctly**

```bash
cd server && npx prisma generate
node -e "const p = require('./node_modules/.prisma/client'); console.log(typeof p.PrismaClient)"
```
Expected: `function`

- [ ] **Step 7: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Income, Expense, PersonalLending, LendingRepayment to Prisma schema"
```

---

## Task 3: Income service + controller + routes

**Files:**
- Create: `server/src/services/income.ts`
- Create: `server/src/controllers/income.ts`
- Create: `server/src/routes/income.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create income service**

Create `server/src/services/income.ts`:

```ts
import prisma from "../config/prisma";
import { toFiscalYear } from "@diary/shared";

export async function listIncome(
  userId: string,
  fiscalYear?: string,
  familyMemberId?: string
) {
  return prisma.income.findMany({
    where: {
      userId,
      isActive: true,
      ...(fiscalYear && { fiscalYear }),
      ...(familyMemberId && { familyMemberId }),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getIncomeSummary(userId: string, fiscalYear: string) {
  const entries = await prisma.income.findMany({
    where: { userId, fiscalYear, isActive: true },
    include: { familyMember: { select: { name: true } } },
  });
  const totalPaise = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const bySource: Record<string, number> = {};
  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] ?? 0) + Number(e.amount);
  }
  return { fiscalYear, totalPaise, bySource, entries };
}

export async function createIncome(
  userId: string,
  data: {
    familyMemberId: string;
    source: string;
    amount: number;       // rupees
    month: number;
    year: number;
    description?: string;
  }
) {
  const fiscalYear = toFiscalYear(data.month, data.year);
  return prisma.income.upsert({
    where: {
      userId_familyMemberId_source_month_year: {
        userId,
        familyMemberId: data.familyMemberId,
        source: data.source as any,
        month: data.month,
        year: data.year,
      },
    },
    update: {
      amount: BigInt(Math.round(data.amount * 100)),
      description: data.description ?? null,
      fiscalYear,
      isActive: true,
    },
    create: {
      userId,
      familyMemberId: data.familyMemberId,
      source: data.source as any,
      amount: BigInt(Math.round(data.amount * 100)),
      month: data.month,
      year: data.year,
      fiscalYear,
      description: data.description ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateIncome(
  id: string,
  userId: string,
  data: { amount?: number; description?: string }
) {
  return prisma.income.update({
    where: { id, userId },
    data: {
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteIncome(id: string, userId: string) {
  return prisma.income.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
```

- [ ] **Step 2: Create income controller**

Create `server/src/controllers/income.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as incomeService from "../services/income";

const INCOME_SOURCES = ["salary","business","rental","freelance","agricultural","pension","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  source: z.enum(INCOME_SOURCES),
  amount: z.number().min(0),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  description: z.string().max(200).optional(),
});

const updateSchema = z.object({
  amount: z.number().min(0).optional(),
  description: z.string().max(200).optional(),
});

export async function list(req: Request, res: Response) {
  const userId = req.user!.id;
  const { fiscalYear, familyMemberId } = req.query as Record<string, string | undefined>;
  const data = await incomeService.listIncome(userId, fiscalYear, familyMemberId);
  res.json({ success: true, data });
}

export async function summary(req: Request, res: Response) {
  const userId = req.user!.id;
  const { fiscalYear } = req.query as { fiscalYear?: string };
  if (!fiscalYear) return res.status(400).json({ success: false, error: "fiscalYear is required" });
  const data = await incomeService.getIncomeSummary(userId, fiscalYear);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const userId = req.user!.id;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await incomeService.createIncome(userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.id;
  const { id } = req.params;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await incomeService.updateIncome(id, userId, parsed.data);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const userId = req.user!.id;
  await incomeService.deleteIncome(req.params.id, userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create income routes**

Create `server/src/routes/income.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as ctrl from "../controllers/income";

const router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
```

- [ ] **Step 4: Register router in app.ts**

In `server/src/app.ts`, add after the existing route imports:

```ts
import incomeRouter from "./routes/income";
```

And after the existing `app.use("/api/fixed-deposits", ...)` line:

```ts
app.use("/api/income", incomeRouter);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/income.ts server/src/controllers/income.ts server/src/routes/income.ts server/src/app.ts
git commit -m "feat: add income service, controller, and routes"
```

---

## Task 4: Expense service + controller + routes

**Files:**
- Create: `server/src/services/expenses.ts`
- Create: `server/src/controllers/expenses.ts`
- Create: `server/src/routes/expenses.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create expense service**

Create `server/src/services/expenses.ts`:

```ts
import prisma from "../config/prisma";

export async function listExpenses(
  userId: string,
  month?: number,
  year?: number,
  category?: string
) {
  const start = month && year ? new Date(year, month - 1, 1) : undefined;
  const end = month && year ? new Date(year, month, 0, 23, 59, 59) : undefined;
  return prisma.expense.findMany({
    where: {
      userId,
      isActive: true,
      ...(start && end && { date: { gte: start, lte: end } }),
      ...(category && { category: category as any }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { date: "desc" },
  });
}

export async function getExpenseSummary(userId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const expenses = await prisma.expense.findMany({
    where: { userId, isActive: true, date: { gte: start, lte: end } },
  });
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const e of expenses) {
    const amt = Number(e.amount);
    byCategory[e.category] = (byCategory[e.category] ?? 0) + amt;
    total += amt;
  }
  return { month, year, totalPaise: total, byCategory };
}

export async function createExpense(
  userId: string,
  data: {
    familyMemberId: string;
    category: string;
    amount: number;       // rupees
    date: string;
    description?: string;
  }
) {
  return prisma.expense.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      category: data.category as any,
      amount: BigInt(Math.round(data.amount * 100)),
      date: new Date(data.date),
      description: data.description ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateExpense(
  id: string,
  userId: string,
  data: { category?: string; amount?: number; date?: string; description?: string }
) {
  return prisma.expense.update({
    where: { id, userId },
    data: {
      ...(data.category && { category: data.category as any }),
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.description !== undefined && { description: data.description }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteExpense(id: string, userId: string) {
  return prisma.expense.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
```

- [ ] **Step 2: Create expense controller**

Create `server/src/controllers/expenses.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as expenseService from "../services/expenses";

const EXPENSE_CATEGORIES = ["groceries","vegetables_fruits","fuel","transport","school_fees","medical","utilities","internet_mobile","religious","eating_out","clothing","rent","household","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().min(0),
  date: z.string().datetime(),
  description: z.string().max(200).optional(),
});

const updateSchema = createSchema.partial().omit({ familyMemberId: true });

export async function list(req: Request, res: Response) {
  const userId = req.user!.id;
  const { month, year, category } = req.query as Record<string, string | undefined>;
  const data = await expenseService.listExpenses(
    userId,
    month ? parseInt(month) : undefined,
    year ? parseInt(year) : undefined,
    category
  );
  res.json({ success: true, data });
}

export async function summary(req: Request, res: Response) {
  const userId = req.user!.id;
  const { month, year } = req.query as Record<string, string>;
  if (!month || !year) return res.status(400).json({ success: false, error: "month and year required" });
  const data = await expenseService.getExpenseSummary(userId, parseInt(month), parseInt(year));
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const userId = req.user!.id;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await expenseService.createExpense(userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.id;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await expenseService.updateExpense(req.params.id, userId, parsed.data);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  const userId = req.user!.id;
  await expenseService.deleteExpense(req.params.id, userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create expense routes**

Create `server/src/routes/expenses.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as ctrl from "../controllers/expenses";

const router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
```

- [ ] **Step 4: Register router in app.ts**

Add after income router registration:
```ts
import expensesRouter from "./routes/expenses";
// ...
app.use("/api/expenses", expensesRouter);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/expenses.ts server/src/controllers/expenses.ts server/src/routes/expenses.ts server/src/app.ts
git commit -m "feat: add expenses service, controller, and routes"
```

---

## Task 5: Personal Lending service + controller + routes

**Files:**
- Create: `server/src/services/lending.ts`
- Create: `server/src/controllers/lending.ts`
- Create: `server/src/routes/lending.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create lending service**

Create `server/src/services/lending.ts`:

```ts
import prisma from "../config/prisma";

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
```

- [ ] **Step 2: Create lending controller**

Create `server/src/controllers/lending.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as lendingService from "../services/lending";

const createSchema = z.object({
  direction: z.enum(["lent", "borrowed"]),
  personName: z.string().min(1).max(100),
  personPhone: z.string().regex(/^\d{10}$/).optional(),
  principalAmount: z.number().min(1),
  date: z.string().datetime(),
  purpose: z.string().max(200).optional(),
  expectedRepaymentDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const repaymentSchema = z.object({
  amount: z.number().min(1),
  date: z.string().datetime(),
  notes: z.string().max(200).optional(),
});

export async function list(req: Request, res: Response) {
  const userId = req.user!.id;
  const { direction, status } = req.query as Record<string, string | undefined>;
  const data = await lendingService.listLending(userId, direction, status);
  res.json({ success: true, data });
}

export async function create(req: Request, res: Response) {
  const userId = req.user!.id;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await lendingService.createLending(userId, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function update(req: Request, res: Response) {
  const userId = req.user!.id;
  const parsed = createSchema.partial().omit({ direction: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await lendingService.updateLending(req.params.id, userId, parsed.data);
  res.json({ success: true, data });
}

export async function remove(req: Request, res: Response) {
  await lendingService.deleteLending(req.params.id, req.user!.id);
  res.json({ success: true });
}

export async function addRepayment(req: Request, res: Response) {
  const parsed = repaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  const data = await lendingService.addRepayment(req.params.id, req.user!.id, parsed.data);
  res.status(201).json({ success: true, data });
}

export async function removeRepayment(req: Request, res: Response) {
  await lendingService.deleteRepayment(req.params.id, req.params.repaymentId, req.user!.id);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create lending routes**

Create `server/src/routes/lending.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as ctrl from "../controllers/lending";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/repayments", ctrl.addRepayment);
router.delete("/:id/repayments/:repaymentId", ctrl.removeRepayment);

export default router;
```

- [ ] **Step 4: Register in app.ts**

```ts
import lendingRouter from "./routes/lending";
// ...
app.use("/api/lending", lendingRouter);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/lending.ts server/src/controllers/lending.ts server/src/routes/lending.ts server/src/app.ts
git commit -m "feat: add personal lending service, controller, and routes"
```

---

## Task 6: Enhance dashboard net worth

**Files:**
- Modify: `server/src/services/dashboard.ts`

- [ ] **Step 1: Read the current dashboard service to understand its structure**

Run: `cat server/src/services/dashboard.ts`

- [ ] **Step 2: Add net worth aggregation function**

Add this function to `server/src/services/dashboard.ts`:

```ts
export async function getNetWorth(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [bankAccounts, loans, creditCards, lendings, incomes, expenses] = await Promise.all([
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
  ]);

  // Assets
  const bankAndFD = bankAccounts.reduce((s, a) => {
    const fdTotal = a.fixedDeposits.reduce((fs, fd) => fs + Number(fd.principalAmount), 0);
    return s + Number(a.balance) + fdTotal;
  }, 0);

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

  const totalAssets = bankAndFD + lentToOthers;
  const totalLiabilities = loanOutstanding + creditCardDues + borrowedFromOthers;

  // Monthly P&L
  const monthlyIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;

  return {
    assets: { bankAndFD, investments: 0, gold: 0, properties: 0, lentToOthers },
    liabilities: { loans: loanOutstanding, creditCards: creditCardDues, borrowedFromOthers },
    netWorth: totalAssets - totalLiabilities,
    monthlySummary: { month, year, income: monthlyIncome, expenses: monthlyExpenses, savingsRate },
  };
}
```

- [ ] **Step 3: Add net worth endpoint to dashboard controller**

In `server/src/controllers/dashboard.ts`, add:

```ts
export async function netWorth(req: Request, res: Response) {
  const data = await dashboardService.getNetWorth(req.user!.id);
  res.json({ success: true, data });
}
```

- [ ] **Step 4: Register route in dashboard routes**

In `server/src/routes/dashboard.ts`, add:

```ts
router.get("/net-worth", ctrl.netWorth);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/dashboard.ts server/src/controllers/dashboard.ts server/src/routes/dashboard.ts
git commit -m "feat: add net worth aggregation to dashboard"
```

---

## Task 7: Server integration tests

**Files:**
- Create: `server/src/__tests__/income.test.ts`
- Create: `server/src/__tests__/expenses.test.ts`
- Create: `server/src/__tests__/lending.test.ts`

- [ ] **Step 1: Create income tests**

Create `server/src/__tests__/income.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../config/prisma";

const EMAIL = "income-test@diary.app";
const PASSWORD = "Test1234!";
let token = "";
let memberId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Test", email: EMAIL, password: PASSWORD });
  const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  token = res.headers["set-cookie"]?.find((c: string) => c.startsWith("access_token"))?.split(";")[0].split("=")[1] ?? "";
  const mRes = await request(app).post("/api/family-members").set("Cookie", `access_token=${token}`).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Income API", () => {
  it("POST /api/income creates an income entry", async () => {
    const res = await request(app)
      .post("/api/income")
      .set("Cookie", `access_token=${token}`)
      .send({ familyMemberId: memberId, source: "salary", amount: 50000, month: 4, year: 2025 });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe("salary");
    expect(res.body.data.fiscalYear).toBe("2025-26");
  });

  it("GET /api/income lists entries", async () => {
    const res = await request(app).get("/api/income").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/income/summary returns totals by source", async () => {
    const res = await request(app).get("/api/income/summary?fiscalYear=2025-26").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bySource.salary).toBeGreaterThan(0);
  });

  it("POST /api/income upserts duplicate month+source", async () => {
    await request(app).post("/api/income").set("Cookie", `access_token=${token}`)
      .send({ familyMemberId: memberId, source: "salary", amount: 55000, month: 4, year: 2025 });
    const res = await request(app).get("/api/income?fiscalYear=2025-26").set("Cookie", `access_token=${token}`);
    const salaryEntries = res.body.data.filter((e: any) => e.source === "salary" && e.month === 4 && e.year === 2025);
    expect(salaryEntries.length).toBe(1);
    expect(Number(salaryEntries[0].amount)).toBe(55000 * 100);
  });
});
```

- [ ] **Step 2: Create expense tests**

Create `server/src/__tests__/expenses.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../config/prisma";

const EMAIL = "expense-test@diary.app";
const PASSWORD = "Test1234!";
let token = "";
let memberId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Test", email: EMAIL, password: PASSWORD });
  const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  token = res.headers["set-cookie"]?.find((c: string) => c.startsWith("access_token"))?.split(";")[0].split("=")[1] ?? "";
  const mRes = await request(app).post("/api/family-members").set("Cookie", `access_token=${token}`).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Expenses API", () => {
  it("POST /api/expenses creates an expense", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Cookie", `access_token=${token}`)
      .send({ familyMemberId: memberId, category: "groceries", amount: 1500, date: "2026-03-15T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe("groceries");
    expect(Number(res.body.data.amount)).toBe(150000);
  });

  it("GET /api/expenses?month=3&year=2026 filters by month", async () => {
    const res = await request(app).get("/api/expenses?month=3&year=2026").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/expenses/summary returns category totals", async () => {
    const res = await request(app).get("/api/expenses/summary?month=3&year=2026").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.byCategory.groceries).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Create lending tests**

Create `server/src/__tests__/lending.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../config/prisma";

const EMAIL = "lending-test@diary.app";
const PASSWORD = "Test1234!";
let token = "";
let lendingId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Test", email: EMAIL, password: PASSWORD });
  const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  token = res.headers["set-cookie"]?.find((c: string) => c.startsWith("access_token"))?.split(";")[0].split("=")[1] ?? "";
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Personal Lending API", () => {
  it("POST /api/lending creates a lending record", async () => {
    const res = await request(app)
      .post("/api/lending")
      .set("Cookie", `access_token=${token}`)
      .send({ direction: "lent", personName: "Ramesh", principalAmount: 10000, date: "2026-01-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("outstanding");
    lendingId = res.body.data.id;
  });

  it("POST /api/lending/:id/repayments records a repayment", async () => {
    const res = await request(app)
      .post(`/api/lending/${lendingId}/repayments`)
      .set("Cookie", `access_token=${token}`)
      .send({ amount: 5000, date: "2026-02-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.amount)).toBe(500000);
  });

  it("GET /api/lending returns partially_repaid status after partial repayment", async () => {
    const res = await request(app).get("/api/lending").set("Cookie", `access_token=${token}`);
    const record = res.body.data.find((r: any) => r.id === lendingId);
    expect(record.status).toBe("partially_repaid");
    expect(Number(record.outstandingAmount)).toBe(500000);
  });

  it("Full repayment marks lending as settled", async () => {
    await request(app).post(`/api/lending/${lendingId}/repayments`)
      .set("Cookie", `access_token=${token}`)
      .send({ amount: 5000, date: "2026-03-01T00:00:00.000Z" });
    const res = await request(app).get("/api/lending").set("Cookie", `access_token=${token}`);
    const record = res.body.data.find((r: any) => r.id === lendingId);
    expect(record.status).toBe("settled");
  });
});
```

- [ ] **Step 4: Run all server tests**

```bash
cd server && pnpm test
```
Expected: income, expense, lending tests run (may skip if DB not available — that is acceptable in CI).

- [ ] **Step 5: Commit**

```bash
git add server/src/__tests__/income.test.ts server/src/__tests__/expenses.test.ts server/src/__tests__/lending.test.ts
git commit -m "test: add integration tests for income, expenses, and lending APIs"
```

---

## Task 8: Client — Income page

**Files:**
- Create: `client/src/pages/finance/IncomePage.tsx`

- [ ] **Step 1: Create IncomePage**

Create `client/src/pages/finance/IncomePage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, FamilyMemberResponse, IncomeResponse } from "@diary/shared";
import { INCOME_SOURCE_LABELS, currentFiscalYear } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

const INCOME_SOURCES = Object.keys(INCOME_SOURCE_LABELS) as Array<keyof typeof INCOME_SOURCE_LABELS>;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface FormState {
  familyMemberId: string; source: string
  amount: string; month: string; year: string; description: string
}

const defaultForm: FormState = {
  familyMemberId: "", source: "salary",
  amount: "", month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()), description: "",
};

function IncomePage() {
  const [entries, setEntries] = useState<IncomeResponse[]>([]);
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [fiscalYear]);

  async function fetchData() {
    setLoading(true);
    try {
      const [incRes, memRes] = await Promise.all([
        api.get<ApiResponse<IncomeResponse[]>>(`/income?fiscalYear=${fiscalYear}`),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setEntries(incRes.data ?? []);
      setMembers(memRes.data ?? []);
    } catch { toast.error("Failed to load income"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid amount"); return; }
    if (!form.familyMemberId) { toast.error("Select a family member"); return; }
    setSubmitting(true);
    try {
      const body = {
        familyMemberId: form.familyMemberId, source: form.source,
        amount, month: parseInt(form.month), year: parseInt(form.year),
        description: form.description || undefined,
      };
      if (editingId) {
        await api.put(`/income/${editingId}`, { amount, description: form.description || undefined });
        toast.success("Income updated");
      } else {
        await api.post("/income", body);
        toast.success("Income added");
      }
      setShowAdd(false); setEditingId(null); setForm(defaultForm);
      await fetchData();
    } catch { toast.error(editingId ? "Failed to update" : "Failed to add income"); }
    finally { setSubmitting(false); }
  }

  function startEdit(entry: IncomeResponse) {
    setEditingId(entry.id);
    setForm({
      familyMemberId: entry.familyMemberId, source: entry.source,
      amount: (Number(entry.amount) / 100).toFixed(0),
      month: String(entry.month), year: String(entry.year),
      description: entry.description ?? "",
    });
    setShowAdd(true);
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/income/${deleteTargetId}`);
      toast.success("Removed"); setDeleteTargetId(null); await fetchData();
    } catch { toast.error("Failed to remove"); }
  }

  // Group by month for display
  const byMonth = entries.reduce<Record<string, IncomeResponse[]>>((acc, e) => {
    const key = `${MONTHS[e.month - 1]} ${e.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e); return acc;
  }, {});

  const totalPaise = entries.reduce((s, e) => s + Number(e.amount), 0);

  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Income</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">FY {fiscalYear} · Total: {formatINR(totalPaise)}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className={inputCls + " w-32"}>
            {["2023-24","2024-25","2025-26","2026-27"].map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
          <ShimmerButton onClick={() => { setEditingId(null); setForm(defaultForm); setShowAdd(true); }}>+ Add Income</ShimmerButton>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); setForm(defaultForm); }} title={editingId ? "Edit Income" : "Add Income"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Family Member <span className="text-red-400">*</span></label>
            <select value={form.familyMemberId} onChange={(e) => setForm((f) => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source</label>
            <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={inputCls} disabled={!!editingId}>
              {INCOME_SOURCES.map((s) => <option key={s} value={s}>{INCOME_SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Month</label>
            <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} className={inputCls} disabled={!!editingId}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
            <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className={inputCls} disabled={!!editingId} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setForm(defaultForm); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add Income"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Income" description="Remove this income entry? This cannot be undone.">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {entries.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No income recorded for FY {fiscalYear}</p>
          <ShimmerButton onClick={() => setShowAdd(true)}>Add Income</ShimmerButton>
        </div>
      )}

      {Object.entries(byMonth).map(([monthLabel, monthEntries]) => {
        const monthTotal = monthEntries.reduce((s, e) => s + Number(e.amount), 0);
        return (
          <div key={monthLabel} className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{monthLabel}</h2>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatINR(monthTotal)}</span>
            </div>
            {monthEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{INCOME_SOURCE_LABELS[entry.source]}</span>
                  <span className="ml-2 text-xs text-slate-400">{entry.familyMember?.name}</span>
                  {entry.description && <p className="text-xs text-slate-400 mt-0.5">{entry.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatINR(Number(entry.amount))}</span>
                  <button onClick={() => startEdit(entry)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                  <button onClick={() => setDeleteTargetId(entry.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default IncomePage;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/IncomePage.tsx
git commit -m "feat: add Income client page"
```

---

## Task 9: Client — Expenses page

**Files:**
- Create: `client/src/pages/finance/ExpensesPage.tsx`

- [ ] **Step 1: Create ExpensesPage**

Create `client/src/pages/finance/ExpensesPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, FamilyMemberResponse, ExpenseResponse } from "@diary/shared";
import { EXPENSE_CATEGORY_LABELS } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as Array<keyof typeof EXPENSE_CATEGORY_LABELS>;

interface FormState {
  familyMemberId: string; category: string
  amount: string; date: string; description: string
}

const defaultForm = (): FormState => ({
  familyMemberId: "", category: "groceries", amount: "",
  date: new Date().toISOString().slice(0, 10), description: "",
});

function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [month, year]);

  async function fetchData() {
    setLoading(true);
    try {
      const [expRes, memRes] = await Promise.all([
        api.get<ApiResponse<ExpenseResponse[]>>(`/expenses?month=${month}&year=${year}`),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setExpenses(expRes.data ?? []);
      setMembers(memRes.data ?? []);
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }

  function navigate(delta: number) {
    let m = month + delta; let y = year;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, { category: form.category, amount, date: new Date(form.date).toISOString(), description: form.description || undefined });
        toast.success("Updated");
      } else {
        await api.post("/expenses", { familyMemberId: form.familyMemberId, category: form.category, amount, date: new Date(form.date).toISOString(), description: form.description || undefined });
        toast.success("Expense added");
      }
      setShowAdd(false); setEditingId(null); setForm(defaultForm());
      await fetchData();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  function startEdit(e: ExpenseResponse) {
    setEditingId(e.id);
    setForm({ familyMemberId: e.familyMemberId, category: e.category, amount: (Number(e.amount) / 100).toFixed(0), date: e.date.slice(0, 10), description: e.description ?? "" });
    setShowAdd(true);
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try { await api.delete(`/expenses/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await fetchData(); }
    catch { toast.error("Failed"); }
  }

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const totalPaise = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">←</button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{MONTH_NAMES[month - 1]} {year}</h1>
          <button onClick={() => navigate(1)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">→</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total: {formatINR(totalPaise)}</span>
          <ShimmerButton onClick={() => { setEditingId(null); setForm(defaultForm()); setShowAdd(true); }}>+ Add Expense</ShimmerButton>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Expense" : "Add Expense"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Family Member <span className="text-red-400">*</span></label>
              <select value={form.familyMemberId} onChange={(e) => setForm((f) => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Expense" description="Remove this expense entry?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {expenses.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-2">No expenses for {MONTH_NAMES[month - 1]} {year}</p>
          <ShimmerButton onClick={() => setShowAdd(true)}>Add Expense</ShimmerButton>
        </div>
      )}

      <div className="space-y-2">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{EXPENSE_CATEGORY_LABELS[expense.category]}</span>
                <span className="text-xs text-slate-400">{expense.familyMember?.name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(expense.date)}{expense.description ? ` · ${expense.description}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatINR(Number(expense.amount))}</span>
              <button onClick={() => startEdit(expense)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
              <button onClick={() => setDeleteTargetId(expense.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExpensesPage;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/ExpensesPage.tsx
git commit -m "feat: add Expenses client page"
```

---

## Task 10: Client — Lending page

**Files:**
- Create: `client/src/pages/finance/LendingPage.tsx`

- [ ] **Step 1: Create LendingPage**

Create `client/src/pages/finance/LendingPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, PersonalLendingResponse } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

interface LendForm {
  direction: "lent" | "borrowed"; personName: string; personPhone: string
  principalAmount: string; date: string; purpose: string
  expectedRepaymentDate: string; notes: string
}
interface RepayForm { amount: string; date: string; notes: string }

const defaultLendForm = (): LendForm => ({
  direction: "lent", personName: "", personPhone: "", principalAmount: "",
  date: new Date().toISOString().slice(0, 10), purpose: "", expectedRepaymentDate: "", notes: "",
});
const defaultRepayForm = (): RepayForm => ({ amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });

const STATUS_BADGE: Record<string, string> = {
  outstanding: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  partially_repaid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  settled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function LendingPage() {
  const [records, setRecords] = useState<PersonalLendingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lent" | "borrowed">("lent");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LendForm>(defaultLendForm());
  const [submitting, setSubmitting] = useState(false);
  const [repayTargetId, setRepayTargetId] = useState<string | null>(null);
  const [repayForm, setRepayForm] = useState<RepayForm>(defaultRepayForm());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PersonalLendingResponse[]>>("/lending");
      setRecords(res.data ?? []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.principalAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      const body = {
        direction: form.direction, personName: form.personName,
        personPhone: form.personPhone || undefined, principalAmount: amount,
        date: new Date(form.date).toISOString(),
        purpose: form.purpose || undefined,
        expectedRepaymentDate: form.expectedRepaymentDate ? new Date(form.expectedRepaymentDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      if (editingId) { await api.put(`/lending/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/lending", body); toast.success("Added"); }
      setShowAdd(false); setEditingId(null); setForm(defaultLendForm());
      await fetchData();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleRepay(e: React.FormEvent) {
    e.preventDefault();
    if (!repayTargetId) return;
    const amount = parseFloat(repayForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter valid amount"); return; }
    try {
      await api.post(`/lending/${repayTargetId}/repayments`, { amount, date: new Date(repayForm.date).toISOString(), notes: repayForm.notes || undefined });
      toast.success("Repayment recorded");
      setRepayTargetId(null); setRepayForm(defaultRepayForm());
      await fetchData();
    } catch { toast.error("Failed"); }
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try { await api.delete(`/lending/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await fetchData(); }
    catch { toast.error("Failed"); }
  }

  const filtered = records.filter((r) => r.direction === activeTab && r.isActive !== false);
  const totalOutstanding = filtered.filter((r) => r.status !== "settled").reduce((s, r) => s + Number(r.outstandingAmount), 0);
  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6 space-y-4"><Skeleton className="h-8 w-40" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lending & Borrowing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Outstanding: {formatINR(totalOutstanding)}</p>
        </div>
        <ShimmerButton onClick={() => { setEditingId(null); setForm({ ...defaultLendForm(), direction: activeTab }); setShowAdd(true); }}>+ Add</ShimmerButton>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 w-fit">
        {(["lent", "borrowed"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === tab ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
            {tab === "lent" ? "Lent by me" : "I owe"}
          </button>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Record" : `Add ${form.direction === "lent" ? "Lent" : "Borrowed"}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Person Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.personName} onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))} required className={inputCls} placeholder="Ramesh Kumar" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="tel" value={form.personPhone} onChange={(e) => setForm((f) => ({ ...f, personPhone: e.target.value }))} className={inputCls} placeholder="9876543210" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={form.principalAmount} onChange={(e) => setForm((f) => ({ ...f, principalAmount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expected Repayment <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="date" value={form.expectedRepaymentDate} onChange={(e) => setForm((f) => ({ ...f, expectedRepaymentDate: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purpose <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} className={inputCls} placeholder="Medical, business, etc." />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Repayment Modal */}
      <Modal open={repayTargetId !== null} onClose={() => setRepayTargetId(null)} title="Record Repayment">
        <form onSubmit={handleRepay} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={repayForm.amount} onChange={(e) => setRepayForm((f) => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input type="date" value={repayForm.date} onChange={(e) => setRepayForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={repayForm.notes} onChange={(e) => setRepayForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setRepayTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit">Record</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Record" description="Remove this lending record?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-2">No {activeTab === "lent" ? "money lent" : "money borrowed"} recorded</p>
          <ShimmerButton onClick={() => { setForm({ ...defaultLendForm(), direction: activeTab }); setShowAdd(true); }}>Add</ShimmerButton>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((record) => {
          const isOverdue = record.status !== "settled" && record.expectedRepaymentDate && new Date(record.expectedRepaymentDate) < new Date();
          return (
            <div key={record.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{record.personName}</span>
                    {record.personPhone && <span className="text-xs text-slate-400">{record.personPhone}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[record.status]}`}>{record.status.replace("_", " ")}</span>
                    {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs mt-2">
                    <div><span className="text-slate-400 uppercase">Principal</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(Number(record.principalAmount))}</p></div>
                    <div><span className="text-slate-400 uppercase">Outstanding</span><p className={`font-semibold ${record.status === "settled" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>{formatINR(Number(record.outstandingAmount))}</p></div>
                    <div><span className="text-slate-400 uppercase">Date</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(record.date)}</p></div>
                    {record.expectedRepaymentDate && <div><span className="text-slate-400 uppercase">Expected by</span><p className={`font-semibold ${isOverdue ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>{formatDate(record.expectedRepaymentDate)}</p></div>}
                  </div>
                  {record.purpose && <p className="text-xs text-slate-400 mt-1.5">Purpose: {record.purpose}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {record.status !== "settled" && (
                    <button onClick={() => { setRepayTargetId(record.id); setRepayForm(defaultRepayForm()); }} className="text-xs px-2.5 py-1 rounded-lg bg-ocean-700 text-white hover:bg-ocean-600">Repayment</button>
                  )}
                  <button onClick={() => { setEditingId(record.id); setForm({ direction: record.direction, personName: record.personName, personPhone: record.personPhone ?? "", principalAmount: (Number(record.principalAmount) / 100).toFixed(0), date: record.date.slice(0, 10), purpose: record.purpose ?? "", expectedRepaymentDate: record.expectedRepaymentDate?.slice(0, 10) ?? "", notes: record.notes ?? "" }); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                  <button onClick={() => setDeleteTargetId(record.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LendingPage;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/LendingPage.tsx
git commit -m "feat: add Personal Lending client page"
```

---

## Task 11: Client — Net Worth page + wire up routes + sidebar

**Files:**
- Create: `client/src/pages/finance/NetWorthPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create NetWorthPage**

Create `client/src/pages/finance/NetWorthPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, NetWorthResponse } from "@diary/shared";
import { Skeleton } from "@/components/ui/skeleton";

function NetWorthPage() {
  const [data, setData] = useState<NetWorthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<NetWorthResponse>>("/dashboard/net-worth")
      .then((res) => setData(res.data ?? null))
      .catch(() => toast.error("Failed to load net worth"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6 space-y-4"><Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!data) return null;

  const rows = [
    { label: "Bank + FD", value: data.assets.bankAndFD, type: "asset" },
    { label: "Investments", value: data.assets.investments, type: "asset" },
    { label: "Gold", value: data.assets.gold, type: "asset" },
    { label: "Properties", value: data.assets.properties, type: "asset" },
    { label: "Lent to others", value: data.assets.lentToOthers, type: "asset" },
    { label: "Home / Car / Personal Loans", value: data.liabilities.loans, type: "liability" },
    { label: "Credit Card Dues", value: data.liabilities.creditCards, type: "liability" },
    { label: "Borrowed from others", value: data.liabilities.borrowedFromOthers, type: "liability" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Net Worth</h1>

      {/* Summary banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total Net Worth</p>
        <p className={`text-4xl font-bold mt-1 ${data.netWorth >= 0 ? "text-slate-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>{formatINR(data.netWorth)}</p>
        <div className="flex gap-6 mt-3">
          <div><p className="text-xs text-slate-400">Total Assets</p><p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(Object.values(data.assets).reduce((s, v) => s + v, 0))}</p></div>
          <div><p className="text-xs text-slate-400">Total Liabilities</p><p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatINR(Object.values(data.liabilities).reduce((s, v) => s + v, 0))}</p></div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${row.type === "asset" ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{row.label}</span>
              {row.value === 0 && row.type === "asset" && <span className="text-xs text-slate-400">(add in future phases)</span>}
            </div>
            <span className={`font-semibold text-sm ${row.type === "asset" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatINR(row.value)}</span>
          </div>
        ))}
      </div>

      {/* Monthly summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">This Month</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-slate-400">Income</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(data.monthlySummary.income)}</p></div>
          <div><p className="text-xs text-slate-400">Expenses</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(data.monthlySummary.expenses)}</p></div>
          <div><p className="text-xs text-slate-400">Savings Rate</p><p className={`text-lg font-bold ${data.monthlySummary.savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{data.monthlySummary.savingsRate}%</p></div>
        </div>
      </div>
    </div>
  );
}

export default NetWorthPage;
```

- [ ] **Step 2: Add routes to App.tsx**

In `client/src/App.tsx`, import and add the 4 new pages. Find the existing finance page imports and add:

```ts
import IncomePage from "@/pages/finance/IncomePage";
import ExpensesPage from "@/pages/finance/ExpensesPage";
import LendingPage from "@/pages/finance/LendingPage";
import NetWorthPage from "@/pages/finance/NetWorthPage";
```

And add routes inside the protected `SidebarLayout` route group, alongside the existing `/bank-accounts` etc. routes:

```tsx
<Route path="/income" element={<IncomePage />} />
<Route path="/expenses" element={<ExpensesPage />} />
<Route path="/lending" element={<LendingPage />} />
<Route path="/net-worth" element={<NetWorthPage />} />
```

- [ ] **Step 3: Add nav items to Sidebar.tsx**

In `client/src/components/layout/Sidebar.tsx`, import icons and add to `mainNavItems`:

```ts
import { TrendingUp, ShoppingCart, Handshake, PieChart } from "lucide-react";
```

Add to `mainNavItems` array (after Reminders, before Invites):

```ts
{ to: "/income", label: "Income", icon: TrendingUp },
{ to: "/expenses", label: "Expenses", icon: ShoppingCart },
{ to: "/lending", label: "Lending", icon: Handshake },
{ to: "/net-worth", label: "Net Worth", icon: PieChart },
```

- [ ] **Step 4: Build to verify no type errors**

```bash
pnpm --filter @diary/client build
```
Expected: `✓ built in Xs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/finance/NetWorthPage.tsx client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add Net Worth page and wire up Income, Expenses, Lending, Net Worth routes"
```

---

## Task 12: Documentation update

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Update architecture.md**

Add to the Database Schema section: Income, Expense, PersonalLending, LendingRepayment models.

Add to the API Reference section:
```
GET    /api/income                   List income entries
GET    /api/income/summary           FY income summary by source
POST   /api/income                   Create/upsert income
PUT    /api/income/:id               Update income entry
DELETE /api/income/:id               Soft delete income

GET    /api/expenses                 List expenses (filterable by month/year/category)
GET    /api/expenses/summary         Monthly category totals
POST   /api/expenses                 Create expense
PUT    /api/expenses/:id             Update
DELETE /api/expenses/:id             Soft delete

GET    /api/lending                  List lending/borrowing records
POST   /api/lending                  Create record
PUT    /api/lending/:id              Update
DELETE /api/lending/:id              Soft delete
POST   /api/lending/:id/repayments   Record a repayment
DELETE /api/lending/:id/repayments/:repaymentId  Remove repayment

GET    /api/dashboard/net-worth      Full net worth + monthly P&L
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: update architecture.md with Phase 1 schema and API"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Income CRUD with fiscal year + family member
- ✅ Expense CRUD with month/year filter and category summary
- ✅ Personal lending with repayment tracking and auto status
- ✅ Net worth aggregation with monthly P&L
- ✅ Shared types for all 4 modules
- ✅ Server tests for all 3 CRUD modules
- ✅ Client pages for all 4 modules
- ✅ Sidebar nav items + routes
- ✅ Docs updated

**Type consistency check:**
- `IncomeResponse.amount` is `string` (BigInt → serialized) throughout ✅
- `toFiscalYear` used consistently in service and tests ✅
- `outstandingAmount` in lending is computed and returned as BigInt in service, serialized to string in response ✅
