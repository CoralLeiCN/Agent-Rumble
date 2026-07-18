# Frontend Experience

**Status:** Proposed

This design proposes a catalog-first frontend for the
[Agent Project Card tool](../specification/01-product-overview.md#core-agent-project-card-tool).
It does not add product requirements or accept unresolved frontend architecture
choices. React remains the required frontend framework; routing, build tooling,
component libraries, and hosting remain undecided.

The interaction patterns are informed by the
[Frontend Reference Research](frontend-reference-research.md).

## Product Wedge

Agent Rumble is an evidence-backed selection workspace for the AI open-source
ecosystem, powered by the Agent Project Intelligence system.

The system preprocesses a selected cohort of leading public GitHub repositories
made for or used in AI systems. A user or agent searches the resulting catalog,
builds a shortlist, and compares projects without first submitting a repository
or waiting for analysis.

The initial experience should answer:

> Which existing AI projects best match what I am trying to build, what are the
> meaningful trade-offs, and what repository evidence supports the answer?

The canonical machine-readable Agent Project Card remains the source of truth.
Search results, summaries, and comparisons are projections of versioned cards.

## Real-World Scenario: The Agent Platform Review

A regulated company's central AI platform team supports several product teams.
One product team asks to build a customer-support agent that must:

* Run in Python
* Support tool calling and human approval
* Integrate with internal knowledge through retrieval
* Emit traces through an existing observability stack
* Avoid a mandatory hosted control plane
* Be suitable for a proof of concept within two weeks

The platform architect would often ask an AI assistant to discover candidates,
read their repositories, and explain the differences. That helps with an
individual project, but each conversation starts a new exploration, may rely on
different evidence, and produces output that is difficult for another human or
agent to reuse. The inputs are also inconsistent: one project is an SDK, another
is a hosted platform, another is a narrow orchestration library, and polished or
AI-generated documentation does not reveal whether features are documented,
implemented, planned, or unclear.

With Agent Rumble, the architect searches:

> Python agent frameworks with tool calling, human approval, retrieval support,
> OpenTelemetry-compatible tracing, and no required hosted service.

The product returns evidence-backed candidates from the preprocessed catalog.
The architect shortlists three, compares them under the stated requirements, and
opens the evidence behind a key difference. The result is not a universal
winner; it is a defensible shortlist and a focused proof-of-concept plan.

The same workflow can be initiated by a downstream Agent Architect. Because the
cards are structured and machine-readable, an agent can search and compare them
without scraping repositories during the user's request.

## Why the Scenario Matters

The user's actual job is technology selection, not repository summarization.
They need to reduce:

* Discovery time across a fast-growing ecosystem
* Category errors when superficially similar projects serve different roles
* Repeated repository research across teams
* Decisions based only on popularity or README claims
* Integration surprises discovered after a project is selected
* AI recommendations that cannot be compared or traced to consistent evidence

Preprocessing makes search and comparison fast enough for an interactive
workflow while source snapshots, claim status, confidence, and evidence make the
result reviewable.

## Use-Case Priorities

| Priority | User need | Frontend response | Initial role |
| --- | --- | --- | --- |
| Primary | Find relevant reusable AI projects | Natural-language search over preprocessed cards plus structured refinement | Main entry point |
| Primary | Build a defensible shortlist | Results explain why each project matched and expose card age and confidence | Main value moment |
| Primary | Compare trade-offs for a real use case | Contextual comparison matrix over selected cards | Main demo payoff |
| Primary | Verify an important difference | Claim-level evidence inspector with precise source locators | Trust differentiator |
| Supporting | Understand one unfamiliar project | Complete Card Summary generated from the canonical card | Detail workflow |
| Supporting | Let another agent consume the intelligence | Stable search, retrieval, and comparison API over machine-readable cards | Platform story |
| P2 | Analyze a repository outside the catalog | User-provided repository intake and on-demand generation | Not shown as an unfinished initial feature |

## Primary User Journey

1. The user lands on catalog search, not repository intake.
2. The user describes what they are building or enters concrete constraints.
3. Results show matching projects across relevant architectural roles.
4. Each result explains the match, exposes important constraints, and states the
   analyzed revision and age.
5. The user adds two or three projects to a persistent comparison tray.
6. The comparison asks for or derives an explicit assessment context.
7. The interface aligns comparable fields and explains role differences before
   feature differences.
8. The user opens the evidence behind a material claim or difference.
9. The user leaves with a shortlist, unresolved questions, and recommended
   proof-of-concept checks.

## Information Architecture

### Explore

The default screen contains:

* A concise product proposition
* A large natural-language search field
* Example searches based on concrete architecture needs
* Filters for project type, architecture layer, capability, language, license,
  delivery model, and maturity
* A visible description of the current catalog cohort and last refresh
* Search results grouped or labeled by architectural role

The search action should use language such as “Find projects,” not “Ask AI.” The
value comes from the prepared intelligence corpus, not from a chat persona.

### Search Result

Each result contains only decision-relevant information:

* Project name and one-sentence summary
* Primary type and architecture layers
* Two or three reasons it matched
* Key capabilities with support status
* Language, license, and delivery model
* Material constraint or open question
* Card confidence, analyzed revision, and card age
* “Compare” and “View card” actions

Stars or popularity may appear as context if later approved, but must not drive
an unexplained rank or appear as a quality score.

### Comparison Tray

A sticky tray appears after the first project is selected. It contains up to a
small number of candidates, makes project removal easy, and provides one clear
“Compare projects” action. It should not obscure search results on small screens.

### Contextual Comparison

The comparison header restates the use case and requirements. The first rows
establish whether the projects play comparable, substitute, or complementary
roles.

Recommended comparison groups:

* Purpose, project type, and architecture role
* Requirement match and important mismatches
* Capabilities and their support status
* Interfaces, prerequisites, and compatibility constraints
* Technology and deployment model
* Maturity dimensions
* Evidence-backed strengths and limitations
* Open questions and proof-of-concept checks

These groups organize the current canonical contract but do not limit it. Every
field in the contract remains available within the decision and comparison
experience. Material differences lead, while equal, shared, and lower-priority
fields may use progressive disclosure. The field inventory comes from the
current versioned contract and selected card data rather than a fixed screen
list or fixture, allowing newly added fields and data to use the same coverage
path before they receive specialized presentation.

Cells link to supporting claims. Unknown, not applicable, not analyzed, and no
evidence found remain distinct. The interface must not turn missing evidence
into a red cross or imply that one project universally wins.

### Project Card

The detail view offers:

1. **Summary** — purpose, classification, architecture, capabilities,
   technology, maturity, strengths, limitations, and adoption guidance.
2. **Evidence** — claims grouped by verification status with precise locators
   and supporting or conflicting evidence.
3. **JSON** — the canonical machine-readable card.

### Catalog Context

Users must be able to inspect:

* The cohort definition
* Selection and exclusion criteria
* Number and kinds of projects represented
* Last preprocessing or refresh date
* Schema and ontology versions
* Known coverage limitations

This makes it possible to judge what the search results do and do not represent.

## Search Interaction Model

Natural-language search should be converted into visible, editable intent rather
than remaining an opaque prompt. For example:

```text
Query
Customer-support agent with human approval and self-hosted deployment

Interpreted requirements
[agent framework] [tool calling] [human approval]
[retrieval] [Python] [self-hosted preferred]
```

The user can remove or add requirements before comparing. This makes retrieval
behavior inspectable and establishes the Assessment Context required by the
card model.

## Trust and Status Language

Color must not be the only way to communicate status. Confidence and
verification status remain separate.

| Meaning | Suggested label |
| --- | --- |
| Statically confirmed | Confirmed in source |
| Documented | Documented |
| Claimed | Claimed by project |
| Planned | Planned |
| Conflicted | Conflicting evidence |
| Unknown | Unknown |
| Not analyzed | Not analyzed |
| No evidence found | No evidence found |

Static inspection must never be presented as runtime verification.

## Visual Direction

The interface should feel like an editorial research terminal rather than a
generic SaaS dashboard:

* Warm off-white canvas with dark ink text
* Deep navy framing for catalog and comparison context
* Electric lime accent for search actions and confirmed evidence
* Coral accent for conflicts and important limitations
* Restrained typography with monospace metadata
* Bordered content surfaces instead of decorative dashboard cards
* Dense comparison information with strong alignment and generous row spacing

## Proposed React Component Boundaries

These boundaries do not select a component library or state-management tool:

```text
AppShell
├── ProductHeader
├── ExplorePage
│   ├── CatalogSearch
│   ├── InterpretedRequirements
│   ├── SearchFilters
│   ├── CatalogContextSummary
│   ├── SearchResultList
│   │   └── ProjectResultCard
│   └── ComparisonTray
├── ComparisonPage
│   ├── AssessmentContextHeader
│   ├── ComparisonSection
│   │   └── ComparisonRow
│   └── EvidenceDrawer
└── ProjectCardPage
    ├── ProjectCardHeader
    ├── CardSummary
    ├── EvidenceView
    └── JsonCardView
```

Components should consume typed projections of canonical cards rather than
defining a second frontend-only source of truth.

## Hackathon Demo Narrative

The two-minute story should be one decision, not a product tour:

1. **Problem:** “AI can read a repository, but every discovery session starts
   again, cuts through different evidence, and produces conclusions that are
   hard for another human or agent to reuse.”
2. **Search:** Enter a realistic architecture request and immediately retrieve
   prepared, relevant projects.
3. **Shortlist:** Select three candidates and show that they occupy different or
   overlapping roles.
4. **Compare:** Reveal a decision-changing difference such as required hosted
   infrastructure, human-approval support, or observability compatibility.
5. **Verify:** Open the exact repository evidence behind that difference.
6. **Close:** “Codex turns repository evidence into a prepared intelligence
   layer, so humans and agents reach accurate discovery and trade-off decisions
   immediately instead of re-analyzing the ecosystem one request at a time.”

The demo should use committed card fixtures for reliability and clearly label
them as preprocessed results. A background preprocessing example can demonstrate
Codex's role without putting the entire live presentation on the critical path.

## First Implementation Slice

1. Commit three representative, schema-valid card fixtures with strong
   differences under one realistic scenario.
2. Implement catalog search over those cards, including visible interpreted
   requirements.
3. Implement shortlist selection and a contextual comparison matrix.
4. Implement one evidence drawer that resolves claim identifiers to precise
   source locators.
5. Add the project Card Summary and canonical JSON view.
6. Connect preprocessing and expand the cohort after the end-to-end catalog
   experience is demonstrable.

This slice demonstrates the product's differentiated search, comparison, and
evidence model before investing in on-demand repository intake.

For a recognizable hackathon comparison, candidate fixtures are the
[OpenAI Agents SDK](https://github.com/openai/openai-agents-python),
[LangGraph](https://github.com/langchain-ai/langgraph), and
[CrewAI](https://github.com/crewAIInc/crewAI). Their roles, capabilities, and
differences must come from the preprocessing results rather than being assumed
from their names or README positioning.
