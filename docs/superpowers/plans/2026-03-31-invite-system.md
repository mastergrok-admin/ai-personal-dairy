# Invite System & Feature Flags Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add invite system (admin + user invites), AppSetting model for feature flags, admin settings UI, invite page, and invite-aware registration.

**Architecture:** Invite model with token-based acceptance. AppSetting key-value store for feature flags (userInvitesEnabled). Admin invites bypass feature flag and can pre-assign roles. User invites gated by feature flag. Registration accepts invite tokens to prefill email and assign invited role.

**Tech Stack:** Prisma, Express, React, Zod, TypeScript

**Depends on:** Plan A (error classes, asyncHandler) and Plan B (email service, schema changes) must be completed first.

---

## File Structure

```
server/src/
├── services/
│   ├── invites.ts             # CREATE: Invite CRUD + token logic
│   └── appSettings.ts         # CREATE: Feature flag service
├── controllers/
│   ├── invites.ts             # CREATE: Invite endpoints
│   └── appSettings.ts         # CREATE: Admin settings endpoints
├── routes/
│   ├── invites.ts             # CREATE: Invite routes
│   └── appSettings.ts         # CREATE: Admin settings routes
├── controllers/
│   └── auth.ts                # MODIFY: Invite-aware registration
├── app.ts                     # MODIFY: Register new routes
└── prisma/
    ├── schema.prisma          # MODIFY: Add Invite model, AppSetting model
    └── seed.ts                # MODIFY: Add new permissions, default settings

client/src/
├── pages/
│   ├── InvitePage.tsx         # CREATE: Send + list invites
│   └── admin/
│       └── AdminSettingsPage.tsx # CREATE: Feature flag toggles
├── components/features/auth/
│   └── RegisterForm.tsx       # MODIFY: Handle invite token + prefilled email
├── pages/
│   └── RegisterPage.tsx       # MODIFY: Read invite params from URL
├── components/layout/
│   └── Header.tsx             # MODIFY: Add Invites + Settings nav links
└── App.tsx                    # MODIFY: Add new routes
```

---

### Task 1: Database Schema — Invite & AppSetting Models

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add InviteStatus enum, Invite model, and AppSetting model**

In `server/prisma/schema.prisma`, add after the `AuthProvider` enum:

```prisma
enum InviteStatus {
  pending
  accepted
  expired
}
```

Add the Invite model:

```prisma
model Invite {
  id          String       @id @default(cuid())
  email       String
  token       String       @unique
  roleId      String?
  role        Role?        @relation(fields: [roleId], references: [id])
  invitedById String
  invitedBy   User         @relation(fields: [invitedById], references: [id])
  status      InviteStatus @default(pending)
  expiresAt   DateTime
  createdAt   DateTime     @default(now())

  @@index([token])
  @@index([invitedById])
}
```

Add the AppSetting model:

```prisma
model AppSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

Add inverse relation to User model (after `refreshTokens`):

```prisma
  invites       Invite[]
```

Add inverse relation to Role model (after `permissions`):

```prisma
  invites     Invite[]
```

- [ ] **Step 2: Run db push and generate**

```bash
pnpm --filter @diary/server run db:push
pnpm --filter @diary/server run db:generate
```

- [ ] **Step 3: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add Invite model, AppSetting model, and InviteStatus enum"
```

---

### Task 2: Seed — New Permissions & Default Settings

**Files:**
- Modify: `server/prisma/seed.ts`

- [ ] **Step 1: Add new permissions to PERMISSIONS array**

In `server/prisma/seed.ts`, add to the `PERMISSIONS` array:

```typescript
  { name: "admin.settings.read", description: "View app settings", module: "admin" },
  { name: "admin.settings.update", description: "Update app settings", module: "admin" },
  { name: "invite.create", description: "Create invites", module: "invite" },
```

- [ ] **Step 2: Update ROLE_PERMISSIONS**

Add `admin.settings.read`, `admin.settings.update`, and `invite.create` to the Admin role.

Since Admin already gets `PERMISSIONS.map((p) => p.name)`, it automatically picks up the new permissions.

Add `invite.create` to the User role:

```typescript
  User: [
    "diary.create", "diary.read", "diary.update", "diary.delete",
    "diary.read_shared", "family.invite", "invite.create",
  ],
```

- [ ] **Step 3: Add default AppSetting seed**

At the end of the `main()` function in seed.ts, before the closing `console.log("Seed complete!")`, add:

```typescript
  // Seed default app settings
  await prisma.appSetting.upsert({
    where: { key: "userInvitesEnabled" },
    update: {},
    create: { key: "userInvitesEnabled", value: "false" },
  });
  console.log("App settings seeded");
```

