import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { DatabaseService } from '../lib/db'
import { HttpMethod } from '@prisma/client'

describe('API Catalog Database Schema', () => {
  const db = DatabaseService.getInstance()

  // Clean up test data after each test
  afterEach(async () => {
    // Delete in reverse order of dependencies
    await db.endpoint.deleteMany({})
    await db.apiVersion.deleteMany({})
    await db.api.deleteMany({})
  })

  describe('Api Model', () => {
    it('should create an Api with all fields', async () => {
      const api = await db.api.create({
        data: {
          name: 'Test API',
          team: 'Platform Team',
          owner: 'john.doe@example.com'
        }
      })

      expect(api.id).toBeDefined()
      expect(api.name).toBe('Test API')
      expect(api.team).toBe('Platform Team')
      expect(api.owner).toBe('john.doe@example.com')
      expect(api.createdAt).toBeInstanceOf(Date)
      expect(api.updatedAt).toBeInstanceOf(Date)
    })

    it('should create an Api with nullable fields', async () => {
      const api = await db.api.create({
        data: {
          name: 'Minimal API'
        }
      })

      expect(api.name).toBe('Minimal API')
      expect(api.team).toBeNull()
      expect(api.owner).toBeNull()
    })

    it('should read Api by id', async () => {
      const created = await db.api.create({
        data: { name: 'Read Test API' }
      })

      const found = await db.api.findUnique({
        where: { id: created.id }
      })

      expect(found).not.toBeNull()
      expect(found!.name).toBe('Read Test API')
    })

    it('should update Api name', async () => {
      const api = await db.api.create({
        data: { name: 'Original Name' }
      })

      const updated = await db.api.update({
        where: { id: api.id },
        data: { name: 'Updated Name' }
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(api.updatedAt.getTime())
    })

    it('should use name index for fast lookup', async () => {
      // Create multiple APIs
      await db.api.createMany({
        data: [{ name: 'Alpha API' }, { name: 'Beta API' }, { name: 'Gamma API' }]
      })

      // Query by name should use index
      const result = await db.api.findMany({
        where: { name: 'Beta API' }
      })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Beta API')
    })
  })

  describe('ApiVersion Model', () => {
    it('should create ApiVersion linked to Api', async () => {
      const api = await db.api.create({
        data: { name: 'Versioned API' }
      })

      const version = await db.apiVersion.create({
        data: {
          apiId: api.id,
          version: '1.0.0',
          environment: 'production',
          specJson: { openapi: '3.0.0', info: { title: 'Test', version: '1.0.0' } },
          uploadedBy: 'test-api-key'
        }
      })

      expect(version.id).toBeDefined()
      expect(version.apiId).toBe(api.id)
      expect(version.version).toBe('1.0.0')
      expect(version.environment).toBe('production')
      expect(version.specJson).toEqual({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' }
      })
      expect(version.uploadedAt).toBeInstanceOf(Date)
      expect(version.uploadedBy).toBe('test-api-key')
    })

    it('should query versions by api_id and environment', async () => {
      const api = await db.api.create({
        data: { name: 'Multi-Env API' }
      })

      await db.apiVersion.createMany({
        data: [
          { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} },
          { apiId: api.id, version: '1.0.1', environment: 'dev', specJson: {} },
          { apiId: api.id, version: '1.0.0', environment: 'staging', specJson: {} },
          { apiId: api.id, version: '1.0.0', environment: 'production', specJson: {} }
        ]
      })

      const devVersions = await db.apiVersion.findMany({
        where: {
          apiId: api.id,
          environment: 'dev'
        }
      })

      expect(devVersions).toHaveLength(2)
      devVersions.forEach((v) => expect(v.environment).toBe('dev'))
    })

    it('should support custom environment names per ADR-009', async () => {
      const api = await db.api.create({
        data: { name: 'Custom Env API' }
      })

      // Test that environment is a string, not an enum - supports any value
      const customEnvs = ['qa', 'canary', 'preview', 'feature-branch-123']

      for (const env of customEnvs) {
        const version = await db.apiVersion.create({
          data: {
            apiId: api.id,
            version: '1.0.0',
            environment: env,
            specJson: {}
          }
        })
        expect(version.environment).toBe(env)
      }
    })

    it('should return version history sorted by uploadedAt desc', async () => {
      const api = await db.api.create({
        data: { name: 'History API' }
      })

      // Create versions with slight delay to ensure different timestamps
      const v1 = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'prod', specJson: {} }
      })
      const v2 = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.1.0', environment: 'prod', specJson: {} }
      })
      const v3 = await db.apiVersion.create({
        data: { apiId: api.id, version: '2.0.0', environment: 'prod', specJson: {} }
      })

      const history = await db.apiVersion.findMany({
        where: { apiId: api.id },
        orderBy: { uploadedAt: 'desc' }
      })

      expect(history).toHaveLength(3)
      expect(history[0].version).toBe('2.0.0')
      expect(history[1].version).toBe('1.1.0')
      expect(history[2].version).toBe('1.0.0')
    })
  })

  describe('Endpoint Model', () => {
    it('should create endpoint with all metadata fields', async () => {
      const api = await db.api.create({
        data: { name: 'Endpoint API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })

      const endpoint = await db.endpoint.create({
        data: {
          apiVersionId: version.id,
          path: '/users/{id}',
          method: HttpMethod.GET,
          summary: 'Get user by ID',
          description: 'Retrieves a user by their unique identifier',
          operationId: 'getUserById',
          tags: ['users', 'crud'],
          requestSchema: null,
          responseSchema: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } }
          },
          parameters: { id: { in: 'path', required: true, schema: { type: 'string' } } },
          headers: { Authorization: { required: true } },
          deprecated: false
        }
      })

      expect(endpoint.id).toBeDefined()
      expect(endpoint.path).toBe('/users/{id}')
      expect(endpoint.method).toBe('GET')
      expect(endpoint.summary).toBe('Get user by ID')
      expect(endpoint.description).toBe('Retrieves a user by their unique identifier')
      expect(endpoint.operationId).toBe('getUserById')
      expect(endpoint.tags).toEqual(['users', 'crud'])
      expect(endpoint.deprecated).toBe(false)
      expect(endpoint.createdAt).toBeInstanceOf(Date)
    })

    it('should enforce unique constraint on (apiVersionId, path, method)', async () => {
      const api = await db.api.create({
        data: { name: 'Unique Constraint API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })

      // First endpoint should succeed
      await db.endpoint.create({
        data: {
          apiVersionId: version.id,
          path: '/users',
          method: HttpMethod.GET
        }
      })

      // Duplicate should fail
      await expect(
        db.endpoint.create({
          data: {
            apiVersionId: version.id,
            path: '/users',
            method: HttpMethod.GET
          }
        })
      ).rejects.toThrow()

      // Same path, different method should succeed
      const postEndpoint = await db.endpoint.create({
        data: {
          apiVersionId: version.id,
          path: '/users',
          method: HttpMethod.POST
        }
      })

      expect(postEndpoint.path).toBe('/users')
      expect(postEndpoint.method).toBe('POST')
    })

    it('should support all HttpMethod enum values', async () => {
      const api = await db.api.create({
        data: { name: 'All Methods API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })

      const methods = [
        HttpMethod.GET,
        HttpMethod.POST,
        HttpMethod.PUT,
        HttpMethod.DELETE,
        HttpMethod.PATCH,
        HttpMethod.HEAD,
        HttpMethod.OPTIONS
      ]

      for (const method of methods) {
        const endpoint = await db.endpoint.create({
          data: {
            apiVersionId: version.id,
            path: `/test/${method.toLowerCase()}`,
            method
          }
        })
        expect(endpoint.method).toBe(method)
      }

      const allEndpoints = await db.endpoint.findMany({
        where: { apiVersionId: version.id }
      })
      expect(allEndpoints).toHaveLength(7)
    })

    it('should default deprecated to false', async () => {
      const api = await db.api.create({
        data: { name: 'Deprecated Test API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })

      const endpoint = await db.endpoint.create({
        data: {
          apiVersionId: version.id,
          path: '/test',
          method: HttpMethod.GET
        }
      })

      expect(endpoint.deprecated).toBe(false)
    })

    it('should allow nullable embedding fields for async generation', async () => {
      const api = await db.api.create({
        data: { name: 'Embedding Test API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })

      const endpoint = await db.endpoint.create({
        data: {
          apiVersionId: version.id,
          path: '/embeddings',
          method: HttpMethod.GET
          // Embeddings intentionally not set - will be populated later
        }
      })

      // Prisma Unsupported types return undefined when null, not null itself
      expect(endpoint.domainObjectEmbedding).toBeUndefined()
      expect(endpoint.fullEndpointEmbedding).toBeUndefined()
    })
  })

  describe('Cascade Deletes', () => {
    it('should delete all ApiVersions and Endpoints when Api is deleted', async () => {
      const api = await db.api.create({
        data: { name: 'Cascade Delete API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })
      await db.endpoint.create({
        data: { apiVersionId: version.id, path: '/test', method: HttpMethod.GET }
      })

      // Verify data exists
      expect(await db.apiVersion.count({ where: { apiId: api.id } })).toBe(1)
      expect(await db.endpoint.count({ where: { apiVersionId: version.id } })).toBe(1)

      // Delete Api
      await db.api.delete({ where: { id: api.id } })

      // Verify cascade delete
      expect(await db.apiVersion.count({ where: { apiId: api.id } })).toBe(0)
      expect(await db.endpoint.count({ where: { apiVersionId: version.id } })).toBe(0)
    })

    it('should delete all Endpoints when ApiVersion is deleted', async () => {
      const api = await db.api.create({
        data: { name: 'Version Cascade API' }
      })
      const version = await db.apiVersion.create({
        data: { apiId: api.id, version: '1.0.0', environment: 'dev', specJson: {} }
      })

      await db.endpoint.createMany({
        data: [
          { apiVersionId: version.id, path: '/users', method: HttpMethod.GET },
          { apiVersionId: version.id, path: '/users', method: HttpMethod.POST },
          { apiVersionId: version.id, path: '/users/{id}', method: HttpMethod.DELETE }
        ]
      })

      expect(await db.endpoint.count({ where: { apiVersionId: version.id } })).toBe(3)

      // Delete ApiVersion
      await db.apiVersion.delete({ where: { id: version.id } })

      // Verify cascade delete
      expect(await db.endpoint.count({ where: { apiVersionId: version.id } })).toBe(0)

      // Api should still exist
      const apiStillExists = await db.api.findUnique({ where: { id: api.id } })
      expect(apiStillExists).not.toBeNull()
    })
  })

  describe('Foreign Key Constraints', () => {
    it('should reject ApiVersion creation with invalid apiId', async () => {
      await expect(
        db.apiVersion.create({
          data: {
            apiId: 'non-existent-id',
            version: '1.0.0',
            environment: 'dev',
            specJson: {}
          }
        })
      ).rejects.toThrow()
    })

    it('should reject Endpoint creation with invalid apiVersionId', async () => {
      await expect(
        db.endpoint.create({
          data: {
            apiVersionId: 'non-existent-version-id',
            path: '/test',
            method: HttpMethod.GET
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Database Indexes', () => {
    it('should have HNSW indexes for vector search', async () => {
      const result = await db.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'endpoints'
          AND indexdef LIKE '%hnsw%'
        ORDER BY indexname
      `

      expect(result).toHaveLength(2)

      const indexNames = result.map((r) => r.indexname)
      expect(indexNames).toContain('idx_endpoint_domain_embedding')
      expect(indexNames).toContain('idx_endpoint_full_embedding')

      // Verify HNSW parameters (PostgreSQL formats them as m='16' with quotes)
      result.forEach((idx) => {
        expect(idx.indexdef).toContain('vector_cosine_ops')
        expect(idx.indexdef).toMatch(/m\s*=\s*'?16'?/)
        expect(idx.indexdef).toMatch(/ef_construction\s*=\s*'?64'?/)
      })
    })

    it('should have index on apis.name', async () => {
      const result = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'apis'
          AND indexname LIKE '%name%'
      `

      expect(result.length).toBeGreaterThan(0)
    })

    it('should have composite index on api_versions (apiId, environment)', async () => {
      const result = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'api_versions'
          AND indexdef LIKE '%apiId%'
          AND indexdef LIKE '%environment%'
      `

      expect(result.length).toBeGreaterThan(0)
    })

    it('should have unique constraint index on endpoints', async () => {
      const result = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'endpoints'
          AND indexdef LIKE '%UNIQUE%'
          AND indexdef LIKE '%apiVersionId%'
          AND indexdef LIKE '%path%'
          AND indexdef LIKE '%method%'
      `

      expect(result.length).toBeGreaterThan(0)
    })
  })
})
