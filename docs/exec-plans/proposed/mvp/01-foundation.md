# FND — Contracts-and-Safety Cohort

**Status:** Proposed

**Plan index:** [Parallel MVP Execution Plan](README.md)

This is the first implementation cohort. Five agents start from the same
baseline; one convergence packet follows after the two shared contracts merge.

## Entry Condition

The current repository baseline. Dispatch FND-1 through FND-5 together.

## Parallel Packets

### FND-1 — Canonical Card

**Task:** C-01

**Owns:** Pydantic card models, JSON Schema, version and null-state behavior, and
focused contract tests.

Implement the canonical Agent Project Card, Source Snapshot, Claim, Evidence,
assessment context, capability, interface, and related records. Define
serialization and distinct representations for `unknown`, `not_applicable`,
`not_analyzed`, and `no_evidence_found`.

**Must not change:** Ontology contents, agent prompts, API routes, persistence,
or UI.

**Complete when:** Valid and invalid fixtures prove field, enumeration,
identifier, cross-reference, null-state, and version behavior.

### FND-2 — Ontologies

**Task:** C-02

**Owns:** Versioned classification and capability vocabularies, extension rules,
and ontology tests.

Create the initial multi-label classification and MVP capability vocabularies.
Support namespaced extensions without changing a published version's meaning.

**Must not change:** Canonical card field semantics or analyzers.

**Complete when:** Every representative project type can be expressed, fixtures
record ontology versions, and extension compatibility is explicit and tested.

### FND-3 — Safety Fixtures

**Task:** S-01

**Owns:** Source-safety rules, adversarial repository fixtures, and expected safe
outcomes.

Cover project-boundary enforcement, allowed source access, file/size limits,
content/control separation, cross-job isolation expectations, prohibited
execution, and prompt injection in README files, source comments,
configuration, metadata, and documentation.

**Must not change:** Runtime orchestration, card schema, or repository execution
policy.

**Complete when:** Every rule has a test scenario and expected safe outcome, and
fixture content is never executed or treated as instruction.

### FND-4 — Evaluation Foundation

**Task:** E-01, provisional portion

**Owns:** Pinned representative corpus, expected-finding format, and evaluation
harness shell.

Include domain agents, SDKs/frameworks, skills, MCP projects, Python and
TypeScript projects, and supporting projects such as document parsers. Record
expected classifications, technologies, capabilities, limitations, and
evidence.

**Must not:** Adopt numeric thresholds or final reviewer rules before G-03.

**Complete when:** The provisional corpus supports component regression tests.
REL owns final E-01 completion after G-02 and G-03 are accepted.

### FND-5 — Backend Settings

**Task:** P-00

**Owns:** Pydantic Settings, `.env` loading, safe defaults, dependency updates,
and tests.

Load `.env` values before settings are read and keep tests isolated. Add
dependencies only through the locked root `uv` workflow with the seven-day
cooldown.

**Must not change:** Analysis endpoints, persistence choice, or model selection.

**Complete when:** Settings are typed, test-isolated, safely loaded, and cannot
receive repository-provided values without validated mapping.

## Convergence Packet

### FND-6 — Contract Convergence

**Task:** C-03

**Depends on:** FND-1 and FND-2 merged

Create canonical fixtures covering project categories, capability and
verification statuses, confidence, evidence conflict, assessment contexts, and
all null states. Add current-schema conformance and round-trip tests.

Resolve integration problems through the owning contract. Do not let a
downstream component create a separate schema or vocabulary.

**Complete when:** Contract tests form the stable integration target for the
skill, analyzers, validator, API, projections, and evaluation harness.

## Merge Order

1. Merge FND-1 and FND-2 in either order.
2. Merge FND-6 after both.
3. FND-3, FND-4, and FND-5 may merge whenever their focused tests pass.
4. Run all foundation and existing backend tests together.

## Exit Checkpoint I-0

Publish one commit containing C-03, S-01, the provisional E-01 harness, and
P-00 with passing tests. This exact commit is the base for CORE.
