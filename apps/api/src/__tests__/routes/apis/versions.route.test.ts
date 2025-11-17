import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../../../app'
import { ApiKeyService } from '../../../services/api-key.service'
import { db } from '../../../lib/db'
import { randomUUID } from 'crypto'

describe('API Version History Route', () => {
  let app: FastifyInstance
  const createdKeyIds: string[] = []
  const createdApiIds: string[] = []
  const testSecret =
    process.env.API_KEY_SECRET || 'test-secret-key-for-hmac-sha256-hashing-minimum-32-chars'
  const apiKeyService = new ApiKeyService(testSecret)
  let validApiKey: string

  // Helper to generate unique names
  const uniqueName = (prefix: string) => `__VHR_${prefix}_${randomUUID()}`

  // Helper to create test API with versions
  const createTestApi = async (
    name: string,
    versions: Array<{ version: string; environment: string; endpointsCount?: number }>
  ) => {
    const api = await db.api.create({
      data: {
        name,
        team: 'test-team',
        owner: 'test-owner'
      }
    })
    createdApiIds.push(api.id)

    for (const v of versions) {
      const apiVersion = await db.apiVersion.create({
        data: {
          apiId: api.id,
          version: v.version,
          environment: v.environment,
          specJson: { openapi: '3.1.0', info: { title: name, version: v.version }, paths: {} },
          uploadedBy: 'test-key'
        }
      })

      // Create endpoints if specified
      if (v.endpointsCount && v.endpointsCount > 0) {
        const endpoints = Array.from({ length: v.endpointsCount }, (_, i) => ({
          apiVersionId: apiVersion.id,
          path: `/endpoint${i}`,
          method: 'GET' as const,
          summary: `Endpoint ${i}`,
          description: `Description ${i}`,
          parameters: {},
          requestSchema: null,
          responseSchema: {},
          tags: []
        }))
        await db.endpoint.createMany({ data: endpoints })
      }
    }

    return api
  }

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    // Create a valid API key for testing
    const { id, key } = await apiKeyService.createApiKey('test-version-history-key')
    validApiKey = key
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

  describe('Authentication', () => {
    it('should return 401 for missing Authorization header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/apis/some-id/versions'
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 for invalid API key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/apis/some-id/versions',
        headers: {
          authorization: 'Bearer invalid-key'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('Version History Retrieval (AC2, AC3, AC4)', () => {
    it('should return all versions sorted by uploaded_at descending', async () => {
      const api = await createTestApi(uniqueName('sort'), [
        { version: '1.0.0', environment: 'dev' },
        { version: '2.0.0', environment: 'dev' },
        { version: '3.0.0', environment: 'dev' }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.versions).toHaveLength(3)
      expect(body.versions[0].version).toBe('3.0.0')
      expect(body.versions[1].version).toBe('2.0.0')
      expect(body.versions[2].version).toBe('1.0.0')
    })

    it('should filter by environment when parameter provided', async () => {
      const api = await createTestApi(uniqueName('filter'), [
        { version: '1.0.0', environment: 'dev' },
        { version: '1.0.0', environment: 'staging' },
        { version: '1.0.0', environment: 'prod' },
        { version: '2.0.0', environment: 'prod' }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions?environment=prod`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.versions).toHaveLength(2)
      expect(body.versions.every((v: any) => v.environment === 'prod')).toBe(true)
      expect(body.total).toBe(2)
    })

    it('should include all required fields in version entry', async () => {
      const api = await createTestApi(uniqueName('fields'), [
        { version: '1.0.0', environment: 'prod', endpointsCount: 5 }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      const entry = body.versions[0]

      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('version', '1.0.0')
      expect(entry).toHaveProperty('environment', 'prod')
      expect(entry).toHaveProperty('uploaded_at')
      expect(entry).toHaveProperty('endpoints_count', 5)
      // Verify ISO 8601 format
      expect(new Date(entry.uploaded_at).toISOString()).toBe(entry.uploaded_at)
    })
  })

  describe('Pagination (AC6)', () => {
    it('should use default page=1, limit=20', async () => {
      // Create API with 25 versions
      const api = await db.api.create({
        data: { name: uniqueName('pagination'), team: 'test', owner: 'test' }
      })
      createdApiIds.push(api.id)

      for (let i = 1; i <= 25; i++) {
        await db.apiVersion.create({
          data: {
            apiId: api.id,
            version: `${i}.0.0`,
            environment: 'dev',
            specJson: { openapi: '3.1.0', info: { title: 'Test', version: `${i}.0.0` }, paths: {} },
            uploadedBy: 'test',
            uploadedAt: new Date(Date.now() + i * 1000)
          }
        })
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
      expect(body.versions).toHaveLength(20)
      expect(body.total).toBe(25)
      expect(body.hasMore).toBe(true)
    })

    it('should respect custom page and limit parameters', async () => {
      const api = await db.api.create({
        data: { name: uniqueName('custom-page'), team: 'test', owner: 'test' }
      })
      createdApiIds.push(api.id)

      for (let i = 1; i <= 15; i++) {
        await db.apiVersion.create({
          data: {
            apiId: api.id,
            version: `${i}.0.0`,
            environment: 'dev',
            specJson: { openapi: '3.1.0', info: { title: 'Test', version: `${i}.0.0` }, paths: {} },
            uploadedBy: 'test'
          }
        })
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions?page=2&limit=10`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.page).toBe(2)
      expect(body.limit).toBe(10)
      expect(body.versions).toHaveLength(5) // 15 total, page 2 has 5
      expect(body.hasMore).toBe(false)
    })

    it('should enforce max limit of 100', async () => {
      const api = await createTestApi(uniqueName('max-limit'), [
        { version: '1.0.0', environment: 'dev' }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions?limit=200`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.limit).toBe(100) // Capped
    })
  })

  describe('Error Responses (AC7, AC8)', () => {
    it('should return 404 for non-existent API ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/apis/non-existent-id-12345/versions',
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.error.code).toBe('NOT_FOUND')
      expect(body.error.message).toContain('not found')
    })

    it('should return 400 for invalid page parameter', async () => {
      const api = await createTestApi(uniqueName('invalid-page'), [
        { version: '1.0.0', environment: 'dev' }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions?page=0`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
    })

    it('should return 400 for negative limit', async () => {
      const api = await createTestApi(uniqueName('invalid-limit'), [
        { version: '1.0.0', environment: 'dev' }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions?limit=0`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
    })
  })

  describe('Version Preservation (AC5)', () => {
    it('should show all versions preserved when multiple uploaded to same environment', async () => {
      const api = await createTestApi(uniqueName('preservation'), [
        { version: '1.0.0', environment: 'prod' },
        { version: '1.1.0', environment: 'prod' },
        { version: '2.0.0', environment: 'prod' }
      ])

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/apis/${api.id}/versions?environment=prod`,
        headers: { authorization: `Bearer ${validApiKey}` }
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.versions).toHaveLength(3)
      // All versions preserved, newest first
      const versions = body.versions.map((v: any) => v.version)
      expect(versions).toContain('1.0.0')
      expect(versions).toContain('1.1.0')
      expect(versions).toContain('2.0.0')
    })
  })
})
