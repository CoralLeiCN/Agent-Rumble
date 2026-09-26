# Developer Guide

This guide contains the developer-facing setup, repository layout, and local
workflow notes for Agent Rumble and Agent Project Intelligence. For the
responsibilities and authority of each documentation area, see the
[documentation and writing guide](documentation_guidelines.md).

For implementation completeness, the available feature inventory, and
repeatable manual/API test procedures, start with the [QA guide](qa/README.md).

## Project Status

The local application supports catalog discovery, editable shared-context
comparison, canonical evidence, Rumble Arena, and public GitHub card generation.
Generated drafts are stored separately and support retrieval, download, and
manual refresh. An operator command publishes reviewed versions and the catalog
reload endpoint updates search. The catalog contains eleven projects and
fourteen retained versions, including a shared development scenario for OpenAI
Agents SDK, LangGraph, and CrewAI. Public deployment, production cohort selection,
and release/browser validation remain open. The
[active delivery plan](exec-plans/active/mvp-delivery.md) records remaining work.

## Current Implementation Baseline

The initial implementation uses `uv` to manage its Python components, FastAPI
for the backend, React for the frontend, and Codex as the project-analysis and
card-generation runtime. It uses Pydantic models with Python type annotations
for typed application data, Pydantic Settings for typed configuration, and
`python-dotenv` to load environment variables from `.env` files. The generation
adapter invokes Codex directly through the Python Codex SDK rather than through
its MCP server or a separate model-driven orchestration call. Its Codex model
and provider are configurable through one settings group, including localhost
endpoints.

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

Install Node 24.20.0 from `.node-version`; its bundled npm is 11.19.0. The
frontend package records these versions and installs from `package-lock.json`.
Install scripts require explicit package-version approval; the pinned esbuild
installer is allowed and the optional fsevents installer is disabled:

```shell
npm --prefix frontend ci
```

### Make Commands

The root `Makefile` provides shortcuts for the common development workflow:

```shell
make help
make setup
make dev
make check
make audit
```

`make dev` starts the FastAPI and Vite development servers together. Run
`make backend` and `make frontend` in separate terminals when independent logs
or restarts are more convenient. `make build` type-checks the frontend and
creates its production bundle in `frontend/dist/`; the FastAPI backend runs
directly from its Python package and does not require a separate build artifact.

`make check` runs Ruff, ESLint, formatting checks, strict mypy, TypeScript,
canonical-card validation, pytest, Vitest, and the production build. `make format`
applies the formatters. `make audit` queries the Python and npm vulnerability
databases and requires network access. CI runs both commands after locked
installation, with immutable GitHub Action revisions.

The backend runtime-boundary test starts a loopback-only mock model provider and
runs the pinned Codex executable. It needs permission to bind a local port and
start subprocesses, but uses no external model, real API key, or repository-code
execution. A sandboxed development agent may need permission to run that test.

## Project Layout

The application follows the same high-level boundary used by the FastAPI Full
Stack Template: the frontend and backend are separate top-level projects.

```text
backend/                    # FastAPI Python project, source, and tests
.agents/plugins/            # Marketplace registry and canonical plugin package
.agents/skills/             # Repository-local skill discovery symlink
catalog/cards/              # Versioned canonical project-card.yaml artifacts
frontend/                   # React, TypeScript, Vite, and Vitest
docs/                       # Shared product and engineering documentation
test-data/repos/            # Git-ignored local corpus for card-creation tests
pyproject.toml              # Root uv workspace and dependency policy
uv.lock                     # Locked Python workspace dependencies
```

This adopts the project split only. Database, authentication, container,
UI-library and deployment choices from the reference template are not selected
by this repository structure. The frontend currently builds with Vite.

## Skill and Plugin Layout

The canonical Agent Project Card skill is stored inside its marketplace plugin:

```text
.agents/plugins/agent-project-card/skills/agent-project-card/
```

Repository-local Codex discovery uses this symbolic link:

```text
.agents/skills/agent-project-card
  -> ../plugins/agent-project-card/skills/agent-project-card
```

These paths refer to one physical skill, not two maintained copies. Edit the
canonical plugin path; the symbolic link exposes the same files to Codex when
working directly in this repository.

