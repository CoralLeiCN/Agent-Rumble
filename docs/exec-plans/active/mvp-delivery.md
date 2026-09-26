# MVP Delivery

**Status:** Active

**Updated:** 2026-09-26

This plan covers remaining delivery and validation work for the existing
[MVP scope](../../specification/06-mvp-scope-and-evaluation.md#19-mvp-scope).
It does not select unresolved product or architecture choices.

## Implemented Baseline

The local FastAPI and React application supports catalog discovery, shared-context
comparison, canonical evidence, Rumble and arcade play, public GitHub generation,
stored draft retrieval/refresh, and explicit operator publication.
The [architecture](../../architecture.md) describes those boundaries, and the
[QA inventory](../../qa/feature-inventory.md) records available interfaces and
regression evidence. Development setup and commands belong in the
[developer guide](../../development.md).

## Remaining Implementation

### Canonical Rumble Advantages

Canonical rounds currently remain inconclusive. Connect contextual advantages
to the same canonical assessments used by standard comparison, with an exact
Assessment Context and pinned claims/evidence. Insufficient evidence or a role
mismatch must remain inconclusive or a trade-off. Trait themes must preserve
equal gameplay budgets and never create a universal project winner.

**Complete when:** Canonical advantageous, trade-off, and inconclusive cases
have regression coverage; each themed move traces to its recorded assessment.

**Source:** [Rumble Arena](../../requirements.md#rumble-arena) and
[comparison behavior](../../specification/05-system-behavior-and-quality.md#comparison).

### Refresh and Change Tracking

Publication reports changed JSON paths. Remaining work is historical card/claim
comparison, material repository-change reporting, and section/evidence staleness
under the recorded source snapshots. Preserve immutable card versions and the
distinction between an old analysis date and demonstrated stale evidence.

**Complete when:** Reviewers can inspect material differences and their evidence
between retained snapshots; regression cases cover unchanged, changed, and
unavailable evidence.

**Source:** [Refresh and change tracking](../../specification/05-system-behavior-and-quality.md#refresh-and-change-tracking).

### Source Revision Selection

The service accepts default HEAD or a full commit hash. Extend the API to
accept branch and tag references while resolving and recording an immutable
commit before analysis. Preserve anonymous acquisition and source-identity
validation.

**Complete when:** Branch/tag selection has reproducible snapshot and invalid
reference tests under the [repository analysis specification](../../specification/05-system-behavior-and-quality.md#repository-analysis).

## Validation

### Browser and User Validation

Run the catalog, comparison, evidence, generation, and arcade cases in the
[QA test plan](../../qa/test-plan.md). Check approximately 390, 768, and 1280 CSS
pixels, 200% zoom, keyboard navigation, reduced motion, touch controls, and
fullscreen behavior. Verify evidence focus handling and that catalog requests
do not invoke generation or substitute fixtures. Measure arcade loading and
record user findings.

**Complete when:** The browser cases have recorded results, reproducible
findings are resolved or explicitly accepted, and required actions and canonical
fields remain reachable. Passing jsdom tests alone does not close this work.

### Live Generation

Run public source intake through an operator-configured provider, validate the
returned card, and exercise restart retrieval, manual refresh, cancellation,
and explicit publication using disposable storage. Review source identity,
boundary, claims, provenance, and cleanup. Record acquisition timeouts as failed
attempts rather than successful generation.

**Complete when:** A successful live-provider run and the applicable generation
QA cases have retained evidence. Mock-provider tests establish regression
behavior but do not replace this check.

## Product and Release Decisions

| Work | Dependency | Completion evidence |
| --- | --- | --- |
| Production catalog and evaluation | [Cohort/source scope](../../open-decisions.md#product-and-source-scope) and [evaluation protocol](../../open-decisions.md#mvp-evaluation-protocol) | Pinned representative Python/TypeScript corpus covering applications, frameworks/SDKs, skills, MCP, and supporting projects; rubric, reviewers, denominators, and results. Development cards alone do not establish acceptance. |
| Broader source intake | [Source scope](../../open-decisions.md#product-and-source-scope) and [delivery scope](../../open-decisions.md#delivery-scope) | Recorded multi-repository and linked-source boundaries before extending the current single-repository service. |
| Classification status and ontology promotion | [Metadata decisions](../../open-decisions.md#agent-project-card-metadata-behavior) | Accepted semantics and a deliberately versioned schema/ontology change with fixtures and validation; existing card versions retain their recorded meaning. |
| Production frontend | [Frontend architecture](../../open-decisions.md#frontend-architecture) | Accepted rendering, routing, and UI/build choices plus browser validation; current Vite, local state, CSS, and Phaser choices remain reversible. |
| Public generation service | [Public service deployment](../../open-decisions.md#public-service-deployment) | Hosting, access controls, provider operation, request limits, durable storage/backups, retention, and worker/reload coordination selected and validated. |
| Public plugin publication | [Publication inputs](../../open-decisions.md#marketplace-publication-inputs) | Final bundle passes the [submission checks](../../../.agents/plugins/agent-project-card/SUBMISSION.md) and marketplace publication is verified. |

Deferred capabilities remain in the [backlog](../../backlog.md). Further
analyzer decomposition or scaling requires an accepted architecture decision.

## Completion

Run the applicable locked quality checks, retain manual and live-provider
results in the QA record, and map evidence to the
[MVP acceptance criteria](../../specification/06-mvp-scope-and-evaluation.md#20-mvp-acceptance-criteria).
Keep unmet criteria and unresolved decisions explicit. This plan remains active
until its required delivery and validation work is complete or the stakeholder
records a scope change.
