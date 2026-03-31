# Error Handling & API Interceptors Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured server error classes, asyncHandler utility, upgrade the error handler middleware, and build a client-side API interceptor with silent 401 refresh and global error toasts.

**Architecture:** Server gets AppError hierarchy + centralized Zod handling in the error handler, controllers cleaned up with asyncHandler. Client api.ts gets 401 interception with token refresh queue and automatic error toasts.

**Tech Stack:** Express, Zod, TypeScript, react-hot-toast (existing)

---

## File Structure

```
server/src/
├── utils/
│   ├── errors.ts              # CREATE: AppError class hierarchy
│   └── asyncHandler.ts        # CREATE: Async route wrapper
├── middleware/
│   └── errorHandler.ts        # MODIFY: Handle AppError + Zod centrally
├── controllers/
│   ├── auth.ts                # MODIFY: Use asyncHandler + AppError
│   ├── users.ts               # MODIFY: Use asyncHandler + AppError
│   ├── roles.ts               # MODIFY: Use asyncHandler + AppError
│   └── permissions.ts         # MODIFY: Use asyncHandler + AppError
└── __tests__/
    └── errors.test.ts         # CREATE: Error handling tests

client/src/
├── services/
│   └── api.ts                 # MODIFY: Add 401 interceptor, global toasts
└── __tests__/
    └── api.test.ts            # CREATE: API interceptor tests
```

---

### Task 1: Error Classes & AsyncHandler

**Files:**
- Create: `server/src/utils/errors.ts`
- Create: `server/src/utils/asyncHandler.ts`
- Create: `server/src/__tests__/errors.test.ts`

- [ ] **Step 1: Create the error classes**

Create `server/src/utils/errors.ts`:

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
  }
}
```

- [ ] **Step 2: Create asyncHandler**

Create `server/src/utils/asyncHandler.ts`:

```typescript
import type { Request, Response, NextFunction } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
```

- [ ] **Step 3: Write tests for error classes**

Create `server/src/__tests__/errors.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
} from "../utils/errors.js";

