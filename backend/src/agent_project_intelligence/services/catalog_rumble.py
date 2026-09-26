"""Rumble projection derived exclusively from pinned catalog comparisons."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel

from agent_project_intelligence.api.errors import CatalogAPIError
from agent_project_intelligence.api.models.catalog import ComparisonCell, ComparisonRequest
from agent_project_intelligence.models.rumble import (
    RumbleProjectionRequest,
    RumbleProjectionResponse,
)
from agent_project_intelligence.services.catalog import CatalogService
from agent_project_intelligence.services.rumble import project_rumble


class CanonicalRumbleResult(BaseModel):
    """Canonical evidence registry and its deterministic arena projection."""

    matchup: dict[str, Any]
    projection: RumbleProjectionResponse


def catalog_rumble(service: CatalogService, request: ComparisonRequest) -> CanonicalRumbleResult:
    if len(request.cards) != 2:
        raise CatalogAPIError(422, "rumble_pair_required", "Rumble requires two distinct projects.")
    comparison = service.compare(request)
    cards = [service.card(ref.project_id, ref.card_version) for ref in request.cards]
    claims: dict[str, dict[str, Any]] = {}

    def scoped(project_id: str, identifier: str) -> str:
        return json.dumps([project_id, identifier], ensure_ascii=True, separators=(",", ":"))

    def readable(value: Any) -> str:
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            return "; ".join(readable(item) for item in value)
        if isinstance(value, dict):
            if "statement" in value:
                return readable(value["statement"])
            return "; ".join(
                f"{key.replace('_', ' ')}: {readable(item)}" for key, item in value.items()
            )
        return json.dumps(value, ensure_ascii=False)

    def cell(value: ComparisonCell) -> dict[str, Any]:
        card = next(card for card in cards if card["project"]["project_id"] == value.project_id)
        identifiers = []
        for claim in card["claims"]:
            if claim["claim_id"] not in value.claim_ids:
                continue
            identifier = scoped(value.project_id, claim["claim_id"])
            identifiers.append(identifier)
            projected = {
                "canonical_reference": {
                    "projectId": value.project_id,
                    "cardVersion": value.card_version,
                    "claimId": claim["claim_id"],
                },
                "claim_id": identifier,
                "project_id": value.project_id,
                "statement": claim["statement"],
                "why_it_matters": "Recorded in the pinned canonical card for this comparison.",
                "verification_status": claim.get("verification_status") or "unverified",
                "confidence": claim.get("confidence") or "unknown",
            }
            for relationship in ("supporting", "conflicting"):
                evidence_items = []
                for evidence_id in claim[f"{relationship}_evidence_ids"]:
                    resolved = service.evidence(value.project_id, value.card_version, evidence_id)
                    locator = resolved.locator
                    evidence_items.append(
                        {
                            "evidence_id": evidence_id,
                            "repository": resolved.source.get("uri") or "Source URL not recorded",
                            "revision": resolved.source_revision.get("commit")
                            or resolved.source_revision.get("version")
                            or "unknown",
                            "path": locator.get("path") or "",
                            "locator": json.dumps(locator, ensure_ascii=False),
                            "excerpt": resolved.evidence.get("excerpt_or_symbol")
                            or resolved.evidence.get("note")
                            or "No excerpt recorded.",
                            "source_url": resolved.source_url,
                        }
                    )
                projected[f"{relationship}_evidence"] = evidence_items
            claims[identifier] = projected
        return {
            "state": value.state,
            "value": readable(value.value) if value.state == "value" else None,
            # Textual facts do not establish relative requirement satisfaction.
            "alignment": "not_applicable" if value.state == "not_applicable" else "unclear",
            "verification_status": value.claim_verification_status or "unverified",
            "confidence": value.confidence or "unknown",
            "claim_ids": identifiers,
        }

    entrants = []
    for card in cards:
        project = card["project"]
        primary = next(
            (repo for repo in project["repositories"] if repo["role"] == "primary"),
            project["repositories"][0],
        )
        revision: dict[str, Any] = next(
            (
                item
                for item in card["source_snapshot"]["source_revisions"]
                if item["source_id"] == primary["source_id"]
            ),
            {},
        )
        entrants.append(
            {
                "project_id": project["project_id"],
                "project_name": project["name"],
                "project_roles": [project["primary_type"]],
                "source_snapshot": {
                    "card_id": card["card_id"],
                    "card_version": card["card_version"],
                    "revision": revision.get("commit") or revision.get("tag") or "unknown",
                    "analyzed_at": card["source_snapshot"]["analyzed_at"],
                },
            }
        )
    prioritized = sorted(
        comparison.rows,
        key=lambda row: (
            0 if row.id == "contextual-best-fit" else 1 if row.id.startswith("capability-") else 2,
            row.id,
        ),
    )[:12]
    context = request.assessment_context
    projection_request = RumbleProjectionRequest.model_validate(
        {
            "assessment_context": {
                "title": " vs ".join(entrant["project_name"] for entrant in entrants),
                "use_case": context.use_case,
                "cohort_project_ids": comparison.project_ids,
                "requirements": context.canonical_requirements() or [context.use_case],
                "organizational_constraints": context.organizational_constraints,
                "assessed_at": (context.assessed_at or datetime.now(UTC)).date(),
            },
            "entrants": entrants,
            "comparison_rows": [
                {
                    "dimension": row.id,
                    "label": row.label,
                    "requirement": context.use_case,
                    "entrant_a": cell(row.cells[comparison.project_ids[0]]),
                    "entrant_b": cell(row.cells[comparison.project_ids[1]]),
                }
                for row in prioritized
            ],
        }
    )
    return CanonicalRumbleResult(
        matchup={
            "display_label": projection_request.assessment_context.title,
            "claims": list(claims.values()),
        },
        projection=project_rumble(projection_request),
    )
