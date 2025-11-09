# Perrache - Product Requirements Document

**Author:** Brainrepo
**Date:** 2025-11-08
**Version:** 1.0

---

## Executive Summary

Perrache is an open source enterprise API catalog platform that eliminates the API discovery crisis in large organizations. In enterprises with 200+ internal APIs, developers waste days or weeks searching for endpoints, interrupt tech leads constantly with "where's the API for X?" questions, and worst of all - build duplicate services because discovery failed.

Perrache solves the "last mile problem" - the gap between framework-generated OpenAPI specs and an automatically-maintained, semantically-searchable catalog. By combining CI/CD webhook automation (simple curl POST with API key), semantic search (find APIs by concept, not keywords), and proactive breaking change detection, Perrache transforms API discovery from a painful, manual process into effortless self-service.

The platform prevents catastrophic organizational waste: duplicate engineering efforts (weeks of wasted work), constant tech lead interruptions, and the hidden costs of fragmented API landscapes.

### What Makes This Special

The magic moment happens the first time a developer or tech lead searches for an API and **finds it instantly without asking anyone**.

Instead of:
- Spending 2 weeks searching through repos
- Interrupting tech leads on Slack
- Building a duplicate service because discovery failed

They experience:
- Type "user profile data" into Perrache
- Get 3 semantically-related endpoints immediately
- See which is canonical, who owns it, who's using it
- Know if breaking changes are coming
- **All without anyone maintaining documentation manually**

This single moment breaks the cycle of interruptions, prevents duplicate builds, and gives developers their time back. For tech leads, it means their well-designed APIs finally get discovered and reused instead of rebuilt.

---

## Project Classification

**Technical Type:** API/Backend Platform with Web Frontend
- **Backend:** Fastify application (webhook API, semantic search engine, breaking change analyzer)
- **Frontend:** Next.js/React application (catalog browsing, search interface, governance dashboards)

**Domain:** Developer Tools / General Software

**Complexity:** Medium-High
- Semantic search with embeddings (vector similarity)
- OpenAPI spec diffing and change classification
- Multi-format API ingestion architecture
- Real-time notification system
- Visual clustering for governance (Phase 2)

**Architecture Pattern:** Backend-first platform
- Core value delivered through backend automation (webhook ingestion, semantic processing, change detection)
- Frontend provides discoverability and governance interfaces
- Zero runtime overhead - catalog-only, no gateway interception

---

## Success Criteria

Success for Perrache has two dimensions: effectiveness as a tool and growth as an open source project.

### Success as a Tool (Enterprise Impact)

Perrache succeeds as a tool when it becomes the default answer to "how do I find an API in our organization."

**Primary Success Indicators:**

1. **Discovery Time Reduction**
   - API search time drops from days/weeks → under 5 minutes
   - Developers find relevant APIs on first search (>80% success rate)
   - Tech leads report significant reduction in "where's the API?" interruptions

2. **Duplicate Prevention (North Star Metric)**
   - Identify and prevent at least 10 duplicate API builds per enterprise per year
   - Each prevented duplicate = weeks of engineering time saved
   - Governance teams can visualize and act on API duplication hotspots

3. **Adoption Depth**
   - 80%+ of APIs in adopting organizations cataloged within 6 months
   - Webhook integration added to CI/CD pipelines with minimal friction
   - Developers use Perrache as first resource before asking colleagues

4. **Breaking Change Management**
   - 100% of breaking changes automatically detected and classified
   - Consumers notified within 1 hour of spec upload
   - Production incidents prevented through proactive alerts

**What "Good" Looks Like:**
- A developer searches "customer email" and immediately finds `userEmail`, `contactEmail`, `primaryEmail` endpoints across services
- A tech lead uploads a new spec via CI/CD and consumers get breaking change alerts automatically
- A governance team sees visual clustering showing 3 teams building similar user profile APIs and can coordinate consolidation
- An enterprise catalogs 500+ APIs with zero manual documentation effort

