# Our Build Stories

These notes describe how Agent Rumble and Agent Project Intelligence are being
built. They are not a source of product requirements, specifications, or
architecture decisions.

## Start With the Canonical Artifact

The project began with the **Agent Project Card**: a standardized, versioned,
evidence-backed description of an agent-related software project. Starting with
the machine-readable artifact established one contract for analysis, storage,
search, comparison, and human-readable views.

## Use Codex as the Analysis Harness

Codex is the project-analysis harness. The repository-local Agent Project Card
skill supplies the reviewed analysis workflow, safety boundaries, schema,
summary template, and validation tools. Keeping those instructions in one skill
allows direct Codex use and service-based generation to share the same
card-generation capability.

## Package the Tool for Reuse

The Agent Project Card skill is packaged as a Codex plugin so it can be
installed and used outside this repository. Marketplace publication remains
separate from the repository implementation and is tracked by the applicable
delivery work.

## Build a Shared Catalog

Generated cards are reviewed and published into a versioned YAML catalog.
FastAPI loads the canonical cards and exposes catalog context, retrieval,
search, comparison, and evidence operations without turning API projections
into another source of truth.

## Project the Cards Into Agent Rumble

The React frontend uses the catalog API for discovery, shortlisting,
comparison, and evidence inspection. Rumble Arena adds a playful comparison and
arcade experience while keeping its game outcome separate from project
assessment.

## Continue Through the Same Contract

Hosted on-demand card generation remains delivery work. It should invoke the
same Codex-powered skill and produce the same validated Agent Project Card
rather than defining a separate analysis path or artifact.
