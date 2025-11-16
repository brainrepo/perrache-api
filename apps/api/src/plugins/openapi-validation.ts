import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { OpenAPIValidationService } from '../services/openapi-validation.service.js'

// Extend Fastify instance interface with openAPIValidationService
declare module 'fastify' {
  interface FastifyInstance {
    openAPIValidationService: OpenAPIValidationService
  }
}

/**
 * OpenAPI Validation Service plugin for dependency injection
 * Decorates Fastify instance with OpenAPIValidationService for validating OpenAPI specs
 *
 * Usage in routes:
 * ```typescript
 * fastify.post('/specs', async (request, reply) => {
 *   const result = await fastify.openAPIValidationService.validate(request.body)
 *   if (!result.valid) {
 *     return reply.status(400).send({ error: result.errors })
 *   }
 *   // Store result.dereferenced in database
 * })
 * ```
 */
async function openAPIValidationServicePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize stateless validation service (no configuration needed)
  const service = new OpenAPIValidationService()

  // Decorate Fastify instance for DI
  fastify.decorate('openAPIValidationService', service)
}

// Export as encapsulated Fastify plugin
export default fp(openAPIValidationServicePlugin, {
  name: 'openapi-validation-service',
  fastify: '5.x',
  dependencies: [] // No other plugin dependencies (stateless service)
})
