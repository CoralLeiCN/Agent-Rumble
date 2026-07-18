# Agent Project Intelligence

Agent Project Intelligence is a developer-oriented tool for researching
software projects in the AI agent ecosystem. It examines a project's source
code, documentation, configuration, examples, dependencies, and other relevant
evidence, then organizes its findings into a consistent, structured artifact
called an **Agent Project Card**. The card helps developers understand an
unfamiliar project quickly and provides a reliable starting point for deeper
technical research, evaluation, comparison, and adoption decisions.

The project covers more than applications that implement agents directly. It
also covers frameworks, SDKs, skills, tools, MCP implementations, retrieval and
memory systems, evaluation and observability tools, document parsers,
sandboxes, model gateways, and other infrastructure used to build or operate
agent systems.

## Why This Project Is Needed

This initiative began in response to the rapid scaling of AI agents. Coding
agents can now create and publish software projects at far greater speed and
volume than before. At the same time, enterprises are accelerating their
adoption of agents and building them for real business use cases. As both the
supply of agent technology and demand for it grow, teams need a scalable way
to discover, understand, evaluate, and select projects. Agent Project
Intelligence turns fragmented project information into consistent,
evidence-backed intelligence for those decisions.

Information about an agent-related project is usually scattered across README
files, source code, documentation sites, examples, configuration, issues, and
release notes. Understanding a project often requires time-consuming manual
investigation, and the result depends heavily on who performs the review.
Researching what already exists can save substantial engineering time and
cost: teams can reuse or extend suitable projects, learn from established
approaches, and focus new development on genuine gaps instead of rebuilding
capabilities that are already available.

A README or repository summary is not enough to reliably answer questions such
as:

* What does this project actually implement?
* Where does it fit in an agent architecture?
* Which capabilities are implemented, only documented, or merely planned?
* What technologies, services, and interfaces does it depend on?
* What would be required to integrate and operate it?
* How mature is it, and what evidence supports that assessment?
* When is it a good or poor fit for a particular use case?
* How does it compare or combine with related projects?

Agent Project Intelligence makes this investigation more consistent,
traceable, repeatable, and suitable for use at scale. It does not treat project
claims as facts without qualification: material conclusions are connected to
precise evidence, a verification status, and a confidence level.

## What the Project Produces

The canonical output is an **Agent Project Card**: a versioned,
machine-readable description of a project at an explicit source snapshot.
The concept is inspired by Model Cards and Data Cards, which use standardized
documentation to make essential characteristics, intended uses, limitations,
and supporting context easier to understand. Agent Project Cards apply that
principle to agent-related software projects. A card records information such
as:

* Project purpose, intended users, and use cases
* Project type and role in an agent architecture
* Capabilities and their support status
* Technology stack, dependencies, and deployment model
* Architecture, interfaces, prerequisites, and compatibility constraints
* Maturity indicators, security controls, and operational considerations
* Evidence-backed strengths, limitations, risks, and use-case fit
* Claims, evidence, confidence, unresolved conflicts, and open questions

Human-readable summaries and evidence views are generated from the canonical
card rather than maintained as separate sources of truth.

## How It Works

At a high level, the system:

1. Defines the project boundary and records the repositories, revisions,
   releases, and documents included in the analysis.
2. Maps the repository structure and identifies high-value source,
   configuration, dependency, documentation, example, and test files.
3. Classifies the project and investigates its capabilities, architecture,
   interfaces, and operational model.
4. Records material conclusions as claims linked to supporting or conflicting
   evidence.
5. Generates and validates the Agent Project Card and its human-readable views.

Repository content is treated as untrusted data. The initial product uses
static analysis and does not execute repository code by default.

## What the Cards Enable

Agent Project Cards are intended to become a reusable knowledge layer for:

* Quickly understanding an unfamiliar project
* Searching and filtering projects by role, capability, or technology
* Comparing projects that serve similar purposes
* Grounding a future Agent Architect in evidence from existing projects so it
  can recommend suitable technology stacks, key components, and projects to
  reuse or extend
