# Phase 2 — Investments: Mutual Funds, PPF/EPF/NPS, Gold, Properties

**Date:** 2026-04-08
**Status:** Approved

---

## Features

5. Mutual Funds (SIP + lumpsum tracking)
6. PPF / EPF / NPS
7. Gold Tracker (physical + SGB)
8. Properties & Real Estate

---

## 1. Data Model

```prisma
# ── Mutual Funds ──────────────────────────────────────────────────────────────

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
}

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
  sipAmount      BigInt?              // paise — null if no active SIP
  sipDate        Int?                 // day of month (1–28)
  sipStartDate   DateTime?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  transactions MFTransaction[]

  @@index([userId])
  @@index([familyMemberId])
}

model MFTransaction {
  id           String            @id @default(cuid())
  fundId       String
  fund         MutualFund        @relation(fields: [fundId], references: [id], onDelete: Cascade)
  type         MFTransactionType
  amount       BigInt                     // paise
  units        Float?
  nav          Float?                     // NAV at time of transaction
  date         DateTime
  notes        String?
  createdAt    DateTime          @default(now())

  @@index([fundId])
}

# ── PPF ───────────────────────────────────────────────────────────────────────

model PPFAccount {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  accountLast4   String?
  bankOrPostOffice String
  openingDate    DateTime
  maturityDate   DateTime                 // 15 years from opening
  currentBalance BigInt       @default(0) // paise — manual update
  annualContribution BigInt   @default(0) // paise — planned contribution this FY
  balanceUpdatedAt DateTime   @default(now())
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
}

# ── EPF ───────────────────────────────────────────────────────────────────────

model EPFAccount {
  id                    String       @id @default(cuid())
  userId                String
  user                  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId        String
  familyMember          FamilyMember @relation(fields: [familyMemberId], references: [id])
  uanLast4              String?
  employerName          String
  monthlyEmployeeContrib BigInt      @default(0) // paise
  monthlyEmployerContrib BigInt      @default(0) // paise
  currentBalance        BigInt       @default(0) // paise — manual update
  balanceUpdatedAt      DateTime     @default(now())
  isActive              Boolean      @default(true)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  @@index([userId])
}

# ── NPS ───────────────────────────────────────────────────────────────────────

enum NPSTier {
  tier1
  tier2
}

model NPSAccount {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  pranLast4      String?
  tier           NPSTier
  monthlyContrib BigInt       @default(0) // paise
  currentCorpus  BigInt       @default(0) // paise — manual update
  corpusUpdatedAt DateTime    @default(now())
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
}

# ── Post Office / NSC / KVP ───────────────────────────────────────────────────

enum PostOfficeSchemeType {
  nsc
  kvp
  scss
  mis                  // Monthly Income Scheme
  td                   // Time Deposit
  ppf                  // (if at post office vs bank — use PPFAccount instead)
  other
}

model PostOfficeScheme {
  id             String               @id @default(cuid())
  userId         String
  user           User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember         @relation(fields: [familyMemberId], references: [id])
  schemeType     PostOfficeSchemeType
  certificateLast4 String?
  amount         BigInt                       // paise — principal
  interestRate   Float
  purchaseDate   DateTime
  maturityDate   DateTime
  maturityAmount BigInt                       // paise — computed
  isActive       Boolean              @default(true)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@index([userId])
}

# ── Sovereign Gold Bonds ──────────────────────────────────────────────────────

model SGBHolding {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId String
  familyMember   FamilyMember @relation(fields: [familyMemberId], references: [id])
  seriesName     String                       // e.g. "SGB 2023-24 Series IV"
  units          Float
  issuePrice     BigInt                       // paise per gram
  currentPrice   BigInt                       // paise per gram — manual update
  issueDate      DateTime
  maturityDate   DateTime                     // 8 years from issue
  interestRate   Float        @default(2.5)   // 2.5% p.a. semi-annual
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
}

# ── Chit Fund ─────────────────────────────────────────────────────────────────

model ChitFund {
  id               String       @id @default(cuid())
  userId           String
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId   String
  familyMember     FamilyMember @relation(fields: [familyMemberId], references: [id])
  organizerName    String
  totalValue       BigInt                     // paise — prize chit value
  monthlyContrib   BigInt                     // paise
  durationMonths   Int
  startDate        DateTime
  endDate          DateTime
  monthWon         Int?                       // 1-based month when prize was won
  prizeReceived    BigInt?                    // paise — actual amount received (after deductions)
  isActive         Boolean      @default(true)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([userId])
}

# ── Gold (Physical) ───────────────────────────────────────────────────────────

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

model GoldHolding {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId  String
  familyMember    FamilyMember        @relation(fields: [familyMemberId], references: [id])
  description     String                              // "Gold chain", "Coin 10g"
  weightGrams     Float
  purity          GoldPurity
  purchaseDate    DateTime?
  purchasePricePerGram BigInt?                        // paise
  currentPricePerGram  BigInt          @default(0)   // paise — manual update
  priceUpdatedAt  DateTime            @default(now())
  storageLocation GoldStorageLocation @default(home)
  isActive        Boolean             @default(true)
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([userId])
  @@index([familyMemberId])
}

# ── Properties ────────────────────────────────────────────────────────────────

enum PropertyType {
  residential_flat
  independent_house
  plot
  agricultural_land
  commercial
  other
}

model Property {
  id                 String       @id @default(cuid())
  userId             String
  user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId     String
  familyMember       FamilyMember @relation(fields: [familyMemberId], references: [id])
  propertyType       PropertyType
  description        String                       // address/location hint
  areaValue          Float                        // area (in areaUnit)
  areaUnit           String       @default("sqft") // sqft, cents, acres, sqm
  purchaseDate       DateTime?
  purchasePrice      BigInt?                      // paise
  currentValue       BigInt       @default(0)     // paise — manual update
  valueUpdatedAt     DateTime     @default(now())
  rentalIncome       BigInt       @default(0)     // paise — monthly rental if any
  saleDeedDate       DateTime?
  registrationRefLast6 String?
  linkedLoanId       String?                      // FK to Loan (optional)
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([userId])
  @@index([familyMemberId])
}
```

