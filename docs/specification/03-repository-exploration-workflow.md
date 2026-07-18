# Repository Exploration Workflow

Part of the [Agent Rumble product specification](README.md).

## 11. Repository Exploration Workflow

### Step 1: Project Intake and Scope

For catalog preprocessing, an operator-managed job supplies one or more
repository URLs or a project reference from the selected cohort. P2 on-demand
analysis may accept the same input from a user. The system establishes a project
boundary before analysis so a monorepo package, multi-repository system, or
hosted component is not accidentally treated as an unrelated whole.

The system records:

* Stable project identity
* Included repositories and their role in the project
* Included packages, directories, services, releases, and documentation
* Explicit exclusions
* Branches, tags, commits, package versions, and retrieval times
* Analysis timestamp
* Access permissions
* Requested analysis depth
* Analyzer and ontology versions
* User-provided context

### Step 2: Repository Mapping

The system builds an initial map of:

* Languages
* Major directories
* Packages
* Entry points
* Documentation locations
* Examples
* Tests
* Deployment configuration
* Dependency manifests

### Step 3: Project Type Hypothesis

The system produces an initial classification hypothesis using:

* Repository metadata
* README content
* Directory structure
* Package names
* Dependencies
* Entrypoints

### Step 4: Guided Exploration

The exploration agent creates a repository-specific investigation plan.

For example, it may decide to:

* Inspect the main runtime package
* Trace an example application
* Find tool-registration mechanisms
* Locate model-provider integrations
* Inspect MCP configuration
* Identify document parsing stages
* Review persistence and memory components
* Examine evaluation and test coverage

### Step 5: Capability Extraction

The system identifies capabilities and separates their support status into:

* Claimed capabilities
* Documented capabilities
* Statically confirmed capabilities
* Runtime-verified capabilities
* Partially implemented capabilities
* Planned capabilities
* Deprecated capabilities

Static inspection must never be labeled runtime verification. Each capability records its scope, configuration requirements, interfaces, limitations, evidence, and confidence.

### Step 6: Architecture Reconstruction

The system produces a simplified model of:

* Components
* Data flows
* Control flows
* External dependencies
* Extension points
* Deployment assumptions
* Trust boundaries

### Step 7: Claim and Evidence Collection

Each material conclusion becomes a claim with a stable identifier. A claim records whether it is factual, interpretive, or an assessment; whether it is documented, statically confirmed, runtime verified, unverified, or conflicted; and what snapshot and project scope it applies to.

Claims link to supporting or conflicting evidence such as:

* File path
* Code symbol
* Documentation section
* Configuration key
* Release
* Issue
* Commit

### Step 8: Card Generation

The system generates:

* A concise overview
* A complete canonical Agent Project Card
* Human-readable summary and detailed views generated from the card
* Claim-level verification status and confidence
* Evidence references and provenance
* Unresolved questions

### Step 9: Validation

A validation pass checks:

* Whether all major claims have evidence
* Whether README claims match the implementation
* Whether untrusted source content influenced control instructions
* Whether important sections are missing
* Whether classifications are internally consistent
* Whether assessments state their use-case or comparison context
* Whether uncertainty is stated clearly

---
