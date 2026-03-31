# Financial Dashboard Plan 1: Data Foundation + Sidebar Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Prisma models for FamilyMember and BankAccount, CRUD APIs for both, shared currency utilities, the SidebarLayout shell with Deep Ocean theme, and the Family + Bank Accounts UI pages.

**Architecture:** New Prisma models with BigInt for paise storage. Server follows existing asyncHandler + AppError pattern. Client gets a new SidebarLayout that wraps authenticated routes, while public routes keep the current Layout. Tailwind extended with Deep Ocean color tokens.

**Tech Stack:** Prisma, Express, React, Tailwind CSS, TypeScript, Zod

---

## File Structure

```
shared/src/
├── utils/
│   └── currency.ts              # CREATE: paiseTo Rupees, rupeesToPaise
├── types/
│   └── finance.ts               # CREATE: shared finance types
└── index.ts                     # MODIFY: export new modules

server/src/
├── services/
│   ├── familyMembers.ts         # CREATE: FamilyMember CRUD
│   └── bankAccounts.ts          # CREATE: BankAccount CRUD
├── controllers/
│   ├── familyMembers.ts         # CREATE: FamilyMember endpoints
│   └── bankAccounts.ts          # CREATE: BankAccount endpoints
├── routes/
│   ├── familyMembers.ts         # CREATE: FamilyMember routes
│   └── bankAccounts.ts          # CREATE: BankAccount routes
├── app.ts                       # MODIFY: register new routes
└── prisma/
    └── schema.prisma            # MODIFY: add new models + enums

client/src/
├── utils/
│   └── format.ts                # CREATE: formatINR, formatDate, daysUntil
├── components/
│   └── layout/
│       ├── SidebarLayout.tsx     # CREATE: sidebar + content shell
│       ├── Sidebar.tsx           # CREATE: navigation sidebar
│       └── Layout.tsx            # MODIFY: keep for public routes only
├── pages/
│   ├── finance/
│   │   ├── FamilyPage.tsx       # CREATE: family members CRUD page
│   │   └── BankAccountsPage.tsx # CREATE: bank accounts CRUD page
│   └── OverviewPage.tsx         # CREATE: placeholder overview (full in Plan 2)
├── App.tsx                      # MODIFY: restructure routes with SidebarLayout
└── tailwind.config.js           # MODIFY: add Deep Ocean tokens
```

---

### Task 1: Shared Currency Utilities

**Files:**
- Create: `shared/src/utils/currency.ts`
- Modify: `shared/src/index.ts`
- Create: `shared/src/__tests__/currency.test.ts`

- [ ] **Step 1: Create currency utility**

Create `shared/src/utils/currency.ts`:

```typescript
export function paiseToRupees(paise: number | bigint): number {
  return Number(paise) / 100;
}

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function formatINR(paise: number | bigint): string {
  const rupees = Number(paise) / 100;
  const isNegative = rupees < 0;
  const abs = Math.abs(rupees);

  const [intPart, decPart] = abs.toFixed(0).split(".");

  // Indian grouping: last 3 digits, then groups of 2
  let formatted: string;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formatted = `${groups},${last3}`;
  }

  const result = decPart ? `${formatted}.${decPart}` : formatted;
  return `${isNegative ? "-" : ""}₹${result}`;
}
```

- [ ] **Step 2: Export from barrel**

In `shared/src/index.ts`, add:

```typescript
export * from "./utils/currency";
```

- [ ] **Step 3: Write tests**

