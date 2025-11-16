/**
 * OpenAPI Specification Utilities
 * Shared utilities for working with OpenAPI specifications
 *
 * @example
 * import { countEndpoints, VALID_HTTP_METHODS } from '../utils/openapi-spec.utils.js'
 *
 * const count = countEndpoints(spec)
 * console.log(`Spec has ${count} endpoints`)
 */

import type { OpenAPI } from 'openapi-types'

/** Valid HTTP methods for OpenAPI operations (lowercase) */
export const VALID_HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

/** Type for valid HTTP methods */
export type ValidHttpMethod = (typeof VALID_HTTP_METHODS)[number]

/**
 * Count the number of endpoints (path + method combinations) in an OpenAPI spec
 *
 * @param spec - OpenAPI specification (can be typed or generic object)
 * @returns Number of endpoints (path + method combinations)
 *
 * @example
 * const spec = {
 *   paths: {
 *     '/users': { get: {...}, post: {...} },
 *     '/users/{id}': { get: {...}, put: {...}, delete: {...} }
 *   }
 * }
 * countEndpoints(spec) // Returns 5
 *
 * @example
 * // Handles extension fields correctly
 * const spec = {
 *   paths: {
 *     'x-custom': {...}, // Skipped
 *     '/api': { get: {...} }
 *   }
 * }
 * countEndpoints(spec) // Returns 1
 */
export function countEndpoints(spec: OpenAPI.Document | Record<string, unknown> | object): number {
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
      if (VALID_HTTP_METHODS.includes(lowerMethod as ValidHttpMethod)) {
        count++
      }
    }
  }

  return count
}
