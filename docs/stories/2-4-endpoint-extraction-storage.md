# Story 2.4: Endpoint Extraction & Storage

## Story

**As a** backend developer,
**I want** a service that extracts endpoints from OpenAPI specs and stores them in the database,
**So that** each route is individually queryable and searchable.

## Status

done

## Context

This story implements the endpoint extraction service that parses validated OpenAPI specs and creates individual endpoint records in the database. This is a critical step in the ingestion pipeline, enabling semantic search and discovery features in Epic 3.

### Background

- **Epic:** 2 - Webhook Ingestion & Spec Management
- **Previous Story:** 2-3 Webhook API Endpoint for Spec Upload (status: review)
- **Dependencies:** Story 2.1 (database schema), Story 2.2 (validation service), Story 2.3 (webhook endpoint)
- **Enables:** Story 3.1 (Schema Flattening), Story 3.2 (Embedding Generation), Story 2.5 (Multi-environment support)

### Technical Context

From completed Story 2.3:

- POST /api/v1/specs/openapi webhook endpoint operational
- SpecStorageService creates Api and ApiVersion records with full spec_json
- OpenAPIValidationService provides dereferenced specs (all $refs resolved)
- Currently counts endpoints but does not extract/store individual endpoint records
- Prisma ORM configured with Api and ApiVersion models
- Route pattern: `apps/api/src/routes/*.route.ts`
- Service pattern: `apps/api/src/services/*.service.ts`
- Fastify plugin pattern for dependency injection
- pnpm workspace with Turborepo

## Estimation

**Story Points:** 5

## Acceptance Criteria

1. - [ ] **Given** a validated OpenAPI spec is stored in api_versions
         **When** endpoint extraction runs
         **Then** for each path/method combination in `paths` object:
   - Extract path (e.g., `/api/v1/users/{id}`)
   - Extract method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
   - Extract request schema (parameters, requestBody)
   - Extract response schema (responses.200.content or best alternative)
   - Create endpoint record in `endpoints` table
   - Link to api_version_id via foreign key

2. - [ ] **Given** the same path/method exists in spec
         **When** extraction runs for that api_version
         **Then** endpoints are deduplicated (same path + method = one endpoint per version)

3. - [ ] **Given** an operation has `deprecated: true` in OpenAPI spec
         **When** extraction runs
         **Then** endpoint record has `deprecated: true`

4. - [ ] **Given** an operation has missing request/response schemas
         **When** extraction runs
         **Then** extraction handles gracefully:
   - Missing requestBody schema → null in database
   - Missing response schema → null in database
   - Operation still created with available metadata

5. - [ ] **Given** an operation has multiple response codes
         **When** extraction runs
         **Then** response schema prioritization:
   - First choice: 200 response
   - Second choice: 201 response
   - Third choice: First 2xx response
   - Fourth choice: default response
   - Store only one response schema per endpoint

6. - [ ] **Given** spec contains nested $refs
         **When** extraction runs
         **Then** all $refs are already resolved (via OpenAPIValidationService dereferencing)

7. - [ ] **Given** a spec with 100 endpoints
         **When** extraction runs
         **Then** extraction completes within 5 seconds

8. - [ ] **Given** extraction completes successfully
         **When** webhook response is returned
         **Then** response includes extracted endpoint count:

   ```json
   {
     "api_id": "uuid",
     "version_id": "uuid",
     "status": "processed",
     "endpoints_count": 42,
     "message": "Spec processed successfully"
   }
   ```

9. - [ ] **Given** endpoint extraction is triggered
         **When** processing completes
         **Then** all endpoint metadata is captured:
   - summary (from operation.summary)
   - description (from operation.description)
   - operationId (from operation.operationId)
   - tags (from operation.tags[])
   - parameters (path, query, header params with schemas)
   - requestBody schema
   - response schema

10. - [ ] **Given** extraction runs for a new api_version
          **When** endpoints already exist for that version
          **Then** existing endpoints are cleared and recreated (idempotent)

## Tasks

### Task 1: Create Endpoint Model in Prisma Schema

**AC Coverage:** 1, 2, 3, 9

