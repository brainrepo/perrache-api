/**
 * Spec Storage Service
 * Stores OpenAPI specifications in the database with API and version management
 *
 * @example
 * const service = new SpecStorageService(prismaClient)
 * const result = await service.store(spec, metadata, 'prod', 'api_key_123')
 * // Returns: { apiId: '...', versionId: '...', endpointsCount: 42, isNewApi: true }
 */

import type { PrismaClient } from '@prisma/client'
import type { OpenAPI } from 'openapi-types'
import type { SpecMetadata } from './spec-metadata.service.js'

/** Valid HTTP methods for endpoint counting */
const VALID_HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

/**
 * Result of storing a spec in the database
 */
export interface StorageResult {
  /** Database ID of the API record */
  apiId: string
  /** Database ID of the API version record */
  versionId: string
  /** Number of endpoints (path + method combinations) in the spec */
  endpointsCount: number
  /** Whether this was a newly created API record */
  isNewApi: boolean
}

/**
 * Service for storing OpenAPI specs in the database
 */
export class SpecStorageService {
  private readonly db: PrismaClient

  /**
   * Create a new SpecStorageService
   *
   * @param db - Prisma client instance
   */
  constructor(db: PrismaClient) {
    this.db = db
  }

  /**
   * Store an OpenAPI spec in the database
   * Creates or updates the API record and creates a new version record
   *
   * @param spec - Dereferenced OpenAPI specification
   * @param metadata - Extracted metadata from the spec
   * @param environment - Deployment environment (e.g., 'dev', 'prod', 'staging')
   * @param uploadedBy - API key ID of the uploader
   * @returns Storage result with IDs and statistics
   */
  async store(
    spec: OpenAPI.Document | object,
    metadata: SpecMetadata,
    environment: string,
    uploadedBy: string
  ): Promise<StorageResult> {
    // Find or create API record
    let api = await this.db.api.findFirst({
      where: {
        name: { equals: metadata.name, mode: 'insensitive' }
      }
    })

    let isNewApi = false

    if (!api) {
      // Create new API record
      api = await this.db.api.create({
        data: {
          name: metadata.name,
          team: metadata.team,
          owner: metadata.owner
        }
      })
      isNewApi = true
    } else {
      // Update team/owner if provided and different
      const updateData: { team?: string | null; owner?: string | null } = {}

      if (metadata.team !== null && metadata.team !== api.team) {
        updateData.team = metadata.team
      }
      if (metadata.owner !== null && metadata.owner !== api.owner) {
        updateData.owner = metadata.owner
      }

      if (Object.keys(updateData).length > 0) {
        api = await this.db.api.update({
          where: { id: api.id },
          data: updateData
        })
      }
    }

    // Create new API version record
    const apiVersion = await this.db.apiVersion.create({
      data: {
        apiId: api.id,
        version: metadata.version,
        environment,
        specJson: spec as object,
        uploadedBy
      }
    })

    // Count endpoints in the spec
    const endpointsCount = this.countEndpoints(spec)

    return {
      apiId: api.id,
      versionId: apiVersion.id,
      endpointsCount,
      isNewApi
    }
  }

  /**
   * Count the number of endpoints (path + method combinations) in a spec
   *
   * @param spec - OpenAPI specification
   * @returns Number of endpoints
   */
  countEndpoints(spec: OpenAPI.Document | object): number {
    const specObj = spec as Record<string, unknown>
    const paths = specObj.paths

    if (!paths || typeof paths !== 'object') {
      return 0
    }

    const pathsObj = paths as Record<string, unknown>
    let count = 0

    for (const [pathKey, pathValue] of Object.entries(pathsObj)) {
      // Skip extension fields
      if (pathKey.startsWith('x-')) continue
      if (!pathValue || typeof pathValue !== 'object') continue

      const pathObj = pathValue as Record<string, unknown>

      for (const methodKey of Object.keys(pathObj)) {
        const lowerMethod = methodKey.toLowerCase()
        if (VALID_HTTP_METHODS.includes(lowerMethod as (typeof VALID_HTTP_METHODS)[number])) {
          count++
        }
      }
    }

    return count
  }
}