Add `appSetting` to the prisma import if using the existing prisma client.

- [ ] **Step 4: Run seed**

```bash
pnpm --filter @diary/server run db:seed
```

Expected: Seeds without error.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat: add invite and admin.settings permissions, seed default app settings"
```

---

### Task 3: AppSettings Service & Endpoints

**Files:**
- Create: `server/src/services/appSettings.ts`
- Create: `server/src/controllers/appSettings.ts`
- Create: `server/src/routes/appSettings.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create appSettings service**

Create `server/src/services/appSettings.ts`:

```typescript
import { prisma } from "../models/prisma.js";

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const settings = await prisma.appSetting.findMany();
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
```

- [ ] **Step 2: Create appSettings controller**

Create `server/src/controllers/appSettings.ts`:

```typescript
import { z } from "zod";
import * as appSettingsService from "../services/appSettings.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await appSettingsService.getAllSettings();
  res.json({ success: true, data: settings });
});

export const updateSetting = asyncHandler(async (req, res) => {
  const { key, value } = updateSettingSchema.parse(req.body);
  await appSettingsService.updateSetting(key, value);
  res.json({ success: true });
});
```

- [ ] **Step 3: Create appSettings routes**

Create `server/src/routes/appSettings.ts`:

```typescript
import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { getSettings, updateSetting } from "../controllers/appSettings.js";

export const appSettingsRouter: RouterType = Router();

appSettingsRouter.use(authenticate);
appSettingsRouter.get("/", authorize("admin.settings.read"), getSettings);
appSettingsRouter.put("/", authorize("admin.settings.update"), updateSetting);
```

- [ ] **Step 4: Register route in app.ts**

In `server/src/app.ts`, add import:

```typescript
import { appSettingsRouter } from "./routes/appSettings.js";
```

Add route registration before the error handler:

```typescript
app.use("/api/admin/settings", appSettingsRouter);
```

- [ ] **Step 5: Run tests and type-check**

```bash
pnpm --filter @diary/server run type-check
pnpm --filter @diary/server run test
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/appSettings.ts server/src/controllers/appSettings.ts server/src/routes/appSettings.ts server/src/app.ts
git commit -m "feat: add app settings endpoints for feature flag management"
```

---

### Task 4: Invite Service & Endpoints

**Files:**
- Create: `server/src/services/invites.ts`
- Create: `server/src/controllers/invites.ts`
- Create: `server/src/routes/invites.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create invite service**

Create `server/src/services/invites.ts`:

```typescript
import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "../utils/errors.js";
import * as appSettingsService from "./appSettings.js";

const INVITE_EXPIRY_DAYS = 7;

export async function createInvite(
  inviterId: string,
  email: string,
  roleId?: string,
  isAdmin = false,
): Promise<{ id: string; email: string; token: string; status: string; expiresAt: Date }> {
  // Check feature flag for non-admin users
  if (!isAdmin) {
    const enabled = await appSettingsService.getSetting("userInvitesEnabled");
    if (enabled !== "true") {
      throw new ForbiddenError("User invites are currently disabled");
    }
  }

  // Check for existing pending invite to same email
  const existing = await prisma.invite.findFirst({
    where: { email, status: "pending" },
  });
  if (existing) {
    throw new ConflictError("A pending invite already exists for this email");
  }

  // Check if user already registered
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError("A user with this email already exists");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.invite.create({
    data: {
      email,
      token,
      roleId: isAdmin ? roleId : undefined,
      invitedById: inviterId,
      expiresAt,
    },
  });

  return invite;
}

export async function getInvitesByUser(userId: string) {
  return prisma.invite.findMany({
    where: { invitedById: userId },
    orderBy: { createdAt: "desc" },
    include: { role: true },
  });
}

export async function acceptInvite(token: string): Promise<{ email: string; roleId: string | null }> {
  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new NotFoundError("Invalid invite token");
  }

  if (invite.status !== "pending") {
    throw new ValidationError("This invite has already been used or expired");
  }

  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    throw new ValidationError("This invite has expired");
  }

  return { email: invite.email, roleId: invite.roleId };
}

export async function markInviteAccepted(email: string): Promise<void> {
  await prisma.invite.updateMany({
    where: { email, status: "pending" },
    data: { status: "accepted" },
  });
}
```

- [ ] **Step 2: Create invite controller**

Create `server/src/controllers/invites.ts`:

```typescript
import { z } from "zod";
import * as invitesService from "../services/invites.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import type { Request } from "express";
import { sendInviteEmail } from "../services/email.js";
import { prisma } from "../models/prisma.js";
import { env } from "../config/env.js";
import { ValidationError } from "../utils/errors.js";

const createInviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().optional(),
});

export const createInvite = asyncHandler(async (req, res) => {
  const { email, roleId } = createInviteSchema.parse(req.body);
  const userId = (req as AuthenticatedRequest).userId;

  // Determine if user is admin (has admin.settings.read as proxy)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  const permissions = user?.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.name),
  ) ?? [];
  const isAdmin = permissions.includes("admin.dashboard");

  const invite = await invitesService.createInvite(userId, email, roleId, isAdmin);

  // Get role name for email
  let roleName: string | undefined;
  if (invite.roleId) {
    const role = await prisma.role.findUnique({ where: { id: invite.roleId } });
    roleName = role?.name;
  }

  // Send invite email (fire-and-forget)
  const inviterName = user?.name ?? "Someone";
  void sendInviteEmail(inviterName, email, invite.token, roleName);

  res.status(201).json({ success: true, data: invite });
});

export const getMyInvites = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const invites = await invitesService.getInvitesByUser(userId);
  res.json({ success: true, data: invites });
});

export const acceptInviteHandler = asyncHandler(async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    throw new ValidationError("Invite token is required");
  }

  const { email, roleId } = await invitesService.acceptInvite(token);

  // Redirect to register page with invite info
  const params = new URLSearchParams({ invite: token, email });
  if (roleId) params.set("roleId", roleId);
  res.redirect(`${env.CLIENT_URL}/register?${params.toString()}`);
});
```

- [ ] **Step 3: Create invite routes**

Create `server/src/routes/invites.ts`:

```typescript
import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createInvite, getMyInvites, acceptInviteHandler } from "../controllers/invites.js";

export const invitesRouter: RouterType = Router();

// Public — accept invite link
invitesRouter.get("/accept", acceptInviteHandler);

// Authenticated — create and list invites
invitesRouter.use(authenticate);
invitesRouter.post("/", createInvite);
invitesRouter.get("/", getMyInvites);
```

- [ ] **Step 4: Register route in app.ts**

In `server/src/app.ts`, add import:

```typescript
import { invitesRouter } from "./routes/invites.js";
```

Add route registration:

```typescript
app.use("/api/invites", invitesRouter);
```

- [ ] **Step 5: Run tests and type-check**

```bash
pnpm --filter @diary/server run type-check
pnpm --filter @diary/server run test
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/invites.ts server/src/controllers/invites.ts server/src/routes/invites.ts server/src/app.ts
git commit -m "feat: add invite system with token-based acceptance and feature flag check"
```

---

### Task 5: Invite-Aware Registration

**Files:**
- Modify: `server/src/controllers/auth.ts`

- [ ] **Step 1: Update register to accept invite token**

In `server/src/controllers/auth.ts`, update the `registerSchema`:

```typescript
const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  inviteToken: z.string().optional(),
});
```

Add import:

```typescript
import { markInviteAccepted } from "../services/invites.js";
```

Update the `register` function to handle invite tokens. After `await assignDefaultRole(user.id);`, add:

```typescript
    // Handle invite token — assign invited role if present
    if (data.inviteToken) {
      const invite = await prisma.invite.findUnique({
        where: { token: data.inviteToken, status: "pending" },
      });
      if (invite?.roleId) {
        // Add the invited role (in addition to default)
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: invite.roleId } },
          update: {},
          create: { userId: user.id, roleId: invite.roleId },
        });
      }
      await markInviteAccepted(data.email);
    }
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @diary/server run test
```

Expected: All pass. The existing register test doesn't pass inviteToken, so the new code path is skipped.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/auth.ts
git commit -m "feat: make registration invite-aware with role assignment"
```

---

### Task 6: Client — Invite Page

**Files:**
- Create: `client/src/pages/InvitePage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Header.tsx`

- [ ] **Step 1: Create InvitePage**

