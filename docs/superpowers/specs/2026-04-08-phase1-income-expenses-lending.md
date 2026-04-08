# Phase 1 — Income Tracker, Expense Tracker, Personal Lending & Net Worth

**Date:** 2026-04-08
**Status:** Approved

---

## Features in this phase

1. **Income Tracker** — log monthly income per family member per source
2. **Expense Tracker** — log daily expenses with Indian categories
3. **Personal Lending & Borrowing** — track money lent/borrowed from friends and family
4. **Net Worth Dashboard enhancement** — extend existing dashboard to include income, expenses, savings rate, and lending outstanding

---

## 1. Data Model

### New enums

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
  lent      // I gave money to someone
  borrowed  // I received money from someone
}

enum LendingStatus {
  outstanding
  partially_repaid
  settled
}
```

### New models

```prisma
model Income {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  source         IncomeSource
  amount         BigInt                      // paise
  month          Int                         // 1–12
  year           Int                         // e.g. 2025
  fiscalYear     String                      // "2025-26"
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
  amount         BigInt                          // paise
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
  principalAmount       BigInt                       // paise — original amount
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
  id          String          @id @default(cuid())
  lendingId   String
  lending     PersonalLending @relation(fields: [lendingId], references: [id], onDelete: Cascade)
  amount      BigInt                   // paise
  date        DateTime
  notes       String?
  createdAt   DateTime        @default(now())

  @@index([lendingId])
}
```

### User model additions

```prisma
// Add to User model:
incomes           Income[]
expenses          Expense[]
personalLendings  PersonalLending[]
```

### FamilyMember model additions

```prisma
// Add to FamilyMember model:
incomes  Income[]
expenses Expense[]
```

### Fiscal year helper

Fiscal year in India runs April–March. A transaction in Jan 2026 belongs to FY "2025-26".

```ts
export function toFiscalYear(month: number, year: number): string {
  // months 1-3 (Jan-Mar) belong to previous FY start year
  const fyStartYear = month <= 3 ? year - 1 : year;
  return `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
}
```

---

## 2. API Design

### Income

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/income?fiscalYear=2025-26&familyMemberId=x` | List income entries (filterable) |
| POST | `/api/income` | Create income entry |
| PUT | `/api/income/:id` | Update income entry |
| DELETE | `/api/income/:id` | Soft delete |
| GET | `/api/income/summary?fiscalYear=2025-26` | Aggregated totals by source and member |

**createSchema:**
```ts
z.object({
  familyMemberId: z.string(),
  source: z.enum(['salary','business','rental','freelance','agricultural','pension','other']),
  amount: z.number().min(0),          // rupees from client
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  description: z.string().optional(),
})
```

**Server computes:** `fiscalYear = toFiscalYear(month, year)`, `amount` → `amount * 100` (paise)

**Unique constraint:** One entry per (userId, familyMemberId, source, month, year). PUT upserts.

### Expenses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses?month=3&year=2026&category=groceries` | List with filters |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update |
| DELETE | `/api/expenses/:id` | Soft delete |
| GET | `/api/expenses/summary?month=3&year=2026` | Category totals for month |

**createSchema:**
```ts
z.object({
  familyMemberId: z.string(),
  category: z.enum([...ExpenseCategory values...]),
  amount: z.number().min(0),          // rupees
  date: z.string().datetime(),        // ISO date string
  description: z.string().max(200).optional(),
})
```

### Personal Lending

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lending?direction=lent&status=outstanding` | List with filters |
| POST | `/api/lending` | Create lending record |
| PUT | `/api/lending/:id` | Update details |
| DELETE | `/api/lending/:id` | Soft delete |
| POST | `/api/lending/:id/repayments` | Record a repayment |
| DELETE | `/api/lending/:id/repayments/:repaymentId` | Remove repayment |

**createSchema:**
```ts
z.object({
  direction: z.enum(['lent', 'borrowed']),
  personName: z.string().min(1).max(100),
  personPhone: z.string().length(10).optional(),
  principalAmount: z.number().min(1),   // rupees
  date: z.string().datetime(),
  purpose: z.string().max(200).optional(),
  expectedRepaymentDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})
```

**Server computes outstanding:** `outstandingAmount = principal − sum(repayments)`. Updates status: outstanding / partially_repaid / settled.

### Net Worth Summary (new endpoint on existing dashboard)

`GET /api/dashboard/net-worth`

Returns full asset/liability breakdown:
```ts
{
  assets: {
    bankAndFD: number,
    investments: number,       // Phase 2 — 0 until then
    gold: number,              // Phase 2 — 0 until then
    properties: number,        // Phase 2 — 0 until then
    lentToOthers: number,      // outstanding lent
  },
  liabilities: {
    loans: number,             // outstanding loan amounts
    creditCards: number,       // current dues
    borrowedFromOthers: number,
  },
  netWorth: number,
  monthlySummary: {
    income: number,
    expenses: number,
    savingsRate: number,       // (income - expenses) / income * 100
  }
}
```

---

## 3. Shared Types (additions to `shared/src/types/finance.ts`)

```ts
export type IncomeSource = 'salary' | 'business' | 'rental' | 'freelance' | 'agricultural' | 'pension' | 'other'
export type ExpenseCategory = 'groceries' | 'vegetables_fruits' | 'fuel' | 'transport' | 'school_fees' | 'medical' | 'utilities' | 'internet_mobile' | 'religious' | 'eating_out' | 'clothing' | 'rent' | 'household' | 'other'
export type LendingDirection = 'lent' | 'borrowed'
export type LendingStatus = 'outstanding' | 'partially_repaid' | 'settled'

export interface IncomeResponse {
  id: string; familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  source: IncomeSource; amount: string; month: number; year: number
  fiscalYear: string; description: string | null
  createdAt: string; updatedAt: string
}

export interface ExpenseResponse {
  id: string; familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  category: ExpenseCategory; amount: string; date: string
  description: string | null; createdAt: string; updatedAt: string
}

export interface LendingRepaymentResponse {
  id: string; amount: string; date: string; notes: string | null; createdAt: string
}

export interface PersonalLendingResponse {
  id: string; direction: LendingDirection; personName: string; personPhone: string | null
  principalAmount: string; outstandingAmount: string; date: string; purpose: string | null
  expectedRepaymentDate: string | null; status: LendingStatus; notes: string | null
  repayments: LendingRepaymentResponse[]
  createdAt: string; updatedAt: string
}

export interface NetWorthResponse {
  assets: { bankAndFD: number; investments: number; gold: number; properties: number; lentToOthers: number }
  liabilities: { loans: number; creditCards: number; borrowedFromOthers: number }
  netWorth: number
  monthlySummary: { income: number; expenses: number; savingsRate: number }
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: 'Groceries & Kirana', vegetables_fruits: 'Vegetables & Fruits',
  fuel: 'Fuel', transport: 'Auto / Cab / Bus', school_fees: 'School & Tuition',
  medical: 'Medical & Medicines', utilities: 'Electricity / Gas / Water',
  internet_mobile: 'Internet & Mobile', religious: 'Temple & Donations',
  eating_out: 'Eating Out / Delivery', clothing: 'Clothing', rent: 'Rent',
  household: 'Household & Repairs', other: 'Other',
}

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary', business: 'Business / Self-employment', rental: 'Rental Income',
  freelance: 'Freelance / Consulting', agricultural: 'Agricultural Income',
  pension: 'Pension', other: 'Other',
}
```

---

## 4. UI Design

### Income Page (`/income`)

**Layout:** Header with "Add Income" button. Two-column controls: fiscal year selector + family member filter. Table/card list grouped by month showing source, amount, member. Monthly totals per source.

**Add/Edit modal fields:** Family member (select), Source (select), Month (select 1-12), Year (number), Amount (₹), Description (optional text)

**Summary bar:** Current FY total income, broken down by source with bars.

### Expense Page (`/expenses`)

**Layout:** Month/year navigator (← Feb 2026 → style). Category filter chips. Expense list sorted by date descending.

**Add modal fields:** Family member, Category (select with emoji icons), Amount (₹), Date, Description

**Monthly summary:** Total spent, category breakdown donut chart (or horizontal bars), vs last month delta.

### Personal Lending Page (`/lending`)

**Two tabs:** "Lent" (money I gave) and "Borrowed" (money I owe).

**Lending card shows:**
- Person name + phone
- Original amount, outstanding amount (principal − repayments), status badge
- Purpose, lent date, expected repayment date
- "Record Repayment" button → inline repayment modal
- Edit + Delete

**Repayment modal:** Amount (₹), Date, Notes. Shows running outstanding after repayment.

**Overdue indicator:** if expected date has passed and status ≠ settled → amber badge.

### Net Worth Page (`/net-worth`) — new page

Full-page breakdown with two columns (assets vs liabilities) and a net worth total at top. Month-over-month trend will come in a later phase when we have historical snapshots.

---

## 5. India-Specific Notes

- **Agricultural income**: tax-exempt in India. Flag it separately for tax module (Phase 3).
- **Fiscal year**: April–March. The income fiscal year must follow this correctly.
- **Expense date vs month**: Expenses use exact date. Income uses month/year (salary is monthly lump).
- **Phone number**: 10-digit Indian mobile numbers for lending contact.
- **Outstanding amount on lending**: computed field, not stored. Derived from `principal − sum(repayments)`.

---

## 6. Files to Create / Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add 4 enums + 4 models, extend User + FamilyMember |
| `server/prisma/migrations/…` | New migration |
| `shared/src/types/finance.ts` | Add 8 new types + label constants |
| `shared/src/utils/fiscalYear.ts` | New — `toFiscalYear`, `currentFiscalYear` |
| `shared/src/index.ts` | Export fiscal year utils |
| `server/src/services/income.ts` | New |
| `server/src/controllers/income.ts` | New |
| `server/src/routes/income.ts` | New |
| `server/src/services/expenses.ts` | New |
| `server/src/controllers/expenses.ts` | New |
| `server/src/routes/expenses.ts` | New |
| `server/src/services/lending.ts` | New |
| `server/src/controllers/lending.ts` | New |
| `server/src/routes/lending.ts` | New |
| `server/src/services/dashboard.ts` | Extend net worth calculation |
| `server/src/app.ts` | Register 3 new routers |
| `server/src/__tests__/income.test.ts` | New |
| `server/src/__tests__/expenses.test.ts` | New |
| `server/src/__tests__/lending.test.ts` | New |
| `client/src/pages/finance/IncomePage.tsx` | New |
| `client/src/pages/finance/ExpensesPage.tsx` | New |
| `client/src/pages/finance/LendingPage.tsx` | New |
| `client/src/pages/finance/NetWorthPage.tsx` | New |
| `client/src/App.tsx` | Register 4 new routes |
| `client/src/components/layout/Sidebar.tsx` | Add 4 new nav items |
| `docs/architecture.md` | Update schema + API sections |
