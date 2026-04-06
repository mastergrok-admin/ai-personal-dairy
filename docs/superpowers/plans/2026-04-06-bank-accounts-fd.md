# Bank Accounts — Edit Fix + Fixed Deposits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bank account balance editing and add Fixed Deposit (FD) tracking nested inside each bank account card, with auto-calculated maturity amounts.

**Architecture:** FDs are a new `FixedDeposit` Prisma model linked to `BankAccount` by `bankAccountId`. Bank account list responses embed active FDs. Total displayed balance = savings balance + sum of active FD principals. Maturity amount is auto-calculated server-side (quarterly compounding) and previewed live on the client. A shared utility function handles the formula used by both server and client.

**Tech Stack:** Prisma (PostgreSQL), Express, Zod, React 19, TypeScript strict mode, Vitest + supertest for server tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `shared/src/utils/fd.ts` | Create | FD maturity calculation + tenure utility |
| `shared/src/__tests__/fd.test.ts` | Create | Unit tests for FD utils |
| `shared/src/types/finance.ts` | Modify | Add `FDStatus`, `FixedDepositResponse`, extend `BankAccountResponse` |
| `shared/src/index.ts` | Modify | Export fd utils |
| `server/prisma/schema.prisma` | Modify | Add `FDStatus` enum, `FixedDeposit` model, add relations |
| `server/src/services/bankAccounts.ts` | Modify | Include FDs in queries; handle balance in update |
| `server/src/controllers/bankAccounts.ts` | Modify | Add `balance` to `updateSchema` |
| `server/src/services/fixedDeposits.ts` | Create | Prisma CRUD for FDs |
| `server/src/controllers/fixedDeposits.ts` | Create | Zod validation + route handlers |
| `server/src/routes/fixedDeposits.ts` | Create | Express router |
| `server/src/app.ts` | Modify | Register `/api/fixed-deposits` router |
| `server/src/__tests__/fixedDeposits.test.ts` | Create | Integration tests for FD endpoints |
| `client/src/pages/finance/BankAccountsPage.tsx` | Modify | Fix edit modal + add FD sub-section |

---

## Task 1: FD utility functions + shared types

**Files:**
- Create: `shared/src/utils/fd.ts`
- Create: `shared/src/__tests__/fd.test.ts`
- Modify: `shared/src/types/finance.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Write failing tests for FD utilities**

Create `shared/src/__tests__/fd.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateFDMaturityAmount, calculateFDTenureMonths } from "../utils/fd";

describe("calculateFDTenureMonths", () => {
  it("calculates full months between two dates", () => {
    const start = new Date("2024-01-15");
    const end = new Date("2026-01-15");
    expect(calculateFDTenureMonths(start, end)).toBe(24);
  });

  it("calculates partial year correctly", () => {
    const start = new Date("2024-03-01");
    const end = new Date("2025-09-01");
    expect(calculateFDTenureMonths(start, end)).toBe(18);
  });
});

