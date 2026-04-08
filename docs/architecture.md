# Architecture

## Overview

The project is a **pnpm monorepo** with **Turborepo** for build orchestration. It consists of three packages that share types through the `@diary/shared` package.

```
┌──────────────────────────────────────────────────────┐
│                     Monorepo Root                     │
│  turbo.json · pnpm-workspace.yaml · package.json     │
├──────────┬──────────────┬────────────────────────────┤
│  client  │    server    │          shared             │
│  (React) │  (Express)   │   (Types & Interfaces)     │
│          │              │                             │
│ Netlify  │   Render     │  Used by both client        │
│          │   + PostgreSQL│  and server                │
└──────────┴──────────────┴────────────────────────────┘
```

## Folder Structure

```
ai-personal-dairy/
│
├── client/                          # @diary/client — React frontend
│   ├── public/                      # Static assets (favicon, etc.)
│   ├── src/
│   │   ├── assets/                  # Images, fonts, SVGs
│   │   ├── components/
│   │   │   ├── common/              # Reusable UI (Button, Input, Modal)
│   │   │   ├── features/
│   │   │   │   ├── auth/            # LoginForm, RegisterForm, OAuthButtons, ProtectedRoute
│   │   │   │   └── admin/           # UserTable, RoleManager, PermissionManager
│   │   │   ├── ui/                  # Primitive UI: command-palette, modal, skeleton, animated-counter, etc.
│   │   │   └── layout/              # Header, Layout
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx          # Auth context, provider, and hook
│   │   │   └── useTheme.tsx         # Dark/light mode via localStorage key "theme" and document.documentElement.classList
│   │   ├── pages/
│   │   │   ├── admin/               # AdminUsersPage, AdminRolesPage, AdminPermissionsPage
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── AuthCallbackPage.tsx # OAuth redirect handler
│   │   │   ├── DashboardPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── services/
│   │   │   └── api.ts               # Typed fetch wrapper (credentials: include)
│   │   ├── store/                   # State management
│   │   ├── styles/
│   │   │   └── index.css            # Tailwind entry point
│   │   ├── types/                   # Client-only type definitions
│   │   ├── utils/                   # Helper functions
│   │   ├── App.tsx                  # Route definitions (public + protected + admin)
│   │   ├── main.tsx                 # Entry point (AuthProvider + BrowserRouter)
│   │   └── vite-env.d.ts           # Vite type declarations
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts               # Vite config (aliases, proxy, build)
│   └── .env.example
│
├── server/                          # @diary/server — Express backend
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema (User, Role, Permission, etc.)
│   │   └── seed.ts                 # Seed script for default roles/permissions/admin
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts              # Zod-validated environment variables
│   │   │   └── passport.ts         # Passport strategies (local, Google, Microsoft)
│   │   ├── controllers/
│   │   │   ├── auth.ts             # Register, login, logout, refresh, me, OAuth
│   │   │   ├── users.ts            # User CRUD
│   │   │   ├── roles.ts            # Role CRUD + permission assignment
│   │   │   └── permissions.ts      # Permission CRUD
│   │   ├── middleware/
│   │   │   ├── authenticate.ts     # JWT verification from httpOnly cookie
│   │   │   ├── authorize.ts        # Permission-based access control
│   │   │   └── errorHandler.ts     # Global error handler
│   │   ├── models/
│   │   │   └── prisma.ts           # Prisma client singleton
│   │   ├── routes/
│   │   │   ├── auth.ts             # /api/auth/*
│   │   │   ├── health.ts           # /api/health
│   │   │   ├── users.ts            # /api/users/*
│   │   │   ├── roles.ts            # /api/roles/*
│   │   │   └── permissions.ts      # /api/permissions/*
│   │   ├── services/
│   │   │   ├── auth.ts             # JWT, bcrypt, cookie helpers, token rotation
│   │   │   ├── users.ts            # User queries and role assignment
│   │   │   ├── roles.ts            # Role queries and permission mapping
│   │   │   └── permissions.ts      # Permission queries
│   │   ├── types/
│   │   │   └── passport-microsoft.d.ts  # Type declarations for passport-microsoft
│   │   ├── utils/
│   │   │   └── params.ts           # Route param type helper
│   │   ├── app.ts                  # Express app setup (middleware, routes)
│   │   └── index.ts                # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── shared/                         # @diary/shared — Shared types
│   ├── src/
│   │   ├── types/
│   │   │   ├── api.ts             # ApiResponse, PaginatedResponse
│   │   │   └── auth.ts            # AuthUser, AuthRole, AuthPermission, AuthResponse, etc.
│   │   └── index.ts               # Barrel export
│   ├── package.json
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # CI: push/PR to main/develop
│       ├── dev.yml                  # Dev: feature branch checks
│       └── deploy.yml               # Deploy: manual QA/STG/PROD
│
├── .claude/
│   ├── agents/                    # Specialized subagent definitions (17 agents)
│   ├── skills/                    # Skill definitions (11 skills)
│   ├── settings.json              # Hooks (doc verification on Stop)
│   └── settings.local.json        # Local permissions
│
├── docs/
│   ├── architecture.md            # This file
│   ├── deployment.md              # Deployment guide
│   ├── adding-features.md         # How to add new features
│   ├── skills-and-agents.md       # Skills & agents reference
│   └── superpowers/specs/         # Design specifications
│
├── .gitignore
├── .nvmrc                         # Node.js version (20)
├── cspell.json                    # Spell check config
├── package.json                   # Root workspace scripts
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── netlify.toml                   # Netlify deployment config
├── render.yaml                    # Render deployment config (server + DB)
├── README.md
└── CONTRIBUTING.md
```

