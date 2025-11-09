# Epic Technical Specification: Foundation & Infrastructure

Date: 2025-11-10
Author: Brainrepo
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the complete foundational infrastructure for Perrache, an open-source enterprise API catalog platform. This epic creates the base monorepo structure (Turborepo), backend API server (Fastify with TypeScript), frontend application (Next.js 15 with App Router), and production-ready deployment infrastructure (Docker + PostgreSQL with pgvector extension).

The infrastructure must support zero-effort API discovery through webhook automation, semantic search with vector similarity, and breaking change detection - all while maintaining sub-second search latency for catalogs with 10,000+ API endpoints. This epic delivers the technical foundation that enables all subsequent feature development (ingestion, semantic search, change detection, governance UI).

## Objectives and Scope

**In Scope:**

1. **Monorepo Setup**
   - Turborepo configuration with pnpm workspaces
   - Shared TypeScript types package (`@perrache/types`)
   - Shared config package for ESLint, Prettier, TypeScript
   - Build orchestration and hot reload for development

2. **Backend API Infrastructure**
   - Fastify application with TypeScript
   - PostgreSQL database with pgvector extension (15+)
   - Prisma ORM with migration system
   - API documentation via @fastify/swagger (OpenAPI spec)
   - Health check endpoints (`GET /health`)
   - Structured logging with Pino
   - Error handling middleware with standardized error responses

3. **Frontend Application**
   - Next.js 15 with App Router (not Pages Router)
   - TypeScript strict mode
   - Tailwind CSS for styling with dark mode support
   - API client library connecting to Fastify backend
   - Responsive layout with navigation structure

4. **Database Foundation**
   - PostgreSQL 15+ with pgvector extension
   - Prisma schema initialization
   - Connection pooling configuration
   - Development environment via Docker Compose

5. **Authentication & Security**
   - API key generation and management system
   - Bearer token authentication middleware for webhook endpoints
   - Key storage as salted hashes (SHA-256)
   - Rate limiting per API key (100 requests/hour)

6. **Deployment Infrastructure**
   - Docker containers for backend and database
   - Docker Compose orchestration for local development
   - Multi-stage Dockerfile for optimized production images
   - Environment variable configuration
   - Database initialization scripts for pgvector

7. **Observability**
   - Structured JSON logging (Pino)
   - Prometheus-compatible metrics endpoint (`GET /metrics`)
   - Request correlation IDs for tracing
   - Health check with database connectivity validation
   - Log levels configurable via environment variable

**Out of Scope (Deferred to Subsequent Epics):**

- OpenAPI spec ingestion webhook (Epic 2)
- Embedding generation and semantic search (Epic 3)
- Breaking change detection (Epic 5)
- Frontend UI pages (Epics 6-7)
- User authentication system (Phase 2)
- Production deployment automation (CI/CD pipelines)

**Success Criteria:**

- Developer can run `pnpm dev` and both API + frontend start successfully
- API responds to `GET /health` with 200 status and database connectivity confirmation
- Frontend loads at localhost:3001 with basic navigation
- PostgreSQL with pgvector extension is accessible and queryable
- API keys can be generated, validated, and rate-limited correctly
- Docker Compose brings up complete local development environment
- TypeScript types are shared successfully between API and frontend packages

## System Architecture Alignment

Epic 1 implements the foundational architectural decisions documented in `architecture.md`:

**Monorepo Architecture (ADR-001):**
- Turborepo with pnpm workspaces as specified
- Shared types package enables type safety across API and frontend
- Build caching and parallel task execution configured

**Fastify Backend (ADR-002):**
- Fastify chosen over Next.js API routes for performance (<1s search requirement)
- Plugin ecosystem leveraged (@fastify/swagger, @fastify/rate-limit)
- Separate from frontend for independent scaling

**Database Infrastructure (ADR-004):**
- PostgreSQL 15+ with pgvector extension (not dedicated vector DB)
- Supports dual-embedding semantic search (1536-dimension vectors)
- HNSW indexing preparation for sub-second similarity search

**Prisma ORM (ADR-005):**
- TypeScript-first ORM with migration system
- pgvector support via `Unsupported("vector(1536)")` type
- Raw SQL used for vector operations where needed

**Project Structure:**
Implements the exact folder structure defined in architecture.md:
```
perrache/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Shared ESLint, Prettier, TS configs
│   └── embedding/    # Embedding provider abstraction (empty, ready for Epic 3)
└── docker/
    └── docker-compose.yml  # PostgreSQL + pgvector for local dev
```

**Technology Stack Alignment:**
- Node.js 20 LTS
- TypeScript 5.x with strict mode
- Tailwind CSS 4.x with dark mode
- Docker for containerization
- Environment-based configuration (no hardcoded secrets)

## Detailed Design

### Services and Modules

Epic 1 establishes the foundational service structure that subsequent epics will build upon. No business logic services are implemented yet - this epic focuses on infrastructure and framework setup.

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|---------|---------|-------|
| **Turborepo Root** | Build orchestration, task caching, workspace management | package.json, turbo.json, workspace configs | Parallel builds, shared caching | Platform Team |
| **@perrache/types** | Shared TypeScript type definitions | None (source of truth) | Type exports for API requests/responses, domain models | Platform Team |
| **@perrache/config** | Shared configuration (ESLint, Prettier, TypeScript) | None | Config exports for consistent code style | Platform Team |
| **apps/api** | Fastify backend server with plugins and middleware | HTTP requests, environment variables | HTTP responses, logs, metrics | Backend Team |
| **apps/api - Prisma Client** | Database ORM and migration management | Database schema, migrations | Type-safe database queries | Backend Team |
| **apps/api - Health Check Service** | System health monitoring | Database connection, environment state | Health status JSON | DevOps Team |
| **apps/api - API Key Service** | API key generation, validation, rate limiting | Bearer tokens, API key requests | Authentication success/failure | Security Team |
| **apps/web** | Next.js frontend application | API responses via fetch | Rendered UI pages | Frontend Team |
| **docker/postgres** | PostgreSQL 15+ with pgvector extension | SQL migrations, data | Persistent storage, vector search capability | DevOps Team |

