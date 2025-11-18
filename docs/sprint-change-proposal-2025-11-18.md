# Sprint Change Proposal

**Date:** 2025-11-18
**Author:** Brainrepo
**Change Scope:** Moderate (Epic Re-sequencing)
**Status:** Pending Approval

---

## Section 1: Issue Summary

### Problem Statement

The current epic sequencing follows a traditional backend-first approach where all API functionality (Epics 2-5) must be completed before delivering any user-facing UI (Epic 6). However, to engage early adopters effectively, we need to deliver functional UI experiences as soon as each API journey component is ready, rather than waiting for full API completion (dependency tracking, breaking changes, governance features).

### Context & Discovery

- **When Discovered:** During planning for future work (pre-Epic 2 completion)
- **Trigger:** Peer conversations identified opportunity for early adopter engagement
- **Business Driver:** Need to demonstrate end-to-end value and gather user feedback sooner

### Evidence

**Current Epic Sequence:**

1. Epic 1: Foundation & Infrastructure ✓
2. Epic 2: Webhook Ingestion & Spec Management (in progress)
3. Epic 3: Semantic Discovery Engine
4. Epic 4: Dependency Tracking & Subscriptions
5. Epic 5: Breaking Change Detection & Notifications
6. **Epic 6: Frontend - Search & Discovery Interface** ← Blocked until Epic 5 complete
7. Epic 7: Frontend - Governance Dashboard

**Example Use Case:**
Search UI functionality (Epic 6: Stories 6.1-6.7) can be fully functional with only Epic 2 + Epic 3 backend APIs. Stories like "Homepage Search" (6.1), "Search Results" (6.2), and "Endpoint Detail Page" (6.3) do not require Epic 4 (dependency tracking) or Epic 5 (breaking changes) to deliver core discovery value.

---

## Section 2: Impact Analysis

### Epic Impact

**Epic 6: Frontend - Search & Discovery Interface**

- **Change:** Move from position 6 → position 4 (execute immediately after Epic 3)
- **Impact:** Positive - delivers user-facing value 2-3 weeks sooner
- **Dependencies verified:** Epic 6 requires only Epic 2 + Epic 3 completion
  - Story 6.1 (Homepage Search) → needs `GET /api/v1/search` (Epic 3)
  - Story 6.2 (Search Results) → needs `GET /api/v1/search` (Epic 3)
  - Story 6.3 (Endpoint Detail) → needs `GET /api/v1/endpoints/{id}` (Epic 3)
  - Story 6.4 (Related Endpoints) → needs `GET /api/v1/endpoints/{id}/related` (Epic 3)
  - Story 6.5 (Catalog Browse) → needs `GET /api/v1/apis` (Epic 2)
  - Story 6.6 (API Detail) → needs Epic 2 version history
  - Story 6.7 (Dark Mode) → no backend dependencies

**Epic 4: Dependency Tracking & Subscriptions**

- **Change:** Move from position 4 → position 5 (after Epic 6)
- **Impact:** None - Epic 4 is backend-only with no dependencies on Epic 6
- **Sequencing preserved:** Still executes before Epic 5 (which depends on it)

**Epic 5: Breaking Change Detection & Notifications**

- **Change:** Move from position 5 → position 6 (after Epic 4)
- **Impact:** None - maintains required dependency on Epic 4
- **Sequencing preserved:** Still executes before Epic 7 (governance UI)

**Epic 7: Frontend - Governance Dashboard**

- **Change:** Remains in position 7 (no change)
- **Impact:** None - still executes after all required backend epics (4, 5)

### Story Impact

**Stories Requiring Changes:** None

**Stories with New Opportunities:**

- Story 6.3 (Endpoint Detail Page) can show empty state for "Consumers" section until Epic 4 completes
- Story 6.3 can show empty state for "Breaking Changes" section until Epic 5 completes
- These are progressive enhancements, not blockers

### Artifact Conflicts

**Three documents require updates:**

1. **epics.md** - Epic sequencing and MVP delivery strategy
2. **PRD.md** - MVP implementation strategy documentation
3. **architecture.md** - Deployment sequencing notes

**No conflicts identified in:**

- Technical architecture (RESTful API design supports incremental delivery)
- Data models (Epic 6 consumes existing models from Epic 2 & 3)
- Infrastructure (monorepo already supports independent app deployment)
- Testing strategy (frontend tests can be written earlier)

### Technical Impact

**Code Changes:** None required

**Infrastructure Changes:** None required

**Deployment Changes:** Positive

- Frontend can be deployed incrementally as backend APIs stabilize
- Enables earlier demonstration to stakeholders

**Testing Impact:** Positive

- Frontend E2E tests can begin after Epic 3 completion
- Enables earlier user acceptance testing

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment (Epic Re-sequencing)