describe("calculateFDMaturityAmount", () => {
  it("calculates quarterly compounded maturity for 1 year", () => {
    // P=100000, r=7%, n=4, t=1 => 100000 * (1 + 0.07/4)^4 = 107186 (approx)
    const result = calculateFDMaturityAmount(100000, 7, new Date("2024-01-01"), new Date("2025-01-01"));
    expect(result).toBeCloseTo(107186, -2);
  });

  it("calculates maturity for 2 years", () => {
    // P=200000, r=7.1%, 2 years quarterly
    const result = calculateFDMaturityAmount(200000, 7.1, new Date("2024-01-15"), new Date("2026-01-15"));
    expect(result).toBeGreaterThan(200000);
    expect(result).toBeLessThan(250000);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /path/to/project && pnpm --filter @diary/shared test
```

Expected: FAIL — "Cannot find module '../utils/fd'"

- [ ] **Step 3: Create the utility file**

Create `shared/src/utils/fd.ts`:

```ts
/**
 * Calculates the number of whole months between two dates.
 */
export function calculateFDTenureMonths(startDate: Date, maturityDate: Date): number {
  return (
    (maturityDate.getFullYear() - startDate.getFullYear()) * 12 +
    (maturityDate.getMonth() - startDate.getMonth())
  );
}

/**
 * Calculates FD maturity amount using quarterly compounding (standard Indian banks).
 * Formula: M = P × (1 + r/400)^(4 × t)
 * where P = principal (rupees), r = annual interest rate (%), t = tenure in years.
 * Returns amount in rupees (same unit as input).
 */
export function calculateFDMaturityAmount(
  principalRupees: number,
  annualRatePercent: number,
  startDate: Date,
  maturityDate: Date,
): number {
  const tenureYears =
    (maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(principalRupees * Math.pow(1 + annualRatePercent / 400, 4 * tenureYears));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @diary/shared test
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Add shared types for FixedDeposit**

In `shared/src/types/finance.ts`, add after the `AccountType` line and before `FamilyMemberResponse`:

```ts
export type FDStatus = "active" | "matured" | "broken";

export interface FixedDepositResponse {
  id: string;
  bankAccountId: string;
  fdReferenceNumberLast4: string | null;
  principalAmount: string;   // BigInt serialized as string
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  maturityAmount: string;    // BigInt serialized as string
  autoRenewal: boolean;
  status: FDStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Also extend `BankAccountResponse` — add `fixedDeposits` field:

```ts
export interface BankAccountResponse {
  id: string;
  familyMemberId: string;
  familyMember?: { name: string; relationship: Relationship };
  bankName: string;
  accountType: AccountType;
  accountNumberLast4: string;
  ifscCode: string | null;
  balance: string;
  balanceUpdatedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fixedDeposits: FixedDepositResponse[];   // ← add this line
}
```

- [ ] **Step 6: Export the fd utils from shared index**

In `shared/src/index.ts`, add:

```ts
export * from "./utils/fd";
```

- [ ] **Step 7: Build shared package**

```bash
pnpm --filter @diary/shared build
```

Expected: no errors, `shared/dist/` updated.

- [ ] **Step 8: Commit**

```bash
git add shared/src/utils/fd.ts shared/src/__tests__/fd.test.ts shared/src/types/finance.ts shared/src/index.ts shared/dist/
git commit -m "feat: add FD utility functions and shared types"
```

---

## Task 2: Prisma schema — add FixedDeposit model

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add FDStatus enum**

In `server/prisma/schema.prisma`, after the `ReminderFrequency` enum, add:

```prisma
enum FDStatus {
  active
  matured
  broken
}
```

- [ ] **Step 2: Add FixedDeposit model**

After the `BankAccount` model closing brace, add:

```prisma
model FixedDeposit {
  id                     String      @id @default(cuid())
  userId                 String
  user                   User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  bankAccountId          String
  bankAccount            BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)
  fdReferenceNumberLast4 String?
  principalAmount        BigInt
  interestRate           Float
  tenureMonths           Int
  startDate              DateTime
  maturityDate           DateTime
  maturityAmount         BigInt
  autoRenewal            Boolean     @default(false)
  status                 FDStatus    @default(active)
  isActive               Boolean     @default(true)
  createdAt              DateTime    @default(now())
  updatedAt              DateTime    @updatedAt

  @@index([userId])
  @@index([bankAccountId])
}
```

- [ ] **Step 3: Add relations to BankAccount and User models**

In the `BankAccount` model, add inside the model body (after `@@index([familyMemberId])`):

```prisma
  fixedDeposits FixedDeposit[]
```

In the `User` model, add after `reminders Reminder[]`:

```prisma
  fixedDeposits FixedDeposit[]
```

- [ ] **Step 4: Run migration**

```bash
pnpm --filter @diary/server db:migrate -- --name add-fixed-deposits
```

Expected output includes: "Your database is now in sync with your schema."

- [ ] **Step 5: Verify Prisma client is generated**

```bash
pnpm --filter @diary/server db:generate
```

Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add FixedDeposit model to Prisma schema"
```

---

## Task 3: Fix bank account balance update (server)

**Files:**
- Modify: `server/src/controllers/bankAccounts.ts` (lines 17–23)
- Modify: `server/src/services/bankAccounts.ts` (lines 44–60)

- [ ] **Step 1: Add balance to updateSchema in the controller**

In `server/src/controllers/bankAccounts.ts`, replace the `updateSchema` definition:

```ts
const updateSchema = z.object({
  bankName: z.string().min(1).max(100).optional(),
  accountType: z.enum(["savings", "current"]).optional(),
  accountNumberLast4: z.string().length(4).optional(),
  ifscCode: z.string().max(11).optional(),
  isActive: z.boolean().optional(),
  balance: z.number().min(0).optional(),
});
```

- [ ] **Step 2: Pass balance to the service in updateBankAccount handler**

In `server/src/controllers/bankAccounts.ts`, replace the `updateBankAccount` handler:

```ts
export const updateBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const { balance, ...rest } = data;
  const account = await bankAccountsService.updateBankAccount(
    getParam(req.params.id),
    userId,
    {
      ...rest,
      ...(balance !== undefined
        ? { balance: BigInt(Math.round(balance * 100)), balanceUpdatedAt: new Date() }
        : {}),
    },
  );
  res.json({ success: true, data: account });
});
```

- [ ] **Step 3: Extend the service's updateBankAccount to accept balance**

In `server/src/services/bankAccounts.ts`, replace the `updateBankAccount` function:

```ts
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
  },
) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data,
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}
```

- [ ] **Step 4: Also include fixedDeposits in listBankAccounts and getBankAccount**

In `server/src/services/bankAccounts.ts`, replace `listBankAccounts`:

```ts
export async function listBankAccounts(userId: string, familyMemberId?: string) {
  return prisma.bankAccount.findMany({
    where: {
      userId,
      isActive: true,
      ...(familyMemberId ? { familyMemberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}
```

Replace `getBankAccount`:

```ts
export async function getBankAccount(id: string, userId: string) {
  return prisma.bankAccount.findFirst({
    where: { id, userId },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}
```

Also update `createBankAccount`'s include:

```ts
export async function createBankAccount(
  userId: string,
  data: {
    familyMemberId: string;
    bankName: string;
    accountType: AccountType;
    accountNumberLast4: string;
    ifscCode?: string;
    balance: bigint;
  },
) {
  return prisma.bankAccount.create({
    data: {
      ...data,
      userId,
      balanceUpdatedAt: new Date(),
    },
    include: {
      familyMember: { select: { name: true, relationship: true } },
      fixedDeposits: { where: { isActive: true } },
    },
  });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm --filter @diary/server build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/bankAccounts.ts server/src/services/bankAccounts.ts
git commit -m "feat: add balance to bank account edit + include FDs in responses"
```

---

## Task 4: Fixed Deposits service

**Files:**
- Create: `server/src/services/fixedDeposits.ts`

- [ ] **Step 1: Create the service file**

Create `server/src/services/fixedDeposits.ts`:

```ts
import { prisma } from "../models/prisma.js";
import type { FDStatus } from "@prisma/client";

export async function listFixedDeposits(userId: string, bankAccountId: string) {
  return prisma.fixedDeposit.findMany({
    where: { userId, bankAccountId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFixedDeposit(id: string, userId: string) {
  return prisma.fixedDeposit.findFirst({
    where: { id, userId, isActive: true },
  });
}

export async function createFixedDeposit(
  userId: string,
  data: {
    bankAccountId: string;
    fdReferenceNumberLast4?: string;
    principalAmount: bigint;
    interestRate: number;
    tenureMonths: number;
    startDate: Date;
    maturityDate: Date;
    maturityAmount: bigint;
    autoRenewal: boolean;
    status: FDStatus;
  },
) {
  return prisma.fixedDeposit.create({
    data: { ...data, userId },
  });
}

export async function updateFixedDeposit(
  id: string,
  userId: string,
  data: {
    fdReferenceNumberLast4?: string;
    principalAmount?: bigint;
    interestRate?: number;
    tenureMonths?: number;
    startDate?: Date;
    maturityDate?: Date;
    maturityAmount?: bigint;
    autoRenewal?: boolean;
    status?: FDStatus;
  },
) {
  return prisma.fixedDeposit.update({
    where: { id, userId },
    data,
  });
}

export async function deleteFixedDeposit(id: string, userId: string) {
  return prisma.fixedDeposit.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @diary/server build
```

Expected: no errors.

---

## Task 5: Fixed Deposits controller + routes + register

**Files:**
- Create: `server/src/controllers/fixedDeposits.ts`
- Create: `server/src/routes/fixedDeposits.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create the controller**

Create `server/src/controllers/fixedDeposits.ts`:

```ts
import { z } from "zod";
import * as fdService from "../services/fixedDeposits.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import {
  calculateFDMaturityAmount,
  calculateFDTenureMonths,
} from "@diary/shared";
import type { FDStatus } from "@prisma/client";

const createSchema = z.object({
  bankAccountId: z.string().min(1),
  fdReferenceNumberLast4: z.string().length(4).optional(),
  principalAmount: z.number().min(0),
  interestRate: z.number().min(0),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  maturityDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  autoRenewal: z.boolean().default(false),
  status: z.enum(["active", "matured", "broken"]).default("active"),
});

const updateSchema = z.object({
  fdReferenceNumberLast4: z.string().length(4).optional(),
  principalAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  maturityDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  autoRenewal: z.boolean().optional(),
  status: z.enum(["active", "matured", "broken"]).optional(),
});

function deriveFields(
  principalRupees: number,
  interestRate: number,
  startDate: Date,
  maturityDate: Date,
) {
  const tenureMonths = calculateFDTenureMonths(startDate, maturityDate);
  const maturityRupees = calculateFDMaturityAmount(principalRupees, interestRate, startDate, maturityDate);
  return {
    tenureMonths,
    maturityAmount: BigInt(Math.round(maturityRupees * 100)),
  };
}

export const listFixedDeposits = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const bankAccountId = req.query.bankAccountId as string;
  if (!bankAccountId) {
    res.status(400).json({ success: false, error: "bankAccountId is required" });
    return;
  }
  const fds = await fdService.listFixedDeposits(userId, bankAccountId);
  res.json({ success: true, data: fds });
});

export const createFixedDeposit = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = createSchema.parse(req.body);
  const startDate = new Date(parsed.startDate);
  const maturityDate = new Date(parsed.maturityDate);
  const { tenureMonths, maturityAmount } = deriveFields(
    parsed.principalAmount,
    parsed.interestRate,
    startDate,
    maturityDate,
  );
  const fd = await fdService.createFixedDeposit(userId, {
    bankAccountId: parsed.bankAccountId,
    fdReferenceNumberLast4: parsed.fdReferenceNumberLast4,
    principalAmount: BigInt(Math.round(parsed.principalAmount * 100)),
    interestRate: parsed.interestRate,
    tenureMonths,
    startDate,
    maturityDate,
    maturityAmount,
    autoRenewal: parsed.autoRenewal,
    status: parsed.status as FDStatus,
  });
  res.status(201).json({ success: true, data: fd });
});

