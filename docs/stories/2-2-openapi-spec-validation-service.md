# Story 2.2: OpenAPI Spec Validation Service

## Story

**As a** backend developer,
**I want** a service that validates OpenAPI specs before accepting them,
**So that** only well-formed specs are ingested into the catalog.

## Status

ready-for-dev

## Context

This story establishes the validation layer for API spec ingestion, ensuring only valid OpenAPI specifications enter the catalog. This is a critical prerequisite for Story 2.3 (Webhook Endpoint) and Story 2.4 (Endpoint Extraction), as invalid specs must be rejected before processing.

### Background

- **Epic:** 2 - Webhook Ingestion & Spec Management
- **Previous Story:** 2-1 Database Schema for API Catalog (in-progress)
- **Dependencies:** Story 1.3 (Fastify backend server setup)
- **Enables:** Story 2.3 (Webhook API Endpoint), Story 2.4 (Endpoint Extraction)

### Technical Context

From completed Epic 1 and architecture decisions:

- Fastify backend running at apps/api with TypeScript
- Service pattern: `apps/api/src/services/*.service.ts`
- Error handling follows structured format: `{ error: { code, message, details } }`
- Input validation via TypeBox schemas
- Prisma configured for database operations
- pnpm workspace with Turborepo

## Estimation

**Story Points:** 3

## Acceptance Criteria

1. - [ ] **Given** an OpenAPI spec is submitted
         **When** validation runs
         **Then** the service checks:
     - Valid JSON structure (parseable JSON)
     - OpenAPI version is 3.0.x or 3.1.x
     - Required fields exist: openapi, info, paths
     - info.title and info.version are present
     - Paths object contains at least one endpoint
     - Each operation has valid HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)

2. - [ ] **And** the service validates $ref resolution:
     - All $refs are resolvable (internal or external)
     - Circular $refs are detected and handled
     - Dereferencing completes without errors

3. - [ ] **And** validation errors return structured response:
     ```json
     {
       "valid": false,
       "errors": [
         {
           "path": "paths./users.get",
           "message": "Missing required field: responses",
           "code": "MISSING_REQUIRED_FIELD"
         }
       ]
     }
     ```

4. - [ ] **And** valid specs return: `{ "valid": true, "dereferenced": <bundled_spec> }`

5. - [ ] **And** $refs are resolved recursively and bundled into single spec before storage

6. - [ ] **And** reasonable limits are enforced:
     - Max spec size: 10MB
     - Max endpoints per spec: 1000

7. - [ ] **And** the validation service is exported for use in other modules

8. - [ ] **And** comprehensive error messages guide users to fix validation issues

## Tasks

### Task 1: Install and Configure OpenAPI Validation Library

**AC Coverage:** 1, 2, 3, 5

- [ ] Research and select validation library (recommended: @readme/openapi-parser or @apidevtools/swagger-parser)
- [ ] Install chosen library:
  ```bash
  pnpm --filter @perrache/api add @readme/openapi-parser
  # or
  pnpm --filter @perrache/api add @apidevtools/swagger-parser
  ```
- [ ] Add TypeScript types if needed:
  ```bash
  pnpm --filter @perrache/api add -D @types/swagger-parser
  ```
- [ ] Verify library supports:
  - OpenAPI 3.0.x and 3.1.x
  - $ref dereferencing (bundling)
  - Validation error reporting with paths
- [ ] Document library choice in code comments

### Task 2: Create OpenAPI Validation Service

**AC Coverage:** 1, 2, 3, 4, 5, 7, 8

- [ ] Create `apps/api/src/services/openapi-validation.service.ts`
- [ ] Define service class `OpenAPIValidationService`:

  ```typescript
  export interface ValidationError {
    path: string
    message: string
    code: string
  }

  export interface ValidationResult {
    valid: boolean
    errors?: ValidationError[]
    dereferenced?: object // Bundled spec with resolved $refs
  }

  export class OpenAPIValidationService {
    async validate(spec: unknown): Promise<ValidationResult>
    async dereference(spec: object): Promise<object>
    private checkRequiredFields(spec: object): ValidationError[]
    private checkOpenAPIVersion(spec: object): ValidationError[]
    private checkPaths(spec: object): ValidationError[]
    private checkOperations(spec: object): ValidationError[]
  }
  ```

- [ ] Implement `validate()` method:
  - [ ] Check JSON structure validity
  - [ ] Verify OpenAPI version (3.0.x or 3.1.x)
  - [ ] Check required fields: openapi, info.title, info.version, paths
  - [ ] Ensure paths contains at least one endpoint
  - [ ] Validate HTTP methods on operations
  - [ ] Attempt $ref dereferencing
  - [ ] Return structured ValidationResult
- [ ] Implement `dereference()` method using library's bundling
- [ ] Handle circular $ref detection
- [ ] Map library errors to structured ValidationError format
- [ ] Export service instance for dependency injection

### Task 3: Implement Size and Complexity Limits

**AC Coverage:** 6

- [ ] Add limit validation methods to service:
  ```typescript
  private checkSizeLimits(spec: object): ValidationError[]
  private countEndpoints(spec: object): number
  ```
