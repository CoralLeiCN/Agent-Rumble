#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "jsonschema==4.26.0",
#   "pyyaml==6.0.3",
# ]
# ///
"""Validate an Agent Project Card structurally and semantically."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

try:
    import yaml
    from jsonschema import Draft202012Validator
except ImportError as exc:  # pragma: no cover - environment failure
    raise SystemExit(
        "Validation requires PyYAML and jsonschema; run this file with "
        "`uv run --script`."
    ) from exc


DEFAULT_SCHEMA = Path(__file__).resolve().parents[1] / "references" / "project-card.schema.json"


def load_document(path: Path) -> Any:
    """Load JSON or YAML from path."""
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        return json.loads(text)
    return yaml.safe_load(text)


def pointer_token(value: str) -> str:
    """Escape one JSON Pointer token."""
    return value.replace("~", "~0").replace("/", "~1")


def pointer_path(parts: list[str | int]) -> str:
    """Build a JSON Pointer from path parts."""
    return "/" + "/".join(pointer_token(str(part)) for part in parts)


def resolve_pointer(document: Any, pointer: str) -> Any:
    """Resolve a JSON Pointer, raising KeyError or IndexError when invalid."""
    if pointer == "":
        return document
    if not pointer.startswith("/"):
        raise KeyError(pointer)
    current = document
    for raw_token in pointer[1:].split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            current = current[int(token)]
        elif isinstance(current, dict):
            current = current[token]
        else:
            raise KeyError(pointer)
    return current


def iter_null_paths(value: Any, parts: list[str | int] | None = None) -> Iterator[str]:
    """Yield JSON Pointers for all null values."""
    current_parts = parts or []
    if value is None:
        yield pointer_path(current_parts)
    elif isinstance(value, dict):
        for key, child in value.items():
            yield from iter_null_paths(child, [*current_parts, key])
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from iter_null_paths(child, [*current_parts, index])


def collect_ids(items: list[dict[str, Any]], key: str, label: str, errors: list[str]) -> set[str]:
    """Collect unique identifiers and report duplicates."""
    values: set[str] = set()
    for index, item in enumerate(items):
        value = item.get(key)
        if not isinstance(value, str):
            continue
        if value in values:
            errors.append(f"/{label}/{index}/{key}: duplicate identifier {value!r}")
        values.add(value)
    return values


def check_references(
    refs: Any,
    valid_ids: set[str],
    path: str,
    kind: str,
    errors: list[str],
) -> None:
    """Report dangling identifiers from an already schema-checked list."""
    if not isinstance(refs, list):
        return
    for index, value in enumerate(refs):
        if isinstance(value, str) and value not in valid_ids:
            errors.append(f"{path}/{index}: unknown {kind} identifier {value!r}")


def iter_technology_claim_refs(architecture: dict[str, Any]) -> Iterator[tuple[str, list[str]]]:
    """Yield claim-reference lists from structured architecture entries."""
    for key, value in architecture.items():
        if key in {"overview", "languages", "data_flows", "control_flows"}:
            continue
        entries = value.get("tools", []) if key == "tools_and_mcp" and isinstance(value, dict) else value
        if not isinstance(entries, list):
            continue
        for index, entry in enumerate(entries):
            if isinstance(entry, dict):
                yield f"/architecture/{key}/{index}/claim_ids", entry.get("claim_ids", [])


def semantic_errors(card: dict[str, Any]) -> list[str]:
    """Return cross-field and product-contract validation errors."""
    errors: list[str] = []
    field_states = card.get("field_states", {})

    if isinstance(field_states, dict):
        for path in iter_null_paths(card):
            if path not in field_states:
                errors.append(f"{path}: null value requires a field_states entry")
        for path in field_states:
            try:
                value = resolve_pointer(card, path)
            except (KeyError, IndexError, ValueError):
                errors.append(f"/field_states: pointer {path!r} does not resolve")
                continue
            if value is not None and value != []:
                errors.append(
                    f"/field_states: pointer {path!r} must target null or an empty collection"
                )

    claims = card.get("claims", [])
    evidence = card.get("evidence", [])
    sources = card.get("sources", [])
    capabilities = card.get("capabilities", [])
    components = card.get("components", [])
    contexts = card.get("assessment", {}).get("contexts", [])

    claim_ids = collect_ids(claims, "claim_id", "claims", errors)
    evidence_ids = collect_ids(evidence, "evidence_id", "evidence", errors)
    source_ids = collect_ids(sources, "source_id", "sources", errors)
    context_ids = collect_ids(contexts, "context_id", "assessment/contexts", errors)
    collect_ids(capabilities, "capability_id", "capabilities", errors)
    collect_ids(components, "component_id", "components", errors)

    project = card.get("project", {})
    for index, repository in enumerate(project.get("repositories", [])):
        source_id = repository.get("source_id")
        if source_id not in source_ids:
            errors.append(
                f"/project/repositories/{index}/source_id: unknown source identifier {source_id!r}"
            )

    snapshot = card.get("source_snapshot", {})
    for index, revision in enumerate(snapshot.get("source_revisions", [])):
        source_id = revision.get("source_id")
        if source_id not in source_ids:
            errors.append(
                f"/source_snapshot/source_revisions/{index}/source_id: "
                f"unknown source identifier {source_id!r}"
            )

    classification = card.get("classification", {})
    check_references(
        classification.get("claim_ids"),
        claim_ids,
        "/classification/claim_ids",
        "claim",
        errors,
    )

    for index, capability in enumerate(capabilities):
        base = f"/capabilities/{index}"
        check_references(capability.get("claim_ids"), claim_ids, f"{base}/claim_ids", "claim", errors)
        check_references(
            capability.get("evidence_refs"),
            evidence_ids,
            f"{base}/evidence_refs",
            "evidence",
            errors,
        )
        if capability.get("evidence_status") != "not_found" and not capability.get("evidence_refs"):
            errors.append(f"{base}/evidence_refs: capability requires evidence unless status is not_found")

    for index, component in enumerate(components):
        check_references(
            component.get("claim_ids"),
            claim_ids,
            f"/components/{index}/claim_ids",
            "claim",
            errors,
        )

    for path, refs in iter_technology_claim_refs(card.get("architecture", {})):
        check_references(refs, claim_ids, path, "claim", errors)

    assessment = card.get("assessment", {})
    for group in (
        "maturity_signals",
        "strengths",
        "limitations",
        "risks",
        "best_fit",
        "poor_fit",
        "gaps",
    ):
        for index, item in enumerate(assessment.get(group, [])):
            base = f"/assessment/{group}/{index}"
            context_id = item.get("context_id")
            if context_id not in context_ids:
                errors.append(f"{base}/context_id: unknown assessment context {context_id!r}")
            check_references(item.get("claim_ids"), claim_ids, f"{base}/claim_ids", "claim", errors)

    relationships = card.get("relationships", {})
    for group in ("depends_on", "integrates_with", "comparable_projects"):
        for index, item in enumerate(relationships.get(group, [])):
            if isinstance(item, dict):
                check_references(
                    item.get("claim_ids"),
                    claim_ids,
                    f"/relationships/{group}/{index}/claim_ids",
                    "claim",
                    errors,
                )

    dynamic_analysis = snapshot.get("analysis_configuration", {}).get("dynamic_analysis") is True
    for index, claim in enumerate(claims):
        base = f"/claims/{index}"
        check_references(
            claim.get("supporting_evidence_ids"),
            evidence_ids,
            f"{base}/supporting_evidence_ids",
            "evidence",
            errors,
        )
        check_references(
            claim.get("conflicting_evidence_ids"),
            evidence_ids,
            f"{base}/conflicting_evidence_ids",
            "evidence",
            errors,
        )
        context_id = claim.get("assessment_context_id")
        if context_id is not None and context_id not in context_ids:
            errors.append(f"{base}/assessment_context_id: unknown assessment context {context_id!r}")
        if claim.get("claim_kind") == "assessment" and context_id is None:
            errors.append(f"{base}/assessment_context_id: assessment claim requires a context")
        if claim.get("verification_status") == "runtime_verified" and not dynamic_analysis:
            errors.append(
                f"{base}/verification_status: runtime_verified requires dynamic_analysis=true"
            )

    for index, capability in enumerate(capabilities):
        if capability.get("support_status") == "runtime_verified" and not dynamic_analysis:
            errors.append(
                f"/capabilities/{index}/support_status: runtime_verified requires dynamic_analysis=true"
            )

    for index, item in enumerate(evidence):
        source_id = item.get("source_id")
        if source_id not in source_ids:
            errors.append(f"/evidence/{index}/source_id: unknown source identifier {source_id!r}")
        locator = item.get("locator", {})
        start = locator.get("line_start")
        end = locator.get("line_end")
        if isinstance(start, int) and isinstance(end, int) and end < start:
            errors.append(f"/evidence/{index}/locator: line_end cannot precede line_start")

    for index, question in enumerate(card.get("open_questions", [])):
        if isinstance(question, dict):
            check_references(
                question.get("related_claim_ids"),
                claim_ids,
                f"/open_questions/{index}/related_claim_ids",
                "claim",
                errors,
            )

    return errors


def schema_errors(card: Any, schema: dict[str, Any]) -> list[str]:
    """Return deterministic JSON Schema validation messages."""
    validator = Draft202012Validator(schema)
    messages: list[str] = []
    for error in sorted(validator.iter_errors(card), key=lambda item: list(item.absolute_path)):
        path = pointer_path(list(error.absolute_path)) if error.absolute_path else "/"
        messages.append(f"{path}: {error.message}")
    return messages


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("card", type=Path, help="Agent Project Card YAML or JSON file")
    parser.add_argument(
        "--schema",
        type=Path,
        default=DEFAULT_SCHEMA,
        help="JSON Schema path (defaults to the schema bundled with this skill)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        card = load_document(args.card)
        schema = json.loads(args.schema.read_text(encoding="utf-8"))
    except (OSError, ValueError, yaml.YAMLError) as exc:
        print(f"Unable to load card or schema: {exc}", file=sys.stderr)
        return 2

    errors = schema_errors(card, schema)
    if not errors and isinstance(card, dict):
        errors.extend(semantic_errors(card))

    if errors:
        print(f"Agent Project Card validation failed with {len(errors)} error(s):", file=sys.stderr)
        for error in sorted(errors):
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Agent Project Card is valid: {args.card}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
