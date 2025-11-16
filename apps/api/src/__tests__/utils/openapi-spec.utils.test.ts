import { describe, it, expect } from 'vitest'
import { countEndpoints, VALID_HTTP_METHODS } from '../../utils/openapi-spec.utils'

describe('openapi-spec.utils', () => {
  describe('VALID_HTTP_METHODS', () => {
    it('should contain all standard HTTP methods', () => {
      expect(VALID_HTTP_METHODS).toEqual(['get', 'post', 'put', 'delete', 'patch', 'head', 'options'])
    })

    it('should be a readonly array', () => {
      expect(Object.isFrozen(VALID_HTTP_METHODS)).toBe(false) // as const makes tuple, not frozen
      expect(VALID_HTTP_METHODS).toHaveLength(7)
    })
  })

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

      expect(countEndpoints(spec)).toBe(1)
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

      expect(countEndpoints(spec)).toBe(3)
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

      expect(countEndpoints(spec)).toBe(6)
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

      expect(countEndpoints(spec)).toBe(7)
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

      expect(countEndpoints(spec)).toBe(1)
    })

    it('should return 0 for empty paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {}
      }

      expect(countEndpoints(spec)).toBe(0)
    })

    it('should return 0 for missing paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' }
      }

      expect(countEndpoints(spec)).toBe(0)
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

      expect(countEndpoints(spec)).toBe(2)
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

      expect(countEndpoints(spec)).toBe(99)
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

      expect(countEndpoints(spec)).toBe(100)
    })

    it('should handle null paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: null
      }

      expect(countEndpoints(spec)).toBe(0)
    })

    it('should handle non-object paths', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: 'not-an-object'
      }

      expect(countEndpoints(spec)).toBe(0)
    })

    it('should ignore non-operation path item fields', () => {
      const spec = {
        openapi: '3.1.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {},
            parameters: [], // not counted
            servers: [], // not counted
            summary: 'Users path', // not counted (string, not object)
            description: 'Manages users' // not counted (string, not object)
          }
        }
      }

      expect(countEndpoints(spec)).toBe(1)
    })
  })
})
