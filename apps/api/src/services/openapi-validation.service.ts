/**
 * OpenAPI Validation Service
 * Validates OpenAPI 3.0.x and 3.1.x specifications before ingestion into the catalog.
 * Uses @apidevtools/swagger-parser for schema validation and $ref dereferencing.
 *
 * Library Choice: @apidevtools/swagger-parser v12.1.0
 * - Supports OpenAPI 3.0.x and 3.1.x specifications
 * - Built-in $ref dereferencing (bundling)
 * - Comprehensive validation with error reporting
 * - TypeScript definitions included
 *
 * @example
 * // Default configuration
 * const service = new OpenAPIValidationService()
 * const result = await service.validate(specObject)
 * if (!result.valid) {
 *   console.error(result.errors)
 * } else {
 *   const bundledSpec = result.dereferenced
 * }
 *
 * @example
 * // Custom limits
 * const service = new OpenAPIValidationService({
 *   maxSpecSize: 5 * 1024 * 1024, // 5MB
 *   maxEndpoints: 500
 * })
 *
 * @example
 * // Dependency injection for testing
 * const mockParser = { bundle: vi.fn(), validate: vi.fn() }
 * const service = new OpenAPIValidationService({}, mockParser)
 */

import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPI } from 'openapi-types'
import { ValidationErrorCode, ValidationErrorMessages } from '../types/validation-errors.js'

/** Default maximum spec size in bytes (10MB) */
const DEFAULT_MAX_SPEC_SIZE_BYTES = 10 * 1024 * 1024

/** Default maximum number of endpoints allowed per spec */
const DEFAULT_MAX_ENDPOINTS = 1000

/** Valid OpenAPI HTTP methods (lowercase) */
const VALID_HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const

/** Supported OpenAPI version prefixes */
const SUPPORTED_VERSIONS = ['3.0', '3.1']

/**
 * Structured validation error with path, message, and code
 */
export interface ValidationError {
  /** JSON path to the error location (e.g., "paths./users.get") */
  path: string
  /** Human-readable error message */
  message: string
  /** Standardized error code for programmatic handling */
  code: string
}

/**
 * Result of OpenAPI spec validation
 */
export interface ValidationResult {
  /** Whether the spec is valid */
  valid: boolean
  /** Array of validation errors if valid is false */
  errors?: ValidationError[]
  /** Dereferenced (bundled) spec if valid is true - all $refs resolved */
  dereferenced?: OpenAPI.Document
}

/**
 * Configuration options for OpenAPIValidationService
 */
export interface OpenAPIValidationServiceOptions {
  /** Maximum spec size in bytes (default: 10MB) */
  maxSpecSize?: number
  /** Maximum number of endpoints allowed per spec (default: 1000) */
  maxEndpoints?: number
}

/**
 * Parser interface for dependency injection
 * Matches the subset of SwaggerParser API used by this service
 */
export interface OpenAPIParser {
  bundle(
    spec: OpenAPI.Document,
    options?: { resolve?: { external?: boolean } }
  ): Promise<OpenAPI.Document>
  validate(spec: OpenAPI.Document): Promise<OpenAPI.Document>
}

/**
 * OpenAPI Validation Service
 * Validates and dereferences OpenAPI specifications
 */
export class OpenAPIValidationService {
  private readonly maxSpecSizeBytes: number
  private readonly maxEndpoints: number
  private readonly parser: OpenAPIParser

  /**
   * Create a new OpenAPIValidationService instance
   *
   * @param options - Configuration options for validation limits
   * @param parser - Parser implementation for dependency injection (defaults to SwaggerParser)
   *
   * @example
   * // Default configuration
   * const service = new OpenAPIValidationService()
   *
   * @example
   * // Custom limits
   * const service = new OpenAPIValidationService({
   *   maxSpecSize: 5 * 1024 * 1024, // 5MB
   *   maxEndpoints: 500
   * })
   *
   * @example
   * // Inject mock parser for testing
   * const mockParser = { bundle: jest.fn(), validate: jest.fn() }
   * const service = new OpenAPIValidationService({}, mockParser)
   */
  constructor(options: OpenAPIValidationServiceOptions = {}, parser: OpenAPIParser = SwaggerParser) {
    this.maxSpecSizeBytes = options.maxSpecSize ?? DEFAULT_MAX_SPEC_SIZE_BYTES
    this.maxEndpoints = options.maxEndpoints ?? DEFAULT_MAX_ENDPOINTS
    this.parser = parser
  }

