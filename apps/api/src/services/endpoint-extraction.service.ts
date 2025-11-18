/**
 * Endpoint Extraction Service
 * Extracts individual endpoints from OpenAPI specs and stores them in the database.
 * Enables semantic search and discovery by parsing path/method combinations with metadata.
 *
 * @example
 * const service = new EndpointExtractionService(prismaClient)
 * const result = await service.extractAndStore(apiVersionId, dereferencedSpec)
 * // Returns: { endpointsExtracted: 42, endpoints: [...] }
 */

import { Prisma } from '@prisma/client'
import type { PrismaClient, HttpMethod } from '@prisma/client'

/**
 * Represents an extracted endpoint from an OpenAPI spec
 */
export interface ExtractedEndpoint {
  /** API path (e.g., "/api/v1/users/{id}") */
  path: string
  /** HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) */
  method: HttpMethod
  /** Brief description of the endpoint */
  summary: string | null
  /** Detailed description of the endpoint */
  description: string | null
  /** Unique operation identifier */
  operationId: string | null
  /** Tags/categories for the endpoint */
  tags: string[]
  /** Request body schema (JSON) */
  requestSchema: Prisma.InputJsonValue | null
  /** Response body schema (JSON) */
  responseSchema: Prisma.InputJsonValue | null
  /** Path/query/header parameters */
  parameters: Prisma.InputJsonValue | null
  /** Whether the endpoint is deprecated */
  deprecated: boolean
}

/**
 * Result of endpoint extraction and storage operation
 */
export interface ExtractionResult {
  /** Number of endpoints successfully extracted and stored */
  endpointsExtracted: number
  /** List of extracted endpoint details */
  endpoints: ExtractedEndpoint[]
}

/**
 * Valid HTTP methods as lowercase strings (for matching OpenAPI spec)
 */
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

/**
 * Maps lowercase HTTP method strings to HttpMethod enum values
 */
const METHOD_MAP: Record<string, HttpMethod> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patch: 'PATCH',
  head: 'HEAD',
  options: 'OPTIONS'
}

/**
 * Service for extracting and storing OpenAPI endpoints
 */
export class EndpointExtractionService {
  private readonly db: PrismaClient

  /**
   * Create a new EndpointExtractionService
   *
   * @param db - Prisma client instance
   */
  constructor(db: PrismaClient) {
    this.db = db
  }

  /**
   * Extract endpoints from OpenAPI spec and store in database
   * This operation is idempotent - existing endpoints for the version are cleared first.
   *
   * @param apiVersionId - ID of the ApiVersion record
   * @param dereferencedSpec - Fully dereferenced OpenAPI spec (all $refs resolved)
   * @returns Extraction result with count and endpoint list
   */
  async extractAndStore(apiVersionId: string, dereferencedSpec: object): Promise<ExtractionResult> {
    const endpoints = this.extractEndpoints(dereferencedSpec)
    await this.storeEndpoints(apiVersionId, endpoints)

    return {
      endpointsExtracted: endpoints.length,
      endpoints
    }
  }

  /**
   * Extract all endpoints from OpenAPI spec paths object
   *
   * @param spec - Dereferenced OpenAPI spec
   * @returns Array of extracted endpoints
   */
  private extractEndpoints(spec: object): ExtractedEndpoint[] {
    const endpoints: ExtractedEndpoint[] = []
    const specObj = spec as Record<string, unknown>
    const paths = (specObj.paths as Record<string, unknown>) || {}

    for (const [path, pathItem] of Object.entries(paths)) {
      // Skip extension fields (x-*)
      if (path.startsWith('x-')) continue

      if (!pathItem || typeof pathItem !== 'object') continue

      const pathItemObj = pathItem as Record<string, unknown>

      // Extract path-level parameters (shared across all operations)
      const pathLevelParameters = pathItemObj.parameters as Array<Record<string, unknown>> | undefined

      const operations = this.extractOperations(pathItemObj)
      for (const [method, operation] of Object.entries(operations)) {
        endpoints.push(
          this.buildEndpoint(path, method as HttpMethod, operation, pathLevelParameters)
        )
      }
    }

    return endpoints
  }

  /**
   * Extract HTTP method operations from a path item
   *
   * @param pathItem - OpenAPI path item object
   * @returns Map of HTTP method to operation object
   */
  private extractOperations(pathItem: Record<string, unknown>): Record<HttpMethod, unknown> {
    const operations: Record<string, unknown> = {}

    for (const method of HTTP_METHODS) {
      if (pathItem[method] && typeof pathItem[method] === 'object') {
        const httpMethod = METHOD_MAP[method] as HttpMethod
        operations[httpMethod] = pathItem[method]
      }
    }

    return operations as Record<HttpMethod, unknown>
  }

  /**
   * Build an ExtractedEndpoint from path, method, and operation data
   *
   * @param path - API path string
   * @param method - HTTP method enum value
   * @param operation - OpenAPI operation object
   * @param pathLevelParameters - Optional path-level parameters shared across operations
   * @returns Extracted endpoint with all metadata
   */
  private buildEndpoint(
    path: string,
    method: HttpMethod,
    operation: unknown,
    pathLevelParameters?: Array<Record<string, unknown>>
  ): ExtractedEndpoint {
    const op = operation as Record<string, unknown>

    return {
      path,
      method,
      summary: (op.summary as string) || null,
      description: (op.description as string) || null,
      operationId: (op.operationId as string) || null,
      tags: Array.isArray(op.tags) ? (op.tags as string[]) : [],
      requestSchema: this.extractRequestSchema(op),
      responseSchema: this.extractResponseSchema(op),
      parameters: this.extractParameters(op, pathLevelParameters),
      deprecated: (op.deprecated as boolean) || false
    }
  }

