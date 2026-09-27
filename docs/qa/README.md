# QA Review and Test Entry Point

**Reviewed:** 2026-09-26

**Toolchain recheck:** 2026-09-27 with Node 26.10.0 and npm 12.1.0.

**Baseline:** `de4fa00e827db64a110ef90fb4d86b67162ed0b1` plus the implementation,
tests, version-2 cards, and alignment fixes in the commit containing this review.
Checking out the baseline commit alone does not reproduce this build.

## Review Result

The current local application builds and its automated checks pass. **The full
product specification is not yet delivered or release-validated.** Catalog
discovery, comparison, evidence, arcade play, local generation, draft storage,
manual refresh, and operator publication have implementations. Public release,
some change-tracking behavior, and real-browser/live-provider validation remain
open.

Use these documents together:

* [Feature inventory](feature-inventory.md): available capabilities, interfaces,
  implementation evidence, and test-case references.
* [QA test plan](test-plan.md): setup, test data, steps, expected results,
  negative cases, and a result-recording template.
* [Built-in browser test](browser-test-2026-09-26.md): executed follow-up checks,
  screenshots, fullscreen failure, and remaining keyboard/device coverage.
* [Developer guide](../development.md) and [backend guide](../../backend/README.md):
  authoritative local commands and operator configuration.

This is a description of the reviewed implementation, not a new product
specification or release approval. Behavior requirements remain in
[requirements](../requirements.md), the [specification](../specification/README.md),
and accepted [decisions](../decisions.md).

## Evidence From This Review

| Check | Result | What this establishes |
| --- | --- | --- |
| Toolchain upgrade, 2026-09-27 | `make setup`, `make check`, and `make audit` passed locally on Node 26.10.0/npm 12.1.0 | Clean locked frontend install; 219 backend tests, 86 frontend tests, all 14 canonical cards, lint, formatting, types, and production build passed. Python and npm audits found no known vulnerabilities. Locked dependency versions and install-script approvals are unchanged. CI now installs the pinned npm version explicitly. This records local verification; GitHub CI results are tracked separately. |
| `make check` | Passed after review fixes and module separation: 219 backend tests and 86 frontend tests | Python/TypeScript lint, formatting and types; canonical-card validation; regressions; frontend production build. Run with Python 3.12.10, Node 24.20.0, npm 11.19.0, a writable uv cache, and permission for the loopback runtime test. |
| Plugin layout | Package validation and path checks passed | Marketplace metadata and the package share `.agents/plugins/`; local skill discovery, backend validation/generation, and frontend schema imports resolve the relocated package. All eight package files are unchanged by the move. |
| Validated catalog inspection | 11 current projects, 14 retained versions | The single checked-in store is `catalog/cards/`; three projects retain versions 1 and 2. All 14 files remain byte-for-byte unchanged after removing the 11 duplicate working copies. |
| In-process HTTP checks | Passed | Catalog/search regressions, runtime/OpenAPI error-envelope parity, documented bodyless 304 responses, and cross-origin ETag revalidation. |
| Documentation validation | Passed after review fixes and module separation | 30 Markdown files, 461 local links/anchors, heading hierarchy, 26 shell snippets, and two JSON snippets pass. The spec maps all 18 canonical groups and 13 documented design colors match CSS. All 31 QA cases remain linked; all 14 cards validate and all 17 skill regression tests pass. Earlier manual publication, pagination, and reload checks were not rerun for this documentation pass. |
| Review regressions | Passed | Refresh permits concurrent async work during disk reads; search computes each term frequency once per request; obsolete shortlist-restoration failures stay hidden; the 32-card cache evicts and refetches pinned versions. |
| Dependency audit | Passed in this alignment review | `make audit` reported no known Python or npm vulnerabilities at the time of the run; this is not a guarantee against future advisories. |
| Live HTTP through Vite | Recorded as passed in the earlier 2026-09-26 review; not rerun for alignment | Catalog, search, current cards, ETags, contextual comparison, canonical Rumble, and invalid generation input. |
| Real public source intake | Recorded in the earlier 2026-09-26 review; not rerun for alignment | `pallets/itsdangerous` revision `672971d66a2ef9f85151e53283113f33d642dabd`: 50 text files read from Git objects without checkout, followed by cleanup. The larger OpenAI Agents SDK fetch timed out at the configured 120-second limit. |
| Generation integration | Automated checks passed with mocked generation/provider responses | Canonical YAML retrieval, rejected missing/invalid/symlinked artifacts, metadata-only manifests, persistence, restart retrieval, refresh, boundary-specific lineage selection, storage/upstream error classification, busy handling, cancellation, publication separation, and the real Codex runtime isolation test. This is not a successful live-model card-generation run. |
| Browser/visual/device tests | Not executed in this review | jsdom tests do not establish visual, keyboard, touch, fullscreen, or cross-browser acceptance. |
| Built-in browser follow-up | Executed 2026-09-26; partial coverage | [19 bounded checks](browser-test-2026-09-26.md): 17 Pass, 1 Fail (fullscreen hides cabinet state/controls), 1 Blocked (arcade keyboard verification). Search, comparison, evidence focus, mobile layout samples, tour, and API recovery worked. Full device acceptance remains open. |
| Public deployment / marketplace release | Not verified or delivered in this repository | No selected public hosting target; plugin publication prerequisites remain open. |

