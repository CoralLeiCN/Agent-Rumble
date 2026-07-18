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

### Project Card Schema Baseline

Use the stakeholder-provided **Agent Project Card Schema v0.1** as the normative
starting point for `project-card.yaml` and for the Agent Project Card skill.

The schema organizes the card into project identity and revision, summary,
classification, capabilities, architecture, components, usage, assessment,
relationships, open questions, and evidence. It defines these initial
controlled values:

* Primary type: `agent_application`, `agent_framework_sdk`,
  `agent_harness_runtime`, `agent_tool_mcp`, or `agent_skill`
* Confidence: `high`, `medium`, `low`, or `unknown`
* Evidence status: `confirmed`, `documented_only`, `inferred`, or `not_found`
* Maturity: `experimental`, `early`, `established`, `mature`, or `unclear`
* Project status: `active`, `maintenance`, `archived`, or `unclear`
* MCP role: `none`, `client`, `server`, `both`, or `unclear`

Record the exact analyzed revision when Git metadata is available. Do not guess
unavailable identity values; the v0.1 baseline directs the author to represent
them as empty strings. In v0.1, `project.primary_type` describes the repository
itself, while supporting services used by it belong under `architecture` or
`relationships`. Capture user-meaningful capabilities rather than implementation
trivia, connect capabilities to evidence unless their evidence status is
`not_found`, and record only direct, architecturally meaningful technologies.
Base maturity on repository evidence rather than popularity.

### Card Versioning

Every canonical Agent Project Card must include an explicit version number so
its evolution can be tracked. Versions of the same card must remain
distinguishable, and the card version must remain separate from both the card
schema version and the analyzed project's release or package version.

### Card Summary Template

Include a repository-local template for a human-readable Card Summary generated
only from a validated canonical Agent Project Card. The summary should identify
its source card and source snapshot, keep capability support and verification
distinct, preserve explicit unavailable-value states, state the Assessment
Context, and retain traceability to claims, evidence, and sources.

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

Use Codex heavily as the core harness for project analysis. The instructions
for generating an Agent Project Card should be provided by an Agent Project
Card skill attached to Codex. The first product experience should use this core
tool to preprocess the repositories included in the catalog.

### Tool Delivery

Provide tools as skills and as services. Support a Codex plugin first for skill
delivery. Both forms should leverage Codex as the core harness.

### Repository-Local Skill

Version the Agent Project Card skill as part of the Agent Project Intelligence
repository so the direct Codex session and API use the same reviewed skill
artifact.

### Marketplace Distribution

Publish the Agent Project Card skill to the public Codex marketplace so users
can discover, install, and reuse it outside the Agent Project Intelligence
repository.

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

### Agent Project Card Service and Storage

Agent Project Intelligence should store generated Agent Project Cards so they
can be provided through an Agent Project Card service.

The first implementation should store, retrieve, and search validated canonical
`project-card.yaml` files directly. It should not depend on embeddings or a
vector store. Vector-based semantic search should remain in the backlog.

### Public Page Discoverability

Search-engine indexing and rich social previews for public Agent Project Card
pages may be delivered as a P2 feature. They are not required for the first
frontend release.

## Frontend Experience

### Canonical Card Field Coverage

The decision and comparison experience should make every field defined by the
current canonical Agent Project Card data contract available for inspection.

The available field set should be derived from the current card contract and
card data rather than from a final user-interface design or mock fixture. As
teammates add card data or extend the canonical contract with fields, the
experience should make that data and those fields available.

### Customer-Facing Presentation

The website prototype should present only customer-facing product information.
Remove hackathon, implementation, project-infrastructure, and internal review
language, and use terms that customers can understand in search results and
comparison views.

### Compact Comparison Hierarchy

The comparison experience should be compact and avoid duplicate information.
Group fields into understandable sections, identify their presentation
priority, show the highest-priority fields first, and keep the remaining fields
available in collapsed lists. Technical metadata such as schema version and
card identifier should not appear as standalone sections.

### Visual Refinement

The Agent Rumble website should apply the referenced Apple design principles to
improve its visual polish. Interpreted-requirement pills should have balanced
left padding, and the “Three projects for review” heading should use more
relaxed character spacing.

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

