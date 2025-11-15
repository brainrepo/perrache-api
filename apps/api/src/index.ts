import 'dotenv/config'
import { createRequire } from 'module'
import { buildApp } from './app.js'
import { DatabaseService } from './lib/db.js'
import { validateEnvironment } from './lib/env.js'

// Load package.json for version info
const require = createRequire(import.meta.url)
const packageJson = require('../package.json')

// Validate environment on startup
const env = validateEnvironment()

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⏸️  Received ${signal}, shutting down gracefully...`)

  try {
    if (app) {
      await app.close()
    }
    await DatabaseService.disconnect()
    console.log('✅ Server and database connections closed')
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
let app: Awaited<ReturnType<typeof buildApp>> | null = null

const start = async () => {
  try {
    // Build Fastify app
    app = await buildApp()

    // Start listening
    const port = parseInt(env.PORT || '3001', 10)
    const host = env.HOST || '0.0.0.0'

    await app.listen({ port, host })

    // Check database connectivity for startup log
    const dbHealthy = await DatabaseService.healthCheck()

    // Log startup information using Pino logger (AC 6)
    app.log.info(
      {
        version: packageJson.version,
        nodeEnv: env.NODE_ENV,
        port,
        host,
        logLevel: env.LOG_LEVEL || 'info',
        database: dbHealthy ? 'connected' : 'disconnected'
      },
      'Application started'
    )

    console.log(`\n🚀 Perrache API server ready at http://${host}:${port}`)
    console.log(`📊 Health check: http://${host}:${port}/health`)
    console.log(`📈 Metrics: http://${host}:${port}/metrics`)
    console.log(`📚 API Documentation: http://${host}:${port}/docs\n`)
  } catch (err) {
    if (app) {
      app.log.error(err)
    } else {
      console.error('Startup error:', err)
    }
    await DatabaseService.disconnect()
    process.exit(1)
  }
}

start()
