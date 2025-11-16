import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

// Extend Fastify Request interface
declare module 'fastify' {
  interface FastifyRequest {
    apiKeyId: string | null
  }
}

/**
 * Authentication plugin for API key validation
 * Validates Bearer token in Authorization header against stored hashes
 */
async function authPlugin(fastify: FastifyInstance): Promise<void> {
  // Decorate request with apiKeyId property
  fastify.decorateRequest('apiKeyId', null)

  // Add onRequest hook for Bearer token validation
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization

    // Check for Authorization header with Bearer prefix
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        }
      })
      return reply
    }

    // Extract token from header
    const token = authHeader.slice(7) // Remove 'Bearer ' prefix

    if (!token) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing API key'
        }
      })
      return reply
    }

    // Validate token against database
    const validationResult = await fastify.apiKeyService.validateApiKey(token)

    if (!validationResult) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or revoked API key'
        }
      })
      return reply
    }

    // Attach API key ID to request for downstream use
    request.apiKeyId = validationResult.id
  })
}

// Export as encapsulated Fastify plugin
export default fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '5.x'
})
