import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { VersionHistoryService } from '../services/version-history.service.js'
import { db } from '../lib/db.js'

// Extend Fastify instance interface with versionHistoryService
declare module 'fastify' {
  interface FastifyInstance {
    versionHistoryService: VersionHistoryService
  }
}

/**
 * Version History Service plugin for dependency injection
 * Decorates Fastify instance with VersionHistoryService for retrieving API version history
 *
 * Usage in routes:
 * ```typescript
 * fastify.get('/apis/:id/versions', async (request, reply) => {
 *   const result = await fastify.versionHistoryService.getVersionHistory(apiId, options)
 *   // Returns: { versions, total, page, limit, hasMore }
 * })
 * ```
 */
async function versionHistoryServicePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize version history service with Prisma client
  const service = new VersionHistoryService(db)

  // Decorate Fastify instance for DI
  fastify.decorate('versionHistoryService', service)
}

// Export as encapsulated Fastify plugin
export default fp(versionHistoryServicePlugin, {
  name: 'version-history-service',
  fastify: '5.x',
  dependencies: [] // No other plugin dependencies
})
