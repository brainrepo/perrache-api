import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import authPlugin from '../plugins/auth'
import { ApiKeyService } from '../services/api-key.service'
import { db } from '../lib/db'

describe('Auth Plugin', () => {
  let app: FastifyInstance
  const createdKeyIds: string[] = []
  const testSecret =
    process.env.API_KEY_SECRET || 'test-secret-key-for-hmac-sha256-hashing-minimum-32-chars'
  const apiKeyService = new ApiKeyService(testSecret)

  beforeAll(async () => {
    // Create a test app with auth plugin
    app = Fastify({ logger: false })

    // Decorate Fastify instance with apiKeyService (normally done by api-key plugin)
    app.decorate('apiKeyService', apiKeyService)

    // Register auth plugin on a protected route context
    await app.register(async (instance) => {
      await instance.register(authPlugin)

      // Add a protected test route
      instance.get('/protected', async (request) => {
        return {
          message: 'Access granted',
          apiKeyId: request.apiKeyId
        }
      })
    })

    await app.ready()
  })

  afterAll(async () => {
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

  describe('Authorization Header Validation', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected'
      })

      expect(response.statusCode).toBe(401)

      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Missing or invalid authorization header')
    })

    it('should return 401 for invalid Authorization header format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Basic some-token'
        }
      })

      expect(response.statusCode).toBe(401)

      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 for missing token after Bearer prefix', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer '
        }
      })

      expect(response.statusCode).toBe(401)

      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('API Key Validation', () => {
    it('should return 401 for invalid API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer invalid-key-that-does-not-exist'
        }
      })

      expect(response.statusCode).toBe(401)

      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Invalid or revoked API key')
    })

    it('should return 401 for revoked API key', async () => {
      const { id, key } = await apiKeyService.createApiKey('revoked-key')
      createdKeyIds.push(id)

      // Revoke the key
      await apiKeyService.revokeApiKey(id)

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${key}`
        }
      })

      expect(response.statusCode).toBe(401)

      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Invalid or revoked API key')
    })

    it('should allow access with valid API key', async () => {
      const { id, key } = await apiKeyService.createApiKey('valid-key')
      createdKeyIds.push(id)

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${key}`
        }
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      expect(body.message).toBe('Access granted')
      expect(body.apiKeyId).toBe(id)
    })

    it('should attach apiKeyId to request context', async () => {
      const { id, key } = await apiKeyService.createApiKey('context-test')
      createdKeyIds.push(id)

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: `Bearer ${key}`
        }
      })

      const body = response.json()
      expect(body.apiKeyId).toBe(id)
    })
  })
})
