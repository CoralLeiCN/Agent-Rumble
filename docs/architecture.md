# Architecture

This document summarizes the architecture implemented in this repository. The
[product specification](specification/README.md) defines required product
behavior, and the [architecture decisions](decisions.md) record accepted choices.
The [QA review](qa/README.md#remaining-gaps-and-review-findings) and
[delivery plan](exec-plans/active/mvp-delivery.md) identify implementation gaps.

## System Overview

```text
Public GitHub URL + explicit project boundary
          │
          ▼
Anonymous verification + bounded temporary Git-object acquisition
          │
          ▼
Direct Codex SDK adapter + Agent Project Card skill
          ├── isolated, provider-configurable static analysis
          └── canonical schema, provenance, and semantic validation
          │
          ▼
Private draft YAML history + retrieval manifest (var/generated-cards/)
          │
          ├── retrieve or manually refresh through the generation API
          └── operator reviews and explicitly publishes the next version
          ▼
catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml
          │
          ▼
FastAPI validated catalog snapshot + manual reload
          │
          ▼
React Agent Rumble experience
          ├── catalog scope, freshness, search, and persisted shortlist IDs
          ├── shared-context comparison and canonical evidence inspection
          └── canonical comparison projected into Rumble Arena

```

## Components

### Agent Project Card Skill

The Codex skill in
[`.agents/plugins/agent-project-card/`](../.agents/plugins/agent-project-card/) defines the
static repository-analysis workflow, safety boundaries, card schema, summary
template, and deterministic validator. Codex can run the skill in parallel for
different projects. Reviewed, validated cards are published to
[`catalog/cards/`](../catalog/cards/), the single checked-in card store.

### Card Generation Workflow

The backend analysis package invokes Codex directly through the Python SDK and
attaches the shared Agent Project Card skill. Direct adapter callers supply a
local Git root and verify its upstream identity. The generation service accepts
one public GitHub URL and project boundary, verifies anonymous GitHub metadata,
and fetches Git objects without materializing repository files. The application
snapshots text from immutable Git blobs at the repository's full HEAD commit.
A bounded source adapter exposes listing, text reading, literal search, and
trusted skill references. Source symlinks and submodules are never followed.

Codex runs in an ephemeral private directory with a clean environment and a
filesystem policy that denies host reads and writes. Shell execution and other
executable tool surfaces are disabled. Only the selected provider configuration
and authentication are imported from operator settings. These boundaries are
covered by an adversarial local mock-provider regression test.

The model returns YAML to the application. The shared canonical parser rejects
duplicate keys, aliases, excessive nesting, excessive nodes, and oversized files.
The adapter checks the generated card's repository URL and source revision
against the request and local snapshot, enforces static-only claim and
capability statuses, records non-secret provenance, and
validates the result before returning a draft. Temporary data is cleaned on all
exits. The adapter returns a draft in memory. The generation service persists
validated YAML versions and UUID retrieval manifests in a separate local root.
Manual refresh reuses the request boundary and retains earlier versions.
New requests match a lineage by primary repository URL and exact requested
boundary, using saved request provenance when present. A different boundary
must have distinct identifiers; collisions return a conflict without changing
the existing lineage. Refresh retrieval runs in a worker thread so YAML loading
and validation do not block the async request loop.
Retrieval manifests hold request metadata and pinned card identifiers; retrieval
validates the YAML store and reads the canonical version directly.
Disconnection cancels analysis; an in-progress storage transaction finishes.
Only the operator publication command writes reviewed drafts to the catalog.
See the [local generation decision](decisions.md#local-generation-storage-and-publication)
and [backend workflow](../backend/README.md#generation-storage-and-publication).
Public deployment remains unselected.

### Versioned Card Catalog

Reviewed cards are published as canonical YAML artifacts under
[`catalog/cards/`](../catalog/cards/). Each retained card version has its own
path so card history, schema versions, project releases, and analyzed source
snapshots remain distinct.

### FastAPI Backend

The backend loads and validates the complete YAML catalog at startup. Its API
supports catalog context, deterministic search, card retrieval, contextual
comparison, canonical Rumble, and claim-level evidence retrieval. Retrieval
supports ETags. Manual catalog reload validates a replacement snapshot before
swapping it into use. Generation uses a separate route group and one active
request per process; local operation uses one worker.

The [catalog service](../backend/src/agent_project_intelligence/services/catalog.py)
owns retrieval and delegates deterministic ranking to
[catalog search](../backend/src/agent_project_intelligence/services/catalog_search.py)
and contextual rows to
[comparison projections](../backend/src/agent_project_intelligence/services/catalog_comparison.py).
Both reuse canonical field and assessment-context helpers. Search computes each
interpreted term's document frequency once per request.

### React Frontend

The frontend pages through API search summaries and loads complete cards only
for comparison and evidence. Its cache and comparison references pin project
identity and card version; evidence requests also carry the claim ID.
The cache holds at most 32 cards with least-recently-used eviction. `App.tsx`
composes separate catalog, comparison, arena, and evidence views; the
[catalog hook](../frontend/src/catalog/useCatalogApp.ts) owns request coordination
and ignores stale successes and failures.
The UI derives its exhaustive field inventory locally from downloaded cards
and consumes the backend's role analysis and contextual comparison under an
editable shared Assessment Context. Search carries explicit Must, Prefer, and
Avoid constraints but remains deterministic keyword search; it does not certify
requirement satisfaction. Contextual assessments require an exact recorded
context match. Three version-2 development cards share a Python support-agent
scenario, preserving the original source snapshots and evidence.

Query, context, and shortlist IDs survive reload in session storage; restoration
fetches current cards. Catalog scope and freshness come from the backend.
Rumble uses the same pinned versions and context as standard comparison. Its
canonical claim links open the same evidence drawer. The arena loads a single
canonical API response containing the matchup and projection. Failures remain
visible and retryable. Synthetic test inputs exercise projection and evidence
validation independently of the catalog; the application serves no demo bundle.

## Architectural Boundaries

* The versioned `project-card.yaml` artifact is the canonical source of project
  intelligence.
* Catalog summaries, search results, comparisons, and evidence views are
  projections of canonical cards. Supplied-matchup projection validates its
  caller's evidence registry and does not publish or replace catalog cards.
* Repository analysis is static; untrusted project code is not executed by
  default.
* `catalog/cards/` is the single checked-in card store and retains every published
  version. Service-generated drafts use ignored `var/generated-cards/` until
  explicit publication.
* Proposed changes belong in design documents. Accepted architecturally
  significant changes belong in the architecture decisions record.
* Model-provider settings are operator-controlled. Repository content cannot
  select endpoints, providers, credentials, or models.
