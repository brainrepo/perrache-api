import { PrismaClient } from '@prisma/client'

/**
 * Database connection instance with connection pooling
 * Singleton pattern to prevent multiple connections
 */
class DatabaseService {
  private static instance: PrismaClient | null = null

  static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      const poolSize = parseInt(process.env.DB_POOL_SIZE || '10', 10)

      DatabaseService.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
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
}

export const db = DatabaseService.getInstance()
export { DatabaseService }
