# Agent Project Intelligence Backend

This directory contains the FastAPI backend and its Python project metadata.
The first-release backend loads validated, versioned Agent Project Cards from
the YAML catalog, then exposes retrieval, evidence, deterministic search, and
contextual comparison APIs for the separate React frontend. The local generation
service accepts a public GitHub URL, invokes the isolated Codex SDK harness,
saves validated drafts, and supports retrieval and manual refresh. Reviewed
cards enter the public catalog through an explicit operator command. This is a
single-process local service; a public hosting destination and deployment
controls have not been selected.

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
`AGENT_RUMBLE_GENERATED_CARDS_ROOT`, `AGENT_RUMBLE_API_PREFIX`, and
`AGENT_RUMBLE_DEVELOPMENT_CORS_ORIGINS`. Codex
runtime settings use the `CODEX_` names documented below.
The API prefix applies to catalog, generation, and Rumble routes; `/health` stays at
the root.

## Generation model configuration

With no overrides, the adapter imports the selected model and provider from
`CODEX_CONFIG_HOME/config.toml` (default directory: `~/.codex`). It imports only
the selected provider's endpoint, wire API, credential reference, and retry
settings. User tools, hooks, profiles, and unrelated settings are not copied. With no
operator model configured, Codex chooses its default model and records the
unresolved model name as `unknown`. To select a named provider:

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

For OpenAI authentication, use a file-based Codex login (`auth.json` in
`CODEX_CONFIG_HOME`) or `OPENAI_API_KEY`. Custom providers may reference one
credential environment variable. Command-based authentication and provider
headers are unsupported by the isolated adapter. The selected credential is
available only to the runtime; unrelated host environment variables are removed.

Generation requires the workspace to be the Git checkout root and reads
committed text at its full HEAD commit. A specified `source_revision` must
equal that full hash. Working-tree changes, symlinks, submodules, binary files,
and files larger than 2 MiB are not analyzed.
Snapshots are limited to 20,000 tree entries and 32 MiB of selected blob data;
the byte budget is checked before binary content is filtered out. The source
tools report omitted paths so the analyzer can record coverage limitations.
Direct adapter callers supply the checkout and verify its upstream identity.
The generation API instead verifies anonymous GitHub metadata and fetches Git
objects into temporary storage without checking out files. It accepts only
uncredentialed `https://github.com/owner/repository` URLs, disables credential
helpers, hooks, redirects, and non-HTTPS Git protocols, and rejects private or
renamed repositories. Supply the current URL for a renamed repository. Each
Git command has a 120-second timeout; intake samples disk usage every 250 ms
and rejects acquisitions exceeding 256 MiB. This is a sampled application
limit, not an operating-system disk quota. The adapter checks the generated
card against the requested repository URL and acquired commit.

Codex returns YAML through its final response; only the application writes and
validates it. Runtime tool permissions deny direct host reads/writes and shell
execution. Model-generated dynamic-analysis requests or runtime-verification
labels fail validation. Temporary snapshots, output, and runtime state are
removed on success, failure, timeout, and cancellation. The validated card is
returned in memory to direct callers. The generation service persists it using
the workflow below. Client disconnection cancels acquisition and analysis; a
storage write already in progress finishes before the generation lock releases.

## Generation, storage, and publication

Run one application worker for this local workflow. Generation is synchronous:
one request runs at a time and another receives `503 generation_busy`. No queue
or background preprocessing service is used. Repository files and runtime
workspaces are deleted after analysis; only the validated card, its recorded
evidence excerpts, and a retrieval manifest remain.

By default, drafts live in ignored `var/generated-cards/`. Configure a durable
local directory with `AGENT_RUMBLE_GENERATED_CARDS_ROOT`; it must not overlap
the public catalog root. Canonical YAML versions live under `cards/`, and each
request has a UUID directory containing `result.json`. The result exposes the
validated card and retrieval ID, not filesystem paths. The local service has no
user accounts: a retrieval UUID is a locator, not an authorization mechanism.
Keep this development service local until public deployment controls are selected.

The manifest stores request metadata and card identity/version only. Retrieval
loads and validates the referenced canonical YAML; it does not keep a second
card payload in the manifest. A missing, malformed, or mismatched saved artifact
returns `500 stored_card_invalid`.

```shell
curl -X POST http://127.0.0.1:8000/api/v1/generation \
  -H 'Content-Type: application/json' \
  -d '{"repository_url":"https://github.com/openai/openai-agents-python","project_boundary":"Python package and repository documentation"}'
```

