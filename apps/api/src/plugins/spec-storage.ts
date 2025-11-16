import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { SpecStorageService } from '../services/spec-storage.service.js'
import { db } from '../lib/db.js'

// Extend Fastify instance interface with specStorageService
declare module 'fastify' {
  interface FastifyInstance {
    specStorageService: SpecStorageService
  }
}

/**
 * Spec Storage Service plugin for dependency injection
 * Decorates Fastify instance with SpecStorageService for storing OpenAPI specs in database
 *
 * Usage in routes:
 * ```typescript
 * fastify.post('/specs', async (request, reply) => {
 *   const result = await fastify.specStorageService.store(spec, metadata, env, uploadedBy)
 *   // Returns: { apiId, versionId, endpointsCount, isNewApi }
 * })
 * ```
 */
async function specStorageServicePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize storage service with Prisma client
  const service = new SpecStorageService(db)

  // Decorate Fastify instance for DI
  fastify.decorate('specStorageService', service)
}

// Export as encapsulated Fastify plugin
export default fp(specStorageServicePlugin, {
  name: 'spec-storage-service',
  fastify: '5.x',
  dependencies: [] // No other plugin dependencies
})