Create `client/src/pages/InvitePage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { ApiResponse } from "@diary/shared";

interface Invite {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  role?: { name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

function InvitePage() {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission("admin.dashboard");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitesEnabled, setInvitesEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    // Load sent invites
    api.get<ApiResponse<Invite[]>>("/invites").then((res) => {
      if (res.success && res.data) setInvites(res.data);
    });

    // Load feature flag status
    if (!isAdmin) {
      api.get<ApiResponse<Record<string, string>>>("/admin/settings", { silent: true })
        .then((res) => {
          if (res.success && res.data) {
            setInvitesEnabled(res.data.userInvitesEnabled === "true");
          }
        })
        .catch(() => {
          // Non-admin can't read settings — check by trying to create
          setInvitesEnabled(true); // Optimistic, will fail on submit if disabled
        });
    } else {
      setInvitesEnabled(true); // Admins always can invite
    }

    // Load roles for admin
    if (isAdmin) {
      api.get<ApiResponse<Role[]>>("/roles").then((res) => {
        if (res.success && res.data) setRoles(res.data);
      });
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post<ApiResponse<Invite>>("/invites", {
        email,
        ...(isAdmin && roleId ? { roleId } : {}),
      });
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      setRoleId("");
      // Refresh invites list
      const res = await api.get<ApiResponse<Invite[]>>("/invites");
      if (res.success && res.data) setInvites(res.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Invites</h1>

      {invitesEnabled === false && !isAdmin ? (
        <div className="rounded-md bg-gray-50 border border-gray-200 p-6 text-center">
          <p className="text-gray-600">User invites are currently disabled by the administrator.</p>
        </div>
      ) : (
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Send an Invite</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="friend@example.com"
              />
            </div>

            {isAdmin && roles.length > 0 && (
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                  Assign Role (optional)
                </label>
                <select
                  id="invite-role"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Default role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Invite"}
            </button>
          </form>
        </div>
      )}

      {/* Sent invites list */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sent Invites</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-gray-500">No invites sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4 text-left font-medium text-gray-700">Email</th>
                  <th className="py-2 pr-4 text-left font-medium text-gray-700">Status</th>
                  <th className="py-2 pr-4 text-left font-medium text-gray-700">Role</th>
                  <th className="py-2 text-left font-medium text-gray-700">Sent</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{invite.email}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          invite.status === "accepted"
                            ? "bg-green-100 text-green-700"
                            : invite.status === "expired"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{invite.role?.name ?? "Default"}</td>
                    <td className="py-2 text-gray-600">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvitePage;
```

- [ ] **Step 2: Add route in App.tsx**

In `client/src/App.tsx`, add import:

```typescript
import InvitePage from "./pages/InvitePage";
```

Add route inside the Layout route, after the Dashboard route:

```tsx
        <Route
          path="invites"
          element={
            <ProtectedRoute>
              <InvitePage />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 3: Add nav link in Header.tsx**

In `client/src/components/layout/Header.tsx`, add after the Dashboard link:

```tsx
              <Link to="/invites" className="text-sm text-gray-600 hover:text-gray-900">
                Invites
              </Link>
```

- [ ] **Step 4: Run client type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

Expected: Both pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/InvitePage.tsx client/src/App.tsx client/src/components/layout/Header.tsx
git commit -m "feat: add invite page with send form and sent invites list"
```

---

### Task 7: Client — Admin Settings Page

**Files:**
- Create: `client/src/pages/admin/AdminSettingsPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Header.tsx`

- [ ] **Step 1: Create AdminSettingsPage**

