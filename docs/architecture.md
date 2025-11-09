# Architecture

## Executive Summary

Perrache is an enterprise API catalog platform built as a Turborepo monorepo with a Fastify backend and Next.js frontend. The architecture prioritizes simplicity, type safety, and RESTful API design to support webhook-driven spec ingestion, semantic search, and breaking change detection. The system uses shared TypeScript types across the monorepo, PostgreSQL with pgvector for semantic similarity search, and a dual-embedding strategy for accurate API discovery.

## Project Initialization

**First Implementation Story:**

```bash
# Step 1: Create Turborepo monorepo
npx create-turbo@latest perrache
cd perrache

# Step 2: Add Fastify API app
cd apps
npx fastify-cli generate api --lang typescript

# Step 3: Add Next.js web app
npx create-next-app@latest web --typescript --tailwind --app --src-dir

# Step 4: Create shared packages
cd ../packages
mkdir -p types config embedding
```

This establishes the base monorepo structure with TypeScript, ESLint, Prettier, and hot reload for both applications.

## Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
| -------- | -------- | ------- | ------------- | --------- |
| **Monorepo Tool** | Turborepo | Latest | All | Build orchestration, type sharing, parallel task execution |
| **Package Manager** | pnpm | Latest | All | Fast, efficient, Turborepo default |
| **Backend Framework** | Fastify | Latest | API Ingestion, Search, Breaking Changes | Fast, TypeScript-first, low overhead, plugin ecosystem |
| **Frontend Framework** | Next.js 15 | 15.x (App Router) | Catalog UI, Search Interface | Modern React, SSR, App Router, TypeScript support |
| **Language** | TypeScript | Latest (5.x) | All | Type safety across entire stack, shared types via Turborepo |
| **Frontend-Backend Communication** | REST API + Shared Types | N/A | All | RESTful for public webhooks, type safety via `@perrache/types` package |
| **Styling** | Tailwind CSS | Latest (4.x) | Frontend | Utility-first, developer-friendly, dark mode support |
| **API Documentation** | @fastify/swagger | Latest | API | Auto-generated OpenAPI spec, Perrache catalogs itself |
| **Linting** | ESLint | Latest | All | Code quality (shared config in `@perrache/config`) |
| **Formatting** | Prettier | Latest | All | Code consistency (shared config in `@perrache/config`) |
| **Database** | PostgreSQL + pgvector | 15+ | API Backend | Vector similarity search for semantic discovery |
| **Database (Dev)** | Docker Compose PostgreSQL | Latest | Local Development | Consistent local dev environment |
| **Database (Prod)** | AWS RDS PostgreSQL | 15+ | Production | Managed scaling, backups, enterprise-grade reliability |
| **ORM** | Prisma | Latest | API Backend | TypeScript-first, migrations, pgvector extension support |
| **Embedding Provider** | OpenAI text-embedding-3-small | API | Semantic Search | Best quality/cost ratio, 1536 dimensions, provider-agnostic interface |
| **Embedding Abstraction** | @perrache/embedding package | N/A | API Backend | Unified interface across OpenAI/Cohere/Ollama providers |
| **Breaking Change Detection** | @pb33f/openapi-changes | Latest | Change Detection | Adapter pattern for future library swaps, async queue execution |
| **Queue System** | pg-boss | Latest | Async Processing | PostgreSQL-based job queue, no extra infrastructure, decoupled actions |
| **Email Provider** | Resend | Latest | Notifications | Modern API, great DX, breaking change alerts to service owners |

## Project Structure

```
perrache/
├── apps/
│   ├── api/                          # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/               # API route handlers
│   │   │   │   ├── specs/            # POST /api/v1/specs/*
│   │   │   │   ├── search/           # GET /api/v1/search
│   │   │   │   ├── subscriptions/    # Subscription endpoints
│   │   │   │   └── changes/          # Breaking change endpoints
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── embedding.service.ts
│   │   │   │   ├── search.service.ts
│   │   │   │   └── change-detection.service.ts
│   │   │   ├── queue/                # pg-boss setup
│   │   │   │   ├── boss.ts
│   │   │   │   └── workers/
│   │   │   │       ├── embeddings.worker.ts
│   │   │   │       ├── change-detection.worker.ts
│   │   │   │       └── email.worker.ts
│   │   │   ├── plugins/              # Fastify plugins
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── swagger.ts
│   │   │   │   └── rate-limit.ts
│   │   │   ├── schemas/              # TypeBox schemas
│   │   │   ├── app.ts                # Fastify app setup
│   │   │   └── server.ts             # Server entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Next.js frontend
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── (routes)/         # UI pages
│       │   │   │   ├── page.tsx      # Homepage (search)
│       │   │   │   ├── catalog/      # API catalog browser
│       │   │   │   ├── api/          # API detail pages
│       │   │   │   └── changes/      # Breaking change dashboard
│       │   │   ├── layout.tsx
│       │   │   └── globals.css
│       │   ├── components/           # React components
│       │   │   ├── search/
│       │   │   ├── catalog/
│       │   │   └── ui/               # shadcn/ui components
│       │   └── lib/                  # Client utilities
│       │       ├── api-client.ts     # API fetch functions
│       │       └── utils.ts
│       ├── public/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api.ts                # API request/response types
│   │   │   ├── spec.ts               # OpenAPI spec types
│   │   │   ├── embedding.ts          # Embedding types
│   │   │   ├── change.ts             # Change detection types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── embedding/                    # Embedding provider abstraction
│   │   ├── src/
│   │   │   ├── provider.ts           # Interface
│   │   │   ├── providers/
│   │   │   │   ├── openai.ts
│   │   │   │   ├── ollama.ts
│   │   │   │   └── cohere.ts
│   │   │   ├── factory.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── change-detection/             # Change detection abstraction
│   │   ├── src/
│   │   │   ├── detector.ts           # Interface
│   │   │   ├── adapters/
│   │   │   │   ├── pb33f.ts
│   │   │   │   └── custom.ts
│   │   │   ├── factory.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                       # Shared configs
│       ├── eslint/
│       ├── typescript/
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml            # Local dev PostgreSQL + pgvector
│   └── Dockerfile.api                # API production image
│
├── turbo.json                        # Turborepo pipeline config
├── pnpm-workspace.yaml               # pnpm workspace config
├── package.json                      # Root package.json
├── .env.example                      # Environment template
└── README.md
```

## Epic to Architecture Mapping

{{epic_mapping_table}}

## Technology Stack Details

### Core Technologies

{{core_stack_details}}

### Integration Points

{{integration_details}}

{{novel_pattern_designs_section}}

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

{{implementation_patterns}}

## Consistency Rules

### Naming Conventions

{{naming_conventions}}

### Code Organization

{{code_organization_patterns}}

### Error Handling

{{error_handling_approach}}

### Logging Strategy

{{logging_approach}}

## Data Architecture

{{data_models_and_relationships}}

## API Contracts

{{api_specifications}}

## Security Architecture

{{security_approach}}

## Performance Considerations

{{performance_strategies}}

## Deployment Architecture

{{deployment_approach}}

## Development Environment

### Prerequisites

{{development_prerequisites}}

### Setup Commands

```bash
{{setup_commands}}
```

## Architecture Decision Records (ADRs)

{{key_architecture_decisions}}

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: {{date}}_
_For: {{user_name}}_
