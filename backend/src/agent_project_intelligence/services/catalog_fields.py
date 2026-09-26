"""Shared canonical field, context, claim, and evidence access."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Mapping, Sequence
from datetime import UTC, datetime
from typing import Any

from agent_project_intelligence.api.models.catalog import (
    AssessmentContextInput,
    AssessmentContextView,
)

_FIELD_STATES = {
    "unknown",
    "not_applicable",
    "not_analyzed",
    "no_evidence_found",
}


def _normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value)).casefold()
    text = re.sub(r"[^\w+#.]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def _string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return [str(item) for item in value if isinstance(item, (str, int, float))]
    return []


def _mapping(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {}


def _sequence(value: Any) -> Sequence[Any]:
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
        return value
    return ()


def _at(document: Mapping[str, Any], *keys: str, default: Any = None) -> Any:
    current: Any = document
    for key in keys:
        if not isinstance(current, Mapping) or key not in current:
            return default
        current = current[key]
    return current


def _dedupe(values: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def _assessment_contexts(
    document: Mapping[str, Any],
) -> list[AssessmentContextView]:
    project_id = str(_at(document, "project", "project_id", default=""))
    return [
        AssessmentContextView(
            context_id=str(context.get("context_id", "")),
            project_id=project_id,
            use_case=str(context.get("use_case", "")),
            comparison_cohort=_string_list(context.get("comparison_cohort")),
            requirements=_string_list(context.get("requirements")),
            organizational_constraints=_string_list(context.get("organizational_constraints")),
            assessed_at=str(context.get("assessed_at", "")),
        )
        for context in _sequence(_at(document, "assessment", "contexts"))
        if isinstance(context, Mapping)
    ]


def _matching_context_ids(
    document: Mapping[str, Any],
    requested: AssessmentContextInput | None,
) -> set[str]:
    """Return contexts equal across every Assessment Context dimension."""
    if requested is None:
        return set()
    requested_assessed_at = _normalized_instant(requested.assessed_at)
    return {
        str(context.get("context_id"))
        for context in _sequence(_at(document, "assessment", "contexts"))
        if isinstance(context, Mapping)
        and context.get("context_id")
        and _normalize(context.get("use_case", "")) == _normalize(requested.use_case)
        and _normalized_string_collection(context.get("comparison_cohort"))
        == _normalized_string_collection(requested.comparison_cohort)
        and _normalized_string_collection(context.get("requirements"))
        == _normalized_string_collection(requested.canonical_requirements())
        and _normalized_string_collection(context.get("organizational_constraints"))
        == _normalized_string_collection(requested.organizational_constraints)
        and requested_assessed_at is not None
        and _normalized_instant(context.get("assessed_at")) == requested_assessed_at
    }


def _assessment_items_for_context(
    document: Mapping[str, Any],
    key: str,
    context_ids: set[str],
) -> list[Mapping[str, Any]]:
    if not context_ids:
        return []
    return [
        item
        for item in _sequence(_at(document, "assessment", key))
        if isinstance(item, Mapping) and item.get("context_id") in context_ids
    ]


def _normalized_string_collection(value: Any) -> tuple[str, ...]:
    return tuple(sorted(_normalize(item) for item in _string_list(value)))


def _normalized_instant(value: Any) -> str | None:
    if value is None:
        return None
    try:
        instant = (
            value
            if isinstance(value, datetime)
            else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        )
    except (TypeError, ValueError):
        return None
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=UTC)
    return instant.astimezone(UTC).isoformat()


def _claims_matching(document: Mapping[str, Any], term: str) -> list[str]:
    normalized = _normalize(term)
    return [
        str(claim.get("claim_id"))
        for claim in _sequence(document.get("claims"))
        if isinstance(claim, Mapping) and normalized in _normalize(claim.get("statement", ""))
    ]


def _claim(
    document: Mapping[str, Any],
    claim_id: str | None,
) -> Mapping[str, Any] | None:
    if claim_id is None:
        return None
    return next(
        (
            claim
            for claim in _sequence(document.get("claims"))
            if isinstance(claim, Mapping) and claim.get("claim_id") == claim_id
        ),
        None,
    )


def _evidence_for_claims(
    document: Mapping[str, Any],
    claim_ids: Iterable[str],
) -> list[str]:
    ids = set(claim_ids)
    return _dedupe(
        evidence_id
        for claim in _sequence(document.get("claims"))
        if isinstance(claim, Mapping) and claim.get("claim_id") in ids
        for evidence_id in (
            *_string_list(claim.get("supporting_evidence_ids")),
            *_string_list(claim.get("conflicting_evidence_ids")),
        )
    )
