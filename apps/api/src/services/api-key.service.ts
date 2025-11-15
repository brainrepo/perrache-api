import { randomBytes, createHash } from 'crypto'
import { db } from '../lib/db.js'

/**
 * API Key Service - handles key generation, storage, validation, and revocation
 * Keys are cryptographically strong (256-bit) and stored as SHA-256 hashes
 */
export class ApiKeyService {
  private static instance: ApiKeyService | null = null

  static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService()
    }
    return ApiKeyService.instance
  }

  /**
   * Generate a cryptographically strong 256-bit API key
   * @returns Base64URL encoded key (URL-safe)
   */
  generateApiKey(): string {
    // 32 bytes = 256 bits of randomness
    return randomBytes(32).toString('base64url')
  }

  /**
   * Hash an API key using SHA-256
   * @param key - The plaintext API key
   * @returns Hex-encoded SHA-256 hash
   */
  hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex')
  }

  /**
   * Create a new API key and store its hash in the database
   * @param name - Descriptive name for the API key
   * @returns Object containing id, plaintext key (returned ONCE), name, and createdAt
   */
  async createApiKey(name: string): Promise<{
    id: string
    key: string
    name: string
    createdAt: Date
  }> {
    const key = this.generateApiKey()
    const keyHash = this.hashApiKey(key)

    const apiKey = await db.apiKey.create({
      data: {
        name,
        keyHash
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    })

    // Return plaintext key ONCE - it cannot be retrieved again
    return {
      id: apiKey.id,
      key,
      name: apiKey.name,
      createdAt: apiKey.createdAt
    }
  }

  /**
   * Revoke an API key by setting its revokedAt timestamp (soft delete)
   * @param id - The API key ID to revoke
   * @throws Error if key not found
   */
  async revokeApiKey(id: string): Promise<void> {
    const apiKey = await db.apiKey.findUnique({
      where: { id }
    })

    if (!apiKey) {
      const error = new Error('API key not found')
      ;(error as any).statusCode = 404
      throw error
    }

    await db.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() }
    })
  }

  /**
   * Validate an API key against stored hashes
   * @param key - The plaintext API key to validate
   * @returns Object with id if valid, null if invalid or revoked
   */
  async validateApiKey(key: string): Promise<{ id: string } | null> {
    const keyHash = this.hashApiKey(key)

    const apiKey = await db.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        revokedAt: true
      }
    })

    // Key not found or has been revoked
    if (!apiKey || apiKey.revokedAt !== null) {
      return null
    }

    return { id: apiKey.id }
  }
}

// Export singleton instance
export const apiKeyService = ApiKeyService.getInstance()