The build emits a warning for the lazily loaded Phaser runtime chunk
(approximately 1.23 MB minified). Backend tests emit a dependency deprecation
warning for Starlette's use of `anyio.abc.BlockingPortal`. Neither failed the
check; arcade loading/performance still needs browser measurement.

## Remaining Gaps and Review Findings

| ID | Status | Finding and QA consequence | Evidence / responsible record |
| --- | --- | --- | --- |
| GAP-01 | Public release blocked | The generation service is a local, single-process implementation. Hosting, production access controls, request limits, durable storage operation, backups, and worker coordination are unselected. A UUID is a retrieval locator, not authorization. | [Local generation decision](../decisions.md#local-generation-storage-and-publication), [open deployment decision](../open-decisions.md#public-service-deployment). |
| GAP-02 | Publication incomplete | The local skills-only plugin and marketplace manifest exist; public marketplace publication is not complete. Test local discovery separately from public installation. | [Plugin submission checklist](../../.agents/plugins/agent-project-card/SUBMISSION.md#public-release-checklist). |
| GAP-03 | Validation incomplete | No successful live-provider generation run is recorded. The built-in browser follow-up records partial coverage, an open fullscreen failure, and unverified arcade keyboard/device behavior. The configured Git intake timeout also prevented the larger repository smoke test from completing. | [Browser results](browser-test-2026-09-26.md), [live generation work](../exec-plans/active/mvp-delivery.md#live-generation), [browser validation](../exec-plans/active/mvp-delivery.md#browser-and-user-validation). |
| GAP-04 | Partial implementation | Publication reports changed JSON paths. There is no historical card/claim diff API or browser view, no repository-change report, and no per-section/evidence staleness marking. Snapshot dates and age are available. | [Refresh specification](../specification/05-system-behavior-and-quality.md#refresh-and-change-tracking), [publisher](../../backend/src/agent_project_intelligence/catalog/publication.py), [routes](../../backend/src/agent_project_intelligence/api/routes/catalog.py). |
| GAP-05 | Partial implementation | Canonical Rumble deliberately sets alignment to `unclear` or `not_applicable`, so all current canonical rounds are inconclusive and arcade signatures are neutral. Supplied-matchup projection tests cover contextual advantages, and arcade unit tests cover their move themes. The product App uses canonical comparisons; intro copy now describes neutral themes for inconclusive rounds. Canonical winning-trait behavior remains unimplemented. | [Canonical Rumble projection](../../backend/src/agent_project_intelligence/services/catalog_rumble.py), [signature selection](../../frontend/src/arcade/arcadeLogic.ts), [intro copy](../../frontend/src/arena/ArenaScreen.tsx), [Rumble requirement](../requirements.md#rumble-arena). |
| GAP-06 | API limitation | Generation accepts the default HEAD or a full lowercase commit hash. Branch names, tag names, multi-repository intake, and linked external-document acquisition are not exposed by the service. The card schema can represent more sources than this intake can acquire. | [Generation request](../../backend/src/agent_project_intelligence/services/generation.py), [acquisition](../../backend/src/agent_project_intelligence/analysis/acquisition.py), [source-scope decisions](../open-decisions.md#product-and-source-scope). |
| GAP-07 | Evaluation/data gate open | The published development cohort contains applications, SDKs, and a runtime; it has no dedicated primary skill, MCP-tool, or document-parser project. The three shared-context SDK cards are not an approved production cohort or expert-reviewed evaluation set. | [Current catalog](feature-inventory.md#current-catalog), [MVP acceptance](../specification/06-mvp-scope-and-evaluation.md#20-mvp-acceptance-criteria), [evaluation decisions](../open-decisions.md#mvp-evaluation-protocol). |
| GAP-08 | Later schema work | Namespaced `x-...` classifications are supported. The requested later `classification_status` field and ontology-promotion governance are not implemented in schema v0.3. Do not expect this field in current cards. | [Schema requirement](../requirements.md#project-card-schema-baseline), [metadata decisions](../open-decisions.md#agent-project-card-metadata-behavior). |

API-only structured filters, operator-only publication, session-only shortlist
storage, and the absence of a generated-draft history browser are interface
boundaries documented in the inventory. They should not be mistaken for
available UI controls.

Explicitly deferred or excluded capabilities include the schema-driven editor,
semantic/vector search, public-page SEO/social previews, repository-owned
Playwright tests, private repositories, continuous monitoring, dynamic code
execution, full security scanning, advanced recommendation, and automated
multi-project architecture/commercial analysis. See the
[backlog](../backlog.md) and [MVP exclusions](../specification/06-mvp-scope-and-evaluation.md#excluded).

## QA Handoff

Run the [test plan](test-plan.md) against this complete working tree or a later
commit containing it. Record manual cases as **Not run** until someone executes
them. Link failures to the gap IDs above when applicable; new failures need
their own reproduction evidence. Passing the build does not close the listed
product or release gaps.
