# FinDiary UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul FinDiary's UI with Sera UI components, Lucide icons, dark/light mode toggle, and 6 new wow-factor features across every page.

**Architecture:** shadcn/ui foundation (CSS variables + Tailwind dark class strategy) with copy-paste Sera UI components in `client/src/components/ui/`. A `ThemeProvider` wraps the app and persists the theme to `localStorage`. All finance page add/edit/delete forms move from inline expansion to `Modal` dialogs.

**Tech Stack:** React 19, Tailwind CSS v3, Lucide React, Radix UI Dialog, cmdk, clsx, tailwind-merge

---

## File Map

**New files:**
- `client/src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `client/src/hooks/useTheme.tsx` — ThemeProvider + useTheme hook
- `client/src/components/ui/shimmer-button.tsx` — Sera UI shimmer CTA button
- `client/src/components/ui/glow-button.tsx` — Sera UI glow secondary button
- `client/src/components/ui/modal.tsx` — Radix Dialog wrapper
- `client/src/components/ui/skeleton.tsx` — Shimmer skeleton placeholder
- `client/src/components/ui/animated-counter.tsx` — Counts from 0 to value on mount
- `client/src/components/ui/aurora-text.tsx` — Animated gradient text
- `client/src/components/ui/animated-badge.tsx` — Urgency badge with pulse
- `client/src/components/ui/command-palette.tsx` — Ctrl+K command palette
- `client/src/__tests__/useTheme.test.tsx`
- `client/src/__tests__/Modal.test.tsx`
- `client/src/__tests__/AnimatedCounter.test.tsx`
- `client/src/__tests__/CommandPalette.test.tsx`

**Modified files:**
- `client/tailwind.config.js` — add `darkMode: 'class'`, keyframes
- `client/src/styles/index.css` — CSS variables for light/dark
- `client/src/main.tsx` — wrap with ThemeProvider
- `client/src/components/layout/Sidebar.tsx` — Lucide icons, user footer
- `client/src/components/layout/SidebarLayout.tsx` — theme toggle, greeting, Ctrl+K
- `client/src/pages/LoginPage.tsx` — aurora text, glass card, shimmer button
- `client/src/pages/RegisterPage.tsx` — same treatment as Login
- `client/src/pages/OverviewPage.tsx` — skeleton, animated counter, trend badge
- `client/src/pages/finance/BankAccountsPage.tsx` — modal forms, dark mode, shimmer
- `client/src/pages/finance/CreditCardsPage.tsx` — modal forms, dark mode, shimmer
- `client/src/pages/finance/LoansPage.tsx` — modal forms, dark mode, shimmer
- `client/src/pages/finance/FamilyPage.tsx` — modal forms, dark mode, shimmer
- `client/src/pages/finance/RemindersPage.tsx` — animated badges, modal, dark mode
- `client/src/pages/admin/AdminUsersPage.tsx` — dark mode class pass
- `client/src/pages/admin/AdminRolesPage.tsx` — dark mode class pass
- `client/src/pages/admin/AdminPermissionsPage.tsx` — dark mode class pass
- `client/src/pages/admin/AdminSettingsPage.tsx` — dark mode class pass

---

## Task 1: Install dependencies and set up foundation

**Files:**
- Modify: `client/tailwind.config.js`
- Modify: `client/src/styles/index.css`
- Create: `client/src/lib/utils.ts`

- [ ] **Step 1: Install packages**

```bash
cd /path/to/project/client
pnpm add lucide-react clsx tailwind-merge @radix-ui/react-dialog cmdk
```

Expected: packages added to `client/package.json` dependencies, no errors.

- [ ] **Step 2: Update tailwind.config.js**

Replace the entire file:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
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
      animation: {
        shimmer: "shimmer 2s linear infinite",
        aurora: "aurora 4s ease infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        aurora: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Add CSS variables to client/src/styles/index.css**

Replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 10% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --primary: 221 83% 53%;
    --primary-foreground: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
  }

  .dark {
    --background: 222 47% 7%;
    --foreground: 210 40% 98%;
    --card: 222 47% 10%;
    --primary: 199 89% 60%;
    --primary-foreground: 222 47% 11%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 17%;
  }
}
```

- [ ] **Step 4: Create client/src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Verify the build compiles**

```bash
cd client && pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/pnpm-lock.yaml client/tailwind.config.js \
  client/src/styles/index.css client/src/lib/utils.ts
git commit -m "feat: install ui deps and set up dark mode foundation"
```

---

## Task 2: useTheme hook

**Files:**
- Create: `client/src/hooks/useTheme.tsx`
- Create: `client/src/__tests__/useTheme.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/__tests__/useTheme.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to dark when localStorage is empty", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("reads initial theme from localStorage", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
  });

  it("applies dark class to documentElement when theme is dark", () => {
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    localStorage.setItem("theme", "light");
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme switches from dark to light", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("toggleTheme persists to localStorage", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.toggleTheme());
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
cd client && pnpm test -- --reporter=verbose useTheme
```

Expected: FAIL — module `@/hooks/useTheme` not found.

