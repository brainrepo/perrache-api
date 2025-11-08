# Product Brief: perrache

**Date:** 2025-11-08
**Author:** Brainrepo
**Context:** Open Source Enterprise Platform

---

## Executive Summary

**Perrache** is an open source enterprise API catalog platform designed to solve the API discovery crisis in large organizations with fragmented API landscapes (200+ internal APIs).

**The Vision:** Enable enterprises to adopt an "API Platform Mindset" by making API discovery effortless through automation, semantic search, and intelligent governance - preventing the catastrophic costs of duplicate services and developer time waste.

**Primary Driver:** Organizational impact - eliminating the frustration API designers and developers experience daily when navigating fragmented API ecosystems.

**Philosophy:** Keep technology simple and practical. Use AI only where it delivers clear value (semantic embeddings for discovery). No unnecessary complexity.

**Distribution:** Open source product to maximize enterprise adoption and community contribution.

---

## Core Vision

### Problem Statement

**The Core Problem:**
In enterprises with 200+ internal APIs, developers and API designers cannot effectively discover what APIs exist, what they do, or how they relate to each other. This leads to catastrophic organizational waste.

**The Pain, Experienced Firsthand:**

Two real incidents that crystalize the problem:

1. **Duplicate Development Waste**
   - Spent weeks building a service
   - Discovered a more complete implementation already existed
   - Had to drop the entire implementation - **weeks of engineering time wasted**
   - Someone else had already solved the problem, but discovery failed

2. **The 2-Week Search**
   - Needed an existing API for a critical feature
   - Spent **2 weeks searching** before finding it
   - The API existed the whole time but was named differently
   - No semantic search capability - stuck with exact keyword matching

**The Multiplier Effect:**
- Every developer wastes hours/weeks on failed discovery
- Tech leads interrupted constantly with "where's the API for X?"
- Teams build duplicate services because they can't find existing ones
- API owners see their well-designed APIs go unused
- Organizations accumulate technical debt through accidental fragmentation

**Root Cause:**
Modern frameworks (FastAPI, Fastify, NestJS) auto-generate OpenAPI specs, but there's no automation to centralize them. The "last mile" gap between framework-generated specs and a searchable catalog remains manual - and teams won't do manual work.

### Problem Impact

**Organizational Costs:**
- **Developer Time Waste:** Hours to weeks per search, multiplied across hundreds of developers
- **Duplicate Services:** Teams build what already exists - months of wasted engineering effort
- **Tech Lead Overhead:** Constant interruptions answering "where's the API?" questions
- **Technical Debt:** Fragmented domain ownership, inconsistent implementations
- **Opportunity Cost:** Engineering capacity wasted on discovery instead of building value

**Cultural Impact:**
Enterprises lack "API Platform Mindset" - internal APIs treated as implementation details, not strategic platforms requiring investment and governance.

### Why Existing Solutions Fall Short

**Swagger UI / OpenAPI Tooling:**
- Lives in each service's repo - no centralized view of API landscape
- No semantic search - can't find APIs by concept/synonym
- No dependency tracking - can't see who consumes what
- No breaking change detection across versions

**Postman / Insomnia:**
- Manual collection management - requires data entry
- No automatic ingestion from CI/CD
- Focused on testing, not discovery at scale
- No semantic relationship discovery

**Confluence / Internal Wikis:**
- Documentation rots immediately - not tied to actual deployments
- No automated updates when APIs change
- Search is keyword-based, not semantic
- No version tracking or breaking change alerts

**Backstage (Spotify):**
- Requires extensive manual catalog entry
- Complex setup and maintenance burden
- Not focused specifically on API discovery problem
- Doesn't solve semantic search or automatic ingestion

**The Gap:**
No tool bridges the "last mile" - from framework-generated OpenAPI specs to an automatically-maintained, semantically-searchable catalog with dependency tracking and breaking change management.

### Proposed Solution

**Perrache** is an open source enterprise API catalog platform that solves the discovery crisis through **integrated automation** - combining discovery, governance, and change management in a single cohesive tool.

**How It Works:**

**1. Automatic Ingestion (Zero Manual Effort)**
- Webhook API endpoint receives OpenAPI specs from CI/CD pipelines
- Teams add one line to their deployment: `POST` spec to Perrache
- Platform-agnostic: works with GitHub Actions, GitLab CI, Jenkins, any CI/CD
- Multi-format ready: OpenAPI (MVP), future support for gRPC protos, GraphQL schemas

