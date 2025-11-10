# Database Setup and Validation Guide

This document provides step-by-step instructions for setting up and validating the PostgreSQL database with pgvector extension.

## Prerequisites

- Docker installed and running
- Node.js 20+ and pnpm installed
- Project dependencies installed (`pnpm install`)

## Setup Steps

### 1. Start PostgreSQL Database

```bash
# Start PostgreSQL with pgvector in detached mode
docker compose up -d

# Check container status
docker compose ps

# View logs
docker compose logs -f postgres
```

Expected output:

```
✓ Container perrache-postgres  Started
```

### 2. Apply Database Migrations

```bash
# From API directory
cd apps/api

# Run Prisma migrations
pnpm db:migrate

# Or from project root
pnpm --filter @perrache/api db:migrate
```

This will:

- Create the `vector` extension
- Apply any pending migrations
- Generate Prisma Client

### 3. Verify Database Connection

```bash
# Start the API server
pnpm dev

# In another terminal, check health endpoint
curl http://localhost:3001/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "service": "perrache-api",
  "database": {
    "status": "connected",
    "provider": "postgresql"
  }
}
```

## Validation Tests

### 4. Run Automated Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui
```

Tests validate:

- ✅ Database connection succeeds
- ✅ pgvector extension is enabled
- ✅ Vector similarity queries work (L2 distance operator `<->`)
- ✅ Cosine similarity operator works (`<=>`)

### 5. Manual Validation

#### Test pgvector Extension

```bash
# Connect to database
docker exec -it perrache-postgres psql -U perrache -d perrache

# Check extension
SELECT * FROM pg_extension WHERE extname = 'vector';

# Test vector operations
SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS l2_distance;
SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector AS cosine_similarity;

# Exit
\q
```

#### Test Prisma Client

```typescript
// apps/api/src/test-db.ts
import { db } from './lib/db'

async function testDatabase() {
  // Test raw query
  const result = await db.$queryRaw`SELECT 1 as test`
  console.log('Database test:', result)

  // Test pgvector
  const vectorTest = await db.$queryRaw`
    SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector AS distance
  `
  console.log('Vector test:', vectorTest)
}

testDatabase()
```

Run with: `tsx src/test-db.ts`

## Troubleshooting

### Database Connection Fails

```bash
# Check if Docker is running
docker ps

# Check database logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Migration Errors

```bash
# Reset database (WARNING: Deletes all data)
pnpm db:migrate reset

# Or manually reset
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### pgvector Not Found

Ensure you're using the official `pgvector/pgvector:pg16` image in `docker-compose.yml` (not the deprecated `ankane/pgvector`).

## Environment Variables

Required variables in `apps/api/.env`:

```env
DATABASE_URL="postgresql://perrache:perrache_dev_password@localhost:5432/perrache?schema=public"
DB_POOL_SIZE=10
```

## Database Management Commands

```bash
# View database in Prisma Studio
pnpm db:studio

# Generate Prisma Client after schema changes
pnpm db:generate

# Create new migration
pnpm db:migrate

# Stop database
docker compose down

# Stop and remove volumes (deletes data)
docker compose down -v
```

## Success Criteria

✅ All checklist items below should pass:

- [ ] `docker compose up -d` starts PostgreSQL successfully
- [ ] `pnpm db:migrate` applies migrations without errors
- [ ] pgvector extension is enabled (`SELECT * FROM pg_extension WHERE extname = 'vector'`)
- [ ] Vector similarity queries work (`SELECT '[1,2,3]'::vector <-> '[4,5,6]'::vector`)
- [ ] Health check endpoint returns `status: "healthy"` with `database.status: "connected"`
- [ ] All automated tests pass (`pnpm test`)

## Next Steps

After validation:

1. Define database models in `prisma/schema.prisma`
2. Create migrations for new models
3. Implement API endpoints using Prisma Client
4. Add vector embedding columns to relevant models
