# Product Overview

Part of the [Agent Rumble product specification](README.md).

## 1. Executive Summary

**Agent Rumble** is the public product experience for **Agent Project
Intelligence**, an AI-powered system that explores, understands, and describes
software projects related to AI agents.

The system can analyze repositories for:

* Domain-specific agents
* Agent frameworks and SDKs
* Agent skills and tool libraries
* Model Context Protocol servers and clients
* Retrieval and knowledge systems
* Document parsers and ingestion pipelines
* Evaluation, observability, memory, orchestration, and security components
* Supporting infrastructure used to build agent applications

The system explores a project’s source code, documentation, configuration, examples, dependency files, issues, releases, and other relevant information. It then creates a standardized **Agent Project Card** analogous to a Model Card or Dataset Card.

The card explains what the project does, how it works, what category it belongs to, how mature it is, where it fits in an agent architecture, and what its strengths, limitations, risks, and likely use cases are. It is a versioned collection of traceable claims, not merely an AI-generated repository summary.

These cards become a reusable knowledge layer for downstream products such as:

* An Agent Architect that recommends projects for a business use case
* A comparison tool for similar agent projects
* A technology landscape or market map
* A gap-analysis tool
* A build-versus-buy assessment
* A go-to-market analysis tool
* An agent solution-design assistant
* A repository due-diligence system

The first product experience is a preprocessed catalog of cards for a selected
set of leading public GitHub repositories made for or used in AI systems. Users
and agents search and compare this catalog without waiting for a new repository
analysis. The Agent Project Card tool is also available as a published skill
packaged as a Codex plugin for use in a user's own coding-agent workflow and as
a hosted web service that generates a card from a user-provided public GitHub
repository link.

---

## 2. Problem Statement

Information about agent-related projects is fragmented across README files, source code, examples, documentation sites, package metadata, blog posts, issues, and release notes.

A README alone is usually insufficient to determine:

* What the project actually does
* Whether it is an application, framework, SDK, skill, tool, MCP server, or supporting component
* Which parts are implemented versus planned
* How it fits into an agent system
* Which models, frameworks, protocols, and infrastructure it supports
* Whether the project is production-ready
* What its architectural assumptions are
* How it differs from similar projects
* What use cases it is best suited for
* What limitations or gaps may affect adoption

Builders increasingly ask AI assistants to read and explain repositories, but
each request still starts a fresh exploration whose scope, evidence standards,
and comparison basis may vary. AI-generated or otherwise verbose, low-signal
documentation can be repeated as fact when it is not checked against source,
configuration, examples, and tests. Repeating that work across candidate
projects is slow, inconsistent, and difficult to reuse at scale for either a
human or another agent.

Agent Project Intelligence addresses this problem by preprocessing structured,
evidence-backed representations that humans and agents can search and compare
immediately. It accelerates discovery, analysis, and contextual trade-off
decisions without replacing uncertainty with unsupported certainty.

---

## 3. Product Vision

Create a continuously improving intelligence layer for the agent ecosystem.

The platform should make an unfamiliar agent-related project understandable within minutes and comparable with other projects using a common schema.

Over time, the platform should become a trusted system for answering questions such as:

* What does this project do?
* Where does it fit in an agent architecture?
* Is it appropriate for my use case?
* What would I need to integrate it?
* How mature and maintainable is it?
* What are its strengths and weaknesses?
* Which similar projects should I consider?
* What important capabilities are missing?
* Which projects can be combined into a complete solution?

---

## 4. Goals

### 4.1 Primary Goals

1. Analyze agent-related software repositories with minimal manual input.
2. Generate a consistent Agent Project Card for each project.
3. Ground material card claims in source evidence.
4. Support projects that are not themselves agents but are important to agent systems.
5. Normalize information across different languages, frameworks, repository structures, and documentation styles.
6. Enable project discovery, recommendation, comparison, and gap analysis.
7. Produce both human-readable and machine-readable outputs.

### 4.2 Secondary Goals

1. Track how projects change over time.
2. Identify relationships between projects.
3. Extract reusable capabilities and architectural patterns.
4. Detect inconsistencies between documentation and implementation.
5. Estimate project maturity and adoption readiness.
6. Build an ontology for the agent technology ecosystem.

