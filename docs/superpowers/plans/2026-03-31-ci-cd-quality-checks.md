# CI/CD Pipeline & Quality Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint configs, spell checking, a pre-push quality checklist skill, and GitHub Actions workflows for CI, development, and environment deployments (QA/STG/PROD) with release tagging.

**Architecture:** Three GitHub Actions workflows — (1) CI runs on every push/PR to `main` and `develop`, (2) Development workflow for feature branches, (3) Deploy workflow triggered manually with environment selection and commit ID, creating release tags for `main` commits deployed to PROD. Locally, ESLint flat configs per workspace, cspell for spell checking, and a `/quality-check` skill that runs the full checklist.

**Tech Stack:** GitHub Actions, ESLint 9 (flat config), cspell, Vitest, TypeScript, Turborepo, pnpm

---

## File Structure

```
ai-personal-dairy/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI: lint, spell, type-check, build, test on push/PR to main/develop
│       ├── dev.yml                   # Dev: lint, type-check, test on feature branch push/PR
│       └── deploy.yml                # Deploy: manual trigger, QA/STG/PROD by commit ID, release tags
│
├── client/
│   └── eslint.config.js             # CREATE: ESLint flat config for React/TS
│
├── server/
│   └── eslint.config.js             # CREATE: ESLint flat config for Node/TS
│
├── shared/
│   └── eslint.config.js             # CREATE: ESLint flat config for TS library
│
├── cspell.json                      # CREATE: Spell check config for the monorepo
│
├── .claude/
│   └── skills/
│       └── quality-check/
│           └── SKILL.md             # CREATE: Pre-push quality checklist skill
│
├── docs/
│   ├── architecture.md              # MODIFY: Add CI/CD section
│   └── skills-and-agents.md         # MODIFY: Add quality-check skill
```

---

### Task 1: ESLint Flat Config — Client

**Files:**
- Create: `client/eslint.config.js`
- Modify: `client/package.json` (add ESLint + plugins as devDependencies)

- [ ] **Step 1: Install ESLint dependencies for client**