Create `shared/src/__tests__/currency.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "../utils/currency.js";

describe("Currency Utilities", () => {
  describe("paiseToRupees", () => {
    it("converts paise to rupees", () => {
      expect(paiseToRupees(12500000)).toBe(125000);
    });

    it("handles zero", () => {
      expect(paiseToRupees(0)).toBe(0);
    });

    it("handles BigInt", () => {
      expect(paiseToRupees(BigInt(12500000))).toBe(125000);
    });
  });

  describe("rupeesToPaise", () => {
    it("converts rupees to paise BigInt", () => {
      expect(rupeesToPaise(125000)).toBe(BigInt(12500000));
    });

    it("handles decimal rupees", () => {
      expect(rupeesToPaise(125000.50)).toBe(BigInt(12500050));
    });

    it("handles zero", () => {
      expect(rupeesToPaise(0)).toBe(BigInt(0));
    });
  });

  describe("formatINR", () => {
    it("formats with Indian grouping", () => {
      expect(formatINR(12500000)).toBe("₹1,25,000");
    });

    it("formats lakhs", () => {
      expect(formatINR(100000000)).toBe("₹10,00,000");
    });

    it("formats crores", () => {
      expect(formatINR(1000000000)).toBe("₹1,00,00,000");
    });

    it("formats small amounts", () => {
      expect(formatINR(50000)).toBe("₹500");
    });

    it("formats zero", () => {
      expect(formatINR(0)).toBe("₹0");
    });

    it("formats negative amounts", () => {
      expect(formatINR(-12500000)).toBe("-₹1,25,000");
    });

    it("handles BigInt input", () => {
      expect(formatINR(BigInt(12500000))).toBe("₹1,25,000");
    });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @diary/shared run test
```

Expected: All tests pass (9 existing + 10 new = 19).

- [ ] **Step 5: Commit**

```bash
git add shared/src/utils/currency.ts shared/src/index.ts shared/src/__tests__/currency.test.ts
git commit -m "feat: add INR currency formatting and conversion utilities"
```

---

### Task 2: Shared Finance Types

**Files:**
- Create: `shared/src/types/finance.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: Create finance types**

Create `shared/src/types/finance.ts`:

```typescript
export type Relationship = "self" | "spouse" | "parent" | "child" | "sibling" | "other";
export type AccountType = "savings" | "current";
export type LoanType = "home" | "car" | "personal" | "education" | "gold" | "other";

export interface FamilyMemberResponse {
  id: string;
  name: string;
  relationship: Relationship;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bankAccounts: number;
    creditCards: number;
    loans: number;
  };
}

export interface BankAccountResponse {
  id: string;
  familyMemberId: string;
  familyMember?: { name: string; relationship: Relationship };
  bankName: string;
  accountType: AccountType;
  accountNumberLast4: string;
  ifscCode: string | null;
  balance: string; // BigInt serialized as string in JSON
  balanceUpdatedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Canara Bank",
  "IndusInd Bank",
  "Yes Bank",
  "IDBI Bank",
  "Bank of India",
  "Federal Bank",
  "RBL Bank",
  "South Indian Bank",
  "Karur Vysya Bank",
  "AU Small Finance Bank",
  "Bandhan Bank",
  "IDFC First Bank",
] as const;
```

- [ ] **Step 2: Export from barrel**

In `shared/src/index.ts`, add:

```typescript
export * from "./types/finance";
```

- [ ] **Step 3: Build shared**

```bash
pnpm --filter @diary/shared run build
```

- [ ] **Step 4: Commit**

```bash
git add shared/src/types/finance.ts shared/src/index.ts
git commit -m "feat: add shared finance types and Indian bank names"
```

---

### Task 3: Prisma Models — FamilyMember + BankAccount

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add enums and models to schema.prisma**

Add after the `InviteStatus` enum:

```prisma
enum Relationship {
  self
  spouse
  parent
  child
  sibling
  other
}

