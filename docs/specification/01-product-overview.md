# Product Overview

Part of the [Agent Project Intelligence product specification](README.md).

## 1. Executive Summary

Agent Project Intelligence is an AI-powered system that explores, understands, and describes software projects related to AI agents.

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

Users currently need to inspect each project manually. This process is slow, inconsistent, technically demanding, and difficult to repeat at scale.

Agent Project Intelligence addresses this problem by creating a structured and evidence-backed representation of each project.

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

Each documentation area has one responsibility:

* The topic-organized requirements record preserves requested outcomes and
  constraints.
* The product specification defines the normative behavior that satisfies those
  requirements.
* Design documents describe proposed implementation approaches.
* The topic-organized architecture decisions record documents accepted
  architectural choices, their context, and their consequences.
* Execution plans organize delivery work.

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

* Codex as the project-analysis harness
* An Agent Project Card skill attached to Codex, containing the instructions for generating the card
* The canonical Agent Project Card and its generated human-readable views as the outputs

The same core tool supports two usage modes:

| Usage mode | How the user starts card generation | Role of Agent Project Intelligence |
| --- | --- | --- |
| Direct Codex session | The user invokes the Agent Project Card skill in their own Codex session. | The skill guides Codex to analyze the declared project and create the card. |
| API | A client calls an API that wraps Codex and the Agent Project Card skill. | The API starts the same card-generation capability and exposes it to other products. |

A later frontend can use the API as its backend: the user provides a Git repository link, and the frontend requests creation of an Agent Project Card. The frontend is an access layer, not a separate card-generation implementation.

Both usage modes must produce the same canonical artifact and apply the same project-boundary, source-snapshot, claim, evidence, confidence, verification, schema, and validation rules.

### Use-Case Breakdown

| Use case | Scope | Relationship to the core tool |
| --- | --- | --- |
| Understand a single project | Core card creation | Produces and presents one Agent Project Card for a declared project boundary. |
| Compare similar projects | Downstream use | Consumes multiple cards under an explicit comparison context. |
| Recommend projects for a use case | Downstream use | Retrieves and assesses cards against stated requirements. |
| Perform ecosystem gap analysis | Downstream use | Uses cards to identify missing capabilities relative to an explicit context. |
| Support technical due diligence | Card creation and downstream assessment | Uses evidence-backed card data to support a first-pass assessment. |
| Maintain an internal project catalog | Downstream use | Indexes and retrieves cards. |
| Analyze ecosystem trends | Downstream use | Aggregates comparable cards across a declared cohort and time range. |

### 7.1 Understand a Single Project

A user provides a project reference, usually one or more repository URLs and an optional package, directory, release, or documentation scope. The system explores the selected sources and generates an Agent Project Card for the declared project boundary.

### 7.2 Compare Similar Projects

A user selects multiple projects. The system compares their purpose, capabilities, architecture, maturity, integration requirements, strengths, weaknesses, and gaps.

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

Use **Agent Project Intelligence** as the product name and **Agent Project Card** as the formal, canonical artifact.

Use **Card Summary** for the compact visual representation. “Profile” may describe an internal indexed projection, but it is not a separate user-facing artifact or source of truth.

Alternative names considered included Agent Repository Intelligence, Agent System Card, Agent Landscape Intelligence, and Capability Profile. Those alternatives either overemphasize repositories, are too narrow for supporting projects, or imply a landscape view rather than a canonical project artifact.

---