**Enterprise Impact Metrics:**
- **Time saved:** 100+ developer hours per enterprise per month
- **Cost avoidance:** 10+ duplicate builds prevented per year (months of engineering capacity)
- **Productivity gain:** Tech leads spend less time answering discovery questions

### Success as an Open Source Project

Perrache succeeds as an open source project when it achieves broad adoption and active community engagement.

**Adoption Metrics:**
- **Enterprise installations:** 50 in Year 1, 200 by Year 2
- **Geographic distribution:** Adoption across NA, EU, APAC
- **Platform coverage:** Average 80%+ API catalog coverage per enterprise

**Community Health:**
- **GitHub engagement:** 1k+ stars Year 1, 5k+ Year 2
- **Active contributors:** 20+ regular contributors
- **Community contributions:** PRs merged per month, issue resolution time
- **Ecosystem growth:** CI/CD integrations, format support (gRPC, GraphQL), embedding model improvements

**Mindshare & Reach:**
- **Documentation:** Community tutorials, guides
- **Events:** Conference talks, blog posts, podcasts
- **Community channels:** Discord/Slack activity, forum engagement
- **Enterprise trust:** Auditable, transparent, security-conscious

**Why Open Source Matters:**
- Lower adoption barrier (no vendor lock-in, no licensing costs)
- Community ecosystem (platform-agnostic integrations)
- Trust through transparency (auditable for security-conscious enterprises)
- Network effects (more adoption → more contributions → better product)

---

## Product Scope

### MVP - Minimum Viable Product

The MVP focuses on solving the core discovery and change management problems with zero manual effort. Goal: Prove value with 3-5 pilot enterprises.

**1. CI/CD Webhook Integration**
- `POST /api/v1/specs/openapi` endpoint
- API key authentication (Bearer token)
- Platform-agnostic - works with any CI/CD (GitHub Actions, GitLab CI, Jenkins, etc.)
- Automatic spec ingestion on deployment
- Multi-format ready architecture (OpenAPI MVP, extensible for gRPC/GraphQL)

**2. Semantic Discovery Engine**
- Generate embeddings from route + method + schema
- Semantic search by concept/synonym (not just keywords)
- "Related Endpoints" view showing semantically similar routes across all APIs
- Search example: "customer email" finds `userEmail`, `contactEmail`, `primaryEmail`
- Prevents duplicate builds by surfacing what already exists

**3. Two-Tier Subscription Model**
- **Person subscribers:** Follow APIs for updates (email notifications)
- **Endpoint subscribers:** Track production dependencies (ServiceA → ServiceB)
- Granular tracking at endpoint-path-method level
- Enables impact analysis for breaking changes

**4. Automatic Breaking Change Detection**
- Compare new vs. previous OpenAPI spec on upload
- Leverage existing library: `@pb33f/openapi-changes`
- Classify changes:
  - **RED (Breaking):** Removed endpoints, removed fields, type changes
  - **YELLOW (Potentially Breaking):** Behavioral changes, rate limits
  - **GREEN (Non-breaking):** New endpoints, optional fields
- Impact preview: "X consumers affected by this change"
- In-app + email notifications

**5. Risk-Based Governance**
- Mark consumers as "RISK" if they don't update after breaking changes
- Visibility without enforcement (teams manage their own timeline)
- Non-blocking governance approach encourages adoption

**6. Environment Tracking**
- Track which spec version is in dev/staging/prod
- Helps consumers test against correct version
- Shows deployment progression across environments

**MVP Success Criteria:**
- Successfully ingest and index 100+ OpenAPI specs
- Semantic search returns relevant results with >80% accuracy
- System handles 10k+ API routes with <1s search latency
- At least 1 duplicate service build prevented per pilot org
- CI/CD integration takes <15 minutes to set up

### Growth Features (Post-MVP / Phase 2)

**Visual Landscape Clustering (Governance)**
- HDBSCAN clustering + UMAP dimension reduction
- Visualize API landscape to identify:
  - Duplicate APIs (tight clusters)
  - Domain overlapping across teams
  - Fragmentation hotspots
- Enable governance team to contact teams building duplicates
- Dashboard for platform teams to manage API ecosystem health

