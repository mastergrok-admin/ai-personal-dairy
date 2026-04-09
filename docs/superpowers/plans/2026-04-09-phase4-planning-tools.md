# Phase 4 — Budget Planner, Financial Goals, Vehicle Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Budget Planner (monthly budget vs actual per expense category), Financial Goals (target + progress tracking), and Vehicle Tracker (details, linked loan/insurance, PUC/RC reminders, service history) to the AI Personal Diary app.

**Architecture:** Three independent backend modules follow the existing Controller → Service → Prisma pattern. The budget service joins existing `Expense` and `Income` tables for vs-actual computation — no data duplication. Vehicle holds optional loose FKs to `Loan` and `InsurancePolicy` (not Prisma `@relation`) so the service resolves them manually. Three new React pages with the same `useEffect`/`fetch` pattern as existing pages.

**Tech Stack:** Express + Prisma + Zod (server), React 19 + Tailwind (client), Vitest + supertest (tests), PostgreSQL with BigInt paise amounts.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/prisma/schema.prisma` | Modify | Add 4 enums + 5 models + User/FamilyMember relations |
| `shared/src/types/finance.ts` | Modify | Add Phase 4 types and label maps |
| `server/src/services/budget.ts` | Create | Budget CRUD + vs-actual computation from Expense/Income tables |
| `server/src/controllers/budget.ts` | Create | Zod validation + async handlers |
| `server/src/routes/budget.ts` | Create | Router with authenticate middleware |
| `server/src/services/goals.ts` | Create | Goal CRUD + progressPercent / monthsRemaining computation |
| `server/src/controllers/goals.ts` | Create | Zod validation + async handlers |
| `server/src/routes/goals.ts` | Create | Router with authenticate middleware |
| `server/src/services/vehicles.ts` | Create | Vehicle CRUD + pucExpiringSoon / rcExpiringSoon + linked entity resolution |
| `server/src/controllers/vehicles.ts` | Create | Zod validation + async handlers for vehicle + service records |
| `server/src/routes/vehicles.ts` | Create | Router with authenticate middleware |
| `server/src/app.ts` | Modify | Register 3 new routers |
| `server/src/__tests__/budget.test.ts` | Create | Integration tests for budget + vs-actual endpoints |
| `server/src/__tests__/goals.test.ts` | Create | Integration tests for goals endpoints |
| `server/src/__tests__/vehicles.test.ts` | Create | Integration tests for vehicles + service history |
| `client/src/pages/finance/BudgetPage.tsx` | Create | Month navigator, category rows with progress bars, copy-from-prev-month |
| `client/src/pages/finance/GoalsPage.tsx` | Create | Goal cards with circular progress, add/edit modal |
| `client/src/pages/finance/VehiclesPage.tsx` | Create | Vehicle cards with PUC/RC badges, linked tags, service history |
| `client/src/App.tsx` | Modify | Add 3 new routes |
| `client/src/components/layout/Sidebar.tsx` | Modify | Add 3 nav items with icons |
| `docs/architecture.md` | Modify | Document new API endpoints and DB models |

---

## Task 1: Prisma Schema — Add Enums and Models

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add 4 enums after the `PassiveIncomeType` enum (or after all existing Phase 3 enums)**

Open `server/prisma/schema.prisma` and append after the last enum block:

```prisma
enum GoalCategory {
  home_purchase
  vehicle
  education
  wedding
  retirement
  emergency_fund
  travel
  medical
  other
}

enum VehicleType {
  car
  two_wheeler
  commercial
  tractor
  other
}

enum FuelType {
  petrol
  diesel
  cng
  electric
  hybrid
  other
}
```

- [ ] **Step 2: Add 5 models after the last Phase 3 model (`PassiveIncome`)**

```prisma
model Budget {
  id         String          @id @default(cuid())
  userId     String
  user       User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  month      Int
  year       Int
  fiscalYear String
  isActive   Boolean         @default(true)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  items BudgetItem[]

  @@unique([userId, month, year])
  @@index([userId])
}

model BudgetItem {
  id           String          @id @default(cuid())
  budgetId     String
  budget       Budget          @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category     ExpenseCategory
  budgetAmount BigInt
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@unique([budgetId, category])
}

model FinancialGoal {
  id            String       @id @default(cuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  category      GoalCategory
  targetAmount  BigInt
  targetDate    DateTime
  currentAmount BigInt       @default(0)
  notes         String?
  isAchieved    Boolean      @default(false)
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([userId])
}

model Vehicle {
  id                String      @id @default(cuid())
  userId            String
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId    String
  familyMember      FamilyMember @relation(fields: [familyMemberId], references: [id])
  vehicleType       VehicleType
  make              String
  model             String
  yearOfManufacture Int
  registrationLast4 String?
  fuelType          FuelType
  purchaseDate      DateTime?
  purchasePrice     BigInt?
  currentValue      BigInt      @default(0)
  linkedLoanId      String?
  insurancePolicyId String?
  pucExpiryDate     DateTime?
  rcRenewalDate     DateTime?
  notes             String?
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  serviceHistory VehicleService[]

  @@index([userId])
  @@index([familyMemberId])
}

model VehicleService {
  id            String   @id @default(cuid())
  vehicleId     String
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  date          DateTime
  odometer      Int?
  serviceCentre String?
  cost          BigInt
  description   String?
  createdAt     DateTime @default(now())

  @@index([vehicleId])
}
```

- [ ] **Step 3: Add relations to `User` model**

After `passiveIncomes PassiveIncome[]` (last Phase 3 relation), add:

```prisma
  budgets        Budget[]
  financialGoals FinancialGoal[]
  vehicles       Vehicle[]
```

- [ ] **Step 4: Add relation to `FamilyMember` model**

After `insurancePolicies InsurancePolicy[]` (last Phase 3 FamilyMember relation), add:

```prisma
  vehicles Vehicle[]
```

- [ ] **Step 5: Run migration**

```bash
cd server && npx prisma migrate dev --name phase4_budget_goals_vehicles
```

Expected: "Your database is now in sync with your schema."

- [ ] **Step 6: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 7: Commit**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Phase 4 Prisma models (Budget, FinancialGoal, Vehicle, VehicleService)"
```

---

## Task 2: Shared Types

**Files:**
- Modify: `shared/src/types/finance.ts`

- [ ] **Step 1: Append Phase 4 types at the end of `shared/src/types/finance.ts`**

```typescript
// ── Phase 4 — Budget, Goals, Vehicles ─────────────────────────────────────

export type GoalCategory =
  | 'home_purchase' | 'vehicle' | 'education' | 'wedding'
  | 'retirement' | 'emergency_fund' | 'travel' | 'medical' | 'other'

export type VehicleType = 'car' | 'two_wheeler' | 'commercial' | 'tractor' | 'other'

export type FuelType = 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid' | 'other'

export interface BudgetItemResponse {
  id: string
  category: ExpenseCategory
  budgetAmount: number  // paise
}

export interface BudgetResponse {
  id: string
  month: number
  year: number
  fiscalYear: string
  items: BudgetItemResponse[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BudgetVsActualResponse {
  month: number
  year: number
  totalBudget: number   // paise
  totalActual: number   // paise
  items: Array<{
    category: ExpenseCategory
    label: string
    budgeted: number    // paise
    actual: number      // paise
    variance: number    // paise (budgeted - actual; negative = over)
    status: 'under' | 'warning' | 'over'
  }>
  savingsRate: number   // percentage
}

export interface FinancialGoalResponse {
  id: string
  name: string
  category: GoalCategory
  targetAmount: number      // paise
  targetDate: string
  currentAmount: number     // paise
  progressPercent: number
  monthsRemaining: number
  requiredMonthlySaving: number  // paise
  isAchieved: boolean
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface VehicleServiceResponse {
  id: string
  date: string
  odometer: number | null
  serviceCentre: string | null
  cost: number              // paise
  description: string | null
  createdAt: string
}

export interface VehicleResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  vehicleType: VehicleType
  make: string
  model: string
  yearOfManufacture: number
  registrationLast4: string | null
  fuelType: FuelType
  purchaseDate: string | null
  purchasePrice: number | null  // paise
  currentValue: number          // paise
  linkedLoanId: string | null
  insurancePolicyId: string | null
  linkedLoan: { lenderName: string; outstandingAmount: number; emiAmount: number } | null
  linkedInsurance: { insurerName: string; renewalDate: string; renewalSoon: boolean } | null
  pucExpiryDate: string | null
  rcRenewalDate: string | null
  pucExpiringSoon: boolean
  rcExpiringSoon: boolean
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  home_purchase: 'Home Purchase',
  vehicle: 'Vehicle',
  education: 'Education',
  wedding: 'Wedding',
  retirement: 'Retirement',
  emergency_fund: 'Emergency Fund',
  travel: 'Travel',
  medical: 'Medical',
  other: 'Other',
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  two_wheeler: 'Two-Wheeler',
  commercial: 'Commercial Vehicle',
  tractor: 'Tractor',
  other: 'Other',
}

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
  other: 'Other',
}
```

- [ ] **Step 2: Build shared package**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy/shared && pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy
git add shared/src/types/finance.ts
git commit -m "feat: add Phase 4 shared types (budget, goals, vehicles)"
```

---

## Task 3: Budget Backend

**Files:**
- Create: `server/src/services/budget.ts`
- Create: `server/src/controllers/budget.ts`
- Create: `server/src/routes/budget.ts`

- [ ] **Step 1: Create `server/src/services/budget.ts`**

```typescript
import { prisma } from "../models/prisma.js";
import type { ExpenseCategory } from "@prisma/client";
import { EXPENSE_CATEGORY_LABELS } from "@ai-personal-diary/shared/types/finance.js";

function getFiscalYear(month: number, year: number): string {
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getMonthRange(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59), // last day of month
  };
}

