import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import rateLimitPlugin from '../plugins/rate-limit'
import { apiKeyService } from '../services/api-key.service'
import { db } from '../lib/db'

describe('Rate Limit Plugin', () => {
  let app: FastifyInstance
  const createdKeyIds: string[] = []
  const originalEnv = process.env.RATE_LIMIT_MAX

  beforeAll(async () => {
    // Set a small limit for testing
    process.env.RATE_LIMIT_MAX = '3'

    // Create a test app with rate limit plugin
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
    await app.close()
  })

  afterEach(async () => {
    // Clean up created keys
    if (createdKeyIds.length > 0) {
      await db.apiKey.deleteMany({
        where: { id: { in: createdKeyIds } }
      })
      createdKeyIds.length = 0
    }
  })

  describe('Rate Limit Enforcement', () => {
    it('should allow requests within rate limit', async () => {
      const { id, key } = await apiKeyService.createApiKey('rate-test')
      createdKeyIds.push(id)

      // Make 3 requests (the limit)
      for (let i = 0; i < 3; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/test',
          headers: {
            authorization: `Bearer ${key}`
          }
        })

        expect(response.statusCode).toBe(200)
        expect(response.json().message).toBe('Success')
      }
    })

    it('should return 429 when rate limit exceeded', async () => {
      const { id, key } = await apiKeyService.createApiKey('exceed-test')
      createdKeyIds.push(id)

      // Make requests up to the limit
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'GET',
          url: '/test',
          headers: {
            authorization: `Bearer ${key}`
          }
        })
      }

      // 4th request should be rate limited
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${key}`
        }
      })

      // Debug: log the response if not 429
      if (response.statusCode !== 429) {
        console.log('Unexpected response:', response.statusCode, response.json())
      }

      expect(response.statusCode).toBe(429)

      const body = response.json()
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(body.error.message).toBeDefined()
    })

    it('should include Retry-After header when rate limited', async () => {
      const { id, key } = await apiKeyService.createApiKey('retry-after-test')
      createdKeyIds.push(id)

      // Exhaust the rate limit
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'GET',
          url: '/test',
          headers: {
            authorization: `Bearer ${key}`
          }
        })
      }

      // Next request should include Retry-After
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${key}`
        }
      })

      expect(response.statusCode).toBe(429)
      expect(response.headers['retry-after']).toBeDefined()
    })

    it('should track rate limits per API key independently', async () => {
      const key1Result = await apiKeyService.createApiKey('key1')
      const key2Result = await apiKeyService.createApiKey('key2')
      createdKeyIds.push(key1Result.id, key2Result.id)

      // Exhaust limit for key1
      for (let i = 0; i < 3; i++) {
        await app.inject({
          method: 'GET',
          url: '/test',
          headers: {
            authorization: `Bearer ${key1Result.key}`
          }
        })
      }

      // Key1 should be rate limited
      const key1Response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${key1Result.key}`
        }
      })
      expect(key1Response.statusCode).toBe(429)

      // Key2 should still have quota
      const key2Response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${key2Result.key}`
        }
      })
      expect(key2Response.statusCode).toBe(200)
    })

    it('should include rate limit headers in response', async () => {
      const { id, key } = await apiKeyService.createApiKey('headers-test')
      createdKeyIds.push(id)

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          authorization: `Bearer ${key}`
        }
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['x-ratelimit-limit']).toBeDefined()
      expect(response.headers['x-ratelimit-remaining']).toBeDefined()
      expect(response.headers['x-ratelimit-reset']).toBeDefined()
    })
  })
})
