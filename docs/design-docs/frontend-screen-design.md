# Frontend Screen Design

**Status:** Proposed

This document turns the [Frontend Experience](frontend-experience.md) into a
page-level design. It remains a proposal and does not select frontend build
tooling, routing, styling libraries, or a component library.

The accompanying [interactive prototype](frontend-prototype.html) uses prepared
fixture data and is not a live repository analysis.

## Experience Principle

Every screen should move the user from ecosystem breadth toward a defensible
decision:

```text
Broad intent
    ↓
Visible requirements
    ↓
Relevant projects with match reasons
    ↓
Two-to-four-project shortlist
    ↓
Material differences under one context
    ↓
Repository evidence and proof-of-concept checks
```

The interface is not a chat transcript. Natural language begins discovery, but
the product immediately turns it into structured, editable intent and stable
catalog results.

## Application Frame

### Header

The persistent header contains:

* Product wordmark
* `Explore` navigation item
* `Collections` navigation item
* Catalog freshness indicator
* `API` link for agent consumers
* A compact theme-independent status label: `Static repository analysis`

Do not place repository submission, login, pricing, or an empty comparison page
in the primary navigation for the first release.

### Content Width

* Search and project-card pages: maximum readable width around 1,240 pixels.
* Comparison page: may expand to around 1,440 pixels for three project columns.
* Main content keeps at least 24 pixels of desktop edge spacing and 16 pixels on
  small screens.

## Screen 1: Explore

### Purpose

Help a human or agent begin with a use case, a known project, or a curated
category and reach a shortlist without re-analyzing repositories.

### First Viewport

```text
┌──────────────────────────────────────────────────────────────────────┐
│ WORDMARK        Explore  Collections       Updated 2h ago   API     │
├──────────────────────────────────────────────────────────────────────┤
│  42 PREPROCESSED AI PROJECTS · SOURCE-EVIDENCED                     │
│                                                                      │
│  Stop re-analyzing. Start deciding.                                 │
│  Find AI building blocks by what you need, then compare             │
│  the evidence behind the trade-offs.                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────┐ ┌─────┐ │
│  │ Customer-support agent with human approval...         │ │Find │ │
│  └────────────────────────────────────────────────────────┘ └─────┘ │
│                                                                      │
│  Try: Stateful agent orchestration · MCP servers · Agent evals      │
│                                                                      │
│  Browse collections                                                  │
│  [Agent frameworks] [MCP servers] [Memory] [Evaluation]             │
└──────────────────────────────────────────────────────────────────────┘
```

### Hero Copy

**Eyebrow:** `PREPROCESSED · SOURCE-EVIDENCED · AGENT-READY`

**Headline:** `Stop re-analyzing. Start deciding.`

**Supporting copy:**

> Discover and compare AI projects through prepared intelligence grounded in
> repository evidence—not another pass over README claims.

**Primary action:** `Find projects`

The hero must also show catalog scope and freshness. It must not imply complete
coverage of GitHub or live repository state.

### Entry Modes

The first implementation supports:

1. **Intent search** — free text translated into visible requirements.
2. **Curated collections** — category entry points such as agent frameworks,
   skills, MCP servers, retrieval, memory, evaluation, and observability.
3. **Known project** — a secondary `Find alternatives to…` entry point after the
   primary flow works.

## Screen 2: Search Results

### Page Header

The original query remains editable. Directly below it, the product shows the
interpreted Assessment Context:

```text
[Agent framework] [Python] [Tool calling] [Human approval]
[Retrieval] [Self-hosted preferred] [Tracing]
```

Each chip can be removed. `Edit requirements` opens a compact panel for adding
hard requirements, preferences, and exclusions.

### Layout

```text
┌──────────────────┬───────────────────────────────────────────────────┐
│ FILTERS          │  8 projects · sorted by requirement match        │
│                  │                                                   │
│ Project role     │  ┌─────────────────────────────────────────────┐ │
│ Architecture     │  │ OpenAI Agents SDK          [Add to compare] │ │
│ Capability       │  │ Agent SDK · Python · MIT                    │ │
│ Language         │  │ Why it matched                              │ │
│ License          │  │ ✓ Tool calling   ✓ Human approval          │ │
│ Delivery model   │  │ ◐ Retrieval via integration                │ │
│ Freshness        │  │ Constraint: …                               │ │
│                  │  │ Confirmed 18 · Documented 7 · Unknown 2     │ │
│                  │  │ Analyzed Jul 18 · revision abc123           │ │
│                  │  └─────────────────────────────────────────────┘ │
│                  │                                                   │
│ CATALOG          │  ┌─────────────────────────────────────────────┐ │
│ 42 projects      │  │ LangGraph …                                 │ │
│ 5 categories     │  └─────────────────────────────────────────────┘ │
└──────────────────┴───────────────────────────────────────────────────┘
```