### 4.3 Requirements and Traceability

[`requirements.md`](../requirements.md) is the canonical requirements record.
Requirements are organized by topic in that single file, and this specification
describes the product response to them.

Before user input is recorded, it must be rephrased into a clearer, more structured form. The rephrased version must preserve what the user specified without adding new requirements, constraints, assumptions, or details.

Chat must use the same structured writing approach. The shared [`Writing Guidelines`](../writing_guidelines.md) must not introduce writing rules that the user did not specifically request.
Written content must not go beyond what the user asked to write.

Each documentation area has one responsibility:

* The topic-organized requirements record preserves requested outcomes and
  constraints.
* The product specification defines the normative behavior that satisfies those
  requirements.
* Design documents describe proposed implementation approaches.
* The topic-organized architecture decisions record documents accepted
  architectural choices, their context, and their consequences.
* Execution plans organize delivery work.
* The repository-local project stories and build notes document explains the
  project's building stories and how the project is built. It is notes only.
* The deferred backlog records requested capabilities and implementation work
  that stakeholders have deliberately postponed, without replacing their source
  requirements or decisions.
* The roadmap records broader possible future directions that are not active
  requirements or explicitly deferred commitments.

When a requirement mandates a technology, the requirement remains the source of
that constraint. An architecture decision may reference the mandate as context
and focus on its architectural consequences and related choices; it must not
present the mandate as independently created product scope.

The requirements record and the specification must be updated together when
scope or intent changes. Requirements and architecture decisions use stable
topic headings instead of sequence numbers. Each of those two records maintains
one change log for its updates.

---

## 5. Non-Goals

The initial version will not:

* Guarantee that a project is secure
* Execute untrusted repository code by default
* Replace a full security audit
* Replace legal review of licenses or intellectual property
* Automatically deploy a project into production
* Generate a complete application architecture without downstream reasoning
* Rank projects using popularity alone
* Treat README claims as verified facts
* Make definitive commercial or investment recommendations

The platform may surface evidence and indicators for these areas, but final decisions remain with the user.

---

## 6. Target Users

### AI and Agent Architects

Need to identify components that can satisfy a business or technical use case.

### Developers and Engineering Leads

Need to understand an unfamiliar repository before evaluating or integrating it.

### Product Managers

Need to understand capabilities, maturity, constraints, and competitive differences.

### Technical Researchers and Analysts

Need to map the agent ecosystem and compare related projects.

### Solutions and Go-to-Market Teams

Need to identify the strengths, weaknesses, positioning, and gaps of a project.

### Investors and Technology Scouts

Need a repeatable first-pass assessment of agent-related projects.

### Internal AI Platform Teams

Need to maintain a catalog of approved, evaluated, or reusable agent components.

---

## 7. Core Tool and Use Cases

Agent Project Intelligence separates the tool that produces an Agent Project Card from the use cases that consume one or more cards.

### Core Agent Project Card Tool

The core tool combines:

* Codex as the heavily used core project-analysis harness
* An Agent Project Card skill attached to Codex, containing the instructions for generating the card
* The canonical Agent Project Card and its generated human-readable views as the outputs

The tool is provided in two forms. The Agent Project Card skill is published as
a Codex plugin that users can integrate into their own coding-agent workflow.
Agent Project Card as a Service is a hosted web service that accepts a public
GitHub repository link and generates a card. Both forms use Codex as the core
harness.

The core tool supports three usage modes:

| Usage mode | How the user starts card generation | Role of Agent Project Intelligence |
| --- | --- | --- |
| Catalog preprocessing | An operator-managed process selects a repository in the catalog cohort. | Codex and the skill analyze the declared project boundary and produce the canonical card before a user searches for it. |
| Skill and Codex plugin | The user invokes the Agent Project Card skill in their own coding-agent workflow. | The skill guides Codex to analyze the declared project and create the card. |
| Agent Project Card as a Service | The user provides a public GitHub repository link to the hosted web service. | The service starts the same Codex-powered card-generation capability for the repository. |

The frontend and public API search, retrieve, and compare preprocessed cards.
Agent Project Card as a Service also accepts a public GitHub repository link and
requests card creation. The frontend is an access layer and does not define a
separate card or comparison model.

