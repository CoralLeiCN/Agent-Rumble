# DEC — Decision-Preparation Cohort

**Status:** Proposed

**Plan index:** [Parallel MVP Execution Plan](README.md)

This cohort prepares the product and architecture decisions that gate later
implementation. It runs in parallel with FND. Decision-preparation agents do not
have authority to approve their own recommendations.

## Entry Condition

None. Dispatch DEC-1 and the remaining DEC-2 work from the current baseline.
G-04 is already resolved by the accepted
[YAML-First Card Catalog decision](../../../decisions.md#yaml-first-card-catalog).

## Parallel Packets

### DEC-1 — Product Decisions

**Owns:** G-01, G-02, G-03

Prepare options, consequences, and a recommendation for:

* **G-01:** first-release sequence and scope for direct Codex-session, API, and
  later frontend modes.
* **G-02:** one-primary-repository versus multi-repository MVP intake; included
  linked first-party sources and popularity/community metadata; source-content
  retention boundary.
* **G-03:** representative evaluation set, rubric, reviewers, denominators, and
  any numeric acceptance thresholds.

After stakeholder approval, update the responsible requirements,
specification, and open-decision records together when applicable.

**Must not:** Choose product scope without stakeholder approval, turn a proposal
into a requirement, or unblock an implementation merely by publishing options.

**Complete when:** Each gate has an accepted, traceable outcome or remains
explicitly open with its blocked task IDs listed.

### DEC-2 — Architecture Decisions

**Owns:** G-05, G-06

Prepare options, consequences, and a recommendation for:

* **G-05:** frontend build tooling, routing/rendering approach, and required UI
  foundation if the frontend is selected for release.
* **G-06:** configurable model/runtime choices for the Agents SDK and Codex MCP
  integration and their representation in analysis configuration.

After architecture-owner acceptance, record the decision, status, date,
context, consequences, and requirement links in `docs/decisions.md` and update
its change log.

**Must not:** Implement a gated option before acceptance or use a design proposal
as though it were an architecture decision.

**Complete when:** Each accepted gate is recorded in the architecture decisions
and each unresolved gate lists the task IDs it blocks.

## Merge Order

DEC-1 and DEC-2 are independent. Merge each accepted decision as soon as its
governing records are consistent; do not wait for all six gates.

## Downstream Handoffs

| Gate | Unblocks |
| --- | --- |
| G-01 | Frontend release packets and final release-mode scope |
| G-02 | CORE-1 intake, PLAT-2 persistence, and final evaluation corpus scope |
| G-03 | Final E-01 approval and REL evaluation/release |
| G-04 (accepted) | PLAT-2 YAML persistence and PLAT-5 YAML-derived search/refresh |
| G-05 | PLAT-3, PLAT-7, and PLAT-8 frontend packets |
| G-06 | ANA-5 Agents SDK and Codex MCP orchestration |

## Cohort Exit Evidence

The coordinator maintains a gate-status summary linking each accepted decision
or unresolved blocker. DEC continues beside later cohorts until every gate is
resolved or its blocked work is explicitly deferred.