- [ ] **Step 3: Create client/src/hooks/useTheme.tsx**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored ?? "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
cd client && pnpm test -- --reporter=verbose useTheme
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useTheme.tsx client/src/__tests__/useTheme.test.tsx
git commit -m "feat: add ThemeProvider and useTheme hook with localStorage persistence"
```

---

## Task 3: ShimmerButton and GlowButton

**Files:**
- Create: `client/src/components/ui/shimmer-button.tsx`
- Create: `client/src/components/ui/glow-button.tsx`

- [ ] **Step 1: Create client/src/components/ui/shimmer-button.tsx**

```tsx
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function ShimmerButton({
  children,
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative overflow-hidden rounded-lg px-4 py-2 text-sm font-semibold",
        "bg-gradient-to-r from-ocean-accent to-ocean-violet text-slate-900",
        "shadow-[0_4px_20px_rgba(56,189,248,0.35)]",
        "before:absolute before:inset-0",
        "before:animate-shimmer before:bg-[length:200%_100%]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
        "transition-transform hover:scale-[1.02] active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // light mode: solid blue gradient
        "dark:from-ocean-accent dark:to-ocean-violet",
        "from-blue-600 to-blue-700 text-white dark:text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create client/src/components/ui/glow-button.tsx**

```tsx
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export function GlowButton({
  children,
  className,
  ...props
}: GlowButtonProps) {
  return (
    <button
      className={cn(
        "relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
        // light
        "border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
        // dark
        "dark:border-ocean-accent/40 dark:bg-ocean-accent/[0.08] dark:text-ocean-accent",
        "dark:shadow-[0_0_20px_rgba(56,189,248,0.15)] dark:hover:shadow-[0_0_30px_rgba(56,189,248,0.25)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Verify they render**

```bash
cd client && pnpm build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ui/shimmer-button.tsx \
  client/src/components/ui/glow-button.tsx
git commit -m "feat: add ShimmerButton and GlowButton UI components"
```

---

## Task 4: Modal dialog

**Files:**
- Create: `client/src/components/ui/modal.tsx`
- Create: `client/src/__tests__/Modal.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/__tests__/Modal.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/modal";

describe("Modal", () => {
  it("renders content when open", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("Test Modal")).toBeDefined();
    expect(screen.getByText("Modal content")).toBeDefined();
  });

  it("does not render content when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.queryByText("Test Modal")).toBeNull();
  });

  it("renders description when provided", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Title" description="Desc text">
        <p>content</p>
      </Modal>
    );
    expect(screen.getByText("Desc text")).toBeDefined();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Title">
        <p>content</p>
      </Modal>
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd client && pnpm test -- --reporter=verbose Modal
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create client/src/components/ui/modal.tsx**

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border p-6 shadow-2xl outline-none",
            // light
            "border-slate-200 bg-white",
            // dark
            "dark:border-white/10 dark:bg-slate-900",
            className
          )}
        >
          <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd client && pnpm test -- --reporter=verbose Modal
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ui/modal.tsx client/src/__tests__/Modal.test.tsx
git commit -m "feat: add Modal dialog component using Radix Dialog"
```

---

## Task 5: Skeleton, AnimatedCounter, AuroraText, AnimatedBadge

**Files:**
- Create: `client/src/components/ui/skeleton.tsx`
- Create: `client/src/components/ui/animated-counter.tsx`
- Create: `client/src/components/ui/aurora-text.tsx`
- Create: `client/src/components/ui/animated-badge.tsx`
- Create: `client/src/__tests__/AnimatedCounter.test.tsx`

- [ ] **Step 1: Write AnimatedCounter failing test**

Create `client/src/__tests__/AnimatedCounter.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

