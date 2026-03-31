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
│   │   │   └── layout/              # Header, Layout
│   │   ├── hooks/
│   │   │   └── useAuth.tsx          # Auth context, provider, and hook
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
├── .claude/
│   ├── agents/                    # Specialized subagent definitions (17 agents)
│   ├── skills/                    # Skill definitions (10 skills)
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
| **User** | id, email, passwordHash?, name, avatar?, provider (local/google/microsoft), providerId?, isActive | Application user |
| **Role** | id, name, description?, isDefault | Dynamic role (Admin, User, Financer, Family by default) |
| **Permission** | id, name (dot notation), description?, module | Fine-grained permission (e.g. `diary.create`) |
| **UserRole** | userId, roleId | Many-to-many join (users can have multiple roles) |
| **RolePermission** | roleId, permissionId | Many-to-many join (roles can have many permissions) |
| **RefreshToken** | id, token, userId, expiresAt | JWT refresh token for session rotation |

### Default Roles & Permissions

| Role | Permissions |
|------|------------|
| **Admin** | All 23 permissions |
| **User** (default) | diary.create, diary.read, diary.update, diary.delete, diary.read_shared, family.invite |
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

### Client (`client/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:4000/api` | Backend API base URL |
