"""Pure contextual comparison projections from pinned canonical cards."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Literal
from urllib.parse import quote

from agent_project_intelligence.api.models.catalog import (
    AssessmentContextInput,
    ComparedCard,
    ComparisonCell,
    ComparisonResponse,
    ComparisonRow,
    RoleAnalysis,
)
from agent_project_intelligence.catalog.models import CatalogCard, thaw_value
from agent_project_intelligence.services.catalog_fields import (
    _FIELD_STATES,
    _assessment_items_for_context,
    _at,
    _claim,
    _claims_matching,
    _dedupe,
    _evidence_for_claims,
    _mapping,
    _matching_context_ids,
    _normalize,
    _sequence,
    _string_list,
)


def compare_cards(
    cards: Sequence[CatalogCard], context: AssessmentContextInput
) -> ComparisonResponse:
    """Compare pinned cards without producing a winner or aggregate score."""
    documents = [card.document for card in cards]
    project_ids = [card.project_id for card in cards]

    rows = _comparison_rows(cards, documents, context)
    role_analysis = _role_analysis(documents)
    shared_attribute_count = sum(_row_is_shared(row) for row in rows)
    return ComparisonResponse(
        assessment_context=context,
        project_ids=project_ids,
        cards=[
            ComparedCard(
                project_id=card.project_id,
                card_id=card.card_id,
                card_version=card.card_version,
                name=str(_at(document, "project", "name", default=card.project_id)),
                primary_type=str(_at(document, "project", "primary_type", default="unknown")),
                source_snapshot=thaw_value(_mapping(document.get("source_snapshot"))),
            )
            for card, document in zip(cards, documents, strict=True)
        ],
        role_analysis=role_analysis,
        rows=rows,
        shared_attribute_count=shared_attribute_count,
    )


def _comparison_rows(
    cards: Sequence[CatalogCard],
    documents: Sequence[Mapping[str, Any]],
    context: AssessmentContextInput,
) -> list[ComparisonRow]:
    rows: list[ComparisonRow] = []

    def add_row(
        row_id: str,
        label: str,
        group: Literal["Role and fit", "Material differences", "Prototype guidance"],
        cell_builder: Any,
    ) -> None:
        rows.append(
            ComparisonRow(
                id=row_id,
                label=label,
                group=group,
                cells={
                    card.project_id: cell_builder(card, document)
                    for card, document in zip(cards, documents, strict=True)
                },
            )
        )

    add_row(
        "role",
        "Architecture role",
        "Role and fit",
        lambda card, document: _cell(
            card,
            document,
            "/project/primary_type",
            _at(document, "project", "primary_type"),
            _string_list(_at(document, "classification", "claim_ids")),
        ),
    )
    add_row(
        "architecture-layers",
        "Architecture layers",
        "Role and fit",
        lambda card, document: _cell(
            card,
            document,
            "/classification/architecture_layers",
            _string_list(_at(document, "classification", "architecture_layers")),
            _string_list(_at(document, "classification", "claim_ids")),
        ),
    )
    add_row(
        "languages",
        "Languages",
        "Material differences",
        lambda card, document: _cell(
            card,
            document,
            "/architecture/languages",
            _string_list(_at(document, "architecture", "languages")),
            _string_list(_at(document, "classification", "claim_ids")),
        ),
    )
    add_row(
        "license",
        "License",
        "Material differences",
        lambda card, document: _cell(
            card,
            document,
            "/project/license",
            _at(document, "project", "license"),
            _claims_matching(document, "license"),
        ),
    )
    add_row(
        "maturity",
        "Maturity",
        "Material differences",
        lambda card, document: _contextual_maturity_cell(card, document, context),
    )
    add_row(
        "interfaces",
        "Interfaces",
        "Material differences",
        lambda card, document: _cell(
            card,
            document,
            "/architecture/interfaces",
            _interfaces(document),
            _capability_claims(document),
        ),
    )
    add_row(
        "prerequisites",
        "Prerequisites",
        "Material differences",
        lambda card, document: _cell(
            card,
            document,
            "/capabilities",
            _capability_values(document, "prerequisites"),
            _capability_claims(document),
        ),
    )
    add_row(
        "limitations",
        "Recorded limitations",
        "Material differences",
        lambda card, document: _contextual_assessment_items_cell(
            card,
            document,
            context,
            "limitations",
            "/assessment/limitations",
        ),
    )
    add_row(
        "open-questions",
        "Open questions",
        "Material differences",
        lambda card, document: _cell(
            card,
            document,
            "/open_questions",
            _open_questions(document),
            _open_question_claims(document),
        ),
    )

    capability_keys = sorted(
        {
            _capability_key(capability)
            for document in documents
            for capability in _sequence(document.get("capabilities"))
            if isinstance(capability, Mapping)
        }
    )
    for key in capability_keys:
        labels = [
            str(capability.get("name"))
            for document in documents
            for capability in _sequence(document.get("capabilities"))
            if isinstance(capability, Mapping) and _capability_key(capability) == key
        ]
        add_row(
            f"capability-{quote(key, safe='')}",
            labels[0] if labels else key,
            "Material differences",
            lambda card, document, capability_key=key: _capability_cell(
                card, document, capability_key
            ),
        )

    add_row(
        "contextual-best-fit",
        "Fit under the requested context",
        "Prototype guidance",
        lambda card, document: _contextual_fit_cell(card, document, context),
    )
    return rows


def _cell(
    card: CatalogCard,
    document: Mapping[str, Any],
    pointer: str,
    value: Any,
    claim_ids: Sequence[str],
    *,
    capability_support_status: str | None = None,
    confidence: str | None = None,
) -> ComparisonCell:
    field_state = _mapping(document.get("field_states")).get(pointer)
    first_claim = _claim(document, next(iter(claim_ids), None))
    if field_state in _FIELD_STATES:
        return ComparisonCell(
            state=field_state,
            capability_support_status=capability_support_status,
            claim_verification_status=(
                str(first_claim.get("verification_status")) if first_claim else None
            ),
            confidence=confidence or (str(first_claim.get("confidence")) if first_claim else None),
            claim_ids=list(claim_ids),
            evidence_ids=_evidence_for_claims(document, claim_ids),
            project_id=card.project_id,
            card_version=card.card_version,
        )
    if value is None:
        return ComparisonCell(
            state="not_analyzed",
            claim_ids=list(claim_ids),
            evidence_ids=_evidence_for_claims(document, claim_ids),
            project_id=card.project_id,
            card_version=card.card_version,
        )
    return ComparisonCell(
        state="value",
        value=value,
        capability_support_status=capability_support_status,
        claim_verification_status=(
            str(first_claim.get("verification_status")) if first_claim else None
        ),
        confidence=confidence or (str(first_claim.get("confidence")) if first_claim else None),
        claim_ids=list(claim_ids),
        evidence_ids=_evidence_for_claims(document, claim_ids),
        project_id=card.project_id,
        card_version=card.card_version,
    )


def _capability_cell(
    card: CatalogCard,
    document: Mapping[str, Any],
    capability_key: str,
) -> ComparisonCell:
    match = next(
        (
            (index, capability)
            for index, capability in enumerate(_sequence(document.get("capabilities")))
            if isinstance(capability, Mapping) and _capability_key(capability) == capability_key
        ),
        None,
    )
    if match is None:
        return ComparisonCell(
            state="not_analyzed",
            claim_ids=[],
            evidence_ids=[],
            project_id=card.project_id,
            card_version=card.card_version,
        )
    index, capability = match
    claim_ids = _string_list(capability.get("claim_ids"))
    cell = _cell(
        card,
        document,
        f"/capabilities/{index}/support_status",
        capability.get("description") or capability.get("name"),
        claim_ids,
        capability_support_status=(
            str(capability.get("support_status"))
            if capability.get("support_status") is not None
            else None
        ),
        confidence=str(capability.get("confidence")),
    )
    return cell.model_copy(
        update={
            "evidence_ids": _dedupe(
                (*cell.evidence_ids, *_string_list(capability.get("evidence_refs")))
            )
        }
    )


def _contextual_fit_cell(
    card: CatalogCard,
    document: Mapping[str, Any],
    requested: AssessmentContextInput,
) -> ComparisonCell:
    return _contextual_assessment_items_cell(
        card,
        document,
        requested,
        "best_fit",
        "/assessment/best_fit",
    )


def _contextual_maturity_cell(
    card: CatalogCard,
    document: Mapping[str, Any],
    requested: AssessmentContextInput,
) -> ComparisonCell:
    context_ids = _matching_context_ids(document, requested)
    signals = _assessment_items_for_context(
        document,
        "maturity_signals",
        context_ids,
    )
    if not signals:
        return _not_analyzed_cell(card)
    claim_ids = _dedupe(
        claim_id for item in signals for claim_id in _string_list(_mapping(item).get("claim_ids"))
    )
    return _cell(
        card,
        document,
        "/assessment/maturity",
        _at(document, "assessment", "maturity"),
        claim_ids,
    )


def _contextual_assessment_items_cell(
    card: CatalogCard,
    document: Mapping[str, Any],
    requested: AssessmentContextInput,
    key: str,
    pointer: str,
) -> ComparisonCell:
    context_ids = _matching_context_ids(document, requested)
    items = _assessment_items_for_context(document, key, context_ids)
    if not items:
        return _not_analyzed_cell(card)
    claim_ids = _dedupe(
        claim_id for item in items for claim_id in _string_list(_mapping(item).get("claim_ids"))
    )
    statements = [
        str(item.get("statement"))
        for item in items
        if isinstance(item, Mapping) and item.get("statement")
    ]
    confidences = _dedupe(
        str(item.get("confidence"))
        for item in items
        if isinstance(item, Mapping) and item.get("confidence")
    )
    return _cell(
        card,
        document,
        pointer,
        statements if len(statements) != 1 else statements[0],
        claim_ids,
        confidence=confidences[0] if len(confidences) == 1 else None,
    )


def _not_analyzed_cell(card: CatalogCard) -> ComparisonCell:
    return ComparisonCell(
        state="not_analyzed",
        claim_ids=[],
        evidence_ids=[],
        project_id=card.project_id,
        card_version=card.card_version,
    )


def _role_analysis(documents: Sequence[Mapping[str, Any]]) -> RoleAnalysis:
    roles = [
        str(_at(document, "project", "primary_type", default="unknown")) for document in documents
    ]
    unique = set(roles)
    if len(unique) == 1:
        return RoleAnalysis(
            compatibility="same_role",
            explanation=f"All selected projects have the canonical role {roles[0]!r}.",
        )
    complementary_pairs = {
        frozenset(("agent_application", "agent_framework_sdk")),
        frozenset(("agent_application", "agent_harness_runtime")),
        frozenset(("agent_application", "agent_tool_mcp")),
        frozenset(("agent_application", "agent_skill")),
        frozenset(("agent_framework_sdk", "agent_tool_mcp")),
        frozenset(("agent_harness_runtime", "agent_tool_mcp")),
    }
    pairs = {
        frozenset((left, right))
        for index, left in enumerate(roles)
        for right in roles[index + 1 :]
        if left != right
    }
    if pairs and pairs.issubset(complementary_pairs):
        return RoleAnalysis(
            compatibility="complementary_roles",
            explanation=(
                "The selected projects occupy different but potentially complementary "
                f"roles: {', '.join(sorted(unique))}. Capability rows are not a direct "
                "winner comparison."
            ),
        )
    return RoleAnalysis(
        compatibility="different_roles",
        explanation=(
            "The selected projects serve different canonical roles "
            f"({', '.join(sorted(unique))}); interpret differences as role distinctions, "
            "not evidence of inferiority."
        ),
    )


def _row_is_shared(row: ComparisonRow) -> int:
    cells = list(row.cells.values())
    if not cells or any(cell.state != "value" for cell in cells):
        return 0
    normalized = {_normalize(cell.value) for cell in cells}
    return int(len(normalized) == 1)


def _capability_key(capability: Mapping[str, Any]) -> str:
    return _normalize(
        capability.get("ontology_id")
        or capability.get("capability_id")
        or capability.get("name")
        or "unknown"
    )


def _capability_values(document: Mapping[str, Any], key: str) -> list[str]:
    return _dedupe(
        value
        for capability in _sequence(document.get("capabilities"))
        if isinstance(capability, Mapping)
        for value in _string_list(capability.get(key))
    )


def _capability_claims(document: Mapping[str, Any]) -> list[str]:
    return _dedupe(
        value
        for capability in _sequence(document.get("capabilities"))
        if isinstance(capability, Mapping)
        for value in _string_list(capability.get("claim_ids"))
    )


def _interfaces(document: Mapping[str, Any]) -> list[str]:
    return _dedupe(
        (
            *_string_list(_at(document, "architecture", "interfaces")),
            *_capability_values(document, "interfaces"),
        )
    )


def _open_questions(document: Mapping[str, Any]) -> list[str]:
    return [
        str(item.get("question")) if isinstance(item, Mapping) else str(item)
        for item in _sequence(document.get("open_questions"))
    ]


def _open_question_claims(document: Mapping[str, Any]) -> list[str]:
    return _dedupe(
        claim_id
        for item in _sequence(document.get("open_questions"))
        if isinstance(item, Mapping)
        for claim_id in _string_list(item.get("related_claim_ids"))
    )