**Service Dependencies:**
- `apps/api` depends on: `@perrache/types`, `@perrache/config`, PostgreSQL
- `apps/web` depends on: `@perrache/types`, `@perrache/config`, `apps/api` (runtime)
- All apps depend on: Node.js 20 LTS, pnpm 8+

**Module Communication:**
- API ↔ Frontend: RESTful HTTP (JSON over HTTPS)
- API ↔ Database: Prisma Client (connection pooling)
- Build system: Turborepo orchestrates all package builds

### Data Models and Contracts

**Prisma Schema Foundation:**

Epic 1 initializes the Prisma schema with minimal models required for API key authentication. Full catalog models (Api, Endpoint, Change, etc.) are deferred to Epic 2.

```prisma
// apps/api/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider = "prisma-client-js"
}

// API Key Management (Epic 1)
model ApiKey {
  id        String   @id @default(cuid())
  name      String   // Descriptive name (e.g., "CI/CD Pipeline - User Service")
  keyHash   String   @unique  // SHA-256 hash of API key
  createdAt DateTime @default(now())
  revokedAt DateTime?  // Null = active, timestamp = revoked

  @@index([keyHash])
  @@index([revokedAt])
}

// Note: Full catalog models (Api, Endpoint, Change, etc.) added in Epic 2
```

**Shared Types Package (`@perrache/types`):**

```typescript
// packages/types/src/api.ts

// Health Check Response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    database: 'healthy' | 'unhealthy'
  }
  version: string
}

// Error Response (standardized across all endpoints)
export interface ErrorResponse {
  error: {
    code: string  // ERROR_CODE enum values
    message: string
    details?: Record<string, unknown>
  }
}

// API Key Types
export interface ApiKeyCreateRequest {
  name: string
}

export interface ApiKeyCreateResponse {
  id: string
  key: string  // Plaintext key returned ONCE
  name: string
  createdAt: string
}

export interface ApiKeyValidationResult {
  valid: boolean
  keyId?: string
}

// Error Codes
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

**Database Initialization:**

```sql
-- Migration: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify pgvector is available
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### APIs and Interfaces

Epic 1 implements minimal API endpoints for infrastructure validation. Full REST API surface area is added in subsequent epics.

**Implemented Endpoints:**

```
GET /health
  Description: System health check with database connectivity validation
  Auth: None (public endpoint)
  Response: 200 OK
  Body: {
    "status": "healthy",
    "timestamp": "2025-11-10T10:00:00Z",
    "services": {
      "database": "healthy"
    },
    "version": "1.0.0"
  }

  Error: 503 Service Unavailable (if database unreachable)
  Body: {
    "status": "unhealthy",
    "timestamp": "2025-11-10T10:00:00Z",
    "services": {
      "database": "unhealthy"
    },
    "version": "1.0.0"
  }

---

GET /metrics
  Description: Prometheus-compatible metrics endpoint
  Auth: None (can be restricted via firewall in production)
  Response: 200 OK (text/plain)
  Body: Prometheus metrics format
    # HELP http_requests_total Total HTTP requests
    # TYPE http_requests_total counter
    http_requests_total{method="GET",route="/health",status="200"} 42

    # HELP http_request_duration_seconds HTTP request latency
    # TYPE http_request_duration_seconds histogram
    http_request_duration_seconds_bucket{le="0.1"} 95
    http_request_duration_seconds_bucket{le="0.5"} 99
    http_request_duration_seconds_bucket{le="1.0"} 100

---

POST /api/v1/admin/keys
  Description: Generate new API key for webhook ingestion
  Auth: None (MVP - no admin auth yet, add in Phase 2)
  Body: {
    "name": "CI/CD Pipeline - User Service"
  }
  Response: 201 Created
  Body: {
    "id": "clx1234567890",
    "key": "pk_live_abcdefg1234567890",  // Returned ONCE
    "name": "CI/CD Pipeline - User Service",
    "createdAt": "2025-11-10T10:00:00Z"
  }

  Error: 400 Bad Request (invalid input)

---

DELETE /api/v1/admin/keys/{id}
  Description: Revoke API key
  Auth: None (MVP)
  Response: 204 No Content

  Error: 404 Not Found (key doesn't exist)

---

GET /documentation
  Description: Auto-generated Swagger UI (OpenAPI spec viewer)
  Auth: None
  Response: HTML page with interactive API documentation

GET /documentation/json
  Description: OpenAPI 3.1 specification in JSON format
  Auth: None
  Response: OpenAPI spec (Perrache catalogs itself!)
```

**Authentication Middleware:**

```typescript
// apps/api/src/middleware/auth.ts

import { FastifyRequest, FastifyReply } from 'fastify'
import { createHash } from 'crypto'

export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header'
      }
    })
  }

  const key = authHeader.substring(7)  // Remove 'Bearer '
  const keyHash = createHash('sha256').update(key).digest('hex')

  const apiKey = await request.server.prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, revokedAt: true }
  })

  if (!apiKey || apiKey.revokedAt !== null) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or revoked API key'
      }
    })
  }

  // Attach key ID to request for rate limiting
  request.apiKeyId = apiKey.id
}
```

