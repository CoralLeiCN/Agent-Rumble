# Agent Project Intelligence Product Specification

* **Working product name:** Agent Project Intelligence
* **Primary output:** Agent Project Card
* **Requirements record:** [`../requirements.md`](../requirements.md)
* **Design documents:** [`../design-docs/`](../design-docs/README.md)
* **Architecture decisions:** [`../decisions.md`](../decisions.md)

This folder contains the normative product specification and this file is its
navigable entry point. The specification defines the product behavior that
satisfies the recorded requirements and traces that behavior back to requirement
topics. It does not originate stakeholder requirements or make proposed designs
and delivery plans binding. Technical approaches, delivery plans, roadmap
proposals, and unresolved decisions are maintained separately so they do not
silently become product requirements.

## Specification Files

| Sections | File | Scope |
| --- | --- | --- |
| 1–8 | [`01-product-overview.md`](01-product-overview.md) | Problem, vision, goals, users, core tool, use cases, usage modes, terminology, and product naming |
| 9–10 | [`02-classification-and-sources.md`](02-classification-and-sources.md) | Project classification, input sources, trust, and provenance |
| 11 | [`03-repository-exploration-workflow.md`](03-repository-exploration-workflow.md) | Required repository exploration and validation behavior |
| 12–14 | [`04-card-schema-and-outputs.md`](04-card-schema-and-outputs.md) | Agent Project Card semantics, output views, and proposed machine-readable structure |
| 15–17 | [`05-system-behavior-and-quality.md`](05-system-behavior-and-quality.md) | Functional behavior, quality attributes, implementation constraints, and assessment principles |
| 18–20 | [`06-mvp-scope-and-evaluation.md`](06-mvp-scope-and-evaluation.md) | Success measures, MVP scope, and acceptance criteria |

## Related Documents

* [`System Design`](../design-docs/system-design.md) describes the proposed implementation architecture and exploration strategy.
* [`Technical Risks and Mitigations`](../design-docs/risks-and-mitigations.md) records design risks and proposed responses.
* [`MVP Delivery Plan`](../exec-plans/proposed/mvp-delivery-plan.md) is a proposed plan rather than an active product commitment.
* [`Product Roadmap`](../roadmap.md) contains possible post-MVP capabilities.
* [`Open Decisions`](../open-decisions.md) records choices that remain unresolved.

## Requirement Traceability

| Requirement topic | Specification and related records |
| --- | --- |
| [Agent Project Card](../requirements.md#agent-project-card) | Sections 1–20 across the specification files above; ecosystem trends are covered specifically by [section 7.7](01-product-overview.md#77-analyze-ecosystem-trends) and [section 13](04-card-schema-and-outputs.md#13-card-output-formats). |
| [Core Tool and Access](../requirements.md#core-tool-and-access) | [Section 7](01-product-overview.md#7-core-tool-and-use-cases), [Access and Invocation](05-system-behavior-and-quality.md#access-and-invocation), the [proposed system architecture](../design-docs/system-design.md#proposed-system-architecture), and the [Agent Workflow and Runtime decisions](../decisions.md#agent-workflow-and-runtime). |
| [Implementation Technology](../requirements.md#implementation-technology) | [Implementation Technology](05-system-behavior-and-quality.md#implementation-technology), [Dependency Release Cooldown](05-system-behavior-and-quality.md#dependency-release-cooldown), the technology sections in the [System Design](../design-docs/system-design.md#initial-agent-technology-stack), and the [architecture decisions](../decisions.md). |
| [Documentation Governance](../requirements.md#documentation-governance) | [Section 4.3](01-product-overview.md#43-requirements-and-traceability), this specification index, the [documentation map](../README.md), the [repository rules](../../AGENTS.md#documentation-area-rules), and the area indexes for [design documents](../design-docs/README.md) and [execution plans](../exec-plans/README.md). |
