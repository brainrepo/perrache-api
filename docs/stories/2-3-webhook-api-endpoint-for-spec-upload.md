# Story 2.3: Webhook API Endpoint for Spec Upload

## Story

**As a** API consumer (CI/CD pipeline),
**I want** a webhook endpoint to POST OpenAPI specs with API key authentication,
**So that** specs are automatically cataloged on every deployment.

## Status

ready-for-dev

## Context

This story implements the core webhook ingestion endpoint that enables zero-effort API cataloging through automated CI/CD integration. This is the primary entry point for all OpenAPI spec uploads into the Perrache catalog.

### Background

- **Epic:** 2 - Webhook Ingestion & Spec Management
- **Previous Story:** 2-2 OpenAPI Spec Validation Service (status: ready-for-dev)
- **Dependencies:** Story 1.6 (API key auth), Story 2.1 (database schema), Story 2.2 (validation service)
- **Enables:** Story 2.4 (Endpoint Extraction), Story 2.5 (Multi-environment support)

### Technical Context

From completed Epic 1 and Story 2.2:

- Fastify backend running at apps/api with TypeScript
- API key authentication middleware available
- OpenAPIValidationService provides spec validation and dereferencing
- Prisma configured with Api and ApiVersion models
- Route pattern: `apps/api/src/routes/*.route.ts`
- Service pattern: `apps/api/src/services/*.service.ts`
- Error handling follows structured format: `{ error: { code, message, details } }`
- TypeBox schemas for request validation
- pnpm workspace with Turborepo

## Estimation

**Story Points:** 5

## Acceptance Criteria

1. - [ ] **Given** the webhook endpoint is deployed
         **When** a POST request is made to `/api/v1/specs/openapi`
         **Then** the endpoint accepts:

   ```
   POST /api/v1/specs/openapi?version=3.1&environment=prod
   Authorization: Bearer {api_key}
   Content-Type: application/json

   {
     "openapi": "3.1.0",
     "info": { "title": "...", "version": "..." },
     "paths": { ... }
   }
   ```

2. - [ ] **And** authentication middleware validates the API key
   - Returns 401 Unauthorized if key is missing or invalid
   - Returns 403 Forbidden if key is revoked
   - Includes API key metadata in request context

3. - [ ] **And** spec validation service checks the spec structure
   - Validates JSON structure
   - Validates OpenAPI version (3.0.x or 3.1.x)
   - Checks required fields: openapi, info, paths
   - Dereferences all $refs

4. - [ ] **And** invalid specs return 400 Bad Request with validation errors:

   ```json
   {
     "error": {
       "code": "INVALID_SPEC",
       "message": "OpenAPI spec validation failed",
       "details": {
         "errors": [...]
       }
     }
   }
   ```

5. - [ ] **And** valid specs are stored in `api_versions` table with:
   - api_id (created or found)
   - version from `info.version`
   - environment from query parameter
   - spec_json (full dereferenced spec)
   - uploaded_at timestamp
   - uploaded_by (API key identifier)

6. - [ ] **And** API metadata is extracted from OpenAPI `info` object:
   - API name from `info.title` (required)
   - Team from `info.x-team` (optional)
   - Owner from `info.x-owner` (optional)
   - Version from `info.version` (required)

7. - [ ] **And** response returns 200 OK for small specs (<100 endpoints):

   ```json
   {
     "api_id": "uuid",
     "version_id": "uuid",
     "status": "processed",
     "endpoints_count": 42,
     "message": "Spec processed successfully"
   }
   ```

8. - [ ] **And** response returns 202 Accepted for large specs (>=100 endpoints):

   ```json
   {
     "api_id": "uuid",
     "version_id": "uuid",
     "job_id": "uuid",
     "status": "queued",
     "message": "Spec queued for background processing"
   }
   ```

