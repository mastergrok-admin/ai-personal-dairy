# Skills & Agents

Claude Code automation configured for the AI Personal Diary project. Skills are reusable prompts invoked manually or automatically; agents are specialized subprocesses for parallel or complex work.

## Table of Contents

- [Skills](#skills)
  - [Scaffolding Skills](#scaffolding-skills)
  - [Quality & Verification Skills](#quality--verification-skills)
  - [Design & UX Skills](#design--ux-skills)
  - [Coordination Skills](#coordination-skills)
- [Agents](#agents)
  - [Core Development](#core-development)
  - [Testing & Quality](#testing--quality)
  - [Infrastructure & Ops](#infrastructure--ops)
  - [Documentation & Design](#documentation--design)
  - [Data & ML](#data--ml)
- [How Skills Work](#how-skills-work)
- [How Agents Work](#how-agents-work)

---

## Skills

Skills live in `.claude/skills/<name>/SKILL.md`. They are invoked with `/skill-name` or automatically by Claude when the user's request matches the skill description.

### Scaffolding Skills

| Skill | Command | What It Does |
|-------|---------|-------------|
| **add-api** | `/add-api <resource> [--protected] [--permission <name>] [--model]` | Scaffolds a complete API endpoint: route, controller, service, Zod validation, test file. Optionally creates a Prisma model and wires up auth middleware. |
| **add-page** | `/add-page <name> [--route <path>] [--protected] [--permission <name>]` | Scaffolds a React page component, adds the route to `App.tsx`, and adds a navigation link to `Header.tsx`. Optionally wraps with `ProtectedRoute`. |

**When they trigger automatically:** When you ask Claude to "add a new API endpoint", "create a page", or similar requests that match the skill descriptions.

### Quality & Verification Skills

| Skill | Command | What It Does |
|-------|---------|-------------|
| **doc-check** | `/doc-check` | Verifies `architecture.md`, `deployment.md`, `adding-features.md`, and `README.md` are in sync with actual code. Checks for undocumented endpoints, models, env vars, and routes. |
| **deploy-check** | `/deploy-check` | Pre-deployment readiness check: build, TypeScript, tests, env config, Prisma schema, deploy configs (Netlify/Render), and security review. |

**When they trigger automatically:** When completing a feature (doc-check), or when discussing deployment readiness (deploy-check).

### Design & UX Skills

| Skill | Command | What It Does | Allowed Tools |
|-------|---------|-------------|---------------|
| **design-system** | `/design-system` | Dual-palette design system: Tableau-inspired brand colors for UI, colorblind-friendly data colors for visualizations. Component patterns, spacing, shadows, typography. | Read, Grep, Glob |
| **style-guide** | `/style-guide` | Visual design philosophy and brand principles. Tableau-inspired professionalism, data-first clarity, generous spacing, dual-layer shadows. Complements design-system. | Read, Grep |
| **ux-writing** | `/ux-writing` | Voice, tone, and messaging standards. Microcopy, error messages, success states, data presentation language. Professional-yet-accessible voice. | Read |
| **dashboard-patterns** | `/dashboard-patterns` | Reusable React/JS patterns for dashboards: Chart.js integration, data cards, filters, responsive layouts. | Read, Grep |
| **accessibility-checklist** | `/accessibility-checklist` | WCAG AA checklist: keyboard navigation, screen readers, color contrast, ARIA labels, testing procedures. | Read |

**When they trigger automatically:** When working on styling/CSS (design-system, style-guide), user-facing text (ux-writing), dashboard components (dashboard-patterns), or accessibility (accessibility-checklist).

### Coordination Skills

| Skill | Command | What It Does | Allowed Tools |
|-------|---------|-------------|---------------|
| **agent-coordination** | `/agent-coordination` | Protocol for orchestrating multiple agents: registry management, sequencing patterns, handoff protocols, institutional memory. Must be explicitly invoked. | Read, Write, Edit, Grep, Glob, Bash, TodoWrite |

**When it triggers:** Manual invocation only (`/agent-coordination`). Does not auto-trigger.

---

## Agents

Agents live in `.claude/agents/<name>.md`. They are specialized subprocesses spawned by the main Claude Code agent to handle specific types of work. All agents run on the `sonnet` model.

### Core Development

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| **backend-engineer** | Implement backend APIs, database operations, server-side integrations. REST/GraphQL APIs, database schemas, auth, external service integration. | Read, Write, Edit, Bash, WebFetch |
| **frontend-engineer** | Build advanced UI components, optimize React performance, handle state management, responsive design, WCAG AA accessibility. | Read, Write, Edit, Bash, Playwright |
| **debugger** | Investigate complex bugs via root cause analysis. Reproduce issues, trace execution, analyze logs/stack traces. | Read, Write, Edit, Bash, KillShell |
| **git-specialist** | Advanced Git operations: rebase, cherry-pick, bisect, merge conflict resolution, history cleanup, branching strategies. | Read, Write, Edit, Bash |

### Testing & Quality

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| **test-runner** | Execute test suites (unit, integration, e2e), identify flaky tests, generate coverage reports, analyze failures. | Read, Write, Bash, KillShell |
| **qa-engineer** | Design test strategies, create test cases, define acceptance criteria, plan manual/automated testing, cover edge cases. | Read, Write, Edit, Bash |
| **code-reviewer** | Code reviews: correctness, security (OWASP top 10), performance, maintainability. PR review and refactoring validation. | Read, Write, Edit, Bash |

### Infrastructure & Ops

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| **devops-engineer** | CI/CD pipelines, Docker/K8s, monitoring, deployment strategies (blue-green, canary, rolling), infrastructure as code. | Read, Write, Edit, Bash, WebFetch |
| **system-architect** | Architecture specs, API contracts, data schemas, ADRs, non-functional requirements, deployment architecture. | Read, Write, Edit, Bash |
| **pipeline-orchestrator** | ETL/ELT pipelines, ML workflow orchestration, quality checkpoints, error handling, incremental processing. | Read, Write, Edit, Bash |

### Documentation & Design

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| **documentation-writer** | Technical docs: READMEs, model cards, data cards, ADRs, user guides, troubleshooting guides. | Read, Write, Edit, Bash, WebFetch |
| **webdev-documentation-writer** | Web dev docs: React/Vue components, REST/GraphQL APIs, integration guides, design system usage, interactive examples. | Read, Write, Edit, Bash, WebFetch |
| **ux-ui-designer** | Design reviews with Playwright, UX strategy, design system patterns, accessibility audits, interaction testing. | Read, Write, Edit, Bash, Playwright (full) |
| **ux-writer** | User-facing content: microcopy, error messages, empty states, success messages, consistent voice and tone. | Read, Write, Edit, Grep, Glob |

### Data & ML

| Agent | Purpose | Key Tools |
|-------|---------|-----------|
| **data-analyst** | Exploratory data analysis, statistical summaries, pattern identification, visualizations, preprocessing recommendations. | Read, Write, Edit, Bash, NotebookEdit |
| **data-collector** | Web scraping, API integration, auth/rate limiting, incremental collection, error handling for data acquisition. | Read, Write, Edit, Bash, WebFetch |
| **data-preprocessor** | Data cleaning, transformation, feature engineering, train/val/test splits, reproducible preprocessing without data leakage. | Read, Write, Edit, Bash, NotebookEdit |

---

## How Skills Work

Skills are markdown files that provide Claude with structured instructions for specific tasks.

### Invocation Methods

1. **Explicit** — Type `/skill-name` in the prompt (e.g., `/add-api entries --protected`)
2. **Automatic** — Claude reads the skill's `description` field and invokes it when your request matches

### Skill File Structure

```
.claude/skills/<name>/SKILL.md
```

Each skill has YAML frontmatter:

```yaml
---
name: skill-name
description: When to use this skill. Claude matches user intent against this.
allowed-tools: Read, Grep  # Optional: restricts which tools the skill can use
---

# Skill Content
Instructions, templates, conventions...
```

### Adding a New Skill

1. Create `.claude/skills/<name>/SKILL.md` with frontmatter and instructions
2. The skill appears automatically in the skills list
3. Update this documentation page

---

## How Agents Work

Agents are specialized subprocesses that Claude spawns for complex or parallelizable work. They run independently with their own context window.

### Agent File Structure

```
.claude/agents/<name>.md
```

Each agent has YAML frontmatter:

```yaml
---
name: agent-name
description: What this agent specializes in.
model: sonnet
tools: Read, Write, Edit, Grep, Glob, Bash
---

# Agent Instructions
Role definition, methodology, output format...
```

### When Agents Are Used

- **Parallel work** — Multiple independent tasks (e.g., backend + frontend simultaneously)
- **Specialized expertise** — Tasks matching an agent's domain (e.g., `debugger` for bug investigation)
- **Context isolation** — Heavy research that would clutter the main conversation

### Adding a New Agent

1. Create `.claude/agents/<name>.md` with frontmatter and instructions
2. The agent becomes available to Claude automatically
3. Update this documentation page

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.claude/settings.json` | Hooks (e.g., Stop hook for doc verification) |
| `.claude/settings.local.json` | Local permissions (allowed Bash commands, skills) |
| `.claude/skills/<name>/SKILL.md` | Skill definitions |
| `.claude/agents/<name>.md` | Agent definitions |