On mobile, filters move into a sheet and result metadata wraps below the match
reasons.

### Result Card Anatomy

Each result card shows:

1. Project identity and one-sentence summary.
2. Project type and architecture role before capabilities.
3. Two-to-four explicit match reasons.
4. One important mismatch, constraint, or open question.
5. Small counts by verification status.
6. Source revision and analysis date.
7. `View card` and `Add to compare` actions.

The full card is clickable only if nested actions remain keyboard-safe. Do not
show a universal fit percentage or a winner badge.

### Result Ordering

The label is `Sorted by requirement match`, not `Best projects`. Each result can
expand `Why this result?` to show the matched requirements and card fields used.

## Persistent Comparison Tray

The tray appears after the first project is selected.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ SHORTLIST  [OpenAI Agents SDK ×] [LangGraph ×] [+ Add one]          │
│                                               Compare 2 projects →  │
└──────────────────────────────────────────────────────────────────────┘
```

Rules:

* Minimum two and maximum three projects for the hackathon; four may be enabled
  after the comparison design is validated at production data density.
* Persist within the browser session.
* Show when selected projects occupy materially different roles.
* On mobile, collapse to a bottom button with the project count.
* Never hide content beneath the fixed tray.

## Screen 3: Contextual Comparison

### Comparison Header

The header answers three questions before the matrix begins:

1. What decision is being made?
2. Which requirements matter?
3. Are these substitutes, complements, or only partially comparable?

It then provides a short, non-universal conclusion:

> All three can participate in this architecture. They differ most in
> orchestration model, human-approval control, state persistence, and operational
> dependencies. Review those differences before choosing a proof-of-concept.

### Difference-First Structure

```text
┌──────────────────────┬─────────────────┬──────────────┬─────────────┐
│                      │ OpenAI Agents   │ LangGraph    │ CrewAI      │
├──────────────────────┼─────────────────┼──────────────┼─────────────┤
│ ROLE                 │ Agent SDK       │ Orchestration│ Framework   │
│ REQUIREMENT MATCH    │                 │              │             │
│ Human approval       │ Confirmed  [2]  │ Confirmed[3] │ Documented[1]│
│ Durable state        │ …               │ …            │ …           │
│ Hosted dependency    │ …               │ …            │ …           │
│ MATERIAL CONSTRAINTS │ …               │ …            │ …           │
│ PROOF-OF-CONCEPT     │ …               │ …            │ …           │
└──────────────────────┴─────────────────┴──────────────┴─────────────┘
```

The initial viewport contains only material differences. Shared attributes are
collapsed behind a disclosure whose count comes from the selected card data.
Full schema sections remain available below.

Every field in the current canonical contract remains reachable through the
matrix or complete-field sections. Difference-first presentation controls
ordering and progressive disclosure; it is not a field whitelist. A generic
contract-field presentation handles newly added fields and data until a
specialized presentation is warranted, so a fixture or final screen design does
not become a competing field contract.

### Cell Behavior

A consequential cell includes:

* Plain-language value
* Verification-status label
* Confidence label when material
* Evidence count
* Open-evidence affordance

Selecting evidence opens the inspector without losing scroll position.

### Decision Footer

The comparison ends with context-specific guidance:

* `Prototype this when…`
* `Important constraint`
* `Validate before adoption`
* `Open questions`

Use “prototype” or “shortlist,” not “winner” or “recommended overall.”

## Evidence Inspector

### Desktop

Open as a right-side drawer covering no more than 44 percent of the viewport.

### Mobile

Open as a full-screen dialog with a clear return action.

### Content

```text
CONFIRMED IN SOURCE · HIGH CONFIDENCE

Human approval can pause execution before a tool action.

Why this matters
Required by the current customer-support assessment context.