export const updateFixedDeposit = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = getParam(req.params.id);
  const parsed = updateSchema.parse(req.body);

  // Re-derive tenureMonths + maturityAmount if any of the calc inputs changed
  let derived: { tenureMonths?: number; maturityAmount?: bigint } = {};
  if (parsed.principalAmount !== undefined || parsed.interestRate !== undefined ||
      parsed.startDate !== undefined || parsed.maturityDate !== undefined) {
    const existing = await fdService.getFixedDeposit(id, userId);
    if (!existing) throw new NotFoundError("Fixed deposit not found");
    const principal = parsed.principalAmount ?? Number(existing.principalAmount) / 100;
    const rate = parsed.interestRate ?? existing.interestRate;
    const start = parsed.startDate ? new Date(parsed.startDate) : existing.startDate;
    const maturity = parsed.maturityDate ? new Date(parsed.maturityDate) : existing.maturityDate;
    derived = deriveFields(principal, rate, start, maturity);
  }

  const fd = await fdService.updateFixedDeposit(id, userId, {
    ...parsed,
    ...(parsed.startDate ? { startDate: new Date(parsed.startDate) } : {}),
    ...(parsed.maturityDate ? { maturityDate: new Date(parsed.maturityDate) } : {}),
    ...(parsed.principalAmount !== undefined
      ? { principalAmount: BigInt(Math.round(parsed.principalAmount * 100)) }
      : {}),
    ...(derived.tenureMonths !== undefined ? { tenureMonths: derived.tenureMonths } : {}),
    ...(derived.maturityAmount !== undefined ? { maturityAmount: derived.maturityAmount } : {}),
    status: parsed.status as FDStatus | undefined,
  });
  res.json({ success: true, data: fd });
});

