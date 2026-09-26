# Agent Rumble Frontend Prototype

This directory is the project boundary for the React frontend and contains a
locally runnable prototype of the Agent Rumble product experience. It uses the
FastAPI catalog API in `../backend/`. Interactive catalog use always reads the
complete published set of preprocessed cards from that API.

The prototype demonstrates one complete interaction:

1. Describe a project need.
2. Review keyword matches and uninterpreted terms from the backend.
3. Shortlist two or three preprocessed projects.
4. Compare prioritized project details in customer-readable sections and expand
   lower-priority details when needed.
5. Open the supporting source details for a consequential comparison value.
6. Choose any two projects for a versus-fighter exhibition or guided evidence
   tour using the same pinned canonical comparison.

The Assessment Context editor exposes the use case, `Must`, `Prefer`, `Avoid`,
cohort, organizational constraints, and assessment time. Search, comparison, and
Rumble receive that context. Contextual judgments require an exact recorded
context match; other contexts remain `not_analyzed`. Keyword matches are not
proof that requirements are satisfied.

The initial development example compares OpenAI Agents SDK, LangGraph, and
CrewAI for a Python support-agent prototype with tools and workflow control.
Their version-2 cards share this context and preserve version-1 source evidence.
This is a development scenario, not a production cohort or a runtime benchmark.
The Explore screen also accepts a public GitHub URL and project boundary for
static generation, retrieval, JSON download, and manual refresh of a saved draft.
Publication remains an explicit operator step.

## Local Development

Use Node 24.20.0 (the root `.node-version`) with bundled npm 11.19.0. From this directory:

```shell
npm ci
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`, and proxies `/api`
to FastAPI on `http://127.0.0.1:8000`. Start the backend before searching. An
explicit `VITE_CATALOG_API_BASE_URL` is only needed when the API runs at a
different origin; catalog, Rumble, and generation requests use it. Requests time out
after 30 seconds, including response-body reads; generation allows 20 minutes.
Catalog and canonical Rumble failures remain visible and offer retry. They do
not substitute demo cards.

The frontend uses `/api/v1` routes. `VITE_CATALOG_API_BASE_URL` sets the host or
mount base; it does not replace that route prefix. A backend with a different
`AGENT_RUMBLE_API_PREFIX` needs corresponding proxy or frontend route changes.

Select `Browse every preprocessed project` to load the complete backend catalog.
Catalog API failures are surfaced to the user and never fall back to sample
cards.

To verify a clean build and run the behavior tests:

```shell
npm run typecheck
npm test
npm run build
```

ESLint checks TypeScript and React hook dependencies; Prettier enforces consistent
formatting. Run `npm run lint`, `npm run format:check`, and `npm run typecheck`.
`npm run format` applies formatting. The root `make check` also runs backend
checks, canonical-card validation, tests, and the production build. CI runs the
same checks plus dependency audits.

To inspect the production bundle locally:

```shell
npm run preview
```

## Prototype Architecture

The prototype intentionally has no routing, state-management, or
component-library dependency. `App.tsx` composes the screens; view state and
request coordination live in `src/catalog/useCatalogApp.ts`. Query, Assessment
Context, and shortlist IDs survive reload in `sessionStorage`, scoped to the API
host. Restoration fetches current canonical cards instead of trusting stored
card payloads. The catalog and canonical Rumble gateways are API-only. The arena
loads one pinned comparison and opens evidence through its canonical claim references.
API failures stay visible and can be retried.
Obsolete responses and failures are ignored after a newer request or navigation.
The full-card cache retains at most 32 project/version pairs and evicts the least
recently used pair; an evicted pinned version is fetched again when needed.

The reusable seams are:

- `src/types/projectCard.ts` represents the versioned pre-release Agent Project
  Card schema v0.3, preserving separate capability support, claim verification,
  confidence, and field-state vocabularies.
- `src/types/catalog.ts` defines typed UI projections and typed data provenance
  without becoming a second card source of truth.
- `src/data/projectCardContract.ts` reads the schema packaged with the Agent
  Project Card skill and derives the complete field-definition inventory and
  top-level order without maintaining a frontend schema copy.
