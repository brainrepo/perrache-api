# Sprint Change Proposal: Defer Async Processing to Moonshots

**Date:** 2025-11-19
**Author:** BMad Correct Course Workflow
**Project:** Perrache
**Change Scope:** Moderate (Backlog reorganization + PRD/Architecture updates)

---

## 1. Issue Summary

### Problem Statement

Story 2-6 (Async Processing Queue for Large Specs) has been identified as requiring deeper architecture design than anticipated and does not create sufficient value for the MVP phase. The complexity of implementing job queues, worker management, monitoring dashboards, and retry logic adds significant infrastructure overhead without delivering core discovery value.

### Context

- **When Discovered:** During sprint execution, post-implementation of Story 2-6
- **Triggering Story:** Story 2-6 (Async Processing Queue for Large Specs) - Status: Done
- **Discovery Method:** Strategic assessment of MVP scope and complexity vs. value delivery

### Evidence

1. **Infrastructure Complexity:**
   - Story 2-6 introduces: pg-boss/Sidequest.js, worker pools, job status API, dead letter queues, monitoring dashboard
   - Adds operational overhead: queue health monitoring, job retry management, worker scaling

2. **MVP Goal Alignment:**
   - Primary MVP goal: Prove semantic discovery value with 3-5 pilot enterprises
   - Async processing optimizes for scale, not core value demonstration
   - Pilot phase APIs typically have <100 endpoints per spec (sync processing sufficient)

3. **Alternative Approach:**
   - Synchronous processing adequate for MVP catalog sizes
   - Simpler architecture = faster delivery and validation
   - Can defer async complexity to moonshots phase after MVP validation

---

## 2. Impact Analysis

### Epic Impact

**Epic 2: Webhook Ingestion & Spec Management**

- **Status:** ⚠️ **AFFECTED**
- **Scope Change:** Remove async processing capability
- **Stories Affected:**
  - ❌ Story 2-6: Async Processing Queue - **DELETE**
  - ❌ Story 2-7: Batch Upload Endpoint - **DELETE** (depends on async)
  - ✏️ Story 2-3: Webhook API Endpoint - **MODIFY** (remove async logic)

**Epics 3-7: All Other Epics**

- **Status:** ✅ **NO IMPACT**
- Semantic Discovery, Dependency Tracking, Breaking Change Detection, and Frontend epics remain unchanged

### Story Impact

**Current Stories:**

- Story 2-6: Already implemented (requires rollback)
- Story 2-7: Not yet started (delete from backlog)

**Future Stories:**

- No impact on Stories 2-1, 2-2, 2-4, 2-5 (completed or in progress)
- Story 2-3 requires modification (already completed, needs simplification)

### Artifact Conflicts

#### PRD (Product Requirements Document)

**Sections Requiring Updates:**

1. **FR-1.1: Webhook-Based Spec Upload (lines 487-525)**
   - Remove async processing model
   - Simplify to synchronous-only processing
   - Remove batch upload references

2. **NFR-P2: Webhook Ingestion Throughput (lines 771-777)**
   - Adjust concurrency from 100 → 20 concurrent uploads (MVP scale)
   - Remove async processing targets
   - Document future scaling path

3. **NFR-P3: Embedding Generation (lines 779-783)**
   - Change from background/queue to synchronous processing
   - Update performance targets to <5s for up to 200 endpoints

#### Architecture Document

**Sections Requiring Updates:**

1. **Decision Summary Table (line 51)**
   - Remove pg-boss queue system decision row

2. **Project Structure (lines 99-104)**
   - Remove `apps/api/src/queue/` directory structure
   - Remove worker files

3. **API Contracts - Spec Ingestion (lines 842-852)**
   - Remove `jobId` from response schema
   - Remove `sync` query parameter
   - Simplify to single response format

4. **Performance Considerations (lines 1095-1133)**
   - Rewrite Webhook Ingestion strategy (sync-only)
   - Update Embedding Generation targets for synchronous processing

5. **ADR-006 (lines 1453-1471)**
   - Replace "pg-boss Over BullMQ" decision
   - New: "Synchronous Processing for MVP (Deferred Async to Moonshots)"

#### Epics Document

**Sections Requiring Updates:**