**Access Control & User Authentication**
- Team/role groups with namespace-based visibility
- API visibility restrictions
- SSO integration (OAuth, SAML)
- Deferred to validate core value first, add security layer after adoption

**Advanced Search Features**
- Filtering by tags, domains, teams
- Saved searches
- Search history
- Advanced query syntax

**Change Proposal with Feedback Loop**
- Upload PROPOSED spec before building
- Open for comments from consumers
- Prevents conflicts before code is written
- Requires established user base and workflow UX design

### Vision (Future / Moonshot)

**API Design Editor with Semantic Suggestions**
- Built-in OpenAPI editor
- Real-time semantic suggestions for schema consistency
- Prevents fragmentation at design time
- ADR generation when rejecting suggestions

**Per-Endpoint Q&A Knowledge Base**
- Stack Overflow-like Q&A attached to endpoints
- Captures tribal knowledge
- Community-driven documentation

**MCP Server for AI-Assisted Discovery**
- Model Context Protocol (MCP) server for AI coding assistants
- Integration with Claude Code, GitHub Copilot, Cursor
- Real-time semantic API discovery during development
- Developer asks AI: "I need user profile data" → AI queries Perrache → generates code with correct endpoint
- Surfaces breaking change warnings during code generation
- Eliminates context-switching, embeds discovery into coding flow

**Advanced Governance Features**
- Landscape owner role with curation powers
- Mark canonical sources with badges
- Deprecate APIs at landscape level
- Deployment notifications and change proposals

---

## API/Backend Platform Specific Requirements

### Backend Architecture (Fastify)

**Core API Endpoints:**

1. **Webhook Ingestion API**
   - `POST /api/v1/specs/openapi` - Ingest OpenAPI spec
   - `POST /api/v1/specs/grpc` (future) - Ingest gRPC protobuf
   - `POST /api/v1/specs/graphql` (future) - Ingest GraphQL schema
   - Authentication: Bearer token (API keys)
   - Request validation: OpenAPI spec validation before ingestion
   - Async processing: Queue spec for embedding generation and change detection

2. **Search & Discovery API**
   - `GET /api/v1/search?q={query}` - Semantic search across catalog
   - `GET /api/v1/endpoints/{id}/related` - Find semantically similar endpoints
   - `GET /api/v1/apis` - List all APIs in catalog
   - `GET /api/v1/apis/{id}` - Get API details
   - `GET /api/v1/endpoints/{id}` - Get endpoint details with consumers

3. **Subscription Management API**
   - `POST /api/v1/subscriptions/person` - Subscribe user to API updates
   - `POST /api/v1/subscriptions/endpoint` - Register endpoint dependency
   - `GET /api/v1/subscriptions` - List user subscriptions
   - `DELETE /api/v1/subscriptions/{id}` - Unsubscribe

4. **Breaking Change Detection API**
   - `GET /api/v1/changes/{apiId}` - Get change history for an API
   - `GET /api/v1/changes/{apiId}/latest` - Get latest breaking changes
   - `POST /api/v1/changes/{changeId}/acknowledge` - Acknowledge breaking change notification

5. **Governance API**
   - `POST /api/v1/apis/{id}/canonical` - Mark API as canonical source
   - `GET /api/v1/landscape/clusters` (Phase 2) - Get API landscape clustering data
   - `POST /api/v1/apis/{id}/risk` - Flag consumer at risk

### Authentication & Authorization

**MVP (Simple):**
- API key authentication for webhook ingestion
- Bearer token validation via Fastify middleware
- No user auth - open catalog access for MVP

**Phase 2 (Full Auth):**
- User authentication: OAuth 2.0 / SAML for SSO
- Role-based access control (RBAC):
  - **Viewer:** Read-only catalog access
  - **Developer:** Subscribe to APIs, acknowledge breaking changes
  - **API Owner:** Upload specs, mark canonical sources
  - **Governance Admin:** Full landscape visibility, manage risk flags
- Namespace-based visibility (team/org boundaries)

### Data Models & Schemas