Every card-generation mode must produce the same canonical artifact and apply
the same project-boundary, source-snapshot, claim, evidence, confidence,
verification, schema, and validation rules.

### Catalog-First Access

The initial catalog contains preprocessed cards for a declared cohort of leading
public GitHub repositories made for or used in AI systems. “Leading” describes
cohort selection, not a universal quality score. The cohort definition and
selection criteria must be recorded, and popularity must not be treated as a
proxy for project quality.

Users and agents can:

* Search for projects by a stated need or structured project attributes
* Inspect an individual card and its evidence
* Shortlist relevant projects
* Compare selected projects under an explicit assessment context

Search and comparison operate on source snapshots rather than live repository
state. The interface must expose the analyzed revision and card age so users can
judge whether refresh is needed.

### Use-Case Breakdown

| Use case | Scope | Relationship to the core tool |
| --- | --- | --- |
| Search the project catalog | Initial product access | Retrieves preprocessed cards that match the user's stated need or structured filters. |
| Understand a single project | Core card consumption | Presents one preprocessed Agent Project Card and its evidence. |
| Compare similar projects | Initial product access | Consumes selected preprocessed cards under an explicit comparison context. |
| Recommend projects for a use case | Downstream use | Retrieves and assesses cards against stated requirements. |
| Perform ecosystem gap analysis | Downstream use | Uses cards to identify missing capabilities relative to an explicit context. |
| Support technical due diligence | Card creation and downstream assessment | Uses evidence-backed card data to support a first-pass assessment. |
| Maintain an internal project catalog | Downstream use | Indexes and retrieves cards. |
| Analyze ecosystem trends | Downstream use | Aggregates comparable cards across a declared cohort and time range. |

### 7.1 Understand a Single Project

A user selects a project returned by catalog search and inspects its preprocessed
Agent Project Card. The card identifies the declared project boundary, source
snapshot, evidence, confidence, and unresolved questions. A user may also
provide a public GitHub repository link to Agent Project Card as a Service or
invoke the skill in their own coding-agent workflow to generate a card.

### 7.2 Compare Similar Projects

A user selects multiple catalog projects and states the use case or requirements
that make the comparison meaningful. The system compares their purpose,
capabilities, architecture, maturity, integration requirements, strengths,
weaknesses, and gaps using their recorded source snapshots.

The decision and comparison experience makes every field defined by the current
canonical Agent Project Card contract available for inspection. Its field
coverage follows the current versioned contract and selected card data rather
than a fixed field list taken from a user-interface design or mock fixture, so
new card data and contract fields remain available as the card evolves.

### 7.3 Recommend Projects for a Use Case

A downstream Agent Architect receives a use-case description and retrieves relevant project cards.

For example:

> Build an internal agent that reads contracts, extracts obligations, and creates follow-up tasks.

The system may recommend:

* A document ingestion project
* A document parser
* A retrieval framework
* An agent orchestration framework
* A task-management connector
* An evaluation framework

### 7.4 Perform Ecosystem Gap Analysis

The system identifies missing capabilities across an architecture or project category.

### 7.5 Support Technical Due Diligence

The system summarizes architecture, dependencies, maintenance activity, extensibility, license, risks, and adoption considerations.

### 7.6 Maintain an Internal Project Catalog

An organization can build a searchable inventory of approved agent projects, internal repositories, and external dependencies.

### 7.7 Analyze Ecosystem Trends

A downstream analysis can aggregate a declared collection of Agent Project Cards to identify trends such as model-provider support, agent SDK usage, technology adoption, and capability growth or decline.

Every trend result should identify its project cohort, source snapshots or time range, metric definition, denominator, data completeness, and supporting card records. Unknown or unanalyzed fields must not be treated as evidence that a technology or capability is absent. Claims about change over time require comparable cards from multiple source snapshots.

### 7.8 Rumble Arena

Rumble Arena is a playful projection of the standard two-project comparison.
The user selects two projects from the preprocessed catalog and supplies or
confirms the Assessment Context. The system groups decision-relevant
differences into themed rounds such as capabilities, integration, operations,
and evidence.

