/**
 * Shared TypeScript types for Perrache
 *
 * This package contains type definitions shared between frontend and backend
 * to ensure type safety across the entire monorepo.
 */

// Error codes enum for standardized error responses
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Error response format
export interface ErrorResponse {
  error: {
    code: ErrorCode | string
    message: string
    details?: Record<string, unknown>
  }
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    database: 'healthy' | 'unhealthy' | 'error'
  }
  version: string
}

// Legacy types for backward compatibility
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: unknown[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// More types will be added as the project progresses
