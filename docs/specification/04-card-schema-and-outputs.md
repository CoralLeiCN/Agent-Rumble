# Agent Project Card Schema and Outputs

Part of the [Agent Rumble product specification](README.md).

## 12. Agent Project Card Schema

The card is the canonical, machine-readable record. Human-readable views are generated from it. Required fields must distinguish `unknown`, `not_applicable`, `not_analyzed`, and `no_evidence_found` rather than collapsing them into an empty value.

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

A compact card containing:

* Project name
* One-line summary
* Project type
* Architecture layers
* Key capabilities
* Primary languages
* Maturity
* License
* Best-fit use cases
* Main strengths
* Main limitations
* Confidence

### Evidence View

A traceable list of claims and their supporting sources.

---

## 14. Proposed Machine-Readable Structure

```yaml
schema_version: "0.2"
card_id: ""
card_version: 1

subject:
  project_id: ""
  name: ""
  kind: "software_project"
  boundary: ""
  owner: ""
  license: ""
  repositories:
    - url: ""
      role: "primary"
      included_paths: []
      excluded_paths: []
  packages: []
  services: []
  documentation_sites: []

snapshot:
  analyzed_at: ""
  source_revisions:
    - source_id: "src-repository-1"
      revision: ""
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
  overview: ""

classification:
  primary_type: ""
  secondary_types: []
  architecture_layers: []
  domains: []
  delivery_model: ""
  claim_ids: []

capabilities:
  - capability_id: ""
    ontology_id: ""
    name: ""
    support_status: "statically_confirmed"
    description: ""
    scope: ""
    interfaces: []
    prerequisites: []
    configuration_requirements: []
    limitations: []
    confidence: high
    claim_ids: []

technology:
  components:
    - name: ""
      category: "framework"
      version_constraint: ""
      dependency_relation: "direct"
      required: true
      claim_ids: []

architecture:
  components: []
  data_flows: []
  control_flows: []
  extension_points: []
  external_dependencies: []

interfaces:
  - interface_id: ""
    name: ""
    kind: "api"
    direction: "provided"
    protocol: ""
    version_constraint: ""
    authentication: ""
    input_contract: ""
    output_contract: ""
    prerequisites: []
    claim_ids: []

operations:
  deployment_models: []
  required_services: []
  statefulness: "unknown"
  scalability_model: "unknown"
  observability: []
  configuration: []
  secrets_management: "unknown"

security_and_governance:
  controls: []
  user_responsibilities: []
  missing_or_unclear_controls: []
  claim_ids: []

maturity:
  context:
    use_case: "general_repository_assessment"
    comparison_cohort: []
    requirements: []
  dimensions:
    - name: "documentation"
      level: "unknown"
      reasoning: ""
      confidence: "unknown"
      claim_ids: []

assessment:
  context:
    use_case: ""
    comparison_cohort: []
    requirements: []
    assessed_at: ""
  strengths:
    - statement: ""
      reasoning: ""
      confidence: "unknown"
      claim_ids: []
  limitations: []
  risks: []
  best_fit_use_cases: []
  poor_fit_use_cases: []
  gaps: []

relationships:
  - target_project_id: ""
    relation_type: "complementary"
    scope: ""
    confidence: "unknown"
    claim_ids: []

adoption:
  integration_effort: "unknown"
  required_skills: []
  required_services: []
  compatibility_constraints: []
  recommended_evaluation_steps: []

claims:
  - claim_id: "claim-001"
    statement: ""
    claim_kind: "factual"
    verification_status: "documented"
    confidence: "unknown"
    applies_to: ""
    supporting_evidence_ids: []
    conflicting_evidence_ids: []
    reasoning: ""
    last_verified_at: ""

sources:
  - source_id: "src-repository-1"
    source_type: "repository_file"
    provenance: "first_party"
    uri: ""
    revision_or_version: ""
    retrieved_at: ""
    content_digest: ""
    access_scope: "public"

evidence:
  - evidence_id: "evidence-001"
    source_id: "src-repository-1"
    locator: ""
    excerpt_or_symbol: ""

open_questions: []
```

---
