# AI Personal Diary — Project Instructions

## Documentation Rule (MANDATORY)

Every code change that involves a new feature, architecture change, flow change, API change, database change, or configuration change **MUST** include corresponding documentation updates. This is non-negotiable.

### What to update:

| Change Type | Update Required |
|-------------|----------------|
| New API endpoint | `docs/architecture.md` (API Reference section) |
| New/modified DB model | `docs/architecture.md` (Database Schema section) |
| New environment variable | `docs/architecture.md` (Environment Variables) + `.env.example` files |
| New page or route | `docs/architecture.md` (folder structure) |
| New dependency | `README.md` (Tech Stack) if significant |
| Auth/permission changes | `docs/architecture.md` (Authentication section) |
| Deployment config changes | `docs/deployment.md` |
| New patterns or conventions | `docs/adding-features.md` |
| New feature (end-to-end) | All relevant docs above |

### Before completing any task:

1. Review what files were created or modified
2. Check if any documentation files need updates
3. Update the relevant docs
4. Include doc changes in the same commit as the code changes

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Client**: React 19, Vite, Tailwind CSS, TypeScript
- **Server**: Express, Prisma, Passport.js, Zod, TypeScript
- **Auth**: JWT (httpOnly cookies), bcrypt, OAuth (Google, Microsoft)
- **Database**: PostgreSQL
- **Testing**: Vitest, supertest, React Testing Library
- **Deploy**: Netlify (client) + Render (server)

## Code Conventions

- TypeScript strict mode everywhere
- Server follows Controller → Service → Model pattern
- All API routes prefixed with `/api/`
- Request validation with Zod schemas
- Protected routes use `authenticate` + `authorize("permission.name")` middleware
- Client uses `@/` path alias for `src/`
- Auth state via `useAuth()` hook, protected routes via `<ProtectedRoute>`

## Testing

- Run `pnpm test` before completing work
- Server tests use supertest against the Express app
- Client tests use React Testing Library
- Add tests for new features

## Key Files

- `docs/architecture.md` — Main technical reference (schema, API, flows)
- `docs/deployment.md` — Hosting setup
- `docs/adding-features.md` — Developer guide for extending the app
- `server/prisma/schema.prisma` — Database schema
- `server/src/config/env.ts` — All environment variables (Zod validated)
- `client/src/hooks/useAuth.tsx` — Auth context and provider
- `docs/skills-and-agents.md` — Skills & agents reference
