# Frontend Design System

**Status:** Proposed

This document defines a reusable visual and interaction system for the Agent
Rumble prototype and a possible production frontend. It implements the visual
direction in the [Frontend Screen Design](frontend-screen-design.md) and is
informed by the [Frontend Reference Research](frontend-reference-research.md)
and the
[Apple Design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md).
It does not accept an unresolved frontend architecture choice or change the
[product specification](../specification/README.md).

## Design Thesis: Signal Ledger

Agent Rumble should feel like an evidence ledger and technical field guide: a
compact workspace where project identity, status, freshness, differences, and
source evidence are easy to scan. A small amount of visual tension can reflect
the `Rumble` name, but the interface should not use boxing metaphors or imply a
universal winner.

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
comparison details. Use `Sorted by requirement match`, `shortlist`, and
`prototype when`; do not use `best`, `winner`, or a universal score.

### Meaning before color

Every status needs a text label and, where compact presentation is needed, a
stable icon or shape. Color reinforces the label but never replaces it.
Capability support, claim verification, confidence, and null state are separate
dimensions and must never be collapsed into one badge.

### Snapshot before currency

Results and cards always disclose the analysis date, pinned revision, and
bundled or live data source. The interface must not imply that a preprocessed
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

Palette tokens describe appearance; semantic tokens describe use. Components
consume semantic tokens so a later brand or contrast update does not require
component rewrites.

| Semantic token | Prototype value | Use |
| --- | --- | --- |
| `surface.canvas` | `#F3F1E8` | Warm application background |
| `surface.paper` | `#FCFBF6` | Primary content surface |
| `surface.inverse` | `#111A2E` | Header and contextual framing |
| `text.primary` | `#111A2E` | Main text |
| `text.muted` | `#596173` | Secondary text and helper copy |
| `border.default` | `#C9C7BC` | Structural borders and dividers |
| `action.primary` | `#C8FF45` | Primary action and active focus surface |
| `action.on-primary` | `#263900` | Text on the primary action |
| `evidence.link` | `#5B7CFF` | Evidence anchors and links |
| `status.documented` | `#5B7CFF` | Documented status reinforcement |
| `status.confirmed` | `#28735A` | Static confirmation reinforcement |
| `status.conflict` | `#C64C3A` | Conflict or material limitation |
| `status.planned` | `#7B59CE` | Planned status reinforcement |

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

Use a 4-pixel base spacing unit. Controls use 8-pixel corners and major panels
use 12-pixel corners. Most surfaces use a one-pixel border and no shadow. Touch
targets remain at least 44 by 44 CSS pixels.

### Motion

Use 120–180 millisecond transitions only to preserve continuity when the
shortlist tray, comparison disclosure, filter sheet, or evidence inspector
opens and closes. Respect `prefers-reduced-motion`.

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

### Project identity and snapshots

* `ProjectIdentity` shows the Project boundary before repository metadata.
* `SourceSnapshotStrip` shows analysis date, revision, schema and ontology
  versions, and whether data came from the API or a bundled fixture.
* `CatalogContext` states cohort scope, exclusions, freshness, and limitations.

### Discovery

* `QueryComposer` describes a need without presenting a chat persona.
* `RequirementChip` distinguishes `Must`, `Prefer`, `Avoid`, and uninterpreted
  text.
* `FacetRail` and its mobile sheet expose the structured filter vocabulary.
* `ProjectResultCard` presents role, match reasons, one constraint, claim-status
  counts, snapshot metadata, and shortlist action.
* `ShortlistTray` keeps two or three projects visible and removable.

### Comparison and evidence

* `AssessmentContextHeader` defines the decision before the matrix.
* `CompareMatrix` presents roles and material differences before collapsed shared
  attributes and retains every formal null state.
* `StatusMark` renders one semantic dimension with text and icon.
* `EvidenceAnchor` uses a stable monospace identifier and evidence count.
* `ClaimBlock` separates statement, importance, verification, confidence, and
  supporting or conflicting evidence.
* `EvidenceInspector` is a side drawer on desktop and full-height dialog on
  small screens; it traps focus and restores focus to its opener.

### Card views

* `CardSummary` is a projection of the canonical Agent Project Card.
* `NullState` gives each formal non-value a distinct explanation.
* `CanonicalCardView` renders the exact API response without creating a second
  frontend-owned card model.

## Responsive and Accessibility Contract

At less than 760 pixels, filters become a sheet, comparison remains navigable
without compressing text into unreadable cells, and the evidence inspector fills
the viewport. At 760–1,080 pixels, comparison may show two project columns or
scroll horizontally. Above 1,080 pixels, the filter rail and three project
columns may remain visible.

The primary flow is keyboard operable; focus is visible; overlay focus is
contained and restored; dynamic shortlist and result counts use restrained live
regions; headings and table semantics remain useful without CSS; and repository
evidence is rendered as inert text rather than HTML.

## Prototype-to-Production Boundary

The prototype may use bundled illustrative responses and local component state,
but its types and components consume a `CatalogGateway` contract so the same
views can later receive validated FastAPI projections. Vite, SPA rendering,
routing, URL state, CSS organization, package workflow, fonts, and component
libraries remain reversible prototype choices until accepted in
[Architecture Decisions](../decisions.md).

Production adoption should add validated canonical fixtures, generated API
types, contrast and accessibility automation, visual regression coverage,
content-security policy, performance budgets, and documented token governance.
