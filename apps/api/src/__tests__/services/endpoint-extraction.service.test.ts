import { describe, it, expect } from 'vitest'
import { EndpointExtractionService } from '../../services/endpoint-extraction.service'
import { db } from '../../lib/db'
import { randomUUID } from 'crypto'

describe('EndpointExtractionService', { sequential: true }, () => {
  const service = new EndpointExtractionService(db)

  // Helper to create unique API name
  const uniqueName = (prefix: string) => `__EET_${prefix}_${randomUUID()}`

  // Helper to create test API and version
  const createTestApiVersion = async (name: string) => {
    const api = await db.api.create({
      data: { name, team: 'TestTeam', owner: 'TestOwner' }
    })
    const version = await db.apiVersion.create({
      data: {
        apiId: api.id,
        version: '1.0.0',
        environment: 'test',
        specJson: {},
        uploadedBy: 'test_key'
      }
    })
    return { api, version }
  }

  // Helper to cleanup
  const cleanupApi = async (apiId: string) => {
    try {
      await db.api.delete({ where: { id: apiId } })
    } catch {
      // Ignore errors - cascade delete handles endpoints
    }
  }

  describe('extractAndStore', { sequential: true }, () => {
    it('should extract all path/method combinations (AC1)', async () => {
      const apiName = uniqueName('AllMethods')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/users': {
              get: { summary: 'List users' },
              post: { summary: 'Create user' }
            },
            '/users/{id}': {
              get: { summary: 'Get user' },
              put: { summary: 'Update user' },
              delete: { summary: 'Delete user' }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)

        expect(result.endpointsExtracted).toBe(5)
        expect(result.endpoints).toHaveLength(5)

        // Verify all methods extracted
        const methods = result.endpoints.map((e) => e.method).sort()
        expect(methods).toContain('GET')
        expect(methods).toContain('POST')
        expect(methods).toContain('PUT')
        expect(methods).toContain('DELETE')

        // Verify database storage
        const dbEndpoints = await db.endpoint.findMany({
          where: { apiVersionId: version.id }
        })
        expect(dbEndpoints).toHaveLength(5)
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should handle PATCH, HEAD, OPTIONS methods', async () => {
      const apiName = uniqueName('AllHTTPMethods')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/resource': {
              patch: { summary: 'Partial update' },
              head: { summary: 'Check existence' },
              options: { summary: 'CORS preflight' }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)

        expect(result.endpointsExtracted).toBe(3)
        const methods = result.endpoints.map((e) => e.method).sort()
        expect(methods).toEqual(['HEAD', 'OPTIONS', 'PATCH'])
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should extract all metadata fields (AC9)', async () => {
      const apiName = uniqueName('Metadata')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/items': {
              get: {
                summary: 'List items',
                description: 'Retrieves all items with pagination',
                operationId: 'listItems',
                tags: ['Items', 'CRUD'],
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer' },
                    description: 'Max results'
                  },
                  {
                    name: 'offset',
                    in: 'query',
                    required: false,
                    schema: { type: 'integer' }
                  }
                ],
                responses: {
                  '200': {
                    content: {
                      'application/json': {
                        schema: { type: 'array', items: { type: 'object' } }
                      }
                    }
                  }
                }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)
        const endpoint = result.endpoints[0]

        expect(endpoint.summary).toBe('List items')
        expect(endpoint.description).toBe('Retrieves all items with pagination')
        expect(endpoint.operationId).toBe('listItems')
        expect(endpoint.tags).toEqual(['Items', 'CRUD'])
        expect(endpoint.parameters).toEqual({
          limit: {
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: 'Max results'
          },
          offset: {
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: null
          }
        })
        expect(endpoint.responseSchema).toEqual({ type: 'array', items: { type: 'object' } })
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should mark deprecated endpoints correctly (AC3)', async () => {
      const apiName = uniqueName('Deprecated')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/old': { get: { summary: 'Old endpoint', deprecated: true } },
            '/new': { get: { summary: 'New endpoint', deprecated: false } },
            '/default': { get: { summary: 'No deprecation flag' } }
          }
        }

        const result = await service.extractAndStore(version.id, spec)

        const oldEndpoint = result.endpoints.find((e) => e.path === '/old')
        const newEndpoint = result.endpoints.find((e) => e.path === '/new')
        const defaultEndpoint = result.endpoints.find((e) => e.path === '/default')

        expect(oldEndpoint?.deprecated).toBe(true)
        expect(newEndpoint?.deprecated).toBe(false)
        expect(defaultEndpoint?.deprecated).toBe(false)

        // Verify in database
        const dbEndpoint = await db.endpoint.findFirst({
          where: { apiVersionId: version.id, path: '/old' }
        })
        expect(dbEndpoint?.deprecated).toBe(true)
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should handle missing request/response schemas gracefully (AC4)', async () => {
      const apiName = uniqueName('MissingSchemas')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/no-body': {
              get: {
                summary: 'GET without request body',
                responses: { '204': { description: 'No content' } }
              }
            },
            '/no-response-schema': {
              post: {
                summary: 'POST without response schema',
                requestBody: {
                  content: { 'application/json': { schema: { type: 'object' } } }
                },
                responses: { '202': { description: 'Accepted' } }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)

        const getEndpoint = result.endpoints.find((e) => e.path === '/no-body')
        const postEndpoint = result.endpoints.find((e) => e.path === '/no-response-schema')

        // GET has no request body
        expect(getEndpoint?.requestSchema).toBeNull()
        // No content in response means no schema
        expect(getEndpoint?.responseSchema).toBeNull()

        // POST has request but response has no schema
        expect(postEndpoint?.requestSchema).toEqual({ type: 'object' })
        expect(postEndpoint?.responseSchema).toBeNull()
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should prioritize response schemas correctly (AC5)', async () => {
      const apiName = uniqueName('ResponsePriority')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/priority-200': {
              get: {
                responses: {
                  '200': {
                    content: { 'application/json': { schema: { type: 'string', title: 'res200' } } }
                  },
                  '201': {
                    content: { 'application/json': { schema: { type: 'string', title: 'res201' } } }
                  },
                  default: {
                    content: {
                      'application/json': { schema: { type: 'string', title: 'default' } }
                    }
                  }
                }
              }
            },
            '/priority-201': {
              get: {
                responses: {
                  '201': {
                    content: { 'application/json': { schema: { type: 'string', title: 'res201' } } }
                  },
                  '204': {
                    content: { 'application/json': { schema: { type: 'string', title: 'res204' } } }
                  },
                  default: {
                    content: {
                      'application/json': { schema: { type: 'string', title: 'default' } }
                    }
                  }
                }
              }
            },
            '/priority-2xx': {
              get: {
                responses: {
                  '204': {
                    content: { 'application/json': { schema: { type: 'string', title: 'res204' } } }
                  },
                  default: {
                    content: {
                      'application/json': { schema: { type: 'string', title: 'default' } }
                    }
                  }
                }
              }
            },
            '/priority-default': {
              get: {
                responses: {
                  default: {
                    content: {
                      'application/json': { schema: { type: 'string', title: 'default' } }
                    }
                  }
                }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)

        const e200 = result.endpoints.find((e) => e.path === '/priority-200')
        const e201 = result.endpoints.find((e) => e.path === '/priority-201')
        const e2xx = result.endpoints.find((e) => e.path === '/priority-2xx')
        const eDefault = result.endpoints.find((e) => e.path === '/priority-default')

        expect((e200?.responseSchema as Record<string, unknown>)?.title).toBe('res200')
        expect((e201?.responseSchema as Record<string, unknown>)?.title).toBe('res201')
        expect((e2xx?.responseSchema as Record<string, unknown>)?.title).toBe('res204')
        expect((eDefault?.responseSchema as Record<string, unknown>)?.title).toBe('default')
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should be idempotent - clear and recreate endpoints (AC10)', async () => {
      const apiName = uniqueName('Idempotent')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec1 = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/v1': { get: { summary: 'Version 1' } },
            '/old': { get: { summary: 'Old endpoint' } }
          }
        }

        const result1 = await service.extractAndStore(version.id, spec1)
        expect(result1.endpointsExtracted).toBe(2)

        // Second call with different spec
        const spec2 = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/v2': { get: { summary: 'Version 2' } }
          }
        }

        const result2 = await service.extractAndStore(version.id, spec2)
        expect(result2.endpointsExtracted).toBe(1)

        // Verify only new endpoints exist
        const dbEndpoints = await db.endpoint.findMany({
          where: { apiVersionId: version.id }
        })
        expect(dbEndpoints).toHaveLength(1)
        expect(dbEndpoints[0].path).toBe('/v2')
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should skip extension fields (x-*) in paths', async () => {
      const apiName = uniqueName('Extensions')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            'x-custom-extension': { something: 'ignored' },
            '/valid': { get: { summary: 'Valid endpoint' } }
          }
        }

        const result = await service.extractAndStore(version.id, spec)

        expect(result.endpointsExtracted).toBe(1)
        expect(result.endpoints[0].path).toBe('/valid')
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should handle empty paths object', async () => {
      const apiName = uniqueName('EmptyPaths')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {}
        }

        const result = await service.extractAndStore(version.id, spec)

        expect(result.endpointsExtracted).toBe(0)
        expect(result.endpoints).toHaveLength(0)
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should extract request body schema from application/json', async () => {
      const apiName = uniqueName('RequestSchema')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/create': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          age: { type: 'integer' }
                        }
                      }
                    }
                  }
                },
                responses: { '201': { description: 'Created' } }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)
        const endpoint = result.endpoints[0]

        expect(endpoint.requestSchema).toEqual({
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' }
          }
        })
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should fall back to first content type if application/json is missing', async () => {
      const apiName = uniqueName('FallbackContent')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/xml': {
              post: {
                requestBody: {
                  content: {
                    'application/xml': { schema: { type: 'string', format: 'xml' } }
                  }
                },
                responses: {
                  '200': {
                    content: { 'text/plain': { schema: { type: 'string' } } }
                  }
                }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)
        const endpoint = result.endpoints[0]

        expect(endpoint.requestSchema).toEqual({ type: 'string', format: 'xml' })
        expect(endpoint.responseSchema).toEqual({ type: 'string' })
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should extract path, query, and header parameters', async () => {
      const apiName = uniqueName('Parameters')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/users/{id}': {
              get: {
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    description: 'User ID'
                  },
                  {
                    name: 'fields',
                    in: 'query',
                    required: false,
                    schema: { type: 'array', items: { type: 'string' } },
                    description: 'Fields to include'
                  },
                  {
                    name: 'X-Request-ID',
                    in: 'header',
                    required: false,
                    schema: { type: 'string' }
                  }
                ],
                responses: { '200': { description: 'OK' } }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)
        const params = result.endpoints[0].parameters as Record<string, unknown>

        expect(params.id).toEqual({
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
        })
        expect(params.fields).toEqual({
          in: 'query',
          required: false,
          schema: { type: 'array', items: { type: 'string' } },
          description: 'Fields to include'
        })
        expect(params['X-Request-ID']).toEqual({
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: null
        })
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should handle operation without parameters', async () => {
      const apiName = uniqueName('NoParams')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/health': {
              get: { summary: 'Health check', responses: { '200': { description: 'OK' } } }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)
        expect(result.endpoints[0].parameters).toBeNull()
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should handle missing optional metadata fields', async () => {
      const apiName = uniqueName('MinimalOp')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        const spec = {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: {
            '/minimal': {
              get: {
                // No summary, description, operationId, tags
                responses: { '200': { description: 'OK' } }
              }
            }
          }
        }

        const result = await service.extractAndStore(version.id, spec)
        const endpoint = result.endpoints[0]

        expect(endpoint.summary).toBeNull()
        expect(endpoint.description).toBeNull()
        expect(endpoint.operationId).toBeNull()
        expect(endpoint.tags).toEqual([])
      } finally {
        await cleanupApi(api.id)
      }
    })

    it('should enforce unique constraint on apiVersionId + path + method (AC2)', async () => {
      const apiName = uniqueName('Unique')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        // First extraction
        await service.extractAndStore(version.id, {
          openapi: '3.1.0',
          info: { title: 'Test API', version: '1.0.0' },
          paths: { '/test': { get: { summary: 'Test' } } }
        })

        // Try to insert duplicate directly (should fail)
        await expect(
          db.endpoint.create({
            data: {
              apiVersionId: version.id,
              path: '/test',
              method: 'GET',
              tags: [],
              deprecated: false
            }
          })
        ).rejects.toThrow()
      } finally {
        await cleanupApi(api.id)
      }
    })
  })

  describe('performance', () => {
    it('should extract 100 endpoints in less than 5 seconds (AC7)', async () => {
      const apiName = uniqueName('Performance')
      const { api, version } = await createTestApiVersion(apiName)

      try {
        // Generate spec with 100 endpoints (20 paths x 5 methods)
        const paths: Record<string, unknown> = {}
        for (let i = 0; i < 20; i++) {
          paths[`/resource${i}`] = {
            get: { summary: `Get resource ${i}`, operationId: `getResource${i}` },
            post: { summary: `Create resource ${i}` },
            put: { summary: `Update resource ${i}` },
            delete: { summary: `Delete resource ${i}` },
            patch: { summary: `Patch resource ${i}` }
          }
        }

        const spec = {
          openapi: '3.1.0',
          info: { title: 'Large API', version: '1.0.0' },
          paths
        }

        const startTime = Date.now()
        const result = await service.extractAndStore(version.id, spec)
        const duration = Date.now() - startTime

        expect(result.endpointsExtracted).toBe(100)
        expect(duration).toBeLessThan(5000) // 5 seconds
      } finally {
        await cleanupApi(api.id)
      }
    })
  })
})
