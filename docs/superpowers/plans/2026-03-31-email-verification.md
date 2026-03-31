# Email Infrastructure & Verification Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Nodemailer SMTP email service, HTML email templates, email verification on signup, verification banner on client, and resend functionality.

**Architecture:** Nodemailer transport configured via env vars (graceful fallback to console logging when unconfigured). Email verification uses crypto tokens stored on User model. Client shows a banner for unverified users with resend capability.

**Tech Stack:** Nodemailer, crypto (Node built-in), Prisma, Express, React, react-hot-toast

**Depends on:** Plan A (error classes, asyncHandler) must be completed first.

---

## File Structure

```
server/src/
├── config/
│   └── env.ts                 # MODIFY: Add SMTP env vars
├── services/
│   ├── email.ts               # CREATE: Nodemailer transport + send functions
│   └── verification.ts        # CREATE: Token generation, verify, resend
├── templates/
│   └── email.ts               # CREATE: HTML email template functions
├── controllers/
│   └── auth.ts                # MODIFY: Add verify-email + resend endpoints, send emails on register
├── routes/
│   └── auth.ts                # MODIFY: Add verify-email + resend routes
├── __tests__/
│   └── email.test.ts          # CREATE: Email + verification tests
└── prisma/
    └── schema.prisma          # MODIFY: Add emailVerified, verificationToken, verificationExpiry

shared/src/types/
└── auth.ts                    # MODIFY: Add emailVerified to AuthUser

client/src/
├── components/features/auth/
│   └── VerificationBanner.tsx # CREATE: Email verification banner
├── components/layout/
│   └── Layout.tsx             # MODIFY: Add VerificationBanner
├── hooks/
│   └── useAuth.tsx            # MODIFY: Handle emailVerified state
└── pages/
    └── LoginPage.tsx          # MODIFY: Handle ?verified=true param
```

---

### Task 1: SMTP Environment Variables

**Files:**
- Modify: `server/src/config/env.ts`
- Modify: `server/.env.example` (if exists, otherwise note for docs)

- [ ] **Step 1: Add SMTP vars to env schema**

In `server/src/config/env.ts`, add to the `envSchema` object:

```typescript
SMTP_HOST: z.string().default(""),
SMTP_PORT: z.coerce.number().default(587),
SMTP_USER: z.string().default(""),
SMTP_PASS: z.string().default(""),
SMTP_FROM: z.string().default("noreply@example.com"),
```

- [ ] **Step 2: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/config/env.ts
git commit -m "feat: add SMTP environment variables for email service"
```

---

### Task 2: Email Templates

**Files:**
- Create: `server/src/templates/email.ts`

- [ ] **Step 1: Create the email templates file**

Create `server/src/templates/email.ts`:

```typescript
function layout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 32px 32px 0; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">AI Personal Diary</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This email was sent by AI Personal Diary. If you didn't request this, you can safely ignore it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function button(text: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td align="center">
        <a href="${url}" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">${text}</a>
      </td>
    </tr>
  </table>`;
}

export function welcomeEmailHtml(name: string): string {
  return layout(`
    <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">Welcome, ${name}!</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563; line-height: 1.5;">Your account has been created successfully. You can start writing diary entries right away.</p>
    <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">Please verify your email address to get the most out of your account.</p>
  `);
}

export function verificationEmailHtml(name: string, verifyUrl: string): string {
  return layout(`
    <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">Verify your email</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563; line-height: 1.5;">Hi ${name}, please click the button below to verify your email address.</p>
    ${button("Verify Email", verifyUrl)}
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
  `);
}

export function inviteEmailHtml(inviterName: string, inviteUrl: string, roleName?: string): string {
  const roleText = roleName ? ` as a <strong>${roleName}</strong>` : "";
  return layout(`
    <h2 style="margin: 0 0 16px; font-size: 18px; color: #111827;">You're invited!</h2>
    <p style="margin: 0 0 8px; font-size: 14px; color: #4b5563; line-height: 1.5;">${inviterName} has invited you to join AI Personal Diary${roleText}.</p>
    ${button("Accept Invite", inviteUrl)}
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">This invite expires in 7 days.</p>
  `);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/templates/email.ts
git commit -m "feat: add HTML email templates for welcome, verification, and invite"
```

---

### Task 3: Email Service

**Files:**
- Create: `server/src/services/email.ts`

- [ ] **Step 1: Install nodemailer**

```bash
pnpm --filter @diary/server add nodemailer
pnpm --filter @diary/server add -D @types/nodemailer
```

- [ ] **Step 2: Create email service**

Create `server/src/services/email.ts`:

```typescript
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { welcomeEmailHtml, verificationEmailHtml, inviteEmailHtml } from "../templates/email.js";

function createTransport() {
  if (!env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

const transport = createTransport();

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transport) {
    console.log(`[Email] (no SMTP configured) To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error);
  }
}