9. - [ ] **And** query parameters are handled correctly:
   - `version`: OpenAPI version (default: "3.1", supported: "3.0", "3.1")
   - `environment`: deployment environment (default: "dev")
   - Environment is stored as string (not enum) per architecture decision

10. - [ ] **And** correlation ID is included in response headers for tracing

11. - [ ] **And** rate limiting is enforced via API key middleware (100 requests/hour per key)

12. - [ ] **And** all ingestion requests are logged with:

- API name
- Environment
- Spec size (bytes)
- Endpoint count
- API key identifier (not full key)
- Correlation ID

## Tasks

### Task 1: Create Webhook Route Handler

**AC Coverage:** 1, 9, 10

- [ ] Create `apps/api/src/routes/specs/openapi.route.ts`
- [ ] Define TypeBox schema for request body:
  ```typescript
  const OpenAPISpecSchema = Type.Object(
    {
      openapi: Type.String(),
      info: Type.Object(
        {
          title: Type.String(),
          version: Type.String(),
          'x-team': Type.Optional(Type.String()),
          'x-owner': Type.Optional(Type.String())
        },
        { additionalProperties: true }
      ),
      paths: Type.Object({}, { additionalProperties: true })
    },
    { additionalProperties: true }
  )
  ```
- [ ] Define query parameter schema:
  ```typescript
  const QuerySchema = Type.Object({
    version: Type.Optional(Type.Union([Type.Literal('3.0'), Type.Literal('3.1')])),
    environment: Type.Optional(Type.String())
  })
  ```
- [ ] Set up route with Fastify schema validation
- [ ] Add correlation ID header to response: `X-Correlation-ID`
- [ ] Register route in main app with prefix `/api/v1/specs`

### Task 2: Integrate API Key Authentication

**AC Coverage:** 2, 11

- [ ] Apply API key authentication hook to the route
- [ ] Extract API key from `Authorization: Bearer {key}` header
- [ ] Use existing API key validation middleware from Story 1.6
- [ ] Inject authenticated key metadata into request context:
  ```typescript
  interface AuthenticatedRequest extends FastifyRequest {
    apiKey: {
      id: string
      name: string
      createdAt: Date
    }
  }
  ```
- [ ] Return 401 Unauthorized for missing or invalid keys
- [ ] Return 403 Forbidden for revoked keys
- [ ] Verify rate limiting is applied (100 requests/hour per key)

### Task 3: Integrate OpenAPI Validation Service

**AC Coverage:** 3, 4

- [ ] Import `OpenAPIValidationService` from Story 2.2
- [ ] Call validation service before processing:
  ```typescript
  const validationResult = await fastify.openAPIValidationService.validate(requestBody)
  if (!validationResult.valid) {
    throw new SpecValidationError('OpenAPI spec validation failed', {
      errors: validationResult.errors
    })
  }
  ```
- [ ] Extract dereferenced spec from validation result
- [ ] Handle validation errors with structured error response:
  ```typescript
  {
    error: {
      code: 'INVALID_SPEC',
      message: 'OpenAPI spec validation failed',
      details: { errors: validationResult.errors }
    }
  }
  ```
- [ ] Return 400 Bad Request for validation failures

### Task 4: Implement API Metadata Extraction Service

**AC Coverage:** 6

- [ ] Create `apps/api/src/services/spec-metadata.service.ts`:

  ```typescript
  export interface SpecMetadata {
    name: string
    version: string
    team?: string
    owner?: string
  }

  export class SpecMetadataService {
    extractMetadata(spec: object): SpecMetadata {
      const info = spec.info
      return {
        name: this.sanitizeApiName(info.title),
        version: info.version,
        team: info['x-team'] || null,
        owner: info['x-owner'] || null
      }
    }

    private sanitizeApiName(title: string): string {
      // Remove special characters, trim whitespace
      return title.trim().replace(/[^\w\s-]/g, '')
    }
  }
  ```

