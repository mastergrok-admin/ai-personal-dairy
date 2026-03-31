# Financial Dashboard Plan 3: Reminders + Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Reminder model with CRUD API, auto-generated reminders from credit cards/loans, Reminders page UI, responsive sidebar polish (mobile hamburger, tablet collapsed), and empty states for all pages.

**Architecture:** Reminder model stores both custom and auto-generated reminders. Auto-generation runs on a `/generate` endpoint that syncs reminders from existing credit card due dates and loan EMI dates. Responsive sidebar uses Tailwind breakpoints already in place from Plan 1.

**Tech Stack:** Prisma, Express, React, Tailwind CSS, TypeScript, Zod

---

### Task 1: Prisma Model — Reminder

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `shared/src/types/finance.ts`

Add enums after LoanType:

```prisma
enum ReminderType {
  credit_card_due
  loan_emi
  balance_update
  custom
}

enum LinkedEntityType {
  bank_account
  credit_card
  loan
}

enum ReminderFrequency {
  once
  monthly
  quarterly
  yearly
}
```

Add Reminder model after Loan:

```prisma
model Reminder {
  id               String            @id @default(cuid())
  userId           String
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  type             ReminderType
  title            String
  description      String?
  linkedEntityId   String?
  linkedEntityType LinkedEntityType?
  dueDate          DateTime?
  recurringDay     Int?
  frequency        ReminderFrequency @default(once)
  isActive         Boolean           @default(true)
  lastNotifiedAt   DateTime?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([userId])
  @@index([linkedEntityId])
}
```

Add `reminders Reminder[]` to User model.

Add `ReminderResponse` to shared types:

```typescript
export type ReminderType = "credit_card_due" | "loan_emi" | "balance_update" | "custom";
export type ReminderFrequency = "once" | "monthly" | "quarterly" | "yearly";

export interface ReminderResponse {
  id: string;
  type: ReminderType;
  title: string;
  description: string | null;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
  dueDate: string | null;
  recurringDay: number | null;
  frequency: ReminderFrequency;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Run db:push, db:generate, build shared.

Commit: `git commit -m "feat: add Reminder Prisma model and shared types"`

---

### Task 2: Reminder CRUD API

**Files:**
- Create: `server/src/services/reminders.ts`
- Create: `server/src/controllers/reminders.ts`
- Create: `server/src/routes/reminders.ts`
- Modify: `server/src/app.ts`

Service functions:
- `listReminders(userId, type?)` — list active reminders, filterable by type
- `getUpcomingReminders(userId)` — reminders sorted by next occurrence (recurringDay or dueDate)
- `createReminder(userId, data)` — create custom reminder
- `updateReminder(id, userId, data)` — update reminder
- `deleteReminder(id, userId)` — delete (only custom type, reject auto-generated)
- `generateReminders(userId)` — sync auto-generated reminders from credit cards and loans:
  - For each active credit card: upsert a `credit_card_due` reminder with `recurringDay = card.dueDate`, `frequency = monthly`, `linkedEntityId = card.id`, `linkedEntityType = credit_card`
  - For each active loan: upsert a `loan_emi` reminder with `recurringDay = loan.emiDueDate`, `frequency = monthly`, `linkedEntityId = loan.id`, `linkedEntityType = loan`
  - Delete reminders for deactivated/deleted cards/loans
  - Return count of created/updated/deleted

Controller: standard asyncHandler pattern. Zod validation for create (title, description?, dueDate?, recurringDay?, frequency).

Routes: `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /generate`

Register as `/api/reminders`.

Commit: `git commit -m "feat: add Reminder CRUD API with auto-generation from cards and loans"`

---

### Task 3: Reminders Page UI

**Files:**
- Create: `client/src/pages/finance/RemindersPage.tsx`
- Modify: `client/src/App.tsx`

The page has:
- Two tabs: "Upcoming" and "All Reminders"
- "Sync Reminders" button — calls `POST /reminders/generate` to sync from cards/loans
- "Add Reminder" button — for custom reminders only
- Add form: title, description (optional), date or recurring day, frequency (once/monthly/quarterly/yearly)
- Each reminder shows: type badge (color-coded), title, next occurrence, frequency
- Type badges: credit_card_due=red, loan_emi=amber, balance_update=blue, custom=purple
- Auto-generated reminders show "Auto" badge and cannot be deleted (only via source entity)
- Custom reminders have edit/delete
- Upcoming tab sorts by next occurrence date

Update App.tsx: replace placeholder reminders route with RemindersPage.

Commit: `git commit -m "feat: add Reminders page with auto-sync and custom reminders"`

---

### Task 4: Needs Attention Widget Enhancement

**Files:**
- Modify: `server/src/services/dashboard.ts`

Update the dashboard overview to include:
- Overdue credit card dues (dueDate has passed this month and currentDue > 0)
- Overdue loan EMIs (emiDueDate has passed this month)
- Add these as `type: "overdue"` items in needsAttention

This enhances the existing dashboard overview — no new endpoints needed.

Commit: `git commit -m "feat: add overdue dues to dashboard needs attention widget"`

---

### Task 5: Sidebar Logout Button

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/components/layout/SidebarLayout.tsx`

Add a logout button at the bottom of the sidebar:
- Positioned at the bottom of the sidebar (mt-auto)
- Shows user name + "Logout" button
- Calls `logout()` from useAuth, shows toast, redirects to /login

Update the top bar in SidebarLayout to include a logout button (for when sidebar is hidden on mobile).

Commit: `git commit -m "feat: add logout button to sidebar and top bar"`

---

### Task 6: Documentation + Final Verification

**Files:**
- Modify: `docs/architecture.md`

Add:
- Reminder endpoints to API Reference
- Reminder model to Database Schema
- Updated folder structure

Run full quality checklist: lint, spell-check, type-check, build, test.

Commit: `git commit -m "docs: add reminders to architecture, final Plan 3 polish"`
