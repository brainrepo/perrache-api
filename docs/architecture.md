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

| Category                           | Decision                      | Version           | Affects Epics                           | Rationale                                                              |
| ---------------------------------- | ----------------------------- | ----------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| **Monorepo Tool**                  | Turborepo                     | Latest            | All                                     | Build orchestration, type sharing, parallel task execution             |
| **Package Manager**                | pnpm                          | Latest            | All                                     | Fast, efficient, Turborepo default                                     |
| **Backend Framework**              | Fastify                       | Latest            | API Ingestion, Search, Breaking Changes | Fast, TypeScript-first, low overhead, plugin ecosystem                 |
| **Frontend Framework**             | Next.js 15                    | 15.x (App Router) | Catalog UI, Search Interface            | Modern React, SSR, App Router, TypeScript support                      |
| **Language**                       | TypeScript                    | Latest (5.x)      | All                                     | Type safety across entire stack, shared types via Turborepo            |
| **Frontend-Backend Communication** | REST API + Shared Types       | N/A               | All                                     | RESTful for public webhooks, type safety via `@perrache/types` package |
| **Styling**                        | Tailwind CSS                  | Latest (4.x)      | Frontend                                | Utility-first, developer-friendly, dark mode support                   |
| **API Documentation**              | @fastify/swagger              | Latest            | API                                     | Auto-generated OpenAPI spec, Perrache catalogs itself                  |
| **Linting**                        | ESLint                        | Latest            | All                                     | Code quality (shared config in `@perrache/config`)                     |
| **Formatting**                     | Prettier                      | Latest            | All                                     | Code consistency (shared config in `@perrache/config`)                 |
| **Database**                       | PostgreSQL + pgvector         | 15+               | API Backend                             | Vector similarity search for semantic discovery                        |
| **Database (Dev)**                 | Docker Compose PostgreSQL     | Latest            | Local Development                       | Consistent local dev environment                                       |
| **Database (Prod)**                | AWS RDS PostgreSQL            | 15+               | Production                              | Managed scaling, backups, enterprise-grade reliability                 |
| **ORM**                            | Prisma                        | Latest            | API Backend                             | TypeScript-first, migrations, pgvector extension support               |
| **Embedding Provider**             | OpenAI text-embedding-3-small | API               | Semantic Search                         | Best quality/cost ratio, 1536 dimensions, provider-agnostic interface  |
| **Embedding Abstraction**          | @perrache/embedding package   | N/A               | API Backend                             | Unified interface across OpenAI/Cohere/Ollama providers                |
| **Breaking Change Detection**      | @pb33f/openapi-changes        | Latest            | Change Detection                        | Adapter pattern for future library swaps, async queue execution        |
| **Email Provider**                 | Resend                        | Latest            | Notifications                           | Modern API, great DX, breaking change alerts to service owners         |

## Deployment Strategy

### Incremental Frontend Delivery

The frontend application (`apps/web`) can be deployed incrementally as backend APIs become available:

**Minimum Deployment Requirements:**

- **After Epic 1-3 completion:** Full search and discovery UI can be deployed
  - Required APIs: `/api/v1/search`, `/api/v1/apis`, `/api/v1/endpoints/{id}`, `/api/v1/endpoints/{id}/related`
  - Frontend features available: Homepage search, results page, endpoint details, catalog browsing, related endpoints
  - Missing features: Consumer visibility (requires Epic 4), breaking change history (requires Epic 5)

**Progressive Enhancement:**

- **After Epic 4:** Consumer lists appear in endpoint detail pages
- **After Epic 5:** Breaking change indicators and history appear throughout UI
- **After Epic 7:** Governance dashboards become available

**Implementation Notes:**

- Frontend gracefully handles missing data (empty states for consumers, breaking changes)
- API client returns empty arrays for missing Epic 4/5 data
- No conditional rendering logic needed - UI components handle nullable/empty data
- Deployment can proceed as soon as Epic 3 backend APIs are stable

**Why This Works:**
The REST API design with shared TypeScript types (`@perrache/types`) ensures frontend can safely consume backend APIs as they become available. The monorepo structure allows independent deployment of `apps/api` and `apps/web` with separate release cycles.

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

## Novel Architectural Pattern: Dual-Embedding Semantic Discovery

### Pattern Overview

**Purpose:** Enable both domain-object similarity (find APIs with similar data) and API-signature similarity (find APIs with similar contracts) to prevent duplicate builds and improve discovery accuracy.

**Key Innovation:** Generate two embeddings per endpoint to support different discovery use cases:

- **Domain Object Embedding:** Finds functionally similar APIs (same data models, regardless of path naming)
- **Full Endpoint Embedding:** Finds similar API contracts (including descriptions, naming, complete signature)

