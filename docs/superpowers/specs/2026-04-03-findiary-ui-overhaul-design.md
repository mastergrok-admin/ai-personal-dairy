# FinDiary UI/UX Overhaul Design Spec

**Date:** 2026-04-03  
**Status:** Approved  
**Scope:** Full UI/UX overhaul using Sera UI + shadcn/ui + Lucide icons with dark/light mode

---

## 1. Design Direction

**Palette:** Ocean Blue (existing brand, elevated)
- Dark mode: deep navy (`#0a0e1a` / `#0f172a`) + sky blue accent (`#38bdf8`) + indigo (`#818cf8`)
- Light mode: white cards on `#f0f9ff` background + blue accent (`#2563eb` / `#1d4ed8`)
- Semantic colors (both modes): green for assets/positive, red for dues/negative, amber for warnings

**Component library:** Sera UI (copy-paste, shadcn/ui-based)  
**Icon library:** Lucide React (replaces all emoji icons)  
**Dark mode strategy:** Tailwind `darkMode: 'class'` — toggle class on `<html>` element, persist to `localStorage`

---

## 2. New Dependencies

| Package | Purpose | Install |
|---|---|---|
| `lucide-react` | SVG icon set | `pnpm add lucide-react` |
| `clsx` | Class name utility | `pnpm add clsx` |
| `tailwind-merge` | Merge Tailwind conflicts | `pnpm add tailwind-merge` |
| `class-variance-authority` | Variant-based components | `pnpm add class-variance-authority` |
| `@radix-ui/react-dialog` | Accessible modal dialogs | `pnpm add @radix-ui/react-dialog` |
| `cmdk` | Command palette (Ctrl+K) | `pnpm add cmdk` |

**Sera UI copy-paste components** (no npm install — copied into `client/src/components/ui/`):
- `ShimmerButton` — primary CTA buttons across all pages
- `GlowButton` — secondary actions (Sync, Cancel with style)
- `AuroraText` — animated gradient text for the login page logo
- `AnimatedBadge` — urgency indicators on Reminders page
- `Skeleton` — shimmer skeleton loader (custom, Sera-inspired)

---

## 3. Foundation Changes

### 3.1 Tailwind Config (`client/tailwind.config.js`)
- Add `darkMode: 'class'`
- Extend color tokens to include CSS variable references for shadcn/ui compatibility
- Retain existing `ocean` palette, add semantic aliases (`primary`, `surface`, `card`, `border`)