Rumble Arena must include an arcade game mode that the user actively plays. In
that mode, player input controls play and changes the match state. Game-themed
styling, animation, or a sequence of ordinary comparison screens does not by
itself constitute the arcade game mode.

The arcade mode must present the match in a classic 2D versus-fighter style.
Each fighter must display its project's public name as the fighter name, and
the match interface must show a health bar for each fighter.

Fighters must use human-looking character designs and visibly move their bodies
during play. The implementation should reuse an existing or open-source
character design where one is available. The arena must offer a user-initiated
fullscreen option as well as its embedded presentation.

Each fighter must have a distinct attack set themed around a contextual winning
trait assigned to that project in the prepared comparison-sheet projection.
The attack theme must remain traceable to the applicable comparison trait and
Assessment Context. A trait-derived move is a presentation and gameplay
identity for the fighter; it is not a new project claim, a replacement for the
canonical comparison, or evidence that the project is universally better.

Contextual verdicts, evidence quantity, confidence, verification status, and
null states must not automatically determine a fighter's health, attack damage,
reach, speed, or likelihood of winning. Combat tuning must preserve a playable
match without presenting a contextual comparison advantage as an automatic
power advantage.

Each round must:

* Preserve the two source snapshots and project-role relationship
* Show the applicable requirement or constraint
* Preserve each project's value or exact null state
* Link material findings to claims and expose confidence and verification status
* Describe an advantage only within the declared Assessment Context
* Use an inconclusive or trade-off result when the evidence does not justify an advantage

An arcade match may produce a gameplay win, loss, or draw according to player
actions and the game rules. Player actions, transient match state, and the
gameplay result are entertainment state rather than claims or assessments about
the projects. The gameplay result must not alter either canonical Agent Project
Card, establish a contextual advantage, or be presented as evidence that one
project is better than the other.

The evidence-backed comparison does not total contextual round results, compute
a project power level, or declare a universal project winner. The user may
record a contextual preference, but that choice is not written back to either
canonical Agent Project Card.

---

## 8. Product Terminology

### Project

A logical software product, component, service, or system relevant to building, operating, evaluating, or supporting an AI agent system. A project can span multiple repositories, packages, documentation sites, hosted services, and releases. The card must state the boundary it analyzed.

### Repository

A source-control container that provides evidence about all or part of a project. A repository is an input source and is not assumed to be identical to the project.

### Agent Project

A project that implements an agent, agent runtime, agent framework, agent SDK, or reusable agent capability.

### Supporting Project

A project that provides infrastructure required by agent systems, such as parsing, retrieval, memory, evaluation, observability, security, or integration.

### Agent Project Card

A versioned, structured, evidence-backed representation of a project at a defined source snapshot. The canonical card is machine-readable; its summary and evidence views are generated from the same record.

### Card Summary

A compact human-readable or visual rendering of the most important fields in an Agent Project Card. It is a view of the canonical card rather than a separate artifact.

### Source Snapshot

The exact project boundary, repository revisions, package or release versions, document retrieval times, schema version, and analysis configuration to which a card applies.

### Claim

A material factual statement, interpretation, or assessment in a card. A claim records its kind, verification status, confidence, scope, applicable snapshot, and supporting or conflicting evidence.

### Evidence

A repository file, code location, configuration, release, issue, documentation page, package record, or other source that supports or conflicts with a claim in the card.

### Capability

A function the project provides, such as tool calling, planning, retrieval, memory, document parsing, browser control, or evaluation.

### Project Role

The position a project occupies in an agent architecture.

### Assessment Context

The use case, comparison cohort, organizational constraints, requirements, and point in time against which fit, maturity, strengths, limitations, risks, or gaps are evaluated.

## Product Naming

Use **Agent Rumble** as the public product and user-interface name.

Use **Agent Project Intelligence** for the underlying system and analysis
capability. Use **Agent Project Card** as the formal, canonical artifact.

Use **Card Summary** for the compact visual representation. “Profile” may describe an internal indexed projection, but it is not a separate user-facing artifact or source of truth.

Alternative system or artifact names considered included Agent Repository
Intelligence, Agent System Card, Agent Landscape Intelligence, and Capability
Profile. Those alternatives either overemphasize repositories, are too narrow
for supporting projects, or imply a landscape view rather than a canonical
project artifact.

---
