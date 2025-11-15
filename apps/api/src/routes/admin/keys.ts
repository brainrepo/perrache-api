import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { apiKeyService } from '../../services/api-key.service.js'
import type { ApiKeyCreateRequest, ApiKeyCreateResponse } from '@perrache/types'

// Request/Response schemas using TypeBox for runtime validation
// These schemas match the shared types in @perrache/types
const CreateKeyRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, description: 'Descriptive name for the API key' })
})

const CreateKeyResponseSchema = Type.Object({
  id: Type.String({ description: 'Unique identifier for the API key' }),
  key: Type.String({ description: 'Plaintext API key (shown ONCE)' }),
  name: Type.String({ description: 'Descriptive name for the API key' }),
  createdAt: Type.String({ format: 'date-time', description: 'Timestamp when the key was created' })
})

const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any())
  })
})

/**
 * Admin API routes for API key management
 * Handles key creation and revocation
 */
export async function adminKeysRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/admin/keys - Create new API key
  fastify.post<{ Body: ApiKeyCreateRequest }>(
    '/',
    {
      schema: {
        description: 'Generate a new API key',
        tags: ['Admin', 'API Keys'],
        body: CreateKeyRequestSchema,
        response: {
          201: CreateKeyResponseSchema,
          400: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { name } = request.body

      const result = await apiKeyService.createApiKey(name)

      const response: ApiKeyCreateResponse = {
        id: result.id,
        key: result.key,
        name: result.name,
        createdAt: result.createdAt.toISOString()
      }

      return reply.status(201).send(response)
    }
  )

  // DELETE /api/v1/admin/keys/:id - Revoke API key
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Revoke an API key (soft delete)',
        tags: ['Admin', 'API Keys'],
        params: Type.Object({
          id: Type.String({ description: 'API key ID to revoke' })
        }),
        response: {
          204: Type.Null({ description: 'Key successfully revoked' }),
          404: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params

      await apiKeyService.revokeApiKey(id)

      return reply.status(204).send()
    }
  )
}