```bash
cd /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy
pnpm --filter @diary/client add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

- [ ] **Step 2: Create the ESLint flat config**

Create `client/eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
```

- [ ] **Step 3: Run lint to verify it works**

```bash
pnpm --filter @diary/client run lint
```

Expected: Either clean output or a list of warnings/errors (no crash). Fix any errors that block the lint from running.

- [ ] **Step 4: Commit**

```bash
git add client/eslint.config.js client/package.json pnpm-lock.yaml
git commit -m "feat: add ESLint flat config for client workspace"
```

---

### Task 2: ESLint Flat Config — Server

**Files:**
- Create: `server/eslint.config.js`
- Modify: `server/package.json` (add ESLint + plugins as devDependencies)

- [ ] **Step 1: Install ESLint dependencies for server**

```bash
cd /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy
pnpm --filter @diary/server add -D eslint @eslint/js typescript-eslint globals
```

- [ ] **Step 2: Create the ESLint flat config**

Create `server/eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "prisma/migrations"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
```

- [ ] **Step 3: Run lint to verify**

```bash
pnpm --filter @diary/server run lint
```

Expected: Either clean output or a list of warnings/errors (no crash).

- [ ] **Step 4: Commit**

```bash
git add server/eslint.config.js server/package.json pnpm-lock.yaml
git commit -m "feat: add ESLint flat config for server workspace"
```

---

### Task 3: ESLint Flat Config — Shared

**Files:**
- Create: `shared/eslint.config.js`
- Modify: `shared/package.json` (add lint script + ESLint deps)

- [ ] **Step 1: Install ESLint dependencies for shared**

```bash
cd /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy
pnpm --filter @diary/shared add -D eslint @eslint/js typescript-eslint globals
```

- [ ] **Step 2: Add lint script to shared/package.json**

Add to the `"scripts"` section:

```json
"lint": "eslint ."
```

- [ ] **Step 3: Create the ESLint flat config**

Create `shared/eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
```

- [ ] **Step 4: Run lint for shared and then full monorepo lint**

```bash
pnpm --filter @diary/shared run lint
pnpm run lint
```

Expected: All three workspaces lint without crashing.

- [ ] **Step 5: Commit**

```bash
git add shared/eslint.config.js shared/package.json pnpm-lock.yaml
git commit -m "feat: add ESLint flat config for shared workspace"
```

---

### Task 4: Spell Check with cspell

**Files:**
- Create: `cspell.json`
- Modify: root `package.json` (add `spell-check` script)

- [ ] **Step 1: Install cspell at the root**

```bash
cd /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy
pnpm add -D -w cspell
```

- [ ] **Step 2: Create cspell.json**

Create `cspell.json` at the project root:

```json
{
  "version": "0.2",
  "language": "en",
  "words": [
    "tailwindcss",
    "postcss",
    "autoprefixer",
    "tseslint",
    "turborepo",
    "monorepo",
    "pnpm",
    "vitest",
    "supertest",
    "prisma",
    "datasource",
    "cuid",
    "datetime",
    "signin",
    "signup",
    "authn",
    "authz",
    "rbac",
    "oauth",
    "httponly",
    "bcrypt",
    "jwts",
    "jsonwebtoken",
    "netlify",
    "vite",
    "nonempty",
    "clsx",
    "esmodules",
    "esnext",
    "nodenext",
    "astro",
    "tsconfig",
    "tanstack",
    "hookform",
    "zustand",
    "zod",
    "pino",
    "upsert",
    "findmany",
    "findunique",
    "createdAt",
    "updatedAt",
    "deletedAt",
    "userid",
    "roleid",
    "permissionid",
    "Sunil",
    "CUID",
    "corepack",
    "dotenv",
    "middlewares"
  ],
  "ignorePaths": [
    "node_modules",
    "dist",
    "pnpm-lock.yaml",
    "*.min.js",
    "*.min.css",
    "prisma/migrations",
    ".turbo",
    "coverage"
  ],
  "ignoreRegExpList": [
    "/[a-f0-9]{7,40}/g",
    "/[A-Za-z0-9+/=]{40,}/g"
  ]
}
```

- [ ] **Step 3: Add spell-check script to root package.json**

Add to root `package.json` scripts:

```json
"spell-check": "cspell \"**/*.{ts,tsx,md,json}\" --no-progress"
```

- [ ] **Step 4: Run spell check**

```bash
pnpm run spell-check
```

Expected: Runs without crashing. If there are unknown words that are project-specific, add them to the `words` array in `cspell.json`.

- [ ] **Step 5: Commit**

```bash
git add cspell.json package.json pnpm-lock.yaml
git commit -m "feat: add cspell spell checking for the monorepo"
```

---

### Task 5: Quality Check Skill

**Files:**
- Create: `.claude/skills/quality-check/SKILL.md`
- Modify: `docs/skills-and-agents.md` (add quality-check to the list)

- [ ] **Step 1: Create the quality-check skill**

Create `.claude/skills/quality-check/SKILL.md`:

```markdown
---
name: quality-check
description: Pre-push quality checklist. Runs lint, spell check, type checking, build, and tests across the entire monorepo. Use before pushing code, before creating PRs, or to verify the project is in a clean state.
---

# Quality Check

Run the full quality checklist for the monorepo before pushing.

## Checklist

Run each step in order. Stop at the first failure and fix it before continuing.

### Step 1: Lint (all workspaces)

` ``bash
pnpm run lint
` ``

All workspaces must pass with zero errors. Warnings are acceptable but should be reviewed.

### Step 2: Spell Check

` ``bash
pnpm run spell-check
` ``

If unknown words appear, add legitimate project terms to `cspell.json` `words` array. Fix actual typos.

### Step 3: Type Check (all workspaces)

` ``bash
pnpm run type-check
` ``

Zero TypeScript errors allowed.

### Step 4: Build (all workspaces)

` ``bash
pnpm run build
` ``

Both client and server must build cleanly.

### Step 5: Tests (all workspaces)

` ``bash
pnpm run test
` ``

All tests must pass. No skipped tests without a tracking issue.

## Summary

After all steps pass, report:
- Lint: PASS/FAIL (error count)
- Spell Check: PASS/FAIL (unknown words)
- Type Check: PASS/FAIL (error count)
- Build: PASS/FAIL
- Tests: PASS/FAIL (pass/fail/skip counts)