### Project Stories and Build Notes

Maintain one repository-local notes document focused on the project's building
stories and how the project is built.

Treat the document purely as notes.

### Deferred Backlog

Maintain a dedicated backlog for requested capabilities and implementation work
that stakeholders explicitly defer. Keep this backlog separate from active MVP
delivery and from broader possible roadmap directions. A backlog entry records
deferred delivery without replacing its source requirement or accepted
architecture decision.

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

Do not add content beyond what the user asked to write.

## Change Log

| Date | Topic | Change |
| --- | --- | --- |
| 2026-07-18 | Frontend experience | Required customer-facing product language and a compact comparison hierarchy that groups fields, prioritizes the most useful details, collapses the remainder, removes duplication, and avoids standalone sections for card and schema identifiers. |
| 2026-07-18 | Frontend experience | Required the decision and comparison experience to make every current canonical card field available, derive field coverage from the card contract rather than UI mocks, and stay aligned as card data and fields evolve. |
| 2026-07-18 | Core tool and access | Required tools to be provided as skills and services, with a Codex plugin supported first and Codex used heavily as the core harness. |
| 2026-07-18 | Documentation governance | Required writing to contain only the content the user requested. |
| 2026-07-18 | Documentation governance | Required one notes document focused on the project's building stories and how the project is built. |
| 2026-07-18 | Documentation governance | Added a dedicated backlog for explicitly deferred work, separate from active MVP delivery and broader possible roadmap directions. |
| 2026-07-18 | Agent Project Card service and storage | Selected direct use of validated `project-card.yaml` files for the first implementation and deferred vector-based semantic search to the backlog. |
| 2026-07-18 | Agent Project Card service and storage | Required generated Agent Project Cards to be stored so Agent Project Intelligence can provide them through a service. |
| 2026-07-18 | Core tool and access | Required publication of the Agent Project Card skill to the public Codex marketplace for discovery, installation, and reuse outside this repository. |
| 2026-07-18 | Agent Project Card | Required every canonical card to carry a distinct card version for tracked evolution, separate from schema and project release versions. |
| 2026-07-18 | Agent Project Card | Required a repository-local Card Summary template derived from the validated canonical card with snapshot, status, field-state, assessment-context, and evidence traceability preserved. |
| 2026-07-18 | Core tool and access | Required the Agent Project Card skill to be versioned as part of the Agent Project Intelligence repository. |
| 2026-07-18 | Agent Project Card | Added the stakeholder-provided schema v0.1 as the normative starting point for `project-card.yaml` and the Codex skill, including its sections, controlled values, evidence expectations, and maturity guidance. |
| 2026-07-18 | Frontend visual refinement | Requested Apple-design principles, balanced left padding in interpreted-requirement pills, and more relaxed character spacing in the review heading. |
| 2026-07-18 | Public product naming | Selected Agent Rumble as the public product and UI name while retaining Agent Project Intelligence for the underlying system and Agent Project Card for the canonical artifact. |
| 2026-07-18 | Public page discoverability | Deferred search-engine indexing and rich social previews for public Agent Project Card pages to P2. |
| 2026-07-18 | Catalog-first discovery and comparison | Clarified that the product accelerates discovery, analysis, and trade-off decisions for humans and agents by prioritizing accurate source evidence over low-signal or AI-generated README content. |
| 2026-07-18 | Catalog-first discovery and comparison | Prioritized search and comparison across preprocessed cards for selected leading AI-related public GitHub repositories; deferred user-provided repository intake and on-demand analysis to P2. |
| 2026-07-18 | Agent Project Card | Shortened the downloaded repository test-data path to `test-data/repos/`. |
| 2026-07-18 | Agent Project Card | Required the downloaded repository test-data folder to remain outside Git tracking. |
| 2026-07-18 | Agent Project Card | Added a repository test-data location for downloaded GitHub repositories used to test Agent Project Card creation. |
| 2026-07-18 | Documentation governance | Consolidated the existing requirements into this topic-organized record, replaced sequence-numbered tickets with heading-based links, and established this single change log. |
| 2026-07-18 | Implementation technology | Required separate top-level frontend and backend project areas. |
