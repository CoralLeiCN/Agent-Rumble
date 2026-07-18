# Agent Project Card Schema and Outputs

Part of the [Agent Rumble product specification](README.md).

## 12. Agent Project Card Schema

The card is the canonical, machine-readable record. Human-readable views are
generated from it. The stakeholder-provided **Agent Project Card Schema v0.1**
is the normative starting point for the card's field groups, initial controlled
values, and `project-card.yaml` output. Schema evolution must retain a documented
migration path from that baseline.

The v0.1 baseline predates requirements that a project may span multiple
repositories, claims and sources must be first-class, confidence and
verification must remain independent, assessments must declare their context,
and unavailable values must distinguish `unknown`, `not_applicable`,
`not_analyzed`, and `no_evidence_found`. The evolved schema therefore preserves
the v0.1 concepts while adding the structures needed to satisfy those active
requirements. The remaining compatibility choices are recorded under
[Schema v0.1 Reconciliation](../open-decisions.md#schema-v01-reconciliation).

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

* High: directly confirmed by version-aligned code, configuration, or authorized dynamic verification
* Medium: strongly supported by version-aligned documentation and repository structure
* Low: inferred from incomplete evidence
* Unknown: insufficient information

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

A concise but detailed document intended for technical and product users.

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

### Summary View

A compact human-readable projection generated from a validated canonical card.
The repository-local Agent Project Card skill provides the reusable
[`card-summary-template.md`](../../plugins/agent-project-card/skills/agent-project-card/assets/card-summary-template.md).

The summary identifies the source card ID, card version, schema version, project
boundary, source snapshot, analysis date and depth, and canonical artifact. It
must preserve capability support, claim verification, evidence status, and
confidence as independent concepts; render unavailable values as `unknown`,
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

## 14. Schema Baseline and Proposed Machine-Readable Structure

### 14.1 v0.1 Baseline

Schema v0.1 establishes these top-level field groups:

| v0.1 field group | Required interpretation |
| --- | --- |
| `project` | Project identity, repository identity, analyzed revision, license, and lifecycle status |
| `summary` | One-line description, purpose, target users, and primary use cases |
| `classification` | Secondary characteristics, domains, delivery forms, and agent patterns |
| `capabilities` | User-meaningful capabilities with evidence status, confidence, and evidence references |
| `architecture` | Direct, architecturally meaningful technologies grouped by their role |
| `components` | Important project components and their paths, types, and purposes |
| `usage` | Installation, minimal start, configuration, required services, and extension points |
| `assessment` | Maturity, strengths, limitations, risks, and fit |
| `relationships` | Dependencies, integrations, and comparable projects |
| `open_questions` | Material questions the analysis could not answer |
| `evidence` | Precisely located support for card conclusions |

The v0.1 controlled values are:

* `project.primary_type`: `agent_application`, `agent_framework_sdk`,
  `agent_harness_runtime`, `agent_tool_mcp`, or `agent_skill`
* `confidence`: `high`, `medium`, `low`, or `unknown`
* `evidence_status`: `confirmed`, `documented_only`, `inferred`, or `not_found`
* `assessment.maturity`: `experimental`, `early`, `established`, `mature`, or
  `unclear`
* `project.status`: `active`, `maintenance`, `archived`, or `unclear`
* `architecture.tools_and_mcp.mcp_role`: `none`, `client`, `server`, `both`, or
  `unclear`

### 14.2 Reconciliation Rules

Schema v0.2 evolves the baseline according to these rules:

1. Preserve the v0.1 top-level groups so a reader or skill can recognize the
   same card organization.
2. Expand `project` and add `source_snapshot` so a card describes an explicit
   project boundary across one or more sources rather than assuming that one
   repository is the project.
3. Preserve the five v0.1 primary types as the initial core vocabulary. Later
   schema versions must support the existing supporting-project requirement and
   namespaced ontology extensions without changing the meaning of those five
   values in place.
4. Preserve v0.1 `evidence_status` only as a compatibility projection. The
   canonical record keeps capability support status, claim verification status,
   and confidence independent. In particular, `confirmed` must not erase the
   distinction between static confirmation and runtime verification, and
   `not_found` must not be interpreted as proof of absence.
5. Separate claims, sources, and evidence. Capabilities and assessments refer to
   claims; claims refer to supporting or conflicting evidence; evidence refers
   to a precisely versioned source and locator.
6. Add assessment contexts and reasoning. Maturity, strengths, limitations,
   risks, fit, and gaps are not context-free project properties.
7. Treat empty strings in the v0.1 example as authoring placeholders, not as the
   canonical representation of unavailable data. A v0.2 card uses `null` plus a
   JSON Pointer entry in `field_states` to record `unknown`, `not_applicable`,
   `not_analyzed`, or `no_evidence_found`. An empty collection means the
   collection was analyzed and is known to contain no items; otherwise its path
   requires a `field_states` entry.
8. Increment `schema_version` for a backward-incompatible structural or semantic
   change. Do not reinterpret an existing enum value or field in place. Record
   the card instance revision separately in `card_version`, following
   [Card Identity and Versioning](#card-identity-and-versioning).

Because a v0.1 empty value does not identify why the value is unavailable, a
v0.1-to-v0.2 migration records it as `unknown` and emits a migration warning.
The migration must not invent a more specific state.

### 14.3 Proposed v0.2 Structure

The first executable draft is packaged with the repository-local skill at
[`project-card.schema.json`](../../plugins/agent-project-card/skills/agent-project-card/references/project-card.schema.json).
It remains a draft while the recorded v0.1 reconciliation decisions are open.

The following YAML is an illustrative v0.2 authoring template. Its empty strings
are values still to be populated; before validation, each must be replaced by a
known value or by `null` with the corresponding `field_states` entry. The
implementation schema must define required fields, types, enum values, and
conditional validation rules explicitly.

```yaml
schema_version: "0.2"
card_id: "card-project-001"
card_version: 1
field_states:
  /project/license: "unknown"

project:
  project_id: "project-001"
  name: "Example project"
  primary_type: "agent_framework_sdk"
  type_rationale: ""
  boundary: ""
  repositories:
    - source_id: "source-repository-1"
      url: ""
      owner: ""
      role: "primary"
      included_paths: []
      excluded_paths: []
  packages: []
  services: []
  documentation_sites: []
  license: null
  status: "unclear"

source_snapshot:
  analyzed_at: ""
  source_revisions:
    - source_id: "source-repository-1"
      branch: ""
      tag: ""
      commit: ""
      retrieved_at: ""
      content_digest: ""
  release_versions: []
  analysis_depth: "targeted"
  analysis_configuration: {}
  analyzer_version: ""
  ontology_versions:
    classification: ""
    capabilities: ""

summary:
  one_line: ""
  purpose: ""
  target_users: []
  primary_use_cases: []

classification:
  secondary_characteristics: []
  domains: []
  delivery_forms: []
  agent_patterns: []
  architecture_layers: []
  claim_ids: []

capabilities:
  - capability_id: "capability-001"
    ontology_id: ""
    name: ""
    description: ""
    support_status: "statically_confirmed"
    evidence_status: "confirmed"
    scope: ""
    interfaces: []
    prerequisites: []
    configuration_requirements: []
    limitations: []
    confidence: "high"
    claim_ids: []
    evidence_refs: []

architecture:
  overview: ""
  languages: []
  frameworks_and_sdks: []
  model_providers: []
  runtime_and_orchestration: []
  tools_and_mcp:
    tools: []
    mcp_role: "unclear"
    mcp_details: []
  skills: []
  memory_and_state: []
  retrieval_and_knowledge: []
  document_processing: []
  execution_and_sandbox: []
  gateways_and_routing: []
  storage_and_databases: []
  interfaces: []
  deployment: []
  observability_and_evaluation: []
  security_and_permissions: []
  data_flows: []
  control_flows: []

components:
  - component_id: "component-001"
    name: ""
    path: ""
    project_type: ""
    purpose: ""
    claim_ids: []

usage:
  installation: ""
  minimal_start: ""
  configuration: []
  required_services: []
  extension_points: []

assessment:
  contexts:
    - context_id: "context-001"
      use_case: "general_project_assessment"
      comparison_cohort: []
      requirements: []
      organizational_constraints: []
      assessed_at: ""
  maturity: "unclear"
  maturity_signals: []
  strengths: []
  limitations: []
  risks: []
  best_fit: []
  poor_fit: []
  gaps: []

relationships:
  depends_on: []
  integrates_with: []
  comparable_projects: []

claims:
  - claim_id: "claim-001"
    statement: ""
    claim_kind: "factual"
    verification_status: "documented"
    confidence: "unknown"
    applies_to: ""
    assessment_context_id: null
    supporting_evidence_ids: []
    conflicting_evidence_ids: []
    reasoning: ""
    last_verified_at: ""

sources:
  - source_id: "source-repository-1"
    source_type: "repository"
    provenance: "first_party"
    uri: ""
    revision_or_version: ""
    retrieved_at: ""
    content_digest: ""
    access_scope: "public"

evidence:
  - evidence_id: "evidence-001"
    source_id: "source-repository-1"
    locator:
      path: ""
      symbol_or_section: ""
      line_start: null
      line_end: null
    evidence_status: "confirmed"
    confidence: "high"
    excerpt_or_symbol: ""
    note: ""

open_questions: []
```

---
