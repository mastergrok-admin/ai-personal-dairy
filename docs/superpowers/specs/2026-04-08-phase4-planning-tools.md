# Phase 4 — Budget Planner, Financial Goals, Vehicle Tracker

**Date:** 2026-04-08
**Status:** Approved

---

## Features

12. Budget Planner — set monthly budgets per category, compare vs actuals
13. Financial Goals — target amount + date, progress tracking
14. Vehicle Tracker — vehicle details, linked loan, insurance, PUC/RC reminders

---

## 1. Data Model

```prisma
# ── Budget ────────────────────────────────────────────────────────────────────

model Budget {
  id          String          @id @default(cuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  month       Int                          // 1–12
  year        Int
  fiscalYear  String
  isActive    Boolean         @default(true)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  items BudgetItem[]

  @@unique([userId, month, year])
  @@index([userId])
}

model BudgetItem {
  id           String          @id @default(cuid())
  budgetId     String
  budget       Budget          @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  category     ExpenseCategory              // reuses enum from Phase 1
  budgetAmount BigInt                       // paise — planned
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@unique([budgetId, category])
}

# ── Financial Goals ───────────────────────────────────────────────────────────

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

model FinancialGoal {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  category        GoalCategory
  targetAmount    BigInt                    // paise
  targetDate      DateTime
  currentAmount   BigInt       @default(0) // paise — manual update or computed
  notes           String?
  isAchieved      Boolean      @default(false)
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([userId])
}

# ── Vehicle ───────────────────────────────────────────────────────────────────

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

model Vehicle {
  id                String       @id @default(cuid())
  userId            String
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId    String
  familyMember      FamilyMember @relation(fields: [familyMemberId], references: [id])
  vehicleType       VehicleType
  make              String                   // e.g. "Maruti Suzuki"
  model             String                   // e.g. "Swift"
  yearOfManufacture Int
  registrationLast4 String?
  fuelType          FuelType
  purchaseDate      DateTime?
  purchasePrice     BigInt?                  // paise
  currentValue      BigInt       @default(0) // paise — manual estimate
  linkedLoanId      String?                  // FK to Loan
  insurancePolicyId String?                  // FK to InsurancePolicy
  pucExpiryDate     DateTime?
  rcRenewalDate     DateTime?
  notes             String?
  isActive          Boolean      @default(true)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  serviceHistory VehicleService[]

  @@index([userId])
  @@index([familyMemberId])
}

model VehicleService {
  id            String   @id @default(cuid())
  vehicleId     String
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  date          DateTime
  odometer      Int?                    // km reading
  serviceCentre String?
  cost          BigInt                  // paise
  description   String?
  createdAt     DateTime @default(now())

  @@index([vehicleId])
}
```

### User model additions

```prisma
budgets        Budget[]
financialGoals FinancialGoal[]
vehicles       Vehicle[]
```

---

## 2. API Design

### Budget

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budget?month=3&year=2026` | Get budget for month. 404 if not set. |
| POST | `/api/budget` | Create budget for a month |
| PUT | `/api/budget/:id` | Update budget |
| GET | `/api/budget/vs-actual?month=3&year=2026` | Budget vs actual comparison |

**`GET /api/budget/vs-actual`** response:
```ts
{
  month: number; year: number; totalBudget: number; totalActual: number
  items: Array<{
    category: ExpenseCategory; label: string
    budgeted: number; actual: number; variance: number
    status: 'under' | 'warning' | 'over'  // under=<80%, warning=80-100%, over=>100%
  }>
  savingsRate: number  // (income - actual expenses) / income * 100
}
```

### Financial Goals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/goals` | List all active goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update (including currentAmount) |
| DELETE | `/api/goals/:id` | Soft delete |

**Computed on GET:** `progressPercent`, `monthsRemaining`, `requiredMonthlySaving` = (target − current) / monthsRemaining.

### Vehicles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vehicles` | List all vehicles with upcoming PUC/RC/insurance alerts |
| POST | `/api/vehicles` | Create |
| PUT | `/api/vehicles/:id` | Update |
| DELETE | `/api/vehicles/:id` | Soft delete |
| GET | `/api/vehicles/:id/service` | Service history |
| POST | `/api/vehicles/:id/service` | Add service record |
| DELETE | `/api/vehicles/:id/service/:serviceId` | Remove service record |