**Error Handler:**

```typescript
// apps/api/src/app.ts

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({ error, url: request.url, requestId: request.id }, 'Request error')

  // Rate limit error
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        details: {
          limit: 100,
          window: '1 hour'
        }
      }
    })
  }

  // Default 500 error
  return reply.status(error.statusCode || 500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : error.message
    }
  })
})
```

### Workflows and Sequencing

**Epic 1 Implementation Sequence:**

```
Story 1.1: Project Setup & Repository Structure
  ↓
Story 1.2: PostgreSQL Database with pgvector Extension
  ↓
Story 1.3: Fastify Backend API Server Setup
  ↓
Story 1.4: Next.js Frontend Application Setup
  ↓
Story 1.5: Docker Containerization & Deployment Configuration
  ↓
Story 1.6: API Key Authentication System
  ↓
Story 1.7: Observability & Monitoring Setup
```

**Developer Workflow (Local Development):**

```
1. Clone repository
   └─> git clone repo && cd perrache

2. Install dependencies
   └─> pnpm install

3. Start Docker services
   └─> docker-compose up -d
   └─> PostgreSQL + pgvector running on localhost:5432

4. Run database migrations
   └─> pnpm --filter api prisma migrate dev
   └─> Creates tables, enables pgvector extension

5. Start development servers
   └─> pnpm dev
   └─> Turborepo starts both API and frontend with hot reload

6. Verify setup
   └─> API: http://localhost:3000/health → 200 OK
   └─> Frontend: http://localhost:3001 → Homepage loads
   └─> Docs: http://localhost:3000/documentation → Swagger UI
```

**API Key Generation Workflow:**

```
1. Developer calls admin endpoint
   └─> POST /api/v1/admin/keys
   └─> Body: { "name": "My Service" }

2. API generates cryptographically strong key
   └─> randomBytes(32) → Base64URL encoded
   └─> Example: pk_live_abc123def456

3. API hashes key for storage
   └─> SHA-256 hash stored in database
   └─> Plaintext key returned ONCE to user

4. Developer stores key securely
   └─> Add to CI/CD secrets or .env file
   └─> Never commit to version control

5. Future API calls include Bearer token
   └─> Authorization: Bearer pk_live_abc123def456
   └─> Middleware validates hash match
```

**Request Flow (Authenticated Endpoint - Future Epics):**

```
HTTP Request
  ↓
1. Fastify receives request
  ↓
2. Request ID generated (correlation ID)
  ↓
3. Auth middleware validates Bearer token
   ├─> Valid? → Continue to route handler
   └─> Invalid? → Return 401 Unauthorized
  ↓
4. Rate limiting middleware
   ├─> Under limit? → Continue
   └─> Exceeded? → Return 429 Rate Limit Exceeded
  ↓
5. Route handler executes
  ↓
6. Response sent
  ↓
7. Request logged (structured JSON with correlation ID)
  ↓
8. Metrics updated (latency, status code)
```

## Non-Functional Requirements

### Performance

**NFR-P1: API Response Time (Health Check)**
- Health check endpoint SHALL respond within 100ms (p95)
- Database connectivity check included in response time
- Target: <50ms typical response time

**NFR-P2: Development Build Performance**
- `pnpm dev` SHALL start both apps (API + frontend) within 10 seconds
- Turborepo hot reload SHALL reflect code changes within 2 seconds
- TypeScript compilation SHALL complete incrementally (not full rebuild)

**NFR-P3: Production Build Performance**
- Full monorepo build (`pnpm build`) SHALL complete within 3 minutes
- Docker image build SHALL complete within 5 minutes
- Build caching via Turborepo SHALL reduce subsequent builds by >50%

**NFR-P4: Database Connection Pooling**
- Prisma connection pool configured for 20 connections minimum
- Connection acquisition SHALL complete within 500ms
- No connection exhaustion under 100 concurrent requests

**Rationale:** These baseline performance targets ensure the foundation supports future scale requirements (NFR-P1 from PRD: <1s search for 10k+ routes). Epic 1 establishes infrastructure that won't become a bottleneck.

### Security

**NFR-SEC1: API Key Cryptographic Strength**
- API keys SHALL be generated using `crypto.randomBytes(32)` (256-bit entropy)
- Keys stored as SHA-256 hashes, never plaintext
- Base64URL encoding for key transmission (URL-safe)

**NFR-SEC2: Authentication Middleware**
- All authenticated endpoints SHALL validate Bearer token via middleware
- Invalid/revoked keys rejected with 401 Unauthorized
- Constant-time hash comparison to prevent timing attacks

**NFR-SEC3: Rate Limiting**
- API keys rate-limited to 100 requests/hour (configurable)
- Rate limit enforced via @fastify/rate-limit plugin
- 429 Too Many Requests response with Retry-After header

**NFR-SEC4: Input Validation**
- ALL API inputs validated using TypeBox schemas
- Request body size limited to 10MB (Fastify default)
- SQL injection prevented via Prisma parameterized queries

**NFR-SEC5: Secrets Management**
- Database credentials stored in environment variables only
- No hardcoded secrets in codebase
- .env files excluded from version control (.gitignore)
- .env.example provided as template (no real values)

**NFR-SEC6: HTTPS/TLS**
- Production API SHALL enforce HTTPS/TLS 1.3
- Development allows HTTP for local testing
- CORS configured to restrict origins in production

**Rationale:** Implements security baseline from PRD NFR-SEC1-4. API key security critical for webhook ingestion trust. Foundation must be secure from day 1.

### Reliability/Availability

