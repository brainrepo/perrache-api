import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { SpecMetadataService } from '../services/spec-metadata.service.js'

// Extend Fastify instance interface with specMetadataService
declare module 'fastify' {
  interface FastifyInstance {
    specMetadataService: SpecMetadataService
  }
}

/**
 * Spec Metadata Service plugin for dependency injection
 * Decorates Fastify instance with SpecMetadataService for extracting metadata from OpenAPI specs
 *
 * Usage in routes:
 * ```typescript
 * fastify.post('/specs', async (request, reply) => {
 *   const metadata = fastify.specMetadataService.extractMetadata(spec)
 *   // Returns: { name, version, team, owner }
 * })
 * ```
 */
async function specMetadataServicePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize stateless metadata extraction service
  const service = new SpecMetadataService()

  // Decorate Fastify instance for DI
  fastify.decorate('specMetadataService', service)
}

// Export as encapsulated Fastify plugin
export default fp(specMetadataServicePlugin, {
  name: 'spec-metadata-service',
  fastify: '5.x',
  dependencies: [] // No other plugin dependencies (stateless service)
})