### Data Model

```prisma
model Api {
  id          String   @id @default(cuid())
  name        String
  version     String
  owner       String
  team        String
  environment String   // Configurable: dev, staging, prod, qa, etc.
  specContent Json     // Full OpenAPI spec
  canonical   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  endpoints   Endpoint[]
  changes     Change[]

  @@index([team, environment])
}

model Endpoint {
  id        String   @id @default(cuid())
  apiId     String
  path      String   // e.g., "/api/v1/users/{id}"
  method    HttpMethod

  // Dual embeddings (pgvector with 1536 dimensions for OpenAI text-embedding-3-small)
  domainObjectEmbedding   Unsupported("vector(1536)")?  // Request + Response schemas only
  fullEndpointEmbedding   Unsupported("vector(1536)")?  // Complete signature + descriptions

  // Metadata for embedding generation
  summary           String?  // OpenAPI summary field
  description       String?  // OpenAPI description field
  operationId       String?  // OpenAPI operationId
  tags              String[] // OpenAPI tags
  requestSchema     Json?    // Flattened request body schema
  responseSchema    Json?    // Flattened response body schema
  parameters        Json?    // Path/query parameters with descriptions
  headers           Json?    // Required headers

  deprecated  Boolean  @default(false)
  createdAt   DateTime @default(now())

  api         Api      @relation(fields: [apiId], references: [id])
  endpointSubscribers EndpointSubscription[]

  @@unique([apiId, path, method])
  @@index([apiId])
}

enum HttpMethod {
  GET
  POST
  PUT
  DELETE
  PATCH
  HEAD
  OPTIONS
}
```

### Embedding Generation Strategy

**Domain Object Embedding (Request + Response Schemas):**

```
Input: Flattened schema attributes only
Example: "user.id user.email user.profile.avatar user.profile.bio[]"
Purpose: Find endpoints working with similar domain objects
```

**Full Endpoint Embedding (Complete API Signature + Descriptions):**

```
Input: Method + Path + Parameters + Headers + Schemas + Summary + Description + Tags
Example: "GET /api/v1/users/{id} Authorization:Bearer id:required
         Get user profile Returns detailed user information including avatar and bio
         user.id user.email user.profile.avatar user.profile.bio[] users profile"
Purpose: Find endpoints with similar overall API contracts and semantics
```

### Implementation

```typescript
// apps/api/src/services/embedding.service.ts

export class EmbeddingService {
  private provider = createEmbeddingProvider()

  async generateDualEmbeddings(endpoint: {
    path: string
    method: string
    summary?: string
    description?: string
    operationId?: string
    tags?: string[]
    requestSchema?: object
    responseSchema?: object
    parameters?: object
    headers?: object
  }) {
    // EMBEDDING 1: Domain Object Only
    const domainText = this.buildDomainObjectText(endpoint)
    const domainEmbedding = await this.provider.generateEmbedding(domainText)

    // EMBEDDING 2: Full Endpoint with Descriptions
    const fullText = this.buildFullEndpointText(endpoint)
    const fullEmbedding = await this.provider.generateEmbedding(fullText)

    return {
      domainObjectEmbedding: domainEmbedding,
      fullEndpointEmbedding: fullEmbedding
    }
  }

  private buildDomainObjectText(endpoint: any): string {
    const parts: string[] = []

    // ONLY schemas - no descriptions, no path/method
    if (endpoint.requestSchema) {
      const flattened = flattenSchema(endpoint.requestSchema)
      parts.push(flattened.flattenedString)
    }

    if (endpoint.responseSchema) {
      const flattened = flattenSchema(endpoint.responseSchema)
      parts.push(flattened.flattenedString)
    }

    return parts.join(' ')
  }

  private buildFullEndpointText(endpoint: any): string {
    const parts: string[] = []

    // 1. Method and path
    parts.push(`${endpoint.method} ${endpoint.path}`)

    // 2. Summary (concise description)
    if (endpoint.summary) {
      parts.push(endpoint.summary)
    }

    // 3. Description (detailed explanation)
    if (endpoint.description) {
      parts.push(endpoint.description)
    }

    // 4. Operation ID (semantic naming)
    if (endpoint.operationId) {
      parts.push(endpoint.operationId)
    }

    // 5. Tags (categorization)
    if (endpoint.tags && endpoint.tags.length > 0) {
      parts.push(endpoint.tags.join(' '))
    }

    // 6. Parameters (with descriptions)
    if (endpoint.parameters) {
      for (const [name, param] of Object.entries(endpoint.parameters as any)) {
        parts.push(name)
        if (param.description) {
          parts.push(param.description)
        }
      }
    }

    // 7. Headers
    if (endpoint.headers) {
      parts.push(Object.keys(endpoint.headers).join(' '))
    }

    // 8. Domain object schemas (from domain embedding)
    parts.push(this.buildDomainObjectText(endpoint))

    return parts.join(' ')
  }
}
```

