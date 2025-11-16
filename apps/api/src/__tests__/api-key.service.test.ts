import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ApiKeyService } from '../services/api-key.service'
import { db } from '../lib/db'

describe('ApiKeyService', () => {
  let service: ApiKeyService
  const createdKeyIds: string[] = []

  beforeEach(() => {
    service = ApiKeyService.getInstance()
  })

  afterEach(async () => {
    // Clean up created keys
    if (createdKeyIds.length > 0) {
      await db.apiKey.deleteMany({
        where: { id: { in: createdKeyIds } }
      })
      createdKeyIds.length = 0
    }
  })

  describe('generateApiKey', () => {
    it('should generate a 256-bit key encoded as Base64URL', () => {
      const key = service.generateApiKey()

      // Base64URL encoding of 32 bytes = 43 characters
      expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('should generate unique keys each time', () => {
      const key1 = service.generateApiKey()
      const key2 = service.generateApiKey()

      expect(key1).not.toEqual(key2)
    })
  })

  describe('hashApiKey', () => {
    it('should return a 64-character HMAC-SHA-256 hex hash', () => {
      const key = service.generateApiKey()
      const hash = service.hashApiKey(key)

      // HMAC-SHA-256 hex digest is 64 characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce different hash than the original key', () => {
      const key = service.generateApiKey()
      const hash = service.hashApiKey(key)

      expect(hash).not.toEqual(key)
    })

    it('should produce consistent hash for same input', () => {
      const key = service.generateApiKey()
      const hash1 = service.hashApiKey(key)
      const hash2 = service.hashApiKey(key)

      expect(hash1).toEqual(hash2)
    })
  })

  describe('createApiKey', () => {
    it('should create a new API key and return plaintext key once', async () => {
      const result = await service.createApiKey('test-service')
      createdKeyIds.push(result.id)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('key')
      expect(result).toHaveProperty('name', 'test-service')
      expect(result).toHaveProperty('createdAt')
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should store the key as a hash in the database', async () => {
      const result = await service.createApiKey('test-service')
      createdKeyIds.push(result.id)

      const storedKey = await db.apiKey.findUnique({
        where: { id: result.id }
      })

      // Key should be stored as hash, not plaintext
      expect(storedKey?.keyHash).not.toEqual(result.key)
      expect(storedKey?.keyHash).toMatch(/^[a-f0-9]{64}$/)

      // Verify the hash matches
      const expectedHash = service.hashApiKey(result.key)
      expect(storedKey?.keyHash).toEqual(expectedHash)
    })
  })

  describe('revokeApiKey', () => {
    it('should set revokedAt timestamp on the key', async () => {
      const created = await service.createApiKey('to-revoke')
      createdKeyIds.push(created.id)

      await service.revokeApiKey(created.id)

      const revokedKey = await db.apiKey.findUnique({
        where: { id: created.id }
      })

      expect(revokedKey?.revokedAt).toBeInstanceOf(Date)
    })

    it('should throw 404 error for non-existent key', async () => {
      await expect(service.revokeApiKey('non-existent-id')).rejects.toThrow('API key not found')
    })
  })

  describe('validateApiKey', () => {
    it('should return id for valid key', async () => {
      const created = await service.createApiKey('valid-key')
      createdKeyIds.push(created.id)

      const result = await service.validateApiKey(created.key)

      expect(result).toEqual({ id: created.id })
    })

    it('should return null for invalid key', async () => {
      const result = await service.validateApiKey('invalid-key')

      expect(result).toBeNull()
    })

    it('should return null for revoked key', async () => {
      const created = await service.createApiKey('revoked-key')
      createdKeyIds.push(created.id)

      await service.revokeApiKey(created.id)

      const result = await service.validateApiKey(created.key)

      expect(result).toBeNull()
    })
  })
})