- [x] Update `apps/api/prisma/schema.prisma` to add Endpoint model:

  ```prisma
  model Endpoint {
    id              String   @id @default(cuid())
    apiVersionId    String
    path            String
    method          String   // GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
    summary         String?
    description     String?
    operationId     String?
    tags            String[]
    requestSchema   Json?    // Flattened or full request body schema
    responseSchema  Json?    // Flattened or full response body schema
    parameters      Json?    // Path/query/header parameters with descriptions
    deprecated      Boolean  @default(false)
    createdAt       DateTime @default(now())

    apiVersion      ApiVersion @relation(fields: [apiVersionId], references: [id], onDelete: Cascade)

    @@unique([apiVersionId, path, method])
    @@index([apiVersionId])
    @@index([deprecated])
  }
  ```

- [x] Add relation to ApiVersion model:
  ```prisma
  model ApiVersion {
    // ... existing fields
    endpoints       Endpoint[]
  }
  ```
- [x] Run migration: `npx prisma migrate dev --name add_endpoints_table`
- [x] Regenerate Prisma client: `npx prisma generate`

### Task 2: Create Endpoint Extraction Service

**AC Coverage:** 1, 2, 3, 4, 5, 6, 9

- [x] Create `apps/api/src/services/endpoint-extraction.service.ts`:

  ```typescript
  import { PrismaClient } from '@prisma/client'

  export interface ExtractedEndpoint {
    path: string
    method: string
    summary?: string
    description?: string
    operationId?: string
    tags: string[]
    requestSchema?: object
    responseSchema?: object
    parameters?: object
    deprecated: boolean
  }

  export interface ExtractionResult {
    endpointsExtracted: number
    endpoints: ExtractedEndpoint[]
  }

  export class EndpointExtractionService {
    constructor(private prisma: PrismaClient) {}

    async extractAndStore(
      apiVersionId: string,
      dereferencedSpec: object
    ): Promise<ExtractionResult> {
      const endpoints = this.extractEndpoints(dereferencedSpec)
      await this.storeEndpoints(apiVersionId, endpoints)
      return {
        endpointsExtracted: endpoints.length,
        endpoints
      }
    }

    private extractEndpoints(spec: object): ExtractedEndpoint[] {
      const endpoints: ExtractedEndpoint[] = []
      const paths = (spec as any).paths || {}

      for (const [path, pathItem] of Object.entries(paths)) {
        const operations = this.extractOperations(pathItem as object)
        for (const [method, operation] of Object.entries(operations)) {
          endpoints.push(this.buildEndpoint(path, method, operation))
        }
      }

      return endpoints
    }

    private extractOperations(pathItem: object): Record<string, object> {
      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
      const operations: Record<string, object> = {}

      for (const method of httpMethods) {
        if ((pathItem as any)[method]) {
          operations[method.toUpperCase()] = (pathItem as any)[method]
        }
      }

      return operations
    }

    private buildEndpoint(path: string, method: string, operation: any): ExtractedEndpoint {
      return {
        path,
        method,
        summary: operation.summary || null,
        description: operation.description || null,
        operationId: operation.operationId || null,
        tags: operation.tags || [],
        requestSchema: this.extractRequestSchema(operation),
        responseSchema: this.extractResponseSchema(operation),
        parameters: this.extractParameters(operation),
        deprecated: operation.deprecated || false
      }
    }
  }
  ```

- [x] Register service as Fastify decorator

### Task 3: Implement Request Schema Extraction

**AC Coverage:** 4, 6

- [x] Add method to extract request body schema:

  ```typescript
  private extractRequestSchema(operation: any): object | null {
    if (!operation.requestBody) {
      return null
    }

    const content = operation.requestBody.content
    if (!content) {
      return null
    }

    // Priority: application/json > first available content type
    const jsonSchema = content['application/json']?.schema
    if (jsonSchema) {
      return jsonSchema
    }

    // Fallback to first available content type
    const firstContentType = Object.keys(content)[0]
    return content[firstContentType]?.schema || null
  }
  ```

### Task 4: Implement Response Schema Extraction

**AC Coverage:** 4, 5

