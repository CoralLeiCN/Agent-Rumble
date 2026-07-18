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

Provide the Agent Project Card tool as a published skill packaged as a Codex
plugin for a user's own coding-agent workflow and as Agent Project Card as a
Service. The hosted service accepts a public GitHub repository link and
generates a card. Both forms use Codex as the core harness.

The first product experience must:

* Use Codex and the Agent Project Card skill to preprocess cards for the selected
  catalog cohort
* Allow users and agents to search, retrieve, and compare those preprocessed
  cards through an API
* Provide a frontend over the same API and canonical cards
* Allow a user to generate a card from a public GitHub repository link through
  Agent Project Card as a Service
* Allow a user to invoke the published skill, packaged as a Codex plugin, in
  their own coding-agent workflow

The public frontend uses the Agent Rumble name. Search-engine indexing and rich
social previews for public card pages are deferred to P2 and are not required by
the first frontend release.

All preprocessing and on-demand generation modes must produce the same
canonical Agent Project Card and follow the same analysis and validation rules.

The Agent Project Card skill is versioned in this repository. Direct-plugin and
hosted-service adapters must select the same released skill version, including
its packaged analysis contract, schema, and deterministic
validation.

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

For decision and comparison workflows, the frontend must provide access to every
field defined by the current canonical Agent Project Card contract. The current
versioned contract and card data determine field coverage; a fixed list copied
from a mock fixture or final screen design must not become a competing field
contract. When the canonical contract adds a field or a card supplies additional
data, the frontend must make it available in the experience while preserving the
field's card semantics.

To satisfy the
[Customer-Facing Presentation requirement](../requirements.md#customer-facing-presentation),
the public interface must use customer-facing product language and omit
hackathon, implementation, project-infrastructure, and internal review labels.
Search and comparison copy must explain the experience in plain terms rather
than expose internal contract or processing terminology.

To satisfy the
[Compact Comparison Hierarchy requirement](../requirements.md#compact-comparison-hierarchy),
the comparison must group fields into understandable customer sections and
avoid repeating information already shown in the surrounding project or
comparison context. Purpose and fit, material capability differences,
constraints, prerequisites, and integration details have the highest initial
priority. Supporting source detail and technical record metadata have secondary
priority and remain available through collapsed disclosure. Card identifiers,
schema versions, and similar record metadata must not create standalone
sections. Presentation priority controls initial visibility only; it must not
remove fields supplied by the canonical contract or selected card data.

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
* Send frontend search requests to the backend catalog API and render results
  derived from the validated cards returned by that API
* Rank and filter basic keyword results according to how meaningfully the query
  matches project identity, purpose, use cases, capabilities, technologies, and
  architecture, while keeping the ranking deterministic and explainable
* Explain each result in customer-facing language using the matched card data
* Filter by category, capability, language, license, maturity, and architecture layer
* Retrieve projects relevant to a use case or requirements
* Return the card source snapshot and analysis age with results

### Comparison

For the preprocessed catalog, the system must:

* Compare projects using the current shared canonical Agent Project Card contract
* Highlight meaningful differences
* Make every canonical card field available for each selected project, including
  fields that are equal across the selected cards
* Derive the comparison field inventory from the current card contract and card
  data rather than a fixture-specific or screen-specific field list
* Avoid comparing projects that serve fundamentally different roles without explaining the distinction
* Identify complementary rather than only competing projects
* State the comparison cohort, use case, requirements, and source snapshots
* Compare interface compatibility and prerequisites as well as capabilities
* Preserve claim, evidence, confidence, verification, Source Snapshot, and
  unavailable-value semantics when presenting any field
* Preserve unknown, not-applicable, not-analyzed, and no-evidence-found states
  rather than presenting them as negative differences
* Allow a two-project comparison to be projected as Rumble Arena themed rounds
  and as an actively playable arcade game mode
* In arcade game mode, let player input control play and change the active match
  state; themed styling, animation, or a linear round viewer alone is not
  sufficient
* Present arcade play in a classic 2D versus-fighter style, label each fighter
  with its project's public name, and show a health bar for each fighter
* Render human-looking fighters with visible body movement, reusing an existing
  or open-source character design where one is available
* Offer a user-initiated fullscreen option for arcade play
* Give each fighter distinct attacks themed around that project's contextual
  winning trait in the prepared comparison-sheet projection, with the theme
  traceable to its comparison trait and Assessment Context
* Derive every project fact, assessment, and contextual advantage communicated
  in Rumble Arena from the same card and comparison data used by the standard
  comparison
* Treat contextual-trait-derived attacks as presentation and gameplay identity,
  not as canonical assessments or evidence that one project is universally
  better
* Do not automatically translate contextual verdicts, evidence quantity,
  confidence, verification status, or null states into fighter health, damage,
  reach, speed, or another combat advantage
* Keep player actions, transient match state, and any gameplay outcome distinct
  from project claims and assessments
* Permit a gameplay win, loss, or draw according to player actions and game
  rules without using that result to score either project, establish contextual
  fit or advantage, or alter either canonical Agent Project Card
* State contextual round advantages without totaling the rounds, calculating a
  universal project score, or declaring a universal project winner
* Treat a role mismatch, equivalent contextual fit, or insufficient evidence as
  a trade-off or inconclusive round rather than forcing a winner

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