## Database Schema

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────<│ UserRole │>────│   Role   │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │                           ┌──────┴───────┐
     │                           │RolePermission │
     │                           └──────┬───────┘
     │                                  │
┌────┴───────┐                   ┌──────┴──────┐
│RefreshToken│                   │ Permission  │
└────────────┘                   └─────────────┘
```

### Models

| Model | Fields | Description |
|-------|--------|-------------|
| **User** | id, email, passwordHash?, name, avatar?, provider (local/google/microsoft), providerId?, isActive, emailVerified, verificationToken?, verificationExpiry? | Application user |
| **Role** | id, name, description?, isDefault | Dynamic role (Admin, User, Financer, Family by default) |
| **Permission** | id, name (dot notation), description?, module | Fine-grained permission (e.g. `diary.create`) |
| **UserRole** | userId, roleId | Many-to-many join (users can have multiple roles) |
| **RolePermission** | roleId, permissionId | Many-to-many join (roles can have many permissions) |
| **RefreshToken** | id, token, userId, expiresAt | JWT refresh token for session rotation |
| **Invite** | id, email, token, roleId?, invitedById, status (pending/accepted/expired), expiresAt | User/admin invite with optional role pre-assignment |
| **AppSetting** | key, value | Key-value store for app-level feature flags |
| **FamilyMember** | id, userId, name, relationship (self/spouse/parent/child/sibling/other) | Family member profile linked to financial accounts |
| **BankAccount** | id, userId, familyMemberId, bankName, accountType (savings/current), accountNumberLast4, ifscCode?, balance (BigInt paise), balanceUpdatedAt, isActive | Bank account with balance tracking |
| **FixedDeposit** | id, userId, bankAccountId, fdReferenceNumberLast4?, principalAmount (BigInt paise), interestRate (Float %), tenureMonths (Int), startDate, maturityDate, maturityAmount (BigInt paise, auto-calculated), autoRenewal, status (active/matured/broken), isActive | FD linked to a bank account; maturity amount derived via quarterly compounding |
| **CreditCard** | id, userId, familyMemberId, bankName, cardName, cardNumberLast4, creditLimit, currentDue, minimumDue (all BigInt paise), dueDate, billingCycleDate, isActive | Credit card with due date tracking |
| **Loan** | id, userId, familyMemberId, lenderName, loanType (home/car/personal/education/gold/other), principalAmount, outstandingAmount, emiAmount (BigInt paise), interestRate, tenureMonths, startDate, endDate?, emiDueDate, isActive | Loan with EMI tracking |
| **Reminder** | id, userId, type (credit_card_due/loan_emi/balance_update/custom), title, description?, linkedEntityId?, linkedEntityType?, dueDate?, recurringDay?, frequency (once/monthly/quarterly/yearly), isActive | Auto-generated and custom reminders |
| **Income** | id, userId, familyMemberId, source (salary/business/rental/freelance/agricultural/pension/other), amount (BigInt paise), month (1–12), year, fiscalYear (e.g. "2025-26"), description?, isActive | Income entry per source per month; upserts on duplicate month+source |
| **Expense** | id, userId, familyMemberId, category (groceries/vegetables_fruits/fuel/transport/school_fees/medical/utilities/internet_mobile/religious/eating_out/clothing/rent/household/other), amount (BigInt paise), date, description?, isActive | Individual expense with category |
| **PersonalLending** | id, userId, direction (lent/borrowed), personName, personPhone?, principalAmount (BigInt paise), date, purpose?, expectedRepaymentDate?, status (outstanding/partially_repaid/settled), notes?, isActive | Lending/borrowing record; status auto-updated on repayment |
| **LendingRepayment** | id, lendingId, amount (BigInt paise), date, notes | Repayment toward a personal lending record |
| **MutualFund** | id, userId, familyMemberId, fundName, amcName, schemeType (equity/debt/hybrid/elss/liquid/index/other), folioLast4?, sipAmount (BigInt paise)?, sipDate (1–28)?, sipStartDate?, isActive | Mutual fund holding with SIP metadata |
| **MFTransaction** | id, fundId, type (sip/lumpsum/redemption/switch_in/switch_out/dividend/bonus), amount (BigInt paise), units (Float)?, nav (Float)?, date, notes? | Individual MF transaction; used to compute totalUnits and investedPaise |
| **PPFAccount** | id, userId, familyMemberId, accountLast4?, bankOrPostOffice, openingDate, maturityDate, currentBalance (BigInt paise), annualContribution (BigInt paise), balanceUpdatedAt, isActive | PPF account with manual balance update |
| **EPFAccount** | id, userId, familyMemberId, uanLast4?, employerName, monthlyEmployeeContrib (BigInt paise), monthlyEmployerContrib (BigInt paise), currentBalance (BigInt paise), balanceUpdatedAt, isActive | EPF account with monthly contribution tracking |
| **NPSAccount** | id, userId, familyMemberId, pranLast4?, tier (tier1/tier2), monthlyContrib (BigInt paise), currentCorpus (BigInt paise), corpusUpdatedAt, isActive | NPS account corpus tracking |
| **PostOfficeScheme** | id, userId, familyMemberId, schemeType (nsc/kvp/scss/mis/td/other), certificateLast4?, amount (BigInt paise), interestRate (Float), purchaseDate, maturityDate, maturityAmount (BigInt paise), isActive | Post Office scheme with pre-computed maturity amount |
| **SGBHolding** | id, userId, familyMemberId, seriesName, units (Float grams), issuePrice (BigInt paise/g), currentPrice (BigInt paise/g), issueDate, maturityDate, interestRate (default 2.5%), isActive | Sovereign Gold Bond holding; currentPrice updated manually |
| **ChitFund** | id, userId, familyMemberId, organizerName, totalValue (BigInt paise), monthlyContrib (BigInt paise), durationMonths, startDate, endDate, month_won?, prize_received (BigInt paise)?, isActive | Chit fund tracker with optional prize recording |
| **GoldHolding** | id, userId, familyMemberId, description, weightGrams (Float), purity (k24/k22/k18/k14/other), purchaseDate?, purchasePricePerGram (BigInt paise)?, currentPricePerGram (BigInt paise), storageLocation (home/bank_locker/relative/other), priceUpdatedAt, isActive | Physical gold holding; currentValue computed from weight × price |
| **Property** | id, userId, familyMemberId, propertyType (residential_flat/independent_house/plot/agricultural_land/commercial/other), description, areaValue (Float), areaUnit (sqft/sqm/cents/acres), purchaseDate?, purchasePrice (BigInt paise)?, currentValue (BigInt paise), rentalIncome (BigInt paise/mo), saleDeedDate?, registrationRefLast6?, linkedLoanId?, valueUpdatedAt, isActive | Real estate property with optional loan link |


### Default Roles & Permissions

| Role | Permissions |
|------|------------|
| **Admin** | All 26 permissions |
| **User** (default) | diary.create, diary.read, diary.update, diary.delete, diary.read_shared, family.invite, invite.create |
| **Financer** | finance.create, finance.read, finance.update, finance.delete |
| **Family** | diary.read_shared |

Permissions are grouped by module: `diary`, `user`, `role`, `permission`, `finance`, `family`, `admin`.

## Authentication

### Session Management

| Token | Type | Lifetime | Storage |
|-------|------|----------|---------|
| Access token | JWT (HS256) | 15 min | httpOnly cookie `access_token` |
| Refresh token | Crypto random (64 bytes) | 7 days | httpOnly cookie + database |

### Auth Flows

**Local Login/Register:**
```
POST /api/auth/register or /api/auth/login
  → Validate → Create/verify user → Issue JWT pair → Set httpOnly cookies
  → Return { user, roles, permissions }