### Search Strategy with Weighted Scoring

```typescript
// Default weights favor domain object similarity (prevents duplicates)
const DEFAULT_WEIGHTS = {
  domainWeight: 0.6, // 60% - Find similar data models
  fullWeight: 0.4 // 40% - Find similar API signatures
}

// Search with combined scoring
const results = await prisma.$queryRaw`
  SELECT
    e.id,
    e.path,
    e.method,
    e.summary,
    a.name as api_name,
    (
      ${domainWeight} * (1 - (e.domainObjectEmbedding <=> ${queryEmbedding}::vector)) +
      ${fullWeight} * (1 - (e.fullEndpointEmbedding <=> ${queryEmbedding}::vector))
    ) as combined_score
  FROM "Endpoint" e
  JOIN "Api" a ON e."apiId" = a.id
  ORDER BY combined_score DESC
  LIMIT ${limit}
`
```

### pgvector HNSW Indexes

```sql
-- HNSW indexes for <1s search latency (NFR-P1)
CREATE INDEX endpoint_domain_embedding_idx
  ON "Endpoint"
  USING hnsw (domainObjectEmbedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX endpoint_full_embedding_idx
  ON "Endpoint"
  USING hnsw (fullEndpointEmbedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Agent Implementation Rules

**CRITICAL:** AI agents implementing this pattern MUST:

1. **Always generate BOTH embeddings** - Never skip either one
2. **Domain embedding = schemas ONLY** - No descriptions, no path/method
3. **Full embedding = everything** - Method, path, descriptions, tags, parameters, schemas
4. **Use weighted scoring** - Default 60/40 domain/full, configurable via query params
5. **HNSW indexes required** - Must be created during database setup for <1s latency
6. **Environment is string** - Not enum, support any environment name (dev/staging/prod/qa/canary/etc.)

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Conventions

**Database Tables/Models:**

- Singular PascalCase: `Api`, `Endpoint`, `Change`, `EndpointSubscription`
- Prisma auto-generates these from schema

**Database Columns:**

- camelCase: `apiId`, `domainObjectEmbedding`, `createdAt`
- Follow Prisma conventions exactly

**REST API Endpoints:**

- Plural nouns: `/api/v1/specs`, `/api/v1/endpoints`, `/api/v1/subscriptions`
- Resource-oriented, not action-oriented
- Always versioned: `/api/v1/` prefix
- Path parameters: `/api/v1/apis/{id}` (singular resource)

**TypeScript Files:**

- Services: `embedding.service.ts`, `search.service.ts`, `change-detection.service.ts`
- Routes: `specs.route.ts`, `search.route.ts`, `subscriptions.route.ts`
- Workers: `embeddings.worker.ts`, `change-detection.worker.ts`, `email.worker.ts`
- Utilities: `schema-flattener.ts`, `openapi-parser.ts`
- File naming: kebab-case or camelCase.ts
- Export naming: PascalCase for classes, camelCase for functions

**Environment Variables:**

- SCREAMING_SNAKE_CASE: `DATABASE_URL`, `OPENAI_API_KEY`, `EMBEDDING_PROVIDER`, `RESEND_API_KEY`

### Code Organization

**Route Structure:**

```typescript
// apps/api/src/routes/[resource]/index.ts pattern
import { FastifyPluginAsync } from 'fastify'

const resourceRoutes: FastifyPluginAsync = async (fastify) => {
  // Routes here
}

export default resourceRoutes

// Register in app.ts:
fastify.register(searchRoutes, { prefix: '/api/v1/search' })
```

**Service Injection:**

```typescript
// Fastify decorators for services
fastify.decorate('searchService', new SearchService(prisma, embeddingProvider))
fastify.decorate('embeddingService', new EmbeddingService(embeddingProvider))

// Access in routes:
const results = await fastify.searchService.search(query)
```

**Shared Package Imports:**

```typescript
// Always use workspace protocol for internal packages
import type { SearchResult, OpenAPISpec } from '@perrache/types'
import { createEmbeddingProvider } from '@perrache/embedding'
import { createChangeDetector } from '@perrache/change-detection'
```

### API Response Format

**Success Responses:**

```typescript
// Simple data return (no wrapper)
GET /api/v1/search?q=user
Status: 200
Body: SearchResult[]

// Paginated list responses
GET /api/v1/apis?page=1&limit=20
Status: 200
Body: {
  data: Api[],
  meta: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}

// Single resource
GET /api/v1/apis/{id}
Status: 200
Body: Api