- [ ] Handle missing required fields (title, version) with clear errors
- [ ] Sanitize API name to prevent injection
- [ ] Register service as Fastify decorator

### Task 5: Implement Spec Storage Service

**AC Coverage:** 5, 7, 8

- [ ] Create `apps/api/src/services/spec-storage.service.ts`:

  ```typescript
  export interface StorageResult {
    apiId: string
    versionId: string
    endpointsCount: number
    isNewApi: boolean
  }

  export class SpecStorageService {
    async store(
      spec: object,
      metadata: SpecMetadata,
      environment: string,
      uploadedBy: string
    ): Promise<StorageResult>
  }
  ```

- [ ] Find or create API record in `apis` table:
  - Search by name (case-insensitive)
  - Create new if not found
  - Update team/owner if provided and changed
- [ ] Create new `api_versions` record:
  - Link to api_id
  - Store version, environment
  - Store full dereferenced spec in spec_json
  - Record uploaded_at and uploaded_by
- [ ] Count endpoints by iterating `paths` object:
  ```typescript
  countEndpoints(spec: object): number {
    let count = 0
    for (const path of Object.keys(spec.paths)) {
      for (const method of Object.keys(spec.paths[path])) {
        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)) {
          count++
        }
      }
    }
    return count
  }
  ```
- [ ] Return storage result with all identifiers and counts

### Task 6: Implement Sync/Async Processing Logic

**AC Coverage:** 7, 8

- [ ] Define endpoint threshold constant:
  ```typescript
  const SYNC_PROCESSING_THRESHOLD = 100
  ```
- [ ] Implement processing decision logic:
  ```typescript
  if (endpointsCount < SYNC_PROCESSING_THRESHOLD) {
    // Sync processing - return 200
    return reply.status(200).send({
      api_id: result.apiId,
      version_id: result.versionId,
      status: 'processed',
      endpoints_count: endpointsCount,
      message: 'Spec processed successfully'
    })
  } else {
    // Queue for async processing - return 202
    const jobId = await this.queueService.enqueue('spec-processing', {
      apiId: result.apiId,
      versionId: result.versionId,
      environment
    })
    return reply.status(202).send({
      api_id: result.apiId,
      version_id: result.versionId,
      job_id: jobId,
      status: 'queued',
      message: 'Spec queued for background processing'
    })
  }
  ```
- [ ] For MVP: Implement placeholder queue service that stores job reference
- [ ] Actual queue processing will be implemented in Story 2.6

### Task 7: Implement Request Logging

**AC Coverage:** 12

- [ ] Add structured logging for all requests:
  ```typescript
  fastify.log.info(
    {
      apiName: metadata.name,
      environment,
      specSizeBytes: JSON.stringify(spec).length,
      endpointsCount,
      apiKeyId: request.apiKey.id,
      correlationId: request.id
    },
    'Processing spec upload'
  )
  ```
- [ ] Log validation errors at warn level
- [ ] Log storage errors at error level
- [ ] Ensure no sensitive data is logged (full API keys, auth tokens)
- [ ] Include timing information:
  ```typescript
  const start = Date.now()
  // ... processing
  const duration = Date.now() - start
  fastify.log.info({ duration, apiId }, 'Spec upload completed')
  ```

### Task 8: Write Unit Tests

**AC Coverage:** 1-12

- [ ] Create `apps/api/src/__tests__/routes/specs/openapi.route.test.ts`
- [ ] Test successful upload scenarios:
  - [ ] Valid small spec returns 200 with processed status
  - [ ] Valid large spec (100+ endpoints) returns 202 with queued status
  - [ ] API metadata extracted correctly from info object
  - [ ] x-team and x-owner fields captured when present
  - [ ] Environment defaults to 'dev' when not specified
  - [ ] Version defaults to '3.1' when not specified
- [ ] Test authentication scenarios:
  - [ ] Missing Authorization header returns 401
  - [ ] Invalid API key returns 401
  - [ ] Revoked API key returns 403
  - [ ] Valid API key passes through
