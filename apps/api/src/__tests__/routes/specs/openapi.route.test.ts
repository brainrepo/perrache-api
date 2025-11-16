import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../app'
import { ApiKeyService } from '../../../services/api-key.service'
import { db } from '../../../lib/db'
import validMinimalSpec from '../../fixtures/openapi-specs/valid-3.0-minimal.json'
import validFullSpec from '../../fixtures/openapi-specs/valid-3.1-full.json'

describe('OpenAPI Spec Upload Route', () => {
  let app: FastifyInstance
  const createdKeyIds: string[] = []
  const createdApiIds: string[] = []
  const testSecret =
    process.env.API_KEY_SECRET || 'test-secret-key-for-hmac-sha256-hashing-minimum-32-chars'
  const apiKeyService = new ApiKeyService(testSecret)
  let validApiKey: string
  let validApiKeyId: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    // Create a valid API key for testing
    const { id, key } = await apiKeyService.createApiKey('test-upload-key')
    validApiKey = key
    validApiKeyId = id
    createdKeyIds.push(id)
  })

  afterAll(async () => {
    await app.close()

    // Clean up API keys
    if (createdKeyIds.length > 0) {
      await db.apiKey.deleteMany({
        where: { id: { in: createdKeyIds } }
      })
    }

    // Clean up APIs
    if (createdApiIds.length > 0) {
      await db.api.deleteMany({
        where: { id: { in: createdApiIds } }
      })
    }
  })

  afterEach(async () => {
    // Clean up APIs created during tests
    if (createdApiIds.length > 0) {
      await db.api.deleteMany({
        where: { id: { in: createdApiIds } }
      })
      createdApiIds.length = 0
    }
  })

  describe('Authentication (AC2)', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        payload: validMinimalSpec
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 for invalid API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: 'Bearer invalid-key-that-does-not-exist'
        },
        payload: validMinimalSpec
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 for revoked API key', async () => {
      const { id, key } = await apiKeyService.createApiKey('revoked-key')
      createdKeyIds.push(id)
      await apiKeyService.revokeApiKey(id)

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${key}`
        },
        payload: validMinimalSpec
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Validation (AC3, AC4)', () => {
    it('should return 400 for invalid JSON structure', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`,
          'content-type': 'application/json'
        },
        payload: 'not valid json'
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for missing info.title', async () => {
      const invalidSpec = {
        openapi: '3.1.0',
        info: {
          version: '1.0.0'
        },
        paths: {
          '/users': { get: {} }
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: invalidSpec
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 for missing info.version', async () => {
      const invalidSpec = {
        openapi: '3.1.0',
        info: {
          title: 'Test API'
        },
        paths: {
          '/users': { get: {} }
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: invalidSpec
      })

      expect(response.statusCode).toBe(400)
    })

    it('should return 400 with INVALID_SPEC error code for validation failures', async () => {
      const invalidSpec = {
        openapi: '3.1.0',
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {} // Empty paths
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: invalidSpec
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error.code).toBe('INVALID_SPEC')
      expect(body.error.message).toBe('OpenAPI spec validation failed')
      expect(body.error.details).toBeTruthy()
      expect(body.error.details.errors).toBeInstanceOf(Array)
    })

    it('should return 400 for invalid OpenAPI version', async () => {
      const invalidSpec = {
        openapi: '2.0.0', // Swagger 2.0, not OpenAPI 3.x
        info: {
          title: 'Test API',
          version: '1.0.0'
        },
        paths: {
          '/users': { get: {} }
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: invalidSpec
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('Successful Upload (AC1, AC5, AC6, AC7)', () => {
    it('should return 200 for valid small spec', async () => {
      const uniqueSpec = {
        ...validMinimalSpec,
        info: {
          ...validMinimalSpec.info,
          title: `Test API ${Date.now()}`
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      expect(body.api_id).toBeTruthy()
      expect(body.version_id).toBeTruthy()
      expect(body.status).toBe('processed')
      expect(body.endpoints_count).toBe(1)
      expect(body.message).toBe('Spec processed successfully')

      createdApiIds.push(body.api_id)
    })

    it('should store spec with correct metadata', async () => {
      const uniqueSpec = {
        openapi: '3.1.0',
        info: {
          title: `Metadata Test API ${Date.now()}`,
          version: '2.5.0',
          'x-team': 'Platform Team',
          'x-owner': 'John Developer'
        },
        paths: {
          '/health': { get: {} }
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)

      // Verify database state
      const api = await db.api.findUnique({ where: { id: body.api_id } })
      expect(api).toBeTruthy()
      expect(api!.name).toContain('Metadata Test API')
      expect(api!.team).toBe('Platform Team')
      expect(api!.owner).toBe('John Developer')

      const version = await db.apiVersion.findUnique({ where: { id: body.version_id } })
      expect(version!.version).toBe('2.5.0')
      expect(version!.uploadedBy).toBe(validApiKeyId)
    })

    it('should store environment from query parameter', async () => {
      const uniqueSpec = {
        openapi: '3.1.0',
        info: {
          title: `Env Test API ${Date.now()}`,
          version: '1.0.0'
        },
        paths: { '/test': { get: {} } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi?environment=production',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)

      const version = await db.apiVersion.findUnique({ where: { id: body.version_id } })
      expect(version!.environment).toBe('production')
    })

    it('should default environment to dev when not specified', async () => {
      const uniqueSpec = {
        openapi: '3.1.0',
        info: {
          title: `Default Env API ${Date.now()}`,
          version: '1.0.0'
        },
        paths: { '/test': { get: {} } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)

      const version = await db.apiVersion.findUnique({ where: { id: body.version_id } })
      expect(version!.environment).toBe('dev')
    })

    it('should count endpoints correctly', async () => {
      // validFullSpec has 8 endpoints: /users (GET, POST), /users/{id} (GET, PUT, DELETE, PATCH), /status (HEAD, OPTIONS)
      const uniqueSpec = {
        ...validFullSpec,
        info: {
          ...validFullSpec.info,
          title: `Endpoint Count API ${Date.now()}`
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      expect(body.endpoints_count).toBe(8)

      createdApiIds.push(body.api_id)
    })
  })

  describe('Async Processing (AC8)', () => {
    it('should return 202 for large spec with 100+ endpoints', async () => {
      // Create a spec with exactly 100 endpoints
      const paths: Record<string, object> = {}
      for (let i = 0; i < 100; i++) {
        paths[`/endpoint${i}`] = { get: { responses: { '200': { description: 'OK' } } } }
      }

      const largeSpec = {
        openapi: '3.1.0',
        info: {
          title: `Large API ${Date.now()}`,
          version: '1.0.0'
        },
        paths
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: largeSpec
      })

      expect(response.statusCode).toBe(202)

      const body = response.json()
      expect(body.api_id).toBeTruthy()
      expect(body.version_id).toBeTruthy()
      expect(body.job_id).toBeTruthy()
      expect(body.status).toBe('queued')
      expect(body.message).toBe('Spec queued for background processing')

      createdApiIds.push(body.api_id)
    })

    it('should return 200 for spec with exactly 99 endpoints (sync)', async () => {
      const paths: Record<string, object> = {}
      for (let i = 0; i < 99; i++) {
        paths[`/endpoint${i}`] = { get: { responses: { '200': { description: 'OK' } } } }
      }

      const spec = {
        openapi: '3.1.0',
        info: {
          title: `Boundary API ${Date.now()}`,
          version: '1.0.0'
        },
        paths
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: spec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      expect(body.status).toBe('processed')
      expect(body.endpoints_count).toBe(99)

      createdApiIds.push(body.api_id)
    })
  })

  describe('Response Headers (AC10)', () => {
    it('should include X-Request-ID correlation header', async () => {
      const uniqueSpec = {
        openapi: '3.1.0',
        info: {
          title: `Correlation Test API ${Date.now()}`,
          version: '1.0.0'
        },
        paths: { '/test': { get: {} } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['x-request-id']).toBeTruthy()
      expect(typeof response.headers['x-request-id']).toBe('string')

      const body = response.json()
      createdApiIds.push(body.api_id)
    })
  })

  describe('Query Parameters (AC9)', () => {
    it('should accept version query parameter', async () => {
      const uniqueSpec = {
        openapi: '3.1.0',
        info: {
          title: `Version Param API ${Date.now()}`,
          version: '1.0.0'
        },
        paths: { '/test': { get: {} } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi?version=3.1',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)
    })

    it('should accept 3.0 version parameter', async () => {
      const uniqueSpec = {
        ...validMinimalSpec, // This is a 3.0.3 spec
        info: {
          ...validMinimalSpec.info,
          title: `Version 3.0 API ${Date.now()}`
        }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi?version=3.0',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)
    })

    it('should store custom environment string', async () => {
      const uniqueSpec = {
        openapi: '3.1.0',
        info: {
          title: `Custom Env API ${Date.now()}`,
          version: '1.0.0'
        },
        paths: { '/test': { get: {} } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi?environment=staging-canary-v2',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: uniqueSpec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)

      const version = await db.apiVersion.findUnique({ where: { id: body.version_id } })
      expect(version!.environment).toBe('staging-canary-v2')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty info.x-team and info.x-owner', async () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: `No Extensions API ${Date.now()}`,
          version: '1.0.0'
          // No x-team or x-owner
        },
        paths: { '/test': { get: {} } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: spec
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      createdApiIds.push(body.api_id)

      const api = await db.api.findUnique({ where: { id: body.api_id } })
      expect(api!.team).toBeNull()
      expect(api!.owner).toBeNull()
    })

    it('should allow multiple versions of same API', async () => {
      const apiName = `Multi Version API ${Date.now()}`

      // Upload v1
      const v1Response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/v1': { get: {} } }
        }
      })

      expect(v1Response.statusCode).toBe(200)
      const v1Body = v1Response.json()
      createdApiIds.push(v1Body.api_id)

      // Upload v2
      const v2Response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          authorization: `Bearer ${validApiKey}`
        },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '2.0.0' },
          paths: { '/v2': { get: {} } }
        }
      })

      expect(v2Response.statusCode).toBe(200)
      const v2Body = v2Response.json()

      // Should have same API ID but different version IDs
      expect(v1Body.api_id).toBe(v2Body.api_id)
      expect(v1Body.version_id).not.toBe(v2Body.version_id)
    })
  })
})
