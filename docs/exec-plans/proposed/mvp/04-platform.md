# PLAT — Catalog-Platform-and-Experience Cohort

**Status:** Proposed — revised for catalog-first delivery

**Plan index:** [Parallel MVP Execution Plan](README.md)

**Detailed first slice:**
[Backend Catalog Vertical Slice Plan](../backend-catalog-vertical-slice.md)

This cohort exposes validated, preprocessed Agent Project Cards through FastAPI
and connects the selected React catalog experience. It implements the accepted
YAML-first card store and disposable in-memory basic search. It does not accept
a Git repository link, start an interactive analysis job, or invoke Codex in a
public request. Those on-demand modes are P2.

## Entry Condition

The catalog foundation may begin when at least one canonical card validates
through the repository-local skill's executable schema and semantic validator.
The existing BioAgents example satisfies that condition for publication,
loader, retrieval, and evidence work.

Additional gates apply by packet:

* PLAT-1 and PLAT-2 implement the accepted YAML-first catalog decision and do
  not require another persistence decision.
* PLAT-3 may start with one validated card, but representative relevance tests
  require the selected search corpus.
* PLAT-4 requires at least three validated cards under one coherent Assessment
  Context.
* PLAT-5 requires the frontend contract to preserve the canonical status
  dimensions and explicit comparison context.
* PLAT-6 requires the applicable G-02 source-retention boundary and selected
  operator publication flow.

## Packet Summary

| Packet | Scope | Gate |
| --- | --- | --- |
| PLAT-1 — YAML catalog foundation | Settings, typed contracts, versioned store discovery, validated repository | One valid canonical card |
| PLAT-2 — Retrieval and evidence API | Catalog context, current/versioned cards, evidence resolution | PLAT-1 |
| PLAT-3 — Deterministic search | Keyword interpretation, structured filters, traceable matches | PLAT-1; corpus for representative tests |
| PLAT-4 — Contextual comparison | Role-first comparison with exact field states | Three contextually comparable cards |
| PLAT-5 — React HTTP integration | HTTP gateway and contract alignment | PLAT-2 through PLAT-4 as used by the UI |
| PLAT-6 — Publication and refresh | Atomic YAML publication, history, diffs, refresh | G-02 and selected operator flow |
| PLAT-7 — Quality and safety | End-to-end, adversarial, isolation, and parity checks | Applicable completed packets |

## PLAT-1 — YAML Catalog Foundation

**Owns:** P-00 and the catalog portion of P-02

Implement typed backend settings, independent status enums, strict card and API
projection models, and a `CatalogRepository` interface for the accepted YAML
layout:

```text
catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml
```

The catalog root remains configurable. The encoded card ID is one
percent-encoded UTF-8 path segment and must resolve to the unencoded card ID in
the YAML. Every discovered card must pass the same executable schema and
semantic rules as the Agent Project Card skill before it enters the in-memory
catalog.

Publish the validated BioAgents example as the first service card without
changing its canonical content. Reject malformed files, unsafe paths, duplicate
identifiers, invalid versions, and dangling references. Any search projection
is disposable and rebuildable from the canonical YAML; do not add embeddings,
vector storage, or a persistent derived card index.

**Complete when:** The published BioAgents card loads without semantic loss,
invalid catalogs fail deterministically, and tests preserve card, schema,
ontology, snapshot, status, confidence, Claim, Evidence, and field-state
semantics.

## PLAT-2 — Retrieval and Evidence API

**Owns:** P-01 catalog retrieval behavior

Implement:

* `GET /api/v1/catalog`
* `GET /api/v1/projects/{project_id}/cards/current`
* `GET /api/v1/projects/{project_id}/cards/{card_version}`
* `GET /api/v1/projects/{project_id}/cards/{card_version}/evidence/{evidence_id}`

Routes delegate to the catalog application service and do not synthesize card
facts. The current route selects the greatest valid retained card version.
Evidence responses resolve related Claims, the parent Source, pinned revision,
and precise locator. Repository excerpts remain inert text.

**Complete when:** OpenAPI and integration tests cover success and typed error
behavior, canonical cards round-trip exactly, and every evidence result resolves
inside the selected card and Source Snapshot.