### 3.2 CSS Variables (`client/src/index.css`)
- Add shadcn/ui CSS variable block: `:root` (light) and `.dark` (dark)
- Variables: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--ring`
- Aurora text animation keyframes

### 3.3 Utility (`client/src/lib/utils.ts`)
- `cn()` helper using `clsx` + `tailwind-merge` (shadcn/ui standard)

### 3.4 Dark Mode Context (`client/src/hooks/useTheme.tsx`)
- `ThemeProvider` wrapping the app — reads/writes `localStorage` key `theme`
- Applies `dark` class to `document.documentElement`
- `useTheme()` hook exposes `{ theme, toggleTheme }`

---

## 4. Shared Components

All created in `client/src/components/ui/`:

| Component | File | Description |
|---|---|---|
| `ShimmerButton` | `shimmer-button.tsx` | Shimmer sweep animation, gradient fill, primary CTA |
| `GlowButton` | `glow-button.tsx` | Glow border pulse, secondary actions |
| `Modal` | `modal.tsx` | Radix Dialog wrapper — blur backdrop, slide-up animation |
| `Skeleton` | `skeleton.tsx` | Shimmer pulse placeholder, composable shapes |
| `AnimatedCounter` | `animated-counter.tsx` | Counts from 0 to value on mount, eased animation |
| `AuroraText` | `aurora-text.tsx` | Animated gradient background-clip text |
| `AnimatedBadge` | `animated-badge.tsx` | Pulsing badge for urgency states |
| `CommandPalette` | `command-palette.tsx` | `cmdk`-based Ctrl+K palette with page nav + actions |

---

## 5. Layout & Navigation

### 5.1 Sidebar (`client/src/components/layout/Sidebar.tsx`)
- Replace all emoji icons with Lucide React icons:
  - Overview → `LayoutDashboard`
  - Bank Accounts → `CreditCard`
  - Credit Cards → `Wallet`
  - Loans → `Landmark`
  - Family → `Users`
  - Reminders → `Bell`
  - Invites → `Mail`
  - Admin → `ShieldCheck`
- Add user avatar + name + role pinned to sidebar bottom
- Active state: `bg-primary/10 text-primary` (works in both modes via CSS vars)

### 5.2 Top Bar (`client/src/components/layout/SidebarLayout.tsx`)
- Add `DarkModeToggle` button (sun/moon icon, `useTheme()`)
- Add personalized greeting: "Good morning/afternoon/evening, {name}" with current date
- Remove duplicate logout button from top bar (already in sidebar bottom)

### 5.3 ThemeProvider in `main.tsx`
- Wrap `<App />` with `<ThemeProvider>`

---

## 6. Page-by-Page Changes

### 6.1 Login & Register (`LoginPage.tsx`, `RegisterPage.tsx`)
- Background: radial gradient spotlight (`radial-gradient` from top centre)
- Card: glass morphism in dark mode (`backdrop-blur`, `bg-white/3`, `border-white/8`), clean white in light mode
- Logo: `<AuroraText>₹ FinDiary</AuroraText>` (animated gradient in dark), bold blue in light
- Submit button: `<ShimmerButton>` in dark, solid gradient in light
- OAuth buttons: styled outline buttons (replace bare `<button>`)

### 6.2 Overview Page (`OverviewPage.tsx`)
- Net Worth Card:
  - `<AnimatedCounter>` for the total value — counts up from 0 on load
  - Trend indicator: `▲ X%  +₹Y this month` (green) / `▼ X%` (red)
  - Glass card in dark, gradient blue card in light
- Quick Stat Cards: `dark:bg-white/4` glass in dark, white with `border-l-4` accent in light
- Skeleton loader: replace spinner with `<Skeleton>` shaped like the page layout
- Upcoming Dues + Needs Attention: same card style as the rest of the page

### 6.3 Bank Accounts (`BankAccountsPage.tsx`)
- Account cards: redesigned with masked account number (`···· ···· ···· XXXX`), type badge, staleness badge
- Add Account button: `<ShimmerButton>`
- Add/Edit form: move from inline expansion to `<Modal>` dialog
- Delete confirmation: `<Modal>` with destructive confirm button (replaces `window.confirm`)
- Balance update: stays inline (quick action, modal would be overkill)

### 6.4 Credit Cards (`CreditCardsPage.tsx`)
- Same pattern as Bank Accounts: card redesign + modal add/edit + shimmer button

### 6.5 Loans (`LoansPage.tsx`)
- Same pattern as Bank Accounts: card redesign + modal add/edit + shimmer button

### 6.6 Family (`FamilyPage.tsx`)
- Member cards redesigned with avatar initials circle
- Add member: modal dialog
- Delete: modal confirmation

### 6.7 Reminders (`RemindersPage.tsx`)
- Reminder cards: urgency-tiered styling
  - Overdue / today: `<AnimatedBadge variant="urgent">` (pulsing red)
  - ≤3 days: `<AnimatedBadge variant="warning">` (amber)
  - OK: `<AnimatedBadge variant="ok">` (green, no pulse)
- Sync button: `<GlowButton>`
- Add Reminder: `<ShimmerButton>` → opens `<Modal>`
- Edit/Delete custom reminders: inside modal

### 6.8 Admin Pages (`AdminUsersPage`, `AdminRolesPage`, `AdminPermissionsPage`, `AdminSettingsPage`)
- Apply `dark:` Tailwind variants to existing cards, tables, and form elements so they render correctly in dark mode
- No structural changes — layout, logic, and component tree stay the same

---

## 7. New Features

### 7.1 Dark/Light Mode Toggle
- Persisted in `localStorage` under key `"theme"` (`"dark"` | `"light"`)
- Defaults to `"dark"` if no preference set
- Toggle button in top bar (sun icon in dark, moon icon in light)
- Also exposed in Command Palette as an action

### 7.2 Animated Number Counter
- Component: `<AnimatedCounter value={number} duration={1200} />`
- Animates from 0 to `value` using `requestAnimationFrame` + easing
- Used on Overview net worth card

### 7.3 Skeleton Loading States
- Every page that fetches data shows skeletons while loading
- Skeleton shape mirrors the actual content layout (not generic bars)
- Replaces all `animate-spin` spinners

### 7.4 Modal Dialogs
- All add/edit/delete forms across Bank Accounts, Credit Cards, Loans, Family, Reminders
- Replaces both inline expansion forms and `window.confirm` calls
- Accessible: focus trap, Escape to close, click-outside to close

### 7.5 Command Palette (Ctrl+K)
- Navigates to: Overview, Bank Accounts, Credit Cards, Loans, Family, Reminders, Invites, Admin pages
- Actions: Sync Reminders, Toggle Dark Mode, Logout
- Keyboard driven: arrow keys to navigate, Enter to select, Escape to close
- Available on all authenticated pages

### 7.6 Trend Indicator on Net Worth
- Shows `▲ X.X%` (green) or `▼ X.X%` (red) next to net worth
- Requires backend: `GET /dashboard/overview` response needs a `netWorth.changePercent` field
- If not available from backend, display as static placeholder `+₹X this month` using existing data

---

## 8. What Is NOT Changing

- No changes to server code (except possibly adding `changePercent` to dashboard overview — optional)
- No changes to auth flow, routing, or permissions logic
- No changes to `@diary/shared` types (unless `changePercent` is added)
- Admin pages: theme pass only, no structural changes
- `DashboardPage.tsx`: already redirects to Overview, can be left or removed

---

## 9. File Impact Summary

**Modified:**
- `client/tailwind.config.js`
- `client/src/index.css`
- `client/src/main.tsx`
- `client/src/components/layout/Sidebar.tsx`
- `client/src/components/layout/SidebarLayout.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/RegisterPage.tsx`
- `client/src/pages/OverviewPage.tsx`
- `client/src/pages/finance/BankAccountsPage.tsx`
- `client/src/pages/finance/CreditCardsPage.tsx`
- `client/src/pages/finance/LoansPage.tsx`
- `client/src/pages/finance/FamilyPage.tsx`
- `client/src/pages/finance/RemindersPage.tsx`
- `client/src/pages/admin/*.tsx` (theme pass)

**Created:**
- `client/src/lib/utils.ts`
- `client/src/hooks/useTheme.tsx`
- `client/src/components/ui/shimmer-button.tsx`
- `client/src/components/ui/glow-button.tsx`
- `client/src/components/ui/modal.tsx`
- `client/src/components/ui/skeleton.tsx`
- `client/src/components/ui/animated-counter.tsx`
- `client/src/components/ui/aurora-text.tsx`
- `client/src/components/ui/animated-badge.tsx`
- `client/src/components/ui/command-palette.tsx`
