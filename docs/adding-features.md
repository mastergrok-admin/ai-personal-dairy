# Adding New Features

Step-by-step guides for common development tasks.

## Table of Contents

- [Add a New API Endpoint](#add-a-new-api-endpoint)
- [Add a Protected API Endpoint](#add-a-protected-api-endpoint)
- [Add a New Page (Frontend)](#add-a-new-page-frontend)
- [Add a Protected Page](#add-a-protected-page)
- [Add a New Reusable Component](#add-a-new-reusable-component)
- [Add a New Database Model](#add-a-new-database-model)
- [Add Shared Types](#add-shared-types)
- [Add a New Environment Variable](#add-a-new-environment-variable)
- [Add a New Permission](#add-a-new-permission)
- [Add a New OAuth Provider](#add-a-new-oauth-provider)
- [Full Feature Example: Diary Entries](#full-feature-example-diary-entries)

---

## Add a New API Endpoint

Follow the **Route → Controller → Service → Model** pattern.

### 1. Define the route

Create `server/src/routes/entries.ts`:

```typescript
import { Router, type Router as RouterType } from "express";
import { getEntries, createEntry } from "../controllers/entries.js";

export const entriesRouter: RouterType = Router();

entriesRouter.get("/", getEntries);
entriesRouter.post("/", createEntry);
```

### 2. Create the controller

Create `server/src/controllers/entries.ts`:

```typescript
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as entriesService from "../services/entries.js";

const createEntrySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export async function getEntries(_req: Request, res: Response, next: NextFunction) {
  try {
    const entries = await entriesService.getAllEntries();
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
}

export async function createEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEntrySchema.parse(req.body);
    const entry = await entriesService.createEntry(data);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}
```

### 3. Create the service

Create `server/src/services/entries.ts`:

```typescript
import { prisma } from "../models/prisma.js";

export async function getAllEntries() {
  return prisma.entry.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createEntry(data: { title: string; content: string }) {
  return prisma.entry.create({ data });
}
```

### 4. Register the route

In `server/src/app.ts`, add:

```typescript
import { entriesRouter } from "./routes/entries.js";

app.use("/api/entries", entriesRouter);
```

---

## Add a Protected API Endpoint

Same as above, but with authentication and permission checks.

### 1. Define the route with middleware

```typescript
import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { getEntries, createEntry } from "../controllers/entries.js";

export const entriesRouter: RouterType = Router();

// All routes require authentication
entriesRouter.use(authenticate);

// Each route checks a specific permission
entriesRouter.get("/", authorize("diary.read"), getEntries);
entriesRouter.post("/", authorize("diary.create"), createEntry);
```

### 2. Access the authenticated user in controllers

```typescript
import type { AuthenticatedRequest } from "../middleware/authenticate.js";

export async function getEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const entries = await entriesService.getEntriesByUser(userId);
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
}
```

### 3. Register the route

In `server/src/app.ts`:

```typescript
import { entriesRouter } from "./routes/entries.js";

app.use("/api/entries", entriesRouter);
```

---

## Add a New Page (Frontend)

### 1. Create the page component

Create `client/src/pages/EntriesPage.tsx`:

```tsx
function EntriesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">My Entries</h1>
    </div>
  );
}

export default EntriesPage;
```

### 2. Add the route

In `client/src/App.tsx`:

```tsx
import EntriesPage from "./pages/EntriesPage";

// Inside the <Routes>:
<Route path="entries" element={<EntriesPage />} />
```

### 3. Add navigation link

In `client/src/components/layout/Header.tsx`:

```tsx
<Link to="/entries" className="text-gray-600 hover:text-gray-900">
  Entries
</Link>
```

---

## Add a Protected Page

### 1. Create the page component

Same as a regular page (see above).

### 2. Add the route with ProtectedRoute

In `client/src/App.tsx`:

```tsx
import { ProtectedRoute } from "./components/features/auth/ProtectedRoute";
import EntriesPage from "./pages/EntriesPage";

// Auth required, no specific permission:
<Route
  path="entries"
  element={
    <ProtectedRoute>
      <EntriesPage />
    </ProtectedRoute>
  }
/>

// Auth required + specific permission:
<Route
  path="admin/entries"
  element={
    <ProtectedRoute permission="diary.read">
      <EntriesPage />
    </ProtectedRoute>
  }
/>
```

### 3. Conditionally show navigation links

In `client/src/components/layout/Header.tsx`, use `hasPermission`:

```tsx
const { hasPermission } = useAuth();

{hasPermission("diary.read") && (
  <Link to="/entries">Entries</Link>
)}
```

---

## Client-Side Utility Conventions

The client distinguishes between two utility directories:

- **`client/src/lib/utils.ts`** — shadcn/ui-pattern utilities. Contains the `cn()` helper (built on `clsx` + `tailwind-merge`) for merging conditional Tailwind class names. Use `cn()` wherever you combine conditional class strings in components:

  ```tsx
  import { cn } from "@/lib/utils";

  <div className={cn("base-class", isActive && "active-class", className)} />
  ```

- **`client/src/utils/`** — domain-specific helper functions (e.g. `formatINR`, date helpers, data transformations). Add new domain helpers here, not in `lib/`.

---

## Add a New Reusable Component

Create in `client/src/components/common/`. Example button:

Create `client/src/components/common/Button.tsx`:

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "rounded-md px-4 py-2 font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export { Button };
```

---

## Add a New Database Model

### 1. Edit the Prisma schema

In `server/prisma/schema.prisma`:

```prisma
model Entry {
  id        String   @id @default(cuid())
  title     String
  content   String
  mood      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Run migration

```bash
pnpm --filter @diary/server run db:migrate
```

This creates a migration file in `server/prisma/migrations/` and updates the database.

### 3. Regenerate the Prisma client

```bash
pnpm --filter @diary/server run db:generate
```

### 4. Create a Prisma client singleton

Create `server/src/models/prisma.ts` (if it doesn't exist):

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

---

## Add Shared Types

### 1. Add the type

Create or edit a file in `shared/src/types/`. Example:

```typescript
// shared/src/types/entries.ts
export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Export from the barrel

In `shared/src/index.ts`:

```typescript
export * from "./types/api";
export * from "./types/entries";
```

### 3. Use in client or server

```typescript
import type { DiaryEntry } from "@diary/shared";
```

---

## Add a New Environment Variable

### Server

1. Add to `server/.env` and `server/.env.example`
2. Add to the Zod schema in `server/src/config/env.ts`:

```typescript
const envSchema = z.object({
  // ... existing vars
  MY_NEW_VAR: z.string(),
});
```

3. Access via `env.MY_NEW_VAR`
4. Add to Render environment variables for production

### Client

1. Add to `client/.env` and `client/.env.example` (must be prefixed with `VITE_`):

```
VITE_MY_NEW_VAR=value
```

2. Access via `import.meta.env.VITE_MY_NEW_VAR`
3. Add to Netlify environment variables for production

---

## Add a New Permission

Permissions can be added either via seed or via the admin UI.

### Option A: Via Admin UI

1. Log in as admin
2. Go to `/admin/permissions`
3. Click "Create Permission"
4. Enter name (e.g. `diary.export`), module (e.g. `diary`), and description
5. Go to `/admin/roles` and assign the permission to relevant roles

### Option B: Via Seed Script

1. Add to `PERMISSIONS` array in `server/prisma/seed.ts`:

```typescript
{ name: "diary.export", description: "Export diary entries", module: "diary" },
```

2. Add to the relevant role in `ROLE_PERMISSIONS`:

```typescript
User: [
  "diary.create", "diary.read", ..., "diary.export",
],
```

3. Re-run the seed:

```bash
pnpm --filter @diary/server run db:seed
```

---

## Add a New OAuth Provider

1. Install the Passport strategy:

```bash
pnpm --filter @diary/server add passport-<provider>
```

2. Add env vars to `server/src/config/env.ts`:

```typescript
NEW_PROVIDER_CLIENT_ID: z.string().default(""),
NEW_PROVIDER_CLIENT_SECRET: z.string().default(""),
NEW_PROVIDER_CALLBACK_URL: z.string().default("http://localhost:4000/api/auth/new-provider/callback"),
```

3. Add the strategy in `server/src/config/passport.ts` (follow the Google/Microsoft pattern)

4. Add routes in `server/src/routes/auth.ts`:

```typescript
if (env.NEW_PROVIDER_CLIENT_ID && env.NEW_PROVIDER_CLIENT_SECRET) {
  authRouter.get("/new-provider", newProviderAuth);
  authRouter.get("/new-provider/callback", newProviderCallback);
}
```

5. Add the provider to the `AuthProvider` enum in `server/prisma/schema.prisma`:

```prisma
enum AuthProvider {
  local
  google
  microsoft
  new_provider
}
```

6. Run `pnpm --filter @diary/server run db:push && pnpm --filter @diary/server run db:generate`

7. Add a button in `client/src/components/features/auth/OAuthButtons.tsx`

---

## CommandPalette Pattern (Ctrl+K)

The app includes a `CommandPalette` component (`client/src/components/ui/command-palette.tsx`) powered by the `cmdk` library. It provides keyboard-driven navigation and actions via Ctrl+K.

**Usage:**
- Rendered inside `SidebarLayout` with `open` / `onClose` props.
- When `open={false}` it returns `null` immediately (no DOM output).
- Backdrop click calls `onClose`; inner panel uses `e.stopPropagation()`.
- Navigation items call `useNavigate()` then `onClose()`.
- Theme toggle calls `useTheme().toggleTheme()`.
- Logout calls `useAuth().logout()`.

**Testing pattern:**
Mock both `@/hooks/useAuth` and `@/hooks/useTheme` at the module level in test files to avoid network calls and context errors:

```tsx
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn(), ... }),
}));
vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));
```

---

## Full Feature Example: Diary Entries

Here's the complete checklist for adding a "diary entries" feature end-to-end:

### Backend

- [ ] Add `Entry` model to `server/prisma/schema.prisma`
- [ ] Run `pnpm --filter @diary/server run db:migrate`
- [ ] Create `server/src/services/entries.ts` (business logic)
- [ ] Create `server/src/controllers/entries.ts` (request handling + Zod validation)
- [ ] Create `server/src/routes/entries.ts` (with `authenticate` + `authorize` middleware)
- [ ] Register route in `server/src/app.ts`

### Shared

- [ ] Add `DiaryEntry` type to `shared/src/types/entries.ts`
- [ ] Export from `shared/src/index.ts`

### Permissions

- [ ] Add `diary.create`, `diary.read`, etc. permissions via seed or admin UI
- [ ] Assign permissions to relevant roles (Admin, User)

### Frontend

- [ ] Add API methods to `client/src/services/api.ts` or a new service file
- [ ] Create page component in `client/src/pages/EntriesPage.tsx`
- [ ] Add route in `client/src/App.tsx` wrapped in `<ProtectedRoute permission="diary.read">`
- [ ] Add nav link in `client/src/components/layout/Header.tsx` (conditional on `hasPermission`)
- [ ] Create feature components in `client/src/components/features/`

### Documentation

- [ ] Update this file if the pattern introduces something new
- [ ] Update `docs/architecture.md` if new packages, API endpoints, or DB models are added