## PLAT-3 — Deterministic Search

**Owns:** Search portion of P-03

Implement `POST /api/v1/catalog/search` over a disposable in-memory projection
rebuilt from the canonical YAML. Support stated need, controlled and tested
synonyms, structured filters for category, capability, language, license,
maturity, and architecture layer, pagination, and deterministic ordering.

Return uninterpreted terms and Claim-linked match reasons. Do not expose an
aggregate project score, treat popularity as quality, interpret unavailable
values as negative facts, or add embedding-based semantic ranking. Semantic and
vector search remain in the
[deferred backlog](../../../backlog.md#semantic-and-vector-search).

**Complete when:** Search returns reproducible corpus results, reports Source
Snapshot age and card version, and tests preserve all field states.

## PLAT-4 — Contextual Comparison

**Owns:** Catalog comparison behavior

Implement `POST /api/v1/catalog/compare` for two or three pinned card versions
and an explicit Assessment Context. Explain whether project roles are
substitutes, adjacent, or complementary before comparing capabilities.

Compare interfaces, prerequisites, constraints, capabilities, limitations,
open questions, and context-compatible assessments. Consequential cells carry
Claim and Evidence identifiers. If the cards do not support a context-specific
judgment, return `not_analyzed` instead of transferring an assessment from a
different context.

**Complete when:** Three real validated cards support one defensible comparison,
unknown states are preserved, and no output declares a universal winner.

## PLAT-5 — React HTTP Integration

**Owns:** U-01 through U-03 only for catalog access selected for the release

Align the frontend gateway with the OpenAPI contract. Capability support, Claim
verification, Evidence status, confidence, and field state remain independent
types. Add catalog context and current-card operations, pass an explicit
Assessment Context and pinned card versions to comparison, and retain a visibly
labeled static fallback.

The generated-client workflow, production routing, and production rendering
mode remain decision boundaries unless separately accepted.

**Complete when:** HTTP and static gateway adapters expose equivalent response
semantics, the selected catalog flow uses validated cards, and illustrative
fixtures remain visibly labeled when used as fallback data.

## PLAT-6 — Publication and Manual Refresh

**Owns:** Publication and refresh portions of P-02 and P-03

**Gate:** G-02 source-retention boundary and selected operator flow

Publish only cards produced through the shared preprocessing contract and
accepted by structural and semantic validation. Preserve `card_id`, assign the
next `card_version`, create a new version directory atomically, retain every
earlier version, rebuild disposable search state, and compute material card and
Claim differences.

Any request or job state needed by the selected operator flow remains separate
from the canonical card. Do not add continuous monitoring, user-submitted
repository intake, relational card projections, or on-demand public analysis.

**Complete when:** Restart, atomic publication, idempotency, concurrency,
lineage, isolation, and diff tests pass without changing the canonical card
contract.

## PLAT-7 — Quality and Safety

**Owns:** Catalog portions of S-05 and E-02

Verify safe path encoding, all-or-nothing catalog loading, source-content
inertness, cross-card reference isolation, exact status semantics, OpenAPI
contracts, HTTP/static parity, deterministic search, contextual comparison, and
any selected frontend flow.

**Complete when:** Adversarial cards cannot influence configuration, authority,
scope, HTML rendering, or another card's results, and applicable regression
checks pass through locked workflows.

## Merge Order

1. Merge PLAT-1.
2. PLAT-2 and the contract-independent parts of PLAT-3 may proceed in parallel.
3. Add the accepted comparison cards before completing PLAT-3 and starting
   PLAT-4.
4. Merge PLAT-4 after its data gate.
5. Merge PLAT-5 after the API operations used by the frontend are stable.
6. Merge PLAT-6 after its source and operator-flow gates.
7. Complete PLAT-7 across every selected packet.

## Exit Checkpoint I-3

Validated preprocessed cards are stored and loaded through the accepted
YAML-first catalog; catalog context, retrieval, evidence, deterministic search,
and contextual comparison APIs pass; selected frontend flows use the same
contract; and P2 on-demand analysis remains explicit.
