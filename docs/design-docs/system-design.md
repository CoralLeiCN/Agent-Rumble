# System Design

This design describes a proposed implementation of the [Agent Rumble product
specification](../specification/README.md) and its underlying Agent Project
Intelligence system. Accepted technology choices are recorded in the
[architecture decisions record](../decisions.md).

## Proposed System Architecture

The sections below describe logical responsibilities, not independently deployable services. The MVP should keep them together in a small end-to-end implementation unless an accepted architecture decision justifies further decomposition.

The repository has separate top-level `backend/` and `frontend/` project areas.
Shared product documentation and cross-project configuration remain at the
repository root. This is a source and tooling boundary, not a decision to deploy
the frontend and backend as independently operated services. A root `uv`
workspace includes the Python backend as a member and retains one locked Python
dependency workflow.

### Core Agent Project Card Tool

The core tool consists of Codex as the project-analysis harness and an Agent Project Card skill attached to Codex. The skill provides the card-generation instructions. It must preserve the declared project boundary and the analysis, evidence, schema, and validation rules in the product specification.

The core tool first feeds the preprocessed catalog and may later support
user-initiated generation:

* **Catalog preprocessing adapter:** an operator-managed workflow invokes Codex
  and the skill for repositories in the selected catalog cohort.
* **Catalog API:** users, agents, and the frontend search, retrieve, and compare
  preprocessed cards.
* **Direct Codex-session adapter (P2):** the user invokes the skill in their own
  Codex session.
* **On-demand API adapter (P2):** a user-provided Git repository link starts card
  generation through the API.

The adapters must not create separate card definitions or analysis rules. Every
generation path invokes the same core capability and produces the same canonical
Agent Project Card.

### Agent Project Card Skill Package

The Agent Project Card capability should be distributed as one Codex skill with
progressively disclosed resources. Keeping one skill avoids separate direct and
API workflows drifting apart while allowing detailed schema and evidence rules
to remain outside the skill's short core instructions.

The canonical first draft lives in a skills-only Codex plugin. Repository-local
skill discovery uses a symlink to that same package so marketplace and direct
Codex use cannot drift:

```text
.agents/
├── plugins/
│   └── marketplace.json
└── skills/
    └── agent-project-card -> ../../plugins/agent-project-card/skills/agent-project-card
plugins/agent-project-card/
├── .codex-plugin/
│   └── plugin.json
└── skills/
    └── agent-project-card/
        ├── SKILL.md
        ├── agents/
        │   └── openai.yaml
        ├── assets/
        │   └── card-summary-template.md
        ├── references/
        │   ├── analysis-contract.md
        │   └── project-card.schema.json
        └── scripts/
            ├── migrate_v01_card.py
            └── validate_project_card.py
```

The repository path `.agents/skills/agent-project-card` points to
`../../plugins/agent-project-card/skills/agent-project-card`. The repository
path and plugin path resolve to the same physical skill; they are not two skill
implementations. In Codex skill lists, the installed plugin contribution may
appear as `agent-project-card:agent-project-card`, using the namespace format
`<plugin-name>:<skill-name>`. This names one skill within one plugin and is
independent of the repository symlink.

Responsibilities:

* `SKILL.md` defines the end-to-end workflow, safety boundaries, required
  outputs, and when to load each bundled reference. It should link to detailed
  rules instead of repeating the schema.
* `agents/openai.yaml` provides the Codex-facing display name, concise
  description, and default prompt generated from the completed skill.
* `assets/card-summary-template.md` provides the human-readable Card Summary
  layout populated only from a validated canonical card. It preserves snapshot,
  field-state, assessment-context, claim, evidence, and source semantics without
  becoming a second card definition.
* `references/analysis-contract.md` provides the project-boundary, exploration,
  card-versioning, claim, evidence, confidence, verification,
  assessment-context, and stopping rules from the specification.
* `references/project-card.schema.json` is the versioned machine-readable schema
  used by both access modes. It should be generated or copied during packaging
  from the product's canonical schema artifact and checked by digest so it is
  not a separately maintained source of truth.
* `scripts/migrate_v01_card.py` upgrades a stakeholder-schema v0.1 card without
  guessing information lost through empty values or compact evidence statuses.
* `scripts/validate_project_card.py` performs deterministic structural and
  semantic validation before Codex returns a card.

The package should be validated with the Codex skill validator, and each bundled
script should have representative tests. Skill packaging validation does not
replace validation of generated Agent Project Cards.

