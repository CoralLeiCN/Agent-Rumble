# Developer Guide

This guide contains the developer-facing setup, repository layout, and local
workflow notes for Agent Rumble and Agent Project Intelligence. For the
responsibilities and authority of each documentation area, see the
[documentation map](README.md).

## Project Status

This repository is currently specification-first. Initial agent, backend, and
frontend technology decisions have been recorded, while the remaining product
requirements, card semantics, analysis workflow, safety boundaries, and MVP
plan are being defined before detailed user-interface and deployment
architecture are selected.

## Current Implementation Baseline

The initial implementation uses `uv` to manage its Python components, FastAPI
for the backend, React for the frontend, the OpenAI Agents SDK to orchestrate
the agent workflow, and Codex as the project-analysis harness that produces
Agent Project Cards. It uses Pydantic models with Python type annotations for
typed application data, Pydantic Settings for typed configuration, and
`python-dotenv` to load environment variables from `.env` files. The initial
Codex integration uses its MCP server interface.

See the [requirements](requirements.md#implementation-technology),
[product specification](specification/05-system-behavior-and-quality.md#implementation-technology),
and [architecture decisions](decisions.md) for the authoritative constraints
and accepted choices behind this baseline.

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
catalog/cards/              # Versioned canonical project-card.yaml artifacts
frontend/                   # React project boundary
docs/                       # Shared product and engineering documentation
test-data/repos/            # Git-ignored local corpus for card-creation tests
pyproject.toml              # Root uv workspace and dependency policy
uv.lock                     # Locked Python workspace dependencies
```

This adopts the project split only. Database, authentication, container,
frontend build-tool, UI-library, and deployment choices from the reference
template are not selected by this repository structure.

## Skill and Plugin Layout

The canonical Agent Project Card skill is stored inside its marketplace plugin:

```text
plugins/agent-project-card/skills/agent-project-card/
```

Repository-local Codex discovery uses this symbolic link:

```text
.agents/skills/agent-project-card
  -> ../../plugins/agent-project-card/skills/agent-project-card
```

These paths refer to one physical skill, not two maintained copies. Edit the
canonical plugin path; the symbolic link exposes the same files to Codex when
working directly in this repository.

Codex may display the installed marketplace skill as
`agent-project-card:agent-project-card`. This uses the format
`<plugin-name>:<skill-name>` and identifies one skill named
`agent-project-card` contributed by the `agent-project-card` plugin. The colon
does not indicate two skills.

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

## Rumble Arena Development

The first playable comparison slice is **Rumble Arena**. `GET
/api/v1/rumble/demo` returns the prepared OpenAI Agents SDK versus LangGraph
matchup, and `POST /api/v1/rumble` projects it as three themed rounds. Each
projection request includes the complete prepared matchup and its validated
claim/evidence registry; a bare or invented claim reference is rejected. Each
round preserves source snapshots, claim IDs, verification status, confidence,
and exact null states. The response deliberately contains no total score or
universal winner.

To play the React experience, keep the backend running and start the frontend
in another terminal:

```shell
cd frontend
npm ci
npm run dev
```

Open the Vite URL, choose OpenAI Agents SDK and LangGraph, then select `Enter
Rumble`. From the matchup screen choose `Enter solo fight`, `Local 2-player`,
`Solo fullscreen`, or the original `Guided evidence tour`.

Arcade controls:

* Player 1: `A` / `D` to move, `W` to jump, `F` to jab, `G` for the
  contextual trait special, and `S` to guard
* Player 2: left/right and up to move and jump, `M` to jab, `N` for the
  contextual trait special, and down to guard
* `P` or `Escape` pauses; `R` restarts
* Solo mode exposes on-screen movement, jump, jab, trait, and guard controls on
  touch devices

The arcade match is a classic 2D versus fighter with human boxer animations for
idle, movement, attacks, guard, hurt, and KO. Each fighter uses the exact
project name, starts each round with 100 HP, and needs two round wins. Its
distinct signature attack is themed from that project's contextual edge in the
prepared comparison sheet; projectile, rush, launcher, and pulse forms have the
same damage and cooldown budget. KO, time result, HP, and round score reflect
player or CPU actions only—they are not project conclusions. The frontend uses
the local API through Vite's development proxy and falls back to the identical
committed snapshot when the API is unavailable.

## Frontend Development

The React frontend belongs under `frontend/`. Its build tooling, routing,
rendering mode, component libraries, and hosting have not yet been selected, so
the directory currently records the project boundary without choosing a
scaffold.
