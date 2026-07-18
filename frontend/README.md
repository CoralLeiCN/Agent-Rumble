# Agent Rumble Frontend Prototype

This directory is the project boundary for the React frontend and contains a
locally runnable prototype of the Agent Rumble product experience. Production
frontend interfaces will consume the FastAPI backend in `../backend/`; the
current prototype uses bundled schema-valid draft v0.2 sample cards so it can
be tested independently.

The prototype demonstrates one complete interaction:

1. Describe a project need.
2. Review deterministic `Must`, `Prefer`, and `Avoid` interpretation.
3. Shortlist two or three illustrative projects.
4. Compare prioritized project details in customer-readable sections and expand
   lower-priority details when needed.
5. Open the supporting source details for a consequential comparison value.

The sample cards have contract-valid draft v0.2 shape, but their project,
claim, source, revision, and locator content remains **illustrative and not
verified project intelligence**. The interface labels that limitation in the
persistent sample-data notice and source details. Do not use the sample content
for project selection or adoption decisions.

## Local Development

Use a supported Node.js LTS release. From this directory:

```shell
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

To verify a clean build and run the behavior tests:

```shell
npm run typecheck
npm test
npm run build
```

The prototype does not add a dedicated lint dependency while the production
frontend toolchain remains an open architecture choice. TypeScript compilation,
behavior tests, and the production build are the current automated checks.

To inspect the production bundle locally:

```shell
npm run preview
```

## Prototype Architecture

The prototype intentionally has no routing, state-management, component-library,
or backend dependency. View state lives in `App.tsx` so the current interaction
can be tested without accepting production architecture choices.

The reusable seams are:

* `src/types/projectCard.ts` represents the versioned draft Agent Project Card
  schema v0.2, preserving separate capability support, claim verification,
  evidence, confidence, and field-state vocabularies.
* `src/types/catalog.ts` defines typed UI projections and typed data provenance
  without becoming a second card source of truth.
* `src/data/projectCardContract.ts` reads the schema packaged with the Agent
  Project Card skill and derives the complete field-definition inventory and
  top-level order without maintaining a frontend schema copy.
* `src/data/projectCardAdapter.ts` is the only canonical-card-to-UI adapter. It
  projects structured Assessment Contexts and result rows, then recursively
  inventories every field present in selected canonical card payloads. Scalar
  values, nested objects, entity arrays, arbitrary analysis configuration,
  explicit field states, empty collections, and future unmapped properties all
  use the same generic comparison path. The adapter never infers claim
  verification from capability support. It resolves the evidence inspector
  claim-first through supporting or conflicting evidence records and full source
  provenance.
* `src/comparison/comparisonPresentation.ts` maps the exhaustive dynamic
  inventory into customer-readable sections and priority tiers. It controls
  presentation only: every row and schema-only field remains reachable, and
  unknown future groups fall back to collapsed technical details.
* `src/comparison/ContractComparison.tsx` presents four highlights per primary
  section, searchable collapsed details, exact status semantics, and supporting
  source links without exposing internal paths or record identifiers in the
  primary view.
* `src/data/catalogGateway.ts` keeps static fixtures behind a `CatalogGateway`
  and marks their provenance as `fixture`. A production HTTP adapter can return
  validated canonical cards with `validated_catalog` provenance through the
  same interface; it must not silently replace an API failure with fixture data.
* `src/status/statusPresentation.ts` is the single mapping for verification,
  confidence, requirement, and comparison-state language. Screens do not invent
  their own status colors or labels.
* `src/styles/tokens.css` separates surface, action, and verification semantics.
  Electric lime indicates actions and selection accents; confirmed evidence
  uses a distinct green token and an explicit icon-plus-text label.
* `src/data/fixtures.ts` exports JSON-compatible draft v0.2 card objects and is
  the only illustrative data source. `projectCardValidation.ts` checks their
  schema version, null-state pointers, and reference integrity in tests.

Repository evidence is rendered as inert text. The prototype never injects
source fragments as HTML and makes no model or live-analysis calls.

## Accessibility and Responsive Behavior

The primary path uses native forms, buttons, headings, disclosures, table
semantics, and a skip link. The evidence inspector closes with `Escape`, traps
`Tab` focus while open, and restores focus to its trigger. Status is never
communicated by color alone. Below 760 pixels the evidence inspector becomes
full-screen and each contract field stacks its selected project values with
visible project labels instead of compressing a wide comparison matrix.