describe("AnimatedCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts near 0 and reaches target value", async () => {
    render(<AnimatedCounter value={1000} duration={100} />);
    // After full duration, counter should show 1,000
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("1,000")).toBeDefined();
  });

  it("uses custom formatter when provided", async () => {
    render(
      <AnimatedCounter
        value={500}
        duration={100}
        formatter={(v) => `₹${v}`}
      />
    );
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("₹500")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd client && pnpm test -- --reporter=verbose AnimatedCounter
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create client/src/components/ui/skeleton.tsx**

```tsx
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md",
        "bg-slate-200 dark:bg-white/[0.06]",
        className
      )}
    />
  );
}
```

- [ ] **Step 4: Create client/src/components/ui/animated-counter.tsx**

```tsx
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1200,
  formatter,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = formatter
    ? formatter(display)
    : display.toLocaleString("en-IN");

  return <span className={className}>{formatted}</span>;
}
```

- [ ] **Step 5: Create client/src/components/ui/aurora-text.tsx**

```tsx
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AuroraTextProps {
  children: ReactNode;
  className?: string;
}

export function AuroraText({ children, className }: AuroraTextProps) {
  return (
    <span
      className={cn(
        "animate-aurora bg-gradient-to-r from-ocean-accent via-ocean-violet to-ocean-accent",
        "bg-[length:200%_auto] bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 6: Create client/src/components/ui/animated-badge.tsx**

```tsx
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "urgent" | "warning" | "ok" | "info";

interface AnimatedBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  urgent:
    "bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 animate-pulse",
  warning:
    "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400",
  ok: "bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400",
  info: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400",
};

export function AnimatedBadge({
  variant,
  children,
  className,
}: AnimatedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 7: Run AnimatedCounter tests — expect pass**

```bash
cd client && pnpm test -- --reporter=verbose AnimatedCounter
```

Expected: 2 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ui/skeleton.tsx \
  client/src/components/ui/animated-counter.tsx \
  client/src/components/ui/aurora-text.tsx \
  client/src/components/ui/animated-badge.tsx \
  client/src/__tests__/AnimatedCounter.test.tsx
git commit -m "feat: add Skeleton, AnimatedCounter, AuroraText, AnimatedBadge components"
```

---

## Task 6: CommandPalette

**Files:**
- Create: `client/src/components/ui/command-palette.tsx`
- Create: `client/src/__tests__/CommandPalette.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/__tests__/CommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { CommandPalette } from "@/components/ui/command-palette";

function wrap(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    wrap(<CommandPalette open={false} onClose={() => {}} />);
    expect(screen.queryByPlaceholderText("Search pages, actions…")).toBeNull();
  });

  it("renders input when open", () => {
    wrap(<CommandPalette open={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText("Search pages, actions…")).toBeDefined();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const { container } = wrap(
      <CommandPalette open={true} onClose={onClose} />
    );
    const backdrop = container.firstChild as HTMLElement;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows navigation items", () => {
    wrap(<CommandPalette open={true} onClose={() => {}} />);
    expect(screen.getByText("Go to Overview")).toBeDefined();
    expect(screen.getByText("Go to Bank Accounts")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
cd client && pnpm test -- --reporter=verbose CommandPalette
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create client/src/components/ui/command-palette.tsx**

```tsx
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Landmark,
  Users,
  Bell,
  Mail,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, path: "/overview" },
  { label: "Bank Accounts", icon: CreditCard, path: "/bank-accounts" },
  { label: "Credit Cards", icon: Wallet, path: "/credit-cards" },
  { label: "Loans", icon: Landmark, path: "/loans" },
  { label: "Family", icon: Users, path: "/family" },
  { label: "Reminders", icon: Bell, path: "/reminders" },
  { label: "Invites", icon: Mail, path: "/invites" },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  if (!open) return null;

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-xl shadow-2xl",
          "border border-slate-200 bg-white",
          "dark:border-white/10 dark:bg-slate-900"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <Command.Input
            placeholder="Search pages, actions…"
            className={cn(
              "w-full border-b px-4 py-3 text-sm outline-none",
              "border-slate-200 bg-transparent text-slate-900 placeholder:text-slate-400",
              "dark:border-white/10 dark:text-white dark:placeholder:text-slate-500"
            )}
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-400"
            >
              {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
                <Command.Item
                  key={path}
                  onSelect={() => run(() => navigate(path))}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    "text-slate-700 hover:bg-slate-100",
                    "dark:text-slate-300 dark:hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4 opacity-60" />
                  Go to {label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-slate-400"
            >
              <Command.Item
                onSelect={() => run(toggleTheme)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 opacity-60" />
                ) : (
                  <Moon className="h-4 w-4 opacity-60" />
                )}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </Command.Item>
              <Command.Item
                onSelect={() => run(logout)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 opacity-60" />
                Logout
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd client && pnpm test -- --reporter=verbose CommandPalette
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ui/command-palette.tsx \
  client/src/__tests__/CommandPalette.test.tsx
git commit -m "feat: add CommandPalette component with Ctrl+K navigation"
```

---

## Task 7: Sidebar redesign

**Files:**
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Replace client/src/components/layout/Sidebar.tsx entirely**

```tsx
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  Landmark,
  Users,
  Bell,
  Mail,
  ShieldCheck,
  Users2,
  KeyRound,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const mainNavItems = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/bank-accounts", label: "Bank Accounts", icon: CreditCard },
  { to: "/credit-cards", label: "Credit Cards", icon: Wallet },
  { to: "/loans", label: "Loans", icon: Landmark },
  { to: "/family", label: "Family", icon: Users },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/invites", label: "Invites", icon: Mail },
];

const adminNavItems = [
  { to: "/admin/users", label: "Users", permission: "user.read", icon: Users2 },
  { to: "/admin/roles", label: "Roles", permission: "role.read", icon: ShieldCheck },
  { to: "/admin/permissions", label: "Permissions", permission: "permission.read", icon: KeyRound },
  { to: "/admin/settings", label: "Settings", permission: "admin.settings.read", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, hasPermission, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const hasAdminAccess = hasPermission("user.read");

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-ocean-accent/15 text-ocean-accent dark:bg-ocean-accent/15 dark:text-ocean-accent bg-blue-50 text-blue-700"
        : "text-white/60 hover:bg-white/5 hover:text-white/80 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-60 flex-col",
          "bg-gradient-to-b from-ocean-900 to-ocean-800",
          "dark:from-ocean-900 dark:to-ocean-800",
          "lg:from-white lg:to-white lg:border-r lg:border-slate-200",
          "transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ocean-accent to-ocean-violet text-sm font-bold text-slate-900">
            ₹
          </div>
          <span className="bg-gradient-to-r from-ocean-accent to-ocean-violet bg-clip-text text-lg font-bold text-transparent dark:from-ocean-accent dark:to-ocean-violet lg:from-blue-600 lg:to-blue-800">
            FinDiary
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={onClose}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {hasAdminAccess && (
            <>
              <div className="my-2 border-t border-white/10 dark:border-white/10 lg:border-slate-200" />
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm",
                  "text-white/60 hover:bg-white/5 hover:text-white/80",
                  "dark:text-white/60 dark:hover:bg-white/5",
                  "lg:text-slate-600 lg:hover:bg-slate-100 lg:hover:text-slate-900"
                )}
              >
                <span className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  Admin
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    adminOpen && "rotate-180"
                  )}
                />
              </button>
              {adminOpen && (
                <div className="ml-7 space-y-0.5">
                  {adminNavItems
                    .filter((item) => hasPermission(item.permission))
                    .map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={linkClass}
                        onClick={onClose}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 px-3 py-3 dark:border-white/10 lg:border-slate-200">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ocean-accent to-ocean-violet text-xs font-bold text-slate-900">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white/80 dark:text-white/80 lg:text-slate-800">
                {user?.name}
              </p>
              <p className="truncate text-[10px] text-white/40 dark:text-white/40 lg:text-slate-400">
                {user?.email}
              </p>
            </div>
            <button
              onClick={async () => {
                await logout();
                toast.success("Logged out");
              }}
              className="shrink-0 rounded-md p-1 text-white/40 hover:text-white/80 dark:text-white/40 dark:hover:text-white/80 lg:text-slate-400 lg:hover:text-slate-700"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
```

- [ ] **Step 2: Run existing tests**

```bash
cd client && pnpm test
```

Expected: all previously passing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/layout/Sidebar.tsx
git commit -m "feat: redesign sidebar with Lucide icons and user footer"
```

---

## Task 8: SidebarLayout top bar and main.tsx wiring

**Files:**
- Modify: `client/src/components/layout/SidebarLayout.tsx`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Replace client/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import App from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 2: Replace client/src/components/layout/SidebarLayout.tsx**

```tsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Menu, Sun, Moon } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { VerificationBanner } from "@/components/features/auth/VerificationBanner";
import { CommandPalette } from "@/components/ui/command-palette";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function SidebarLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const showVerificationBanner = user && !user.emailVerified;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ocean-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        {/* Top bar */}
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:px-6",
            "border-b border-slate-200 bg-white dark:border-white/10 dark:bg-ocean-900/80",
            "backdrop-blur-sm"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/5 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden lg:block">
              <span className="text-sm font-medium text-slate-500 dark:text-white/40">
                {greeting()},{" "}
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                {user?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdOpen(true)}
              className={cn(
                "hidden items-center gap-2 rounded-lg border px-3 py-1.5 text-xs sm:flex",
                "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-white/40 dark:hover:bg-white/5"
              )}
            >
              Search
              <kbd className="rounded border border-slate-200 px-1 py-0.5 text-[10px] dark:border-white/10">
                Ctrl K
              </kbd>
            </button>

            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-white/50 dark:hover:bg-white/5"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {showVerificationBanner && <VerificationBanner />}
          <Outlet />
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Toaster position="top-right" />
    </div>
  );
}

export default SidebarLayout;
```

- [ ] **Step 3: Run all tests**

```bash
cd client && pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/main.tsx client/src/components/layout/SidebarLayout.tsx
git commit -m "feat: wire ThemeProvider, dark mode toggle, greeting, and Ctrl+K palette"
```

---

## Task 9: Login and Register pages

**Files:**
- Modify: `client/src/pages/LoginPage.tsx`
- Modify: `client/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Replace client/src/pages/LoginPage.tsx**

```tsx
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { OAuthButtons } from "@/components/features/auth/OAuthButtons";
import { AuroraText } from "@/components/ui/aurora-text";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) toast.error(decodeURIComponent(error));
    if (searchParams.get("verified") === "true")
      toast.success("Email verified! You can now sign in.");
  }, [searchParams]);

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div
      className={cn(
        "flex min-h-[80vh] items-center justify-center px-4",
        "bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.08)_0%,transparent_70%)]",
        "dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.08)_0%,transparent_70%)]"
      )}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          {theme === "dark" ? (
            <AuroraText className="text-3xl font-black">₹ FinDiary</AuroraText>
          ) : (
            <span className="text-3xl font-black text-blue-700">₹ FinDiary</span>
          )}
          <p className="mt-2 text-sm text-slate-500 dark:text-white/40">
            Your family's financial companion
          </p>
        </div>

        {/* Card */}
        <div
          className={cn(
            "rounded-2xl border p-8 shadow-2xl",
            // light
            "border-slate-200 bg-white",
            // dark
            "dark:border-white/8 dark:bg-white/[0.03] dark:backdrop-blur-xl"
          )}
        >
          <LoginForm />

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200 dark:border-white/10" />
            <span className="text-xs text-slate-400 dark:text-white/30">
              or continue with
            </span>
            <div className="flex-1 border-t border-slate-200 dark:border-white/10" />
          </div>

          <OAuthButtons />

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-white/40">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-ocean-accent dark:hover:text-ocean-accent/80"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
```

- [ ] **Step 2: Apply the same treatment to client/src/pages/RegisterPage.tsx**

Read the current RegisterPage.tsx first, then apply the same pattern:
- Wrap content in the radial gradient div
- Add aurora text logo in dark mode, bold blue in light mode
- Wrap the form card with the glass card classes (`dark:border-white/8 dark:bg-white/[0.03] dark:backdrop-blur-xl border-slate-200 bg-white rounded-2xl border p-8 shadow-2xl`)
- Add `useTheme` import

- [ ] **Step 3: Apply dark mode classes to LoginForm.tsx and RegisterForm.tsx**

In `client/src/components/features/auth/LoginForm.tsx` and `RegisterForm.tsx`, update each `<input>` to add dark variants:

```tsx
// Before
className="rounded-md border border-gray-300 px-3 py-2 ..."
// After
className="rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 px-3 py-2 ..."
```

And update each submit `<button>` to use `ShimmerButton`:

```tsx
import { ShimmerButton } from "@/components/ui/shimmer-button";
// Replace: <button type="submit" className="...">Sign in</button>
// With:    <ShimmerButton type="submit" className="w-full">Sign in</ShimmerButton>
```

- [ ] **Step 4: Run tests**

```bash
cd client && pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/LoginPage.tsx client/src/pages/RegisterPage.tsx \
  client/src/components/features/auth/LoginForm.tsx \
  client/src/components/features/auth/RegisterForm.tsx
git commit -m "feat: redesign login and register pages with aurora text and glass card"
```

---

## Task 10: Overview page

**Files:**
- Modify: `client/src/pages/OverviewPage.tsx`

- [ ] **Step 1: Replace the NetWorthCard component (inside OverviewPage.tsx)**

Replace the `NetWorthCard` function:

```tsx
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/utils/format";
import type { DashboardOverview } from "@diary/shared";

function NetWorthCard({ netWorth }: { netWorth: DashboardOverview["netWorth"] }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-ocean-900 to-ocean-800 p-6 text-white shadow-lg dark:from-ocean-900 dark:to-ocean-800 lg:from-blue-700 lg:to-blue-800">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300 dark:text-sky-300 lg:text-blue-200">
        Total Net Worth
      </p>
      <p className="mt-2 text-4xl font-black tracking-tight">
        <AnimatedCounter
          value={netWorth.total}
          formatter={(v) => formatINR(v * 100)}
        />
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-300">
          ▲ assets ahead
        </span>
      </div>
      <div className="mt-4 flex gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Assets</p>
          <p className="mt-1 text-lg font-semibold text-green-400">
            {formatINR(netWorth.assets * 100)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Liabilities</p>
          <p className="mt-1 text-lg font-semibold text-red-400">
            {formatINR(netWorth.liabilities * 100)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the loading spinner with a Skeleton in OverviewPage**

Replace the loading block:

```tsx
// Before
if (loading) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ocean-700 border-t-transparent" />
    </div>
  );
}

