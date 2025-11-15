import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest } from 'fastify'

/**
 * Rate limiting plugin configuration
 * Enforces request limits per API key (from Authorization header)
 */
async function rateLimitPlugin(fastify: FastifyInstance): Promise<void> {
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10)

  await fastify.register(rateLimit, {
    max: maxRequests,
    timeWindow: '1 hour',

    // Extract API key from Authorization header for per-key limiting
    keyGenerator: (request: FastifyRequest) => {
      const authHeader = request.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7) // Return the API key token
      }
      // Fall back to IP address if no auth header
      return request.ip
    },

    // Let the global error handler in app.ts handle 429 errors
    // It will transform them into structured error responses

    // Include Retry-After header automatically (this is default behavior)
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    }
  })
}

// Export as encapsulated Fastify plugin
export default fp(rateLimitPlugin, {
  name: 'rate-limit-plugin',
  fastify: '5.x'
})