export const deleteFixedDeposit = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await fdService.deleteFixedDeposit(getParam(req.params.id), userId);
  res.json({ success: true });
});
```

- [ ] **Step 2: Create the router**

Create `server/src/routes/fixedDeposits.ts`:

```ts
import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listFixedDeposits,
  createFixedDeposit,
  updateFixedDeposit,
  deleteFixedDeposit,
} from "../controllers/fixedDeposits.js";

export const fixedDepositsRouter: RouterType = Router();

fixedDepositsRouter.use(authenticate);
fixedDepositsRouter.get("/", listFixedDeposits);
fixedDepositsRouter.post("/", createFixedDeposit);
fixedDepositsRouter.put("/:id", updateFixedDeposit);
fixedDepositsRouter.delete("/:id", deleteFixedDeposit);
```

- [ ] **Step 3: Register the router in app.ts**

In `server/src/app.ts`, after the `import { remindersRouter }` line, add:

```ts
import { fixedDepositsRouter } from "./routes/fixedDeposits.js";
```

After `app.use("/api/reminders", remindersRouter);`, add:

```ts
app.use("/api/fixed-deposits", fixedDepositsRouter);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm --filter @diary/server build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/fixedDeposits.ts server/src/controllers/fixedDeposits.ts server/src/routes/fixedDeposits.ts server/src/app.ts
git commit -m "feat: add Fixed Deposits API (service, controller, routes)"
```

---

## Task 6: Server integration tests for FD endpoints

**Files:**
- Create: `server/src/__tests__/fixedDeposits.test.ts`

- [ ] **Step 1: Create the test file**

Create `server/src/__tests__/fixedDeposits.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";
import bcrypt from "bcrypt";

const EMAIL = `fd-test-${Date.now()}@example.com`;
let cookies: string[];
let bankAccountId: string;
let familyMemberId: string;
let fdId: string;