Create `client/src/pages/admin/AdminSettingsPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import type { ApiResponse } from "@diary/shared";

function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<Record<string, string>>>("/admin/settings").then((res) => {
      if (res.success && res.data) setSettings(res.data);
      setIsLoading(false);
    });
  }, []);

  const toggleSetting = async (key: string) => {
    const newValue = settings[key] === "true" ? "false" : "true";
    try {
      await api.put("/admin/settings", { key, value: newValue });
      setSettings((prev) => ({ ...prev, [key]: newValue }));
      toast.success(`Setting updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update setting");
    }
  };

  if (isLoading) return <p className="text-gray-500">Loading settings...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">App Settings</h1>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-medium text-gray-900">User Invites</h3>
            <p className="text-sm text-gray-500">Allow any authenticated user to send invites</p>
          </div>
          <button
            onClick={() => toggleSetting("userInvitesEnabled")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.userInvitesEnabled === "true" ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.userInvitesEnabled === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
```

- [ ] **Step 2: Add route in App.tsx**

In `client/src/App.tsx`, add import:

```typescript
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
```

Add route inside the Layout route, with the other admin routes:

```tsx
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute permission="admin.settings.read">
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
```

- [ ] **Step 3: Add Settings link in Header admin dropdown**

In `client/src/components/layout/Header.tsx`, add inside the admin dropdown div, after the Permissions link:

```tsx
                    {hasPermission("admin.settings.read") && (
                      <Link
                        to="/admin/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Settings
                      </Link>
                    )}
```

- [ ] **Step 4: Run client type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

Expected: Both pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/AdminSettingsPage.tsx client/src/App.tsx client/src/components/layout/Header.tsx
git commit -m "feat: add admin settings page with user invites toggle"
```

---

### Task 8: Client — Invite-Aware Registration

**Files:**
- Modify: `client/src/pages/RegisterPage.tsx`
- Modify: `client/src/components/features/auth/RegisterForm.tsx`

- [ ] **Step 1: Update RegisterPage to read invite params**

In `client/src/pages/RegisterPage.tsx`, update to pass invite params to RegisterForm:

```tsx
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RegisterForm } from "@/components/features/auth/RegisterForm";
import { OAuthButtons } from "@/components/features/auth/OAuthButtons";

function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || undefined;
  const inviteEmail = searchParams.get("email") || undefined;

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
        Create account
      </h1>

      {inviteToken && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-center">
          <p className="text-sm text-blue-700">You've been invited! Create your account to get started.</p>
        </div>
      )}

      <div className="rounded-lg bg-white p-8 shadow-md">
        <RegisterForm inviteToken={inviteToken} inviteEmail={inviteEmail} />

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300" />
          <span className="mx-4 text-sm text-gray-500">or continue with</span>
          <div className="flex-grow border-t border-gray-300" />
        </div>

        <OAuthButtons />

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
```

- [ ] **Step 2: Update RegisterForm to accept invite props**

In `client/src/components/features/auth/RegisterForm.tsx`, update the component:

Add props interface and update the function signature:

```tsx
interface RegisterFormProps {
  inviteToken?: string;
  inviteEmail?: string;
}

function RegisterForm({ inviteToken, inviteEmail }: RegisterFormProps) {
```

Initialize email state from invite:

```tsx
  const [email, setEmail] = useState(inviteEmail || "");
```

Update the `handleSubmit` to include invite token. Replace the `register` call:

```tsx
      // If there's an invite token, use api.post directly to include it
      if (inviteToken) {
        const res = await api.post<ApiResponse<AuthResponse>>("/auth/register", {
          name,
          email,
          password,
          inviteToken,
        });
        if (res.success && res.data) {
          // Refresh auth to pick up the new user state
          await register(name, email, password).catch(() => {
            // Already registered via api.post, just need to login
          });
        }
      } else {
        await register(name, email, password);
      }
```

Wait — that's overly complex. The cleaner approach is to update the `useAuth` `register` function to accept an optional invite token. But that changes the auth context interface.

Simpler approach: just call api.post directly and then refreshAuth:

```tsx
import { api } from "@/services/api";
import type { ApiResponse, AuthResponse } from "@diary/shared";
```

Replace the try block in handleSubmit:

```tsx
    try {
      if (inviteToken) {
        await api.post<ApiResponse<AuthResponse>>("/auth/register", {
          name,
          email,
          password,
          inviteToken,
        });
        // Auth cookies are set by the server, refresh to load state
        await refreshAuth();
      } else {
        await register(name, email, password);
      }
      toast.success("Account created successfully");
    } catch (error) {
```

Add `refreshAuth` to the destructured auth:

```tsx
  const { register, refreshAuth } = useAuth();
```

Make the email input read-only when prefilled from invite:

```tsx
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={!!inviteEmail}
            className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              inviteEmail ? "bg-gray-50 text-gray-500" : ""
            }`}
            placeholder="you@example.com"
          />
```

Update the export to include props in the named export:

```tsx
export { RegisterForm };
```

- [ ] **Step 3: Run client type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

Expected: Both pass.

- [ ] **Step 4: Run client tests**

```bash
pnpm --filter @diary/client run test
```

Expected: All pass. If RegisterForm tests fail due to the new props, update them to pass empty props.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/RegisterPage.tsx client/src/components/features/auth/RegisterForm.tsx
git commit -m "feat: make registration invite-aware with prefilled email and token"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Update architecture.md**

Add new endpoints to API Reference:

```markdown
| `POST` | `/api/invites` | Authenticated | Create invite (feature flag check for non-admins) |
| `GET` | `/api/invites` | Authenticated | List sent invites |
| `GET` | `/api/invites/accept?token=xxx` | Public | Accept invite, redirect to register |
| `GET` | `/api/admin/settings` | Admin (admin.settings.read) | Get app settings |
| `PUT` | `/api/admin/settings` | Admin (admin.settings.update) | Update app setting |
```

Add Invite and AppSetting models to Database Schema section.

Add new permissions to the permissions table.

Add InvitePage and AdminSettingsPage to the folder structure.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add invite system and app settings to architecture"
```

---

### Task 10: Final Verification

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
git log --oneline -12
```

Expected: ~9 commits covering schema, seed, app settings, invites, invite-aware registration, invite page, admin settings page, and docs.
