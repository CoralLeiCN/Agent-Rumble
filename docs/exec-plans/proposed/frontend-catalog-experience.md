# Frontend Catalog Experience Plan

**Status:** Proposed

This plan delivers the catalog-first frontend defined by the
[Frontend Experience](../../design-docs/frontend-experience.md) and
[Frontend Screen Design](../../design-docs/frontend-screen-design.md). It does
not create product scope or accept unresolved architecture choices.

## Outcome

Deliver one trustworthy end-to-end loop:

> Describe a need, inspect how it was interpreted, shortlist three projects,
> compare decision-changing differences, and open the precise evidence behind a
> consequential claim.

Interactive use operates only on preprocessed cards. Search, filtering,
comparison, and evidence viewing do not invoke an AI model.

## Current State

* A local Vite, React, and TypeScript prototype implements the prepared Explore,
  shortlist, comparison, and evidence flow behind a static catalog gateway.
  Its tooling and in-app navigation remain reversible prototype choices rather
  than accepted production architecture.
* FastAPI currently exposes only `/health`.
* The repository-local Agent Project Card skill includes an executable v0.2
  schema and deterministic validator, and one real BioAgents card validates.
  Typed backend card consumption models and catalog projections are not yet
  implemented.
* Catalog search, project-card, comparison, and evidence endpoints do not exist.
* The frontend uses illustrative OpenAI Agents SDK, LangGraph, and CrewAI data
  that must not be presented as validated project intelligence or copied into
  the catalog without real preprocessing.

## Scope

### Must Ship

* Prepared customer-support architecture query
* Visible `Must`, `Prefer`, and `Avoid` requirement interpretation
* Explainable catalog results
* Three-project shortlist
* Contextual, difference-first comparison
* One excellent claim-to-evidence inspection path
* Clearly labeled bundled fallback for demo reliability
* Responsive and keyboard-operable primary flow

### Ship if Time Permits

* Full Agent Project Card page
* Canonical JSON view
* Structured filter rail
* Catalog cohort and methodology page
* Shareable comparison URL

### Excluded from the Hackathon Flow

* User accounts and saved workspaces
* User-submitted repositories
* Live or on-demand preprocessing
* Chat interface
* Trend dashboards
* Personalization
* Full ecosystem landscape
* Comments and collaboration
* Arbitrary comparisons of more than three projects

## Proposed Frontend Architecture

These choices require acceptance in the architecture decisions record before
they become binding:

| Concern | Proposed choice | Reason |
| --- | --- | --- |
| Language | React with strict TypeScript | Protect card, status, and null-state semantics across dense comparison views |
| Build and routing | React Router Framework Mode, powered by Vite | Route modules, loaders, error boundaries, code splitting, and a path from SPA to prerendering or SSR |
| Initial rendering | SPA mode | Fastest static deployment for the hackathon; search indexing and rich public previews are explicitly P2 |
| Server data | Route loaders and one catalog gateway | Keep route-owned data without adding a second cache model |
| Shareable state | URL parameters | Queries, filters, shortlist, context, and selected evidence can survive refresh and sharing |
| API contract | Generated TypeScript client from FastAPI OpenAPI | Keep Pydantic as the application contract source and detect drift in CI |
| Styling | CSS custom properties and CSS Modules | Port the bespoke prototype directly with minimal dependency and theme overhead |
| Component primitives | Native semantic elements first; add unstyled accessible primitives only where needed | Avoid a generic component-library visual identity while protecting dialog and overlay accessibility |
| Package workflow | npm with a committed lockfile on a supported Node LTS release | Minimal setup and straightforward static deployment |