export async function sendWelcomeEmail(user: { name: string; email: string }): Promise<void> {
  await sendMail(user.email, "Welcome to AI Personal Diary", welcomeEmailHtml(user.name));
}

export async function sendVerificationEmail(
  user: { name: string; email: string },
  token: string,
): Promise<void> {
  const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${token}`;
  await sendMail(user.email, "Verify your email — AI Personal Diary", verificationEmailHtml(user.name, verifyUrl));
}

export async function sendInviteEmail(
  inviterName: string,
  email: string,
  token: string,
  roleName?: string,
): Promise<void> {
  const inviteUrl = `${env.CLIENT_URL}/auth/invite?token=${token}`;
  await sendMail(email, `${inviterName} invited you to AI Personal Diary`, inviteEmailHtml(inviterName, inviteUrl, roleName));
}
```

- [ ] **Step 3: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/email.ts server/package.json pnpm-lock.yaml
git commit -m "feat: add Nodemailer email service with SMTP transport"
```

---

### Task 4: Database Schema — Email Verification Fields

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `shared/src/types/auth.ts`

- [ ] **Step 1: Add verification fields to User model**

In `server/prisma/schema.prisma`, add to the `User` model after `updatedAt`:

```prisma
  emailVerified      Boolean   @default(false)
  verificationToken  String?
  verificationExpiry DateTime?
```

- [ ] **Step 2: Run db push to apply schema**

```bash
pnpm --filter @diary/server run db:push
pnpm --filter @diary/server run db:generate
```

- [ ] **Step 3: Add emailVerified to shared AuthUser type**

In `shared/src/types/auth.ts`, add to the `AuthUser` interface after `isActive`:

```typescript
  emailVerified: boolean;
```

- [ ] **Step 4: Build shared to update types**

```bash
pnpm --filter @diary/shared run build
```

- [ ] **Step 5: Run type-check for all workspaces**

```bash
pnpm run type-check
```

Expected: May have errors in places that construct AuthUser objects — fix any that arise.

- [ ] **Step 6: Commit**

```bash
git add server/prisma/schema.prisma shared/src/types/auth.ts
git commit -m "feat: add emailVerified, verificationToken, verificationExpiry to User model"
```

---

### Task 5: Verification Service

**Files:**
- Create: `server/src/services/verification.ts`

- [ ] **Step 1: Create verification service**

Create `server/src/services/verification.ts`:

```typescript
import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import { NotFoundError, ValidationError, RateLimitError } from "../utils/errors.js";

const TOKEN_EXPIRY_HOURS = 24;
const RESEND_COOLDOWN_MINUTES = 2;

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationExpiry: expiresAt,
    },
  });

  return token;
}

export async function verifyEmail(token: string): Promise<{ id: string; email: string; name: string }> {
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new NotFoundError("Invalid verification token");
  }

  if (!user.verificationExpiry || user.verificationExpiry < new Date()) {
    throw new ValidationError("Verification token has expired. Please request a new one.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpiry: null,
    },
  });

  return { id: updated.id, email: updated.email, name: updated.name };
}

export async function resendVerification(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified");
  }

  // Rate limit: check if last token was generated less than 2 minutes ago
  if (user.verificationExpiry) {
    const tokenCreatedAt = new Date(user.verificationExpiry.getTime() - TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const cooldownEnd = new Date(tokenCreatedAt.getTime() + RESEND_COOLDOWN_MINUTES * 60 * 1000);
    if (new Date() < cooldownEnd) {
      throw new RateLimitError("Please wait before requesting another verification email");
    }
  }

  return generateVerificationToken(userId);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/verification.ts
git commit -m "feat: add email verification service with token generation and validation"
```

---

### Task 6: Verification Endpoints + Registration Email

**Files:**
- Modify: `server/src/controllers/auth.ts`
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Add verify-email and resend-verification controller functions**

In `server/src/controllers/auth.ts`, add imports:

```typescript
import { generateVerificationToken, verifyEmail as verifyEmailService, resendVerification } from "../services/verification.js";
import { sendWelcomeEmail, sendVerificationEmail } from "../services/email.js";
```

Add to the `register` function, after `await assignDefaultRole(user.id);` and before generating tokens:

```typescript
    // Send verification email (fire-and-forget)
    const verificationToken = await generateVerificationToken(user.id);
    sendVerificationEmail({ name: user.name, email: user.email }, verificationToken);
    sendWelcomeEmail({ name: user.name, email: user.email });
```

Note: No `await` on the send functions — they are fire-and-forget.

Wait — `sendVerificationEmail` and `sendWelcomeEmail` are already async and we do want to call `generateVerificationToken` with await (it writes to DB). But the actual email sending is fire-and-forget. Let's adjust:

```typescript
    // Generate verification token and send emails (fire-and-forget for sends)
    const verificationToken = await generateVerificationToken(user.id);
    void sendVerificationEmail({ name: user.name, email: user.email }, verificationToken);
    void sendWelcomeEmail({ name: user.name, email: user.email });
```

Add new controller functions at the end of the file:

```typescript
export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    throw new ValidationError("Verification token is required");
  }

  await verifyEmailService(token);
  res.redirect(`${env.CLIENT_URL}/login?verified=true`);
});