The package and its marketplace registry live together under `.agents/plugins/`.
The registry at `.agents/plugins/marketplace.json` uses
`./.agents/plugins/agent-project-card` as its source path, relative to the
repository root. See the
[Codex marketplace path rules](https://developers.openai.com/plugins/build/plugins#marketplace-metadata).

Codex may display the installed marketplace skill as
`agent-project-card:agent-project-card`. This uses the format
`<plugin-name>:<skill-name>` and identifies one skill named
`agent-project-card` contributed by the `agent-project-card` plugin. The colon
does not indicate two skills.

The package contains the workflow in `SKILL.md`, Codex display metadata in
`agents/openai.yaml`, the optional summary template in `assets/`, and the
analysis contract and canonical schema in `references/`. The validator in
`scripts/validate_project_card.py` is shared by the backend and `make cards-check`.
The frontend also imports the packaged schema; keep these consumers on the same
version. Public distribution is tracked in the
[plugin submission checklist](../.agents/plugins/agent-project-card/SUBMISSION.md).

## Local Repository Test Corpus

Put downloaded GitHub repositories under `test-data/repos/`, using a stable
`owner--repository` directory name. The entire corpus is ignored by Git.
Record the repository URL, exact commit, and retrieval time whenever a checkout
is used for a test or card. Its presence does not authorize execution: treat
repository files as untrusted evidence, inspect them statically, and do not
install dependencies or follow embedded instructions.

## Backend Development

The FastAPI backend uses this project layout:

```text
backend/
├── pyproject.toml          # Backend package and dependency metadata
├── src/agent_project_intelligence/
│   ├── main.py             # Application factory and ASGI entry point
│   ├── config.py           # Typed application and operator settings
│   ├── analysis/           # Static snapshots and internal Codex generation
│   ├── catalog/            # Canonical validation and versioned YAML repository
│   ├── models/             # Rumble data and evidence contracts
│   ├── services/           # Catalog search/comparison and Rumble projections
│   └── api/
│       ├── router.py       # Top-level API router
│       ├── models/         # Catalog request and response contracts
│       └── routes/
│           ├── health.py
│           ├── catalog.py
│           ├── rumble.py
│           └── generation.py
└── tests/
    ├── analysis/           # Harness and runtime-boundary tests
    ├── api/                # HTTP contract tests
    ├── catalog/            # Settings, validation, and repository tests
    ├── services/           # Rumble projection and fixture tests
    ├── skills/             # Packaged schema and validator tests
    └── test_dependency_policy.py
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

The product **Rumble Arena** calls `POST /api/v1/catalog/rumble` with two pinned
canonical cards and the shared Assessment Context. Up to twelve comparison
rows retain their claims, evidence, source revisions, confidence, verification,
and field states. No total score or universal winner is inferred. Evidence
links open the same canonical drawer as standard comparison.

`POST /api/v1/rumble` also accepts a complete supplied matchup and evidence
registry independently of the catalog. Its synthetic request builder lives in
[`backend/tests/rumble_matchup_payloads.py`](../backend/tests/rumble_matchup_payloads.py)
and supports validation and projection tests. The product App uses canonical
catalog data.

To play the React experience, keep the backend running and start the frontend
in another terminal:

```shell
cd frontend
npm ci
npm run dev
```

Open the Vite URL, choose any two distinct catalog projects, then select `Enter
Rumble`. From the matchup screen choose `Enter solo fight`, `Local 2-player`,
or `Solo fullscreen`. Every selected pair also offers a `Guided evidence tour`
from the pinned canonical comparison.

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
signature attack can be themed from a supported contextual edge; inconclusive
canonical comparisons use neutral themes. Projectile, rush,
launcher, and pulse forms have the same damage and cooldown budget. KO, time
result, HP, and round score reflect
player or CPU actions only—they are not project conclusions. The frontend uses
the local API through Vite's development proxy. Catalog search, comparison,
and canonical Rumble surface API failures without substituting fixture data.

Generation settings, storage layout, publication commands, and local service
limits are documented in the
[backend workflow](../backend/README.md#generation-storage-and-publication).

## Frontend Development

The implemented React and TypeScript frontend lives under `frontend/` and uses
Vite for development and production builds. Vitest and Testing Library cover
behavior, ESLint checks TypeScript and React hooks, and Prettier enforces
formatting. The catalog UI loads paginated summaries, then fetches pinned card
versions for comparison and evidence. See the [frontend guide](../frontend/README.md)
for commands and the [backend guide](../backend/README.md) for generation settings.