// After
if (loading) {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Apply dark mode classes to QuickStatCard, UpcomingDues, and NeedsAttention**

`QuickStatCard` — change the container:
```tsx
// Before
<div className={`rounded-xl bg-white p-4 shadow-sm border-l-4 ${borderColor}`}>
// After
<div className={`rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-4 shadow-sm dark:shadow-none border-l-4 ${borderColor}`}>
```

`UpcomingDues` and `NeedsAttention` containers:
```tsx
// Before
<div className="rounded-xl bg-white p-5 shadow-sm">
// After
<div className="rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-5 shadow-sm dark:shadow-none">
```

Headings:
```tsx
// Before
<h2 className="text-base font-semibold text-slate-800 mb-3">
// After
<h2 className="text-base font-semibold text-slate-800 dark:text-white mb-3">
```

Text elements inside lists — add `dark:text-slate-300`, `dark:text-slate-400` as appropriate.

- [ ] **Step 4: Add page title dark mode styling**

```tsx
// Before
<h1 className="text-2xl font-bold text-slate-900">Overview</h1>
<p className="mt-1 text-sm text-slate-500">Your family's financial snapshot.</p>
// After
<h1 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your family's financial snapshot.</p>
```

- [ ] **Step 5: Run tests**

```bash
cd client && pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/OverviewPage.tsx
git commit -m "feat: add animated counter, skeleton loader, and dark mode to Overview"
```

---

## Task 11: Bank Accounts page

**Files:**
- Modify: `client/src/pages/finance/BankAccountsPage.tsx`

The key structural changes are:
1. Add form moves from inline `showAddForm` expansion → `Modal`
2. Edit form moves from inline `editingId` expansion → `Modal`
3. `window.confirm` delete → `Modal` with confirm button
4. `<button onClick={() => setShowAddForm(...)}` → `<ShimmerButton>`
5. All card containers get `dark:` Tailwind variants
6. Loading spinner → `Skeleton`

- [ ] **Step 1: Add new state variables and imports at the top**

Add to existing imports:

```tsx
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
```

Add new state in `BankAccountsPage()`:

```tsx
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [deleteTargetName, setDeleteTargetName] = useState("");
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
```

- [ ] **Step 2: Replace the loading block**

```tsx
if (loading) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Replace the handleDelete function**

```tsx
function openDeleteConfirm(id: string, name: string) {
  setDeleteTargetId(id);
  setDeleteTargetName(name);
  setConfirmDeleteOpen(true);
}

async function handleDelete() {
  if (!deleteTargetId) return;
  try {
    await api.delete<ApiResponse<unknown>>(`/bank-accounts/${deleteTargetId}`);
    toast.success("Account deleted");
    setConfirmDeleteOpen(false);
    setDeleteTargetId(null);
    await fetchData();
  } catch {
    toast.error("Failed to delete account");
  }
}
```

- [ ] **Step 4: Replace the page header and Add form section**

```tsx
{/* Header */}
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bank Accounts</h1>
  <ShimmerButton onClick={() => setShowAddForm(true)}>
    + Add Account
  </ShimmerButton>
</div>

{/* Add Modal */}
<Modal
  open={showAddForm}
  onClose={() => { setShowAddForm(false); setAddForm(defaultAddForm); }}
  title="Add Bank Account"
>
  <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {/* --- paste existing form fields here, update className to use dark: variants --- */}
    {/* input className: "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent" */}
    {/* select className: same as above */}
    {/* label className: "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" */}
    <div className="col-span-2 flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={() => { setShowAddForm(false); setAddForm(defaultAddForm); }}
        className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Cancel
      </button>
      <ShimmerButton type="submit" disabled={addSubmitting}>
        {addSubmitting ? "Adding…" : "Add Account"}
      </ShimmerButton>
    </div>
  </form>
</Modal>
```

- [ ] **Step 5: Replace the Edit inline form with a Modal**

Remove the `isEditing` inline form block from inside the account card. Add an Edit Modal after the Add Modal:

```tsx
<Modal
  open={editingId !== null}
  onClose={() => setEditingId(null)}
  title="Edit Account"
>
  <form
    onSubmit={(e) => editingId && handleEdit(e, editingId)}
    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
  >
    {/* paste existing edit form fields with dark: variants */}
    <div className="col-span-2 flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={() => setEditingId(null)}
        className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Cancel
      </button>
      <ShimmerButton type="submit" disabled={editSubmitting}>
        {editSubmitting ? "Saving…" : "Save"}
      </ShimmerButton>
    </div>
  </form>
</Modal>
```

- [ ] **Step 6: Add the Delete Confirm Modal**

```tsx
<Modal
  open={confirmDeleteOpen}
  onClose={() => setConfirmDeleteOpen(false)}
  title="Delete Account"
  description={`This will permanently remove ${deleteTargetName}. This cannot be undone.`}
>
  <div className="flex justify-end gap-3">
    <button
      onClick={() => setConfirmDeleteOpen(false)}
      className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
    >
      Cancel
    </button>
    <button
      onClick={handleDelete}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
    >
      Delete
    </button>
  </div>
</Modal>
```

- [ ] **Step 7: Update account cards with dark mode classes**

For each account card `<div>`:
```tsx
// Before
<div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
// After
<div className="rounded-xl border p-4 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
```

Member group heading:
```tsx
// Before
<h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700 pb-1">
// After
<h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1">
```

Action button for Delete:
```tsx
// Change: onClick={() => handleDelete(account.id, account.bankName)}
// To:     onClick={() => openDeleteConfirm(account.id, account.bankName)}
```

- [ ] **Step 8: Run tests**

```bash
cd client && pnpm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/finance/BankAccountsPage.tsx
git commit -m "feat: Bank Accounts — modal forms, dark mode, shimmer button, skeleton loader"
```

---

## Task 12: Credit Cards page

**Files:**
- Modify: `client/src/pages/finance/CreditCardsPage.tsx`

Apply the identical pattern from Task 11 to CreditCardsPage:

- [ ] **Step 1: Add imports**

```tsx
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Add delete modal state**

```tsx
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [deleteTargetName, setDeleteTargetName] = useState("");

function openDeleteConfirm(id: string, name: string) {
  setDeleteTargetId(id); setDeleteTargetName(name); setConfirmDeleteOpen(true);
}

async function handleDelete() {
  if (!deleteTargetId) return;
  try {
    await api.delete<ApiResponse<unknown>>(`/credit-cards/${deleteTargetId}`);
    toast.success("Card deleted");
    setConfirmDeleteOpen(false);
    setDeleteTargetId(null);
    await fetchData();
  } catch {
    toast.error("Failed to delete card");
  }
}
```

- [ ] **Step 3: Replace loading spinner with Skeleton**

```tsx
if (loading) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Replace "Add Card" button with ShimmerButton, move form to Modal**

Replace the header button:
```tsx
<ShimmerButton onClick={() => setShowAddForm(true)}>+ Add Card</ShimmerButton>
```

Wrap the add form in `<Modal open={showAddForm} onClose={() => { setShowAddForm(false); setAddForm(defaultAddForm); }} title="Add Credit Card">`. Move all form fields inside. Apply dark mode input/select/label classes (same pattern as Task 11 Step 4).

- [ ] **Step 5: Move edit form to Modal and add delete confirm Modal**

Same pattern as Task 11 Steps 5 and 6 — replace inline edit with `<Modal open={editingId !== null} ...>` and add `<Modal open={confirmDeleteOpen} ...>` for delete confirmation.

- [ ] **Step 6: Update card containers with dark mode classes**

Each card `<div>`:
```tsx
className="rounded-xl border p-4 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
```

Member group heading, card text, badge colors — update existing light-mode-only classes to include `dark:` variants. The loan type badge colors (e.g. `bg-blue-100 text-blue-700`) become `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`.

Update delete button click: `onClick={() => openDeleteConfirm(card.id, card.cardName)}`.

- [ ] **Step 7: Run tests and commit**

```bash
cd client && pnpm test
git add client/src/pages/finance/CreditCardsPage.tsx
git commit -m "feat: Credit Cards — modal forms, dark mode, shimmer button, skeleton loader"
```

---

## Task 13: Loans page

**Files:**
- Modify: `client/src/pages/finance/LoansPage.tsx`

Apply the same pattern as Tasks 11–12.

- [ ] **Step 1: Add imports**

```tsx
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
```

- [ ] **Step 2: Add delete modal state and handler**

```tsx
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [deleteTargetName, setDeleteTargetName] = useState("");

function openDeleteConfirm(id: string, name: string) {
  setDeleteTargetId(id); setDeleteTargetName(name); setConfirmDeleteOpen(true);
}

async function handleDelete() {
  if (!deleteTargetId) return;
  try {
    await api.delete<ApiResponse<unknown>>(`/loans/${deleteTargetId}`);
    toast.success("Loan deleted");
    setConfirmDeleteOpen(false);
    setDeleteTargetId(null);
    await fetchData();
  } catch {
    toast.error("Failed to delete loan");
  }
}
```

- [ ] **Step 3: Replace loading spinner, header button, inline forms**

Same pattern as Task 11 Steps 2–6. Skeleton shape:

```tsx
if (loading) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}
```

Modal title: `"Add Loan"` / `"Edit Loan"`. Delete description: `\`This will permanently remove the ${deleteTargetName} loan.\``.