- [ ] Implement spec size check:
  - [ ] Calculate JSON string size
  - [ ] Reject if > 10MB with error code: `SPEC_TOO_LARGE`
- [ ] Implement endpoint count check:
  - [ ] Count all path/method combinations
  - [ ] Reject if > 1000 with error code: `TOO_MANY_ENDPOINTS`
- [ ] Add constants for limits:
  ```typescript
  const MAX_SPEC_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
  const MAX_ENDPOINTS = 1000
  ```

### Task 4: Create Error Code Enumeration

**AC Coverage:** 3, 8

- [ ] Define error codes in `apps/api/src/types/validation-errors.ts`:
  ```typescript
  export enum ValidationErrorCode {
    INVALID_JSON = 'INVALID_JSON',
    INVALID_OPENAPI_VERSION = 'INVALID_OPENAPI_VERSION',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    INVALID_HTTP_METHOD = 'INVALID_HTTP_METHOD',
    NO_PATHS_DEFINED = 'NO_PATHS_DEFINED',
    UNRESOLVABLE_REF = 'UNRESOLVABLE_REF',
    CIRCULAR_REF = 'CIRCULAR_REF',
    SPEC_TOO_LARGE = 'SPEC_TOO_LARGE',
    TOO_MANY_ENDPOINTS = 'TOO_MANY_ENDPOINTS',
    SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR'
  }
  ```
- [ ] Map library-specific errors to standard codes
- [ ] Provide human-readable messages for each error type

### Task 5: Write Unit Tests for Validation Service

**AC Coverage:** 1-8

- [ ] Create `apps/api/src/__tests__/openapi-validation.service.test.ts`
- [ ] Test valid spec scenarios:
  - [ ] Valid OpenAPI 3.0.x spec returns valid: true
  - [ ] Valid OpenAPI 3.1.x spec returns valid: true
  - [ ] Dereferenced spec is bundled (no external $refs)
  - [ ] Spec with internal $refs successfully resolves
- [ ] Test invalid spec scenarios:
  - [ ] Invalid JSON returns INVALID_JSON error
  - [ ] Missing openapi field returns MISSING_REQUIRED_FIELD
  - [ ] Missing info.title returns MISSING_REQUIRED_FIELD
  - [ ] Unsupported OpenAPI version returns INVALID_OPENAPI_VERSION
  - [ ] Empty paths object returns NO_PATHS_DEFINED
  - [ ] Invalid HTTP method returns INVALID_HTTP_METHOD
  - [ ] Unresolvable $ref returns UNRESOLVABLE_REF
- [ ] Test limit enforcement:
  - [ ] Spec > 10MB returns SPEC_TOO_LARGE
  - [ ] Spec with > 1000 endpoints returns TOO_MANY_ENDPOINTS
- [ ] Test error message quality:
  - [ ] Error paths correctly identify location
  - [ ] Error messages are actionable
- [ ] Create test fixtures:
  - [ ] Valid minimal OpenAPI 3.0 spec
  - [ ] Valid minimal OpenAPI 3.1 spec
  - [ ] Various invalid specs for each error case

### Task 6: Create Fastify Plugin for Validation Service

**AC Coverage:** 7

- [ ] Create `apps/api/src/plugins/openapi-validation.ts`:

  ```typescript
  import fp from 'fastify-plugin'
  import { OpenAPIValidationService } from '../services/openapi-validation.service'

  export default fp(async (fastify) => {
    const validationService = new OpenAPIValidationService()
    fastify.decorate('openAPIValidationService', validationService)
  })

  declare module 'fastify' {
    interface FastifyInstance {
      openAPIValidationService: OpenAPIValidationService
    }
  }
  ```

- [ ] Register plugin in `apps/api/src/app.ts`
- [ ] Verify service is accessible via `fastify.openAPIValidationService`

### Task 7: Add Integration Test with Sample Specs

**AC Coverage:** 1-8

- [ ] Create test fixtures directory: `apps/api/src/__tests__/fixtures/openapi-specs/`
- [ ] Add sample valid specs:
  - [ ] `valid-3.0-minimal.json` - Minimal valid OpenAPI 3.0
  - [ ] `valid-3.1-full.json` - Complete OpenAPI 3.1 with various operations
  - [ ] `valid-with-refs.json` - Spec with internal $refs to dereference
- [ ] Add sample invalid specs:
  - [ ] `invalid-missing-info.json`
  - [ ] `invalid-no-paths.json`
  - [ ] `invalid-bad-method.json`
- [ ] Write integration test that loads these files and validates
- [ ] Ensure all tests pass: `pnpm --filter @perrache/api test`

### Task 8: Document Service API and Usage

**AC Coverage:** 7, 8

- [ ] Add JSDoc comments to all public methods
- [ ] Create usage example in service file:
  ```typescript
  /**
   * @example
   * const service = new OpenAPIValidationService()
   * const result = await service.validate(specObject)
   * if (!result.valid) {
   *   console.error(result.errors)
   * } else {
   *   const bundledSpec = result.dereferenced
   * }
   */
  ```
- [ ] Document error codes and their meanings
- [ ] Note performance characteristics (sync vs async operations)

