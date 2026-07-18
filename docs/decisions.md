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

**Date:** 2026-07-18

**Related requirements:**
[Agent Project Card](requirements.md#agent-project-card),
[Core Tool and Access](requirements.md#core-tool-and-access), and
[Implementation Technology](requirements.md#implementation-technology)

#### Context

Agent Project Intelligence needs a managed Python environment, an agent
framework, and a project-analysis harness that can inspect repository content
and produce Agent Project Cards.

The selected technologies must preserve the declared project boundary,
static-analysis-only MVP scope, claim-level evidence model, and safety treatment
of repository content as untrusted data.

The same core card-generation capability must support direct use in a user's
Codex session and use through an API that can later serve a frontend.

#### Decision

* Use `uv` to manage the Python portion of Agent Project Intelligence.
* Use the OpenAI Agents SDK to implement and orchestrate the agent workflow.
* Use Codex as the repository-analysis harness invoked by that workflow to
  analyze projects and produce Agent Project Cards.
* Provide the card-generation instructions through an Agent Project Card skill
  attached to Codex.
* Allow a user to invoke that skill directly in their own Codex session.
* Wrap Codex and the same skill behind an API. For the initial API integration,
  run Codex through its MCP server interface and orchestrate it with the OpenAI
  Agents SDK.
* Allow a later frontend to submit a user-provided Git repository link to the API
  to start card generation.

Codex must operate within the declared project boundary and analysis
configuration. Its output must pass through the claim, evidence, card-schema,
and validation controls defined by the product specification.

#### Consequences

* Python environment and dependency-management workflows will use `uv`.
* Agent orchestration, handoffs, and traces will use the OpenAI Agents SDK.
* Direct Codex-session use and API use will share the Agent Project Card skill
  and canonical output contract.
* The Codex integration must not expand analysis authority or execute untrusted
  repository code in the MVP.
* Codex output is analyzer output, not a separate source of truth; the canonical
  output remains the machine-readable Agent Project Card.
* The later frontend will use the API instead of implementing a separate
  card-generation path.
* Database, search, remaining frontend design, deployment-platform,
  model-selection, service-decomposition, and delivery-sequence decisions
  remain open.

#### References

* [Use Codex with the Agents SDK](https://learn.chatgpt.com/docs/mcp-server)

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

## Change Log

| Date | Topic | Change |
| --- | --- | --- |
| 2026-07-18 | Documentation structure | Consolidated the existing accepted decisions into this topic-organized record, replaced sequence-numbered records with heading-based links, and established this single change log. |
| 2026-07-18 | Application layout | Established separate top-level frontend and backend project areas and a root `uv` workspace for the backend member. |