If any step fails, list the specific failures and suggest fixes.
```

- [ ] **Step 2: Update docs/skills-and-agents.md**

Add `quality-check` to the Quality & Verification Skills table:

```markdown
| **quality-check** | `/quality-check` | Pre-push quality checklist: lint, spell check, type-check, build, and tests across all workspaces. Runs sequentially, stops at first failure. |
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/quality-check/SKILL.md docs/skills-and-agents.md
git commit -m "feat: add quality-check skill for pre-push checklist"
```

---

### Task 6: GitHub Actions — CI Workflow (main/develop)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the .github/workflows directory**

```bash
mkdir -p /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy/.github/workflows
```

- [ ] **Step 2: Create ci.yml**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm dependencies
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Spell Check
        run: pnpm run spell-check

      - name: Type Check
        run: pnpm run type-check

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: quality

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm dependencies
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: quality

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm dependencies
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Test
        run: pnpm run test
```

- [ ] **Step 3: Validate YAML syntax**

```bash
cd /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy
cat .github/workflows/ci.yml | head -5
```

Expected: Clean YAML output, no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add CI workflow for main/develop (lint, spell, types, build, test)"
```

---

### Task 7: GitHub Actions — Development Workflow (feature branches)

**Files:**
- Create: `.github/workflows/dev.yml`

- [ ] **Step 1: Create dev.yml**

Create `.github/workflows/dev.yml`:

```yaml
name: Development

on:
  push:
    branches-ignore: [main, develop]
  pull_request:
    branches: [develop]

concurrency:
  group: dev-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quick-check:
    name: Quick Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm dependencies
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Type Check
        run: pnpm run type-check

      - name: Test
        run: pnpm run test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/dev.yml
git commit -m "feat: add development workflow for feature branches"
```

---

### Task 8: GitHub Actions — Deploy Workflow (QA/STG/PROD with release tags)

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy.yml**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - qa
          - staging
          - production
      commit_id:
        description: "Commit SHA to deploy"
        required: true
        type: string

concurrency:
  group: deploy-${{ github.event.inputs.environment }}
  cancel-in-progress: false

jobs:
  validate:
    name: Validate Commit
    runs-on: ubuntu-latest
    outputs:
      is_main: ${{ steps.check.outputs.is_main }}
      short_sha: ${{ steps.check.outputs.short_sha }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Validate commit exists
        id: check
        run: |
          COMMIT="${{ github.event.inputs.commit_id }}"

          if ! git cat-file -e "$COMMIT" 2>/dev/null; then
            echo "::error::Commit $COMMIT does not exist in this repository"
            exit 1
          fi

          SHORT_SHA=$(git rev-parse --short "$COMMIT")
          echo "short_sha=$SHORT_SHA" >> "$GITHUB_OUTPUT"

          # Check if commit is on main branch
          if git merge-base --is-ancestor "$COMMIT" origin/main 2>/dev/null; then
            echo "is_main=true" >> "$GITHUB_OUTPUT"
          else
            echo "is_main=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Block non-main commits from production
        if: github.event.inputs.environment == 'production' && steps.check.outputs.is_main != 'true'
        run: |
          echo "::error::Production deployments require a commit from the main branch"
          exit 1

  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    needs: validate

    steps:
      - name: Checkout at commit
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.commit_id }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Get pnpm store directory
        shell: bash
        run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Cache pnpm dependencies
        uses: actions/cache@v4
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: ${{ runner.os }}-pnpm-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint

      - name: Spell Check
        run: pnpm run spell-check

      - name: Type Check
        run: pnpm run type-check

      - name: Build
        run: pnpm run build

      - name: Test
        run: pnpm run test

  deploy:
    name: Deploy to ${{ github.event.inputs.environment }}
    runs-on: ubuntu-latest
    needs: [validate, quality]
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout at commit
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.commit_id }}

      - name: Deploy info
        run: |
          echo "## Deployment Summary" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Field | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|-------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| **Environment** | \`${{ github.event.inputs.environment }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| **Commit** | \`${{ github.event.inputs.commit_id }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| **Short SHA** | \`${{ needs.validate.outputs.short_sha }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| **From main** | ${{ needs.validate.outputs.is_main }} |" >> $GITHUB_STEP_SUMMARY
          echo "| **Triggered by** | @${{ github.actor }} |" >> $GITHUB_STEP_SUMMARY

      # ---------------------------------------------------------------
      # TODO: Add actual deployment steps here per environment.
      # Examples:
      #   qa:         Deploy to QA environment (e.g., Render preview)
      #   staging:    Deploy to staging environment
      #   production: Deploy to Netlify (client) + Render (server)
      #
      # For now this job validates, runs quality gates, and tags.
      # Wire up actual deploy commands when environments are ready.
      # ---------------------------------------------------------------

      - name: Placeholder — deploy
        run: |
          echo "Deploying commit ${{ needs.validate.outputs.short_sha }} to ${{ github.event.inputs.environment }}"
          echo "TODO: Add deployment commands for ${{ github.event.inputs.environment }}"

  release-tag:
    name: Create Release Tag
    runs-on: ubuntu-latest
    needs: [validate, deploy]
    if: github.event.inputs.environment == 'production' && needs.validate.outputs.is_main == 'true'

    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate release tag
        id: tag
        run: |
          # Get current date for tag
          DATE=$(date +%Y%m%d)
          SHORT_SHA="${{ needs.validate.outputs.short_sha }}"

          # Find the next sequence number for today
          EXISTING=$(git tag -l "v${DATE}.*" | sort -V | tail -1)
          if [ -z "$EXISTING" ]; then
            SEQ=1
          else
            LAST_SEQ=$(echo "$EXISTING" | sed "s/v${DATE}\.//")
            SEQ=$((LAST_SEQ + 1))
          fi

          TAG="v${DATE}.${SEQ}"
          echo "tag=$TAG" >> "$GITHUB_OUTPUT"
          echo "Generated release tag: $TAG"

      - name: Create and push tag
        run: |
          git tag -a "${{ steps.tag.outputs.tag }}" \
            "${{ github.event.inputs.commit_id }}" \
            -m "Production release ${{ steps.tag.outputs.tag }} (commit ${{ needs.validate.outputs.short_sha }})"
          git push origin "${{ steps.tag.outputs.tag }}"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.tag.outputs.tag }}
          name: Release ${{ steps.tag.outputs.tag }}
          body: |
            ## Production Deployment

            | Field | Value |
            |-------|-------|
            | **Commit** | `${{ github.event.inputs.commit_id }}` |
            | **Deployed by** | @${{ github.actor }} |
            | **Date** | ${{ steps.tag.outputs.tag }} |

          generate_release_notes: true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add deploy workflow with QA/STG/PROD and release tags"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `docs/architecture.md` (add CI/CD section, update folder structure)
- Modify: `docs/skills-and-agents.md` (already partially done in Task 5)

- [ ] **Step 1: Add CI/CD section to architecture.md**

Add after the existing Deployment section (or at the end if no Deployment section exists) in `docs/architecture.md`:

```markdown
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
| **Production** | Manual — main only | Must be on `main` | Yes — `vYYYYMMDD.N` |

