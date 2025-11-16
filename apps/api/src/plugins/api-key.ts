import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { ApiKeyService } from '../services/api-key.service.js'

// Extend Fastify instance interface with apiKeyService
declare module 'fastify' {
  interface FastifyInstance {
    apiKeyService: ApiKeyService
  }
}

/**
 * API Key Service plugin for dependency injection
 * Decorates Fastify instance with ApiKeyService initialized from app.config
 */
async function apiKeyServicePlugin(fastify: FastifyInstance): Promise<void> {
  // Initialize service with secret from validated environment config
  const service = new ApiKeyService(fastify.config.API_KEY_SECRET)

  // Decorate Fastify instance for DI
  fastify.decorate('apiKeyService', service)
}

// Export as encapsulated Fastify plugin
export default fp(apiKeyServicePlugin, {
  name: 'api-key-service',
  fastify: '5.x',
  dependencies: [] // No other plugin dependencies
})