export async function getBudget(userId: string, month: number, year: number) {
  return prisma.budget.findUnique({
    where: { userId_month_year: { userId, month, year } },
    include: { items: { orderBy: { category: "asc" } } },
  });
}

export async function createBudget(
  userId: string,
  data: {
    month: number;
    year: number;
    items: Array<{ category: ExpenseCategory; budgetAmount: number }>;
    copyFromMonth?: number;
    copyFromYear?: number;
  }
) {
  let items = data.items;

  // Copy items from a previous month if requested and no items provided
  if (items.length === 0 && data.copyFromMonth && data.copyFromYear) {
    const prev = await prisma.budget.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: data.copyFromMonth,
          year: data.copyFromYear,
        },
      },
      include: { items: true },
    });
    if (prev) {
      items = prev.items.map((i) => ({
        category: i.category,
        budgetAmount: Number(i.budgetAmount) / 100, // will be converted back below
      }));
    }
  }

  return prisma.budget.create({
    data: {
      userId,
      month: data.month,
      year: data.year,
      fiscalYear: getFiscalYear(data.month, data.year),
      items: {
        create: items.map((i) => ({
          category: i.category,
          budgetAmount: BigInt(Math.round(i.budgetAmount * 100)),
        })),
      },
    },
    include: { items: { orderBy: { category: "asc" } } },
  });
}

export async function updateBudget(
  id: string,
  userId: string,
  items: Array<{ category: ExpenseCategory; budgetAmount: number }>
) {
  // Replace all items atomically
  await prisma.budgetItem.deleteMany({ where: { budgetId: id } });
  return prisma.budget.update({
    where: { id, userId },
    data: {
      items: {
        create: items.map((i) => ({
          category: i.category,
          budgetAmount: BigInt(Math.round(i.budgetAmount * 100)),
        })),
      },
    },
    include: { items: { orderBy: { category: "asc" } } },
  });
}

export async function getBudgetVsActual(userId: string, month: number, year: number) {
  const { start, end } = getMonthRange(month, year);

  const [budget, expenses, incomes] = await Promise.all([
    prisma.budget.findUnique({
      where: { userId_month_year: { userId, month, year } },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { userId, isActive: true, date: { gte: start, lte: end } },
    }),
    prisma.income.findMany({
      where: { userId, isActive: true, month, year },
    }),
  ]);

  // Build actual map: category → total paise
  const actualMap = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    const current = actualMap.get(e.category) ?? 0;
    actualMap.set(e.category, current + Number(e.amount));
  }

  // Collect all categories (union of budget + actual)
  const budgetMap = new Map<ExpenseCategory, number>();
  for (const item of budget?.items ?? []) {
    budgetMap.set(item.category, Number(item.budgetAmount));
  }
  const allCategories = new Set<ExpenseCategory>([
    ...budgetMap.keys(),
    ...actualMap.keys(),
  ]);

  const items = Array.from(allCategories).map((category) => {
    const budgeted = budgetMap.get(category) ?? 0;
    const actual = actualMap.get(category) ?? 0;
    const variance = budgeted - actual;
    let status: "under" | "warning" | "over";
    if (budgeted === 0) {
      status = actual > 0 ? "over" : "under";
    } else {
      const ratio = actual / budgeted;
      status = ratio > 1 ? "over" : ratio >= 0.8 ? "warning" : "under";
    }
    return {
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      budgeted,
      actual,
      variance,
      status,
    };
  });

  const totalBudget = items.reduce((s, i) => s + i.budgeted, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalActual) / totalIncome) * 100 * 100) / 100
      : 0;

  return { month, year, totalBudget, totalActual, items, savingsRate };
}
```

- [ ] **Step 2: Create `server/src/controllers/budget.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/budget.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const EXPENSE_CATEGORIES = [
  "groceries","vegetables_fruits","fuel","transport","school_fees","medical",
  "utilities","internet_mobile","religious","eating_out","clothing","rent",
  "household","other",
] as const;

const monthYearQuery = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

const itemSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  budgetAmount: z.number().min(0),
});

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  items: z.array(itemSchema).default([]),
  copyFromMonth: z.number().int().min(1).max(12).optional(),
  copyFromYear: z.number().int().min(2000).max(2100).optional(),
});

const updateSchema = z.object({
  items: z.array(itemSchema),
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = monthYearQuery.parse(req.query);
  const budget = await svc.getBudget((req as AuthenticatedRequest).userId, month, year);
  if (!budget) {
    res.status(404).json({ success: false, message: "No budget set for this month" });
    return;
  }
  res.json({ success: true, data: budget });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createBudget((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { items } = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateBudget(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      items
    ),
  });
});

