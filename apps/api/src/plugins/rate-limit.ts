import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest } from 'fastify'

/**
 * Rate limiting plugin configuration
 * Enforces request limits per IP address to prevent brute force attacks
 *
 * Security: Uses IP-based limiting to prevent attackers from bypassing
 * rate limits by using different tokens for each request
 */
async function rateLimitPlugin(fastify: FastifyInstance): Promise<void> {
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10)

  await fastify.register(rateLimit, {
    max: maxRequests,
    timeWindow: '1 hour',

    // Use IP address as the rate limit key to prevent brute force attacks
    // This ensures that even if attackers use different tokens, they are still limited
    keyGenerator: (request: FastifyRequest) => {
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