describe("Error Classes", () => {
  it("AppError sets statusCode and message", () => {
    const err = new AppError("test error", 418);
    expect(err.message).toBe("test error");
    expect(err.statusCode).toBe(418);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it("NotFoundError defaults to 404", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
  });

  it("NotFoundError accepts custom message", () => {
    const err = new NotFoundError("User not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });

  it("ValidationError defaults to 400", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
  });

  it("UnauthorizedError defaults to 401", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it("ForbiddenError defaults to 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it("ConflictError defaults to 409", () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });

  it("RateLimitError defaults to 429", () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
  });

  it("instanceof checks work through hierarchy", () => {
    const err = new NotFoundError();
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @diary/server run test -- src/__tests__/errors.test.ts
```

Expected: All 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/errors.ts server/src/utils/asyncHandler.ts server/src/__tests__/errors.test.ts
git commit -m "feat: add AppError class hierarchy and asyncHandler utility"
```

---

### Task 2: Upgrade Error Handler Middleware

**Files:**
- Modify: `server/src/middleware/errorHandler.ts`

- [ ] **Step 1: Update errorHandler to handle AppError and Zod**

Replace the contents of `server/src/middleware/errorHandler.ts`:

```typescript
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // AppError subclasses (NotFoundError, ConflictError, etc.)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Zod validation errors
  if (err instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: err.errors.map((e) => e.message).join(", "),
    });
    return;
  }

  // Unknown / programming errors
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
}
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

```bash
pnpm --filter @diary/server run test
```

Expected: All 35 server tests pass. The error handler is backwards-compatible — existing `next(error)` calls still work.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/errorHandler.ts
git commit -m "feat: upgrade error handler to support AppError and Zod centrally"
```

---

### Task 3: Migrate Auth Controller to asyncHandler + AppError

**Files:**
- Modify: `server/src/controllers/auth.ts`

- [ ] **Step 1: Migrate the register function**

In `server/src/controllers/auth.ts`, replace the `register` function:

```typescript
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError } from "../utils/errors.js";
```

Add these imports at the top of the file.

Replace the `register` function:

```typescript
export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      provider: "local",
    },
  });

  await assignDefaultRole(user.id);

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);

  const authData = await getUserWithRolesAndPermissions(user.id);
  res.status(201).json({ success: true, data: authData });
});
```

- [ ] **Step 2: Migrate logout, refresh, and me functions**

Replace `logout`:

```typescript
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  res.json({ success: true });
});
```

Replace `refresh`:

```typescript
import { UnauthorizedError } from "../utils/errors.js";
```

Add to the existing imports.

```typescript
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    throw new UnauthorizedError("No refresh token");
  }

  const tokens = await rotateRefreshToken(refreshToken);
  if (!tokens) {
    clearAuthCookies(res);
    throw new UnauthorizedError("Invalid refresh token");
  }

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ success: true });
});
```

Replace `me`:

```typescript
import { NotFoundError } from "../utils/errors.js";
```

Add to the existing imports.

```typescript
export const me = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const authData = await getUserWithRolesAndPermissions(userId);

  if (!authData) {
    throw new NotFoundError("User not found");
  }

  res.json({ success: true, data: authData });
});
```

Note: The `login` function uses Passport's callback style and cannot be converted to asyncHandler. Leave it as-is but remove the Zod try/catch — Zod errors now propagate to the error handler:

```typescript
export function login(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  loginSchema.parse(req.body);

  passport.authenticate(
    "local",
    { session: false },
    async (
      err: Error | null,
      user: { id: string; email: string } | false,
      info: { message: string } | undefined,
    ) => {
      if (err) return next(err);
      if (!user) {
        res.status(401).json({
          success: false,
          error: info?.message || "Invalid email or password",
        });
        return;
      }

      try {
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        const authData = await getUserWithRolesAndPermissions(user.id);
        res.json({ success: true, data: authData });
      } catch (error) {
        next(error);
      }
    },
  )(req, res, next);
}
```

Wait — the `login` function calls `loginSchema.parse` outside a try/catch now. If it throws a ZodError, it won't be caught because `login` is not async and not wrapped in asyncHandler. We need to keep the Zod try/catch for login only, but pass to next instead of handling inline:

```typescript
export function login(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    loginSchema.parse(req.body);
  } catch (error) {
    next(error);
    return;
  }

  passport.authenticate(
    "local",
    { session: false },
    async (
      err: Error | null,
      user: { id: string; email: string } | false,
      info: { message: string } | undefined,
    ) => {
      if (err) return next(err);
      if (!user) {
        res.status(401).json({
          success: false,
          error: info?.message || "Invalid email or password",
        });
        return;
      }

      try {
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        const authData = await getUserWithRolesAndPermissions(user.id);
        res.json({ success: true, data: authData });
      } catch (error) {
        next(error);
      }
    },
  )(req, res, next);
}
```

The OAuth functions (`googleAuth`, `googleCallback`, `microsoftAuth`, `microsoftCallback`) use Passport's callback style similarly — leave them as-is. They don't have Zod validation or manual status code handling.

- [ ] **Step 3: Remove unused imports**

Remove `type NextFunction` from the import if all functions that used it are now using asyncHandler. Keep it if `login` or OAuth functions still need it.

The final import block should be:

```typescript
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import passport from "../config/passport.js";
import { prisma } from "../models/prisma.js";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getUserWithRolesAndPermissions,
  assignDefaultRole,
} from "../services/auth.js";
import { env } from "../config/env.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors.js";
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @diary/server run test
```

Expected: All 35 tests pass (auth tests exercise register, login, refresh, me, logout).

- [ ] **Step 5: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/auth.ts
git commit -m "refactor: migrate auth controller to asyncHandler + AppError"
```

---

### Task 4: Migrate Users Controller

**Files:**
- Modify: `server/src/controllers/users.ts`

- [ ] **Step 1: Rewrite users controller with asyncHandler + AppError**

Replace the full contents of `server/src/controllers/users.ts`:

```typescript
import type { Request } from "express";
import { z } from "zod";
import * as usersService from "../services/users.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()),
});

export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string | undefined;

  const result = await usersService.listUsers(page, limit, search);
  res.json({ success: true, ...result });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(getParam(req.params.id));
  if (!user) {
    throw new NotFoundError("User not found");
  }
  res.json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(getParam(req.params.id), data);
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (_req: Request, res) => {
  await usersService.deactivateUser(getParam(_req.params.id));
  res.json({ success: true });
});

export const assignRoles = asyncHandler(async (req, res) => {
  const { roleIds } = assignRolesSchema.parse(req.body);
  const user = await usersService.assignRoles(getParam(req.params.id), roleIds);
  res.json({ success: true, data: user });
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @diary/server run test
```

Expected: All 35 tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/users.ts
git commit -m "refactor: migrate users controller to asyncHandler + AppError"
```

---

### Task 5: Migrate Roles & Permissions Controllers

**Files:**
- Modify: `server/src/controllers/roles.ts`
- Modify: `server/src/controllers/permissions.ts`

- [ ] **Step 1: Rewrite roles controller**

Replace the full contents of `server/src/controllers/roles.ts`:

```typescript
import { z } from "zod";
import * as rolesService from "../services/roles.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

const setPermissionsSchema = z.object({
  permissionIds: z.array(z.string()),
});

export const getRoles = asyncHandler(async (_req, res) => {
  const roles = await rolesService.listRoles();
  const data = roles.map((role) => ({
    ...role,
    permissions: role.permissions.map((rp) => rp.permission),
  }));
  res.json({ success: true, data });
});

export const getRole = asyncHandler(async (req, res) => {
  const role = await rolesService.getRoleById(getParam(req.params.id));
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  res.json({
    success: true,
    data: {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    },
  });
});

export const createRole = asyncHandler(async (req, res) => {
  const data = createRoleSchema.parse(req.body);
  const role = await rolesService.createRole(data);
  res.status(201).json({
    success: true,
    data: {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    },
  });
});

export const updateRole = asyncHandler(async (req, res) => {
  const data = updateRoleSchema.parse(req.body);
  const role = await rolesService.updateRole(getParam(req.params.id), data);
  res.json({
    success: true,
    data: {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    },
  });
});

export const deleteRole = asyncHandler(async (req, res) => {
  try {
    const result = await rolesService.deleteRole(getParam(req.params.id));
    if (!result) {
      throw new NotFoundError("Role not found");
    }
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot delete")) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
});

export const setPermissions = asyncHandler(async (req, res) => {
  const { permissionIds } = setPermissionsSchema.parse(req.body);
  const role = await rolesService.setRolePermissions(getParam(req.params.id), permissionIds);
  if (!role) {
    throw new NotFoundError("Role not found");
  }
  res.json({
    success: true,
    data: {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    },
  });
});
```

- [ ] **Step 2: Read permissions controller**

Read `server/src/controllers/permissions.ts` to understand its current structure before rewriting.

- [ ] **Step 3: Rewrite permissions controller**

Rewrite `server/src/controllers/permissions.ts` following the same pattern:
- Import `asyncHandler` from `../utils/asyncHandler.js`
- Import `NotFoundError`, `ValidationError` from `../utils/errors.js`
- Convert all exported functions to `export const fn = asyncHandler(async (req, res) => { ... })`
- Remove all try/catch blocks and manual Zod handling
- Use `throw new NotFoundError(...)` instead of `res.status(404).json(...)`
- Use Zod `.parse()` directly (errors caught by error handler)

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @diary/server run test
```

Expected: All 35 tests pass.

- [ ] **Step 5: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/roles.ts server/src/controllers/permissions.ts
git commit -m "refactor: migrate roles and permissions controllers to asyncHandler + AppError"
```

---

### Task 6: Client API Interceptor with Silent Refresh

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Rewrite api.ts with 401 interceptor and global toasts**

Replace the full contents of `client/src/services/api.ts`:

```typescript
import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Refresh token queue management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  endpoint: string;
  options?: RequestOptions;
}> = [];

function processQueue(success: boolean) {
  failedQueue.forEach(({ resolve, reject, endpoint, options }) => {
    if (success) {
      resolve(request(endpoint, { ...options, _retry: true }));
    } else {
      reject(new Error("Session expired"));
    }
  });
  failedQueue = [];
}

// Endpoints that should not trigger a token refresh on 401
const NO_REFRESH_ENDPOINTS = ["/auth/refresh", "/auth/login", "/auth/register"];

interface RequestOptions extends RequestInit {
  silent?: boolean;
  _retry?: boolean;
}

async function request<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { silent, _retry, ...fetchOptions } = options || {};

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions?.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    // 401 handling with silent refresh
    if (
      response.status === 401 &&
      !_retry &&
      !NO_REFRESH_ENDPOINTS.some((ep) => endpoint.startsWith(ep))
    ) {
      if (isRefreshing) {
        // Queue this request while refresh is in-flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, endpoint, options });
        }) as Promise<T>;
      }

      isRefreshing = true;

      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshResponse.ok) {
          isRefreshing = false;
          processQueue(true);
          // Retry the original request
          return request<T>(endpoint, { ...options, _retry: true });
        } else {
          isRefreshing = false;
          processQueue(false);
          // Redirect to login
          window.location.href = "/login";
          throw new Error("Session expired");
        }
      } catch {
        isRefreshing = false;
        processQueue(false);
        window.location.href = "/login";
        throw new Error("Session expired");
      }
    }

    const error = await response.json().catch(() => ({}));
    const message = error.error || `Request failed: ${response.status}`;

    // Global error toasts (unless silent)
    if (!silent) {
      if (response.status === 403) {
        toast.error("You don't have permission to do this.");
      } else if (response.status >= 500) {
        toast.error("Something went wrong. Please try again.");
      } else if (response.status !== 401) {
        // Don't toast 401s — handled by interceptor
        // Don't toast 400s — usually form validation, handled by caller
      }
    }

    throw new Error(message);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, options),
  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};
```

- [ ] **Step 2: Run client type-check**

```bash
pnpm --filter @diary/client run type-check
```

Expected: No errors.

- [ ] **Step 3: Run client tests**

```bash
pnpm --filter @diary/client run test
```

Expected: All 30 existing client tests pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add 401 silent refresh interceptor and global error toasts to API client"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full quality checklist**

```bash
pnpm run lint
pnpm run spell-check
pnpm run type-check
pnpm run build
pnpm run test
```

All five must pass.

- [ ] **Step 2: Verify file inventory**

```bash
ls server/src/utils/errors.ts server/src/utils/asyncHandler.ts server/src/__tests__/errors.test.ts
```

All files must exist.

- [ ] **Step 3: Review git log**

```bash
git log --oneline -8
```

Expected: ~6 commits covering error classes, error handler upgrade, controller migrations (auth, users, roles+permissions), and API interceptor.
