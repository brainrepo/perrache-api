import { PrismaClient } from '@prisma/client'

/**
 * Database connection instance with connection pooling
 * Singleton pattern to prevent multiple connections
 */
class DatabaseService {
  private static instance: PrismaClient | null = null

  /**
   * Builds the database URL with connection_limit parameter for Prisma
   * Prisma uses connection_limit in the URL to configure pool size
   */
  private static buildDatabaseUrl(): string {
    const baseUrl = process.env.DATABASE_URL || ''
    const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10)

    // Parse the URL to add connection_limit parameter
    const url = new URL(baseUrl)

    // Only set connection_limit if not already present in the URL
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', poolSize.toString())
    }

    return url.toString()
  }

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10)
      const databaseUrl = DatabaseService.buildDatabaseUrl()

      DatabaseService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      })

      console.log(`📦 Database connection pool initialized (size: ${poolSize})`)
    }

    return DatabaseService.instance
  }

  static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect()
      DatabaseService.instance = null
      console.log('🔌 Database connection closed')
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const db = DatabaseService.getInstance()
      await db.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  /**
   * Get Prisma metrics in Prometheus format
   * Requires the 'metrics' preview feature to be enabled in schema.prisma
   * @returns Prometheus-formatted metrics string
   */
  static async getMetrics(): Promise<string> {
    const db = DatabaseService.getInstance()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = db as any
    if (typeof client.$metrics?.prometheus === 'function') {
      return client.$metrics.prometheus()
    }
    return ''
  }
}

export const db = DatabaseService.getInstance()
export { DatabaseService }
