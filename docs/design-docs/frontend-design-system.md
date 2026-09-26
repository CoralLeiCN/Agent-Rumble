# Frontend Design System

**Status:** Design guidance; production extensions remain proposed

This document defines a reusable visual and interaction system for the Agent
Rumble prototype and a possible production frontend. It is informed by the
[Apple Design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md).
It does not accept an unresolved frontend architecture choice or change the
[product specification](../specification/README.md).

## Design Thesis: Signal Ledger

Agent Rumble should feel like an evidence ledger and technical field guide: a
compact workspace where project identity, status, freshness, differences, and
source evidence are easy to scan. Catalog and evidence views use plain research
language. Rumble Arena uses boxing and arcade presentation while keeping the
gameplay outcome separate from project assessment and avoiding a universal
project winner.

The system combines:

* Dense project identity and filtering patterns from
  [GitHub Explore](https://github.com/explore) and
  [Hugging Face Models](https://huggingface.co/models).
* Restrained registry presentation from the
  [official MCP Registry](https://registry.modelcontextprotocol.io/).
* Stable entity shells and extensible detail sections from the
  [Backstage Software Catalog](https://backstage.io/docs/features/software-catalog/).
* Provenance and version drill-down from
  [Open Source Insights](https://deps.dev/) and check-level evidence from
  [OpenSSF Scorecard](https://scorecard.dev/), without copying their aggregate
  scores.
* Difference-first comparison and visible freshness from
  [Data Stack Index](https://datastackindex.com/).

These are interaction references, not templates. Agent Rumble's distinctive
pattern is the direct path from a contextual conclusion to a claim, precise
evidence, verification status, confidence, and pinned Source Snapshot.

## Interaction Flow

1. Start with a use case and an editable Assessment Context, including Must,
   Prefer, Avoid, cohort, constraints, and date.
2. Search the prepared backend catalog and show keyword match reasons, project
   roles, source revisions, and analysis dates. Keyword matches do not certify
   requirement satisfaction or enforce exclusions.
3. Shortlist two or three projects within the browser session. Pin their card
   versions for comparison and evidence inspection.
4. Explain project-role relationships before contextual differences. Prioritize
   useful details while keeping every schema/data field reachable through
   disclosure and search.
5. Open a claim-first evidence drawer with independent verification/confidence,
   supporting and conflicting evidence, precise locators, and source provenance.
   Preserve comparison position and restore keyboard focus on close.
6. For two projects, offer canonical Rumble and arcade play under the same
   context. Inconclusive assessments remain neutral in the presentation.
7. Offer explicit public GitHub draft generation separately from catalog
   search, with retrieval, download, and manual refresh. Publication remains an
   operator action.

Loading, empty, partial-data, and error states preserve the same data boundary.
API failures show retryable errors; they never substitute fixture cards. The
[feature inventory](../qa/feature-inventory.md) identifies implemented controls
and API-only features.

## Apple-Informed Refinement

The prototype also applies the web-oriented principles in the referenced
[Apple Design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md)
where they reinforce Agent Rumble's purpose:

* Use the platform system font, optical sizing, size-specific tracking, and
  balanced leading instead of applying one mechanical tracking value globally.
* Give controls immediate press feedback and keep transitions restrained,
  interruptible, and free of decorative bounce.
* Use translucent material only for floating functional layers such as the
  sticky header, shortlist tray, and evidence inspector; keep evidence surfaces
  opaque enough to remain legible.
* Preserve spatial consistency and user agency through visible back actions,
  focus restoration, and reversible navigation.
* Respect reduced-motion, reduced-transparency, and increased-contrast
  preferences.

These principles refine craft and interaction behavior; they do not replace the
Signal Ledger identity with an Apple product imitation. The warm research
canvas, navy framing, evidence semantics, and difference-first information
architecture remain distinctive to Agent Rumble.

## Principles

### Evidence before decoration

Use typography, alignment, borders, and whitespace to establish hierarchy.
Reserve shadow for overlays and the fixed shortlist tray. Do not use decorative
gradients, glass effects, AI sparkles, score rings, or background particles.

### Context before ranking

Show the Assessment Context and project-role relationship before fit or
comparison details. Explain keyword relevance and use contextual language such
as `shortlist` and `prototype when`; do not describe ranking as verified
requirement satisfaction or a universal score.

### Meaning before color

Every status needs a text label and, where compact presentation is needed, a
stable icon or shape. Color reinforces the label but never replaces it.
Capability support, claim verification, confidence, and null state are separate
dimensions and must never be collapsed into one badge.

### Snapshot before currency

Results and cards always disclose the analysis date, pinned revision, and
canonical source snapshot. The interface must not imply that a preprocessed
card describes the current repository head.

### Density with progressive disclosure

Keep the initial result and comparison views compact, then disclose claims,
shared attributes, evidence, and raw card data without losing the user's query,
shortlist, or scroll context.

### Purposeful craft and immediate feedback

Apply the Apple Design skill through deliberate hierarchy, size-specific
typography, balanced control spacing, predictable spatial behavior, and
immediate press feedback. Use restrained, interruptible motion only where it
clarifies state changes, with reduced-motion and reduced-transparency
alternatives. Preserve Agent Rumble's evidence-ledger identity rather than
imitating an Apple product surface.

## Foundations

### Color tokens

The implemented values live in
[`tokens.css`](../../frontend/src/styles/tokens.css). Components consume these
semantic tokens; update the source and this table together when values change.

| Semantic token | Prototype value | Use |
| --- | --- | --- |
| `--color-canvas` | `#F3F1E8` | Warm application background |
| `--color-paper` | `#FCFBF6` | Primary content surface |
| `--color-frame` | `#111A2E` | Header and contextual framing |
| `--color-text` | `#111A2E` | Main text |
| `--color-text-soft` | `#596173` | Secondary text and helper copy |
| `--color-line` | `#C9C7BC` | Structural borders and dividers |
| `--color-action` | `#C8FF45` | Primary action and active focus surface |
| `--color-action-text` | `#263900` | Text on the primary action |
| `--color-link` | `#3159DC` | Evidence anchors and links |
| `--color-documented` | `#345BD6` | Documented status reinforcement |
| `--color-verified` | `#137A5A` | Confirmation reinforcement; text distinguishes static and runtime status |
| `--color-conflict` | `#B84032` | Conflict or material limitation |
| `--color-planned` | `#7654C2` | Planned status reinforcement |

The electric signal color is an interaction accent, not a claim that something
was verified. Normal text, controls, and status combinations must meet WCAG AA
contrast, including forced-colors and 200 percent zoom checks.

### Type

Use a strong system sans stack for interface text and the system monospace stack
for evidence identifiers, locators, revisions, versions, and ontology names.
The prototype avoids a network font dependency. A production typography choice
can replace these stacks through tokens without changing component structure.

Use a compact type scale with a deliberately large landing headline, readable
body copy, and 11–12 pixel uppercase metadata only when the text is supplementary.
Do not render essential content below 14 pixels. Use size-specific tracking:
large display text may be moderately tightened, while body text remains near
zero. Avoid extreme negative tracking that harms word-shape recognition.

### Space, shape, and depth

The implemented spacing scale starts at `0.25rem`. Control and panel radius
tokens are `0.625rem` and `1rem` respectively; surface, raised, and overlay shadow
tokens distinguish elevation. Touch targets should remain at least 44 by 44 CSS
pixels; verify them in the browser checks.

### Motion

The shared responsive transition is 140 milliseconds. Use motion to clarify
state changes and preserve continuity. Respect `prefers-reduced-motion`.

## Semantic Status Grammar

One shared presenter maps canonical values to labels, icons, tone, and accessible
descriptions. Screens must not define their own ticks, crosses, or colors.

| Dimension | Examples | Presentation rule |
| --- | --- | --- |
| Capability support | Claimed, documented, statically confirmed, runtime verified, partially implemented, planned, deprecated | Show exact support label; static and runtime confirmation use distinct icons and text. |
| Claim verification | Documented, statically confirmed, runtime verified, unverified, conflicted | Pair the claim with evidence count and open-evidence action. |
| Confidence | High, medium, low, unknown | Show as a separate textual attribute, not as the status color. |
| Null state | Unknown, not applicable, not analyzed, no evidence found | Preserve the exact state and explain it; never render a generic negative mark. |

Suggested compact icon grammar uses a quotation mark for claimed, document for
documented, square check for statically confirmed, diamond check for runtime
verified, half-fill for partially implemented, clock for planned, slash for
deprecated, and opposing arrows for conflicted. Accessible names always include
the full label.

## Reusable Components

These names describe design responsibilities, not a required source-file
layout. Proposed controls are identified separately below.

### Project identity and snapshots

* `ProjectIdentity` shows the Project boundary before repository metadata.
* `SourceSnapshotStrip` shows analysis date, revision, schema and ontology
  versions, and canonical source provenance.
* `CatalogContext` states cohort scope, exclusions, freshness, and limitations.

### Discovery

* `QueryComposer` describes a need without presenting a chat persona.
* `RequirementChip` distinguishes `Must`, `Prefer`, `Avoid`, and uninterpreted
  text.
* `ProjectResultCard` presents role, match reasons, one constraint, claim-status
  counts, snapshot metadata, and shortlist action.
* `ShortlistTray` keeps two or three projects visible and removable.

### Comparison and evidence

* `AssessmentContextHeader` defines the decision before the matrix.
* `CompareMatrix` presents roles and material differences before collapsed shared
  attributes, keeps every current contract field reachable through progressive
  disclosure, and retains every formal null state.
* `ContractFieldView` derives its field inventory from the current versioned
  contract and card data, preserves card semantics, and provides a generic
  presentation for fields that do not yet have a specialized component.
* `StatusMark` renders one semantic dimension with text and icon.
* `EvidenceAnchor` uses a stable monospace identifier and evidence count.
* `ClaimBlock` separates statement, importance, verification, confidence, and
  supporting or conflicting evidence.
* `EvidenceInspector` is a side drawer on desktop and full-height dialog on
  small screens; it traps focus and restores focus to its opener.

### Card views

* `CardSummary` is an intentionally compact projection of the canonical Agent
  Project Card, not the complete-field inspection surface.
* `NullState` gives each formal non-value a distinct explanation.
* `CanonicalCardView` renders the exact API response and keeps every contract
  field available without creating a second frontend-owned card model.

## Responsive and Accessibility Contract

At less than 760 pixels, comparison fields stack their project values with
visible project labels, and the evidence inspector fills the viewport. Wider
layouts align two or three project columns without hiding values or actions.

The primary flow is keyboard operable; focus is visible; overlay focus is
contained and restored; dynamic shortlist and result counts use restrained live
regions; headings and table semantics remain useful without CSS; and repository
evidence is rendered as inert text rather than HTML.

## Prototype-to-Production Boundary

The prototype uses the complete validated FastAPI catalog through a
`CatalogGateway` contract and local component state. Illustrative catalog
responses are test-only; interactive catalog failures must remain visible.
The product Rumble tour uses the same pinned canonical cards and shared context
as standard comparison and opens evidence by canonical claim reference.
Synthetic fixtures remain test-only. Browser validation remains in the
[delivery plan](../exec-plans/active/mvp-delivery.md#browser-and-user-validation).
SPA rendering, routing, URL state, CSS organization, fonts, and component
libraries remain reversible prototype choices unless accepted in
[Architecture Decisions](../decisions.md). Runtime versions, locked installs,
linting, and formatting follow the accepted
[development quality checks](../decisions.md#development-quality-checks).

Validated canonical fixtures and contract-derived field coverage are implemented.
Further production work should evaluate generated API types and add contrast
and accessibility automation, visual regression coverage,
content-security policy, performance budgets, and documented token governance.
Fixture objects and screen-specific row lists must not define field coverage.
The production contract adapter and coverage tests should detect newly added
contract fields and ensure they remain available through the generic field
presentation until specialized treatment is introduced.

Structured filter controls and a dedicated catalog-card page remain design
proposals. A filter rail could become a sheet on mobile; a card page could group
summary, capabilities, evidence, and canonical JSON. Their detailed metadata
behavior and production navigation remain [open decisions](../open-decisions.md).
