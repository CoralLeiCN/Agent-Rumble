# System Behavior and Quality Specification

Part of the [Agent Project Intelligence product specification](README.md).

## 15. Functional Behavior

### Repository Analysis

The system must:

* Accept public GitHub repositories for the MVP
* Declare a project boundary that may include one or more repositories, packages, directories, services, releases, and documentation sources
* Analyze a specific branch, tag, or commit
* Map repository structure
* Detect languages and frameworks
* Identify project entry points
* Trace representative execution paths
* Inspect repository documentation and examples and, when configured, linked first-party sources
* Detect relevant configuration
* Extract dependencies
* Record source provenance, version or revision, retrieval time, and precise evidence locators
* Treat source content as untrusted data rather than analysis instructions

### Classification

The system must:

* Assign one or more project types
* Assign one or more architecture layers
* Detect applicable domains
* Explain classification decisions
* Represent uncertainty
* Record the classification and capability ontology versions

### Card Generation

The system must:

* Produce one canonical, structured Agent Project Card
* Generate concise and detailed human-readable views from the canonical card
* Produce schema-valid JSON or YAML
* Support card and schema versioning
* Distinguish factual, interpretive, and assessment claims
* Distinguish documented, statically confirmed, runtime-verified, unverified, and conflicted conclusions
* Identify missing information
* Link material claims to supporting and conflicting evidence
* Preserve `unknown`, `not_applicable`, `not_analyzed`, and `no_evidence_found` as distinct states

### Access and Invocation

The system must support the following ways to use the core Agent Project Card tool:

* Direct use in a user's Codex session, with the Agent Project Card generation instructions provided by a skill attached to Codex
* API use, where Agent Project Intelligence wraps Codex and the same Agent Project Card skill

The API must support starting card generation from a Git repository link. It must be usable as the backend for a later frontend that collects the link from the user and requests creation of the card.

Both access modes must produce the same canonical Agent Project Card and follow the same analysis and validation rules.

### Implementation Technology

The [Implementation Technology requirements](../requirements.md#implementation-technology)
establish these constraints:

* Use `uv` to manage the Python portion of Agent Project Intelligence.
* Use the OpenAI Agents SDK to build the agent workflow.
* Use Codex as the project-analysis harness.
* Provide the card-generation instructions through an Agent Project Card skill attached to Codex.
* Use FastAPI as the backend framework and establish its initial Python project layout under `src/`.
* Use React as the frontend framework.
* Use Pydantic with Python type annotations to define typed application data models.
* Use `BaseSettings` from Pydantic Settings for typed application settings.
* Use `load_dotenv()` from `python-dotenv` to load environment variables from `.env` files.

### Dependency Release Cooldown

The [Dependency Release Cooldown requirement](../requirements.md#dependency-release-cooldown)
requires a seven-day cooldown for registry dependencies resolved by `uv`.

The root `pyproject.toml` configures `exclude-newer = "1 week"` and requires `uv >= 0.9.17`, the first version that supports relative cooldown durations. During a new resolution, `uv` excludes direct and transitive registry distribution artifacts uploaded within the preceding seven days and records the resulting cutoff timestamp in `uv.lock`. Locked synchronization continues to use the reviewed versions and hashes already recorded in `uv.lock`.

The cooldown reduces exposure to newly published compromised releases but does not guarantee that dependencies are safe. It does not apply to Git, URL, or local path dependencies.

### Search and Retrieval

The system should:

* Index cards
* Support semantic and structured search
* Filter by category, capability, language, license, maturity, and architecture layer
* Retrieve projects relevant to a use case

### Comparison

The system should:

* Compare projects using a shared schema
* Highlight meaningful differences
* Avoid comparing projects that serve fundamentally different roles without explaining the distinction
* Identify complementary rather than only competing projects
* State the comparison cohort, use case, requirements, and source snapshots
* Compare interface compatibility and prerequisites as well as capabilities

### Refresh and Change Tracking

The system should:

* Reanalyze projects when requested
* Detect material repository changes
* Show card and claim differences between source snapshots
* Mark stale card sections and source evidence

---

## 16. Quality Attributes

### Accuracy

Material claims must be supported by evidence or explicitly marked unverified. Static confirmation must not be represented as runtime verification.

### Traceability

Users should be able to navigate from a conclusion to its claim, reasoning, source snapshot, and precise supporting or conflicting evidence.

### Reproducibility

An analysis should record the project boundary, repository revisions, document retrieval times and digests, release versions, schema and ontology versions, analyzer version, and analysis configuration.

### Extensibility

New project types, capabilities, and architecture layers should be addable through versioned, namespaced vocabularies without redesigning the whole system or invalidating older cards.

### Scalability

The architecture should support both deep analysis of a single repository and shallower analysis across many repositories.

### Security

Untrusted code should not be executed unless it is isolated and explicitly authorized. Repository and external content must remain separated from control instructions, and the system must resist prompt injection in source files, documentation, issues, and metadata.

### Privacy

Private repository data must remain isolated and must not be used to enrich public cards.

### Cost Control

The system should use staged exploration and avoid reading every file when a targeted analysis is sufficient.

### Explainability

Scores and classifications should include reasons rather than appearing as unsupported numerical outputs.

---

## 17. Scoring and Assessment Principles

Avoid a single universal project score.

A project can be excellent for experimentation but unsuitable for enterprise deployment. A framework may be mature but intentionally minimal. A small MCP server should not be penalized for lacking the features of a full agent platform.

Use separate dimensions such as:

* Functional completeness
* Documentation quality
* Developer experience
* Extensibility
* Operational readiness
* Security controls
* Evaluation support
* Ecosystem compatibility
* Maintenance health
* Use-case fit

Every rating should include:

* Evidence
* Reasoning
* Confidence
* Relevant context

Strengths, limitations, risks, gaps, maturity, and use-case fit are assessments rather than universal properties. Each must identify the relevant use case, comparison cohort, requirements, organizational constraints, source snapshot, and assessment date. Absence of evidence must remain distinct from evidence of absence.

---
