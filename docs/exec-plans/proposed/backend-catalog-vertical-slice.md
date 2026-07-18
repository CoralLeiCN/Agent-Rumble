# Backend Catalog Vertical Slice Plan

**Status:** Active — catalog API and frontend HTTP integration implemented;
comparison-corpus and release gates remain

**Date:** 2026-07-18

This plan delivers the Agent Rumble backend's first-release catalog experience.
It publishes the validated BioAgents, Biomni, and Eigent cards to the accepted
YAML-first service catalog under `catalog/cards/`. Agent Project Card as a
Service is an active product path, but its repository-submission and on-demand
generation work is outside this catalog-specific slice.

The plan implements the catalog access required by the
[requirements](../../requirements.md#catalog-first-discovery-and-comparison),
[Access and Invocation specification](../../specification/05-system-behavior-and-quality.md#access-and-invocation),
[Search and Retrieval specification](../../specification/05-system-behavior-and-quality.md#search-and-retrieval),
and [Comparison specification](../../specification/05-system-behavior-and-quality.md#comparison).
It implements the accepted YAML-first persistence and basic-search decision. It
does not resolve production deployment, catalog-cohort selection, source
retention, or evaluation-protocol decisions that remain open.

## Outcome

Deliver a tested FastAPI vertical slice that:

1. Discovers and loads only validated canonical Agent Project Cards from the
   accepted versioned YAML layout.
2. Exposes catalog context and versioned card and evidence retrieval.
3. Searches canonical card projections deterministically.
4. Compares two or three pinned card versions under an explicit Assessment
   Context while preserving role, status, confidence, evidence, and field-state
   distinctions.
5. Provides a stable HTTP contract that the React catalog gateway can consume.

No interactive endpoint invokes Codex, the OpenAI Agents SDK, an embedding
model, or analyzed repository code.

## Current Baseline

The implemented slice now contains:

* A root `uv` workspace with a locked Python 3.12 backend and seven-day
  dependency release cooldown.
* A FastAPI application factory, typed settings, CORS configuration, router
  groups, typed error envelopes, catalog services, and passing backend tests.
* The repository-local Agent Project Card skill, v0.3 executable schema,
  deterministic validator, and focused validator tests.
* Eleven structurally and semantically validated real cards under
  `project-cards/`, published byte-for-byte to the accepted versioned layout at
  `catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml`.
* An all-or-nothing YAML repository, immutable catalog snapshot, exact current
  and historical card retrieval, evidence resolution, deterministic search,
  and contextual comparison under `/api/v1`.
* A React `HttpCatalogGateway` for catalog access without a frontend card
  fallback.

The published cards do not share one canonical Assessment Context.
Search and general role/capability comparison are available, while the API
returns `not_analyzed` rather than transferring context-specific fit judgments.
Selecting a prepared production comparison cohort remains a product/data gate.

## Contract Rules

### Canonical Card

The bundled `project-card.schema.json` and deterministic semantic validator are
the executable acceptance gate for cards in this slice. The backend must not
reinterpret schema v0.3 or create a second canonical card definition.

Strict Pydantic application models may mirror the accepted card and define API
projections, but contract tests must prove that they preserve the same values
and reject drift. Schema changes follow the current pre-release schema policy.

### Independent Status Dimensions

The API must keep these concepts separate:

* Capability support status
* Claim verification status
* Confidence
* Field state: `unknown`, `not_applicable`, `not_analyzed`, or
  `no_evidence_found`

There is no project-wide verification status, confidence value, or universal
project score. Search and comparison explanations carry their own Claim and
Evidence references.

### Catalog Data Boundary

The accepted first store is a YAML-first filesystem catalog behind a repository
interface. Its repository default is `catalog/cards/`; the root remains
configurable. The backend discovers only artifacts matching
`{encoded_card_id}/versions/{card_version}/project-card.yaml`, validates the
encoded path against the card contents, and builds only disposable in-memory
search projections.

YAML is parsed safely, repository content is kept as inert data, and no source
path, excerpt, or field may influence configuration, tool authority, or
execution. Embeddings, vector storage, and a persistent derived card index are
excluded from the first implementation.

### Versioning

Search and comparison operate on explicit `card_id` and `card_version` pairs.
The current-card route selects the greatest valid retained version for a
project. Publication creates a new version directory and never overwrites an
earlier `project-card.yaml`.

## API Contract

The first API prefix is `/api/v1`.

| Operation | Endpoint | Required behavior |
| --- | --- | --- |
| Health | `GET /health` | Preserve the existing liveness response. |
| Catalog context | `GET /api/v1/catalog` | Return catalog identity, development/production label, cohort description, coverage, exclusions, card count, schema and ontology versions, and freshness range. |
| Search | `POST /api/v1/catalog/search` | Accept text, structured filters, pagination, and an Assessment Context; return deterministic, claim-linked matches without exposing a universal score. |
| Current card | `GET /api/v1/projects/{project_id}/cards/current` | Return the exact validated canonical data for the current retained card version. |
| Versioned card | `GET /api/v1/projects/{project_id}/cards/{card_version}` | Return a pinned historical card or a typed not-found response. |
| Evidence | `GET /api/v1/projects/{project_id}/cards/{card_version}/evidence/{evidence_id}` | Resolve the Evidence, related Claims, Source, pinned revision, locator, and safe source URL. |
| Compare | `POST /api/v1/catalog/compare` | Compare two or three pinned card versions under an explicit Assessment Context and preserve exact field states. |

All endpoints use typed error envelopes. Search results include source revision,
analysis timestamp and age, card and schema versions, match reasons, and the
Claim identifiers supporting each reason.

Canonical project and evidence identifiers are arbitrary nonempty strings.
Official HTTP clients carry them in one reversible opaque path segment using
`~` plus unpadded base64url of the UTF-8 JSON string representation; card
versions remain decimal. The route layer decodes the segment before catalog
lookup so identifier syntax does not narrow the canonical card contract or
create delimiter ambiguity.

## Delivery Milestones

### Milestone 0 — Plan and Contract Alignment

* Keep the catalog API slice separate from hosted on-demand analysis while both
  satisfy the shared card contract.
* Freeze the backend request and response models before changing the frontend
  gateway.
* Record the development catalog label and comparison limit without claiming
  that the sample cards constitute the selected “leading” production cohort.

**Exit:** Documentation identifies this as a catalog-specific backend slice and
does not mistake its endpoint scope for the complete product scope.

### Milestone 1 — Settings and Card Contract

* Add `pydantic-settings` and `python-dotenv` through the locked `uv` workflow.
* Add typed settings for API prefix, catalog root, file-size limit, and
  development CORS origins.
* Load `.env` before settings are constructed while keeping tests isolated.
* Add strict Pydantic enums and models for canonical-card consumption and API
  projections.
* Expose one importable backend validation adapter that uses the skill's
  executable schema and semantic rules.
* Add parity tests using the BioAgents card plus invalid fixtures.

**Exit:** The BioAgents example validates and round-trips without losing nulls,
field states, identifiers, timestamps, or status distinctions. Invalid and
dangling references fail deterministically.

### Milestone 2 — YAML-First Catalog Repository

* Implement a `CatalogRepository` interface and YAML filesystem adapter for the
  accepted versioned artifact layout.
* Publish the validated BioAgents example as card version 1 without changing
  its canonical contents.
* Constrain path resolution to the configured catalog root.
* Enforce safe YAML loading, file-size limits, schema and semantic validation,
  percent-encoded card paths, unique project/card identifiers, and valid version
  lineage.
* Build immutable, disposable in-memory projections only after discovered cards
  validate.
* Distinguish invalid catalog configuration from an empty, valid catalog.

**Exit:** A clean process loads the published BioAgents card from
`catalog/cards/`; invalid paths, duplicate IDs, invalid versions, malformed
YAML, and invalid cards fail with typed diagnostics and never enter the catalog.

### Milestone 3 — Context, Retrieval, and Evidence API

* Implement catalog context, current-card, versioned-card, and evidence routes.
* Preserve canonical card data without enriching it in the route layer.
* Resolve Claim, Evidence, Source, revision, and locator relationships.
* Construct pinned GitHub source links only from validated repository sources,
  revisions, and locators.
* Add cache metadata keyed by catalog identity, card ID, and card version where
  safe for the immutable version artifacts.

**Exit:** OpenAPI and integration tests cover success, invalid identifiers,
missing versions, missing evidence, and unsafe locator content. Every returned
evidence record resolves to its pinned Source Snapshot.

### Milestone 4 — Deterministic Search

* Index project identity, summary, classification, capabilities, languages,
  direct technologies, license, maturity, architecture layers, relationships,
  and open questions.
* Support filters for category, capability, language, license, maturity, and
  architecture layer.
* Interpret only controlled, tested synonyms; return unsupported text as
  uninterpreted terms.
* Keep unavailable states out of negative matches. For example, an unknown
  license is not indexed as “no license.”
* Return path- and Claim-linked match explanations with deterministic ordering.

**Exit:** Search results are reproducible, do not expose an aggregate quality
score, preserve analysis age and snapshot identity, and correctly handle every
field state.

### Milestone 5 — Real Comparison Data and Projection

This milestone is gated on at least three validated cards that support one
coherent Assessment Context. The BioAgents example remains useful for loading,
evidence, archived status, external prerequisites, and field-state tests, but it
does not support the prototype's current customer-support comparison by itself.

* Select one prepared scenario after the cards reveal a legitimate trade-off.
* Add or approve at least three validated canonical cards for that scenario.
* Compare project roles before capabilities.
* Compare interfaces, prerequisites, constraints, capabilities, limitations,
  open questions, and compatible assessments.
* Return `not_analyzed` when context-specific fit is not supported instead of
  transferring an assessment from a different context.
* Include Claim and Evidence identifiers for consequential cells.

**Exit:** Two or three pinned cards compare under an explicit Assessment
Context, role mismatches are explained, unknown states are not treated as
negative facts, and every decision-changing conclusion is traceable.

### Milestone 6 — Frontend HTTP Gateway

* Align frontend types with the five independent status dimensions.
* Add catalog-context and current-card operations to the gateway.
* Pass the Assessment Context and pinned card versions into comparison.
* Implement an API-only HTTP adapter for the browser runtime.
* Keep evidence excerpts inert and never render repository content as HTML.
* Decide the generated-client workflow separately if it is to become a binding
  production architecture choice.

**Exit:** The HTTP adapter uses validated cards and the browser runtime cannot
substitute illustrative fixtures for the backend catalog.

### Milestone 7 — Hardening and Handoff

* Run locked backend tests, OpenAPI contract tests, frontend type checking,
  frontend tests, and the production frontend build.
* Add adversarial cards for path traversal, source-content injection, invalid
  HTML, duplicate references, cross-card reference leakage, and unsupported
  runtime-verification labels.
* Record coverage against the relevant MVP acceptance criteria.
* Document remaining gates for source retention, manual publication and
  refresh, operator-managed preprocessing, cohort selection, and evaluation
  thresholds.

**Exit:** The first catalog slice is reproducible from a clean checkout and has
no dependency on on-demand analysis, private sources, repository execution,
embeddings, or a database-backed card projection.

## Data Needed

Before comparison can be called complete, the catalog needs:

* At least three validated cards relevant to one shared Assessment Context.
* More than one project role so substitute, adjacent, and complementary
  relationships can be tested.
* Capability statuses beyond only `statically_confirmed`.
* Claim verification beyond only high-confidence static confirmation.
* Examples of `unknown`, `not_applicable`, `not_analyzed`, and
  `no_evidence_found` in decision-relevant fields.
* At least one retained second card version in test data to validate current and
  historical retrieval without silently overwriting lineage.

The existing frontend candidates—OpenAI Agents SDK, LangGraph, and CrewAI—may
be used only after real preprocessing produces validated cards and a defensible
comparison. The illustrative frontend fixtures must not be promoted into the
catalog.

## Deferred and Gated Work

The following are outside this slice or require a recorded decision:

* User-provided repository intake and hosted on-demand analysis: separately
  delivered by Agent Project Card as a Service.
* Direct user generation: delivered through the Agent Project Card skill
  packaged as a Codex plugin rather than this catalog API slice.
* Operator-managed Codex and Agents SDK preprocessing: later backend cohort;
  it must produce the same validated card contract.
* Manual refresh and publication request state: source-retention and delivery
  decisions; canonical card versions still use the accepted YAML layout.
* Database-backed capabilities, embeddings, vector storage, and semantic
  ranking: deferred backlog and a future architecture decision.
* Production cohort selection and the meaning of “leading”: product decision.
* Numeric release thresholds: evaluation-protocol decision.
* Authentication, private repositories, continuous monitoring, dynamic
  execution, and full security scanning: outside MVP.

## Verification Matrix

| Concern | Required checks |
| --- | --- |
| Card contract | JSON Schema, semantic validation, Pydantic parity, null-state round trip, reference integrity |
| Catalog loading | Encoded layout validation, constrained paths, safe YAML, size limit, duplicate IDs, version lineage, all-or-nothing indexing |
| Retrieval | Current and historical versions, exact canonical response, typed not-found behavior |
| Evidence | Claim and Source resolution, pinned revision, locator handling, inert excerpts, safe source URL |
| Search | Controlled synonyms, structured filters, deterministic order, uninterpreted terms, no universal score, unavailable-state behavior |
| Comparison | Explicit context, role compatibility, field states, Claim/Evidence traceability, two-to-three project limit |
| Safety | No source execution, no path traversal, no source-to-configuration mapping, cross-card isolation, adversarial text |
| Integration | OpenAPI contract, complete-catalog parity, frontend typecheck/test/build |

## Definition of Done

The plan is complete only when:

* Every catalog card validates before it becomes searchable.
* API responses preserve card, schema, ontology, Source Snapshot, Claim,
  Evidence, confidence, verification, support-status, and field-state semantics.
* Search and comparison return only traceable canonical projections.
* At least three real cards support the prepared comparison.
* Earlier card versions remain retrievable when a current version changes.
* Untrusted card content stays inert and cannot change application behavior.
* The React gateway consumes the documented API contract.
* Applicable automated checks pass through the locked repository workflows.
