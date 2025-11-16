import { describe, it, expect } from 'vitest'
import { SpecMetadataService } from '../../services/spec-metadata.service'

describe('SpecMetadataService', () => {
  const service = new SpecMetadataService()

  describe('extractMetadata', () => {
    it('should extract basic metadata from valid spec', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'My API',
          version: '1.0.0'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('My API')
      expect(result.version).toBe('1.0.0')
      expect(result.team).toBeNull()
      expect(result.owner).toBeNull()
    })

    it('should extract x-team when present', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'Platform API',
          version: '2.0.0',
          'x-team': 'Platform Team'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('Platform API')
      expect(result.version).toBe('2.0.0')
      expect(result.team).toBe('Platform Team')
      expect(result.owner).toBeNull()
    })

    it('should extract x-owner when present', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'User Service',
          version: '1.2.3',
          'x-owner': 'John Doe'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('User Service')
      expect(result.version).toBe('1.2.3')
      expect(result.team).toBeNull()
      expect(result.owner).toBe('John Doe')
    })

    it('should extract both x-team and x-owner when present', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'Complete API',
          version: '3.0.0',
          'x-team': 'Core Team',
          'x-owner': 'Jane Smith'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('Complete API')
      expect(result.version).toBe('3.0.0')
      expect(result.team).toBe('Core Team')
      expect(result.owner).toBe('Jane Smith')
    })

    it('should sanitize API name by removing special characters', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'My API!!!@#$%',
          version: '1.0.0'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('My API')
    })

    it('should sanitize API name by collapsing multiple spaces', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: '  My   API    Service  ',
          version: '1.0.0'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('My API Service')
    })

    it('should preserve hyphens and underscores in API name', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'my-api_service',
          version: '1.0.0'
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.name).toBe('my-api_service')
    })

    it('should trim version whitespace', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'API',
          version: '  1.0.0  '
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.version).toBe('1.0.0')
    })

    it('should ignore non-string x-team values', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'API',
          version: '1.0.0',
          'x-team': 123 // number instead of string
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.team).toBeNull()
    })

    it('should ignore non-string x-owner values', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'API',
          version: '1.0.0',
          'x-owner': { name: 'John' } // object instead of string
        },
        paths: {}
      }

      const result = service.extractMetadata(spec)

      expect(result.owner).toBeNull()
    })

    it('should throw error for missing info object', () => {
      const spec = {
        openapi: '3.1.0',
        paths: {}
      }

      expect(() => service.extractMetadata(spec)).toThrow('Missing required "info" object')
    })

    it('should throw error for invalid info type', () => {
      const spec = {
        openapi: '3.1.0',
        info: 'not an object',
        paths: {}
      }

      expect(() => service.extractMetadata(spec)).toThrow('Missing required "info" object')
    })

    it('should throw error for missing info.title', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          version: '1.0.0'
        },
        paths: {}
      }

      expect(() => service.extractMetadata(spec)).toThrow('Missing required field "info.title"')
    })

    it('should throw error for non-string info.title', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 123,
          version: '1.0.0'
        },
        paths: {}
      }

      expect(() => service.extractMetadata(spec)).toThrow('Missing required field "info.title"')
    })

    it('should throw error for missing info.version', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'API'
        },
        paths: {}
      }

      expect(() => service.extractMetadata(spec)).toThrow('Missing required field "info.version"')
    })

    it('should throw error for non-string info.version', () => {
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'API',
          version: 1.0
        },
        paths: {}
      }

      expect(() => service.extractMetadata(spec)).toThrow('Missing required field "info.version"')
    })
  })
})
