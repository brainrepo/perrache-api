/**
 * Spec Metadata Extraction Service
 * Extracts API metadata from OpenAPI info object
 *
 * @example
 * const service = new SpecMetadataService()
 * const metadata = service.extractMetadata(openAPISpec)
 * // Returns: { name: 'My API', version: '1.0.0', team: 'Platform', owner: 'John Doe' }
 */

import type { OpenAPI } from 'openapi-types'

/**
 * Extracted metadata from OpenAPI spec
 */
export interface SpecMetadata {
  /** API name (sanitized from info.title) */
  name: string
  /** API version from info.version */
  version: string
  /** Optional team owning the API (from info.x-team) */
  team: string | null
  /** Optional individual owner (from info.x-owner) */
  owner: string | null
}

/**
 * Service for extracting metadata from OpenAPI specifications
 */
export class SpecMetadataService {
  /**
   * Extract metadata from OpenAPI spec info object
   *
   * @param spec - OpenAPI specification document
   * @returns Extracted metadata with sanitized values
   * @throws Error if required fields (title, version) are missing
   */
  extractMetadata(spec: OpenAPI.Document | object): SpecMetadata {
    const specObj = spec as Record<string, unknown>

    if (!specObj.info || typeof specObj.info !== 'object') {
      throw new Error('Missing required "info" object in OpenAPI spec')
    }

    const info = specObj.info as Record<string, unknown>

    if (!info.title || typeof info.title !== 'string') {
      throw new Error('Missing required field "info.title" in OpenAPI spec')
    }

    if (!info.version || typeof info.version !== 'string') {
      throw new Error('Missing required field "info.version" in OpenAPI spec')
    }

    // Extract x-team and x-owner with proper type checking
    const team = typeof info['x-team'] === 'string' ? info['x-team'] : null
    const owner = typeof info['x-owner'] === 'string' ? info['x-owner'] : null

    return {
      name: this.sanitizeApiName(info.title),
      version: info.version.trim(),
      team,
      owner
    }
  }

  /**
   * Sanitize API name to prevent injection and ensure consistent naming
   * - Trims whitespace
   * - Removes special characters except word chars, spaces, hyphens, underscores
   * - Collapses multiple spaces to single space
   *
   * @param title - Raw API title from OpenAPI spec
   * @returns Sanitized API name
   */
  private sanitizeApiName(title: string): string {
    return title
      .trim()
      .replace(/[^\w\s\-_]/g, '') // Remove special characters except word chars, spaces, hyphens, underscores
      .replace(/\s+/g, ' ') // Collapse multiple spaces to single
      .trim()
  }
}
