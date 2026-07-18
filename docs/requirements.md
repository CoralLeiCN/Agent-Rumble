# Requirements

This file is the canonical record of stakeholder-requested outcomes and
constraints for Agent Rumble and its underlying Agent Project Intelligence
system. Requirements are organized by topic instead of sequence-numbered
tickets. The [product specification](specification/README.md) defines the
normative behavior that satisfies them.

A requirement may mandate a technology when that choice comes from a
stakeholder, but it does not invent solution details, explain architectural
rationale, or organize delivery work. Proposed approaches belong in
[design documents](design-docs/README.md), and accepted architectural choices
belong in the [decisions record](decisions.md).

## Agent Project Card

### Goal

Create an agent that helps users understand agent-related projects.

### Project Types

The agent should support:

* Domain-specific agents
* Agent SDKs
* Repositories containing skills
* MCP projects
* Supporting repositories such as document parsers

### Project Exploration

The agent should explore the project's Git repository, documentation, and
relevant information.

### Catalog-First Discovery and Comparison

The first product experience should provide a preprocessed catalog of Agent
Project Cards for a selected set of leading public GitHub repositories made for
or used in AI systems.

Users and agents should be able to search this catalog and compare projects
directly without first providing a repository link or waiting for repository
analysis.

The catalog should help both human users and agents rapidly complete project
discovery, analysis, and trade-off decisions. It should cut through verbose,
low-signal, or AI-generated README content by prioritizing accurate,
source-evidenced project intelligence.

User-provided repository intake and on-demand Agent Project Card generation may
be delivered as a P2 feature after the catalog-first experience.

### Public Product Naming

Use **Agent Rumble** as the public product and user-interface name.

Keep **Agent Project Intelligence** as the name of the underlying system and
analysis capability. Keep **Agent Project Card** as the formal name of the
canonical artifact.

### Output

The agent should produce a standardized **Project Card**, similar in purpose to
a Model Card or Dataset Card. A more appropriate name may be recommended.

The card should describe:

* What the project is for
* The project category
* The technology stack
* Other important project details

### Downstream Uses

The Project Card should support:

* An Agent Architect that recommends existing projects for an AI use case
* Comparison of projects in the same topic and their differences
* GTM analysis of a project's positive aspects, negative aspects, and gaps
* Ecosystem trend analysis across projects, including model-provider support
  and agent SDK usage

### Repository Test Data

Provide `test-data/repos/` as the folder where downloaded GitHub repositories
can be saved and later used as test inputs for Agent Project Card creation.

Keep the downloaded repositories in that folder outside Git tracking.

## Core Tool and Access

### Specification Breakdown

The specification should clearly distinguish the product use cases from the
core Agent Project Card tool.

### Core Agent Project Card Tool

Use Codex as the harness for project analysis. The instructions for generating
an Agent Project Card should be provided by an Agent Project Card skill attached
to Codex. The first product experience should use this core tool to preprocess
the repositories included in the catalog.

### Direct Codex Session

A user should be able to create an Agent Project Card in their own Codex session
by using the attached skill. This direct, user-initiated generation mode may be
delivered as a P2 feature.

### API

Agent Project Intelligence should wrap Codex and the Agent Project Card skill
behind an API.

The first API and frontend experience should allow users and agents to search,
retrieve, and compare preprocessed cards. API support for providing a Git
repository link to create an Agent Project Card may be delivered as a P2
feature.

### Public Page Discoverability

Search-engine indexing and rich social previews for public Agent Project Card
pages may be delivered as a P2 feature. They are not required for the first
frontend release.

## Implementation Technology

### Python Tooling

Use `uv` to manage the Python part of Agent Project Intelligence.

### Agent Framework

Use the OpenAI Agents SDK to build the agent.

### Project Analysis Harness

Use Codex as the harness for analyzing projects and producing Agent Project
Cards.

### Backend Framework and Layout

Use FastAPI as the backend framework for Agent Project Intelligence and
establish a backend project layout based on FastAPI within the backend project
area.

### Application Layout

Separate the frontend and backend into top-level `frontend/` and `backend/`
project areas.

### Frontend Framework

Use React as the frontend framework for Agent Project Intelligence.

### Python Data Modeling and Configuration

* Use Pydantic with Python type annotations to define typed application data
  models.
* Use `BaseSettings` from Pydantic Settings for typed application settings.
* Use `load_dotenv()` from `python-dotenv` to load environment variables from
  `.env` files.

### Dependency Release Cooldown

When `uv` resolves registry dependencies, exclude distribution artifacts
uploaded within the previous seven days. Apply the cooldown to direct and
transitive dependencies to reduce exposure to newly published compromised
releases.

## Documentation Governance

### Documentation Structure

Organize project documentation into distinct areas for requirements, the
product specification, design documents, accepted decisions, and execution
plans. Review existing documents and place each one in the area appropriate to
its purpose.

Keep requirements in this single file and accepted architectural decisions in
the single [`decisions.md`](decisions.md) file. Organize both documents by topic
without sequence-numbered requirement or decision records. Maintain one change
log in each document.

### Documentation Area Responsibilities

Clearly document the responsibility of each documentation area so contributors
can determine where information belongs.

Make the distinction between requirements and accepted architectural decisions
explicit: requirements preserve what was requested, while decisions document
accepted architectural choices, their context, and their consequences.

Add repository rules that enforce these responsibilities, keep the source of
normative content explicit, and prevent duplication from creating competing
sources of truth.

### Requirements Workflow

Maintain structured documentation under `docs/` for tracking user requirements.
Update the relevant topic in this file and the corresponding product
specification in the same change. Record the update in the single change log
below instead of creating a separate ticket.

### Writing

Rephrase user requirements into a clearer, more structured form before
recording them.

The rephrased requirement should preserve what the user specified without
adding new requirements, constraints, assumptions, or details.

Use the same clear, structured writing approach in chat. The writing guideline
should contain only the points the user specifically requested and should not
add extra writing rules.

## Change Log

| Date | Topic | Change |
| --- | --- | --- |
| 2026-07-18 | Public product naming | Selected Agent Rumble as the public product and UI name while retaining Agent Project Intelligence for the underlying system and Agent Project Card for the canonical artifact. |
| 2026-07-18 | Public page discoverability | Deferred search-engine indexing and rich social previews for public Agent Project Card pages to P2. |
| 2026-07-18 | Catalog-first discovery and comparison | Clarified that the product accelerates discovery, analysis, and trade-off decisions for humans and agents by prioritizing accurate source evidence over low-signal or AI-generated README content. |
| 2026-07-18 | Catalog-first discovery and comparison | Prioritized search and comparison across preprocessed cards for selected leading AI-related public GitHub repositories; deferred user-provided repository intake and on-demand analysis to P2. |
| 2026-07-18 | Agent Project Card | Shortened the downloaded repository test-data path to `test-data/repos/`. |
| 2026-07-18 | Agent Project Card | Required the downloaded repository test-data folder to remain outside Git tracking. |
| 2026-07-18 | Agent Project Card | Added a repository test-data location for downloaded GitHub repositories used to test Agent Project Card creation. |
| 2026-07-18 | Documentation governance | Consolidated the existing requirements into this topic-organized record, replaced sequence-numbered tickets with heading-based links, and established this single change log. |
| 2026-07-18 | Implementation technology | Required separate top-level frontend and backend project areas. |
