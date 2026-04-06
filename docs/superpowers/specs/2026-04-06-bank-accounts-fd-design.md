# Bank Accounts — Edit Fix + Fixed Deposits Design

**Date:** 2026-04-06  
**Status:** Approved

---

## Problem Statement

1. The bank account edit modal omits the balance field — users cannot update balance from edit.
2. There is no Fixed Deposit (FD) tracking at all.

---

## Design Overview

### 1. Edit Modal Fix

Remove the separate inline "Update Balance" flow. Add a `balance` field directly to the edit modal. The `PUT /api/bank-accounts/:id` route already accepts all other fields via `updateSchema` — we extend it to also accept `balance`.

**Client change:** `EditFormState` gains a `balance` field. The `handleEdit` function sends `balance` in the PUT body. The inline balance update form and `updatingBalanceId` state are removed.

**Server change:** `updateSchema` in `controllers/bankAccounts.ts` gains `balance: z.number().min(0).optional()`. The service `updateBankAccount` converts it to BigInt and updates `balanceUpdatedAt` when provided.

---

### 2. Fixed Deposits

#### Data Model

New Prisma model `FixedDeposit`, linked to `BankAccount`:

```prisma
enum FDStatus {
  active
  matured
  broken
}

model FixedDeposit {
  id                    String     @id @default(cuid())
  userId                String
  user                  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccountId         String
  bankAccount           BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  fdReferenceNumberLast4 String?
  principalAmount       BigInt
  interestRate          Float
  tenureMonths          Int
  startDate             DateTime
  maturityDate          DateTime
  maturityAmount        BigInt
  autoRenewal           Boolean    @default(false)
  status                FDStatus   @default(active)
  isActive              Boolean    @default(true)
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  @@index([userId])
  @@index([bankAccountId])
}
```

`BankAccount` gains a `fixedDeposits FixedDeposit[]` relation.  
`User` gains a `fixedDeposits FixedDeposit[]` relation.

#### API

All routes under `/api/fixed-deposits`, protected by `authenticate`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fixed-deposits?bankAccountId=x` | List active FDs for an account |
| POST | `/api/fixed-deposits` | Create FD |
| PUT | `/api/fixed-deposits/:id` | Update FD details |
| DELETE | `/api/fixed-deposits/:id` | Soft delete (sets `isActive: false`) |

**Validation (Zod):**

- `createSchema`: `bankAccountId`, `principalAmount` (number ≥ 0), `interestRate` (number ≥ 0), `tenureMonths` (int ≥ 1), `startDate` (ISO string), `maturityDate` (ISO string), `maturityAmount` (number ≥ 0), `autoRenewal` (boolean, default false), `fdReferenceNumberLast4` (string length 4, optional), `status` (enum, default active)
- `updateSchema`: all fields optional

**Authorization:** FD must belong to the requesting user (verified via `userId` join in all queries).

#### Bank Account List Response

The `GET /api/bank-accounts` endpoint includes active FDs nested in each account:

```ts
include: {
  familyMember: { select: { name: true, relationship: true } },
  fixedDeposits: { where: { isActive: true } }
}
```

No separate fetch needed on the client.

#### Total Balance Computation

Done on the **client** side:

```ts
const totalBalance = account.balance + account.fixedDeposits
  .filter(fd => fd.status === 'active')
  .reduce((sum, fd) => sum + Number(fd.principalAmount), 0)
```

Displayed as:
- **₹X,XX,XXX** total (large, bold)
- Savings: ₹X,XXX · FDs: ₹X,XX,XXX (smaller, muted breakdown)

#### UI Structure

Each bank account card:

```
┌─────────────────────────────────────────────┐
│ SBI  [Savings]                   [Edit] [Del]│
│ ···· 7461 · SBIN0003966                      │
│ ₹4,18,000 total                              │
│ Savings: ₹18,000  ·  FDs: ₹4,00,000         │
├─────────────────────────────────────────────┤
│ Fixed Deposits (2)              [+ Add FD]   │
│ ┌──────────────────────────────────────────┐ │
│ │ SBI FD ···· 4521 [Active] [Auto-renews]  │ │
│ │ Principal: ₹2,00,000  Rate: 7.1%         │ │
│ │ Matures: 15 Jan 2026  Amount: ₹2,28,756  │ │
│ │                             [Edit] [Del] │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ SBI FD ···· 8832 [Active]                │ │
│ │ ...                          [Edit] [Del]│ │
│ └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Accounts with no FDs: show `[+ Add FD]` button only, no sub-section header
- Matured / broken / inactive FDs: not fetched, not shown

#### FD Add/Edit Modal Fields

| Field | Input Type | Required |
|-------|-----------|----------|
| FD Reference (last 4 digits) | text, maxLength 4 | No |
| Principal Amount (₹) | number | Yes |
| Interest Rate (%) | number, step 0.01 | Yes |
| Tenure (months) | number, min 1 | Yes |
| Start Date | date | Yes |
| Maturity Date | date | Yes |
| Maturity Amount (₹) | number | Yes |
| Auto-renewal | checkbox/toggle | No (default off) |
| Status | select: Active / Matured / Broken | Yes (default Active) |

---

## Shared Types

Add to `packages/shared/src/types.ts`:

```ts
export type FDStatus = 'active' | 'matured' | 'broken'

export interface FixedDepositResponse {
  id: string
  bankAccountId: string
  fdReferenceNumberLast4?: string
  principalAmount: number
  interestRate: number
  tenureMonths: number
  startDate: string
  maturityDate: string
  maturityAmount: number
  autoRenewal: boolean
  status: FDStatus
  createdAt: string
  updatedAt: string
}
```

`BankAccountResponse` gains `fixedDeposits: FixedDepositResponse[]`.

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `FDStatus` enum, `FixedDeposit` model, relations |
| `server/src/routes/fixedDeposits.ts` | New route file |
| `server/src/controllers/fixedDeposits.ts` | New controller with Zod validation |
| `server/src/services/fixedDeposits.ts` | New service (Prisma queries) |
| `server/src/app.ts` | Register `/api/fixed-deposits` router |
| `server/src/services/bankAccounts.ts` | Include `fixedDeposits` in list/get queries |
| `server/src/controllers/bankAccounts.ts` | Add `balance` to `updateSchema`, update service call |
| `packages/shared/src/types.ts` | Add `FixedDepositResponse`, extend `BankAccountResponse` |
| `client/src/pages/finance/BankAccountsPage.tsx` | Add FD sub-section, fix edit modal |

---

## Out of Scope

- FD interest calculation helpers (user enters maturity amount manually)
- FD reminders (can be added to the existing reminders system later)
- Balance history / audit log