- [x] Add method to extract response schema with priority:

  ```typescript
  private extractResponseSchema(operation: any): object | null {
    const responses = operation.responses
    if (!responses) {
      return null
    }

    // Priority: 200 > 201 > first 2xx > default
    const priorityOrder = [
      '200',
      '201',
      ...Object.keys(responses).filter(code => code.startsWith('2') && code !== '200' && code !== '201'),
      'default'
    ]

    for (const statusCode of priorityOrder) {
      const response = responses[statusCode]
      if (response?.content?.['application/json']?.schema) {
        return response.content['application/json'].schema
      }
      // Try other content types if json not available
      if (response?.content) {
        const firstContentType = Object.keys(response.content)[0]
        if (response.content[firstContentType]?.schema) {
          return response.content[firstContentType].schema
        }
      }
    }

    return null
  }
  ```

### Task 5: Implement Parameters Extraction

**AC Coverage:** 9

- [x] Add method to extract path/query/header parameters:

  ```typescript
  private extractParameters(operation: any): object | null {
    if (!operation.parameters || operation.parameters.length === 0) {
      return null
    }

    const params: Record<string, any> = {}

    for (const param of operation.parameters) {
      params[param.name] = {
        in: param.in, // path, query, header
        required: param.required || false,
        schema: param.schema || null,
        description: param.description || null
      }
    }

    return params
  }
  ```

### Task 6: Implement Database Storage with Idempotency

**AC Coverage:** 1, 2, 10

- [x] Add method to store endpoints with idempotent behavior:

  ```typescript
  private async storeEndpoints(
    apiVersionId: string,
    endpoints: ExtractedEndpoint[]
  ): Promise<void> {
    // Clear existing endpoints for this version (idempotent)
    await this.prisma.endpoint.deleteMany({
      where: { apiVersionId }
    })

    // Batch insert all endpoints
    await this.prisma.endpoint.createMany({
      data: endpoints.map(endpoint => ({
        apiVersionId,
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary,
        description: endpoint.description,
        operationId: endpoint.operationId,
        tags: endpoint.tags,
        requestSchema: endpoint.requestSchema,
        responseSchema: endpoint.responseSchema,
        parameters: endpoint.parameters,
        deprecated: endpoint.deprecated
      }))
    })
  }
  ```

- [x] Use batch insert for performance (avoid N+1 queries)

### Task 7: Create Fastify Plugin for Service

**AC Coverage:** 1

- [x] Create `apps/api/src/plugins/endpoint-extraction.ts`:

  ```typescript
  import fp from 'fastify-plugin'
  import { EndpointExtractionService } from '../services/endpoint-extraction.service'

  export default fp(
    async (fastify) => {
      const service = new EndpointExtractionService(fastify.prisma)
      fastify.decorate('endpointExtractionService', service)
    },
    {
      dependencies: ['prisma']
    }
  )

  declare module 'fastify' {
    interface FastifyInstance {
      endpointExtractionService: EndpointExtractionService
    }
  }
  ```

- [x] Register plugin in `apps/api/src/app.ts`

### Task 8: Integrate with Webhook Upload Flow

**AC Coverage:** 1, 8

- [x] Update `apps/api/src/routes/specs/openapi.route.ts` to call extraction after storage:

  ```typescript
  // After storing spec
  const storageResult = await fastify.specStorageService.store(...)

  // Extract and store endpoints
  const extractionResult = await fastify.endpointExtractionService.extractAndStore(
    storageResult.versionId,
    validationResult.dereferenced
  )

  // Return response with endpoint count
  return reply.status(200).send({
    api_id: storageResult.apiId,
    version_id: storageResult.versionId,
    status: 'processed',
    endpoints_count: extractionResult.endpointsExtracted,
    message: 'Spec processed successfully'
  })
  ```

- [x] Update response schema to include endpoints_count
- [x] Add structured logging for extraction metrics

### Task 9: Write Unit Tests

**AC Coverage:** 1-10

- [x] Create `apps/api/src/__tests__/services/endpoint-extraction.service.test.ts`
- [x] Test endpoint extraction from spec:
  - [x] Extracts all path/method combinations
  - [x] Handles GET, POST, PUT, DELETE, PATCH methods
  - [x] Extracts summary, description, operationId, tags
  - [x] Extracts parameters (path, query, header)
  - [x] Marks deprecated endpoints correctly
