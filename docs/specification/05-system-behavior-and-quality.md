# System Behavior and Quality Specification

Part of the [Agent Rumble product specification](README.md).

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

### Agent Project Card Service and Storage

To provide Agent Project Cards as a service, the system must:

* Persist each successfully validated canonical card produced for service use as
  a versioned `project-card.yaml` file, independently of the generation session
  or workspace
* Read the stored YAML files directly for API retrieval, basic search, and
  structured filtering
* Associate every stored card with its card ID, card version, schema version,
  project boundary, and Source Snapshot
* Preserve prior card versions and identify the current version without
  silently overwriting historical canonical cards
* Rebuild any temporary in-memory search state from the canonical YAML files
  rather than persisting a separate card index as a source of truth
* Keep human-readable views traceable to the canonical stored card
* Exclude embeddings, vector storage, and vector-based semantic ranking from the
  first implementation

### Access and Invocation

Provide tools as skills and as services. Support a Codex plugin first for skill
delivery. Both forms use Codex as the core harness.

The first product experience must:

* Use Codex and the Agent Project Card skill to preprocess cards for the selected
  catalog cohort
* Allow users and agents to search, retrieve, and compare those preprocessed
  cards through an API
* Provide a frontend over the same API and canonical cards

The public frontend uses the Agent Rumble name. Search-engine indexing and rich
social previews for public card pages are deferred to P2 and are not required by
the first frontend release.

P2 may add direct skill use in a user's Codex session and API or frontend intake
of a user-provided Git repository link for on-demand card generation.

All preprocessing and later on-demand generation modes must produce the same
canonical Agent Project Card and follow the same analysis and validation rules.

The Agent Project Card skill is versioned in this repository. Direct and API
adapters must select the same released skill version, including its packaged
analysis contract, schema, migration behavior, and deterministic validation.

For public marketplace distribution, the same released skill must be packaged
as a skills-only Codex plugin. The plugin version identifies the distributable
package and must not replace the card, schema, ontology, or analyzer versions.
Repository-local, API, and plugin-installed invocation must use identical skill
content and validation behavior for the same release. Marketplace publication
must not create a separately maintained copy of the skill.

### Frontend Presentation

To satisfy the
[Frontend Visual Refinement requirement](../requirements.md#visual-refinement),
the frontend must use balanced internal spacing for interpreted-requirement
pills and relaxed, size-appropriate character spacing for the “Three projects
for review” heading. The broader presentation should apply the referenced Apple
design principles through clear hierarchy, purposeful restraint, immediate
interaction feedback, consistent spatial behavior, polished typography, and
reduced-motion support.

### Implementation Technology

The [Implementation Technology requirements](../requirements.md#implementation-technology)
establish these constraints:

* Use `uv` to manage the Python portion of Agent Project Intelligence.
* Use the OpenAI Agents SDK to build the agent workflow.
* Use Codex as the project-analysis harness.
* Provide the card-generation instructions through an Agent Project Card skill attached to Codex.
* Separate application code into top-level `backend/` and `frontend/` project areas.
* Use FastAPI as the backend framework and establish its initial Python project layout under `backend/src/`.
* Use React as the frontend framework, with frontend code contained under `frontend/`.
* Use Pydantic with Python type annotations to define typed application data models.
* Use `BaseSettings` from Pydantic Settings for typed application settings.
* Use `load_dotenv()` from `python-dotenv` to load environment variables from `.env` files.

### Dependency Release Cooldown

The [Dependency Release Cooldown requirement](../requirements.md#dependency-release-cooldown)
requires a seven-day cooldown for registry dependencies resolved by `uv`.

The root `pyproject.toml` defines the `backend/` project as a `uv` workspace
member, configures `exclude-newer = "1 week"`, and requires `uv >= 0.9.17`, the
first version that supports relative cooldown durations. During a new
resolution, `uv` excludes direct and transitive registry distribution artifacts
uploaded within the preceding seven days and records the relative cooldown in
the root `uv.lock`. Locked synchronization continues to use the reviewed
versions and hashes already recorded in `uv.lock`.

The cooldown reduces exposure to newly published compromised releases but does not guarantee that dependencies are safe. It does not apply to Git, URL, or local path dependencies.

### Search and Retrieval

For the preprocessed catalog, the system must:

* Load validated canonical `project-card.yaml` files directly
* Let users and agents search cards without first submitting a repository
* Support basic keyword search over card text and structured project attributes
* Filter by category, capability, language, license, maturity, and architecture layer
* Retrieve projects relevant to a use case or requirements
* Return the card source snapshot and analysis age with results

### Comparison

For the preprocessed catalog, the system must:

* Compare projects using a shared schema
* Highlight meaningful differences
* Avoid comparing projects that serve fundamentally different roles without explaining the distinction
* Identify complementary rather than only competing projects
* State the comparison cohort, use case, requirements, and source snapshots
* Compare interface compatibility and prerequisites as well as capabilities
* Preserve unknown, not-applicable, not-analyzed, and no-evidence-found states
  rather than presenting them as negative differences

### Refresh and Change Tracking

The system should:

* Reanalyze projects when requested
* Detect material repository changes
* Preserve `card_id` and assign the next `card_version` when a canonical card is
  refreshed or changed
* Keep prior card versions identifiable instead of silently overwriting them
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
