# Architecture

This document summarizes the architecture implemented in this repository. The
[product specification](specification/README.md) defines product behavior, the
[system design](design-docs/system-design.md) describes proposed technical
approaches, and the [architecture decisions](decisions.md) record accepted
choices.

## System Overview

```text
Public project repositories
          │
          ▼
Direct Codex SDK adapter + Agent Project Card skill
          │
          ├── provider-configurable Codex runtime
          ├── validates project-card.yaml against the packaged schema
          ▼
Generated cards in project-cards/
          │
          ├── reviewed and published into the versioned catalog
          ▼
catalog/cards/{card_id}/versions/{card_version}/project-card.yaml
          │
          ▼
FastAPI catalog API
          │
          ▼
React Agent Rumble experience
          ├── search and shortlist
          ├── contextual comparison and evidence inspection
          └── Rumble Arena
```

## Components

### Agent Project Card Skill

The Codex skill in
[`plugins/agent-project-card/`](../plugins/agent-project-card/) defines the
static repository-analysis workflow, safety boundaries, card schema, summary
template, and deterministic validator. Codex can run the skill in parallel for
different projects, with generated cards stored under
[`project-cards/`](../project-cards/).

### Card Generation Workflow

The backend analysis package invokes Codex directly through the Python Codex
SDK. The adapter reads the authoritative application request, attaches the
repository-local Agent Project Card skill, and starts an ephemeral thread in
the scoped repository workspace with approvals denied and static-analysis
instructions.

The Codex model and provider use one settings group and may target a compatible
localhost endpoint. The adapter safely parses `project-card.yaml`, binds its
repository and revision to the request, records non-secret request and runtime
configuration in its Source Snapshot, and returns success only after structural
and semantic validation. It does not publish generated cards or expose a public
generation route yet.

### Versioned Card Catalog

Reviewed cards are published as canonical YAML artifacts under
[`catalog/cards/`](../catalog/cards/). Each retained card version has its own
path so card history, schema versions, project releases, and analyzed source
snapshots remain distinct.

### FastAPI Backend

The backend loads and validates the complete YAML catalog at startup. Its API
supports catalog context, deterministic search, card retrieval, contextual
comparison, and claim-level evidence retrieval. The catalog routes do not yet
implement on-demand card generation.

### React Frontend

The frontend uses the catalog API to search, shortlist, and compare projects.
It projects canonical card data without defining a separate card model, exposes
supporting evidence, and includes the Rumble Arena comparison and arcade
experience. Bundled sample data is available only as a clearly labeled demo
fallback.

## Architectural Boundaries

* The versioned `project-card.yaml` artifact is the canonical source of project
  intelligence.
* Card summaries, search results, comparisons, evidence views, and Rumble Arena
  are projections of canonical cards.
* Repository analysis is static; untrusted project code is not executed by
  default.
* Generated cards in `project-cards/` are working outputs. The backend serves
  reviewed cards from the separate versioned `catalog/cards/` structure.
* Proposed changes belong in design documents. Accepted architecturally
  significant changes belong in the architecture decisions record.
* Model-provider settings are operator-controlled. Repository content cannot
  select endpoints, providers, credentials, or models.