- `src/data/projectCardAdapter.ts` is the only canonical-card-to-UI adapter. It
  projects structured Assessment Contexts and result rows, then recursively
  inventories every field present in selected canonical card payloads. Scalar
  values, nested objects, entity arrays, arbitrary analysis configuration,
  explicit field states, empty collections, and future unmapped properties all
  use the same generic comparison path. The adapter never infers claim
  verification from capability support. It resolves the evidence inspector
  claim-first through supporting or conflicting evidence records and full source
  provenance.
- `src/comparison/comparisonPresentation.ts` maps the exhaustive dynamic
  inventory into customer-readable sections and priority tiers. It controls
  presentation only: every row and schema-only field remains reachable, and
  unknown future groups fall back to collapsed technical details.
- `src/comparison/ContractComparison.tsx` presents four highlights per primary
  section, searchable collapsed details, exact status semantics, and supporting
  source links without exposing internal paths or record identifiers in the
  primary view.
- `src/data/catalogGateway.ts` provides the FastAPI HTTP gateway. Search loads
  paginated summaries; comparison fetches pinned canonical cards and
  inventories those validated cards locally through the same schema-derived path.
  It also calls `POST /catalog/compare` with the shared context and presents its
  role analysis and contextual judgments beside the exhaustive inventory.
  Catalog scope and freshness come from `GET /catalog`. Evidence links resolve
  through the backend. It never replaces an API failure with fixture data.
- `src/status/statusPresentation.ts` is the single mapping for verification,
  confidence, requirement, and comparison-state language. Screens do not invent
  their own status colors or labels.
- `src/styles/tokens.css` separates surface, action, and verification semantics.
  Electric lime indicates actions and selection accents; confirmed evidence
  uses a distinct green token and an explicit icon-plus-text label.
- `src/data/fixtures.ts` exports JSON-compatible pre-release v0.3 card objects
  for isolated tests only. `projectCardValidation.ts` checks their schema
  version, null-state pointers, and reference integrity.

The arcade layer reuses Phaser 3.90 and its Arcade Physics runtime. It is loaded
only after the user chooses an arcade mode, owns transient game state only, and
is destroyed when the player leaves. Project facts and contextual verdicts stay
in the React projection. A contextual edge supplies a signature move's name,
description, and delivery form, but never changes its damage/cooldown budget,
base fighter health, CPU difficulty, or the gameplay result.

The product evidence tour calls `POST /catalog/rumble` with the same card
versions and context as comparison. Its evidence links open the canonical
claim drawer. Synthetic responses remain confined to the frontend test suite.

The fighter frames reuse Raga2D's CC0 **Boxer Game Character** asset. Source,
license, and local modifications are recorded in
[`public/arcade/boxer/SOURCE.md`](public/arcade/boxer/SOURCE.md).

Repository evidence is rendered as inert text. The prototype never injects
source fragments as HTML. Generation calls the backend; provider credentials
and model configuration remain on the server.

## Arcade Controls

Choose any two distinct catalog projects, select `Enter Rumble`, then choose a
mode. Every pair uses pinned canonical comparison data. Evidence alone does
not establish a contextual advantage, so unresolved comparisons use neutral,
equally powered gameplay identities.

- **Solo vs CPU:** Player 1 uses `A` / `D` to move, `W` to jump, `F` to jab,
  `G` for the project-trait special, and `S` to guard. Matching touch controls
  appear on coarse-pointer devices.
- **Local 2-player:** Player 1 keeps those controls; Player 2 uses left/right,
  up to jump, `M` to jab, `N` for the trait special, and down to guard.
- **Solo fullscreen:** Starts a solo match while requesting browser fullscreen.
- **Guided evidence tour:** Walks through up to twelve canonical comparison
  rows and their evidence for the selected pair.

Use `P` or `Escape` to pause, `R` to restart, or the cabinet controls for pause,
restart, fullscreen, and exit. Each exact project-name fighter starts a round at
100 HP; the first to two round wins takes the exhibition. HP, KO, time, and
round wins come only from gameplay. Supported contextual advantages can theme
move delivery; inconclusive canonical comparisons use neutral move themes.
Evidence stays read-only and an exhibition winner is never a project winner.

## Accessibility and Responsive Behavior

The primary path uses native forms, buttons, headings, disclosures, table
semantics, and a skip link. The evidence inspector closes with `Escape`, traps
`Tab` focus while open, and restores focus to its trigger. Status is never
communicated by color alone. Below 760 pixels the evidence inspector becomes
full-screen and each contract field stacks its selected project values with
visible project labels instead of compressing a wide comparison matrix.
