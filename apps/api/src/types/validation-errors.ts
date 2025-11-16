/**
 * OpenAPI Validation Error Codes
 * Standardized error codes for OpenAPI spec validation failures
 */
export enum ValidationErrorCode {
  /** Spec is not valid JSON or not a JSON object */
  INVALID_JSON = 'INVALID_JSON',

  /** OpenAPI version is not 3.0.x or 3.1.x */
  INVALID_OPENAPI_VERSION = 'INVALID_OPENAPI_VERSION',

  /** Required field is missing (openapi, info.title, info.version, paths) */
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  /** HTTP method is not valid (must be GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) */
  INVALID_HTTP_METHOD = 'INVALID_HTTP_METHOD',

  /** Paths object is empty or contains no endpoints */
  NO_PATHS_DEFINED = 'NO_PATHS_DEFINED',

  /** $ref cannot be resolved (internal or external reference not found) */
  UNRESOLVABLE_REF = 'UNRESOLVABLE_REF',

  /** Circular $ref detected in spec */
  CIRCULAR_REF = 'CIRCULAR_REF',

  /** Spec exceeds maximum size limit (10MB) */
  SPEC_TOO_LARGE = 'SPEC_TOO_LARGE',

  /** Spec contains more than maximum allowed endpoints (1000) */
  TOO_MANY_ENDPOINTS = 'TOO_MANY_ENDPOINTS',

  /** Generic schema validation error from OpenAPI spec validator */
  SCHEMA_VALIDATION_ERROR = 'SCHEMA_VALIDATION_ERROR'
}

/**
 * Human-readable error messages for each validation error code
 * These messages guide users on how to fix validation issues
 */
export const ValidationErrorMessages: Record<ValidationErrorCode, string> = {
  [ValidationErrorCode.INVALID_JSON]:
    'The provided spec is not valid JSON or is not a JSON object. Ensure the spec is a properly formatted JSON object.',

  [ValidationErrorCode.INVALID_OPENAPI_VERSION]:
    'OpenAPI version must be 3.0.x or 3.1.x. Update the "openapi" field to a supported version (e.g., "3.0.3" or "3.1.0").',

  [ValidationErrorCode.MISSING_REQUIRED_FIELD]:
    'A required field is missing from the OpenAPI spec. Ensure the spec includes: openapi, info.title, info.version, and paths.',

  [ValidationErrorCode.INVALID_HTTP_METHOD]:
    'Invalid HTTP method found in paths. Valid methods are: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS.',

  [ValidationErrorCode.NO_PATHS_DEFINED]:
    'The paths object must contain at least one endpoint. Add at least one path with operations to your spec.',

  [ValidationErrorCode.UNRESOLVABLE_REF]:
    'A $ref reference could not be resolved. Ensure all referenced schemas exist and paths are correct.',

  [ValidationErrorCode.CIRCULAR_REF]:
    'Circular $ref reference detected. While circular refs are valid in OpenAPI, they may cause issues during processing.',

  [ValidationErrorCode.SPEC_TOO_LARGE]:
    'The spec exceeds the maximum size limit of 10MB. Consider splitting large specs or reducing embedded content.',

  [ValidationErrorCode.TOO_MANY_ENDPOINTS]:
    'The spec contains more than 1000 endpoints. Consider splitting the API into multiple specs.',

  [ValidationErrorCode.SCHEMA_VALIDATION_ERROR]:
    'The spec does not conform to the OpenAPI schema specification. Review the error details for specific issues.'
}
