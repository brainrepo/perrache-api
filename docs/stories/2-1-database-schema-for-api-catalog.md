# Story 2.1: Database Schema for API Catalog

## Story

**As a** backend developer,
**I want** database tables designed to store APIs, specs, endpoints, and version history,
**So that** we can persist and query the API catalog efficiently.

## Status

done

## Context

This story begins Epic 2 (Webhook Ingestion & Spec Management) by establishing the database foundation for the API catalog. Building on the PostgreSQL + pgvector setup from Story 1.2, this story creates the core data models that enable multi-environment tracking, version history, and semantic search via dual-embedding strategy.

### Background

- **Epic:** 2 - Webhook Ingestion & Spec Management
- **Previous Story:** 1-7 Observability & Monitoring Setup (Epic 1 complete)
- **Dependencies:** PostgreSQL with pgvector (Story 1.2), Prisma setup (Story 1.2)
- **Architecture Reference:** Dual-Embedding Semantic Discovery pattern, Data Architecture section

### Technical Context

From completed Epic 1:

- PostgreSQL 15+ running with pgvector extension enabled
- Prisma configured with `previewFeatures = ["metrics"]` in schema.prisma
- Database migrations workflow established (`pnpm --filter @perrache/api prisma migrate dev`)
- Health check validates database connectivity
- Database connection via `DATABASE_URL` environment variable

## Estimation

**Story Points:** 3

## Acceptance Criteria

1. - [ ] **Given** the database migration system is set up
         **When** migrations are applied
         **Then** the following tables exist:

     **Table: `apis`**
     - id (UUID/CUID, primary key)
     - name (string, not null)
     - team (string, nullable)
     - owner (string, nullable)
     - created_at (timestamp)
     - updated_at (timestamp)
     - Index on name for fast lookup

2. - [ ] **And** Table: `api_versions` exists with:
   - id (UUID/CUID, primary key)
   - api_id (reference to apis.id)
   - version (string, not null)
   - environment (string, not null) - Supports: dev, staging, prod, qa, canary, etc.
   - spec_json (JSON/JSONB, full OpenAPI spec)
   - uploaded_at (timestamp)
   - uploaded_by (string, references API key)
   - Index on (api_id, environment)
   - Index on uploaded_at for version history queries

