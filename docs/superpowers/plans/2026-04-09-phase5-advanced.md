# Phase 5 — Stocks, GST, Salary Slips, Documents, Subscriptions, Emergency Fund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 4 must be fully implemented before executing this plan (the Emergency Fund endpoint extends Phase 4's budget router).

**Goal:** Add Stocks Portfolio (P&L tracking), Business/GST Tracker (monthly entries + filing status), Salary Slip Analyzer (monthly breakdown), Document Vault (metadata + expiry alerts), Subscription Tracker (renewal tracking + burn rate), and Emergency Fund (overlay on existing bank + expense data).

**Architecture:** Five new backend modules + two modifications (budget service/routes for emergency fund, bankAccounts service for `isEmergencyFund`). Stocks follow the MutualFund pattern (parent holding + child transactions). Emergency Fund is purely computed — no new model, just a new endpoint that queries existing `BankAccount` and `Expense` tables.

**Tech Stack:** Express + Prisma + Zod (server), React 19 + Tailwind (client), Vitest + supertest (tests), PostgreSQL with BigInt paise amounts.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/prisma/schema.prisma` | Modify | Add 8 enums + 7 models + `isEmergencyFund` on BankAccount + User/FamilyMember relations |
| `shared/src/types/finance.ts` | Modify | Add Phase 5 response types and label maps |
| `server/src/services/bankAccounts.ts` | Modify | Add `isEmergencyFund` to `updateBankAccount` type |
| `server/src/services/budget.ts` | Modify | Add `getEmergencyFundStatus` function |
| `server/src/controllers/budget.ts` | Modify | Add `emergencyFund` handler |
| `server/src/routes/budget.ts` | Modify | Add `GET /emergency-fund` route |
| `server/src/services/stocks.ts` | Create | Holding CRUD + P&L computation + portfolio summary |
| `server/src/controllers/stocks.ts` | Create | Zod validation + handlers for holdings + transactions |
| `server/src/routes/stocks.ts` | Create | Router with nested transaction sub-routes |
| `server/src/services/gst.ts` | Create | BusinessProfile upsert + GSTEntry CRUD + summary |
| `server/src/controllers/gst.ts` | Create | Handlers for profile, entries, and summary |
| `server/src/routes/gst.ts` | Create | Router |
| `server/src/services/salarySlips.ts` | Create | Salary slip CRUD + fiscal year summary |
| `server/src/controllers/salarySlips.ts` | Create | Handlers |
| `server/src/routes/salarySlips.ts` | Create | Router |
| `server/src/services/documents.ts` | Create | Document CRUD + expiry alert computation |
| `server/src/controllers/documents.ts` | Create | Handlers |
| `server/src/routes/documents.ts` | Create | Router |
| `server/src/services/subscriptions.ts` | Create | Subscription CRUD + renew + monthly/annual summary |
| `server/src/controllers/subscriptions.ts` | Create | Handlers |
| `server/src/routes/subscriptions.ts` | Create | Router |
| `server/src/app.ts` | Modify | Register 5 new routers |
| `server/src/__tests__/stocks.test.ts` | Create | Holdings + transactions + summary tests |
| `server/src/__tests__/gst.test.ts` | Create | Profile + entries + summary tests |
| `server/src/__tests__/salarySlips.test.ts` | Create | CRUD + fiscal summary tests |
| `server/src/__tests__/documents.test.ts` | Create | CRUD + expiry flag tests |
| `server/src/__tests__/subscriptions.test.ts` | Create | CRUD + renew + summary tests |
| `client/src/pages/finance/StocksPage.tsx` | Create | Holdings table with expandable transactions |
| `client/src/pages/finance/GSTPage.tsx` | Create | Monthly GST table + filing status |
| `client/src/pages/finance/SalarySlipsPage.tsx` | Create | Monthly rows per member + annual summary |
| `client/src/pages/finance/DocumentsPage.tsx` | Create | Cards with expiry badges, filter by type |
| `client/src/pages/finance/SubscriptionsPage.tsx` | Create | Subscription list + burn rate + renew button |
| `client/src/pages/finance/BankAccountsPage.tsx` | Modify | Add isEmergencyFund toggle to each account |
| `client/src/App.tsx` | Modify | Add 5 new routes |
| `client/src/components/layout/Sidebar.tsx` | Modify | Add 5 new nav items |
| `docs/architecture.md` | Modify | Document all Phase 5 API endpoints and models |

---

## Task 1: Prisma Schema

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add `isEmergencyFund` field to the `BankAccount` model**

In the `BankAccount` model, after `isActive Boolean @default(true)`, add:

```prisma
  isEmergencyFund Boolean @default(false)
```

- [ ] **Step 2: Add 8 enums after the Phase 4 enums (after `FuelType`)**

```prisma
enum Exchange {
  nse
  bse
}

enum StockTransactionType {
  buy
  sell
  dividend
  bonus
  split
}

enum GSTFilingType {
  gstr1
  gstr3b
  gstr9
  cmp08
}

enum DocumentType {
  pan_card
  aadhaar
  passport
  driving_licence
  voter_id
  birth_certificate
  property_sale_deed
  property_tax_receipt
  vehicle_rc
  vehicle_insurance
  puc_certificate
  bank_passbook
  fd_certificate
  insurance_policy
  investment_statement
  education_certificate
  other
}

enum SubscriptionCategory {
  ott
  internet
  mobile
  electricity
  gas
  water
  gym
  cloud_storage
  software
  newspaper
  other
}

enum BillingCycle {
  monthly
  quarterly
  half_yearly
  annual
}
```

- [ ] **Step 3: Add 7 models after the Phase 4 models (after `VehicleService`)**

```prisma
model StockHolding {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  companyName    String
  tickerSymbol   String
  exchange       Exchange
  brokerName     String?
  dematLast4     String?
  currentPrice   BigInt       @default(0)
  priceUpdatedAt DateTime     @default(now())
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  transactions StockTransaction[]

  @@index([userId])
  @@index([userId, tickerSymbol])
}

model StockTransaction {
  id        String               @id @default(cuid())
  holdingId String
  holding   StockHolding         @relation(fields: [holdingId], references: [id], onDelete: Cascade)
  type      StockTransactionType
  quantity  Float
  price     BigInt
  date      DateTime
  brokerage BigInt               @default(0)
  notes     String?
  createdAt DateTime             @default(now())

  @@index([holdingId])
}

model BusinessProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessName  String
  gstNumber     String?
  pan           String?
  isComposition Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model GSTEntry {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  month          Int
  year           Int
  fiscalYear     String
  turnover       BigInt
  taxableValue   BigInt
  cgst           BigInt   @default(0)
  sgst           BigInt   @default(0)
  igst           BigInt   @default(0)
  itcClaimed     BigInt   @default(0)
  netGstPayable  BigInt   @default(0)
  filed          Boolean  @default(false)
  filedDate      DateTime?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, month, year])
  @@index([userId, fiscalYear])
}

model SalarySlip {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId  String
  familyMember    FamilyMember @relation(fields: [familyMemberId], references: [id])
  month           Int
  year            Int
  employerName    String
  grossSalary     BigInt
  basic           BigInt       @default(0)
  hra             BigInt       @default(0)
  specialAllow    BigInt       @default(0)
  otherAllow      BigInt       @default(0)
  pfDeduction     BigInt       @default(0)
  professionalTax BigInt       @default(0)
  tdsDeducted     BigInt       @default(0)
  otherDeductions BigInt       @default(0)
  netTakeHome     BigInt
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([userId, familyMemberId, month, year])
  @@index([userId])
}

model DocumentRecord {
  id               String        @id @default(cuid())
  userId           String
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId   String?
  familyMember     FamilyMember? @relation(fields: [familyMemberId], references: [id])
  documentType     DocumentType
  name             String
  referenceNumber  String?
  issueDate        DateTime?
  expiryDate       DateTime?
  physicalLocation String?
  digitalHint      String?
  notes            String?
  isActive         Boolean       @default(true)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([userId])
  @@index([userId, expiryDate])
}

model Subscription {
  id           String               @id @default(cuid())
  userId       String
  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  category     SubscriptionCategory
  amount       BigInt
  billingCycle BillingCycle
  nextDueDate  DateTime
  autoPay      Boolean              @default(false)
  notes        String?
  isActive     Boolean              @default(true)
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  @@index([userId])
  @@index([userId, nextDueDate])
}
```

- [ ] **Step 4: Add relations to `User` model**

After `vehicles Vehicle[]` (last Phase 4 relation), add:

```prisma
  stockHoldings     StockHolding[]
  businessProfile   BusinessProfile?
  gstEntries        GSTEntry[]
  salarySlips       SalarySlip[]
  documentRecords   DocumentRecord[]
  subscriptions     Subscription[]
```

- [ ] **Step 5: Add relations to `FamilyMember` model**

After `vehicles Vehicle[]` (last Phase 4 FamilyMember relation), add:

```prisma
  stockHoldings   StockHolding[]
  salarySlips     SalarySlip[]
  documentRecords DocumentRecord[]
```

- [ ] **Step 6: Run migration**

```bash
cd server && npx prisma migrate dev --name phase5_stocks_gst_salary_docs_subscriptions
```

Expected: "Your database is now in sync with your schema."

```bash
npx prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 7: Commit**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Phase 5 Prisma models (StockHolding, GSTEntry, SalarySlip, DocumentRecord, Subscription) + isEmergencyFund on BankAccount"
```

---

## Task 2: Shared Types

**Files:**
- Modify: `shared/src/types/finance.ts`

- [ ] **Step 1: Append Phase 5 types at the end of `shared/src/types/finance.ts`**

```typescript
// ── Phase 5 — Stocks, GST, Salary, Documents, Subscriptions ───────────────

export type Exchange = 'nse' | 'bse'
export type StockTransactionType = 'buy' | 'sell' | 'dividend' | 'bonus' | 'split'
export type DocumentType =
  | 'pan_card' | 'aadhaar' | 'passport' | 'driving_licence' | 'voter_id'
  | 'birth_certificate' | 'property_sale_deed' | 'property_tax_receipt'
  | 'vehicle_rc' | 'vehicle_insurance' | 'puc_certificate'
  | 'bank_passbook' | 'fd_certificate' | 'insurance_policy'
  | 'investment_statement' | 'education_certificate' | 'other'
export type SubscriptionCategory =
  | 'ott' | 'internet' | 'mobile' | 'electricity' | 'gas' | 'water'
  | 'gym' | 'cloud_storage' | 'software' | 'newspaper' | 'other'
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'annual'

export interface StockTransactionResponse {
  id: string
  type: StockTransactionType
  quantity: number
  price: number           // paise per share
  date: string
  brokerage: number       // paise
  notes: string | null
  createdAt: string
}

export interface StockHoldingResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  companyName: string
  tickerSymbol: string
  exchange: Exchange
  brokerName: string | null
  dematLast4: string | null
  currentPrice: number    // paise per share
  priceUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  transactions: StockTransactionResponse[]
  // computed
  totalUnits: number
  avgBuyPrice: number     // paise per share
  investedValue: number   // paise
  currentValue: number    // paise
  unrealizedPL: number    // paise
  unrealizedPLPercent: number
}

export interface StockPortfolioSummary {
  totalInvested: number   // paise
  totalCurrentValue: number
  totalUnrealizedPL: number
  holdingsCount: number
}

export interface BusinessProfileResponse {
  id: string
  businessName: string
  gstNumber: string | null
  pan: string | null
  isComposition: boolean
  createdAt: string
  updatedAt: string
}