The plugin manifest supplies the marketplace package version, publisher and
listing metadata, starter prompts, and the bundled `./skills/` path. The
repository marketplace entry enables installation testing before public
submission. Public release uses the Codex plugin submission and review process;
repository packaging alone does not publish the plugin.

### Skill Execution Workflow

The skill should guide Codex through the following stages:

1. Establish the project boundary, included sources, exact revisions, analysis
   depth, explicit exclusions, and card lineage. New cards start at version 1;
   refreshes retain the card ID and advance the card version.
2. Treat repository and documentation content as untrusted evidence and map the
   project before drawing conclusions.
3. Classify the project using the v0.1 primary-type vocabulary plus the
   versioned extension rules in the specification.
4. Collect user-meaningful capabilities, direct architectural technologies,
   components, usage information, relationships, and assessment signals.
5. Create stable claims, sources, and precise evidence records; keep confidence,
   verification, capability support, and v0.1 compatibility status distinct.
6. Synthesize `project-card.yaml` using the current schema, record card and
   schema versions independently, and populate explicit field states rather
   than leaving unavailable values ambiguous.
7. Run deterministic schema and semantic validation. If validation cannot pass,
   return the validation findings and an incomplete artifact rather than
   silently dropping required data or inventing values.
8. Generate the human-readable Card Summary and evidence view only from the
   validated canonical card.

### Schema Validation and Migration

Validation should have two layers:

* **Structural validation** checks the schema version, required groups, field
  types, identifiers, controlled values, and references.
* **Semantic validation** checks that revisions are exact when available,
  capability evidence references resolve, claim and evidence links are not
  dangling, assessments identify a context, static analysis is not labeled
  runtime verification, direct technologies are distinguished from transitive
  dependencies, and unavailable fields have an explicit state.

The v0.1 migration path should preserve every supplied field that has a direct
v0.2 representation. It should map the v0.1 top-level groups to their v0.2
counterparts, split inline evidence claims into claim and evidence records, and
emit warnings for lossy conversions. In particular, it should map empty values
to `unknown`, retain `evidence_status` as a compatibility projection, and never
infer runtime verification from `confirmed`.

### Intake

Responsibilities:

* Project-boundary definition
* Branch, tag, commit, package, release, and documentation selection
* Analysis configuration
* Job creation
* Permission validation

### Repository Ingestion Layer

Responsibilities:

* Clone or fetch repository content
* Build file index
* Extract metadata
* Parse supported files
* Respect repository size and file-type limits

### Local Repository Test Corpus

The root-level `test-data/repos/` area provides reusable inputs for Agent
Project Card creation tests. Each downloaded repository uses a stable
`owner--repository` child-directory name. The whole corpus directory is ignored
by Git so nested repositories and large third-party sources are not added
accidentally.

Tests must record the repository URL, exact revision, and retrieval time rather
than relying on an unrecorded branch tip. Downloaded content remains untrusted
and is available for static inspection only under the MVP safety boundary.

### Repository Mapper

Responsibilities:

* Detect languages
* Identify packages and modules
* Find documentation
* Detect entry points
* Build dependency graph
* Identify likely high-value files

### Exploration Planner

Responsibilities:

* Form an initial project hypothesis
* Decide what to inspect next
* Allocate exploration budget
* Adapt the plan based on findings
* Stop when sufficient evidence has been gathered

### Specialized Analyzers

Potential analyzers include:

* Documentation analyzer
* Dependency analyzer
* Agent-loop analyzer
* Tool and skill analyzer
* MCP analyzer
* Retrieval analyzer
* Document-processing analyzer
* Deployment analyzer
* Security analyzer
* Evaluation analyzer
* Maintenance analyzer

### Evidence Store

Stores:

* Claims
* Evidence references
* Confidence
* Analysis timestamps
* Source snapshots, revisions, retrieval times, and content digests
* Extracted entities
* Relationships

### Card Synthesizer

Responsibilities:

* Merge analyzer outputs
* Resolve conflicts
* Generate the canonical card
* Enforce the schema
* Create human-readable views from the machine-readable card

### Validation Agent

Responsibilities:

* Check unsupported claims
* Check contradictions
* Check missing sections
* Review classifications
* Identify uncertain conclusions
* Check that source content did not override analysis instructions
* Check that assessments declare their context
* Flag possible hallucinations

### Card Store

The card store persists each validated canonical Agent Project Card produced for
service use as a versioned YAML artifact independently of the generation session
or workspace. The proposed repository layout is:

```text
catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml
```

`encoded_card_id` is the percent-encoded UTF-8 card ID used as one safe path
segment. Each file contains its unencoded card ID, card version, schema version,
project boundary, and Source Snapshot. Publication validates the complete card
before placing it at its final path. Historical versions remain in place, and
the greatest valid card version is the current version for service retrieval.

