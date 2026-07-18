# Deferred Backlog

**Status:** Deferred

This file records capabilities and implementation work that stakeholders want
but have deliberately postponed. A backlog entry records deferred delivery; it
does not replace its source requirement or accepted architecture decision, does
not expand the MVP, and does not authorize implementation.

When an entry is prioritized, update its source requirement, the product
specification, any required architecture decision, and the applicable execution
plan before implementation begins.

## Repository Analysis Access

### On-Demand Repository Analysis

**Delivery:** P2

Allow a user to provide a public Git repository in a direct Codex session or
through the API and frontend, then generate an Agent Project Card on demand.
This remains deferred behind the catalog-first MVP.

**Source:** [Core Tool and Access requirements](requirements.md#core-tool-and-access)

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