**2. Semantic Discovery Engine**
- Generate embeddings from route + method + schema
- Search by concept, not exact keywords
  - Search "customer email" → finds `userEmail`, `contactEmail`, `primaryEmail`
- Semantic relationship discovery: "Show me all endpoints that return similar user data"
- Prevents duplicate builds by surfacing what already exists

**3. Dependency Tracking & Impact Analysis**
- Two-tier subscription model:
  - **Person subscribers:** Follow APIs for updates
  - **Endpoint subscribers:** Track production dependencies (ServiceA → ServiceB)
- Granular tracking at endpoint-path-method level
- Answer critical question: "Who will be affected by this breaking change?"

**4. Automatic Breaking Change Detection**
- Compare new vs previous OpenAPI spec on upload
- Classify changes:
  - **RED (Breaking):** Removed endpoints, removed fields, type changes
  - **YELLOW (Potentially Breaking):** Behavioral changes, rate limits
  - **GREEN (Non-breaking):** New endpoints, optional fields
- Show impact: "23 consumers affected by this change"
- In-app + email notifications

**5. Risk-Based Governance (Not Blocking)**
- Mark consumers as "RISK" if they don't update after breaking changes
- Visibility without enforcement - teams manage their own timeline
- Environment tracking: which spec version is in dev/staging/prod

**6. API Landscape Visualization & Domain Governance**
- Visual clustering of the entire API landscape using HDBSCAN clustering on UMAP dimension-reduced embeddings
- Interactive visualization reveals:
  - **Domain overlap:** Identify APIs serving similar purposes across teams
  - **Duplication hotspots:** Tight clusters indicate duplicate or near-duplicate APIs
  - **Domain boundaries:** See which teams own which capability areas
  - **Fragmentation patterns:** Spot areas where consolidation is needed
- Trigger deduplication workflows: Contact teams building overlapping capabilities
- Monitor landscape evolution: Track how domains expand, merge, or diverge over time
- Governance dashboard for platform teams to manage API ecosystem health
- Enables data-driven consolidation decisions and strategic domain ownership

**7. Total Cost of Reuse Decision Framework (Nice-to-Have)**
- Built-in TCR calculator for governance teams to evaluate reuse vs. build-new decisions
- Quantifies hidden costs: Initial Savings vs. Long-Term Costs (governance overhead, coupling/agility costs, performance bloat)
- Interactive scorecard system:
  - **Volatility Score (1-5):** How likely is the business domain to change?
  - **Consumer Divergence Score (1-5):** How different are consumer needs?
  - **Number of Consumers:** How many teams will use this API?
- Data-driven decision rules: High volatility or divergence → build separate APIs instead of forcing reuse
- Prevents creating high-maintenance shared APIs that burden all consumers with features they don't need
- **Why valuable:** Governance teams gain analytical rigor to distinguish beneficial reuse from costly forced sharing

**The "Magic Moment":**
Developer searches "user profile data" →
- Perrache shows 3 semantically-related endpoints across different services
- Displays which is canonical (marked by platform owner)
- Shows API owners and team contacts
- Lists 5 services that currently consume each endpoint
- Alerts: "Breaking change coming in 2 weeks"
- All without manual documentation or data entry

### Key Differentiators

**The Integration Advantage:**
Existing tools solve pieces:
- Swagger UI: documentation only
- Postman: testing focus
- Confluence: manual docs that rot
- Backstage: service catalog, not API-focused

**Perrache uniquely combines:**
1. **Discovery** (semantic search, relationship mapping)
2. **Governance** (ownership, canonical sources, risk visibility)
3. **Change Management** (breaking changes, impact analysis, notifications)

**In a single, automated platform** that requires zero manual effort.

**Technical Philosophy:**
- **Simple, not complex:** Use AI only where it delivers clear value (embeddings for semantic search)
- **Automation-first:** If it requires manual work, it will fail
- **Webhook-first:** Platform-agnostic integration via simple HTTP POST
- **Practical, not perfect:** Solve the 80% case exceptionally well

**Open Source Strategy:**
- Maximize enterprise adoption through open source distribution
- Community contribution for wider ecosystem coverage
- Transparent, auditable for security-conscious enterprises

---

## Target Users

### Primary User 1: Developers (Junior to Senior)

**Profile:**
- Works in enterprise with 200+ internal APIs
- Needs to find APIs to integrate into their features
- Overwhelmed by fragmented landscape, unclear naming conventions
- Wastes hours to weeks searching for the right endpoint