### Release Tags

Production deployments from `main` automatically create:
- Git tag: `vYYYYMMDD.N` (e.g., `v20260331.1`)
- GitHub Release with auto-generated release notes

### Quality Gate (all workflows)

1. **Lint** — ESLint across all workspaces (`pnpm run lint`)
2. **Spell Check** — cspell across TS/MD/JSON files (`pnpm run spell-check`)
3. **Type Check** — TypeScript strict mode (`pnpm run type-check`)
4. **Build** — Client (Vite) + Server (tsc) (`pnpm run build`)
5. **Tests** — Vitest across all workspaces (`pnpm run test`)
```

- [ ] **Step 2: Add .github to the folder structure in architecture.md**

In the folder structure section, add before the `client/` entry:

```
├── .github/
│   └── workflows/
│       ├── ci.yml                   # CI: push/PR to main/develop
│       ├── dev.yml                  # Dev: feature branch checks
│       └── deploy.yml               # Deploy: manual QA/STG/PROD
│
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add CI/CD pipeline and workflows to architecture docs"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run the full quality checklist locally**

```bash
cd /Users/sunil.b.kumar.m/Desktop/claude-bootcamp/personal-dairy/ai-personal-dairy
pnpm run lint
pnpm run spell-check
pnpm run type-check
pnpm run build
pnpm run test
```

All five must pass.

- [ ] **Step 2: Verify all new files exist**

```bash
ls -la .github/workflows/ci.yml .github/workflows/dev.yml .github/workflows/deploy.yml
ls -la client/eslint.config.js server/eslint.config.js shared/eslint.config.js
ls -la cspell.json
ls -la .claude/skills/quality-check/SKILL.md
```

- [ ] **Step 3: Review git log**

```bash
git log --oneline -10
```

Expected: ~8 commits covering ESLint configs, cspell, quality skill, CI workflow, dev workflow, deploy workflow, and docs.