enum AccountType {
  savings
  current
}
```

Add after the `AppSetting` model:

```prisma
model FamilyMember {
  id           String       @id @default(cuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  relationship Relationship
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  bankAccounts BankAccount[]

  @@index([userId])
}

model BankAccount {
  id                 String      @id @default(cuid())
  userId             String
  user               User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  familyMemberId     String
  familyMember       FamilyMember @relation(fields: [familyMemberId], references: [id])
  bankName           String
  accountType        AccountType
  accountNumberLast4 String
  ifscCode           String?
  balance            BigInt      @default(0)
  balanceUpdatedAt   DateTime    @default(now())
  isActive           Boolean     @default(true)
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  @@index([userId])
  @@index([familyMemberId])
}
```

Add inverse relations to the `User` model (after `invites Invite[]`):

```prisma
  familyMembers FamilyMember[]
  bankAccounts  BankAccount[]
```

- [ ] **Step 2: Push schema and generate**

```bash
pnpm --filter @diary/server run db:push
pnpm --filter @diary/server run db:generate
```

- [ ] **Step 3: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add FamilyMember and BankAccount Prisma models"
```

---

### Task 4: FamilyMember Service + Controller + Routes

**Files:**
- Create: `server/src/services/familyMembers.ts`
- Create: `server/src/controllers/familyMembers.ts`
- Create: `server/src/routes/familyMembers.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create service**

Create `server/src/services/familyMembers.ts`:

```typescript
import { prisma } from "../models/prisma.js";
import type { Relationship } from "@prisma/client";
import { ConflictError } from "../utils/errors.js";

export async function ensureSelfMember(userId: string) {
  const existing = await prisma.familyMember.findFirst({
    where: { userId, relationship: "self" },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return prisma.familyMember.create({
    data: {
      userId,
      name: user?.name ?? "Self",
      relationship: "self",
    },
  });
}

export async function listFamilyMembers(userId: string) {
  return prisma.familyMember.findMany({
    where: { userId },
    orderBy: [{ relationship: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { bankAccounts: true },
      },
    },
  });
}

export async function createFamilyMember(
  userId: string,
  data: { name: string; relationship: Relationship },
) {
  return prisma.familyMember.create({
    data: { ...data, userId },
    include: {
      _count: {
        select: { bankAccounts: true },
      },
    },
  });
}

export async function updateFamilyMember(
  id: string,
  userId: string,
  data: { name?: string; relationship?: Relationship },
) {
  return prisma.familyMember.update({
    where: { id, userId },
    data,
    include: {
      _count: {
        select: { bankAccounts: true },
      },
    },
  });
}

export async function deleteFamilyMember(id: string, userId: string) {
  const member = await prisma.familyMember.findFirst({
    where: { id, userId },
    include: { _count: { select: { bankAccounts: true } } },
  });

  if (!member) return null;

  if (member.relationship === "self") {
    throw new ConflictError("Cannot delete the Self member");
  }

  if (member._count.bankAccounts > 0) {
    throw new ConflictError("Cannot delete a family member with linked accounts. Remove their accounts first.");
  }

  return prisma.familyMember.delete({ where: { id } });
}
```

- [ ] **Step 2: Create controller**

Create `server/src/controllers/familyMembers.ts`:

```typescript
import { z } from "zod";
import * as familyMembersService from "../services/familyMembers.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  relationship: z.enum(["self", "spouse", "parent", "child", "sibling", "other"]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  relationship: z.enum(["self", "spouse", "parent", "child", "sibling", "other"]).optional(),
});

export const getFamilyMembers = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await familyMembersService.ensureSelfMember(userId);
  const members = await familyMembersService.listFamilyMembers(userId);
  res.json({ success: true, data: members });
});

export const createFamilyMember = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createSchema.parse(req.body);
  const member = await familyMembersService.createFamilyMember(userId, data);
  res.status(201).json({ success: true, data: member });
});

export const updateFamilyMember = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const member = await familyMembersService.updateFamilyMember(
    getParam(req.params.id),
    userId,
    data,
  );
  res.json({ success: true, data: member });
});

export const deleteFamilyMember = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const result = await familyMembersService.deleteFamilyMember(
    getParam(req.params.id),
    userId,
  );
  if (!result) {
    throw new NotFoundError("Family member not found");
  }
  res.json({ success: true });
});
```

- [ ] **Step 3: Create routes**

Create `server/src/routes/familyMembers.ts`:

```typescript
import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "../controllers/familyMembers.js";

export const familyMembersRouter: RouterType = Router();