**Current Frustrations:**
- Can't search by concept/synonym - stuck with exact keywords
- No way to know if an API exists for their use case
- Fears using wrong API or missing a better option
- Gets blocked, has to interrupt tech leads constantly
- Worst case: builds duplicate service because discovery failed

**What They Need from Perrache:**
- Semantic search: "Find me user profile endpoints" (regardless of naming)
- Related endpoint discovery: "Show me all APIs that return similar data"
- Clear ownership info: "Who do I contact about this API?"
- Breaking change alerts: "Will this endpoint change soon?"
- Confidence they've found the right solution

### Primary User 2: API Owners / Tech Leads

**Profile:**
- Owns well-designed APIs that should be reused
- Wants their APIs to be discovered and adopted
- Frustrated by constant interruptions answering basic questions
- Needs to communicate breaking changes to consumers

**Current Frustrations:**
- APIs go undiscovered - teams build duplicates instead
- Slack bombardment: "Where's the API for X?"
- No visibility into who's using their APIs
- Breaking changes surprise consumers
- Can't measure adoption or impact

**What They Need from Perrache:**
- Self-service discoverability: Let docs answer basic questions
- Usage visibility: "Who's consuming my endpoints?"
- Impact analysis: "Who will break if I change this?"
- Proactive communication: Notify consumers of breaking changes
- Recognition for building reusable APIs

### Primary User 3: API Governance Team (Champion/Decision Maker)

**Profile:**
- Platform/Architecture team responsible for API landscape health
- Has organizational authority to mandate standards and consolidation
- Needs enterprise-wide visibility to manage API ecosystem
- Frustrated by fragmentation they can't see or measure

**Current Frustrations:**
- No visibility into the full API landscape
- Can't identify duplicate APIs across teams
- Domain overlaps unknown until conflicts arise
- No tooling to enforce governance decisions
- Reactive fire-fighting instead of proactive management

**What They Need from Perrache:**
- **Landscape visibility:** See all APIs in the organization
- **Duplication detection:** Identify semantically similar APIs that should be consolidated
- **Domain mapping:** Understand which teams own which capability areas
- **Governance controls:** Mark canonical sources, deprecate duplicates
- **Team coordination:** Contact teams building duplicate capabilities
- **Phase 2: Visual landscape clustering** (HDBSCAN + UMAP) to see duplication and domain overlapping at a glance

**Why They're the Champion:**
- Have budget/authority to adopt platform-wide tools
- Responsible for API platform strategy
- Can mandate Perrache adoption across teams
- Benefit most from preventing duplicate builds and enforcing standards

### Secondary Users

**Platform/DevOps Engineers:**
- Install and maintain Perrache infrastructure
- Need simple deployment, minimal operational overhead
- Care about scalability (1000+ APIs, 100k+ routes)

**Solution Architects:**
- Design systems that integrate multiple APIs
- Need landscape-level view to make integration decisions
- Want to understand API relationships and dependencies

**Engineering Managers:**
- Care about team productivity and duplicate work prevention
- Need metrics: time saved, duplicates avoided, adoption rates
- Justify platform investment with ROI data

---

## Success Metrics

**As an open source project, Perrache's success is measured by adoption, impact, and community growth.**

### Adoption Metrics

**Enterprise Installations:**
- Target: 50 enterprise installations in Year 1
- Target: 200 enterprise installations by Year 2
- Geographic distribution: NA, EU, APAC adoption

**Platform Coverage:**
- % of APIs in adopting organizations cataloged in Perrache
- Target: 80%+ coverage within 6 months of enterprise adoption

**User Engagement:**
- Monthly active users per installation
- Search queries per day
- Breaking change notifications delivered

### Impact Metrics

**Duplicate Prevention:**
- Number of duplicate APIs identified and flagged for consolidation
- Duplicate service builds prevented (estimated engineering months saved)
- Target: Prevent 10+ duplicate builds per enterprise per year

**Time Savings:**
- API discovery time: from days/weeks → minutes
- Reduction in "where's the API?" support interruptions
- Estimated developer hours saved per month
- Target: 100+ hours saved per enterprise per month

**Breaking Change Management:**
- % of breaking changes caught automatically
- Number of consumers notified proactively
- Incidents prevented through early warning

**Governance Effectiveness:**
- Duplicate APIs consolidated
- Canonical sources marked and adopted
- Domain ownership clarity improved

### Community Metrics

**Open Source Health:**
- GitHub stars: Target 1k+ in Year 1, 5k+ in Year 2
- Active contributors: Target 20+ regular contributors
- Community PRs merged per month
- Issue resolution time

