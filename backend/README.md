# Agent Project Intelligence Backend

This directory contains the FastAPI backend and its Python project metadata.
The first-release backend loads validated, versioned Agent Project Cards from
the YAML catalog, then exposes retrieval, evidence, deterministic search, and
contextual comparison APIs for the separate React frontend. On-demand card
generation is an active product path provided separately by Agent Project Card
as a Service. Its internal direct Codex SDK harness is implemented, but
repository acquisition, publication, and public generation routes are not part
of the catalog routes documented here.

From the repository root, synchronize the locked workspace environment:

```shell
uv sync --locked
```

Start the development server:

```shell
uv run --locked fastapi dev backend/src/agent_project_intelligence/main.py
```

The default catalog root is `catalog/cards/`. Each published artifact uses:

```text
catalog/cards/{encoded_card_id}/versions/{card_version}/project-card.yaml
```

The backend validates the complete catalog before exposing any card. Optional
catalog and API `.env` settings use the `AGENT_RUMBLE_` prefix, including
`AGENT_RUMBLE_CATALOG_ROOT`, `AGENT_RUMBLE_CATALOG_MAX_FILE_SIZE_BYTES`,
`AGENT_RUMBLE_API_PREFIX`, and `AGENT_RUMBLE_DEVELOPMENT_CORS_ORIGINS`. Codex
runtime settings use the `CODEX_` names documented below.

## Generation model configuration

With no overrides, the Codex SDK uses its configured model and provider
defaults. To select a named Codex provider:

```dotenv
CODEX_MODEL=qwen-coder
CODEX_MODEL_PROVIDER=ollama
```

Or register a custom localhost endpoint for the Codex SDK process:

```dotenv
CODEX_MODEL=qwen-coder
CODEX_MODEL_PROVIDER_BASE_URL=http://localhost:11434/v1
```

If that endpoint requires a credential, set
`CODEX_MODEL_PROVIDER_ENV_KEY` to the uppercase name of an existing environment
variable containing it. Custom endpoints use
`CODEX_MODEL_PROVIDER_WIRE_API=responses`; this is also the default.
`CODEX_TURN_TIMEOUT_SECONDS` controls the complete Codex turn timeout.
Credential-bearing base URLs are rejected, and secret values are never recorded
in card analysis configuration.

The catalog API is available under `/api/v1`:

* `GET /catalog`
* `POST /catalog/search`
* `POST /catalog/compare`
* `GET /projects/{project_id}/cards/current`
* `GET /projects/{project_id}/cards/{card_version}`
* `GET /projects/{project_id}/cards/{card_version}/evidence/{evidence_id}`

Official clients encode each project or evidence identifier as one opaque path
segment: `~` followed by unpadded base64url of the UTF-8 JSON string
representation. This keeps the canonical nonempty-string identifier domain
lossless even when an ID contains slashes, whitespace, controls, Unicode, or
route-like text. Card versions remain decimal path segments.

FastAPI exposes the complete transport contract at `/docs` and
`/openapi.json`.

Run the backend tests:

```shell
uv run --locked pytest backend/tests
```

Add endpoint groups under
`src/agent_project_intelligence/api/routes/` and include their routers from
`src/agent_project_intelligence/api/router.py`.