familyMembersRouter.use(authenticate);
familyMembersRouter.get("/", getFamilyMembers);
familyMembersRouter.post("/", createFamilyMember);
familyMembersRouter.put("/:id", updateFamilyMember);
familyMembersRouter.delete("/:id", deleteFamilyMember);
```

- [ ] **Step 4: Register in app.ts**

In `server/src/app.ts`, add import:

```typescript
import { familyMembersRouter } from "./routes/familyMembers.js";
```

Add route before error handler:

```typescript
app.use("/api/family-members", familyMembersRouter);
```

- [ ] **Step 5: Run type-check and tests**

```bash
pnpm --filter @diary/server run type-check
pnpm --filter @diary/server run test
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/familyMembers.ts server/src/controllers/familyMembers.ts server/src/routes/familyMembers.ts server/src/app.ts
git commit -m "feat: add FamilyMember CRUD API with auto-created Self member"
```

---

### Task 5: BankAccount Service + Controller + Routes

**Files:**
- Create: `server/src/services/bankAccounts.ts`
- Create: `server/src/controllers/bankAccounts.ts`
- Create: `server/src/routes/bankAccounts.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create service**

Create `server/src/services/bankAccounts.ts`:

```typescript
import { prisma } from "../models/prisma.js";
import type { AccountType } from "@prisma/client";

export async function listBankAccounts(userId: string, familyMemberId?: string) {
  return prisma.bankAccount.findMany({
    where: {
      userId,
      isActive: true,
      ...(familyMemberId ? { familyMemberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function getBankAccount(id: string, userId: string) {
  return prisma.bankAccount.findFirst({
    where: { id, userId },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

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
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateBankAccount(
  id: string,
  userId: string,
  data: {
    bankName?: string;
    accountType?: AccountType;
    accountNumberLast4?: string;
    ifscCode?: string;
    isActive?: boolean;
  },
) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data,
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function updateBalance(id: string, userId: string, balance: bigint) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data: { balance, balanceUpdatedAt: new Date() },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
}

export async function deleteBankAccount(id: string, userId: string) {
  return prisma.bankAccount.update({
    where: { id, userId },
    data: { isActive: false },
  });
}
```

- [ ] **Step 2: Create controller**

Create `server/src/controllers/bankAccounts.ts`:

```typescript
import { z } from "zod";
import * as bankAccountsService from "../services/bankAccounts.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  bankName: z.string().min(1).max(100),
  accountType: z.enum(["savings", "current"]),
  accountNumberLast4: z.string().length(4),
  ifscCode: z.string().max(11).optional(),
  balance: z.number().min(0),
});

const updateSchema = z.object({
  bankName: z.string().min(1).max(100).optional(),
  accountType: z.enum(["savings", "current"]).optional(),
  accountNumberLast4: z.string().length(4).optional(),
  ifscCode: z.string().max(11).optional(),
  isActive: z.boolean().optional(),
});

const balanceSchema = z.object({
  balance: z.number().min(0),
});

export const getBankAccounts = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const familyMemberId = req.query.familyMemberId as string | undefined;
  const accounts = await bankAccountsService.listBankAccounts(userId, familyMemberId);
  res.json({ success: true, data: accounts });
});

export const getBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const account = await bankAccountsService.getBankAccount(getParam(req.params.id), userId);
  if (!account) {
    throw new NotFoundError("Bank account not found");
  }
  res.json({ success: true, data: account });
});

export const createBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createSchema.parse(req.body);
  const account = await bankAccountsService.createBankAccount(userId, {
    ...data,
    balance: BigInt(Math.round(data.balance * 100)),
  });
  res.status(201).json({ success: true, data: account });
});

export const updateBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const account = await bankAccountsService.updateBankAccount(
    getParam(req.params.id),
    userId,
    data,
  );
  res.json({ success: true, data: account });
});

export const updateBalance = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { balance } = balanceSchema.parse(req.body);
  const account = await bankAccountsService.updateBalance(
    getParam(req.params.id),
    userId,
    BigInt(Math.round(balance * 100)),
  );
  res.json({ success: true, data: account });
});

export const deleteBankAccount = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await bankAccountsService.deleteBankAccount(getParam(req.params.id), userId);
  res.json({ success: true });
});
```