  /**
   * Extract request body schema from operation
   * Prioritizes application/json, falls back to first available content type.
   *
   * @param operation - OpenAPI operation object
   * @returns Request schema or null if not present
   */
  private extractRequestSchema(operation: Record<string, unknown>): Prisma.InputJsonValue | null {
    const requestBody = operation.requestBody as Record<string, unknown> | undefined

    if (!requestBody) {
      return null
    }

    const content = requestBody.content as Record<string, unknown> | undefined
    if (!content) {
      return null
    }

    // Priority: application/json > first available content type
    const jsonContent = content['application/json'] as Record<string, unknown> | undefined
    if (jsonContent?.schema) {
      return jsonContent.schema as Prisma.InputJsonValue
    }

    // Fallback to first available content type
    const firstContentType = Object.keys(content)[0]
    if (firstContentType) {
      const firstContent = content[firstContentType] as Record<string, unknown> | undefined
      return (firstContent?.schema as Prisma.InputJsonValue) || null
    }

    return null
  }

  /**
   * Extract response schema from operation with priority ordering
   * Priority: 200 > 201 > other 2xx > default
   *
   * @param operation - OpenAPI operation object
   * @returns Response schema or null if not present
   */
  private extractResponseSchema(operation: Record<string, unknown>): Prisma.InputJsonValue | null {
    const responses = operation.responses as Record<string, unknown> | undefined

    if (!responses) {
      return null
    }

    // Build priority order: 200, 201, other 2xx codes, default
    const otherCodes = Object.keys(responses)
      .filter((code) => code.startsWith('2') && code !== '200' && code !== '201')
      .sort() // Ensure consistent ordering

    const priorityOrder = ['200', '201', ...otherCodes, 'default']

    for (const statusCode of priorityOrder) {
      const response = responses[statusCode] as Record<string, unknown> | undefined
      if (!response) continue

      const responseContent = response.content as Record<string, unknown> | undefined
      if (!responseContent) continue

      // Priority: application/json > first available content type
      const jsonContent = responseContent['application/json'] as Record<string, unknown> | undefined
      if (jsonContent?.schema) {
        return jsonContent.schema as Prisma.InputJsonValue
      }

      // Fallback to first available content type
      const firstContentType = Object.keys(responseContent)[0]
      if (firstContentType) {
        const firstContent = responseContent[firstContentType] as
          | Record<string, unknown>
          | undefined
        if (firstContent?.schema) {
          return firstContent.schema as Prisma.InputJsonValue
        }
      }
    }

    return null
  }

  /**
   * Extract parameters (path, query, header) from operation
   * Merges path-level parameters with operation-level parameters.
   * Operation-level parameters override path-level ones with the same name.
   *
   * @param operation - OpenAPI operation object
   * @param pathLevelParameters - Optional path-level parameters to merge
   * @returns Parameters object or null if none present
   */
  private extractParameters(
    operation: Record<string, unknown>,
    pathLevelParameters?: Array<Record<string, unknown>>
  ): Prisma.InputJsonValue | null {
    const operationParameters = operation.parameters as Array<Record<string, unknown>> | undefined

    // Merge path-level and operation-level parameters
    const allParameters: Array<Record<string, unknown>> = []

    // Add path-level parameters first
    if (pathLevelParameters && Array.isArray(pathLevelParameters)) {
      allParameters.push(...pathLevelParameters)
    }

    // Add operation-level parameters (these override path-level if same name)
    if (operationParameters && Array.isArray(operationParameters)) {
      allParameters.push(...operationParameters)
    }

    if (allParameters.length === 0) {
      return null
    }

    const params: Record<string, unknown> = {}

    for (const param of allParameters) {
      const name = param.name as string
      if (!name) continue

      // Operation-level parameters override path-level ones
      params[name] = {
        in: param.in || null, // path, query, header, cookie
        required: (param.required as boolean) || false,
        schema: (param.schema as object) || null,
        description: (param.description as string) || null
      }
    }

    return Object.keys(params).length > 0 ? (params as Prisma.InputJsonValue) : null
  }

  /**
   * Store extracted endpoints in database with idempotency
   * Clears existing endpoints for the version before inserting new ones.
   *
   * @param apiVersionId - ID of the ApiVersion record
   * @param endpoints - Array of extracted endpoints to store
   */
  private async storeEndpoints(
    apiVersionId: string,
    endpoints: ExtractedEndpoint[]
  ): Promise<void> {
    // Clear existing endpoints for this version (idempotent operation)
    await this.db.endpoint.deleteMany({
      where: { apiVersionId }
    })

    // Batch insert all endpoints for performance
    if (endpoints.length > 0) {
      await this.db.endpoint.createMany({
        data: endpoints.map((endpoint) => ({
          apiVersionId,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          description: endpoint.description,
          operationId: endpoint.operationId,
          tags: endpoint.tags,
          requestSchema: endpoint.requestSchema ?? Prisma.DbNull,
          responseSchema: endpoint.responseSchema ?? Prisma.DbNull,
          parameters: endpoint.parameters ?? Prisma.DbNull,
          deprecated: endpoint.deprecated
        }))
      })
    }
  }
}
