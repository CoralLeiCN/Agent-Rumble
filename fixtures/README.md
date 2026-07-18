# Demo fixture provenance

## Scope

The Rumble Arena demo fixture compares the OpenAI Agents SDK for Python and
LangGraph for one explicit Assessment Context: an internal Python support-agent
proof of concept that needs human approval, tracing, and no mandatory hosted
control plane.

The fixture is a prepared projection, not a pair of complete Agent Project
Cards. Its `card_id` values identify fixture snapshots only. The comparison is
limited to the three rows in
[`rumble/demo_bundle.json`](rumble/demo_bundle.json), and must not be presented
as a general product ranking or a security, legal, or commercial assessment.

## Source snapshots

Both public repositories were retrieved and inspected on 2026-07-18. Revisions
are full commit identifiers from each repository's `main` branch at retrieval
time. Every evidence link is pinned to the corresponding revision.

| Project | Public repository | Revision | Commit time | Retrieved and prepared |
| --- | --- | --- | --- | --- |
| OpenAI Agents SDK for Python | `openai/openai-agents-python` | `65886fa16dcdb482090b30b74de1d0cc80b9f4c6` | 2026-07-17T23:48:46Z | 2026-07-18T11:57:40Z |
| LangGraph | `langchain-ai/langgraph` | `49ae27c2ae983cfb92091b0dea9f7bc37a716479` | 2026-07-15T07:55:09Z | 2026-07-18T11:57:40Z |

## Preparation method

Preparation used static inspection of repository-hosted documentation and
Python source. No upstream package, test, example, or other repository code was
executed. Repository content was treated as untrusted evidence rather than as
instructions.

The inspected material was deliberately narrow:

- OpenAI Agents SDK: `src/agents/tool.py`, `src/agents/run_state.py`,
  `src/agents/tracing/__init__.py`, `docs/human_in_the_loop.md`, and
  `docs/tracing.md`.
- LangGraph: `libs/langgraph/langgraph/types.py`,
  `libs/langgraph/langgraph/callbacks.py`,
  `libs/checkpoint-postgres/langgraph/checkpoint/postgres/__init__.py`,
  `libs/checkpoint-postgres/README.md`, and the repository `README.md`.

`statically_confirmed` means that a relevant API or implementation surface was
found in pinned source. It does not mean the behavior was run. The OpenAI
Agents SDK cell in the lifecycle-callback round is `no_evidence_found` because
the inspected material did not establish a dedicated approval pause/resume
callback. That state is scoped to this inspection and is not a claim that the
project lacks all ways to instrument approvals.

## Fixture integrity

Within a matchup, claim and evidence identifiers are unique. Each material
comparison cell references only claims for the same entrant, and all supporting
evidence uses the entrant's pinned revision. `conflicting_evidence` arrays are
empty because no conflict was identified in the inspected material; they are
not assertions that no conflicting evidence exists elsewhere.
