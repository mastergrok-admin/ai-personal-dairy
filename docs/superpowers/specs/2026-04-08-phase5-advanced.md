# Phase 5 — Stocks, GST, Salary Slip, Document Vault, Subscriptions, Emergency Fund

**Date:** 2026-04-08
**Status:** Approved

---

## Features

15. Stocks Portfolio
16. Business / GST Tracker
17. Salary Slip Analyzer
18. Document Vault (reference only — no file storage)
19. Subscription & Bill Tracker
20. Emergency Fund Tracker (overlay on budget/savings)

---

## 1. Data Model

```prisma
# ── Stocks ────────────────────────────────────────────────────────────────────

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
  currentPrice   BigInt       @default(0) // paise per share — manual update
  priceUpdatedAt DateTime     @default(now())
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  transactions StockTransaction[]

  @@index([userId])
  @@index([userId, tickerSymbol])
}

model StockTransaction {
  id          String               @id @default(cuid())
  holdingId   String
  holding     StockHolding         @relation(fields: [holdingId], references: [id], onDelete: Cascade)
  type        StockTransactionType
  quantity    Float
  price       BigInt               // paise per share
  date        DateTime
  brokerage   BigInt   @default(0) // paise
  notes       String?
  createdAt   DateTime @default(now())

  @@index([holdingId])
}

# ── GST / Business ────────────────────────────────────────────────────────────

enum GSTFilingType {
  gstr1       // outward supplies
  gstr3b      // monthly summary + payment
  gstr9       // annual return
  cmp08       // composition scheme quarterly
}

model BusinessProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessName String
  gstNumber    String?
  pan          String?                   // last 4 chars only
  isComposition Boolean  @default(false) // composition scheme
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model GSTEntry {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  month        Int
  year         Int
  fiscalYear   String
  turnover     BigInt                    // paise — sales
  taxableValue BigInt                    // paise
  cgst         BigInt        @default(0)
  sgst         BigInt        @default(0)
  igst         BigInt        @default(0)
  itcClaimed   BigInt        @default(0) // input tax credit
  netGstPayable BigInt       @default(0)
  filed        Boolean       @default(false)
  filedDate    DateTime?
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([userId, month, year])
  @@index([userId, fiscalYear])
}

# ── Salary Slip ───────────────────────────────────────────────────────────────

model SalarySlip {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId  String
  familyMember    FamilyMember @relation(fields: [familyMemberId], references: [id])
  month           Int
  year            Int
  employerName    String
  grossSalary     BigInt                   // paise
  basic           BigInt       @default(0)
  hra             BigInt       @default(0)
  specialAllow    BigInt       @default(0)
  otherAllow      BigInt       @default(0)
  pfDeduction     BigInt       @default(0) // employee PF
  professionalTax BigInt       @default(0)
  tdsDeducted     BigInt       @default(0)
  otherDeductions BigInt       @default(0)
  netTakeHome     BigInt                   // paise
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([userId, familyMemberId, month, year])
  @@index([userId])
}

# ── Document Vault ─────────────────────────────────────────────────────────────

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

model DocumentRecord {
  id               String       @id @default(cuid())
  userId           String
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId   String?
  familyMember     FamilyMember? @relation(fields: [familyMemberId], references: [id])
  documentType     DocumentType
  name             String
  referenceNumber  String?                  // doc number if applicable (partial, for reference)
  issueDate        DateTime?
  expiryDate       DateTime?
  physicalLocation String?                  // "Top drawer in cupboard", "Locker"
  digitalHint      String?                  // "Google Drive > Family Docs folder"
  notes            String?
  isActive         Boolean      @default(true)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([userId])
  @@index([userId, expiryDate])
}

# ── Subscriptions ─────────────────────────────────────────────────────────────

enum SubscriptionCategory {
  ott           // Netflix, Prime, Hotstar
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

model Subscription {
  id              String               @id @default(cuid())
  userId          String
  user            User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  category        SubscriptionCategory
  amount          BigInt                        // paise per cycle
  billingCycle    BillingCycle
  nextDueDate     DateTime
  autoPay         Boolean              @default(false)
  notes           String?
  isActive        Boolean              @default(true)
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([userId])
  @@index([userId, nextDueDate])
}
```

### Emergency Fund — no new model

Derived from Budget + existing data:
- Monthly expenses average (last 3 months from Expense Tracker)
- Emergency fund balance = sum of bank accounts tagged as "emergency fund"

Use an `AppSetting` key `emergencyFundBankAccountIds` (JSON array of bank account IDs) or add an `isEmergencyFund` boolean to `BankAccount`.

**Decision:** Add `isEmergencyFund Boolean @default(false)` to the existing `BankAccount` model.

### User model additions

```prisma
businessProfile   BusinessProfile?
gstEntries        GSTEntry[]
salarySlips       SalarySlip[]
documentRecords   DocumentRecord[]
subscriptions     Subscription[]
stockHoldings     StockHolding[]
```

---

## 2. API Design