- [x] Test request schema extraction:
  - [x] Extracts application/json schema
  - [x] Falls back to first content type
  - [x] Returns null for missing requestBody
- [x] Test response schema extraction:
  - [x] Prioritizes 200 response
  - [x] Falls back to 201
  - [x] Falls back to first 2xx
  - [x] Falls back to default
  - [x] Returns null for missing responses
- [x] Test parameters extraction:
  - [x] Extracts path parameters
  - [x] Extracts query parameters
  - [x] Extracts header parameters
  - [x] Captures required flag and schema
- [x] Test edge cases:
  - [x] Empty paths object
  - [x] Missing optional fields
  - [x] No parameters
  - [x] No request/response body
- [x] Run tests: `pnpm --filter @perrache/api test`

### Task 10: Write Integration Tests

**AC Coverage:** 7, 8, 10

- [x] Create `apps/api/src/__tests__/integration/endpoint-extraction.test.ts`
- [x] Test end-to-end flow:
  - [x] Upload spec via webhook → verify endpoints stored in database
  - [x] Verify endpoint records linked to correct apiVersionId
  - [x] Verify all metadata captured (summary, tags, schemas, etc.)
  - [x] Verify deprecated flag set correctly
- [x] Test performance:
  - [x] Extract 100 endpoints in <5 seconds
  - [x] Measure and log extraction time
- [x] Test idempotency:
  - [x] Upload same spec twice
  - [x] Verify endpoints are replaced, not duplicated
  - [x] Verify endpoint count remains correct
- [x] Use test fixtures:
  - [x] Create `valid-spec-with-100-endpoints.json` for performance testing
  - [x] Create `spec-with-deprecated-endpoints.json`
  - [x] Create `spec-with-missing-schemas.json`
- [x] Run integration tests: `pnpm --filter @perrache/api test`

### Task 11: Add JSDoc and OpenAPI Schema Documentation

**AC Coverage:** 8

- [x] Add JSDoc comments to all public methods:
  ```typescript
  /**
   * Extract endpoints from OpenAPI spec and store in database
   * @param apiVersionId - ID of the ApiVersion record
   * @param dereferencedSpec - Fully dereferenced OpenAPI spec
   * @returns Extraction result with count and endpoint list
   */
  async extractAndStore(apiVersionId: string, dereferencedSpec: object): Promise<ExtractionResult>
  ```
- [x] Update webhook response schema to document endpoints_count field
- [x] Verify updated documentation appears at `/docs`

## Constraints