1. **Epic 2 Overview (line 410)**
   - Remove "async processing" from scope description

#### UI/UX Specifications

**Status:** ✅ **NO IMPACT**

- No UI/UX designs exist for job status tracking
- No frontend changes required

---

## 3. Recommended Approach

### Selected Path: Direct Adjustment via MVP Scope Reduction

**Strategy:** Hybrid of Direct Adjustment + MVP Review

**Approach:**

1. Remove Story 2-6 and 2-7 from Epic 2
2. Rollback Story 2-6 implementation (remove Sidequest.js infrastructure)
3. Simplify Story 2-3 to synchronous-only processing
4. Update PRD and Architecture documents to reflect synchronous model
5. Move async processing to "Moonshots" (post-MVP phase)

**Why This Path:**

| **Criteria**              | **Assessment**      | **Justification**                               |
| ------------------------- | ------------------- | ----------------------------------------------- |
| **Implementation Effort** | ⭐⭐⭐⭐⭐ Minimal  | Code removal and simplification                 |
| **Technical Risk**        | ⭐⭐⭐⭐⭐ Low      | Sync processing simpler and more reliable       |
| **Team Morale**           | ⭐⭐⭐⭐⭐ Positive | Clearing technical debt, focusing on core value |
| **Sustainability**        | ⭐⭐⭐⭐ Good       | Can add async in moonshots if scaling demands   |
| **Business Value**        | ⭐⭐⭐⭐⭐ High     | Faster MVP delivery, earlier validation         |

**Effort Estimate:** Low (2-3 hours for rollback + documentation updates)
**Risk Assessment:** Low (simplification reduces operational complexity)
**Timeline Impact:** Positive (accelerates MVP delivery by ~3-5 days)

---

## 4. Detailed Change Proposals

### Story Changes

#### CHANGE 1: Story 2-6 - Async Processing Queue for Large Specs

**Action:** ❌ **DELETE STORY**

**Current Status:** Done (implemented with Sidequest.js)

**Rollback Required:**

- Remove `apps/api/src/plugins/queue.ts`
- Remove `apps/api/src/queue/` directory
- Remove Sidequest.js dependencies from `package.json`
- Remove job status API routes
- Remove JOB_CONCURRENCY, JOB_TIMEOUT environment variables
- Update webhook route to remove async threshold logic

**Rationale:**

- Infrastructure complexity without MVP value
- Synchronous processing sufficient for pilot scale
- Defer to moonshots for future scaling

---

#### CHANGE 2: Story 2-7 - Batch Upload Endpoint

**Action:** ❌ **DELETE STORY**

**Current Status:** Not started

**Rationale:**

- Depends on async processing (Story 2-6)
- Not required for MVP pilot phase
- Can be added post-MVP if demand exists

---

#### CHANGE 3: Story 2-3 - Webhook API Endpoint

**Action:** ✏️ **MODIFY STORY**

**Section:** Acceptance Criteria

**OLD:**

```
**And** response returns 200 OK for small specs (<100 endpoints):

{
  "api_id": "uuid",
  "version_id": "uuid",
  "status": "processed",
  "endpoints_count": 42
}

**And** response returns 202 Accepted for large specs (≥100 endpoints):

{
  "job_id": "uuid",
  "status": "queued",
  "message": "Processing in background"
}
```

**NEW:**

```
**And** response returns 200 OK for all specs:

{
  "api_id": "uuid",
  "version_id": "uuid",
  "status": "processed",
  "endpoints_count": 42
}
```

**Rationale:**

- Single response format for all spec uploads
- Remove async threshold logic (100 endpoint check)
- Simplify API contract

---

#### CHANGE 4: Story 2-3 - Prerequisites

**Section:** Prerequisites

**OLD:**

```
**Prerequisites:** Story 1.6 (API key auth), Story 2.1 (database schema), Story 2.2 (validation service)
```

**NEW:**

```
**Prerequisites:** Story 1.6 (API key auth), Story 2.1 (database schema), Story 2.2 (validation service), Story 2.4 (endpoint extraction)
```

**Rationale:**

- Synchronous processing requires endpoint extraction before response
- Ensure proper story dependency sequencing

---

#### CHANGE 5: Story 2-3 - Technical Notes

**Section:** Technical Notes

**OLD:**