Loan type badge dark mode: `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` etc. (match the `LOAN_TYPE_COLORS` record with added dark variants).

- [ ] **Step 4: Run tests and commit**

```bash
cd client && pnpm test
git add client/src/pages/finance/LoansPage.tsx
git commit -m "feat: Loans — modal forms, dark mode, shimmer button, skeleton loader"
```

---

## Task 14: Family page

**Files:**
- Modify: `client/src/pages/finance/FamilyPage.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Add delete modal state and handler**

```tsx
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [deleteTargetName, setDeleteTargetName] = useState("");

function openDeleteConfirm(id: string, name: string) {
  setDeleteTargetId(id); setDeleteTargetName(name); setConfirmDeleteOpen(true);
}

async function handleDelete() {
  if (!deleteTargetId) return;
  setDeletingId(deleteTargetId);
  try {
    await api.delete<ApiResponse<unknown>>(`/family-members/${deleteTargetId}`);
    toast.success("Member removed.");
    setMembers((prev) => prev.filter((m) => m.id !== deleteTargetId));
    setConfirmDeleteOpen(false);
    setDeleteTargetId(null);
  } catch {
    toast.error("Failed to remove member.");
  } finally {
    setDeletingId(null);
  }
}
```

- [ ] **Step 3: Replace loading block**

```tsx
if (loading) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace header + inline form with ShimmerButton + Modal**

