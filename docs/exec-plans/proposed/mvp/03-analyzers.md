# ANA — Analyzer-and-Orchestration Cohort

**Status:** Proposed
**Plan index:** [Parallel MVP Execution Plan](README.md)

This cohort implements base analyzers, the two core access adapters,
project-type-specific analyzer packs, the application service, and semantic
validation.

## Entry Condition

Checkpoint I-1 is published. G-06 must be accepted before ANA-5 starts.

## Round A — Base Analyzers and Access Adapters

Dispatch ANA-1 through ANA-5 together when their gates are satisfied.

### ANA-1 — Documentation Analyzer

**Task:** A-01

Extract documented purpose, users, use cases, capabilities, setup constraints,
interfaces, architecture statements, releases, plans, and deprecations from
repository-hosted documentation.

**Must not:** Label documentation as static confirmation or write canonical
cards directly.

**Complete when:** Every material finding is `documented` and has a precise
source locator.

### ANA-2 — Python Static Analyzer

**Task:** A-02

Extract packages, imports, public interfaces, entry points, framework usage,
configuration, representative control flow, and test/deployment indicators
without importing or executing project code.

**Complete when:** Reviewed Python fixtures produce expected evidence-backed
static findings and unsupported syntax fails explicitly.

### ANA-3 — TypeScript Static Analyzer

**Task:** A-03

Extract packages, imports, exports, entry points, framework usage,
configuration, representative control flow, and test/deployment indicators
without installing dependencies or executing scripts.

**Complete when:** Reviewed TypeScript fixtures produce expected evidence-backed
static findings and unsupported syntax fails explicitly.

### ANA-4 — Direct Plugin Mode

**Task:** K-02

Exercise the shared skill packaged as a Codex plugin against representative
fixtures in a user's coding-agent workflow. Document invocation and validate
canonical output and generated views.

**Must not:** Create a direct-mode-only skill, schema, or validation path.

**Complete when:** A user can invoke the published plugin skill in their
coding-agent workflow and obtain a validated canonical card plus generated
views for a supported fixture.

### ANA-5 — Agents SDK and Codex MCP Orchestration

**Task:** K-03
**Gate:** G-06

Implement the Agents SDK workflow that invokes Codex through MCP with the shared
skill, explicit analysis request, allowed tools, budgets, and traceable
configuration. Parse raw output into the canonical contract before it can be
accepted.

**Must not:** Implement FastAPI routes or persistence, accept raw model output
as canonical, or expand authority from source content.

**Complete when:** Every invocation produces a typed draft-card or failure
outcome and records the analysis configuration.

## Round A Merge Order

ANA-1 through ANA-3 are independent. ANA-4 and ANA-5 are independent of each
other and consume the merged CORE contracts. Merge all five before convergence;
round B may start once ANA-1 through ANA-3 have merged.

## Round B — Specialized Analyzer Packs

Dispatch ANA-6 through ANA-8 in parallel. Each packet owns its analyzer-specific
fixtures and adds separate evaluation-manifest entries without rewriting another
packet's expectations.

### ANA-6 — Agent Systems

**Task:** A-04

Detect domain-agent, framework, SDK, runtime, agent-loop, orchestration,
planning, model access, tool selection, state, memory, retry, termination,
multi-agent, approval, and extension patterns.

**Complete when:** Accepted domain-agent and SDK/framework fixtures yield
distinct project types, layers, capability states, and evidence-backed
architecture summaries.

### ANA-7 — Skills and MCP

**Task:** A-05

Detect skills, tools, connectors, MCP servers/clients, transports, provided and
consumed interfaces, authentication, prerequisites, protocol constraints, and
extension mechanisms.

**Complete when:** Accepted skill and MCP fixtures produce structured interfaces
and compatibility constraints, not description-only labels.

### ANA-8 — Supporting Projects

**Task:** A-06

Cover document parsing/ingestion first, then other supporting patterns in the
accepted corpus. Extract applicable data/document flow, retrieval, storage,
evaluation, observability, security, deployment, and operations findings.

**Complete when:** Supporting projects are not misclassified as agent
applications and their relevant flows, prerequisites, and layers are captured.

## Convergence Tail

### ANA-9 — Analysis Application Service

**Task:** Y-01
**Depends on:** ANA-1 through ANA-3, ANA-5 through ANA-8, CORE-3, and CORE-5

Compose intake, acquisition, mapping, planning, analyzers, Codex orchestration,
synthesis, and structural validation behind an application-level interface.
Resolve duplicate/conflicting results as Claims with supporting/conflicting
Evidence. Generate assessments only with Assessment Context, reasoning,
confidence, and supporting Claims.

**Complete when:** A supported fixture travels from analysis request to a
validated canonical card with typed failures and no API, database, or UI
dependency.

### ANA-10 — Semantic and Safety Validation

**Task:** S-04
**Depends on:** ANA-9, FND-3, CORE-3, and CORE-5

Check unsupported Claims, conflicting evidence, documented/static mismatches,
absence-of-evidence errors, invalid runtime-verification labels, boundary
violations, and source-instruction influence.

**Complete when:** Adversarial and contradiction fixtures are rejected or
produce explicit `unverified`/`conflicted` results without expanding authority,
scope, or output requirements.

## Merge Order

1. Merge round A packets as their independent tests pass.
2. Merge ANA-6 through ANA-8 in any order after base analyzers.
3. Merge ANA-9 only after its dependencies.
4. Merge ANA-10 after ANA-9.
5. Run direct-mode, analyzer, application-service, structural, semantic, and
   adversarial tests together.

## Exit Checkpoint I-2

Every representative project category produces a validated canonical card
through Y-01. Direct mode and application service use the same skill, contract,
validation rules, and projections. Publish the commit as the base for PLAT.
