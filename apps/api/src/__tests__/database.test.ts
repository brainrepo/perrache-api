import { describe, it, expect } from 'vitest'
import { DatabaseService } from '../lib/db'

describe('Database Connection', () => {
  it('should connect to PostgreSQL database successfully', async () => {
    const isHealthy = await DatabaseService.healthCheck()
    expect(isHealthy).toBe(true)
  })

  it('should have pgvector extension enabled', async () => {
    const db = DatabaseService.getInstance()
    const result = await db.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `
    expect(result).toHaveLength(1)
    expect(result[0].extname).toBe('vector')
  })

  it('should execute vector similarity query with pgvector operators', async () => {
    const db = DatabaseService.getInstance()

    // Test that we can use the <-> operator (L2 distance) for vector similarity
    // This validates pgvector is working correctly
    const result = await db.$queryRaw<Array<{ distance: number }>>`
      SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance
    `

    expect(result).toHaveLength(1)
    expect(typeof result[0].distance).toBe('number')
    expect(result[0].distance).toBeGreaterThan(0)
  })

  it('should support vector cosine similarity operator', async () => {
    const db = DatabaseService.getInstance()

    // Test cosine similarity operator (<=>)
    const result = await db.$queryRaw<Array<{ similarity: number }>>`
      SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector AS similarity
    `

    expect(result).toHaveLength(1)
    expect(typeof result[0].similarity).toBe('number')
  })
})