3. - [ ] **And** Table: `endpoints` exists with:
   - id (UUID/CUID, primary key)
   - api_version_id (reference to api_versions.id)
   - path (string, not null)
   - method (enum: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
   - domain_embedding (vector(1536), pgvector type, nullable)
   - full_embedding (vector(1536), pgvector type, nullable)
   - deprecated (boolean, default false)
   - Additional metadata fields for embedding generation (summary, description, operationId, tags, requestSchema, responseSchema, parameters, headers)
   - Index on (api_version_id, path, method) for uniqueness
   - HNSW index on domain_embedding for fast vector search
   - HNSW index on full_embedding for fast vector search

4. - [ ] **And** foreign key constraints enforce referential integrity:
   - api_versions.api_id → apis.id (with CASCADE on delete)
   - endpoints.api_version_id → api_versions.id (with CASCADE on delete)

5. - [ ] **And** database migrations are versioned and reversible

6. - [ ] **And** enum type for HttpMethod exists with: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

7. - [ ] **And** unique constraint on endpoints (api_version_id, path, method) prevents duplicate endpoints

8. - [ ] **And** HNSW indexes configured with optimal parameters for <1s search latency:
   - m = 16 (max connections per layer)
   - ef_construction = 64 (build-time accuracy)

## Tasks

### Task 1: Update Prisma Schema with API Catalog Models

**AC Coverage:** 1, 2, 3, 4, 6, 7

- [x] Define `Api` model in `apps/api/prisma/schema.prisma`
  - [x] id as String with @id @default(cuid())
  - [x] name as String with index
  - [x] team as String? (nullable)
  - [x] owner as String? (nullable)
  - [x] createdAt with @default(now())
  - [x] updatedAt with @updatedAt
  - [x] Relation to ApiVersion[] as versions
- [x] Define `ApiVersion` model
  - [x] id as String with @id @default(cuid())
  - [x] apiId as String (foreign key)
  - [x] version as String
  - [x] environment as String (not enum, per ADR-009)
  - [x] specJson as Json
  - [x] uploadedAt as DateTime with @default(now())
  - [x] uploadedBy as String? (reference to API key name)
  - [x] Add @relation to Api with onDelete: Cascade
  - [x] Add @@index([apiId, environment])
  - [x] Add @@index([uploadedAt])
  - [x] Relation to Endpoint[] as endpoints
- [x] Define `Endpoint` model
  - [x] id as String with @id @default(cuid())
  - [x] apiVersionId as String (foreign key)
  - [x] path as String
  - [x] method as HttpMethod enum
  - [x] domainObjectEmbedding as Unsupported("vector(1536)")? (nullable for initial creation)
  - [x] fullEndpointEmbedding as Unsupported("vector(1536)")? (nullable)
  - [x] summary as String? (OpenAPI summary)
  - [x] description as String? (OpenAPI description)
  - [x] operationId as String?
  - [x] tags as String[]
  - [x] requestSchema as Json? (flattened request body)
  - [x] responseSchema as Json? (flattened response body)
  - [x] parameters as Json? (path/query parameters)
  - [x] headers as Json?
  - [x] deprecated as Boolean with @default(false)
  - [x] createdAt as DateTime with @default(now())
  - [x] Add @relation to ApiVersion with onDelete: Cascade
  - [x] Add @@unique([apiVersionId, path, method])
  - [x] Add @@index([apiVersionId])
  - [x] Add @@index([deprecated])
- [x] Define `HttpMethod` enum: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

### Task 2: Create Database Migration

**AC Coverage:** 5

- [x] Run `pnpm --filter @perrache/api prisma migrate dev --name add_api_catalog_schema`
- [x] Verify migration file created in `apps/api/prisma/migrations/`
- [x] Review generated SQL for correctness
- [x] Ensure migration includes all table creation statements
- [x] Verify enum type creation for HttpMethod
- [x] Confirm foreign key constraints with CASCADE

### Task 3: Create HNSW Indexes for Vector Search

**AC Coverage:** 3, 8

- [x] Create manual SQL migration for pgvector indexes (Prisma doesn't natively support HNSW index syntax)
- [x] Add migration file `apps/api/prisma/migrations/[timestamp]_add_hnsw_indexes/migration.sql`:

  ```sql
  -- Create HNSW indexes for semantic search performance
  -- Parameters optimized for <1s search latency (NFR-P1)

  CREATE INDEX idx_endpoint_domain_embedding
    ON "Endpoint"
    USING hnsw ("domainObjectEmbedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

  CREATE INDEX idx_endpoint_full_embedding
    ON "Endpoint"
    USING hnsw ("fullEndpointEmbedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  ```

- [x] Apply migration with `pnpm --filter @perrache/api prisma migrate dev --name add_hnsw_indexes`
- [x] Verify indexes created with `\d "Endpoint"` in psql or Prisma Studio

### Task 4: Validate Schema and Test Database Operations

**AC Coverage:** 1-8

- [x] Run `pnpm --filter @perrache/api prisma generate` to update Prisma Client
- [x] Create integration test file `apps/api/src/__tests__/database-schema.test.ts`
- [x] Test Api CRUD operations:
  - [x] Create new Api with all fields
  - [x] Read Api by id
  - [x] Update Api name
  - [x] Delete Api cascades to versions and endpoints
- [x] Test ApiVersion operations:
  - [x] Create version linked to Api
  - [x] Query versions by api_id and environment
  - [x] Version history sorted by uploadedAt desc
- [x] Test Endpoint operations:
  - [x] Create endpoint with all metadata fields (path, method, schemas)
  - [x] Verify unique constraint on (apiVersionId, path, method)
  - [x] Test HttpMethod enum values
  - [x] Verify deprecated field default is false
- [x] Test cascade deletes:
  - [x] Delete Api → all ApiVersions and Endpoints deleted
  - [x] Delete ApiVersion → all Endpoints deleted
- [x] Verify indexes exist with query plan analysis (EXPLAIN ANALYZE)
- [x] Run full test suite: `pnpm --filter @perrache/api test`

### Task 5: Update Database Service with Type Exports

**AC Coverage:** 1-8

- [x] Export Prisma types from database service for use in other services
- [x] Create `apps/api/src/lib/database.ts` (if not exists) with typed helpers:
  - [x] Export `prisma` client instance
  - [x] Export type aliases: `Api`, `ApiVersion`, `Endpoint`, `HttpMethod`
- [x] Document schema in README or architecture docs
  - [x] Entity relationship diagram (text-based)
  - [x] Field descriptions and constraints
  - [x] Migration workflow instructions

### Task 6: Environment Variable Documentation

**AC Coverage:** 2

- [x] Ensure DATABASE_URL is documented in `.env.example`
- [x] Document that environment field accepts any string value (not restricted to dev/staging/prod)
- [x] Add comment explaining multi-environment support per ADR-009

## Constraints

- MUST use Prisma for schema definition and migrations
- MUST use pgvector extension for vector embeddings (1536 dimensions for OpenAI text-embedding-3-small)
- Environment field MUST be string type (not enum) per ADR-009 to support enterprise flexibility
- Foreign keys MUST cascade on delete to maintain referential integrity
- HNSW indexes MUST be created for <1s search performance at scale
- UUIDs/CUIDs for primary keys to support distributed systems

## Dev Notes

### Key Implementation Details

1. **Prisma Schema Pattern (following existing conventions):**

```prisma
model Api {
  id        String   @id @default(cuid())
  name      String
  team      String?
  owner     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  versions ApiVersion[]

  @@index([name])
}

model ApiVersion {
  id          String   @id @default(cuid())
  apiId       String
  version     String
  environment String   // String, not enum - per ADR-009
  specJson    Json
  uploadedAt  DateTime @default(now())
  uploadedBy  String?

  api       Api        @relation(fields: [apiId], references: [id], onDelete: Cascade)
  endpoints Endpoint[]

  @@index([apiId, environment])
  @@index([uploadedAt])
}

model Endpoint {
  id           String     @id @default(cuid())
  apiVersionId String
  path         String
  method       HttpMethod

  // Dual embeddings for semantic search (pgvector 1536 dimensions)
  domainObjectEmbedding Unsupported("vector(1536)")?
  fullEndpointEmbedding Unsupported("vector(1536)")?

  // OpenAPI metadata for embedding generation
  summary        String?
  description    String?
  operationId    String?
  tags           String[]
  requestSchema  Json?
  responseSchema Json?
  parameters     Json?
  headers        Json?

  deprecated Boolean  @default(false)
  createdAt  DateTime @default(now())

  apiVersion ApiVersion @relation(fields: [apiVersionId], references: [id], onDelete: Cascade)

  @@unique([apiVersionId, path, method])
  @@index([apiVersionId])
  @@index([deprecated])
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

2. **HNSW Index Creation (manual SQL migration):**

```sql
-- Manual migration needed because Prisma doesn't support HNSW index syntax
-- File: prisma/migrations/YYYYMMDDHHMMSS_add_hnsw_indexes/migration.sql

CREATE INDEX IF NOT EXISTS idx_endpoint_domain_embedding
  ON "Endpoint"
  USING hnsw ("domainObjectEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_endpoint_full_embedding
  ON "Endpoint"
  USING hnsw ("fullEndpointEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

3. **Schema Design Rationale:**

- **Separate ApiVersion table**: Enables multi-environment tracking (same API, different versions in dev/staging/prod) and full version history
- **String environment**: Supports any environment name (dev, staging, prod, qa, canary, preview) per ADR-009
- **Nullable embeddings**: Endpoints created first, embeddings generated asynchronously in Epic 3
- **Metadata fields**: Store flattened schemas for embedding generation without re-parsing spec
- **Cascade deletes**: Clean up child records automatically

### Learnings from Previous Story

**From Story 1-7 (Status: review)**

- **Prisma previewFeatures**: Already enabled metrics in schema.prisma
- **Plugin pattern**: Use fastify-plugin wrapper for encapsulation
- **Testing pattern**: Integration tests use app.inject() and direct Prisma queries
- **Files established**:
  - `apps/api/prisma/schema.prisma` - Schema definition
  - Database migrations workflow in place
  - DatabaseService pattern for shared database access

[Source: stories/1-7-observability-monitoring-setup.md#Dev-Agent-Record]

### Project Structure Notes

- Schema updates: `apps/api/prisma/schema.prisma`
- New migrations: `apps/api/prisma/migrations/`
- New tests: `apps/api/src/__tests__/database-schema.test.ts`
- Type exports: `apps/api/src/lib/database.ts` (optional helper)

### References

- [Source: docs/epics.md#Story-2.1] - Acceptance criteria and table definitions
- [Source: docs/architecture.md#Dual-Embedding-Semantic-Discovery] - Embedding strategy and 1536 dimensions
- [Source: docs/architecture.md#Data-Architecture] - Prisma schema patterns
- [Source: docs/architecture.md#ADR-009] - Environment as string, not enum
- [Source: docs/architecture.md#ADR-005] - Prisma ORM with pgvector support
- [Source: stories/1-2-postgresql-database-with-pgvector-extension.md] - PostgreSQL + pgvector setup

## Dev Agent Record

### Context Reference

- docs/stories/2-1-database-schema-for-api-catalog.context.xml

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

- Task 1: Analyzed existing schema.prisma patterns (ApiKey model with CUID, pgvector extension enabled). Added Api, ApiVersion, Endpoint models with proper relations and indexes.
- Task 2: Migration 20251116172928_add_api_catalog_schema created successfully. Generated SQL verified for HttpMethod enum, all table structures, indexes, and CASCADE foreign keys.
- Task 3: Manual HNSW index migration 20251116173000_add_hnsw_indexes created. Applied successfully with m=16, ef_construction=64 parameters.
- Task 4: Created 22 comprehensive integration tests covering CRUD, cascades, constraints, and index verification. All 172 tests pass (0 regressions).

### Completion Notes List

- ✅ Implemented complete API Catalog schema with three interconnected models (Api, ApiVersion, Endpoint)
- ✅ Environment field uses String type (not enum) per ADR-009 for enterprise flexibility
- ✅ Dual vector embeddings (1536 dimensions) with HNSW indexes configured for <1s search latency
- ✅ Unique constraint on (apiVersionId, path, method) prevents duplicate endpoints
- ✅ CASCADE deletes maintain referential integrity automatically
- ✅ HttpMethod enum supports all 7 standard HTTP methods
- ✅ Re-exported Prisma types from db.ts for downstream service usage
- ✅ Added text-based ERD documentation in db.ts
- ✅ Documented multi-environment support in .env.example

### File List

**New Files:**

- apps/api/prisma/migrations/20251116172928_add_api_catalog_schema/migration.sql
- apps/api/prisma/migrations/20251116173000_add_hnsw_indexes/migration.sql
- apps/api/src/**tests**/database-schema.test.ts

**Modified Files:**

- apps/api/prisma/schema.prisma (added Api, ApiVersion, Endpoint models and HttpMethod enum)
- apps/api/src/lib/db.ts (added type exports and ERD documentation)
- apps/api/.env.example (added multi-environment support documentation)

---

## Change Log

- **2025-11-16:** Story drafted from epics.md and architecture.md. Schema designed to support multi-environment tracking, version history, and dual-embedding strategy. HNSW indexes specified for <1s search performance. All 8 acceptance criteria mapped to 6 implementation tasks. Incorporated learnings from Epic 1 (Prisma setup, testing patterns).
- **2025-11-16:** Implementation complete. All 6 tasks finished, 22 new integration tests added, all 172 tests passing. Schema includes Api, ApiVersion, and Endpoint models with dual-embedding support (1536 dims), HNSW indexes (m=16, ef_construction=64), CASCADE deletes, and comprehensive type exports. Story status updated to review.
- **2025-11-16:** Senior Developer Review notes appended. Review outcome: APPROVED. All 8 acceptance criteria fully implemented with evidence. All 6 tasks verified complete. No false completions found. Story status updated to done.

---

_Story created by SM Agent following BMad Method v6_
_Date: 2025-11-16_

---

## Senior Developer Review (AI)

### Reviewer

Brainrepo

### Date

2025-11-16

### Outcome

**✅ APPROVE** - All acceptance criteria implemented, all tasks verified complete, comprehensive test coverage, excellent code quality.

### Summary

This story successfully implements the database schema for the API Catalog, establishing a solid foundation for Epic 2 (Webhook Ingestion & Spec Management). The implementation follows all architectural constraints, includes proper indexing for performance, and has comprehensive test coverage.

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW severity / Informational:**

- Prisma "metrics" preview feature deprecation warning (not actionable, feature still works)
- Prisma Unsupported type returns `undefined` for null vector fields (properly handled in tests)

### Acceptance Criteria Coverage

| AC# | Description                                                         | Status         | Evidence (file:line)                            |
| --- | ------------------------------------------------------------------- | -------------- | ----------------------------------------------- |
| AC1 | apis table with id (CUID), name (indexed), team, owner, timestamps  | ✅ IMPLEMENTED | schema.prisma:43-55                             |
| AC2 | api_versions with FK, environment (string), spec_json, indexes      | ✅ IMPLEMENTED | schema.prisma:57-72                             |
| AC3 | endpoints with dual vector(1536), metadata, unique constraint, HNSW | ✅ IMPLEMENTED | schema.prisma:74-103                            |
| AC4 | FK constraints with CASCADE deletes                                 | ✅ IMPLEMENTED | schema.prisma:66,97 (onDelete: Cascade)         |
| AC5 | Database migrations versioned and reversible                        | ✅ IMPLEMENTED | migrations/20251116172928*\*, 20251116173000*\* |
| AC6 | HttpMethod enum (7 methods)                                         | ✅ IMPLEMENTED | schema.prisma:31-39                             |
| AC7 | Unique constraint on (apiVersionId, path, method)                   | ✅ IMPLEMENTED | schema.prisma:99                                |
| AC8 | HNSW indexes m=16, ef_construction=64                               | ✅ IMPLEMENTED | add_hnsw_indexes/migration.sql:8-9,13-14        |

**Summary: 8 of 8 acceptance criteria fully implemented**

### Task Completion Validation

| Task                              | Marked As    | Verified As | Evidence                                          |
| --------------------------------- | ------------ | ----------- | ------------------------------------------------- |
| Task 1: Update Prisma Schema      | [x] Complete | ✅ VERIFIED | schema.prisma:31-103 (all models and enum)        |
| Task 2: Create Database Migration | [x] Complete | ✅ VERIFIED | migrations/20251116172928_add_api_catalog_schema/ |
| Task 3: Create HNSW Indexes       | [x] Complete | ✅ VERIFIED | migrations/20251116173000_add_hnsw_indexes/       |
| Task 4: Validate Schema and Tests | [x] Complete | ✅ VERIFIED | src/**tests**/database-schema.test.ts (22 tests)  |
| Task 5: Update Database Service   | [x] Complete | ✅ VERIFIED | src/lib/db.ts:4 (type exports), :10-51 (ERD)      |
| Task 6: Environment Documentation | [x] Complete | ✅ VERIFIED | .env.example:11-16                                |

**Summary: 6 of 6 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

**Excellent test coverage:**

- 22 new integration tests in database-schema.test.ts
- Api CRUD operations: 5 tests
- ApiVersion operations: 4 tests (including ADR-009 compliance)
- Endpoint operations: 5 tests
- Cascade deletes: 2 tests
- Foreign key constraints: 2 tests
- Database indexes: 4 tests (including HNSW verification)

**No gaps identified.** All ACs have corresponding tests.

### Architectural Alignment

✅ **Fully compliant with architecture constraints:**

- ADR-009: Environment as string (not enum) for enterprise flexibility
- ADR-005: Prisma ORM with pgvector support
- Data Architecture: CUID primary keys, proper relations
- Dual-Embedding Semantic Discovery: 1536 dimensions for OpenAI text-embedding-3-small
- Performance: HNSW indexes with m=16, ef_construction=64 for <1s latency

### Security Notes

No security concerns:

- Schema layer doesn't handle user input directly
- Foreign key constraints enforce referential integrity
- CASCADE deletes prevent orphaned records

### Best-Practices and References

- Prisma Schema Guide: https://www.prisma.io/docs/orm/prisma-schema
- pgvector HNSW Indexes: https://github.com/pgvector/pgvector#hnsw
- OpenAI Embeddings: 1536 dimensions for text-embedding-3-small

### Action Items

**Code Changes Required:**
_None - all requirements met_

**Advisory Notes:**

- Note: Monitor Prisma "metrics" feature deprecation for future Prisma version upgrades
- Note: Consider adding database seeding script for development/testing convenience
- Note: Future stories may need to handle vector embedding updates (Epic 3)

---

**Review Complete: APPROVED**