export const resendVerificationHandler = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const token = await resendVerification(userId);
  void sendVerificationEmail({ name: user.name, email: user.email }, token);

  res.json({ success: true, message: "Verification email sent" });
});
```

Add `ValidationError` to the error imports if not already there:

```typescript
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from "../utils/errors.js";
```

- [ ] **Step 2: Add routes**

Read `server/src/routes/auth.ts` first, then add the new routes.

Add these routes in `server/src/routes/auth.ts`:

```typescript
import { verifyEmailHandler, resendVerificationHandler } from "../controllers/auth.js";
```

Add to the route registrations:

```typescript
authRouter.get("/verify-email", verifyEmailHandler);
authRouter.post("/resend-verification", authenticate, resendVerificationHandler);
```

The `authenticate` middleware import should already exist in the auth routes file. If not, add:

```typescript
import { authenticate } from "../middleware/authenticate.js";
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @diary/server run test
```

Expected: All existing tests pass. The registration test should still work — it just now also generates a verification token (which is fine since the email service logs to console without SMTP config).

- [ ] **Step 4: Run type-check**

```bash
pnpm --filter @diary/server run type-check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/auth.ts server/src/routes/auth.ts
git commit -m "feat: add email verification endpoints and send emails on registration"
```

---

### Task 7: Client — Verification Banner

**Files:**
- Create: `client/src/components/features/auth/VerificationBanner.tsx`
- Modify: `client/src/components/layout/Layout.tsx`

- [ ] **Step 1: Create VerificationBanner component**

Create `client/src/components/features/auth/VerificationBanner.tsx`:

```tsx
import { useState } from "react";
import { api } from "@/services/api";
import toast from "react-hot-toast";

function VerificationBanner() {
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success("Verification email sent. Check your inbox.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend email",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">
            Please verify your email address. Check your inbox for a verification link.
          </span>
        </div>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="ml-4 rounded-md bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Resend"}
        </button>
      </div>
    </div>
  );
}

export { VerificationBanner };
```

- [ ] **Step 2: Add banner to Layout**

In `client/src/components/layout/Layout.tsx`, update to:

```tsx
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Header from "./Header";
import { useAuth } from "@/hooks/useAuth";
import { VerificationBanner } from "@/components/features/auth/VerificationBanner";

function Layout() {
  const { isAuthenticated, user } = useAuth();
  const showVerificationBanner = isAuthenticated && user && !user.emailVerified;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {showVerificationBanner && <VerificationBanner />}
        <Outlet />
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default Layout;
```

- [ ] **Step 3: Handle ?verified=true on LoginPage**

In `client/src/pages/LoginPage.tsx`, add to the existing `useEffect` that handles URL params:

```typescript
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(decodeURIComponent(error));
    }
    const verified = searchParams.get("verified");
    if (verified === "true") {
      toast.success("Email verified successfully! You can now sign in.");
    }
  }, [searchParams]);
```

- [ ] **Step 4: Run type-check and build**

```bash
pnpm --filter @diary/client run type-check
pnpm --filter @diary/client run build
```

Expected: Both pass. If `emailVerified` is not yet on the `user` object from the API, the `user.emailVerified` access might need the `getUserWithRolesAndPermissions` function to include it (it should already be there since we added it to the Prisma model and the function selects all user fields minus passwordHash).

- [ ] **Step 5: Run client tests**

```bash
pnpm --filter @diary/client run test
```

Expected: All 30 tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/features/auth/VerificationBanner.tsx client/src/components/layout/Layout.tsx client/src/pages/LoginPage.tsx
git commit -m "feat: add email verification banner and verified toast on login"
```

---

### Task 8: Update Documentation

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Update architecture.md**

Add the new endpoints to the API Reference section:

```markdown
| `GET` | `/api/auth/verify-email?token=xxx` | Public | Verify email address |
| `POST` | `/api/auth/resend-verification` | Authenticated | Resend verification email |
```

Add SMTP env vars to the Environment Variables section:

```markdown
| `SMTP_HOST` | `` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `` | SMTP username |
| `SMTP_PASS` | `` | SMTP password |
| `SMTP_FROM` | `noreply@example.com` | Sender address |
```

Add `emailVerified`, `verificationToken`, `verificationExpiry` to the User model in the Database Schema section.

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add email verification endpoints and SMTP config to architecture"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full quality checklist**

```bash
pnpm run lint
pnpm run spell-check
pnpm run type-check
pnpm run build
pnpm run test
```

All five must pass. Add any new words (nodemailer, smtp, etc.) to `cspell.json` if needed.

- [ ] **Step 2: Review git log**

```bash
git log --oneline -10
```

Expected: ~8 commits covering SMTP env, templates, email service, schema, verification service, endpoints, client banner, and docs.