describe("Fixed Deposits API", () => {
  beforeAll(async () => {
    const role = await prisma.role.upsert({
      where: { name: "User" },
      update: {},
      create: { name: "User", description: "User role", isDefault: true },
    });

    const passwordHash = await bcrypt.hash("TestPass123!", 4);
    const user = await prisma.user.create({
      data: { email: EMAIL, name: "FD Test User", passwordHash, provider: "local" },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    const member = await prisma.familyMember.create({
      data: { userId: user.id, name: "Self", relationship: "self" },
    });
    familyMemberId = member.id;

    const account = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        familyMemberId: member.id,
        bankName: "State Bank of India",
        accountType: "savings",
        accountNumberLast4: "1234",
        balance: BigInt(5000000), // ₹50,000 in paise
        balanceUpdatedAt: new Date(),
      },
    });
    bankAccountId = account.id;

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: "TestPass123!" });
    cookies = [login.headers["set-cookie"]].flat();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  describe("POST /api/fixed-deposits", () => {
    it("creates an FD and auto-calculates tenure and maturity amount", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .set("Cookie", cookies)
        .send({
          bankAccountId,
          principalAmount: 200000,
          interestRate: 7.1,
          startDate: "2024-01-15",
          maturityDate: "2026-01-15",
          autoRenewal: false,
          status: "active",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankAccountId).toBe(bankAccountId);
      expect(res.body.data.tenureMonths).toBe(24);
      // maturityAmount should be > principal (stored in paise)
      expect(Number(res.body.data.maturityAmount)).toBeGreaterThan(20000000);
      expect(res.body.data.status).toBe("active");
      fdId = res.body.data.id;
    });

    it("stores optional fdReferenceNumberLast4", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .set("Cookie", cookies)
        .send({
          bankAccountId,
          fdReferenceNumberLast4: "4521",
          principalAmount: 100000,
          interestRate: 6.5,
          startDate: "2024-06-01",
          maturityDate: "2025-06-01",
          autoRenewal: true,
          status: "active",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fdReferenceNumberLast4).toBe("4521");
      expect(res.body.data.autoRenewal).toBe(true);
    });

    it("rejects missing bankAccountId", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .set("Cookie", cookies)
        .send({ principalAmount: 100000, interestRate: 7, startDate: "2024-01-01", maturityDate: "2025-01-01" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated request", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .send({ bankAccountId, principalAmount: 100000, interestRate: 7, startDate: "2024-01-01", maturityDate: "2025-01-01" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/fixed-deposits", () => {
    it("lists active FDs for a bank account", async () => {
      const res = await request(app)
        .get(`/api/fixed-deposits?bankAccountId=${bankAccountId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("returns 400 without bankAccountId", async () => {
      const res = await request(app)
        .get("/api/fixed-deposits")
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/fixed-deposits/:id", () => {
    it("updates status and recalculates when rate changes", async () => {
      const res = await request(app)
        .put(`/api/fixed-deposits/${fdId}`)
        .set("Cookie", cookies)
        .send({ interestRate: 7.5 });

      expect(res.status).toBe(200);
      expect(res.body.data.interestRate).toBe(7.5);
      // maturityAmount should have been recalculated
      expect(Number(res.body.data.maturityAmount)).toBeGreaterThan(20000000);
    });
  });

  describe("DELETE /api/fixed-deposits/:id", () => {
    it("soft-deletes an FD", async () => {
      const res = await request(app)
        .delete(`/api/fixed-deposits/${fdId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Should no longer appear in list
      const list = await request(app)
        .get(`/api/fixed-deposits?bankAccountId=${bankAccountId}`)
        .set("Cookie", cookies);
      const ids = list.body.data.map((fd: { id: string }) => fd.id);
      expect(ids).not.toContain(fdId);
    });
  });

  describe("GET /api/bank-accounts (FDs embedded)", () => {
    it("includes fixedDeposits array in each account", async () => {
      const res = await request(app)
        .get("/api/bank-accounts")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const account = res.body.data.find((a: { id: string }) => a.id === bankAccountId);
      expect(account).toBeDefined();
      expect(Array.isArray(account.fixedDeposits)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter @diary/server test
```

Expected: all FD tests PASS (plus existing auth/rbac/health tests).

- [ ] **Step 3: Commit**

```bash
git add server/src/__tests__/fixedDeposits.test.ts
git commit -m "test: add integration tests for Fixed Deposits API"
```

---

## Task 7: Client — fix edit modal (add balance, remove inline balance)

**Files:**
- Modify: `client/src/pages/finance/BankAccountsPage.tsx`

- [ ] **Step 1: Update EditFormState to include balance**

In `BankAccountsPage.tsx`, replace the `EditFormState` interface and `defaultEditForm`:

```ts
interface EditFormState {
  bankName: string;
  accountType: "savings" | "current";
  accountNumberLast4: string;
  ifscCode: string;
  balance: string;
}

const defaultEditForm: EditFormState = {
  bankName: INDIAN_BANKS[0],
  accountType: "savings",
  accountNumberLast4: "",
  ifscCode: "",
  balance: "",
};
```

- [ ] **Step 2: Remove inline balance update state**

Remove these state declarations (they are no longer needed):

```ts
// DELETE these three lines:
const [updatingBalanceId, setUpdatingBalanceId] = useState<string | null>(null);
const [balanceInput, setBalanceInput] = useState<string>("");
const [balanceSubmitting, setBalanceSubmitting] = useState(false);
```

- [ ] **Step 3: Update startEdit to populate balance**

Replace the `startEdit` function:

```ts
function startEdit(account: BankAccountResponse) {
  setEditingId(account.id);
  setEditForm({
    bankName: account.bankName,
    accountType: account.accountType,
    accountNumberLast4: account.accountNumberLast4,
    ifscCode: account.ifscCode ?? "",
    balance: (Number(account.balance) / 100).toFixed(0),
  });
}
```

- [ ] **Step 4: Update handleEdit to send balance**

Replace `handleEdit`:

```ts
async function handleEdit(e: React.FormEvent, accountId: string) {
  e.preventDefault();
  const balanceNum = parseFloat(editForm.balance);
  if (isNaN(balanceNum) || balanceNum < 0) {
    toast.error("Please enter a valid balance");
    return;
  }
  setEditSubmitting(true);
  try {
    await api.put<ApiResponse<BankAccountResponse>>(
      `/bank-accounts/${accountId}`,
      {
        bankName: editForm.bankName,
        accountType: editForm.accountType,
        accountNumberLast4: editForm.accountNumberLast4,
        ifscCode: editForm.ifscCode || undefined,
        balance: balanceNum,
      }
    );
    toast.success("Account updated");
    setEditingId(null);
    await fetchData();
  } catch {
    toast.error("Failed to update account");
  } finally {
    setEditSubmitting(false);
  }
}
```

- [ ] **Step 5: Delete handleBalanceUpdate and startBalanceUpdate functions**

Remove the `startBalanceUpdate` and `handleBalanceUpdate` functions entirely (they are replaced by the edit modal balance field).

- [ ] **Step 6: Add balance field to the edit modal form**

In the edit modal `<form>`, add after the IFSC Code `<div>`:

```tsx
<div className="sm:col-span-2">
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
    Current Balance (₹)
  </label>
  <input
    type="number"
    min="0"
    step="1"
    value={editForm.balance}
    onChange={(e) =>
      setEditForm((f) => ({ ...f, balance: e.target.value }))
    }
    className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
  />
</div>
```

- [ ] **Step 7: Remove inline balance update UI from account card**

In the account card JSX, remove:
1. The `{isUpdatingBalance && (<form ...>)}` block
2. The `{!isUpdatingBalance && (<button onClick={() => startBalanceUpdate(account)}>Update Balance</button>)}` button
3. The `const isUpdatingBalance = updatingBalanceId === account.id;` line

- [ ] **Step 8: Verify the client builds**

```bash
pnpm --filter @diary/client build
```

Expected: no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/finance/BankAccountsPage.tsx
git commit -m "feat: move balance editing into account edit modal"
```

---

## Task 8: Client — FD sub-section in bank account cards

**Files:**
- Modify: `client/src/pages/finance/BankAccountsPage.tsx`

- [ ] **Step 1: Add FD state and form types**

At the top of `BankAccountsPage.tsx`, add after the existing imports:

```ts
import { calculateFDMaturityAmount, calculateFDTenureMonths } from "@diary/shared";
import type { FixedDepositResponse, FDStatus } from "@diary/shared";
import { formatDate } from "@/utils/format";
```

Add these interfaces after `EditFormState`:

```ts
interface FDFormState {
  fdReferenceNumberLast4: string;
  principalAmount: string;
  interestRate: string;
  startDate: string;
  maturityDate: string;
  autoRenewal: boolean;
  status: FDStatus;
}

const defaultFDForm: FDFormState = {
  fdReferenceNumberLast4: "",
  principalAmount: "",
  interestRate: "",
  startDate: "",
  maturityDate: "",
  autoRenewal: false,
  status: "active",
};
```

- [ ] **Step 2: Add FD state variables inside BankAccountsPage**

After the delete confirm state declarations, add:

```ts
// FD state
const [addFDBankAccountId, setAddFDBankAccountId] = useState<string | null>(null);
const [fdForm, setFDForm] = useState<FDFormState>(defaultFDForm);
const [fdSubmitting, setFDSubmitting] = useState(false);
const [editingFDId, setEditingFDId] = useState<string | null>(null);
const [editFDForm, setEditFDForm] = useState<FDFormState>(defaultFDForm);
const [deleteFDTargetId, setDeleteFDTargetId] = useState<string | null>(null);
const [confirmDeleteFDOpen, setConfirmDeleteFDOpen] = useState(false);
```

- [ ] **Step 4: Add handleAddFD function**

```ts
async function handleAddFD(e: React.FormEvent) {
  e.preventDefault();
  if (!addFDBankAccountId) return;
  const principal = parseFloat(fdForm.principalAmount);
  const rate = parseFloat(fdForm.interestRate);
  if (isNaN(principal) || principal <= 0) { toast.error("Enter a valid principal amount"); return; }
  if (isNaN(rate) || rate <= 0) { toast.error("Enter a valid interest rate"); return; }
  if (!fdForm.startDate || !fdForm.maturityDate) { toast.error("Enter both start and maturity dates"); return; }
  if (new Date(fdForm.maturityDate) <= new Date(fdForm.startDate)) {
    toast.error("Maturity date must be after start date"); return;
  }
  setFDSubmitting(true);
  try {
    await api.post("/fixed-deposits", {
      bankAccountId: addFDBankAccountId,
      fdReferenceNumberLast4: fdForm.fdReferenceNumberLast4 || undefined,
      principalAmount: principal,
      interestRate: rate,
      startDate: fdForm.startDate,
      maturityDate: fdForm.maturityDate,
      autoRenewal: fdForm.autoRenewal,
      status: fdForm.status,
    });
    toast.success("Fixed deposit added");
    setAddFDBankAccountId(null);
    setFDForm(defaultFDForm);
    await fetchData();
  } catch {
    toast.error("Failed to add fixed deposit");
  } finally {
    setFDSubmitting(false);
  }
}
```

- [ ] **Step 5: Add handleEditFD and handleDeleteFD functions**

```ts
function startEditFD(fd: FixedDepositResponse) {
  setEditingFDId(fd.id);
  setEditFDForm({
    fdReferenceNumberLast4: fd.fdReferenceNumberLast4 ?? "",
    principalAmount: (Number(fd.principalAmount) / 100).toFixed(0),
    interestRate: fd.interestRate.toString(),
    startDate: fd.startDate.slice(0, 10),
    maturityDate: fd.maturityDate.slice(0, 10),
    autoRenewal: fd.autoRenewal,
    status: fd.status,
  });
}

async function handleEditFD(e: React.FormEvent) {
  e.preventDefault();
  if (!editingFDId) return;
  const principal = parseFloat(editFDForm.principalAmount);
  const rate = parseFloat(editFDForm.interestRate);
  if (isNaN(principal) || principal <= 0) { toast.error("Enter a valid principal amount"); return; }
  if (isNaN(rate) || rate <= 0) { toast.error("Enter a valid interest rate"); return; }
  setFDSubmitting(true);
  try {
    await api.put(`/fixed-deposits/${editingFDId}`, {
      fdReferenceNumberLast4: editFDForm.fdReferenceNumberLast4 || undefined,
      principalAmount: principal,
      interestRate: rate,
      startDate: editFDForm.startDate,
      maturityDate: editFDForm.maturityDate,
      autoRenewal: editFDForm.autoRenewal,
      status: editFDForm.status,
    });
    toast.success("Fixed deposit updated");
    setEditingFDId(null);
    await fetchData();
  } catch {
    toast.error("Failed to update fixed deposit");
  } finally {
    setFDSubmitting(false);
  }
}

async function handleDeleteFD() {
  if (!deleteFDTargetId) return;
  try {
    await api.delete(`/fixed-deposits/${deleteFDTargetId}`);
    toast.success("Fixed deposit removed");
    setConfirmDeleteFDOpen(false);
    setDeleteFDTargetId(null);
    await fetchData();
  } catch {
    toast.error("Failed to remove fixed deposit");
  }
}
```

- [ ] **Step 6: Add FD form JSX as a reusable fragment**

Add this helper component above the `BankAccountsPage` function (same file):

```tsx
function FDFormFields({
  form,
  onChange,
}: {
  form: FDFormState;
  onChange: (f: FDFormState) => void;
}) {
  const preview = (() => {
    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    if (!principal || !rate || !form.startDate || !form.maturityDate) return null;
    const start = new Date(form.startDate);
    const maturity = new Date(form.maturityDate);
    if (isNaN(start.getTime()) || isNaN(maturity.getTime()) || maturity <= start) return null;
    return {
      amount: calculateFDMaturityAmount(principal, rate, start, maturity),
      months: calculateFDTenureMonths(start, maturity),
    };
  })();

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          FD Reference (last 4 digits) <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          maxLength={4}
          value={form.fdReferenceNumberLast4}
          onChange={(e) => onChange({ ...form, fdReferenceNumberLast4: e.target.value.replace(/\D/g, "") })}
          placeholder="4521"
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value as FDStatus })}
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
        >
          <option value="active">Active</option>
          <option value="matured">Matured</option>
          <option value="broken">Broken</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Principal Amount (₹) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="1"
          required
          value={form.principalAmount}
          onChange={(e) => onChange({ ...form, principalAmount: e.target.value })}
          placeholder="200000"
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Annual Interest Rate (%) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={form.interestRate}
          onChange={(e) => onChange({ ...form, interestRate: e.target.value })}
          placeholder="7.1"
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Start Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          required
          value={form.startDate}
          onChange={(e) => onChange({ ...form, startDate: e.target.value })}
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Maturity Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          required
          value={form.maturityDate}
          onChange={(e) => onChange({ ...form, maturityDate: e.target.value })}
          className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.autoRenewal}
            onChange={(e) => onChange({ ...form, autoRenewal: e.target.checked })}
            className="rounded border-slate-300 dark:border-white/10"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Auto-renewal on maturity</span>
        </label>
      </div>

      {preview && (
        <div className="sm:col-span-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
            Projected (quarterly compounding)
          </p>
          <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">
            Maturity Amount: ₹{preview.amount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
            Tenure: {preview.months} months
          </p>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 7: Add FD modals to the JSX return**

After the existing Delete Confirm Modal, add the FD Add modal:

```tsx
{/* Add FD Modal */}
<Modal
  open={addFDBankAccountId !== null}
  onClose={() => { setAddFDBankAccountId(null); setFDForm(defaultFDForm); }}
  title="Add Fixed Deposit"
>
  <form onSubmit={handleAddFD} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FDFormFields form={fdForm} onChange={setFDForm} />
    <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={() => { setAddFDBankAccountId(null); setFDForm(defaultFDForm); }}
        className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Cancel
      </button>
      <ShimmerButton type="submit" disabled={fdSubmitting}>
        {fdSubmitting ? "Adding…" : "Add FD"}
      </ShimmerButton>
    </div>
  </form>
</Modal>

{/* Edit FD Modal */}
<Modal
  open={editingFDId !== null}
  onClose={() => { setEditingFDId(null); setEditingFDForAccountId(null); }}
  title="Edit Fixed Deposit"
>
  <form onSubmit={handleEditFD} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FDFormFields form={editFDForm} onChange={setEditFDForm} />
    <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={() => { setEditingFDId(null); setEditingFDForAccountId(null); }}
        className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Cancel
      </button>
      <ShimmerButton type="submit" disabled={fdSubmitting}>
        {fdSubmitting ? "Saving…" : "Save"}
      </ShimmerButton>
    </div>
  </form>
</Modal>

{/* Delete FD Confirm Modal */}
<Modal
  open={confirmDeleteFDOpen}
  onClose={() => setConfirmDeleteFDOpen(false)}
  title="Remove Fixed Deposit"
  description="This will permanently remove this fixed deposit. This cannot be undone."
>
  <div className="flex justify-end gap-3">
    <button
      onClick={() => setConfirmDeleteFDOpen(false)}
      className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
    >
      Cancel
    </button>
    <button
      onClick={handleDeleteFD}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
    >
      Remove
    </button>
  </div>
</Modal>
```

- [ ] **Step 8: Replace the account card balance display and add FD sub-section**

In the grouped account list, replace the existing account card render with this updated version (replacing everything inside `{memberAccounts.map((account) => { ... })}`):

```tsx
{memberAccounts.map((account) => {
  const activeFDs = account.fixedDeposits.filter(
    (fd) => fd.status === "active"
  );
  const fdTotal = activeFDs.reduce(
    (sum, fd) => sum + Number(fd.principalAmount),
    0
  );
  const savingsBalance = Number(account.balance);
  const totalBalance = savingsBalance + fdTotal;

  return (
    <div
      key={account.id}
      className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
    >
      {/* Account Header */}
      <div className="p-4 bg-white dark:bg-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {account.bankName}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  account.accountType === "savings"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                }`}
              >
                {account.accountType === "savings" ? "Savings" : "Current"}
              </span>
            </div>

            <p className="text-sm text-slate-400">
              ···· <span className="font-mono">{account.accountNumberLast4}</span>
              {account.ifscCode && (
                <span className="ml-3 text-slate-400 dark:text-slate-500">{account.ifscCode}</span>
              )}
            </p>

            <div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatINR(totalBalance)}
              </span>
              {fdTotal > 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Savings: {formatINR(savingsBalance)} · FDs: {formatINR(fdTotal)}
                </p>
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {balanceStaleness(account.balanceUpdatedAt).label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => startEdit(account)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => openDeleteConfirm(account.id, account.bankName)}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* FD Sub-section */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Fixed Deposits{activeFDs.length > 0 ? ` (${activeFDs.length})` : ""}
          </span>
          <button
            onClick={() => { setAddFDBankAccountId(account.id); setFDForm(defaultFDForm); }}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-ocean-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            + Add FD
          </button>
        </div>

        {activeFDs.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-1">No active fixed deposits</p>
        )}

        <div className="space-y-2">
          {activeFDs.map((fd) => (
            <div
              key={fd.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {fd.fdReferenceNumberLast4 ? (
                      <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                        FD ···· {fd.fdReferenceNumberLast4}
                      </span>
                    ) : (
                      <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                        Fixed Deposit
                      </span>
                    )}
                    {fd.autoRenewal && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        Auto-renews
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wide">Principal</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatINR(Number(fd.principalAmount))}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wide">Rate</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {fd.interestRate}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wide">Matures</span>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">
                        {formatDate(fd.maturityDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wide">Maturity Amt</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatINR(Number(fd.maturityAmount))}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {fd.tenureMonths} months · from {formatDate(fd.startDate)}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => startEditFD(fd)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setDeleteFDTargetId(fd.id); setConfirmDeleteFDOpen(true); }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
})}
```

- [ ] **Step 9: Verify client builds with no errors**

```bash
pnpm --filter @diary/client build
```

Expected: no TypeScript errors.

- [ ] **Step 10: Run all server tests to confirm nothing regressed**

```bash
pnpm --filter @diary/server test
```

Expected: all tests PASS.

- [ ] **Step 11: Final commit**

```bash
git add client/src/pages/finance/BankAccountsPage.tsx
git commit -m "feat: add Fixed Deposit sub-section to bank account cards with live maturity preview"
```

---

## Done

At this point:
- Balance is editable directly in the bank account edit modal
- Each bank account card shows its active FDs nested below with principal, rate, maturity date, and auto-calculated maturity amount
- Total balance = savings balance + active FD principals, shown with a breakdown line
- FDs can be added, edited, and deleted per account
- Maturity amount and tenure are auto-calculated (quarterly compounding) — never entered manually
- The FD form shows a live preview of projected maturity amount and tenure as the user types