Header:
```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Family</h1>
  <ShimmerButton onClick={openAdd}>+ Add Member</ShimmerButton>
</div>
```

Replace the `showForm && (...)` inline block with:

```tsx
<Modal
  open={showForm}
  onClose={cancelForm}
  title={editingId ? "Edit Member" : "Add Family Member"}
>
  <div className="grid gap-4">
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Name <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="e.g. Priya Kumar"
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ocean-accent"
      />
    </div>
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Relationship <span className="text-red-500">*</span>
      </label>
      <select
        value={form.relationship}
        onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value as Relationship }))}
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-ocean-accent"
      >
        {RELATIONSHIPS.map((r) => (
          <option key={r} value={r} className="capitalize">{r}</option>
        ))}
      </select>
    </div>
    <div className="flex justify-end gap-3 pt-2">
      <button
        onClick={cancelForm}
        disabled={saving}
        className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Cancel
      </button>
      <ShimmerButton onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </ShimmerButton>
    </div>
  </div>
</Modal>
```

- [ ] **Step 5: Add Delete Confirm Modal**

```tsx
<Modal
  open={confirmDeleteOpen}
  onClose={() => setConfirmDeleteOpen(false)}
  title="Remove Member"
  description={`This will remove ${deleteTargetName} from your family. This cannot be undone.`}
>
  <div className="flex justify-end gap-3">
    <button
      onClick={() => setConfirmDeleteOpen(false)}
      className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
    >
      Cancel
    </button>
    <button
      onClick={handleDelete}
      disabled={!!deletingId}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
    >
      {deletingId ? "Removing…" : "Remove"}
    </button>
  </div>
</Modal>
```

