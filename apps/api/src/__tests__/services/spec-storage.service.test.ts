import { describe, it, expect } from 'vitest'
import { SpecStorageService } from '../../services/spec-storage.service'
import { db } from '../../lib/db'
import { randomUUID } from 'crypto'

describe('SpecStorageService', { sequential: true }, () => {
  const service = new SpecStorageService(db)

  // Helper to generate unique API names - each test uses completely unique names
  const uniqueName = (prefix: string) => `__SST_${prefix}_${randomUUID()}`

  // Helper to clean up an API immediately after test verification
  const cleanupApi = async (apiId: string) => {
    try {
      await db.api.delete({ where: { id: apiId } })
    } catch {
      // Ignore cleanup errors - API might already be deleted or cascade took care of it
    }
  }

  describe('countEndpoints', () => {
    it('should count single endpoint', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { summary: 'Get users' }
          }
        }
      }

      expect(service.countEndpoints(spec)).toBe(1)
    })

    it('should count multiple endpoints on same path', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { summary: 'Get users' },
            post: { summary: 'Create user' },
            delete: { summary: 'Delete users' }
          }
        }
      }

      expect(service.countEndpoints(spec)).toBe(3)
    })

    it('should count endpoints across multiple paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': { get: {} },
          '/posts': { get: {}, post: {} },
          '/comments': { get: {}, post: {}, delete: {} }
        }
      }

      expect(service.countEndpoints(spec)).toBe(6)
    })

    it('should count all valid HTTP methods', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/resource': {
            get: {},
            post: {},
            put: {},
            delete: {},
            patch: {},
            head: {},
            options: {}
          }
        }
      }

      expect(service.countEndpoints(spec)).toBe(7)
    })

    it('should ignore extension fields (x-)', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {},
            'x-custom': { some: 'data' }
          },
          'x-extension-path': {
            get: {}
          }
        }
      }

      expect(service.countEndpoints(spec)).toBe(1)
    })

    it('should return 0 for empty paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {}
      }

      expect(service.countEndpoints(spec)).toBe(0)
    })

    it('should return 0 for missing paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' }
      }

      expect(service.countEndpoints(spec)).toBe(0)
    })

    it('should handle case-insensitive method names', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            GET: {}, // uppercase
            Post: {} // mixed case
          }
        }
      }

      // The service counts based on lowercase comparison, but keys are as-is
      expect(service.countEndpoints(spec)).toBe(2)
    })

    it('should count exactly 99 endpoints correctly', () => {
      const paths: Record<string, object> = {}
      for (let i = 0; i < 99; i++) {
        paths[`/endpoint${i}`] = { get: {} }
      }

      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths
      }

      expect(service.countEndpoints(spec)).toBe(99)
    })

    it('should count exactly 100 endpoints correctly', () => {
      const paths: Record<string, object> = {}
      for (let i = 0; i < 100; i++) {
        paths[`/endpoint${i}`] = { get: {} }
      }

      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths
      }

      expect(service.countEndpoints(spec)).toBe(100)
    })
  })

  // Database integration tests - each test is completely self-contained with immediate cleanup
  describe('store - database integration', { sequential: true }, () => {
    it('should create new API and version for first upload', async () => {
      const metadata = {
        name: uniqueName('New API Test'),
        version: '1.0.0',
        team: null,
        owner: null
      }

      const result = await service.store(
        {
          openapi: '3.1.0',
          info: { title: 'New API', version: '1.0.0' },
          paths: { '/users': { get: {} } }
        },
        metadata,
        'dev',
        'api_key_123'
      )

      try {
        // Verify result
        expect(result.apiId).toBeTruthy()
        expect(result.versionId).toBeTruthy()
        expect(result.endpointsCount).toBe(1)
        expect(result.isNewApi).toBe(true)

        // Verify database state
        const api = await db.api.findUnique({ where: { id: result.apiId } })
        const version = await db.apiVersion.findUnique({ where: { id: result.versionId } })

        expect(api).toBeTruthy()
        expect(api!.name).toBe(metadata.name)
        expect(api!.team).toBeNull()
        expect(api!.owner).toBeNull()

        expect(version).toBeTruthy()
        expect(version!.apiId).toBe(result.apiId)
        expect(version!.version).toBe('1.0.0')
        expect(version!.environment).toBe('dev')
        expect(version!.uploadedBy).toBe('api_key_123')
        expect(version!.specJson).toBeTruthy()
      } finally {
        await cleanupApi(result.apiId)
      }
    })

    it('should find existing API by case-insensitive name match', async () => {
      const apiName = uniqueName('Existing API')

      const firstResult = await service.store(
        {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/v1': { get: {} } }
        },
        { name: apiName, version: '1.0.0', team: null, owner: null },
        'dev',
        'key1'
      )

      try {
        // Upload second version with different case
        const secondResult = await service.store(
          {
            openapi: '3.1.0',
            info: { title: apiName.toUpperCase(), version: '2.0.0' },
            paths: { '/v2': { get: {} } }
          },
          { name: apiName.toUpperCase(), version: '2.0.0', team: null, owner: null },
          'prod',
          'key2'
        )

        // Verify
        const versions = await db.apiVersion.findMany({
          where: { apiId: firstResult.apiId }
        })

        expect(secondResult.apiId).toBe(firstResult.apiId)
        expect(secondResult.versionId).not.toBe(firstResult.versionId)
        expect(secondResult.isNewApi).toBe(false)
        expect(versions).toHaveLength(2)
      } finally {
        await cleanupApi(firstResult.apiId)
      }
    })

    it('should update team when provided on subsequent upload', async () => {
      const apiName = uniqueName('Team Update API')

      const firstResult = await service.store(
        {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/a': { get: {} } }
        },
        { name: apiName, version: '1.0.0', team: null, owner: null },
        'dev',
        'key1'
      )

      try {
        await service.store(
          {
            openapi: '3.1.0',
            info: { title: apiName, version: '2.0.0' },
            paths: { '/b': { get: {} } }
          },
          { name: apiName, version: '2.0.0', team: 'New Team', owner: null },
          'prod',
          'key2'
        )

        const api = await db.api.findUnique({ where: { id: firstResult.apiId } })
        expect(api!.team).toBe('New Team')
      } finally {
        await cleanupApi(firstResult.apiId)
      }
    })

    it('should update owner when provided on subsequent upload', async () => {
      const apiName = uniqueName('Owner Update API')

      const firstResult = await service.store(
        {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/a': { get: {} } }
        },
        { name: apiName, version: '1.0.0', team: null, owner: null },
        'dev',
        'key1'
      )

      try {
        await service.store(
          {
            openapi: '3.1.0',
            info: { title: apiName, version: '2.0.0' },
            paths: { '/b': { get: {} } }
          },
          { name: apiName, version: '2.0.0', team: null, owner: 'Jane Doe' },
          'prod',
          'key2'
        )

        const api = await db.api.findUnique({ where: { id: firstResult.apiId } })
        expect(api!.owner).toBe('Jane Doe')
      } finally {
        await cleanupApi(firstResult.apiId)
      }
    })

    it('should store environment as string', async () => {
      const apiName = uniqueName('Env String API')

      const result = await service.store(
        {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/x': { get: {} } }
        },
        { name: apiName, version: '1.0.0', team: null, owner: null },
        'custom-environment-string',
        'key1'
      )

      try {
        const version = await db.apiVersion.findUnique({ where: { id: result.versionId } })
        expect(version!.environment).toBe('custom-environment-string')
      } finally {
        await cleanupApi(result.apiId)
      }
    })

    it('should store full spec in specJson', async () => {
      const apiName = uniqueName('Full Spec API')
      const fullSpec = {
        openapi: '3.1.0',
        info: {
          title: apiName,
          version: '1.0.0',
          description: 'A complete API'
        },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: { '200': { description: 'Success' } }
            }
          }
        },
        components: {
          schemas: {
            User: { type: 'object' }
          }
        }
      }

      const result = await service.store(
        fullSpec,
        { name: apiName, version: '1.0.0', team: null, owner: null },
        'dev',
        'key1'
      )

      try {
        const version = await db.apiVersion.findUnique({ where: { id: result.versionId } })
        const storedSpec = version!.specJson as Record<string, unknown>

        expect(storedSpec.openapi).toBe('3.1.0')
        expect((storedSpec.info as Record<string, unknown>).description).toBe('A complete API')
        expect(storedSpec.components).toBeTruthy()
      } finally {
        await cleanupApi(result.apiId)
      }
    })

    it('should create new version for same API with different version number', async () => {
      const apiName = uniqueName('Multi Version API')

      const v1 = await service.store(
        {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/a': { get: {} } }
        },
        { name: apiName, version: '1.0.0', team: null, owner: null },
        'dev',
        'key1'
      )

      try {
        const v2 = await service.store(
          {
            openapi: '3.1.0',
            info: { title: apiName, version: '2.0.0' },
            paths: { '/a': { get: {} }, '/b': { post: {} } }
          },
          { name: apiName, version: '2.0.0', team: null, owner: null },
          'dev',
          'key2'
        )

        expect(v1.apiId).toBe(v2.apiId)
        expect(v1.versionId).not.toBe(v2.versionId)
        expect(v1.endpointsCount).toBe(1)
        expect(v2.endpointsCount).toBe(2)
      } finally {
        await cleanupApi(v1.apiId)
      }
    })
  })
})
