import Fastify from 'fastify'
import cors from '@fastify/cors'

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

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'perrache-api'
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
    process.exit(1)
  }
}

start()