- [ ] **Step 3: Create routes**

Create `server/src/routes/bankAccounts.ts`:

```typescript
import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  updateBalance,
  deleteBankAccount,
} from "../controllers/bankAccounts.js";

export const bankAccountsRouter: RouterType = Router();

bankAccountsRouter.use(authenticate);
bankAccountsRouter.get("/", getBankAccounts);
bankAccountsRouter.post("/", createBankAccount);
bankAccountsRouter.get("/:id", getBankAccount);
bankAccountsRouter.put("/:id", updateBankAccount);
bankAccountsRouter.put("/:id/balance", updateBalance);
bankAccountsRouter.delete("/:id", deleteBankAccount);
```

- [ ] **Step 4: Register in app.ts**

In `server/src/app.ts`, add import:

```typescript
import { bankAccountsRouter } from "./routes/bankAccounts.js";
```

Add route:

```typescript
app.use("/api/bank-accounts", bankAccountsRouter);
```

- [ ] **Step 5: Run type-check and tests**

```bash
pnpm --filter @diary/server run type-check
pnpm --filter @diary/server run test
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/bankAccounts.ts server/src/controllers/bankAccounts.ts server/src/routes/bankAccounts.ts server/src/app.ts
git commit -m "feat: add BankAccount CRUD API with balance update endpoint"
```

---

### Task 6: Client Formatting Utilities

**Files:**
- Create: `client/src/utils/format.ts`
- Create: `client/src/__tests__/format.test.ts`

- [ ] **Step 1: Create format utilities**

Create `client/src/utils/format.ts`:

```typescript
export function formatINR(paise: number | string | bigint): string {
  const num = Number(paise) / 100;
  const isNegative = num < 0;
  const abs = Math.abs(num);

  const intPart = Math.floor(abs).toString();

  let formatted: string;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formatted = `${groups},${last3}`;
  }

  return `${isNegative ? "-" : ""}₹${formatted}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = date.getDate().toString().padStart(2, "0");
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function daysUntil(dayOfMonth: number): { days: number; label: string } {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);

  const target = thisMonth >= now ? thisMonth : nextMonth;
  const diffMs = target.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return { days: 0, label: "Due today" };
  if (days === 1) return { days: 1, label: "Due tomorrow" };
  if (days < 0) return { days, label: `Overdue by ${Math.abs(days)} days` };
  return { days, label: `${days} days left` };
}

export function balanceStaleness(updatedAt: string): { stale: boolean; label: string } {
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return { stale: false, label: `Updated ${diffDays}d ago` };
  if (diffDays <= 30) return { stale: false, label: `Updated ${diffDays}d ago` };
  return { stale: true, label: `${diffDays} days old` };
}
```

- [ ] **Step 2: Write tests**

Create `client/src/__tests__/format.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatINR, formatDate, daysUntil } from "../utils/format";

