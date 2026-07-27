# Project Classification and Sources

Part of the [Agent Rumble product specification](README.md).

## 9. Project Classification System

The classification system must be versioned, extensible, and support multiple
labels because many projects span several categories. Every card records the
classification-ontology version it uses. Namespaced extensions may be added
without invalidating older cards.

### 9.1 Primary Project Type

When the available evidence supports classification, each Project has one
primary type representing its dominant role. The five stable core values are:

* `agent_application`
* `agent_framework_sdk`
* `agent_harness_runtime`
* `agent_tool_mcp`
* `agent_skill`

Domain-specific, multi-agent, delivery, and architecture characteristics do not
automatically require a separate primary type. They may be represented through
the card's secondary characteristics, domains, delivery forms, agent patterns,
and architecture layers.

#### 9.1.1 Namespaced Extensions

If none of the five core types accurately describes the Project, the primary
type uses a specific lowercase namespaced extension beginning with `x-`, such
as `x-document-parser`, `x-evaluation-framework`, or `x-model-gateway`. The
card's `type_rationale` and classification claims must explain and support the
extension. Authors must not force a supporting project into an inaccurate core
type.

Representative concepts that may inform secondary labels or namespaced
extensions include:

* Agent application
* Domain-specific agent
* Multi-agent application
* Agent framework
* Agent SDK
* Agent runtime
* Agent orchestration platform
* Agent skill
* Tool or connector
* MCP server
* MCP client
* MCP framework
* Retrieval or knowledge system
* Memory system
* Document ingestion system
* Document parser
* Evaluation framework
* Observability platform
* Guardrail or security system
* Browser or computer-use system
* Workflow engine
* Sandbox or execution environment
* Model gateway
* Developer tooling
* Deployment infrastructure
* Example or reference application
* Benchmark or dataset
* Supporting library

#### 9.1.2 Classification Status

A later executable schema revision will record `classification_status`
independently from `project.primary_type`:

* `classified`: the evidence supports the recorded primary type.
* `provisional`: the recorded primary type is the best-supported interpretation,
  but material classification uncertainty remains.
* `insufficient_evidence`: the available evidence does not support selecting or
  defining a responsible primary type.

A project that clearly falls outside the core vocabulary receives a specific
`x-...` extension; it is not thereby uncertain or unclassified. Conversely,
insufficient evidence must not be represented as `x-unclassified`.

Until that later schema revision is implemented, v0.3 cards continue to use the
required `project.primary_type` contract and express material uncertainty in
`type_rationale`, classification claims and confidence, and `open_questions`.

#### 9.1.3 Extension Promotion and Card History

A recurring extension may become a controlled type only through a new
classification-ontology version that defines its meaning, inclusion criteria,
exclusions, and relationship to existing types. Promotion does not invalidate
or silently rewrite historical cards.

An existing card version retains its recorded primary type and ontology
version. When a card is refreshed against the newer ontology, it may adopt the
promoted type only in a new `card_version`, preserving the previous version for
traceability.

### 9.2 Agent Architecture Layer

* User experience
* Agent logic
* Planning and reasoning
* Orchestration
* Model access
* Tool use
* Skills
* Protocol and interoperability
* Memory
* Retrieval and knowledge
* Data ingestion
* Document processing
* Execution and sandboxing
* Evaluation
* Observability
* Security and governance
* Deployment and operations

### 9.3 Domain

Examples include:

* General purpose
* Software engineering
* Customer support
* Sales
* Marketing
* Legal
* Finance
* Healthcare
* Research
* Education
* Data analysis
* Cybersecurity
* DevOps
* Human resources
* Supply chain
* Personal productivity
* Content generation

### 9.4 Delivery Model

* Open-source library
* Open-source application
* Hosted service
* Enterprise platform
* Command-line tool
* Desktop application
* API service
* Embedded component
* Reference implementation

---

## 10. Input Sources

The system should support the following evidence sources.

### Repository Sources

* README files
* Source code
* Directory structure
* Dependency manifests
* Build files
* Configuration files
* Environment templates
* Tests
* Examples
* Tutorials
* Architecture documents
* API specifications
* Changelogs
* Release notes
* License files
* Contribution guides
* Security policies
* Dockerfiles and deployment manifests
* GitHub Actions or other CI workflows
* Issue templates
* Pull request templates

### Repository Metadata

* Repository description
* Topics and tags
* Default branch
* Creation date
* Last update
* Contributors
* Commit history
* Releases
* Open and closed issues
* Pull requests
* Stars, forks, and watchers

Popularity metrics should be treated as contextual indicators, not measures of quality.

### External Sources

Depending on the configured analysis scope, the system may also inspect:

* Official documentation sites
* Package registries
* Technical blog posts
* Research papers
* Product documentation
* Public roadmaps
* Community discussions

Repository documentation is required for the MVP. Linked first-party documentation and package metadata may be enabled separately; broader third-party research can be added later. External claims must remain distinguishable from repository-derived evidence and must record retrieval time and available version information.

### Source Trust and Provenance

All repository and external content is untrusted input. Source text, code comments, issues, examples, and documentation must be treated as data and never as control instructions for the exploration agent.

For every source used, the system records where applicable:

* Source identifier and type
* First-party, third-party, or unknown provenance
* Repository revision, document version, or package version
* Retrieval timestamp
* Content digest
* Access scope and tenant
* Locator such as file path, line range, symbol, page, or section

The analysis runtime must isolate source content from system instructions, restrict tool authority, and prevent one project’s content from influencing another project’s card.

---
