# Story 1.1: Project Setup & Repository Structure

**Epic:** Epic 1 - Foundation & Infrastructure  
**Story ID:** 1.1  
**Story Key:** 1-1-project-setup-repository-structure  
**Created:** 2025-11-10  
**Status:** ready-for-dev

---

## Story

As a **developer**,  
I want **the project initialized with Turborepo monorepo structure, TypeScript configuration, and development tooling**,  
So that **the team has a consistent development environment with proper code quality standards**.

---

## Acceptance Criteria

**Given** a new greenfield project  
**When** the repository is initialized  
**Then** the following structure exists:

- ✅ Turborepo monorepo with pnpm workspaces
- ✅ `/apps/api` (Fastify backend) workspace
- ✅ `/apps/web` (Next.js frontend) workspace
- ✅ `/packages/types` (Shared TypeScript types) workspace
- ✅ `/packages/config` (Shared ESLint/Prettier config) workspace
- ✅ TypeScript 5.x configured for all workspaces with strict mode
- ✅ ESLint + Prettier configured with consistent code style rules
- ✅ `turbo.json` configured with build pipeline
- ✅ Root `package.json` with workspace scripts (dev, build, test, lint)
- ✅ `.gitignore` configured for Node.js/Turborepo projects
- ✅ `.nvmrc` specifying Node.js 20+ LTS
- ✅ README.md with project overview and quick start instructions
- ✅ `.env.example` file documenting required environment variables

**And** developers can run `pnpm install` successfully

**And** developers can run `pnpm dev` to start both frontend and backend

**And** ESLint + Prettier auto-formatting works in the development workflow

**And** Pre-commit hooks (via husky) enforce linting and formatting

---

## Prerequisites

**None** (first story in the project - greenfield initialization)

---

## Technical Notes

### Architecture Reference

Per `docs/architecture.md`:
- **Monorepo Tool:** Turborepo (latest)
- **Package Manager:** pnpm (fast, efficient, Turborepo default)
- **Language:** TypeScript 5.x (strict mode enabled)
- **Linting:** ESLint (shared config in `@perrache/config`)
- **Formatting:** Prettier (shared config in `@perrache/config`)

### Project Initialization Command

```bash
npx create-turbo@latest perrache
cd perrache
```

### Workspace Structure

```
perrache/
├── apps/
│   ├── api/          # Fastify backend (TypeScript)
│   └── web/          # Next.js frontend (TypeScript, App Router)
├── packages/
│   ├── types/        # @perrache/types - Shared TypeScript types
│   └── config/       # @perrache/config - Shared ESLint/Prettier config
├── turbo.json        # Turborepo pipeline configuration
├── pnpm-workspace.yaml
├── package.json      # Root package.json
├── .nvmrc            # Node.js 20+ LTS
├── .gitignore
├── .env.example
└── README.md
```

### Key Configuration Files

**turbo.json:**
- Define build pipeline: `dev`, `build`, `test`, `lint`
- Configure caching strategy for fast builds
- Enable parallel task execution

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json scripts:**
```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\""
  }
}
```

### TypeScript Configuration

- **Strict mode enabled** across all workspaces
- Shared base `tsconfig.json` in root
- Per-workspace `tsconfig.json` extending base
- Path aliases configured for clean imports

### Code Quality

- **ESLint:** TypeScript-aware rules, React rules for frontend
- **Prettier:** Consistent formatting (single quotes, 2-space indent, no semicolons per user rules)
- **Husky:** Pre-commit hooks for `lint-staged` (format + lint before commit)
- **lint-staged:** Only check/format changed files for speed

### Node.js Version

- **Node.js 20 LTS** specified in `.nvmrc`
- Document in README: "Use Node.js 20+ LTS (recommended: use `nvm` or `fnm`)"

### README.md Content

Should include:
- Project overview (1-2 sentences about Perrache)
- Prerequisites (Node.js 20+, pnpm)
- Quick start (`pnpm install`, `pnpm dev`)
- Project structure overview
- Available scripts
- Environment variables (reference `.env.example`)
- Link to architecture document

---

## Tasks/Subtasks

### Task 1: Initialize Turborepo Monorepo
- [ ] Run `npx create-turbo@latest perrache` with pnpm as package manager
- [ ] Verify `turbo.json`, `pnpm-workspace.yaml`, and root `package.json` created
- [ ] Install dependencies with `pnpm install`

