import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '../app'
import { db } from '../lib/db'

describe('Admin Keys API', () => {
  let app: FastifyInstance
  const createdKeyIds: string[] = []

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
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

  describe('POST /api/v1/admin/keys', () => {
    it('should create a new API key and return plaintext key once', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/keys',
        payload: { name: 'test-service' }
      })

      expect(response.statusCode).toBe(201)

      const body = response.json()
      createdKeyIds.push(body.id)

      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('key')
      expect(body).toHaveProperty('name', 'test-service')
      expect(body).toHaveProperty('createdAt')

      // Key should be Base64URL encoded (43 chars for 32 bytes)
      expect(body.key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('should store key as hash, not plaintext', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/keys',
        payload: { name: 'hash-test' }
      })

      const body = response.json()
      createdKeyIds.push(body.id)

      const storedKey = await db.apiKey.findUnique({
        where: { id: body.id }
      })

      // Stored hash should not equal plaintext key
      expect(storedKey?.keyHash).not.toEqual(body.key)
      // Hash should be 64-char SHA-256 hex
      expect(storedKey?.keyHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should return 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/keys',
        payload: {}
      })

      expect(response.statusCode).toBe(400)

      const body = response.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
    })

    it('should return 400 for empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/keys',
        payload: { name: '' }
      })

      expect(response.statusCode).toBe(400)

      const body = response.json()
      expect(body.error.code).toBe('INVALID_REQUEST')
    })
  })

  describe('DELETE /api/v1/admin/keys/:id', () => {
    it('should revoke an API key (soft delete)', async () => {
      // First create a key
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/keys',
        payload: { name: 'to-revoke' }
      })

      const { id } = createResponse.json()
      createdKeyIds.push(id)

      // Now revoke it
      const revokeResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/keys/${id}`
      })

      expect(revokeResponse.statusCode).toBe(204)

      // Verify it's revoked in database
      const revokedKey = await db.apiKey.findUnique({
        where: { id }
      })

      expect(revokedKey?.revokedAt).toBeInstanceOf(Date)
    })

    it('should return 404 for non-existent key', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/admin/keys/non-existent-id'
      })

      expect(response.statusCode).toBe(404)

      const body = response.json()
      expect(body.error.code).toBe('NOT_FOUND')
    })
  })
})