- [ ] **Step 6: Update member cards with dark mode classes and avatar initials**

Replace the existing member card rendering with:

```tsx
<div className="rounded-xl border p-5 border-slate-200 bg-white dark:border-white/8 dark:bg-white/[0.03]">
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-3">
      {/* Avatar with initials */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ocean-accent to-ocean-violet text-sm font-bold text-slate-900">
        {member.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
        <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize mt-0.5", RELATIONSHIP_BADGE[member.relationship])}>
          {member.relationship}
        </span>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => openEdit(member)}
        className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
      >
        Edit
      </button>
      <button
        onClick={() => openDeleteConfirm(member.id, member.name)}
        className="rounded-lg border border-red-200 dark:border-red-500/30 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
      >
        Remove
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 7: Run tests and commit**

```bash
cd client && pnpm test
git add client/src/pages/finance/FamilyPage.tsx
git commit -m "feat: Family — modal forms, avatar initials, dark mode, skeleton loader"
```

---

## Task 15: Reminders page

**Files:**
- Modify: `client/src/pages/finance/RemindersPage.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { GlowButton } from "@/components/ui/glow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Replace loading state**

```tsx
if (loading) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace header buttons**

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reminders</h1>
  <div className="flex gap-2">
    <GlowButton onClick={handleSync} disabled={syncing}>
      {syncing ? "Syncing…" : "Sync Reminders"}
    </GlowButton>
    <ShimmerButton onClick={openAdd}>Add Reminder</ShimmerButton>
  </div>
</div>
```

- [ ] **Step 4: Move the add/edit form to Modal**

Replace `showForm && (...)` inline block:

```tsx
<Modal
  open={showForm}
  onClose={cancelForm}
  title={editingId ? "Edit Reminder" : "Add Reminder"}
>
  <div className="grid gap-4 sm:grid-cols-2">
    {/* Title */}
    <div className="sm:col-span-2">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Title <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="e.g. HDFC Credit Card Payment"
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ocean-accent"
      />
    </div>
    {/* Description */}
    <div className="sm:col-span-2">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Description <span className="text-xs text-slate-400">(optional)</span>
      </label>
      <input
        type="text"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Additional details"
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ocean-accent"
      />
    </div>
    {/* Due Date */}
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Due Date <span className="text-xs text-slate-400">(one-time)</span>
      </label>
      <input
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value, recurringDay: e.target.value ? "" : f.recurringDay }))}
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-ocean-accent"
      />
    </div>
    {/* Recurring Day */}
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Recurring Day <span className="text-xs text-slate-400">(1–31)</span>
      </label>
      <select
        value={form.recurringDay}
        onChange={(e) => setForm((f) => ({ ...f, recurringDay: e.target.value, dueDate: e.target.value ? "" : f.dueDate }))}
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-ocean-accent"
      >
        <option value="">— select day —</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
    {/* Frequency */}
    <div className="sm:col-span-2">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Frequency</label>
      <select
        value={form.frequency}
        onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ReminderFrequency }))}
        className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-ocean-accent"
      >
        {FREQUENCIES.map((freq) => (
          <option key={freq} value={freq} className="capitalize">{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
        ))}
      </select>
    </div>
    <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
      <button onClick={cancelForm} disabled={saving}
        className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
        Cancel
      </button>
      <ShimmerButton onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </ShimmerButton>
    </div>
  </div>
</Modal>
```

