# System Design

This design describes a proposed implementation of the [Agent Project Intelligence product specification](../specification/README.md). Accepted technology choices are recorded in the [architecture decisions record](../decisions.md).

## Proposed System Architecture

The sections below describe logical responsibilities, not independently deployable services. The MVP should keep them together in a small end-to-end implementation unless an accepted architecture decision justifies further decomposition.

### Core Agent Project Card Tool

The core tool consists of Codex as the project-analysis harness and an Agent Project Card skill attached to Codex. The skill provides the card-generation instructions. It must preserve the declared project boundary and the analysis, evidence, schema, and validation rules in the product specification.

The core tool has two adapters:

* **Direct Codex-session adapter:** the user invokes the skill in their own Codex session.
* **API adapter:** Agent Project Intelligence wraps Codex and the same skill behind an API. A later frontend sends a user-provided Git repository link to this API to start card generation.

The adapters must not create separate card definitions or analysis rules. Both invoke the same core capability and produce the same canonical Agent Project Card.

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

### Card Index

Supports:

* Keyword search
* Semantic search
* Structured filtering
* Similarity retrieval
* Comparison
* Downstream recommendations

### Initial Agent Technology Stack

The [Core Tool and Access](../requirements.md#core-tool-and-access) and
[Implementation Technology](../requirements.md#implementation-technology)
requirements establish the following implementation constraints:

* `uv` manages the Python portion of Agent Project Intelligence.
* The OpenAI Agents SDK implements and orchestrates the agent workflow.
* Codex provides the project-analysis harness used to analyze projects and produce Agent Project Cards.
* An Agent Project Card skill attached to Codex provides the shared card-generation instructions for direct Codex-session and API use.

For the API adapter, the initial integration runs Codex through its MCP server interface and orchestrates it with the OpenAI Agents SDK. The agent workflow supplies the declared project boundary and analysis configuration and invokes Codex with the Agent Project Card skill available. Codex output then passes through the claim, evidence, card-schema, and validation controls defined in the product specification.

In the direct Codex-session mode, the user invokes the same skill in their own Codex session. The direct mode remains subject to the same output and validation contract even though it does not pass through the API adapter.

The [Initial Agent Technology Stack decision](../decisions.md#initial-agent-technology-stack)
records this choice and its consequences. Database, search,
deployment-platform, model-selection, and service-decomposition choices remain
open. The direct Codex-session and API usage modes are selected; their delivery
sequence remains open. The backend and frontend framework choices are recorded
below.

### Backend Application Framework

The [Backend Framework and Layout requirement](../requirements.md#backend-framework-and-layout)
establishes FastAPI as the backend framework. The initial backend uses a Python package under `src/`,
a small application entry point, modular `APIRouter` route groups, and a
separate test tree. A health endpoint provides the first runnable vertical
slice and a stable target for application-level tests.

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
interfaces provided by the FastAPI backend.

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