```
- Endpoint size threshold: 100 endpoints for sync vs async processing
```

**NEW:**

```
- All specs processed synchronously
- Response time target: <5s for specs with up to 200 endpoints
```

**Rationale:**

- Remove async threshold concept
- Set clear performance expectations for sync processing

---

### PRD Changes

#### CHANGE 6: FR-1.1 Webhook-Based Spec Upload

**Document:** docs/PRD.md
**Lines:** 487-525

**OLD:**

```
- **Processing model:**
  - Small specs (<100 endpoints): Sync processing, return 200 with results in 2-5s
  - Large specs (100+ endpoints): Return 202 Accepted with job ID, async processing
  - `POST /api/v1/specs/batch` for parallel batch uploads
- $refs resolution before processing
```

**NEW:**

```
- **Processing model:**
  - All specs: Synchronous processing, return 200 with results in 2-5s
  - Performance target: Handle specs up to 200 endpoints
  - $refs resolution before processing
```

**Rationale:**

- Simplify processing model to sync-only
- Remove batch upload reference
- Set realistic MVP performance targets

---

#### CHANGE 7: NFR-P2 Webhook Ingestion Throughput

**Document:** docs/PRD.md
**Lines:** 771-777

**OLD:**

```
**NFR-P2: Webhook Ingestion Throughput**

- System SHALL handle 100 concurrent spec uploads
- Small specs (<100 endpoints): Process synchronously in 2-5s
- Large specs (>100 endpoints): Accept and queue in <500ms
- No data loss during concurrent uploads
```

**NEW:**

```
**NFR-P2: Webhook Ingestion Throughput**

- System SHALL handle 20 concurrent spec uploads (sufficient for MVP pilot scale)
- All specs: Process synchronously in 2-5s
- Target: Specs up to 200 endpoints
- No data loss during concurrent uploads
- Future scaling: Async processing deferred to post-MVP phase
```

**Rationale:**

- Adjust concurrency expectations for MVP scale
- Document future scaling path
- Realistic targets for synchronous processing

---

#### CHANGE 8: NFR-P3 Embedding Generation

**Document:** docs/PRD.md
**Lines:** 779-783

**OLD:**

```
**NFR-P3: Embedding Generation**

- Background embedding generation SHALL complete within 30 seconds per spec
- Queue processing SHALL handle backlog of 1000+ specs
- Failed embeddings SHALL retry with exponential backoff
```

**NEW:**

```
**NFR-P3: Embedding Generation**

- Embedding generation SHALL complete synchronously within 5 seconds per spec (up to 200 endpoints)
- Failed embeddings SHALL return appropriate error to user
- Future: Async processing deferred to post-MVP scaling phase
```

**Rationale:**

- Change from background/queue to synchronous processing
- Remove queue-related requirements
- Set synchronous performance targets

---

### Architecture Changes

#### CHANGE 9: Decision Summary Table

**Document:** docs/architecture.md
**Lines:** 31-52

**OLD:**

```
| **Queue System** | pg-boss | Latest | Async Processing | PostgreSQL-based job queue, no extra infrastructure, decoupled actions |
```

**NEW:**

```
(DELETE THIS ROW)
```

**Rationale:**

- No queue system needed for MVP
- Defer to moonshots phase

---

#### CHANGE 10: Project Structure

**Document:** docs/architecture.md
**Lines:** 99-104

**OLD:**

```
│   │   │   ├── queue/                # pg-boss setup
│   │   │   │   ├── boss.ts
│   │   │   │   └── workers/
│   │   │   │       ├── embeddings.worker.ts
│   │   │   │       ├── change-detection.worker.ts
│   │   │   │       └── email.worker.ts
```

**NEW:**

```
(DELETE THESE LINES)
```

**Rationale:**

- No queue infrastructure in simplified architecture

---

#### CHANGE 11: API Contracts - Spec Ingestion

**Document:** docs/architecture.md
**Lines:** 842-852

**OLD:**

```
POST /api/v1/specs/openapi
Auth: Bearer token (API key)
Body: { spec: OpenAPISpec, version?: string }
Response: 201 { id, message, jobId? }

Query params:
  - version: OpenAPI version (3.0 or 3.1, default 3.1)
  - sync: boolean (force sync processing for small specs)
```

