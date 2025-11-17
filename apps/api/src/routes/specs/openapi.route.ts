/**
 * OpenAPI Spec Upload Webhook Route
 * POST /api/v1/specs/openapi - Upload OpenAPI specifications for cataloging
 *
 * Accepts OpenAPI 3.0.x and 3.1.x specifications with:
 * - API key authentication
 * - Validation and dereferencing
 * - Metadata extraction
 * - Database storage
 * - Sync/async processing based on spec size
 *
 * @example
 * curl -X POST http://localhost:3000/api/v1/specs/openapi \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d @openapi-spec.json
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Type, Static } from '@sinclair/typebox'

// Request body schema - OpenAPI spec structure
const OpenAPISpecSchema = Type.Object(
  {
    openapi: Type.String({ description: 'OpenAPI version (3.0.x or 3.1.x)' }),
    info: Type.Object(
      {
        title: Type.String({ description: 'API title' }),
        version: Type.String({ description: 'API version' }),
        'x-team': Type.Optional(Type.String({ description: 'Team owning the API' })),
        'x-owner': Type.Optional(Type.String({ description: 'Individual owner of the API' }))
      },
      { additionalProperties: true }
    ),
    paths: Type.Object({}, { additionalProperties: true })
  },
  { additionalProperties: true }
)

// Query parameter schema
const QuerySchema = Type.Object({
  version: Type.Optional(
    Type.Union([Type.Literal('3.0'), Type.Literal('3.1')], {
      description: 'OpenAPI version (default: 3.1)'
    })
  ),
  environment: Type.Optional(Type.String({ description: 'Deployment environment (default: dev)' }))
})

// Success response schema (200 - sync processed)
const SuccessResponseSchema = Type.Object({
  api_id: Type.String({ description: 'Unique identifier for the API' }),
  version_id: Type.String({ description: 'Unique identifier for this version' }),
  status: Type.Literal('processed'),
  endpoints_count: Type.Number({ description: 'Number of endpoints in the spec' }),
  message: Type.String({ description: 'Success message' })
})

// Accepted response schema (202 - async queued)
const AcceptedResponseSchema = Type.Object({
  api_id: Type.String({ description: 'Unique identifier for the API' }),
  version_id: Type.String({ description: 'Unique identifier for this version' }),
  job_id: Type.String({ description: 'Job identifier for tracking async processing' }),
  status: Type.Literal('queued'),
  message: Type.String({ description: 'Status message' })
})

// Error response schema
const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String({ description: 'Error code' }),
    message: Type.String({ description: 'Error message' }),
    details: Type.Optional(Type.Any({ description: 'Additional error details' }))
  })
})

// Type inference for request/response
type OpenAPISpecBody = Static<typeof OpenAPISpecSchema>
type QueryParams = Static<typeof QuerySchema>

// Threshold for sync vs async processing
const SYNC_PROCESSING_THRESHOLD = 100

/**
 * OpenAPI spec upload route handler
 * Registers POST /openapi endpoint for spec uploads
 */
export async function openapiRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: OpenAPISpecBody; Querystring: QueryParams }>(
    '/',
    {
      schema: {
        description: 'Upload OpenAPI specification to catalog',
        tags: ['Specs'],
        security: [{ bearerAuth: [] }],
        querystring: QuerySchema,
        body: OpenAPISpecSchema,
        response: {
          200: SuccessResponseSchema,
          202: AcceptedResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          429: ErrorResponseSchema
        }
      }
    },
    async (
      request: FastifyRequest<{ Body: OpenAPISpecBody; Querystring: QueryParams }>,
      reply: FastifyReply
    ) => {
      const start = Date.now()

      // Extract query parameters with defaults
      const environment = request.query.environment || 'dev'

      // Step 1: Validate spec using OpenAPIValidationService
      const validationResult = await fastify.openAPIValidationService.validate(request.body)

      if (!validationResult.valid) {
        request.log.warn(
          {
            errors: validationResult.errors,
            apiKeyId: request.apiKeyId,
            correlationId: request.id
          },
          'OpenAPI spec validation failed'
        )

        return reply.status(400).send({
          error: {
            code: 'INVALID_SPEC',
            message: 'OpenAPI spec validation failed',
            details: {
              errors: validationResult.errors
            }
          }
        })
      }

      // Use dereferenced spec for storage
      const dereferencedSpec = validationResult.dereferenced!

      // Step 2: Extract metadata from spec
      const metadata = fastify.specMetadataService.extractMetadata(dereferencedSpec)

      // Step 3: Store spec in database
      const storageResult = await fastify.specStorageService.store(
        dereferencedSpec,
        metadata,
        environment,
        request.apiKeyId!
      )

      // Step 4: Extract and store individual endpoints
      const extractionResult = await fastify.endpointExtractionService.extractAndStore(
        storageResult.versionId,
        dereferencedSpec
      )

      const duration = Date.now() - start
      const specSizeBytes = JSON.stringify(request.body).length

      // Step 5: Log request details (AC12)
      request.log.info(
        {
          apiName: metadata.name,
          environment,
          specSizeBytes,
          endpointsCount: extractionResult.endpointsExtracted,
          apiKeyId: request.apiKeyId,
          correlationId: request.id,
          duration,
          apiId: storageResult.apiId,
          versionId: storageResult.versionId,
          isNewApi: storageResult.isNewApi
        },
        'Spec upload completed'
      )

      // Step 6: Return appropriate response based on endpoint count
      if (extractionResult.endpointsExtracted < SYNC_PROCESSING_THRESHOLD) {
        // Sync processing - return 200
        return reply.status(200).send({
          api_id: storageResult.apiId,
          version_id: storageResult.versionId,
          status: 'processed' as const,
          endpoints_count: extractionResult.endpointsExtracted,
          message: 'Spec processed successfully'
        })
      } else {
        // Queue for async processing - return 202
        // For MVP: generate a placeholder job ID
        // Actual queue processing will be implemented in Story 2.6
        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

        request.log.info(
          {
            jobId,
            apiId: storageResult.apiId,
            versionId: storageResult.versionId,
            endpointsCount: extractionResult.endpointsExtracted
          },
          'Spec queued for background processing'
        )

        return reply.status(202).send({
          api_id: storageResult.apiId,
          version_id: storageResult.versionId,
          job_id: jobId,
          status: 'queued' as const,
          message: 'Spec queued for background processing'
        })
      }
    }
  )
}