### User model — add relations

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

---

## 2. API Design

Each investment type follows the same pattern:

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/mutual-funds` | List all active MFs |
| POST | `/api/mutual-funds` | Create |
| PUT | `/api/mutual-funds/:id` | Update |
| DELETE | `/api/mutual-funds/:id` | Soft delete |
| GET | `/api/mutual-funds/:id/transactions` | Transaction history |
| POST | `/api/mutual-funds/:id/transactions` | Add transaction |
| DELETE | `/api/mutual-funds/:id/transactions/:txId` | Remove transaction |

Similar CRUD for: `/api/ppf`, `/api/epf`, `/api/nps`, `/api/post-office-schemes`, `/api/sgb`, `/api/chit-funds`, `/api/gold`, `/api/properties`

**Portfolio summary:** `GET /api/investments/summary`
Returns total invested and current value per category, plus grand total.

---

## 3. Shared Types

```ts
// MutualFund, MFTransaction, PPFAccount, EPFAccount, NPSAccount,
// PostOfficeScheme, SGBHolding, ChitFund, GoldHolding, Property
// — one Response interface per model following BankAccountResponse pattern
// All BigInt fields serialized as string

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
```

---

## 4. UI Design

### Investments page (`/investments`)

Single page with **tab navigation** for each investment type:
`Mutual Funds | PPF/EPF/NPS | Gold | Properties | Post Office | SGB | Chit Funds`

**Summary cards at top:** Total invested, Total current value, Unrealized gain/loss, Total FD + investments combined.

Each tab shows a list of holdings with card-per-holding design (same pattern as BankAccountsPage).

### Net Worth page update (from Phase 1)

Phase 2 populates the investments, gold, and properties rows in the assets table.

---

## 5. Files to Create / Modify

| File | Action |
|------|--------|
| `server/prisma/schema.prisma` | Add all Phase 2 models |
| `shared/src/types/finance.ts` | Add investment response types |
| `server/src/services/mutualFunds.ts` | New |
| `server/src/controllers/mutualFunds.ts` | New |
| `server/src/routes/mutualFunds.ts` | New |
| `server/src/services/investments.ts` | New — portfolio summary |
| `server/src/controllers/investments.ts` | New — summary endpoint |
| `server/src/routes/investments.ts` | New |
| *(repeat for ppf, epf, nps, postOffice, sgb, chitFunds, gold, properties)* | New per module |
| `server/src/app.ts` | Register all new routers |
| `client/src/pages/finance/InvestmentsPage.tsx` | New — tabbed UI |
| `client/src/App.tsx` | Add `/investments` route |
| `client/src/components/layout/Sidebar.tsx` | Add Investments nav item |