Evidence 1 of 2
src/…/approval.py · lines 42–68 · revision abc123
┌────────────────────────────────────────────────────────────┐
│ def request_approval(...):                                 │
│     …                                                      │
└────────────────────────────────────────────────────────────┘

[Open source] [Copy locator]                    Next evidence →
```

The drawer separates:

* Claim statement
* Verification status
* Confidence
* Why it matters in the current context
* Supporting and conflicting evidence
* Source provenance, revision, and locator
* Inference reasoning, if applicable

## Screen 4: Project Card

The project page supports four tabs:

1. `Overview`
2. `Capabilities`
3. `Evidence`
4. `JSON`

The first viewport shows project type, roles, one-sentence summary, source
snapshot, descriptive confidence, verification-status counts, important
constraint, and `Add to compare`.

The page also offers `Find alternatives` using the current project's type and
role as the starting context.

## Empty, Loading, and Error States

### Empty Catalog Search

Offer example intents and collections. Do not show an empty grid of cards.

### No Match

State which hard requirements removed candidates and let the user relax them.
Never fabricate a weak match to avoid an empty result.

### Partial Card

Render available sections and retain exact null states. Label missing sections
as `Not analyzed`, `Unknown`, or `No evidence found` as appropriate.

### Stale Card

Show a visible stale marker with analyzed revision and date. Do not silently
present it as current repository state.

### API Failure

For the judged demo, the frontend may fall back to a clearly labeled bundled
catalog fixture. Production should provide retry and incident messaging rather
than silently switching data sources.

## Visual System

### Color Tokens

| Token | Proposed value | Purpose |
| --- | --- | --- |
| `canvas` | `#F3F1E8` | Warm research-paper background |
| `paper` | `#FCFBF6` | Primary content surfaces |
| `ink` | `#111A2E` | Main text and deep framing |
| `ink-muted` | `#596173` | Secondary text |
| `line` | `#C9C7BC` | Visible structural borders |
| `signal` | `#C8FF45` | Primary actions and confirmed focus |
| `signal-dark` | `#263900` | Text on light signal surfaces |
| `coral` | `#FF725E` | Conflicts and material limitations |
| `blue` | `#5B7CFF` | Documented status and links |
| `violet` | `#9E78FF` | Planned status |

Status meaning must also appear in text and iconography.

### Typography

Use a strong grotesk or system sans for interface text and a monospaced face for
revisions, locators, ontology identifiers, and evidence excerpts. Avoid loading
critical web fonts for the demo unless they are bundled.

### Shape and Depth

* Corners: 8 pixels for controls, 12 pixels for major panels.
* Borders carry hierarchy; shadows are reserved for overlays and the fixed tray.
* Avoid glassmorphism, neon gradients, and generic AI sparkle iconography.

### Motion

Use motion only for state continuity: tray entry, evidence drawer, filter sheet,
and comparison row disclosure. Respect reduced-motion preferences.

## Responsive Rules

* Below 760 pixels, filters become a sheet and comparison becomes horizontally
  scrollable with the attribute column pinned.
* At 760–1,080 pixels, use two project columns or allow horizontal comparison.
* Above 1,080 pixels, show three project columns and a persistent filter rail.
* Evidence becomes full-screen below 760 pixels.
* Touch targets remain at least 44 by 44 CSS pixels.

## Accessibility Acceptance

* Search, filters, shortlist, tabs, comparison cells, and evidence drawer are
  fully keyboard operable.
* The drawer traps focus and restores it to the opening control.
* Dynamic result counts and shortlist changes use restrained live regions.
* Headings and table semantics remain meaningful without CSS.
* Status is never conveyed by color alone.
* Normal text and controls meet WCAG AA contrast.
* The interface works at 200 percent zoom without losing actions or content.

## Demo Script Alignment

The prototype should support this 90-second path:

1. Enter the prepared customer-support architecture request.
2. Reveal visible interpreted requirements and three relevant projects.
3. Add all three to the comparison tray.
4. Open the difference-first comparison.
5. Select a human-approval or hosted-dependency cell.
6. Open its precise repository evidence.
7. Close with the machine-readable JSON or agent-consumable API affordance.

The remaining presentation time explains that Codex preprocesses the catalog so
the human or agent does not repeat the analysis during discovery.