**NEW:**

```
POST /api/v1/specs/openapi
Auth: Bearer token (API key)
Body: { spec: OpenAPISpec, version?: string }
Response: 201 { id, message }

Query params:
  - version: OpenAPI version (3.0 or 3.1, default 3.1)
```

**Rationale:**

- Remove jobId from response (no async processing)
- Remove sync query parameter (all processing is sync)

---

#### CHANGE 12: Performance - Webhook Ingestion

**Document:** docs/architecture.md
**Lines:** 1095-1118

**OLD:**

```
### Webhook Ingestion (NFR-P2: 100 concurrent uploads)

**Strategy:**

1. **Sync for small specs** (<100 endpoints): Process in 2-5s, return 200
2. **Async for large specs** (100+ endpoints): Return 202 with job ID, queue processing
3. **pg-boss queue:** PostgreSQL-based, handles concurrency
4. **Batch embedding generation:** OpenAI supports batch API for cost savings

**Implementation:**

[Code example with async logic]
```

**NEW:**

````
### Webhook Ingestion (NFR-P2: 20 concurrent uploads for MVP)

**Strategy:**

1. **Synchronous processing only:** All specs processed in 2-5s, return 200
2. **Target capacity:** Specs up to 200 endpoints
3. **Connection pooling:** Optimize database connections for concurrent requests
4. **Future scaling:** Async processing deferred to post-MVP phase

**Implementation:**

```typescript
POST /api/v1/specs/openapi

// Synchronous processing for all specs
await validateSpec(spec)
await extractEndpoints(spec)
await generateEmbeddings(endpoints)
await detectBreakingChanges(apiId, spec)

return reply.status(201).send({
  id,
  message: 'Spec processed',
  endpoints_count: endpoints.length
})
````

```

**Rationale:**
- Simplify ingestion strategy to sync-only
- Remove async/queue logic
- Document future scaling path

---

#### CHANGE 13: Performance - Embedding Generation

**Document:** docs/architecture.md
**Lines:** 1120-1133

**OLD:**
```

**Performance Targets:**

- Small spec (10 endpoints, 20 embeddings): <2s
- Medium spec (50 endpoints, 100 embeddings): <5s
- Large spec (500 endpoints, 1000 embeddings): <30s (background job)

```

**NEW:**
```

**Performance Targets (MVP - Synchronous):**

- Small spec (10 endpoints, 20 embeddings): <2s
- Medium spec (50 endpoints, 100 embeddings): <5s
- Large spec (100-200 endpoints, 200-400 embeddings): <5s
- Note: Specs with >200 endpoints may exceed timeout, deferred to post-MVP async processing

```

**Rationale:**
- Update performance targets for synchronous processing
- Document capacity limits for MVP
- Note future scaling path

---

#### CHANGE 14: ADR-006 Queue Decision

**Document:** docs/architecture.md
**Lines:** 1453-1471

**OLD:**
```

### ADR-006: pg-boss Over BullMQ

**Decision:** Use pg-boss (PostgreSQL-based queue) instead of BullMQ (Redis-based)

**Context:** Need background job queue for embedding generation and change detection.

**Rationale:**

- No additional infrastructure (uses existing PostgreSQL)
- Simpler deployment (no Redis to manage)
- Sufficient for MVP workload
- Can migrate to BullMQ later if needed

**Consequences:**

- Slightly slower than Redis-based queues
- PostgreSQL load increases
- Simplicity wins for MVP

```

**NEW:**
```

### ADR-006: Synchronous Processing for MVP (Deferred Async to Moonshots)

**Decision:** Use synchronous processing for MVP, defer async queue infrastructure to post-MVP phase

**Context:** Need to process spec uploads with embedding generation and change detection.

**Rationale:**

- MVP focus is validating semantic discovery value, not scaling to massive catalogs
- Synchronous processing sufficient for pilot enterprises (most APIs <100 endpoints)
- Avoids infrastructure complexity (no queue management, workers, job status tracking)
- Faster MVP delivery by removing async overhead
- Can add async processing in moonshots phase if scaling requires it

**Consequences:**

- Limited to specs with <200 endpoints for <5s response times
- No job status tracking API
- Webhook must wait for complete processing before returning
- Simpler architecture and faster MVP delivery

```