### Stocks

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/stocks` | Holdings with computed P&L |
| POST | `/api/stocks` | Create holding |
| PUT | `/api/stocks/:id` | Update (including currentPrice) |
| DELETE | `/api/stocks/:id` | Soft delete |
| GET | `/api/stocks/:id/transactions` | Transaction history |
| POST | `/api/stocks/:id/transactions` | Buy/sell/dividend |
| DELETE | `/api/stocks/:id/transactions/:txId` | Remove |
| GET | `/api/stocks/summary` | Portfolio summary |

**Computed on GET:** `totalUnits` (buy − sell), `avgBuyPrice`, `investedValue`, `currentValue`, `unrealizedPL`, `unrealizedPLPercent`.

### GST

`GET /api/gst/profile` / `PUT /api/gst/profile` — business profile
`GET /api/gst/entries?fiscalYear=2025-26` — monthly GST entries
`POST|PUT|DELETE /api/gst/entries/:id` — CRUD
`GET /api/gst/summary?fiscalYear=2025-26` — annual totals, filing status

**Filing due date reminders** auto-generated: GSTR-3B due 20th of following month.

### Salary Slips

`GET /api/salary-slips?fiscalYear=2025-26` — all members
`POST|PUT|DELETE /api/salary-slips/:id`
`GET /api/salary-slips/summary?fiscalYear=2025-26` — annual income summary, total TDS deducted (feeds into Tax Planner)

### Documents

`GET /api/documents?type=passport` — list with upcoming expiry alerts
`POST|PUT|DELETE /api/documents/:id`

Response includes `daysUntilExpiry`, `expiringSoon` (≤ 60 days).

### Subscriptions

`GET /api/subscriptions` — list all, with `dueSoon` flag (≤ 3 days)
`POST|PUT|DELETE /api/subscriptions/:id`
`POST /api/subscriptions/:id/renew` — advance nextDueDate by one billing cycle

`GET /api/subscriptions/summary` — monthly spend total, annual spend total

### Emergency Fund

`GET /api/budget/emergency-fund` — returns:
```ts
{
  emergencyFundBalance: number  // sum of isEmergencyFund bank accounts
  avgMonthlyExpenses: number    // last 3 months average
  monthsCovered: number         // balance / avgMonthlyExpenses
  targetMonths: 6               // standard recommendation
  gapAmount: number             // (6 * avg) - balance, 0 if covered
}
```

---

## 3. UI Design

### Stocks page (`/stocks`)

Holdings table: company, exchange, units held, avg buy price, current price, invested, current value, P&L (₹ and %). Transaction history expandable per holding.

**Add transaction modal:** Buy/Sell/Dividend, quantity, price, date, brokerage.

### GST page (`/gst`)

Monthly table with turnover, GST payable, ITC, net payable, filed status. Filing reminder strip at top when GSTR-3B is due soon.

### Salary Slips page (`/salary-slips`)

Monthly rows per family member. Gross, deductions breakdown, net take-home. Annual summary at top: total gross, total TDS (linked to tax planner), annual take-home.

### Documents page (`/documents`)

Grid of document cards. Expiring documents shown first with amber/red badges. Filter by type or family member. No upload functionality — just metadata.

### Subscriptions page (`/subscriptions`)

Monthly calendar view showing upcoming due dates. List view with monthly/annual cost per subscription. Total monthly subscription burn rate shown prominently.

### Emergency Fund section

Embedded into the Budget page as a callout card at the top. Shows current months covered vs target (6 months) with a progress bar.

---

## 5. Files to Create / Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add all Phase 5 models + `isEmergencyFund` to BankAccount |
| `shared/src/types/finance.ts` | Add all Phase 5 response types |
| `server/src/services/stocks.ts` | New |
| `server/src/controllers/stocks.ts` | New |
| `server/src/routes/stocks.ts` | New |
| `server/src/services/gst.ts` | New |
| `server/src/controllers/gst.ts` | New |
| `server/src/routes/gst.ts` | New |
| `server/src/services/salarySlips.ts` | New |
| `server/src/controllers/salarySlips.ts` | New |
| `server/src/routes/salarySlips.ts` | New |
| `server/src/services/documents.ts` | New |
| `server/src/controllers/documents.ts` | New |
| `server/src/routes/documents.ts` | New |
| `server/src/services/subscriptions.ts` | New |
| `server/src/controllers/subscriptions.ts` | New |
| `server/src/routes/subscriptions.ts` | New |
| `server/src/services/bankAccounts.ts` | Add `isEmergencyFund` to update + emergency-fund endpoint |
| `server/src/app.ts` | Register 5 new routers |
| `client/src/pages/finance/StocksPage.tsx` | New |
| `client/src/pages/finance/GSTPage.tsx` | New |
| `client/src/pages/finance/SalarySlipsPage.tsx` | New |
| `client/src/pages/finance/DocumentsPage.tsx` | New |
| `client/src/pages/finance/SubscriptionsPage.tsx` | New |
| `client/src/pages/finance/BankAccountsPage.tsx` | Add isEmergencyFund toggle |