**NFR-R1: Health Check Reliability**
- Health endpoint SHALL always respond (even if database down)
- Degraded state returns 503 with unhealthy status (not crash)
- Timeout for database health check: 5 seconds max

**NFR-R2: Graceful Error Handling**
- ALL exceptions caught by global error handler
- Structured error responses with actionable messages
- No stack traces exposed in production (NODE_ENV check)

**NFR-R3: Database Connection Resilience**
- Prisma SHALL retry failed connections with exponential backoff
- Connection pool recovers from transient database failures
- Application continues serving health checks during database downtime

**NFR-R4: Process Management**
- API process SHALL exit cleanly on SIGTERM/SIGINT
- Graceful shutdown: close database connections, finish in-flight requests
- Shutdown timeout: 10 seconds before force kill

**NFR-R5: Data Durability**
- PostgreSQL configured with fsync enabled (data durability guarantee)
- Docker volumes persist database data across container restarts
- No data loss on container restart

**Rationale:** Foundation must be resilient to transient failures. Health checks must work even when dependencies fail. Implements PRD NFR-R1-3 baseline.

### Observability

**NFR-O1: Structured Logging**
- ALL logs written in structured JSON format (Pino logger)
- Log fields: timestamp, level, requestId, message, context
- Log levels: ERROR, WARN, INFO, DEBUG (configurable via LOG_LEVEL env var)
- Default log level: INFO (production), DEBUG (development)

**NFR-O2: Request Correlation**
- EVERY request assigned unique correlation ID (UUID v4)
- Correlation ID included in ALL logs for that request
- Response header: `X-Request-ID` for client tracing

**NFR-O3: Metrics Endpoint**
- Prometheus-compatible metrics exposed at `GET /metrics`
- Metrics collected:
  - `http_requests_total` (counter by method, route, status)
  - `http_request_duration_seconds` (histogram with p50, p95, p99)
  - `process_cpu_usage_percent` (gauge)
  - `process_memory_usage_bytes` (gauge)
  - `database_connections_active` (gauge)

**NFR-O4: Health Check Detail**
- Health endpoint validates database connectivity
- Response includes service status breakdown
- Version information included for deployment tracking

**NFR-O5: Log Output**
- Logs written to stdout (Docker-friendly, 12-factor app)
- No file-based logging (use log aggregation tools)
- No PII in logs (emails, API keys, auth tokens excluded)

**NFR-O6: Error Logging**
- ALL errors logged with full context (stack trace, request details)
- Error rate tracked in metrics
- Critical errors: database connection failures, uncaught exceptions

**Rationale:** Comprehensive observability from day 1 enables debugging and monitoring. Implements PRD NFR-O1-3. Structured logging + metrics are foundation for future alerting (Epic 1.7).

## Dependencies and Integrations

### Runtime Dependencies

**Backend (apps/api):**

```json
{
  "dependencies": {
    "fastify": "^4.26.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^3.0.0",
    "@prisma/client": "^5.10.0",
    "pino": "^8.19.0",
    "pino-pretty": "^11.0.0",
    "prom-client": "^15.1.0"
  },
  "devDependencies": {
    "prisma": "^5.10.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  }
}
```