**Rationale:**
- Update ADR to reflect synchronous-only decision
- Document rationale for deferring async to post-MVP

---

#### CHANGE 15: Epic 2 Overview

**Document:** docs/epics.md
**Lines:** 406-410

**OLD:**
```

**Scope:** Webhook API endpoint, OpenAPI spec validation, multi-environment support, version history, async processing, API key authentication

```

**NEW:**
```

**Scope:** Webhook API endpoint, OpenAPI spec validation, multi-environment support, version history, API key authentication

````

**Rationale:**
- Remove "async processing" from epic scope description

---

## 5. Implementation Handoff

### Change Scope Classification

**Scope:** **Moderate**

**Justification:**
- Requires backlog reorganization (remove 2 stories)
- Requires rollback of completed Story 2-6 implementation
- Requires updates to 3 strategic documents (PRD, Architecture, Epics)
- No impact on completed stories outside Epic 2
- All other epics proceed unchanged

### Handoff Recipients

**Primary:** Product Owner / Scrum Master

**Responsibilities:**
1. Review and approve this change proposal
2. Update Epic 2 story list (remove 2-6, 2-7)
3. Coordinate Story 2-6 rollback with development team
4. Update sprint planning to reflect simplified scope

**Secondary:** Development Team

**Responsibilities:**
1. Execute Story 2-6 rollback:
   - Remove Sidequest.js/pg-boss infrastructure
   - Simplify webhook endpoint to sync-only
   - Remove job status API routes
   - Clean up environment variables
2. Update documentation (PRD, Architecture, Epics)
3. Verify all tests pass after rollback

### Success Criteria

**Rollback Complete When:**
- ✅ Story 2-6 code removed from codebase
- ✅ Webhook endpoint returns 200 for all specs (sync processing)
- ✅ No queue-related code remains in repository
- ✅ All integration tests pass
- ✅ PRD, Architecture, and Epics documents updated

**Documentation Complete When:**
- ✅ All 15 change proposals applied to documents
- ✅ Moonshots section updated to include async processing
- ✅ ADR-006 rewritten to reflect sync decision
- ✅ Sprint backlog reflects simplified Epic 2

### Timeline

**Estimated Effort:**
- Rollback: 2-3 hours
- Documentation updates: 1-2 hours
- Testing and verification: 1 hour
- **Total:** 4-6 hours

**Proposed Schedule:**
- Day 1: Approve change proposal
- Day 1-2: Execute rollback and documentation updates
- Day 2: Test and verify
- Day 3: Resume Epic 2 with simplified scope

---

## 6. Risk Assessment

### Implementation Risks

| **Risk** | **Probability** | **Impact** | **Mitigation** |
|----------|----------------|-----------|----------------|
| Rollback introduces bugs | Low | Medium | Comprehensive test suite, careful code removal |
| Documentation inconsistency | Low | Low | Systematic review of all 15 changes |
| Confusion about async future | Low | Low | Clear moonshots documentation |

### Business Risks

| **Risk** | **Probability** | **Impact** | **Mitigation** |
|----------|----------------|-----------|----------------|
| MVP can't handle large catalogs | Low | Medium | Target 200 endpoint limit, document scaling path |
| Pilot enterprises exceed capacity | Very Low | Medium | Monitor pilot usage, can add async if needed |

**Overall Risk Level:** ✅ **LOW**

---

## 7. Benefits Summary

### Technical Benefits

1. **Simpler Architecture:** No queue infrastructure, workers, or job monitoring
2. **Faster Development:** 2 fewer stories, less code to maintain
3. **Easier Operations:** No queue health monitoring, no worker scaling
4. **Reduced Debugging:** Synchronous flow easier to trace and debug

### Business Benefits

1. **Faster MVP Delivery:** ~3-5 days acceleration
2. **Earlier Validation:** Prove semantic discovery value sooner
3. **Lower Operational Cost:** No queue infrastructure to manage
4. **Clearer Focus:** Team concentrates on core discovery features

### User Experience Benefits

1. **Immediate Feedback:** Users get results instantly (no job polling)
2. **Simpler API:** Single response format, no job status tracking
3. **Predictable Behavior:** No async delays or queue backlogs

---

## 8. Alternatives Considered

### Alternative 1: Keep Async for Large Specs Only

**Approach:** Maintain async processing but only for specs >200 endpoints

**Rejected Because:**
- Still requires full queue infrastructure
- Complexity not justified for edge case (very few specs >200 endpoints in pilots)
- Defers simplification without significant benefit

### Alternative 2: Implement Async Later in MVP

**Approach:** Complete MVP with sync, add async before pilot deployment

**Rejected Because:**
- Adds scope to MVP unnecessarily
- Pilots can validate discovery value without massive catalogs
- Better to defer until post-MVP scaling needs emerge

### Alternative 3: Use Simpler Queue (In-Memory)

**Approach:** Replace pg-boss with in-memory queue for simplicity

**Rejected Because:**
- Still requires worker management and job status tracking
- Lost jobs on server restart
- Doesn't meaningfully reduce complexity

---

## 9. Moonshots Phase Planning

### Future Async Processing Implementation

**When to Add Async:**
- After MVP validation with 3-5 pilot enterprises
- When enterprises require >200 endpoint specs
- When catalog size exceeds 10,000 endpoints
- When background processing needed for batch operations

**Implementation Approach:**
- Evaluate BullMQ vs pg-boss vs custom solution
- Add job status tracking API
- Implement worker pool management
- Add queue monitoring dashboard
- Progressive migration: sync for <100 endpoints, async for larger

**Estimated Effort:** 2-3 sprints (Epic-level feature)

---

## 10. Appendices

### A. Affected Files Summary

**Code Files (Rollback Required):**
- `apps/api/src/plugins/queue.ts` - DELETE
- `apps/api/src/queue/boss.ts` - DELETE
- `apps/api/src/queue/workers/spec-processing.worker.ts` - DELETE
- `apps/api/src/routes/jobs/status.route.ts` - DELETE
- `apps/api/src/routes/specs/openapi.route.ts` - MODIFY (remove async logic)
- `apps/api/package.json` - MODIFY (remove Sidequest.js/pg-boss)
- `apps/api/.env.example` - MODIFY (remove JOB_* variables)

**Documentation Files (Update Required):**
- `docs/PRD.md` - 3 changes
- `docs/architecture.md` - 7 changes
- `docs/epics.md` - 1 change
- `docs/stories/2-6-async-processing-queue-for-large-specs.md` - MARK AS DEFERRED
- `docs/stories/2-7-batch-upload-endpoint.md` - DELETE (if exists)

**Test Files (Rollback Required):**
- `apps/api/src/__tests__/queue/spec-processing.worker.test.ts` - DELETE
- `apps/api/src/__tests__/integration/async-processing.test.ts` - DELETE
- `apps/api/src/__tests__/routes/specs/openapi.route.test.ts` - MODIFY (remove async tests)

### B. Environment Variable Changes

**Remove:**
```bash
JOB_CONCURRENCY=5
JOB_TIMEOUT=120
````

