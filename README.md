# Perrache

![Perrache station](docs/assets/perrache.png)

**Open source enterprise API catalog platform for effortless API discovery and governance**

## The Problem

In enterprises with 200+ internal APIs, developers waste days or weeks searching for the right endpoint. Teams unknowingly build duplicate services because they can't discover what already exists. Breaking changes surprise consumers. API discovery is broken.

## The Solution

Perrache solves the API discovery crisis through automated ingestion, semantic search, and intelligent governance - all in a single platform that requires zero manual effort.

### Key Features

- **Automatic CI/CD Ingestion**: Webhook endpoint receives OpenAPI specs from any CI/CD pipeline - one line of config, zero maintenance
- **Semantic Discovery**: Search by concept, not keywords. Find "user profile data" across `userEmail`, `contactEmail`, `primaryEmail`
- **Breaking Change Detection**: Automatic spec diffing classifies changes (breaking/non-breaking) and notifies affected consumers
- **Dependency Tracking**: Track who consumes which endpoints at a granular level - know the impact before you deploy
- **Landscape Visualization**: Visual clustering reveals duplicate APIs and domain overlap across your entire API ecosystem
- **Risk-Based Governance**: Visibility-driven approach without blocking deployments

## How It Works

1. **Teams add one line to CI/CD**: `POST` OpenAPI spec to Perrache webhook on deployment
2. **Perrache generates embeddings**: Routes, schemas, and metadata become semantically searchable
3. **Developers search by intent**: "customer contact info" finds relevant endpoints across all services
4. **Breaking changes auto-detected**: Spec comparison runs on every upload, consumers notified automatically
5. **Impact analysis**: See exactly which services are affected by API changes

## Why Perrache?

**Existing tools fall short:**

- Swagger UI: Lives in each repo, no centralized discovery
- Postman: Manual collection maintenance, no semantic search
- Backstage: Requires manual YAML catalog entries teams won't maintain
- Kong/3scale: Gateway-dependent, runtime overhead, keyword search only

**Perrache is different:**

- Zero manual effort (webhook-first automation)
- Platform-agnostic (works with any CI/CD)
- Zero runtime overhead (catalog-only, no gateway)
- Semantic intelligence (embeddings-based discovery)
- Open source (no vendor lock-in)

## Quick Start

### Prerequisites

- **Node.js**: 20+ LTS (use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
- **pnpm**: 8+ (`npm install -g pnpm`)
- **PostgreSQL**: 15+ with pgvector extension (for local development)

### Installation

```bash
# Clone the repository
git clone https://github.com/brainrepo/perrache.git
cd perrache

# Use correct Node.js version
nvm use  # or fnm use

# Install dependencies
pnpm install

# Start PostgreSQL database with pgvector
docker compose up -d

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate

# Start development servers (API + Web)
pnpm dev
```

### Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps for production
- `pnpm test` - Run tests across all workspaces
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier
- `pnpm db:migrate` - Apply database migrations

### Docker Commands

- `docker compose up -d` - Start PostgreSQL with pgvector in background
- `docker compose down` - Stop database container
- `docker compose logs -f postgres` - View database logs
- `docker compose ps` - Check container status

### Project Structure

```
perrache/
├── apps/
│   ├── api/          # Fastify backend (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared ESLint/Prettier config
├── docs/             # Project documentation
└── bmad/             # BMad Method workflows
```

### Development URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **API Metrics**: http://localhost:3001/metrics
- **API Docs**: http://localhost:3001/docs

### Observability & Monitoring

The API includes production-grade observability features:

**Structured Logging (Pino)**

```bash
# Development mode automatically uses pino-pretty for readable logs
pnpm --filter @perrache/api dev

# Production logs are JSON format, written to stdout
# Log levels configurable via LOG_LEVEL environment variable
# Available levels: trace, debug, info, warn, error, fatal
LOG_LEVEL=debug pnpm --filter @perrache/api dev
```

Log output includes:

- Timestamp (ISO 8601)
- Correlation ID (`reqId`)
- HTTP method, URL, status code
- Response time in milliseconds
- Automatic redaction of sensitive data (auth headers, passwords, API keys)

**Prometheus Metrics**

```bash
# Scrape metrics endpoint
curl http://localhost:3001/metrics

# Metrics include:
# - http_requests_total (counter with method/route/status_code labels)
# - http_request_duration_seconds (histogram with p50/p95/p99 buckets)
# - Default Node.js metrics (CPU, memory, event loop)
```

Example Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'perrache-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

**Health Monitoring**

```bash
# Health check endpoint
curl http://localhost:3001/health

# Returns:
# {
#   "status": "healthy",
#   "timestamp": "2025-11-15T12:00:00.000Z",
#   "uptime": 3600,
#   "services": { "database": "healthy" },
#   "version": "0.1.0"
# }
```

**Request Correlation**

All responses include `X-Request-ID` header for distributed tracing:

```bash
curl -I http://localhost:3001/health
# X-Request-ID: req_1731657600000_abc123xyz
```

Use this ID to correlate logs across services and debug request flows.

## Integration Example

```yaml
# GitHub Actions example
- name: Upload OpenAPI spec to Perrache
  run: |
    curl -X POST https://perrache.yourorg.com/api/v1/specs/openapi \
      -H "Authorization: Bearer ${{ secrets.PERRACHE_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d @openapi.json
```

## MVP Features (Phase 1)

- CI/CD webhook integration for automatic spec ingestion
- Semantic search with embeddings-based relationship discovery
- Two-tier subscription model (person + endpoint subscribers)
- Automatic breaking change detection with impact analysis
- Risk-based governance (visibility without blocking)
- Environment tracking (dev/staging/prod spec versions)

## Vision (Future Phases)

- Change proposal workflow with consumer feedback
- Visual landscape clustering (HDBSCAN + UMAP) for duplication detection
- API design editor with semantic suggestions
- Per-endpoint Q&A knowledge base

## Contributing

Perrache is open source and welcomes contributions. More details coming soon.

## License

GNU AFFERO GENERAL PUBLIC LICENSE

## Contact

- GitHub Issues: [Report bugs or request features](https://github.com/brainrepo/perrache-api/issues)
- Discussions: [Join the conversation](https://github.com/brainrepo/perrache-api/discussions)

---

**Built with the conviction that API discovery should be effortless, not a weeks-long search.**
