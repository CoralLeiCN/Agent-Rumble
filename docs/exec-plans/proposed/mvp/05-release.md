# REL — Evaluation-and-Release Cohort

**Status:** Proposed
**Plan index:** [Parallel MVP Execution Plan](README.md)

This cohort completes the accepted evaluation protocol, fans defects back to
their owning cohorts, and produces release evidence. It does not weaken expected
results to make the release pass.

## Entry Condition

Checkpoint I-3 is published, G-03 is accepted, and the catalog, direct-plugin,
and hosted-service paths required by accepted G-01 are complete.

## REL-0 — Finalize the Evaluation Corpus and Harness

**Task:** E-01
**Depends on:** FND-4, G-02, and G-03

Apply the accepted source boundaries, repository set, rubric, reviewer process,
denominators, and thresholds to the provisional corpus and harness. Pin every
evaluation source and retain the expected classifications, technologies,
capabilities, limitations, and evidence.

**Complete when:** The evaluation set and harness exactly implement the accepted
G-02 and G-03 protocol and can be reproduced from recorded revisions.

## REL-1 — End-to-End Regression and Quality

**Task:** E-02
**Depends on:** REL-0

Extend PLAT-4's harness to automate:

* Schema conformance and null-state behavior
* Static-only analysis
* Claim evidence coverage and traceability
* Classification, technology, capability, and limitation results
* Prompt-injection resistance
* Cross-job isolation
* Direct-plugin/hosted-service contract parity
* Public GitHub repository intake and hosted generation
* Search and manual refresh
* All required catalog and service access flows

Map every MVP acceptance criterion to an automated check or an explicit
human-review step with retained evidence and denominator.

**Complete when:** The full accepted corpus and every required adversarial case
run successfully, or a failure is recorded against its owning task ID.

## Defect Fan-Out

The REL owner classifies failures and returns them to their original owners:

| Failure area | Return to |
| --- | --- |
| Schema, ontology, null-state, or contract compatibility | FND |
| Intake, mapping, provenance, structural validation, or projections | CORE |
| Analyzer result, orchestration, synthesis, or semantic/safety validation | ANA |
| API, persistence, search, refresh, isolation, or UI | PLAT |
| Evaluation fixture or rubric defect | REL, with G-03 authority preserved |

Prior owners may fix independent defects in parallel. Each fix runs its focused
tests before merging. The REL owner then reruns the affected evaluation slice
and the complete E-02 suite.

The evaluation owner must not hide systemic failures by changing expected
results, denominators, or thresholds outside the accepted G-03 protocol.

## REL-2 — MVP Evaluation and Release Report

**Task:** E-03
**Depends on:** E-02 passing

Run the accepted evaluation protocol, conduct expert review, classify errors,
record known limitations, and state which access modes are included. Retain
reviewer records, denominators, exceptions, and evidence.

**Complete when:**

* Acceptance criteria are met or exceptions are explicit.
* No critical source-safety, privacy, or cross-job-isolation issue remains.
* Canonical cards are usable by downstream consumers.
* Release-mode scope matches accepted G-01.
* Deferred work does not silently widen MVP scope.

## Merge Order

1. REL-0 merges before the final E-02 run.
2. Defect fixes merge through their owning cohort modules.
3. E-02 evidence merges after the final complete run.
4. E-03 and the release report merge last.

## Exit Checkpoint I-4

The release report maps evidence to every MVP acceptance criterion and records
limitations, exceptions, selected access modes, and deferred work. This is the
completion checkpoint for the proposed MVP plan.