### Card Index

For the first implementation, the backend scans and parses the validated YAML
catalog at startup and after a manual refresh. It may retain an in-memory
projection for the lifetime of the process, but that projection is disposable
and rebuildable from the YAML files.

The YAML-derived search path supports:

* Keyword search
* Structured filtering
* Comparison

Embedding generation, vector storage, and semantic ranking are deferred to the
[backlog](../backlog.md#semantic-and-vector-search).

### Initial Agent Technology Stack

The [Core Tool and Access](../requirements.md#core-tool-and-access) and
[Implementation Technology](../requirements.md#implementation-technology)
requirements establish the following implementation constraints:

* `uv` manages the Python portion of Agent Project Intelligence.
* The OpenAI Agents SDK implements and orchestrates the agent workflow.
* Codex provides the project-analysis harness used to analyze projects and produce Agent Project Cards.
* An Agent Project Card skill attached to Codex provides the shared
  card-generation instructions for catalog preprocessing and P2 direct or
  on-demand use.

For catalog preprocessing, the initial integration runs Codex through its MCP
server interface and orchestrates it with the OpenAI Agents SDK. The agent
workflow supplies the declared project boundary and analysis configuration and
invokes Codex with the Agent Project Card skill available. Codex output then
passes through the claim, evidence, card-schema, and validation controls defined
in the product specification before it enters the catalog.

P2 direct Codex-session and on-demand API modes use the same skill and remain
subject to the same output and validation contract.

The [Initial Agent Technology Stack decision](../decisions.md#initial-agent-technology-stack)
records this choice and its consequences. The
[YAML-First Card Catalog decision](../decisions.md#yaml-first-card-catalog)
selects direct YAML storage and basic YAML-derived search for the first
implementation. Database-backed capabilities, advanced search,
deployment-platform, model-selection, and service-decomposition choices remain
open. Catalog preprocessing and catalog access precede the P2 direct Codex-session
and on-demand API modes. The backend and frontend framework choices are recorded
below.

### Backend Application Framework

The [Backend Framework and Layout requirement](../requirements.md#backend-framework-and-layout)
establishes FastAPI as the backend framework. The initial backend uses a Python
package under `backend/src/`, a small application entry point, modular
`APIRouter` route groups, and a test tree under `backend/tests/`. The backend
owns its Python project metadata in `backend/pyproject.toml`. A health endpoint
provides the first runnable vertical slice and a stable target for
application-level tests.

The [FastAPI Application decision](../decisions.md#fastapi-application) records
the framework and layout choice. Persistence, deployment, and
service-decomposition choices remain open.

### Python Data Modeling and Configuration

The [Python Data Modeling and Configuration requirement](../requirements.md#python-data-modeling-and-configuration)
establishes Pydantic and Pydantic Settings as the Python data-modeling and
configuration libraries. Application data models use Pydantic models with
Python type annotations. Typed application settings inherit from
`BaseSettings` in `pydantic-settings`, and `load_dotenv()` from `python-dotenv`
loads environment variables from `.env` files before those settings are read.

The [Python Data Modeling and Configuration decision](../decisions.md#python-data-modeling-and-configuration)
records these choices and their configuration responsibilities.

### Frontend Framework

The [Frontend Framework requirement](../requirements.md#frontend-framework)
establishes React as the frontend framework. The React frontend consumes
interfaces provided by the FastAPI backend and is contained within the
top-level `frontend/` project area.

The [React Frontend decision](../decisions.md#react-frontend) records this choice.
Frontend routing, build tooling, rendering mode, component libraries, and
hosting remain open decisions.

---

## Exploration Strategy

A staged approach is recommended.

### Level 1: Repository Triage

Fast inspection of:

* README
* Repository metadata
* Top-level files
* Dependencies
* Documentation
* Examples

Purpose: classify the project and decide whether deeper analysis is needed.

### Level 2: Targeted Technical Analysis

Inspect important modules, configuration, extension points, and representative workflows.

Purpose: generate a reliable card without reading the entire repository.

### Level 3: Deep Architecture Analysis

Trace execution paths, inspect tests, reconstruct data and control flows, and evaluate production characteristics.

Purpose: support technical due diligence and architectural recommendation.

### Level 4: Dynamic Analysis

Optional execution in an isolated environment.

Purpose:

* Verify setup instructions
* Run examples
* Inspect runtime behavior
* Validate API claims
* Capture errors
* Measure basic operational characteristics

Dynamic analysis should not be part of the first MVP.
