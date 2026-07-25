# Deferred Backlog

**Status:** Deferred

This file records capabilities and implementation work that stakeholders want
but have deliberately postponed. A backlog entry records deferred delivery; it
does not replace its source requirement or accepted architecture decision, does
not expand the MVP, and does not authorize implementation.

When an entry is prioritized, update its source requirement, the product
specification, any required architecture decision, and the applicable execution
plan before implementation begins.

## Agent Project Card Authoring

### Schema-Driven Agent Project Card Editor

**Delivery:** Future

Provide a schema-driven editor for Agent Project Cards after the metadata,
fields, filters, and file behavior have been discussed and specified.

**Source:** [Deferred Card Authoring requirement](requirements.md#deferred-card-authoring)

## Public Card Pages

### Public Page Discoverability

**Delivery:** P2

Add search-engine indexing and rich social previews for public Agent Project
Card pages. This may use prerendering or server-side rendering without changing
the canonical card or frontend information model.

**Source:** [Public Page Discoverability requirement](requirements.md#public-page-discoverability)

## Search and Retrieval

### Semantic and Vector Search

**Delivery:** Post-MVP

Add embedding-based semantic search after the YAML-first catalog demonstrates a
need for meaning-based retrieval beyond basic keyword search and structured
filters. A future vector index remains a derived projection of the canonical
Agent Project Card, records its source card and embedding version, and is
rebuildable without changing the stored `project-card.yaml` files.

Before selecting an embedding model, vector database, or relevance threshold,
evaluate hybrid keyword and vector ranking against a representative query set.

**Sources:**
[Agent Project Card Service and Storage requirement](requirements.md#agent-project-card-service-and-storage)
and [YAML-First Card Catalog decision](decisions.md#yaml-first-card-catalog)

## Frontend Validation

### Playwright-Based Browser Testing

**Delivery:** Later stage

Evaluate the intended real-browser and end-to-end validation scenarios after
the Vitest frontend suite is established. First determine whether Codex's
bundled Browser plugin or an optionally configured Playwright MCP server
provides the required development-time browser validation.

If repeatable repository-owned or continuous-integration browser regressions
are required, evaluate adding Playwright Test as a separate frontend test layer.
Keep Codex browser tooling distinct from committed automated tests and
dependencies.

**Sources:**
[Frontend Test Framework requirement](requirements.md#frontend-test-framework)
and [Vitest Frontend Testing decision](decisions.md#vitest-frontend-testing)
