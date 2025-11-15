# Technical Debt & Action Items Backlog

This file tracks technical improvements, review findings, and follow-up items identified during development.

---

## Active Items

| Date       | Story | Epic | Type        | Severity | Owner | Status | Notes                                                                                                                                                                                                                                                        |
| ---------- | ----- | ---- | ----------- | -------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2025-11-15 | 1.5   | 1    | TechDebt    | Medium   | TBD   | Open   | Add database initialization script for pgvector extension. The pgvector/pgvector:pg16 image has the extension available but does NOT automatically create it. Need docker/init.sql with `CREATE EXTENSION IF NOT EXISTS vector`. [file: docker/init.sql:new] |
| 2025-11-15 | 1.5   | 1    | TechDebt    | Low      | TBD   | Open   | Remove deprecated version directive from docker-compose.yml. Modern Docker Compose v2+ ignores `version: '3.8'` directive. [file: docker-compose.yml:1]                                                                                                      |
| 2025-11-15 | 1.5   | 1    | Enhancement | Low      | TBD   | Open   | Consolidate .env.example files with clear usage documentation. Developers may be confused between `.env.docker.example` and app-specific `.env.example` files. Create root .env.example with usage guidance. [file: .env.example:new]                        |

---

## Advisory Notes (No Action Required)

These are suggestions for future consideration, not immediate action items:

### From Story 1.5 Review (2025-11-15)

- Consider adding GitHub Actions workflow for Docker image builds and size validation
- Review pnpm symlink copying in apps/web/Dockerfile:59-60 for potential optimization
- Add container resource limits for production deployment
- Verify actual image sizes by running `docker build` and `docker images`

---

## Completed Items

| Date Completed | Story | Description            |
| -------------- | ----- | ---------------------- |
| -              | -     | No completed items yet |

---

## Priority Guidelines

- **High**: Blocking issues, security vulnerabilities, critical bugs
- **Medium**: Technical debt affecting maintainability, missing tests, incomplete features
- **Low**: Code cleanup, optimization opportunities, documentation improvements

## Status Definitions

- **Open**: Not yet started
- **In Progress**: Actively being worked on
- **Blocked**: Cannot proceed due to external dependency
- **Done**: Completed and verified