**Ecosystem Growth:**
- CI/CD integrations built by community
- Additional API format support (gRPC, GraphQL) contributed
- Embedding model improvements from community
- Plugin ecosystem (authentication providers, notification channels)

**Documentation & Support:**
- Community forum engagement
- Discord/Slack community size and activity
- Tutorial contributions
- Conference talks and blog posts

### North Star Metric

**"Duplicate Services Prevented"** - The ultimate measure of organizational impact. Every duplicate service prevented represents:
- Weeks of wasted engineering effort avoided
- Technical debt not accumulated
- Domain fragmentation prevented
- Engineering capacity redirected to value creation

---

## MVP Scope

### Core MVP Features (Phase 1)

**Priority: Build these first to validate core value proposition**

**1. CI/CD Integration - Webhook First**
- Webhook API endpoint: `POST /api/v1/specs/openapi`
- API key authentication (Bearer token)
- Platform-agnostic - works with any CI/CD system
- Multi-format ready architecture (OpenAPI MVP, future gRPC/GraphQL)
- Automatic spec ingestion on deployment
- **Why MVP:** Solves the root cause - makes aggregation effortless

**2. Semantic Relationship Discovery**
- Generate embeddings from route + method + schema
- Semantic search by concept/synonym
- "Related Endpoints" view showing semantically similar routes across all APIs
- Prevents duplicate builds by surfacing what exists
- **Why MVP:** Core differentiator - what existing tools can't do

**3. Two-Tier Subscription Model**
- Person subscribers: Follow APIs for updates
- Endpoint subscribers: Track production dependencies (ServiceA → ServiceB)
- Granular tracking at endpoint-path-method level
- Enables impact analysis
- **Why MVP:** Critical for breaking change management

**4. Automatic Breaking Change Detection**
- Compare new vs previous OpenAPI spec on upload
- Classify: RED (breaking), YELLOW (potentially breaking), GREEN (non-breaking)
- Impact preview: "X consumers affected"
- In-app + email notifications
- Leverages existing library: `@pb33f/openapi-changes`
- **Why MVP:** Proactive change management prevents chaos

**5. Risk-Based Governance**
- Mark consumers as "RISK" if they don't update after breaking changes
- Visibility without enforcement
- Teams manage their own timeline
- **Why MVP:** Adoption-friendly governance (not blocking)

**6. Environment Tracking**
- Track which spec version is in dev/staging/prod
- Helps consumers test against correct version
- Shows deployment progression
- **Why MVP:** Essential for breaking change communication

### Out of Scope for MVP

**Access Control (Deprioritized to Phase 2)**
- Team/role groups with namespace-based visibility
- API visibility restrictions
- **Why deferred:** Launch with open access to validate core value first, add security layer after adoption proven

**User Authentication**
- MVP ships with simple API key auth for webhook ingestion
- Full user auth/SSO integration in Phase 2

**Advanced Search Features**
- Filtering by tags, domains, teams
- Saved searches
- Search history

### MVP Success Criteria

**Technical:**
- Successfully ingest and index 100+ OpenAPI specs
- Semantic search returns relevant results with >80% accuracy
- Breaking change detection catches all critical changes
- System handles 10k+ API routes with <1s search latency

**User Adoption:**
- 3-5 pilot enterprises using Perrache
- 80%+ of APIs in pilot orgs cataloged
- Positive feedback on semantic search quality
- At least 1 duplicate service build prevented per pilot org

**Developer Experience:**
- CI/CD integration takes <15 minutes to set up
- Search discovery time: days/weeks → <5 minutes
- Breaking change notifications delivered within 1 hour of spec upload

### Future Vision (Phase 2+)

**Change Proposal with Feedback Loop (Phase 2)**
- Upload PROPOSED spec before building
- Open for comments from consumers
- Prevents conflicts before code is written
- **Requires:** Established user base, workflow UX design

**Visual Landscape Clustering (Phase 2 - Governance)**
- HDBSCAN clustering + UMAP dimension reduction
- Visualize API landscape to identify:
  - Duplicate APIs (tight clusters)
  - Domain overlapping
  - Fragmentation hotspots
- Enable governance team to contact teams building duplicates
- **Requires:** Mature dataset, advanced visualization