describe("formatINR", () => {
  it("formats with Indian grouping", () => {
    expect(formatINR(12500000)).toBe("₹1,25,000");
  });

  it("formats lakhs", () => {
    expect(formatINR(100000000)).toBe("₹10,00,000");
  });

  it("formats crores", () => {
    expect(formatINR(1000000000)).toBe("₹1,00,00,000");
  });

  it("formats small amounts", () => {
    expect(formatINR(50000)).toBe("₹500");
  });

  it("formats zero", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("handles string input (BigInt serialized)", () => {
    expect(formatINR("12500000")).toBe("₹1,25,000");
  });
});

describe("formatDate", () => {
  it("formats ISO date to DD MMM YYYY", () => {
    expect(formatDate("2026-04-02T00:00:00.000Z")).toBe("02 Apr 2026");
  });
});

describe("daysUntil", () => {
  it("returns 'Due today' for today's date", () => {
    const today = new Date().getDate();
    const result = daysUntil(today);
    expect(result.label).toBe("Due today");
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @diary/client run test
```

- [ ] **Step 4: Commit**

```bash
git add client/src/utils/format.ts client/src/__tests__/format.test.ts
git commit -m "feat: add INR formatting, date formatting, and due date utilities"
```

---

### Task 7: Tailwind Deep Ocean Theme + Sidebar Layout

**Files:**
- Modify: `client/tailwind.config.js`
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/layout/SidebarLayout.tsx`

- [ ] **Step 1: Update Tailwind config with Deep Ocean tokens**

Replace `client/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          900: "#0f172a",
          800: "#1e3a5f",
          700: "#1e40af",
          accent: "#38bdf8",
          violet: "#818cf8",
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create Sidebar component**

Create `client/src/components/layout/Sidebar.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const mainNavItems = [
  { to: "/overview", label: "Overview", icon: "📊" },
  { to: "/bank-accounts", label: "Bank Accounts", icon: "🏦" },
  { to: "/credit-cards", label: "Credit Cards", icon: "💳" },
  { to: "/loans", label: "Loans", icon: "📋" },
  { to: "/family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { to: "/reminders", label: "Reminders", icon: "🔔" },
];

const adminNavItems = [
  { to: "/admin/users", label: "Users", permission: "user.read" },
  { to: "/admin/roles", label: "Roles", permission: "role.read" },
  { to: "/admin/permissions", label: "Permissions", permission: "permission.read" },
  { to: "/admin/settings", label: "Settings", permission: "admin.settings.read" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { hasPermission } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const hasAdminAccess = hasPermission("user.read");

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? "bg-ocean-accent/15 text-ocean-accent"
        : "text-white/60 hover:bg-white/5 hover:text-white/80"
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col bg-gradient-to-b from-ocean-900 to-ocean-800 transition-transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="bg-gradient-to-r from-ocean-accent to-ocean-violet bg-clip-text text-lg font-bold text-transparent">
            ₹ FinDiary
          </span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 space-y-1 px-3">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClasses}
              onClick={onClose}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* Invites */}
          <NavLink to="/invites" className={linkClasses} onClick={onClose}>
            <span className="text-base">✉️</span>
            <span>Invites</span>
          </NavLink>

          {/* Admin section */}
          {hasAdminAccess && (
            <>
              <div className="my-3 border-t border-white/10" />
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white/80"
              >
                <span className="flex items-center gap-3">
                  <span className="text-base">⚙️</span>
                  <span>Admin</span>
                </span>
                <span className={`transition-transform ${adminOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {adminOpen && (
                <div className="ml-6 space-y-1">
                  {adminNavItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={linkClasses}
                        onClick={onClose}
                      >
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
```

- [ ] **Step 3: Create SidebarLayout**

Create `client/src/components/layout/SidebarLayout.tsx`:

```tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { VerificationBanner } from "@/components/features/auth/VerificationBanner";

function SidebarLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const showVerificationBanner = user && !user.emailVerified;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {showVerificationBanner && <VerificationBanner />}
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}

export default SidebarLayout;
```

- [ ] **Step 4: Run type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

- [ ] **Step 5: Commit**

```bash
git add client/tailwind.config.js client/src/components/layout/Sidebar.tsx client/src/components/layout/SidebarLayout.tsx
git commit -m "feat: add Deep Ocean sidebar layout with responsive navigation"
```

---

### Task 8: Restructure Routes — SidebarLayout for Authenticated Pages

**Files:**
- Modify: `client/src/App.tsx`
- Create: `client/src/pages/OverviewPage.tsx`
- Create: `client/src/pages/finance/FamilyPage.tsx` (placeholder)
- Create: `client/src/pages/finance/BankAccountsPage.tsx` (placeholder)

- [ ] **Step 1: Create placeholder pages**

Create `client/src/pages/OverviewPage.tsx`:

```tsx
function OverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
      <p className="mt-2 text-slate-500">Your financial dashboard. Coming in Plan 2.</p>
    </div>
  );
}

export default OverviewPage;
```

Create `client/src/pages/finance/FamilyPage.tsx`:

```tsx
function FamilyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Family Members</h1>
      <p className="mt-2 text-slate-500">Manage your family members here.</p>
    </div>
  );
}

export default FamilyPage;
```

Create `client/src/pages/finance/BankAccountsPage.tsx`:

```tsx
function BankAccountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Bank Accounts</h1>
      <p className="mt-2 text-slate-500">Manage your bank accounts here.</p>
    </div>
  );
}

export default BankAccountsPage;
```

- [ ] **Step 2: Restructure App.tsx**

Replace `client/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import SidebarLayout from "./components/layout/SidebarLayout";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import OverviewPage from "./pages/OverviewPage";
import FamilyPage from "./pages/finance/FamilyPage";
import BankAccountsPage from "./pages/finance/BankAccountsPage";
import DashboardPage from "./pages/DashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";
import AdminPermissionsPage from "./pages/admin/AdminPermissionsPage";
import InvitePage from "./pages/InvitePage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import { ProtectedRoute } from "./components/features/auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public routes — simple header layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
      </Route>

      {/* Authenticated routes — sidebar layout */}
      <Route
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        <Route path="overview" element={<OverviewPage />} />
        <Route path="dashboard" element={<Navigate to="/overview" replace />} />
        <Route path="bank-accounts" element={<BankAccountsPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="invites" element={<InvitePage />} />

        {/* Placeholder routes for future pages */}
        <Route path="credit-cards" element={<OverviewPage />} />
        <Route path="loans" element={<OverviewPage />} />
        <Route path="reminders" element={<OverviewPage />} />

        {/* Admin routes */}
        <Route path="admin/users" element={<ProtectedRoute permission="user.read"><AdminUsersPage /></ProtectedRoute>} />
        <Route path="admin/roles" element={<ProtectedRoute permission="role.read"><AdminRolesPage /></ProtectedRoute>} />
        <Route path="admin/permissions" element={<ProtectedRoute permission="permission.read"><AdminPermissionsPage /></ProtectedRoute>} />
        <Route path="admin/settings" element={<ProtectedRoute permission="admin.settings.read"><AdminSettingsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Layout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

- [ ] **Step 3: Run type-check, build, and tests**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
pnpm --filter @diary/client run test
```

Expected: Type-check and build pass. Some existing tests may need updating if they reference the old Layout structure — update them if needed.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/pages/OverviewPage.tsx client/src/pages/finance/FamilyPage.tsx client/src/pages/finance/BankAccountsPage.tsx
git commit -m "feat: restructure routes with SidebarLayout for authenticated pages"
```

---

### Task 9: Family Page — Full CRUD UI

**Files:**
- Modify: `client/src/pages/finance/FamilyPage.tsx`

- [ ] **Step 1: Implement FamilyPage with full CRUD**

Replace `client/src/pages/finance/FamilyPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import type { ApiResponse } from "@diary/shared";
import type { FamilyMemberResponse, Relationship } from "@diary/shared";

const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

function FamilyPage() {
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("spouse");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMembers = async () => {
    const res = await api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members");
    if (res.success && res.data) setMembers(res.data);
    setIsLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setRelationship("spouse");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/family-members/${editingId}`, { name, relationship });
        toast.success("Member updated");
      } else {
        await api.post("/family-members", { name, relationship });
        toast.success("Member added");
      }
      resetForm();
      await loadMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (member: FamilyMemberResponse) => {
    setEditingId(member.id);
    setName(member.name);
    setRelationship(member.relationship);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/family-members/${id}`);
      toast.success("Member removed");
      await loadMembers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const relationshipBadge = (rel: Relationship) => {
    const colors: Record<Relationship, string> = {
      self: "bg-blue-100 text-blue-700",
      spouse: "bg-pink-100 text-pink-700",
      parent: "bg-purple-100 text-purple-700",
      child: "bg-green-100 text-green-700",
      sibling: "bg-amber-100 text-amber-700",
      other: "bg-slate-100 text-slate-700",
    };
    return `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[rel]}`;
  };

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Family Members</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700/90"
        >
          Add Member
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {editingId ? "Edit Member" : "Add Family Member"}
          </h2>
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="member-name" className="block text-xs font-medium text-slate-600">Name</label>
              <input
                id="member-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
                placeholder="Member name"
              />
            </div>
            <div>
              <label htmlFor="member-rel" className="block text-xs font-medium text-slate-600">Relationship</label>
              <select
                id="member-rel"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as Relationship)}
                className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-700/90 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-medium text-slate-900">{member.name}</div>
                <span className={relationshipBadge(member.relationship)}>
                  {member.relationship}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400">
                {member._count?.bankAccounts ?? 0} accounts
              </span>
              {member.relationship !== "self" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="text-xs text-ocean-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-500">No family members yet. Add your first member to get started.</p>
        </div>
      )}
    </div>
  );
}

export default FamilyPage;
```

- [ ] **Step 2: Run type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/finance/FamilyPage.tsx
git commit -m "feat: add Family Members page with full CRUD"
```

---

### Task 10: Bank Accounts Page — Full CRUD UI

**Files:**
- Modify: `client/src/pages/finance/BankAccountsPage.tsx`

- [ ] **Step 1: Implement BankAccountsPage with full CRUD**

Replace `client/src/pages/finance/BankAccountsPage.tsx` with a page that:
- Lists bank accounts grouped by family member
- "Add Account" button opens an inline form
- Form fields: Bank Name (select from INDIAN_BANKS), Account Type (savings/current), Last 4 Digits, IFSC (optional), Balance (₹ input), Family Member (select)
- Each account row shows: bank name, type badge, last 4 digits, balance (formatINR), staleness indicator
- "Update Balance" inline action (quick balance update)
- Edit and Delete actions
- Uses `formatINR` from `@/utils/format` and `INDIAN_BANKS` from `@diary/shared`
- Follows the same component patterns as FamilyPage (useState for form, loadAccounts on mount, toast for feedback)

The page should follow the exact same patterns as FamilyPage in Task 9 — read that code first, then adapt for bank accounts. Key differences:
- More form fields (bank name select, account type, last 4 digits, IFSC, balance, family member select)
- Balance displayed with `formatINR(account.balance)`
- Staleness badge from `balanceStaleness(account.balanceUpdatedAt)`
- Group accounts by `account.familyMember.name`

- [ ] **Step 2: Run type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/finance/BankAccountsPage.tsx
git commit -m "feat: add Bank Accounts page with CRUD and balance tracking"
```

---

### Task 11: Update Documentation

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Update architecture.md**

Add new API endpoints to the API Reference section:

```markdown
### Family Members — `/api/family-members/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List family members |
| POST | `/` | Yes | Create family member |
| PUT | `/:id` | Yes | Update family member |
| DELETE | `/:id` | Yes | Delete (blocked if has linked accounts) |

### Bank Accounts — `/api/bank-accounts/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List accounts (filterable by familyMemberId) |
| POST | `/` | Yes | Create bank account |
| GET | `/:id` | Yes | Get account detail |
| PUT | `/:id` | Yes | Update account |
| PUT | `/:id/balance` | Yes | Quick balance update |
| DELETE | `/:id` | Yes | Soft-delete |
```

Add FamilyMember and BankAccount to the Database Schema section.

Update the folder structure to include new files.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add family members and bank accounts to architecture"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run full quality checklist**

```bash
pnpm run lint
pnpm run spell-check
pnpm run type-check
pnpm run build
pnpm run test
```

All five must pass. Add any new words to `cspell.json` if needed.

- [ ] **Step 2: Review git log**

```bash
git log --oneline -14
```

Expected: ~11 commits covering currency utils, finance types, Prisma models, family member CRUD, bank account CRUD, formatting utils, sidebar layout, route restructure, family page, bank accounts page, and docs.