The request optionally accepts a full lowercase `source_revision` hash.
`GET /generation/{generation_id}` retrieves a saved result after restart;
`POST /generation/{generation_id}/refresh` analyzes the latest source with the
same boundary. Versions retain project/card identity and earlier history.
New submissions reuse a lineage only when the primary repository URL and exact
requested boundary match. For generated cards, the saved analysis request is
authoritative; other cards use `project.boundary`. Distinct boundaries can have
separate identities in the same repository. Ambiguous matches or identities
already used by another boundary return `409 generation_identity_conflict`.
Successful generation returns `published: false`; it never publishes to search.

Review the saved YAML, then publish it explicitly:

```shell
uv run --locked python -m agent_project_intelligence.catalog.publication \
  var/generated-cards/cards/CARD_ID/versions/VERSION/project-card.yaml
curl -X POST http://127.0.0.1:8000/api/v1/catalog/refresh
```

Substitute the actual encoded card ID and version. The command validates the
artifact, preserves its assigned version, serializes concurrent writers, and
atomically installs a new version directory. Repeating the current identical
card is a no-op. Publish versions in order: skipping or reusing a version is
rejected. The command prints the path and material changed JSON pointers.
Catalog refresh atomically replaces the in-memory snapshot only after every
file validates. Multi-worker reload coordination is outside this local workflow.

The catalog, generation, and Rumble APIs are available under `/api/v1` by default:

* `GET /catalog`
* `POST /catalog/search`
* `POST /catalog/compare`
* `POST /catalog/rumble`
* `POST /catalog/refresh`
* `POST /generation`
* `GET /generation/{generation_id}`
* `POST /generation/{generation_id}/refresh`
* `GET /projects/{project_ref}/cards/current`
* `GET /projects/{project_ref}/cards/{card_version}`
* `GET /projects/{project_ref}/cards/{card_version}/evidence/{evidence_ref}`
* `POST /rumble`

Comparison requests require two or three distinct projects, each pinned to one
card version. Multiple versions of the same project are rejected because
comparison cells are keyed by project identity. Search and comparison share
`assessment_context`: use case, cohort, requirements (`Must`), preferences,
exclusions (`Avoid`), constraints, and assessment time. Preference and exclusion
polarity is retained in canonical context matching. Keyword matching does not
prove requirement satisfaction or enforce an exclusion. An unmatched context
returns `not_analyzed` for contextual judgments.

`POST /catalog/rumble` accepts the same request with exactly two cards and
projects up to twelve canonical comparison rows with their pinned claims and
evidence. It never derives an advantage from textual facts alone. Card and
evidence retrieval supply ETags and `Cache-Control: private, no-cache`;
matching `If-None-Match` requests return `304`.
Configured development CORS origins may send `If-None-Match` and read `ETag`.

Official clients encode each project or evidence identifier as one opaque path
segment: `~` followed by unpadded base64url of the UTF-8 JSON string
representation. The `project_ref` and `evidence_ref` parameters carry these
encoded references, not raw identifiers. This keeps nonempty Unicode scalar
identifiers lossless even when an ID contains slashes, whitespace, controls,
Unicode, or route-like text. Card versions remain decimal path segments.

FastAPI exposes the complete transport contract at `/docs` and
`/openapi.json`.

Request validation and expected service errors use
`{"error":{"code":"...","message":"...","details":{}}}`. OpenAPI describes
this envelope for catalog, generation, and prepared Rumble validation failures.
Generation distinguishes invalid input or unsupported repositories (`422`),
missing results (`404` on retrieval/refresh), identity conflicts (`409`), server
storage or invalid saved-result failures (`500`), GitHub/provider failures
(`502`), concurrent generation (`503`), and acquisition timeout (`504`). Storage
writes return `500 generation_storage_failed`; they do not ask users to correct
a valid repository URL. A Codex
turn timeout is an analyzer failure (`502 codex_timeout`). Disconnection cancels
the request with `499 generation_disconnected` if a response can still be sent.
Unmatched routes and methods retain FastAPI's standard `detail` errors.

`POST /rumble` validates and projects the complete supplied matchup and evidence
registry; it does not look up published cards. It accepts one to twelve
comparison rows, validates claim ownership and source revisions, and rejects
`runtime_verified` claims and universal-score/winner fields. Synthetic request
examples live in
[`backend/tests/rumble_matchup_payloads.py`](tests/rumble_matchup_payloads.py).
The product frontend uses `POST /catalog/rumble` with pinned catalog cards.

Run the backend tests:

```shell
uv run --locked pytest backend/tests
```

Add endpoint groups under
`src/agent_project_intelligence/api/routes/` and include their routers from
`src/agent_project_intelligence/api/router.py`.
