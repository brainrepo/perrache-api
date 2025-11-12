# Story 1.4: Next.js Frontend Application Setup

**Epic:** Epic 1 - Foundation & Infrastructure
**Story ID:** 1.4
**Story Key:** 1-4-nextjs-frontend-application-setup
**Created:** 2025-11-11
**Status:** drafted

---

## Story

As a **frontend developer**,
I want **Next.js application configured with TypeScript, Tailwind CSS, and API client setup**,
So that **we have a modern, type-safe frontend foundation**.

---

## Acceptance Criteria

**Given** the backend API server is running
**When** the frontend application is initialized
**Then** Next.js 14+ app directory structure is configured

**And** TypeScript is enabled with strict mode

**And** Tailwind CSS is installed and configured with dark mode support

**And** API client library is configured to connect to backend (axios or fetch wrapper)

**And** Environment variable configuration for API base URL (NEXT_PUBLIC_API_URL)

**And** Layout component includes responsive navigation structure

**And** Error boundary components handle runtime errors gracefully

**And** developers can run `pnpm run dev` and see a functional homepage at localhost:3000

**And** API calls to backend health endpoint succeed

---

## Prerequisites

**Story 1.3:** Fastify Backend API Server Setup (✅ Complete)

---

## Technical Notes

### Architecture Reference

Per `docs/architecture.md` and `docs/tech-spec-epic-1.md`:

- **Framework:** Next.js 14+ with App Router (not Pages Router)
- **Language:** TypeScript 5.x with strict mode
- **Styling:** Tailwind CSS 4.x with custom theme configuration
- **Component Library:** shadcn/ui component library for consistent UI components (optional but recommended)
- **State Management:** React Query (TanStack Query) for server state management
- **Environment Variables:** NEXT_PUBLIC_API_URL for backend connection
- **Dark Mode:** Support using next-themes or Tailwind dark mode
- **ESLint:** Configured for React + Next.js best practices

### Project Structure

Per `docs/architecture.md`:

```
apps/web/
├── src/
│   ├── app/                  # App Router
│   │   ├── (routes)/         # UI pages
│   │   │   ├── page.tsx      # Homepage (search)
│   │   │   ├── catalog/      # API catalog browser (future)
│   │   │   ├── api/          # API detail pages (future)
│   │   │   └── changes/      # Breaking change dashboard (future)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/           # React components
│   │   ├── search/
│   │   ├── catalog/
│   │   └── ui/               # shadcn/ui components
│   └── lib/                  # Client utilities
│       ├── api-client.ts     # API fetch functions
│       └── utils.ts
├── public/
├── package.json
└── tsconfig.json
```

### API Client Configuration

**API Client Strategy:**

- Use native `fetch` API with wrapper for type safety
- Import shared types from `@perrache/types` package
- Base URL configurable via `NEXT_PUBLIC_API_URL` environment variable
- Error handling with standardized error response format
- CORS headers validated for localhost:3000

**Example API Client:**

```typescript
// src/lib/api-client.ts
import type { HealthCheckResponse, ErrorResponse } from '@perrache/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    const error: ErrorResponse = await response.json()
    throw new Error(error.error.message)
  }
  return response.json()
}
```

### Tailwind CSS Configuration

**Dark Mode Support:**

- Configure Tailwind with dark mode class strategy
- Use next-themes for theme switching
- Persist theme preference in localStorage
- Respect system preference on first visit

**Example Tailwind Config:**

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom theme colors
      }
    }
  },
  plugins: []
}
```

### Environment Variables

**Required Environment Variables:**

```bash
# .env.local (local development)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Learnings from Previous Story

**From Story 1-3-fastify-backend-api-server-setup (Status: done)**

- **Fastify Server Running**: Backend API available at `http://localhost:3001`
- **Health Check Endpoint**: `GET /health` returns 200 with database status - use this to validate frontend-backend connectivity
- **CORS Configuration**: CORS middleware configured for `http://localhost:3000` origin - frontend calls should work
- **Shared Types Package**: `@perrache/types` package exports `HealthCheckResponse`, `ErrorResponse` types - use for API client type safety
- **Error Response Format**: Standardized error format with `error.code`, `error.message`, `error.details` - handle in API client wrapper
- **Environment Variable Pattern**: Use `.env` files for configuration (backend uses PORT, LOG*LEVEL) - follow same pattern for frontend with `NEXT_PUBLIC*` prefix