// Creation responses
POST /api/v1/specs/openapi
Status: 201
Body: {
  id: string,
  message: string,
  jobId?: string  // If async processing
}
```

**Error Responses:**

```typescript
// All errors follow this structure
Status: 400/401/404/500
Body: {
  error: {
    code: string,        // INVALID_SPEC, UNAUTHORIZED, NOT_FOUND, RATE_LIMIT_EXCEEDED
    message: string,     // Human-readable error message
    details?: object     // Optional validation errors or context
  }
}

// Examples:
{
  error: {
    code: "INVALID_SPEC",
    message: "OpenAPI spec validation failed",
    details: {
      errors: [
        { path: "paths./users", message: "Missing required field" }
      ]
    }
  }
}

{
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded: 100 requests per hour",
    details: {
      limit: 100,
      remaining: 0,
      resetAt: "2025-11-09T15:00:00Z"
    }
  }
}
```

### Error Handling

**Pattern:**

```typescript
// Custom error classes
export class SpecValidationError extends Error {
  constructor(
    message: string,
    public details: object
  ) {
    super(message)
    this.name = 'SpecValidationError'
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// Global error handler (apps/api/src/app.ts)
fastify.setErrorHandler((error, request, reply) => {
  // Log all errors
  fastify.log.error({ error, url: request.url }, 'Request error')

  if (error instanceof SpecValidationError) {
    return reply.status(400).send({
      error: {
        code: 'INVALID_SPEC',
        message: error.message,
        details: error.details
      }
    })
  }

  if (error instanceof RateLimitError) {
    return reply
      .status(429)
      .header('Retry-After', error.retryAfter.toString())
      .send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message
        }
      })
  }

  // Default 500 for unknown errors
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An internal error occurred' : error.message
    }
  })
})
```

### Logging Strategy

**Use Fastify's Pino logger with structured logging:**

```typescript
// Good: Structured logging with context
fastify.log.info({ apiId, specId, endpointCount }, 'Processing spec upload')
fastify.log.error({ error, apiId, jobId }, 'Embedding generation failed')
fastify.log.warn({ apiId, oldVersion, newVersion }, 'Breaking changes detected')

// Bad: String-only logs (no searchability)
fastify.log.info('Processing spec upload')

// Log levels (from most to least severe):
// - error: Failures requiring immediate attention
// - warn: Concerning events that don't block operation
// - info: Normal operational events
// - debug: Detailed debugging information

// Never log sensitive data:
// ❌ API keys, auth tokens, passwords
// ❌ PII (emails in production, unless necessary)
// ❌ Full request bodies (may contain secrets)

// Correlation IDs for request tracing:
fastify.addHook('onRequest', (request, reply, done) => {
  request.id = request.id || randomUUID()
  fastify.log = fastify.log.child({ requestId: request.id })
  done()
})
```

## Data Architecture

### Complete Prisma Schema

```prisma
// apps/api/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// Enable pgvector extension
generator pgvector {
  provider = "prisma-client-extensions"
}

model Api {
  id          String   @id @default(cuid())
  name        String
  version     String
  owner       String   // Email of API owner
  team        String
  environment String   // Configurable: dev, staging, prod, qa, canary, etc.
  specContent Json     // Full OpenAPI spec (for version history)
  canonical   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  endpoints   Endpoint[]
  changes     Change[]

  @@unique([name, version, environment])
  @@index([team, environment])
  @@index([canonical])
}

model Endpoint {
  id        String     @id @default(cuid())
  apiId     String
  path      String     // e.g., "/api/v1/users/{id}"
  method    HttpMethod

  // Dual embeddings for semantic search (pgvector)
  domainObjectEmbedding Unsupported("vector(1536)")?
  fullEndpointEmbedding Unsupported("vector(1536)")?

  // OpenAPI metadata for embedding generation
  summary       String?
  description   String?
  operationId   String?
  tags          String[]
  requestSchema  Json?
  responseSchema Json?
  parameters    Json?
  headers       Json?

  deprecated Boolean  @default(false)
  createdAt  DateTime @default(now())

  api                 Api                    @relation(fields: [apiId], references: [id], onDelete: Cascade)
  endpointSubscribers EndpointSubscription[]

  @@unique([apiId, path, method])
  @@index([apiId])
  @@index([deprecated])
}

model EndpointSubscription {
  id              String   @id @default(cuid())
  endpointId      String
  consumerService String   // Service name that depends on this endpoint
  consumerEmail   String   // Owner email for breaking change notifications
  createdAt       DateTime @default(now())

  endpoint Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@unique([endpointId, consumerService])
  @@index([consumerEmail])
}