**API Schema:**
```
{
  id: string,
  name: string,
  version: string,
  owner: string,
  team: string,
  environment: enum[dev, staging, prod],
  spec: object (OpenAPI JSON),
  canonical: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Endpoint Schema:**
```
{
  id: string,
  apiId: string,
  path: string,
  method: enum[GET, POST, PUT, DELETE, PATCH],
  embedding: vector (768 dimensions),
  consumers: array[endpointId],
  subscribers: array[userId],
  deprecated: boolean
}
```

**Change Schema:**
```
{
  id: string,
  apiId: string,
  version: string,
  severity: enum[breaking, potentially_breaking, non_breaking],
  changes: array[{
    type: string,
    endpoint: string,
    description: string
  }],
  affectedConsumers: array[endpointId],
  notifiedAt: timestamp
}
```

### Error Handling

- Standard HTTP status codes
- Structured error responses:
  ```json
  {
    "error": {
      "code": "INVALID_SPEC",
      "message": "OpenAPI spec validation failed",
      "details": [...validation errors]
    }
  }
  ```
- Error codes: `INVALID_SPEC`, `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMIT_EXCEEDED`

### Rate Limiting

- Webhook ingestion: 100 requests/hour per API key (prevents spam)
- Search API: 1000 requests/hour per user (generous for developers)
- No rate limit on read endpoints for MVP (add if abused)

### Performance Requirements

- Search latency: <1s for 10k+ routes
- Webhook ingestion: <5s to acknowledge (async processing)
- Embedding generation: <30s per spec upload (background job)
- Change detection: <10s per spec comparison

---

## Frontend Architecture (Next.js/React)

### Core Pages & User Flows

1. **Search & Discovery Interface**
   - Homepage: Semantic search bar (hero element)
   - Search results: List of matching endpoints with relevance scores
   - Related endpoints sidebar: "See similar APIs"
   - Endpoint detail view: Full schema, consumers, breaking changes

2. **API Catalog Browser**
   - List view: All APIs with filters (team, environment, canonical)
   - API detail page: All endpoints, version history, owner info
   - Subscription controls: "Follow this API for updates"

3. **Breaking Change Dashboard**
   - Feed of recent breaking changes
   - Filtered by user subscriptions
   - Acknowledge/dismiss notifications
   - Impact analysis: "X endpoints affected"

4. **Governance Dashboard (Phase 2)**
   - Visual landscape clustering (HDBSCAN + UMAP viz)
   - Duplication detection heatmap
   - Risk flags for out-of-date consumers
   - Team ownership mapping

### Key UI Interactions

- **Instant search:** Debounced search with live results (React Query)
- **Endpoint comparison:** Side-by-side schema view for related endpoints
- **Subscription toggle:** One-click follow/unfollow APIs
- **Breaking change alerts:** Toast notifications for subscribed APIs
- **Copy-paste friendly:** API keys, curl commands, endpoint URLs

### User Experience Principles

- **Speed above all:** Search must feel instant (<1s perceived latency)
- **Developer-first:** Code-friendly (syntax highlighting, copy buttons)
- **Minimal friction:** No login required for catalog browsing (MVP)
- **Information density:** Developers want details, not marketing fluff
- **Dark mode support:** Developer preference

---

## Functional Requirements

Requirements organized by capability area. Each requirement connects to the core value proposition: effortless API discovery, proactive change management, and governance without gatekeeping.

### 1. API Ingestion & Cataloging

**FR-1.1: Webhook-Based Spec Upload**
- System SHALL accept OpenAPI specs via `POST /api/v1/specs/openapi?version={version}`
- `version` query parameter (default: 3.1, supported: 3.0, 3.1)
- Authentication via Bearer token (API key)
- Validation of spec format before ingestion
- **Processing model:**
  - Small specs (<100 endpoints): Sync processing, return 200 with results in 2-5s
  - Large specs (100+ endpoints): Return 202 Accepted with job ID, async processing
  - `POST /api/v1/specs/batch` for parallel batch uploads
- $refs resolution before processing

**FR-1.2: Multi-Environment Support**
- System SHALL track API specs across environments (dev, staging, prod)
- Each environment version stored independently
- Clear indication of which version is deployed where

**FR-1.3: Version History**
- System SHALL maintain complete version history per API
- Store previous specs for change comparison
- Allow browsing historical versions
- Track upload timestamp and uploader

**FR-1.4: Spec Validation**
- System SHALL validate OpenAPI spec structure before acceptance
- Reject malformed specs with structured error messages
- Support OpenAPI 3.0.x and 3.1.x
- Future: Support gRPC protobuf and GraphQL schema formats

**Acceptance Criteria:**
- Developer adds one curl command to CI/CD pipeline
- Spec uploaded and acknowledged within 5 seconds (small specs) or accepted with job ID (large specs)
- Invalid specs rejected with actionable error messages
- 100% of valid specs successfully ingested

### 2. Semantic Discovery

**FR-2.1: Semantic Search**
- System SHALL generate embeddings from route + method + schema
- Search by concept/synonym, not just exact keywords
- Return relevance-ranked results
- Example: "customer email" finds `userEmail`, `contactEmail`, `primaryEmail`
- Target search latency: <1s for 10k+ routes (achieved via pgvector with HNSW indexing)

**FR-2.2: Dual-Embedding Strategy for Semantic Similarity**

System SHALL generate **two embeddings per endpoint (path/method)** to enable both domain object similarity and full API similarity:

**Embedding 1: Domain Object Embedding (Request + Response Schemas)**
- Contains flattened request body schema AND response body schema
- Schema flattening format: `attr.attrlevel2[]` including:
  - Nested attributes with dot notation
  - Arrays indicated with `[]`
  - `anyOf`, `allOf`, `oneOf` structures included
  - Recursive flattening of nested objects
- **Pre-processing:**
  - Resolve all `$refs` before flattening
  - Validate schemas before flattening
  - Flatten to string representation
- **Purpose:** Find endpoints that work with similar domain objects (e.g., all endpoints returning user profiles, regardless of path/method naming)

**Embedding 2: Full Endpoint Embedding (Complete API Signature)**
- Contains path + method + headers + parameters + request schema + response schema
- JSON structure including all OpenAPI metadata
- **Purpose:** Find endpoints with similar overall API contracts (naming, parameters, complete signature)

**Similarity Search Strategy:**
- Primary search uses both embeddings with weighted scoring
- "Related Endpoints" feature uses domain object embedding to surface functionally similar APIs
- Prevents duplicate builds by finding existing APIs serving similar domain objects

**Example:**
```
Domain Object Embedding:
"user.id user.email user.name user.profile.avatar user.profile.bio[]"