  /**
   * Validate an OpenAPI specification
   * Performs comprehensive validation including:
   * - JSON structure validity
   * - OpenAPI version check (3.0.x or 3.1.x)
   * - Required fields (openapi, info.title, info.version, paths)
   * - Paths contain at least one endpoint
   * - Valid HTTP methods on operations
   * - $ref resolution and dereferencing
   * - Size and endpoint count limits
   *
   * @param spec - The OpenAPI spec to validate (unknown type to handle any input)
   * @returns ValidationResult with valid flag, errors if invalid, or dereferenced spec if valid
   */
  async validate(spec: unknown): Promise<ValidationResult> {
    // Pre-validation: Check if spec is a valid object
    const preValidationErrors = this.checkBasicStructure(spec)
    if (preValidationErrors.length > 0) {
      return { valid: false, errors: preValidationErrors }
    }

    const specObject = spec as Record<string, unknown>

    // Check size limits before expensive operations
    const sizeErrors = this.checkSizeLimits(specObject)
    if (sizeErrors.length > 0) {
      return { valid: false, errors: sizeErrors }
    }

    // Check OpenAPI version
    const versionErrors = this.checkOpenAPIVersion(specObject)
    if (versionErrors.length > 0) {
      return { valid: false, errors: versionErrors }
    }

    // Check required fields
    const requiredFieldErrors = this.checkRequiredFields(specObject)
    if (requiredFieldErrors.length > 0) {
      return { valid: false, errors: requiredFieldErrors }
    }

    // Check paths
    const pathErrors = this.checkPaths(specObject)
    if (pathErrors.length > 0) {
      return { valid: false, errors: pathErrors }
    }

    // Check operations have valid HTTP methods
    const operationErrors = this.checkOperations(specObject)
    if (operationErrors.length > 0) {
      return { valid: false, errors: operationErrors }
    }

    // Check endpoint count limits
    const endpointCountErrors = this.checkEndpointCount(specObject)
    if (endpointCountErrors.length > 0) {
      return { valid: false, errors: endpointCountErrors }
    }

    // Validate with swagger-parser and dereference
    try {
      const dereferenced = await this.dereference(specObject)
      return {
        valid: true,
        dereferenced: dereferenced as OpenAPI.Document
      }
    } catch (error) {
      const mappedErrors = this.mapParserError(error)
      return { valid: false, errors: mappedErrors }
    }
  }

  /**
   * Dereference (bundle) all $refs in the spec
   * Resolves internal and external references into a single bundled spec
   *
   * @param spec - The OpenAPI spec object
   * @returns Dereferenced spec with all $refs resolved inline
   * @throws Error if $refs cannot be resolved
   */
  async dereference(spec: object): Promise<object> {
    // Use bundle instead of dereference to avoid circular reference issues
    // bundle() resolves $refs but keeps internal refs for circular references
    const bundled = await this.parser.bundle(spec as OpenAPI.Document, {
      resolve: { external: false }
    })

    // Validate the bundled spec to ensure it conforms to OpenAPI schema
    await this.parser.validate(bundled)

    return bundled
  }

  /**
   * Check if the input is a valid JSON object
   */
  private checkBasicStructure(spec: unknown): ValidationError[] {
    if (spec === null || spec === undefined) {
      return [
        {
          path: '',
          message:
            'Spec must be a JSON object, received null or undefined. ' +
            ValidationErrorMessages[ValidationErrorCode.INVALID_JSON],
          code: ValidationErrorCode.INVALID_JSON
        }
      ]
    }

    if (typeof spec !== 'object') {
      return [
        {
          path: '',
          message:
            `Spec must be a JSON object, received ${typeof spec}. ` +
            ValidationErrorMessages[ValidationErrorCode.INVALID_JSON],
          code: ValidationErrorCode.INVALID_JSON
        }
      ]
    }

    if (Array.isArray(spec)) {
      return [
        {
          path: '',
          message:
            'Spec must be a JSON object, not an array. ' +
            ValidationErrorMessages[ValidationErrorCode.INVALID_JSON],
          code: ValidationErrorCode.INVALID_JSON
        }
      ]
    }

    return []
  }

