/**
 * Version History Service
 * Retrieves API version history with environment filtering and pagination
 *
 * @example
 * const service = new VersionHistoryService(prismaClient)
 * const result = await service.getVersionHistory('api_123', { environment: 'prod', page: 1, limit: 20 })
 * // Returns: { versions: [...], total: 45, page: 1, limit: 20, hasMore: true }
 */

import type { PrismaClient } from '@prisma/client'

/**
 * Single version entry in history
 */
export interface VersionHistoryEntry {
  /** Database ID of the version record */
  id: string
  /** Semantic version string (e.g., "1.2.0") */
  version: string
  /** Deployment environment (dev, staging, prod, etc.) */
  environment: string
  /** ISO 8601 timestamp of when version was uploaded */
  uploaded_at: Date
  /** Number of endpoints in this version */
  endpoints_count: number
}

/**
 * Paginated version history result
 */
export interface PaginatedVersionHistory {
  /** Array of version entries */
  versions: VersionHistoryEntry[]
  /** Total number of versions matching filter */
  total: number
  /** Current page number */
  page: number
  /** Page size limit */
  limit: number
  /** Whether more pages are available */
  hasMore: boolean
}

/**
 * Options for filtering and paginating version history
 */
export interface VersionHistoryOptions {
  /** Filter by deployment environment */
  environment?: string
  /** Page number (1-indexed, default: 1) */
  page?: number
  /** Number of results per page (default: 20, max: 100) */
  limit?: number
}

/**
 * Service for retrieving API version history
 */
export class VersionHistoryService {
  private readonly db: PrismaClient

  /**
   * Create a new VersionHistoryService
   *
   * @param db - Prisma client instance
   */
  constructor(db: PrismaClient) {
    this.db = db
  }

  /**
   * Get version history for an API with optional environment filtering and pagination
   *
   * @param apiId - ID of the API to get versions for
   * @param options - Pagination and filtering options
   * @returns Paginated version history with endpoint counts
   * @throws Error with statusCode 404 if API does not exist
   */
  async getVersionHistory(
    apiId: string,
    options: VersionHistoryOptions = {}
  ): Promise<PaginatedVersionHistory> {
    const { environment, page = 1, limit = 20 } = options
    const effectiveLimit = Math.min(limit, 100) // Enforce max 100
    const skip = (page - 1) * effectiveLimit

    // Verify API exists
    const apiExists = await this.db.api.findUnique({
      where: { id: apiId },
      select: { id: true }
    })

    if (!apiExists) {
      const error = new Error(`API with id '${apiId}' not found`) as Error & { statusCode: number }
      error.statusCode = 404
      throw error
    }

    // Build where clause
    const where: { apiId: string; environment?: string } = { apiId }
    if (environment) {
      where.environment = environment
    }

    // Get total count for pagination metadata
    const total = await this.db.apiVersion.count({ where })

    // Get versions with endpoint count, sorted by uploadedAt descending
    const versions = await this.db.apiVersion.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: effectiveLimit,
      select: {
        id: true,
        version: true,
        environment: true,
        uploadedAt: true,
        _count: {
          select: { endpoints: true }
        }
      }
    })

    // Transform to response format
    const versionEntries: VersionHistoryEntry[] = versions.map((v) => ({
      id: v.id,
      version: v.version,
      environment: v.environment,
      uploaded_at: v.uploadedAt,
      endpoints_count: v._count.endpoints
    }))

    return {
      versions: versionEntries,
      total,
      page,
      limit: effectiveLimit,
      hasMore: skip + versions.length < total
    }
  }
}