**Total Cost of Reuse Calculator (Phase 2 - Governance)**
- Interactive TCR decision support tool for governance teams evaluating reuse vs. build-new decisions
- Guided workflow capturing:
  - **Initial Savings:** Cost of building new vs. cost of integration/compromise
  - **Long-Term Costs:** Governance overhead, coordination burden, testing complexity, cost of delay, performance bloat
  - **Risk Scorecard:** Volatility score, consumer divergence score, number of consumers
- Real-time calculation of TCR = (Long-Term Costs) - (Initial Savings)
- Visual decision matrix: Green zone (reuse recommended) vs. Red zone (build separate)
- Historical TCR tracking: Learn from past reuse decisions to refine organizational thresholds
- Integration with API catalog: Pre-populate calculator with existing consumer counts and historical change frequency
- Export reports for architecture review boards and governance committees
- **Requires:** Established governance workflows, historical data on API evolution patterns
- **Impact:** Prevents catastrophic forced-sharing scenarios where long-term costs outweigh initial savings

**API Design Editor with Semantic Suggestions (Moonshot)**
- Built-in OpenAPI editor
- Real-time semantic suggestions for schema consistency
- Prevents fragmentation at design time
- ADR generation when rejecting suggestions

**Per-Endpoint Q&A Knowledge Base (Moonshot)**
- Stack Overflow-like Q&A attached to endpoints
- Captures tribal knowledge
- Community-driven documentation

**MCP Server for AI-Assisted API Discovery in IDE (Moonshot)**
- Model Context Protocol (MCP) server enabling AI coding assistants to query Perrache catalog directly
- Integration with Claude Code, GitHub Copilot, Cursor, and other AI-powered IDEs
- Real-time semantic API discovery during development:
  - Developer asks AI: "I need to get user profile data"
  - AI queries Perrache MCP → discovers canonical endpoint semantically
  - AI generates implementation code with correct endpoint, proper error handling, and up-to-date schema
- Surfaces breaking change warnings during code generation
- Prevents duplicate API builds by surfacing existing solutions at the moment of need
- Delivers endpoint ownership, documentation, and usage examples directly in developer workflow
- **Requires:** Mature API catalog, MCP protocol implementation, IDE integrations
- **Impact:** Eliminates context-switching between IDE and catalog, embeds discovery into natural coding flow

**Advanced Governance Features (Moonshot)**
- Landscape owner role with curation powers
- Mark canonical sources with badges
- Deprecate APIs at landscape level
- Future change proposals and deployment notifications

---

## Market Context

### Market Size & Growth

The API Catalog and Discovery Platforms market reached **USD 1.93 billion in 2024** and is experiencing strong growth at **22.1% CAGR from 2025 to 2033**, with forecasted market size of **USD 6.35 billion by 2033**. This expansion is driven by:

- Increasing need for efficient API management in microservices architectures
- Enhanced developer productivity requirements in large enterprises
- Proliferation of shadow APIs due to AI-powered development tools (GitHub Copilot, ChatGPT)
- North America dominates the market with advanced technological infrastructure and high concentration of digital-native enterprises

### Competitive Landscape

The API discovery and catalog space is fragmented across **four distinct categories**, each solving different aspects of the problem:

#### Category 1: API Gateway + Catalog Hybrids (Partial Competitors)

**Kong Konnect** (Launched Sept 2024, AWS Integration Jan 2025)
- **Primary Focus:** API gateway with runtime traffic management + unified service catalog
- **Key Features:**
  - AWS API Gateway auto-discovery (ingests REST APIs automatically)
  - Scorecards for compliance tracking (authentication, ownership, monitoring)
  - Shadow API detection through gateway integration
  - AI-ready unified catalog for M2M clients (LLMs, AI agents)
- **Overlap with Perrache:** Service catalog with auto-discovery
- **Key Difference:** Gateway-centric (requires routing traffic through Kong) vs. Perrache's catalog-only approach (zero runtime overhead)
- **Pricing:** Commercial SaaS platform
- **Weakness:** Limited to Kong-managed or AWS API Gateway APIs; no semantic search or duplication detection

**Red Hat 3scale API Management**
- **Primary Focus:** External API monetization and security gateway
- **Key Features:**
  - Full API gateway (auth, rate limiting, monetization)
  - OpenShift Service Discovery with ActiveDocs
  - Developer portal with API catalog
  - Analytics and billing integration
- **Overlap with Perrache:** API catalog and developer portal
- **Key Difference:** Built for external API programs (partners/customers) vs. Perrache's internal discovery focus
- **Pricing:** Enterprise subscription + infrastructure costs
- **Weakness:** Manual governance workflows, no semantic search, no breaking change automation, keyword-based catalog only