```

**OAuth (Google/Microsoft):**
```
GET /api/auth/google → Passport redirects to consent screen
GET /api/auth/google/callback
  → Exchange code for profile → Find or create user
  → Assign default role if new → Issue JWT pair → Set cookies
  → Redirect to CLIENT_URL/auth/callback
```

**Token Refresh:**
```
POST /api/auth/refresh
  → Read refresh_token cookie → Verify in DB → Rotate tokens → Set new cookies
```

### Middleware Chain

```
Request → authenticate (verify JWT from cookie)
        → authorize("permission.name") (check RBAC)
        → Controller
```

## Data Flow

### Request Lifecycle (Backend)

```
Client Request
  → Express Middleware (helmet, cors, morgan, cookieParser, json)
    → Passport (for auth routes)
    → authenticate middleware (verify JWT)
    → authorize middleware (check permission)
    → Router (routes/*.ts)
      → Controller (parse & validate with Zod)
        → Service (business logic)
          → Prisma (database query)
        ← Service returns result
      ← Controller sends ApiResponse
    ← Router
  ← Error handler (if error thrown)
Client Response
```

### Frontend Architecture

```
main.tsx
  → AuthProvider (context + /api/auth/me hydration)
    → BrowserRouter
      → App.tsx (route definitions)
        → Layout (Header + Toaster + Outlet)
          → ProtectedRoute (auth + permission guard)
            → Page Component
              → Feature Components
                → services/api.ts (fetch with credentials: include)
                → useAuth() hook (login, logout, hasPermission)
```

## API Reference

### Auth Routes — `/api/auth/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register with email/password |
| POST | `/login` | No | Login with email/password |
| POST | `/logout` | Yes | Logout, clear tokens |
| POST | `/refresh` | No | Refresh access token |
| GET | `/me` | Yes | Get current user with roles/permissions |
| GET | `/google` | No | Start Google OAuth |
| GET | `/google/callback` | No | Google OAuth callback |
| GET | `/microsoft` | No | Start Microsoft OAuth |
| GET | `/microsoft/callback` | No | Microsoft OAuth callback |
| GET | `/verify-email?token=xxx` | No | Verify email address, redirect to login |
| POST | `/resend-verification` | Yes | Resend verification email (rate-limited) |

### User Management — `/api/users/`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `user.read` | List users (paginated, searchable) |
| GET | `/:id` | `user.read` | Get user with roles |
| PUT | `/:id` | `user.update` | Update user profile/status |
| DELETE | `/:id` | `user.delete` | Deactivate user |
| PUT | `/:id/roles` | `user.update` | Assign/remove roles |

### Role Management — `/api/roles/`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `role.read` | List roles with permission counts |
| POST | `/` | `role.create` | Create role |
| GET | `/:id` | `role.read` | Get role with permissions |
| PUT | `/:id` | `role.update` | Update role |
| DELETE | `/:id` | `role.delete` | Delete role (blocked if users assigned) |
| PUT | `/:id/permissions` | `role.update` | Set role's permissions |

### Permission Management — `/api/permissions/`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `permission.read` | List permissions (grouped by module) |
| POST | `/` | `permission.create` | Create permission |
| PUT | `/:id` | `permission.update` | Update permission |
| DELETE | `/:id` | `permission.delete` | Delete permission (blocked if assigned) |

### Invites — `/api/invites/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Create invite (non-admins blocked if feature flag off) |
| GET | `/` | Yes | List invites sent by current user |
| GET | `/accept?token=xxx` | No | Accept invite, redirect to register |

### Admin Settings — `/api/admin/settings/`

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/` | `admin.settings.read` | Get all app settings |
| PUT | `/` | `admin.settings.update` | Update app setting |

### Family Members — `/api/family-members/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List family members (auto-creates "Self") |
| POST | `/` | Yes | Create family member |
| PUT | `/:id` | Yes | Update family member |
| DELETE | `/:id` | Yes | Delete (blocked if has linked accounts) |

### Bank Accounts — `/api/bank-accounts/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List accounts (filterable by `?familyMemberId=`) |
| POST | `/` | Yes | Create bank account |
| GET | `/:id` | Yes | Get account detail |
| PUT | `/:id` | Yes | Update account (body: bankName?, accountType?, accountNumberLast4?, ifscCode?, isActive?, balance? in rupees) |
| DELETE | `/:id` | Yes | Soft-delete (set isActive=false) |
| — | — | — | Response includes embedded `fixedDeposits[]` array (active FDs only) |

### Fixed Deposits — `/api/fixed-deposits/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List active FDs (`?bankAccountId=` required) |
| POST | `/` | Yes | Create FD — body: bankAccountId, principalAmount (₹), interestRate (%), startDate, maturityDate, autoRenewal?, status?; tenureMonths and maturityAmount auto-calculated |
| PUT | `/:id` | Yes | Update FD — recalculates tenureMonths/maturityAmount if principal/rate/dates change |
| DELETE | `/:id` | Yes | Soft-delete (isActive=false) |

### Credit Cards — `/api/credit-cards/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List cards (filterable by `?familyMemberId=`) |
| POST | `/` | Yes | Create credit card |
| GET | `/:id` | Yes | Get card detail |
| PUT | `/:id` | Yes | Update card |
| DELETE | `/:id` | Yes | Soft-delete |

### Loans — `/api/loans/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List loans (filterable by `?familyMemberId=`) |
| POST | `/` | Yes | Create loan |
| GET | `/:id` | Yes | Get loan detail |
| PUT | `/:id` | Yes | Update loan |
| DELETE | `/:id` | Yes | Soft-delete |

### Income — `/api/income/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List income entries (`?fiscalYear=`, `?familyMemberId=`) |
| GET | `/summary` | Yes | FY income summary by source (`?fiscalYear=` required) |
| POST | `/` | Yes | Create/upsert income (upserts on duplicate month+source+member) |
| PUT | `/:id` | Yes | Update amount or description |
| DELETE | `/:id` | Yes | Soft delete |

### Expenses — `/api/expenses/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List expenses (`?month=`, `?year=`, `?category=`) |
| GET | `/summary` | Yes | Monthly category totals (`?month=` and `?year=` required) |
| POST | `/` | Yes | Create expense |
| PUT | `/:id` | Yes | Update expense |
| DELETE | `/:id` | Yes | Soft delete |

### Personal Lending — `/api/lending/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List lending/borrowing records (`?direction=`, `?status=`) |
| POST | `/` | Yes | Create record |
| PUT | `/:id` | Yes | Update record |
| DELETE | `/:id` | Yes | Soft delete |
| POST | `/:id/repayments` | Yes | Record a repayment (auto-updates status) |
| DELETE | `/:id/repayments/:repaymentId` | Yes | Remove repayment |

### Mutual Funds — `/api/mutual-funds/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List funds with computed `totalUnits` and `investedPaise` |
| POST | `/` | Yes | Create fund |
| PUT | `/:id` | Yes | Update fund |
| DELETE | `/:id` | Yes | Soft delete |
| GET | `/:id/transactions` | Yes | List transactions for a fund |
| POST | `/:id/transactions` | Yes | Add transaction (sip/lumpsum/etc.) |
| DELETE | `/:id/transactions/:txId` | Yes | Remove transaction |

### PPF — `/api/ppf/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List PPF accounts |
| POST | `/` | Yes | Create PPF account |
| PUT | `/:id` | Yes | Update account |
| DELETE | `/:id` | Yes | Soft delete |

### EPF — `/api/epf/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List EPF accounts |
| POST | `/` | Yes | Create EPF account |
| PUT | `/:id` | Yes | Update account |
| DELETE | `/:id` | Yes | Soft delete |

### NPS — `/api/nps/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List NPS accounts |
| POST | `/` | Yes | Create NPS account |
| PUT | `/:id` | Yes | Update account |
| DELETE | `/:id` | Yes | Soft delete |

### Post Office Schemes — `/api/post-office-schemes/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List schemes |
| POST | `/` | Yes | Create scheme |
| PUT | `/:id` | Yes | Update scheme |
| DELETE | `/:id` | Yes | Soft delete |

### SGB — `/api/sgb/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List holdings with computed `investedPaise` and `currentValue` |
| POST | `/` | Yes | Create holding |
| PUT | `/:id` | Yes | Update holding |
| DELETE | `/:id` | Yes | Soft delete |

### Chit Funds — `/api/chit-funds/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List chit funds |
| POST | `/` | Yes | Create chit fund |
| PUT | `/:id` | Yes | Update chit fund |
| DELETE | `/:id` | Yes | Soft delete |

### Gold — `/api/gold/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List gold holdings with computed `currentValue` |
| POST | `/` | Yes | Create holding |
| PUT | `/:id` | Yes | Update holding |
| DELETE | `/:id` | Yes | Soft delete |

### Properties — `/api/properties/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List properties |
| POST | `/` | Yes | Create property |
| PUT | `/:id` | Yes | Update property |
| DELETE | `/:id` | Yes | Soft delete |

### Investments Summary — `/api/investments/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/summary` | Yes | Aggregated portfolio summary across all investment types |

### Dashboard — `/api/dashboard/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/overview` | Yes | Aggregated net worth, stats, upcoming dues, alerts |
| GET | `/net-worth` | Yes | Full net worth breakdown + monthly P&L (income, expenses, savings rate) |

### Reminders — `/api/reminders/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List reminders (`?type=`, `?upcoming=true`) |
| POST | `/` | Yes | Create custom reminder |
| POST | `/generate` | Yes | Auto-generate reminders from cards/loans |
| PUT | `/:id` | Yes | Update reminder |
| DELETE | `/:id` | Yes | Delete (custom only, auto-generated blocked) |

### Health — `/api/health`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check |

## Package Dependencies

```
@diary/client  ──depends on──→  @diary/shared
@diary/server  ──depends on──→  @diary/shared
```

Turborepo ensures `@diary/shared` is built before the dependent packages.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| pnpm workspaces + Turborepo | Fast installs, strict deps, cached parallel builds |
| Passport.js | Strategy pattern for multiple auth providers, battle-tested |
| JWT in httpOnly cookies | Stateless auth, CSRF-safe, no localStorage vulnerabilities |
| bcrypt (12 rounds) | Industry standard password hashing |
| Dynamic RBAC in DB | Roles and permissions editable from admin UI without code changes |
| Zod for validation | Runtime input validation + type inference for both env and request bodies |
| Prisma for ORM | Type-safe DB access, auto-generated client, easy migrations |
| Vite dev proxy | Avoids CORS issues in development, proxies `/api` to server |
| Shared types package | Single source of truth for API contracts |
| Helmet + CORS | Security headers and origin restriction out of the box |

## API Conventions

- All routes are prefixed with `/api/`
- Responses follow the `ApiResponse<T>` shape from `@diary/shared`:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

- Paginated responses extend this with `total`, `page`, `limit` fields
- Auth errors return 401 (unauthenticated) or 403 (unauthorized)
- Validation errors return 400 with Zod error messages
- Conflict errors (duplicate email) return 409

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin |
| `DATABASE_URL` | — | PostgreSQL connection URL |
| `JWT_SECRET` | — (required) | Secret key for signing JWTs (min 16 chars) |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |
| `GOOGLE_CLIENT_ID` | `` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | `` | Google OAuth client secret (optional) |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/auth/google/callback` | Google OAuth redirect URI |
| `MICROSOFT_CLIENT_ID` | `` | Microsoft OAuth client ID (optional) |
| `MICROSOFT_CLIENT_SECRET` | `` | Microsoft OAuth client secret (optional) |
| `MICROSOFT_CALLBACK_URL` | `http://localhost:4000/api/auth/microsoft/callback` | Microsoft OAuth redirect URI |
| `ADMIN_SEED_PASSWORD` | `Admin@123456` | Initial admin password for seed |
| `SMTP_HOST` | `` | SMTP server hostname (e.g., `smtp.gmail.com`). If empty, emails log to console. |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `` | SMTP username |
| `SMTP_PASS` | `` | SMTP password |
| `SMTP_FROM` | `noreply@example.com` | Sender email address |

### Client (`client/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:4000/api` | Backend API base URL |

---

## CI/CD Pipeline

### Workflows

| Workflow | File | Trigger | What It Does |
|----------|------|---------|-------------|
| **CI** | `.github/workflows/ci.yml` | Push/PR to `main`, `develop` | Lint, spell check, type-check, build, test (parallel build+test after quality) |
| **Development** | `.github/workflows/dev.yml` | Push to feature branches, PR to `develop` | Lint, type-check, test (fast feedback) |
| **Deploy** | `.github/workflows/deploy.yml` | Manual (`workflow_dispatch`) | Deploy to QA/STG/PROD by commit SHA. Full quality gate. Release tag for PROD. |

### Deployment Environments

| Environment | Trigger | Commit Requirement | Release Tag |
|-------------|---------|-------------------|-------------|
| **QA** | Manual — any commit | Any branch | No |
| **Staging** | Manual — any commit | Any branch | No |
| **Production** | Manual — main or hotfix | Must be on `main` or `hotfix/*` | Yes — `vYYYYMMDD.N` (or `vYYYYMMDD.N-hotfix`) |

### Release Tags

Production deployments from `main` or `hotfix/*` branches automatically create:
- Git tag: `vYYYYMMDD.N` (e.g., `v20260331.1`) or `vYYYYMMDD.N-hotfix` for hotfix deploys
- GitHub Release with auto-generated release notes

### Quality Gate (all workflows)

1. **Lint** — ESLint across all workspaces (`pnpm run lint`)
2. **Spell Check** — cspell across TS/MD/JSON files (`pnpm run spell-check`)
3. **Type Check** — TypeScript strict mode (`pnpm run type-check`)
4. **Build** — Client (Vite) + Server (tsc) (`pnpm run build`)
5. **Tests** — Vitest across all workspaces (`pnpm run test`)