* Performing technical due diligence and adoption planning
* Mapping the agent ecosystem and identifying capability gaps
* Analyzing ecosystem trends across projects, such as model-provider support,
  agent SDK adoption, technology choices, and capability growth over time
* Supporting evidence-based landscape and go-to-market analysis

The project deliberately avoids a single universal project score. Fit,
maturity, strengths, limitations, risks, and gaps depend on the use case,
requirements, comparison group, and point in time.

## Initial MVP

The first MVP is focused on public GitHub repositories written in Python or
TypeScript. It uses static analysis of repository-hosted source code and
documentation to produce canonical JSON or YAML cards with generated
human-readable views, claim-level evidence, confidence, and verification
status.

The initial implementation uses `uv` to manage its Python components, FastAPI
for the backend, React for the frontend, the OpenAI Agents SDK to orchestrate
the agent workflow, and Codex as the project-analysis harness that produces
Agent Project Cards. It uses Pydantic models with Python type annotations for
typed application data, Pydantic Settings for typed configuration, and
`python-dotenv` to load environment variables from `.env` files. The initial
Codex integration uses its MCP server interface.

Private-repository support, automatic code execution, continuous monitoring,
full security scanning, automated commercial conclusions, and automated
multi-project architecture generation are outside the initial MVP.

## Project Status

This repository is currently specification-first. Initial agent, backend, and
frontend technology decisions have been recorded, while the remaining product
requirements, card semantics, analysis workflow, safety boundaries, and MVP
plan are being defined before storage, detailed user-interface, and deployment
architecture are selected.

## Development Setup

Install [`uv`](https://docs.astral.sh/uv/) 0.9.17 or later, then create and
synchronize the Python environment from the repository root:

```shell
uv sync --locked
```

The project uses Python 3.12, recorded in `.python-version`. A separate
`uv python install` or `uv venv` step is not required. Run Python tools without
activating the environment by prefixing commands with `uv run --locked`.
Activating `.venv` is optional.

Dependency resolution enforces a seven-day release cooldown: registry packages
uploaded within the preceding week are not eligible for a new lockfile. Locked
installs continue to use the reviewed versions recorded in `uv.lock`.

## Project Layout

The application follows the same high-level boundary used by the FastAPI Full
Stack Template: the frontend and backend are separate top-level projects.

```text
backend/                    # FastAPI Python project, source, and tests
frontend/                   # React project boundary
docs/                       # Shared product and engineering documentation
pyproject.toml              # Root uv workspace and dependency policy
uv.lock                     # Locked Python workspace dependencies
```

This adopts the project split only. Database, authentication, container,
frontend build-tool, UI-library, and deployment choices from the reference
template are not selected by this repository structure.

## Backend Development

The FastAPI backend uses this project layout:

```text
backend/
├── pyproject.toml          # Backend package and dependency metadata
├── src/agent_project_intelligence/
│   ├── main.py             # Application factory and ASGI entry point
│   └── api/
│       ├── router.py       # Top-level API router
│       └── routes/
│           └── health.py   # Health endpoint
└── tests/
    └── api/                # API-level tests
```

Add endpoint groups under
`backend/src/agent_project_intelligence/api/routes/` and include their routers
from `backend/src/agent_project_intelligence/api/router.py`. Start the
development server from the repository root:

```shell
uv run --locked fastapi dev backend/src/agent_project_intelligence/main.py
```

The API documentation is available at `http://127.0.0.1:8000/docs`, and the
health endpoint is available at `http://127.0.0.1:8000/health`.

Run the backend tests with:

```shell
uv run --locked pytest backend/tests
```

## Frontend Development

The React frontend belongs under `frontend/`. Its build tooling, routing,
rendering mode, component libraries, and hosting have not yet been selected, so
the directory currently records the project boundary without choosing a
scaffold.

For the detailed sources of truth, see:

* [Documentation map](docs/README.md)
* [Requirements index](docs/requirements.md)
* [Product specification](docs/specification/README.md)
* [Design documents](docs/design-docs/README.md)
* [Architecture decisions](docs/decisions.md)