**Frontend (apps/web):**

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.3",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
```

**Shared Packages:**

```json
// packages/types/package.json
{
  "name": "@perrache/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}

// packages/config/package.json
{
  "name": "@perrache/config",
  "version": "1.0.0",
  "dependencies": {
    "eslint": "^8.56.0",
    "prettier": "^3.2.5",
    "@typescript-eslint/eslint-plugin": "^6.20.0",
    "@typescript-eslint/parser": "^6.20.0"
  }
}
```

**Root (Turborepo):**

```json
{
  "name": "perrache",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^1.12.0",
    "prettier": "^3.2.5"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### External Services

**PostgreSQL with pgvector:**
- **Version:** PostgreSQL 15+ with pgvector extension 0.5.0+
- **Connection:** Via Prisma Client (connection pooling)
- **Development:** Docker container (pgvector/pgvector:pg16)
- **Production:** AWS RDS PostgreSQL 15+ (pgvector extension enabled)
- **Environment Variable:** `DATABASE_URL=postgresql://user:pass@host:5432/db`

**Docker:**
- **Version:** Docker 24+ and Docker Compose 2.0+
- **Purpose:** Local development environment (PostgreSQL)
- **Images Used:**
  - `pgvector/pgvector:pg16` - PostgreSQL with pgvector extension
  - `node:20-alpine` - Base image for production builds

### Integration Points

**Monorepo Package References:**

```typescript
// apps/api/src/routes/health.ts
import type { HealthCheckResponse } from '@perrache/types'

// apps/web/src/lib/api-client.ts
import type { ApiKeyCreateRequest, ErrorResponse } from '@perrache/types'
```

**Turborepo Build Pipeline:**

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Environment Configuration:**

```bash
# .env.example (template for developers)

# Database
DATABASE_URL=postgresql://perrache:dev_password@localhost:5432/perrache_dev

# API Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Future (Epic 3+)
# OPENAI_API_KEY=sk-...
# EMBEDDING_PROVIDER=openai
# RESEND_API_KEY=re_...
```

### Docker Compose Configuration

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: perrache-db
    environment:
      POSTGRES_DB: perrache_dev
      POSTGRES_USER: perrache
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U perrache"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

**Database Initialization Script:**

```sql
-- docker/init.sql
-- Executed on container first start

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE perrache_dev TO perrache;
```

### Dependency Version Constraints

**Critical Version Requirements:**

- **Node.js:** ≥20.0.0 LTS (for native fetch, modern TypeScript support)
- **pnpm:** ≥8.0.0 (workspace protocol support)
- **PostgreSQL:** ≥15.0 (pgvector compatibility, performance improvements)
- **pgvector:** ≥0.5.0 (HNSW indexing support for <1s search)
- **TypeScript:** ^5.3.0 (strict mode, latest language features)
- **Fastify:** ^4.26.0 (TypeScript-first, performance)
- **Next.js:** ^15.0.0 (App Router, React 18 server components)

**Update Strategy:**
- Lock dependencies with package-lock/pnpm-lock for reproducibility
- Update dependencies quarterly or for security patches
- Test updates in development before production deployment
- Use `pnpm audit` for security vulnerability scanning

### Integration Testing Points

**Epic 1 Integration Validation:**

1. **Monorepo Integration:**
   - Shared types import correctly in both API and frontend
   - Turborepo builds all packages in correct dependency order
   - Hot reload works for code changes in shared packages

2. **Database Integration:**
   - Prisma Client generates correctly from schema
   - pgvector extension is accessible (verify with `SELECT * FROM pg_extension`)
   - Migrations apply successfully
   - Connection pooling handles concurrent requests

3. **API-Frontend Integration:**
   - Frontend can call API health endpoint
   - CORS allows frontend origin
   - Error responses match shared type definitions

4. **Docker Integration:**
   - Docker Compose brings up PostgreSQL successfully
   - Database persists data across container restarts
   - Health checks validate container readiness

5. **Authentication Integration:**
   - API key generation creates valid keys
   - Middleware validates keys correctly
   - Rate limiting enforces limits per key

## Acceptance Criteria (Authoritative)

These acceptance criteria are the definitive test cases for Epic 1 completion. All must pass before the epic can be marked as done.

**AC-1: Monorepo Setup & Build Pipeline**
- [ ] Developer can clone repository and run `pnpm install` without errors
- [ ] `pnpm dev` starts both API (port 3000) and frontend (port 3001) within 10 seconds
- [ ] Code changes in `apps/api` trigger hot reload within 2 seconds
- [ ] Code changes in `apps/web` trigger hot reload within 2 seconds
- [ ] Code changes in `packages/types` trigger rebuild and hot reload in consuming apps
- [ ] `pnpm build` successfully builds all workspaces without errors
- [ ] `pnpm lint` passes with no linting errors
- [ ] `pnpm type-check` passes with no TypeScript errors

**AC-2: Database Foundation**
- [ ] `docker-compose up -d` starts PostgreSQL with pgvector extension
- [ ] Query `SELECT * FROM pg_extension WHERE extname = 'vector'` returns pgvector extension
- [ ] `pnpm --filter api prisma migrate dev` creates ApiKey table successfully
- [ ] Prisma Client can connect to database and execute queries
- [ ] Database persists data after container restart (`docker-compose restart`)
- [ ] Health check endpoint reports database status as "healthy"

**AC-3: API Server Functionality**
- [ ] API server starts on port 3000 with `pnpm --filter api dev`
- [ ] `GET /health` returns 200 OK with JSON body containing status, timestamp, services, version
- [ ] `GET /health` responds within 100ms (p95)
- [ ] `GET /metrics` returns Prometheus-format metrics including http_requests_total
- [ ] `GET /documentation` displays Swagger UI with interactive API docs
- [ ] `GET /documentation/json` returns OpenAPI 3.1 specification
- [ ] CORS headers allow requests from frontend origin (localhost:3001)
- [ ] Global error handler catches exceptions and returns structured error response

**AC-4: API Key Authentication**
- [ ] `POST /api/v1/admin/keys` with `{"name": "Test Key"}` returns 201 with plaintext API key
- [ ] Generated API key is cryptographically strong (32 bytes, Base64URL encoded)
- [ ] API key is stored as SHA-256 hash in database (not plaintext)
- [ ] `DELETE /api/v1/admin/keys/{id}` sets revokedAt timestamp
- [ ] Authentication middleware validates Bearer token correctly
- [ ] Invalid API key returns 401 Unauthorized with error code UNAUTHORIZED
- [ ] Revoked API key returns 401 Unauthorized
- [ ] Rate limiting enforces 100 requests/hour per API key
- [ ] 101st request within 1 hour returns 429 Rate Limit Exceeded

**AC-5: Frontend Application**
- [ ] Frontend starts on port 3001 with `pnpm --filter web dev`
- [ ] Homepage loads without errors (no console errors)
- [ ] Navigation component renders with responsive layout
- [ ] Dark mode toggle works (switches theme)
- [ ] Frontend can call `GET /health` on API and display response
- [ ] API client uses shared types from `@perrache/types`
- [ ] Tailwind CSS styles applied correctly
- [ ] TypeScript strict mode enabled with no compilation errors

**AC-6: Shared Type Safety**
- [ ] `@perrache/types` package exports HealthCheckResponse, ErrorResponse, ApiKeyCreateRequest, ApiKeyCreateResponse
- [ ] API imports types from `@perrache/types` successfully
- [ ] Frontend imports types from `@perrache/types` successfully
- [ ] Type changes in `@perrache/types` trigger TypeScript errors in consuming apps (type safety validation)
- [ ] Shared config (`@perrache/config`) provides ESLint and Prettier configurations

**AC-7: Docker Deployment**
- [ ] Multi-stage Dockerfile builds optimized production image for API
- [ ] Production API image size <500MB
- [ ] Docker Compose orchestrates all services (API, database)
- [ ] Environment variables configured via .env file
- [ ] Database migrations run automatically on container startup
- [ ] Health checks validate service readiness in Docker Compose

**AC-8: Observability**
- [ ] All API requests logged in structured JSON format (Pino)
- [ ] Logs include: timestamp, level, requestId, method, path, statusCode, duration
- [ ] Correlation ID (X-Request-ID) included in response headers
- [ ] Metrics endpoint exposes http_requests_total, http_request_duration_seconds, process_cpu_usage_percent
- [ ] Log level configurable via LOG_LEVEL environment variable
- [ ] No PII (API keys, passwords) in logs
- [ ] Error logs include full stack trace and context

**AC-9: Documentation**
- [ ] README.md includes quick start guide for local development
- [ ] .env.example documents all required environment variables
- [ ] OpenAPI spec auto-generated and accessible at /documentation
- [ ] Architecture.md references implemented correctly
- [ ] Database schema documented in Prisma schema comments

**AC-10: Security**
- [ ] No secrets committed to version control (.env excluded via .gitignore)
- [ ] API keys stored as salted hashes (SHA-256)
- [ ] Input validation via TypeBox schemas on all endpoints
- [ ] Rate limiting configured per API key
- [ ] CORS restricts origins (configurable for production)
- [ ] Helmet.js security headers applied

## Traceability Mapping

This table maps acceptance criteria to technical specification sections and test strategies.

| AC ID | Requirement | Spec Section | Components/APIs | Test Strategy |
|-------|-------------|--------------|-----------------|---------------|
| AC-1 | Monorepo setup & build pipeline | Services and Modules, Workflows | Turborepo, pnpm workspaces, package.json scripts | Manual: Run setup commands, verify build output. Automated: CI pipeline runs build/lint/type-check |
| AC-2 | Database foundation | Data Models, Docker Compose | PostgreSQL, pgvector, Prisma, Docker Compose | Manual: Verify pgvector extension. Automated: Integration test queries database |
| AC-3 | API server functionality | APIs and Interfaces, NFR-P1 | Fastify server, health endpoint, metrics endpoint, Swagger | Automated: HTTP tests for /health, /metrics, /documentation. Assert response format |
| AC-4 | API key authentication | APIs and Interfaces, NFR-SEC1-3 | ApiKey model, auth middleware, rate limiting | Automated: Test key generation, validation, revocation, rate limit enforcement |
| AC-5 | Frontend application | Services and Modules | Next.js app, Tailwind CSS, API client | Manual: Visual inspection of UI, dark mode. Automated: E2E test homepage load |
| AC-6 | Shared type safety | Data Models, Integration Points | @perrache/types package | Automated: TypeScript compilation test, verify import paths |
| AC-7 | Docker deployment | Docker Compose, Deployment Infrastructure | Dockerfile, docker-compose.yml | Manual: Build image, measure size. Automated: Docker Compose up test |
| AC-8 | Observability | NFR-O1-O6 | Pino logger, prom-client, correlation middleware | Automated: Assert log format, verify metrics endpoint, check correlation ID |
| AC-9 | Documentation | Project setup | README, .env.example, OpenAPI spec | Manual: Review docs for completeness, accuracy |
| AC-10 | Security | NFR-SEC1-SEC6 | API key hashing, input validation, CORS, Helmet | Automated: Security audit checks, validate .gitignore, test rate limiting |

**Requirements Traceability (PRD → Epic 1):**

| PRD Requirement | Epic 1 Implementation | Status |
|-----------------|----------------------|--------|
| FR-6.1: API Key Management | Story 1.6 - API key generation, validation, rate limiting | Implemented |
| NFR-P1: Search latency <1s | Infrastructure foundation (database, pgvector setup) | Foundation Ready |
| NFR-SEC1: API Key Security | 256-bit keys, SHA-256 hashing, constant-time comparison | Implemented |
| NFR-SEC2: Input Validation | TypeBox schemas, Fastify validation | Implemented |
| NFR-SEC4: Dependency Security | pnpm audit, locked dependencies | Implemented |
| NFR-R1: Availability | Health check, graceful error handling | Implemented |
| NFR-R2: Data Integrity | Prisma atomic transactions, PostgreSQL fsync | Implemented |
| NFR-O1: Structured Logging | Pino JSON logs with correlation IDs | Implemented |
| NFR-O2: Metrics | Prometheus-compatible metrics endpoint | Implemented |
| NFR-O3: Monitoring & Alerting | Health check endpoint, metrics exposure | Implemented |
| NFR-M1: Code Quality | TypeScript strict mode, ESLint, Prettier | Implemented |
| NFR-M2: Documentation | README, OpenAPI spec, architecture docs | Implemented |

**Epic Dependencies:**

- Epic 2 (Webhook Ingestion) depends on: API server (AC-3), Database (AC-2), Auth (AC-4)
- Epic 3 (Semantic Search) depends on: Database with pgvector (AC-2), Shared types (AC-6)
- Epic 6 (Frontend UI) depends on: Frontend foundation (AC-5), API client (AC-6)
- Epic 7 (Observability) depends on: Logging and metrics (AC-8)

## Risks, Assumptions, Open Questions

### Risks

**RISK-1: pgvector Extension Compatibility**
- **Description:** pgvector extension may not be available on all PostgreSQL hosting providers (AWS RDS, Azure, GCP)
- **Likelihood:** Low (major cloud providers support pgvector)
- **Impact:** High (semantic search depends on vector storage)
- **Mitigation:**
  - Verify pgvector support with target hosting provider during setup
  - AWS RDS PostgreSQL 15+ supports pgvector natively
  - Document alternative: Self-hosted PostgreSQL with pgvector in Docker
  - Fallback: Consider dedicated vector DB (Pinecone) if hosting constraint exists
- **Owner:** DevOps Team

**RISK-2: Turborepo Learning Curve**
- **Description:** Team unfamiliar with Turborepo may struggle with monorepo setup and debugging
- **Likelihood:** Medium (new tool for many developers)
- **Impact:** Low (affects development velocity temporarily)
- **Mitigation:**
  - Provide comprehensive README with setup instructions
  - Document common troubleshooting scenarios
  - Leverage Turborepo's excellent official documentation
  - Start with simple setup, add complexity incrementally
- **Owner:** Platform Team

**RISK-3: Next.js 15 App Router Stability**
- **Description:** Next.js 15 App Router is relatively new, may have edge cases or breaking changes
- **Likelihood:** Low (Next.js 15 RC stable)
- **Impact:** Medium (affects frontend development)
- **Mitigation:**
  - Lock Next.js version to avoid unexpected updates
  - Test App Router patterns thoroughly in Epic 1
  - Monitor Next.js GitHub issues for known problems
  - Fallback: Can downgrade to Next.js 14 if critical issues arise
- **Owner:** Frontend Team

**RISK-4: Docker Compose Performance on macOS**
- **Description:** Docker on macOS (especially M1/M2) may have performance issues with volume mounts
- **Likelihood:** Medium (known Docker Desktop limitation)
- **Impact:** Low (affects local development only)
- **Mitigation:**
  - Use named volumes instead of bind mounts for database data
  - Document performance expectations
  - Consider Rancher Desktop or Colima as alternatives
  - Linux developers unaffected
- **Owner:** DevOps Team

### Assumptions

**ASSUMPTION-1: Node.js 20 LTS Availability**
- Development team has Node.js 20 LTS installed or can install it
- CI/CD pipelines support Node.js 20
- Validation: Check Node version in setup script, fail fast with clear error

**ASSUMPTION-2: pnpm Adoption**
- Team willing to adopt pnpm instead of npm/yarn
- CI/CD systems can run pnpm commands
- Validation: Document pnpm installation, provide migration guide from npm

**ASSUMPTION-3: Docker Desktop Installed**
- Developers have Docker Desktop or equivalent installed for local PostgreSQL
- Sufficient disk space for Docker images (~2GB)
- Validation: Check Docker availability in setup script

**ASSUMPTION-4: TypeScript Familiarity**
- Development team has working knowledge of TypeScript
- Developers comfortable with strict mode type checking
- Validation: Provide TypeScript resources in documentation

**ASSUMPTION-5: PostgreSQL Production Hosting**
- Production deployment will use managed PostgreSQL (AWS RDS, Azure, or GCP)
- pgvector extension is supported by chosen provider
- Validation: Confirm with DevOps before finalizing architecture

**ASSUMPTION-6: No Admin Authentication Required (MVP)**
- API key generation endpoints can be unauthenticated for MVP
- Production deployment will restrict admin endpoints via network firewall
- Phase 2 will add proper admin authentication
- Validation: Document security limitation, plan Phase 2 enhancement

### Open Questions

**QUESTION-1: Production Deployment Target**
- **Question:** Which cloud provider will host production Perrache?
- **Options:** AWS (ECS/RDS), GCP (Cloud Run/Cloud SQL), Azure (Container Apps/PostgreSQL), Self-hosted
- **Decision Needed By:** Before Epic 1 completion (affects Docker image optimization)
- **Owner:** DevOps Team / Product Owner
- **Next Step:** Conduct deployment options analysis, select provider

**QUESTION-2: Metrics Storage & Visualization**
- **Question:** How will Prometheus metrics be stored and visualized?
- **Options:** Grafana Cloud, Self-hosted Prometheus + Grafana, Datadog, AWS CloudWatch
- **Decision Needed By:** Epic 1.7 (Observability setup)
- **Owner:** DevOps Team
- **Next Step:** Evaluate monitoring tool options, consider cost vs. features

**QUESTION-3: CI/CD Pipeline Tool**
- **Question:** Which CI/CD platform will be used?
- **Options:** GitHub Actions, GitLab CI, Jenkins, CircleCI
- **Decision Needed By:** Post Epic 1 (not blocking foundation)
- **Owner:** DevOps Team
- **Next Step:** Choose platform, create pipeline configuration

**QUESTION-4: Environment Naming Convention**
- **Question:** Beyond dev/staging/prod, do we need additional environments (qa, canary, preview)?
- **Options:** Stick to 3 environments (dev/staging/prod), Add qa/canary, Support arbitrary names
- **Decision Needed By:** Epic 2 (affects environment enum design)
- **Owner:** Product Manager / DevOps Team
- **Next Step:** Document environment strategy per architecture decision (ADR-009: environment as string, not enum)

**QUESTION-5: API Versioning Strategy**
- **Question:** How should API versioning be handled as Perrache evolves?
- **Options:** URL versioning (/api/v1/, /api/v2/), Header versioning, No versioning (breaking changes only)
- **Decision Needed By:** Epic 2 (affects API route structure)
- **Owner:** Backend Team / Architect
- **Next Step:** Define versioning strategy, document in architecture

## Test Strategy Summary

### Testing Approach

Epic 1 establishes the testing foundation for all subsequent epics. Testing strategy balances automation (fast feedback) with manual validation (complex scenarios).

**Test Pyramid:**
```
           Manual E2E (10%)
              /\
             /  \
            /    \
           /      \
      Integration (30%)
         /          \
        /            \
       /              \
      /                \
     /                  \
    Unit Tests (60%)
```

### Test Levels

**1. Unit Tests (60% coverage target)**

**Scope:** Individual functions, classes, utilities
**Tools:** Vitest (fast, ESM-native alternative to Jest)
**Location:**
- `apps/api/test/unit/`
- `apps/web/test/unit/`
- `packages/*/test/`

**Coverage:**
- API key generation function (crypto strength validation)
- SHA-256 hashing utility (constant-time comparison)
- Error handler formatting (structured error responses)
- Type validation schemas (TypeBox schema tests)
- Utility functions (date formatting, string manipulation)

**Example:**
```typescript
// apps/api/test/unit/api-key.test.ts
import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey } from '../../src/services/api-key.service'

describe('API Key Service', () => {
  it('generates cryptographically strong API key', () => {
    const key = generateApiKey()
    expect(key).toHaveLength(43) // 32 bytes Base64URL = 43 chars
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/) // Base64URL alphabet
  })

  it('hashes API key consistently', () => {
    const key = 'test_key_12345'
    const hash1 = hashApiKey(key)
    const hash2 = hashApiKey(key)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 hex = 64 chars
  })
})
```

**2. Integration Tests (30% coverage target)**

**Scope:** API endpoints, database interactions, service integrations
**Tools:** Vitest + Supertest (HTTP testing) + Testcontainers (PostgreSQL)
**Location:** `apps/api/test/integration/`

**Coverage:**
- Health check endpoint (database connectivity validation)
- API key CRUD operations (create, validate, revoke)
- Metrics endpoint (Prometheus format validation)
- Database connection pooling (concurrent request handling)
- Prisma Client queries (schema validation)

**Example:**
```typescript
// apps/api/test/integration/health.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../../src/app'
import { FastifyInstance } from 'fastify'

describe('Health Check Integration', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health returns healthy status when database connected', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      status: 'healthy',
      services: {
        database: 'healthy'
      }
    })
  })
})
```

**3. End-to-End Tests (10% coverage target)**

**Scope:** Critical user journeys, cross-service workflows
**Tools:** Playwright (frontend E2E)
**Location:** `tests/e2e/`

**Coverage:**
- Developer setup flow (clone → install → dev server starts)
- Frontend loads and calls API health endpoint
- Dark mode toggle (visual regression)
- API key generation via Swagger UI

**Example:**
```typescript
// tests/e2e/setup.spec.ts
import { test, expect } from '@playwright/test'

test('homepage loads and calls API health endpoint', async ({ page }) => {
  await page.goto('http://localhost:3001')

  // Homepage renders
  await expect(page.locator('h1')).toBeVisible()

  // Can fetch API health
  const response = await page.request.get('http://localhost:3000/health')
  expect(response.ok()).toBeTruthy()
  const json = await response.json()
  expect(json.status).toBe('healthy')
})
```

### Test Execution Strategy

**Local Development:**
```bash
# Run all unit tests (fast feedback)
pnpm test

# Run integration tests (requires Docker Compose)
docker-compose up -d
pnpm test:integration

# Run E2E tests (requires both servers running)
pnpm dev &
pnpm test:e2e
```

**CI Pipeline (GitHub Actions / GitLab CI):**
```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Unit tests
        run: pnpm test

      - name: Start PostgreSQL (Testcontainers)
        run: docker-compose up -d postgres

      - name: Integration tests
        run: pnpm test:integration

      - name: Build
        run: pnpm build

      - name: E2E tests
        run: pnpm test:e2e
```

### Acceptance Criteria Validation

Each acceptance criteria (AC-1 through AC-10) has associated test cases:

| AC | Test Type | Test Location | Pass Criteria |
|----|-----------|---------------|---------------|
| AC-1 | Manual | Developer follows README | All pnpm commands succeed |
| AC-2 | Integration | `test/integration/database.test.ts` | pgvector query succeeds |
| AC-3 | Integration | `test/integration/health.test.ts` | All endpoints return expected responses |
| AC-4 | Integration | `test/integration/auth.test.ts` | API key generation, validation, rate limiting work |
| AC-5 | E2E | `tests/e2e/homepage.spec.ts` | Frontend loads, dark mode toggles |
| AC-6 | Unit | `packages/types/test/types.test.ts` | Types import without errors |
| AC-7 | Manual | Docker build script | Image size <500MB, containers start |
| AC-8 | Integration | `test/integration/observability.test.ts` | Logs and metrics match format |
| AC-9 | Manual | Documentation review | Docs complete and accurate |
| AC-10 | Integration | `test/integration/security.test.ts` | Security checks pass |

### Performance Testing

**Epic 1 Performance Baselines:**

- Health check latency: <100ms (p95) - Validated via integration tests
- Build performance: <3 minutes full build - Measured in CI pipeline
- Hot reload: <2 seconds - Manual validation during development
- Database connection pool: 100 concurrent requests - Load test with k6

**Load Test Example (k6):**
```javascript
// tests/load/health-check.js
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  vus: 100, // 100 virtual users
  duration: '30s'
}

export default function() {
  let response = http.get('http://localhost:3000/health')
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100
  })
}
```

### Test Coverage Goals

- **Unit tests:** 60% code coverage minimum (enforce via Vitest coverage reporter)
- **Integration tests:** All API endpoints tested
- **E2E tests:** Critical paths only (homepage, API connectivity)
- **Manual tests:** Documentation, Docker deployment, security audit

### Continuous Testing

- **Pre-commit hooks:** Lint + type-check (via Husky)
- **CI pipeline:** Full test suite on every PR
- **Nightly:** Load tests, security scans (pnpm audit, Snyk)
- **Release:** Full E2E regression suite

---

**Epic 1 Testing Complete When:**
- ✅ All 10 acceptance criteria pass
- ✅ Unit test coverage ≥60%
- ✅ Integration tests green
- ✅ E2E tests green
- ✅ Manual validation checklist complete
- ✅ No critical security vulnerabilities (pnpm audit)
