# PLAT — Platform-and-Experience Cohort

**Status:** Proposed
**Plan index:** [Parallel MVP Execution Plan](README.md)

This cohort exposes the application service through FastAPI, implements the
selected persistence/search boundary, verifies isolation, and builds the React
flows selected for release.

## Entry Condition

Checkpoint I-2 is published.

* PLAT-1 has no additional decision gate.
* PLAT-2 requires G-02 and G-04.
* PLAT-3, PLAT-7, and PLAT-8 require G-01 and G-05 and are omitted when the
  frontend is outside the selected release.

## Round A — Independent Adapters

Dispatch PLAT-1, PLAT-2, PLAT-4, and conditional PLAT-3 in parallel.

### PLAT-1 — Analysis API

**Task:** P-01

Implement FastAPI endpoints to start analysis from a Git repository link,
observe typed status/failure information, and retrieve the canonical card and
generated views. Delegate to Y-01 without duplicating analysis logic.

**Must not:** Implement persistence internals, redefine the card, or synthesize
findings in the route layer.

**Complete when:** OpenAPI and integration tests cover valid, invalid, failed,
and completed jobs and prove parity with direct-session output.

### PLAT-2 — Job and Card Persistence

**Task:** P-02
**Gates:** G-02 and G-04

Implement the selected store for requests, status, Source Snapshots, canonical
cards, and refresh lineage. Keep retained source content within G-02.

Agree with PLAT-1 on a job-store interface, but only this packet implements the
store; PLAT-1 owns HTTP behavior.

**Complete when:** Restart, concurrency, idempotency, version, isolation, and
failure tests pass without changing the canonical card contract.

### PLAT-3 — React Foundation

**Task:** U-01
**Conditional gates:** G-01 and G-05

Create the selected React scaffold, test setup, generated API-client boundary,
and shared loading, empty, error, unknown, and unavailable states.

**Must not:** Implement card generation, backend analysis logic, or frontend
choices not accepted under G-05.

**Complete when:** The application builds/tests and consumes the OpenAPI
contract without duplicating card-generation logic.

### PLAT-4 — Quality Scaffolding

**Task:** E-02, non-blocked portion only

Prepare the direct/API parity harness, static-only checks, and end-to-end fixture
setup that do not require search, refresh, isolation, or selected UI flows.

**Must not:** Mark E-02 complete, change expected results to accommodate defects,
or adopt thresholds before G-03.

**Complete when:** REL can add the remaining assertions without replacing the
test harness.

## Round B — Dependent Platform Features

Dispatch applicable packets after PLAT-1 and PLAT-2 merge.

### PLAT-5 — Search and Manual Refresh

**Task:** P-03
**Depends on:** PLAT-2 and CORE-4

Index canonical card projections. Support basic keyword search and filters for
type, capability, language, license, maturity, and architecture layer. Add
manual reanalysis against a new Source Snapshot, retain prior card versions,
and compute material card/Claim differences.

**Complete when:** Search returns expected corpus projects, unknown does not
behave like absent, and refresh produces traceable lineage and explicit diffs
without continuous monitoring.

### PLAT-6 — Analysis-Job Isolation

**Task:** S-05
**Depends on:** PLAT-2 and ANA-9

Verify that cached content, temporary files, sources, Claims, Evidence, and
cards cannot cross analysis-job boundaries.

**Complete when:** Concurrent and sequential tests demonstrate that one project
cannot affect another project's card.

### PLAT-7 — Intake and Card UI

**Task:** U-02
**Conditional dependencies:** PLAT-1, PLAT-3, and CORE-4

Implement repository-link intake, analysis status/failure presentation, Card
Summary, detailed card, and Claim-to-Evidence navigation.

**Complete when:** A user can submit a supported repository, follow its job,
inspect the card, and trace material conclusions to Evidence.

## Optional UI Tail

### PLAT-8 — Search and Refresh UI

**Task:** U-03
**Depends on:** PLAT-5 and PLAT-7

Expose card search/filters, Source Snapshot age, card version, and manual
refresh. Do not imply continuous monitoring.

**Complete when:** Browser-level tests cover search, filtering, stale-card
display, and manual refresh.

## Merge Order

1. PLAT-1, PLAT-2, PLAT-3, and PLAT-4 may merge independently after their gates.
2. Merge PLAT-5 and PLAT-6 after PLAT-2.
3. Merge PLAT-7 after PLAT-1 and PLAT-3.
4. Merge PLAT-8 after PLAT-5 and PLAT-7.
5. Run API, persistence, search, refresh, isolation, parity, and selected UI
   tests together.

## Exit Checkpoint I-3

The API and direct mode are integrated; persistence, basic search, manual
refresh, and isolation tests pass; and selected frontend flows use the same
application and canonical card interfaces. Publish the commit as the base for
REL.
