import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import rateLimitPlugin from '../plugins/rate-limit'

describe('Rate Limit Plugin', () => {
  let app: FastifyInstance
  const originalEnv = process.env.RATE_LIMIT_MAX

  beforeEach(async () => {
    // Set a small limit for testing
    process.env.RATE_LIMIT_MAX = '3'

    // Create a fresh test app for each test to reset rate limit counters
    app = Fastify({ logger: false })

    await app.register(rateLimitPlugin)

    // Add error handler similar to the main app that converts 429 to structured response
    app.setErrorHandler((error, request, reply) => {
      const err = error as any
      const statusCode = err.statusCode || 500
      let errorCode = 'INTERNAL_ERROR'

      if (statusCode === 429) {
        errorCode = 'RATE_LIMIT_EXCEEDED'
      }

      reply.status(statusCode).send({
        error: {
          code: errorCode,
          message: err.message || 'Internal server error'
        }
      })
    })

    // Add a test route
    app.get('/test', async () => {
      return { message: 'Success' }
    })

    await app.ready()
  })

  afterAll(async () => {
    // Restore original env
    process.env.RATE_LIMIT_MAX = originalEnv
  })

  describe('Rate Limit Enforcement', () => {
    it('should allow requests within rate limit', async () => {
      // Make 3 requests (the limit) - all from same IP
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/test'
        })

        expect(response.statusCode).toBe(200)
        expect(response.json().message).toBe('Success')
      }

      await app.close()
    })

    it('should return 429 when rate limit exceeded', async () => {
      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'GET',
          url: '/test'
        })
      }

      // 4th request should be rate limited
      const response = await app.inject({
        method: 'GET',
        url: '/test'
      })

      expect(response.statusCode).toBe(429)

      const body = response.json()
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(body.error.message).toBeDefined()

      await app.close()
    })

    it('should include Retry-After header when rate limited', async () => {
      // Exhaust the rate limit
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'GET',
          url: '/test'
        })
      }

      // Next request should include Retry-After
      const response = await app.inject({
        method: 'GET',
        url: '/test'
      })

      expect(response.statusCode).toBe(429)
      expect(response.headers['retry-after']).toBeDefined()

      await app.close()
    })

    it('should rate limit regardless of token used (prevents brute force)', async () => {
      // Make requests with different tokens - they should all count toward the same IP limit
      const tokens = ['token1', 'token2', 'token3', 'token4']

      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/test',
          headers: {
            authorization: `Bearer ${tokens[i]}`
          }
        })
        expect(response.statusCode).toBe(200)
      }

      // 4th request with yet another token should still be rate limited
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${tokens[3]}`
        }
      })

      expect(response.statusCode).toBe(429)
      expect(response.json().error.code).toBe('RATE_LIMIT_EXCEEDED')

      await app.close()
    })

    it('should rate limit requests without auth headers', async () => {
      // Make requests without any auth header
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/test'
        })
        expect(response.statusCode).toBe(200)
      }

      // 4th request should be rate limited
      const response = await app.inject({
        method: 'GET',
        url: '/test'
      })

      expect(response.statusCode).toBe(429)

      await app.close()
    })

    it('should include rate limit headers in response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBeDefined()
      expect(response.headers['x-ratelimit-remaining']).toBeDefined()
      expect(response.headers['x-ratelimit-reset']).toBeDefined()

      await app.close()
    })
  })
})
