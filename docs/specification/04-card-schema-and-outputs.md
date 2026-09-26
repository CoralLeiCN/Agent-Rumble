# Agent Project Card Schema and Outputs

Part of the [Agent Rumble product specification](README.md).

## 12. Agent Project Card Schema

The card is the canonical, machine-readable record. Human-readable views are
generated from it. Schema v0.3 is the current executable pre-release contract.
The [schema requirements](../requirements.md#project-card-schema-baseline) define
the project boundary, classification, and evidence expectations. Author cards
against the current executable contract below.

Sections 12.1–12.22 describe the information and evidence semantics, not literal
top-level YAML keys. The executable schema groups that information as mapped in
[section 14.2](#142-executable-v03-contract). Additions beyond that contract require
a deliberate schema revision.

### 12.1 Identity and Source Snapshot

* Stable project identifier
* Card identifier and version
* Project name
* Analyzed project boundary
* Included repositories and their roles
* Included and excluded packages, directories, services, and documentation
* Organization or owner
* Primary package name
* Release and package versions
* License
* Analysis date
* Analyzed branches, tags, and commits
* External-source retrieval timestamps and content digests
* Analysis depth and configuration
* Analyzer version
* Card schema and ontology versions

#### Card Identity and Versioning

Each canonical card revision is identified by the pair `card_id` and
`card_version`. The first revision uses `card_version: 1`. When a card is
refreshed for a new source snapshot or its persisted canonical content changes,
the system retains the same `card_id` and assigns the next positive integer as
`card_version`. A previously assigned pair must not be reused for different
content or silently overwritten.

`card_version` tracks the evolution of one card. `schema_version` identifies
the structure and semantics used to encode it. Project release and package
versions identify analyzed software and belong in `source_snapshot`. Changing
one of these version concepts does not implicitly change either of the others.

### 12.2 One-Sentence Summary

A concise statement describing what the project is and who it is for.

Example:

> An open-source Python framework for building tool-using agents with persistent state, human approval steps, and graph-based orchestration.

### 12.3 Project Overview

* Problem addressed
* Intended users
* Main use cases
* Value proposition
* Typical usage pattern

### 12.4 Classification

* Classification ontology version
* Primary project type
* Secondary project types
* Agent architecture layers
* Domain
* Delivery model
* Open-source or commercial status
* Supporting claim identifiers

### 12.5 Capabilities

Capabilities should be represented using a controlled vocabulary where possible.

Examples:

* Tool calling
* Function calling
* Planning
* Reflection
* Task decomposition
* Multi-agent coordination
* Human-in-the-loop control
* Session state
* Long-term memory
* Retrieval-augmented generation
* Document ingestion
* Structured extraction
* Browser interaction
* Code execution
* MCP integration
* Streaming
* Evaluation
* Tracing
* Guardrails
* Authentication
* Multi-tenancy

For each capability, record:

* Stable capability or ontology identifier
* Capability name and description
* Support status: claimed, documented, statically confirmed, runtime verified, partially implemented, planned, or deprecated
* Scope, supported modes, and constraints
* Exposed and consumed interfaces
* Prerequisites and required supporting components
* Configuration requirements
* Limitations
* Confidence
* Supporting and conflicting claim identifiers

### 12.6 Technical Architecture

* Primary programming languages
* Major frameworks
* Model providers
* Databases
* Vector stores
* Message queues
* API frameworks
* Front-end frameworks
* Deployment technologies
* Package managers
* Build tools
* Testing frameworks

Technology and dependency entries should include version constraints where available and distinguish direct, transitive, development, optional, bundled, and hosted dependencies.

### 12.7 Agent Design

When applicable:

* Agent loop
* Planning strategy
* Tool-selection mechanism
* State model
* Memory model
* Context-management strategy
* Prompt structure
* Multi-agent communication
* Termination conditions
* Retry and recovery behavior
* Human approval mechanisms

### 12.8 Integration and Compatibility Model

* Public APIs and SDK interfaces
* Command-line and user interfaces
* Webhooks and event interfaces
* MCP, plugin, and skill interfaces
* Plugin architecture
* Skill architecture
* Extension points
* Supported model providers
* Supported data sources
* Required external services
* Authentication and authorization requirements
* Input and output data contracts
* Interface direction: provided, consumed, or bidirectional
* Protocol and version constraints
* Runtime, language, platform, and deployment prerequisites
* Known compatible and incompatible components
* Replacement or migration constraints

These fields must be structured so a downstream Agent Architect can determine whether projects are composable rather than relying only on semantic similarity.

### 12.9 Data and Document Flow

For projects that ingest or process data:

* Supported input formats
* Parsing strategy
* Chunking strategy
* Metadata handling
* Extraction pipeline
* Indexing process
* Storage model
* Retrieval method
* Output formats
* Error handling

### 12.10 Deployment and Operations

* Local development requirements
* Container support
* Cloud support
* Hosted offering
* Infrastructure dependencies
* Scalability model
* Statefulness
* Logging
* Monitoring
* Tracing
* Configuration management
* Secrets management

### 12.11 Security and Governance

* Authentication
* Authorization
* Data isolation
* Secret handling
* Sandboxing
* Tool permission controls
* Human approval
* Audit logging
* Data retention
* Dependency risks
* Known security policy
* Responsible disclosure process

The card must distinguish between:

* Confirmed controls
* Configurable controls
* User responsibilities
* Missing or unclear controls

### 12.12 Quality and Maturity

Suggested maturity dimensions:

* Documentation quality
* Test coverage indicators
* Release discipline
* Maintenance activity
* API stability
* Deployment readiness
* Error handling
* Observability
* Security posture
* Community health
* Extensibility
* Example quality

Use descriptive maturity levels rather than a single opaque score.

Suggested levels:

* Experimental
* Prototype
* Early adoption
* Production-capable
* Mature
* Enterprise-oriented
* Unclear

### 12.13 Strengths

Evidence-backed advantages such as:

* Clear architecture
* Strong extensibility
* Broad integration support
* Good documentation
* Simple developer experience
* Production controls
* Strong evaluation support
* Active maintenance

Each strength must state the assessment context, reasoning, confidence, and supporting claim identifiers.

### 12.14 Limitations

Examples:

* Narrow provider support
* Limited test coverage
* Incomplete documentation
* Heavy infrastructure requirements
* Weak access controls
* No durable state
* Unclear scaling model
* Rapidly changing APIs

Each limitation must state whether it is a confirmed project constraint, a gap relative to an explicit requirement, or an unresolved absence of evidence.

### 12.15 Risks

* Technical risks
* Operational risks
* Security risks
* Adoption risks
* Vendor-dependency risks
* License risks
* Maintenance risks
* Ecosystem risks

Each risk records the affected use case or stakeholder, likelihood or uncertainty where defensible, impact, possible mitigation, and supporting claims.

### 12.16 Best-Fit Use Cases

For each use case:

* Use-case description
* Assessment context and requirements
* Why the project fits
* Required supporting components
* Important constraints
* Confidence

### 12.17 Poor-Fit Use Cases

Describe scenarios where the project is likely to be unsuitable and the explicit requirements or constraints that create the mismatch.

### 12.18 Comparable Projects

* Similar projects
* Adjacent projects
* Complementary projects
* Likely substitutes
* Important differences

Relationships must be typed, scoped to a source snapshot, and evidence-backed where they claim an implemented integration or dependency. This section should initially identify comparison candidates rather than make unsupported judgments.

### 12.19 Gaps and Missing Capabilities

* Missing production controls
* Missing integrations
* Missing architecture layers
* Missing documentation
* Missing evaluation
* Missing deployment support
* Missing security controls
* Missing enterprise capabilities

A gap must identify the reference use case, requirement set, architecture, or comparison cohort. Absence of repository evidence must not automatically be presented as proof that a capability is missing.

### 12.20 Adoption Guidance

* Recommended evaluation steps
* Minimum proof-of-concept scope
* Integration effort
* Team skills required
* Operational dependencies
* Questions to resolve before adoption

### 12.21 Claims, Evidence, and Confidence

Each material conclusion is represented as a first-class claim containing:

* Stable claim identifier
* Statement and structured subject where possible
* Claim kind: factual, interpretive, or assessment
* Verification status: documented, statically confirmed, runtime verified, unverified, or conflicted
* Confidence level
* Applicable project scope and source snapshot
* Supporting and conflicting evidence identifiers
* Last verified date
* Reasoning for inferences and assessments

Each evidence record contains:

* Stable evidence identifier and parent source identifier
* Precise locator such as line range, symbol, section, or page
* Optional excerpt or extracted symbol

Each parent source record contains:

* Stable source identifier
* Source type and provenance
* Source URI or repository path
* Revision, version, retrieval timestamp, and content digest where applicable
* Access scope

Recommended confidence levels:

* High: strong, consistent evidence with little material uncertainty
* Medium: meaningful support with material uncertainty or incomplete coverage
* Low: weak, ambiguous, or incomplete support
* Unknown: insufficient information to assess confidence

Confidence and verification status are independent. For example, a repository can provide high-confidence evidence that a feature is documented while the implementation remains unverified.

### 12.22 Open Questions

Questions the system could not answer, such as:

* Is multi-tenancy supported?
* Is the hosted service required?
* How is state recovered after failure?
* Are tools isolated per user?
* Is a documented feature implemented in the current release?

---

## 13. Card Output Formats

### Human-Readable Card

A generated human-readable card is optional. It is not a required output of the
current Agent Project Card library or Agent Project Card as a Service
implementation.

### Canonical Machine-Readable Card

A versioned JSON or YAML document suitable for:

* Search
* Filtering
* Comparison
* Recommendation
* Analytics
* Ecosystem trend analysis
* Knowledge graphs
* Retrieval systems
* Downstream agents

Canonical string values use interoperable Unicode scalar-value semantics.
When a YAML or host-language parser exposes a valid UTF-16 surrogate pair as
two code points, validation normalizes that pair to its single scalar value
before the card enters the service catalog. Residual lone surrogate code points
are invalid because they cannot round-trip through UTF-8 JSON and browser
clients. This interoperability step does not apply Unicode composition, case,
whitespace, or compatibility normalization.

### Summary View

A compact human-readable projection may be generated from a validated canonical
card, but is not required by the current delivery scope.
The repository-local Agent Project Card skill provides the reusable
[`card-summary-template.md`](../../.agents/plugins/agent-project-card/skills/agent-project-card/assets/card-summary-template.md).

When a summary is generated, it identifies the source card ID, card version,
schema version, project boundary, source snapshot, analysis date and depth, and
canonical artifact. It must preserve capability support, claim verification,
and confidence as independent concepts; render unavailable values as `unknown`,
`not_applicable`, `not_analyzed`, or `no_evidence_found`; state the applicable
Assessment Context; and retain claim, evidence, and source identifiers.

The summary includes:

* Project name
* One-line summary
* Project type
* Project boundary and source snapshot
* Architecture layers
* Key capabilities
* Primary languages
* Maturity
* Assessment Context
* License
* Best-fit use cases
* Main strengths
* Main limitations
* Main risks and gaps
* Relationships and required services
* Claim, evidence, and source indexes

### Evidence View

A traceable list of claims and their supporting sources.

---

## 14. Current Pre-Release Schema

### 14.1 Canonical Structure Rules

1. `project` defines the analyzed project boundary; `source_snapshot` records
   the versions of its repositories, packages, documents, and other sources.
2. Classification uses the five core primary types and versioned, namespaced
   ontology extensions described in [Project Classification](02-classification-and-sources.md#9-project-classification-system).
3. Capability support status, claim verification status, and confidence are
   independent fields.
4. Capabilities and assessments refer to claims; claims refer to supporting or
   conflicting evidence; evidence refers to a precisely versioned source and
   locator.
5. Maturity, strengths, limitations, risks, fit, and gaps require assessment
   contexts and reasoning.
6. Where the schema permits a nullable value, use `null` plus a JSON Pointer entry in
   `field_states` recording `unknown`, `not_applicable`, `not_analyzed`, or
   `no_evidence_found`. An empty array means it was analyzed and contains
   no items; otherwise its path requires a `field_states` entry. A state pointer
   must resolve to `null` or an empty array. Required non-null identity fields
   must be supplied; a field-state entry cannot make them optional.
7. Structural or semantic contract changes increment `schema_version`. Do not
   reinterpret existing enum values or fields in place. Record the card instance
   revision separately in `card_version`, following
   [Card Identity and Versioning](#card-identity-and-versioning).

### 14.2 Executable v0.3 Contract

The current executable schema is packaged with the repository-local skill at
[`project-card.schema.json`](../../.agents/plugins/agent-project-card/skills/agent-project-card/references/project-card.schema.json).
Cards, fixtures, validators, and generated views must use this contract directly.

Schema v0.3 does not yet contain the accepted `classification_status` field.
Until a later executable schema revision adds the
[`classified`, `provisional`, and `insufficient_evidence` behavior](02-classification-and-sources.md#912-classification-status),
v0.3 authors preserve classification uncertainty through `type_rationale`,
classification claims and confidence, and `open_questions`. The later schema
revision must keep classification status independent from the primary-type
vocabulary and must not use `x-unclassified` as an uncertainty marker.

The schema and deterministic validator define required fields, allowed values,
nullability, and cross-reference rules. The current groups map to the semantic
sections above as follows:

| Canonical group | Information represented |
| --- | --- |
| `schema_version`, `card_id`, `card_version`, `field_states` | Contract version, immutable card identity, and explicit unavailable-value states |
| `project`, `source_snapshot` | Project boundary, repository roles, exact source revisions, analysis configuration, and provenance |
| `summary`, `classification` | Purpose, users, use cases, secondary characteristics, domains, delivery forms, patterns, and architecture layers |
| `capabilities` | User-meaningful functions, support status, interfaces, prerequisites, limits, claims, and evidence references |
| `architecture`, `components` | Technologies, runtime, tools, state, retrieval, document processing, deployment, security, flows, and component boundaries |
| `usage` | Installation, minimal start, configuration, required services, and extension points |
| `assessment` | Explicit contexts, maturity signals, strengths, limitations, risks, fit, and gaps |
| `relationships` | Dependencies, integrations, and comparable projects |
| `claims`, `sources`, `evidence` | Statements, independent verification/confidence, supporting or conflicting evidence, source versions, and precise locators |
| `open_questions` | Unresolved questions at the analyzed snapshot |

Use validated canonical artifacts as examples, such as the
[Eigent application card](../../catalog/cards/card-eigent-ai-eigent/versions/1/project-card.yaml)
and [OpenAI Agents SDK card](../../catalog/cards/card-openai-openai-agents-python/versions/2/project-card.yaml).
They are pinned examples with their own boundaries and source snapshots;
new analyses must collect their own evidence. The skill's
[analysis contract](../../.agents/plugins/agent-project-card/skills/agent-project-card/references/analysis-contract.md)
defines authoring steps, and `make cards-check` validates every retained catalog
version against the shared schema and semantic rules.