  /**
   * Check OpenAPI version is 3.0.x or 3.1.x
   */
  private checkOpenAPIVersion(spec: Record<string, unknown>): ValidationError[] {
    const version = spec.openapi

    if (typeof version !== 'string') {
      return [
        {
          path: 'openapi',
          message:
            'Missing or invalid "openapi" field. ' +
            ValidationErrorMessages[ValidationErrorCode.INVALID_OPENAPI_VERSION],
          code: ValidationErrorCode.INVALID_OPENAPI_VERSION
        }
      ]
    }

    const isSupported = SUPPORTED_VERSIONS.some((prefix) => version.startsWith(prefix))

    if (!isSupported) {
      return [
        {
          path: 'openapi',
          message:
            `OpenAPI version "${version}" is not supported. ` +
            ValidationErrorMessages[ValidationErrorCode.INVALID_OPENAPI_VERSION],
          code: ValidationErrorCode.INVALID_OPENAPI_VERSION
        }
      ]
    }

    return []
  }

  /**
   * Check required fields: openapi, info.title, info.version, paths
   */
  private checkRequiredFields(spec: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = []

    // Check openapi field (already checked in version check, but double-check)
    if (!spec.openapi) {
      errors.push({
        path: 'openapi',
        message:
          'Missing required field "openapi". ' +
          ValidationErrorMessages[ValidationErrorCode.MISSING_REQUIRED_FIELD],
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      })
    }

    // Check info object
    if (!spec.info || typeof spec.info !== 'object') {
      errors.push({
        path: 'info',
        message:
          'Missing required field "info". ' +
          ValidationErrorMessages[ValidationErrorCode.MISSING_REQUIRED_FIELD],
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      })
      return errors // Can't check nested fields if info is missing
    }

    const info = spec.info as Record<string, unknown>

    // Check info.title
    if (!info.title || typeof info.title !== 'string') {
      errors.push({
        path: 'info.title',
        message:
          'Missing required field "info.title". ' +
          ValidationErrorMessages[ValidationErrorCode.MISSING_REQUIRED_FIELD],
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      })
    }

    // Check info.version
    if (!info.version || typeof info.version !== 'string') {
      errors.push({
        path: 'info.version',
        message:
          'Missing required field "info.version". ' +
          ValidationErrorMessages[ValidationErrorCode.MISSING_REQUIRED_FIELD],
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      })
    }

    // Check paths field exists
    if (!spec.paths) {
      errors.push({
        path: 'paths',
        message:
          'Missing required field "paths". ' +
          ValidationErrorMessages[ValidationErrorCode.MISSING_REQUIRED_FIELD],
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      })
    }

    return errors
  }

  /**
   * Check paths object contains at least one endpoint
   */
  private checkPaths(spec: Record<string, unknown>): ValidationError[] {
    const paths = spec.paths

    if (!paths || typeof paths !== 'object') {
      return [
        {
          path: 'paths',
          message:
            'Paths must be an object. ' +
            ValidationErrorMessages[ValidationErrorCode.NO_PATHS_DEFINED],
          code: ValidationErrorCode.NO_PATHS_DEFINED
        }
      ]
    }

    const pathKeys = Object.keys(paths as object).filter((key) => !key.startsWith('x-'))

    if (pathKeys.length === 0) {
      return [
        {
          path: 'paths',
          message:
            'Paths object is empty. ' +
            ValidationErrorMessages[ValidationErrorCode.NO_PATHS_DEFINED],
          code: ValidationErrorCode.NO_PATHS_DEFINED
        }
      ]
    }

    return []
  }

  /**
   * Check each operation has valid HTTP method
   */
  private checkOperations(spec: Record<string, unknown>): ValidationError[] {
    const errors: ValidationError[] = []
    const paths = spec.paths as Record<string, unknown>

    if (!paths || typeof paths !== 'object') {
      return errors
    }

    for (const [pathKey, pathValue] of Object.entries(paths)) {
      // Skip extension fields
      if (pathKey.startsWith('x-')) continue

      if (!pathValue || typeof pathValue !== 'object') continue

      const pathObj = pathValue as Record<string, unknown>

      for (const [methodKey, methodValue] of Object.entries(pathObj)) {
        // Skip non-operation fields (parameters, servers, summary, description, $ref, etc.)
        if (
          methodKey.startsWith('x-') ||
          methodKey === 'parameters' ||
          methodKey === 'servers' ||
          methodKey === 'summary' ||
          methodKey === 'description' ||
          methodKey === '$ref'
        ) {
          continue
        }

        // Check if this looks like an operation (has an object value)
        if (!methodValue || typeof methodValue !== 'object') continue

        const lowerMethod = methodKey.toLowerCase()

        if (!VALID_HTTP_METHODS.includes(lowerMethod as (typeof VALID_HTTP_METHODS)[number])) {
          errors.push({
            path: `paths.${pathKey}.${methodKey}`,
            message:
              `Invalid HTTP method "${methodKey}". ` +
              ValidationErrorMessages[ValidationErrorCode.INVALID_HTTP_METHOD],
            code: ValidationErrorCode.INVALID_HTTP_METHOD
          })
        }
      }
    }

    return errors
  }