export interface GSTEntryResponse {
  id: string
  month: number
  year: number
  fiscalYear: string
  turnover: number
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  itcClaimed: number
  netGstPayable: number
  filed: boolean
  filedDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface GSTSummaryResponse {
  fiscalYear: string
  totalTurnover: number
  totalTaxableValue: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalItcClaimed: number
  totalNetGstPayable: number
  monthsFiled: number
  monthsPending: number
  entries: GSTEntryResponse[]
}

export interface SalarySlipResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  month: number
  year: number
  employerName: string
  grossSalary: number
  basic: number
  hra: number
  specialAllow: number
  otherAllow: number
  pfDeduction: number
  professionalTax: number
  tdsDeducted: number
  otherDeductions: number
  netTakeHome: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SalarySlipSummaryResponse {
  fiscalYear: string
  totalGrossSalary: number
  totalTdsDeducted: number
  totalPfDeduction: number
  totalNetTakeHome: number
  byMember: Array<{
    familyMemberId: string
    name: string
    totalGross: number
    totalTds: number
    totalNet: number
  }>
}

export interface DocumentRecordResponse {
  id: string
  familyMemberId: string | null
  familyMember?: { name: string; relationship: Relationship } | null
  documentType: DocumentType
  name: string
  referenceNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  physicalLocation: string | null
  digitalHint: string | null
  notes: string | null
  daysUntilExpiry: number | null
  expiringSoon: boolean           // expiryDate within 60 days
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SubscriptionResponse {
  id: string
  name: string
  category: SubscriptionCategory
  amount: number          // paise per billing cycle
  billingCycle: BillingCycle
  nextDueDate: string
  autoPay: boolean
  notes: string | null
  dueSoon: boolean        // nextDueDate within 3 days
  monthlyEquivalent: number  // paise — normalised to monthly
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SubscriptionSummaryResponse {
  totalMonthlySpend: number   // paise
  totalAnnualSpend: number    // paise
  count: number
}

export interface EmergencyFundResponse {
  emergencyFundBalance: number    // paise — sum of isEmergencyFund bank accounts
  avgMonthlyExpenses: number      // paise — last 3 months average
  monthsCovered: number
  targetMonths: number            // always 6
  gapAmount: number               // paise — (6 * avg) - balance, 0 if covered
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pan_card: 'PAN Card',
  aadhaar: 'Aadhaar Card',
  passport: 'Passport',
  driving_licence: 'Driving Licence',
  voter_id: 'Voter ID',
  birth_certificate: 'Birth Certificate',
  property_sale_deed: 'Property Sale Deed',
  property_tax_receipt: 'Property Tax Receipt',
  vehicle_rc: 'Vehicle RC',
  vehicle_insurance: 'Vehicle Insurance',
  puc_certificate: 'PUC Certificate',
  bank_passbook: 'Bank Passbook',
  fd_certificate: 'FD Certificate',
  insurance_policy: 'Insurance Policy',
  investment_statement: 'Investment Statement',
  education_certificate: 'Education Certificate',
  other: 'Other',
}

export const SUBSCRIPTION_CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  ott: 'OTT (Netflix / Prime / Hotstar)',
  internet: 'Internet',
  mobile: 'Mobile',
  electricity: 'Electricity',
  gas: 'Gas',
  water: 'Water',
  gym: 'Gym',
  cloud_storage: 'Cloud Storage',
  software: 'Software / SaaS',
  newspaper: 'Newspaper / Magazine',
  other: 'Other',
}

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-Yearly',
  annual: 'Annual',
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
git commit -m "feat: add Phase 5 shared types (stocks, GST, salary, documents, subscriptions)"
```

---

## Task 3: Stocks Backend

**Files:**
- Create: `server/src/services/stocks.ts`
- Create: `server/src/controllers/stocks.ts`
- Create: `server/src/routes/stocks.ts`

- [ ] **Step 1: Create `server/src/services/stocks.ts`**

```typescript
import { prisma } from "../models/prisma.js";
import type { Exchange, StockTransactionType } from "@prisma/client";

function withComputed(holding: any) {
  const txs: any[] = holding.transactions ?? [];
  let buyQty = 0;
  let buyValue = 0; // paise total
  let sellQty = 0;
  let bonusQty = 0;

  for (const tx of txs) {
    if (tx.type === "buy") {
      buyQty += tx.quantity;
      buyValue += Math.round(Number(tx.price) * tx.quantity);
    } else if (tx.type === "sell") {
      sellQty += tx.quantity;
    } else if (tx.type === "bonus") {
      bonusQty += tx.quantity;
    }
  }

  const totalUnits = Math.max(0, buyQty + bonusQty - sellQty);
  const avgBuyPrice = buyQty > 0 ? Math.round(buyValue / buyQty) : 0;
  const investedValue = Math.round(totalUnits * avgBuyPrice);
  const currentValue = Math.round(totalUnits * Number(holding.currentPrice));
  const unrealizedPL = currentValue - investedValue;
  const unrealizedPLPercent =
    investedValue > 0
      ? Math.round((unrealizedPL / investedValue) * 10000) / 100
      : 0;

  return {
    ...holding,
    totalUnits,
    avgBuyPrice,
    investedValue,
    currentValue,
    unrealizedPL,
    unrealizedPLPercent,
  };
}

export async function listStocks(userId: string) {
  const holdings = await prisma.stockHolding.findMany({
    where: { userId, isActive: true },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: { orderBy: { date: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return holdings.map(withComputed);
}

export async function getStockSummary(userId: string) {
  const holdings = await listStocks(userId);
  return {
    totalInvested: holdings.reduce((s, h) => s + h.investedValue, 0),
    totalCurrentValue: holdings.reduce((s, h) => s + h.currentValue, 0),
    totalUnrealizedPL: holdings.reduce((s, h) => s + h.unrealizedPL, 0),
    holdingsCount: holdings.length,
  };
}

export async function createStock(
  userId: string,
  data: {
    familyMemberId: string;
    companyName: string;
    tickerSymbol: string;
    exchange: Exchange;
    brokerName?: string;
    dematLast4?: string;
    currentPrice: number;
  }
) {
  const holding = await prisma.stockHolding.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      companyName: data.companyName,
      tickerSymbol: data.tickerSymbol.toUpperCase(),
      exchange: data.exchange,
      brokerName: data.brokerName ?? null,
      dematLast4: data.dematLast4 ?? null,
      currentPrice: BigInt(Math.round(data.currentPrice * 100)),
      priceUpdatedAt: new Date(),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: true,
    },
  });
  return withComputed(holding);
}

export async function updateStock(
  id: string,
  userId: string,
  data: { companyName?: string; brokerName?: string; currentPrice?: number }
) {
  const holding = await prisma.stockHolding.update({
    where: { id, userId },
    data: {
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.brokerName !== undefined && { brokerName: data.brokerName }),
      ...(data.currentPrice !== undefined && {
        currentPrice: BigInt(Math.round(data.currentPrice * 100)),
        priceUpdatedAt: new Date(),
      }),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      transactions: { orderBy: { date: "desc" } },
    },
  });
  return withComputed(holding);
}

export async function deleteStock(id: string, userId: string) {
  return prisma.stockHolding.update({ where: { id, userId }, data: { isActive: false } });
}

export async function getTransactions(holdingId: string, userId: string) {
  const holding = await prisma.stockHolding.findFirst({ where: { id: holdingId, userId } });
  if (!holding) return null;
  return prisma.stockTransaction.findMany({
    where: { holdingId },
    orderBy: { date: "desc" },
  });
}

export async function addTransaction(
  holdingId: string,
  userId: string,
  data: {
    type: StockTransactionType;
    quantity: number;
    price: number;
    date: string;
    brokerage?: number;
    notes?: string;
  }
) {
  const holding = await prisma.stockHolding.findFirst({ where: { id: holdingId, userId } });
  if (!holding) return null;
  return prisma.stockTransaction.create({
    data: {
      holdingId,
      type: data.type,
      quantity: data.quantity,
      price: BigInt(Math.round(data.price * 100)),
      date: new Date(data.date),
      brokerage: BigInt(Math.round((data.brokerage ?? 0) * 100)),
      notes: data.notes ?? null,
    },
  });
}

export async function removeTransaction(txId: string, holdingId: string, userId: string) {
  const holding = await prisma.stockHolding.findFirst({ where: { id: holdingId, userId } });
  if (!holding) return null;
  return prisma.stockTransaction.delete({ where: { id: txId, holdingId } });
}
```

- [ ] **Step 2: Create `server/src/controllers/stocks.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/stocks.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const EXCHANGES = ["nse", "bse"] as const;
const TX_TYPES = ["buy", "sell", "dividend", "bonus", "split"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  companyName: z.string().min(1).max(200),
  tickerSymbol: z.string().min(1).max(20),
  exchange: z.enum(EXCHANGES),
  brokerName: z.string().max(100).optional(),
  dematLast4: z.string().length(4).optional(),
  currentPrice: z.number().min(0),
});

const updateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  brokerName: z.string().max(100).optional(),
  currentPrice: z.number().min(0).optional(),
});