- [ ] **Step 5: Replace reminder cards with AnimatedBadge urgency indicators**

Replace the card rendering block:

```tsx
{reminders.map((reminder) => {
  const daysLeft = getDaysLeft(reminder);
  const badgeVariant =
    daysLeft !== null && daysLeft <= 0
      ? "urgent"
      : daysLeft !== null && daysLeft <= 3
      ? "urgent"
      : daysLeft !== null && daysLeft <= 7
      ? "warning"
      : "ok";

  return (
    <div
      key={reminder.id}
      className="flex flex-col gap-3 rounded-xl border p-5 border-slate-200 bg-white dark:border-white/8 dark:bg-white/[0.03]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AnimatedBadge variant={badgeVariant === "ok" ? "info" : badgeVariant}>
          {TYPE_LABEL[reminder.type]}
        </AnimatedBadge>
        {!isCustom(reminder) && (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Auto
          </span>
        )}
        {daysLeft !== null && daysLeft <= 3 && (
          <AnimatedBadge variant="urgent">Urgent</AnimatedBadge>
        )}
      </div>

      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-white">{reminder.title}</p>
        {reminder.description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{reminder.description}</p>
        )}
      </div>

      <p className={cn(
        "text-sm",
        daysLeft !== null && daysLeft <= 3
          ? "font-medium text-red-600 dark:text-red-400"
          : "text-slate-500 dark:text-slate-400"
      )}>
        {getNextOccurrenceLabel(reminder)}
      </p>

      <div>
        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize">
          {reminder.frequency}
        </span>
      </div>

      {isCustom(reminder) && (
        <div className="flex gap-2 border-t border-slate-100 dark:border-white/8 pt-3">
          <button
            onClick={() => openEdit(reminder)}
            className="rounded-lg border border-slate-300 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(reminder.id)}
            disabled={deletingId === reminder.id}
            className="rounded-lg border border-red-200 dark:border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-60"
          >
            {deletingId === reminder.id ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
})}
```

- [ ] **Step 6: Update tabs with dark mode styling**

```tsx
<div className="flex gap-1 border-b border-slate-200 dark:border-white/10">
  {(["upcoming", "all"] as Tab[]).map((t) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors focus:outline-none",
        tab === t
          ? "border-b-2 border-ocean-accent text-ocean-accent"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      )}
    >
      {t === "upcoming" ? "Upcoming" : "All Reminders"}
    </button>
  ))}
</div>
```

- [ ] **Step 7: Run tests and commit**

```bash
cd client && pnpm test
git add client/src/pages/finance/RemindersPage.tsx
git commit -m "feat: Reminders — AnimatedBadge urgency, modal form, GlowButton, dark mode"
```

---

## Task 16: Admin pages dark mode pass

**Files:**
- Modify: `client/src/pages/admin/AdminUsersPage.tsx`
- Modify: `client/src/pages/admin/AdminRolesPage.tsx`
- Modify: `client/src/pages/admin/AdminPermissionsPage.tsx`
- Modify: `client/src/pages/admin/AdminSettingsPage.tsx`

For each admin page, apply the dark mode class pattern without changing structure or logic.

- [ ] **Step 1: Read each admin page, then apply dark mode classes**

For each file, apply these patterns:

| Element | Before | After |
|---|---|---|
| Page container | `bg-white` | `bg-white dark:bg-slate-900` |
| Card/panel | `bg-white shadow-sm` | `bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none dark:border dark:border-white/8` |
| Heading `h1` | `text-gray-900` | `text-gray-900 dark:text-white` |
| Body text | `text-gray-600` | `text-gray-600 dark:text-slate-400` |
| Table row | `border-gray-200` | `border-gray-200 dark:border-white/8` |
| Badge (role/permission) | `bg-blue-100 text-blue-800` | `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300` |
| Input/select | `border-gray-300` | `border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white` |
| Button (secondary) | `bg-gray-100 text-gray-700` | `bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-slate-300` |

- [ ] **Step 2: Run all tests**

```bash
cd client && pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit all four admin pages**

```bash
git add client/src/pages/admin/
git commit -m "feat: admin pages — apply dark mode class pass"
```

---

## Task 17: Final verification

- [ ] **Step 1: Run full test suite**

```bash
cd client && pnpm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 2: Run the build**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Run the quality check skill if available, otherwise lint manually**

```bash
cd client && pnpm lint
```

Expected: no ESLint errors.

- [ ] **Step 4: Start dev server and do a manual smoke test**

```bash
pnpm dev
```

Checklist:
- [ ] App loads in dark mode by default
- [ ] Dark/light toggle switches correctly and persists on reload
- [ ] Ctrl+K opens command palette, Escape closes it
- [ ] Login page shows aurora text (dark) / blue title (light)
- [ ] Overview shows animated counter counting up on load
- [ ] Overview shows skeleton while loading
- [ ] Bank Accounts "Add Account" opens a modal
- [ ] Bank Accounts delete shows a confirm modal (not `window.confirm`)
- [ ] Sidebar shows Lucide icons and user name/email in footer
- [ ] Reminders show AnimatedBadge with pulse on urgent items

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete FinDiary UI/UX overhaul with Sera UI, dark mode, and wow-factor components"
```
