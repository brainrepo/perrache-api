# Perrache API

Backend API server for the automated API catalog with semantic search capabilities.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:push

# Start development server
pnpm dev

# Run tests
pnpm test
```

## Architecture

Built with:

- **Fastify** - High-performance web framework
- **Prisma** - Type-safe database ORM with PostgreSQL
- **pgvector** - Vector similarity search extension
- **Pino** - Structured JSON logging
- **prom-client** - Prometheus-compatible metrics

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check with services status
- `GET /metrics` - Prometheus metrics endpoint
- `GET /docs` - OpenAPI/Swagger documentation
- `POST /api/v1/admin/keys` - Create API key (admin)
- `GET /api/v1/protected` - Protected route example

## Observability

### Structured Logging

The API uses Pino for structured JSON logging with the following features:

**Log Levels**: Configurable via `LOG_LEVEL` environment variable

- `trace` - Most verbose, includes all details
- `debug` - Development debugging information
- `info` - General operational messages (default)
- `warn` - Warning conditions
- `error` - Error conditions
- `fatal` - Critical errors causing shutdown

**Development Mode** (pino-pretty):

```bash
# Logs are automatically formatted for human readability
LOG_LEVEL=debug pnpm dev

# Example output:
# 15:30:45 Z INFO: Application started
#   version: "0.1.0"
#   nodeEnv: "development"
#   port: 3001
```

**Production Mode** (JSON):

```bash
# Logs output as structured JSON for log aggregation
LOG_LEVEL=info NODE_ENV=production pnpm start

# Example output:
# {"level":30,"time":1731680445000,"pid":1234,"hostname":"server","reqId":"req_1731680445000_abc123def","version":"0.1.0","nodeEnv":"production","msg":"Application started"}
```

**Log Fields**:

- `time` - ISO 8601 timestamp
- `level` - Numeric log level
- `reqId` - Correlation ID for request tracking
- `req.method` - HTTP method
- `req.url` - Request URL
- `res.statusCode` - Response status code
- `responseTime` - Request duration in ms

**Sensitive Data Redaction**:
Automatically redacts:

- Authorization headers
- API keys (`x-api-key` header)
- Passwords in request/response bodies
- Tokens and secrets

### Request Correlation

Every request receives a unique correlation ID:

- Generated format: `req_{timestamp}_{random}`
- Included in logs as `reqId`
- Returned in response header: `X-Request-ID`

Use this ID to trace requests across log entries:

```bash
# Find all logs for a specific request
grep "req_1731680445000_abc123def" logs.json
```

### Prometheus Metrics

**Endpoint**: `GET /metrics`

Returns Prometheus-compatible text format for scraping.

**Available Metrics**:

1. **HTTP Request Counter**

   ```
   http_requests_total{method="GET",route="/health",status_code="200"}
   ```

   - Labels: method, route, status_code
   - Tracks total requests by endpoint

2. **HTTP Request Duration Histogram**

   ```
   http_request_duration_seconds_bucket{le="0.1",method="GET",route="/health"}
   http_request_duration_seconds_sum{method="GET",route="/health"}
   http_request_duration_seconds_count{method="GET",route="/health"}
   ```

   - Labels: method, route
   - Buckets: 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s
   - Provides p50, p95, p99 latency analysis

3. **Default Node.js Metrics**
   - Process CPU usage
   - Process memory usage
   - Event loop lag
   - Active handles/requests

**Scraping with Prometheus**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'perrache-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

**Excluded from Metrics**:

- `/metrics` endpoint itself (avoid self-referential noise)
- `/health` endpoint (monitoring traffic)

### Health Monitoring

**Endpoint**: `GET /health`

**Response Structure**:

```json
{
  "status": "healthy",
  "timestamp": "2024-11-15T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "healthy"
  },
  "version": "0.1.0"
}
```

**Status Codes**:

- `200` - All services healthy
- `503` - One or more services unhealthy

**Fields**:

- `status` - Overall health (`healthy` | `unhealthy`)
- `timestamp` - ISO 8601 timestamp of check
- `uptime` - Application uptime in seconds
- `services.database` - Database connectivity status
- `version` - Application version from package.json

**Usage for Load Balancers**:

```bash
# Kubernetes liveness probe
curl -f http://localhost:3001/health || exit 1

# Docker HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3001/health || exit 1
```

**Monitoring Dashboards**:

- Response time should be < 100ms
- Check frequency: every 30 seconds recommended
- Alert on consecutive failures (3+)

## Environment Variables

See `.env.example` for all available configuration options.

**Key Variables**:

- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging verbosity (trace/debug/info/warn/error/fatal)
- `DATABASE_URL` - PostgreSQL connection string

## Security

- **Rate Limiting**: 100 requests/minute per IP
- **API Key Authentication**: Required for protected endpoints
- **Helmet**: Security headers enabled
- **CORS**: Configurable origin restrictions
- **Log Redaction**: Sensitive data automatically censored

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch
```

## Development

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format

# Build for production
pnpm build
```

## Docker

```bash
# Build image
docker build -t perrache-api .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e NODE_ENV=production \
  perrache-api
```

## License

Private - All rights reserved.