- [ ] Test validation scenarios:
  - [ ] Invalid JSON returns 400 with INVALID_JSON error
  - [ ] Missing info.title returns 400 with MISSING_REQUIRED_FIELD
  - [ ] Invalid OpenAPI version returns 400
  - [ ] Valid spec passes validation
- [ ] Test edge cases:
  - [ ] Empty paths object (valid but 0 endpoints)
  - [ ] Exactly 99 endpoints (sync processing)
  - [ ] Exactly 100 endpoints (async processing)
  - [ ] Large spec size handling
- [ ] Test response format:
  - [ ] Correlation ID header present
  - [ ] Response structure matches schema
  - [ ] Error responses follow standard format

### Task 9: Write Integration Tests

**AC Coverage:** 1-12

- [ ] Create `apps/api/src/__tests__/integration/specs-upload.test.ts`
- [ ] Test end-to-end flow:
  - [ ] Upload valid spec → verify stored in database
  - [ ] Verify API record created with correct metadata
  - [ ] Verify ApiVersion record created with full spec
  - [ ] Verify endpoint count is correct
  - [ ] Test idempotency: same spec uploaded twice creates two versions
- [ ] Test database state:
  - [ ] Api table updated correctly
  - [ ] ApiVersion table linked properly
  - [ ] Timestamps recorded accurately
- [ ] Use test fixtures from Story 2.2:
  - [ ] `valid-3.0-minimal.json`
  - [ ] `valid-3.1-full.json`
- [ ] Run tests: `pnpm --filter @perrache/api test`

### Task 10: Document API Endpoint

**AC Coverage:** 1, 7, 8, 9

- [ ] Add OpenAPI documentation via Fastify schema:
  ```typescript
  fastify.post(
    '/openapi',
    {
      schema: {
        description: 'Upload OpenAPI specification to catalog',
        tags: ['specs'],
        security: [{ bearerAuth: [] }],
        querystring: QuerySchema,
        body: OpenAPISpecSchema,
        response: {
          200: SuccessResponseSchema,
          202: AcceptedResponseSchema,
          400: ErrorResponseSchema,
          401: UnauthorizedSchema,
          403: ForbiddenSchema
        }
      }
    },
    handler
  )
  ```
- [ ] Verify documentation appears at `/documentation`
- [ ] Add JSDoc comments to all public methods:
  ```typescript
  /**
   * Upload OpenAPI spec to catalog
   * @example
   * curl -X POST http://localhost:3000/api/v1/specs/openapi \
   *   -H "Authorization: Bearer YOUR_API_KEY" \
   *   -H "Content-Type: application/json" \
   *   -d @openapi-spec.json
   */
  ```
- [ ] Create example curl command in README or docs

## Constraints

- MUST use existing API key authentication middleware from Story 1.6
- MUST use OpenAPIValidationService from Story 2.2 for validation
- MUST follow Fastify route plugin pattern
- MUST provide structured error responses matching architecture format
- MUST NOT store plaintext API keys in logs or responses
- MUST handle both sync (small specs) and async (large specs) processing paths
- MUST store environment as string (not enum) per ADR-009
- MUST use correlation IDs for request tracing per NFR-O1
- MUST NOT block on embedding generation (deferred to Story 2.4/3.2)

## Dev Notes

### Key Implementation Details

1. **Route Registration Pattern:**

   ```typescript
   // apps/api/src/routes/specs/index.ts
   import fp from 'fastify-plugin'
   import openapiRoute from './openapi.route'

   export default fp(async (fastify) => {
     fastify.register(openapiRoute, { prefix: '/openapi' })
   })

   // apps/api/src/app.ts
   fastify.register(specsRoutes, { prefix: '/api/v1/specs' })
   ```

