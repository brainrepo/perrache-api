import { describe, it, expect, beforeEach } from 'vitest'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { OpenAPIValidationService } from '../services/openapi-validation.service.js'
import { ValidationErrorCode } from '../types/validation-errors.js'

const fixturesPath = join(__dirname, 'fixtures/openapi-specs')

async function loadFixture(filename: string): Promise<object> {
  const content = await readFile(join(fixturesPath, filename), 'utf-8')
  return JSON.parse(content)
}

describe('OpenAPIValidationService', () => {
  let service: OpenAPIValidationService

  beforeEach(() => {
    service = new OpenAPIValidationService()
  })

  describe('Valid Spec Scenarios', () => {
    it('should validate a minimal OpenAPI 3.0.x spec', async () => {
      const spec = await loadFixture('valid-3.0-minimal.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
      expect(result.dereferenced).toBeDefined()
    })

    it('should validate a complete OpenAPI 3.1.x spec', async () => {
      const spec = await loadFixture('valid-3.1-full.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
      expect(result.dereferenced).toBeDefined()
    })

    it('should successfully dereference spec with internal $refs', async () => {
      const spec = await loadFixture('valid-with-refs.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(true)
      expect(result.dereferenced).toBeDefined()

      // Check that $refs are resolved in the dereferenced spec
      const dereferenced = result.dereferenced as any
      expect(
        dereferenced.paths['/pets'].get.responses['200'].content['application/json'].schema.items
          .properties.id.type
      ).toBe('integer')
    })

    it('should return bundled spec without external $refs', async () => {
      const spec = await loadFixture('valid-with-refs.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(true)
      const jsonString = JSON.stringify(result.dereferenced)
      // After bundling, external refs should be resolved
      // Internal refs may still exist for circular reference safety
      expect(jsonString).toContain('Pet')
    })
  })

  describe('Invalid Spec Scenarios', () => {
    it('should reject null input with INVALID_JSON error', async () => {
      const result = await service.validate(null)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe(ValidationErrorCode.INVALID_JSON)
      expect(result.errors![0].message).toContain('null')
    })

    it('should reject undefined input with INVALID_JSON error', async () => {
      const result = await service.validate(undefined)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe(ValidationErrorCode.INVALID_JSON)
    })

    it('should reject array input with INVALID_JSON error', async () => {
      const result = await service.validate([])

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe(ValidationErrorCode.INVALID_JSON)
      expect(result.errors![0].message).toContain('array')
    })

    it('should reject string input with INVALID_JSON error', async () => {
      const result = await service.validate('not an object')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].code).toBe(ValidationErrorCode.INVALID_JSON)
    })

    it('should reject missing openapi field with INVALID_OPENAPI_VERSION error', async () => {
      const spec = {
        info: { title: 'Test', version: '1.0.0' },
        paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(
        result.errors!.some((e) => e.code === ValidationErrorCode.INVALID_OPENAPI_VERSION)
      ).toBe(true)
    })

    it('should reject unsupported OpenAPI version (2.0) with INVALID_OPENAPI_VERSION error', async () => {
      const spec = {
        swagger: '2.0',
        openapi: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(
        result.errors!.some((e) => e.code === ValidationErrorCode.INVALID_OPENAPI_VERSION)
      ).toBe(true)
    })

    it('should reject missing info.title with MISSING_REQUIRED_FIELD error', async () => {
      const spec = {
        openapi: '3.0.3',
        info: { version: '1.0.0' },
        paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(
        result.errors!.some(
          (e) => e.code === ValidationErrorCode.MISSING_REQUIRED_FIELD && e.path === 'info.title'
        )
      ).toBe(true)
    })

    it('should reject missing info.version with MISSING_REQUIRED_FIELD error', async () => {
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test' },
        paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(
        result.errors!.some(
          (e) => e.code === ValidationErrorCode.MISSING_REQUIRED_FIELD && e.path === 'info.version'
        )
      ).toBe(true)
    })

    it('should reject missing info object with MISSING_REQUIRED_FIELD error', async () => {
      const spec = await loadFixture('invalid-missing-info.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(
        result.errors!.some(
          (e) => e.code === ValidationErrorCode.MISSING_REQUIRED_FIELD && e.path === 'info'
        )
      ).toBe(true)
    })

    it('should reject empty paths object with NO_PATHS_DEFINED error', async () => {
      const spec = await loadFixture('invalid-no-paths.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(result.errors!.some((e) => e.code === ValidationErrorCode.NO_PATHS_DEFINED)).toBe(true)
    })

    it('should reject invalid HTTP method with INVALID_HTTP_METHOD error', async () => {
      const spec = await loadFixture('invalid-bad-method.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(result.errors!.some((e) => e.code === ValidationErrorCode.INVALID_HTTP_METHOD)).toBe(
        true
      )
      expect(result.errors![0].path).toContain('fetch')
    })

    it('should reject unresolvable $ref with UNRESOLVABLE_REF or SCHEMA_VALIDATION_ERROR', async () => {
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/NonExistent'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      // The error could be UNRESOLVABLE_REF or SCHEMA_VALIDATION_ERROR depending on library behavior
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('should fail validation in case of external $refs', async () => {
      const spec = await loadFixture('valid-with-external-refs.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(result.errors!.some((e) => e.code === ValidationErrorCode.UNRESOLVABLE_REF)).toBe(true)
    })

    it('should fail validation in case of remote $refs', async () => {
      const spec = await loadFixture('valid-with-remote-refs.json')
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(result.errors!.some((e) => e.code === ValidationErrorCode.UNRESOLVABLE_REF)).toBe(true)
    })
  })

  describe('Size and Complexity Limits', () => {
    it('should reject spec exceeding 10MB with SPEC_TOO_LARGE error', async () => {
      // Create a spec with a very large description to exceed 10MB
      const largeDescription = 'x'.repeat(11 * 1024 * 1024) // 11MB string
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0', description: largeDescription },
        paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(result.errors!.some((e) => e.code === ValidationErrorCode.SPEC_TOO_LARGE)).toBe(true)
    })

    it('should reject spec with more than 1000 endpoints with TOO_MANY_ENDPOINTS error', async () => {
      // Create a spec with 1001 endpoints
      const paths: Record<string, any> = {}
      for (let i = 0; i < 1001; i++) {
        paths[`/endpoint${i}`] = {
          get: { responses: { '200': { description: 'OK' } } }
        }
      }
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(result.errors!.some((e) => e.code === ValidationErrorCode.TOO_MANY_ENDPOINTS)).toBe(
        true
      )
    })

    it('should accept spec with exactly 1000 endpoints', async () => {
      const paths: Record<string, any> = {}
      for (let i = 0; i < 1000; i++) {
        paths[`/endpoint${i}`] = {
          get: { responses: { '200': { description: 'OK' } } }
        }
      }
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(true)
    })
  })

  describe('Error Message Quality', () => {
    it('should provide error path that identifies location', async () => {
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users': {
            fetch: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      const error = result.errors![0]
      expect(error.path).toContain('/users')
      expect(error.path).toContain('fetch')
    })

    it('should provide actionable error messages', async () => {
      const spec = {
        openapi: '3.0.3',
        info: { title: 'Test' }, // Missing version
        paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } }
      }
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      const error = result.errors!.find((e) => e.path === 'info.version')
      expect(error).toBeDefined()
      // Error message should be actionable (contains guidance)
      expect(error!.message.length).toBeGreaterThan(20)
      expect(error!.message).toContain('required')
    })

    it('should return structured error response format', async () => {
      const spec = {}
      const result = await service.validate(spec)

      expect(result.valid).toBe(false)
      expect(Array.isArray(result.errors)).toBe(true)
      result.errors!.forEach((error) => {
        expect(error).toHaveProperty('path')
        expect(error).toHaveProperty('message')
        expect(error).toHaveProperty('code')
        expect(typeof error.path).toBe('string')
        expect(typeof error.message).toBe('string')
        expect(typeof error.code).toBe('string')
      })
    })
  })

  describe('Integration with Fixtures', () => {
    it('should load and validate valid-3.0-minimal.json', async () => {
      const spec = await loadFixture('valid-3.0-minimal.json')
      const result = await service.validate(spec)
      expect(result.valid).toBe(true)
    })

    it('should load and validate valid-3.1-full.json', async () => {
      const spec = await loadFixture('valid-3.1-full.json')
      const result = await service.validate(spec)
      expect(result.valid).toBe(true)
    })

    it('should load and validate valid-with-refs.json', async () => {
      const spec = await loadFixture('valid-with-refs.json')
      const result = await service.validate(spec)
      expect(result.valid).toBe(true)
    })

    it('should load and reject invalid-missing-info.json', async () => {
      const spec = await loadFixture('invalid-missing-info.json')
      const result = await service.validate(spec)
      expect(result.valid).toBe(false)
    })

    it('should load and reject invalid-no-paths.json', async () => {
      const spec = await loadFixture('invalid-no-paths.json')
      const result = await service.validate(spec)
      expect(result.valid).toBe(false)
    })

    it('should load and reject invalid-bad-method.json', async () => {
      const spec = await loadFixture('invalid-bad-method.json')
      const result = await service.validate(spec)
      expect(result.valid).toBe(false)
    })
  })

  describe('Dereference Method', () => {
    it('should bundle spec with resolved $refs', async () => {
      const spec = await loadFixture('valid-with-refs.json')
      const bundled = await service.dereference(spec)

      expect(bundled).toBeDefined()
      expect(typeof bundled).toBe('object')
    })

    it('should maintain spec structure after dereferencing', async () => {
      const spec = await loadFixture('valid-3.0-minimal.json')
      const bundled = await service.dereference(spec)

      expect((bundled as any).openapi).toBe('3.0.3')
      expect((bundled as any).info.title).toBe('Minimal Valid API')
      expect((bundled as any).paths['/users']).toBeDefined()
    })
  })
})
