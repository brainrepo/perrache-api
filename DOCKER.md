# Docker Deployment Guide

This guide explains how to run the Perrache API Catalog application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Copy the environment file:**
   ```bash
   cp .env.docker.example .env
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Health: http://localhost:3001/health

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop all services:**
   ```bash
   docker-compose down
   ```

## Architecture

The Docker Compose setup includes three services:

### 1. Database (`database`)
- **Image:** `pgvector/pgvector:pg16`
- **Port:** 5432
- **Features:**
  - PostgreSQL 16 with pgvector extension
  - Persistent volume for data storage
  - Health checks every 10 seconds
  - Automatic restart on failure

### 2. Backend API (`api`)
- **Build:** Multi-stage Dockerfile
- **Port:** 3001
- **Features:**
  - Node.js 20 Alpine-based image
  - Multi-stage build for optimized size
  - Automatic database migrations on startup
  - Health checks via /health endpoint
  - Non-root user execution
  - Proper signal handling with dumb-init

### 3. Frontend Web (`web`)
- **Build:** Multi-stage Dockerfile with Next.js standalone output
- **Port:** 3000
- **Features:**
  - Optimized Next.js production build
  - Standalone output for minimal image size
  - Health checks on root endpoint
  - Non-root user execution

## Environment Variables

Create a `.env` file based on `.env.docker.example`:

```bash
# Node Environment
NODE_ENV=production

# Database Configuration
DB_USER=perrache
DB_PASSWORD=perrache_dev
DB_NAME=perrache
DB_PORT=5432

# API Configuration
API_PORT=3001
LOG_LEVEL=info

# Web Configuration
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Development vs Production

### Development Mode

For local development, use the native `pnpm` commands:

```bash
# Start database only
docker-compose up database -d

# Start API (separate terminal)
pnpm --filter api dev

# Start Web (separate terminal)
pnpm --filter web dev
```

### Production Mode

For production deployment, use Docker Compose:

```bash
docker-compose up -d
```

## Docker Commands

### Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build api
docker-compose build web

# Build with no cache
docker-compose build --no-cache
```

### Manage Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Remove containers (keeps volumes)
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f database

# Last N lines
docker-compose logs --tail=100 api
```

### Execute Commands

```bash
# Run shell in API container
docker-compose exec api sh

# Run Prisma migrations manually
docker-compose exec api npx prisma migrate deploy --schema=/app/apps/api/prisma/schema.prisma

# Access PostgreSQL
docker-compose exec database psql -U perrache -d perrache
```

## Health Checks

All services include health checks:

### Database
- **Command:** `pg_isready -U perrache`
- **Interval:** 10 seconds
- **Timeout:** 5 seconds
- **Start Period:** 30 seconds

### API
- **Endpoint:** `http://localhost:3001/health`
- **Interval:** 30 seconds
- **Timeout:** 3 seconds
- **Start Period:** 40 seconds

### Web
- **Endpoint:** `http://localhost:3000/`
- **Interval:** 30 seconds
- **Timeout:** 3 seconds
- **Start Period:** 40 seconds

## Volumes

### postgres_data
- **Type:** Named volume
- **Purpose:** Persists PostgreSQL database
- **Location:** Docker managed volume
- **Backup:** 
  ```bash
  docker-compose exec database pg_dump -U perrache perrache > backup.sql
  ```
- **Restore:**
  ```bash
  docker-compose exec -T database psql -U perrache perrache < backup.sql
  ```

## Networking

All services communicate via the `perrache-network` bridge network:

- Services can communicate using service names (e.g., `http://api:3001`)
- External access via published ports (3000, 3001, 5432)

## Image Sizes

Optimized multi-stage builds result in small production images:

- **Backend API:** ~150-200 MB
- **Frontend Web:** ~150-180 MB
- **Total (excluding database):** ~300-380 MB

## Troubleshooting

### Containers Won't Start

```bash
# Check service status
docker-compose ps

# Check logs for errors
docker-compose logs

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues

```bash
# Verify database is healthy
docker-compose ps database

# Check database logs
docker-compose logs database

# Test connection
docker-compose exec database pg_isready -U perrache
```

### Migration Failures

```bash
# Check API logs for migration errors
docker-compose logs api

# Run migrations manually
docker-compose exec api npx prisma migrate deploy --schema=/app/apps/api/prisma/schema.prisma

# Reset database (CAUTION: destroys data)
docker-compose down -v
docker-compose up -d
```

### Port Conflicts

If ports are already in use, modify the `.env` file:

```bash
API_PORT=3002
WEB_PORT=3001
DB_PORT=5433
```

Then restart services:

```bash
docker-compose down
docker-compose up -d
```

## Production Deployment

### Security Recommendations

1. **Change default passwords:**
   ```bash
   DB_PASSWORD=<strong-random-password>
   ```

2. **Disable external database access:**
   Remove the database ports section from `docker-compose.yml`

3. **Use secrets management:**
   Consider Docker Secrets or external secret management

4. **Enable HTTPS:**
   Add a reverse proxy (nginx/traefik) with SSL certificates

5. **Limit resources:**
   Add resource limits to docker-compose.yml:
   ```yaml
   services:
     api:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
   ```

### Monitoring

1. **Container health:**
   ```bash
   docker-compose ps
   ```

2. **Resource usage:**
   ```bash
   docker stats
   ```

3. **Logs:**
   Consider centralizing logs with tools like:
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Grafana Loki
   - Cloud provider logging services

## Updates and Maintenance

### Updating Images

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Database Backups

```bash
# Create backup
docker-compose exec database pg_dump -U perrache perrache | gzip > backup-$(date +%Y%m%d).sql.gz

# Schedule with cron
0 2 * * * cd /path/to/perrache && docker-compose exec -T database pg_dump -U perrache perrache | gzip > backup-$(date +\%Y\%m\%d).sql.gz
```

### Cleaning Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

## Next Steps

- Review [Architecture Documentation](docs/architecture.md)
- Configure observability (Story 1.7)
- Set up CI/CD pipeline
- Configure production secrets
- Set up monitoring and alerting
