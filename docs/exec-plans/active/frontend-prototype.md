# Frontend Prototype Execution Plan

**Status:** Active — user local validation remains

**Date:** 2026-07-18

This plan delivers a locally testable React prototype of Agent Rumble's
catalog-first discovery and comparison experience. It does not create product
scope or accept production architecture choices.

## Outcome

Deliver one fixture-backed path that lets a user:

1. Search the prepared catalog by a realistic need.
2. Inspect and edit the visible Assessment Context.
3. Shortlist two or three projects.
4. Compare material differences without declaring a universal winner.
5. Open the claim, confidence, source revision, and precise evidence behind a
   consequential comparison cell.
6. Inspect every field in the current canonical Agent Project Card contract,
   including shared or equal fields through progressive disclosure.
7. Enter a classic 2D versus-fighter arcade mode with project-named, visibly
   animated fighters, health bars, fullscreen play, and contextual-trait-themed
   attacks while gameplay results remain separate from project assessment.

The prototype must run locally without a backend, model call, repository
analysis, account, or user-provided repository intake. Illustrative data must be
clearly labeled as a bundled prototype snapshot rather than validated project
intelligence.

## Delivery Progress

The implementation now consumes schema-valid, illustrative draft-v0.2 Agent
Project Card fixtures through a versioned canonical-card adapter. UI projections
remain derived views rather than a second card source of truth. The adapter
preserves card and schema versions, exact field states, Assessment Context, and
the claim-to-supporting-or-conflicting-evidence-to-source chain. Comparison now
recursively inventories the selected card payloads rather than using a
screen-specific row list. It keeps shared fields, computes difference counts,
preserves exact JSON Pointers internally, and provides a generic presentation
path for new card properties. The comparison also reads field definitions and
top-level order directly from the schema packaged with the Agent Project Card
skill, while keeping schema-only array fields separate from real project rows.

Customer-facing copy no longer exposes hackathon, implementation, or internal
review language. A presentation-only projection groups the exhaustive field
inventory into customer-readable sections, ranks decision-relevant details,
shows at most four highlights per primary section, and keeps all remaining
fields in collapsed disclosures. Card identifiers, schema versions, field-state
maps, sources, and future unknown groups remain reachable without becoming
standalone primary sections.

The packaged Agent Project Card structural and semantic validation passes for
all prototype fixtures. Frontend type checking, behavior tests, and the
production build also pass. Twenty-one behavior tests verify every reachable
scalar, explicit null, primitive collection, and known-empty container; shared
fields; all four formal non-value states; and runtime discovery of an added
property without a presentation whitelist. They also verify schema-derived
field coverage, customer section partitioning, highlight limits, future-field
fallback, customer-facing copy, and the complete interaction path. A local Vite
development smoke test confirms that the packaged schema is served directly.
The data remains illustrative, and the user has not yet completed responsive,
zoom, reduced-motion, and browser keyboard validation; this plan therefore
remains **Active**.

The Rumble Arena vertical slice consumes the local FastAPI projection endpoint
when available and retains a visibly labelled bundled snapshot for reliable
demonstration. Its Phaser runtime provides solo and local play, state-driven
CC0 boxer animation, touch controls, and embedded or fullscreen presentation.

## Source Traceability

The implementation must preserve these accepted inputs:

* Catalog-first search and comparison:
  [`Catalog-First Discovery and Comparison`](../../requirements.md#catalog-first-discovery-and-comparison),
  [`Catalog-First Access`](../../specification/01-product-overview.md#catalog-first-access),
  [`Search and Retrieval`](../../specification/05-system-behavior-and-quality.md#search-and-retrieval),
  and [`Comparison`](../../specification/05-system-behavior-and-quality.md#comparison).
* Public naming and formal terminology:
  [`Public Product Naming`](../../requirements.md#public-product-naming) and
  [`Product Naming`](../../specification/01-product-overview.md#product-naming).
* Canonical-card projections and exact status semantics:
  [`Agent Project Card Schema`](../../specification/04-card-schema-and-outputs.md#12-agent-project-card-schema),
  [`Claims, Evidence, and Confidence`](../../specification/04-card-schema-and-outputs.md#1221-claims-evidence-and-confidence),
  and [`Card Output Formats`](../../specification/04-card-schema-and-outputs.md#13-card-output-formats).
* MVP boundaries and acceptance behavior:
  [`MVP Scope`](../../specification/06-mvp-scope-and-evaluation.md#19-mvp-scope)
  and [`MVP Acceptance Criteria`](../../specification/06-mvp-scope-and-evaluation.md#20-mvp-acceptance-criteria).
* Contract-driven frontend field coverage:
  [`Canonical Card Field Coverage`](../../requirements.md#canonical-card-field-coverage),
  [`Compare Similar Projects`](../../specification/01-product-overview.md#72-compare-similar-projects),
  [`Comparison`](../../specification/05-system-behavior-and-quality.md#comparison),
  and [`MVP Acceptance Criteria`](../../specification/06-mvp-scope-and-evaluation.md#20-mvp-acceptance-criteria).
* Customer-facing and compact comparison presentation:
  [`Customer-Facing Presentation`](../../requirements.md#customer-facing-presentation),
  [`Compact Comparison Hierarchy`](../../requirements.md#compact-comparison-hierarchy),
  and [`Frontend Presentation`](../../specification/05-system-behavior-and-quality.md#frontend-presentation).
* Arcade comparison behavior:
  [`Rumble Arena`](../../requirements.md#rumble-arena),
  [`Rumble Arena specification`](../../specification/01-product-overview.md#78-rumble-arena),
  and [`Comparison`](../../specification/05-system-behavior-and-quality.md#comparison).
* Required React framework:
  [`Frontend Framework`](../../requirements.md#frontend-framework) and the
  accepted [`React Frontend`](../../decisions.md#react-frontend) decision.

The visual and interaction proposal should follow the
[`Frontend Reference Research`](../../design-docs/frontend-reference-research.md),
[`Frontend Experience`](../../design-docs/frontend-experience.md), and
[`Frontend Screen Design`](../../design-docs/frontend-screen-design.md). The
reusable visual and semantic contract is recorded in the proposed
[`Frontend Design System`](../../design-docs/frontend-design-system.md). Those
documents remain proposals and do not override the requirements or
specification.

## Prototype Decision Boundary

React is accepted. The following are reversible prototype choices made only to
produce a fast local test surface:

| Concern | Prototype choice | Production boundary |
| --- | --- | --- |
| Build | Vite with strict TypeScript | Does not accept production build tooling. |
| Rendering | Client-side SPA | Does not decide public-page rendering, prerendering, or SSR. |
| Navigation | Lightweight in-app view state | Does not select a production router or URL contract. |
| State | React local state, with session storage only where the shortlist needs refresh resilience | Does not select a global state or server-cache library. |
| Data | Typed bundled fixtures behind a small catalog adapter | Does not define a frontend-owned card model or production API contract. |
| Styling | CSS custom properties plus locally scoped CSS | Does not select a production styling system or component library. |
| Components | Native semantic elements and small local primitives | Does not accept a production UI dependency. |
| Arcade runtime | Lazily loaded Phaser 3.90 with Arcade Physics and a vendored CC0 boxer animation set | Does not make Phaser part of card analysis or accept a permanent game-engine architecture. |

The prototype must keep transport, fixture data, status presentation, and visual
tokens behind replaceable seams so later production work can connect canonical
FastAPI projections without rewriting page compositions.

## Reusable Design-System Seams

Implement a small system with five layers:

1. **Foundations:** named color, spacing, type, radius, border, elevation,
   motion, breakpoint, and focus tokens. Start from the proposed warm paper,
   dark ink, lime signal, coral conflict, blue documented, and violet planned
   palette.
2. **Semantic status model:** separate capability support status, claim
   verification status, confidence, and the exact `unknown`, `not_applicable`,
   `not_analyzed`, and `no_evidence_found` states. Text and iconography must
   accompany color.
3. **Primitives:** button, link, chip, badge, field, panel, tabs, disclosure,
   dialog or drawer, and visually hidden/live-region helpers.
4. **Product patterns:** search intent, interpreted-requirement group, result
   card, shortlist tray, comparison row and cell, source snapshot, and evidence
   inspector. A contract-field presenter derives its inventory from the current
   versioned contract and selected card data, with a generic fallback for fields
   without specialized presentation.
5. **Page compositions:** Explore/results, contextual comparison, and a compact
   Project Card/JSON view if the primary path is already complete.

Reusable components must receive typed data rather than infer project fit,
confidence, or evidence status. Repository evidence must render as inert text.
All controls must remain keyboard operable, status cannot rely on color alone,
motion must respect reduced-motion preferences, and touch targets must be at
least 44 by 44 CSS pixels.

## Milestones

### 1. Shell, Fixtures, and Foundations

* Scaffold the Vite React TypeScript application and local commands.
* Add typed bundled catalog, comparison, claim, source, and evidence fixtures.
* Add tokens, primitives, status mapping, application frame, and fixture label.
* Confirm the prototype makes no backend or model request.

### 2. Explore, Results, and Shortlist

* Implement the prepared customer-support query and example entry points.
* Show editable `Must`, `Prefer`, and `Avoid` requirements.
* Show role-first result cards with match reasons, constraint or open question,
  revision, analysis date, and separate status dimensions.
* Add and remove up to three projects in a persistent session shortlist.
* Provide no-result and partial-data behavior without fabricating weak matches.

### 3. Contextual Comparison and Evidence

* Restate the decision context and role relationship before feature differences.
* Show material differences first and collapse shared attributes.
* Keep every field in the current canonical contract reachable, including equal
  and shared fields, while using progressive disclosure to preserve a compact
  decision-first view.
* Preserve exact non-value states and avoid scores, winner labels, and red-cross
  treatment of missing evidence.
* Open a keyboard-safe evidence inspector from a consequential cell without
  losing comparison position.

### 4. Complete Contract Field Coverage

* Replace the fixture-specific comparison row inventory with one derived from
  the current versioned contract and selected card data.
* Keep the Card Summary compact and the comparison difference-first while making
  every canonical field available through complete-field sections and
  progressive disclosure.
* Provide a generic presentation path for newly added fields until a specialized
  component is warranted.
* Add coverage tests that compare the contract field inventory with the
  presentation inventory and exercise populated, newly added, equal, shared,
  and formal non-value fields.

### 5. Responsive and Local Validation

* Support narrow mobile, intermediate, and wide desktop layouts.
* Add the compact Project Card/JSON view only after the primary path is stable.
* Run type checking, linting, tests, production build, keyboard review, and the
  user-test checklist below.
* Keep this plan Active until the local commands pass and the user completes or
  accepts the test path.

### 6. Arcade Game Mode

* Offer solo play against a lightweight CPU and local two-player play from the
  prepared matchup intro.
* Keep exact project names and both health bars visible during play.
* Render human-looking fighters with visible idle, walk, jab, trait-special,
  guard, hurt, and KO movement using the vendored CC0 boxer frame set.
* Keep trait-derived attacks traceable to prepared comparison findings while
  preserving equal health, damage, cooldown, and combat budgets.
* Offer fullscreen from the mode chooser and the live cabinet, with embedded
  play remaining available when fullscreen is blocked.

## File Ownership

To avoid overlapping edits during delegated implementation:

| Owner | Paths | Responsibility |
| --- | --- | --- |
| Frontend implementation agent | `frontend/**` | Scaffold, typed fixtures, adapter, components, styles, tests, and local run instructions. |
| Product/design reviewer | Read-only across `frontend/**`; findings reported to the coordinator | Check traceability, terminology, visual-system reuse, responsive behavior, and status semantics. |
| Coordinator | `docs/exec-plans/**` and final integration review | Maintain this plan, resolve scope questions, and report validation status. |

No owner may change requirements, specification, architecture decisions, or
unrelated backend files under this plan. Proposed production choices require a
separate accepted decision before they become binding.

## Local Validation

The implementation agent must expose and document commands equivalent to:

```shell
cd frontend
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

The prototype does not select a dedicated lint tool while the production
frontend toolchain remains open. Type checking, behavior tests, and the
production build are required; production adoption must add the accepted lint
and formatting workflow.

Current recorded result:

* Packaged structural and semantic validation passes for every illustrative
  draft-v0.2 Agent Project Card fixture.
* Frontend type checking, 21 behavior tests, and production build pass.
* Development-mode loading of the packaged schema through Vite passes.
* Contract-derived field inventory and complete-field presentation coverage
  tests pass.
* Arcade controls change live match state, all 45 boxer frames load, the
  fullscreen controls are present, and leaving the mode destroys the runtime.
* User-run local browser, responsive, zoom, reduced-motion, keyboard, and network
  inspection remain outstanding.

Validation must also confirm:

* A clean local browser can complete the prepared path using bundled fixtures.
* The production build starts without privileged environment variables.
* Browser network inspection shows no model, repository-analysis, or unexpected
  external request.
* The primary flow works at approximately 390, 768, and 1,280 CSS pixels, at
  200 percent zoom, with reduced motion, and by keyboard alone.
* Evidence locators and revisions remain visible, and fixture content is never
  rendered as HTML.

## User-Test Checklist

The local tester should be able to answer yes to each item:

* Is it immediately clear that Agent Rumble searches a prepared catalog rather
  than analyzing a submitted repository live?
* Can I start from the prepared need and understand the visible `Must`, `Prefer`,
  and `Avoid` interpretation?
* Do result match reasons, role differences, constraints, revisions, and card
  dates make the shortlist defensible?
* Can I add and remove two or three projects without losing context?
* Does comparison explain whether projects are substitutes, adjacent, or
  complementary before comparing capabilities?
* Are consequential differences visible before shared attributes?
* Can I inspect every field in the current canonical card contract, including
  fields that are equal or shared across the selected projects?
* If a fixture supplies more card data or the contract gains a field, does it
  appear without adding that field to a final-mock or screen-specific whitelist?
* Can I distinguish capability support, claim verification, confidence, and
  missing-information states without relying on color?
* Can I open precise evidence, see why it matters, and return to the same place?
* Does the interface avoid universal scores, winner language, popularity-led
  ranking, and claims that static evidence is runtime verification?
* Is the paper-and-ink editorial research identity coherent across desktop and
  mobile, and do the tokens/components feel reusable beyond the prototype?
* Can I complete the full path with keyboard controls and at 200 percent zoom?
* Can I identify both projects by fighter name, see both health bars, move,
  attack, guard, take damage, and enter fullscreen before or during a match?
* Do the fighters read as human characters with visible state-driven movement,
  without presenting the arcade victor as the better project?
* Are any confusing labels, missing decision details, or visual-system gaps
  recorded before the prototype is considered complete?

## Completion Condition

Move this plan to `completed/` only after the prototype is runnable locally, the
validation commands pass, the primary path is keyboard and responsive tested,
every current canonical contract field is reachable through contract-derived
coverage with its semantics preserved, the contract-field coverage tests pass,
and the user-test findings are either resolved or explicitly accepted. Contract
field coverage is implemented and automated checks pass; user local validation
remains outstanding, so the current status is **Active**.
