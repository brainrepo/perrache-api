import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { DatabaseService } from './lib/db.js'
import { validateEnvironment } from './lib/env.js'
import { adminKeysRoutes } from './routes/admin/keys.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import authPlugin from './plugins/auth.js'

/**
 * Build Fastify application with all middleware and routes
 * Separated from server.ts to enable testing without starting the server
 */
export async function buildApp(): Promise<FastifyInstance> {
  // Validate environment variables on startup
  const env = validateEnvironment()

  // Initialize Fastify with pino logger
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL || 'info',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
              }
            }
          : undefined
    },
    // Generate unique request IDs for correlation
    genReqId: () => {
      return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId'
  })

  // Register CORS middleware BEFORE routes
  await app.register(cors, {
    origin: env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
  })

  // Register Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: false // Disable for development; enable in production with proper config
  })

  // Register Swagger for OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Perrache API',
        description: 'Automated API catalog with semantic search',
        version: '0.1.0'
      },
      servers: [
        {
          url: `http://localhost:${env.PORT || 3001}`,
          description: 'Development server'
        }
      ]
    }
  })

  // Register Swagger UI at /docs
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true
  })

  // Register rate limiting plugin globally
  await app.register(rateLimitPlugin)

  // Global error handler - registered BEFORE routes
  app.setErrorHandler((error, request, reply) => {
    // Log error with request ID for correlation
    request.log.error(
      {
        err: error,
        reqId: request.id,
        url: request.url,
        method: request.method
      },
      'Request error'
    )

    // Determine error code and status
    const err = error as any
    let statusCode = err.statusCode || 500
    let errorCode = 'INTERNAL_ERROR'

    if (err.validation) {
      statusCode = 400
      errorCode = 'INVALID_REQUEST'
    } else if (statusCode === 404) {
      errorCode = 'NOT_FOUND'
    } else if (statusCode === 401) {
      errorCode = 'UNAUTHORIZED'
    } else if (statusCode === 429) {
      errorCode = 'RATE_LIMIT_EXCEEDED'
    }

    // Return standardized error response
    reply.status(statusCode).send({
      error: {
        code: errorCode,
        message: err.message || 'Internal server error',
        details: err.validation || undefined
      }
    })
  })

  // 404 handler for routes not found - must be set AFTER routes
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`
      }
    })
  })

  // Health check endpoint with database connectivity
  app.get('/health', async (request, reply) => {
    const timestamp = new Date().toISOString()

    try {
      // Check database connectivity
      const dbHealthy = await DatabaseService.healthCheck()

      if (!dbHealthy) {
        reply.status(503)
        return {
          status: 'unhealthy',
          timestamp,
          services: {
            database: 'unhealthy'
          },
          version: '0.1.0'
        }
      }

      return {
        status: 'healthy',
        timestamp,
        services: {
          database: 'healthy'
        },
        version: '0.1.0'
      }
    } catch (error) {
      request.log.error({ err: error }, 'Health check failed')
      reply.status(503)
      return {
        status: 'unhealthy',
        timestamp,
        services: {
          database: 'error'
        },
        version: '0.1.0'
      }
    }
  })

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'Perrache API',
      version: '0.1.0',
      description: 'Automated API catalog with semantic search',
      docs: '/docs'
    }
  })

  // Register admin routes (unauthenticated - for key management)
  await app.register(adminKeysRoutes, { prefix: '/api/v1/admin/keys' })

  // Register protected routes with authentication
  // Auth plugin is encapsulated to this context only
  await app.register(
    async (protectedContext) => {
      await protectedContext.register(authPlugin)
      // Future protected routes (e.g., webhook ingestion) will be registered here
      protectedContext.get('/protected', async (request) => {
        return {
          message: 'Access granted',
          apiKeyId: request.apiKeyId
        }
      })
    },
    { prefix: '/api/v1' }
  )

  return app
}
