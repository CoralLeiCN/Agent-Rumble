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

The backend analysis package invokes Codex directly through the Python SDK and
attaches the shared Agent Project Card skill. The application snapshots text
from immutable Git blobs at the checkout's full HEAD commit. A bounded source
adapter exposes listing, text reading, literal search, and trusted skill
references. Source symlinks and submodules are never followed.

Codex runs in an ephemeral private directory with a clean environment and a
filesystem policy that denies host reads and writes. Shell execution and other
executable tool surfaces are disabled. Only the selected provider configuration
and authentication are imported from operator settings. These boundaries are
covered by an adversarial local mock-provider regression test.

The model returns YAML to the application. The shared canonical parser rejects
duplicate keys, aliases, excessive nesting, excessive nodes, and oversized files.
The adapter binds the commit to the requested repository's source ID, enforces
static-only claim and capability statuses, records non-secret provenance, and
validates the result before returning a draft. Temporary data is cleaned on all
exits. Publication and a public generation route remain separate work.

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

The frontend pages through API search summaries and loads complete cards only
for comparison and evidence. Its cache and comparison references pin project
identity and card version; evidence requests also carry the claim ID.
It projects canonical card data without defining a separate card model, exposes
supporting evidence, and includes the Rumble Arena comparison and arcade
experience. Only the prepared Rumble Arena demo has a bundled fallback; catalog discovery
and comparison use the backend exclusively.

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
