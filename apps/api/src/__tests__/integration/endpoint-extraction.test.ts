import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../../app'
import { FastifyInstance } from 'fastify'
import { db } from '../../lib/db'
import { randomUUID } from 'crypto'

describe('Endpoint Extraction Integration', { sequential: true }, () => {
  let app: FastifyInstance
  let testApiKey: string
  let testApiKeyId: string

  const uniqueName = (prefix: string) => `__EEIT_${prefix}_${randomUUID()}`

  beforeAll(async () => {
    app = await buildApp()
    // Create test API key via admin endpoint
    const keyResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/keys',
      payload: { name: 'integration-test-key' }
    })
    const keyBody = JSON.parse(keyResponse.body)
    testApiKey = keyBody.key
    testApiKeyId = keyBody.id
  })

  afterAll(async () => {
    // Cleanup test API key via admin endpoint
    try {
      if (testApiKeyId) {
        await app.inject({
          method: 'DELETE',
          url: `/api/v1/admin/keys/${testApiKeyId}`
        })
      }
    } catch {
      // Ignore cleanup errors
    }
    await app.close()
  })

  beforeEach(async () => {
    // Clean up any test APIs before each test
    await db.api.deleteMany({
      where: { name: { startsWith: '__EEIT_' } }
    })
  })

  describe('webhook endpoint with extraction', () => {
    it('should return endpoints_count in response after extraction (AC8)', async () => {
      const apiName = uniqueName('WebhookResponse')

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: {
          Authorization: `Bearer ${testApiKey}`,
          'Content-Type': 'application/json'
        },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: {
            '/users': { get: { summary: 'List users' }, post: { summary: 'Create user' } },
            '/users/{id}': { get: { summary: 'Get user' } }
          }
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.status).toBe('processed')
      expect(body.endpoints_count).toBe(3)
      expect(body.api_id).toBeTruthy()
      expect(body.version_id).toBeTruthy()
      expect(body.message).toBe('Spec processed successfully')

      // Verify endpoints were actually stored
      const endpoints = await db.endpoint.findMany({
        where: { apiVersionId: body.version_id }
      })
      expect(endpoints).toHaveLength(3)
    })

    it('should store all endpoint metadata in database', async () => {
      const apiName = uniqueName('FullMetadata')

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '2.0.0' },
          paths: {
            '/products/{id}': {
              get: {
                summary: 'Get product',
                description: 'Retrieve product by ID',
                operationId: 'getProduct',
                tags: ['Products', 'CRUD'],
                deprecated: true,
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Product ID'
                  }
                ],
                responses: {
                  '200': {
                    description: 'Product found',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: { id: { type: 'string' }, name: { type: 'string' } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      const endpoint = await db.endpoint.findFirst({
        where: { apiVersionId: body.version_id }
      })

      expect(endpoint).toBeTruthy()
      expect(endpoint?.path).toBe('/products/{id}')
      expect(endpoint?.method).toBe('GET')
      expect(endpoint?.summary).toBe('Get product')
      expect(endpoint?.description).toBe('Retrieve product by ID')
      expect(endpoint?.operationId).toBe('getProduct')
      expect(endpoint?.tags).toEqual(['Products', 'CRUD'])
      expect(endpoint?.deprecated).toBe(true)
      expect(endpoint?.parameters).toEqual({
        id: { in: 'path', required: true, schema: { type: 'string' }, description: 'Product ID' }
      })
      expect(endpoint?.responseSchema).toEqual({
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } }
      })
    })

    it('should link endpoints to correct apiVersionId', async () => {
      const apiName = uniqueName('Linking')

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/test': { get: { summary: 'Test' } } }
        }
      })

      const body = JSON.parse(response.body)
      const endpoint = await db.endpoint.findFirst({
        where: { apiVersionId: body.version_id },
        include: { apiVersion: true }
      })

      expect(endpoint?.apiVersion.id).toBe(body.version_id)
      expect(endpoint?.apiVersion.version).toBe('1.0.0')
    })

    it('should handle idempotent uploads (AC10)', async () => {
      const apiName = uniqueName('Idempotent')

      // First upload
      const response1 = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi?environment=v1',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: { '/old': { get: { summary: 'Old' } } }
        }
      })

      const body1 = JSON.parse(response1.body)
      const initialEndpoints = await db.endpoint.count({
        where: { apiVersionId: body1.version_id }
      })
      expect(initialEndpoints).toBe(1)

      // Second upload creates new version
      const response2 = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi?environment=v1',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '2.0.0' },
          paths: { '/new1': { get: {} }, '/new2': { post: {} } }
        }
      })

      const body2 = JSON.parse(response2.body)
      expect(body2.endpoints_count).toBe(2)

      // Each version has its own endpoints
      const v1Endpoints = await db.endpoint.count({ where: { apiVersionId: body1.version_id } })
      const v2Endpoints = await db.endpoint.count({ where: { apiVersionId: body2.version_id } })
      expect(v1Endpoints).toBe(1)
      expect(v2Endpoints).toBe(2)
    })

    it('should return 202 for large specs (>100 endpoints)', async () => {
      const apiName = uniqueName('LargeSpec')

      // Create spec with 101 endpoints
      const paths: Record<string, unknown> = {}
      for (let i = 0; i < 101; i++) {
        paths[`/resource${i}`] = { get: { summary: `Resource ${i}` } }
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths
        }
      })

      expect(response.statusCode).toBe(202)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('queued')
      expect(body.job_id).toBeTruthy()
    })

    it('should handle dereferenced specs correctly (AC6)', async () => {
      const apiName = uniqueName('Dereferenced')

      // Spec with inline schemas (representing dereferenced state)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths: {
            '/users': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string', format: 'email' }
                        },
                        required: ['name', 'email']
                      }
                    }
                  }
                },
                responses: {
                  '201': {
                    description: 'User created',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            email: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

      const body = JSON.parse(response.body)
      const endpoint = await db.endpoint.findFirst({
        where: { apiVersionId: body.version_id }
      })

      // Verify schemas are stored as JSON (not flattened)
      expect(endpoint?.requestSchema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      })
      expect(endpoint?.responseSchema).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      })
    })
  })

  describe('performance', () => {
    it('should process 100 endpoints within 5 seconds (AC7)', async () => {
      const apiName = uniqueName('Performance')

      const paths: Record<string, unknown> = {}
      for (let i = 0; i < 20; i++) {
        paths[`/api/v1/resource${i}`] = {
          get: {
            summary: `Get resource ${i}`,
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: { type: 'object' } } }
              }
            }
          },
          post: {
            summary: `Create resource ${i}`,
            requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
            responses: {
              '201': {
                description: 'Created',
                content: { 'application/json': { schema: { type: 'object' } } }
              }
            }
          },
          put: { summary: `Update ${i}`, responses: { '200': { description: 'Updated' } } },
          delete: { summary: `Delete ${i}`, responses: { '204': { description: 'Deleted' } } },
          patch: { summary: `Patch ${i}`, responses: { '200': { description: 'Patched' } } }
        }
      }

      const startTime = Date.now()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/specs/openapi',
        headers: { Authorization: `Bearer ${testApiKey}` },
        payload: {
          openapi: '3.1.0',
          info: { title: apiName, version: '1.0.0' },
          paths
        }
      })
      const duration = Date.now() - startTime

      // 100 endpoints = 20 paths x 5 methods
      // Will return 202 (queued) since >100 endpoints
      expect(response.statusCode).toBe(202)
      expect(duration).toBeLessThan(5000)

      // But extraction still happens synchronously in this implementation
      const body = JSON.parse(response.body)
      const count = await db.endpoint.count({ where: { apiVersionId: body.version_id } })
      expect(count).toBe(100)
    })
  })
})