**No additions required**

### C. Database Schema Impact

**No changes required** - pg-boss tables can be dropped or ignored (not part of Prisma schema)

### D. Rollback Checklist

- [ ] Remove `apps/api/src/plugins/queue.ts`
- [ ] Remove `apps/api/src/queue/` directory
- [ ] Remove job status routes (`apps/api/src/routes/jobs/`)
- [ ] Simplify webhook route (remove async threshold)
- [ ] Remove Sidequest.js from `package.json`
- [ ] Remove JOB\_\* env vars from `.env.example`
- [ ] Delete queue-related test files
- [ ] Update webhook endpoint tests
- [ ] Run full test suite
- [ ] Update PRD (3 changes)
- [ ] Update Architecture (7 changes)
- [ ] Update Epics (1 change)
- [ ] Mark Story 2-6 as deferred to moonshots
- [ ] Delete Story 2-7 from backlog
- [ ] Update sprint backlog
- [ ] Deploy and verify

---

**Change Proposal Status:** ⏳ **PENDING APPROVAL**

**Next Steps:**

1. Product Owner review and approval
2. Development team executes rollback
3. Documentation updates applied
4. Resume Epic 2 with simplified scope

---

_Generated by BMad Correct Course Workflow_
_Date: 2025-11-19_
_Workflow Version: 6.0_
