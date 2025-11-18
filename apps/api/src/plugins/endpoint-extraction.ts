import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { EndpointExtractionService } from '../services/endpoint-extraction.service.js'
import { db } from '../lib/db.js'

// Extend Fastify instance interface with endpointExtractionService
declare module 'fastify' {
  interface FastifyInstance {
    endpointExtractionService: EndpointExtractionService
  }
}

/**
 * Endpoint Extraction Service plugin for dependency injection
 * Decorates Fastify instance with EndpointExtractionService for extracting and storing
 * individual endpoints from OpenAPI specs.
 *
 * Usage in routes:
 * ```typescript
 * fastify.post('/specs', async (request, reply) => {
 *   const extractionResult = await fastify.endpointExtractionService.extractAndStore(
 *     apiVersionId,
 *     dereferencedSpec
 *   )
 *   // Returns: { endpointsExtracted: 42, endpoints: [...] }
 * })
 * ```
 */
async function endpointExtractionServicePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize extraction service with Prisma client
  const service = new EndpointExtractionService(db)

  // Decorate Fastify instance for DI
  fastify.decorate('endpointExtractionService', service)
}

// Export as encapsulated Fastify plugin
export default fp(endpointExtractionServicePlugin, {
  name: 'endpoint-extraction-service',
  fastify: '5.x',
  dependencies: [] // No other plugin dependencies
})