Vehicle response includes `linkedLoan` and `linkedInsurance` (summary fields from those modules).
Alert flags: `pucExpiringSoon` (≤30 days), `rcExpiringSoon` (≤30 days).

---

## 3. Shared Types

```ts
export type GoalCategory = 'home_purchase' | 'vehicle' | 'education' | 'wedding' | 'retirement' | 'emergency_fund' | 'travel' | 'medical' | 'other'
export type VehicleType = 'car' | 'two_wheeler' | 'commercial' | 'tractor' | 'other'
export type FuelType = 'petrol' | 'diesel' | 'cng' | 'electric' | 'hybrid' | 'other'

export interface BudgetVsActualResponse {
  month: number; year: number; totalBudget: number; totalActual: number
  items: Array<{ category: ExpenseCategory; label: string; budgeted: number; actual: number; variance: number; status: 'under' | 'warning' | 'over' }>
  savingsRate: number
}

export interface FinancialGoalResponse {
  id: string; name: string; category: GoalCategory; targetAmount: string
  targetDate: string; currentAmount: string; progressPercent: number
  monthsRemaining: number; requiredMonthlySaving: number
  isAchieved: boolean; notes: string | null; createdAt: string; updatedAt: string
}

export interface VehicleResponse {
  id: string; familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  vehicleType: VehicleType; make: string; model: string
  yearOfManufacture: number; registrationLast4: string | null; fuelType: FuelType
  purchaseDate: string | null; purchasePrice: string | null; currentValue: string
  pucExpiryDate: string | null; rcRenewalDate: string | null
  pucExpiringSoon: boolean; rcExpiringSoon: boolean
  linkedLoanId: string | null; insurancePolicyId: string | null
  isActive: boolean; createdAt: string; updatedAt: string
}

export interface VehicleServiceResponse {
  id: string; date: string; odometer: number | null
  serviceCentre: string | null; cost: string; description: string | null; createdAt: string
}
```

---

## 4. UI Design

### Budget page (`/budget`)

**Month navigator** (← Feb 2026 →). If no budget set, show "Set up budget for this month" prompt.

**Category rows:** Each row shows category icon, name, budgeted amount (editable inline), actual from Expense Tracker, a colour-coded progress bar, and variance.

**Footer:** Total budgeted vs total spent. Savings rate. Comparison with previous month.

**Copy budget from previous month** button — convenience feature.

### Financial Goals page (`/goals`)

Goal cards with a circular progress indicator showing % achieved. Shows:
- Goal name + category icon
- Target: ₹X by [date]
- Progress: ₹X of ₹X (N%)
- Monthly saving needed: ₹X/month
- Months remaining

**Add/Edit modal:** Name, category, target amount, target date, current amount, notes.

### Vehicles page (`/vehicles`)

Vehicle cards showing make/model/year/fuel type, registration, owner (family member). Alert badges for PUC and RC renewal. Linked loan and insurance shown as small tags. "Service History" expansion section at the bottom of each card.

---

## 5. Files to Create / Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add Budget, BudgetItem, FinancialGoal, Vehicle, VehicleService |
| `shared/src/types/finance.ts` | Add goal, budget, vehicle types |
| `server/src/services/budget.ts` | New — incl. vs-actual computation |
| `server/src/controllers/budget.ts` | New |
| `server/src/routes/budget.ts` | New |
| `server/src/services/goals.ts` | New |
| `server/src/controllers/goals.ts` | New |
| `server/src/routes/goals.ts` | New |
| `server/src/services/vehicles.ts` | New |
| `server/src/controllers/vehicles.ts` | New |
| `server/src/routes/vehicles.ts` | New |
| `server/src/app.ts` | Register 3 new routers |
| `client/src/pages/finance/BudgetPage.tsx` | New |
| `client/src/pages/finance/GoalsPage.tsx` | New |
| `client/src/pages/finance/VehiclesPage.tsx` | New |
