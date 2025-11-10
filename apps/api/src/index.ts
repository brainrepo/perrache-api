import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { validateEnvironment } from './lib/env'
import { DatabaseService } from './lib/db'

// Validate environment variables on startup
validateEnvironment()

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
})

// Register CORS
fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
})

// Initialize database connection
DatabaseService.getInstance()

// Health check endpoint with database connectivity
fastify.get('/health', async (request, reply) => {
  const timestamp = new Date().toISOString()

  try {
    // Check database connectivity
    const dbHealthy = await DatabaseService.healthCheck()

    if (!dbHealthy) {
      reply.status(503)
      return {
        status: 'degraded',
        timestamp,
        service: 'perrache-api',
        database: {
          status: 'unhealthy',
          message: 'Database connection failed'
        }
      }
    }

    return {
      status: 'healthy',
      timestamp,
      service: 'perrache-api',
      database: {
        status: 'connected',
        provider: 'postgresql'
      }
    }
  } catch (error) {
    reply.status(503)
    return {
      status: 'unhealthy',
      timestamp,
      service: 'perrache-api',
      database: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

// Root endpoint
fastify.get('/', async () => {
  return {
    name: 'Perrache API',
    version: '0.1.0',
    description: 'Automated API catalog with semantic search'
  }
})

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n⏸️  Shutting down gracefully...')

  try {
    await fastify.close()
    await DatabaseService.disconnect()
    console.log('✅ Server and database connections closed')
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.API_PORT || '3001', 10)
    const host = process.env.API_HOST || '0.0.0.0'

    await fastify.listen({ port, host })

    console.log(`\n🚀 Perrache API server ready at http://${host}:${port}`)
    console.log(`📊 Health check: http://${host}:${port}/health\n`)
  } catch (err) {
    fastify.log.error(err)
    await DatabaseService.disconnect()
    process.exit(1)
  }
}

start()