2. **API Upsert Pattern:**

   ```typescript
   // Find or create API record
   let api = await prisma.api.findFirst({
     where: {
       name: { equals: metadata.name, mode: 'insensitive' }
     }
   })

   if (!api) {
     api = await prisma.api.create({
       data: {
         name: metadata.name,
         team: metadata.team,
         owner: metadata.owner,
         createdAt: new Date(),
         updatedAt: new Date()
       }
     })
   }
   ```

3. **Error Handling:**

   ```typescript
   class SpecValidationError extends Error {
     constructor(
       message: string,
       public details: object
     ) {
       super(message)
       this.name = 'SpecValidationError'
     }
   }

   // Global error handler will catch and format
   ```

4. **Query Parameter Defaults:**

   ```typescript
   const version = request.query.version || '3.1'
   const environment = request.query.environment || 'dev'
   ```

### Learnings from Previous Story

**From Story 2-2 OpenAPI Spec Validation Service (Status: ready-for-dev)**

- **Service Pattern Established**: `OpenAPIValidationService` provides the validation and dereferencing functionality this story depends on
- **Error Code Structure**: ValidationErrorCode enum defines standard error codes (INVALID_JSON, MISSING_REQUIRED_FIELD, etc.)
- **Dereferenced Spec**: Validation service returns `result.dereferenced` which is the bundled spec ready for storage
- **Fastify Plugin Pattern**: Services are registered as decorators (`fastify.openAPIValidationService`)
- **TypeBox Schemas**: Use for request/response validation with type inference
- **Testing Pattern**: Use fixtures in `apps/api/src/__tests__/fixtures/openapi-specs/`

[Source: stories/2-2-openapi-spec-validation-service.md#Dev-Notes]

### Project Structure Notes

- New route: `apps/api/src/routes/specs/openapi.route.ts`
- New service: `apps/api/src/services/spec-metadata.service.ts`
- New service: `apps/api/src/services/spec-storage.service.ts`
- New tests: `apps/api/src/__tests__/routes/specs/openapi.route.test.ts`
- New tests: `apps/api/src/__tests__/integration/specs-upload.test.ts`
- Route registration: `apps/api/src/routes/specs/index.ts`

### Architecture Alignment

- Route follows RESTful pattern: `/api/v1/specs/openapi`
- Service injection via Fastify decorators
- Error codes align with architecture error response format
- Logging follows structured JSON format with correlation IDs
- Response format matches API contracts in architecture.md
- Environment is string (not enum) per ADR-009
- Database access via Prisma ORM
- TypeBox for schema validation with type inference

### References

- [Source: docs/epics.md#Story-2.3] - Acceptance criteria and webhook endpoint requirements
- [Source: docs/PRD.md#FR-1.1] - Webhook-Based Spec Upload functional requirements
- [Source: docs/PRD.md#NFR-P2] - Webhook ingestion throughput requirements (100 concurrent uploads)
- [Source: docs/PRD.md#NFR-SEC2] - Input validation requirements (max 10MB spec size)
- [Source: docs/architecture.md#API-Contracts] - API response format and endpoint patterns
- [Source: docs/architecture.md#Implementation-Patterns] - Naming conventions and error handling
- [Source: docs/architecture.md#ADR-009] - Environment as string decision
- [Source: stories/2-2-openapi-spec-validation-service.md] - Validation service implementation details

## Dev Agent Record

### Context Reference

- docs/stories/2-3-webhook-api-endpoint-for-spec-upload.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

- **2025-11-16:** Story drafted from epics.md and architecture.md. Implements POST /api/v1/specs/openapi webhook endpoint with API key authentication, OpenAPI spec validation, metadata extraction, database storage, and sync/async processing logic. All 12 acceptance criteria mapped to 10 implementation tasks. Includes learnings from Story 2-2 validation service. Defers actual embedding generation and endpoint extraction to subsequent stories (2.4, 3.2).

---

_Story created by SM Agent following BMad Method v6_
_Date: 2025-11-16_