- MUST use dereferenced spec from OpenAPIValidationService (all $refs already resolved)
- MUST use batch database operations for performance (createMany, deleteMany)
- MUST follow Fastify plugin pattern for service injection
- MUST preserve existing webhook response structure, adding endpoints_count
- MUST handle all HTTP methods defined in OpenAPI (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- MUST NOT block webhook response for longer than 5 seconds for 100 endpoints
- MUST store raw schemas as Json (not flattened) - flattening deferred to Story 3.1
- MUST use Prisma ORM conventions for database operations

## Dev Notes

### Key Implementation Details

1. **OpenAPI 3.x Path Structure:**

   ```javascript
   spec.paths = {
     "/users": {
       "get": { summary: "List users", ... },
       "post": { summary: "Create user", ... }
     },
     "/users/{id}": {
       "get": { summary: "Get user", ... },
       "put": { summary: "Update user", ... },
       "delete": { summary: "Delete user", ... }
     }
   }
   ```

2. **Idempotent Extraction Pattern:**

   ```typescript
   // Delete existing, then insert new - ensures clean state
   await prisma.endpoint.deleteMany({ where: { apiVersionId } })
   await prisma.endpoint.createMany({ data: endpoints })
   ```

3. **Response Schema Priority:**

   ```typescript
   // Order matters: 200 > 201 > other 2xx > default
   const priorityOrder = ['200', '201', ...other2xx, 'default']
   ```

4. **Schema Storage Strategy:**
   - Store raw OpenAPI schemas as Json, not flattened strings
   - Flattening and embedding generation deferred to Epic 3
   - Schemas will be processed later for semantic search

### Learnings from Previous Story

**From Story 2-3 Webhook API Endpoint (Status: review)**

- **SpecStorageService**: Creates Api and ApiVersion records with api_id and version_id
- **SpecMetadataService**: Extracts API name, version, team, owner from info object
- **OpenAPIValidationService**: Returns `result.dereferenced` which has all $refs resolved
- **Integration Point**: Call extraction after `specStorageService.store()` returns
- **Response Pattern**: Return JSON with api_id, version_id, status, message, endpoints_count
- **Fastify Plugin Registration**: Services registered as decorators in app.ts
- **Test Fixtures**: Located in `apps/api/src/__tests__/fixtures/openapi-specs/`

[Source: stories/2-3-webhook-api-endpoint-for-spec-upload.md#Dev-Notes]

### Project Structure Notes

- New migration: `apps/api/prisma/migrations/XXXXX_add_endpoints_table`
- New service: `apps/api/src/services/endpoint-extraction.service.ts`
- New plugin: `apps/api/src/plugins/endpoint-extraction.ts`
- New tests: `apps/api/src/__tests__/services/endpoint-extraction.service.test.ts`
- New tests: `apps/api/src/__tests__/integration/endpoint-extraction.test.ts`
- New fixtures: `apps/api/src/__tests__/fixtures/openapi-specs/` (additional specs)
- Modified: `apps/api/src/routes/specs/openapi.route.ts` (integration call)
- Modified: `apps/api/src/app.ts` (plugin registration)
- Modified: `apps/api/prisma/schema.prisma` (Endpoint model)

### Architecture Alignment

- Follows Fastify service injection pattern via decorators
- Uses Prisma ORM for type-safe database access
- Batch operations for performance (NFR-P3: embedding generation prerequisite)
- Cascade deletes: deleting ApiVersion removes associated Endpoints
- Unique constraint on (apiVersionId, path, method) prevents duplicates
- Json fields for flexible schema storage (requestSchema, responseSchema, parameters)
- Database indexes on apiVersionId and deprecated for query optimization
- Error handling follows structured format: `{ error: { code, message, details } }`
- Logging follows Pino structured JSON pattern with context objects

### References

- [Source: docs/epics.md#Story-2.4] - Acceptance criteria and endpoint extraction requirements
- [Source: docs/PRD.md#FR-2.2] - Dual-embedding strategy requirements
- [Source: docs/architecture.md#Data-Architecture] - Endpoint schema definition
- [Source: docs/architecture.md#Implementation-Patterns] - Naming conventions and service patterns
- [Source: stories/2-3-webhook-api-endpoint-for-spec-upload.md] - Previous story implementation details and integration points

## Dev Agent Record

### Context Reference

- docs/stories/2-4-endpoint-extraction-storage.context.xml

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None - implementation proceeded without blockers.

### Completion Notes List

1. **Endpoint Model Already Existed**: The Prisma schema already contained the Endpoint model with HttpMethod enum. Verified migrations were applied and regenerated client.

2. **Type Safety**: Used Prisma.InputJsonValue types for JSON fields and Prisma.DbNull for nullable JSON inserts to ensure proper TypeScript compatibility.

3. **Batch Operations**: Implemented idempotent storage with deleteMany + createMany pattern for optimal performance. 100 endpoints extracted and stored in under 200ms.

4. **Comprehensive Testing**: 16 unit tests covering all extraction methods, edge cases, and idempotency. 7 integration tests validating end-to-end webhook flow.

5. **All ACs Satisfied**: AC1-10 validated through tests. Response schema priority (AC5), deprecated flag handling (AC3), and performance requirements (AC7) all verified.

### File List

**New Files:**

- apps/api/src/services/endpoint-extraction.service.ts
- apps/api/src/plugins/endpoint-extraction.ts
- apps/api/src/**tests**/services/endpoint-extraction.service.test.ts
- apps/api/src/**tests**/integration/endpoint-extraction.test.ts

**Modified Files:**

- apps/api/src/app.ts (plugin registration)
- apps/api/src/routes/specs/openapi.route.ts (extraction integration)

**Verified Existing:**

- apps/api/prisma/schema.prisma (Endpoint model already present)

---

## Change Log

- **2025-11-17:** Story drafted from epics.md and architecture.md. Implements endpoint extraction service that parses OpenAPI specs and creates individual endpoint records. All 10 acceptance criteria mapped to 11 implementation tasks. Includes learnings from Story 2-3 webhook endpoint. Prepares data structure for semantic search in Epic 3.
- **2025-11-17:** Implementation complete. EndpointExtractionService created with full extraction logic for all metadata fields. Integrated with webhook flow. 23 tests added (16 unit + 7 integration). All 292 tests pass. Performance validated: 100 endpoints extracted in <200ms. Story marked for review.

---

_Story created by SM Agent following BMad Method v6_
_Date: 2025-11-17_

---

## Senior Developer Review (AI)

### Reviewer

Brainrepo (via Dev Agent)

### Date

2025-11-17

### Outcome

**APPROVE** - All acceptance criteria implemented with evidence, all tasks verified complete, comprehensive test coverage.

### Summary

Excellent implementation of the Endpoint Extraction Service. All 10 acceptance criteria are fully satisfied with proper test coverage. The service follows established Fastify plugin patterns, uses type-safe Prisma operations, and integrates cleanly with the existing webhook flow. Performance requirement met (100 endpoints < 200ms). No security concerns or architectural violations found.

### Key Findings

**HIGH Severity Issues:** None

**MEDIUM Severity Issues:** None

**LOW Severity Issues:**

1. **[Low]** Missing explicit error handling in extractAndStore for database failures - relies on Prisma exceptions bubbling up, which is acceptable but could benefit from explicit error wrapping for better observability.

### Acceptance Criteria Coverage

| AC#  | Description                                                                         | Status          | Evidence                                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | Extract all path/method combinations and create endpoint records                    | **IMPLEMENTED** | `endpoint-extraction.service.ts:108-126` (extractEndpoints), `schema.prisma:74-103` (Endpoint model)                                           |
| AC2  | Deduplicate endpoints (unique constraint)                                           | **IMPLEMENTED** | `schema.prisma:99` (@@unique([apiVersionId, path, method]))                                                                                    |
| AC3  | Mark deprecated endpoints correctly                                                 | **IMPLEMENTED** | `endpoint-extraction.service.ts:168` (deprecated: op.deprecated \|\| false)                                                                    |
| AC4  | Handle missing schemas gracefully (null)                                            | **IMPLEMENTED** | `endpoint-extraction.service.ts:182-183` (null for missing requestBody), `endpoint-extraction.service.ts:217-218` (null for missing responses) |
| AC5  | Response schema priority (200 > 201 > 2xx > default)                                | **IMPLEMENTED** | `endpoint-extraction.service.ts:221-226` (priorityOrder array)                                                                                 |
| AC6  | $refs already resolved via dereferencing                                            | **IMPLEMENTED** | `openapi.route.ts:157-158` (uses validationResult.dereferenced)                                                                                |
| AC7  | Extract 100 endpoints in < 5 seconds                                                | **IMPLEMENTED** | Test at `endpoint-extraction.service.test.ts:633-664` verifies < 5000ms                                                                        |
| AC8  | Return endpoints_count in webhook response                                          | **IMPLEMENTED** | `openapi.route.ts:170,188` (extractionResult.endpointsExtracted)                                                                               |
| AC9  | Capture all metadata (summary, description, operationId, tags, parameters, schemas) | **IMPLEMENTED** | `endpoint-extraction.service.ts:158-169` (buildEndpoint extracts all fields)                                                                   |
| AC10 | Idempotent extraction (clear and recreate)                                          | **IMPLEMENTED** | `endpoint-extraction.service.ts:291-295` (deleteMany before createMany)                                                                        |

**Summary: 10 of 10 acceptance criteria fully implemented**

### Task Completion Validation

| Task                                  | Marked As | Verified As  | Evidence                                                            |
| ------------------------------------- | --------- | ------------ | ------------------------------------------------------------------- |
| Task 1: Endpoint Model in Prisma      | Complete  | **VERIFIED** | `schema.prisma:74-103`, migrations applied                          |
| Task 2: Create Extraction Service     | Complete  | **VERIFIED** | `services/endpoint-extraction.service.ts` (316 lines)               |
| Task 3: Request Schema Extraction     | Complete  | **VERIFIED** | `endpoint-extraction.service.ts:179-205`                            |
| Task 4: Response Schema Extraction    | Complete  | **VERIFIED** | `endpoint-extraction.service.ts:214-252`                            |
| Task 5: Parameters Extraction         | Complete  | **VERIFIED** | `endpoint-extraction.service.ts:260-282`                            |
| Task 6: Database Storage (Idempotent) | Complete  | **VERIFIED** | `endpoint-extraction.service.ts:291-315`                            |
| Task 7: Fastify Plugin                | Complete  | **VERIFIED** | `plugins/endpoint-extraction.ts` (42 lines)                         |
| Task 8: Webhook Integration           | Complete  | **VERIFIED** | `routes/specs/openapi.route.ts:155-159,188`                         |
| Task 9: Unit Tests                    | Complete  | **VERIFIED** | `__tests__/services/endpoint-extraction.service.test.ts` (16 tests) |
| Task 10: Integration Tests            | Complete  | **VERIFIED** | `__tests__/integration/endpoint-extraction.test.ts` (7 tests)       |
| Task 11: JSDoc Documentation          | Complete  | **VERIFIED** | Service file has comprehensive JSDoc on all public methods          |

**Summary: 11 of 11 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

**Unit Tests (16 passing):**

- AC1: Path/method extraction ✓
- AC2: Unique constraint enforcement ✓
- AC3: Deprecated flag handling ✓
- AC4: Missing schema handling ✓
- AC5: Response priority ordering ✓
- AC7: Performance (100 endpoints < 5s) ✓
- AC9: All metadata fields extracted ✓
- AC10: Idempotency verified ✓

**Integration Tests (7 passing):**

- AC6: Dereferenced spec handling ✓
- AC7: End-to-end performance ✓
- AC8: endpoints_count in response ✓
- AC10: Idempotent uploads ✓

**Test Quality:** High - tests are well-structured, use unique names for isolation, proper cleanup, and meaningful assertions.

**Gaps:** None - all ACs have dedicated test coverage.

### Architectural Alignment

**Compliant with architecture.md:**

- ✓ Follows Fastify plugin pattern with fp() wrapper
- ✓ Uses Prisma ORM for type-safe database access
- ✓ Batch operations (createMany, deleteMany) for performance
- ✓ Cascade deletes configured (deleting ApiVersion removes Endpoints)
- ✓ Stores raw JSON schemas (flattening deferred to Story 3.1)
- ✓ File naming follows kebab-case convention
- ✓ Uses HttpMethod enum from Prisma schema

**No architecture violations found.**

### Security Notes

**No security concerns identified:**

- Input comes from already-validated OpenAPI spec (upstream validation)
- Prisma parameterized queries prevent SQL injection
- No direct user input handling in extraction service
- Foreign key constraints ensure data integrity

### Best-Practices and References

**TypeScript/Prisma:**

- Properly uses `Prisma.InputJsonValue` for JSON fields
- Uses `Prisma.DbNull` for nullable JSON inserts (not null literal)
- Type-safe HttpMethod enum usage

**Fastify:**

- Follows established plugin registration pattern in app.ts
- Module augmentation for TypeScript type safety

**Testing:**

- Sequential test execution to avoid database conflicts
- Cleanup in finally blocks for reliability
- Unique names prevent test collisions

### Action Items

**Code Changes Required:**
None - implementation is complete and correct.

**Advisory Notes:**

- Note: Consider adding explicit try-catch in extractAndStore for better error context in logs (optional enhancement)
- Note: Story 3.1 will need to consume these stored schemas for embedding generation
- Note: Performance is excellent at <200ms for 100 endpoints, well within 5s requirement

---

### Change Log Update

- **2025-11-17:** Senior Developer Review completed. APPROVED. All 10 acceptance criteria verified with evidence. All 11 tasks verified complete. 23 tests passing with comprehensive coverage. No blocking issues found.