Full Endpoint Embedding:
"GET /api/v1/users/{id} Authorization:Bearer response:user.id user.email..."
```

**Acceptance Criteria:**
- Domain object embedding identifies duplicate user profile endpoints across different path naming
- Full endpoint embedding finds similar API signatures
- Combined scoring prevents false positives

**FR-2.3: Catalog Browsing**
- System SHALL provide filterable API list view
- Filter by: team, environment, owner
- Sort by: name, last updated, subscriber count
- Pagination for large catalogs (1000+ APIs)

**FR-2.4: Endpoint Detail View**
- System SHALL display full endpoint details:
  - Path, method, request/response schemas
  - Owner and team information
  - List of consuming endpoints (dependencies)
  - Breaking change history
  - Endpoint subscription count

**Acceptance Criteria:**
- >80% search success rate on first query
- Related endpoints surface duplicates before they're built
- Developers find APIs in <5 minutes vs. days/weeks previously

### 3. Dependency Tracking

**FR-3.1: Endpoint Subscription Model**
- System SHALL support endpoint subscriptions (production dependencies: ServiceA → ServiceB)
- Granular tracking at endpoint-path-method level
- Subscription via API
- Person subscriptions deferred to Phase 2 (requires auth system)

**FR-3.2: Dependency Graph**
- System SHALL maintain graph of endpoint dependencies
- Track which services consume which endpoints
- Visualize dependency chains
- Calculate impact radius for breaking changes

**FR-3.3: Consumer Visibility**
- System SHALL display all consuming endpoints (endpoint subscribers)
- Show endpoint subscriber count
- Identify critical vs. low-usage endpoints
- Enable API owners to understand adoption

**Acceptance Criteria:**
- Services can register endpoint dependencies via API
- API owners see complete list of consuming endpoints
- Breaking change impact analysis shows "X consumers affected"

### 4. Breaking Change Detection & Notification

**FR-4.1: Automatic Change Detection**
- System SHALL compare new spec vs. previous spec on upload
- **Evaluate multiple libraries:**
  - `@pb33f/openapi-changes` (primary candidate)
  - Research alternatives: `openapi-diff`, `oasdiff`, custom implementation
  - Selection criteria: accuracy, change classification granularity, performance
- Classify changes as RED (breaking), YELLOW (potentially breaking), GREEN (non-breaking)
- Detection completes within 10 seconds of upload

**FR-4.2: Breaking Change Classification**
- **RED (Breaking):**
  - Removed endpoints
  - Removed required fields
  - Changed field types
  - Stricter validation rules
- **YELLOW (Potentially Breaking):**
  - Behavioral changes
  - Rate limit changes
  - New required headers
- **GREEN (Non-breaking):**
  - New endpoints
  - New optional fields
  - Documentation updates

**FR-4.3: Impact Analysis**
- System SHALL identify affected consumers for each breaking change
- Display count: "23 endpoints affected"
- List specific consuming services/endpoints
- Calculate risk score based on environment (prod > staging > dev)

**FR-4.4: Breaking Change Notifications**
- System SHALL send notifications to email of the owner of the service that depends on the breaking changed API
- Notification channels: email (owner of dependent service)
- Include change details, affected endpoints, and API owner contact
- In-app notifications and consumer acknowledgement deferred to Phase 2 (requires user auth system)
- Notifications sent within 1 hour of breaking change detection

**FR-4.5: Risk Flagging**
- System SHALL mark consumers as "RISK" if they don't update after breaking changes
- Non-blocking: teams manage their own timeline
- Governance dashboard shows risk overview
- Risk flag cleared manually

**Acceptance Criteria:**
- 100% of breaking changes automatically detected
- Email notifications delivered within 1 hour to dependent service owners
- Zero production incidents from surprise breaking changes
- Governance team has visibility into at-risk consumers

### 5. Governance & Curation

**FR-5.1: Canonical Source Marking (Phase 2)**
- Deferred to Phase 2 (requires user role/auth system)
- System SHALL allow marking APIs as "canonical" when auth is implemented
- Visual badge in search results and catalog
- Only API owners or governance admins can set canonical status

**FR-5.2: Team Ownership**
- System SHALL track team ownership per API
- Display owner contact information
- Enable "contact API owner" workflow
- Team-based access control (Phase 2)

**FR-5.3: Landscape Visibility (Phase 2)**
- System SHALL generate visual clustering of API landscape
- Use HDBSCAN + UMAP for dimension reduction
- Identify duplication hotspots (tight clusters)
- Show domain overlapping across teams
- Enable governance team to coordinate consolidation

**FR-5.4: Deprecation Management**
- System SHALL support marking endpoints as deprecated
- Show deprecation warnings in search results
- Track migration timeline
- Notify consumers of deprecation

**Acceptance Criteria:**
- Governance team can mark canonical sources (Phase 2)
- Duplicate APIs identified through clustering (Phase 2)
- Deprecated APIs clearly flagged to prevent new dependencies

### 6. User Management & Authentication

**FR-6.1: API Key Management (MVP)**
- System SHALL issue API keys for webhook ingestion
- Support key rotation
- Revocation capability
- Rate limiting per key

**FR-6.2: User Authentication (Phase 2)**
- System SHALL support SSO via OAuth 2.0 / SAML
- Integration with enterprise identity providers
- Session management
- No login required for read-only catalog access (MVP)

**FR-6.3: Role-Based Access Control (Phase 2)**
- System SHALL enforce RBAC:
  - Viewer: Read-only
  - Developer: Subscribe, acknowledge changes
  - API Owner: Upload specs, mark canonical
  - Governance Admin: Full landscape access
- Namespace-based visibility (team boundaries)

**Acceptance Criteria:**
- API key generation and management workflow
- SSO integration for enterprise adoption (Phase 2)
- Permission model prevents unauthorized actions (Phase 2)

---

## Non-Functional Requirements

### Performance

**NFR-P1: Search Response Time**
- Semantic search queries SHALL return results in <1 second for catalogs up to 10,000 routes
- <2 seconds for catalogs up to 100,000 routes
- 95th percentile latency <1.5s
- Achieved via pgvector with HNSW indexing

**NFR-P2: Webhook Ingestion Throughput**
- System SHALL handle 100 concurrent spec uploads
- Small specs (<100 endpoints): Process synchronously in 2-5s
- Large specs (>100 endpoints): Accept and queue in <500ms
- No data loss during concurrent uploads

**NFR-P3: Embedding Generation**
- Background embedding generation SHALL complete within 30 seconds per spec
- Queue processing SHALL handle backlog of 1000+ specs
- Failed embeddings SHALL retry with exponential backoff

**NFR-P4: Breaking Change Detection**
- Spec comparison SHALL complete within 10 seconds
- Support concurrent change detection for multiple API updates
- Notification dispatch within 1 hour of detection

### Scalability

**NFR-S1: Catalog Size**
- System SHALL support catalogs of 1,000+ APIs
- 100,000+ individual endpoints (routes)
- 1M+ vector embeddings (2 per endpoint)
- Performance SHALL NOT degrade below thresholds with catalog growth

**NFR-S2: Concurrent Users**
- System SHALL support 500 concurrent read operations (search, browse)
- 100 concurrent write operations (spec uploads)
- Horizontal scaling capability for frontend and backend

**NFR-S3: Data Retention**
- System SHALL retain complete version history (minimum 2 years)
- Spec storage SHALL scale to TB-level datasets
- Historical spec retrieval <5s

### Security

**NFR-SEC1: API Key Security**
- API keys SHALL be cryptographically strong (256-bit minimum)
- Keys stored as salted hashes (bcrypt or Argon2)
- Support key rotation without service disruption
- Rate limiting per key to prevent abuse

**NFR-SEC2: Input Validation**
- ALL API inputs SHALL be validated before processing
- OpenAPI spec validation to prevent injection attacks
- Request size limits (max 10MB per spec upload)
- Sanitize all user-provided metadata (team names, owner emails)

**NFR-SEC3: Data Protection**
- HTTPS/TLS 1.3 for all API communication
- Database encryption at rest
- Secrets (API keys, SMTP credentials) stored in secure vault
- No logging of sensitive data (API keys, auth tokens)

**NFR-SEC4: Dependency Security**
- Regular security audits of npm dependencies
- Automated vulnerability scanning in CI/CD
- Patch critical vulnerabilities within 48 hours

### Reliability

**NFR-R1: Availability**
- System SHALL target 99.5% uptime (MVP self-hosted)
- Graceful degradation: Search works even if embedding generation is delayed
- Health check endpoints for monitoring

**NFR-R2: Data Integrity**
- Zero data loss on spec uploads (durability guarantee)
- Atomic transactions for spec ingestion + version history
- Database backups every 24 hours with point-in-time recovery

**NFR-R3: Error Handling**
- All errors SHALL return structured error responses with actionable messages
- Failed background jobs (embeddings, notifications) SHALL retry with exponential backoff
- Dead letter queue for permanently failed jobs
- Monitoring alerts for repeated failures

### Observability

**NFR-O1: Logging**
- Structured JSON logs for all API requests
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs for request tracing
- No PII or sensitive data in logs

**NFR-O2: Metrics**
- Real-time metrics for:
  - Search latency (p50, p95, p99)
  - Webhook ingestion rate and latency
  - Embedding generation queue depth
  - Breaking change detection count
  - Error rates by endpoint
- Metrics exposed via Prometheus-compatible endpoint

**NFR-O3: Monitoring & Alerting**
- Health check endpoint: `GET /health`
- Alert on:
  - Search latency >2s (p95)
  - Webhook ingestion failures >5% error rate
  - Embedding queue depth >1000
  - Database connection failures
- Integration with standard monitoring tools (Grafana, Datadog, etc.)

### Integration

**NFR-I1: CI/CD Platform Agnostic**
- Webhook API SHALL work with any CI/CD system
- No platform-specific integrations required for MVP
- Simple curl command integration
- Example workflows provided for: GitHub Actions, GitLab CI, Jenkins

**NFR-I2: Email Notifications**
- SMTP integration for breaking change notifications
- Support standard SMTP providers (SendGrid, Mailgun, AWS SES)
- Email templates customizable per installation
- Delivery tracking and retry logic

**NFR-I3: Deployment Flexibility**
- Docker containers for easy deployment
- Docker Compose for local dev and simple deployments
- Support for Kubernetes deployments (helm charts)
- Environment variable-based configuration

### Maintainability

**NFR-M1: Code Quality**
- TypeScript for both frontend and backend (type safety)
- ESLint + Prettier for code consistency
- Unit test coverage >80%
- Integration test coverage for critical paths

**NFR-M2: Documentation**
- API documentation via OpenAPI spec (Perrache documents itself!)
- README with quick start guide
- Architecture decision records (ADRs)
- Deployment guides

**NFR-M3: Upgrade Path**
- Database migrations via automated migration tool
- Backward-compatible API changes
- Version compatibility matrix
- Upgrade testing in CI/CD

---

## Implementation Planning

### Epic Breakdown Required

This PRD defines the complete requirements for Perrache. The next step is to decompose these requirements into implementable epics and bite-sized stories optimized for 200k context dev agents.

**Recommended approach:**
1. Run `workflow create-epics-and-stories` to break down requirements into development-ready work items
2. Architecture workflow will define technical decisions and system design
3. Stories will be sequenced for iterative delivery of MVP features

---

## References

- **Product Brief:** docs/product-brief-perrache-2025-11-08.md
- **Brainstorming Session:** docs/bmm-brainstorming-session-2025-11-08.md
- **Market Research:** Embedded in Product Brief (competitive landscape, market size)

---

## Next Steps

### Immediate Next Steps (Planning Phase)

1. **Architecture Design** - Run: `/bmad:bmm:workflows:create-architecture` (Architect agent)
   - Technical architecture for Fastify backend + Next.js frontend
   - Database schema (PostgreSQL + pgvector)
   - Embedding generation pipeline architecture
   - Breaking change detection system design
   - Deployment architecture (Docker, Kubernetes)

2. **Epic & Story Breakdown** - Run: `/bmad:bmm:workflows:create-epics-and-stories` (PM agent)
   - Decompose functional requirements into epics
   - Create bite-sized stories for implementation
   - Prioritize for MVP delivery
   - Define acceptance criteria per story

3. **UX Design** (Optional) - Run: `/bmad:bmm:workflows:create-design` (UX Designer agent)
   - Search interface mockups
   - Catalog browsing experience
   - Breaking change dashboard
   - Developer-first design patterns

### After Planning (Implementation Phase)

4. **Sprint Planning** - Run: `/bmad:bmm:workflows:sprint-planning` (Scrum Master agent)
   - Create sprint plan from stories
   - Sequence work for iterative delivery
   - Track progress through implementation

5. **Development** - Run: `/bmad:bmm:workflows:dev-story` (Developer agent)
   - Implement stories one by one
   - Follow test-driven development
   - Validate against acceptance criteria

---

## Product Magic Summary

**The essence of Perrache:** The first time a developer or tech lead searches for an API and finds it instantly without asking anyone - breaking the cycle of interruptions, preventing duplicate builds, and transforming API discovery from painful manual searching into effortless self-service through automated ingestion, semantic intelligence, and proactive change management.

---

_This PRD was created through collaborative discovery between Brainrepo (Product Owner) and John (AI Product Manager)._

_Date: 2025-11-08 | Version: 1.0_
