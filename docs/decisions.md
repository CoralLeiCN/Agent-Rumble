# Architecture Decisions

This file is the canonical record of accepted, architecturally significant
implementation choices for Agent Project Intelligence. Decisions are organized
by topic instead of sequence-numbered records.

Each decision records its status, date, related requirements, context, decision,
and consequences. A decision does not create a stakeholder requirement or
expand product scope. When a requirement mandates a technology, the
[requirements record](requirements.md) remains the source of that constraint;
the decision records its architectural consequences and related choices.

Proposed approaches remain in [design documents](design-docs/README.md), and
unresolved choices remain in [`open-decisions.md`](open-decisions.md).

## Agent Workflow and Runtime

### Initial Agent Technology Stack

**Status:** Accepted

**Date:** 2026-07-18; revised 2026-07-28 and 2026-07-29

**Related requirements:**
[Agent Project Card](requirements.md#agent-project-card),
[Core Tool and Access](requirements.md#core-tool-and-access), and
[Implementation Technology](requirements.md#implementation-technology)

#### Context

Agent Project Intelligence needs a managed Python environment and a
project-analysis harness that can inspect repository content and produce Agent
Project Cards.

The selected technologies must preserve the declared project boundary,
static-analysis-only MVP scope, claim-level evidence model, and safety treatment
of repository content as untrusted data.

The same core card-generation capability must support direct use in a user's
coding-agent workflow and use through a hosted web service.

The current Codex SDK provides a direct Python interface to Codex threads
through the local Codex app-server and includes a pinned Codex CLI runtime.
Running Codex as an MCP server remains useful when a generic MCP client should
select Codex as a tool inside a broader agent workflow. Agent Project
Intelligence instead needs a narrow application-controlled analysis adapter
that always invokes Codex for the declared project-analysis step and returns a
typed result to the application.

A surrounding Agents SDK model was initially selected to invoke the Codex
adapter as a forced function tool. Because that model had no routing choice and
was required to make exactly one predetermined tool call, it added latency,
cost, configuration, and another failure boundary without contributing analysis
or orchestration. The Codex SDK already accepts a model and `model_provider`
when starting a thread, while the Codex runtime supports built-in local
providers and custom provider base URLs.

#### Decision

* Use `uv` to manage the Python portion of Agent Project Intelligence.
* Use Codex directly as the repository-analysis and generation runtime for
  Agent Project Cards.
* Provide the card-generation instructions through an Agent Project Card skill
  attached to Codex.
* Package that same skill as a skills-only Codex plugin for public marketplace
  distribution, with repository-local discovery pointing to the packaged skill
  rather than maintaining a second copy.
* Use the skill first to preprocess the selected repository cohort for the
  searchable and comparable catalog required by the first product experience.
* Expose preprocessed cards through an API used by users, agents, and the React
  frontend.
* Allow a user to invoke the published skill, packaged as a Codex plugin, in
  their own coding-agent workflow.
* Provide Agent Project Card as a Service so a user can submit a public GitHub
  repository link for on-demand generation through a hosted web service.
* For application integration, invoke Codex directly through the Python Codex
  SDK (`openai-codex`).
* Do not add a separate model-driven Agents SDK call around the direct Codex
  adapter when the application has no routing or orchestration decision.
* Configure the Codex model, provider, wire API, base URL, credential reference,
  and timeout through one application settings group.
* Support a localhost custom provider or a named Codex provider. Keep the Codex
  runtime default when no override is configured.
* Record the non-secret model name, provider, wire API, and base URL in the
  analysis configuration.

Codex must operate within the declared project boundary and analysis
configuration. Its output must pass through the claim, evidence, card-schema,
and validation controls defined by the product specification.

#### Consequences

* Python environment and dependency-management workflows will use `uv`.
* The Codex adapter creates Codex threads through the Python Codex SDK and
  returns a typed draft-card or failure result directly to the application.
* Generation makes one model call path instead of using a model call to dispatch
  another model call.
* Local models must implement the behavior expected by the configured Codex
  provider and wire API. Provider compatibility is an operator responsibility,
  and failures remain typed generation failures.
* Provider credentials remain runtime secrets and are not written to analysis
  configuration, canonical cards, prompts, or traces.
* The Python Codex SDK is currently beta. Its version and pinned Codex runtime
  will be reviewed and locked through the repository's `uv` dependency policy.
* Catalog preprocessing, direct skill use, and hosted on-demand generation will
  share the Agent Project Card skill and canonical output contract.
* Marketplace users will receive the same skill content through a versioned
  plugin package.
* The Codex integration must not expand analysis authority or execute untrusted
  repository code in the MVP.
* Codex output is analyzer output, not a separate source of truth; the canonical
  output remains the machine-readable Agent Project Card.
* The frontend will use catalog APIs instead of implementing separate search,
  comparison, or card-generation sources of truth.
* Card persistence and basic search are governed by the
  [YAML-First Card Catalog](#yaml-first-card-catalog) decision. Database-backed
  capabilities, advanced search, remaining frontend design,
  deployment-platform, model-selection, service-decomposition, and
  delivery-sequence decisions remain open.

#### References

* [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
* [Codex custom model providers](https://learn.chatgpt.com/docs/config-file/config-advanced#custom-model-providers)
* [Build plugins](https://learn.chatgpt.com/docs/build-plugins)
* [Submit plugins](https://learn.chatgpt.com/docs/submit-plugins)

## Application Layout

### Frontend and Backend Project Areas

**Status:** Accepted

**Date:** 2026-07-18

**Related requirement:**
[Application Layout](requirements.md#application-layout)

#### Context

Agent Project Intelligence contains a Python FastAPI backend and a React
frontend with different source trees, tests, dependencies, and development
workflows. The repository needs an explicit boundary between them while
retaining shared documentation and workspace-level configuration.

The FastAPI Full Stack Template demonstrates this boundary with separate
top-level `backend/` and `frontend/` directories and a root `uv` workspace.
Its other technology choices are not inputs to this decision.

#### Decision

* Keep the FastAPI Python project, its source, tests, and Python project metadata
  under `backend/`.
* Keep the React project, its source, tests, and frontend dependency metadata
  under `frontend/`.
* Keep shared product documentation and cross-project configuration at the
  repository root.
* Use a root `uv` workspace with `backend/` as a member so the repository can
  retain a single locked Python dependency workflow.

#### Consequences

* Backend and frontend code have visible, independent project boundaries.
* Backend-only tools can run against `backend/` without treating frontend code
  as part of the Python package.
* Frontend tooling can be selected and configured within `frontend/` without
  changing the backend project metadata.
* Shared orchestration may coordinate both projects from the repository root.
* This decision does not select frontend build tooling, routing, rendering mode,
  component libraries, hosting, a database, authentication, containers, or a
  deployment topology.

#### References

* [FastAPI Full Stack Template repository layout](https://github.com/fastapi/full-stack-fastapi-template)

## Backend

### FastAPI Application

**Status:** Accepted

**Date:** 2026-07-18

**Related requirements:**
[Backend Framework and Layout](requirements.md#backend-framework-and-layout) and
[Application Layout](requirements.md#application-layout)

#### Context

Agent Project Intelligence needs an initial backend application framework and a
source layout that can grow as API capabilities are implemented. The database,
deployment platform, and service decomposition have not yet been selected. The
frontend framework is selected separately in [React Frontend](#react-frontend).

#### Decision

* Use FastAPI as the backend framework.
* Keep the backend in the `agent_project_intelligence` Python package under
  `backend/src/`.
* Assemble the application in a small entry-point module and organize endpoint
  groups with FastAPI routers.
* Keep backend tests under `backend/tests/`, separate from the source tree.

#### Consequences

* FastAPI is a direct application dependency.
* The backend exposes an ASGI application that can be served by a compatible
  server.
* New endpoint groups can be added without concentrating all routes in the
  application entry point.
* This decision does not select persistence, deployment, or multi-service
  architecture.

### Python Data Modeling and Configuration

**Status:** Accepted

**Date:** 2026-07-18

**Related requirement:**
[Implementation Technology](requirements.md#implementation-technology)

#### Context

Agent Project Intelligence needs a consistent approach to typed Python data
models and application settings. Local development also needs a way to load
environment variables from `.env` files.

#### Decision

* Use Pydantic models defined with Python type annotations for typed application
  data models.
* Use `BaseSettings` from the `pydantic-settings` package for typed application
  settings.
* Use `load_dotenv()` from the `python-dotenv` package to load environment
  variables from `.env` files before application settings are read.

#### Consequences

* Pydantic models provide the common typed data-model convention for the Python
  application.
* Application configuration is represented by typed Pydantic Settings models.
* `pydantic-settings` and `python-dotenv` are direct application dependencies.
* Environment variables loaded from `.env` files are available to Pydantic
  Settings and other application code that reads the process environment.

#### References

* [Pydantic models](https://docs.pydantic.dev/latest/concepts/models/)
* [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
* [`python-dotenv`](https://bbc2.github.io/python-dotenv/)

### Canonical String Interoperability

**Status:** Accepted

**Date:** 2026-07-18

**Related requirements:**
[Agent Project Card](requirements.md#agent-project-card) and
[Agent Project Card Service and Storage](requirements.md#agent-project-card-service-and-storage)

#### Context

Canonical cards are YAML or JSON artifacts consumed by Python services and
browser clients. JSON and JSON Schema model strings as Unicode characters, but
some Python YAML parsers expose an escaped UTF-16 surrogate pair as two host
code points. Residual lone surrogates are not Unicode scalar values and cannot
be encoded by the backend's UTF-8 JSON response path. Treating every possible
Python `str` as a distinct canonical value would therefore create values that
cannot round-trip through the required API and frontend.

#### Decision

* Treat every canonical card string as a sequence of Unicode scalar values.
* Normalize only a well-formed high-plus-low UTF-16 surrogate-pair artifact to
  the single scalar value it represents before a validated card enters the
  catalog.
* Reject residual lone high or low surrogate code points and object-key
  collisions produced by that scalar normalization.
* Do not apply NFC, NFKC, case, whitespace, or other text normalization.
* Encode project and evidence identifiers for HTTP paths as reversible opaque
  references after applying the same scalar-value boundary.

#### Consequences

* Canonical cards remain serializable as interoperable UTF-8 JSON and YAML.
* A literal non-BMP character and its well-formed escaped surrogate-pair form
  identify the same JSON string value.
* Python-only strings containing residual surrogate code points are rejected
  during shared card validation and at API identifier boundaries.
* Whitespace, controls, slashes, case, composed/decomposed text, and other valid
  scalar-value distinctions remain exact.

#### References

* [Canonical Machine-Readable Card](specification/04-card-schema-and-outputs.md#canonical-machine-readable-card)
* [Agent Project Card validator](../plugins/agent-project-card/skills/agent-project-card/scripts/validate_project_card.py)

## Persistence and Search

### YAML-First Card Catalog

**Status:** Accepted

**Date:** 2026-07-18

**Related requirements:**
[Agent Project Card Service and Storage](requirements.md#agent-project-card-service-and-storage)
and
[Catalog-First Discovery and Comparison](requirements.md#catalog-first-discovery-and-comparison)

#### Context

The first Agent Rumble catalog contains a selected, operator-preprocessed set of
cards with manual refresh. The canonical artifact is already a validated,
versioned `project-card.yaml`. The stakeholder selected direct YAML use for the
first implementation and deferred embedding-based vector search to the backlog.

#### Decision

* Store service catalog cards as versioned canonical YAML files under a
  configurable catalog root, with `catalog/cards/` as the repository default.
* Use
  `catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml` as
  the default artifact layout, where `encoded_card_id` is the percent-encoded
  UTF-8 card ID used as one safe path segment.
* Have the backend discover, validate, parse, and retrieve cards directly from
  those YAML files.
* Select the greatest valid `card_version` for a card ID as its current version
  while retaining all earlier versions.
* Permit a disposable in-memory projection for basic keyword search and
  structured filters, rebuilt from the YAML files at startup or manual refresh.
* Do not require a relational card projection, embeddings, or a vector store for
  the first implementation. Keep vector-based semantic search in the deferred
  backlog.

#### Consequences

* The persisted YAML files remain both the canonical artifacts and the direct
  input to catalog retrieval and search.
* The first card service does not require database infrastructure or a
  synchronization path between canonical cards and a persistent search index.
* Search performance is suitable for the initial curated catalog but must be
  measured before applying the same design to a substantially larger corpus.
* Job state, user data, or later product capabilities may introduce separate
  persistence without changing the canonical card contract.
* A future semantic or vector index must be rebuildable from identified card
  versions and accepted through a later architecture decision.

#### References

* [Agent Project Card Service and Storage specification](specification/05-system-behavior-and-quality.md#agent-project-card-service-and-storage)
* [Semantic and Vector Search backlog](backlog.md#semantic-and-vector-search)

## Frontend

### React Frontend

**Status:** Accepted

**Date:** 2026-07-18

**Related requirements:**
[Frontend Framework](requirements.md#frontend-framework) and
[Application Layout](requirements.md#application-layout)

#### Context

Agent Project Intelligence needs a frontend framework for its user interface.
FastAPI is already selected as the backend framework. Frontend routing, build
tooling, rendering mode, component libraries, and hosting have not yet been
selected.

#### Decision

Use React as the frontend framework for Agent Project Intelligence and keep the
frontend project under `frontend/`.

#### Consequences

* Frontend user-interface components and application views will use React.
* The React frontend will consume the FastAPI backend interfaces.
* This decision does not select routing, build tooling, client-side or
  server-side rendering, component libraries, or frontend hosting.

### Vitest Frontend Testing

**Status:** Accepted

**Date:** 2026-07-25

**Related requirement:**
[Frontend Test Framework](requirements.md#frontend-test-framework)

#### Context

The React frontend needs a test framework for its TypeScript, application
logic, and component-behavior tests. The frontend already uses Vite and has an
implemented Vitest test suite. Jest would require a separate transformation
pipeline, while browser-focused frameworks address a different validation
layer.

Codex desktop provides a bundled Browser plugin that can inspect and interact
with local web applications. Codex can also connect to an optional Playwright
MCP server. Those development-time browser tools are distinct from a
repository-owned automated test framework and do not by themselves establish a
repeatable continuous-integration suite.

#### Decision

* Use Vitest as the frontend test framework.
* Keep Vitest configuration, dependencies, and test commands within the
  `frontend/` project area.
* Do not add Playwright to the repository at this stage.
* Evaluate Codex browser capabilities before making a later decision about
  Playwright-based real-browser or end-to-end testing.

#### Consequences

* Frontend unit and component-behavior tests run through Vitest.
* The existing colocated frontend tests and shared test support remain
  compatible with the selected framework.
* Codex browser use may support interactive development-time validation but
  does not replace committed automated regression tests.
* Real-browser, cross-browser, and full end-to-end regression coverage remains
  deferred.

#### References

* [Vitest](https://vitest.dev/)
* [Codex built-in browser](https://learn.chatgpt.com/docs/browser)
* [Codex Model Context Protocol configuration](https://learn.chatgpt.com/docs/extend/mcp)

## Change Log

| Date | Topic | Change |
| --- | --- | --- |
| 2026-07-29 | Agent workflow and runtime | Removed the redundant Agents SDK orchestration model and selected the direct Codex SDK adapter as the sole generation runtime with one model-provider settings group. |
| 2026-07-28 | Agent workflow and runtime | Replaced the Codex MCP server integration with direct Python Codex SDK invocation while retaining the Agents SDK as the surrounding workflow orchestrator. |
| 2026-07-25 | Frontend | Selected Vitest for frontend tests and deferred repository-owned Playwright testing pending evaluation of Codex browser capabilities. |
| 2026-07-18 | Agent workflow and runtime | Made direct use of the published skill packaged as a Codex plugin and hosted generation from a public GitHub repository link active delivery forms of the shared Agent Project Card capability, superseding their earlier P2 sequence. |
| 2026-07-18 | Backend | Established Unicode scalar-value semantics for canonical card strings, with surrogate-pair normalization, residual-surrogate rejection, and no other text normalization. |
| 2026-07-18 | Persistence and search | Selected a YAML-first card catalog with disposable in-memory keyword and filter state; deferred embeddings and vector search to the backlog. |
| 2026-07-18 | Agent workflow and runtime | Packaged the shared Agent Project Card skill as a skills-only Codex plugin for marketplace distribution without creating a second skill source of truth. |
| 2026-07-18 | Agent workflow and runtime | Aligned the accepted Codex integration with the catalog-first requirement: preprocessing and catalog access precede P2 direct and on-demand generation. |
| 2026-07-18 | Documentation structure | Consolidated the existing accepted decisions into this topic-organized record, replaced sequence-numbered records with heading-based links, and established this single change log. |
| 2026-07-18 | Application layout | Established separate top-level frontend and backend project areas and a root `uv` workspace for the backend member. |
