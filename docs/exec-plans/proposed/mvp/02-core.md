# CORE — Repository-and-Core-Tool Cohort

**Status:** Proposed
**Plan index:** [Parallel MVP Execution Plan](README.md)

This cohort establishes the safe repository pipeline and the shared core-tool
interfaces. Four packets start together; provenance starts after the repository
spine publishes its indexed-source milestone.

## Entry Condition

Checkpoint I-0 is published and G-02 is accepted. Dispatch CORE-1 through
CORE-4 together. Dispatch CORE-5 after the R-02 milestone merges.

## Packet Summary

| Packet | Task IDs | Parallel timing |
| --- | --- | --- |
| CORE-1 — Repository spine | R-01 through R-04 | Starts immediately; tasks run sequentially within the packet. |
| CORE-2 — Shared Codex skill | K-01 | Starts immediately. |
| CORE-3 — Structural validation | S-03 | Starts immediately. |
| CORE-4 — Card projections | O-01 | Starts immediately. |
| CORE-5 — Provenance utilities | S-02 | Starts when CORE-1's R-02 milestone is merged. |

## CORE-1 — Repository Spine

### R-01 — Intake and Source Snapshot

Implement public GitHub reference parsing, explicit project-boundary input,
revision selection, inclusions/exclusions, analysis depth/configuration, and the
initial Source Snapshot. Reject unsupported or ambiguous inputs rather than
widening scope.

**Complete when:** Every corpus fixture produces a reproducible analysis request
with all required boundary and snapshot fields.

### R-02 — Safe Repository Acquisition and File Index

Acquire the authorized public revision and selected first-party sources without
running repository hooks or code. Build a file and metadata index, compute
digests, classify supported files, and enforce file, path, binary, symlink, and
repository-size limits.

**Milestone handoff:** Publish the indexed-source interface used by CORE-5.

**Complete when:** Supported fixtures are indexed at the requested revision and
oversized, binary, malformed, symlink, and adversarial cases fail safely.

### R-03 — Repository Mapper

Detect Python and TypeScript languages, packages, manifests, dependencies,
documentation, entry points, examples, tests, configuration, deployment files,
and likely high-value files. Preserve dependency relationship and version
constraints where available.

**Milestone handoff:** Publish the repository-map and analyzer-input interfaces
used by ANA.

**Complete when:** Reviewed fixture maps match expectations and exclude all
out-of-bound paths.

### R-04 — Exploration Planner

Create a repository-specific, budgeted exploration plan using the project-type
hypothesis and high-value-file map. Record priorities, stopping conditions,
skipped areas, and depth.

**Complete when:** Plans vary by project type, stay within budgets, and preserve
the difference between `not_analyzed` and `no_evidence_found`.

### CORE-1 Ownership Boundary

CORE-1 owns intake, acquisition, mapping, and planning as one pipeline. It does
not own analyzers, card synthesis, persistence, or API behavior.

## CORE-2 — Shared Codex Skill

**Task:** K-01

Create the shared Agent Project Card skill with project-boundary, exploration,
Claim, Evidence, status, confidence, assessment-context, schema, and validation
rules. Keep source content separated from control instructions and require
canonical output.

**Must not:** Implement direct/API adapters, create a second card contract, or
follow embedded source instructions.

**Complete when:** Controlled fixtures produce schema-valid draft cards and
adversarial source instructions cannot change authority or output rules.

## CORE-3 — Structural Validation

**Task:** S-03

Validate schema conformance, identifier uniqueness, Claim/Evidence/source
reference integrity, ontology versions, Source Snapshot completeness,
assessment contexts, and allowed status combinations.

**Handoff:** Publish one deterministic validator entry point for direct mode,
orchestration, application service, and API use.

**Complete when:** Invalid fixtures fail with actionable deterministic errors
and valid fixtures pass.

## CORE-4 — Card Projections

**Task:** O-01

Generate detailed human-readable, Card Summary, and Evidence views exclusively
from the canonical card. Preserve Claim identifiers, evidence navigation,
uncertainty, and null-state distinctions.

**Must not:** Add facts absent from the canonical card or introduce a separate
view model as a source of truth.

**Complete when:** Snapshot tests map every displayed conclusion to canonical
data.

## CORE-5 — Provenance Utilities

**Task:** S-02
**Depends on:** C-03 and the merged R-02 indexed-source interface

Implement stable source and evidence identifiers, content digests, retrieval
timestamps, revision metadata, and precise locators for supported source types.

**Must not:** Redefine Source Snapshot, Claim, or Evidence models.

**Complete when:** Repeated analysis of an unchanged fixture produces
reproducible source identities and resolvable locators.

## Merge Order

1. CORE-2, CORE-3, and CORE-4 may merge independently.
2. CORE-1 merges R-01 through R-04 in task order; R-02 and R-03 may be
   published as reviewed internal milestones.
3. CORE-5 merges after R-02 and C-03.
4. Re-run contract, safety, repository, validation, and projection tests.

Dependent agents must not copy interfaces from CORE-1's unmerged working tree.
They start only from coordinator-published milestones.

## Exit Checkpoint I-1

A controlled Python fixture and TypeScript fixture can be acquired without
execution, mapped, represented as canonical data, structurally validated, and
rendered. Publish the integrated commit as the base for ANA.
