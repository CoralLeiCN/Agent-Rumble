# QA Test Plan

This plan tests the [current feature inventory](feature-inventory.md). Read the
[review findings](README.md#remaining-gaps-and-review-findings) before recording
release readiness. Unless a result is listed in the review, the manual case is
**Not run**. A test with an unavailable browser/provider is **Blocked**, not Pass.

## Setup and Test Data

Use the complete working tree or a commit containing all reviewed changes.
Record `git rev-parse HEAD` and `git status --short` with the test results.
Use Python 3.12, `uv >= 0.9.17`, Node 24.20.x, and npm 11.19.x; the CI uv version
is 0.11.29. Commands below run from the repository root on macOS/Linux.

```shell
make setup
make check
make audit
```

`make check` includes a real Codex runtime isolation test using a local mock
provider. It needs permission to bind loopback but does not call an external
model. `make audit` needs network access. Live generation needs Git, public
GitHub access, and an operator-configured Codex provider/authentication; see the
[configuration guide](../../backend/README.md#generation-model-configuration).
Do not paste provider credentials into a browser form or a QA report.

### Disposable Service Store

Publication and corruption tests must target a disposable copy. Stop any old
test servers on ports 8000/5173 before starting this instance; otherwise a test
could hit a server using different storage.

```shell
export QA_ROOT="$(mktemp -d)"
cp -R catalog/cards "$QA_ROOT/catalog"
export AGENT_RUMBLE_CATALOG_ROOT="$QA_ROOT/catalog"
export AGENT_RUMBLE_GENERATED_CARDS_ROOT="$QA_ROOT/drafts"
export QA_API="http://127.0.0.1:8000/api/v1"
printf '%s\n' "$QA_ROOT"
make dev
```

Open the Vite URL printed by the command, normally `http://localhost:5173`.
FastAPI docs are at `http://127.0.0.1:8000/docs`. For API/CLI tests in a second
terminal, set the same `QA_ROOT`, `AGENT_RUMBLE_CATALOG_ROOT`,
`AGENT_RUMBLE_GENERATED_CARDS_ROOT`, and `QA_API` values there. Preserve this
temporary directory until the result evidence is collected. Restarting the
backend must reuse those paths to test persistence.

Use a clean browser tab/session for baseline tests. To reset local UI state,
remove only the `agent-rumble:<API base URL>:session` entry in that site's
session storage. Generation results are not kept in this browser entry; copy
their retrieval URLs before leaving the generation screen.

### Baseline Expectations

The unmodified copy contains **11 current projects and 14 retained versions**.
OpenAI Agents SDK for Python, LangGraph, and CrewAI have versions 1 and 2; all
other projects have version 1. See the [catalog table](feature-inventory.md#current-catalog).
Counts will change after intentional publication tests.

Use **Python support-agent prototype ↗** to restore the known shared context:

```json
{
  "use_case": "A Python support-agent prototype with tools and explicit workflow control",
  "comparison_cohort": ["OpenAI Agents SDK", "LangGraph", "CrewAI"],
  "requirements": ["Python", "Tool integration", "Workflow control"],
  "preferences": [],
  "exclusions": [],
  "organizational_constraints": ["Static evidence only; runtime behavior has not been verified"],
  "assessed_at": "2026-09-25T00:00:00Z"
}
```

The date is part of this recorded development context. Changing it can correctly
make a contextual assessment unavailable. Use the current card name “OpenAI
Agents SDK for Python” when selecting results; the recorded cohort label above
is intentionally “OpenAI Agents SDK”.

## Catalog and Comparison UI

### UI-01 — Scope, Full Browse, and Pagination

1. Expand **11 projects · Catalog scope and freshness**. Inspect coverage,
   exclusions, and analysis dates.
2. Select **Browse every preprocessed project ↗** and compare all displayed
   names with the catalog table.
3. Check that every project can be selected and no illustrative-only project
   has replaced a catalog entry.

**Expected:** 11 current projects, no duplicate versions in search, visible
scope/freshness. The default UI page size is 20, so no Load more button is
expected with this corpus. Use API-02 for real pagination and the automated
`App.test.tsx` pagination cases for UI merging/selection retention. An expanded
QA corpus is needed to manually exercise Load more; do not fake production data.

### UI-02 — Search, Examples, Explanations, and Empty Results

1. Select **Biomedical research agent ↗**, then **Find projects**. Inspect
   results, match explanations, revision/date, languages, and uninterpreted terms.
2. Return using **Edit request**, select **Python support-agent prototype ↗**,
   and search again.
3. For a controlled query test, set Use case to the query, clear other context
   text lists, and search for `mcp`, then `zzzzqaxqjx`.

**Expected:** results come from the API and change with the request. The unknown
query gives **No matching projects yet** and **Try a broader search**. A match
without a supporting claim must not invent a confirmed evidence badge. Exact
ranking depends on the full submitted context; the context-free API baseline
has 7 `mcp` results, 7 `python` results, 1 `biomedical` result, and 0
`zzzzqaxqjx` results at this snapshot.

### UI-03 — Editable Context and Requirement Polarity

1. Open **Edit assessment context**. Enter `Local persistence` under Prefer and
   `Mandatory hosted control plane` under Avoid; add two Must lines.
2. Change cohort, constraints, and date, then search. Inspect the request in the
   browser Network panel and the returned requirement pills.
3. Restore the Python example before testing the known shared comparison.

**Expected:** the separate arrays and date are transmitted; blank lines are
removed when submitting; Must/Prefer/Avoid labels remain distinct. Avoid is an
assessment constraint, not a certified exclusion filter. Editing constraints
must not silently reuse a judgment from the previous context.

### UI-04 — Shortlist Limits, Navigation, and Reload

1. Browse all projects. Select one: comparison is disabled and says **Select one
   more**. Select two: comparison and **Enter Rumble** are available.
2. Select a third: comparison remains available, Rumble disappears, and a fourth
   selection is disabled. Remove one selection and verify controls update.
3. Reload with two selected. Verify the same project identities return using
   current-card requests. Navigate to comparison and back; then use the wordmark
   or Explore to reset the shortlist.

**Expected:** at most three distinct projects; reload uses backend card data.
Storage contains IDs/context/query, not canonical payloads or secrets. A new
search resets the shortlist. Session storage is not account-based persistence.
When the API is down, restoration reports a failure instead of inventing cards.

### UI-05 — Contextual Comparison and Role Semantics

1. Restore the Python example; browse all and select OpenAI Agents SDK for
   Python, LangGraph, and CrewAI. Choose **Compare projects**.
2. Inspect **Your assessment context**, **Requirements and assessment scope**,
   role relationship, and contextual fit. Verify version 2 is requested.
3. Return, edit Avoid to add a new constraint, search/reselect, and compare.
4. Compare an application such as BioAgents with LangGraph to inspect a
   complementary-role explanation.

**Expected:** the known version-2 context yields claim-linked fit assessments;
verification and confidence appear independently. New unmatched contexts yield
**Not analyzed**, not a transferred fit judgment. Role labels describe the
canonical type relationship, not guaranteed implementation compatibility.

### UI-06 — Complete Field Coverage and Detail Controls

1. Compare two or three projects. Inspect the initial Highlights and section
   disclosures, then select **All details**.
2. Use **Find a detail** for a capability, `schema`, `card`, an evidence locator,
   and a value visible in one selected canonical card.
3. Compare the reachable values with the card JSON from API-03. Inspect optional
   fields not populated by these cards using the schema-only disclosures.

**Expected:** all actual canonical values remain reachable, including technical
metadata inside sections; no fixed mock field list replaces the contract.
Unknown, Not applicable, Not analyzed, No evidence found, and No corresponding
entry retain distinct meanings. Use automated field-inventory tests for full
recursive coverage and future-property cases; these are not visual tests.

### UI-07 — Evidence and Conflicting Sources

1. Open a supporting claim from contextual fit or an exhaustive detail row.
2. Inspect claim text, confidence, verification, supporting/conflicting counts,
   locator, revision, publisher/source kind, retrieval data, and excerpt.
3. Follow a source link when present; check that it pins the recorded commit.
   Close with Escape and verify focus returns to the trigger.

**Expected:** the drawer resolves the selected project, version, and claim.
Evidence cannot leak from another project with the same claim ID. Text is inert;
unsafe URLs remain non-clickable. Zero conflicting sources is valid. Use the
automated evidence/fixture tests to exercise actual conflicting and unsafe-link
cases where the selected real card does not contain one.

### UI-08 — API Failure, Retry, and Late Responses

1. Stop only the QA backend and submit a search. Restart it with the same
   disposable roots; submit again.
2. Use browser throttling to delay a search or comparison, navigate to Explore,
   then perform a different request. Repeat with an evidence drawer that is
   closed before its request completes.
3. Enter canonical Rumble with the backend unavailable, then retry after restart.

**Expected:** visible error/loading states, successful retry, no catalog or
canonical-Rumble fixture substitution, and no stale response reopening an old
view. Ordinary requests time out after 30 seconds including body reads. Malformed
JSON and wrong project/version responses are covered by transport/gateway tests.

### UI-09 — Keyboard, Layout, Motion, and Zoom

1. Run the primary path at approximately 390, 768, and 1280 CSS pixels, and at
   200% zoom. Repeat with reduced motion enabled.
2. Use keyboard only: skip link, search, context disclosures, shortlist,
   comparison details, evidence open/Tab/Shift+Tab/Escape, and return navigation.
3. Check labels, visible focus, status text, contrast, clipping, scrolling, and
   that the mobile evidence drawer is usable.

**Expected:** no hidden required action or unreadable value; drawer focus stays
inside while open and returns on close; status is not color-only. Record actual
browser/OS/viewport and screenshots. This case is currently Not run.

## Rumble and Arcade

### R-01 — Canonical Tour and Evidence Parity

1. Select exactly two projects and enter Rumble. Inspect project names, card
   versions/revisions, context, and role notice.
2. Start **Guided evidence tour**, advance through rounds, inspect sources,
   reach the recap, and return.
3. Compare the same pair/context through ordinary comparison and API-04.
4. Block `/catalog/rumble`, enter again, and verify the error. Unblock it and
   choose **Try again**.

**Expected:** at most twelve rows from the pinned canonical comparison, matching
field states and canonical claim references. Current canonical verdicts are
inconclusive (GAP-05). No universal score/winner appears. Evidence opens the same
canonical claim drawer; synthetic test inputs are not substituted.
An unavailable API shows an error and retry control; retry loads the pinned
canonical comparison. Unit tests reject mismatched card versions and missing
canonical claim references.

### R-02 — Solo Gameplay and Evidence Separation

1. Enter **Enter solo fight**. Use A/D to move, W to jump, F to jab, G for the
   special, and S to guard. Allow the CPU to attack.
2. Observe both project names, human boxer animation, 100 initial HP, 45-second
   round timer, damage/guard effects, KO or timed result, and progression toward
   two round wins. Restart to repeat if needed.
3. Use **End match and inspect this evidence round** and inspect the recap/card.

**Expected:** controls alter gameplay; evidence and project assessments do not
change with damage or victory. The result is explicitly an exhibition/controller
outcome. Current canonical signatures and the intro's description of
inconclusive comparisons are neutral. Double-KO/tied
result edge cases have deterministic unit coverage.

### R-03 — Local Two-Player Mode

1. Choose **Local 2-player**. Player 1 uses the solo keys. Player 2 uses left/right
   to move, up to jump, M to jab, N for the special, and down to guard.
2. Move and attack independently; test simultaneous attacks and round restart.

**Expected:** each control set affects its own fighter, CPU control is absent,
and match outcomes remain separate from project comparison. Note hardware
keyboard ghosting separately from application failures.

### R-04 — Pause, Restart, Fullscreen, Touch, and Cleanup

1. Use P/Escape and visible pause/resume controls; use R and visible restart.
2. Switch browser/window focus during play and verify pause. Request fullscreen
   from the intro and cabinet; deny/exit fullscreen and continue embedded play.
3. Test coarse-pointer touch controls on a real or browser-emulated touch device.
4. Exit gameplay and re-enter several times. Inspect network/performance:
   Phaser should load only when gameplay is entered, and old game instances,
   input handlers, or animations must not continue after exit.

**Expected:** controls work without losing the ability to exit; failed fullscreen
does not block play; restart clears prior outcomes; touch press/release does not
leave a movement/guard input stuck. Record arcade load time; no performance
acceptance threshold has been approved.

### R-05 — Supplied Matchup Contract

Build a request from the synthetic backend test input and send it to the
supplied-matchup API. The command writes only into the disposable QA directory.

```shell
uv run --locked python - <<'PYDATA' > "$QA_ROOT/rumble-matchup.json"
import json
from backend.tests.rumble_matchup_payloads import rumble_matchup_payload
print(json.dumps(rumble_matchup_payload()))
PYDATA
curl -sS -X POST "$QA_API/rumble" \
  -H 'Content-Type: application/json' \
  --data-binary "@$QA_ROOT/rumble-matchup.json"
```

1. Inspect the three synthetic rounds, contextual advantages, and snapshots.
   Submit the complete matchup, including its claim registry.
2. In the temporary JSON file, remove a referenced claim, change an evidence
   revision, or add a nested `overall_score` field and resubmit each case.
3. Run the backend projection and frontend signature-move regression tests.

**Expected:** the valid registry projects successfully; broken or cross-project
references, runtime-verification labels, and universal-score/winner fields are
rejected. Signature-move unit tests verify equal damage/cooldown budgets for
advantageous input rounds. The product App loads canonical comparisons; these
synthetic inputs are used only for tests.

## API Cases

Use `$QA_API` from setup, or FastAPI's local `/docs` Execute controls. These
mutating routes target only the disposable store.

### API-01 — Health, Catalog, OpenAPI, and Errors

```shell
curl -sS http://127.0.0.1:8000/health
curl -sS "$QA_API/catalog"
curl -sS http://127.0.0.1:8000/openapi.json
```

**Expected:** health returns `{"status":"ok"}`; catalog has the baseline count,
schema/ontology versions and freshness; OpenAPI lists the operations in the
inventory. Test unknown routes separately (FastAPI `detail` errors). Malformed
catalog, generation, and prepared Rumble requests return the custom `error`
envelope described by OpenAPI. Generation's expected 404/409/422/499/500/502/503/504
responses are documented on the applicable operations. Health does not test
provider access.

### API-02 — Search, Filters, and Page Boundaries

```shell
curl -sS "$QA_API/catalog/search" -H 'Content-Type: application/json' \
  -d '{"text":"mcp","page":1,"page_size":5}'
curl -sS "$QA_API/catalog/search" -H 'Content-Type: application/json' \
  -d '{"text":"","page":1,"page_size":5}'
curl -sS "$QA_API/catalog/search" -H 'Content-Type: application/json' \
  -d '{"text":"","filters":{"languages":["Python"]}}'
```

1. Repeat each request and compare project order/match reasons. Analysis age can
   advance with time and must not be mistaken for nondeterministic ranking.
2. Browse pages 1, 2, 3, and 4 with size 5: expect 5, 5, 1, and 0 projects,
   always total 11, with no duplicate IDs across the first three pages.
3. Exercise all six filter dimensions using values actually present in the
   selected cards. Check AND-across/OR-within behavior, unknown terms, page 0,
   size 101, blank filter values, and unexpected request fields.

**Expected:** valid filtering preserves provenance and exact states; malformed
inputs return 422. Controlled synonyms are deterministic. Unsupported terms do
not cause a model call or invented matches.

### API-03 — Exact Retrieval, Opaque IDs, Evidence, and ETags

Create a valid reference with the repository's codec:

```shell
export QA_PROJECT_REF="$(uv run --locked python -c 'from agent_project_intelligence.api.identifier_references import encode_identifier_reference; print(encode_identifier_reference("project-openai-openai-agents-python"))')"
curl -i "$QA_API/projects/$QA_PROJECT_REF/cards/current"
curl -i "$QA_API/projects/$QA_PROJECT_REF/cards/1"
curl -i "$QA_API/projects/$QA_PROJECT_REF/cards/2"
```

1. Compare each body with its canonical YAML; current is version 2 before
   publication tests. Request a nonexistent version and malformed opaque ref.
2. Copy the quoted ETag into an `If-None-Match` header and repeat the GET.
3. Pick an evidence ID from that card, encode it with the same helper, and GET
   `/projects/{project_ref}/cards/2/evidence/{evidence_ref}`. Repeat conditionally.
4. For a configured development origin, send an OPTIONS preflight requesting
   `If-None-Match`. Verify it succeeds and GET exposes `ETag` through CORS.
   Check that OpenAPI documents both 200 and bodyless 304 responses.

**Expected:** exact canonical values, 404 for missing entries, typed 400 for
malformed opaque references, and matching ETags produce 304 with no body.
Evidence stays within the selected version and preserves non-linkable sources.
Raw project IDs are not the path contract. Unicode/slash/control identifier and
unsafe locator cases are exercised by the backend codec/evidence regressions.

### API-04 — Pinned Comparison, Context Matching, and Canonical Rumble

Use this comparison body, with the shared context copied from setup:

```json
{
  "cards": [
    {"project_id": "project-openai-openai-agents-python", "card_version": 2},
    {"project_id": "project-langchain-ai-langgraph", "card_version": 2},
    {"project_id": "project-crewaiinc-crewai", "card_version": 2}
  ],
  "assessment_context": {
    "use_case": "A Python support-agent prototype with tools and explicit workflow control",
    "comparison_cohort": ["OpenAI Agents SDK", "LangGraph", "CrewAI"],
    "requirements": ["Python", "Tool integration", "Workflow control"],
    "preferences": [],
    "exclusions": [],
    "organizational_constraints": ["Static evidence only; runtime behavior has not been verified"],
    "assessed_at": "2026-09-25T00:00:00Z"
  }
}
```

1. POST `/catalog/compare`: contextual-best-fit cells should have values and
   claim IDs. Add a new exclusion: those contextual judgments become not analyzed.
2. Submit one card, four cards, duplicate project IDs, two versions of one
   project, and a missing card version. Invalid sets return 422; valid references
   to nonexistent versions return 404.
3. Keep only two cards and POST `/catalog/rumble`; compare row states and source
   references with the same two-card comparison. A third entrant returns 422.

**Expected:** roles, confidence, verification, and null states are preserved;
current canonical rounds are inconclusive without universal scoring. Selecting
version 1 must not inherit version-2 assessments.

### API-05 — Atomic Catalog Reload

1. Complete PUB-01 to create a next-version artifact. Before reload, GET current
   remains the old loaded version. POST `/catalog/refresh`; GET current advances.
2. In the disposable catalog only, add an invalid `project-card.yaml` or use a
   malformed version artifact. Reload again.
3. Remove only that test artifact, reload, and restart with the same root.

**Expected:** invalid reload returns 422 and keeps the last valid snapshot.
Valid reload/restart loads complete files; old versions remain retrievable.
One-process behavior does not establish multi-worker reload coordination.

## Generation and Publication

### GEN-01 — Live Generation and Canonical Output

**Prerequisite:** configured provider, network, and available model capacity.
If missing, record Blocked. The existing mock integration tests cannot mark this
live case Pass.

1. Open **Generate a card from a public GitHub repository**. Use
   `https://github.com/openai/openai-agents-python` with boundary
   `Python package and repository documentation`.
2. Generate and inspect the loading state. The known larger-fetch timeout may
   recur; record it as a failed attempt, then use another approved small public
   Python/TypeScript QA repository to test the full provider path.
3. On success, save the retrieval UUID, open the stored result, expand canonical
   JSON, and download the card. Validate the downloaded JSON using SKILL-02.
4. Review the boundary, exact commit, source retrieval times/locators, analysis
   configuration, source exclusions, classification, dependencies, capabilities,
   architecture, and assessments. Inspect evidence for selected material claims.

**Expected:** 201 with `status: succeeded`, `published: false`, valid canonical
card, and retrievable ID; no provider secret or runtime-verification claim.
Draft YAML exists under the separate root. Search/catalog counts do not change.
Quality of analysis requires reviewer evidence, not just a schema pass. The UI
does not expose revision/depth/provider controls; test a full commit via API.

### GEN-02 — Restart Retrieval, Refresh, and History

1. Copy the successful retrieval URL. Restart the backend with the same roots
   and GET it; compare its canonical payload with the saved result.
2. Use **Refresh from latest source** or POST
   `/generation/{generation_id}/refresh`.
3. Inspect new UUID, lineage, commit, and version history. Reopen the earlier
   retrieval URL. Leave/re-enter Explore and check that retrieval still works
   through the copied URL even though the form result state is gone.

**Expected:** persistence survives restart; refresh uses the saved URL/boundary
and latest HEAD; earlier results stay available. Changed canonical content gets
the next version; exactly identical content may reuse the current version.
No automatic publication or generated-draft listing is implied. The response's
`published: false` flag records generation's behavior; it is not subsequently
recomputed as a public-catalog membership check.

The UUID manifest contains metadata and a pinned card identity/version, without
a duplicate card payload. Retrieval validates and reads the canonical YAML.
In a disposable copy, remove or corrupt the referenced YAML and repeat GET:
expect `500 stored_card_invalid`, never a stale manifest copy. Restore the test
artifact before continuing; draft-store validation is all-or-nothing.

### GEN-03 — Invalid Intake, Busy, and Failure Behavior

1. Submit a non-GitHub URL, HTTP URL, credentialed URL, `/tree/main` URL, empty
   boundary, branch/tag in `source_revision`, and unknown request field.
2. Submit a nonexistent/private repository anonymously. During a valid running
   analysis, submit another generation or refresh request.
3. Exercise invalid/missing/oversized model output and failure cleanup using
   the deterministic generation tests; do not depend on a live model to emit it.

**Expected:** invalid request or unsupported repository 422 `generation_failed`
(request schema failures use `request_validation_error`); identity conflict 409
`generation_identity_conflict`; storage write failure 500 `generation_storage_failed`;
GitHub connection/rate-limit failure 502 `repository_unavailable`;
busy 503 `generation_busy`; unknown valid UUID 404 `generation_not_found`.
Acquisition timeout maps to 504 `generation_timeout`; harness failure maps to
502 with its failure code (including `codex_timeout`). Failed drafts do not enter
the public catalog. GitHub rate/permission failures are not proof of a successful
analysis. Confirm these responses use the documented `ErrorEnvelope` contract.

### GEN-04 — Cancel, Disconnect, and Storage Completion

1. Start generation, select **Cancel request**, then verify another request can
   proceed after cleanup. Repeat by leaving the generation screen or closing
   the requesting tab while analysis runs.
2. Run the deterministic cancellation tests for a disconnect during acquisition
   and cancellation during storage.

**Expected:** analysis/source processes stop and temporary workspaces are
removed. An already-started storage write completes its retrievable manifest
before releasing the lock. The browser must not claim cancellation deleted a
completed result. A disconnected caller might not receive that result's UUID;
the operator can inspect the disposable storage directory. There is no job-status
or progress-stream endpoint. The UI timeout is 20 minutes; default model turn
timeout is 15 minutes, plus acquisition/storage time.

### PUB-01 — Explicit Publication, Versioning, and Changed Paths

Use a synthetic metadata change in the disposable copy; no real project claim
needs to be edited and no live provider is required:

```shell
uv run --locked python - <<'PY'
import json
import os
from pathlib import Path
from agent_project_intelligence.catalog.validation import parse_card_yaml
root = Path(os.environ["QA_ROOT"])
source = root / "catalog/card-openai-openai-agents-python/versions/2/project-card.yaml"
card = parse_card_yaml(source.read_text())
card["card_version"] = 3
card["source_snapshot"]["analysis_configuration"]["qa_marker"] = "disposable publication check"
(root / "publication-card.json").write_text(json.dumps(card, indent=2))
PY
uv run --locked python -m agent_project_intelligence.catalog.publication \
  "$QA_ROOT/publication-card.json" --catalog-root "$QA_ROOT/catalog"
curl -sS -X POST "$QA_API/catalog/refresh"
```

**Expected:** version 3 is installed, versions 1/2 remain unchanged, and changed
paths include the QA marker. Repeat the publish command: no new version and an
empty changed-path list. After reload, current selects 3 while historical GETs
still resolve. This is a JSON-pointer change report, not a full historical diff
viewer. If GEN tests already created/published a later version, start with a new
disposable copy before running this fixed-version example.

### PUB-02 — Invalid Publication, Concurrency, and Isolation

Run `backend/tests/catalog/test_publication.py` and
`backend/tests/catalog/test_repository.py`. Inspect their temporary-store
scenarios: malformed card, wrong identity/path, missing intermediate version,
version reuse, duplicate lineage, symlink escape, concurrent writers, and
all-or-nothing loading. Repeat an invalid publication manually against the
disposable store if investigating a failure.

**Expected:** invalid input never overwrites an earlier version or exposes a
partial card. Concurrent accepted changes receive contiguous versions. Public
and draft roots remain separate; operator-reviewed publication is required.
No multi-worker generation or distributed filesystem guarantee is asserted.

## Skill, Safety, and Tooling

### SKILL-01 — Local Skill, Plugin Package, and Optional Summary

1. In a Codex session with this repository-local skill available, invoke the
   Agent Project Card skill for an approved public project. Record its explicit
   boundary, source snapshot, static-analysis mode, output path, and validation.
2. Refresh that card and verify lineage/version advancement. Request a Card
   Summary separately; confirm it is derived from the validated canonical card.
3. Check local plugin discovery through the repository marketplace manifest.
   Run the packaged-skill tests and the positive/negative scenarios in
   [SUBMISSION.md](../../.agents/plugins/agent-project-card/SUBMISSION.md).

**Expected:** local/plugin forms use the same skill/schema/validator content;
the optional summary preserves evidence and state semantics. Public marketplace
installation is Blocked until publication, not covered by local discovery.
Do not execute the analyzed project's code as part of this case.

### SKILL-02 — Structural and Semantic Card Validation

```shell
make cards-check
uv run --locked python \
  .agents/plugins/agent-project-card/skills/agent-project-card/scripts/validate_project_card.py \
  "$QA_ROOT/publication-card.json"
```

Use the second command after PUB-01, or substitute a downloaded generated card.
In a disposable card copy, remove a required field, introduce a dangling claim
or evidence reference, and give an unavailable scalar an invalid/missing field
state; validate again.

**Expected:** valid JSON/YAML passes, semantic/structural defects report errors,
and unsupported pre-release schemas are rejected. Card version, schema version,
project release, ontology versions, and source commit are separate concepts.
No automatic old-schema migration should occur.

### SAFE-01 — Source Bounds, Prompt Injection, and Runtime Isolation

```shell
uv run --locked pytest backend/tests/analysis -q
```

Inspect the adversarial mock-provider test and snapshot/acquisition tests. They
exercise forbidden host reads/writes/execution, static-policy expansion,
wrong-repository/commit output, committed versus dirty text, symlinks/submodules,
binary/oversized files, bounded source tools, cancellation, and clean environment.

**Expected:** repository content cannot grant authority, change provider config,
or produce accepted runtime-verification claims. Source tools only index the
pinned snapshot. Intake has a 120-second limit per Git command and samples the
256 MiB storage limit every 250 ms; it is not an OS disk quota. Snapshot limits
are 20,000 tree entries, 2 MiB per file, and 32 MiB selected blob data. Omitted
content remains identifiable. A denial test is not a security certification.

### SAFE-02 — Canonical Parsing, Evidence States, and Cross-Card Safety

```shell
uv run --locked pytest backend/tests/catalog backend/tests/skills backend/tests/api/test_catalog.py -q
```

**Expected:** duplicate keys, aliases, unsafe YAML tags, excessive depth/nodes,
oversized files, invalid references/field states, lone surrogates, normalization
key collisions, invalid paths, and partial catalogs are rejected. Well-formed
surrogate pairs normalize to Unicode scalar strings without changing other text.
The parser limit is 2 MiB, depth 64, and 100,000 nodes; a larger configured catalog
file limit does not disable the parser's own bound. Untrusted excerpts remain
inert text. Confidence never becomes capability support or verification.

### OPS-01 — Configuration and API Boundaries

1. Test allowed-origin and disallowed-origin CORS preflights with `/docs` or an
   HTTP client. Defaults allow the two local Vite origins, not arbitrary origins.
2. Restart the QA backend with `AGENT_RUMBLE_API_PREFIX=/qa/v1`; check all three
   route groups under that prefix and `/health` at the root. Restore the default
   before UI tests; frontend route paths remain `/api/v1`.
3. Test invalid/overlapping draft/catalog roots and invalid provider settings
   through the configuration regressions. Test `VITE_CATALOG_API_BASE_URL` with
   an approved local API host if exercising separate-origin frontend operation.
4. For configured-provider tests, inspect generated non-secret provenance and
   verify no credential values are written into cards or reports.

**Expected:** current configuration names are used directly; no superseded
`CODEX_HOME` settings alias or frontend fixture selector is required. The isolated
runtime's own `CODEX_HOME` environment is intentional, not a compatibility alias.
Provider commands, arbitrary user hooks/tools, and unrelated host secrets are not
imported. CORS is a browser-origin policy, not authentication.

### OPS-02 — Reproducibility, Build, Dependency Policy, and CI

1. Run setup/check/audit from setup using recorded runtimes. Record exact versions,
   exit codes, counts, build warnings, and generated frontend asset sizes.
2. Verify uv's root `exclude-newer = "1 week"`, minimum version, and lockfile
   `exclude-newer-span = "P1W"`; run `backend/tests/test_dependency_policy.py`.
3. Inspect the GitHub Actions checks for the actual reviewed commit once one
   exists. A local pass is not a CI-run record.

**Expected:** locked installs and all checks succeed. Registry dependency
resolution applies the seven-day delay to direct and transitive artifacts;
locked sync does not automatically upgrade packages. Git/URL/path dependencies
are outside that cooldown. Leave uv-generated compatibility metadata in its
lockfile intact. Dependency audits can change as advisories are published.

## Result Record

Create one record per executed case; do not copy the automated pass into manual
cases. Attach evidence without credentials or raw provider logs containing secrets.

| Field | Record |
| --- | --- |
| Case ID and feature | For example UI-05 / contextual comparison. |
| Result | Pass / Fail / Blocked / Not run. |
| Build | Commit plus uncommitted patch identifier or working-tree snapshot. |
| Environment | OS, browser/version, viewport/zoom, Python/uv/Node/npm versions, API origin, disposable roots. |
| Test data | Project/card versions, source commits, generation UUIDs, context, provider/model name when applicable. |
| Steps and observed result | Exact input, request/status, visible output, and any deviation. |
| Evidence | Screenshot, redacted response, test log, canonical artifact hash/path. |
| Finding | GAP ID or new reproducible issue; owner/retest result when assigned. |

Conclude the QA run by reporting case counts with their denominator, all failures
and blocked cases, and the remaining gaps. Do not report product acceptance
percentages or analysis-quality scores without the approved evaluation set,
rubric, reviewer process, and denominator.
