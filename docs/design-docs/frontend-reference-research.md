# Frontend Reference Research

**Status:** Research notes

This document reviews products that solve analogous discovery, normalization,
evaluation, and comparison problems in other technical categories. These
references inform the proposed [Frontend Experience](frontend-experience.md);
they do not create product requirements or accept frontend implementation
choices.

## Closest Analogue

[Data Stack Index](https://datastackindex.com/) is the closest current analogue
for Agent Rumble. It normalizes data-engineering tools into a shared schema and
supports discovery by cluster, capability, and tool. Its
[DataHub versus OpenMetadata comparison](https://datastackindex.com/data-observability/compare/datahub-vs-openmetadata/)
leads with meaningful differences, collapses shared attributes, displays a
capability matrix, exposes verification dates, and ends with contextual “pick
this if” guidance.

Agent Rumble can extend this pattern by attaching consequential conclusions to
repository-level evidence and keeping claimed, documented, statically
confirmed, conflicted, and unknown states distinct.

## Reference Products

| Product | Category | Pattern to learn from | Avoid copying |
| --- | --- | --- | --- |
| [Data Stack Index](https://datastackindex.com/) | Data engineering | Verdict first; differences before shared attributes; common schema; provenance and freshness; contextual selection guidance | Editorial conclusions without repository-level verification |
| [DB-Engines](https://db-engines.com/en/) | Databases | Start from a known system, add alternatives, and compare through sticky columnar specifications | Showing every field at once or implying contextual fit from popularity rank |
| [StackShare](https://stackshare.io/stackups/cassandra-vs-mongodb-vs-postgresql) | Developer infrastructure | Separate factual comparison, adoption decisions, and alternatives; later show “used with” relationships | Mixing popularity votes or stale community claims into verified capability facts |
| [CNCF Landscape](https://landscape.cncf.io/) | Cloud infrastructure | Governed taxonomy, category browsing, filtering, card and landscape views, transparent inclusion rules | Making a dense logo wall the default discovery experience |
| [Snyk Open Source Advisor](https://snyk.io/advisor/) | Open-source security | Compact assessment dimensions that expand into underlying observations | A single aggregate health score detached from use-case context |
| [OSS Insight Collections](https://ossinsight.io/collections) | Open-source analytics | Curated collections and change-over-time views | Treating GitHub activity as evidence of capability or architectural fit |
| [AlternativeTo](https://alternativeto.net/) | Software discovery | “Find alternatives to” entry point, constraint chips, update dates, and lifecycle warnings | Sponsored ranking or unstructured opinion presented as evidence |
| [G2 Compare](https://www.g2.com/compare) | B2B software | Low-friction two-to-four-item compare picker, persistent tray, and category-aware rows | Opaque recommendations, lead-generation friction, or commercial grids as the decision model |
| [Thoughtworks Technology Radar](https://www.thoughtworks.com/radar/faq) | Technology strategy | Small user-facing decision vocabulary and visible movement over time | A global adoption label without an Assessment Context |

## Recommended Synthesis

The frontend should combine:

1. Data Stack Index's normalized, difference-first comparison.
2. AlternativeTo's known-project and constraint-driven discovery.
3. G2's persistent shortlist limited to two-to-four projects.
4. Snyk's expandable supporting observations without its aggregate score.
5. OSS Insight's curated cohorts and temporal views.
6. CNCF's governed taxonomy presented through focused search and collections.
7. Thoughtworks Radar's concise, contextual decision states owned by the user.

The resulting interaction is:

> Search by intent, browse a curated collection, or start from a known project;
> inspect concise match reasons; shortlist two-to-four projects; see material
> differences first; open repository evidence; then record a contextual
> trade-off decision.

## Distinctive Agent Rumble Pattern

Every consequential result or comparison cell should be able to answer:

* What was observed?
* Where was it observed?
* Which project boundary and revision does it apply to?
* Is it claimed, documented, statically confirmed, conflicted, or unknown?
* How confident is the conclusion?
* Why does it matter under the user's current requirements?

This makes the prepared intelligence reusable by another AI agent instead of
being only a human-facing editorial comparison.
