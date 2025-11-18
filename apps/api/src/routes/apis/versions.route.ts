/**
 * API Version History Routes
 * Provides endpoints for retrieving version history of APIs
 */

import { FastifyInstance } from 'fastify'
import { Type, Static } from '@sinclair/typebox'

// Request schemas
const VersionHistoryParamsSchema = Type.Object({
  id: Type.String({ description: 'API ID' })
})

const VersionHistoryQuerySchema = Type.Object({
  environment: Type.Optional(
    Type.String({ description: 'Filter by deployment environment (e.g., dev, staging, prod)' })
  ),
  page: Type.Optional(
    Type.Integer({ minimum: 1, default: 1, description: 'Page number (1-indexed)' })
  ),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      default: 20,
      description: 'Results per page (max 100, values above 100 are capped)'
    })
  )
})

// Response schemas
const VersionEntrySchema = Type.Object({
  id: Type.String({ description: 'Version record ID' }),
  version: Type.String({ description: 'Semantic version string (e.g., 1.2.0)' }),
  environment: Type.String({ description: 'Deployment environment' }),
  uploaded_at: Type.String({ format: 'date-time', description: 'Upload timestamp (ISO 8601)' }),
  endpoints_count: Type.Integer({ description: 'Number of endpoints in this version' })
})

const VersionHistoryResponseSchema = Type.Object({
  versions: Type.Array(VersionEntrySchema, { description: 'Array of version entries' }),
  total: Type.Integer({ description: 'Total versions matching filter' }),
  page: Type.Integer({ description: 'Current page number' }),
  limit: Type.Integer({ description: 'Page size limit' }),
  hasMore: Type.Boolean({ description: 'Whether more pages are available' })
})

const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String({ description: 'Error code' }),
    message: Type.String({ description: 'Human-readable error message' }),
    details: Type.Optional(Type.Any({ description: 'Additional error details' }))
  })
})

// Type definitions for request
type VersionHistoryParams = Static<typeof VersionHistoryParamsSchema>
type VersionHistoryQuery = Static<typeof VersionHistoryQuerySchema>

/**
 * API version history route handler
 * GET /apis/:id/versions
 */
export async function versionsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Params: VersionHistoryParams
    Querystring: VersionHistoryQuery
  }>(
    '/:id/versions',
    {
      schema: {
        description: 'Get version history for an API with optional environment filtering',
        tags: ['APIs'],
        summary: 'Get API version history',
        params: VersionHistoryParamsSchema,
        querystring: VersionHistoryQuerySchema,
        response: {
          200: VersionHistoryResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params
      const { environment, page, limit } = request.query

      request.log.info({ apiId: id, environment, page, limit }, 'Version history requested')

      try {
        const result = await fastify.versionHistoryService.getVersionHistory(id, {
          environment,
          page,
          limit
        })

        request.log.info({ apiId: id, versionsCount: result.total }, 'Version history returned')

        // Log warning for large requests
        if (limit && limit > 50) {
          request.log.warn({ apiId: id, limit }, 'Large version history request')
        }

        // Fastify's serializerCompiler automatically converts Date objects to ISO strings
        // based on the response schema (uploaded_at has format: 'date-time')
        return reply.status(200).send(result)
      } catch (err: any) {
        // Handle 404 errors explicitly
        if (err.statusCode === 404) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: err.message
            }
          })
        }
        // Re-throw other errors to be handled by global error handler
        throw err
      }
    }
  )
}
