# Perrache - Epic Breakdown

**Author:** Brainrepo
**Date:** 2025-11-09
**Project Level:** 3 (Medium-High Complexity)
**Target Scale:** Enterprise (1000+ APIs, 100k+ routes)

---

## Overview

This document provides the complete epic and story breakdown for Perrache, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

## Epic Summary

Perrache's MVP consists of **7 epics** delivering automated API discovery, semantic search, and proactive change management:

### Epic 1: Foundation & Infrastructure
**Value:** Establish the core platform infrastructure that enables all subsequent development

**Scope:** Project setup (Fastify backend + Next.js frontend), PostgreSQL + pgvector, Docker deployment, API key auth, observability

**Why:** Greenfield project requires foundational infrastructure before any features can be built. Establishes development environment and deployment pipeline.

**Sequencing:** MUST BE FIRST - all other epics depend on this foundation

---

### Epic 2: Webhook Ingestion & Spec Management
**Value:** Enable zero-effort API cataloging through automated CI/CD integration

**Scope:** Webhook API endpoint, OpenAPI spec validation, multi-environment support, version history, async processing, API key authentication

**Why:** Core ingestion capability is the foundation of automation. Without automated ingestion, the platform requires manual effort and fails at scale.

**Sequencing:** Epic 2 (after Foundation) - enables data collection for all other features

---

### Epic 3: Semantic Discovery Engine
**Value:** Deliver the "magic moment" - find APIs by concept in seconds instead of weeks

**Scope:** Dual-embedding generation, semantic search API with vector similarity, related endpoints discovery, catalog browsing, endpoint detail views

**Why:** The core differentiator that makes Perrache unique. Semantic intelligence prevents duplicate builds by surfacing similar APIs across different naming.

**Sequencing:** Epic 3 - delivers core discovery value once data is ingested

---

### Epic 4: Dependency Tracking & Subscriptions
**Value:** Enable impact analysis by tracking who depends on what

**Scope:** Endpoint subscription API, dependency graph storage, consumer visibility, subscription management

**Why:** Essential for breaking change impact analysis. Answers "who will be affected if this API changes?"

**Sequencing:** Epic 4 - enables impact analysis for breaking change detection

---

### Epic 5: Breaking Change Detection & Notifications
**Value:** Prevent production incidents through proactive change management

**Scope:** Automatic spec comparison, change classification (RED/YELLOW/GREEN), impact analysis, email notifications, risk flagging

**Why:** Complete change management workflow - detect, classify, analyze impact, notify. Prevents catastrophic surprise breaking changes.

**Sequencing:** Epic 5 - completes backend value delivery (requires dependency tracking from Epic 4)

---

### Epic 6: Frontend - Search & Discovery Interface
**Value:** Provide intuitive, developer-first UI for API discovery

**Scope:** Search homepage, search results, endpoint detail pages, related endpoints sidebar, API catalog browser, dark mode

**Why:** Enables developers to interact with the semantic catalog. User-facing discovery interface.

**Sequencing:** Epic 6 - delivers user interface for discovery (backend must be functional first)

---

### Epic 7: Frontend - Governance & Breaking Change Dashboard
**Value:** Give API owners and governance teams visibility into API landscape health

**Scope:** Breaking change feed, impact analysis views, environment tracking display, risk flag visibility

**Why:** Governance-focused interfaces for API owners and platform teams. Completes MVP value delivery.

**Sequencing:** Epic 7 - final MVP epic, completes user experience

---

### Phase 2 Epics (Deferred Post-MVP)

**Epic 8: User Authentication & Access Control**
- SSO integration, RBAC, namespace visibility, person subscriptions

**Epic 9: Visual Landscape Clustering & Advanced Governance**
- HDBSCAN + UMAP clustering, duplication detection, canonical marking, Total Cost of Reuse calculator

---

**MVP Delivery Strategy:**
Epics 1-7 deliver complete MVP value: automated ingestion → semantic discovery → breaking change management → governance visibility. Each epic builds on previous capabilities for incremental value delivery.

---

## Epic 1: Foundation & Infrastructure

**Epic Goal:** Establish the core platform infrastructure with Fastify backend, Next.js frontend, PostgreSQL + pgvector database, Docker deployment, and observability - creating the foundation that enables all subsequent feature development.

---

### Story 1.1: Project Setup & Repository Structure

As a **developer**,
I want **the project initialized with monorepo structure, TypeScript configuration, and development tooling**,
So that **the team has a consistent development environment with proper code quality standards**.

**Acceptance Criteria:**

**Given** a new greenfield project
**When** the repository is initialized
**Then** the following structure exists:
- Monorepo with `/backend` (Fastify) and `/frontend` (Next.js) workspaces
- TypeScript configured for both frontend and backend with strict mode
- ESLint + Prettier configured with consistent code style rules
- Package.json with workspace scripts for build, test, lint
- .gitignore configured for Node.js projects
- README.md with quick start instructions

**And** developers can run `npm install` and `npm run dev` successfully

**And** ESLint + Prettier auto-formatting works in the development workflow

**Prerequisites:** None (first story in the project)

**Technical Notes:**
- Use npm workspaces or pnpm workspaces for monorepo management
- TypeScript 5.x with strict mode enabled
- ESLint + Prettier integration for code consistency
- Setup pre-commit hooks with husky for lint/format checks
- Include `.nvmrc` or `.node-version` file specifying Node.js 20+ LTS

---

### Story 1.2: PostgreSQL Database with pgvector Extension

As a **backend developer**,
I want **PostgreSQL database configured with pgvector extension for vector similarity search**,
So that **we can store and query API embeddings efficiently**.

**Acceptance Criteria:**

**Given** the project infrastructure is set up
**When** the database is provisioned
**Then** PostgreSQL 15+ is running locally via Docker Compose
**And** pgvector extension is installed and enabled
**And** database connection is configurable via environment variables (DATABASE_URL)
**And** a database migration system is initialized (e.g., Prisma, TypeORM, or node-pg-migrate)
**And** health check endpoint `/health` confirms database connectivity

**And** developers can run `npm run db:migrate` to apply schema migrations

**And** vector similarity queries work using pgvector operators

**Prerequisites:** Story 1.1 (project setup)

**Technical Notes:**
- Use Docker Compose for local PostgreSQL + pgvector setup
- pgvector extension required for HNSW indexing (vector similarity search)
- Configure connection pooling for production readiness
- Environment variables: DATABASE_URL, DB_POOL_SIZE
- Consider Prisma for type-safe database access + migration management
- Document database schema versioning strategy

---

### Story 1.3: Fastify Backend API Server Setup

As a **backend developer**,
I want **Fastify application configured with core middleware, error handling, and health endpoints**,
So that **we have a production-ready API server foundation**.

**Acceptance Criteria:**

**Given** the project and database are set up
**When** the Fastify server is started
**Then** the server runs on configurable port (default 3001)
**And** CORS middleware is configured for frontend origin
**And** Request validation middleware is enabled (fastify-type-provider-zod or @fastify/swagger)
**And** Global error handler catches and formats errors with structured response:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": []
  }
}
```
**And** Health check endpoint `GET /health` returns 200 with database status
**And** Request logging middleware logs all API requests with correlation IDs
**And** OpenAPI documentation is auto-generated at `/docs`

**And** developers can start the server with `npm run dev` (hot reload enabled)

**Prerequisites:** Story 1.1, Story 1.2

**Technical Notes:**
- Fastify 4.x with TypeScript support
- Plugins: @fastify/cors, @fastify/helmet (security headers), @fastify/rate-limit
- Use Zod for request/response validation with type inference
- Structured logging with pino (Fastify default logger)
- Correlation ID middleware for request tracing
- Auto-generated OpenAPI spec using @fastify/swagger or fastify-type-provider-zod
- Hot reload with tsx or ts-node-dev for development

---

### Story 1.4: Next.js Frontend Application Setup

As a **frontend developer**,
I want **Next.js application configured with TypeScript, Tailwind CSS, and API client setup**,
So that **we have a modern, type-safe frontend foundation**.

**Acceptance Criteria:**

**Given** the backend API server is running
**When** the frontend application is initialized
**Then** Next.js 14+ app directory structure is configured
**And** TypeScript is enabled with strict mode
**And** Tailwind CSS is installed and configured with dark mode support
**And** API client library is configured to connect to backend (axios or fetch wrapper)
**And** Environment variable configuration for API base URL (NEXT_PUBLIC_API_URL)
**And** Layout component includes responsive navigation structure
**And** Error boundary components handle runtime errors gracefully

**And** developers can run `npm run dev` and see a functional homepage at localhost:3000

**And** API calls to backend health endpoint succeed

**Prerequisites:** Story 1.3 (backend server)

**Technical Notes:**
- Next.js 14+ with App Router (not Pages Router)
- Tailwind CSS 3.x with custom theme configuration
- shadcn/ui component library for consistent UI components (optional but recommended)
- React Query (TanStack Query) for server state management
- Environment variables: NEXT_PUBLIC_API_URL for backend connection
- Dark mode support using next-themes or Tailwind dark mode
- ESLint configured for React + Next.js best practices

---

### Story 1.5: Docker Containerization & Deployment Configuration

As a **DevOps engineer**,
I want **Docker containers for backend, frontend, and database with docker-compose orchestration**,
So that **the application can be deployed consistently across environments**.

**Acceptance Criteria:**

**Given** backend and frontend applications are functional
**When** Docker containers are built
**Then** Dockerfile exists for backend with multi-stage build (build + production stages)
**And** Dockerfile exists for frontend with multi-stage build optimized for Next.js
**And** docker-compose.yml orchestrates all services (backend, frontend, postgres)
**And** Environment variables are configurable via .env file
**And** Database migrations run automatically on container startup
**And** Health checks are configured for all services in docker-compose
**And** Volume mounts preserve database data between restarts

**And** developers can run `docker-compose up` and access the full application

**And** production build creates optimized images <500MB (backend) and <200MB (frontend)

**Prerequisites:** Story 1.3, Story 1.4

**Technical Notes:**
- Multi-stage Docker builds to minimize image size
- Use Node.js 20 Alpine base images for smaller footprint
- .dockerignore to exclude node_modules, .git, etc.
- docker-compose.yml with service dependencies configured correctly
- Database initialization script for pgvector extension
- Environment variable templating for different environments (dev, staging, prod)
- Consider .env.example file documenting all required environment variables
- Health check configuration for Docker Compose orchestration

---

### Story 1.6: API Key Authentication System

As a **backend developer**,
I want **API key generation, storage, and validation middleware for webhook ingestion**,
So that **only authorized services can upload API specs**.

**Acceptance Criteria:**

**Given** the backend server is running with database
**When** an API key is generated
**Then** API keys are cryptographically strong (256-bit random tokens)
**And** API keys are stored as salted hashes using bcrypt or Argon2
**And** Database table `api_keys` stores: id, key_hash, name, created_at, revoked_at
**And** Admin API endpoint `POST /api/v1/admin/keys` generates new API key (returns plaintext once)
**And** Admin API endpoint `DELETE /api/v1/admin/keys/:id` revokes an API key
**And** Authentication middleware validates Bearer token against stored hashes
**And** Invalid or revoked keys return 401 Unauthorized with error message
**And** Rate limiting per API key is enforced (100 requests/hour per key)

**And** authenticated requests include API key metadata in request context

**And** API key rotation workflow is documented

**Prerequisites:** Story 1.2, Story 1.3

**Technical Notes:**
- Use crypto.randomBytes(32) for key generation
- Bcrypt or Argon2 for hashing (Argon2 preferred for security)
- Database schema: `api_keys` table with unique constraint on key_hash
- Fastify middleware: verify Bearer token before protected route handlers
- Admin endpoints initially unprotected (will add admin auth in Phase 2)
- Rate limiting using @fastify/rate-limit with key-based store
- Document key generation API in OpenAPI spec
- Consider adding key metadata: team name, purpose, created_by

---

### Story 1.7: Observability & Monitoring Setup

As a **DevOps engineer**,
I want **structured logging, metrics exposure, and monitoring endpoints**,
So that **we can observe application health and debug issues in production**.

**Acceptance Criteria:**

**Given** the application is running
**When** requests are processed
**Then** all API requests are logged in structured JSON format with:
- Timestamp, correlation ID, HTTP method, path, status code, latency
- No PII or sensitive data in logs (API keys, auth tokens)
**And** Log levels (ERROR, WARN, INFO, DEBUG) are configurable via environment variable
**And** Metrics endpoint `GET /metrics` exposes Prometheus-compatible metrics:
- Request count by endpoint and status code
- Request latency histograms (p50, p95, p99)
- Active database connections
- Error rate by endpoint
**And** Health check endpoint `GET /health` returns detailed status:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-09T10:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```
**And** Application startup logs include version, environment, configuration summary