**Key Files to Integrate With:**

- `packages/types/src/index.ts` - Shared TypeScript types for API requests/responses
- `apps/api/src/app.ts` - Backend CORS configuration allowing frontend origin
- `apps/api/.env` - Backend environment configuration (PORT=3001)

**Architectural Consistency:**

- Use same monorepo package structure (`apps/web` workspace)
- Import from `@perrache/types` for type safety
- Match error handling patterns from backend
- Coordinate ports: Backend (3001), Frontend (3000)

[Source: stories/1-3-fastify-backend-api-server-setup.md#Dev-Agent-Record]

### Project Structure Alignment

Per `docs/architecture.md`:

**Expected Files for This Story:**

- `apps/web/src/app/layout.tsx` - Root layout with navigation structure
- `apps/web/src/app/page.tsx` - Homepage component
- `apps/web/src/app/globals.css` - Tailwind CSS imports and global styles
- `apps/web/src/lib/api-client.ts` - API fetch wrapper with types
- `apps/web/src/lib/utils.ts` - Utility functions (cn helper for Tailwind)
- `apps/web/src/components/ui/` - shadcn/ui base components (button, card, etc.)
- `apps/web/.env.example` - Environment variable template
- `apps/web/.env.local` - Local environment configuration (not committed)

**Navigation Structure:**

- Header with logo and app title ("Perrache")
- Navigation links (placeholder for future pages: Search, Catalog, Changes)
- Dark mode toggle button
- Responsive design (mobile menu on small screens)

### Success Metrics

- ✅ Frontend starts on port 3000 with `pnpm --filter web dev`
- ✅ Homepage loads without errors (no console errors)
- ✅ Navigation component renders with responsive layout
- ✅ Dark mode toggle works (switches theme)
- ✅ Frontend can call `GET /health` on API and display response
- ✅ API client uses shared types from `@perrache/types`
- ✅ Tailwind CSS styles applied correctly
- ✅ TypeScript strict mode enabled with no compilation errors

---

## Tasks/Subtasks

### Task 1: Next.js Application Setup

- [ ] Create `apps/web` workspace with Next.js 14+ using App Router
  - [ ] Run `pnpm create next-app@latest web --typescript --tailwind --app --src-dir` in apps/ directory
  - [ ] Configure as Turborepo workspace in root `package.json`
  - [ ] Add `@perrache/types` dependency to `apps/web/package.json`
- [ ] Configure TypeScript with strict mode
  - [ ] Enable strict mode in `tsconfig.json`
  - [ ] Configure path aliases: `@/*` → `./src/*`
  - [ ] Verify no TypeScript errors with `pnpm --filter web type-check`
- [ ] Initialize folder structure per architecture.md
  - [ ] Create `src/components/ui/` directory
  - [ ] Create `src/lib/` directory
  - [ ] Create `src/app/(routes)/` directory for future pages

### Task 2: Tailwind CSS Configuration

- [ ] Configure Tailwind CSS with dark mode support
  - [ ] Enable dark mode with class strategy in `tailwind.config.js`
  - [ ] Configure custom color palette (optional)
  - [ ] Set up content paths for Tailwind purging
- [ ] Install next-themes for theme management
  - [ ] Add `next-themes` package
  - [ ] Create theme provider component
  - [ ] Wrap app with ThemeProvider in root layout
- [ ] Create global styles
  - [ ] Set up `src/app/globals.css` with Tailwind imports
  - [ ] Add base styles for light and dark themes
  - [ ] Test dark mode toggle functionality

### Task 3: API Client Library

- [ ] Create API client wrapper with type safety
  - [ ] Create `src/lib/api-client.ts` file
  - [ ] Import types from `@perrache/types`
  - [ ] Implement `getHealth()` function using native fetch
  - [ ] Configure base URL from environment variable
- [ ] Set up environment variables
  - [ ] Create `.env.example` with `NEXT_PUBLIC_API_URL`
  - [ ] Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001`
  - [ ] Add `.env.local` to `.gitignore`
- [ ] Create error handling utilities
  - [ ] Handle network errors gracefully
  - [ ] Parse `ErrorResponse` type from backend
  - [ ] Add retry logic for transient failures (optional)

### Task 4: Layout & Navigation Components

- [ ] Create root layout component
  - [ ] Create `src/app/layout.tsx` with HTML structure
  - [ ] Include metadata (title, description)
  - [ ] Import global styles
  - [ ] Add ThemeProvider wrapper
- [ ] Create navigation header component
  - [ ] Create `src/components/nav-header.tsx`
  - [ ] Add logo and app title
  - [ ] Add navigation links (Search, Catalog, Changes - placeholder)
  - [ ] Add dark mode toggle button
  - [ ] Make responsive (mobile menu)
- [ ] Create error boundary component
  - [ ] Create `src/app/error.tsx` error boundary
  - [ ] Display user-friendly error messages
  - [ ] Include "Reload" button
  - [ ] Log errors to console (future: error tracking service)

### Task 5: Homepage Implementation

- [ ] Create homepage component
  - [ ] Create `src/app/page.tsx`
  - [ ] Add welcome message and app description
  - [ ] Display API health status (call backend)
  - [ ] Show loading state while fetching
- [ ] Test backend API connectivity
  - [ ] Call `getHealth()` from API client
  - [ ] Display health check result
  - [ ] Handle connection errors gracefully
  - [ ] Show database status

### Task 6: shadcn/ui Base Components (Optional)

- [ ] Initialize shadcn/ui
  - [ ] Run `npx shadcn-ui@latest init`
  - [ ] Configure component path to `src/components/ui`
  - [ ] Install base components: button, card
- [ ] Create utility helper
  - [ ] Create `src/lib/utils.ts` with `cn` function
  - [ ] Install `clsx` and `tailwind-merge` dependencies
- [ ] Test shadcn components
  - [ ] Use Button component in navigation
  - [ ] Use Card component for homepage sections

### Task 7: Development Environment

- [ ] Configure package.json scripts
  - [ ] Verify `dev` script starts Next.js on port 3000
  - [ ] Add `build` script for production build
  - [ ] Add `type-check` script for TypeScript validation
- [ ] Update Turborepo configuration
  - [ ] Add `apps/web` to `turbo.json` pipeline
  - [ ] Configure dev task with persistent mode
  - [ ] Ensure proper dependency ordering with API
- [ ] Test hot reload functionality
  - [ ] Verify changes to pages trigger reload
  - [ ] Verify changes to components trigger reload
  - [ ] Verify changes to `@perrache/types` trigger rebuild

### Task 8: Testing & Validation

- [ ] Verify all acceptance criteria
  - [ ] Frontend starts on port 3000
  - [ ] Homepage loads without console errors
  - [ ] Navigation renders with responsive layout
  - [ ] Dark mode toggle switches theme
  - [ ] API health check call succeeds
  - [ ] TypeScript types imported from `@perrache/types`
  - [ ] Tailwind styles applied correctly
- [ ] Test cross-browser compatibility
  - [ ] Test in Chrome/Edge
  - [ ] Test in Firefox
  - [ ] Test in Safari (if available)
- [ ] Test responsive design
  - [ ] Test desktop view (>1024px)
  - [ ] Test tablet view (768px-1024px)
  - [ ] Test mobile view (<768px)
- [ ] Verify CORS configuration
  - [ ] Confirm backend allows frontend origin
  - [ ] Check CORS headers in browser DevTools

---

## Dev Notes

### Critical Considerations

⚠️ **NEXT.JS 14+ APP ROUTER:** Use App Router (not Pages Router) - create routes in `src/app/` directory, not `pages/`

⚠️ **ENVIRONMENT VARIABLES:** Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser - use `NEXT_PUBLIC_API_URL` for API base URL

⚠️ **TYPESCRIPT STRICT MODE:** Enable strict mode from the start to catch type errors early - all imports from `@perrache/types` must be type-safe

⚠️ **CORS VALIDATION:** Backend CORS is configured for `http://localhost:3000` - ensure frontend runs on correct port for API calls to work

⚠️ **DARK MODE:** Configure Tailwind with class strategy (not media query) for manual dark mode toggle - use next-themes for theme persistence

### References

- [Source: docs/architecture.md#Project-Structure]
- [Source: docs/tech-spec-epic-1.md#Services-and-Modules]
- [Source: docs/tech-spec-epic-1.md#Detailed-Design]
- [Source: docs/epics.md#Story-1.4]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