### Task 2: Configure Turborepo Pipeline
- [ ] Update `turbo.json` with correct pipeline tasks (dev, build, test, lint)
- [ ] Configure caching strategy for optimal build performance
- [ ] Test pipeline execution with `pnpm dev` (should run without errors, even with placeholder apps)

### Task 3: Setup Shared Packages
- [ ] Create `/packages/types` workspace for shared TypeScript types
- [ ] Create `/packages/config` workspace for shared ESLint/Prettier config
- [ ] Configure `package.json` for each shared package
- [ ] Add basic `index.ts` exports for each package

### Task 4: Configure TypeScript
- [ ] Create root `tsconfig.json` with strict mode enabled
- [ ] Configure workspace-specific `tsconfig.json` files extending root
- [ ] Verify TypeScript compilation works across all workspaces
- [ ] Configure path aliases if needed

### Task 5: Setup ESLint + Prettier
- [ ] Install ESLint + Prettier dependencies in `@perrache/config`
- [ ] Create shared ESLint config (TypeScript-aware, React rules for frontend)
- [ ] Create shared Prettier config (single quotes, 2-space indent, no semicolons)
- [ ] Add `.eslintrc.js` and `.prettierrc` in root
- [ ] Test: Run `pnpm lint` successfully

### Task 6: Configure Pre-commit Hooks
- [ ] Install husky and lint-staged
- [ ] Configure husky pre-commit hook
- [ ] Configure lint-staged to run ESLint + Prettier on staged files
- [ ] Test: Make a commit and verify hooks run

### Task 7: Add Project Files
- [ ] Create `.nvmrc` with Node.js 20 LTS version
- [ ] Create `.gitignore` (Node.js, Turborepo, IDE files)
- [ ] Create `.env.example` documenting required environment variables
- [ ] Create comprehensive README.md with quick start instructions

### Task 8: Validation & Documentation
- [ ] Verify `pnpm install` works without errors
- [ ] Verify `pnpm dev` starts all apps (even if placeholder)
- [ ] Verify `pnpm lint` runs successfully
- [ ] Verify pre-commit hooks work
- [ ] Document any setup instructions or gotchas in README

---

## Dev Notes

### Critical Considerations

⚠️ **GREENFIELD PROJECT:** This is the **first story** - it creates the entire foundation. No existing code.

⚠️ **TURBOREPO REQUIRED:** Per ADR-001 in `docs/architecture.md`, must use Turborepo (not just npm/pnpm workspaces). This enables:
- Type sharing via `@perrache/types` package (critical for dual-embedding implementation)
- Shared configuration (`@perrache/config`)
- Efficient build caching and parallel execution

⚠️ **USER CODING STANDARDS:** Per user rules:
- Use Standard.js style: **no semicolons**, single quotes, 2-space indent
- Functional and declarative patterns (avoid classes)
- TypeScript strict mode

⚠️ **ARCHITECTURE ALIGNMENT:** Follow `docs/architecture.md` "Project Initialization" section exactly.

### Success Metrics

- ✅ `pnpm install` completes without errors
- ✅ `pnpm dev` starts both frontend and backend (even if placeholder)
- ✅ `pnpm lint` passes with no errors
- ✅ Pre-commit hooks run automatically on `git commit`
- ✅ TypeScript compilation works across all workspaces
- ✅ README.md provides clear quick start instructions

### Known Challenges

1. **Turborepo Configuration:** Ensure `turbo.json` pipeline correctly defines task dependencies
2. **Workspace Dependencies:** Shared packages (`@perrache/types`, `@perrache/config`) must be correctly referenced in workspace `package.json` files
3. **Path Resolution:** TypeScript path aliases may need configuration for clean imports

---

## Dev Agent Record

### Debug Log

_This section will be populated during implementation with notes about decisions, challenges, and resolutions._

### Completion Notes

_This section will be populated when the story is complete, summarizing what was implemented and any follow-up items._

---

## File List

_This section will be updated during implementation to track all files created or modified._

**Files Created:**
- (To be populated during implementation)

**Files Modified:**
- (To be populated during implementation)

---

## Change Log

- **2025-11-10:** Story created, marked ready-for-dev (auto-created for immediate development)

---

## Status

**Current Status:** ready-for-dev  
**Sprint:** Epic 1 - Foundation & Infrastructure  
**Assigned To:** Dev Agent (AI)  
**Story Points:** 3 (Foundation story - setup intensive)


