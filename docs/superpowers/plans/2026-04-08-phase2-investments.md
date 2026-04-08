# Phase 2 — Investments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nine investment-type modules (Mutual Funds, PPF, EPF, NPS, Post Office Schemes, SGB, Chit Funds, Gold, Properties) plus a portfolio summary endpoint and a tabbed InvestmentsPage client page.

**Architecture:** Each investment type follows the same Controller → Service → Prisma pattern as existing modules (income, expenses). All nine types share a single Prisma migration. Mutual Funds adds a nested transaction sub-resource (buy/sell/dividend). The portfolio summary aggregates across all types. The client delivers one InvestmentsPage with tab navigation — one tab per type, summary cards at the top.

**Tech Stack:** Prisma (PostgreSQL), Express + Zod, React 19 + Tailwind, Vitest + supertest, TypeScript strict mode.

**Spec:** `docs/superpowers/specs/2026-04-08-phase2-investments.md`

---

## Codebase Conventions (read before touching any file)

- `import { prisma } from "../models/prisma.js"` — Prisma client import
- `import type { AuthenticatedRequest } from "../middleware/authenticate.js"` — typed request
- User ID: `(req as AuthenticatedRequest).userId` (NOT `req.user!.id`)
- Route param extraction: `import { getParam } from "../utils/params.js"` → `getParam(req.params.id)`
- Router export: `export { router as mutualFundsRouter }` (named, not default)
- BigInt: stored as paise (rupees × 100), auto-serialized to `number` in JSON by the replacer in `app.ts`
- Float fields (interestRate, units, nav): stored and returned as-is (no conversion)
- Soft delete: `prisma.model.update({ where: { id, userId }, data: { isActive: false } })`
- Test setup: use register → login → extract cookie pattern (see `server/src/__tests__/income.test.ts`)

---

## File Map

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Modify — add 7 enums + 11 models + User/FamilyMember relations |
| `server/prisma/migrations/…` | Auto-created by `prisma migrate dev` |
| `shared/src/types/finance.ts` | Modify — add 9 response interfaces + InvestmentSummary + label constants |
| `server/src/services/mutualFunds.ts` | Create |
| `server/src/controllers/mutualFunds.ts` | Create |
| `server/src/routes/mutualFunds.ts` | Create |
| `server/src/__tests__/mutualFunds.test.ts` | Create |
| `server/src/services/ppf.ts` | Create |
| `server/src/controllers/ppf.ts` | Create |
| `server/src/routes/ppf.ts` | Create |
| `server/src/__tests__/ppf.test.ts` | Create |
| `server/src/services/epf.ts` | Create |
| `server/src/controllers/epf.ts` | Create |
| `server/src/routes/epf.ts` | Create |
| `server/src/services/nps.ts` | Create |
| `server/src/controllers/nps.ts` | Create |
| `server/src/routes/nps.ts` | Create |
| `server/src/services/postOffice.ts` | Create |
| `server/src/controllers/postOffice.ts` | Create |
| `server/src/routes/postOffice.ts` | Create |
| `server/src/services/sgb.ts` | Create |
| `server/src/controllers/sgb.ts` | Create |
| `server/src/routes/sgb.ts` | Create |
| `server/src/services/chitFunds.ts` | Create |
| `server/src/controllers/chitFunds.ts` | Create |
| `server/src/routes/chitFunds.ts` | Create |
| `server/src/services/gold.ts` | Create |
| `server/src/controllers/gold.ts` | Create |
| `server/src/routes/gold.ts` | Create |
| `server/src/services/properties.ts` | Create |
| `server/src/controllers/properties.ts` | Create |
| `server/src/routes/properties.ts` | Create |
| `server/src/services/investments.ts` | Create — portfolio summary aggregation |
| `server/src/controllers/investments.ts` | Create |
| `server/src/routes/investments.ts` | Create |
| `server/src/__tests__/investments.test.ts` | Create |
| `server/src/app.ts` | Modify — register 10 new routers |
| `server/src/services/dashboard.ts` | Modify — populate investments/gold/properties in getNetWorth |
| `client/src/pages/finance/InvestmentsPage.tsx` | Create |
| `client/src/App.tsx` | Modify — add `/investments` route |
| `client/src/components/layout/Sidebar.tsx` | Modify — add Investments nav item |
| `docs/architecture.md` | Modify — schema + API sections |

---

## Task 1: Prisma schema — add all Phase 2 models

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add enums**

Open `server/prisma/schema.prisma`. After the existing `enum LendingStatus { … }` block (currently the last enum), append:

```prisma
enum MFSchemeType {
  equity
  debt
  hybrid
  elss
  liquid
  index
  other
}

enum MFTransactionType {
  sip
  lumpsum
  redemption
  switch_in
  switch_out
  dividend
  bonus
}

enum NPSTier {
  tier1
  tier2
}

enum PostOfficeSchemeType {
  nsc
  kvp
  scss
  mis
  td
  other
}

enum GoldPurity {
  k24
  k22
  k18
  k14
  other
}

enum GoldStorageLocation {
  home
  bank_locker
  relative
  other
}

enum PropertyType {
  residential_flat
  independent_house
  plot
  agricultural_land
  commercial
  other
}
```

- [ ] **Step 2: Add models**

After the existing `model LendingRepayment { … }` block (currently the last model), append:

```prisma
model MutualFund {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  fundName       String
  amcName        String
  schemeType     MFSchemeType
  folioLast4     String?
  sipAmount      BigInt?
  sipDate        Int?
  sipStartDate   DateTime?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  transactions MFTransaction[]

  @@index([userId])
  @@index([familyMemberId])
}

model MFTransaction {
  id        String            @id @default(cuid())
  fundId    String
  fund      MutualFund        @relation(fields: [fundId], references: [id], onDelete: Cascade)
  type      MFTransactionType
  amount    BigInt
  units     Float?
  nav       Float?
  date      DateTime
  notes     String?
  createdAt DateTime          @default(now())

  @@index([fundId])
}

model PPFAccount {
  id                 String       @id @default(cuid())
  userId             String
  user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId     String
  familyMember       FamilyMember @relation(fields: [familyMemberId], references: [id])
  accountLast4       String?
  bankOrPostOffice   String
  openingDate        DateTime
  maturityDate       DateTime
  currentBalance     BigInt       @default(0)
  annualContribution BigInt       @default(0)
  balanceUpdatedAt   DateTime     @default(now())
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([userId])
}

model EPFAccount {
  id                     String       @id @default(cuid())
  userId                 String
  user                   User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId         String
  familyMember           FamilyMember @relation(fields: [familyMemberId], references: [id])
  uanLast4               String?
  employerName           String
  monthlyEmployeeContrib BigInt       @default(0)
  monthlyEmployerContrib BigInt       @default(0)
  currentBalance         BigInt       @default(0)
  balanceUpdatedAt       DateTime     @default(now())
  isActive               Boolean      @default(true)
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt

  @@index([userId])
}

model NPSAccount {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId  String
  familyMember    FamilyMember @relation(fields: [familyMemberId], references: [id])
  pranLast4       String?
  tier            NPSTier
  monthlyContrib  BigInt       @default(0)
  currentCorpus   BigInt       @default(0)
  corpusUpdatedAt DateTime     @default(now())
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([userId])
}

model PostOfficeScheme {
  id               String               @id @default(cuid())
  userId           String
  user             User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId   String
  familyMember     FamilyMember         @relation(fields: [familyMemberId], references: [id])
  schemeType       PostOfficeSchemeType
  certificateLast4 String?
  amount           BigInt
  interestRate     Float
  purchaseDate     DateTime
  maturityDate     DateTime
  maturityAmount   BigInt
  isActive         Boolean              @default(true)
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  @@index([userId])
}

model SGBHolding {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  seriesName     String
  units          Float
  issuePrice     BigInt
  currentPrice   BigInt       @default(0)
  issueDate      DateTime
  maturityDate   DateTime
  interestRate   Float        @default(2.5)
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
}

model ChitFund {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  organizerName  String
  totalValue     BigInt
  monthlyContrib BigInt
  durationMonths Int
  startDate      DateTime
  endDate        DateTime
  monthWon       Int?
  prizeReceived  BigInt?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
}

model GoldHolding {
  id                   String              @id @default(cuid())
  userId               String
  user                 User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId       String
  familyMember         FamilyMember        @relation(fields: [familyMemberId], references: [id])
  description          String
  weightGrams          Float
  purity               GoldPurity
  purchaseDate         DateTime?
  purchasePricePerGram BigInt?
  currentPricePerGram  BigInt              @default(0)
  priceUpdatedAt       DateTime            @default(now())
  storageLocation      GoldStorageLocation @default(home)
  isActive             Boolean             @default(true)
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  @@index([userId])
  @@index([familyMemberId])
}

model Property {
  id                    String       @id @default(cuid())
  userId                String
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId        String
  familyMember          FamilyMember @relation(fields: [familyMemberId], references: [id])
  propertyType          PropertyType
  description           String
  areaValue             Float
  areaUnit              String       @default("sqft")
  purchaseDate          DateTime?
  purchasePrice         BigInt?
  currentValue          BigInt       @default(0)
  valueUpdatedAt        DateTime     @default(now())
  rentalIncome          BigInt       @default(0)
  saleDeedDate          DateTime?
  registrationRefLast6  String?
  linkedLoanId          String?
  isActive              Boolean      @default(true)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  @@index([userId])
  @@index([familyMemberId])
}
```

- [ ] **Step 3: Extend User model**

In `server/prisma/schema.prisma`, inside the `model User { … }` block, after the line `personalLendings PersonalLending[]`, add:

```prisma
  mutualFunds       MutualFund[]
  ppfAccounts       PPFAccount[]
  epfAccounts       EPFAccount[]
  npsAccounts       NPSAccount[]
  postOfficeSchemes PostOfficeScheme[]
  sgbHoldings       SGBHolding[]
  chitFunds         ChitFund[]
  goldHoldings      GoldHolding[]
  properties        Property[]
```

- [ ] **Step 4: Extend FamilyMember model**

Inside `model FamilyMember { … }`, after the line `expenses Expense[]`, add:

```prisma
  mutualFunds       MutualFund[]
  ppfAccounts       PPFAccount[]
  epfAccounts       EPFAccount[]
  npsAccounts       NPSAccount[]
  postOfficeSchemes PostOfficeScheme[]
  sgbHoldings       SGBHolding[]
  chitFunds         ChitFund[]
  goldHoldings      GoldHolding[]
  properties        Property[]
```

- [ ] **Step 5: Run migration**

```bash
cd server && npx prisma migrate dev --name add_phase2_investments
```

Expected: Migration created and applied, Prisma client regenerated. Should print something like `✓ Generated Prisma Client`.

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Phase 2 investment models to Prisma schema"
```

---

## Task 2: Shared types — add Phase 2 response interfaces

**Files:**
- Modify: `shared/src/types/finance.ts`

- [ ] **Step 1: Append types**

Open `shared/src/types/finance.ts`. At the end of the file, append:

```ts
// ── Phase 2 — Investments ──────────────────────────────────────────────────

export type MFSchemeType = 'equity' | 'debt' | 'hybrid' | 'elss' | 'liquid' | 'index' | 'other'
export type MFTransactionType = 'sip' | 'lumpsum' | 'redemption' | 'switch_in' | 'switch_out' | 'dividend' | 'bonus'
export type NPSTier = 'tier1' | 'tier2'
export type PostOfficeSchemeType = 'nsc' | 'kvp' | 'scss' | 'mis' | 'td' | 'other'
export type GoldPurity = 'k24' | 'k22' | 'k18' | 'k14' | 'other'
export type GoldStorageLocation = 'home' | 'bank_locker' | 'relative' | 'other'
export type PropertyType = 'residential_flat' | 'independent_house' | 'plot' | 'agricultural_land' | 'commercial' | 'other'

export interface MFTransactionResponse {
  id: string
  fundId: string
  type: MFTransactionType
  amount: number       // paise
  units: number | null
  nav: number | null
  date: string
  notes: string | null
  createdAt: string
}

export interface MutualFundResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  fundName: string
  amcName: string
  schemeType: MFSchemeType
  folioLast4: string | null
  sipAmount: number | null   // paise
  sipDate: number | null
  sipStartDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  transactions: MFTransactionResponse[]
  // computed
  totalUnits: number
  investedPaise: number
  avgBuyPrice: number        // paise per unit
}

export interface PPFAccountResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  accountLast4: string | null
  bankOrPostOffice: string
  openingDate: string
  maturityDate: string
  currentBalance: number     // paise
  annualContribution: number // paise
  balanceUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EPFAccountResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  uanLast4: string | null
  employerName: string
  monthlyEmployeeContrib: number // paise
  monthlyEmployerContrib: number // paise
  currentBalance: number         // paise
  balanceUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NPSAccountResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  pranLast4: string | null
  tier: NPSTier
  monthlyContrib: number  // paise
  currentCorpus: number   // paise
  corpusUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PostOfficeSchemeResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  schemeType: PostOfficeSchemeType
  certificateLast4: string | null
  amount: number         // paise — principal
  interestRate: number
  purchaseDate: string
  maturityDate: string
  maturityAmount: number // paise
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SGBHoldingResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  seriesName: string
  units: number
  issuePrice: number   // paise per gram
  currentPrice: number // paise per gram
  issueDate: string
  maturityDate: string
  interestRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  // computed
  investedPaise: number
  currentValue: number
}