#### Category 2: Developer Portals + Service Catalogs (Direct Competitors)

**Backstage (Spotify) - Open Source**
- **Primary Focus:** Internal developer portal with centralized service catalog
- **Key Features:**
  - Software catalog tracking ownership and metadata for all software (services, APIs, libraries, ML models)
  - YAML-based catalog entries (metadata stored with code)
  - Software graph showing service dependencies
  - OpenAPI/AsyncAPI/GraphQL spec integration via API Docs plugin
  - 2025 enhancements: Spotify Portal (commercial plugins), Cloud Backstage (hosted), AiKA (AI assistant)
- **Overlap with Perrache:** Central API catalog, service discovery, OpenAPI support
- **Key Difference:** Broad service catalog (all software) vs. Perrache's API-specific focus with semantic intelligence
- **Pricing:** Open source framework (self-hosted) + optional Spotify Portal commercial plugins
- **Strengths:** CNCF project, massive ecosystem, proven at scale (Spotify, Traveloka with 800+ services)
- **Weaknesses:**
  - **Manual catalog entry:** Requires YAML files written/maintained per service
  - **No semantic search:** Keyword-based discovery only
  - **No automatic breaking change detection:** No spec comparison or consumer impact analysis
  - **No dependency tracking at endpoint level:** Tracks service-to-service, not endpoint-to-endpoint
  - **High implementation burden:** Complex setup, requires dedicated platform team
  - **No duplication detection:** No clustering/visualization to identify duplicate APIs

**Postman Workspaces + Private API Network + Insights**
- **Primary Focus:** API testing, development, and collaboration platform with automatic discovery (2024-2025)
- **Key Features:**
  - Private API Network for organization-wide API visibility
  - **Postman Insights (NEW July 2025):** AI-powered automatic endpoint discovery through traffic analysis
  - Insights Agent observes traffic and auto-surfaces endpoints per service
  - Workspace-based governance with approval workflows
  - Centralized API catalog with collections
  - 82% of organizations adopted some API-first approach (2025 State of API report)
  - Error tracking, flaky endpoint detection, performance monitoring
  - Endpoints view for validation, merging, and refining discovered endpoints
- **Overlap with Perrache:** Centralized API catalog, automatic discovery, workspace collaboration
- **Key Difference:** Traffic-based discovery (runtime agent) vs. CI/CD webhook ingestion (build-time)
- **Pricing:** Freemium model with paid team/enterprise tiers (Insights free during intro period)
- **Strengths:** Massive user base, familiar developer tool, integrated testing, NEW automatic discovery
- **Weaknesses:**
  - **Traffic-based discovery requires agent deployment:** Runtime overhead vs. Perrache's zero-overhead webhook
  - **Discovery tied to observed traffic:** Only finds endpoints that receive requests vs. catalog-all approach
  - **Testing-focused, not governance-optimized:** Discovery aids testing, not duplication prevention
  - **No semantic search:** Keyword matching only, cannot find "similar" APIs across services
  - **No breaking change detection:** No automatic spec diffing or consumer impact analysis
  - **No visual landscape clustering:** Cannot identify duplicate APIs or domain overlap at ecosystem level
  - **Monitoring focus:** Error/performance tracking vs. organizational governance

**SmartBear API Hub (powered by Swagger)**
- **Primary Focus:** Enterprise API lifecycle platform with AI-driven design, test, and portal capabilities
- **Key Features:**
  - Centralized, searchable API catalog for enterprise-wide visibility
  - Modular SaaS solution: Design, Explore, Test, Portal modules
  - **HaloAI (January 2025):** AI-driven capabilities across the platform
  - Unified documentation consolidating all API specs in one portal
  - Branded, interactive developer portal for API consumers
  - Effortless exploratory testing with integrated documentation
  - Catalog sorting by document title, improved pagination
  - 2025 DEVIES Award winner for API Management & Support
- **Overlap with Perrache:** Centralized catalog, discovery portal, duplication reduction
- **Key Difference:** Design/test lifecycle tool vs. pure discovery/governance platform
- **Pricing:** Commercial SaaS (modular pricing)
- **Strengths:** Mature Swagger ecosystem, integrated design/test workflow, enterprise features
- **Weaknesses:**
  - **Manual catalog entry:** Requires uploading OpenAPI specs to SwaggerHub/API Hub
  - **Design-first workflow:** Assumes APIs are designed in SwaggerHub vs. framework-generated specs
  - **No automatic CI/CD ingestion:** No webhook endpoint for deployment-time spec pushing
  - **No semantic search:** Keyword/tag-based search only
  - **No breaking change automation:** Manual version comparison
  - **No dependency tracking:** No consumer subscription or impact analysis
  - **No landscape visualization:** No clustering or duplication detection across catalog
  - **Enterprise portal focus:** Built for external developer experience vs. internal governance