model Change {
  id                    String       @id @default(cuid())
  apiId                 String
  fromVersion           String
  toVersion             String
  severity              ChangeSeverity
  breakingChanges       Json[]       // Array of breaking change objects
  potentiallyBreaking   Json[]
  nonBreaking           Json[]
  affectedConsumers     String[]     // Array of consumer service names
  notifiedAt            DateTime?
  createdAt             DateTime     @default(now())

  api Api @relation(fields: [apiId], references: [id], onDelete: Cascade)

  @@index([apiId])
  @@index([severity])
  @@index([createdAt])
}

enum HttpMethod {
  GET
  POST
  PUT
  DELETE
  PATCH
  HEAD
  OPTIONS
}

enum ChangeSeverity {
  BREAKING           // RED - Removed endpoints, removed fields, type changes
  POTENTIALLY_BREAKING  // YELLOW - Behavioral changes, rate limits
  NON_BREAKING      // GREEN - New endpoints, optional fields
}
```

### Data Relationships

```
Api (1) ──────> (N) Endpoint
                     │
                     └──> (N) EndpointSubscription

Api (1) ──────> (N) Change
```

**Key Design Decisions:**

1. **Cascade Deletes:** Deleting an API cascades to Endpoints, Changes, and Subscriptions
2. **Unique Constraints:**
   - `(name, version, environment)` ensures no duplicate API versions per environment
   - `(apiId, path, method)` prevents duplicate endpoints
   - `(endpointId, consumerService)` prevents duplicate subscriptions
3. **Indexes:** Optimized for common queries (team filtering, canonical search, change severity)
4. **pgvector columns:** Marked as `Unsupported("vector(1536)")` until Prisma native support
5. **Json fields:** Store complex data (schemas, changes) for flexibility

## API Contracts

### Core API Endpoints

**Spec Ingestion:**

```
POST /api/v1/specs/openapi
Auth: Bearer token (API key)
Body: { spec: OpenAPISpec, version?: string }
Response: 201 { id, message }

Query params:
  - version: OpenAPI version (3.0 or 3.1, default 3.1)
```

**Search & Discovery:**

```
GET /api/v1/search?q={query}&limit={limit}&threshold={threshold}
Response: 200 SearchResult[]

Query params:
  - q: Search query (required)
  - limit: Results limit (default 20, max 100)
  - threshold: Similarity threshold (default 0.7, range 0-1)
  - domainWeight: Domain embedding weight (default 0.6)
  - fullWeight: Full embedding weight (default 0.4)
```

**Endpoint Details:**

```
GET /api/v1/endpoints/{id}
Response: 200 {
  id, path, method, summary, description,
  api: { name, team, owner },
  consumers: EndpointSubscription[],
  relatedEndpoints: Endpoint[]
}

GET /api/v1/endpoints/{id}/related
Response: 200 Endpoint[]  // Domain-object similarity
```

**Subscriptions:**

```
POST /api/v1/subscriptions/endpoint
Body: { endpointId, consumerService, consumerEmail }
Response: 201 { id, message }

DELETE /api/v1/subscriptions/{id}
Response: 204
```

**Breaking Changes:**

```
GET /api/v1/changes/{apiId}
Response: 200 Change[]

GET /api/v1/changes/{apiId}/latest
Response: 200 Change | null
```

**Catalog Browsing:**

```
GET /api/v1/apis?team={team}&environment={env}&canonical={bool}
Response: 200 {
  data: Api[],
  meta: { page, limit, total, hasMore }
}

GET /api/v1/apis/{id}
Response: 200 Api
```

### OpenAPI Documentation

**Auto-generated via @fastify/swagger:**

```typescript
// apps/api/src/plugins/swagger.ts
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Perrache API',
      description: 'Enterprise API Catalog Platform',
      version: '1.0.0'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.perrache.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
    }
  }
})

fastify.register(swaggerUi, {
  routePrefix: '/documentation'
})

// Access at: http://localhost:3000/documentation
// OpenAPI spec at: http://localhost:3000/documentation/json
```

## Security Architecture

### Authentication & Authorization

**MVP (Phase 1):**

- API key authentication for webhook endpoints
- Bearer token format: `Authorization: Bearer <API_KEY>`
- No user authentication (catalog is publicly readable)

**Phase 2 (Future):**

- OAuth 2.0 / SAML for SSO
- Role-based access control (Viewer, Developer, API Owner, Governance Admin)
- Namespace-based visibility (team boundaries)

### API Key Management

```typescript
// apps/api/src/services/api-key.service.ts
import { randomBytes, createHash } from 'crypto'