const txSchema = z.object({
  type: z.enum(TX_TYPES),
  quantity: z.number().min(0.001),
  price: z.number().min(0),
  date: z.string().datetime(),
  brokerage: z.number().min(0).optional(),
  notes: z.string().max(300).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listStocks((req as AuthenticatedRequest).userId) });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.getStockSummary((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createStock((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateStock(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteStock(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  const data = await svc.getTransactions(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  if (!data) { res.status(404).json({ success: false, message: "Holding not found" }); return; }
  res.json({ success: true, data });
});

export const addTx = asyncHandler(async (req: Request, res: Response) => {
  const parsed = txSchema.parse(req.body);
  const data = await svc.addTransaction(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed);
  if (!data) { res.status(404).json({ success: false, message: "Holding not found" }); return; }
  res.status(201).json({ success: true, data });
});

export const removeTx = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.removeTransaction(
    getParam(req.params.txId),
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId
  );
  if (!result) { res.status(404).json({ success: false, message: "Transaction not found" }); return; }
  res.json({ success: true });
});
```

- [ ] **Step 3: Create `server/src/routes/stocks.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/stocks.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.get("/summary", ctrl.summary);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.get("/:id/transactions", ctrl.transactions);
router.post("/:id/transactions", ctrl.addTx);
router.delete("/:id/transactions/:txId", ctrl.removeTx);

export { router as stocksRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/stocks.ts server/src/controllers/stocks.ts server/src/routes/stocks.ts
git commit -m "feat: add stocks service, controller, and routes with P&L computation"
```

---

## Task 4: GST Backend

**Files:**
- Create: `server/src/services/gst.ts`
- Create: `server/src/controllers/gst.ts`
- Create: `server/src/routes/gst.ts`

- [ ] **Step 1: Create `server/src/services/gst.ts`**

```typescript
import { prisma } from "../models/prisma.js";

function getFiscalYear(month: number, year: number): string {
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

export async function getBusinessProfile(userId: string) {
  return prisma.businessProfile.findUnique({ where: { userId } });
}

export async function upsertBusinessProfile(
  userId: string,
  data: { businessName: string; gstNumber?: string; pan?: string; isComposition?: boolean }
) {
  return prisma.businessProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function listGSTEntries(userId: string, fiscalYear: string) {
  return prisma.gSTEntry.findMany({
    where: { userId, fiscalYear },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
}

export async function createGSTEntry(
  userId: string,
  data: {
    month: number;
    year: number;
    turnover: number;
    taxableValue: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    itcClaimed?: number;
    netGstPayable?: number;
    notes?: string;
  }
) {
  return prisma.gSTEntry.create({
    data: {
      userId,
      month: data.month,
      year: data.year,
      fiscalYear: getFiscalYear(data.month, data.year),
      turnover: BigInt(Math.round(data.turnover * 100)),
      taxableValue: BigInt(Math.round(data.taxableValue * 100)),
      cgst: BigInt(Math.round((data.cgst ?? 0) * 100)),
      sgst: BigInt(Math.round((data.sgst ?? 0) * 100)),
      igst: BigInt(Math.round((data.igst ?? 0) * 100)),
      itcClaimed: BigInt(Math.round((data.itcClaimed ?? 0) * 100)),
      netGstPayable: BigInt(Math.round((data.netGstPayable ?? 0) * 100)),
      notes: data.notes ?? null,
    },
  });
}

export async function updateGSTEntry(
  id: string,
  userId: string,
  data: {
    turnover?: number;
    taxableValue?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    itcClaimed?: number;
    netGstPayable?: number;
    filed?: boolean;
    filedDate?: string;
    notes?: string;
  }
) {
  return prisma.gSTEntry.update({
    where: { id, userId },
    data: {
      ...(data.turnover !== undefined && { turnover: BigInt(Math.round(data.turnover * 100)) }),
      ...(data.taxableValue !== undefined && { taxableValue: BigInt(Math.round(data.taxableValue * 100)) }),
      ...(data.cgst !== undefined && { cgst: BigInt(Math.round(data.cgst * 100)) }),
      ...(data.sgst !== undefined && { sgst: BigInt(Math.round(data.sgst * 100)) }),
      ...(data.igst !== undefined && { igst: BigInt(Math.round(data.igst * 100)) }),
      ...(data.itcClaimed !== undefined && { itcClaimed: BigInt(Math.round(data.itcClaimed * 100)) }),
      ...(data.netGstPayable !== undefined && { netGstPayable: BigInt(Math.round(data.netGstPayable * 100)) }),
      ...(data.filed !== undefined && { filed: data.filed }),
      ...(data.filedDate !== undefined && { filedDate: new Date(data.filedDate) }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteGSTEntry(id: string, userId: string) {
  return prisma.gSTEntry.delete({ where: { id, userId } });
}

export async function getGSTSummary(userId: string, fiscalYear: string) {
  const entries = await listGSTEntries(userId, fiscalYear);
  const sum = (field: keyof typeof entries[0]) =>
    entries.reduce((s, e) => s + Number(e[field] as bigint), 0);
  return {
    fiscalYear,
    totalTurnover: sum("turnover"),
    totalTaxableValue: sum("taxableValue"),
    totalCgst: sum("cgst"),
    totalSgst: sum("sgst"),
    totalIgst: sum("igst"),
    totalItcClaimed: sum("itcClaimed"),
    totalNetGstPayable: sum("netGstPayable"),
    monthsFiled: entries.filter((e) => e.filed).length,
    monthsPending: entries.filter((e) => !e.filed).length,
    entries,
  };
}
```

- [ ] **Step 2: Create `server/src/controllers/gst.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/gst.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const fiscalYearSchema = z.string().regex(/^\d{4}-\d{2}$/);

const profileSchema = z.object({
  businessName: z.string().min(1).max(200),
  gstNumber: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  isComposition: z.boolean().optional(),
});

const entryCreateSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  turnover: z.number().min(0),
  taxableValue: z.number().min(0),
  cgst: z.number().min(0).optional(),
  sgst: z.number().min(0).optional(),
  igst: z.number().min(0).optional(),
  itcClaimed: z.number().min(0).optional(),
  netGstPayable: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const entryUpdateSchema = entryCreateSchema.partial().omit({ month: true, year: true }).extend({
  filed: z.boolean().optional(),
  filedDate: z.string().datetime().optional(),
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await svc.getBusinessProfile((req as AuthenticatedRequest).userId);
  if (!profile) { res.status(404).json({ success: false, message: "No business profile" }); return; }
  res.json({ success: true, data: profile });
});

export const upsertProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = profileSchema.parse(req.body);
  res.json({ success: true, data: await svc.upsertBusinessProfile((req as AuthenticatedRequest).userId, parsed) });
});

export const listEntries = asyncHandler(async (req: Request, res: Response) => {
  const fy = fiscalYearSchema.parse(req.query.fiscalYear);
  res.json({ success: true, data: await svc.listGSTEntries((req as AuthenticatedRequest).userId, fy) });
});

export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  const parsed = entryCreateSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createGSTEntry((req as AuthenticatedRequest).userId, parsed) });
});

export const updateEntry = asyncHandler(async (req: Request, res: Response) => {
  const parsed = entryUpdateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateGSTEntry(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const deleteEntry = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteGSTEntry(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const gstSummary = asyncHandler(async (req: Request, res: Response) => {
  const fy = fiscalYearSchema.parse(req.query.fiscalYear);
  res.json({ success: true, data: await svc.getGSTSummary((req as AuthenticatedRequest).userId, fy) });
});
```

- [ ] **Step 3: Create `server/src/routes/gst.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/gst.js";

const router: Router = Router();
router.use(authenticate);

router.get("/profile", ctrl.getProfile);
router.put("/profile", ctrl.upsertProfile);
router.get("/entries", ctrl.listEntries);
router.post("/entries", ctrl.createEntry);
router.put("/entries/:id", ctrl.updateEntry);
router.delete("/entries/:id", ctrl.deleteEntry);
router.get("/summary", ctrl.gstSummary);

export { router as gstRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/gst.ts server/src/controllers/gst.ts server/src/routes/gst.ts
git commit -m "feat: add GST service, controller, and routes"
```

---

## Task 5: Salary Slips Backend

**Files:**
- Create: `server/src/services/salarySlips.ts`
- Create: `server/src/controllers/salarySlips.ts`
- Create: `server/src/routes/salarySlips.ts`

- [ ] **Step 1: Create `server/src/services/salarySlips.ts`**

```typescript
import { prisma } from "../models/prisma.js";

function getFiscalYear(month: number, year: number): string {
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function parseFiscalYear(fy: string): { months: Array<{ month: number; year: number }> } {
  const startYear = parseInt(fy.split("-")[0], 10);
  const months: Array<{ month: number; year: number }> = [];
  for (let m = 4; m <= 12; m++) months.push({ month: m, year: startYear });
  for (let m = 1; m <= 3; m++) months.push({ month: m, year: startYear + 1 });
  return { months };
}

export async function listSalarySlips(userId: string, fiscalYear?: string) {
  const where: any = { userId, isActive: true };
  if (fiscalYear) {
    const { months } = parseFiscalYear(fiscalYear);
    const conditions = months.map((m) => ({ month: m.month, year: m.year }));
    where.OR = conditions;
  }
  return prisma.salarySlip.findMany({
    where,
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function createSalarySlip(
  userId: string,
  data: {
    familyMemberId: string;
    month: number;
    year: number;
    employerName: string;
    grossSalary: number;
    basic?: number;
    hra?: number;
    specialAllow?: number;
    otherAllow?: number;
    pfDeduction?: number;
    professionalTax?: number;
    tdsDeducted?: number;
    otherDeductions?: number;
    netTakeHome: number;
  }
) {
  return prisma.salarySlip.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      month: data.month,
      year: data.year,
      employerName: data.employerName,
      grossSalary: BigInt(Math.round(data.grossSalary * 100)),
      basic: BigInt(Math.round((data.basic ?? 0) * 100)),
      hra: BigInt(Math.round((data.hra ?? 0) * 100)),
      specialAllow: BigInt(Math.round((data.specialAllow ?? 0) * 100)),
      otherAllow: BigInt(Math.round((data.otherAllow ?? 0) * 100)),
      pfDeduction: BigInt(Math.round((data.pfDeduction ?? 0) * 100)),
      professionalTax: BigInt(Math.round((data.professionalTax ?? 0) * 100)),
      tdsDeducted: BigInt(Math.round((data.tdsDeducted ?? 0) * 100)),
      otherDeductions: BigInt(Math.round((data.otherDeductions ?? 0) * 100)),
      netTakeHome: BigInt(Math.round(data.netTakeHome * 100)),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateSalarySlip(id: string, userId: string, data: {
  employerName?: string;
  grossSalary?: number;
  basic?: number;
  hra?: number;
  specialAllow?: number;
  otherAllow?: number;
  pfDeduction?: number;
  professionalTax?: number;
  tdsDeducted?: number;
  otherDeductions?: number;
  netTakeHome?: number;
}) {
  return prisma.salarySlip.update({
    where: { id, userId },
    data: {
      ...(data.employerName && { employerName: data.employerName }),
      ...(data.grossSalary !== undefined && { grossSalary: BigInt(Math.round(data.grossSalary * 100)) }),
      ...(data.basic !== undefined && { basic: BigInt(Math.round(data.basic * 100)) }),
      ...(data.hra !== undefined && { hra: BigInt(Math.round(data.hra * 100)) }),
      ...(data.specialAllow !== undefined && { specialAllow: BigInt(Math.round(data.specialAllow * 100)) }),
      ...(data.otherAllow !== undefined && { otherAllow: BigInt(Math.round(data.otherAllow * 100)) }),
      ...(data.pfDeduction !== undefined && { pfDeduction: BigInt(Math.round(data.pfDeduction * 100)) }),
      ...(data.professionalTax !== undefined && { professionalTax: BigInt(Math.round(data.professionalTax * 100)) }),
      ...(data.tdsDeducted !== undefined && { tdsDeducted: BigInt(Math.round(data.tdsDeducted * 100)) }),
      ...(data.otherDeductions !== undefined && { otherDeductions: BigInt(Math.round(data.otherDeductions * 100)) }),
      ...(data.netTakeHome !== undefined && { netTakeHome: BigInt(Math.round(data.netTakeHome * 100)) }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteSalarySlip(id: string, userId: string) {
  return prisma.salarySlip.update({ where: { id, userId }, data: { isActive: false } });
}

export async function getSalarySlipSummary(userId: string, fiscalYear: string) {
  const slips = await listSalarySlips(userId, fiscalYear);
  const byMemberMap = new Map<string, {
    familyMemberId: string; name: string; totalGross: number; totalTds: number; totalNet: number
  }>();

  for (const slip of slips) {
    const key = slip.familyMemberId;
    const existing = byMemberMap.get(key) ?? {
      familyMemberId: key,
      name: slip.familyMember?.name ?? key,
      totalGross: 0,
      totalTds: 0,
      totalNet: 0,
    };
    existing.totalGross += Number(slip.grossSalary);
    existing.totalTds += Number(slip.tdsDeducted);
    existing.totalNet += Number(slip.netTakeHome);
    byMemberMap.set(key, existing);
  }

  return {
    fiscalYear,
    totalGrossSalary: slips.reduce((s, sl) => s + Number(sl.grossSalary), 0),
    totalTdsDeducted: slips.reduce((s, sl) => s + Number(sl.tdsDeducted), 0),
    totalPfDeduction: slips.reduce((s, sl) => s + Number(sl.pfDeduction), 0),
    totalNetTakeHome: slips.reduce((s, sl) => s + Number(sl.netTakeHome), 0),
    byMember: Array.from(byMemberMap.values()),
  };
}
```

- [ ] **Step 2: Create `server/src/controllers/salarySlips.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/salarySlips.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const fiscalYearSchema = z.string().regex(/^\d{4}-\d{2}$/);

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  employerName: z.string().min(1).max(200),
  grossSalary: z.number().min(0),
  basic: z.number().min(0).optional(),
  hra: z.number().min(0).optional(),
  specialAllow: z.number().min(0).optional(),
  otherAllow: z.number().min(0).optional(),
  pfDeduction: z.number().min(0).optional(),
  professionalTax: z.number().min(0).optional(),
  tdsDeducted: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  netTakeHome: z.number().min(0),
});

const updateSchema = createSchema.partial().omit({ familyMemberId: true, month: true, year: true });

export const list = asyncHandler(async (req: Request, res: Response) => {
  const fy = fiscalYearSchema.optional().parse(req.query.fiscalYear);
  res.json({ success: true, data: await svc.listSalarySlips((req as AuthenticatedRequest).userId, fy) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createSalarySlip((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateSalarySlip(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteSalarySlip(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const slipSummary = asyncHandler(async (req: Request, res: Response) => {
  const fy = fiscalYearSchema.parse(req.query.fiscalYear);
  res.json({ success: true, data: await svc.getSalarySlipSummary((req as AuthenticatedRequest).userId, fy) });
});
```

- [ ] **Step 3: Create `server/src/routes/salarySlips.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/salarySlips.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.get("/summary", ctrl.slipSummary);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as salarySlipsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/salarySlips.ts server/src/controllers/salarySlips.ts server/src/routes/salarySlips.ts
git commit -m "feat: add salary slips service, controller, and routes"
```

---

## Task 6: Documents Backend

**Files:**
- Create: `server/src/services/documents.ts`
- Create: `server/src/controllers/documents.ts`
- Create: `server/src/routes/documents.ts`

- [ ] **Step 1: Create `server/src/services/documents.ts`**

```typescript
import { prisma } from "../models/prisma.js";
import type { DocumentType } from "@prisma/client";

function withExpiry(doc: any) {
  const daysUntilExpiry = doc.expiryDate
    ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  return {
    ...doc,
    daysUntilExpiry,
    expiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 60,
  };
}

export async function listDocuments(userId: string, type?: DocumentType) {
  const docs = await prisma.documentRecord.findMany({
    where: { userId, isActive: true, ...(type ? { documentType: type } : {}) },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { expiryDate: "asc" },
  });
  return docs.map(withExpiry).sort((a, b) => (b.expiringSoon ? 1 : 0) - (a.expiringSoon ? 1 : 0));
}

export async function createDocument(
  userId: string,
  data: {
    familyMemberId?: string;
    documentType: DocumentType;
    name: string;
    referenceNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    physicalLocation?: string;
    digitalHint?: string;
    notes?: string;
  }
) {
  const doc = await prisma.documentRecord.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId ?? null,
      documentType: data.documentType,
      name: data.name,
      referenceNumber: data.referenceNumber ?? null,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      physicalLocation: data.physicalLocation ?? null,
      digitalHint: data.digitalHint ?? null,
      notes: data.notes ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withExpiry(doc);
}

export async function updateDocument(
  id: string,
  userId: string,
  data: {
    name?: string;
    referenceNumber?: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    physicalLocation?: string;
    digitalHint?: string;
    notes?: string;
  }
) {
  const doc = await prisma.documentRecord.update({
    where: { id, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.referenceNumber !== undefined && { referenceNumber: data.referenceNumber }),
      ...(data.issueDate !== undefined && { issueDate: data.issueDate ? new Date(data.issueDate) : null }),
      ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
      ...(data.physicalLocation !== undefined && { physicalLocation: data.physicalLocation }),
      ...(data.digitalHint !== undefined && { digitalHint: data.digitalHint }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return withExpiry(doc);
}

export async function deleteDocument(id: string, userId: string) {
  return prisma.documentRecord.update({ where: { id, userId }, data: { isActive: false } });
}
```

- [ ] **Step 2: Create `server/src/controllers/documents.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/documents.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const DOCUMENT_TYPES = [
  "pan_card","aadhaar","passport","driving_licence","voter_id","birth_certificate",
  "property_sale_deed","property_tax_receipt","vehicle_rc","vehicle_insurance",
  "puc_certificate","bank_passbook","fd_certificate","insurance_policy",
  "investment_statement","education_certificate","other",
] as const;

const createSchema = z.object({
  familyMemberId: z.string().optional(),
  documentType: z.enum(DOCUMENT_TYPES),
  name: z.string().min(1).max(200),
  referenceNumber: z.string().max(100).optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  physicalLocation: z.string().max(300).optional(),
  digitalHint: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  referenceNumber: z.string().max(100).optional(),
  issueDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  physicalLocation: z.string().max(300).optional(),
  digitalHint: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type ? z.enum(DOCUMENT_TYPES).parse(req.query.type) : undefined;
  res.json({ success: true, data: await svc.listDocuments((req as AuthenticatedRequest).userId, type) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createDocument((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateDocument(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteDocument(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});
```

- [ ] **Step 3: Create `server/src/routes/documents.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/documents.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export { router as documentsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/documents.ts server/src/controllers/documents.ts server/src/routes/documents.ts
git commit -m "feat: add documents service, controller, and routes with expiry alerts"
```

---

## Task 7: Subscriptions Backend

**Files:**
- Create: `server/src/services/subscriptions.ts`
- Create: `server/src/controllers/subscriptions.ts`
- Create: `server/src/routes/subscriptions.ts`

- [ ] **Step 1: Create `server/src/services/subscriptions.ts`**

```typescript
import { prisma } from "../models/prisma.js";
import type { SubscriptionCategory, BillingCycle } from "@prisma/client";

function toMonthlyPaise(amount: bigint, cycle: BillingCycle): number {
  const a = Number(amount);
  switch (cycle) {
    case "monthly": return a;
    case "quarterly": return Math.round(a / 3);
    case "half_yearly": return Math.round(a / 6);
    case "annual": return Math.round(a / 12);
  }
}

function advanceByOneCycle(date: Date, cycle: BillingCycle): Date {
  const d = new Date(date);
  switch (cycle) {
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "half_yearly": d.setMonth(d.getMonth() + 6); break;
    case "annual": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function withFlags(sub: any) {
  const daysUntilDue = Math.ceil(
    (new Date(sub.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return {
    ...sub,
    dueSoon: daysUntilDue <= 3,
    monthlyEquivalent: toMonthlyPaise(sub.amount, sub.billingCycle),
  };
}

export async function listSubscriptions(userId: string) {
  const subs = await prisma.subscription.findMany({
    where: { userId, isActive: true },
    orderBy: { nextDueDate: "asc" },
  });
  return subs.map(withFlags);
}

export async function getSubscriptionSummary(userId: string) {
  const subs = await prisma.subscription.findMany({ where: { userId, isActive: true } });
  const totalMonthlySpend = subs.reduce(
    (s, sub) => s + toMonthlyPaise(sub.amount, sub.billingCycle),
    0
  );
  return {
    totalMonthlySpend,
    totalAnnualSpend: totalMonthlySpend * 12,
    count: subs.length,
  };
}

export async function createSubscription(
  userId: string,
  data: {
    name: string;
    category: SubscriptionCategory;
    amount: number;
    billingCycle: BillingCycle;
    nextDueDate: string;
    autoPay?: boolean;
    notes?: string;
  }
) {
  const sub = await prisma.subscription.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      amount: BigInt(Math.round(data.amount * 100)),
      billingCycle: data.billingCycle,
      nextDueDate: new Date(data.nextDueDate),
      autoPay: data.autoPay ?? false,
      notes: data.notes ?? null,
    },
  });
  return withFlags(sub);
}

export async function updateSubscription(
  id: string,
  userId: string,
  data: {
    name?: string;
    amount?: number;
    billingCycle?: BillingCycle;
    nextDueDate?: string;
    autoPay?: boolean;
    notes?: string;
  }
) {
  const sub = await prisma.subscription.update({
    where: { id, userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.amount !== undefined && { amount: BigInt(Math.round(data.amount * 100)) }),
      ...(data.billingCycle !== undefined && { billingCycle: data.billingCycle }),
      ...(data.nextDueDate !== undefined && { nextDueDate: new Date(data.nextDueDate) }),
      ...(data.autoPay !== undefined && { autoPay: data.autoPay }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  return withFlags(sub);
}

export async function deleteSubscription(id: string, userId: string) {
  return prisma.subscription.update({ where: { id, userId }, data: { isActive: false } });
}

export async function renewSubscription(id: string, userId: string) {
  const sub = await prisma.subscription.findFirst({ where: { id, userId, isActive: true } });
  if (!sub) return null;
  const newDueDate = advanceByOneCycle(sub.nextDueDate, sub.billingCycle);
  const updated = await prisma.subscription.update({
    where: { id },
    data: { nextDueDate: newDueDate },
  });
  return withFlags(updated);
}
```

- [ ] **Step 2: Create `server/src/controllers/subscriptions.ts`**

```typescript
import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/subscriptions.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const SUB_CATEGORIES = [
  "ott","internet","mobile","electricity","gas","water",
  "gym","cloud_storage","software","newspaper","other",
] as const;
const BILLING_CYCLES = ["monthly","quarterly","half_yearly","annual"] as const;

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(SUB_CATEGORIES),
  amount: z.number().min(0),
  billingCycle: z.enum(BILLING_CYCLES),
  nextDueDate: z.string().datetime(),
  autoPay: z.boolean().optional(),
  notes: z.string().max(300).optional(),
});

const updateSchema = createSchema.partial().omit({ category: true });

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listSubscriptions((req as AuthenticatedRequest).userId) });
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.getSubscriptionSummary((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({ success: true, data: await svc.createSubscription((req as AuthenticatedRequest).userId, parsed) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({ success: true, data: await svc.updateSubscription(getParam(req.params.id), (req as AuthenticatedRequest).userId, parsed) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteSubscription(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const renew = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.renewSubscription(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  if (!result) { res.status(404).json({ success: false, message: "Subscription not found" }); return; }
  res.json({ success: true, data: result });
});
```

- [ ] **Step 3: Create `server/src/routes/subscriptions.ts`**

```typescript
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as ctrl from "../controllers/subscriptions.js";

const router: Router = Router();
router.use(authenticate);

router.get("/", ctrl.list);
router.get("/summary", ctrl.summary);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/renew", ctrl.renew);

export { router as subscriptionsRouter };
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/subscriptions.ts server/src/controllers/subscriptions.ts server/src/routes/subscriptions.ts
git commit -m "feat: add subscriptions service, controller, and routes with renew + summary"
```

---

## Task 8: Emergency Fund — BankAccount + Budget Extensions

**Files:**
- Modify: `server/src/services/bankAccounts.ts`
- Modify: `server/src/services/budget.ts`
- Modify: `server/src/controllers/budget.ts`
- Modify: `server/src/routes/budget.ts`

- [ ] **Step 1: Add `isEmergencyFund` to `updateBankAccount` in `server/src/services/bankAccounts.ts`**

In the `updateBankAccount` function, add `isEmergencyFund?: boolean` to the `data` parameter type:

```typescript
export async function updateBankAccount(
  id: string,
  userId: string,
  data: {
    bankName?: string;
    accountType?: AccountType;
    accountNumberLast4?: string;
    ifscCode?: string;
    isActive?: boolean;
    balance?: bigint;
    balanceUpdatedAt?: Date;
    isEmergencyFund?: boolean;   // ADD THIS LINE
  },
) {
```

The rest of the function body is unchanged (it spreads `data` directly into Prisma, so the new field works automatically).

- [ ] **Step 2: Add `getEmergencyFundStatus` to `server/src/services/budget.ts`**

Append at the end of `server/src/services/budget.ts`:

```typescript
export async function getEmergencyFundStatus(userId: string) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const [efAccounts, expenses] = await Promise.all([
    prisma.bankAccount.findMany({ where: { userId, isActive: true, isEmergencyFund: true } }),
    prisma.expense.findMany({ where: { userId, isActive: true, date: { gte: threeMonthsAgo } } }),
  ]);

  const emergencyFundBalance = efAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const avgMonthlyExpenses = Math.round(totalExpenses / 3);
  const monthsCovered =
    avgMonthlyExpenses > 0
      ? Math.round((emergencyFundBalance / avgMonthlyExpenses) * 100) / 100
      : 0;
  const targetMonths = 6;
  const gapAmount = Math.max(0, targetMonths * avgMonthlyExpenses - emergencyFundBalance);

  return { emergencyFundBalance, avgMonthlyExpenses, monthsCovered, targetMonths, gapAmount };
}
```

- [ ] **Step 3: Add `emergencyFund` handler to `server/src/controllers/budget.ts`**

Append at the end of `server/src/controllers/budget.ts`:

```typescript
export const emergencyFund = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: await svc.getEmergencyFundStatus((req as AuthenticatedRequest).userId),
  });
});
```

- [ ] **Step 4: Add route to `server/src/routes/budget.ts`**

In `server/src/routes/budget.ts`, after `router.put("/:id", ctrl.update);`, add:

```typescript
router.get("/emergency-fund", ctrl.emergencyFund);
```

- [ ] **Step 5: Commit**

```bash
git add server/src/services/bankAccounts.ts server/src/services/budget.ts server/src/controllers/budget.ts server/src/routes/budget.ts
git commit -m "feat: add emergency fund status endpoint and isEmergencyFund to bank accounts"
```

---

## Task 9: Register All Routers in app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add imports after Phase 4 router imports**

```typescript
import { stocksRouter } from "./routes/stocks.js";
import { gstRouter } from "./routes/gst.js";
import { salarySlipsRouter } from "./routes/salarySlips.js";
import { documentsRouter } from "./routes/documents.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
```

- [ ] **Step 2: Register routes after Phase 4 routes**

After `app.use("/api/vehicles", vehiclesRouter);`, add:

```typescript
app.use("/api/stocks", stocksRouter);
app.use("/api/gst", gstRouter);
app.use("/api/salary-slips", salarySlipsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/subscriptions", subscriptionsRouter);
```

- [ ] **Step 3: Verify server starts**

```bash
cd server && pnpm dev
```

Expected: Server starts with no import errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "feat: register stocks, gst, salary-slips, documents, subscriptions routers"
```

---

## Task 10: Backend Tests — Stocks

**Files:**
- Create: `server/src/__tests__/stocks.test.ts`

- [ ] **Step 1: Write `server/src/__tests__/stocks.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "stocks-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let holdingId: string;
let txId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Stocks Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Stocks API", () => {
  it("POST /api/stocks creates a holding", async () => {
    const res = await request(app)
      .post("/api/stocks")
      .set("Cookie", cookies)
      .send({ familyMemberId: memberId, companyName: "TCS", tickerSymbol: "TCS", exchange: "nse", currentPrice: 3500 });
    expect(res.status).toBe(201);
    expect(res.body.data.tickerSymbol).toBe("TCS");
    expect(res.body.data.totalUnits).toBe(0);
    holdingId = res.body.data.id;
  });

  it("POST /api/stocks/:id/transactions adds a buy", async () => {
    const res = await request(app)
      .post(`/api/stocks/${holdingId}/transactions`)
      .set("Cookie", cookies)
      .send({ type: "buy", quantity: 10, price: 3400, date: "2025-06-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    txId = res.body.data.id;
  });

  it("GET /api/stocks returns computed P&L", async () => {
    const res = await request(app).get("/api/stocks").set("Cookie", cookies);
    expect(res.status).toBe(200);
    const holding = res.body.data[0];
    expect(holding.totalUnits).toBe(10);
    expect(holding.avgBuyPrice).toBe(340000); // ₹3400 in paise
    expect(holding.investedValue).toBe(3400000); // 10 * ₹3400 in paise
    expect(holding.currentValue).toBe(3500000);  // 10 * ₹3500 in paise
    expect(holding.unrealizedPL).toBe(100000);   // ₹1000 in paise
    expect(holding.unrealizedPLPercent).toBeCloseTo(2.94, 1);
  });

  it("GET /api/stocks/summary returns portfolio totals", async () => {
    const res = await request(app).get("/api/stocks/summary").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.holdingsCount).toBe(1);
    expect(res.body.data.totalUnrealizedPL).toBe(100000);
  });

  it("DELETE /api/stocks/:id/transactions/:txId removes transaction", async () => {
    const res = await request(app)
      .delete(`/api/stocks/${holdingId}/transactions/${txId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
  });

  it("DELETE /api/stocks/:id soft-deletes holding", async () => {
    const res = await request(app).delete(`/api/stocks/${holdingId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/stocks").set("Cookie", cookies);
    expect(list.body.data.find((h: any) => h.id === holdingId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run stocks tests**

```bash
cd server && pnpm test --reporter=verbose src/__tests__/stocks.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/stocks.test.ts
git commit -m "test: add stocks API integration tests"
```

---

## Task 11: Backend Tests — GST, Salary Slips, Documents, Subscriptions

**Files:**
- Create: `server/src/__tests__/gst.test.ts`
- Create: `server/src/__tests__/salarySlips.test.ts`
- Create: `server/src/__tests__/documents.test.ts`
- Create: `server/src/__tests__/subscriptions.test.ts`

- [ ] **Step 1: Write `server/src/__tests__/gst.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "gst-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let entryId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "GST Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("GST API", () => {
  it("PUT /api/gst/profile upserts business profile", async () => {
    const res = await request(app)
      .put("/api/gst/profile")
      .set("Cookie", cookies)
      .send({ businessName: "My Shop", gstNumber: "29AABCU9603R1ZP" });
    expect(res.status).toBe(200);
    expect(res.body.data.businessName).toBe("My Shop");
  });

  it("POST /api/gst/entries creates a GST entry", async () => {
    const res = await request(app)
      .post("/api/gst/entries")
      .set("Cookie", cookies)
      .send({ month: 4, year: 2025, turnover: 500000, taxableValue: 450000, cgst: 40500, sgst: 40500, netGstPayable: 81000 });
    expect(res.status).toBe(201);
    expect(res.body.data.month).toBe(4);
    entryId = res.body.data.id;
  });

  it("PUT /api/gst/entries/:id marks as filed", async () => {
    const res = await request(app)
      .put(`/api/gst/entries/${entryId}`)
      .set("Cookie", cookies)
      .send({ filed: true, filedDate: "2025-05-20T00:00:00.000Z" });
    expect(res.status).toBe(200);
    expect(res.body.data.filed).toBe(true);
  });

  it("GET /api/gst/summary returns annual totals", async () => {
    const res = await request(app).get("/api/gst/summary?fiscalYear=2025-26").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.monthsFiled).toBe(1);
    expect(res.body.data.totalTurnover).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Write `server/src/__tests__/salarySlips.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "salary-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let slipId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Salary Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Salary Slips API", () => {
  it("POST /api/salary-slips creates a slip", async () => {
    const res = await request(app)
      .post("/api/salary-slips")
      .set("Cookie", cookies)
      .send({ familyMemberId: memberId, month: 4, year: 2025, employerName: "Acme Corp", grossSalary: 80000, pfDeduction: 9600, tdsDeducted: 8000, netTakeHome: 62400 });
    expect(res.status).toBe(201);
    expect(res.body.data.employerName).toBe("Acme Corp");
    slipId = res.body.data.id;
  });

  it("GET /api/salary-slips?fiscalYear=2025-26 filters by FY", async () => {
    const res = await request(app).get("/api/salary-slips?fiscalYear=2025-26").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("GET /api/salary-slips/summary?fiscalYear=2025-26 returns totals", async () => {
    const res = await request(app).get("/api/salary-slips/summary?fiscalYear=2025-26").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.totalTdsDeducted).toBe(800000); // ₹8000 in paise
    expect(res.body.data.byMember.length).toBe(1);
  });

  it("DELETE /api/salary-slips/:id soft-deletes", async () => {
    const res = await request(app).delete(`/api/salary-slips/${slipId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Write `server/src/__tests__/documents.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "docs-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let docId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Docs Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Documents API", () => {
  it("POST /api/documents creates a document record", async () => {
    const res = await request(app)
      .post("/api/documents")
      .set("Cookie", cookies)
      .send({
        documentType: "passport",
        name: "My Passport",
        referenceNumber: "A1234567",
        expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        physicalLocation: "Top drawer",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.expiringSoon).toBe(true);   // < 60 days
    expect(typeof res.body.data.daysUntilExpiry).toBe("number");
    docId = res.body.data.id;
  });

  it("GET /api/documents returns list with expiry flags", async () => {
    const res = await request(app).get("/api/documents").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty("expiringSoon");
    expect(res.body.data[0]).toHaveProperty("daysUntilExpiry");
  });

  it("GET /api/documents?type=passport filters by type", async () => {
    const res = await request(app).get("/api/documents?type=passport").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.every((d: any) => d.documentType === "passport")).toBe(true);
  });

  it("DELETE /api/documents/:id soft-deletes", async () => {
    const res = await request(app).delete(`/api/documents/${docId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 4: Write `server/src/__tests__/subscriptions.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "subs-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let subId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Subs Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Subscriptions API", () => {
  it("POST /api/subscriptions creates a subscription", async () => {
    const res = await request(app)
      .post("/api/subscriptions")
      .set("Cookie", cookies)
      .send({ name: "Netflix", category: "ott", amount: 649, billingCycle: "monthly", nextDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Netflix");
    expect(res.body.data.dueSoon).toBe(true);  // < 3 days
    expect(res.body.data.monthlyEquivalent).toBe(64900); // ₹649 in paise
    subId = res.body.data.id;
  });

  it("GET /api/subscriptions/summary returns spend totals", async () => {
    const res = await request(app).get("/api/subscriptions/summary").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.totalMonthlySpend).toBe(64900);
    expect(res.body.data.totalAnnualSpend).toBe(64900 * 12);
    expect(res.body.data.count).toBe(1);
  });

  it("POST /api/subscriptions/:id/renew advances nextDueDate by one month", async () => {
    const before = await request(app).get("/api/subscriptions").set("Cookie", cookies);
    const prevDate = new Date(before.body.data[0].nextDueDate);
    const res = await request(app).post(`/api/subscriptions/${subId}/renew`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    const newDate = new Date(res.body.data.nextDueDate);
    expect(newDate.getMonth()).toBe((prevDate.getMonth() + 1) % 12);
  });

  it("DELETE /api/subscriptions/:id soft-deletes", async () => {
    const res = await request(app).delete(`/api/subscriptions/${subId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 5: Run all new tests**

```bash
cd server && pnpm test --reporter=verbose src/__tests__/gst.test.ts src/__tests__/salarySlips.test.ts src/__tests__/documents.test.ts src/__tests__/subscriptions.test.ts src/__tests__/stocks.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Run full test suite**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/__tests__/gst.test.ts server/src/__tests__/salarySlips.test.ts server/src/__tests__/documents.test.ts server/src/__tests__/subscriptions.test.ts
git commit -m "test: add GST, salary slips, documents, and subscriptions integration tests"
```

---

## Task 12: Stocks Client Page

**Files:**
- Create: `client/src/pages/finance/StocksPage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/StocksPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { LineChart, Plus, Edit2, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import type { StockHoldingResponse, StockTransactionResponse, StockTransactionType, Exchange, Relationship } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface FamilyMember { id: string; name: string; relationship: Relationship }

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

const emptyForm = {
  familyMemberId: "",
  companyName: "",
  tickerSymbol: "",
  exchange: "nse" as Exchange,
  brokerName: "",
  currentPrice: "",
};

const emptyTxForm = {
  type: "buy" as StockTransactionType,
  quantity: "",
  price: "",
  date: new Date().toISOString().slice(0, 10),
  brokerage: "",
  notes: "",
};

export default function StocksPage() {
  const [holdings, setHoldings] = useState<StockHoldingResponse[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [summary, setSummary] = useState<{ totalInvested: number; totalCurrentValue: number; totalUnrealizedPL: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StockHoldingResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingTx, setAddingTx] = useState<string | null>(null);
  const [txForm, setTxForm] = useState(emptyTxForm);

  async function load() {
    const [hRes, sRes, mRes] = await Promise.all([
      fetch(`${API}/api/stocks`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/stocks/summary`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/family-members`, { credentials: "include" }).then((r) => r.json()),
    ]);
    if (hRes.success) setHoldings(hRes.data);
    if (sRes.success) setSummary(sRes.data);
    if (mRes.success) setMembers(mRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    const body = editing
      ? { companyName: form.companyName, brokerName: form.brokerName || undefined, currentPrice: parseFloat(form.currentPrice) }
      : { ...form, currentPrice: parseFloat(form.currentPrice), brokerName: form.brokerName || undefined };
    const url = editing ? `${API}/api/stocks/${editing.id}` : `${API}/api/stocks`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    if (res.success) { load(); setShowModal(false); }
    setSaving(false);
  }

  async function handleAddTx(holdingId: string) {
    const res = await fetch(`${API}/api/stocks/${holdingId}/transactions`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...txForm, quantity: parseFloat(txForm.quantity), price: parseFloat(txForm.price), brokerage: parseFloat(txForm.brokerage) || 0, date: new Date(txForm.date).toISOString() }),
    }).then((r) => r.json());
    if (res.success) { load(); setAddingTx(null); setTxForm(emptyTxForm); }
  }

  async function handleDeleteTx(holdingId: string, txId: string) {
    if (!confirm("Remove this transaction?")) return;
    const res = await fetch(`${API}/api/stocks/${holdingId}/transactions/${txId}`, { method: "DELETE", credentials: "include" }).then((r) => r.json());
    if (res.success) load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this holding?")) return;
    const res = await fetch(`${API}/api/stocks/${id}`, { method: "DELETE", credentials: "include" }).then((r) => r.json());
    if (res.success) setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LineChart className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stocks Portfolio</h1>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...emptyForm, familyMemberId: members[0]?.id ?? "" }); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90">
          <Plus className="h-4 w-4" /> Add Holding
        </button>
      </div>

      {/* Portfolio summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Invested", value: summary.totalInvested, neutral: true },
            { label: "Current Value", value: summary.totalCurrentValue, neutral: true },
            { label: "Unrealized P&L", value: summary.totalUnrealizedPL, neutral: false },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`mt-1 text-xl font-bold ${!s.neutral ? (s.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-slate-900 dark:text-white"}`}>
                {s.value >= 0 ? rupees(s.value) : `-${rupees(Math.abs(s.value))}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Holdings table */}
      {holdings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <LineChart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No stock holdings added yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {["Company", "Exchange", "Units", "Avg Buy", "CMP", "Invested", "Value", "P&L", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {holdings.map((h) => (
                  <>
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{h.tickerSymbol}</p>
                        <p className="text-xs text-slate-500">{h.companyName}</p>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs uppercase dark:bg-slate-700">{h.exchange}</span></td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{h.totalUnits}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rupees(h.avgBuyPrice)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rupees(h.currentPrice)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rupees(h.investedValue)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{rupees(h.currentValue)}</td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${h.unrealizedPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {h.unrealizedPL >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {h.unrealizedPL >= 0 ? rupees(h.unrealizedPL) : `-${rupees(Math.abs(h.unrealizedPL))}`}
                          <span className="text-xs font-normal">({h.unrealizedPLPercent.toFixed(1)}%)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setExpanded(expanded === h.id ? null : h.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                            {expanded === h.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => { setEditing(h); setForm({ familyMemberId: h.familyMemberId, companyName: h.companyName, tickerSymbol: h.tickerSymbol, exchange: h.exchange, brokerName: h.brokerName ?? "", currentPrice: String(h.currentPrice / 100) }); setShowModal(true); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(h.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === h.id && (
                      <tr key={`${h.id}-tx`}>
                        <td colSpan={9} className="bg-slate-50 px-6 py-4 dark:bg-slate-800/50">
                          <div className="space-y-2">
                            {h.transactions.map((tx) => (
                              <div key={tx.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                  <span className={`rounded-full px-2 py-0.5 font-medium uppercase ${tx.type === "buy" ? "bg-green-100 text-green-700" : tx.type === "sell" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{tx.type}</span>
                                  <span className="text-slate-500">{new Date(tx.date).toLocaleDateString("en-IN")}</span>
                                  <span className="text-slate-900 dark:text-white">{tx.quantity} @ {rupees(tx.price)}</span>
                                  {tx.brokerage > 0 && <span className="text-slate-400">Brokerage: {rupees(tx.brokerage)}</span>}
                                </div>
                                <button onClick={() => handleDeleteTx(h.id, tx.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ))}
                            {addingTx === h.id ? (
                              <div className="mt-2 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
                                <div className="grid grid-cols-3 gap-2">
                                  <select className="rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value as StockTransactionType })}>
                                    {["buy","sell","dividend","bonus","split"].map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <input type="number" placeholder="Qty" className="rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} />
                                  <input type="number" placeholder="Price (₹)" className="rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={txForm.price} onChange={(e) => setTxForm({ ...txForm, price: e.target.value })} />
                                  <input type="date" className="rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
                                  <input type="number" placeholder="Brokerage (₹)" className="rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={txForm.brokerage} onChange={(e) => setTxForm({ ...txForm, brokerage: e.target.value })} />
                                </div>
                                <div className="mt-2 flex justify-end gap-2">
                                  <button onClick={() => setAddingTx(null)} className="text-xs text-slate-500">Cancel</button>
                                  <button onClick={() => handleAddTx(h.id)} disabled={!txForm.quantity || !txForm.price} className="rounded bg-ocean-accent px-3 py-1 text-xs text-white disabled:opacity-50">Add</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setAddingTx(h.id); setTxForm({ ...emptyTxForm, date: new Date().toISOString().slice(0, 10) }); }} className="text-xs text-ocean-accent hover:underline">+ Add Transaction</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{editing ? "Edit Holding" : "Add Holding"}</h2>
            <div className="space-y-3">
              {!editing && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Owner</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.familyMemberId} onChange={(e) => setForm({ ...form, familyMemberId: e.target.value })}>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Exchange</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value as Exchange })}>
                      <option value="nse">NSE</option>
                      <option value="bse">BSE</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Company Name</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="e.g. TCS" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Ticker Symbol</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.tickerSymbol} onChange={(e) => setForm({ ...form, tickerSymbol: e.target.value.toUpperCase() })} placeholder="e.g. TCS" disabled={!!editing} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Current Price (₹)</label>
                  <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.currentPrice} onChange={(e) => setForm({ ...form, currentPrice: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Broker (optional)</label>
                  <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.brokerName} onChange={(e) => setForm({ ...form, brokerName: e.target.value })} placeholder="e.g. Zerodha" />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
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
git add client/src/pages/finance/StocksPage.tsx
git commit -m "feat: add StocksPage client with P&L table and transaction history"
```

---

## Task 13: GST, Salary Slips, Documents, Subscriptions Client Pages

**Files:**
- Create: `client/src/pages/finance/GSTPage.tsx`
- Create: `client/src/pages/finance/SalarySlipsPage.tsx`
- Create: `client/src/pages/finance/DocumentsPage.tsx`
- Create: `client/src/pages/finance/SubscriptionsPage.tsx`

- [ ] **Step 1: Create `client/src/pages/finance/GSTPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Receipt, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import type { GSTEntryResponse, GSTSummaryResponse } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function currentFiscalYear() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

const emptyForm = { month: 1, year: new Date().getFullYear(), turnover: "", taxableValue: "", cgst: "", sgst: "", igst: "", itcClaimed: "", netGstPayable: "", notes: "" };

export default function GSTPage() {
  const [fy, setFy] = useState(currentFiscalYear());
  const [summary, setSummary] = useState<GSTSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GSTEntryResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/api/gst/summary?fiscalYear=${fy}`, { credentials: "include" }).then((r) => r.json());
    if (res.success) setSummary(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [fy]);

  async function handleSave() {
    setSaving(true);
    const body = { ...form, turnover: parseFloat(form.turnover) || 0, taxableValue: parseFloat(form.taxableValue) || 0, cgst: parseFloat(form.cgst) || 0, sgst: parseFloat(form.sgst) || 0, igst: parseFloat(form.igst) || 0, itcClaimed: parseFloat(form.itcClaimed) || 0, netGstPayable: parseFloat(form.netGstPayable) || 0 };
    const url = editingEntry ? `${API}/api/gst/entries/${editingEntry.id}` : `${API}/api/gst/entries`;
    const method = editingEntry ? "PUT" : "POST";
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    if (res.success) { load(); setShowModal(false); }
    setSaving(false);
  }

  async function markFiled(entry: GSTEntryResponse) {
    await fetch(`${API}/api/gst/entries/${entry.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filed: true, filedDate: new Date().toISOString() }) });
    load();
  }

  const fyYears = () => {
    const y = parseInt(currentFiscalYear().split("-")[0]);
    return [`${y}-${String(y+1).slice(2)}`,`${y-1}-${String(y).slice(2)}`,`${y-2}-${String(y-1).slice(2)}`];
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Receipt className="h-7 w-7 text-ocean-accent" /><h1 className="text-2xl font-bold text-slate-900 dark:text-white">GST Tracker</h1></div>
        <div className="flex items-center gap-3">
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={fy} onChange={(e) => setFy(e.target.value)}>
            {fyYears().map((f) => <option key={f} value={f}>FY {f}</option>)}
          </select>
          <button onClick={() => { setEditingEntry(null); setForm({ ...emptyForm, year: parseInt(fy.split("-")[0]) + (new Date().getMonth() + 1 < 4 ? 0 : 0) }); setShowModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"><Plus className="h-4 w-4" /> Add Entry</button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[{ label: "Total Turnover", value: summary.totalTurnover },{ label: "GST Payable", value: summary.totalNetGstPayable },{ label: "ITC Claimed", value: summary.totalItcClaimed },{ label: "Months Filed", value: summary.monthsFiled, isCount: true }].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{(s as any).isCount ? `${s.value} / 12` : rupees(s.value as number)}</p>
            </div>
          ))}
        </div>
      )}

      {summary && summary.entries.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>{["Month","Turnover","Taxable Value","CGST","SGST","IGST","ITC","Net Payable","Status",""].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {summary.entries.map((e) => (
                <tr key={e.id} className="bg-white dark:bg-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{new Date(e.year, e.month - 1).toLocaleString("en-IN",{month:"short",year:"numeric"})}</td>
                  {[e.turnover, e.taxableValue, e.cgst, e.sgst, e.igst, e.itcClaimed, e.netGstPayable].map((v, i) => <td key={i} className="px-4 py-3 text-slate-600 dark:text-slate-300">{rupees(v)}</td>)}
                  <td className="px-4 py-3">{e.filed ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="h-3.5 w-3.5" />Filed</span> : <button onClick={() => markFiled(e)} className="flex items-center gap-1 text-xs text-amber-600 hover:underline"><AlertTriangle className="h-3.5 w-3.5" />Mark Filed</button>}</td>
                  <td className="px-4 py-3"><button onClick={() => { setEditingEntry(e); setForm({ month: e.month, year: e.year, turnover: String(e.turnover/100), taxableValue: String(e.taxableValue/100), cgst: String(e.cgst/100), sgst: String(e.sgst/100), igst: String(e.igst/100), itcClaimed: String(e.itcClaimed/100), netGstPayable: String(e.netGstPayable/100), notes: e.notes??""  }); setShowModal(true); }} className="text-xs text-ocean-accent hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{editingEntry ? "Edit GST Entry" : "Add GST Entry"}</h2>
            <div className="space-y-3">
              {!editingEntry && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Month</label>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.month} onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}>
                      {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString("en-IN",{month:"long"})}</option>)}
                    </select></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Year</label>
                    <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[["Turnover (₹)","turnover"],["Taxable Value (₹)","taxableValue"],["CGST (₹)","cgst"],["SGST (₹)","sgst"],["IGST (₹)","igst"],["ITC Claimed (₹)","itcClaimed"],["Net GST Payable (₹)","netGstPayable"]].map(([label, key]) => (
                  <div key={key}><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                    <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder="0" /></div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/finance/SalarySlipsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import type { SalarySlipResponse, SalarySlipSummaryResponse, Relationship } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface FamilyMember { id: string; name: string; relationship: Relationship }

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}
function currentFiscalYear() { const now = new Date(); const y = now.getFullYear(); const m = now.getMonth()+1; return m>=4?`${y}-${String(y+1).slice(2)}`:`${y-1}-${String(y).slice(2)}`; }

const emptyForm = { familyMemberId:"", month: new Date().getMonth()+1, year: new Date().getFullYear(), employerName:"", grossSalary:"", basic:"", hra:"", specialAllow:"", otherAllow:"", pfDeduction:"", professionalTax:"", tdsDeducted:"", otherDeductions:"", netTakeHome:"" };

export default function SalarySlipsPage() {
  const [fy, setFy] = useState(currentFiscalYear());
  const [slips, setSlips] = useState<SalarySlipResponse[]>([]);
  const [summary, setSummary] = useState<SalarySlipSummaryResponse | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [sRes, sumRes, mRes] = await Promise.all([
      fetch(`${API}/api/salary-slips?fiscalYear=${fy}`,{credentials:"include"}).then(r=>r.json()),
      fetch(`${API}/api/salary-slips/summary?fiscalYear=${fy}`,{credentials:"include"}).then(r=>r.json()),
      fetch(`${API}/api/family-members`,{credentials:"include"}).then(r=>r.json()),
    ]);
    if(sRes.success) setSlips(sRes.data);
    if(sumRes.success) setSummary(sumRes.data);
    if(mRes.success) setMembers(mRes.data);
    setLoading(false);
  }

  useEffect(()=>{load();},[fy]);

  async function handleSave() {
    setSaving(true);
    const f = (k: string) => parseFloat((form as any)[k]) || 0;
    const body = { ...form, grossSalary:f("grossSalary"), basic:f("basic"), hra:f("hra"), specialAllow:f("specialAllow"), otherAllow:f("otherAllow"), pfDeduction:f("pfDeduction"), professionalTax:f("professionalTax"), tdsDeducted:f("tdsDeducted"), otherDeductions:f("otherDeductions"), netTakeHome:f("netTakeHome") };
    const res = await fetch(`${API}/api/salary-slips`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json());
    if(res.success){load();setShowModal(false);}
    setSaving(false);
  }

  async function handleDelete(id:string){
    if(!confirm("Delete this slip?"))return;
    const res = await fetch(`${API}/api/salary-slips/${id}`,{method:"DELETE",credentials:"include"}).then(r=>r.json());
    if(res.success) setSlips(prev=>prev.filter(s=>s.id!==id));
  }

  const fyYears = ()=>{const y=parseInt(currentFiscalYear().split("-")[0]);return [`${y}-${String(y+1).slice(2)}`,`${y-1}-${String(y).slice(2)}`];};

  if(loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Briefcase className="h-7 w-7 text-ocean-accent"/><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Salary Slips</h1></div>
        <div className="flex items-center gap-3">
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={fy} onChange={(e)=>setFy(e.target.value)}>
            {fyYears().map(f=><option key={f} value={f}>FY {f}</option>)}
          </select>
          <button onClick={()=>{setForm({...emptyForm,familyMemberId:members[0]?.id??""});setShowModal(true);}} className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"><Plus className="h-4 w-4"/>Add Slip</button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[["Total Gross",summary.totalGrossSalary],["Total TDS",summary.totalTdsDeducted],["Total PF",summary.totalPfDeduction],["Net Take-Home",summary.totalNetTakeHome]].map(([l,v])=>(
            <div key={l as string} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500">{l as string}</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{rupees(v as number)}</p>
            </div>
          ))}
        </div>
      )}

      {slips.length===0?(
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700"><Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-300"/><p className="text-slate-500">No salary slips for FY {fy}.</p></div>
      ):(
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>{["Month","Member","Employer","Gross","PF","TDS","Net",""].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {slips.map(s=>(
                <tr key={s.id} className="bg-white dark:bg-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{new Date(s.year,s.month-1).toLocaleString("en-IN",{month:"short",year:"numeric"})}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.familyMember?.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.employerName}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{rupees(s.grossSalary)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rupees(s.pfDeduction)}</td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400">{rupees(s.tdsDeducted)}</td>
                  <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">{rupees(s.netTakeHome)}</td>
                  <td className="px-4 py-3"><button onClick={()=>handleDelete(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Add Salary Slip</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Member</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.familyMemberId} onChange={(e)=>setForm({...form,familyMemberId:e.target.value})}>
                    {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Month</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.month} onChange={(e)=>setForm({...form,month:parseInt(e.target.value)})}>
                    {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i).toLocaleString("en-IN",{month:"short"})}</option>)}
                  </select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Year</label>
                  <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.year} onChange={(e)=>setForm({...form,year:parseInt(e.target.value)})}/></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Employer Name</label>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.employerName} onChange={(e)=>setForm({...form,employerName:e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-3">
                {[["Gross Salary (₹)","grossSalary"],["Basic (₹)","basic"],["HRA (₹)","hra"],["Special Allow (₹)","specialAllow"],["PF Deduction (₹)","pfDeduction"],["TDS (₹)","tdsDeducted"],["Prof. Tax (₹)","professionalTax"],["Net Take-Home (₹)","netTakeHome"]].map(([label,key])=>(
                  <div key={key}><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                    <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={(form as any)[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})} placeholder="0"/></div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `client/src/pages/finance/DocumentsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { FolderOpen, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import type { DocumentRecordResponse, DocumentType, Relationship } from "@ai-personal-diary/shared/types/finance";
import { DOCUMENT_TYPE_LABELS } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
interface FamilyMember { id: string; name: string; relationship: Relationship }

const DOC_TYPES: DocumentType[] = ["pan_card","aadhaar","passport","driving_licence","voter_id","birth_certificate","property_sale_deed","property_tax_receipt","vehicle_rc","vehicle_insurance","puc_certificate","bank_passbook","fd_certificate","insurance_policy","investment_statement","education_certificate","other"];
const emptyForm = { familyMemberId:"", documentType:"pan_card" as DocumentType, name:"", referenceNumber:"", issueDate:"", expiryDate:"", physicalLocation:"", digitalHint:"", notes:"" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRecordResponse[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [filterType, setFilterType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DocumentRecordResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [dRes, mRes] = await Promise.all([
      fetch(`${API}/api/documents${filterType?`?type=${filterType}`:""}`,{credentials:"include"}).then(r=>r.json()),
      fetch(`${API}/api/family-members`,{credentials:"include"}).then(r=>r.json()),
    ]);
    if(dRes.success) setDocs(dRes.data);
    if(mRes.success) setMembers(mRes.data);
    setLoading(false);
  }

  useEffect(()=>{load();},[filterType]);

  async function handleSave() {
    setSaving(true);
    const body = {...form, familyMemberId:form.familyMemberId||undefined, referenceNumber:form.referenceNumber||undefined, issueDate:form.issueDate?new Date(form.issueDate).toISOString():undefined, expiryDate:form.expiryDate?new Date(form.expiryDate).toISOString():undefined, physicalLocation:form.physicalLocation||undefined, digitalHint:form.digitalHint||undefined, notes:form.notes||undefined };
    const url = editing?`${API}/api/documents/${editing.id}`:`${API}/api/documents`;
    const method = editing?"PUT":"POST";
    const res = await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json());
    if(res.success){load();setShowModal(false);}
    setSaving(false);
  }

  async function handleDelete(id:string){
    if(!confirm("Delete this record?"))return;
    const res = await fetch(`${API}/api/documents/${id}`,{method:"DELETE",credentials:"include"}).then(r=>r.json());
    if(res.success) setDocs(prev=>prev.filter(d=>d.id!==id));
  }

  if(loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><FolderOpen className="h-7 w-7 text-ocean-accent"/><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Vault</h1></div>
        <div className="flex items-center gap-3">
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={filterType} onChange={(e)=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {DOC_TYPES.map(t=><option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
          </select>
          <button onClick={()=>{setEditing(null);setForm({...emptyForm,familyMemberId:members[0]?.id??""});setShowModal(true);}} className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"><Plus className="h-4 w-4"/>Add Document</button>
        </div>
      </div>

      {docs.length===0?(
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700"><FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-300"/><p className="text-slate-500">No documents added yet.</p></div>
      ):(
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map(d=>(
            <div key={d.id} className={`rounded-xl border p-4 ${d.expiringSoon?"border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30":"border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{d.name}</p>
                    {d.expiringSoon&&<AlertTriangle className="h-3.5 w-3.5 text-amber-500"/>}
                  </div>
                  <p className="text-xs text-slate-500">{DOCUMENT_TYPE_LABELS[d.documentType]}</p>
                  {d.familyMember&&<p className="text-xs text-slate-400 mt-0.5">{d.familyMember.name}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>{setEditing(d);setForm({familyMemberId:d.familyMemberId??"",...d,issueDate:d.issueDate?.slice(0,10)??"",expiryDate:d.expiryDate?.slice(0,10)??"",referenceNumber:d.referenceNumber??"",physicalLocation:d.physicalLocation??"",digitalHint:d.digitalHint??"",notes:d.notes??""});setShowModal(true);}} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5"/></button>
                  <button onClick={()=>handleDelete(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                {d.referenceNumber&&<p className="text-slate-500">Ref: <span className="text-slate-700 dark:text-slate-300">••{d.referenceNumber.slice(-4)}</span></p>}
                {d.expiryDate&&<p className={d.expiringSoon?"font-medium text-amber-600":"text-slate-500"}>Expires: {new Date(d.expiryDate).toLocaleDateString("en-IN")}{d.daysUntilExpiry!==null&&` (${d.daysUntilExpiry}d)`}</p>}
                {d.physicalLocation&&<p className="text-slate-500">📍 {d.physicalLocation}</p>}
                {d.digitalHint&&<p className="text-slate-500">💻 {d.digitalHint}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{editing?"Edit Document":"Add Document"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.documentType} onChange={(e)=>setForm({...form,documentType:e.target.value as DocumentType})} disabled={!!editing}>
                    {DOC_TYPES.map(t=><option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
                  </select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Family Member</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.familyMemberId} onChange={(e)=>setForm({...form,familyMemberId:e.target.value})}>
                    <option value="">None</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Document Name</label><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="e.g. My Passport"/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Reference Number (partial)</label><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.referenceNumber} onChange={(e)=>setForm({...form,referenceNumber:e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Issue Date</label><input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.issueDate} onChange={(e)=>setForm({...form,issueDate:e.target.value})}/></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Expiry Date</label><input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.expiryDate} onChange={(e)=>setForm({...form,expiryDate:e.target.value})}/></div>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Physical Location</label><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.physicalLocation} onChange={(e)=>setForm({...form,physicalLocation:e.target.value})} placeholder="e.g. Top drawer in cupboard"/></div>
              <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Digital Hint</label><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.digitalHint} onChange={(e)=>setForm({...form,digitalHint:e.target.value})} placeholder="e.g. Google Drive > Family Docs"/></div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `client/src/pages/finance/SubscriptionsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { RefreshCcw, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import type { SubscriptionResponse, SubscriptionCategory, BillingCycle } from "@ai-personal-diary/shared/types/finance";
import { SUBSCRIPTION_CATEGORY_LABELS, BILLING_CYCLE_LABELS } from "@ai-personal-diary/shared/types/finance";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const SUB_CATEGORIES: SubscriptionCategory[] = ["ott","internet","mobile","electricity","gas","water","gym","cloud_storage","software","newspaper","other"];
const BILLING_CYCLES: BillingCycle[] = ["monthly","quarterly","half_yearly","annual"];
const emptyForm = { name:"", category:"ott" as SubscriptionCategory, amount:"", billingCycle:"monthly" as BillingCycle, nextDueDate:"", autoPay:false, notes:"" };

function rupees(paise: number) { return (paise/100).toLocaleString("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}); }

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionResponse[]>([]);
  const [summary, setSummary] = useState<{totalMonthlySpend:number;totalAnnualSpend:number;count:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SubscriptionResponse|null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [sRes,sumRes] = await Promise.all([
      fetch(`${API}/api/subscriptions`,{credentials:"include"}).then(r=>r.json()),
      fetch(`${API}/api/subscriptions/summary`,{credentials:"include"}).then(r=>r.json()),
    ]);
    if(sRes.success) setSubs(sRes.data);
    if(sumRes.success) setSummary(sumRes.data);
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  async function handleSave() {
    setSaving(true);
    const body = {...form, amount:parseFloat(form.amount), nextDueDate:new Date(form.nextDueDate).toISOString(), notes:form.notes||undefined};
    const url = editing?`${API}/api/subscriptions/${editing.id}`:`${API}/api/subscriptions`;
    const method = editing?"PUT":"POST";
    const res = await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(r=>r.json());
    if(res.success){load();setShowModal(false);}
    setSaving(false);
  }

  async function handleDelete(id:string){
    if(!confirm("Delete this subscription?"))return;
    const res = await fetch(`${API}/api/subscriptions/${id}`,{method:"DELETE",credentials:"include"}).then(r=>r.json());
    if(res.success) setSubs(prev=>prev.filter(s=>s.id!==id));
  }

  async function handleRenew(id:string){
    const res = await fetch(`${API}/api/subscriptions/${id}/renew`,{method:"POST",credentials:"include"}).then(r=>r.json());
    if(res.success) setSubs(prev=>prev.map(s=>s.id===id?res.data:s));
  }

  if(loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><RefreshCcw className="h-7 w-7 text-ocean-accent"/><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions & Bills</h1></div>
        <button onClick={()=>{setEditing(null);setForm({...emptyForm,nextDueDate:new Date().toISOString().slice(0,10)});setShowModal(true);}} className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"><Plus className="h-4 w-4"/>Add Subscription</button>
      </div>

      {summary&&(
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Monthly Burn</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{rupees(summary.totalMonthlySpend)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Annual Spend</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{rupees(summary.totalAnnualSpend)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">Active Subscriptions</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.count}</p></div>
        </div>
      )}

      {subs.length===0?(
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700"><RefreshCcw className="mx-auto mb-3 h-10 w-10 text-slate-300"/><p className="text-slate-500">No subscriptions added yet.</p></div>
      ):(
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map(s=>(
            <div key={s.id} className={`rounded-xl border p-4 ${s.dueSoon?"border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30":"border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{s.name}</p>
                    {s.dueSoon&&<AlertTriangle className="h-3.5 w-3.5 text-amber-500"/>}
                    {s.autoPay&&<span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">AutoPay</span>}
                  </div>
                  <p className="text-xs text-slate-500">{SUBSCRIPTION_CATEGORY_LABELS[s.category]}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>{setEditing(s);setForm({name:s.name,category:s.category,amount:String(s.amount/100),billingCycle:s.billingCycle,nextDueDate:s.nextDueDate.slice(0,10),autoPay:s.autoPay,notes:s.notes??""});setShowModal(true);}} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-3.5 w-3.5"/></button>
                  <button onClick={()=>handleDelete(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Amount</span><p className="font-semibold text-slate-900 dark:text-white">{rupees(s.amount)} / {BILLING_CYCLE_LABELS[s.billingCycle]}</p></div>
                <div><span className="text-slate-500">Monthly equiv.</span><p className="font-medium text-slate-700 dark:text-slate-300">{rupees(s.monthlyEquivalent)}</p></div>
                <div className="col-span-2"><span className="text-slate-500">Due</span><p className={`font-medium ${s.dueSoon?"text-amber-600":"text-slate-900 dark:text-white"}`}>{new Date(s.nextDueDate).toLocaleDateString("en-IN")}</p></div>
              </div>
              <button onClick={()=>handleRenew(s.id)} className="mt-3 w-full rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Mark Renewed</button>
            </div>
          ))}
        </div>
      )}

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{editing?"Edit Subscription":"Add Subscription"}</h2>
            <div className="space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Name</label><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="e.g. Netflix"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Category</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.category} onChange={(e)=>setForm({...form,category:e.target.value as SubscriptionCategory})} disabled={!!editing}>
                    {SUB_CATEGORIES.map(c=><option key={c} value={c}>{SUBSCRIPTION_CATEGORY_LABELS[c]}</option>)}
                  </select></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Billing Cycle</label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.billingCycle} onChange={(e)=>setForm({...form,billingCycle:e.target.value as BillingCycle})}>
                    {BILLING_CYCLES.map(c=><option key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Amount (₹)</label><input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/></div>
                <div><label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Next Due Date</label><input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={form.nextDueDate} onChange={(e)=>setForm({...form,nextDueDate:e.target.value})}/></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.autoPay} onChange={(e)=>setForm({...form,autoPay:e.target.checked})} className="rounded"/>
                AutoPay enabled
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={()=>setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving?"Saving...":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit all 4 pages**

```bash
git add client/src/pages/finance/GSTPage.tsx client/src/pages/finance/SalarySlipsPage.tsx client/src/pages/finance/DocumentsPage.tsx client/src/pages/finance/SubscriptionsPage.tsx
git commit -m "feat: add GST, SalarySlips, Documents, and Subscriptions client pages"
```

---

## Task 14: Emergency Fund on BudgetPage + isEmergencyFund Toggle on BankAccountsPage

**Files:**
- Modify: `client/src/pages/finance/BudgetPage.tsx`
- Modify: `client/src/pages/finance/BankAccountsPage.tsx`

- [ ] **Step 1: Add Emergency Fund callout to `client/src/pages/finance/BudgetPage.tsx`**

In `BudgetPage.tsx`, add the following state and fetch:

```tsx
// Add with other state at the top:
const [efStatus, setEfStatus] = useState<{
  emergencyFundBalance: number;
  avgMonthlyExpenses: number;
  monthsCovered: number;
  targetMonths: number;
  gapAmount: number;
} | null>(null);

// Add to the load() function, alongside other fetches:
const efRes = await fetch(`${API}/api/budget/emergency-fund`, { credentials: "include" }).then((r) => r.json());
if (efRes.success) setEfStatus(efRes.data);
```

Add the Emergency Fund callout card just below the month navigator (before the noBudget check):

```tsx
{/* Emergency Fund callout — shown at top regardless of budget state */}
{efStatus && (
  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-slate-900 dark:text-white">Emergency Fund</h2>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${efStatus.monthsCovered >= efStatus.targetMonths ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
        {efStatus.monthsCovered.toFixed(1)} / {efStatus.targetMonths} months
      </span>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
      <div
        className={`h-full rounded-full transition-all ${efStatus.monthsCovered >= efStatus.targetMonths ? "bg-green-500" : "bg-amber-500"}`}
        style={{ width: `${Math.min(100, (efStatus.monthsCovered / efStatus.targetMonths) * 100)}%` }}
      />
    </div>
    <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
      <div><span className="text-slate-500">Balance</span><p className="font-medium text-slate-900 dark:text-white">{(efStatus.emergencyFundBalance / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</p></div>
      <div><span className="text-slate-500">Avg Monthly Expenses</span><p className="font-medium text-slate-900 dark:text-white">{(efStatus.avgMonthlyExpenses / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</p></div>
      <div><span className="text-slate-500">Gap</span><p className={`font-medium ${efStatus.gapAmount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{efStatus.gapAmount > 0 ? (efStatus.gapAmount / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) : "Covered ✓"}</p></div>
    </div>
    {efStatus.gapAmount > 0 && <p className="mt-2 text-xs text-slate-400">Tag bank accounts as "Emergency Fund" in the Bank Accounts page to track this balance.</p>}
  </div>
)}
```

- [ ] **Step 2: Add `isEmergencyFund` toggle to `client/src/pages/finance/BankAccountsPage.tsx`**

Find the existing BankAccountsPage.tsx and read the current account card markup. In the bank account card display area, add a toggle/checkbox for isEmergencyFund:

```tsx
// In the account card or list row, add a toggle:
<label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer mt-2">
  <input
    type="checkbox"
    checked={account.isEmergencyFund ?? false}
    onChange={async (e) => {
      await fetch(`${API}/api/bank-accounts/${account.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEmergencyFund: e.target.checked }),
      });
      // reload accounts
      load();
    }}
    className="rounded"
  />
  Emergency Fund
</label>
```

Note: You must first read the current BankAccountsPage.tsx to find the exact location for this toggle before editing.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/finance/BudgetPage.tsx client/src/pages/finance/BankAccountsPage.tsx
git commit -m "feat: add emergency fund callout to BudgetPage + isEmergencyFund toggle to BankAccountsPage"
```

---

## Task 15: Wire Routes and Sidebar

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add imports to `client/src/App.tsx`**

After Phase 4 page imports, add:

```tsx
import StocksPage from "./pages/finance/StocksPage";
import GSTPage from "./pages/finance/GSTPage";
import SalarySlipsPage from "./pages/finance/SalarySlipsPage";
import DocumentsPage from "./pages/finance/DocumentsPage";
import SubscriptionsPage from "./pages/finance/SubscriptionsPage";
```

After Phase 4 routes, add:

```tsx
<Route path="stocks" element={<StocksPage />} />
<Route path="gst" element={<GSTPage />} />
<Route path="salary-slips" element={<SalarySlipsPage />} />
<Route path="documents" element={<DocumentsPage />} />
<Route path="subscriptions" element={<SubscriptionsPage />} />
```

- [ ] **Step 2: Add icons and nav items to `client/src/components/layout/Sidebar.tsx`**

Add to the lucide-react import:

```tsx
LineChart,
Receipt,
Briefcase,
FolderOpen,
RefreshCcw,
```

Add to `mainNavItems` after Phase 4 entries:

```tsx
  { to: "/stocks", label: "Stocks", icon: LineChart },
  { to: "/gst", label: "GST Tracker", icon: Receipt },
  { to: "/salary-slips", label: "Salary Slips", icon: Briefcase },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/subscriptions", label: "Subscriptions", icon: RefreshCcw },
```

- [ ] **Step 3: Verify all pages load**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm dev
```

Navigate to `/stocks`, `/gst`, `/salary-slips`, `/documents`, `/subscriptions`. All pages render without errors. Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add Phase 5 client routes and sidebar nav"
```

---

## Task 16: Documentation Update

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add Phase 5 API endpoints**

```markdown
### Stocks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stocks` | List holdings with computed P&L |
| GET | `/api/stocks/summary` | Portfolio totals |
| POST | `/api/stocks` | Create holding |
| PUT | `/api/stocks/:id` | Update (including currentPrice) |
| DELETE | `/api/stocks/:id` | Soft delete |
| GET | `/api/stocks/:id/transactions` | Transaction history |
| POST | `/api/stocks/:id/transactions` | Add transaction |
| DELETE | `/api/stocks/:id/transactions/:txId` | Remove transaction |

### GST
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/gst/profile` | Get business profile |
| PUT | `/api/gst/profile` | Upsert business profile |
| GET | `/api/gst/entries?fiscalYear=2025-26` | Monthly GST entries |
| POST | `/api/gst/entries` | Add entry |
| PUT | `/api/gst/entries/:id` | Update (including `filed` flag) |
| DELETE | `/api/gst/entries/:id` | Hard delete |
| GET | `/api/gst/summary?fiscalYear=2025-26` | Annual totals + filing status |

### Salary Slips
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/salary-slips?fiscalYear=2025-26` | List slips |
| GET | `/api/salary-slips/summary?fiscalYear=2025-26` | Annual totals by member |
| POST | `/api/salary-slips` | Add slip |
| PUT | `/api/salary-slips/:id` | Update |
| DELETE | `/api/salary-slips/:id` | Soft delete |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents?type=passport` | List with `daysUntilExpiry` + `expiringSoon` (≤60 days) |
| POST | `/api/documents` | Create |
| PUT | `/api/documents/:id` | Update |
| DELETE | `/api/documents/:id` | Soft delete |

### Subscriptions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscriptions` | List with `dueSoon` (≤3 days) + `monthlyEquivalent` |
| GET | `/api/subscriptions/summary` | Monthly + annual burn rate |
| POST | `/api/subscriptions` | Create |
| PUT | `/api/subscriptions/:id` | Update |
| DELETE | `/api/subscriptions/:id` | Soft delete |
| POST | `/api/subscriptions/:id/renew` | Advance nextDueDate by one billing cycle |

### Emergency Fund
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budget/emergency-fund` | Computed status from `isEmergencyFund` bank accounts + last 3 months expenses |
```

- [ ] **Step 2: Add Phase 5 models to Database Schema section**

```markdown
### Phase 5 Models (Stocks / GST / Salary / Documents / Subscriptions)

- **StockHolding** — Parent holding per company/ticker. `totalUnits`, `avgBuyPrice`, `investedValue`, `currentValue`, `unrealizedPL`, `unrealizedPLPercent` computed from transactions at query time.
- **StockTransaction** — Hard-deleted (not soft-deleted). Types: buy, sell, dividend, bonus, split.
- **BusinessProfile** — One per user (unique on `userId`). Upserted via PUT.
- **GSTEntry** — Monthly GST record; `@@unique([userId, month, year])`. Hard-deleted.
- **SalarySlip** — `@@unique([userId, familyMemberId, month, year])`. Soft-deleted.
- **DocumentRecord** — Reference-only (no file storage). `daysUntilExpiry` and `expiringSoon` computed at query time. `familyMemberId` is optional.
- **Subscription** — `dueSoon` (nextDueDate ≤ 3 days) and `monthlyEquivalent` computed at query time. Renew endpoint advances `nextDueDate` by billing cycle.
- **BankAccount.isEmergencyFund** — Boolean field added to existing `BankAccount` model. Emergency fund balance = sum of matching accounts' `balance`.
```

- [ ] **Step 3: Run full quality check**

```bash
cd /home/mastergrok/Desktop/Work/mastergrok/ai-personal-dairy && pnpm test
```

Expected: All tests pass.

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: update architecture.md for Phase 5 (stocks, GST, salary, documents, subscriptions, emergency fund)"
```

---

## Self-Review Against Spec

**Spec Coverage Check:**

| Spec Requirement | Covered |
|-----------------|---------|
| StockHolding + StockTransaction models | Task 1 |
| BusinessProfile + GSTEntry models | Task 1 |
| SalarySlip model | Task 1 |
| DocumentRecord model | Task 1 |
| Subscription model | Task 1 |
| `isEmergencyFund` on BankAccount | Task 1 |
| User/FamilyMember relations | Task 1 |
| All Phase 5 shared types + label maps | Task 2 |
| Stocks CRUD + transaction CRUD | Task 3 |
| `totalUnits`, `avgBuyPrice`, `investedValue`, `currentValue`, `unrealizedPL`, `unrealizedPLPercent` computed | Task 3 |
| Portfolio summary endpoint | Task 3 |
| GST business profile upsert | Task 4 |
| GST entries CRUD + filing status | Task 4 |
| GST annual summary | Task 4 |
| Salary slips CRUD + fiscal year summary | Task 5 |
| Documents CRUD with `daysUntilExpiry` + `expiringSoon` (≤60 days) | Task 6 |
| Filter by document type | Task 6 |
| Subscriptions CRUD + `dueSoon` (≤3 days) | Task 7 |
| Renew endpoint advances nextDueDate by cycle | Task 7 |
| Monthly/annual spend summary | Task 7 |
| Emergency fund endpoint (`GET /api/budget/emergency-fund`) | Task 8 |
| `isEmergencyFund` in `updateBankAccount` | Task 8 |
| Register 5 routers | Task 9 |
| Tests for all 5 modules | Tasks 10–11 |
| StocksPage with P&L table + transaction accordion | Task 12 |
| GSTPage with monthly table + filing status | Task 13 |
| SalarySlipsPage with annual summary | Task 13 |
| DocumentsPage with expiry badges + type filter | Task 13 |
| SubscriptionsPage with burn rate + renew button | Task 13 |
| Emergency Fund callout on BudgetPage | Task 14 |
| isEmergencyFund toggle on BankAccountsPage | Task 14 |
| 5 new routes + sidebar nav | Task 15 |
| Documentation | Task 16 |

**Placeholder scan:** No TBD or TODO. All code complete. BankAccountsPage step 2 notes to read the file first — this is intentional since the file's internal structure isn't visible in this plan context.

**Type consistency:** `StockTransactionType` values ("buy", "sell", "dividend", "bonus", "split") consistent across Prisma enum, shared type, controller array, and client select. `BillingCycle` → `toMonthlyPaise` switch covers all 4 values matching the Prisma enum exactly.
