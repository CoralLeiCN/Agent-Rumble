"""Deterministic keyword search, ranking, and result projections."""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal, cast

from agent_project_intelligence.api.models.catalog import (
    AssessmentContextInput,
    MatchClaim,
    MatchReason,
    ProjectSearchResult,
    RequirementView,
    SearchRequest,
    SearchResponse,
)
from agent_project_intelligence.catalog.models import CatalogCard, thaw_value
from agent_project_intelligence.services.catalog_fields import (
    _FIELD_STATES,
    _assessment_contexts,
    _assessment_items_for_context,
    _at,
    _claims_matching,
    _dedupe,
    _evidence_for_claims,
    _mapping,
    _matching_context_ids,
    _normalize,
    _sequence,
    _string_list,
)

_TERM = re.compile(r"[\w+#.-]+", flags=re.UNICODE)
UnavailableState = Literal["unknown", "not_applicable", "not_analyzed", "no_evidence_found"]
_STOP_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "build",
    "building",
    "can",
    "find",
    "for",
    "from",
    "help",
    "in",
    "looking",
    "need",
    "needs",
    "of",
    "on",
    "or",
    "project",
    "projects",
    "should",
    "solution",
    "that",
    "the",
    "this",
    "to",
    "want",
    "with",
}

# This intentionally small map is a controlled vocabulary, not an embedding or
# fuzzy search surface. Keys and values are normalized by ``_normalize``.
_SYNONYMS = {
    "ts": "typescript",
    "js": "javascript",
    "py": "python",
    "multiagent": "multi agent",
    "multi agent": "multi agent",
    "rag": "retrieval augmented generation",
    "mcp": "mcp",
    "sdk": "sdk",
    "self hosted": "self hosted",
}


def _term_candidates(raw_term: str) -> list[str]:
    """Return controlled normalizations for one keyword, including plurals."""
    canonical = _SYNONYMS.get(raw_term, raw_term)
    singular: str | None = None
    if canonical.endswith("ies") and len(canonical) > 4:
        singular = f"{canonical[:-3]}y"
    elif canonical.endswith(("ches", "shes", "xes", "zes")):
        singular = canonical[:-2]
    elif canonical.endswith("s") and not canonical.endswith(("ss", "us", "is")):
        singular = canonical[:-1]
    return _dedupe((singular or "", canonical))


def _term_match_quality(term: str, value: str) -> float:
    """Prefer exact words and phrases while retaining useful identifier matches."""
    normalized = _normalize(value)
    if term == normalized:
        return 1.5
    if f" {term} " in f" {normalized} ":
        return 1.0
    if len(term) >= 3 and term in normalized:
        return 0.4
    return 0.0


def _search_field_weight(path: str) -> float:
    """Prioritize user-facing identity, purpose, capability, and stack fields."""
    if path == "/project/name":
        return 12.0
    if path in {"/summary/one_line", "/summary/purpose"}:
        return 11.0
    if path.startswith("/capabilities/"):
        capability_field = path.rsplit("/", 1)[-1]
        return {
            "name": 11.0,
            "description": 10.0,
            "scope": 9.0,
            "interfaces": 8.0,
            "prerequisites": 7.0,
            "configuration_requirements": 7.0,
            "capability_id": 5.0,
            "ontology_id": 5.0,
            "limitations": 4.0,
        }.get(capability_field, 6.0)
    if path in {"/summary/primary_use_cases", "/classification/domains"}:
        return 9.0
    if path in {
        "/summary/target_users",
        "/classification/secondary_characteristics",
        "/classification/agent_patterns",
        "/classification/architecture_layers",
        "/architecture/languages",
    }:
        return 8.0
    if path in {"/project/primary_type", "/project/status", "/project/license"}:
        return 7.0
    if path.startswith("/architecture/") or path.startswith("/components/"):
        return 6.0
    if path.startswith("/usage/"):
        return 5.0
    return 3.0