**Approach:** Re-sequence Epic 6 to execute immediately after Epic 3 completion

**New Epic Sequence:**

1. Epic 1: Foundation & Infrastructure ✓
2. Epic 2: Webhook Ingestion & Spec Management
3. Epic 3: Semantic Discovery Engine
4. **Epic 6: Frontend - Search & Discovery Interface** ← MOVED UP
5. Epic 4: Dependency Tracking & Subscriptions
6. Epic 5: Breaking Change Detection & Notifications
7. Epic 7: Frontend - Governance Dashboard

### Justification

**Implementation Effort: Low**

- Pure planning/documentation change
- No code rewrites or architectural modifications
- Estimated: 1-2 hours to update 3 documentation files

**Technical Risk: Low**

- Epic 6 stories already designed to work with Epic 2+3 APIs
- No new dependencies introduced
- Architecture already supports incremental frontend deployment
- Backward compatible (can revert if issues arise)

**Timeline Impact: Positive**

- Usable search UI available 2-3 weeks sooner
- Enables early adopter onboarding during Epic 4 & 5 development
- Faster feedback loop for UI/UX refinements

**Team Morale & Momentum: High**

- Demonstrates tangible end-to-end value earlier
- Breaks up long backend-only development cycle
- Provides visible progress for stakeholders

**Long-term Sustainability: High**

- Better aligns with iterative/incremental delivery principles
- Supports continuous user validation
- Reduces risk by validating core value proposition (discovery) before investing in governance features

**Stakeholder Expectations: Exceeds**

- Early adopters can start discovering APIs sooner
- Demonstrates working software faster
- Enables data collection on search quality and usage patterns

### Alternatives Considered

**Option 2: Rollback Recent Work**

- **Rejected:** No rollback needed - Epic 1 completion is required foundation

**Option 3: Reduce MVP Scope**

- **Rejected:** MVP scope remains achievable and valuable as-is

---

## Section 4: Detailed Change Proposals

### Change #1: epics.md - Epic Sequencing

**File:** `/Users/brainrepo/Desktop/perrache/docs/epics.md`

**Change 1A - Update Epic 6 Description (lines 73-81)**

**Before:**

```markdown
### Epic 6: Frontend - Search & Discovery Interface

**Value:** Provide intuitive, developer-first UI for API discovery

**Scope:** Search homepage, search results, endpoint detail pages, related endpoints sidebar, API catalog browser, dark mode

**Why:** Enables developers to interact with the semantic catalog. User-facing discovery interface.

**Sequencing:** Epic 6 - delivers user interface for discovery (backend must be functional first)
```

**After:**

```markdown
### Epic 6: Frontend - Search & Discovery Interface

**Value:** Provide intuitive, developer-first UI for API discovery and enable early adopter engagement

**Scope:** Search homepage, search results, endpoint detail pages, related endpoints sidebar, API catalog browser, dark mode

**Why:** Delivers end-to-end search experience to early adopters as soon as semantic discovery engine is ready. Enables rapid feedback on search quality and user experience while advanced features (dependency tracking, breaking changes) are being built.

**Sequencing:** Epic 6 - delivers immediately after Epic 3 (Semantic Discovery Engine) to enable early adopter engagement. Does not require Epic 4 or Epic 5.
```

**Change 1B - Update MVP Delivery Strategy (line 105)**

**Before:**

```markdown
**MVP Delivery Strategy:**
Epics 1-7 deliver complete MVP value: automated ingestion → semantic discovery → breaking change management → governance visibility. Each epic builds on previous capabilities for incremental value delivery.
```

**After:**

```markdown
**MVP Delivery Strategy:**
Epics deliver in two phases for faster early adopter engagement:

- **Phase 1 (Core Discovery):** Epics 1-3, 6 deliver end-to-end search experience: automated ingestion → semantic discovery → search UI
- **Phase 2 (Advanced Features):** Epics 4-5, 7 add governance capabilities: dependency tracking → breaking change management → governance visibility

This sequencing enables early adopter feedback on core discovery while building advanced features.
```

---

### Change #2: PRD.md - Implementation Strategy

**File:** `/Users/brainrepo/Desktop/perrache/docs/PRD.md`

**Location:** After line 180 (after MVP Success Criteria, before "### Growth Features")

**Action:** Insert new subsection

**Content:**