  /**
   * Check spec size does not exceed configured limit
   */
  private checkSizeLimits(spec: Record<string, unknown>): ValidationError[] {
    const jsonString = JSON.stringify(spec)
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8')

    if (sizeInBytes > this.maxSpecSizeBytes) {
      const sizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2)
      const maxSizeMB = (this.maxSpecSizeBytes / (1024 * 1024)).toFixed(0)
      return [
        {
          path: '',
          message:
            `Spec size is ${sizeMB}MB, which exceeds the maximum of ${maxSizeMB}MB. ` +
            ValidationErrorMessages[ValidationErrorCode.SPEC_TOO_LARGE],
          code: ValidationErrorCode.SPEC_TOO_LARGE
        }
      ]
    }

    return []
  }

  /**
   * Count total endpoints (path + method combinations)
   */
  private countEndpoints(spec: Record<string, unknown>): number {
    const paths = spec.paths as Record<string, unknown>
    if (!paths || typeof paths !== 'object') return 0

    let count = 0

    for (const [pathKey, pathValue] of Object.entries(paths)) {
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

  /**
   * Check endpoint count does not exceed configured limit
   */
  private checkEndpointCount(spec: Record<string, unknown>): ValidationError[] {
    const count = this.countEndpoints(spec)

    if (count > this.maxEndpoints) {
      return [
        {
          path: 'paths',
          message:
            `Spec contains ${count} endpoints, which exceeds the maximum of ${this.maxEndpoints}. ` +
            ValidationErrorMessages[ValidationErrorCode.TOO_MANY_ENDPOINTS],
          code: ValidationErrorCode.TOO_MANY_ENDPOINTS
        }
      ]
    }

    return []
  }

  /**
   * Map swagger-parser errors to structured ValidationError format
   */
  private mapParserError(error: unknown): ValidationError[] {
    if (error instanceof SyntaxError) {
      return [
        {
          path: '',
          message:
            `Invalid JSON syntax: ${error.message}. ` +
            ValidationErrorMessages[ValidationErrorCode.INVALID_JSON],
          code: ValidationErrorCode.INVALID_JSON
        }
      ]
    }

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()

      // Check for $ref resolution errors
      if (errorMessage.includes('$ref') || errorMessage.includes('reference')) {
        // Check if it's a circular reference
        if (errorMessage.includes('circular')) {
          return [
            {
              path: this.extractPathFromError(error),
              message:
                `Circular reference detected: ${error.message}. ` +
                ValidationErrorMessages[ValidationErrorCode.CIRCULAR_REF],
              code: ValidationErrorCode.CIRCULAR_REF
            }
          ]
        }

        return [
          {
            path: this.extractPathFromError(error),
            message:
              `Reference resolution failed: ${error.message}. ` +
              ValidationErrorMessages[ValidationErrorCode.UNRESOLVABLE_REF],
            code: ValidationErrorCode.UNRESOLVABLE_REF
          }
        ]
      }

      // Generic schema validation error
      return [
        {
          path: this.extractPathFromError(error),
          message:
            `Schema validation error: ${error.message}. ` +
            ValidationErrorMessages[ValidationErrorCode.SCHEMA_VALIDATION_ERROR],
          code: ValidationErrorCode.SCHEMA_VALIDATION_ERROR
        }
      ]
    }

    // Unknown error type
    return [
      {
        path: '',
        message:
          `Unknown validation error: ${String(error)}. ` +
          ValidationErrorMessages[ValidationErrorCode.SCHEMA_VALIDATION_ERROR],
        code: ValidationErrorCode.SCHEMA_VALIDATION_ERROR
      }
    ]
  }

  /**
   * Extract JSON path from error object if available
   */
  private extractPathFromError(error: Error): string {
    // Check if error has a path property (common in JSON schema validators)
    const errorWithPath = error as Error & {
      path?: string
      instancePath?: string
    }

    if (errorWithPath.path) {
      return errorWithPath.path
    }

    if (errorWithPath.instancePath) {
      return errorWithPath.instancePath
    }

    // Try to extract path from error message
    const pathMatch = error.message.match(/at\s+([^\s]+)/)
    if (pathMatch) {
      return pathMatch[1]
    }

    return ''
  }
}