export interface ChitFundResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  organizerName: string
  totalValue: number     // paise
  monthlyContrib: number // paise
  durationMonths: number
  startDate: string
  endDate: string
  monthWon: number | null
  prizeReceived: number | null // paise
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GoldHoldingResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  description: string
  weightGrams: number
  purity: GoldPurity
  purchaseDate: string | null
  purchasePricePerGram: number | null  // paise
  currentPricePerGram: number          // paise
  priceUpdatedAt: string
  storageLocation: GoldStorageLocation
  isActive: boolean
  createdAt: string
  updatedAt: string
  // computed
  currentValue: number // weightGrams * currentPricePerGram
}

export interface PropertyResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  propertyType: PropertyType
  description: string
  areaValue: number
  areaUnit: string
  purchaseDate: string | null
  purchasePrice: number | null  // paise
  currentValue: number          // paise
  valueUpdatedAt: string
  rentalIncome: number          // paise/month
  saleDeedDate: string | null
  registrationRefLast6: string | null
  linkedLoanId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InvestmentSummary {
  mutualFunds: { invested: number; currentValue: number }
  ppf: { balance: number }
  epf: { balance: number }
  nps: { corpus: number }
  postOffice: { invested: number; maturityValue: number }
  sgb: { units: number; currentValue: number }
  gold: { weightGrams: number; currentValue: number }
  properties: { purchaseValue: number; currentValue: number; rentalIncome: number }
  chitFunds: { totalContributed: number }
  total: { invested: number; currentValue: number }
}

export const MF_SCHEME_TYPE_LABELS: Record<MFSchemeType, string> = {
  equity: 'Equity Fund',
  debt: 'Debt Fund',
  hybrid: 'Hybrid Fund',
  elss: 'ELSS (Tax Saver)',
  liquid: 'Liquid Fund',
  index: 'Index Fund',
  other: 'Other',
}

export const POST_OFFICE_SCHEME_LABELS: Record<PostOfficeSchemeType, string> = {
  nsc: 'NSC (National Savings Certificate)',
  kvp: 'KVP (Kisan Vikas Patra)',
  scss: 'SCSS (Senior Citizen Savings)',
  mis: 'MIS (Monthly Income Scheme)',
  td: 'Time Deposit',
  other: 'Other',
}

export const GOLD_PURITY_LABELS: Record<GoldPurity, string> = {
  k24: '24K (Pure Gold)',
  k22: '22K',
  k18: '18K',
  k14: '14K',
  other: 'Other',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential_flat: 'Residential Flat / Apartment',
  independent_house: 'Independent House / Villa',
  plot: 'Plot / Land',
  agricultural_land: 'Agricultural Land',
  commercial: 'Commercial Property',
  other: 'Other',
}
```

- [ ] **Step 2: Build shared to verify no type errors**

```bash
cd shared && pnpm build
```

Expected: Compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add shared/src/types/finance.ts
git commit -m "feat: add Phase 2 shared types for all investment modules"
```

---

## Task 3: Mutual Funds — service + controller + routes

**Files:**
- Create: `server/src/services/mutualFunds.ts`
- Create: `server/src/controllers/mutualFunds.ts`
- Create: `server/src/routes/mutualFunds.ts`

- [ ] **Step 1: Create service**

Create `server/src/services/mutualFunds.ts`:

```ts
import { prisma } from "../models/prisma.js";
import type { MFTransactionType, MFSchemeType } from "@prisma/client";

const txInclude = { orderBy: { date: "asc" as const } };

function computeStats(fund: Awaited<ReturnType<typeof prisma.mutualFund.findMany>>[number] & { transactions: { type: MFTransactionType; amount: bigint; units: number | null }[] }) {
  const buyTypes: MFTransactionType[] = ["sip", "lumpsum", "bonus"];
  const sellTypes: MFTransactionType[] = ["redemption", "switch_out"];
  const buys = fund.transactions.filter((t) => buyTypes.includes(t.type));
  const sells = fund.transactions.filter((t) => sellTypes.includes(t.type));
  const boughtUnits = buys.reduce((s, t) => s + (t.units ?? 0), 0);
  const soldUnits = sells.reduce((s, t) => s + (t.units ?? 0), 0);
  const totalUnits = Math.max(0, boughtUnits - soldUnits);
  const buyPaise = buys.reduce((s, t) => s + Number(t.amount), 0);
  const sellPaise = sells.reduce((s, t) => s + Number(t.amount), 0);
  const investedPaise = Math.max(0, buyPaise - sellPaise);
  const avgBuyPrice = boughtUnits > 0 ? buyPaise / boughtUnits : 0;
  return { ...fund, totalUnits, investedPaise, avgBuyPrice };
}

export async function listFunds(userId: string) {
  const funds = await prisma.mutualFund.findMany({
    where: { userId, isActive: true },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: txInclude,
    },
    orderBy: { createdAt: "desc" },
  });
  return funds.map(computeStats);
}

export async function createFund(
  userId: string,
  data: {
    familyMemberId: string;
    fundName: string;
    amcName: string;
    schemeType: MFSchemeType;
    folioLast4?: string;
    sipAmount?: number;   // rupees
    sipDate?: number;
    sipStartDate?: string;
  }
) {
  return prisma.mutualFund.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      fundName: data.fundName,
      amcName: data.amcName,
      schemeType: data.schemeType,
      folioLast4: data.folioLast4 ?? null,
      sipAmount: data.sipAmount != null ? BigInt(Math.round(data.sipAmount * 100)) : null,
      sipDate: data.sipDate ?? null,
      sipStartDate: data.sipStartDate ? new Date(data.sipStartDate) : null,
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: txInclude,
    },
  }).then((f) => computeStats(f as any));
}

export async function updateFund(
  id: string,
  userId: string,
  data: {
    fundName?: string;
    amcName?: string;
    folioLast4?: string;
    sipAmount?: number | null;
    sipDate?: number | null;
    sipStartDate?: string | null;
  }
) {
  return prisma.mutualFund.update({
    where: { id, userId },
    data: {
      ...(data.fundName && { fundName: data.fundName }),
      ...(data.amcName && { amcName: data.amcName }),
      ...(data.folioLast4 !== undefined && { folioLast4: data.folioLast4 }),
      ...(data.sipAmount !== undefined && { sipAmount: data.sipAmount != null ? BigInt(Math.round(data.sipAmount * 100)) : null }),
      ...(data.sipDate !== undefined && { sipDate: data.sipDate }),
      ...(data.sipStartDate !== undefined && { sipStartDate: data.sipStartDate ? new Date(data.sipStartDate) : null }),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: txInclude,
    },
  }).then((f) => computeStats(f as any));
}

export async function deleteFund(id: string, userId: string) {
  return prisma.mutualFund.update({ where: { id, userId }, data: { isActive: false } });
}

export async function listTransactions(fundId: string, userId: string) {
  const fund = await prisma.mutualFund.findFirst({ where: { id: fundId, userId, isActive: true } });
  if (!fund) throw new Error("Not found");
  return prisma.mFTransaction.findMany({ where: { fundId }, orderBy: { date: "desc" } });
}

export async function addTransaction(
  fundId: string,
  userId: string,
  data: { type: MFTransactionType; amount: number; units?: number; nav?: number; date: string; notes?: string }
) {
  const fund = await prisma.mutualFund.findFirst({ where: { id: fundId, userId, isActive: true } });
  if (!fund) throw new Error("Not found");
  return prisma.mFTransaction.create({
    data: {
      fundId,
      type: data.type,
      amount: BigInt(Math.round(data.amount * 100)),
      units: data.units ?? null,
      nav: data.nav ?? null,
      date: new Date(data.date),
      notes: data.notes ?? null,
    },
  });
}

export async function deleteTransaction(txId: string, fundId: string, userId: string) {
  const fund = await prisma.mutualFund.findFirst({ where: { id: fundId, userId, isActive: true } });
  if (!fund) throw new Error("Not found");
  await prisma.mFTransaction.delete({ where: { id: txId, fundId } });
}
```

- [ ] **Step 2: Create controller**

Create `server/src/controllers/mutualFunds.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/mutualFunds.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const MF_SCHEME_TYPES = ["equity","debt","hybrid","elss","liquid","index","other"] as const;
const MF_TX_TYPES = ["sip","lumpsum","redemption","switch_in","switch_out","dividend","bonus"] as const;

const createFundSchema = z.object({
  familyMemberId: z.string().min(1),
  fundName: z.string().min(1).max(200),
  amcName: z.string().min(1).max(200),
  schemeType: z.enum(MF_SCHEME_TYPES),
  folioLast4: z.string().length(4).optional(),
  sipAmount: z.number().min(0).optional(),
  sipDate: z.number().int().min(1).max(28).optional(),
  sipStartDate: z.string().datetime().optional(),
});

const updateFundSchema = z.object({
  fundName: z.string().min(1).max(200).optional(),
  amcName: z.string().min(1).max(200).optional(),
  folioLast4: z.string().length(4).nullable().optional(),
  sipAmount: z.number().min(0).nullable().optional(),
  sipDate: z.number().int().min(1).max(28).nullable().optional(),
  sipStartDate: z.string().datetime().nullable().optional(),
});

const createTxSchema = z.object({
  type: z.enum(MF_TX_TYPES),
  amount: z.number().min(0),
  units: z.number().min(0).optional(),
  nav: z.number().min(0).optional(),
  date: z.string().datetime(),
  notes: z.string().max(200).optional(),
});

export async function list(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  res.json({ success: true, data: await svc.listFunds(userId) });
}

export async function create(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createFundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createFund(userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = updateFundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateFund(getParam(req.params.id), userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  await svc.deleteFund(getParam(req.params.id), userId);
  res.json({ success: true });
}

export async function listTransactions(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  res.json({ success: true, data: await svc.listTransactions(getParam(req.params.id), userId) });
}

export async function addTransaction(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.addTransaction(getParam(req.params.id), userId, parsed.data) });
}

export async function removeTransaction(req: Request, res: Response) {
  const userId = (req as AuthenticatedRequest).userId;
  await svc.deleteTransaction(getParam(req.params.txId), getParam(req.params.id), userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create routes**

Create `server/src/routes/mutualFunds.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/mutualFunds.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/:id/transactions", ctrl.listTransactions);
router.post("/:id/transactions", ctrl.addTransaction);
router.delete("/:id/transactions/:txId", ctrl.removeTransaction);