```markdown
### MVP Implementation Strategy

**Incremental Delivery Sequence:**

The MVP will be delivered in an optimized sequence to enable early adopter engagement:

**Phase 1: Foundation & Backend Core (Epics 1-3)**

- Epic 1: Foundation & Infrastructure
- Epic 2: Webhook Ingestion & Spec Management
- Epic 3: Semantic Discovery Engine

**Phase 2: User-Facing Discovery Experience (Epic 6)**

- Epic 6: Frontend - Search & Discovery Interface

At this point, early adopters can start using Perrache to discover and explore APIs via the search UI. This enables user validation and feedback collection while advanced features are built.

**Phase 3: Advanced Governance Features (Epics 4-5, 7)**

- Epic 4: Dependency Tracking & Subscriptions
- Epic 5: Breaking Change Detection & Notifications
- Epic 7: Frontend - Governance & Breaking Change Dashboard

**Benefits of This Sequencing:**

- **Faster Time-to-Value:** Usable search interface available immediately after Epic 3 completion
- **Early Validation:** User feedback on search quality and UI/UX informs Epic 4-5 development
- **Incremental Engagement:** Early adopters can onboard and start discovering APIs while governance features are built
- **Risk Reduction:** Validates core value proposition (discovery) before investing in advanced features

**Technical Foundation:** The Turborepo monorepo architecture with independent apps enables this incremental delivery - frontend can be deployed as soon as the backend search APIs are ready (Epic 3).
```

---

### Change #3: architecture.md - Deployment Strategy

**File:** `/Users/brainrepo/Desktop/perrache/docs/architecture.md`

**Location:** After line 52 (after Decision Summary table, before "## Project Structure")

**Action:** Insert new subsection

**Content:**

```markdown
## Deployment Strategy

### Incremental Frontend Delivery

The frontend application (`apps/web`) can be deployed incrementally as backend APIs become available:

**Minimum Deployment Requirements:**

- **After Epic 1-3 completion:** Full search and discovery UI can be deployed
  - Required APIs: `/api/v1/search`, `/api/v1/apis`, `/api/v1/endpoints/{id}`, `/api/v1/endpoints/{id}/related`
  - Frontend features available: Homepage search, results page, endpoint details, catalog browsing, related endpoints
  - Missing features: Consumer visibility (requires Epic 4), breaking change history (requires Epic 5)

**Progressive Enhancement:**

- **After Epic 4:** Consumer lists appear in endpoint detail pages
- **After Epic 5:** Breaking change indicators and history appear throughout UI
- **After Epic 7:** Governance dashboards become available

**Implementation Notes:**

- Frontend gracefully handles missing data (empty states for consumers, breaking changes)
- API client returns empty arrays for missing Epic 4/5 data
- No conditional rendering logic needed - UI components handle nullable/empty data
- Deployment can proceed as soon as Epic 3 backend APIs are stable

**Why This Works:**
The REST API design with shared TypeScript types (`@perrache/types`) ensures frontend can safely consume backend APIs as they become available. The monorepo structure allows independent deployment of `apps/api` and `apps/web` with separate release cycles.
```

---

## Section 5: Implementation Handoff

### Change Scope Classification

**Scope:** **Moderate**

**Rationale:**

- Affects epic sequencing and project planning
- Requires documentation updates across 3 files
- Does not require code changes or story modifications
- Requires coordination with team on updated priorities

### Handoff Recipients

**Primary:** Product Owner / Scrum Master

**Responsibilities:**

1. Review and approve this Sprint Change Proposal
2. Update epic sequencing in project tracking (sprint-status.yaml will naturally reflect new order as stories are worked)
3. Communicate change to development team
4. Update sprint planning to reflect Epic 6 execution after Epic 3

**Secondary:** Development Team

**Information Needed:**

- Epic 6 will be worked immediately after Epic 3 completion
- No story modifications required
- Frontend development can begin as soon as Epic 3 backend APIs are stable

### Success Criteria

**This change is successfully implemented when:**

1. ✅ All three documentation files updated with approved changes
2. ✅ Team acknowledges new epic sequencing
3. ✅ Sprint planning reflects Epic 6 execution after Epic 3
4. ✅ Early adopter onboarding plan created for post-Epic-6 engagement

### Next Steps

**Immediate (upon approval):**

1. Update epics.md with new sequencing and strategy
2. Update PRD.md with implementation strategy section
3. Update architecture.md with deployment strategy section
4. Commit changes with message: "docs: re-sequence Epic 6 for early adopter engagement"

**Short-term (Epic 3 completion):**

1. Verify Epic 3 backend APIs are stable and documented
2. Begin Epic 6 story execution (6.1: Homepage with Search Interface)
3. Plan early adopter onboarding approach

**Medium-term (Epic 6 completion):**

1. Deploy search UI to production or staging environment
2. Onboard early adopters for feedback collection
3. Continue Epic 4 development based on user insights

---

## Approval

**Prepared by:** Brainrepo
**Date:** 2025-11-18
**Workflow:** correct-course

**Approval Status:** Pending

---

**Notes:**

- This change aligns with modern incremental delivery practices
- No technical debt introduced
- Architectural design already supports this sequencing
- Risk level: Low | Effort: Low | Value: High

---

_🤖 Generated with [Claude Code](https://claude.com/claude-code)_
