# Gemini Project Context — AI Personal Diary

This file provides instructional context for Gemini CLI interactions within the `ai-personal-dairy` monorepo.

## Project Overview
A fullstack TypeScript monorepo for an AI-powered personal diary with integrated financial tracking (Bank Accounts, Fixed Deposits, Credit Cards, Loans).

### Architecture
- **Monorepo**: Managed with `pnpm` workspaces and `Turborepo`.
- **Frontend (`client/`)**: React 19, Vite, Tailwind CSS, React Router 7.
- **Backend (`server/`)**: Express, Prisma ORM (PostgreSQL), Passport.js, Zod validation.
- **Shared (`shared/`)**: Common TypeScript types, interfaces, and utilities used by both layers.
- **Auth**: JWT-based session management using httpOnly cookies and dynamic Role-Based Access Control (RBAC).

## Building and Running

### Prerequisites
- Node.js >= 20
- pnpm >= 9.15
- PostgreSQL

### Essential Commands
- **Install Dependencies**: `pnpm install`
- **Development**: `pnpm dev` (Starts client and server concurrently)
- **Build All**: `pnpm build`
- **Test All**: `pnpm test`
- **Lint All**: `pnpm lint`
- **Type-Check**: `pnpm type-check`

### Database Setup (from `server/`)
- **Generate Client**: `pnpm run db:generate`
- **Push Schema**: `pnpm run db:push`
- **Seed Data**: `pnpm run db:seed` (Creates default roles and admin user)
- **Prisma Studio**: `pnpm run db:studio`

## Development Conventions

### General
- **TypeScript**: Strict mode is enforced everywhere.
- **Exports**: Use **named exports** for utilities, types, and services. **Default exports** are reserved for React page components and the main Express app.
- **Documentation**: MANDATORY documentation updates in `docs/*.md` for any feature, API, or database change (see `CLAUDE.md`).

### Backend (`server/`)
- **Pattern**: Controller → Service → Model.
- **Validation**: All request bodies must be validated with Zod schemas.
- **Auth**: Protect routes using `authenticate` and `authorize("permission.name")` middleware.
- **API Prefix**: All routes must be prefixed with `/api/`.

### Frontend (`client/`)
- **Organization**:
  - `components/common/`: Reusable UI primitives.
  - `components/features/`: Feature-specific logic (auth, admin, finance).
  - `components/layout/`: Structural components.
  - `pages/`: Route-level components.
- **API Calls**: Must go through `src/services/api.ts` (never use `fetch` directly in components).
- **Styling**: Tailwind CSS.
- **Aliases**: Use `@/` to reference the `src/` directory.

### Testing
- **Backend**: `supertest` with `vitest`.
- **Frontend**: `React Testing Library` with `vitest`.
- Ensure all tests pass (`pnpm test`) before completing a task.

## Key Files & Directories
- `CLAUDE.md`: Core project rules and tech stack.
- `CONTRIBUTING.md`: Development workflow and git conventions.
- `docs/architecture.md`: Detailed system design and API reference.
- `docs/deployment.md`: Hosting instructions (Netlify, Render, Railway).
- `server/prisma/schema.prisma`: Source of truth for the database schema.
- `shared/src/index.ts`: Barrel export for shared types.
