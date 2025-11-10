/**
 * Shared TypeScript types for Perrache
 *
 * This package contains type definitions shared between frontend and backend
 * to ensure type safety across the entire monorepo.
 */

// Placeholder types - will be expanded as features are implemented

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