## Constraints

- MUST use established validation library (not custom JSON Schema validation)
- MUST support both OpenAPI 3.0.x and 3.1.x specifications
- MUST dereference (bundle) all $refs before returning
- MUST follow Fastify plugin pattern for service injection
- MUST provide structured error responses matching architecture error format
- MUST handle edge cases: empty objects, null values, malformed JSON
- MUST NOT perform database operations (validation is stateless)

## Dev Notes

### Key Implementation Details

1. **Library Selection Rationale:**

   Recommended: `@readme/openapi-parser` or `@apidevtools/swagger-parser`
   - Both support OpenAPI 3.0 and 3.1
   - Built-in $ref dereferencing (bundling)
   - Comprehensive validation with error reporting
   - Actively maintained

   ```typescript
   // Example with @apidevtools/swagger-parser
   import SwaggerParser from '@apidevtools/swagger-parser'

   async validate(spec: unknown): Promise<ValidationResult> {
     try {
       // Validate and dereference in one step
       const dereferenced = await SwaggerParser.validate(spec)
       return {
         valid: true,
         dereferenced
       }
     } catch (error) {
       return {
         valid: false,
         errors: this.mapParserError(error)
       }
     }
   }
   ```

2. **Error Mapping Strategy:**

   ```typescript
   private mapParserError(error: any): ValidationError[] {
     // Map library-specific errors to structured format
     if (error.name === 'SyntaxError') {
       return [{
         path: '',
         message: 'Invalid JSON syntax',
         code: ValidationErrorCode.INVALID_JSON
       }]
     }

     if (error.message.includes('$ref')) {
       return [{
         path: error.path || '',
         message: error.message,
         code: ValidationErrorCode.UNRESOLVABLE_REF
       }]
     }

     // Generic validation error
     return [{
       path: error.path || '',
       message: error.message,
       code: ValidationErrorCode.SCHEMA_VALIDATION_ERROR
     }]
   }
   ```

3. **Pre-validation Checks (before library validation):**

   ```typescript
   async validate(spec: unknown): Promise<ValidationResult> {
     const errors: ValidationError[] = []

     // 1. Check if it's an object
     if (typeof spec !== 'object' || spec === null) {
       return {
         valid: false,
         errors: [{ path: '', message: 'Spec must be a JSON object', code: 'INVALID_JSON' }]
       }
     }

     // 2. Check size limits
     const sizeCheck = this.checkSizeLimits(spec)
     if (sizeCheck.length > 0) return { valid: false, errors: sizeCheck }

     // 3. Check endpoint count
     const endpointCheck = this.countEndpoints(spec)
     if (endpointCheck.length > 0) return { valid: false, errors: endpointCheck }

     // 4. Run library validation
     return await this.validateWithLibrary(spec)
   }
   ```

### Learnings from Previous Story

**From Story 2-1 (Status: in-progress)**

- **Database schema pattern:** ApiVersion.specJson stores full OpenAPI spec as JSON - validation service must return dereferenced spec for storage
- **Service pattern:** Follow `*.service.ts` naming convention in `apps/api/src/services/`
- **Prisma client:** Available via `fastify.prisma` decorator
- **Testing pattern:** Use Vitest with `apps/api/src/__tests__/` structure

**From Epic 1:**

- **Plugin pattern:** Use fastify-plugin for encapsulation
- **Error handling:** Global error handler formats all errors consistently
- **TypeScript:** Strict mode enabled, use proper typing

[Source: stories/2-1-database-schema-for-api-catalog.md#Dev-Notes]

### Project Structure Notes

- New service: `apps/api/src/services/openapi-validation.service.ts`
- New plugin: `apps/api/src/plugins/openapi-validation.ts`
- New types: `apps/api/src/types/validation-errors.ts`
- New tests: `apps/api/src/__tests__/openapi-validation.service.test.ts`
- Test fixtures: `apps/api/src/__tests__/fixtures/openapi-specs/`

### Architecture Alignment

- Service follows stateless validation pattern
- No database dependency (pure validation)
- Returns dereferenced spec for subsequent storage in ApiVersion.specJson
- Error codes align with architecture error response format
- Plugin pattern consistent with Fastify best practices

### References

- [Source: docs/epics.md#Story-2.2] - Acceptance criteria and technical notes
- [Source: docs/PRD.md#FR-1.4] - Spec Validation functional requirements
- [Source: docs/PRD.md#NFR-SEC2] - Input validation security requirements
- [Source: docs/architecture.md#Implementation-Patterns] - Service pattern and error handling
- [Source: docs/architecture.md#API-Response-Format] - Error response structure

## Dev Agent Record

### Context Reference

- docs/stories/2-2-openapi-spec-validation-service.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

- **2025-11-16:** Story drafted from epics.md and architecture.md. Designed as stateless validation service that validates OpenAPI specs and returns bundled (dereferenced) specs for storage. All 8 acceptance criteria mapped to 8 implementation tasks. Includes library selection guidance, error mapping strategy, and size/complexity limits per PRD requirements.

---

_Story created by SM Agent following BMad Method v6_
_Date: 2025-11-16_