export { router as mutualFundsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/mutualFunds.ts server/src/controllers/mutualFunds.ts server/src/routes/mutualFunds.ts
git commit -m "feat: add Mutual Funds service, controller, and routes"
```

---

## Task 4: Mutual Funds — integration tests

**Files:**
- Create: `server/src/__tests__/mutualFunds.test.ts`

- [ ] **Step 1: Create test file**

Create `server/src/__tests__/mutualFunds.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "mf-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let fundId: string;
let txId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "MF Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat();
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Mutual Funds API", () => {
  it("POST /api/mutual-funds creates a fund", async () => {
    const res = await request(app)
      .post("/api/mutual-funds")
      .set("Cookie", cookies)
      .send({ familyMemberId: memberId, fundName: "Parag Parikh Flexi Cap", amcName: "PPFAS", schemeType: "equity" });
    expect(res.status).toBe(201);
    expect(res.body.data.fundName).toBe("Parag Parikh Flexi Cap");
    expect(res.body.data.totalUnits).toBe(0);
    fundId = res.body.data.id;
  });

  it("GET /api/mutual-funds lists all funds", async () => {
    const res = await request(app).get("/api/mutual-funds").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("POST /api/mutual-funds/:id/transactions records a SIP", async () => {
    const res = await request(app)
      .post(`/api/mutual-funds/${fundId}/transactions`)
      .set("Cookie", cookies)
      .send({ type: "sip", amount: 5000, units: 100.5, nav: 49.75, date: "2026-01-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.amount)).toBe(500000); // 5000 * 100 paise
    txId = res.body.data.id;
  });

  it("GET /api/mutual-funds returns computed totalUnits and investedPaise", async () => {
    const res = await request(app).get("/api/mutual-funds").set("Cookie", cookies);
    const fund = res.body.data.find((f: any) => f.id === fundId);
    expect(fund.totalUnits).toBeCloseTo(100.5);
    expect(fund.investedPaise).toBe(500000);
  });

  it("DELETE /api/mutual-funds/:id/transactions/:txId removes transaction", async () => {
    const res = await request(app).delete(`/api/mutual-funds/${fundId}/transactions/${txId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/mutual-funds/:id soft deletes fund", async () => {
    const res = await request(app).delete(`/api/mutual-funds/${fundId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/mutual-funds").set("Cookie", cookies);
    expect(list.body.data.find((f: any) => f.id === fundId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd server && pnpm test -- --reporter=verbose mutualFunds
```

Expected: All 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/mutualFunds.test.ts
git commit -m "test: add Mutual Funds integration tests"
```

---

## Task 5: PPF — service + controller + routes + test

**Files:**
- Create: `server/src/services/ppf.ts`
- Create: `server/src/controllers/ppf.ts`
- Create: `server/src/routes/ppf.ts`
- Create: `server/src/__tests__/ppf.test.ts`

- [ ] **Step 1: Create PPF service**

Create `server/src/services/ppf.ts`:

```ts
import { prisma } from "../models/prisma.js";

export async function listPPF(userId: string) {
  return prisma.pPFAccount.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPPF(
  userId: string,
  data: {
    familyMemberId: string;
    accountLast4?: string;
    bankOrPostOffice: string;
    openingDate: string;
    maturityDate: string;
    currentBalance?: number;   // rupees
    annualContribution?: number; // rupees
  }
) {
  return prisma.pPFAccount.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      accountLast4: data.accountLast4 ?? null,
      bankOrPostOffice: data.bankOrPostOffice,
      openingDate: new Date(data.openingDate),
      maturityDate: new Date(data.maturityDate),
      currentBalance: data.currentBalance != null ? BigInt(Math.round(data.currentBalance * 100)) : BigInt(0),
      annualContribution: data.annualContribution != null ? BigInt(Math.round(data.annualContribution * 100)) : BigInt(0),
      balanceUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updatePPF(
  id: string,
  userId: string,
  data: {
    accountLast4?: string;
    bankOrPostOffice?: string;
    currentBalance?: number;
    annualContribution?: number;
    maturityDate?: string;
  }
) {
  return prisma.pPFAccount.update({
    where: { id, userId },
    data: {
      ...(data.accountLast4 !== undefined && { accountLast4: data.accountLast4 }),
      ...(data.bankOrPostOffice && { bankOrPostOffice: data.bankOrPostOffice }),
      ...(data.currentBalance !== undefined && {
        currentBalance: BigInt(Math.round(data.currentBalance * 100)),
        balanceUpdatedAt: new Date(),
      }),
      ...(data.annualContribution !== undefined && { annualContribution: BigInt(Math.round(data.annualContribution * 100)) }),
      ...(data.maturityDate && { maturityDate: new Date(data.maturityDate) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deletePPF(id: string, userId: string) {
  return prisma.pPFAccount.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create PPF controller**

Create `server/src/controllers/ppf.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/ppf.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  accountLast4: z.string().length(4).optional(),
  bankOrPostOffice: z.string().min(1).max(100),
  openingDate: z.string().datetime(),
  maturityDate: z.string().datetime(),
  currentBalance: z.number().min(0).optional(),
  annualContribution: z.number().min(0).optional(),
});

const updateSchema = z.object({
  accountLast4: z.string().length(4).optional(),
  bankOrPostOffice: z.string().min(1).max(100).optional(),
  currentBalance: z.number().min(0).optional(),
  annualContribution: z.number().min(0).optional(),
  maturityDate: z.string().datetime().optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listPPF((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createPPF((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updatePPF(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deletePPF(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create PPF routes**

Create `server/src/routes/ppf.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/ppf.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as ppfRouter };
```

- [ ] **Step 4: Create PPF test**

Create `server/src/__tests__/ppf.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "ppf-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let ppfId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "PPF Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat();
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("PPF API", () => {
  it("POST /api/ppf creates a PPF account", async () => {
    const res = await request(app)
      .post("/api/ppf")
      .set("Cookie", cookies)
      .send({
        familyMemberId: memberId,
        bankOrPostOffice: "State Bank of India",
        openingDate: "2020-04-01T00:00:00.000Z",
        maturityDate: "2035-04-01T00:00:00.000Z",
        currentBalance: 150000,
        annualContribution: 50000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.bankOrPostOffice).toBe("State Bank of India");
    expect(res.body.data.currentBalance).toBe(15000000); // 150000 * 100
    ppfId = res.body.data.id;
  });

  it("GET /api/ppf lists accounts", async () => {
    const res = await request(app).get("/api/ppf").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("PUT /api/ppf/:id updates balance", async () => {
    const res = await request(app).put(`/api/ppf/${ppfId}`).set("Cookie", cookies).send({ currentBalance: 200000 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentBalance).toBe(20000000);
  });

  it("DELETE /api/ppf/:id soft deletes", async () => {
    const res = await request(app).delete(`/api/ppf/${ppfId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/ppf").set("Cookie", cookies);
    expect(list.body.data.find((a: any) => a.id === ppfId)).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd server && pnpm test -- --reporter=verbose ppf
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/ppf.ts server/src/controllers/ppf.ts server/src/routes/ppf.ts server/src/__tests__/ppf.test.ts
git commit -m "feat: add PPF service, controller, routes, and tests"
```

---

## Task 6: EPF — service + controller + routes

**Files:**
- Create: `server/src/services/epf.ts`
- Create: `server/src/controllers/epf.ts`
- Create: `server/src/routes/epf.ts`

- [ ] **Step 1: Create EPF service**

Create `server/src/services/epf.ts`:

```ts
import { prisma } from "../models/prisma.js";

export async function listEPF(userId: string) {
  return prisma.ePFAccount.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createEPF(
  userId: string,
  data: {
    familyMemberId: string;
    uanLast4?: string;
    employerName: string;
    monthlyEmployeeContrib?: number;
    monthlyEmployerContrib?: number;
    currentBalance?: number;
  }
) {
  return prisma.ePFAccount.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      uanLast4: data.uanLast4 ?? null,
      employerName: data.employerName,
      monthlyEmployeeContrib: data.monthlyEmployeeContrib != null ? BigInt(Math.round(data.monthlyEmployeeContrib * 100)) : BigInt(0),
      monthlyEmployerContrib: data.monthlyEmployerContrib != null ? BigInt(Math.round(data.monthlyEmployerContrib * 100)) : BigInt(0),
      currentBalance: data.currentBalance != null ? BigInt(Math.round(data.currentBalance * 100)) : BigInt(0),
      balanceUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateEPF(
  id: string,
  userId: string,
  data: {
    employerName?: string;
    monthlyEmployeeContrib?: number;
    monthlyEmployerContrib?: number;
    currentBalance?: number;
  }
) {
  return prisma.ePFAccount.update({
    where: { id, userId },
    data: {
      ...(data.employerName && { employerName: data.employerName }),
      ...(data.monthlyEmployeeContrib !== undefined && { monthlyEmployeeContrib: BigInt(Math.round(data.monthlyEmployeeContrib * 100)) }),
      ...(data.monthlyEmployerContrib !== undefined && { monthlyEmployerContrib: BigInt(Math.round(data.monthlyEmployerContrib * 100)) }),
      ...(data.currentBalance !== undefined && { currentBalance: BigInt(Math.round(data.currentBalance * 100)), balanceUpdatedAt: new Date() }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteEPF(id: string, userId: string) {
  return prisma.ePFAccount.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create EPF controller**

Create `server/src/controllers/epf.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/epf.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  uanLast4: z.string().length(4).optional(),
  employerName: z.string().min(1).max(200),
  monthlyEmployeeContrib: z.number().min(0).optional(),
  monthlyEmployerContrib: z.number().min(0).optional(),
  currentBalance: z.number().min(0).optional(),
});

const updateSchema = z.object({
  employerName: z.string().min(1).max(200).optional(),
  monthlyEmployeeContrib: z.number().min(0).optional(),
  monthlyEmployerContrib: z.number().min(0).optional(),
  currentBalance: z.number().min(0).optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listEPF((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createEPF((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateEPF(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteEPF(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create EPF routes**

Create `server/src/routes/epf.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/epf.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as epfRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/epf.ts server/src/controllers/epf.ts server/src/routes/epf.ts
git commit -m "feat: add EPF service, controller, and routes"
```

---

## Task 7: NPS — service + controller + routes

**Files:**
- Create: `server/src/services/nps.ts`
- Create: `server/src/controllers/nps.ts`
- Create: `server/src/routes/nps.ts`

- [ ] **Step 1: Create NPS service**

Create `server/src/services/nps.ts`:

```ts
import { prisma } from "../models/prisma.js";
import type { NPSTier } from "@prisma/client";

export async function listNPS(userId: string) {
  return prisma.nPSAccount.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createNPS(
  userId: string,
  data: {
    familyMemberId: string;
    pranLast4?: string;
    tier: NPSTier;
    monthlyContrib?: number;
    currentCorpus?: number;
  }
) {
  return prisma.nPSAccount.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      pranLast4: data.pranLast4 ?? null,
      tier: data.tier,
      monthlyContrib: data.monthlyContrib != null ? BigInt(Math.round(data.monthlyContrib * 100)) : BigInt(0),
      currentCorpus: data.currentCorpus != null ? BigInt(Math.round(data.currentCorpus * 100)) : BigInt(0),
      corpusUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateNPS(
  id: string,
  userId: string,
  data: { monthlyContrib?: number; currentCorpus?: number; pranLast4?: string }
) {
  return prisma.nPSAccount.update({
    where: { id, userId },
    data: {
      ...(data.pranLast4 !== undefined && { pranLast4: data.pranLast4 }),
      ...(data.monthlyContrib !== undefined && { monthlyContrib: BigInt(Math.round(data.monthlyContrib * 100)) }),
      ...(data.currentCorpus !== undefined && { currentCorpus: BigInt(Math.round(data.currentCorpus * 100)), corpusUpdatedAt: new Date() }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteNPS(id: string, userId: string) {
  return prisma.nPSAccount.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create NPS controller**

Create `server/src/controllers/nps.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/nps.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  pranLast4: z.string().length(4).optional(),
  tier: z.enum(["tier1", "tier2"]),
  monthlyContrib: z.number().min(0).optional(),
  currentCorpus: z.number().min(0).optional(),
});

const updateSchema = z.object({
  pranLast4: z.string().length(4).optional(),
  monthlyContrib: z.number().min(0).optional(),
  currentCorpus: z.number().min(0).optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listNPS((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createNPS((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateNPS(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteNPS(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create NPS routes**

Create `server/src/routes/nps.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/nps.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as npsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/nps.ts server/src/controllers/nps.ts server/src/routes/nps.ts
git commit -m "feat: add NPS service, controller, and routes"
```

---

## Task 8: Post Office Schemes — service + controller + routes

**Files:**
- Create: `server/src/services/postOffice.ts`
- Create: `server/src/controllers/postOffice.ts`
- Create: `server/src/routes/postOffice.ts`

- [ ] **Step 1: Create Post Office service**

Create `server/src/services/postOffice.ts`:

```ts
import { prisma } from "../models/prisma.js";
import type { PostOfficeSchemeType } from "@prisma/client";

export async function listPostOffice(userId: string) {
  return prisma.postOfficeScheme.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { purchaseDate: "desc" },
  });
}

export async function createPostOffice(
  userId: string,
  data: {
    familyMemberId: string;
    schemeType: PostOfficeSchemeType;
    certificateLast4?: string;
    amount: number;         // rupees
    interestRate: number;
    purchaseDate: string;
    maturityDate: string;
    maturityAmount: number; // rupees
  }
) {
  return prisma.postOfficeScheme.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      schemeType: data.schemeType,
      certificateLast4: data.certificateLast4 ?? null,
      amount: BigInt(Math.round(data.amount * 100)),
      interestRate: data.interestRate,
      purchaseDate: new Date(data.purchaseDate),
      maturityDate: new Date(data.maturityDate),
      maturityAmount: BigInt(Math.round(data.maturityAmount * 100)),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updatePostOffice(
  id: string,
  userId: string,
  data: {
    certificateLast4?: string;
    amount?: number;
    interestRate?: number;
    maturityDate?: string;
    maturityAmount?: number;
  }
) {
  return prisma.postOfficeScheme.update({
    where: { id, userId },
    data: {
      ...(data.certificateLast4 !== undefined && { certificateLast4: data.certificateLast4 }),
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.interestRate !== undefined && { interestRate: data.interestRate }),
      ...(data.maturityDate && { maturityDate: new Date(data.maturityDate) }),
      ...(data.maturityAmount !== undefined && { maturityAmount: BigInt(Math.round(data.maturityAmount * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deletePostOffice(id: string, userId: string) {
  return prisma.postOfficeScheme.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create Post Office controller**

Create `server/src/controllers/postOffice.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/postOffice.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const PO_TYPES = ["nsc","kvp","scss","mis","td","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  schemeType: z.enum(PO_TYPES),
  certificateLast4: z.string().length(4).optional(),
  amount: z.number().min(1),
  interestRate: z.number().min(0),
  purchaseDate: z.string().datetime(),
  maturityDate: z.string().datetime(),
  maturityAmount: z.number().min(1),
});

const updateSchema = z.object({
  certificateLast4: z.string().length(4).optional(),
  amount: z.number().min(1).optional(),
  interestRate: z.number().min(0).optional(),
  maturityDate: z.string().datetime().optional(),
  maturityAmount: z.number().min(1).optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listPostOffice((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createPostOffice((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updatePostOffice(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deletePostOffice(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create Post Office routes**

Create `server/src/routes/postOffice.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/postOffice.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as postOfficeRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/postOffice.ts server/src/controllers/postOffice.ts server/src/routes/postOffice.ts
git commit -m "feat: add Post Office Schemes service, controller, and routes"
```

---

## Task 9: SGB — service + controller + routes

**Files:**
- Create: `server/src/services/sgb.ts`
- Create: `server/src/controllers/sgb.ts`
- Create: `server/src/routes/sgb.ts`

- [ ] **Step 1: Create SGB service**

Create `server/src/services/sgb.ts`:

```ts
import { prisma } from "../models/prisma.js";

function withComputedValue(holding: { units: number; issuePrice: bigint; currentPrice: bigint; [key: string]: any }) {
  return {
    ...holding,
    investedPaise: holding.units * Number(holding.issuePrice),
    currentValue: holding.units * Number(holding.currentPrice),
  };
}

export async function listSGB(userId: string) {
  const holdings = await prisma.sGBHolding.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { issueDate: "desc" },
  });
  return holdings.map(withComputedValue);
}

export async function createSGB(
  userId: string,
  data: {
    familyMemberId: string;
    seriesName: string;
    units: number;
    issuePrice: number;     // rupees per gram
    currentPrice?: number;  // rupees per gram
    issueDate: string;
    maturityDate: string;
    interestRate?: number;
  }
) {
  return prisma.sGBHolding.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      seriesName: data.seriesName,
      units: data.units,
      issuePrice: BigInt(Math.round(data.issuePrice * 100)),
      currentPrice: data.currentPrice != null ? BigInt(Math.round(data.currentPrice * 100)) : BigInt(0),
      issueDate: new Date(data.issueDate),
      maturityDate: new Date(data.maturityDate),
      interestRate: data.interestRate ?? 2.5,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  }).then(withComputedValue);
}

export async function updateSGB(
  id: string,
  userId: string,
  data: { currentPrice?: number; units?: number; seriesName?: string }
) {
  return prisma.sGBHolding.update({
    where: { id, userId },
    data: {
      ...(data.seriesName && { seriesName: data.seriesName }),
      ...(data.units !== undefined && { units: data.units }),
      ...(data.currentPrice !== undefined && { currentPrice: BigInt(Math.round(data.currentPrice * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  }).then(withComputedValue);
}

export async function deleteSGB(id: string, userId: string) {
  return prisma.sGBHolding.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create SGB controller**

Create `server/src/controllers/sgb.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/sgb.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  seriesName: z.string().min(1).max(200),
  units: z.number().min(0.001),
  issuePrice: z.number().min(1),
  currentPrice: z.number().min(0).optional(),
  issueDate: z.string().datetime(),
  maturityDate: z.string().datetime(),
  interestRate: z.number().min(0).optional(),
});

const updateSchema = z.object({
  seriesName: z.string().min(1).max(200).optional(),
  units: z.number().min(0).optional(),
  currentPrice: z.number().min(0).optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listSGB((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createSGB((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateSGB(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteSGB(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create SGB routes**

Create `server/src/routes/sgb.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/sgb.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as sgbRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/sgb.ts server/src/controllers/sgb.ts server/src/routes/sgb.ts
git commit -m "feat: add SGB service, controller, and routes"
```

---

## Task 10: Chit Funds — service + controller + routes

**Files:**
- Create: `server/src/services/chitFunds.ts`
- Create: `server/src/controllers/chitFunds.ts`
- Create: `server/src/routes/chitFunds.ts`

- [ ] **Step 1: Create Chit Funds service**

Create `server/src/services/chitFunds.ts`:

```ts
import { prisma } from "../models/prisma.js";

export async function listChitFunds(userId: string) {
  return prisma.chitFund.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { startDate: "desc" },
  });
}

export async function createChitFund(
  userId: string,
  data: {
    familyMemberId: string;
    organizerName: string;
    totalValue: number;       // rupees
    monthlyContrib: number;   // rupees
    durationMonths: number;
    startDate: string;
    endDate: string;
    monthWon?: number;
    prizeReceived?: number;   // rupees
  }
) {
  return prisma.chitFund.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      organizerName: data.organizerName,
      totalValue: BigInt(Math.round(data.totalValue * 100)),
      monthlyContrib: BigInt(Math.round(data.monthlyContrib * 100)),
      durationMonths: data.durationMonths,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      monthWon: data.monthWon ?? null,
      prizeReceived: data.prizeReceived != null ? BigInt(Math.round(data.prizeReceived * 100)) : null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateChitFund(
  id: string,
  userId: string,
  data: { organizerName?: string; monthWon?: number | null; prizeReceived?: number | null; monthlyContrib?: number }
) {
  return prisma.chitFund.update({
    where: { id, userId },
    data: {
      ...(data.organizerName && { organizerName: data.organizerName }),
      ...(data.monthWon !== undefined && { monthWon: data.monthWon }),
      ...(data.prizeReceived !== undefined && { prizeReceived: data.prizeReceived != null ? BigInt(Math.round(data.prizeReceived * 100)) : null }),
      ...(data.monthlyContrib !== undefined && { monthlyContrib: BigInt(Math.round(data.monthlyContrib * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteChitFund(id: string, userId: string) {
  return prisma.chitFund.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create Chit Funds controller**

Create `server/src/controllers/chitFunds.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/chitFunds.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  organizerName: z.string().min(1).max(200),
  totalValue: z.number().min(1),
  monthlyContrib: z.number().min(1),
  durationMonths: z.number().int().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  monthWon: z.number().int().min(1).optional(),
  prizeReceived: z.number().min(0).optional(),
});

const updateSchema = z.object({
  organizerName: z.string().min(1).max(200).optional(),
  monthlyContrib: z.number().min(1).optional(),
  monthWon: z.number().int().min(1).nullable().optional(),
  prizeReceived: z.number().min(0).nullable().optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listChitFunds((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createChitFund((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateChitFund(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteChitFund(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create Chit Funds routes**

Create `server/src/routes/chitFunds.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/chitFunds.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as chitFundsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/chitFunds.ts server/src/controllers/chitFunds.ts server/src/routes/chitFunds.ts
git commit -m "feat: add Chit Funds service, controller, and routes"
```

---

## Task 11: Gold — service + controller + routes

**Files:**
- Create: `server/src/services/gold.ts`
- Create: `server/src/controllers/gold.ts`
- Create: `server/src/routes/gold.ts`

- [ ] **Step 1: Create Gold service**

Create `server/src/services/gold.ts`:

```ts
import { prisma } from "../models/prisma.js";
import type { GoldPurity, GoldStorageLocation } from "@prisma/client";

function withCurrentValue(h: { weightGrams: number; currentPricePerGram: bigint; [key: string]: any }) {
  return { ...h, currentValue: Math.round(h.weightGrams * Number(h.currentPricePerGram)) };
}

export async function listGold(userId: string) {
  const holdings = await prisma.goldHolding.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
  return holdings.map(withCurrentValue);
}

export async function createGold(
  userId: string,
  data: {
    familyMemberId: string;
    description: string;
    weightGrams: number;
    purity: GoldPurity;
    purchaseDate?: string;
    purchasePricePerGram?: number;
    currentPricePerGram?: number;
    storageLocation?: GoldStorageLocation;
  }
) {
  return prisma.goldHolding.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      description: data.description,
      weightGrams: data.weightGrams,
      purity: data.purity,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePricePerGram: data.purchasePricePerGram != null ? BigInt(Math.round(data.purchasePricePerGram * 100)) : null,
      currentPricePerGram: data.currentPricePerGram != null ? BigInt(Math.round(data.currentPricePerGram * 100)) : BigInt(0),
      storageLocation: data.storageLocation ?? "home",
      priceUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  }).then(withCurrentValue);
}

export async function updateGold(
  id: string,
  userId: string,
  data: {
    description?: string;
    weightGrams?: number;
    currentPricePerGram?: number;
    storageLocation?: GoldStorageLocation;
  }
) {
  return prisma.goldHolding.update({
    where: { id, userId },
    data: {
      ...(data.description && { description: data.description }),
      ...(data.weightGrams !== undefined && { weightGrams: data.weightGrams }),
      ...(data.currentPricePerGram !== undefined && {
        currentPricePerGram: BigInt(Math.round(data.currentPricePerGram * 100)),
        priceUpdatedAt: new Date(),
      }),
      ...(data.storageLocation && { storageLocation: data.storageLocation }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  }).then(withCurrentValue);
}

export async function deleteGold(id: string, userId: string) {
  return prisma.goldHolding.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create Gold controller**

Create `server/src/controllers/gold.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/gold.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const PURITY = ["k24","k22","k18","k14","other"] as const;
const STORAGE = ["home","bank_locker","relative","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  description: z.string().min(1).max(200),
  weightGrams: z.number().min(0.001),
  purity: z.enum(PURITY),
  purchaseDate: z.string().datetime().optional(),
  purchasePricePerGram: z.number().min(0).optional(),
  currentPricePerGram: z.number().min(0).optional(),
  storageLocation: z.enum(STORAGE).optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  weightGrams: z.number().min(0.001).optional(),
  currentPricePerGram: z.number().min(0).optional(),
  storageLocation: z.enum(STORAGE).optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listGold((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createGold((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateGold(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteGold(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create Gold routes**

Create `server/src/routes/gold.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/gold.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as goldRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/gold.ts server/src/controllers/gold.ts server/src/routes/gold.ts
git commit -m "feat: add Gold Holding service, controller, and routes"
```

---

## Task 12: Properties — service + controller + routes

**Files:**
- Create: `server/src/services/properties.ts`
- Create: `server/src/controllers/properties.ts`
- Create: `server/src/routes/properties.ts`

- [ ] **Step 1: Create Properties service**

Create `server/src/services/properties.ts`:

```ts
import { prisma } from "../models/prisma.js";
import type { PropertyType } from "@prisma/client";

export async function listProperties(userId: string) {
  return prisma.property.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProperty(
  userId: string,
  data: {
    familyMemberId: string;
    propertyType: PropertyType;
    description: string;
    areaValue: number;
    areaUnit?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    rentalIncome?: number;
    saleDeedDate?: string;
    registrationRefLast6?: string;
    linkedLoanId?: string;
  }
) {
  return prisma.property.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      propertyType: data.propertyType,
      description: data.description,
      areaValue: data.areaValue,
      areaUnit: data.areaUnit ?? "sqft",
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice != null ? BigInt(Math.round(data.purchasePrice * 100)) : null,
      currentValue: data.currentValue != null ? BigInt(Math.round(data.currentValue * 100)) : BigInt(0),
      rentalIncome: data.rentalIncome != null ? BigInt(Math.round(data.rentalIncome * 100)) : BigInt(0),
      saleDeedDate: data.saleDeedDate ? new Date(data.saleDeedDate) : null,
      registrationRefLast6: data.registrationRefLast6 ?? null,
      linkedLoanId: data.linkedLoanId ?? null,
      valueUpdatedAt: new Date(),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateProperty(
  id: string,
  userId: string,
  data: {
    description?: string;
    currentValue?: number;
    rentalIncome?: number;
    registrationRefLast6?: string;
    linkedLoanId?: string | null;
  }
) {
  return prisma.property.update({
    where: { id, userId },
    data: {
      ...(data.description && { description: data.description }),
      ...(data.currentValue !== undefined && { currentValue: BigInt(Math.round(data.currentValue * 100)), valueUpdatedAt: new Date() }),
      ...(data.rentalIncome !== undefined && { rentalIncome: BigInt(Math.round(data.rentalIncome * 100)) }),
      ...(data.registrationRefLast6 !== undefined && { registrationRefLast6: data.registrationRefLast6 }),
      ...(data.linkedLoanId !== undefined && { linkedLoanId: data.linkedLoanId }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteProperty(id: string, userId: string) {
  return prisma.property.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create Properties controller**

Create `server/src/controllers/properties.ts`:

```ts
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/properties.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const PROPERTY_TYPES = ["residential_flat","independent_house","plot","agricultural_land","commercial","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  propertyType: z.enum(PROPERTY_TYPES),
  description: z.string().min(1).max(300),
  areaValue: z.number().min(0),
  areaUnit: z.string().max(10).optional(),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  rentalIncome: z.number().min(0).optional(),
  saleDeedDate: z.string().datetime().optional(),
  registrationRefLast6: z.string().max(6).optional(),
  linkedLoanId: z.string().optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(300).optional(),
  currentValue: z.number().min(0).optional(),
  rentalIncome: z.number().min(0).optional(),
  registrationRefLast6: z.string().max(6).optional(),
  linkedLoanId: z.string().nullable().optional(),
});

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await svc.listProperties((req as AuthenticatedRequest).userId) });
}

export async function create(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.status(201).json({ success: true, data: await svc.createProperty((req as AuthenticatedRequest).userId, parsed.data) });
}

export async function update(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.message });
  res.json({ success: true, data: await svc.updateProperty(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed.data) });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteProperty(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
}
```

- [ ] **Step 3: Create Properties routes**

Create `server/src/routes/properties.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/properties.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as propertiesRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/properties.ts server/src/controllers/properties.ts server/src/routes/properties.ts
git commit -m "feat: add Properties service, controller, and routes"
```

---

## Task 13: Investment Summary — service + controller + routes + test

**Files:**
- Create: `server/src/services/investments.ts`
- Create: `server/src/controllers/investments.ts`
- Create: `server/src/routes/investments.ts`
- Create: `server/src/__tests__/investments.test.ts`

- [ ] **Step 1: Create investments summary service**

Create `server/src/services/investments.ts`:

```ts
import { prisma } from "../models/prisma.js";

export async function getInvestmentSummary(userId: string) {
  const [mfs, ppfAccounts, epfAccounts, npsAccounts, postOffice, sgb, gold, properties, chitFunds] = await Promise.all([
    prisma.mutualFund.findMany({
      where: { userId, isActive: true },
      include: { transactions: true },
    }),
    prisma.pPFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.ePFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.nPSAccount.findMany({ where: { userId, isActive: true } }),
    prisma.postOfficeScheme.findMany({ where: { userId, isActive: true } }),
    prisma.sGBHolding.findMany({ where: { userId, isActive: true } }),
    prisma.goldHolding.findMany({ where: { userId, isActive: true } }),
    prisma.property.findMany({ where: { userId, isActive: true } }),
    prisma.chitFund.findMany({ where: { userId, isActive: true } }),
  ]);

  const buyTypes = ["sip", "lumpsum", "bonus"] as const;
  const sellTypes = ["redemption", "switch_out"] as const;

  // Mutual funds
  let mfInvested = 0;
  for (const fund of mfs) {
    const buyPaise = fund.transactions.filter((t) => (buyTypes as string[]).includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const sellPaise = fund.transactions.filter((t) => (sellTypes as string[]).includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    mfInvested += Math.max(0, buyPaise - sellPaise);
  }

  const ppfBalance = ppfAccounts.reduce((s, a) => s + Number(a.currentBalance), 0);
  const epfBalance = epfAccounts.reduce((s, a) => s + Number(a.currentBalance), 0);
  const npsCorpus = npsAccounts.reduce((s, a) => s + Number(a.currentCorpus), 0);

  const poInvested = postOffice.reduce((s, p) => s + Number(p.amount), 0);
  const poMaturity = postOffice.reduce((s, p) => s + Number(p.maturityAmount), 0);

  const sgbUnits = sgb.reduce((s, h) => s + h.units, 0);
  const sgbCurrentValue = sgb.reduce((s, h) => s + h.units * Number(h.currentPrice), 0);

  const goldWeightGrams = gold.reduce((s, h) => s + h.weightGrams, 0);
  const goldCurrentValue = gold.reduce((s, h) => s + h.weightGrams * Number(h.currentPricePerGram), 0);

  const propPurchaseValue = properties.reduce((s, p) => s + (p.purchasePrice ? Number(p.purchasePrice) : 0), 0);
  const propCurrentValue = properties.reduce((s, p) => s + Number(p.currentValue), 0);
  const rentalIncome = properties.reduce((s, p) => s + Number(p.rentalIncome), 0);

  // Chit funds: contributed so far (full duration if won, else months elapsed)
  const now = new Date();
  const chitContributed = chitFunds.reduce((s, c) => {
    const start = c.startDate.getTime();
    const end = c.endDate.getTime();
    const progress = Math.min(1, (now.getTime() - start) / (end - start));
    const months = Math.ceil(progress * c.durationMonths);
    return s + Math.min(months, c.durationMonths) * Number(c.monthlyContrib);
  }, 0);

  const totalInvested = mfInvested + ppfBalance + epfBalance + npsCorpus + poInvested + sgbCurrentValue + goldCurrentValue + propCurrentValue;
  const totalCurrentValue = totalInvested; // Phase 2: current = invested (no live price feeds)

  return {
    mutualFunds: { invested: mfInvested, currentValue: mfInvested },
    ppf: { balance: ppfBalance },
    epf: { balance: epfBalance },
    nps: { corpus: npsCorpus },
    postOffice: { invested: poInvested, maturityValue: poMaturity },
    sgb: { units: sgbUnits, currentValue: sgbCurrentValue },
    gold: { weightGrams: goldWeightGrams, currentValue: Math.round(goldCurrentValue) },
    properties: { purchaseValue: propPurchaseValue, currentValue: propCurrentValue, rentalIncome },
    chitFunds: { totalContributed: Math.round(chitContributed) },
    total: { invested: totalInvested, currentValue: totalCurrentValue },
  };
}
```

- [ ] **Step 2: Create investments controller**

Create `server/src/controllers/investments.ts`:

```ts
import { Request, Response } from "express";
import * as svc from "../services/investments.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";

export async function summary(req: Request, res: Response) {
  const data = await svc.getInvestmentSummary((req as AuthenticatedRequest).userId);
  res.json({ success: true, data });
}
```

- [ ] **Step 3: Create investments routes**

Create `server/src/routes/investments.ts`:

```ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/investments.js";

const router: Router = Router();
router.use(authenticate);

router.get("/summary", ctrl.summary);

export { router as investmentsRouter };
```

- [ ] **Step 4: Create investments test**

Create `server/src/__tests__/investments.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "investments-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Inv Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat();
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Investment Summary API", () => {
  it("GET /api/investments/summary returns zeroed summary with no data", async () => {
    const res = await request(app).get("/api/investments/summary").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.total.invested).toBe(0);
    expect(res.body.data.mutualFunds.invested).toBe(0);
    expect(res.body.data.ppf.balance).toBe(0);
  });

  it("Summary reflects a PPF account balance", async () => {
    await request(app).post("/api/ppf").set("Cookie", cookies).send({
      familyMemberId: memberId,
      bankOrPostOffice: "SBI",
      openingDate: "2020-04-01T00:00:00.000Z",
      maturityDate: "2035-04-01T00:00:00.000Z",
      currentBalance: 100000,
    });
    const res = await request(app).get("/api/investments/summary").set("Cookie", cookies);
    expect(res.body.data.ppf.balance).toBe(10000000); // 100000 * 100
  });

  it("Summary reflects a gold holding", async () => {
    await request(app).post("/api/gold").set("Cookie", cookies).send({
      familyMemberId: memberId,
      description: "Gold chain",
      weightGrams: 10,
      purity: "k22",
      currentPricePerGram: 6000,
    });
    const res = await request(app).get("/api/investments/summary").set("Cookie", cookies);
    expect(res.body.data.gold.weightGrams).toBeCloseTo(10);
    expect(res.body.data.gold.currentValue).toBe(600000); // 10 * 6000 * 100
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd server && pnpm test -- --reporter=verbose investments
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/investments.ts server/src/controllers/investments.ts server/src/routes/investments.ts server/src/__tests__/investments.test.ts
git commit -m "feat: add Investment Summary service, controller, routes, and tests"
```

---

## Task 14: Register all routers + update dashboard net worth

**Files:**
- Modify: `server/src/app.ts`
- Modify: `server/src/services/dashboard.ts`

- [ ] **Step 1: Register all new routers in app.ts**

Open `server/src/app.ts`. After the existing imports block (after `import { lendingRouter }…`), add:

```ts
import { mutualFundsRouter } from "./routes/mutualFunds.js";
import { ppfRouter } from "./routes/ppf.js";
import { epfRouter } from "./routes/epf.js";
import { npsRouter } from "./routes/nps.js";
import { postOfficeRouter } from "./routes/postOffice.js";
import { sgbRouter } from "./routes/sgb.js";
import { chitFundsRouter } from "./routes/chitFunds.js";
import { goldRouter } from "./routes/gold.js";
import { propertiesRouter } from "./routes/properties.js";
import { investmentsRouter } from "./routes/investments.js";
```

After the line `app.use("/api/lending", lendingRouter);`, add:

```ts
app.use("/api/mutual-funds", mutualFundsRouter);
app.use("/api/ppf", ppfRouter);
app.use("/api/epf", epfRouter);
app.use("/api/nps", npsRouter);
app.use("/api/post-office-schemes", postOfficeRouter);
app.use("/api/sgb", sgbRouter);
app.use("/api/chit-funds", chitFundsRouter);
app.use("/api/gold", goldRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/investments", investmentsRouter);
```

- [ ] **Step 2: Update getNetWorth in dashboard service to include investments, gold, and properties**

Open `server/src/services/dashboard.ts`. Find the `getNetWorth` function. Replace its implementation with:

```ts
export async function getNetWorth(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [bankAccounts, loans, creditCards, lendings, incomes, expenses, ppfAccounts, epfAccounts, npsAccounts, postOffice, sgb, gold, properties] = await Promise.all([
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
    prisma.income.findMany({ where: { userId, isActive: true, month, year } }),
    prisma.expense.findMany({ where: { userId, isActive: true, date: { gte: monthStart, lte: monthEnd } } }),
    prisma.pPFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.ePFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.nPSAccount.findMany({ where: { userId, isActive: true } }),
    prisma.postOfficeScheme.findMany({ where: { userId, isActive: true } }),
    prisma.sGBHolding.findMany({ where: { userId, isActive: true } }),
    prisma.goldHolding.findMany({ where: { userId, isActive: true } }),
    prisma.property.findMany({ where: { userId, isActive: true } }),
  ]);

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

  const investmentsTotal =
    ppfAccounts.reduce((s, a) => s + Number(a.currentBalance), 0) +
    epfAccounts.reduce((s, a) => s + Number(a.currentBalance), 0) +
    npsAccounts.reduce((s, a) => s + Number(a.currentCorpus), 0) +
    postOffice.reduce((s, p) => s + Number(p.amount), 0) +
    sgb.reduce((s, h) => s + h.units * Number(h.currentPrice), 0);

  const goldTotal = gold.reduce((s, h) => s + Math.round(h.weightGrams * Number(h.currentPricePerGram)), 0);
  const propertiesTotal = properties.reduce((s, p) => s + Number(p.currentValue), 0);

  const loanOutstanding = loans.reduce((s, l) => s + Number(l.outstandingAmount), 0);
  const creditCardDues = creditCards.reduce((s, c) => s + Number(c.currentDue), 0);
  const borrowedFromOthers = lendings
    .filter((l) => l.direction === "borrowed" && l.status !== "settled")
    .reduce((s, l) => {
      const repaid = l.repayments.reduce((rs, r) => rs + Number(r.amount), 0);
      return s + Math.max(0, Number(l.principalAmount) - repaid);
    }, 0);

  const totalAssets = bankAndFD + lentToOthers + investmentsTotal + goldTotal + propertiesTotal;
  const totalLiabilities = loanOutstanding + creditCardDues + borrowedFromOthers;

  const monthlyIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;

  return {
    assets: { bankAndFD, investments: investmentsTotal, gold: goldTotal, properties: propertiesTotal, lentToOthers },
    liabilities: { loans: loanOutstanding, creditCards: creditCardDues, borrowedFromOthers },
    netWorth: totalAssets - totalLiabilities,
    monthlySummary: { month, year, income: monthlyIncome, expenses: monthlyExpenses, savingsRate },
  };
}
```

- [ ] **Step 3: Run the full server test suite**

```bash
cd server && pnpm test
```

Expected: All tests pass (may see some skips if DB not available in CI — that is fine).

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts server/src/services/dashboard.ts
git commit -m "feat: register all Phase 2 routers and update net worth to include investments, gold, properties"
```

---

## Task 15: Client — InvestmentsPage

**Files:**
- Create: `client/src/pages/finance/InvestmentsPage.tsx`

This page has 7 tabs. Each tab is self-contained with its own CRUD. The file is large but follows the same pattern as other finance pages in this codebase. Keep one file — no sub-components needed.

- [ ] **Step 1: Create InvestmentsPage**

Create `client/src/pages/finance/InvestmentsPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { formatINR, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type {
  ApiResponse,
  FamilyMemberResponse,
  InvestmentSummary,
  MutualFundResponse,
  MFTransactionType,
  PPFAccountResponse,
  EPFAccountResponse,
  NPSAccountResponse,
  PostOfficeSchemeResponse,
  SGBHoldingResponse,
  ChitFundResponse,
  GoldHoldingResponse,
  PropertyResponse,
} from "@diary/shared";
import {
  MF_SCHEME_TYPE_LABELS,
  POST_OFFICE_SCHEME_LABELS,
  GOLD_PURITY_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { key: "mf", label: "Mutual Funds" },
  { key: "ppf_epf_nps", label: "PPF / EPF / NPS" },
  { key: "gold", label: "Gold" },
  { key: "properties", label: "Properties" },
  { key: "post_office", label: "Post Office" },
  { key: "sgb", label: "SGB" },
  { key: "chit_funds", label: "Chit Funds" },
] as const;

type Tab = typeof TABS[number]["key"];

const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";
const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

// ── Mutual Funds tab ───────────────────────────────────────────────────────

const MF_SCHEME_TYPES = Object.keys(MF_SCHEME_TYPE_LABELS) as Array<keyof typeof MF_SCHEME_TYPE_LABELS>;
const MF_TX_TYPES: MFTransactionType[] = ["sip","lumpsum","redemption","switch_in","switch_out","dividend","bonus"];

interface MFForm { familyMemberId: string; fundName: string; amcName: string; schemeType: string; folioLast4: string; sipAmount: string; sipDate: string }
interface MFTxForm { type: MFTransactionType; amount: string; units: string; nav: string; date: string; notes: string }

function MFTab({ members }: { members: FamilyMemberResponse[] }) {
  const [funds, setFunds] = useState<MutualFundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MFForm>({ familyMemberId: "", fundName: "", amcName: "", schemeType: "equity", folioLast4: "", sipAmount: "", sipDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [txTargetId, setTxTargetId] = useState<string | null>(null);
  const [txForm, setTxForm] = useState<MFTxForm>({ type: "sip", amount: "", units: "", nav: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFunds((await api.get<ApiResponse<MutualFundResponse[]>>("/mutual-funds")).data ?? []); }
    catch { toast.error("Failed to load mutual funds"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitFund(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: form.familyMemberId, fundName: form.fundName, amcName: form.amcName, schemeType: form.schemeType };
    if (form.folioLast4.length === 4) body.folioLast4 = form.folioLast4;
    if (form.sipAmount) body.sipAmount = parseFloat(form.sipAmount);
    if (form.sipDate) body.sipDate = parseInt(form.sipDate);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/mutual-funds/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/mutual-funds", body); toast.success("Fund added"); }
      setShowAdd(false); setEditingId(null);
      setForm({ familyMemberId: "", fundName: "", amcName: "", schemeType: "equity", folioLast4: "", sipAmount: "", sipDate: "" });
      await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function submitTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txTargetId) return;
    const amount = parseFloat(txForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter valid amount"); return; }
    const body: any = { type: txForm.type, amount, date: new Date(txForm.date).toISOString() };
    if (txForm.units) body.units = parseFloat(txForm.units);
    if (txForm.nav) body.nav = parseFloat(txForm.nav);
    if (txForm.notes) body.notes = txForm.notes;
    try {
      await api.post(`/mutual-funds/${txTargetId}/transactions`, body);
      toast.success("Transaction added"); setTxTargetId(null);
      setTxForm({ type: "sip", amount: "", units: "", nav: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      await load();
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Fund</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Fund" : "Add Mutual Fund"}>
        <form onSubmit={submitFund} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Fund Name *</label>
            <input type="text" value={form.fundName} onChange={e => setForm(f => ({ ...f, fundName: e.target.value }))} required className={inputCls} placeholder="Parag Parikh Flexi Cap" />
          </div>
          <div><label className={labelCls}>AMC Name *</label>
            <input type="text" value={form.amcName} onChange={e => setForm(f => ({ ...f, amcName: e.target.value }))} required className={inputCls} placeholder="PPFAS" />
          </div>
          <div><label className={labelCls}>Scheme Type</label>
            <select value={form.schemeType} onChange={e => setForm(f => ({ ...f, schemeType: e.target.value }))} className={inputCls}>
              {MF_SCHEME_TYPES.map(t => <option key={t} value={t}>{MF_SCHEME_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Folio Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" maxLength={4} value={form.folioLast4} onChange={e => setForm(f => ({ ...f, folioLast4: e.target.value }))} className={inputCls} placeholder="1234" />
          </div>
          <div><label className={labelCls}>SIP Amount ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.sipAmount} onChange={e => setForm(f => ({ ...f, sipAmount: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>SIP Date (day 1-28) <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="1" max="28" value={form.sipDate} onChange={e => setForm(f => ({ ...f, sipDate: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={txTargetId !== null} onClose={() => setTxTargetId(null)} title="Add Transaction">
        <form onSubmit={submitTx} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Type</label>
            <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value as MFTransactionType }))} className={inputCls}>
              {MF_TX_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Amount ₹ *</label>
            <input type="number" min="0" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Units <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" step="0.001" value={txForm.units} onChange={e => setTxForm(f => ({ ...f, units: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>NAV <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" step="0.01" value={txForm.nav} onChange={e => setTxForm(f => ({ ...f, nav: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Date</label>
            <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Notes <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTxTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit">Add Transaction</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Fund" description="Soft-delete this fund and all its transactions?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/mutual-funds/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {funds.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-2">No mutual funds added yet</p>
          <ShimmerButton onClick={() => setShowAdd(true)}>Add Fund</ShimmerButton>
        </div>
      )}

      <div className="space-y-3">
        {funds.map(fund => (
          <div key={fund.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{fund.fundName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ocean-100 text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-400">{MF_SCHEME_TYPE_LABELS[fund.schemeType]}</span>
                </div>
                <p className="text-xs text-slate-400">{fund.amcName}{fund.folioLast4 ? ` · Folio …${fund.folioLast4}` : ""} · {fund.familyMember?.name}</p>
                <div className="grid grid-cols-3 gap-x-4 text-xs mt-2">
                  <div><span className="text-slate-400">Units</span><p className="font-semibold text-slate-800 dark:text-slate-200">{fund.totalUnits.toFixed(3)}</p></div>
                  <div><span className="text-slate-400">Invested</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(fund.investedPaise)}</p></div>
                  {fund.sipAmount ? <div><span className="text-slate-400">SIP</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(fund.sipAmount)}/mo</p></div> : null}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => setTxTargetId(fund.id)} className="text-xs px-2.5 py-1 rounded-lg bg-ocean-700 text-white hover:bg-ocean-600">+ Txn</button>
                <button onClick={() => { setEditingId(fund.id); setForm({ familyMemberId: fund.familyMemberId, fundName: fund.fundName, amcName: fund.amcName, schemeType: fund.schemeType, folioLast4: fund.folioLast4 ?? "", sipAmount: fund.sipAmount ? String(fund.sipAmount / 100) : "", sipDate: fund.sipDate ? String(fund.sipDate) : "" }); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTargetId(fund.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
            {fund.transactions.length > 0 && (
              <div className="mt-3">
                <button onClick={() => setExpandedId(expandedId === fund.id ? null : fund.id)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {expandedId === fund.id ? "Hide" : "Show"} {fund.transactions.length} transaction{fund.transactions.length !== 1 ? "s" : ""}
                </button>
                {expandedId === fund.id && (
                  <div className="mt-2 space-y-1">
                    {fund.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{formatDate(tx.date)} · {tx.type.replace("_", " ")}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{formatINR(tx.amount)}{tx.units ? ` · ${tx.units.toFixed(3)} units` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PPF / EPF / NPS tab ────────────────────────────────────────────────────

function PPFEPFNPSTab({ members }: { members: FamilyMemberResponse[] }) {
  const [ppf, setPPF] = useState<PPFAccountResponse[]>([]);
  const [epf, setEPF] = useState<EPFAccountResponse[]>([]);
  const [nps, setNPS] = useState<NPSAccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"ppf" | "epf" | "nps">("ppf");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "ppf" | "epf" | "nps" } | null>(null);

  // PPF form
  const [ppfForm, setPPFForm] = useState({ familyMemberId: "", accountLast4: "", bankOrPostOffice: "", openingDate: "", maturityDate: "", currentBalance: "", annualContribution: "" });
  // EPF form
  const [epfForm, setEPFForm] = useState({ familyMemberId: "", uanLast4: "", employerName: "", monthlyEmployeeContrib: "", monthlyEmployerContrib: "", currentBalance: "" });
  // NPS form
  const [npsForm, setNPSForm] = useState({ familyMemberId: "", pranLast4: "", tier: "tier1", monthlyContrib: "", currentCorpus: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e, n] = await Promise.all([
        api.get<ApiResponse<PPFAccountResponse[]>>("/ppf"),
        api.get<ApiResponse<EPFAccountResponse[]>>("/epf"),
        api.get<ApiResponse<NPSAccountResponse[]>>("/nps"),
      ]);
      setPPF(p.data ?? []); setEPF(e.data ?? []); setNPS(n.data ?? []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitPPF(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: ppfForm.familyMemberId, bankOrPostOffice: ppfForm.bankOrPostOffice, openingDate: new Date(ppfForm.openingDate).toISOString(), maturityDate: new Date(ppfForm.maturityDate).toISOString() };
    if (ppfForm.accountLast4.length === 4) body.accountLast4 = ppfForm.accountLast4;
    if (ppfForm.currentBalance) body.currentBalance = parseFloat(ppfForm.currentBalance);
    if (ppfForm.annualContribution) body.annualContribution = parseFloat(ppfForm.annualContribution);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/ppf/${editingId}`, { currentBalance: body.currentBalance, annualContribution: body.annualContribution }); toast.success("Updated"); }
      else { await api.post("/ppf", body); toast.success("PPF account added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function submitEPF(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: epfForm.familyMemberId, employerName: epfForm.employerName };
    if (epfForm.uanLast4.length === 4) body.uanLast4 = epfForm.uanLast4;
    if (epfForm.monthlyEmployeeContrib) body.monthlyEmployeeContrib = parseFloat(epfForm.monthlyEmployeeContrib);
    if (epfForm.monthlyEmployerContrib) body.monthlyEmployerContrib = parseFloat(epfForm.monthlyEmployerContrib);
    if (epfForm.currentBalance) body.currentBalance = parseFloat(epfForm.currentBalance);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/epf/${editingId}`, { currentBalance: body.currentBalance, employerName: body.employerName }); toast.success("Updated"); }
      else { await api.post("/epf", body); toast.success("EPF account added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function submitNPS(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: npsForm.familyMemberId, tier: npsForm.tier };
    if (npsForm.pranLast4.length === 4) body.pranLast4 = npsForm.pranLast4;
    if (npsForm.monthlyContrib) body.monthlyContrib = parseFloat(npsForm.monthlyContrib);
    if (npsForm.currentCorpus) body.currentCorpus = parseFloat(npsForm.currentCorpus);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/nps/${editingId}`, { currentCorpus: body.currentCorpus, monthlyContrib: body.monthlyContrib }); toast.success("Updated"); }
      else { await api.post("/nps", body); toast.success("NPS account added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/${deleteTarget.type}/${deleteTarget.id}`);
      toast.success("Removed"); setDeleteTarget(null); await load();
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 w-fit">
          {(["ppf","epf","nps"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${subTab === t ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add</ShimmerButton>
      </div>

      {/* PPF list */}
      {subTab === "ppf" && (
        <>
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit PPF" : "Add PPF Account"}>
            <form onSubmit={submitPPF} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && <>
                <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
                  <select value={ppfForm.familyMemberId} onChange={e => setPPFForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                    <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Bank / Post Office *</label>
                  <input type="text" value={ppfForm.bankOrPostOffice} onChange={e => setPPFForm(f => ({ ...f, bankOrPostOffice: e.target.value }))} required className={inputCls} />
                </div>
                <div><label className={labelCls}>Account Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" maxLength={4} value={ppfForm.accountLast4} onChange={e => setPPFForm(f => ({ ...f, accountLast4: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Opening Date *</label>
                  <input type="date" value={ppfForm.openingDate} onChange={e => setPPFForm(f => ({ ...f, openingDate: e.target.value }))} required className={inputCls} />
                </div>
                <div><label className={labelCls}>Maturity Date *</label>
                  <input type="date" value={ppfForm.maturityDate} onChange={e => setPPFForm(f => ({ ...f, maturityDate: e.target.value }))} required className={inputCls} />
                </div>
              </>}
              <div><label className={labelCls}>Current Balance ₹</label>
                <input type="number" min="0" value={ppfForm.currentBalance} onChange={e => setPPFForm(f => ({ ...f, currentBalance: e.target.value }))} className={inputCls} />
              </div>
              <div><label className={labelCls}>Annual Contribution ₹</label>
                <input type="number" min="0" value={ppfForm.annualContribution} onChange={e => setPPFForm(f => ({ ...f, annualContribution: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
                <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
              </div>
            </form>
          </Modal>
          {ppf.length === 0 && <p className="text-slate-400 text-center py-8">No PPF accounts. Click + Add to get started.</p>}
          {ppf.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{a.bankOrPostOffice}{a.accountLast4 ? ` …${a.accountLast4}` : ""}</p>
                <p className="text-xs text-slate-400">{a.familyMember?.name} · Matures {formatDate(a.maturityDate)}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.currentBalance)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditingId(a.id); setPPFForm(f => ({ ...f, currentBalance: String(a.currentBalance / 100), annualContribution: String(a.annualContribution / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, type: "ppf" })} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* EPF list */}
      {subTab === "epf" && (
        <>
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit EPF" : "Add EPF Account"}>
            <form onSubmit={submitEPF} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && <>
                <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
                  <select value={epfForm.familyMemberId} onChange={e => setEPFForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                    <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Employer Name *</label>
                  <input type="text" value={epfForm.employerName} onChange={e => setEPFForm(f => ({ ...f, employerName: e.target.value }))} required className={inputCls} />
                </div>
                <div><label className={labelCls}>UAN Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" maxLength={4} value={epfForm.uanLast4} onChange={e => setEPFForm(f => ({ ...f, uanLast4: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Employee Monthly Contrib ₹</label>
                  <input type="number" min="0" value={epfForm.monthlyEmployeeContrib} onChange={e => setEPFForm(f => ({ ...f, monthlyEmployeeContrib: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Employer Monthly Contrib ₹</label>
                  <input type="number" min="0" value={epfForm.monthlyEmployerContrib} onChange={e => setEPFForm(f => ({ ...f, monthlyEmployerContrib: e.target.value }))} className={inputCls} />
                </div>
              </>}
              <div className="sm:col-span-2"><label className={labelCls}>Current Balance ₹</label>
                <input type="number" min="0" value={epfForm.currentBalance} onChange={e => setEPFForm(f => ({ ...f, currentBalance: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
                <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
              </div>
            </form>
          </Modal>
          {epf.length === 0 && <p className="text-slate-400 text-center py-8">No EPF accounts. Click + Add to get started.</p>}
          {epf.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{a.employerName}{a.uanLast4 ? ` · UAN …${a.uanLast4}` : ""}</p>
                <p className="text-xs text-slate-400">{a.familyMember?.name}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.currentBalance)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditingId(a.id); setEPFForm(f => ({ ...f, currentBalance: String(a.currentBalance / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, type: "epf" })} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* NPS list */}
      {subTab === "nps" && (
        <>
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit NPS" : "Add NPS Account"}>
            <form onSubmit={submitNPS} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && <>
                <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
                  <select value={npsForm.familyMemberId} onChange={e => setNPSForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                    <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Tier</label>
                  <select value={npsForm.tier} onChange={e => setNPSForm(f => ({ ...f, tier: e.target.value }))} className={inputCls}>
                    <option value="tier1">Tier 1</option>
                    <option value="tier2">Tier 2</option>
                  </select>
                </div>
                <div><label className={labelCls}>PRAN Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" maxLength={4} value={npsForm.pranLast4} onChange={e => setNPSForm(f => ({ ...f, pranLast4: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Monthly Contribution ₹</label>
                  <input type="number" min="0" value={npsForm.monthlyContrib} onChange={e => setNPSForm(f => ({ ...f, monthlyContrib: e.target.value }))} className={inputCls} />
                </div>
              </>}
              <div className="sm:col-span-2"><label className={labelCls}>Current Corpus ₹</label>
                <input type="number" min="0" value={npsForm.currentCorpus} onChange={e => setNPSForm(f => ({ ...f, currentCorpus: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
                <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
              </div>
            </form>
          </Modal>
          {nps.length === 0 && <p className="text-slate-400 text-center py-8">No NPS accounts. Click + Add to get started.</p>}
          {nps.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">NPS {a.tier === "tier1" ? "Tier 1" : "Tier 2"}{a.pranLast4 ? ` · PRAN …${a.pranLast4}` : ""}</p>
                <p className="text-xs text-slate-400">{a.familyMember?.name}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.currentCorpus)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditingId(a.id); setNPSForm(f => ({ ...f, currentCorpus: String(a.currentCorpus / 100), monthlyContrib: String(a.monthlyContrib / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, type: "nps" })} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Remove Account" description="Remove this account?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>
    </div>
  );
}

// ── Gold tab ───────────────────────────────────────────────────────────────

const GOLD_PURITIES = Object.keys(GOLD_PURITY_LABELS) as Array<keyof typeof GOLD_PURITY_LABELS>;
const GOLD_STORAGE = ["home","bank_locker","relative","other"] as const;

function GoldTab({ members }: { members: FamilyMemberResponse[] }) {
  const [holdings, setHoldings] = useState<GoldHoldingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", description: "", weightGrams: "", purity: "k22", purchaseDate: "", purchasePricePerGram: "", currentPricePerGram: "", storageLocation: "home" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHoldings((await api.get<ApiResponse<GoldHoldingResponse[]>>("/gold")).data ?? []); }
    catch { toast.error("Failed to load gold holdings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { description: form.description, weightGrams: parseFloat(form.weightGrams), purity: form.purity };
    if (!editingId) { body.familyMemberId = form.familyMemberId; body.storageLocation = form.storageLocation; }
    if (form.purchaseDate) body.purchaseDate = new Date(form.purchaseDate).toISOString();
    if (form.purchasePricePerGram) body.purchasePricePerGram = parseFloat(form.purchasePricePerGram);
    if (form.currentPricePerGram) body.currentPricePerGram = parseFloat(form.currentPricePerGram);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/gold/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/gold", body); toast.success("Added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total: {formatINR(totalValue)}</p>
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Gold</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Gold Holding" : "Add Gold Holding"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>}
          <div className="sm:col-span-2"><label className={labelCls}>Description *</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className={inputCls} placeholder="Gold chain 20g" />
          </div>
          <div><label className={labelCls}>Weight (grams) *</label>
            <input type="number" min="0.001" step="0.001" value={form.weightGrams} onChange={e => setForm(f => ({ ...f, weightGrams: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Purity</label>
            <select value={form.purity} onChange={e => setForm(f => ({ ...f, purity: e.target.value }))} className={inputCls}>
              {GOLD_PURITIES.map(p => <option key={p} value={p}>{GOLD_PURITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Current Price/g ₹</label>
            <input type="number" min="0" value={form.currentPricePerGram} onChange={e => setForm(f => ({ ...f, currentPricePerGram: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Purchase Price/g ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.purchasePricePerGram} onChange={e => setForm(f => ({ ...f, purchasePricePerGram: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Purchase Date <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inputCls} />
          </div>
          {!editingId && <div><label className={labelCls}>Storage Location</label>
            <select value={form.storageLocation} onChange={e => setForm(f => ({ ...f, storageLocation: e.target.value }))} className={inputCls}>
              {GOLD_STORAGE.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Gold Holding" description="Remove this gold holding?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/gold/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {holdings.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No gold holdings</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Gold</ShimmerButton></div>}
      {holdings.map(h => (
        <div key={h.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{h.description}</p>
            <p className="text-xs text-slate-400">{h.weightGrams}g · {GOLD_PURITY_LABELS[h.purity]} · {h.familyMember?.name}</p>
            {h.currentPricePerGram > 0 && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(h.currentValue)} <span className="text-xs text-slate-400">@ {formatINR(h.currentPricePerGram)}/g</span></p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(h.id); setForm(f => ({ ...f, description: h.description, weightGrams: String(h.weightGrams), purity: h.purity, currentPricePerGram: h.currentPricePerGram > 0 ? String(h.currentPricePerGram / 100) : "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(h.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Properties tab ─────────────────────────────────────────────────────────

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as Array<keyof typeof PROPERTY_TYPE_LABELS>;

function PropertiesTab({ members }: { members: FamilyMemberResponse[] }) {
  const [props, setProps] = useState<PropertyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", propertyType: "residential_flat", description: "", areaValue: "", areaUnit: "sqft", purchaseDate: "", purchasePrice: "", currentValue: "", rentalIncome: "", registrationRefLast6: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProps((await api.get<ApiResponse<PropertyResponse[]>>("/properties")).data ?? []); }
    catch { toast.error("Failed to load properties"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/properties/${editingId}`, {
          description: form.description,
          currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
          rentalIncome: form.rentalIncome ? parseFloat(form.rentalIncome) : undefined,
          registrationRefLast6: form.registrationRefLast6 || undefined,
        });
        toast.success("Updated");
      } else {
        const body: any = { familyMemberId: form.familyMemberId, propertyType: form.propertyType, description: form.description, areaValue: parseFloat(form.areaValue), areaUnit: form.areaUnit };
        if (form.purchaseDate) body.purchaseDate = new Date(form.purchaseDate).toISOString();
        if (form.purchasePrice) body.purchasePrice = parseFloat(form.purchasePrice);
        if (form.currentValue) body.currentValue = parseFloat(form.currentValue);
        if (form.rentalIncome) body.rentalIncome = parseFloat(form.rentalIncome);
        if (form.registrationRefLast6) body.registrationRefLast6 = form.registrationRefLast6;
        await api.post("/properties", body);
        toast.success("Property added");
      }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  const totalValue = props.reduce((s, p) => s + p.currentValue, 0);
  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total value: {formatINR(totalValue)}</p>
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Property</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Property" : "Add Property"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <>
            <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
              <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Property Type</label>
              <select value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} className={inputCls}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Area</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={form.areaValue} onChange={e => setForm(f => ({ ...f, areaValue: e.target.value }))} required className={inputCls} placeholder="1200" />
                <select value={form.areaUnit} onChange={e => setForm(f => ({ ...f, areaUnit: e.target.value }))} className={inputCls + " w-28"}>
                  <option>sqft</option><option>sqm</option><option>cents</option><option>acres</option>
                </select>
              </div>
            </div>
            <div><label className={labelCls}>Purchase Date <span className="text-slate-400 text-xs">(optional)</span></label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inputCls} />
            </div>
            <div><label className={labelCls}>Purchase Price ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
              <input type="number" min="0" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} className={inputCls} />
            </div>
          </>}
          <div className="sm:col-span-2"><label className={labelCls}>Description *</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className={inputCls} placeholder="3BHK flat at Bandra" />
          </div>
          <div><label className={labelCls}>Current Value ₹</label>
            <input type="number" min="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Rental Income ₹/mo <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.rentalIncome} onChange={e => setForm(f => ({ ...f, rentalIncome: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Reg. Ref Last 6 <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" maxLength={6} value={form.registrationRefLast6} onChange={e => setForm(f => ({ ...f, registrationRefLast6: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Property" description="Remove this property record?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/properties/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {props.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No properties</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Property</ShimmerButton></div>}
      {props.map(p => (
        <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{p.description}</p>
            <p className="text-xs text-slate-400">{PROPERTY_TYPE_LABELS[p.propertyType]} · {p.areaValue} {p.areaUnit} · {p.familyMember?.name}</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(p.currentValue)}{p.rentalIncome > 0 ? ` · Rent ${formatINR(p.rentalIncome)}/mo` : ""}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(p.id); setForm(f => ({ ...f, description: p.description, currentValue: p.currentValue > 0 ? String(p.currentValue / 100) : "", rentalIncome: p.rentalIncome > 0 ? String(p.rentalIncome / 100) : "", registrationRefLast6: p.registrationRefLast6 ?? "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(p.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Post Office tab ────────────────────────────────────────────────────────

const PO_TYPES = Object.keys(POST_OFFICE_SCHEME_LABELS) as Array<keyof typeof POST_OFFICE_SCHEME_LABELS>;

function PostOfficeTab({ members }: { members: FamilyMemberResponse[] }) {
  const [schemes, setSchemes] = useState<PostOfficeSchemeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", schemeType: "nsc", certificateLast4: "", amount: "", interestRate: "", purchaseDate: "", maturityDate: "", maturityAmount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSchemes((await api.get<ApiResponse<PostOfficeSchemeResponse[]>>("/post-office-schemes")).data ?? []); }
    catch { toast.error("Failed to load post office schemes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: any = { schemeType: form.schemeType, amount: parseFloat(form.amount), interestRate: parseFloat(form.interestRate), purchaseDate: new Date(form.purchaseDate).toISOString(), maturityDate: new Date(form.maturityDate).toISOString(), maturityAmount: parseFloat(form.maturityAmount) };
      if (form.certificateLast4.length === 4) body.certificateLast4 = form.certificateLast4;
      if (!editingId) body.familyMemberId = form.familyMemberId;
      if (editingId) { await api.put(`/post-office-schemes/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/post-office-schemes", body); toast.success("Added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Scheme</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Scheme" : "Add Post Office Scheme"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>}
          <div><label className={labelCls}>Scheme Type</label>
            <select value={form.schemeType} onChange={e => setForm(f => ({ ...f, schemeType: e.target.value }))} className={inputCls}>
              {PO_TYPES.map(t => <option key={t} value={t}>{POST_OFFICE_SCHEME_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Certificate Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" maxLength={4} value={form.certificateLast4} onChange={e => setForm(f => ({ ...f, certificateLast4: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Principal Amount ₹ *</label>
            <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Interest Rate % *</label>
            <input type="number" min="0" step="0.01" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Purchase Date *</label>
            <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Maturity Date *</label>
            <input type="date" value={form.maturityDate} onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))} required className={inputCls} />
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Maturity Amount ₹ *</label>
            <input type="number" min="1" value={form.maturityAmount} onChange={e => setForm(f => ({ ...f, maturityAmount: e.target.value }))} required className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Scheme" description="Remove this scheme?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/post-office-schemes/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {schemes.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No post office schemes</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Scheme</ShimmerButton></div>}
      {schemes.map(s => (
        <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{POST_OFFICE_SCHEME_LABELS[s.schemeType]}{s.certificateLast4 ? ` …${s.certificateLast4}` : ""}</p>
            <p className="text-xs text-slate-400">{s.familyMember?.name} · {s.interestRate}% p.a. · Matures {formatDate(s.maturityDate)}</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(s.amount)} → {formatINR(s.maturityAmount)}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(s.id); setForm(f => ({ ...f, schemeType: s.schemeType, certificateLast4: s.certificateLast4 ?? "", amount: String(s.amount / 100), interestRate: String(s.interestRate), purchaseDate: s.purchaseDate.slice(0, 10), maturityDate: s.maturityDate.slice(0, 10), maturityAmount: String(s.maturityAmount / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(s.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SGB tab ────────────────────────────────────────────────────────────────

function SGBTab({ members }: { members: FamilyMemberResponse[] }) {
  const [holdings, setHoldings] = useState<SGBHoldingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", seriesName: "", units: "", issuePrice: "", currentPrice: "", issueDate: "", maturityDate: "", interestRate: "2.5" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHoldings((await api.get<ApiResponse<SGBHoldingResponse[]>>("/sgb")).data ?? []); }
    catch { toast.error("Failed to load SGB holdings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/sgb/${editingId}`, { seriesName: form.seriesName, units: parseFloat(form.units), currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : undefined });
        toast.success("Updated");
      } else {
        await api.post("/sgb", { familyMemberId: form.familyMemberId, seriesName: form.seriesName, units: parseFloat(form.units), issuePrice: parseFloat(form.issuePrice), currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : undefined, issueDate: new Date(form.issueDate).toISOString(), maturityDate: new Date(form.maturityDate).toISOString(), interestRate: parseFloat(form.interestRate) });
        toast.success("SGB holding added");
      }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add SGB</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit SGB" : "Add SGB Holding"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>}
          <div className="sm:col-span-2"><label className={labelCls}>Series Name *</label>
            <input type="text" value={form.seriesName} onChange={e => setForm(f => ({ ...f, seriesName: e.target.value }))} required className={inputCls} placeholder="SGB 2023-24 Series IV" />
          </div>
          <div><label className={labelCls}>Units (grams) *</label>
            <input type="number" min="0.001" step="0.001" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} required className={inputCls} />
          </div>
          {!editingId && <div><label className={labelCls}>Issue Price ₹/gram *</label>
            <input type="number" min="1" value={form.issuePrice} onChange={e => setForm(f => ({ ...f, issuePrice: e.target.value }))} required className={inputCls} />
          </div>}
          <div><label className={labelCls}>Current Price ₹/gram</label>
            <input type="number" min="0" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} className={inputCls} />
          </div>
          {!editingId && <>
            <div><label className={labelCls}>Issue Date *</label>
              <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Maturity Date *</label>
              <input type="date" value={form.maturityDate} onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Interest Rate %</label>
              <input type="number" min="0" step="0.1" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} className={inputCls} />
            </div>
          </>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove SGB" description="Remove this SGB holding?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/sgb/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {holdings.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No SGB holdings</p><ShimmerButton onClick={() => setShowAdd(true)}>Add SGB</ShimmerButton></div>}
      {holdings.map(h => (
        <div key={h.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{h.seriesName}</p>
            <p className="text-xs text-slate-400">{h.units}g · {h.interestRate}% p.a. · {h.familyMember?.name} · Matures {formatDate(h.maturityDate)}</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{h.currentPrice > 0 ? formatINR(h.currentValue) : formatINR(h.investedPaise)} {h.currentPrice > 0 ? `@ ₹${(h.currentPrice / 100).toLocaleString("en-IN")}/g` : "(issue price)"}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(h.id); setForm(f => ({ ...f, seriesName: h.seriesName, units: String(h.units), currentPrice: h.currentPrice > 0 ? String(h.currentPrice / 100) : "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(h.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chit Funds tab ─────────────────────────────────────────────────────────

function ChitFundsTab({ members }: { members: FamilyMemberResponse[] }) {
  const [funds, setFunds] = useState<ChitFundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", organizerName: "", totalValue: "", monthlyContrib: "", durationMonths: "", startDate: "", endDate: "", monthWon: "", prizeReceived: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFunds((await api.get<ApiResponse<ChitFundResponse[]>>("/chit-funds")).data ?? []); }
    catch { toast.error("Failed to load chit funds"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/chit-funds/${editingId}`, {
          organizerName: form.organizerName,
          monthlyContrib: form.monthlyContrib ? parseFloat(form.monthlyContrib) : undefined,
          monthWon: form.monthWon ? parseInt(form.monthWon) : null,
          prizeReceived: form.prizeReceived ? parseFloat(form.prizeReceived) : null,
        });
        toast.success("Updated");
      } else {
        await api.post("/chit-funds", {
          familyMemberId: form.familyMemberId, organizerName: form.organizerName,
          totalValue: parseFloat(form.totalValue), monthlyContrib: parseFloat(form.monthlyContrib),
          durationMonths: parseInt(form.durationMonths), startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString(),
          ...(form.monthWon && { monthWon: parseInt(form.monthWon) }),
          ...(form.prizeReceived && { prizeReceived: parseFloat(form.prizeReceived) }),
        });
        toast.success("Added");
      }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Chit Fund</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Chit Fund" : "Add Chit Fund"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <>
            <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
              <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Total Chit Value ₹ *</label>
              <input type="number" min="1" value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Duration (months) *</label>
              <input type="number" min="1" value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required className={inputCls} />
            </div>
          </>}
          <div className="sm:col-span-2"><label className={labelCls}>Organizer Name *</label>
            <input type="text" value={form.organizerName} onChange={e => setForm(f => ({ ...f, organizerName: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Monthly Contribution ₹ *</label>
            <input type="number" min="1" value={form.monthlyContrib} onChange={e => setForm(f => ({ ...f, monthlyContrib: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Month Won <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="1" value={form.monthWon} onChange={e => setForm(f => ({ ...f, monthWon: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Prize Received ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.prizeReceived} onChange={e => setForm(f => ({ ...f, prizeReceived: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Chit Fund" description="Remove this chit fund?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/chit-funds/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {funds.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No chit funds</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Chit Fund</ShimmerButton></div>}
      {funds.map(f => {
        const months = Math.ceil(Math.min(1, (Date.now() - new Date(f.startDate).getTime()) / (new Date(f.endDate).getTime() - new Date(f.startDate).getTime())) * f.durationMonths);
        const contributed = Math.min(months, f.durationMonths) * f.monthlyContrib;
        return (
          <div key={f.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{f.organizerName}</p>
                {f.monthWon && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Won Month {f.monthWon}</span>}
              </div>
              <p className="text-xs text-slate-400">{f.familyMember?.name} · {formatINR(f.monthlyContrib)}/mo × {f.durationMonths} months</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">Contributed: {formatINR(contributed)} of {formatINR(f.totalValue)}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => { setEditingId(f.id); setForm(s => ({ ...s, organizerName: f.organizerName, monthlyContrib: String(f.monthlyContrib / 100), monthWon: f.monthWon ? String(f.monthWon) : "", prizeReceived: f.prizeReceived ? String(f.prizeReceived / 100) : "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
              <button onClick={() => setDeleteTargetId(f.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main InvestmentsPage ───────────────────────────────────────────────────

function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mf");
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<InvestmentSummary>>("/investments/summary"),
      api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
    ]).then(([s, m]) => {
      setSummary(s.data ?? null);
      setMembers(m.data ?? []);
    }).catch(() => toast.error("Failed to load")).finally(() => setSummaryLoading(false));
  }, []);

  const tabContent: Record<Tab, React.ReactNode> = {
    mf: <MFTab members={members} />,
    ppf_epf_nps: <PPFEPFNPSTab members={members} />,
    gold: <GoldTab members={members} />,
    properties: <PropertiesTab members={members} />,
    post_office: <PostOfficeTab members={members} />,
    sgb: <SGBTab members={members} />,
    chit_funds: <ChitFundsTab members={members} />,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Investments</h1>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Total Invested</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.total.invested)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">MF Invested</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.mutualFunds.invested)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">PPF + EPF + NPS</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.ppf.balance + summary.epf.balance + summary.nps.corpus)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Gold</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{summary.gold.weightGrams.toFixed(2)}g · {formatINR(summary.gold.currentValue)}</p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 flex-wrap rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tabContent[activeTab]}
    </div>
  );
}

export default InvestmentsPage;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/finance/InvestmentsPage.tsx
git commit -m "feat: add InvestmentsPage with 7-tab UI for all investment types"
```

---

## Task 16: Wire up App.tsx routes + Sidebar nav

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add import and route to App.tsx**

In `client/src/App.tsx`, after `import NetWorthPage from "./pages/finance/NetWorthPage";`, add:

```ts
import InvestmentsPage from "./pages/finance/InvestmentsPage";
```

After `<Route path="net-worth" element={<NetWorthPage />} />`, add:

```tsx
<Route path="investments" element={<InvestmentsPage />} />
```

- [ ] **Step 2: Add nav item to Sidebar.tsx**

In `client/src/components/layout/Sidebar.tsx`, add `TrendingDown` to the existing lucide import (or any icon that isn't yet used — `BarChart3` works well for investments):

Change the existing lucide import line to include `BarChart3`:

```ts
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Landmark,
  Users,
  Bell,
  Mail,
  ShieldCheck,
  Users2,
  KeyRound,
  Settings,
  ChevronDown,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  ShoppingCart,
  Handshake,
  PieChart,
  BarChart3,
} from "lucide-react";
```

In the `mainNavItems` array, after the `{ to: "/net-worth", label: "Net Worth", icon: PieChart }` entry, add:

```ts
{ to: "/investments", label: "Investments", icon: BarChart3 },
```

- [ ] **Step 3: Build client to check for type errors**

```bash
pnpm --filter @diary/client build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add /investments route and Investments sidebar nav item"
```

---

## Task 17: Documentation update

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add Phase 2 schema entries**

In `docs/architecture.md`, in the Database Schema table, after the existing `| **LendingRepayment** | … |` row, add:

```markdown
| **MutualFund** | id, userId, familyMemberId, fundName, amcName, schemeType (equity/debt/hybrid/elss/liquid/index/other), folioLast4?, sipAmount (BigInt paise)?, sipDate (1–28)?, sipStartDate?, isActive | Mutual fund holding with SIP metadata |
| **MFTransaction** | id, fundId, type (sip/lumpsum/redemption/switch_in/switch_out/dividend/bonus), amount (BigInt paise), units (Float)?, nav (Float)?, date, notes? | Individual MF transaction; used to compute totalUnits and investedPaise |
| **PPFAccount** | id, userId, familyMemberId, accountLast4?, bankOrPostOffice, openingDate, maturityDate, currentBalance (BigInt paise), annualContribution (BigInt paise), balanceUpdatedAt, isActive | PPF account with manual balance update |
| **EPFAccount** | id, userId, familyMemberId, uanLast4?, employerName, monthlyEmployeeContrib (BigInt paise), monthlyEmployerContrib (BigInt paise), currentBalance (BigInt paise), balanceUpdatedAt, isActive | EPF account with monthly contribution tracking |
| **NPSAccount** | id, userId, familyMemberId, pranLast4?, tier (tier1/tier2), monthlyContrib (BigInt paise), currentCorpus (BigInt paise), corpusUpdatedAt, isActive | NPS account corpus tracking |
| **PostOfficeScheme** | id, userId, familyMemberId, schemeType (nsc/kvp/scss/mis/td/other), certificateLast4?, amount (BigInt paise), interestRate (Float), purchaseDate, maturityDate, maturityAmount (BigInt paise), isActive | Post Office scheme with pre-computed maturity amount |
| **SGBHolding** | id, userId, familyMemberId, seriesName, units (Float grams), issuePrice (BigInt paise/g), currentPrice (BigInt paise/g), issueDate, maturityDate, interestRate (default 2.5%), isActive | Sovereign Gold Bond holding; currentPrice updated manually |
| **ChitFund** | id, userId, familyMemberId, organizerName, totalValue (BigInt paise), monthlyContrib (BigInt paise), durationMonths, startDate, endDate, monthWon?, prizeReceived (BigInt paise)?, isActive | Chit fund tracker with optional prize recording |
| **GoldHolding** | id, userId, familyMemberId, description, weightGrams (Float), purity (k24/k22/k18/k14/other), purchaseDate?, purchasePricePerGram (BigInt paise)?, currentPricePerGram (BigInt paise), storageLocation (home/bank_locker/relative/other), priceUpdatedAt, isActive | Physical gold holding; currentValue computed from weight × price |
| **Property** | id, userId, familyMemberId, propertyType (residential_flat/independent_house/plot/agricultural_land/commercial/other), description, areaValue (Float), areaUnit (sqft/sqm/cents/acres), purchaseDate?, purchasePrice (BigInt paise)?, currentValue (BigInt paise), rentalIncome (BigInt paise/mo), saleDeedDate?, registrationRefLast6?, linkedLoanId?, valueUpdatedAt, isActive | Real estate property with optional loan link |
```

- [ ] **Step 2: Add Phase 2 API entries**

In the API Reference section of `docs/architecture.md`, after the `### Personal Lending` section and before `### Dashboard`, add:

```markdown
### Mutual Funds — `/api/mutual-funds/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List all MFs with computed totalUnits, investedPaise, avgBuyPrice |
| POST | `/` | Yes | Create fund |
| PUT | `/:id` | Yes | Update fund metadata / SIP details |
| DELETE | `/:id` | Yes | Soft delete |
| GET | `/:id/transactions` | Yes | List transactions for a fund |
| POST | `/:id/transactions` | Yes | Add buy/sell/dividend/bonus/split transaction |
| DELETE | `/:id/transactions/:txId` | Yes | Remove a transaction |

### PPF — `/api/ppf/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List PPF accounts |
| POST | `/` | Yes | Create PPF account |
| PUT | `/:id` | Yes | Update balance / contribution |
| DELETE | `/:id` | Yes | Soft delete |

### EPF — `/api/epf/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List EPF accounts |
| POST | `/` | Yes | Create EPF account |
| PUT | `/:id` | Yes | Update balance / contributions |
| DELETE | `/:id` | Yes | Soft delete |

### NPS — `/api/nps/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List NPS accounts |
| POST | `/` | Yes | Create NPS account |
| PUT | `/:id` | Yes | Update corpus / monthly contribution |
| DELETE | `/:id` | Yes | Soft delete |

### Post Office Schemes — `/api/post-office-schemes/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List schemes |
| POST | `/` | Yes | Create scheme |
| PUT | `/:id` | Yes | Update |
| DELETE | `/:id` | Yes | Soft delete |

### SGB — `/api/sgb/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List holdings (with computed currentValue) |
| POST | `/` | Yes | Create holding |
| PUT | `/:id` | Yes | Update current price / units |
| DELETE | `/:id` | Yes | Soft delete |

### Chit Funds — `/api/chit-funds/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List chit funds |
| POST | `/` | Yes | Create chit fund |
| PUT | `/:id` | Yes | Update (record prize win) |
| DELETE | `/:id` | Yes | Soft delete |

### Gold — `/api/gold/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List gold holdings (with computed currentValue) |
| POST | `/` | Yes | Create holding |
| PUT | `/:id` | Yes | Update current price / weight |
| DELETE | `/:id` | Yes | Soft delete |

### Properties — `/api/properties/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List properties |
| POST | `/` | Yes | Create property |
| PUT | `/:id` | Yes | Update current value / rental income |
| DELETE | `/:id` | Yes | Soft delete |

### Investments Summary — `/api/investments/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/summary` | Yes | Aggregated portfolio summary across all investment types |
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: update architecture.md with Phase 2 investment schema and API"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| MutualFund + MFTransaction models | Task 1 |
| PPFAccount model | Task 1 |
| EPFAccount model | Task 1 |
| NPSAccount model | Task 1 |
| PostOfficeScheme model | Task 1 |
| SGBHolding model | Task 1 |
| ChitFund model | Task 1 |
| GoldHolding model | Task 1 |
| Property model | Task 1 |
| User + FamilyMember relation additions | Task 1 |
| Shared response types for all 9 modules | Task 2 |
| InvestmentSummary type | Task 2 |
| Label constants (MF_SCHEME_TYPE_LABELS etc.) | Task 2 |
| MF CRUD + transaction sub-resource | Task 3 |
| MF integration tests | Task 4 |
| PPF CRUD + test | Task 5 |
| EPF CRUD | Task 6 |
| NPS CRUD | Task 7 |
| Post Office CRUD | Task 8 |
| SGB CRUD (with currentValue computed) | Task 9 |
| Chit Funds CRUD | Task 10 |
| Gold CRUD (with currentValue computed) | Task 11 |
| Properties CRUD | Task 12 |
| `GET /api/investments/summary` | Task 13 |
| Investments summary tests | Task 13 |
| Register all routers in app.ts | Task 14 |
| getNetWorth updated with investments/gold/properties | Task 14 |
| InvestmentsPage (tabbed UI, all 7 tabs) | Task 15 |
| Summary cards at top of page | Task 15 |
| MF transaction expansion in UI | Task 15 |
| `/investments` route in App.tsx | Task 16 |
| Investments sidebar nav item | Task 16 |
| Architecture docs updated | Task 17 |

### Placeholder scan

No TBDs, no "implement later", no "similar to Task N" shortcuts. All steps include complete code.

### Type consistency

- `MFTransactionType` enum values: `sip | lumpsum | redemption | switch_in | switch_out | dividend | bonus` — consistent across schema (Task 1), types (Task 2), service `buyTypes`/`sellTypes` arrays (Task 3), controller Zod enum (Task 3), and client `MF_TX_TYPES` array (Task 15).
- `computeStats` in `mutualFunds.ts` classifies `sip`, `lumpsum`, `bonus` as buys and `redemption`, `switch_out` as sells — used consistently in service (Task 3) and investments summary (Task 13).
- BigInt conversion: all services use `BigInt(Math.round(rupees * 100))` for create, direct assignment for update. Consistent across all 9 modules.
- `withCurrentValue` in `sgb.ts` and `gold.ts` use `Number(bigintField)` matching the JSON replacer behavior.
- Router named exports (`mutualFundsRouter`, `ppfRouter`, etc.) match imports in `app.ts` (Task 14).
- Client API paths: `/mutual-funds`, `/ppf`, `/epf`, `/nps`, `/post-office-schemes`, `/sgb`, `/chit-funds`, `/gold`, `/properties`, `/investments/summary` — match router registrations in `app.ts`.
