import type { HealthCheckResponse, ErrorResponse } from '@perrache/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    const error: ErrorResponse = await response.json()
    throw new Error(error.error.message)
  }
  return response.json()
}