#### Category 3: API Security & Runtime Discovery Tools (Different Problem Space)

**Akto, Salt Security, Akamai (Noname), Wallarm, 42Crunch, Cloudflare**
- **Primary Focus:** API security through runtime traffic analysis and vulnerability detection
- **Key Features:**
  - Runtime API discovery through traffic monitoring
  - Shadow API detection (undocumented/unmanaged APIs)
  - Real-time vulnerability testing and anomaly detection
  - Behavioral analytics for threat detection
  - Shift-left security with OpenAPI validation
- **Overlap with Perrache:** API discovery and inventory
- **Key Difference:** Security-driven discovery (finding threats) vs. developer productivity (finding APIs to reuse)
- **Pricing:** Commercial platforms, typically $15-$375/month+
- **Why Not Competitors:**
  - Solve security problem, not discovery/governance problem
  - Discover APIs through traffic inspection, not developer intent
  - No semantic search for "what API should I use?"
  - No governance features for duplication prevention
  - Runtime overhead from traffic monitoring vs. Perrache's zero-overhead catalog

#### Category 4: Perrache's Unique Position (Blue Ocean)

**No existing solution combines:**
1. **Automated CI/CD ingestion** (webhook-first, zero manual effort)
2. **Semantic discovery** (embeddings-based search, relationship mapping)
3. **Breaking change automation** (spec diffing, impact analysis, notifications)
4. **Endpoint-level dependency tracking** (two-tier subscription model)
5. **Visual landscape clustering** (HDBSCAN + UMAP for duplication detection)
6. **Zero runtime overhead** (catalog-only, no gateway interception)
7. **Open source distribution** (maximize enterprise adoption)

### Competitive Positioning Matrix

| Solution | Auto-Ingestion | Semantic Search | Breaking Changes | Dependency Tracking | Duplication Detection | Runtime Overhead | Open Source |
|----------|----------------|-----------------|------------------|---------------------|----------------------|------------------|-------------|
| **Perrache** | ✅ Webhook (CI/CD) | ✅ Embeddings | ✅ Automated | ✅ Endpoint-level | ✅ HDBSCAN+UMAP | ❌ None | ✅ Yes |
| **Backstage** | ❌ Manual YAML | ❌ Keywords | ❌ None | ⚠️ Service-level | ❌ None | ❌ None | ✅ Yes |
| **Postman Insights** | ⚠️ Traffic agent | ❌ Keywords | ❌ None | ❌ None | ❌ None | ⚠️ Medium (agent) | ❌ No |
| **SmartBear API Hub** | ❌ Manual upload | ❌ Keywords | ❌ Manual | ❌ None | ❌ None | ❌ None | ❌ No |
| **Kong Konnect** | ⚠️ AWS/Kong only | ❌ Keywords | ❌ Manual | ❌ Gateway-level | ❌ None | ✅ High (gateway) | ❌ No |
| **3scale** | ⚠️ OpenShift only | ❌ Keywords | ❌ Manual | ❌ None | ❌ None | ✅ High (gateway) | ❌ No |
| **Security Tools** | ⚠️ Traffic-based | ❌ N/A | ❌ N/A | ❌ N/A | ❌ None | ✅ High (monitoring) | ❌ No |

### Strategic Insights

**Market Gap: The "Last Mile" Problem Remains Unsolved**

Despite a crowded market, **no tool bridges the critical gap** between framework-generated OpenAPI specs and an automatically-maintained, semantically-searchable catalog:

- **Backstage:** Requires manual YAML catalog entries (teams won't maintain them)
- **Postman Insights (NEW 2025):** Traffic-based discovery requires runtime agent deployment + only finds APIs that receive traffic (misses unused/new endpoints)
- **SmartBear API Hub:** Requires manual upload of OpenAPI specs to SwaggerHub (design-first workflow, not CI/CD integration)
- **Kong Konnect:** Auto-discovery limited to Kong/AWS ecosystems (not platform-agnostic)
- **3scale:** OpenShift Service Discovery requires manual configuration (governance "could be more efficient")
- **Security Tools:** Discover APIs through traffic, not for developer reuse

**All solutions fail on at least one critical requirement:**
- **Automation:** Manual work required (catalog entry, spec upload) → fails at scale
- **Platform-agnostic:** Locked to specific ecosystems (Kong, AWS, OpenShift) → limited adoption
- **Build-time discovery:** Traffic-based discovery misses undeployed/low-traffic APIs → incomplete catalog
- **Semantic intelligence:** Keyword search only → cannot prevent duplicate builds

**Perrache's Competitive Advantage: Integration of Capabilities**

Existing tools solve **pieces** of the problem:
- Kong/3scale: Runtime management (but heavy, gateway-dependent)
- Backstage: Service catalog (but manual, keyword-only)
- Postman: Collaboration (but testing-focused, manual maintenance)
- Security tools: Shadow API detection (but security-focused, not productivity)

**Perrache uniquely combines:**
1. Discovery (semantic search, relationship mapping)
2. Governance (duplication detection, canonical sources, risk visibility)
3. Change Management (breaking changes, impact analysis, notifications)
4. **In a single, automated, zero-overhead platform**

### Go-to-Market Positioning

**Primary Competitor by Persona:**

| Target Persona | Most Likely Incumbent | Why Perrache Wins |
|----------------|----------------------|-------------------|
| **Developers (API Consumers)** | Slack messages, asking tech leads | Semantic search finds APIs in seconds vs. days/weeks of searching |
| **API Owners** | Confluence docs, Postman collections, SmartBear API Hub | Automatic CI/CD catalog maintenance vs. manual spec upload/documentation |
| **Platform/Governance Teams** | Backstage or "nothing" | Duplication detection + zero setup burden vs. complex YAML management |
| **Enterprises with AWS** | Kong Konnect Service Catalog | Platform-agnostic + semantic search vs. AWS-locked keyword search |
| **Enterprises using Postman** | Postman Insights (traffic-based discovery) | Build-time webhook (complete catalog) vs. runtime agent (traffic-only, overhead) |
| **API Design Teams** | SmartBear API Hub, SwaggerHub | Code-first automation (framework specs) vs. design-first manual workflow |
| **Security Teams** | Akto, Salt, Noname | Proactive governance prevents duplicates vs. reactive threat detection |

**Perrache is NOT competing with:**
- API Gateways (Kong, 3scale, Apigee) - runtime traffic management
- Testing Tools (Postman core) - API development and testing workflows
- Security Tools (Akto, Salt) - runtime threat detection

**Perrache complements these tools** by solving the discovery and governance layer they don't address.

### Market Timing: AI-Accelerated Shadow APIs

**2024-2025 Market Catalyst:**

AI-powered development tools (GitHub Copilot, ChatGPT, Cursor) create APIs **faster than traditional discovery methods can catalog them**:
- Developers generate functional endpoints without traditional documentation
- Rapid API creation amplifies the shadow API problem
- Traditional manual catalog approaches cannot keep pace

**Perrache's webhook-first automation** is purpose-built for this AI-accelerated development era.

### Adoption Strategy

**Perrache's Open Source Advantage:**

- **Lower adoption barrier:** No vendor lock-in, no licensing costs
- **Community ecosystem:** Platform-agnostic CI/CD integrations contributed by users
- **Trust through transparency:** Auditable for security-conscious enterprises
- **Network effects:** As adoption grows, community contributions expand format support (gRPC, GraphQL)

**Target: 50 enterprise installations Year 1, 200 by Year 2** - feasible given open source distribution model and clear value proposition for the $1.93B+ market.

{{#if financial_considerations}}

## Financial Considerations

{{financial_considerations}}
{{/if}}

{{#if technical_preferences}}

## Technical Preferences

{{technical_preferences}}
{{/if}}

{{#if organizational_context}}

## Organizational Context

{{organizational_context}}
{{/if}}

{{#if risks_and_assumptions}}

## Risks and Assumptions

{{risks_and_assumptions}}
{{/if}}

{{#if timeline_constraints}}

## Timeline

{{timeline_constraints}}
{{/if}}

{{#if supporting_materials}}

## Supporting Materials

{{supporting_materials}}
{{/if}}

---

_This Product Brief captures the vision and requirements for perrache._

_It was created through collaborative discovery and reflects the unique needs of this {{context_type}} project._

{{#if next_workflow}}
_Next: {{next_workflow}} will transform this brief into detailed planning artifacts._
{{else}}
_Next: Use the PRD workflow to create detailed product requirements from this brief._
{{/if}}