export class ApiKeyService {
  // Generate new API key
  async createApiKey(userId: string, name: string): Promise<{ key: string; id: string }> {
    const key = randomBytes(32).toString('base64url') // Cryptographically strong
    const hash = createHash('sha256').update(key).digest('hex') // Store hash, not key

    const apiKey = await prisma.apiKey.create({
      data: {
        id: cuid(),
        userId,
        name,
        keyHash: hash,
        createdAt: new Date()
      }
    })

    return { key, id: apiKey.id } // Return plaintext key ONCE
  }

  // Validate API key
  async validateKey(key: string): Promise<boolean> {
    const hash = createHash('sha256').update(key).digest('hex')
    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } })
    return !!apiKey
  }
}
```

### Input Validation

**All inputs validated via TypeBox schemas:**

```typescript
import { Type } from '@sinclair/typebox'

const SpecUploadSchema = Type.Object({
  spec: Type.Object({}, { additionalProperties: true }), // OpenAPI spec object
  version: Type.Optional(Type.Union([Type.Literal('3.0'), Type.Literal('3.1')]))
})

fastify.post(
  '/api/v1/specs/openapi',
  {
    schema: {
      body: SpecUploadSchema
    }
  },
  async (request, reply) => {
    // Request body is type-safe and validated
  }
)
```

### Rate Limiting

```typescript
// apps/api/src/plugins/rate-limit.ts
import rateLimit from '@fastify/rate-limit'

