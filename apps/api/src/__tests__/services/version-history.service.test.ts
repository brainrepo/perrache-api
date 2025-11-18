import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { VersionHistoryService } from '../../services/version-history.service'
import { db } from '../../lib/db'
import { randomUUID } from 'crypto'

describe('VersionHistoryService', { sequential: true }, () => {
  const service = new VersionHistoryService(db)

  // Test data IDs for cleanup
  const testApiIds: string[] = []

  // Helper to generate unique names
  const uniqueName = (prefix: string) => `__VHS_${prefix}_${randomUUID()}`

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
    testApiIds.push(api.id)

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

  // Cleanup after all tests
  afterAll(async () => {
    for (const apiId of testApiIds) {
      try {
        await db.api.delete({ where: { id: apiId } })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('getVersionHistory - basic functionality', { sequential: true }, () => {
    it('should return all versions sorted by uploadedAt descending', async () => {
      const api = await createTestApi(uniqueName('sort-test'), [
        { version: '1.0.0', environment: 'dev' },
        { version: '2.0.0', environment: 'dev' },
        { version: '3.0.0', environment: 'dev' }
      ])

      const result = await service.getVersionHistory(api.id)

      expect(result.versions).toHaveLength(3)
      expect(result.versions[0].version).toBe('3.0.0') // Most recent first
      expect(result.versions[1].version).toBe('2.0.0')
      expect(result.versions[2].version).toBe('1.0.0')
      expect(result.total).toBe(3)
    })

    it('should filter by environment when parameter provided', async () => {
      const api = await createTestApi(uniqueName('filter-test'), [
        { version: '1.0.0', environment: 'dev' },
        { version: '1.0.0', environment: 'staging' },
        { version: '1.0.0', environment: 'prod' },
        { version: '2.0.0', environment: 'prod' }
      ])

      const result = await service.getVersionHistory(api.id, { environment: 'prod' })

      expect(result.versions).toHaveLength(2)
      expect(result.versions.every((v) => v.environment === 'prod')).toBe(true)
      expect(result.total).toBe(2)
    })

    it('should include endpoint count for each version', async () => {
      const api = await createTestApi(uniqueName('endpoints-test'), [
        { version: '1.0.0', environment: 'dev', endpointsCount: 5 },
        { version: '2.0.0', environment: 'dev', endpointsCount: 10 }
      ])

      const result = await service.getVersionHistory(api.id)

      expect(result.versions[0].endpoints_count).toBe(10) // Most recent
      expect(result.versions[1].endpoints_count).toBe(5)
    })

    it('should return correct response fields', async () => {
      const api = await createTestApi(uniqueName('fields-test'), [
        { version: '1.0.0', environment: 'prod', endpointsCount: 3 }
      ])

      const result = await service.getVersionHistory(api.id)
      const entry = result.versions[0]

      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('version', '1.0.0')
      expect(entry).toHaveProperty('environment', 'prod')
      expect(entry).toHaveProperty('uploaded_at')
      expect(entry.uploaded_at).toBeInstanceOf(Date)
      expect(entry).toHaveProperty('endpoints_count', 3)
    })
  })

  describe('getVersionHistory - pagination', { sequential: true }, () => {
    let paginationApiId: string

    beforeAll(async () => {
      // Create API with 25 versions for pagination tests
      const api = await db.api.create({
        data: {
          name: uniqueName('pagination-test'),
          team: 'test',
          owner: 'test'
        }
      })
      testApiIds.push(api.id)
      paginationApiId = api.id

      // Create 25 versions with deterministic timestamps
      for (let i = 1; i <= 25; i++) {
        await db.apiVersion.create({
          data: {
            apiId: api.id,
            version: `${i}.0.0`,
            environment: 'dev',
            specJson: { openapi: '3.1.0', info: { title: 'Test', version: `${i}.0.0` }, paths: {} },
            uploadedBy: 'test',
            uploadedAt: new Date(Date.now() + i * 1000) // Stagger by 1 second
          }
        })
      }
    })

    it('should use default page=1, limit=20', async () => {
      const result = await service.getVersionHistory(paginationApiId)

      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.versions).toHaveLength(20)
      expect(result.total).toBe(25)
      expect(result.hasMore).toBe(true)
    })

    it('should respect custom page and limit', async () => {
      const result = await service.getVersionHistory(paginationApiId, { page: 2, limit: 10 })

      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.versions).toHaveLength(10)
      expect(result.hasMore).toBe(true)
    })

    it('should enforce max limit of 100', async () => {
      const result = await service.getVersionHistory(paginationApiId, { limit: 200 })

      expect(result.limit).toBe(100) // Capped at 100
    })

    it('should set hasMore=false when no more pages', async () => {
      const result = await service.getVersionHistory(paginationApiId, { page: 3, limit: 10 })

      expect(result.versions).toHaveLength(5) // 25 total, page 3 has remaining 5
      expect(result.hasMore).toBe(false)
    })

    it('should return empty array for page beyond data', async () => {
      const result = await service.getVersionHistory(paginationApiId, { page: 100, limit: 10 })

      expect(result.versions).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('getVersionHistory - error cases', { sequential: true }, () => {
    it('should throw 404 error for non-existent API', async () => {
      const nonExistentId = 'non-existent-api-id-12345'

      await expect(service.getVersionHistory(nonExistentId)).rejects.toMatchObject({
        message: expect.stringContaining('not found'),
        statusCode: 404
      })
    })

    it('should handle empty version list gracefully', async () => {
      const api = await db.api.create({
        data: {
          name: uniqueName('empty-versions'),
          team: 'test',
          owner: 'test'
        }
      })
      testApiIds.push(api.id)

      const result = await service.getVersionHistory(api.id)

      expect(result.versions).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('getVersionHistory - version preservation', { sequential: true }, () => {
    it('should preserve multiple versions for same environment', async () => {
      const api = await createTestApi(uniqueName('preservation-test'), [
        { version: '1.0.0', environment: 'prod' },
        { version: '1.1.0', environment: 'prod' },
        { version: '2.0.0', environment: 'prod' }
      ])

      const result = await service.getVersionHistory(api.id, { environment: 'prod' })

      expect(result.versions).toHaveLength(3)
      // All versions preserved, ordered by uploadedAt desc
      expect(result.versions.map((v) => v.version)).toEqual(['2.0.0', '1.1.0', '1.0.0'])
    })
  })
})
