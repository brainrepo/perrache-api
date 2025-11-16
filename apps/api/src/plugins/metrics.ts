import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import client from 'prom-client'
import { DatabaseService } from '../lib/db'

// Create a custom registry to avoid polluting the global registry
const register = new client.Registry()

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register })

// Custom HTTP metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
})

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
})

// Paths to exclude from metrics collection
const excludePaths = ['/metrics', '/health', '/docs']

/**
 * Prometheus metrics plugin for Fastify
 * Exposes /metrics endpoint with request counts, latencies, and system metrics
 */
async function metricsPlugin(fastify: FastifyInstance): Promise<void> {
  // Track request metrics on response
  fastify.addHook('onResponse', (request, reply, done) => {
    // Skip metrics collection for excluded paths
    const path = request.routeOptions.url || request.url
    if (excludePaths.some((excludePath) => path.startsWith(excludePath))) {
      done()
      return
    }

    const route = request.routeOptions.url || request.url
    const method = request.method
    const statusCode = reply.statusCode.toString()

    // Increment request counter
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    })

    // Record request duration (getResponseTime returns milliseconds)
    httpRequestDuration.observe({ method, route }, reply.elapsedTime / 1000)

    done()
  })

  // Register /metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType)

    // Get prom-client metrics
    const promMetrics = await register.metrics()

    // Get Prisma database metrics (if available)
    const prismaMetrics = await DatabaseService.getMetrics()

    // Combine both metrics outputs
    // Prisma metrics are already in Prometheus format
    const combinedMetrics = prismaMetrics ? `${promMetrics}\n${prismaMetrics}` : promMetrics

    return combinedMetrics
  })
}

// Export as encapsulated Fastify plugin
export default fp(metricsPlugin, {
  name: 'metrics-plugin',
  fastify: '5.x'
})

// Export registry for testing purposes
export { register }