React recommends a framework for new applications, React Router supports SPA
mode and later prerendering, and FastAPI documents OpenAPI-generated TypeScript
clients:
[React app guidance](https://react.dev/learn/creating-a-react-app),
[React Router modes](https://reactrouter.com/start/modes),
[SPA mode](https://reactrouter.com/how-to/spa), and
[FastAPI client generation](https://fastapi.tiangolo.com/advanced/generate-clients/).

Testing tools are implementation details rather than architectural commitments:
Vitest, React Testing Library, `user-event`, MSW, Playwright, and automated axe
checks are proposed.

## Decision Gates

### Resolved Product Decisions

* Use `Agent Rumble` as the public product and UI name.
* Retain `Agent Project Intelligence` for the underlying system and analysis
  capability.
* Retain `Agent Project Card` for the canonical artifact.
* Defer search-engine indexing and rich social previews for public card pages to
  P2.

These decisions allow the initial frontend to use Agent Rumble copy and SPA
rendering without implying that public-card discoverability is complete.

### Before the Prototype Becomes Production Frontend Architecture

Accept or revise:

* React Router Framework Mode and Vite
* SPA rendering for the first release
* URL-owned discovery and comparison state
* Route loaders without a global state or query library
* OpenAPI-generated TypeScript client
* CSS Modules and custom-property design tokens

### Before P2 Public-Page Discoverability

Select prerendering or server-side rendering for public project routes, define
canonical URLs and metadata, and add rich social previews. This is not required
for the first frontend release.

The proposed hosting stack in
[Production Deployment](../../design-docs/production-deployment.md) also remains
unaccepted until recorded as a decision.

## Data Boundary

All catalog access sits behind one interface:

```ts
interface CatalogGateway {
  getCatalogContext(): Promise<CatalogContext>
  searchProjects(request: SearchRequest): Promise<SearchResponse>
  getCurrentCard(projectId: string): Promise<AgentProjectCard>
  getCard(projectId: string, cardVersion: number): Promise<AgentProjectCard>
  getEvidence(request: EvidenceRequest): Promise<EvidenceResponse>
  compareProjects(request: ComparisonRequest): Promise<ComparisonResponse>
}
```

Two adapters use identical response types:

* `HttpCatalogGateway` calls FastAPI.
* `StaticCatalogGateway` reads committed demo responses during an outage and
  causes the UI to display a bundled-snapshot label.

The gateway prevents transport and fallback behavior from leaking throughout
components. It must not introduce a frontend-owned card or comparison model.

## Proposed API Surface

| Operation | Endpoint | Result |
| --- | --- | --- |
| Catalog context | `GET /api/v1/catalog` | Cohort, coverage, freshness, schema versions, ontology versions, and exclusions |
| Search | `POST /api/v1/catalog/search` | Interpreted requirements, facets, results, and claim-linked match explanations |
| Current card | `GET /api/v1/projects/{project_id}/cards/current` | Canonical Agent Project Card |
| Versioned card | `GET /api/v1/projects/{project_id}/cards/{card_version}` | Pinned canonical Agent Project Card revision |
| Evidence | `GET /api/v1/projects/{project_id}/cards/{card_version}/evidence/{evidence_id}` | Evidence, related Claims, Source, pinned revision, locator, and safe source URL |
| Compare | `POST /api/v1/catalog/compare` | Difference-first comparison under an explicit Assessment Context |

Search interpretation for the first slice is deterministic and ontology-backed:

1. Normalize input text.
2. Match controlled project-role, capability, language, license, and delivery
   synonyms.
3. Return requirements grouped as `must`, `prefer`, and `avoid` plus
   uninterpreted terms.
4. Apply structured filters and conventional full-text matching.
5. Rank contextual matches without generating a universal project score.
6. Derive each match reason from canonical card fields and claim identifiers.

The frontend displays the backend's interpreted requirements and explanations;
it does not independently infer capabilities, confidence, or trade-off
conclusions.

## Comparison Contract

Comparison responses preserve exact non-values:

```ts
type ComparisonState =
  | "value"
  | "unknown"
  | "not_applicable"
  | "not_analyzed"
  | "no_evidence_found"

interface ComparisonCell {
  state: ComparisonState
  value?: string | string[]
  capabilitySupportStatus?: CapabilitySupportStatus
  claimVerificationStatus?: ClaimVerificationStatus
  confidence?: Confidence
  claimIds: string[]
  evidenceIds: string[]
}
```

The comparison projection also states the Assessment Context, project-role
relationships, material differences, shared attributes, and proof-of-concept
questions. The frontend may group or format rows but must not invent a winner.

## Fixture Gate

Validated fixtures are the first delivery dependency, not placeholder copy.

Prepare three canonical cards that:

* Apply to one realistic Assessment Context.
* Have at least one meaningful role distinction.
* Contain a decision-relevant capability or constraint difference.
* Distinguish documented and statically confirmed support where evidence allows.
* Include limitations or unresolved questions.
* Pin every source to a repository revision.
* Resolve every displayed claim identifier to a source, evidence record, and
  precise locator.
* Never present static evidence as runtime verification.

Candidate projects are OpenAI Agents SDK, LangGraph, and CrewAI. The comparison
story must be selected after preprocessing reveals a legitimate difference. Do
not retrofit evidence to a predetermined winner or claim.

## Proposed Source Layout

```text
frontend/
├── app/
│   ├── root.tsx
│   ├── routes.ts
│   ├── routes/
│   ├── components/
│   │   ├── primitives/
│   │   └── shell/
│   ├── features/
│   │   ├── catalog/
│   │   ├── search/
│   │   ├── shortlist/
│   │   ├── comparison/
│   │   ├── project-card/
│   │   └── evidence/
│   ├── lib/
│   │   ├── api/generated/
│   │   ├── catalog-gateway/
│   │   ├── status/
│   │   └── url-state/
│   └── styles/
├── e2e/
├── mocks/
├── package.json
└── package-lock.json
```

One central status-presentation module owns capability support, claim
verification, confidence, and null-state labels. Screens must not independently
turn these states into inconsistent ticks, crosses, or colors.

## Delivery Milestones

### Milestone 0: Contract and Demo Lock

**Target:** 30–45 minutes with both teammates.

Deliver:

* Confirm scenario, cohort, and compare limit; use Agent Rumble as the visible
  product name.
* Freeze the six catalog gateway operations and response shapes.
* Select the exact 90-second happy path and prepared deep link.
* Classify work as must, should, or later.

Exit criteria:

* Both teammates can work against stable fixture responses.
* Every rendered decision claim can resolve to evidence.
* No interactive operation requires Codex, Agents SDK, embeddings, or another
  model call.

### Milestone 1: Runnable Shell and Trustworthy Data

Parallel work:

* **Frontend owner:** application scaffold, routes, error boundary, visual tokens,
  responsive shell, gateway interface, and static adapter.
* **Data/API owner:** canonical models, three validated cards, API projection
  models, fixture validation, and the six catalog API operations.

Exit criteria:

* Explore, comparison, and project routes render.
* Three cards validate against the canonical schema.
* Static and HTTP gateways return equivalent response shapes.
* No privileged credential is present in the browser bundle.

### Milestone 2: Explore and Shortlist

Deliver:

* Hero proposition and prepared query.
* `Must`, `Prefer`, and `Avoid` interpreted requirements.
* Result rows with match reasons, role, status, constraint, revision, and date.
* Three-project fixed shortlist tray.
* Loading, no-result, error, stale-card, partial-card, and bundled-fallback
  states.

Exit criteria:

* The prepared query returns an explainable shortlist.
* Users add or remove projects without losing the query context.
* Unsupported query text is visible as uninterpreted.
* Results do not expose a universal score or popularity-led ranking.
* Keyboard and small-screen operation remain functional.

### Milestone 3: Contextual Comparison and Evidence

Build this before the complete Project Card page.

Deliver:

* Assessment Context header.
* Substitute, adjacent, and complementary role explanation.
* Difference-first matrix with shared rows collapsed.
* Requirement matches and mismatches, capabilities, interfaces, prerequisites,
  deployment, limitations, and open questions.
* Exact status and null-state labels.
* Evidence drawer resolving claim, evidence, source, pinned revision, and locator.

Exit criteria:

* Two or three projects compare under an explicit context.
* Role differences appear before feature differences.
* `unknown`, `not_analyzed`, and `no_evidence_found` remain distinct.
* One action from a consequential cell opens precise evidence.
* No text declares a universal winner.

### Milestone 4: Agent Project Card

Deliver:

* Overview, capabilities, architecture, evidence, and canonical JSON views.
* Project boundary and source-snapshot header.
* Maturity context, limitations, adoption guidance, and open questions.
* Claim filters and links back to the active comparison.

Exit criteria:

* Human-readable content is projected from the canonical card.
* Raw JSON is the exact card returned by the API.
* Source links use pinned revisions rather than moving branch URLs.

Cut this milestone before weakening search, comparison, or evidence.

### Milestone 5: Demo Hardening

Deliver and verify:

* One-click example query and prepared comparison deep link.
* Clearly labeled bundled fallback.
* Responsive comparison presentation.
* Correct focus management for drawers and route changes.
* Deployed frontend and API.
* At least two timed rehearsals.

Exit criteria:

* A clean browser session completes the full story.
* API outage still permits the prepared demo.
* Evidence links and revision metadata work.
* Browser network inspection shows no model calls.
* The story finishes inside two minutes.

## Two-Teammate Ownership

| Work | Frontend owner | Data and API owner |
| --- | --- | --- |
| Shared | Contract, scenario, visual review, rehearsal | Contract, scenario, evidence review, rehearsal |
| Primary | Shell, Explore, result rows, shortlist, comparison presentation, responsive behavior | Canonical fixtures, Pydantic projections, API routes, deterministic search, comparison projection, evidence resolution |
| Secondary | Project-card and JSON presentation | HTTP/static gateway integration and source-link construction |
| Test focus | Components, accessibility, visual behavior, end-to-end flow | Schema, referential integrity, API contracts, deterministic ranking |

Use feature-level ownership so teammates do not repeatedly conflict in routes,
shared types, or global styles.

## Verification Plan

### Contract and Data

* Validate every card against the Pydantic model and machine-readable schema.
* Resolve every claim, evidence, source, and relationship identifier.
* Require source revisions and retrieval dates.
* Verify HTTP and static adapters return equivalent response objects.
* Detect OpenAPI-generated client drift in CI.

### Unit and Component

* Controlled-vocabulary and synonym interpretation.
* Deterministic filtering and ranking.
* Capability, verification, confidence, and null-state presentation.
* Comparison difference detection.
* Claim-to-evidence and pinned-source resolution.
* Requirement-chip editing and result updates.
* Shortlist addition, removal, duplicate prevention, and maximum.
* Difference and shared-row disclosure.
* Evidence drawer focus trap and restoration.
* Loading, empty, failure, stale, partial, and fallback states.

### End to End

One Playwright flow proves the pitch:

1. Open Explore.
2. Select the prepared customer-support scenario.
3. Inspect interpreted requirements.
4. Shortlist three projects.
5. Open the contextual comparison.
6. Inspect one decision-changing constraint.
7. Open its exact repository evidence.
8. Reload or share the URL and reproduce the decision context.

Repeat the core path at a mobile viewport and with the API unavailable.

### Accessibility and Safety

* Run automated axe checks and complete a manual keyboard pass.
* Never communicate status only through color.
* Render repository evidence as inert text, never raw HTML.
* Use pinned revision links for source evidence.
* Keep secrets and privileged configuration out of frontend variables.

## Main Risks

| Risk | Response |
| --- | --- |
| Cards arrive late or lack meaningful differences | Freeze response shapes early; choose the demo trade-off only after real preprocessing |
| Frontend and API drift | One gateway, generated client, shared fixtures, and contract checks |
| Search appears more intelligent than implemented | Show interpretation and uninterpreted terms; call it catalog search rather than `Ask AI` |
| Project roles make comparison misleading | State role compatibility before capability rows |
| UI invents an aggregate score | Present claim and capability status independently |
| Evidence links move | Construct links from pinned revisions |
| Dense comparison fails on mobile | Use stacked topic comparisons rather than compressing a desktop table |
| Venue or API network fails | Bundle and visibly label a prepared catalog snapshot |
| Repository content affects the UI | Render evidence as untrusted plain text |
| Scope expands into intake or live analysis | Omit those controls entirely from the first release |

## Production Follow-Up

After the demo:

1. Stabilize and version API projections.
2. Generate the TypeScript client from FastAPI OpenAPI.
3. Replace fixtures with relational catalog projections and indexed search.
4. Add stable, shareable project and comparison URLs.
5. Add pagination, cache headers, ETags keyed by card version, and error envelopes.
6. Complete accessibility review, performance budgets, CSP, strict CORS, and
   rate limits.
7. Add staging and production environments, deployment gates, observability,
   backups, and smoke tests.
8. Add saved comparisons and authentication only when their use case is ready.
9. Add P2 user-provided repository analysis only after the catalog experience is
   reliable.