fastify.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: '1 hour', // per hour
  cache: 10000, // Keep 10k rate limit records in memory
  allowList: ['127.0.0.1'], // Whitelist localhost
  redis: redisClient, // Optional: Use Redis for distributed rate limiting
  keyGenerator: (request) => {
    return request.headers['x-api-key'] || request.ip
  },
  errorResponseBuilder: (request, context) => {
    return {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded: ${context.max} requests per ${context.after}`,
        details: {
          limit: context.max,
          remaining: 0,
          resetAt: new Date(Date.now() + context.ttl).toISOString()
        }
      }
    }
  }
})
```

### Data Protection

- **HTTPS/TLS 1.3:** All API communication encrypted in transit
- **Database encryption at rest:** AWS RDS encryption enabled
- **Secrets management:** Environment variables, never commit to git
- **No PII logging:** Emails/usernames excluded from logs in production
- **CORS configuration:** Restrict origins in production

## Performance Considerations

### Search Performance (NFR-P1: <1s for 10k routes)

**Strategy:**

1. **HNSW indexes** on pgvector columns (m=16, ef_construction=64)
2. **Approximate nearest neighbor search** (pgvector <=> operator)
3. **Connection pooling** via Prisma (pool size based on load)
4. **Query optimization:** Only fetch needed columns, limit results

**Monitoring:**

```typescript
// Log search latency
const start = Date.now()
const results = await searchService.search(query)
const duration = Date.now() - start
fastify.log.info({ duration, resultCount: results.length }, 'Search completed')

// Alert if p95 > 1000ms
```

### Webhook Ingestion (NFR-P2: 20 concurrent uploads for MVP)

**Strategy:**

1. **Synchronous processing only:** All specs processed in 2-5s, return 200
2. **Target capacity:** Specs up to 200 endpoints
3. **Connection pooling:** Optimize database connections for concurrent requests
4. **Future scaling:** Async processing deferred to post-MVP phase

**Implementation:**

```typescript
POST / api / v1 / specs / openapi

// Synchronous processing for all specs
await validateSpec(spec)
await extractEndpoints(spec)
await generateEmbeddings(endpoints)
await detectBreakingChanges(apiId, spec)

return reply.status(201).send({
  id,
  message: 'Spec processed',
  endpoints_count: endpoints.length
})
```

### Embedding Generation (NFR-P3: Synchronous Processing)

**Strategy:**

1. **Batch API calls:** Generate multiple embeddings in single request
2. **Parallel processing:** Use Promise.all for independent embeddings
3. **Caching:** Cache embeddings for unchanged schemas
4. **Provider selection:** OpenAI for production, Ollama for self-hosted

**Performance Targets (MVP - Synchronous):**

- Small spec (10 endpoints, 20 embeddings): <2s
- Medium spec (50 endpoints, 100 embeddings): <5s
- Large spec (100-200 endpoints, 200-400 embeddings): <5s
- Note: Specs with >200 endpoints may exceed timeout, deferred to post-MVP async processing

### Database Performance

**Connection Pooling:**

```typescript
// Prisma connection pool
DATABASE_URL = 'postgresql://user:pass@host:5432/db?connection_limit=20'
```

**Query Optimization:**

- Select only needed fields: `select: { id: true, path: true }`
- Use indexes for all filter/sort columns
- Avoid N+1 queries (use `include` for relations)
- Paginate large result sets

## Deployment Architecture

### Development Environment

**Docker Compose setup:**

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: perrache_dev
      POSTGRES_USER: perrache
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis: # Optional: for distributed rate limiting
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

**Local Development:**

```bash
# Start dependencies
docker-compose up -d

# Install dependencies
pnpm install

# Run migrations
pnpm --filter api prisma migrate dev

# Start dev servers (Turborepo runs both apps)
pnpm dev

# Apps running at:
# API: http://localhost:3000
# Web: http://localhost:3001
```

### Production Deployment

**Infrastructure:**

- **API:** AWS ECS Fargate or EC2 with Docker
- **Database:** AWS RDS PostgreSQL 15+ with pgvector extension
- **Frontend:** Vercel or AWS CloudFront + S3
- **Queue:** pg-boss (uses PostgreSQL, no extra infrastructure)
- **Monitoring:** Prometheus + Grafana for metrics

**Environment Variables:**

```bash
# Production .env
NODE_ENV=production
DATABASE_URL=postgresql://...@rds-endpoint:5432/perrache?ssl=true
OPENAI_API_KEY=sk-prod-...
EMBEDDING_PROVIDER=openai
RESEND_API_KEY=re_...
API_BASE_URL=https://api.perrache.com
WEB_BASE_URL=https://perrache.com
```

**Docker Production Build:**

```dockerfile
# docker/Dockerfile.api
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Deployment Steps:**

```bash
# 1. Build Docker image
docker build -f docker/Dockerfile.api -t perrache-api:latest .

# 2. Push to registry
docker tag perrache-api:latest ecr.aws.com/perrache-api:latest
docker push ecr.aws.com/perrache-api:latest

# 3. Deploy to ECS/EC2
aws ecs update-service --cluster perrache --service api --force-new-deployment

# 4. Run migrations
pnpm --filter api prisma migrate deploy
```

## Development Environment

### Prerequisites

**Required:**

- Node.js 20+ (LTS)
- pnpm 8+
- Docker & Docker Compose
- Git

**Recommended:**

- VS Code with extensions:
  - Prisma
  - ESLint
  - Prettier
  - TypeScript
- PostgreSQL client (pgAdmin, Postico, or CLI)

### Setup Commands

```bash
# 1. Clone repository
git clone https://github.com/your-org/perrache.git
cd perrache

# 2. Install dependencies
pnpm install

# 3. Start Docker services (PostgreSQL + pgvector)
docker-compose -f docker/docker-compose.yml up -d

# 4. Copy environment template
cp .env.example .env

# 5. Configure .env file
# DATABASE_URL=postgresql://perrache:dev_password@localhost:5432/perrache_dev
# OPENAI_API_KEY=sk-...
# EMBEDDING_PROVIDER=openai
# RESEND_API_KEY=re_...

# 6. Run database migrations
pnpm --filter api prisma migrate dev

# 7. Generate Prisma client
pnpm --filter api prisma generate

# 8. Seed database (optional)
pnpm --filter api prisma db seed

# 9. Start development servers
pnpm dev

# API running at: http://localhost:3000
# Web running at: http://localhost:3001
# API docs at: http://localhost:3000/documentation
```

### Turborepo Tasks

```bash
# Run all tasks in parallel
pnpm build        # Build all apps and packages
pnpm test         # Run all tests
pnpm lint         # Lint all code
pnpm type-check   # TypeScript type checking

# Run task for specific app
pnpm --filter api build
pnpm --filter web build
pnpm --filter @perrache/types build

# Clean build artifacts
pnpm clean
```

## Architecture Decision Records (ADRs)

### ADR-001: Turborepo Monorepo

**Decision:** Use Turborepo for monorepo management

**Context:** Need to share TypeScript types between Fastify backend and Next.js frontend while maintaining fast builds.

**Rationale:**

- Type sharing critical for dual-embedding architecture
- Build caching speeds up CI/CD
- Industry standard (Vercel, Meta)
- Better than alternatives (Nx, Lerna, pnpm workspaces alone)

**Consequences:**

- Additional tooling complexity
- Learning curve for contributors
- Excellent developer experience with shared types

---

### ADR-002: Fastify Over Next.js API Routes

**Decision:** Use separate Fastify backend instead of Next.js-only architecture

**Context:** Performance requirements (<1s search, 100 concurrent uploads) and API-first platform nature.

**Rationale:**

- Fastify 2-3x faster than Next.js API routes
- Better control over PostgreSQL connection pooling
- Separation of concerns (API can scale independently)
- Plugin ecosystem (@fastify/swagger, @fastify/rate-limit)

**Consequences:**

- More deployment complexity (two apps)
- CORS configuration needed
- Superior performance for API-heavy workload

---

### ADR-003: Dual-Embedding Strategy

**Decision:** Generate two embeddings per endpoint (domain object + full signature)

**Context:** Need to find both functionally similar APIs (same data) and similar API signatures.

**Rationale:**

- Single embedding insufficient for duplicate detection
- Domain-only embedding finds similar data models regardless of naming
- Full embedding captures API semantics (descriptions, tags, method)
- Weighted scoring (60/40) balances both concerns

**Consequences:**

- 2x embedding generation cost
- 2x vector storage (1536 dims × 2 per endpoint)
- Significantly better duplicate detection accuracy

---

### ADR-004: PostgreSQL + pgvector Over Dedicated Vector DB

**Decision:** Use PostgreSQL with pgvector extension instead of Pinecone/Weaviate

**Context:** Need vector similarity search for <1s latency at 10k+ endpoints.

**Rationale:**

- Reduces infrastructure complexity (one database instead of two)
- pgvector HNSW indexes meet <1s latency requirement
- Transactional consistency (embeddings + metadata in one DB)
- Lower operational cost

**Consequences:**

- Slightly lower performance than dedicated vector DBs
- PostgreSQL becomes single point of failure (mitigated by RDS)
- Simpler architecture, easier to operate

---

### ADR-005: Prisma ORM with pgvector Extension Support

**Decision:** Use Prisma ORM despite limited native pgvector support

**Context:** Need TypeScript-first ORM with migrations and type safety.

**Rationale:**

- Best TypeScript DX for ORM
- Prisma now supports pgvector via `Unsupported()` type
- Migrations and type generation worth raw SQL for vector queries
- Can use `prisma.$queryRaw` for vector operations

**Consequences:**

- Vector queries require raw SQL
- Not as elegant as full native support
- Trade-off acceptable for overall productivity gain

---

### ADR-006: Synchronous Processing for MVP (Deferred Async to Moonshots)

**Decision:** Use synchronous processing for MVP, defer async queue infrastructure to post-MVP phase

**Context:** Need to process spec uploads with embedding generation and change detection.

**Rationale:**

- MVP focus is validating semantic discovery value, not scaling to massive catalogs
- Synchronous processing sufficient for pilot enterprises (most APIs <100 endpoints)
- Avoids infrastructure complexity (no queue management, workers, job status tracking)
- Faster MVP delivery by removing async overhead
- Can add async processing in moonshots phase if scaling requires it

**Consequences:**

- Limited to specs with <200 endpoints for <5s response times
- No job status tracking API
- Webhook must wait for complete processing before returning
- Simpler architecture and faster MVP delivery

---

### ADR-007: OpenAI Embeddings with Provider Abstraction

**Decision:** Default to OpenAI text-embedding-3-small with pluggable provider interface

**Context:** Need high-quality embeddings with option for self-hosted deployments.

**Rationale:**

- OpenAI best quality/cost ratio ($0.02 per 1M tokens, 1536 dims)
- Provider abstraction allows Ollama for air-gapped deployments
- Unified interface prevents vendor lock-in

**Consequences:**

- OpenAI API dependency for default setup
- Monthly embedding costs scale with catalog size
- Flexibility for different deployment scenarios

---

### ADR-008: Adapter Pattern for Breaking Change Detection

**Decision:** Wrap @pb33f/openapi-changes in adapter pattern

**Context:** Breaking change detection is critical but library may need swapping.

**Rationale:**

- @pb33f/openapi-changes is CLI-based (needs async queue execution)
- Library choice may change based on accuracy testing
- Adapter pattern isolates breaking change logic

**Consequences:**

- Extra abstraction layer
- Easy to swap libraries if needed
- Future-proof architecture

---

### ADR-009: Environment as String, Not Enum

**Decision:** Store environment as configurable string instead of enum

**Context:** Enterprises use varied environment names (dev, staging, prod, qa, canary, preview, etc.)

**Rationale:**

- Enum is too restrictive for enterprise flexibility
- Different orgs have different deployment pipelines
- String allows any environment name

**Consequences:**

- No database-level validation of environment values
- More flexible for diverse enterprise needs

---

### ADR-010: RESTful API Over tRPC

**Decision:** Use REST API with shared TypeScript types instead of tRPC

**Context:** API must be public for CI/CD webhooks, not just internal frontend.

**Rationale:**

- tRPC only works for TypeScript clients
- CI/CD systems need standard HTTP/REST endpoints
- OpenAPI documentation required (Perrache catalogs itself)
- Shared types via Turborepo provide type safety

**Consequences:**

- Manual type sync between backend and frontend
- Standard HTTP semantics (caching, CDN-friendly)
- Works with any HTTP client

---

_Generated by BMAD Decision Architecture Workflow v1.3_
_Date: 2025-11-09_
_Architect: Winston (AI)_
_Product Owner: Brainrepo_