def _search_field_label(path: str) -> str:
    """Map canonical paths to concise customer-facing match explanations."""
    if path == "/project/name":
        return "project name"
    if path.startswith("/summary/"):
        return "purpose and use cases"
    if path.startswith("/capabilities/"):
        return "capabilities"
    if path == "/classification/domains":
        return "domain focus"
    if path.startswith("/classification/"):
        return "project role"
    if path == "/architecture/languages":
        return "technology stack"
    if path.startswith("/architecture/"):
        return "architecture"
    if path.startswith("/components/"):
        return "components"
    if path.startswith("/usage/"):
        return "setup and usage"
    if path.startswith("/project/"):
        return "project details"
    return "card details"


@dataclass(frozen=True, slots=True)
class _IndexField:
    path: str
    values: tuple[str, ...]
    claim_ids: tuple[str, ...] = ()
    evidence_ids: tuple[str, ...] = ()
    capability_support_status: str | None = None
    confidence: str | None = None
    field_state: UnavailableState | None = None


@dataclass(frozen=True, slots=True)
class _IndexedCard:
    card: CatalogCard
    document: Mapping[str, Any]
    fields: tuple[_IndexField, ...]


class CatalogSearch:
    """Index and search one immutable collection of current cards."""

    def __init__(self, cards: Sequence[CatalogCard], *, now: datetime | None = None) -> None:
        self._now = now.astimezone(UTC) if now is not None else None
        self._index = tuple(self._index_card(card) for card in cards)

    def search(self, request: SearchRequest) -> SearchResponse:
        """Search the current-card projection with deterministic explanations."""
        explicit_terms = _dedupe(
            _normalize(term)
            for term in _TERM.findall(request.text)
            if _normalize(term) not in _STOP_WORDS
        )
        contextual_terms = _dedupe(
            _normalize(term)
            for text in (
                (
                    request.assessment_context.use_case,
                    *request.assessment_context.requirements,
                    *request.assessment_context.preferences,
                )
                if request.assessment_context is not None
                else ()
            )
            for term in _TERM.findall(text)
            if _normalize(term) not in _STOP_WORDS
        )
        raw_terms_with_origin = [
            *((term, True) for term in explicit_terms),
            *((term, False) for term in contextual_terms if term not in explicit_terms),
        ]
        raw_terms = [term for term, _ in raw_terms_with_origin]
        interpreted: list[tuple[str, str, bool, bool]] = []
        uninterpreted: list[str] = []
        for raw_term, is_explicit in raw_terms_with_origin:
            canonical = next(
                (
                    candidate
                    for candidate in _term_candidates(raw_term)
                    if self._term_exists(candidate)
                ),
                None,
            )
            if canonical is not None:
                interpreted.append((raw_term, canonical, raw_term != canonical, is_explicit))
            else:
                uninterpreted.append(raw_term)
        interpreted_explicit_terms = {raw for raw, _, _, is_explicit in interpreted if is_explicit}

        required_explicit_matches = (
            (len(interpreted_explicit_terms) + 1) // 2 if interpreted_explicit_terms else 0
        )
        frequencies = {
            canonical: self._term_document_frequency(canonical)
            for canonical in {canonical for _, canonical, _, _ in interpreted}
        }
        matched: list[tuple[_IndexedCard, list[MatchReason], int, float]] = []
        for indexed in self._index:
            filter_reasons = self._filter_reasons(indexed, request)
            if filter_reasons is None:
                continue
            text_reasons, relevance = self._text_reasons(indexed, interpreted, frequencies)
            if interpreted and not text_reasons:
                continue
            matched_explicit_terms = {
                term
                for reason in text_reasons
                for term in reason.terms
                if term in interpreted_explicit_terms
            }
            if len(matched_explicit_terms) < required_explicit_matches:
                continue
            if raw_terms and not interpreted:
                continue
            reasons = text_reasons + filter_reasons
            matched_term_count = len({term for reason in text_reasons for term in reason.terms})
            matched.append((indexed, reasons, matched_term_count, relevance))

        if interpreted and matched:
            best_relevance = max(item[3] for item in matched)
            relevance_floor = best_relevance * 0.55
            matched = [item for item in matched if item[3] >= relevance_floor]

        matched.sort(
            key=lambda item: (
                -item[3],
                -item[2],
                _normalize(_at(item[0].document, "project", "name", default="")),
                item[0].card.project_id,
                -item[0].card.card_version,
            )
        )
        total = len(matched)
        start = (request.page - 1) * request.page_size
        page_items = matched[start : start + request.page_size]
        projects = [
            self._search_result(indexed, reasons, request.assessment_context)
            for indexed, reasons, _, _ in page_items
        ]

        contexts = [
            context
            for indexed, _, _, _ in page_items
            for context in _assessment_contexts(indexed.document)
        ]
        requirements: list[RequirementView] = []
        if request.assessment_context:
            for kind, labels in (
                ("must", request.assessment_context.requirements),
                ("prefer", request.assessment_context.preferences),
                ("avoid", request.assessment_context.exclusions),
            ):
                requirements.extend(
                    RequirementView(
                        id=f"{kind}-{index}",
                        kind=cast(Literal["must", "prefer", "avoid"], kind),
                        label=label,
                    )
                    for index, label in enumerate(labels)
                )
        return SearchResponse(
            query=request.text,
            assessment_contexts=contexts,
            requirements=requirements,
            uninterpreted_terms=uninterpreted,
            page=request.page,
            page_size=request.page_size,
            total=total,
            projects=projects,
        )

    def _index_card(self, card: CatalogCard) -> _IndexedCard:
        document = card.document
        classification_claims = tuple(
            str(value) for value in _sequence(_at(document, "classification", "claim_ids"))
        )
        fields: list[_IndexField] = [
            _IndexField("/project/name", (str(_at(document, "project", "name", default="")),)),
            _IndexField(
                "/project/primary_type",
                (str(_at(document, "project", "primary_type", default="")),),
                classification_claims,
            ),
            _IndexField(
                "/project/license",
                tuple(_string_list(_at(document, "project", "license"))),
                tuple(_claims_matching(document, "license")),
            ),
            _IndexField("/project/status", (str(_at(document, "project", "status", default="")),)),
        ]
        for key in ("one_line", "purpose", "target_users", "primary_use_cases"):
            fields.append(
                _IndexField(
                    f"/summary/{key}",
                    tuple(_string_list(_at(document, "summary", key))),
                )
            )
        for key in (
            "secondary_characteristics",
            "domains",
            "delivery_forms",
            "agent_patterns",
            "architecture_layers",
        ):
            fields.append(
                _IndexField(
                    f"/classification/{key}",
                    tuple(_string_list(_at(document, "classification", key))),
                    classification_claims,
                )
            )

        for index, capability in enumerate(_sequence(document.get("capabilities"))):
            if not isinstance(capability, Mapping):
                continue
            claim_ids = tuple(str(value) for value in _sequence(capability.get("claim_ids")))
            evidence_ids = tuple(str(value) for value in _sequence(capability.get("evidence_refs")))
            support_status = capability.get("support_status")
            field_state = _mapping(document.get("field_states")).get(
                f"/capabilities/{index}/support_status"
            )
            for key in (
                "capability_id",
                "ontology_id",
                "name",
                "description",
                "scope",
                "interfaces",
                "prerequisites",
                "configuration_requirements",
                "limitations",
            ):
                fields.append(
                    _IndexField(
                        f"/capabilities/{index}/{key}",
                        tuple(_string_list(capability.get(key))),
                        claim_ids,
                        evidence_ids,
                        str(support_status) if support_status is not None else None,
                        (
                            str(capability.get("confidence"))
                            if capability.get("confidence") is not None
                            else None
                        ),
                        cast(UnavailableState, field_state)
                        if field_state in _FIELD_STATES
                        else None,
                    )
                )

        architecture = _mapping(document.get("architecture"))
        fields.extend(
            [
                _IndexField(
                    "/architecture/overview", tuple(_string_list(architecture.get("overview")))
                ),
                _IndexField(
                    "/architecture/languages", tuple(_string_list(architecture.get("languages")))
                ),
            ]
        )
        for key, value in architecture.items():
            if key in {"overview", "languages"}:
                continue
            fields.extend(self._index_nested_fields(f"/architecture/{key}", value))

        for index, component in enumerate(_sequence(document.get("components"))):
            if not isinstance(component, Mapping):
                continue
            claims = tuple(str(value) for value in _sequence(component.get("claim_ids")))
            fields.append(
                _IndexField(
                    f"/components/{index}",
                    tuple(
                        str(component.get(key))
                        for key in ("name", "project_type", "purpose")
                        if component.get(key)
                    ),
                    claims,
                )
            )
        for section in ("usage", "relationships", "open_questions"):
            fields.extend(self._index_nested_fields(f"/{section}", document.get(section)))

        fields = [
            _IndexField(
                field.path,
                tuple(value for value in field.values if value),
                field.claim_ids,
                tuple(
                    _dedupe((*field.evidence_ids, *_evidence_for_claims(document, field.claim_ids)))
                ),
                field.capability_support_status,
                field.confidence,
                field.field_state,
            )
            for field in fields
            if field.values
        ]
        return _IndexedCard(card=card, document=document, fields=tuple(fields))

    def _index_nested_fields(self, path: str, value: Any) -> list[_IndexField]:
        """Index each smallest nested value with only its owning Claim links."""
        fields: list[_IndexField] = []
        if isinstance(value, Mapping):
            claims = tuple(
                _dedupe(
                    (
                        *_string_list(value.get("claim_ids")),
                        *_string_list(value.get("related_claim_ids")),
                    )
                )
            )
            for key, child in value.items():
                if key in {"claim_ids", "related_claim_ids"}:
                    continue
                child_path = f"{path}/{key}"
                if isinstance(child, (str, int, float)):
                    fields.append(_IndexField(child_path, (str(child),), claims))
                elif (
                    isinstance(child, Sequence)
                    and not isinstance(child, (str, bytes))
                    and all(isinstance(item, (str, int, float)) for item in child)
                ):
                    fields.append(
                        _IndexField(child_path, tuple(str(item) for item in child), claims)
                    )
                else:
                    fields.extend(self._index_nested_fields(child_path, child))
        elif isinstance(value, Sequence) and not isinstance(value, (str, bytes)):
            if all(isinstance(child, (str, int, float)) for child in value):
                fields.append(_IndexField(path, tuple(str(child) for child in value)))
            else:
                for index, child in enumerate(value):
                    fields.extend(self._index_nested_fields(f"{path}/{index}", child))
        elif isinstance(value, (str, int, float)):
            fields.append(_IndexField(path, (str(value),)))
        return fields

    def _term_exists(self, canonical: str) -> bool:
        return any(
            _term_match_quality(canonical, value) > 0
            for indexed in self._index
            for field in indexed.fields
            for value in field.values
        )

    def _term_document_frequency(self, canonical: str) -> int:
        return sum(
            any(
                _term_match_quality(canonical, value) > 0
                for field in indexed.fields
                for value in field.values
            )
            for indexed in self._index
        )

    def _text_reasons(
        self,
        indexed: _IndexedCard,
        terms: Sequence[tuple[str, str, bool, bool]],
        frequencies: Mapping[str, int],
    ) -> tuple[list[MatchReason], float]:
        ranked_reasons: list[tuple[float, MatchReason]] = []
        for raw, canonical, is_synonym, is_explicit in terms:
            candidates = [
                (
                    _search_field_weight(field.path) * _term_match_quality(canonical, value)
                    + (4.0 if field.claim_ids or field.evidence_ids else 0.0),
                    field,
                    value,
                )
                for field in indexed.fields
                for value in field.values
                if _term_match_quality(canonical, value) > 0
            ]
            if not candidates:
                continue
            field_relevance, field, value = max(candidates, key=lambda item: item[0])
            rarity_bonus = max(len(self._index) - frequencies[canonical], 0)
            origin_weight = 1.0 if is_explicit else 0.35
            relevance = (field_relevance + rarity_bonus) * origin_weight
            ranked_reasons.append(
                (
                    relevance,
                    MatchReason(
                        kind="synonym" if is_synonym else "text",
                        path=field.path,
                        matched_value=value,
                        terms=[raw],
                        claim_ids=list(field.claim_ids),
                        evidence_ids=list(field.evidence_ids),
                        capability_support_status=field.capability_support_status,
                        confidence=field.confidence,
                        field_state=field.field_state,
                    ),
                )
            )
        ranked_reasons.sort(key=lambda item: -item[0])
        return [reason for _, reason in ranked_reasons], sum(
            relevance for relevance, _ in ranked_reasons
        )

    def _filter_reasons(
        self,
        indexed: _IndexedCard,
        request: SearchRequest,
    ) -> list[MatchReason] | None:
        document = indexed.document
        matching_context_ids = _matching_context_ids(
            document,
            request.assessment_context,
        )
        maturity_signals = _assessment_items_for_context(
            document,
            "maturity_signals",
            matching_context_ids,
        )
        maturity_claims = _dedupe(
            claim_id
            for item in maturity_signals
            for claim_id in _string_list(_mapping(item).get("claim_ids"))
        )
        capability_values = [
            value
            for capability in _sequence(document.get("capabilities"))
            if isinstance(capability, Mapping)
            for key in ("capability_id", "ontology_id", "name")
            for value in _string_list(capability.get(key))
        ]
        dimensions: tuple[tuple[str, list[str], list[str], str, tuple[str, ...]], ...] = (
            (
                "categories",
                request.filters.categories,
                _string_list(_at(document, "project", "primary_type"))
                + _string_list(_at(document, "classification", "secondary_characteristics")),
                "/project/primary_type",
                tuple(_string_list(_at(document, "classification", "claim_ids"))),
            ),
            ("capabilities", request.filters.capabilities, capability_values, "/capabilities", ()),
            (
                "languages",
                request.filters.languages,
                _string_list(_at(document, "architecture", "languages")),
                "/architecture/languages",
                (),
            ),
            (
                "licenses",
                request.filters.licenses,
                _string_list(_at(document, "project", "license")),
                "/project/license",
                tuple(_claims_matching(document, "license")),
            ),
            (
                "maturities",
                request.filters.maturities,
                (_string_list(_at(document, "assessment", "maturity")) if maturity_signals else []),
                "/assessment/maturity",
                tuple(maturity_claims),
            ),
            (
                "architecture_layers",
                request.filters.architecture_layers,
                _string_list(_at(document, "classification", "architecture_layers")),
                "/classification/architecture_layers",
                tuple(_string_list(_at(document, "classification", "claim_ids"))),
            ),
        )
        reasons: list[MatchReason] = []
        for dimension, requested, available, path, default_claims in dimensions:
            if not requested:
                continue
            match = next(
                (
                    (needle, value)
                    for needle in requested
                    for value in available
                    if _normalize(needle) in _normalize(value)
                ),
                None,
            )
            if match is None:
                return None
            needle, value = match
            claim_ids = list(default_claims)
            evidence_ids: list[str] = []
            capability_support_status: str | None = None
            confidence: str | None = None
            field_state: UnavailableState | None = None
            if dimension == "capabilities":
                capability_match = next(
                    (
                        (index, item)
                        for index, item in enumerate(_sequence(document.get("capabilities")))
                        if isinstance(item, Mapping)
                        and any(
                            _normalize(needle) in _normalize(candidate)
                            for key in ("capability_id", "ontology_id", "name")
                            for candidate in _string_list(item.get(key))
                        )
                    ),
                    None,
                )
                if capability_match is not None:
                    capability_index, capability = capability_match
                    claim_ids = _string_list(capability.get("claim_ids"))
                    evidence_ids = _string_list(capability.get("evidence_refs"))
                    if capability.get("support_status") is not None:
                        capability_support_status = str(capability.get("support_status"))
                    if capability.get("confidence") is not None:
                        confidence = str(capability.get("confidence"))
                    candidate_state = _mapping(document.get("field_states")).get(
                        f"/capabilities/{capability_index}/support_status"
                    )
                    if candidate_state in _FIELD_STATES:
                        field_state = cast(UnavailableState, candidate_state)
            evidence_ids = _dedupe((*evidence_ids, *_evidence_for_claims(document, claim_ids)))
            reasons.append(
                MatchReason(
                    kind="filter",
                    path=path,
                    matched_value=value,
                    terms=[needle],
                    claim_ids=claim_ids,
                    evidence_ids=evidence_ids,
                    capability_support_status=capability_support_status,
                    confidence=confidence,
                    field_state=field_state,
                )
            )
        return reasons

    def _search_result(
        self,
        indexed: _IndexedCard,
        reasons: list[MatchReason],
        requested_context: AssessmentContextInput | None,
    ) -> ProjectSearchResult:
        document = indexed.document
        project = _mapping(document.get("project"))
        summary = _mapping(document.get("summary"))
        snapshot = _mapping(document.get("source_snapshot"))
        repositories = _sequence(project.get("repositories"))
        repository = next(
            (
                item
                for item in repositories
                if isinstance(item, Mapping) and item.get("role") == "primary"
            ),
            None,
        )
        if repository is None:
            repository = next(
                (item for item in repositories if isinstance(item, Mapping)),
                {},
            )
        revisions = _sequence(snapshot.get("source_revisions"))
        repository_source_id = repository.get("source_id")
        revision = next(
            (
                item
                for item in revisions
                if isinstance(item, Mapping) and item.get("source_id") == repository_source_id
            ),
            {},
        )
        claims_by_id = {
            str(claim.get("claim_id")): claim
            for claim in _sequence(document.get("claims"))
            if isinstance(claim, Mapping) and claim.get("claim_id")
        }
        first_claim_id = next(
            (
                claim_id
                for reason in reasons
                for claim_id in reason.claim_ids
                if claim_id in claims_by_id
            ),
            None,
        )
        claim = claims_by_id.get(first_claim_id) if first_claim_id else None
        analyzed_at = str(snapshot.get("analyzed_at", ""))
        age = self._analysis_age_days(analyzed_at)
        matching_context_ids = _matching_context_ids(document, requested_context)
        limitations = _assessment_items_for_context(
            document,
            "limitations",
            matching_context_ids,
        )
        first_limitation = _mapping(limitations[0]) if limitations else {}
        primary_type = str(project.get("primary_type", "unknown"))
        first_reason = reasons[0] if reasons else None
        return ProjectSearchResult(
            id=indexed.card.project_id,
            name=str(project.get("name", indexed.card.project_id)),
            owner=str(repository.get("owner") or "Unknown owner"),
            project_type=primary_type.replace("_", " "),
            role=primary_type.replace("_", " "),
            summary=str(
                summary.get("one_line") or summary.get("purpose") or "Summary not analyzed."
            ),
            match_reason=self._match_reason_summary(first_reason),
            constraint=str(
                first_limitation.get("statement")
                or "Contextual limitation not analyzed for this Assessment Context."
            ),
            languages=_string_list(_at(document, "architecture", "languages")),
            card_id=indexed.card.card_id,
            schema_version=indexed.card.schema_version,
            card_version=indexed.card.card_version,
            canonical_primary_type=primary_type,
            analysis_depth=str(snapshot.get("analysis_depth", "unknown")),
            boundary=str(project.get("boundary") or "Project boundary not analyzed."),
            source_count=len(_sequence(document.get("sources"))),
            revision=str(revision.get("commit") or revision.get("tag") or "unknown"),
            analyzed_at=analyzed_at,
            analysis_age_days=age,
            source_snapshot=thaw_value(snapshot),
            match_reasons=reasons,
            match_claim=(
                MatchClaim(
                    claim_id=str(claim.get("claim_id")),
                    verification_status=str(claim.get("verification_status")),
                    confidence=str(claim.get("confidence")),
                )
                if claim is not None
                else None
            ),
        )

    @staticmethod
    def _match_reason_summary(reason: MatchReason | None) -> str:
        """Create a concise explanation without exposing internal card paths."""
        if reason is None:
            return "Included by the catalog filters."
        term = reason.terms[0] if reason.terms else reason.matched_value
        value = " ".join(reason.matched_value.split())
        if len(value) > 180:
            value = f"{value[:177].rstrip()}…"
        label = _search_field_label(reason.path)
        sentence_end = "" if value.endswith((".", "!", "?")) else "."
        if reason.kind == "filter":
            return f"Matches the “{term}” {label} filter: {value}{sentence_end}"
        return f"Matches “{term}” in its {label}: {value}{sentence_end}"

    def _analysis_age_days(self, value: str) -> int:
        try:
            analyzed_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if analyzed_at.tzinfo is None:
                analyzed_at = analyzed_at.replace(tzinfo=UTC)
            now = self._now if self._now is not None else datetime.now(UTC)
            return max(0, (now - analyzed_at.astimezone(UTC)).days)
        except ValueError:
            return 0
