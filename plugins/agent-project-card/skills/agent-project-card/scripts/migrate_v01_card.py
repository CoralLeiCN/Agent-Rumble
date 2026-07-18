#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pyyaml==6.0.3",
# ]
# ///
"""Conservatively migrate an Agent Project Card from schema v0.1 to v0.2."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment failure
    raise SystemExit(
        "Migration requires PyYAML; run this file with `uv run --script`."
    ) from exc


ARCHITECTURE_LISTS = (
    "languages",
    "frameworks_and_sdks",
    "model_providers",
    "runtime_and_orchestration",
    "skills",
    "memory_and_state",
    "retrieval_and_knowledge",
    "document_processing",
    "execution_and_sandbox",
    "gateways_and_routing",
    "storage_and_databases",
    "interfaces",
    "deployment",
    "observability_and_evaluation",
    "security_and_permissions",
)


def load_document(path: Path) -> Any:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        return json.loads(text)
    return yaml.safe_load(text)


def dump_document(path: Path, value: Any) -> None:
    if path.suffix.lower() == ".json":
        path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    else:
        path.write_text(
            yaml.safe_dump(value, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )


def pointer_token(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def pointer_path(parts: list[str | int]) -> str:
    return "/" + "/".join(pointer_token(str(part)) for part in parts)


def slug(value: str, fallback: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return normalized or fallback


def list_value(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def text_value(value: Any) -> str:
    return value if isinstance(value, str) else ""


def verification_status(evidence_status: str) -> str:
    return {
        "confirmed": "statically_confirmed",
        "documented_only": "documented",
        "inferred": "unverified",
        "not_found": "unverified",
    }.get(evidence_status, "unverified")


def support_status(evidence_status: str) -> str | None:
    return {
        "confirmed": "statically_confirmed",
        "documented_only": "documented",
    }.get(evidence_status)


def assessment_items(values: Any, context_id: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for value in list_value(values):
        if isinstance(value, dict):
            statement = text_value(value.get("statement") or value.get("name"))
        else:
            statement = str(value) if value is not None else ""
        items.append(
            {
                "statement": statement,
                "reasoning": "",
                "context_id": context_id,
                "confidence": "unknown",
                "claim_ids": [],
            }
        )
    return items


def normalize_unavailable(
    value: Any,
    field_states: dict[str, str],
    parts: list[str | int] | None = None,
) -> Any:
    """Replace v0.1 empty placeholders and record conservative unknown states."""
    current_parts = parts or []
    if isinstance(value, str) and value == "":
        field_states[pointer_path(current_parts)] = "unknown"
        return None
    if isinstance(value, list):
        if not value:
            field_states[pointer_path(current_parts)] = "unknown"
            return []
        return [
            normalize_unavailable(child, field_states, [*current_parts, index])
            for index, child in enumerate(value)
        ]
    if isinstance(value, dict):
        return {
            key: normalize_unavailable(child, field_states, [*current_parts, key])
            for key, child in value.items()
        }
    if value is None:
        field_states[pointer_path(current_parts)] = "unknown"
    return value


def migrate(source: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    if str(source.get("schema_version")) != "0.1":
        raise ValueError("input schema_version must be '0.1'")

    warnings: list[str] = [
        "v0.1 empty values and empty collections were mapped to unknown field states.",
        "v0.1 confirmed was conservatively mapped to statically_confirmed, never runtime_verified.",
        "v0.1 assessments were attached to a default context; review their reasoning and claims.",
    ]
    project_v01 = source.get("project") if isinstance(source.get("project"), dict) else {}
    summary_v01 = source.get("summary") if isinstance(source.get("summary"), dict) else {}
    classification_v01 = (
        source.get("classification") if isinstance(source.get("classification"), dict) else {}
    )
    architecture_v01 = (
        source.get("architecture") if isinstance(source.get("architecture"), dict) else {}
    )
    usage_v01 = source.get("usage") if isinstance(source.get("usage"), dict) else {}
    assessment_v01 = (
        source.get("assessment") if isinstance(source.get("assessment"), dict) else {}
    )
    relationships_v01 = (
        source.get("relationships") if isinstance(source.get("relationships"), dict) else {}
    )

    project_name = text_value(project_v01.get("name"))
    project_id = f"project-{slug(project_name, 'unknown')}"
    repository_url = text_value(project_v01.get("repository_url"))
    analyzed_at = text_value(project_v01.get("analyzed_at"))
    revision = (
        project_v01.get("analyzed_revision")
        if isinstance(project_v01.get("analyzed_revision"), dict)
        else {}
    )
    source_id = "source-repository-1"
    context_id = "context-general-assessment"

    evidence_v01 = [item for item in list_value(source.get("evidence")) if isinstance(item, dict)]
    evidence_to_claim: dict[str, str] = {}
    claims: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []

    for index, item in enumerate(evidence_v01, start=1):
        evidence_id = text_value(item.get("id")) or f"evidence-{index:03d}"
        claim_id = f"claim-{index:03d}"
        evidence_to_claim[evidence_id] = claim_id
        status = text_value(item.get("evidence_status")) or "inferred"
        has_evidence = status != "not_found"
        claims.append(
            {
                "claim_id": claim_id,
                "statement": text_value(item.get("claim")),
                "claim_kind": "interpretive" if status == "inferred" else "factual",
                "verification_status": verification_status(status),
                "confidence": text_value(item.get("confidence")) or "unknown",
                "applies_to": project_id,
                "assessment_context_id": None,
                "supporting_evidence_ids": [evidence_id] if has_evidence else [],
                "conflicting_evidence_ids": [],
                "reasoning": text_value(item.get("note")),
                "last_verified_at": analyzed_at,
            }
        )
        if has_evidence:
            evidence.append(
                {
                    "evidence_id": evidence_id,
                    "source_id": source_id,
                    "locator": {
                        "path": text_value(item.get("source_path")),
                        "symbol_or_section": text_value(item.get("symbol_or_section")),
                        "line_start": None,
                        "line_end": None,
                    },
                    "evidence_status": status,
                    "confidence": text_value(item.get("confidence")) or "unknown",
                    "excerpt_or_symbol": "",
                    "note": text_value(item.get("note")),
                }
            )

    capabilities: list[dict[str, Any]] = []
    for index, item in enumerate(list_value(source.get("capabilities")), start=1):
        if not isinstance(item, dict):
            continue
        status = text_value(item.get("evidence_status")) or "inferred"
        evidence_refs = [
            ref
            for ref in list_value(item.get("evidence_refs"))
            if isinstance(ref, str) and ref in evidence_to_claim and status != "not_found"
        ]
        capabilities.append(
            {
                "capability_id": f"capability-{index:03d}",
                "ontology_id": "",
                "name": text_value(item.get("name")),
                "description": text_value(item.get("description")),
                "support_status": support_status(status),
                "evidence_status": status,
                "scope": "",
                "interfaces": [],
                "prerequisites": [],
                "configuration_requirements": [],
                "limitations": [],
                "confidence": text_value(item.get("confidence")) or "unknown",
                "claim_ids": [evidence_to_claim[ref] for ref in evidence_refs],
                "evidence_refs": evidence_refs,
            }
        )

    tools_and_mcp = (
        architecture_v01.get("tools_and_mcp")
        if isinstance(architecture_v01.get("tools_and_mcp"), dict)
        else {}
    )
    architecture: dict[str, Any] = {
        "overview": text_value(architecture_v01.get("overview")),
        **{key: list_value(architecture_v01.get(key)) for key in ARCHITECTURE_LISTS},
        "tools_and_mcp": {
            "tools": list_value(tools_and_mcp.get("tools")),
            "mcp_role": text_value(tools_and_mcp.get("mcp_role")) or "unclear",
            "mcp_details": list_value(tools_and_mcp.get("mcp_details")),
        },
        "data_flows": [],
        "control_flows": [],
    }

    components: list[dict[str, Any]] = []
    for index, item in enumerate(list_value(source.get("components")), start=1):
        if isinstance(item, dict):
            components.append(
                {
                    "component_id": f"component-{index:03d}",
                    "name": text_value(item.get("name")),
                    "path": text_value(item.get("path")),
                    "project_type": text_value(item.get("project_type")),
                    "purpose": text_value(item.get("purpose")),
                    "claim_ids": [],
                }
            )

    card: dict[str, Any] = {
        "schema_version": "0.2",
        "card_id": f"card-{slug(project_name, 'unknown')}",
        "card_version": 1,
        "field_states": {},
        "project": {
            "project_id": project_id,
            "name": project_name,
            "primary_type": text_value(project_v01.get("primary_type")),
            "type_rationale": text_value(project_v01.get("type_rationale")),
            "boundary": f"Repository: {repository_url}" if repository_url else "",
            "repositories": [
                {
                    "source_id": source_id,
                    "url": repository_url,
                    "owner": text_value(project_v01.get("repository_owner")),
                    "role": "primary",
                    "included_paths": [],
                    "excluded_paths": [],
                }
            ],
            "packages": [],
            "services": [],
            "documentation_sites": [],
            "license": text_value(project_v01.get("license")),
            "status": text_value(project_v01.get("status")) or "unclear",
        },
        "source_snapshot": {
            "analyzed_at": analyzed_at,
            "source_revisions": [
                {
                    "source_id": source_id,
                    "branch": text_value(revision.get("branch")),
                    "tag": text_value(revision.get("tag")),
                    "commit": text_value(revision.get("commit")),
                    "retrieved_at": analyzed_at,
                    "content_digest": "",
                }
            ],
            "release_versions": [],
            "analysis_depth": "targeted",
            "analysis_configuration": {
                "dynamic_analysis": False,
                "migrated_from": "0.1",
            },
            "analyzer_version": "agent-project-card-skill/0.1",
            "ontology_versions": {
                "classification": "v0.1-baseline",
                "capabilities": "v0.1-baseline",
            },
        },
        "summary": {
            "one_line": text_value(summary_v01.get("one_line")),
            "purpose": text_value(summary_v01.get("purpose")),
            "target_users": list_value(summary_v01.get("target_users")),
            "primary_use_cases": list_value(summary_v01.get("primary_use_cases")),
        },
        "classification": {
            "secondary_characteristics": list_value(
                classification_v01.get("secondary_characteristics")
            ),
            "domains": list_value(classification_v01.get("domains")),
            "delivery_forms": list_value(classification_v01.get("delivery_forms")),
            "agent_patterns": list_value(classification_v01.get("agent_patterns")),
            "architecture_layers": [],
            "claim_ids": [],
        },
        "capabilities": capabilities,
        "architecture": architecture,
        "components": components,
        "usage": {
            "installation": text_value(usage_v01.get("installation")),
            "minimal_start": text_value(usage_v01.get("minimal_start")),
            "configuration": list_value(usage_v01.get("configuration")),
            "required_services": list_value(usage_v01.get("required_services")),
            "extension_points": list_value(usage_v01.get("extension_points")),
        },
        "assessment": {
            "contexts": [
                {
                    "context_id": context_id,
                    "use_case": "general_project_assessment",
                    "comparison_cohort": [],
                    "requirements": [],
                    "organizational_constraints": [],
                    "assessed_at": analyzed_at,
                }
            ],
            "maturity": text_value(assessment_v01.get("maturity")) or "unclear",
            "maturity_signals": assessment_items(
                assessment_v01.get("maturity_signals"), context_id
            ),
            "strengths": assessment_items(assessment_v01.get("strengths"), context_id),
            "limitations": assessment_items(assessment_v01.get("limitations"), context_id),
            "risks": assessment_items(assessment_v01.get("risks"), context_id),
            "best_fit": assessment_items(assessment_v01.get("best_fit"), context_id),
            "poor_fit": assessment_items(assessment_v01.get("poor_fit"), context_id),
            "gaps": [],
        },
        "relationships": {
            "depends_on": list_value(relationships_v01.get("depends_on")),
            "integrates_with": list_value(relationships_v01.get("integrates_with")),
            "comparable_projects": list_value(relationships_v01.get("comparable_projects")),
        },
        "claims": claims,
        "sources": [
            {
                "source_id": source_id,
                "source_type": "repository",
                "provenance": "first_party",
                "uri": repository_url,
                "revision_or_version": text_value(revision.get("commit"))
                or text_value(revision.get("tag"))
                or text_value(revision.get("branch")),
                "retrieved_at": analyzed_at,
                "content_digest": "",
                "access_scope": "public",
            }
        ],
        "evidence": evidence,
        "open_questions": list_value(source.get("open_questions")),
    }

    field_states: dict[str, str] = {}
    normalized = normalize_unavailable(card, field_states)
    normalized["field_states"] = field_states

    for index, claim in enumerate(normalized.get("claims", [])):
        path = f"/claims/{index}/assessment_context_id"
        if claim.get("assessment_context_id") is None:
            field_states[path] = "not_applicable"
    for index, capability in enumerate(normalized.get("capabilities", [])):
        if capability.get("support_status") is None:
            path = f"/capabilities/{index}/support_status"
            field_states[path] = (
                "no_evidence_found"
                if capability.get("evidence_status") == "not_found"
                else "unknown"
            )

    return normalized, warnings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="schema v0.1 YAML or JSON card")
    parser.add_argument("--output", required=True, type=Path, help="destination v0.2 card")
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace the destination if it already exists",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.output.exists() and not args.force:
        print(f"Refusing to replace existing output: {args.output}", file=sys.stderr)
        return 2

    try:
        source = load_document(args.input)
        if not isinstance(source, dict):
            raise ValueError("input card must be a mapping")
        card, warnings = migrate(source)
        dump_document(args.output, card)
    except (OSError, ValueError, json.JSONDecodeError, yaml.YAMLError) as exc:
        print(f"Migration failed: {exc}", file=sys.stderr)
        return 2

    print(f"Migrated schema v0.1 card to {args.output}")
    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