**And** Logs are written to stdout (Docker-friendly) for log aggregation

**Prerequisites:** Story 1.3, Story 1.5

**Technical Notes:**
- Use pino for structured logging (Fastify default, high performance)
- pino-pretty for human-readable logs in development
- Correlation ID middleware (fastify-request-context or custom)
- Prometheus metrics with prom-client library
- Metrics exposed on separate port (9090) or /metrics endpoint
- Health check should test database connectivity (query SELECT 1)
- Environment variable: LOG_LEVEL (default: info)
- Document observability setup in README (Grafana dashboard examples)
- Consider adding tracing with OpenTelemetry in future

---

## Epic 2: Webhook Ingestion & Spec Management

**Epic Goal:** Enable zero-effort API cataloging through automated CI/CD webhook integration, supporting OpenAPI spec validation, multi-environment tracking, version history, and async processing for large specs - establishing the foundation for automated catalog maintenance.

---

### Story 2.1: Database Schema for API Catalog

As a **backend developer**,
I want **database tables designed to store APIs, specs, endpoints, and version history**,
So that **we can persist and query the API catalog efficiently**.

**Acceptance Criteria:**

**Given** the database migration system is set up
**When** migrations are applied
**Then** the following tables exist with proper indexes:

**Table: `apis`**
- id (UUID, primary key)
- name (string, not null)
- team (string, nullable)
- owner (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- Index on name for fast lookup

**Table: `api_versions`**
- id (UUID, primary key)
- api_id (UUID, foreign key → apis.id)
- version (string, not null)
- environment (enum: dev, staging, prod)
- spec_json (JSONB, full OpenAPI spec)
- uploaded_at (timestamp)
- uploaded_by (string, references API key)
- Index on (api_id, environment)
- Index on uploaded_at for version history queries

**Table: `endpoints`**
- id (UUID, primary key)
- api_version_id (UUID, foreign key → api_versions.id)
- path (string, not null)
- method (enum: GET, POST, PUT, DELETE, PATCH)
- domain_embedding (vector(768), pgvector type)
- full_embedding (vector(768), pgvector type)
- deprecated (boolean, default false)
- Index on (api_version_id, path, method) for uniqueness
- HNSW index on domain_embedding for fast vector search
- HNSW index on full_embedding for fast vector search

**And** foreign key constraints enforce referential integrity

**And** database migrations are versioned and reversible

**Prerequisites:** Story 1.2 (database setup)

**Technical Notes:**
- Use UUIDs for globally unique identifiers
- JSONB for spec storage enables JSON querying without parsing
- pgvector HNSW indexes for <1s similarity search on large catalogs
- Enum types for environment and method for data consistency
- Consider partitioning api_versions by uploaded_at for large datasets
- Add check constraint: environment IN ('dev', 'staging', 'prod')
- Add check constraint: method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')

---

### Story 2.2: OpenAPI Spec Validation Service

As a **backend developer**,
I want **a service that validates OpenAPI specs before accepting them**,
So that **only well-formed specs are ingested into the catalog**.

**Acceptance Criteria:**

**Given** an OpenAPI spec is submitted
**When** validation runs
**Then** the service checks:
- Valid JSON structure
- OpenAPI version is 3.0.x or 3.1.x
- Required fields exist: openapi, info, paths
- All $refs are resolvable (internal or external)
- Paths object contains at least one endpoint
- Each operation has valid HTTP method

**And** validation errors return structured response:
```json
{
  "valid": false,
  "errors": [
    {
      "path": "paths./users.get",
      "message": "Missing required field: responses"
    }
  ]
}
```

**And** valid specs return `{ "valid": true }`

**And** $refs are resolved recursively before storage

**Prerequisites:** Story 1.3 (backend server)

**Technical Notes:**
- Use library: @apidevtools/openapi-schemas or @readme/openapi-parser
- Support both OpenAPI 3.0 and 3.1 spec versions
- Dereference all $refs before storing (bundle into single spec)
- Set reasonable limits: max 10MB spec size, max 1000 endpoints per spec
- Validate schema structures recursively
- Consider using Ajv for JSON schema validation
- Cache dereferenced specs to avoid re-resolution

---

### Story 2.3: Webhook API Endpoint for Spec Upload

As a **API consumer (CI/CD pipeline)**,
I want **a webhook endpoint to POST OpenAPI specs with API key authentication**,
So that **specs are automatically cataloged on every deployment**.

**Acceptance Criteria:**

**Given** the webhook endpoint is deployed
**When** a POST request is made to `/api/v1/specs/openapi`
**Then** the endpoint accepts:
```
POST /api/v1/specs/openapi?version=3.1&environment=prod
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "openapi": "3.1.0",
  "info": { ... },
  "paths": { ... }
}
```

**And** authentication middleware validates the API key
**And** spec validation service checks the spec structure
**And** invalid specs return 400 Bad Request with validation errors
**And** valid specs are stored in `api_versions` table
**And** API name is extracted from `info.title`
**And** team/owner are extracted from `info.x-team` and `info.x-owner` (if present)
**And** response returns 200 OK for small specs (<100 endpoints):
```json
{
  "api_id": "uuid",
  "version_id": "uuid",
  "status": "processed",
  "endpoints_count": 42
}
```

**And** response returns 202 Accepted for large specs (≥100 endpoints):
```json
{
  "job_id": "uuid",
  "status": "queued",
  "message": "Processing in background"
}
```

**Prerequisites:** Story 1.6 (API key auth), Story 2.1 (database schema), Story 2.2 (validation service)

**Technical Notes:**
- Query parameters: version (default 3.1), environment (default: dev)
- Extract API metadata from OpenAPI `info` object
- Use `info.title` as API name (sanitized)
- Support custom fields: `x-team`, `x-owner`, `x-canonical`
- Endpoint size threshold: 100 endpoints for sync vs async processing
- Rate limiting enforced via API key middleware (from Story 1.6)
- Return correlation ID in response for tracing
- Log all ingestion requests with API name, environment, spec size

---

### Story 2.4: Endpoint Extraction & Storage

As a **backend developer**,
I want **a service that extracts endpoints from OpenAPI specs and stores them in the database**,
So that **each route is individually queryable and searchable**.

**Acceptance Criteria:**

**Given** a validated OpenAPI spec is stored
**When** endpoint extraction runs
**Then** for each path/method combination in `paths` object:
- Extract path (e.g., `/api/v1/users/{id}`)
- Extract method (GET, POST, PUT, DELETE, PATCH)
- Extract request schema (parameters, requestBody)
- Extract response schema (responses.200.content)
- Create endpoint record in `endpoints` table
- Link to api_version_id

**And** endpoints are deduplicated (same path + method = one endpoint)

**And** deprecated endpoints are marked with `deprecated: true` if `deprecated: true` in OpenAPI spec

**And** extraction handles edge cases:
- Missing request/response schemas (nullable)
- Multiple response codes (prioritize 200, 201, then others)
- Nested $refs in schemas (fully resolved)

**And** extraction completes within 5 seconds for specs with 100 endpoints

**Prerequisites:** Story 2.3 (webhook endpoint)

**Technical Notes:**
- Iterate through `spec.paths` object
- For each path, iterate through operations (get, post, put, delete, patch)
- Extract schemas from:
  - parameters (query, path, header)
  - requestBody.content['application/json'].schema
  - responses[200].content['application/json'].schema
- Store raw schemas as JSONB for later embedding generation
- Handle OpenAPI 3.0 vs 3.1 differences (schema keywords)
- Set deprecated flag from operation.deprecated field
- Batch insert endpoints for performance (avoid N+1 queries)

---

### Story 2.5: Multi-Environment & Version History Support

As an **API owner**,
I want **to track which spec version is deployed in each environment (dev/staging/prod)**,
So that **consumers know which version to test against**.

**Acceptance Criteria:**

**Given** multiple specs are uploaded for the same API
**When** specs are uploaded with different environment parameters
**Then** each environment maintains its own current version:
- `/api/v1/specs/openapi?environment=dev` → stores as dev version
- `/api/v1/specs/openapi?environment=staging` → stores as staging version
- `/api/v1/specs/openapi?environment=prod` → stores as prod version

**And** API endpoint `GET /api/v1/apis/{id}/versions` returns all versions sorted by uploaded_at descending

**And** API endpoint `GET /api/v1/apis/{id}/versions?environment=prod` filters by environment

**And** version history shows:
```json
{
  "versions": [
    {
      "id": "uuid",
      "version": "1.2.0",
      "environment": "prod",
      "uploaded_at": "2025-11-09T10:00:00Z",
      "endpoints_count": 42
    }
  ]
}
```

**And** uploading a new spec to an environment replaces the previous version for that environment (while preserving history)

**Prerequisites:** Story 2.3, Story 2.4

**Technical Notes:**
- Store all versions in `api_versions` table (never delete old versions)
- Query for "current version per environment": SELECT * FROM api_versions WHERE environment = 'prod' ORDER BY uploaded_at DESC LIMIT 1
- Version string extracted from `info.version` in OpenAPI spec
- Consider adding API endpoint to compare two versions (future feature)
- Index on (api_id, environment, uploaded_at) for fast queries
- Display version progression: dev → staging → prod

---

### Story 2.6: Async Processing Queue for Large Specs

As a **backend developer**,
I want **background job processing for large spec uploads (≥100 endpoints)**,
So that **the webhook endpoint remains responsive even for large catalogs**.

**Acceptance Criteria:**

**Given** a large OpenAPI spec is uploaded (≥100 endpoints)
**When** the webhook endpoint receives the request
**Then** the spec is validated synchronously (fast check)
**And** endpoint returns 202 Accepted with job_id immediately (<500ms)
**And** spec processing is queued for background execution
**And** background worker processes the job:
- Extract endpoints
- Store in database
- Mark job as completed
**And** job status is queryable via `GET /api/v1/jobs/{job_id}`
**And** job statuses: queued, processing, completed, failed
**And** failed jobs include error details

**And** workers process jobs with exponential backoff on failure (max 3 retries)

**And** dead letter queue captures permanently failed jobs for investigation

**Prerequisites:** Story 2.4 (endpoint extraction)

**Technical Notes:**
- Use job queue library: BullMQ (Redis-backed) or pg-boss (Postgres-backed)
- BullMQ recommended for production (Redis provides better queue performance)
- pg-boss alternative if avoiding Redis dependency
- Job payload: { spec_json, api_id, version_id, environment }
- Worker pool: configurable concurrency (default 5 workers)
- Job timeout: 2 minutes per spec processing
- Retry strategy: exponential backoff (1s, 4s, 16s)
- Store job status in database or Redis (depending on queue choice)
- Emit job completion events for webhook callbacks (future feature)

---

### Story 2.7: Batch Upload Endpoint for CI/CD Optimization

As a **CI/CD pipeline administrator**,
I want **a batch upload endpoint to send multiple specs in one request**,
So that **organizations can efficiently catalog many APIs at once**.

**Acceptance Criteria:**

**Given** multiple OpenAPI specs need to be uploaded
**When** a POST request is made to `/api/v1/specs/batch`
**Then** the endpoint accepts:
```
POST /api/v1/specs/batch
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "specs": [
    {
      "spec": { ...openapi spec... },
      "environment": "prod",
      "version": "3.1"
    },
    { ... more specs ... }
  ]
}
```

**And** each spec is validated individually
**And** valid specs are queued for processing (all async)
**And** response returns array of job IDs:
```json
{
  "jobs": [
    { "index": 0, "job_id": "uuid1", "status": "queued" },
    { "index": 1, "job_id": "uuid2", "status": "queued" },
    { "index": 2, "error": "Invalid spec", "status": "failed" }
  ]
}
```

**And** batch processing handles partial failures gracefully (some succeed, some fail)

**And** batch endpoint enforces limit: max 50 specs per batch

**Prerequisites:** Story 2.6 (async processing)

**Technical Notes:**
- Process each spec in the batch independently
- Queue all valid specs as separate jobs (parallelizable)
- Return immediately with job IDs (don't wait for processing)
- Enforce batch size limit to prevent abuse: max 50 specs
- Log batch upload with count, API key, timestamp
- Consider adding batch status endpoint: GET /api/v1/batches/{batch_id}
- Rate limiting applies to batch endpoint (counts as 1 request per API key)
- Future enhancement: webhook callback URL for batch completion notification

---

## Epic 3: Semantic Discovery Engine

**Epic Goal:** Deliver the "magic moment" where developers find APIs by concept in seconds instead of weeks - using dual-embedding strategy (domain object + full endpoint), semantic search with vector similarity, and related endpoints discovery to prevent duplicate builds.

---

### Story 3.1: Schema Flattening Service for Embedding Generation

As a **backend developer**,
I want **a service that flattens OpenAPI request/response schemas into embedding-ready strings**,
So that **we can generate meaningful semantic embeddings from API schemas**.

**Acceptance Criteria:**

**Given** an OpenAPI endpoint schema (request + response)
**When** schema flattening runs
**Then** the service produces two flattened strings:

**Domain Object String (request + response schemas):**
- Flattens nested objects with dot notation: `user.profile.avatar`
- Indicates arrays with `[]`: `user.tags[]`
- Handles `anyOf`, `allOf`, `oneOf` by including all variants
- Recursively processes nested schemas
- Example output: `"user.id user.email user.name user.profile.avatar user.profile.bio[] user.tags[]"`

**Full Endpoint String (complete API signature):**
- Includes: method + path + headers + parameters + request schema + response schema
- Example output: `"GET /api/v1/users/{id} Authorization:Bearer response:user.id user.email user.name"`

**And** $refs are fully resolved before flattening

**And** schema validation detects circular references and handles gracefully (max depth limit)

**And** flattening handles edge cases:
- Missing schemas (returns empty string)
- Primitive types (string, number, boolean) included directly
- Enum values included as alternatives

**And** flattening completes within 100ms per endpoint schema

**Prerequisites:** Story 2.4 (endpoint extraction)

**Technical Notes:**
- Recursive schema traversal with max depth limit (10 levels) to prevent infinite loops
- Handle circular $refs by tracking visited schemas
- Flatten both requestBody and response schemas separately, then combine for domain embedding
- For full endpoint embedding, prepend: `${method} ${path} ${headers} ${params}`
- Use JSON Schema walker libraries or custom recursive function
- Store flattened strings temporarily for embedding generation (don't persist)
- Handle OpenAPI 3.0 vs 3.1 schema differences (nullable, type array)

---

### Story 3.2: Embedding Generation Service with Dual-Embedding Strategy

As a **backend developer**,
I want **an embedding generation service that creates two vector embeddings per endpoint**,
So that **we can search by both domain object similarity and full API signature similarity**.

**Acceptance Criteria:**

**Given** flattened schema strings from an endpoint
**When** embedding generation runs
**Then** two embeddings are generated per endpoint:

**Embedding 1: Domain Object Embedding (768 dimensions)**
- Input: Flattened request + response schemas
- Model: text-embedding-3-small or sentence-transformers (e.g., all-MiniLM-L6-v2)
- Stored in `endpoints.domain_embedding` column

**Embedding 2: Full Endpoint Embedding (768 dimensions)**
- Input: Method + path + parameters + headers + schemas
- Same model as domain embedding
- Stored in `endpoints.full_embedding` column

**And** embeddings are generated asynchronously (background job)

**And** generation uses batching for efficiency (max 100 endpoints per batch)

**And** embedding generation completes within 30 seconds per spec upload

**And** failed embedding generation retries with exponential backoff (max 3 attempts)

**And** embeddings are normalized vectors (magnitude = 1) for cosine similarity

**Prerequisites:** Story 3.1 (schema flattening), Story 2.6 (async processing)

**Technical Notes:**
- Embedding model options:
  - OpenAI text-embedding-3-small (768 dimensions, API-based, $0.00002/1K tokens)
  - sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, local, free)
  - Recommend local model for MVP to avoid API costs and latency
- Use Hugging Face transformers library or @xenova/transformers (JS)
- Batch embeddings for GPU efficiency (if using local model)
- Normalize vectors before storage: embedding / ||embedding||
- Queue embedding jobs alongside endpoint extraction (Story 2.6)
- Store embedding metadata: model_version, generated_at
- Consider caching embeddings for identical schemas

---

### Story 3.3: Semantic Search API with Vector Similarity

As a **developer**,
I want **a semantic search API that finds endpoints by concept using vector similarity**,
So that **I can discover APIs even when I don't know the exact naming**.

**Acceptance Criteria:**

**Given** the catalog contains endpoints with embeddings
**When** a search query is made to `GET /api/v1/search?q={query}`
**Then** the search API:
- Generates query embedding using the same embedding model
- Performs vector similarity search using pgvector:
  - Primary: Domain object embedding similarity (70% weight)
  - Secondary: Full endpoint embedding similarity (30% weight)
  - Combined relevance score = 0.7 * domain_score + 0.3 * full_score
- Returns top 20 results ranked by relevance score
- Response format:
```json
{
  "query": "customer email",
  "results": [
    {
      "endpoint_id": "uuid",
      "api_name": "User Service",
      "path": "/api/v1/users/{id}",
      "method": "GET",
      "relevance_score": 0.87,
      "team": "Platform Team",
      "environment": "prod"
    }
  ],
  "total": 42
}
```

**And** search latency is <1 second for catalogs with 10,000+ endpoints

**And** search supports pagination: `?q={query}&limit=20&offset=0`

**And** empty queries return 400 Bad Request

**Prerequisites:** Story 3.2 (embedding generation)

**Technical Notes:**
- Use pgvector cosine similarity operator: `<=>` for distance (convert to similarity: 1 - distance)
- HNSW index on both domain_embedding and full_embedding (created in Story 2.1)
- Weighted search query:
  ```sql
  SELECT *,
    (0.7 * (1 - (domain_embedding <=> $query_embedding_1))) +
    (0.3 * (1 - (full_embedding <=> $query_embedding_2))) AS relevance_score
  FROM endpoints
  ORDER BY relevance_score DESC
  LIMIT 20
  ```
- Generate two query embeddings (domain-focused and full-signature)
- Filter out deprecated endpoints by default (add `?include_deprecated=true` to show)
- Cache query embeddings for repeated searches (Redis or in-memory)
- Consider adding filters: `?team={team}&environment={env}`

---

### Story 3.4: Related Endpoints Discovery

As a **developer**,
I want **to see semantically similar endpoints when viewing an endpoint detail page**,
So that **I can discover duplicate or related APIs before building a new one**.

**Acceptance Criteria:**

**Given** an endpoint detail page is loaded
**When** related endpoints are requested via `GET /api/v1/endpoints/{id}/related`
**Then** the API returns:
- Top 10 semantically similar endpoints based on domain object embedding similarity
- Excludes the current endpoint itself
- Response format:
```json
{
  "endpoint_id": "uuid",
  "related": [
    {
      "endpoint_id": "uuid",
      "api_name": "Profile Service",
      "path": "/api/v2/profiles/{id}",
      "method": "GET",
      "similarity_score": 0.92,
      "reason": "Returns similar user profile data",
      "team": "Identity Team"
    }
  ]
}
```

**And** related endpoints search uses **domain object embedding only** (not full endpoint)

**And** similarity score threshold: only return endpoints with score > 0.7 (70% similar)

**And** response includes brief explanation: "Returns similar {domain_object} data"

**And** related endpoints are grouped by API (show max 2 endpoints per API to avoid clutter)

**Prerequisites:** Story 3.2 (embeddings), Story 3.3 (search API)

**Technical Notes:**
- Use pgvector similarity search on domain_embedding column only
- Query:
  ```sql
  SELECT *, (1 - (domain_embedding <=> $current_endpoint_embedding)) AS similarity
  FROM endpoints
  WHERE id != $current_id AND (1 - (domain_embedding <=> $current_endpoint_embedding)) > 0.7
  ORDER BY similarity DESC
  LIMIT 10
  ```
- Generate "reason" field by comparing schema overlaps (simple heuristic)
- Consider caching related endpoints (precompute for popular endpoints)
- Future enhancement: Use LLM to generate natural language explanation of similarity

---

### Story 3.5: API Catalog Browsing with Filtering

As a **developer**,
I want **to browse the complete API catalog with filtering and sorting options**,
So that **I can explore available APIs even without a specific search query**.

**Acceptance Criteria:**

**Given** the catalog contains multiple APIs
**When** a request is made to `GET /api/v1/apis`
**Then** the API returns paginated list of all APIs:
```json
{
  "apis": [
    {
      "id": "uuid",
      "name": "User Service",
      "team": "Platform Team",
      "owner": "tech-lead@example.com",
      "environments": ["dev", "staging", "prod"],
      "endpoints_count": 42,
      "last_updated": "2025-11-09T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

**And** supports filtering:
- `?team={team}` - Filter by team
- `?environment={env}` - Filter by environment (show APIs deployed to this env)
- `?owner={owner}` - Filter by owner email

**And** supports sorting:
- `?sort=name` (alphabetical, default)
- `?sort=updated` (most recently updated first)
- `?sort=endpoints_count` (largest APIs first)

**And** supports pagination: `?page=1&limit=20` (default limit: 20, max: 100)

**And** returns empty array if no APIs match filters

**Prerequisites:** Story 2.1 (database schema), Story 2.5 (multi-environment)

**Technical Notes:**
- Join apis with api_versions to get environment and last updated info
- Count endpoints per API: JOIN with endpoints table
- Use database indexes for fast filtering (team, owner, environment)
- Pagination: LIMIT/OFFSET for simple implementation, consider cursor-based for scale
- Return distinct APIs (one row per API, not per version)
- Add search parameter `?search={name}` for keyword filtering on API name (future)

---

### Story 3.6: Endpoint Detail View API

As a **developer**,
I want **to view complete details of a specific endpoint including schema, consumers, and metadata**,
So that **I can understand exactly what the endpoint does before using it**.

**Acceptance Criteria:**

**Given** an endpoint exists in the catalog
**When** a request is made to `GET /api/v1/endpoints/{id}`
**Then** the API returns complete endpoint details:
```json
{
  "id": "uuid",
  "api_id": "uuid",
  "api_name": "User Service",
  "path": "/api/v1/users/{id}",
  "method": "GET",
  "environment": "prod",
  "version": "1.2.0",
  "deprecated": false,
  "team": "Platform Team",
  "owner": "tech-lead@example.com",
  "schemas": {
    "parameters": [...],
    "request": {...},
    "response": {...}
  },
  "consumers": [
    {
      "endpoint_id": "uuid",
      "api_name": "Order Service",
      "path": "/api/v1/orders",
      "team": "Commerce Team"
    }
  ],
  "subscribers_count": 5,
  "last_updated": "2025-11-09T10:00:00Z"
}
```

**And** schemas include full OpenAPI schema objects (request, response, parameters)

**And** consumers list shows all endpoint subscriptions (from Epic 4)

**And** deprecated endpoints show deprecation warning

**And** 404 returned if endpoint ID not found

**Prerequisites:** Story 2.4 (endpoint storage), Story 3.2 (embeddings)

**Technical Notes:**
- JOIN endpoints with apis to get API metadata
- JOIN with api_versions to get version and environment
- Consumers field will be populated by Epic 4 (dependency tracking)
- Extract schemas from stored JSONB in api_versions.spec_json
- Parse spec to find endpoint's request/response schemas
- Consider caching endpoint details for popular endpoints
- Future: Add breaking change history to this view

---

### Story 3.7: Search Performance Optimization with HNSW Indexing

As a **DevOps engineer**,
I want **HNSW indexes optimized for sub-second search performance on large catalogs**,
So that **search remains fast even with 100,000+ endpoints**.

**Acceptance Criteria:**

**Given** the catalog contains 10,000+ endpoints with embeddings
**When** HNSW indexes are configured
**Then** pgvector HNSW indexes exist on:
- `endpoints.domain_embedding` with optimal parameters
- `endpoints.full_embedding` with optimal parameters

**And** index parameters are tuned for performance:
- `m` (max connections per layer): 16 (default)
- `ef_construction` (build-time accuracy): 64
- `ef_search` (query-time accuracy): 40

**And** search queries use index (verified with EXPLAIN ANALYZE)

**And** search latency benchmarks:
- 10,000 endpoints: <500ms (p95)
- 50,000 endpoints: <1s (p95)
- 100,000 endpoints: <2s (p95)

**And** index build time: <5 minutes for 100,000 embeddings

**And** database query plan shows index usage (not sequential scan)

**Prerequisites:** Story 3.3 (search API)

**Technical Notes:**
- Create HNSW indexes in migration:
  ```sql
  CREATE INDEX idx_endpoints_domain_embedding
  ON endpoints USING hnsw (domain_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
- Tune ef_search at query time: SET hnsw.ef_search = 40;
- Monitor index performance with pg_stat_statements
- HNSW is approximate nearest neighbor (trade accuracy for speed)
- Accuracy vs speed tradeoff: higher ef_search = more accurate but slower
- Consider VACUUM ANALYZE after bulk inserts to update index statistics
- Document recommended settings in deployment guide

---

## Epic 4: Dependency Tracking & Subscriptions

**Epic Goal:** Enable impact analysis by tracking endpoint-level dependencies (which services consume which APIs), providing visibility into who will be affected by breaking changes - essential for proactive change management.

---

### Story 4.1: Database Schema for Dependency Tracking

As a **backend developer**,
I want **database tables to store endpoint subscriptions and dependency relationships**,
So that **we can track which services depend on which APIs**.

**Acceptance Criteria:**

**Given** the database migration system is set up
**When** migrations are applied
**Then** the following table exists:

**Table: `endpoint_subscriptions`**
- id (UUID, primary key)
- provider_endpoint_id (UUID, foreign key → endpoints.id) - The API being consumed
- consumer_endpoint_id (UUID, foreign key → endpoints.id) - The service consuming it
- consumer_service_name (string, not null) - Name of consuming service
- consumer_team (string, nullable) - Team owning the consumer
- subscribed_at (timestamp, default now())
- created_by (string, references API key or user)
- Index on provider_endpoint_id for fast consumer lookups
- Index on consumer_endpoint_id for subscription management
- Unique constraint on (provider_endpoint_id, consumer_endpoint_id) to prevent duplicates

**And** foreign key constraints ensure referential integrity

**And** database migrations are versioned and reversible

**Prerequisites:** Story 2.1 (endpoints table)

**Technical Notes:**
- Endpoint subscriptions represent production dependencies: "ServiceA's endpoint X calls ServiceB's endpoint Y"
- Store both provider and consumer endpoint IDs for bidirectional queries
- Consumer service name extracted from API metadata or provided explicitly
- Future enhancement: Store subscription metadata (environment, criticality, SLA requirements)
- Consider adding subscription_status (active, deprecated) for lifecycle management
- Person subscriptions deferred to Phase 2 (requires user authentication system)

---

### Story 4.2: Endpoint Subscription API

As a **service owner**,
I want **an API to register that my service depends on another service's endpoint**,
So that **I receive notifications when breaking changes affect my dependencies**.

**Acceptance Criteria:**

**Given** two endpoints exist in the catalog (provider and consumer)
**When** a POST request is made to `/api/v1/subscriptions/endpoint`
**Then** the endpoint accepts:
```json
POST /api/v1/subscriptions/endpoint
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "provider_endpoint_id": "uuid",
  "consumer_endpoint_id": "uuid",
  "consumer_service_name": "Order Service",
  "consumer_team": "Commerce Team"
}
```

**And** subscription is stored in `endpoint_subscriptions` table

**And** duplicate subscriptions return 409 Conflict (already subscribed)

**And** response returns 201 Created:
```json
{
  "subscription_id": "uuid",
  "provider_endpoint": {
    "id": "uuid",
    "api_name": "User Service",
    "path": "/api/v1/users/{id}",
    "method": "GET"
  },
  "consumer_service": "Order Service",
  "subscribed_at": "2025-11-09T10:00:00Z"
}
```

**And** invalid endpoint IDs return 404 Not Found

**And** authentication via API key is required

**Prerequisites:** Story 1.6 (API key auth), Story 4.1 (subscription schema)

**Technical Notes:**
- Validate both provider_endpoint_id and consumer_endpoint_id exist before creating subscription
- Extract consumer metadata from request body
- Store created_by from authenticated API key context
- Rate limiting: 100 subscription requests per hour per API key
- Future enhancement: Bulk subscription endpoint for multiple dependencies
- Future enhancement: Auto-discovery of dependencies via traffic analysis (Phase 2)

---

### Story 4.3: List Subscriptions API

As a **service owner**,
I want **to view all subscriptions for my service (both as provider and consumer)**,
So that **I can understand my API dependencies and impact radius**.

**Acceptance Criteria:**

**Given** endpoint subscriptions exist
**When** a GET request is made to `/api/v1/subscriptions`
**Then** the API supports two query modes:

**Provider mode (who depends on my endpoints):**
```
GET /api/v1/subscriptions?provider_endpoint_id={uuid}

Response:
{
  "provider_endpoint": { "id": "uuid", "path": "/api/v1/users/{id}", "method": "GET" },
  "consumers": [
    {
      "subscription_id": "uuid",
      "consumer_endpoint_id": "uuid",
      "consumer_service_name": "Order Service",
      "consumer_team": "Commerce Team",
      "subscribed_at": "2025-11-09T10:00:00Z"
    }
  ],
  "total_consumers": 5
}
```

**Consumer mode (what endpoints do I depend on):**
```
GET /api/v1/subscriptions?consumer_endpoint_id={uuid}

Response:
{
  "consumer_endpoint": { "id": "uuid", "path": "/api/v1/orders", "method": "POST" },
  "dependencies": [
    {
      "subscription_id": "uuid",
      "provider_endpoint_id": "uuid",
      "provider_api_name": "User Service",
      "provider_path": "/api/v1/users/{id}",
      "provider_team": "Platform Team",
      "subscribed_at": "2025-11-09T10:00:00Z"
    }
  ],
  "total_dependencies": 3
}
```

**And** pagination is supported: `?limit=20&offset=0`

**And** 400 Bad Request if neither query parameter is provided

**Prerequisites:** Story 4.2 (subscription API)

**Technical Notes:**
- Query mode determined by presence of provider_endpoint_id vs consumer_endpoint_id parameter
- JOIN with endpoints table to enrich response with API metadata
- Support both query modes in single endpoint for simplicity
- Future enhancement: Filter by team, environment, subscription date
- Consider caching subscription counts for popular endpoints

---

### Story 4.4: Delete Subscription API

As a **service owner**,
I want **to remove a subscription when my service no longer depends on an endpoint**,
So that **I stop receiving notifications for changes I don't care about**.

**Acceptance Criteria:**

**Given** an endpoint subscription exists
**When** a DELETE request is made to `/api/v1/subscriptions/{subscription_id}`
**Then** the subscription is removed from the database

**And** response returns 204 No Content on success

**And** 404 Not Found if subscription ID doesn't exist

**And** authentication via API key is required

**And** only the subscription creator (same API key) or admin can delete (MVP: no ownership check, add in Phase 2)

**Prerequisites:** Story 4.2 (subscription API)

**Technical Notes:**
- Soft delete vs hard delete: Hard delete for MVP (remove record)
- Future enhancement: Soft delete with deleted_at timestamp for audit trail
- Future enhancement: Ownership validation (only creator or admin can delete)
- Log subscription deletions for audit purposes
- Consider adding bulk delete endpoint for cleanup

---

### Story 4.5: Consumer Visibility on Endpoint Detail View

As a **API owner**,
I want **to see all consumers of my endpoint on the endpoint detail page**,
So that **I know the impact radius before making changes**.

**Acceptance Criteria:**

**Given** an endpoint has subscribers
**When** a GET request is made to `/api/v1/endpoints/{id}`
**Then** the response includes consumer information:
```json
{
  "id": "uuid",
  "path": "/api/v1/users/{id}",
  "method": "GET",
  "consumers": [
    {
      "endpoint_id": "uuid",
      "service_name": "Order Service",
      "api_name": "Order API",
      "path": "/api/v1/orders",
      "team": "Commerce Team",
      "environment": "prod"
    },
    {
      "endpoint_id": "uuid",
      "service_name": "Analytics Service",
      "api_name": "Analytics API",
      "path": "/api/v1/analytics/users",
      "team": "Data Team",
      "environment": "prod"
    }
  ],
  "consumers_count": 2,
  "subscribers_count": 2
}
```

**And** consumers are sorted by environment priority: prod > staging > dev

**And** empty consumers array returned if no subscriptions exist

**And** consumer information enriched with API metadata (name, team, environment)

**Prerequisites:** Story 3.6 (endpoint detail API), Story 4.2 (subscription API)

**Technical Notes:**
- Enhance existing GET /api/v1/endpoints/{id} endpoint (from Story 3.6)
- JOIN endpoint_subscriptions with endpoints table to get consumer details
- Filter by environment: show only prod consumers by default, add ?include_all_envs=true for dev/staging
- Count distinct consumers for consumers_count field
- Cache consumer lists for frequently accessed endpoints
- Future enhancement: Show subscription health (last call timestamp, error rate)

---

### Story 4.6: Dependency Graph Visualization Data API

As a **platform team member**,
I want **an API that provides dependency graph data for visualization**,
So that **I can understand the API landscape's dependency relationships**.

**Acceptance Criteria:**

**Given** multiple endpoint subscriptions exist
**When** a GET request is made to `/api/v1/dependencies/graph`
**Then** the API returns graph data in node-link format:
```json
{
  "nodes": [
    {
      "id": "uuid",
      "type": "endpoint",
      "api_name": "User Service",
      "path": "/api/v1/users/{id}",
      "method": "GET",
      "team": "Platform Team",
      "consumers_count": 5
    }
  ],
  "links": [
    {
      "source": "consumer_endpoint_id",
      "target": "provider_endpoint_id",
      "relationship": "depends_on"
    }
  ]
}
```

**And** supports filtering by:
- `?api_id={uuid}` - Show graph for specific API
- `?team={team}` - Show graph for specific team's APIs
- `?environment={env}` - Filter by environment

**And** graph data is suitable for D3.js, Cytoscape.js, or similar visualization libraries

**And** response includes metadata: total_nodes, total_links, max_depth

**And** circular dependencies are detected and flagged

**Prerequisites:** Story 4.2 (subscription API)

**Technical Notes:**
- Return data in standard graph format: nodes + links (edges)
- Node properties: id, label, type, metadata
- Link properties: source, target, relationship type
- Implement cycle detection algorithm (DFS or Tarjan's)
- Limit graph size: max 500 nodes by default (prevent browser overload)
- Consider caching graph data for large catalogs (regenerate on subscription changes)
- Future enhancement: Add graph metrics (centrality, clustering coefficient)
- Frontend visualization will be implemented in Epic 7 (Phase 2 feature)

---

### Story 4.7: Impact Analysis for Breaking Changes

As a **API owner**,
I want **to see which consumers will be affected when I upload a new spec with breaking changes**,
So that **I can proactively notify them before deployment**.

**Acceptance Criteria:**

**Given** a new spec is uploaded with breaking changes detected
**When** impact analysis runs
**Then** the system identifies affected consumers:
- Query all subscriptions for changed endpoints (provider_endpoint_id)
- Return list of consumer services and teams
- Include consumer contact information (team, owner email)

**And** webhook response includes impact preview:
```json
{
  "api_id": "uuid",
  "version_id": "uuid",
  "breaking_changes": [
    {
      "endpoint_id": "uuid",
      "path": "/api/v1/users/{id}",
      "method": "GET",
      "change_type": "removed_field",
      "affected_consumers": [
        {
          "service_name": "Order Service",
          "team": "Commerce Team",
          "owner": "commerce-team@example.com"
        }
      ],
      "consumers_count": 2
    }
  ],
  "total_affected_consumers": 5
}
```

**And** impact data is stored for notification system (Epic 5)

**And** impact analysis completes within 5 seconds per spec upload

**Prerequisites:** Story 4.2 (subscriptions), Story 2.4 (endpoint extraction)

**Technical Notes:**
- Impact analysis triggered by webhook upload (Epic 2) when breaking changes detected (Epic 5)
- Query endpoint_subscriptions where provider_endpoint_id IN (changed_endpoints)
- Aggregate consumers by service and team
- Extract owner email from API metadata or team directory (Phase 2)
- Store impact analysis results for notification dispatch
- Future enhancement: Calculate criticality score (prod > staging > dev, SLA requirements)
- This story prepares data for Epic 5 (notification delivery)

---

## Epic 5: Breaking Change Detection & Notifications

**Epic Goal:** Prevent production incidents through automatic detection of breaking changes via spec comparison, classification of change severity (RED/YELLOW/GREEN), impact analysis showing affected consumers, and email notifications to dependent service owners - delivering proactive change management.

---

### Story 5.1: Database Schema for Change Tracking

As a **backend developer**,
I want **database tables to store breaking changes, change history, and notification status**,
So that **we can track all API changes and notification delivery**.

**Acceptance Criteria:**

**Given** the database migration system is set up
**When** migrations are applied
**Then** the following tables exist:

**Table: `api_changes`**
- id (UUID, primary key)
- api_version_id (UUID, foreign key → api_versions.id)
- previous_version_id (UUID, foreign key → api_versions.id, nullable)
- severity (enum: breaking, potentially_breaking, non_breaking)
- changes_json (JSONB, array of change objects)
- detected_at (timestamp, default now())
- total_affected_consumers (integer)
- Index on (api_version_id, severity)
- Index on detected_at for recent changes queries

**Table: `change_notifications`**
- id (UUID, primary key)
- change_id (UUID, foreign key → api_changes.id)
- recipient_email (string, not null)
- recipient_service (string, not null)
- recipient_team (string, nullable)
- notification_type (enum: email)
- sent_at (timestamp, nullable)
- delivery_status (enum: pending, sent, failed)
- error_message (text, nullable for failed deliveries)
- Index on (change_id, delivery_status)
- Index on sent_at for delivery tracking

**And** foreign key constraints enforce referential integrity

**And** database migrations are versioned and reversible

**Prerequisites:** Story 2.1 (api_versions table)

**Technical Notes:**
- changes_json stores array of change objects from diff library
- Severity enum values: 'breaking', 'potentially_breaking', 'non_breaking'
- Delivery status: 'pending' (queued), 'sent' (delivered), 'failed' (retry needed)
- Store error_message for debugging failed notifications
- Future enhancement: Add acknowledged_at, acknowledged_by for consumer acknowledgment (Phase 2)
- Consider partitioning api_changes by detected_at for large datasets

---

### Story 5.2: OpenAPI Spec Diff Service

As a **backend developer**,
I want **a service that compares two OpenAPI specs and detects breaking changes**,
So that **we can automatically identify when APIs introduce breaking changes**.

**Acceptance Criteria:**

**Given** a new OpenAPI spec is uploaded
**When** a previous version exists for the same API
**Then** the diff service:
- Compares new spec against previous spec
- Uses `@pb33f/openapi-changes` library for diff analysis
- Classifies changes into severity levels:

**RED (Breaking):**
- Removed endpoints
- Removed required fields from request/response
- Changed field types (string → number)
- Removed enum values
- Stricter validation (new required fields)

**YELLOW (Potentially Breaking):**
- Changed response status codes
- New required headers
- Rate limit changes
- Behavioral changes in descriptions

**GREEN (Non-breaking):**
- New endpoints
- New optional fields
- Removed validation rules (more permissive)
- Documentation updates

**And** diff output includes structured change objects:
```json
{
  "changes": [
    {
      "type": "field_removed",
      "severity": "breaking",
      "path": "paths./users.get.responses.200.content.application/json.schema.properties.email",
      "description": "Removed required field 'email' from response schema",
      "endpoint": "/users",
      "method": "GET"
    }
  ],
  "summary": {
    "breaking": 2,
    "potentially_breaking": 1,
    "non_breaking": 5
  }
}
```

**And** diff completes within 10 seconds for specs with 100+ endpoints

**And** diff handles edge cases: first upload (no previous version), identical specs (no changes)

**Prerequisites:** Story 2.5 (version history)

**Technical Notes:**
- Use @pb33f/openapi-changes library (mature, well-tested)
- Alternative libraries to evaluate: openapi-diff, oasdiff
- Parse diff output into structured change objects
- Map library's change types to RED/YELLOW/GREEN classification
- Store full diff output in api_changes.changes_json
- Handle schema evolution: OpenAPI 3.0 → 3.1 migrations
- Cache diff results to avoid recomputation

---

### Story 5.3: Breaking Change Detection Integration

As a **backend developer**,
I want **breaking change detection automatically triggered on spec upload**,
So that **changes are detected without manual intervention**.

**Acceptance Criteria:**

**Given** a new spec is uploaded via webhook endpoint
**When** spec processing completes (after endpoint extraction)
**Then** breaking change detection runs automatically:
- Query previous version for the same API + environment
- Run spec diff service (Story 5.2)
- Store results in `api_changes` table
- Calculate total affected consumers (from endpoint_subscriptions)

**And** webhook response includes breaking change summary:
```json
{
  "api_id": "uuid",
  "version_id": "uuid",
  "status": "processed",
  "breaking_changes_detected": true,
  "changes_summary": {
    "breaking": 2,
    "potentially_breaking": 1,
    "non_breaking": 5,
    "affected_consumers": 12
  }
}
```

**And** if no previous version exists, skip diff (first upload)

**And** if no changes detected, store record with empty changes array

**And** breaking change detection runs asynchronously (part of background job from Story 2.6)

**Prerequisites:** Story 2.6 (async processing), Story 5.2 (diff service), Story 4.7 (impact analysis)

**Technical Notes:**
- Integrate into spec processing workflow (after endpoint extraction)
- Query previous version: SELECT * FROM api_versions WHERE api_id = $api_id AND environment = $environment ORDER BY uploaded_at DESC LIMIT 1 OFFSET 1
- Run diff only if previous version exists
- Store api_changes record with severity, changes_json, affected_consumers count
- Trigger notification workflow if breaking or potentially_breaking changes detected
- Log all change detection runs for audit

---

### Story 5.4: SMTP Email Service Configuration

As a **DevOps engineer**,
I want **SMTP email service configured for sending breaking change notifications**,
So that **consumers receive timely alerts about API changes**.

**Acceptance Criteria:**

**Given** the backend application is deployed
**When** email service is initialized
**Then** SMTP client is configured with environment variables:
- SMTP_HOST (e.g., smtp.sendgrid.net, smtp.mailgun.org)
- SMTP_PORT (default: 587 for TLS)
- SMTP_USER (SMTP username)
- SMTP_PASSWORD (SMTP password or API key)
- SMTP_FROM_EMAIL (sender email address)
- SMTP_FROM_NAME (sender display name, default: "Perrache API Catalog")

**And** SMTP connection is validated on application startup

**And** health check endpoint reports SMTP status

**And** email sending uses TLS encryption (STARTTLS)

**And** email templates support HTML and plain text fallback

**And** retry logic handles transient SMTP failures (3 retries with exponential backoff)

**Prerequisites:** Story 1.3 (backend server), Story 1.7 (observability)

**Technical Notes:**
- Use email library: nodemailer (Node.js standard)
- Support popular SMTP providers: SendGrid, Mailgun, AWS SES, generic SMTP
- Store SMTP credentials securely (environment variables, not hardcoded)
- Validate SMTP config on startup: attempt connection test
- Use connection pooling for performance
- Log email send attempts with correlation IDs
- Rate limit email sending to prevent spam flags (max 100/hour default)
- Future enhancement: Support multiple notification channels (Slack, webhooks)

---

### Story 5.5: Breaking Change Email Notification Service

As a **backend developer**,
I want **an email notification service that sends breaking change alerts to affected consumers**,
So that **service owners are proactively informed of changes impacting their dependencies**.

**Acceptance Criteria:**

**Given** breaking changes are detected with affected consumers
**When** notification service runs
**Then** emails are sent to owners of dependent services:

**Email content includes:**
- API name and version
- Environment (dev/staging/prod)
- Summary of breaking changes (count by severity)
- Detailed list of breaking changes with affected endpoints
- List of consumer endpoints impacted
- Link to API detail page in catalog
- Contact information for API owner

**Email template:**
```
Subject: [Perrache Alert] Breaking Changes in {API_NAME} API ({ENVIRONMENT})

Hi {CONSUMER_TEAM},

Breaking changes have been detected in the {API_NAME} API that may affect your service.

API: {API_NAME} v{VERSION}
Environment: {ENVIRONMENT}
Uploaded: {TIMESTAMP}

Breaking Changes Detected:
- 2 breaking changes (RED)
- 1 potentially breaking change (YELLOW)

Affected Endpoints:
1. GET /api/v1/users/{id}
   - Removed required field 'email' from response

Your Dependent Endpoints:
- Order Service: POST /api/v1/orders (depends on GET /api/v1/users/{id})

View full details: {CATALOG_URL}/apis/{API_ID}
Contact API owner: {API_OWNER_EMAIL}

---
This notification was sent by Perrache API Catalog.
```

**And** emails are sent to service owner email (extracted from consumer service metadata)

**And** one email per affected service (not per endpoint)

**And** email notifications are queued and sent asynchronously

**And** delivery status is tracked in `change_notifications` table

**And** failed deliveries are retried (max 3 attempts with exponential backoff)

**Prerequisites:** Story 5.3 (change detection), Story 5.4 (SMTP service), Story 4.7 (impact analysis)

**Technical Notes:**
- Extract recipient email from consumer service metadata (owner field)
- Group affected endpoints by consumer service (one email per service)
- Use HTML email template with plain text fallback
- Template variables: API_NAME, VERSION, ENVIRONMENT, TIMESTAMP, BREAKING_CHANGES, AFFECTED_ENDPOINTS, CATALOG_URL, API_OWNER_EMAIL
- Queue notification jobs via background job system (Story 2.6)
- Store notification record in change_notifications table before sending
- Update delivery_status after send attempt (sent/failed)
- Log all email sends with recipient, timestamp, delivery status
- Future enhancement: Allow users to customize notification preferences (Phase 2)

---

### Story 5.6: Risk Flagging for Out-of-Date Consumers

As a **governance team member**,
I want **consumers automatically marked as "RISK" if they don't update after breaking changes**,
So that **we have visibility into services running outdated API versions**.

**Acceptance Criteria:**

**Given** breaking changes were deployed to production
**When** risk assessment runs (24 hours after notification sent)
**Then** the system identifies at-risk consumers:
- Check if consumer service has updated its dependency
- Mark consumers still using old version as "RISK"
- Store risk flag in database

**And** API endpoint `GET /api/v1/governance/risk` returns at-risk consumers:
```json
{
  "at_risk_consumers": [
    {
      "consumer_service": "Order Service",
      "consumer_team": "Commerce Team",
      "provider_api": "User Service",
      "provider_endpoint": "GET /api/v1/users/{id}",
      "breaking_change_deployed": "2025-11-09T10:00:00Z",
      "notification_sent": "2025-11-09T10:30:00Z",
      "days_since_notification": 3,
      "risk_level": "high"
    }
  ],
  "total_at_risk": 5
}
```

**And** risk flags are cleared when consumer updates dependency (re-subscribes to new version)

**And** governance dashboard shows risk summary (Epic 7)

**And** risk flagging is non-blocking (teams manage their own timeline)

**Prerequisites:** Story 5.5 (notifications), Story 4.2 (subscriptions)

**Technical Notes:**
- Add risk_flag field to endpoint_subscriptions table (boolean, default false)
- Schedule background job to assess risk 24h after breaking change deployment
- Risk assessment logic: subscription still points to old version after breaking change
- Calculate days_since_notification from change_notifications.sent_at
- Risk level calculation: high (>7 days), medium (3-7 days), low (<3 days)
- Allow manual risk flag override (governance admin action, Phase 2)
- Future enhancement: Automated reminder emails at 3 days, 7 days

---

### Story 5.7: Change History API

As a **developer**,
I want **to view the complete change history for an API**,
So that **I can understand how the API has evolved over time**.

**Acceptance Criteria:**

**Given** an API has version history with detected changes
**When** a GET request is made to `/api/v1/apis/{id}/changes`
**Then** the API returns paginated change history:
```json
{
  "api_id": "uuid",
  "api_name": "User Service",
  "changes": [
    {
      "id": "uuid",
      "version": "1.3.0",
      "environment": "prod",
      "detected_at": "2025-11-09T10:00:00Z",
      "severity": "breaking",
      "changes_count": {
        "breaking": 2,
        "potentially_breaking": 1,
        "non_breaking": 5
      },
      "affected_consumers": 12,
      "changes_detail": [
        {
          "type": "field_removed",
          "severity": "breaking",
          "endpoint": "GET /api/v1/users/{id}",
          "description": "Removed required field 'email'"
        }
      ]
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

**And** supports filtering by:
- `?severity=breaking` - Show only breaking changes
- `?environment=prod` - Filter by environment

**And** supports pagination: `?page=1&limit=20`

**And** changes are sorted by detected_at descending (most recent first)

**And** 404 returned if API ID not found

**Prerequisites:** Story 5.3 (change detection)

**Technical Notes:**
- Query api_changes table joined with api_versions
- Filter by api_id from api_versions relationship
- Include summary counts (breaking, potentially_breaking, non_breaking)
- Expand changes_detail from changes_json JSONB column
- Cache change history for frequently accessed APIs
- Future enhancement: RSS feed for change notifications
- Future enhancement: Webhook callback for change events

---

## Epic 6: Frontend - Search & Discovery Interface

**Epic Goal:** Provide an intuitive, developer-first UI for API discovery with instant semantic search, catalog browsing, endpoint detail views, and related endpoints sidebar - enabling developers to find and understand APIs in seconds.

---

### Story 6.1: Homepage with Semantic Search Interface

As a **developer**,
I want **a homepage with a prominent search bar for semantic API discovery**,
So that **I can quickly search for APIs by concept without knowing exact names**.

**Acceptance Criteria:**

**Given** the frontend application is running
**When** a user visits the homepage
**Then** the page displays:
- Hero section with prominent search bar (large, centered)
- Search placeholder text: "Search APIs by concept... (e.g., 'user email', 'payment processing')"
- Tagline explaining semantic search: "Find APIs by what they do, not what they're called"
- Quick stats: Total APIs, Total Endpoints, Recent Changes
- Recent API additions (last 5 APIs uploaded)
- Popular APIs (most subscribed/searched)

**And** search bar supports:
- Autocomplete suggestions as user types (debounced)
- Enter key to trigger search
- Minimum 3 characters to search
- Loading spinner during search

**And** search is instant: results appear within 1 second

**And** responsive design: works on desktop, tablet, mobile

**And** dark mode support

**Prerequisites:** Story 1.4 (Next.js frontend), Story 3.3 (search API)

**Technical Notes:**
- Next.js App Router with server components for initial page load
- Client component for interactive search bar
- React Query for search API calls with caching
- Debounce search input (300ms) to avoid excessive API calls
- Show loading state with skeleton UI
- Hero section with gradient background, large search input
- Use shadcn/ui components for consistent design
- Tailwind CSS for styling
- Dark mode with next-themes

---

### Story 6.2: Search Results Page with Relevance Ranking

As a **developer**,
I want **to see search results ranked by relevance with clear API metadata**,
So that **I can quickly identify the most relevant endpoints**.

**Acceptance Criteria:**

**Given** a user has entered a search query
**When** search results are displayed
**Then** the results page shows:
- Search query at the top
- Total results count
- Results list with cards showing:
  - Endpoint path and method (GET, POST, etc.) with color coding
  - API name and team
  - Relevance score (percentage or stars)
  - Environment badge (dev/staging/prod)
  - Brief description (from OpenAPI summary)
  - "View Details" button

**And** results are sorted by relevance score (highest first)

**And** pagination: 20 results per page with "Load More" button

**And** filter sidebar:
- Filter by team
- Filter by environment
- Filter by method (GET, POST, PUT, DELETE, PATCH)

**And** empty state: "No results found for '{query}'. Try different keywords."

**And** method badges use color coding:
- GET: blue
- POST: green
- PUT: orange
- DELETE: red
- PATCH: purple

**Prerequisites:** Story 6.1 (search interface), Story 3.3 (search API)

**Technical Notes:**
- Fetch search results from GET /api/v1/search?q={query}
- Use React Query for caching and background refetching
- Infinite scroll or "Load More" pagination
- Filter state managed in URL query params for shareability
- Method badge component with consistent color scheme
- Responsive grid layout: 1 column mobile, 2 columns tablet, 3 columns desktop
- Empty state with helpful suggestions

---

### Story 6.3: Endpoint Detail Page

As a **developer**,
I want **to view complete endpoint details including schema, consumers, and breaking change history**,
So that **I can understand exactly how to use the API**.

**Acceptance Criteria:**

**Given** a user clicks on an endpoint from search results
**When** the endpoint detail page loads
**Then** the page displays:

**Header Section:**
- Endpoint path and method with color-coded badge
- API name with link to API detail page
- Team and owner information
- Environment indicator
- Deprecation warning (if deprecated)

**Schema Section:**
- Request parameters (path, query, header)
- Request body schema with JSON/YAML viewer
- Response schema with JSON/YAML viewer
- Syntax highlighting for schemas
- Copy button for schema examples

**Consumers Section:**
- List of services consuming this endpoint
- Consumer team and service name
- Total consumer count

**Breaking Changes Section:**
- Recent breaking changes (last 5)
- Change severity badges (RED/YELLOW/GREEN)
- Change descriptions
- Link to full change history

**Actions:**
- "Copy curl command" button
- "Subscribe to changes" button (Phase 2 - requires auth)
- "Report issue" link to API owner

**And** page is shareable (unique URL per endpoint)

**And** breadcrumb navigation: Home > Search > API > Endpoint

**Prerequisites:** Story 3.6 (endpoint detail API), Story 4.5 (consumer visibility), Story 5.7 (change history)

**Technical Notes:**
- Fetch endpoint details from GET /api/v1/endpoints/{id}
- Use syntax highlighter: react-syntax-highlighter or Prism
- Schema viewer with collapsible sections for nested objects
- Copy to clipboard functionality for curl commands, schemas
- Breadcrumb component for navigation context
- Responsive layout: single column mobile, two column desktop
- Generate curl command from endpoint metadata

---

### Story 6.4: Related Endpoints Sidebar

As a **developer**,
I want **to see semantically similar endpoints on the endpoint detail page**,
So that **I can discover alternatives or duplicates before building**.

**Acceptance Criteria:**

**Given** a user is viewing an endpoint detail page
**When** related endpoints are loaded
**Then** a sidebar displays:
- "Related Endpoints" heading
- Top 5 semantically similar endpoints
- Each related endpoint shows:
  - Path and method
  - API name
  - Similarity score (percentage or visual indicator)
  - Brief reason: "Returns similar user data"
  - Link to endpoint detail

**And** related endpoints are sorted by similarity score (highest first)

**And** similarity threshold: only show endpoints >70% similar

**And** empty state: "No similar endpoints found"

**And** sidebar is sticky (stays visible when scrolling on desktop)

**And** sidebar collapses on mobile (accordion or expandable section)

**Prerequisites:** Story 3.4 (related endpoints API), Story 6.3 (endpoint detail page)

**Technical Notes:**
- Fetch related endpoints from GET /api/v1/endpoints/{id}/related
- Display similarity score as percentage or progress bar
- Sticky sidebar using CSS position: sticky
- Mobile: collapse into expandable section below main content
- Visual indicator for high similarity (>90%): highlight with warning color
- Link each related endpoint to its detail page
- Future enhancement: "Compare schemas" feature for side-by-side view

---

### Story 6.5: API Catalog Browse Page

As a **developer**,
I want **to browse the complete catalog of APIs with filtering and sorting**,
So that **I can explore available APIs even without a specific search query**.

**Acceptance Criteria:**

**Given** a user navigates to /catalog
**When** the catalog page loads
**Then** the page displays:
- Page title: "API Catalog"
- Total API count
- Grid of API cards showing:
  - API name
  - Team and owner
  - Endpoint count
  - Environments deployed (badges: dev, staging, prod)
  - Last updated timestamp
  - "View API" button

**And** filter controls:
- Filter by team (dropdown or autocomplete)
- Filter by environment (checkboxes: dev, staging, prod)
- Filter by owner

**And** sort controls:
- Sort by name (A-Z, Z-A)
- Sort by last updated (newest first, oldest first)
- Sort by endpoint count (largest first, smallest first)

**And** pagination: 20 APIs per page with page numbers

**And** search box: filter catalog by API name (keyword search)

**And** responsive grid: 1 column mobile, 2 columns tablet, 3+ columns desktop

**Prerequisites:** Story 3.5 (catalog browsing API)

**Technical Notes:**
- Fetch catalog from GET /api/v1/apis with filter/sort params
- Filter and sort state managed in URL query params
- Use React Query for caching
- API card component with consistent design
- Environment badges with color coding: dev (yellow), staging (blue), prod (green)
- Pagination component with page numbers + prev/next
- Keyword search debounced (300ms)
- Empty state: "No APIs match your filters"

---

### Story 6.6: API Detail Page

As a **developer**,
I want **to view all endpoints for a specific API with metadata and version history**,
So that **I can understand the complete API surface**.

**Acceptance Criteria:**

**Given** a user clicks on an API from the catalog
**When** the API detail page loads
**Then** the page displays:

**Header Section:**
- API name
- Team and owner with contact link
- Environments deployed with version numbers
- Last updated timestamp
- Total endpoint count

**Endpoints List:**
- Grouped by tag or resource (if available in OpenAPI spec)
- Each endpoint shows:
  - Path and method
  - Summary description
  - Deprecation indicator
  - Consumer count
  - Link to endpoint detail

**Version History Section:**
- Recent versions (last 10) with timestamps
- Environment progression (dev → staging → prod)
- Breaking change indicators
- Link to version comparison (future feature)

**Actions:**
- "Download OpenAPI Spec" button (JSON/YAML)
- "View Change History" link
- "Subscribe to API" button (Phase 2)

**And** endpoints are searchable within the page (filter box)

**And** endpoints are sortable by path, method, consumer count

**Prerequisites:** Story 2.5 (version history API), Story 3.6 (endpoint detail API)

**Technical Notes:**
- Fetch API details from GET /api/v1/apis/{id}
- Fetch endpoints from GET /api/v1/apis/{id}/endpoints (new endpoint needed)
- Group endpoints by OpenAPI tags if available
- Accordion or tabs for endpoint grouping
- Version timeline visualization (horizontal timeline)
- Download spec as JSON or YAML (offer both formats)
- In-page search filters endpoints client-side
- Link to change history page (Epic 5, Story 5.7)

---

### Story 6.7: Dark Mode Support

As a **developer**,
I want **dark mode support across the entire application**,
So that **I can use the catalog comfortably in low-light environments**.

**Acceptance Criteria:**

**Given** the frontend application supports themes
**When** a user toggles dark mode
**Then** the entire application switches to dark theme:
- Dark background colors (not pure black, use dark grays)
- Light text colors with sufficient contrast (WCAG AA compliant)
- Adjusted component colors (cards, buttons, badges)
- Syntax highlighting adapted for dark backgrounds
- Icon colors inverted appropriately

**And** theme preference is persisted:
- Stored in localStorage
- Remembered across sessions
- Applied immediately on page load (no flash of wrong theme)

**And** theme toggle control:
- Icon button in header/navigation
- Sun icon (light mode) / Moon icon (dark mode)
- Smooth transition between themes

**And** system preference detection:
- Respects user's OS dark mode preference on first visit
- Manual toggle overrides system preference

**Prerequisites:** Story 1.4 (Next.js frontend), Story 6.1 (homepage)

**Technical Notes:**
- Use next-themes library for theme management
- Tailwind CSS dark mode configuration (class strategy)
- Define color palette for both light and dark themes
- Use CSS variables for theme-specific colors
- Ensure syntax highlighter supports dark theme (react-syntax-highlighter themes)
- Test contrast ratios for accessibility (WCAG AA: 4.5:1 for text)
- Persist theme in localStorage with key "theme"
- Detect system preference with prefers-color-scheme media query
- Avoid flash of unstyled content with theme script in <head>

---

## Epic 7: Frontend - Governance & Breaking Change Dashboard

**Epic Goal:** Give API owners and governance teams visibility into API landscape health through breaking change feeds, impact analysis views, environment tracking display, and risk flag visibility - completing the MVP governance experience.

---

### Story 7.1: Breaking Change Feed Dashboard

As an **API owner**,
I want **a dashboard showing recent breaking changes across all APIs**,
So that **I can monitor the API landscape for changes affecting my services**.

**Acceptance Criteria:**

**Given** breaking changes have been detected
**When** a user navigates to /changes
**Then** the page displays:
- Page title: "Breaking Changes"
- Filter controls:
  - Filter by severity (breaking, potentially_breaking, non_breaking)
  - Filter by environment (dev, staging, prod)
  - Filter by team
  - Date range picker
- Feed of breaking changes showing:
  - API name with link to API detail
  - Change timestamp
  - Environment badge
  - Severity badge (RED/YELLOW/GREEN)
  - Summary: "2 breaking, 1 potentially breaking, 5 non-breaking"
  - Affected consumers count
  - "View Details" button

**And** changes are sorted by timestamp (most recent first)

**And** pagination: 20 changes per page

**And** severity badges use color coding:
- RED (Breaking): red background
- YELLOW (Potentially Breaking): yellow background
- GREEN (Non-breaking): green background

**And** clicking "View Details" shows expanded change details:
- Full list of changes with descriptions
- Affected endpoints
- Affected consumers with team info

**And** empty state: "No breaking changes detected recently"

**Prerequisites:** Story 5.7 (change history API)

**Technical Notes:**
- Fetch changes from GET /api/v1/changes (new aggregated endpoint across all APIs)
- Filter state managed in URL query params
- React Query for caching
- Date range picker component (e.g., react-day-picker)
- Expandable cards for change details
- Responsive layout: stack filters on mobile
- Future enhancement: Subscribe to change feed (RSS/email digest)

---

### Story 7.2: Breaking Change Detail Modal

As an **API owner**,
I want **to view detailed information about a specific breaking change**,
So that **I can understand exactly what changed and who's affected**.

**Acceptance Criteria:**

**Given** a user clicks "View Details" on a breaking change
**When** the detail modal opens
**Then** the modal displays:

**Header:**
- API name and version
- Environment
- Timestamp
- Close button

**Changes Section:**
- List of all changes grouped by severity
- Each change shows:
  - Change type (field_removed, type_changed, etc.)
  - Affected endpoint (path + method)
  - Description
  - Before/after comparison (if applicable)

**Impact Analysis Section:**
- Total affected consumers count
- List of affected services:
  - Service name
  - Team
  - Owner email (mailto link)
  - Dependent endpoints
  - Notification status (sent/pending)

**Actions:**
- "Contact API Owner" button (mailto link)
- "Download Change Report" button (JSON/CSV)
- "View Full API" link

**And** modal is scrollable for long change lists

**And** modal is dismissible by clicking outside or pressing Escape key

**And** responsive: full-screen on mobile, centered on desktop

**Prerequisites:** Story 7.1 (breaking change feed), Story 5.3 (change detection)

**Technical Notes:**
- Use modal/dialog component (shadcn/ui Dialog)
- Fetch change details from GET /api/v1/changes/{id}
- Before/after comparison for schema changes (diff viewer)
- Group changes by severity with collapsible sections
- Generate downloadable report (JSON or CSV format)
- Mailto links for owner contact
- Keyboard navigation support (Escape to close)

---

### Story 7.3: My Dependencies View

As a **service owner**,
I want **to see all APIs my service depends on with breaking change alerts**,
So that **I'm immediately aware of changes affecting my dependencies**.

**Acceptance Criteria:**

**Given** a user has registered endpoint subscriptions
**When** navigating to /my-dependencies
**Then** the page displays:
- Page title: "My Dependencies"
- Filter: Select service from dropdown (if user manages multiple services)
- List of dependencies showing:
  - Provider API name
  - Provider endpoint (path + method)
  - Provider team
  - Environment
  - Breaking change alert indicator (badge if changes detected)
  - Last checked timestamp
  - "View Details" link

**And** dependencies with breaking changes are highlighted:
- Red alert badge: "Breaking changes detected"
- Visual prominence (border, background color)

**And** clicking "View Details" shows:
- Endpoint details
- Recent breaking changes (if any)
- Consumer subscription info
- Link to unsubscribe

**And** empty state: "No dependencies registered. Register your endpoint subscriptions to track breaking changes."

**And** call-to-action: "Register Dependency" button → subscription API docs

**Prerequisites:** Story 4.3 (list subscriptions API), Story 5.7 (change history)

**Technical Notes:**
- Fetch dependencies from GET /api/v1/subscriptions?consumer_endpoint_id={id}
- For MVP: User manually selects their service (no auth, no "my" concept yet)
- Phase 2: User authentication enables true "my dependencies" view
- Join subscription data with breaking changes to detect alerts
- Alert badge shown if breaking change detected in last 30 days
- Responsive table/card layout
- Future enhancement: Email digest of dependency changes

---

### Story 7.4: Environment Tracking View

As an **API owner**,
I want **to see which version of my API is deployed in each environment**,
So that **I can track deployment progression and communicate version info to consumers**.

**Acceptance Criteria:**

**Given** an API has versions deployed to multiple environments
**When** viewing the API detail page
**Then** the environment tracking section displays:

**Environment Cards:**
- Three cards for dev, staging, prod
- Each card shows:
  - Environment name with color-coded badge
  - Current version number
  - Deployment timestamp
  - Endpoint count
  - Breaking changes since previous version (if any)
  - "View Spec" link

**And** visual progression indicator:
- Arrow showing dev → staging → prod flow
- Highlight if version differs across environments
- Warning if prod is behind staging

**And** version comparison feature:
- "Compare Versions" button between environments
- Shows diff between dev vs staging, staging vs prod

**And** responsive layout: stack cards vertically on mobile

**Prerequisites:** Story 2.5 (multi-environment support), Story 6.6 (API detail page)

**Technical Notes:**
- Enhance API detail page (Story 6.6) with environment tracking section
- Fetch versions from GET /api/v1/apis/{id}/versions?grouped_by_environment
- Display current version per environment (most recent upload per env)
- Visual flow diagram: dev → staging → prod with arrows
- Highlight version mismatches with warning colors
- Version comparison shows diff summary (future: full diff viewer)
- Environment color coding: dev (yellow), staging (blue), prod (green)

---

### Story 7.5: Risk Dashboard for Governance Teams

As a **governance team member**,
I want **a dashboard showing at-risk consumers (not updated after breaking changes)**,
So that **I can identify and follow up with teams running outdated API versions**.

**Acceptance Criteria:**

**Given** breaking changes were deployed and risk flags were set
**When** navigating to /governance/risk
**Then** the page displays:
- Page title: "At-Risk Consumers"
- Summary metrics:
  - Total at-risk consumers
  - High risk count (>7 days)
  - Medium risk count (3-7 days)
  - Low risk count (<3 days)
- Risk level filters (high, medium, low)
- Table of at-risk consumers showing:
  - Consumer service name
  - Consumer team
  - Provider API
  - Provider endpoint
  - Breaking change deployed date
  - Days since notification
  - Risk level badge (high/medium/low)
  - Contact owner link (mailto)

**And** at-risk consumers are sorted by risk level (high → medium → low)

**And** risk level color coding:
- High: red background
- Medium: orange background
- Low: yellow background

**And** clicking consumer row expands to show:
- Notification history (sent timestamp, delivery status)
- Breaking change details
- Action buttons: "Resend Notification", "Mark as Resolved"

**And** empty state: "No at-risk consumers. All services are up to date!"

**Prerequisites:** Story 5.6 (risk flagging)

**Technical Notes:**
- Fetch risk data from GET /api/v1/governance/risk
- Display summary metrics at top (card layout)
- Filterable, sortable table component
- Risk level calculated from days_since_notification
- Expandable table rows for additional details
- Mailto links for owner contact
- Future enhancement: Bulk actions (resend notifications, mark resolved)
- Future enhancement: Export risk report (CSV/PDF)

---

### Story 7.6: API Landscape Overview Dashboard

As a **platform team member**,
I want **a high-level dashboard showing API catalog metrics and health**,
So that **I can monitor the overall API ecosystem at a glance**.

**Acceptance Criteria:**

**Given** the catalog contains APIs and endpoints
**When** navigating to /dashboard
**Then** the page displays:

**Key Metrics (Cards):**
- Total APIs
- Total Endpoints
- Total Teams
- Breaking Changes (last 30 days)
- At-Risk Consumers

**Recent Activity Feed:**
- Recent API uploads (last 10)
- Recent breaking changes (last 5)
- New consumers registered (last 10 subscriptions)

**Top Contributors:**
- Teams with most APIs
- Most active APIs (by consumer count)
- Most subscribed endpoints

**Trend Charts (Phase 2 enhancement):**
- API growth over time (line chart)
- Breaking changes trend (bar chart by month)
- Consumer adoption (line chart)

**Quick Actions:**
- "Upload API Spec" documentation link
- "View Risk Dashboard" link
- "Browse Catalog" link

**And** all metrics are real-time (fetched on page load)

**And** dashboard refreshes data every 60 seconds (auto-refresh)

**And** responsive layout: single column mobile, multi-column desktop

**Prerequisites:** Story 3.5 (catalog API), Story 5.7 (change history), Story 5.6 (risk flagging)

**Technical Notes:**
- Fetch metrics from aggregated endpoints:
  - GET /api/v1/stats (new endpoint for dashboard metrics)
  - GET /api/v1/changes?limit=5
  - GET /api/v1/subscriptions?recent=true
- Use React Query with auto-refetch (60s interval)
- Card component for key metrics
- Activity feed with scrollable list
- Top contributors: bar chart or ranked list
- Future: Add charting library (recharts, Chart.js) for trend visualization
- Cache dashboard data for performance

---

### Story 7.7: Notification History & Status View

As an **API owner**,
I want **to see the history of notifications sent for my API changes**,
So that **I can verify consumers were notified and track delivery status**.

**Acceptance Criteria:**

**Given** notifications were sent for breaking changes
**When** viewing an API's change history page
**Then** the page includes notification status section:
- For each breaking change, show:
  - Notification sent count
  - Delivery status summary: "12 sent, 1 failed"
  - "View Notifications" button

**And** clicking "View Notifications" expands to show:
- Table of notifications with:
  - Recipient email
  - Recipient service
  - Recipient team
  - Sent timestamp
  - Delivery status (sent, failed, pending)
  - Error message (for failed deliveries)

**And** delivery status badges:
- Sent: green badge
- Failed: red badge
- Pending: yellow badge

**And** failed notifications show:
- Error message tooltip
- "Retry" button to resend

**And** notification history is paginated (20 per page)

**And** supports filtering by delivery status

**Prerequisites:** Story 5.5 (email notifications), Story 5.1 (change_notifications table)

**Technical Notes:**
- Fetch notifications from GET /api/v1/changes/{id}/notifications (new endpoint)
- Join change_notifications table with change_id
- Display delivery_status with appropriate badges
- Show error_message for failed deliveries (tooltip or expandable row)
- Retry functionality: POST /api/v1/notifications/{id}/retry
- Filter by delivery status (sent, failed, pending)
- Future enhancement: Download notification report (CSV)

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

<!-- End epic repeat -->

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._