export const vsActual = asyncHandler(async (req: Request, res: Response) => {
  const { month, year } = monthYearQuery.parse(req.query);
  res.json({
    success: true,
    data: await svc.getBudgetVsActual((req as AuthenticatedRequest).userId, month, year),
  });
});
```

- [ ] **Step 3: Create `server/src/routes/budget.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/budget.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.get);
router.get("/vs-actual", ctrl.vsActual);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);

export { router as budgetRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/budget.ts server/src/controllers/budget.ts server/src/routes/budget.ts
git commit -m "feat: add budget service, controller, and routes"
```

---

## Task 4: Goals Backend

**Files:**
- Create: `server/src/services/goals.ts`
- Create: `server/src/controllers/goals.ts`
- Create: `server/src/routes/goals.ts`

- [ ] **Step 1: Create `server/src/services/goals.ts`**

```typescript
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
```

- [ ] **Step 2: Create `server/src/controllers/goals.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/goals.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const GOAL_CATEGORIES = [
  "home_purchase","vehicle","education","wedding","retirement",
  "emergency_fund","travel","medical","other",
] as const;

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(GOAL_CATEGORIES),
  targetAmount: z.number().min(0),
  targetDate: z.string().datetime(),
  currentAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  targetAmount: z.number().min(0).optional(),
  targetDate: z.string().datetime().optional(),
  currentAmount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  isAchieved: z.boolean().optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listGoals((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createGoal((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateGoal(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteGoal(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
```

- [ ] **Step 3: Create `server/src/routes/goals.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/goals.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as goalsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/goals.ts server/src/controllers/goals.ts server/src/routes/goals.ts
git commit -m "feat: add financial goals service, controller, and routes"
```

---

## Task 5: Vehicles Backend

**Files:**
- Create: `server/src/services/vehicles.ts`
- Create: `server/src/controllers/vehicles.ts`
- Create: `server/src/routes/vehicles.ts`

- [ ] **Step 1: Create `server/src/services/vehicles.ts`**

```typescript
import { prisma } from "../models/prisma.js";
import type { VehicleType, FuelType } from "@prisma/client";

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function resolveLinkedEntities(vehicle: any) {
  const [linkedLoan, linkedInsurance] = await Promise.all([
    vehicle.linkedLoanId
      ? prisma.loan.findUnique({ where: { id: vehicle.linkedLoanId } })
      : Promise.resolve(null),
    vehicle.insurancePolicyId
      ? prisma.insurancePolicy.findUnique({ where: { id: vehicle.insurancePolicyId } })
      : Promise.resolve(null),
  ]);

  const pucDays = daysUntil(vehicle.pucExpiryDate);
  const rcDays = daysUntil(vehicle.rcRenewalDate);

  return {
    ...vehicle,
    pucExpiringSoon: pucDays !== null && pucDays <= 30,
    rcExpiringSoon: rcDays !== null && rcDays <= 30,
    linkedLoan: linkedLoan
      ? {
          lenderName: linkedLoan.lenderName,
          outstandingAmount: Number(linkedLoan.outstandingAmount),
          emiAmount: Number(linkedLoan.emiAmount),
        }
      : null,
    linkedInsurance: linkedInsurance
      ? {
          insurerName: linkedInsurance.insurerName,
          renewalDate: linkedInsurance.renewalDate,
          renewalSoon: (daysUntil(linkedInsurance.renewalDate) ?? Infinity) <= 30,
        }
      : null,
  };
}

export async function listVehicles(userId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(vehicles.map(resolveLinkedEntities));
}

export async function createVehicle(
  userId: string,
  data: {
    familyMemberId: string;
    vehicleType: VehicleType;
    make: string;
    model: string;
    yearOfManufacture: number;
    registrationLast4?: string;
    fuelType: FuelType;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    linkedLoanId?: string;
    insurancePolicyId?: string;
    pucExpiryDate?: string;
    rcRenewalDate?: string;
    notes?: string;
  }
) {
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      vehicleType: data.vehicleType,
      make: data.make,
      model: data.model,
      yearOfManufacture: data.yearOfManufacture,
      registrationLast4: data.registrationLast4 ?? null,
      fuelType: data.fuelType,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice != null ? BigInt(Math.round(data.purchasePrice * 100)) : null,
      currentValue: data.currentValue != null ? BigInt(Math.round(data.currentValue * 100)) : 0n,
      linkedLoanId: data.linkedLoanId ?? null,
      insurancePolicyId: data.insurancePolicyId ?? null,
      pucExpiryDate: data.pucExpiryDate ? new Date(data.pucExpiryDate) : null,
      rcRenewalDate: data.rcRenewalDate ? new Date(data.rcRenewalDate) : null,
      notes: data.notes ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return resolveLinkedEntities(vehicle);
}

export async function updateVehicle(
  id: string,
  userId: string,
  data: {
    make?: string;
    model?: string;
    registrationLast4?: string;
    currentValue?: number;
    linkedLoanId?: string | null;
    insurancePolicyId?: string | null;
    pucExpiryDate?: string | null;
    rcRenewalDate?: string | null;
    notes?: string;
  }
) {
  const vehicle = await prisma.vehicle.update({
    where: { id, userId },
    data: {
      ...(data.make !== undefined && { make: data.make }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.registrationLast4 !== undefined && { registrationLast4: data.registrationLast4 }),
      ...(data.currentValue !== undefined && {
        currentValue: BigInt(Math.round(data.currentValue * 100)),
      }),
      ...(data.linkedLoanId !== undefined && { linkedLoanId: data.linkedLoanId }),
      ...(data.insurancePolicyId !== undefined && { insurancePolicyId: data.insurancePolicyId }),
      ...(data.pucExpiryDate !== undefined && {
        pucExpiryDate: data.pucExpiryDate ? new Date(data.pucExpiryDate) : null,
      }),
      ...(data.rcRenewalDate !== undefined && {
        rcRenewalDate: data.rcRenewalDate ? new Date(data.rcRenewalDate) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return resolveLinkedEntities(vehicle);
}

export async function deleteVehicle(id: string, userId: string) {
  return prisma.vehicle.update({ where: { id, userId }, data: { isActive: false } });
}

export async function getServiceHistory(vehicleId: string, userId: string) {
  // Verify vehicle belongs to user
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return null;
  return prisma.vehicleService.findMany({
    where: { vehicleId },
    orderBy: { date: "desc" },
  });
}

export async function addService(
  vehicleId: string,
  userId: string,
  data: {
    date: string;
    odometer?: number;
    serviceCentre?: string;
    cost: number;
    description?: string;
  }
) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return null;
  return prisma.vehicleService.create({
    data: {
      vehicleId,
      date: new Date(data.date),
      odometer: data.odometer ?? null,
      serviceCentre: data.serviceCentre ?? null,
      cost: BigInt(Math.round(data.cost * 100)),
      description: data.description ?? null,
    },
  });
}

export async function removeService(serviceId: string, vehicleId: string, userId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return null;
  return prisma.vehicleService.delete({ where: { id: serviceId, vehicleId } });
}
```

- [ ] **Step 2: Create `server/src/controllers/vehicles.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/vehicles.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const VEHICLE_TYPES = ["car","two_wheeler","commercial","tractor","other"] as const;
const FUEL_TYPES = ["petrol","diesel","cng","electric","hybrid","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  vehicleType: z.enum(VEHICLE_TYPES),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  yearOfManufacture: z.number().int().min(1900).max(2100),
  registrationLast4: z.string().length(4).optional(),
  fuelType: z.enum(FUEL_TYPES),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  linkedLoanId: z.string().optional(),
  insurancePolicyId: z.string().optional(),
  pucExpiryDate: z.string().datetime().optional(),
  rcRenewalDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  make: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  registrationLast4: z.string().length(4).optional(),
  currentValue: z.number().min(0).optional(),
  linkedLoanId: z.string().nullable().optional(),
  insurancePolicyId: z.string().nullable().optional(),
  pucExpiryDate: z.string().datetime().nullable().optional(),
  rcRenewalDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional(),
});

const serviceSchema = z.object({
  date: z.string().datetime(),
  odometer: z.number().int().min(0).optional(),
  serviceCentre: z.string().max(200).optional(),
  cost: z.number().min(0),
  description: z.string().max(500).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listVehicles((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createVehicle((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateVehicle(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteVehicle(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const serviceHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await svc.getServiceHistory(
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId
  );
  if (!history) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
  res.json({ success: true, data: history });
});

export const addService = asyncHandler(async (req: Request, res: Response) => {
  const parsed = serviceSchema.parse(req.body);
  const record = await svc.addService(
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId,
    parsed
  );
  if (!record) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
  res.status(201).json({ success: true, data: record });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.removeService(
    getParam(req.params.serviceId),
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId
  );
  if (!result) { res.status(404).json({ success: false, message: "Service record not found" }); return; }
  res.json({ success: true });
});
```

- [ ] **Step 3: Create `server/src/routes/vehicles.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/vehicles.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/:id/service", ctrl.serviceHistory);
router.post("/:id/service", ctrl.addService);
router.delete("/:id/service/:serviceId", ctrl.deleteService);

export { router as vehiclesRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/vehicles.ts server/src/controllers/vehicles.ts server/src/routes/vehicles.ts
git commit -m "feat: add vehicles service, controller, and routes"
```

---

## Task 6: Register All Three Routers in app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add imports to `server/src/app.ts`**

After the Phase 3 router imports (after `import { passiveIncomeRouter }...`), add:

```typescript
import { budgetRouter } from "./routes/budget.js";
import { goalsRouter } from "./routes/goals.js";
import { vehiclesRouter } from "./routes/vehicles.js";
```

- [ ] **Step 2: Register routes in `server/src/app.ts`**

After `app.use("/api/passive-income", passiveIncomeRouter);`, add:

```typescript
app.use("/api/budget", budgetRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/vehicles", vehiclesRouter);
```

- [ ] **Step 3: Verify server starts**

```bash
cd server && pnpm dev
```

Expected: Server starts with no errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: register budget, goals, and vehicles routers"
```

---

## Task 7: Backend Tests — Budget

**Files:**
- Create: `server/src/__tests__/budget.test.ts`

- [ ] **Step 1: Write `server/src/__tests__/budget.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "budget-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let budgetId: string;
let memberId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Budget Test", email: EMAIL, password: PASSWORD });
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

describe("Budget API", () => {
  it("GET /api/budget returns 404 when no budget set", async () => {
    const res = await request(app)
      .get("/api/budget?month=1&year=2026")
      .set("Cookie", cookies);
    expect(res.status).toBe(404);
  });

  it("POST /api/budget creates a budget with items", async () => {
    const res = await request(app)
      .post("/api/budget")
      .set("Cookie", cookies)
      .send({
        month: 4,
        year: 2026,
        items: [
          { category: "groceries", budgetAmount: 10000 },
          { category: "fuel", budgetAmount: 5000 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.month).toBe(4);
    expect(res.body.data.items.length).toBe(2);
    budgetId = res.body.data.id;
  });

  it("GET /api/budget returns the budget", async () => {
    const res = await request(app)
      .get("/api/budget?month=4&year=2026")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(budgetId);
  });

  it("PUT /api/budget/:id replaces items", async () => {
    const res = await request(app)
      .put(`/api/budget/${budgetId}`)
      .set("Cookie", cookies)
      .send({
        items: [{ category: "medical", budgetAmount: 8000 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].category).toBe("medical");
  });

  it("GET /api/budget/vs-actual returns comparison structure", async () => {
    // Seed an expense for the same month
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    await prisma.expense.create({
      data: {
        userId: user!.id,
        familyMemberId: memberId,
        category: "medical",
        amount: 500000n, // ₹5000 in paise
        date: new Date("2026-04-15"),
      },
    });

    const res = await request(app)
      .get("/api/budget/vs-actual?month=4&year=2026")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalBudget");
    expect(res.body.data).toHaveProperty("totalActual");
    expect(res.body.data).toHaveProperty("items");
    expect(res.body.data).toHaveProperty("savingsRate");
    const medicalItem = res.body.data.items.find((i: any) => i.category === "medical");
    expect(medicalItem.actual).toBe(500000);
    expect(medicalItem.budgeted).toBe(800000); // ₹8000 in paise
  });

  it("POST /api/budget with copyFromMonth copies items", async () => {
    const res = await request(app)
      .post("/api/budget")
      .set("Cookie", cookies)
      .send({
        month: 5,
        year: 2026,
        copyFromMonth: 4,
        copyFromYear: 2026,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].category).toBe("medical");
  });
});
```

- [ ] **Step 2: Run budget tests**

```bash
cd server && pnpm test --reporter=verbose src/__tests__/budget.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/budget.test.ts
git commit -m "test: add budget API integration tests"
```

---

## Task 8: Backend Tests — Goals and Vehicles

**Files:**
- Create: `server/src/__tests__/goals.test.ts`
- Create: `server/src/__tests__/vehicles.test.ts`

- [ ] **Step 1: Write `server/src/__tests__/goals.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "goals-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let goalId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Goals Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Financial Goals API", () => {
  it("POST /api/goals creates a goal", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Cookie", cookies)
      .send({
        name: "Buy House",
        category: "home_purchase",
        targetAmount: 5000000,
        targetDate: "2028-01-01T00:00:00.000Z",
        currentAmount: 500000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Buy House");
    expect(typeof res.body.data.progressPercent).toBe("number");
    expect(typeof res.body.data.monthsRemaining).toBe("number");
    expect(typeof res.body.data.requiredMonthlySaving).toBe("number");
    goalId = res.body.data.id;
  });

  it("GET /api/goals lists goals with computed fields", async () => {
    const res = await request(app).get("/api/goals").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("progressPercent");
    expect(res.body.data[0]).toHaveProperty("monthsRemaining");
  });

  it("PUT /api/goals/:id updates currentAmount", async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set("Cookie", cookies)
      .send({ currentAmount: 1000000 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentAmount).toBe(100000000); // ₹10L in paise
    expect(res.body.data.progressPercent).toBe(20);
  });

  it("DELETE /api/goals/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/goals").set("Cookie", cookies);
    expect(list.body.data.find((g: any) => g.id === goalId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Write `server/src/__tests__/vehicles.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "vehicles-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let vehicleId: string;
let serviceId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Vehicle Test", email: EMAIL, password: PASSWORD });
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

describe("Vehicles API", () => {
  it("POST /api/vehicles creates a vehicle", async () => {
    const res = await request(app)
      .post("/api/vehicles")
      .set("Cookie", cookies)
      .send({
        familyMemberId: memberId,
        vehicleType: "car",
        make: "Maruti Suzuki",
        model: "Swift",
        yearOfManufacture: 2022,
        fuelType: "petrol",
        currentValue: 750000,
        pucExpiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.make).toBe("Maruti Suzuki");
    expect(res.body.data.pucExpiringSoon).toBe(true);   // < 30 days
    expect(res.body.data.linkedLoan).toBeNull();
    vehicleId = res.body.data.id;
  });

  it("GET /api/vehicles lists vehicles with computed flags", async () => {
    const res = await request(app).get("/api/vehicles").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("pucExpiringSoon");
    expect(res.body.data[0]).toHaveProperty("rcExpiringSoon");
  });

  it("PUT /api/vehicles/:id updates vehicle", async () => {
    const res = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set("Cookie", cookies)
      .send({ currentValue: 700000 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentValue).toBe(70000000); // paise
  });

  it("POST /api/vehicles/:id/service adds a service record", async () => {
    const res = await request(app)
      .post(`/api/vehicles/${vehicleId}/service`)
      .set("Cookie", cookies)
      .send({
        date: "2026-03-01T00:00:00.000Z",
        odometer: 15000,
        serviceCentre: "Maruti Authorized",
        cost: 8500,
        description: "Full service",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.odometer).toBe(15000);
    serviceId = res.body.data.id;
  });

  it("GET /api/vehicles/:id/service returns service history", async () => {
    const res = await request(app)
      .get(`/api/vehicles/${vehicleId}/service`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("DELETE /api/vehicles/:id/service/:serviceId removes record", async () => {
    const res = await request(app)
      .delete(`/api/vehicles/${vehicleId}/service/${serviceId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const history = await request(app)
      .get(`/api/vehicles/${vehicleId}/service`)
      .set("Cookie", cookies);
    expect(history.body.data.length).toBe(0);
  });

  it("DELETE /api/vehicles/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/vehicles").set("Cookie", cookies);
    expect(list.body.data.find((v: any) => v.id === vehicleId)).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run all new tests**

```bash
cd server && pnpm test --reporter=verbose src/__tests__/goals.test.ts src/__tests__/vehicles.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Run full test suite**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/__tests__/goals.test.ts server/src/__tests__/vehicles.test.ts
git commit -m "test: add goals and vehicles API integration tests"
```

---

## Task 9: Budget Client Page

**Files:**
- Create: `client/src/pages/finance/BudgetPage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/BudgetPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { PiggyBank, ChevronLeft, ChevronRight, Plus, Save, Copy } from "lucide-react";
import type { BudgetVsActualResponse, ExpenseCategory } from "@ai-personal-diary/shared/types/finance";
import { EXPENSE_CATEGORY_LABELS } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "groceries","vegetables_fruits","fuel","transport","school_fees","medical",
  "utilities","internet_mobile","religious","eating_out","clothing","rent",
  "household","other",
];

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function monthName(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [vsActual, setVsActual] = useState<BudgetVsActualResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  // editAmounts: category → rupee string for input
  const [editAmounts, setEditAmounts] = useState<Partial<Record<ExpenseCategory, string>>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [budgetRes, vsRes] = await Promise.all([
      fetch(`${API}/api/budget?month=${month}&year=${year}`, { credentials: "include" })
        .then((r) => r.json()),
      fetch(`${API}/api/budget/vs-actual?month=${month}&year=${year}`, { credentials: "include" })
        .then((r) => r.json()),
    ]);

    if (budgetRes.success) {
      setBudgetId(budgetRes.data.id);
      // pre-fill edit amounts from budget items
      const amounts: Partial<Record<ExpenseCategory, string>> = {};
      for (const item of budgetRes.data.items) {
        amounts[item.category as ExpenseCategory] = String(item.budgetAmount / 100);
      }
      setEditAmounts(amounts);
    } else {
      setBudgetId(null);
      setEditAmounts({});
    }
    if (vsRes.success) setVsActual(vsRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [month, year]);

  function navigate(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setEditMode(false);
  }

  async function handleSave() {
    setSaving(true);
    const items = EXPENSE_CATEGORIES
      .filter((c) => editAmounts[c] && parseFloat(editAmounts[c]!) > 0)
      .map((c) => ({ category: c, budgetAmount: parseFloat(editAmounts[c]!) }));

    let res;
    if (budgetId) {
      res = await fetch(`${API}/api/budget/${budgetId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } else {
      res = await fetch(`${API}/api/budget`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, items }),
      });
    }
    const data = await res.json();
    if (data.success) {
      setBudgetId(data.data.id);
      setEditMode(false);
      load();
    }
    setSaving(false);
  }

  async function handleCopyFromPrevious() {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const res = await fetch(`${API}/api/budget`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        year,
        copyFromMonth: prevMonth,
        copyFromYear: prevYear,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setBudgetId(data.data.id);
      load();
    }
  }

  const noBudget = !budgetId && !loading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Budget Planner</h1>
        </div>
        <div className="flex items-center gap-2">
          {budgetId && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              Edit Budget
            </button>
          )}
          {editMode && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          {monthName(month, year)}
        </span>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : noBudget ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <PiggyBank className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="mb-4 text-slate-500">No budget set for {monthName(month, year)}.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
            >
              <Plus className="h-4 w-4" /> Set Up Budget
            </button>
            <button
              onClick={handleCopyFromPrevious}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              <Copy className="h-4 w-4" /> Copy from Previous Month
            </button>
          </div>
        </div>
      ) : editMode ? (
        /* Edit mode — input grid */
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
            Set budget amounts (₹)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <label className="w-40 flex-shrink-0 text-sm text-slate-600 dark:text-slate-400">
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="0"
                  value={editAmounts[cat] ?? ""}
                  onChange={(e) =>
                    setEditAmounts((prev) => ({ ...prev, [cat]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* View mode — vs actual table */
        vsActual && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Total Budgeted</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {rupees(vsActual.totalBudget)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Total Spent</p>
                <p className={`mt-1 text-2xl font-bold ${vsActual.totalActual > vsActual.totalBudget ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                  {rupees(vsActual.totalActual)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Savings Rate</p>
                <p className={`mt-1 text-2xl font-bold ${vsActual.savingsRate >= 20 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {vsActual.savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Category rows */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              {vsActual.items.map((item, i) => {
                const pct = item.budgeted > 0 ? Math.min(100, Math.round((item.actual / item.budgeted) * 100)) : 100;
                const barColor =
                  item.status === "over"
                    ? "bg-red-500"
                    : item.status === "warning"
                    ? "bg-amber-500"
                    : "bg-green-500";
                return (
                  <div
                    key={item.category}
                    className={`px-5 py-4 ${i > 0 ? "border-t border-slate-100 dark:border-slate-700" : ""}`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{rupees(item.actual)}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.budgeted > 0 ? rupees(item.budgeted) : "No budget"}
                        </span>
                        <span
                          className={`w-14 rounded-full px-2 py-0.5 text-center text-xs font-medium ${
                            item.status === "over"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : item.status === "warning"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {item.status === "over" ? "Over" : item.status === "warning" ? "Near" : "OK"}
                        </span>
                      </div>
                    </div>
                    {item.budgeted > 0 && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/BudgetPage.tsx
git commit -m "feat: add BudgetPage client with month navigator, vs-actual rows, and copy from previous month"
```

---

## Task 10: Goals Client Page

**Files:**
- Create: `client/src/pages/finance/GoalsPage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/GoalsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Target, Plus, Edit2, Trash2, CheckCircle } from "lucide-react";
import type { FinancialGoalResponse, GoalCategory } from "@ai-personal-diary/shared/types/finance";
import { GOAL_CATEGORY_LABELS } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const GOAL_CATEGORY_VALUES: GoalCategory[] = [
  "home_purchase","vehicle","education","wedding","retirement",
  "emergency_fund","travel","medical","other",
];

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

const emptyForm = {
  name: "",
  category: "other" as GoalCategory,
  targetAmount: "",
  targetDate: "",
  currentAmount: "",
  notes: "",
};

// SVG circular progress — radius 36, circumference ≈ 226
function CircularProgress({ percent }: { percent: number }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        className="transition-all duration-500"
      />
      <text
        x="44"
        y="49"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="currentColor"
        className="text-slate-900 dark:text-white"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<FinancialGoalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FinancialGoalResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/goals`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.success) setGoals(data.data); setLoading(false); });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) });
    setShowModal(true);
  }

  function openEdit(g: FinancialGoalResponse) {
    setEditing(g);
    setForm({
      name: g.name,
      category: g.category,
      targetAmount: String(g.targetAmount / 100),
      targetDate: g.targetDate.slice(0, 10),
      currentAmount: String(g.currentAmount / 100),
      notes: g.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: new Date(form.targetDate).toISOString(),
      notes: form.notes || undefined,
    };
    const url = editing ? `${API}/api/goals/${editing.id}` : `${API}/api/goals`;
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
        setGoals((prev) => prev.map((g) => (g.id === editing.id ? data.data : g)));
      } else {
        setGoals((prev) => [...prev, data.data]);
      }
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    const res = await fetch(`${API}/api/goals/${id}`, { method: "DELETE", credentials: "include" });
    if ((await res.json()).success) setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function markAchieved(g: FinancialGoalResponse) {
    const res = await fetch(`${API}/api/goals/${g.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAchieved: true, currentAmount: g.targetAmount / 100 }),
    });
    const data = await res.json();
    if (data.success) setGoals((prev) => prev.map((x) => (x.id === g.id ? data.data : x)));
  }

  const active = goals.filter((g) => !g.isAchieved);
  const achieved = goals.filter((g) => g.isAchieved);

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Goals</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Goal
        </button>
      </div>

      {/* Active goals */}
      {active.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => openEdit(g)}
              onDelete={() => handleDelete(g.id)}
              onAchieve={() => markAchieved(g)}
            />
          ))}
        </div>
      )}

      {/* Achieved goals */}
      {achieved.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-green-600">
            <CheckCircle className="h-4 w-4" /> Achieved
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achieved.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{g.name}</p>
                  <p className="text-xs text-slate-500">{GOAL_CATEGORY_LABELS[g.category]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600">{rupees(g.targetAmount)}</span>
                  <button onClick={() => handleDelete(g.id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {goals.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Target className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No financial goals yet.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Goal" : "New Goal"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Goal Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Buy House"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Category</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as GoalCategory })}
                    disabled={!!editing}
                  >
                    {GOAL_CATEGORY_VALUES.map((c) => (
                      <option key={c} value={c}>{GOAL_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Target Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.targetDate}
                    onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Target Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.targetAmount}
                    onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Current Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.currentAmount}
                    onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                    placeholder="0"
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

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAchieve,
}: {
  goal: FinancialGoalResponse;
  onEdit: () => void;
  onDelete: () => void;
  onAchieve: () => void;
}) {
  function rupees(paise: number) {
    return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{goal.name}</p>
          <p className="text-xs text-slate-500">{GOAL_CATEGORY_LABELS[goal.category]}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <CircularProgress percent={goal.progressPercent} />
        <div className="space-y-1.5 text-xs">
          <div>
            <span className="text-slate-500">Target</span>
            <p className="font-semibold text-slate-900 dark:text-white">{rupees(goal.targetAmount)}</p>
          </div>
          <div>
            <span className="text-slate-500">Saved</span>
            <p className="font-semibold text-slate-900 dark:text-white">{rupees(goal.currentAmount)}</p>
          </div>
          <div>
            <span className="text-slate-500">By</span>
            <p className="font-semibold text-slate-900 dark:text-white">
              {new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-700/50">
        <div>
          <span className="text-slate-500">Months left</span>
          <p className="font-semibold text-slate-900 dark:text-white">{goal.monthsRemaining}</p>
        </div>
        <div>
          <span className="text-slate-500">Need / month</span>
          <p className="font-semibold text-ocean-accent">{rupees(goal.requiredMonthlySaving)}</p>
        </div>
      </div>

      {goal.progressPercent >= 100 && !goal.isAchieved && (
        <button
          onClick={onAchieve}
          className="mt-3 w-full rounded-lg bg-green-500 py-1.5 text-xs font-medium text-white hover:bg-green-600"
        >
          Mark as Achieved
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/GoalsPage.tsx
git commit -m "feat: add GoalsPage client with circular progress and computed fields"
```

---

## Task 11: Vehicles Client Page

**Files:**
- Create: `client/src/pages/finance/VehiclesPage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/VehiclesPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Car, Plus, Edit2, Trash2, AlertTriangle, ChevronDown, ChevronUp, Wrench } from "lucide-react";
import type {
  VehicleResponse,
  VehicleServiceResponse,
  VehicleType,
  FuelType,
  Relationship,
} from "@ai-personal-diary/shared/types/finance";
import { VEHICLE_TYPE_LABELS, FUEL_TYPE_LABELS } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface FamilyMember { id: string; name: string; relationship: Relationship }

const VEHICLE_TYPES: VehicleType[] = ["car","two_wheeler","commercial","tractor","other"];
const FUEL_TYPES: FuelType[] = ["petrol","diesel","cng","electric","hybrid","other"];

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

const emptyForm = {
  familyMemberId: "",
  vehicleType: "car" as VehicleType,
  make: "",
  model: "",
  yearOfManufacture: new Date().getFullYear(),
  registrationLast4: "",
  fuelType: "petrol" as FuelType,
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  pucExpiryDate: "",
  rcRenewalDate: "",
  notes: "",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VehicleResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [serviceHistory, setServiceHistory] = useState<Record<string, VehicleServiceResponse[]>>({});
  const [serviceForm, setServiceForm] = useState({ date: "", odometer: "", serviceCentre: "", cost: "", description: "" });
  const [addingService, setAddingService] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/vehicles`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/family-members`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([vRes, mRes]) => {
      if (vRes.success) setVehicles(vRes.data);
      if (mRes.success) setMembers(mRes.data);
      setLoading(false);
    });
  }, []);

  async function toggleService(id: string) {
    if (expandedService === id) { setExpandedService(null); return; }
    if (!serviceHistory[id]) {
      const res = await fetch(`${API}/api/vehicles/${id}/service`, { credentials: "include" }).then((r) => r.json());
      if (res.success) setServiceHistory((prev) => ({ ...prev, [id]: res.data }));
    }
    setExpandedService(id);
  }

  async function handleAddService(vehicleId: string) {
    const res = await fetch(`${API}/api/vehicles/${vehicleId}/service`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date(serviceForm.date).toISOString(),
        odometer: serviceForm.odometer ? parseInt(serviceForm.odometer) : undefined,
        serviceCentre: serviceForm.serviceCentre || undefined,
        cost: parseFloat(serviceForm.cost),
        description: serviceForm.description || undefined,
      }),
    }).then((r) => r.json());
    if (res.success) {
      setServiceHistory((prev) => ({ ...prev, [vehicleId]: [res.data, ...(prev[vehicleId] ?? [])] }));
      setAddingService(null);
      setServiceForm({ date: "", odometer: "", serviceCentre: "", cost: "", description: "" });
    }
  }

  async function handleDeleteService(vehicleId: string, serviceId: string) {
    const res = await fetch(`${API}/api/vehicles/${vehicleId}/service/${serviceId}`, {
      method: "DELETE",
      credentials: "include",
    }).then((r) => r.json());
    if (res.success) {
      setServiceHistory((prev) => ({
        ...prev,
        [vehicleId]: (prev[vehicleId] ?? []).filter((s) => s.id !== serviceId),
      }));
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, familyMemberId: members[0]?.id ?? "" });
    setShowModal(true);
  }

  function openEdit(v: VehicleResponse) {
    setEditing(v);
    setForm({
      familyMemberId: v.familyMemberId,
      vehicleType: v.vehicleType,
      make: v.make,
      model: v.model,
      yearOfManufacture: v.yearOfManufacture,
      registrationLast4: v.registrationLast4 ?? "",
      fuelType: v.fuelType,
      purchaseDate: v.purchaseDate?.slice(0, 10) ?? "",
      purchasePrice: v.purchasePrice != null ? String(v.purchasePrice / 100) : "",
      currentValue: String(v.currentValue / 100),
      pucExpiryDate: v.pucExpiryDate?.slice(0, 10) ?? "",
      rcRenewalDate: v.rcRenewalDate?.slice(0, 10) ?? "",
      notes: v.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = editing
      ? {
          make: form.make,
          model: form.model,
          registrationLast4: form.registrationLast4 || undefined,
          currentValue: parseFloat(form.currentValue) || 0,
          pucExpiryDate: form.pucExpiryDate ? new Date(form.pucExpiryDate).toISOString() : null,
          rcRenewalDate: form.rcRenewalDate ? new Date(form.rcRenewalDate).toISOString() : null,
          notes: form.notes || undefined,
        }
      : {
          ...form,
          purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
          purchasePrice: parseFloat(form.purchasePrice) || undefined,
          currentValue: parseFloat(form.currentValue) || 0,
          pucExpiryDate: form.pucExpiryDate ? new Date(form.pucExpiryDate).toISOString() : undefined,
          rcRenewalDate: form.rcRenewalDate ? new Date(form.rcRenewalDate).toISOString() : undefined,
          registrationLast4: form.registrationLast4 || undefined,
          notes: form.notes || undefined,
        };

    const url = editing ? `${API}/api/vehicles/${editing.id}` : `${API}/api/vehicles`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());

    if (res.success) {
      if (editing) {
        setVehicles((prev) => prev.map((v) => (v.id === editing.id ? res.data : v)));
      } else {
        setVehicles((prev) => [...prev, res.data]);
      }
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    const res = await fetch(`${API}/api/vehicles/${id}`, { method: "DELETE", credentials: "include" }).then((r) => r.json());
    if (res.success) setVehicles((prev) => prev.filter((v) => v.id !== id));
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehicles</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Vehicle cards */}
      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No vehicles added yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="p-5">
                {/* Title row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {v.make} {v.model}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
                        {v.yearOfManufacture}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {VEHICLE_TYPE_LABELS[v.vehicleType]} · {FUEL_TYPE_LABELS[v.fuelType]}
                      {v.registrationLast4 && ` · ••${v.registrationLast4}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Alert badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.pucExpiringSoon && (
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertTriangle className="h-3 w-3" /> PUC Expiring Soon
                    </span>
                  )}
                  {v.rcExpiringSoon && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> RC Renewal Due
                    </span>
                  )}
                  {v.linkedLoan && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Loan: {rupees(v.linkedLoan.outstandingAmount)} outstanding
                    </span>
                  )}
                  {v.linkedInsurance && (
                    <span className={`rounded-full px-2.5 py-1 text-xs ${v.linkedInsurance.renewalSoon ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                      Insured: {v.linkedInsurance.insurerName}
                    </span>
                  )}
                </div>

                {/* Details grid */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Current Value</span>
                    <p className="font-medium text-slate-900 dark:text-white">{rupees(v.currentValue)}</p>
                  </div>
                  {v.pucExpiryDate && (
                    <div>
                      <span className="text-slate-500">PUC Expiry</span>
                      <p className={`font-medium ${v.pucExpiringSoon ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
                        {new Date(v.pucExpiryDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  )}
                  {v.rcRenewalDate && (
                    <div>
                      <span className="text-slate-500">RC Renewal</span>
                      <p className={`font-medium ${v.rcExpiringSoon ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>
                        {new Date(v.rcRenewalDate).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  )}
                  {v.familyMember && (
                    <div>
                      <span className="text-slate-500">Owner</span>
                      <p className="font-medium text-slate-900 dark:text-white">{v.familyMember.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Service history toggle */}
              <div className="border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => toggleService(v.id)}
                  className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5" /> Service History
                  </span>
                  {expandedService === v.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {expandedService === v.id && (
                  <div className="border-t border-slate-100 px-5 pb-4 dark:border-slate-700">
                    <div className="mt-3 space-y-2">
                      {(serviceHistory[v.id] ?? []).map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/50">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {new Date(s.date).toLocaleDateString("en-IN")}
                            </span>
                            {s.serviceCentre && <span className="ml-2 text-slate-500">{s.serviceCentre}</span>}
                            {s.odometer && <span className="ml-2 text-slate-400">{s.odometer.toLocaleString()} km</span>}
                            {s.description && <p className="mt-0.5 text-slate-500">{s.description}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-white">{rupees(s.cost)}</span>
                            <button
                              onClick={() => handleDeleteService(v.id, s.id)}
                              className="text-slate-300 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(serviceHistory[v.id] ?? []).length === 0 && (
                        <p className="text-xs text-slate-400">No service records yet.</p>
                      )}
                    </div>

                    {/* Add service inline */}
                    {addingService === v.id ? (
                      <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">Date</label>
                            <input type="date" className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              value={serviceForm.date} onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">Cost (₹)</label>
                            <input type="number" className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              value={serviceForm.cost} onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">Odometer (km)</label>
                            <input type="number" className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              value={serviceForm.odometer} onChange={(e) => setServiceForm({ ...serviceForm, odometer: e.target.value })} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">Service Centre</label>
                            <input className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              value={serviceForm.serviceCentre} onChange={(e) => setServiceForm({ ...serviceForm, serviceCentre: e.target.value })} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <label className="mb-1 block text-xs text-slate-500">Description</label>
                          <input className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                            value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
                        </div>
                        <div className="mt-2 flex justify-end gap-2">
                          <button onClick={() => setAddingService(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                          <button onClick={() => handleAddService(v.id)} disabled={!serviceForm.date || !serviceForm.cost}
                            className="rounded bg-ocean-accent px-3 py-1 text-xs text-white hover:bg-ocean-accent/90 disabled:opacity-50">
                            Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingService(v.id); setServiceForm({ ...serviceForm, date: new Date().toISOString().slice(0, 10) }); }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-ocean-accent hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Service Record
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Vehicle" : "Add Vehicle"}
            </h2>
            <div className="space-y-3">
              {!editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Owner</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      value={form.familyMemberId} onChange={(e) => setForm({ ...form, familyMemberId: e.target.value })}>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value as VehicleType })}>
                      {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Make</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} placeholder="e.g. Maruti Suzuki" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Model</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Swift" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Year</label>
                  <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.yearOfManufacture} onChange={(e) => setForm({ ...form, yearOfManufacture: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Fuel Type</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })} disabled={!!editing}>
                    {FUEL_TYPES.map((f) => <option key={f} value={f}>{FUEL_TYPE_LABELS[f]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Reg. Last 4</label>
                  <input maxLength={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.registrationLast4} onChange={(e) => setForm({ ...form, registrationLast4: e.target.value })} placeholder="1234" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Current Value (₹)</label>
                  <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} placeholder="0" />
                </div>
                {!editing && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Purchase Price (₹)</label>
                    <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} placeholder="Optional" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">PUC Expiry</label>
                  <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.pucExpiryDate} onChange={(e) => setForm({ ...form, pucExpiryDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">RC Renewal</label>
                  <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.rcRenewalDate} onChange={(e) => setForm({ ...form, rcRenewalDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes (optional)</label>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90 disabled:opacity-50">
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
git add client/src/pages/finance/VehiclesPage.tsx
git commit -m "feat: add VehiclesPage client with PUC/RC alerts and service history"
```

---

## Task 12: Wire Client Routes and Sidebar

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add imports and routes to `client/src/App.tsx`**

After the Phase 3 page imports, add:

```tsx
import BudgetPage from "./pages/finance/BudgetPage";
import GoalsPage from "./pages/finance/GoalsPage";
import VehiclesPage from "./pages/finance/VehiclesPage";
```

After the Phase 3 routes (`<Route path="passive-income" ...>`), add:

```tsx
<Route path="budget" element={<BudgetPage />} />
<Route path="goals" element={<GoalsPage />} />
<Route path="vehicles" element={<VehiclesPage />} />
```

- [ ] **Step 2: Add icons and nav items to `client/src/components/layout/Sidebar.tsx`**

In the lucide-react import, add `PiggyBank`, `Target`, `Car`:

```tsx
import {
  // ... existing imports
  PiggyBank,
  Target,
  Car,
} from "lucide-react";
```

In `mainNavItems`, after the Phase 3 entries, add:

```tsx
  { to: "/budget", label: "Budget", icon: PiggyBank },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/vehicles", label: "Vehicles", icon: Car },
```

- [ ] **Step 3: Verify all pages render**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm dev
```

Navigate to `/budget`, `/goals`, `/vehicles`. Each page renders without errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add budget, goals, and vehicles client routes and sidebar nav"
```

---

## Task 13: Documentation Update

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add Phase 4 API endpoints to the API Reference section**

```markdown
### Budget
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budget?month=4&year=2026` | Get budget for month (404 if not set) |
| GET | `/api/budget/vs-actual?month=4&year=2026` | Budget vs actual comparison with status flags |
| POST | `/api/budget` | Create budget; optional `copyFromMonth`/`copyFromYear` |
| PUT | `/api/budget/:id` | Replace all budget items |

### Financial Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals` | List all active goals with `progressPercent`, `monthsRemaining`, `requiredMonthlySaving` |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update (including `currentAmount` and `isAchieved`) |
| DELETE | `/api/goals/:id` | Soft delete |

### Vehicles
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vehicles` | List all vehicles with `pucExpiringSoon`, `rcExpiringSoon`, linked loan/insurance summary |
| POST | `/api/vehicles` | Create vehicle |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Soft delete |
| GET | `/api/vehicles/:id/service` | Service history |
| POST | `/api/vehicles/:id/service` | Add service record |
| DELETE | `/api/vehicles/:id/service/:serviceId` | Remove service record |
```

- [ ] **Step 2: Add Phase 4 models to the Database Schema section**

```markdown
### Phase 4 Models (Budget / Goals / Vehicles)

- **Budget** — One per user per calendar month (`@@unique([userId, month, year])`). Contains `BudgetItem[]` (one per `ExpenseCategory`).
- **BudgetItem** — Planned spend for a category. `budgetAmount` in paise. `@@unique([budgetId, category])`.
- **FinancialGoal** — Target amount + date + current amount. `progressPercent`, `monthsRemaining`, and `requiredMonthlySaving` are computed at query time in the service (not stored).
- **Vehicle** — `linkedLoanId` and `insurancePolicyId` are loose string FKs (no Prisma `@relation`); resolved manually in the service via separate queries. `pucExpiringSoon` and `rcExpiringSoon` computed at query time.
- **VehicleService** — Service record; hard-deleted (no `isActive` flag).
```

- [ ] **Step 3: Add new client pages to folder structure section**

```markdown
- `client/src/pages/finance/BudgetPage.tsx` — Budget Planner (month navigator, vs-actual rows, copy from previous month)
- `client/src/pages/finance/GoalsPage.tsx` — Financial Goals (circular progress cards)
- `client/src/pages/finance/VehiclesPage.tsx` — Vehicle Tracker (PUC/RC alerts, service history accordion)
```

- [ ] **Step 4: Run full quality check**

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
git commit -m "docs: update architecture.md for Phase 4 (budget, goals, vehicles)"
```

---

## Self-Review Against Spec

**Spec Coverage Check:**

| Spec Requirement | Covered |
|-----------------|---------|
| Budget, BudgetItem models | Task 1 |
| FinancialGoal model | Task 1 |
| Vehicle, VehicleService models | Task 1 |
| GoalCategory, VehicleType, FuelType enums | Task 1 |
| User/FamilyMember relations | Task 1 |
| Shared types + label maps | Task 2 |
| `GET /api/budget` (404 if not set) | Task 3 |
| `GET /api/budget/vs-actual` with status flags | Task 3 |
| Budget create with copyFromMonth | Task 3 |
| Budget update (replace items) | Task 3 |
| Goals CRUD | Task 4 |
| `progressPercent`, `monthsRemaining`, `requiredMonthlySaving` computed | Task 4 |
| Vehicles CRUD | Task 5 |
| `pucExpiringSoon`, `rcExpiringSoon` (≤30 days) | Task 5 |
| linkedLoan and linkedInsurance summary in response | Task 5 |
| Service history CRUD | Task 5 |
| Register 3 routers in app.ts | Task 6 |
| Budget tests (incl. vs-actual, copy) | Task 7 |
| Goals tests | Task 8 |
| Vehicles + service history tests | Task 8 |
| BudgetPage — month navigator + vs-actual rows + copy button | Task 9 |
| GoalsPage — circular progress + computed fields | Task 10 |
| VehiclesPage — alert badges + service accordion | Task 11 |
| Client routes + sidebar nav | Task 12 |
| Documentation | Task 13 |

**Placeholder scan:** No TBD, TODO, or "implement later" strings. All code is complete.

**Type consistency:** `VehicleResponse.linkedLoan` shape defined in Task 2 and produced by `resolveLinkedEntities` in Task 5. `BudgetVsActualResponse.items[].status` union type `'under' | 'warning' | 'over'` consistent across shared types, service, and UI.
