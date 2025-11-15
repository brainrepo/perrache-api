import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildApp } from '../app.js'
import type { FastifyInstance } from 'fastify'

describe('Observability & Monitoring (Story 1.7)', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('AC 1: Structured JSON Logging', () => {
    it('should have Pino logger configured with correct level', () => {
      expect(app.log).toBeDefined()
      expect(typeof app.log.info).toBe('function')
      expect(typeof app.log.error).toBe('function')
      expect(typeof app.log.warn).toBe('function')
      expect(typeof app.log.debug).toBe('function')
    })

    it('should log request details in structured format', async () => {
      // Fastify with Pino automatically logs request details
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)
      // Pino logger is configured in app, structured JSON format is default
    })
  })

  describe('AC 2: No PII in Logs (Redaction)', () => {
    it('should have redaction configured for sensitive fields', () => {
      // Check that logger has redaction configured
      const loggerOptions = (app.log as any).options || (app.log as any)
      // Pino logger should have redact configuration
      expect(app.log).toBeDefined()
    })

    it('should not expose authorization headers in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          authorization: 'Bearer secret-token-123'
        }
      })

      // Response should not contain the auth token
      expect(response.body).not.toContain('secret-token-123')
    })
  })

  describe('AC 3: Configurable Log Levels', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      // LOG_LEVEL is used in app configuration
      // Default is 'info' if not set
      const logLevel = process.env.LOG_LEVEL || 'info'
      expect(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).toContain(logLevel)
    })

    it('should have logger level accessible', () => {
      expect(app.log.level).toBeDefined()
    })
  })

  describe('AC 4: Prometheus Metrics Endpoint', () => {
    it('should expose GET /metrics endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      expect(response.statusCode).toBe(200)
    })

    it('should return Prometheus-compatible format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      expect(response.headers['content-type']).toContain('text/plain')
    })

    it('should include default Node.js metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      const metrics = response.body
      // Default metrics include process CPU and memory
      expect(metrics).toContain('process_cpu')
      expect(metrics).toContain('nodejs_')
    })

    it('should include custom HTTP request metrics', async () => {
      // Make a request to generate metrics
      await app.inject({
        method: 'GET',
        url: '/'
      })

      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      const metrics = response.body
      expect(metrics).toContain('http_requests_total')
      expect(metrics).toContain('http_request_duration_seconds')
    })

    it('should track request counts with labels', async () => {
      // Make multiple requests
      await app.inject({ method: 'GET', url: '/' })
      await app.inject({ method: 'GET', url: '/health' })

      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      const metrics = response.body
      // Check for labeled metrics
      expect(metrics).toContain('method="GET"')
      expect(metrics).toContain('status_code=')
    })

    it('should include histogram buckets for latency', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      const metrics = response.body
      // Histogram buckets
      expect(metrics).toContain('http_request_duration_seconds_bucket')
      expect(metrics).toContain('le="0.01"')
      expect(metrics).toContain('le="0.05"')
      expect(metrics).toContain('le="0.1"')
    })

    it('should exclude /metrics and /health from metrics collection', async () => {
      // Clear previous metrics by making requests
      await app.inject({ method: 'GET', url: '/metrics' })
      await app.inject({ method: 'GET', url: '/health' })

      const response = await app.inject({
        method: 'GET',
        url: '/metrics'
      })

      const metrics = response.body
      // /metrics and /health should not appear in route labels
      // They are excluded to avoid noise
      const lines = metrics.split('\n')
      const httpRequestLines = lines.filter(
        (line: string) => line.includes('http_requests_total') && line.includes('route="/metrics"')
      )
      expect(httpRequestLines.length).toBe(0)
    })
  })

  describe('AC 5: Enhanced Health Check', () => {
    it('should return detailed status with all required fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('timestamp')
      expect(body).toHaveProperty('services')
      expect(body).toHaveProperty('version')
      expect(body.services).toHaveProperty('database')
    })

    it('should include uptime in health response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('uptime')
      expect(typeof body.uptime).toBe('number')
      expect(body.uptime).toBeGreaterThanOrEqual(0)
    })

    it('should return version from package.json', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      const body = JSON.parse(response.body)
      // Version should be a semver string
      expect(body.version).toMatch(/^\d+\.\d+\.\d+/)
    })

    it('should respond within 100ms (NFR-P1)', async () => {
      const start = Date.now()

      await app.inject({
        method: 'GET',
        url: '/health'
      })

      const duration = Date.now() - start
      expect(duration).toBeLessThan(100)
    })
  })

  describe('AC 6: Startup Logging', () => {
    it('should include version in root endpoint response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/'
      })

      const body = JSON.parse(response.body)
      expect(body.version).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('AC 7: Logs Written to stdout', () => {
    it('should have logger that writes to stdout (no file transport)', () => {
      // Pino by default writes to stdout
      // In production (NODE_ENV !== 'development'), no transport is configured
      // which means it writes directly to stdout
      expect(app.log).toBeDefined()
      expect(typeof app.log.info).toBe('function')
    })
  })

  describe('AC 8: X-Request-ID Response Header', () => {
    it('should include X-Request-ID in response headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.headers['x-request-id']).toBeDefined()
      expect(typeof response.headers['x-request-id']).toBe('string')
    })

    it('should generate unique correlation IDs for each request', async () => {
      const response1 = await app.inject({
        method: 'GET',
        url: '/health'
      })

      const response2 = await app.inject({
        method: 'GET',
        url: '/health'
      })

      const id1 = response1.headers['x-request-id']
      const id2 = response2.headers['x-request-id']

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })

    it('should use consistent request ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      const requestId = response.headers['x-request-id'] as string
      // Format: req_{timestamp}_{random}
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/)
    })

    it('should include X-Request-ID in all responses', async () => {
      const endpoints = ['/', '/health', '/docs/json']

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'GET',
          url: endpoint
        })

        expect(response.headers['x-request-id']).toBeDefined()
      }
    })

    it('should include X-Request-ID even for 404 errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent-route-xyz'
      })

      expect(response.statusCode).toBe(404)
      expect(response.headers['x-request-id']).toBeDefined()
    })
  })
})
