"""Catalog retrieval, deterministic search, evidence, and comparison services."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import quote, urlsplit

from agent_project_intelligence.api.errors import CatalogAPIError
from agent_project_intelligence.api.identifier_references import (
    identifiers_equal,
    normalize_scalar_identifier,
)
from agent_project_intelligence.api.models.catalog import (
    AssessmentContextInput,
    AssessmentContextView,
    CatalogContextResponse,
    ComparedCard,
    ComparisonCell,
    ComparisonRequest,
    ComparisonResponse,
    ComparisonRow,
    EvidenceResponse,
    MatchClaim,
    MatchReason,
    ProjectSearchResult,
    RequirementView,
    RoleAnalysis,
    SearchRequest,
    SearchResponse,
)
from agent_project_intelligence.catalog.models import CatalogCard, CatalogSnapshot, thaw_value


_TERM = re.compile(r"[\w+#.-]+", flags=re.UNICODE)
_GITHUB_COMMIT = re.compile(r"^[0-9a-fA-F]{7,64}$")
_FIELD_STATES = {
    "unknown",
    "not_applicable",
    "not_analyzed",
    "no_evidence_found",
}
_STOP_WORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
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


@dataclass(frozen=True, slots=True)
class _IndexField:
    path: str
    values: tuple[str, ...]
    claim_ids: tuple[str, ...] = ()
    evidence_ids: tuple[str, ...] = ()
    capability_support_status: str | None = None
    evidence_status: str | None = None
    confidence: str | None = None
    field_state: str | None = None


@dataclass(frozen=True, slots=True)
class _IndexedCard:
    card: CatalogCard
    document: Mapping[str, Any]
    fields: tuple[_IndexField, ...]


class CatalogService:
    """Read and project one immutable, all-or-nothing catalog snapshot."""

    def __init__(
        self,
        snapshot: CatalogSnapshot,
        *,
        now: datetime | None = None,
        catalog_id: str = "agent-rumble-public-catalog",
        catalog_label: str = "Development catalog",
    ) -> None:
        self._snapshot = snapshot
        self._now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        self._catalog_id = catalog_id
        self._catalog_label = catalog_label
        self._index = tuple(self._index_card(card) for card in snapshot.list_current())

    def catalog_context(self) -> CatalogContextResponse:
        """Describe the deployed cohort and its freshness bounds."""
        documents = [indexed.document for indexed in self._index]
        analyzed_at = sorted(
            value
            for document in documents
            if (value := _at(document, "source_snapshot", "analyzed_at"))
            and isinstance(value, str)
        )
        schema_versions = sorted(
            {str(document.get("schema_version")) for document in documents}
        )
        ontology_versions: set[str] = set()
        for document in documents:
            versions = _mapping(_at(document, "source_snapshot", "ontology_versions", default={}))
            for name, version in versions.items():
                if version is not None:
                    ontology_versions.add(f"{name}:{version}")

        return CatalogContextResponse(
            catalog_id=self._catalog_id,
            label=self._catalog_label,
            cohort_description=(
                "Operator-preprocessed Agent Project Cards for the public GitHub "
                "projects available in this deployment."
            ),
            coverage=[
                "Validated canonical Agent Project Card schema v0.2 artifacts",
                "Static analysis at pinned public source snapshots",
                "Python and TypeScript agent projects and supporting components",
            ],
            exclusions=[
                "User-submitted repository analysis",
                "Live repository state and continuous monitoring",
                "Runtime verification unless a card explicitly records it",
                "Universal project quality scoring",
            ],
            card_count=self._snapshot.project_count,
            schema_versions=schema_versions,
            ontology_versions=sorted(ontology_versions),
            oldest_analyzed_at=analyzed_at[0] if analyzed_at else None,
            newest_analyzed_at=analyzed_at[-1] if analyzed_at else None,
        )

    def current_card(self, project_id: str) -> dict[str, Any]:
        """Return the exact current canonical card document."""
        self._validate_identifier(project_id, "project_id")
        card = self._snapshot.get_current(project_id)
        if card is None:
            card = next(
                (
                    candidate
                    for candidate in self._snapshot.list_current()
                    if identifiers_equal(candidate.project_id, project_id)
                ),
                None,
            )
        if card is None:
            raise self._not_found(project_id)
        return card.to_document()

    def card(self, project_id: str, card_version: int) -> dict[str, Any]:
        """Return the exact pinned canonical card document."""
        self._validate_identifier(project_id, "project_id")
        card = self._get_card(project_id, card_version)
        return card.to_document()

    def evidence(
        self,
        project_id: str,
        card_version: int,
        evidence_id: str,
    ) -> EvidenceResponse:
        """Resolve Evidence to related Claims, Source, and pinned revision."""
        self._validate_identifier(project_id, "project_id")
        self._validate_identifier(evidence_id, "evidence_id")
        card = self._get_card(project_id, card_version)
        document = card.document

        evidence = next(
            (
                item
                for item in _sequence(document.get("evidence"))
                if isinstance(item, Mapping)
                and isinstance(item.get("evidence_id"), str)
                and identifiers_equal(str(item.get("evidence_id")), evidence_id)
            ),
            None,
        )
        if evidence is None:
            raise CatalogAPIError(
                404,
                "evidence_not_found",
                "The requested evidence does not exist in the pinned card.",
                details={
                    "project_id": project_id,
                    "card_version": card_version,
                    "evidence_id": evidence_id,
                },
            )

        source_id = evidence.get("source_id")
        source = next(
            (
                item
                for item in _sequence(document.get("sources"))
                if isinstance(item, Mapping) and item.get("source_id") == source_id
            ),
            None,
        )
        revision = next(
            (
                item
                for item in _sequence(_at(document, "source_snapshot", "source_revisions"))
                if isinstance(item, Mapping) and item.get("source_id") == source_id
            ),
            None,
        )
        # Validation should make these links total. A typed server-side contract
        # error is still safer than returning a partial provenance chain.
        if source is None or revision is None:
            raise CatalogAPIError(
                500,
                "catalog_reference_error",
                "The validated card contains an unresolved evidence provenance link.",
                details={"evidence_id": evidence_id, "source_id": source_id},
            )

        resolved_evidence_id = str(evidence.get("evidence_id"))
        related_claims = [
            claim
            for claim in _sequence(document.get("claims"))
            if isinstance(claim, Mapping)
            and any(
                isinstance(candidate, str)
                and identifiers_equal(candidate, resolved_evidence_id)
                for candidate in (
                    list(_sequence(claim.get("supporting_evidence_ids")))
                    + list(_sequence(claim.get("conflicting_evidence_ids")))
                )
            )
        ]
        locator = _mapping(evidence.get("locator"))
        return EvidenceResponse(
            project_id=card.project_id,
            card_id=card.card_id,
            card_version=card.card_version,
            evidence=thaw_value(evidence),
            related_claims=[thaw_value(claim) for claim in related_claims],
            source=thaw_value(source),
            source_revision=thaw_value(revision),
            locator=thaw_value(locator),
            source_url=self._safe_source_url(source, revision, locator),
        )

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
            canonical = _SYNONYMS.get(raw_term, raw_term)
            if self._term_exists(canonical):
                interpreted.append(
                    (raw_term, canonical, raw_term != canonical, is_explicit)
                )
            else:
                uninterpreted.append(raw_term)
        interpreted_explicit_terms = {
            raw for raw, _, _, is_explicit in interpreted if is_explicit
        }

        matched: list[tuple[_IndexedCard, list[MatchReason], int]] = []
        for indexed in self._index:
            filter_reasons = self._filter_reasons(indexed, request)
            if filter_reasons is None:
                continue
            text_reasons = self._text_reasons(indexed, interpreted)
            if interpreted and not text_reasons:
                continue
            if interpreted_explicit_terms and not any(
                term in interpreted_explicit_terms
                for reason in text_reasons
                for term in reason.terms
            ):
                continue
            if raw_terms and not interpreted:
                continue
            reasons = text_reasons + filter_reasons
            matched_term_count = len({term for reason in text_reasons for term in reason.terms})
            matched.append((indexed, reasons, matched_term_count))

        matched.sort(
            key=lambda item: (
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
            for indexed, reasons, _ in page_items
        ]

        contexts = [
            context
            for indexed, _, _ in page_items
            for context in self._assessment_contexts(indexed.document)
        ]
        requirements = [
            RequirementView(id=f"requirement-{position}", label=requirement)
            for position, requirement in enumerate(
                request.assessment_context.requirements if request.assessment_context else (),
                start=1,
            )
        ]
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

    def compare(self, request: ComparisonRequest) -> ComparisonResponse:
        """Compare pinned cards without producing a winner or aggregate score."""
        cards = [self._get_card(ref.project_id, ref.card_version) for ref in request.cards]
        documents = [card.document for card in cards]
        project_ids = [card.project_id for card in cards]

        rows = self._comparison_rows(cards, documents, request.assessment_context)
        role_analysis = self._role_analysis(documents)
        shared_attribute_count = sum(self._row_is_shared(row) for row in rows)
        return ComparisonResponse(
            assessment_context=request.assessment_context,
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

    def _index_card(self, card: CatalogCard) -> _IndexedCard:
        document = card.document
        classification_claims = tuple(
            str(value)
            for value in _sequence(_at(document, "classification", "claim_ids"))
        )
        fields: list[_IndexField] = [
            _IndexField("/project/name", (str(_at(document, "project", "name", default="")),)),
            _IndexField("/project/primary_type", (str(_at(document, "project", "primary_type", default="")),), classification_claims),
            _IndexField(
                "/project/license",
                tuple(_string_list(_at(document, "project", "license"))),
                tuple(self._claims_matching(document, "license")),
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
                            str(capability.get("evidence_status"))
                            if capability.get("evidence_status") is not None
                            else None
                        ),
                        (
                            str(capability.get("confidence"))
                            if capability.get("confidence") is not None
                            else None
                        ),
                        str(field_state) if field_state in _FIELD_STATES else None,
                    )
                )

        architecture = _mapping(document.get("architecture"))
        fields.extend(
            [
                _IndexField("/architecture/overview", tuple(_string_list(architecture.get("overview")))),
                _IndexField("/architecture/languages", tuple(_string_list(architecture.get("languages")))),
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
                tuple(_dedupe((*field.evidence_ids, *self._evidence_for_claims(document, field.claim_ids)))),
                field.capability_support_status,
                field.evidence_status,
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
                elif isinstance(child, Sequence) and not isinstance(child, (str, bytes)) and all(
                    isinstance(item, (str, int, float)) for item in child
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
            canonical in _normalize(value)
            for indexed in self._index
            for field in indexed.fields
            for value in field.values
        )

    def _text_reasons(
        self,
        indexed: _IndexedCard,
        terms: Sequence[tuple[str, str, bool, bool]],
    ) -> list[MatchReason]:
        reasons: list[MatchReason] = []
        for raw, canonical, is_synonym, _is_explicit in terms:
            match = next(
                (
                    (field, value)
                    for field in indexed.fields
                    for value in field.values
                    if canonical in _normalize(value)
                ),
                None,
            )
            if match is None:
                continue
            field, value = match
            reasons.append(
                MatchReason(
                    kind="synonym" if is_synonym else "text",
                    path=field.path,
                    matched_value=value,
                    terms=[raw],
                    claim_ids=list(field.claim_ids),
                    evidence_ids=list(field.evidence_ids),
                    capability_support_status=field.capability_support_status,
                    evidence_status=field.evidence_status,
                    confidence=field.confidence,
                    field_state=field.field_state,
                )
            )
        return reasons

    def _filter_reasons(
        self,
        indexed: _IndexedCard,
        request: SearchRequest,
    ) -> list[MatchReason] | None:
        document = indexed.document
        matching_context_ids = self._matching_context_ids(
            document,
            request.assessment_context,
        )
        maturity_signals = self._assessment_items_for_context(
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
            ("languages", request.filters.languages, _string_list(_at(document, "architecture", "languages")), "/architecture/languages", ()),
            ("licenses", request.filters.licenses, _string_list(_at(document, "project", "license")), "/project/license", tuple(self._claims_matching(document, "license"))),
            (
                "maturities",
                request.filters.maturities,
                (
                    _string_list(_at(document, "assessment", "maturity"))
                    if maturity_signals
                    else []
                ),
                "/assessment/maturity",
                tuple(maturity_claims),
            ),
            ("architecture_layers", request.filters.architecture_layers, _string_list(_at(document, "classification", "architecture_layers")), "/classification/architecture_layers", tuple(_string_list(_at(document, "classification", "claim_ids")))),
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
            evidence_status: str | None = None
            confidence: str | None = None
            field_state: str | None = None
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
                    if capability.get("evidence_status") is not None:
                        evidence_status = str(capability.get("evidence_status"))
                    if capability.get("confidence") is not None:
                        confidence = str(capability.get("confidence"))
                    candidate_state = _mapping(document.get("field_states")).get(
                        f"/capabilities/{capability_index}/support_status"
                    )
                    if candidate_state in _FIELD_STATES:
                        field_state = str(candidate_state)
            evidence_ids = _dedupe(
                (*evidence_ids, *self._evidence_for_claims(document, claim_ids))
            )
            reasons.append(
                MatchReason(
                    kind="filter",
                    path=path,
                    matched_value=value,
                    terms=[needle],
                    claim_ids=claim_ids,
                    evidence_ids=evidence_ids,
                    capability_support_status=capability_support_status,
                    evidence_status=evidence_status,
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
        matching_context_ids = self._matching_context_ids(document, requested_context)
        limitations = self._assessment_items_for_context(
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
            summary=str(summary.get("one_line") or summary.get("purpose") or "Summary not analyzed."),
            match_reason=(
                f"Matched {first_reason.matched_value} at {first_reason.path}."
                if first_reason
                else "Included by the catalog query."
            ),
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

    def _assessment_contexts(
        self,
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
        self,
        document: Mapping[str, Any],
        requested: AssessmentContextInput | None,
    ) -> set[str]:
        """Return contexts equal across every Assessment Context dimension."""
        if requested is None:
            return set()
        requested_assessed_at = self._normalized_instant(requested.assessed_at)
        return {
            str(context.get("context_id"))
            for context in _sequence(_at(document, "assessment", "contexts"))
            if isinstance(context, Mapping)
            and context.get("context_id")
            and _normalize(context.get("use_case", "")) == _normalize(requested.use_case)
            and self._normalized_string_collection(context.get("comparison_cohort"))
            == self._normalized_string_collection(requested.comparison_cohort)
            and self._normalized_string_collection(context.get("requirements"))
            == self._normalized_string_collection(requested.requirements)
            and self._normalized_string_collection(
                context.get("organizational_constraints")
            )
            == self._normalized_string_collection(requested.organizational_constraints)
            and requested_assessed_at is not None
            and self._normalized_instant(context.get("assessed_at"))
            == requested_assessed_at
        }

    def _assessment_items_for_context(
        self,
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

    def _normalized_string_collection(self, value: Any) -> tuple[str, ...]:
        return tuple(sorted(_normalize(item) for item in _string_list(value)))

    def _normalized_instant(self, value: Any) -> str | None:
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
            instant = instant.replace(tzinfo=timezone.utc)
        return instant.astimezone(timezone.utc).isoformat()

    def _comparison_rows(
        self,
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
            lambda card, document: self._cell(
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
            lambda card, document: self._cell(
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
            lambda card, document: self._cell(
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
            lambda card, document: self._cell(
                card,
                document,
                "/project/license",
                _at(document, "project", "license"),
                self._claims_matching(document, "license"),
            ),
        )
        add_row(
            "maturity",
            "Maturity",
            "Material differences",
            lambda card, document: self._contextual_maturity_cell(
                card, document, context
            ),
        )
        add_row(
            "interfaces",
            "Interfaces",
            "Material differences",
            lambda card, document: self._cell(
                card,
                document,
                "/architecture/interfaces",
                self._interfaces(document),
                self._capability_claims(document),
            ),
        )
        add_row(
            "prerequisites",
            "Prerequisites",
            "Material differences",
            lambda card, document: self._cell(
                card,
                document,
                "/capabilities",
                self._capability_values(document, "prerequisites"),
                self._capability_claims(document),
            ),
        )
        add_row(
            "limitations",
            "Recorded limitations",
            "Material differences",
            lambda card, document: self._contextual_assessment_items_cell(
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
            lambda card, document: self._cell(
                card,
                document,
                "/open_questions",
                self._open_questions(document),
                self._open_question_claims(document),
            ),
        )

        capability_keys = sorted(
            {
                self._capability_key(capability)
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
                if isinstance(capability, Mapping) and self._capability_key(capability) == key
            ]
            add_row(
                f"capability-{quote(key, safe='')}",
                labels[0] if labels else key,
                "Material differences",
                lambda card, document, capability_key=key: self._capability_cell(
                    card, document, capability_key
                ),
            )

        add_row(
            "contextual-best-fit",
            "Fit under the requested context",
            "Prototype guidance",
            lambda card, document: self._contextual_fit_cell(card, document, context),
        )
        return rows

    def _cell(
        self,
        card: CatalogCard,
        document: Mapping[str, Any],
        pointer: str,
        value: Any,
        claim_ids: Sequence[str],
        *,
        capability_support_status: str | None = None,
        evidence_status: str | None = None,
        confidence: str | None = None,
    ) -> ComparisonCell:
        field_state = _mapping(document.get("field_states")).get(pointer)
        first_claim = self._claim(document, next(iter(claim_ids), None))
        if field_state in _FIELD_STATES:
            return ComparisonCell(
                state=field_state,
                capability_support_status=capability_support_status,
                evidence_status=evidence_status,
                claim_verification_status=(
                    str(first_claim.get("verification_status")) if first_claim else None
                ),
                confidence=confidence or (
                    str(first_claim.get("confidence")) if first_claim else None
                ),
                claim_ids=list(claim_ids),
                evidence_ids=self._evidence_for_claims(document, claim_ids),
                project_id=card.project_id,
                card_version=card.card_version,
            )
        if value is None:
            return ComparisonCell(
                state="not_analyzed",
                claim_ids=list(claim_ids),
                evidence_ids=self._evidence_for_claims(document, claim_ids),
                project_id=card.project_id,
                card_version=card.card_version,
            )
        return ComparisonCell(
            state="value",
            value=value,
            capability_support_status=capability_support_status,
            evidence_status=evidence_status,
            claim_verification_status=(
                str(first_claim.get("verification_status")) if first_claim else None
            ),
            confidence=confidence or (str(first_claim.get("confidence")) if first_claim else None),
            claim_ids=list(claim_ids),
            evidence_ids=self._evidence_for_claims(document, claim_ids),
            project_id=card.project_id,
            card_version=card.card_version,
        )

    def _capability_cell(
        self,
        card: CatalogCard,
        document: Mapping[str, Any],
        capability_key: str,
    ) -> ComparisonCell:
        match = next(
            (
                (index, capability)
                for index, capability in enumerate(_sequence(document.get("capabilities")))
                if isinstance(capability, Mapping)
                and self._capability_key(capability) == capability_key
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
        cell = self._cell(
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
            evidence_status=str(capability.get("evidence_status")),
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
        self,
        card: CatalogCard,
        document: Mapping[str, Any],
        requested: AssessmentContextInput,
    ) -> ComparisonCell:
        return self._contextual_assessment_items_cell(
            card,
            document,
            requested,
            "best_fit",
            "/assessment/best_fit",
        )

    def _contextual_maturity_cell(
        self,
        card: CatalogCard,
        document: Mapping[str, Any],
        requested: AssessmentContextInput,
    ) -> ComparisonCell:
        context_ids = self._matching_context_ids(document, requested)
        signals = self._assessment_items_for_context(
            document,
            "maturity_signals",
            context_ids,
        )
        if not signals:
            return self._not_analyzed_cell(card)
        claim_ids = _dedupe(
            claim_id
            for item in signals
            for claim_id in _string_list(_mapping(item).get("claim_ids"))
        )
        return self._cell(
            card,
            document,
            "/assessment/maturity",
            _at(document, "assessment", "maturity"),
            claim_ids,
        )

    def _contextual_assessment_items_cell(
        self,
        card: CatalogCard,
        document: Mapping[str, Any],
        requested: AssessmentContextInput,
        key: str,
        pointer: str,
    ) -> ComparisonCell:
        context_ids = self._matching_context_ids(document, requested)
        items = self._assessment_items_for_context(document, key, context_ids)
        if not items:
            return self._not_analyzed_cell(card)
        claim_ids = _dedupe(
            claim_id
            for item in items
            for claim_id in _string_list(_mapping(item).get("claim_ids"))
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
        return self._cell(
            card,
            document,
            pointer,
            statements if len(statements) != 1 else statements[0],
            claim_ids,
            confidence=confidences[0] if len(confidences) == 1 else None,
        )

    def _not_analyzed_cell(self, card: CatalogCard) -> ComparisonCell:
        return ComparisonCell(
            state="not_analyzed",
            claim_ids=[],
            evidence_ids=[],
            project_id=card.project_id,
            card_version=card.card_version,
        )

    def _role_analysis(self, documents: Sequence[Mapping[str, Any]]) -> RoleAnalysis:
        roles = [str(_at(document, "project", "primary_type", default="unknown")) for document in documents]
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

    def _row_is_shared(self, row: ComparisonRow) -> int:
        cells = list(row.cells.values())
        if not cells or any(cell.state != "value" for cell in cells):
            return 0
        normalized = {_normalize(cell.value) for cell in cells}
        return int(len(normalized) == 1)

    def _capability_key(self, capability: Mapping[str, Any]) -> str:
        return _normalize(
            capability.get("ontology_id")
            or capability.get("capability_id")
            or capability.get("name")
            or "unknown"
        )

    def _capability_values(self, document: Mapping[str, Any], key: str) -> list[str]:
        return _dedupe(
            value
            for capability in _sequence(document.get("capabilities"))
            if isinstance(capability, Mapping)
            for value in _string_list(capability.get(key))
        )

    def _capability_claims(self, document: Mapping[str, Any]) -> list[str]:
        return _dedupe(
            value
            for capability in _sequence(document.get("capabilities"))
            if isinstance(capability, Mapping)
            for value in _string_list(capability.get("claim_ids"))
        )

    def _interfaces(self, document: Mapping[str, Any]) -> list[str]:
        return _dedupe(
            (
                *_string_list(_at(document, "architecture", "interfaces")),
                *self._capability_values(document, "interfaces"),
            )
        )

    def _assessment_statements(self, document: Mapping[str, Any], key: str) -> list[str]:
        return [
            str(item.get("statement"))
            for item in _sequence(_at(document, "assessment", key))
            if isinstance(item, Mapping) and item.get("statement")
        ]

    def _assessment_claims(self, document: Mapping[str, Any], key: str) -> list[str]:
        return _dedupe(
            claim_id
            for item in _sequence(_at(document, "assessment", key))
            if isinstance(item, Mapping)
            for claim_id in _string_list(item.get("claim_ids"))
        )

    def _open_questions(self, document: Mapping[str, Any]) -> list[str]:
        return [
            str(item.get("question")) if isinstance(item, Mapping) else str(item)
            for item in _sequence(document.get("open_questions"))
        ]

    def _open_question_claims(self, document: Mapping[str, Any]) -> list[str]:
        return _dedupe(
            claim_id
            for item in _sequence(document.get("open_questions"))
            if isinstance(item, Mapping)
            for claim_id in _string_list(item.get("related_claim_ids"))
        )

    def _claims_matching(self, document: Mapping[str, Any], term: str) -> list[str]:
        normalized = _normalize(term)
        return [
            str(claim.get("claim_id"))
            for claim in _sequence(document.get("claims"))
            if isinstance(claim, Mapping)
            and normalized in _normalize(claim.get("statement", ""))
        ]

    def _claim(
        self,
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
        self,
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

    def _safe_source_url(
        self,
        source: Mapping[str, Any],
        revision: Mapping[str, Any],
        locator: Mapping[str, Any],
    ) -> str | None:
        if source.get("source_type") != "repository" or source.get("access_scope") != "public":
            return None
        uri = source.get("uri")
        commit = revision.get("commit")
        path = locator.get("path")
        if not isinstance(uri, str) or not isinstance(commit, str) or not isinstance(path, str):
            return None
        parsed = urlsplit(uri)
        segments = [segment for segment in parsed.path.removesuffix(".git").split("/") if segment]
        if (
            parsed.scheme != "https"
            or parsed.hostname != "github.com"
            or parsed.username is not None
            or parsed.password is not None
            or parsed.port is not None
            or len(segments) != 2
            or not _GITHUB_COMMIT.fullmatch(commit)
            or not self._safe_locator_path(path)
        ):
            return None
        base = f"https://github.com/{quote(segments[0], safe='')}/{quote(segments[1], safe='')}"
        url = f"{base}/blob/{commit}/{quote(path, safe='/')}"
        start = locator.get("line_start")
        end = locator.get("line_end")
        if isinstance(start, int) and start > 0:
            url += f"#L{start}"
            if isinstance(end, int) and end >= start:
                url += f"-L{end}"
        return url

    def _safe_locator_path(self, path: str) -> bool:
        if not path or path.startswith(("/", "\\")) or "\\" in path:
            return False
        if any(ord(character) < 32 for character in path):
            return False
        return all(segment not in {"", ".", ".."} for segment in path.split("/"))

    def _analysis_age_days(self, value: str) -> int:
        try:
            analyzed_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if analyzed_at.tzinfo is None:
                analyzed_at = analyzed_at.replace(tzinfo=timezone.utc)
            return max(0, (self._now - analyzed_at.astimezone(timezone.utc)).days)
        except ValueError:
            return 0

    def _get_card(self, project_id: str, card_version: int) -> CatalogCard:
        self._validate_identifier(project_id, "project_id")
        if card_version < 1:
            raise CatalogAPIError(
                400,
                "invalid_card_version",
                "card_version must be a positive integer.",
                details={"card_version": card_version},
            )
        card = self._snapshot.get(project_id, card_version)
        if card is None:
            card = next(
                (
                    candidate
                    for candidate in self._snapshot.cards
                    if candidate.card_version == card_version
                    and identifiers_equal(candidate.project_id, project_id)
                ),
                None,
            )
        if card is None:
            raise self._not_found(project_id, card_version)
        return card

    def _validate_identifier(self, value: str, field: str) -> None:
        try:
            if value == "":
                raise ValueError("identifier is empty")
            normalize_scalar_identifier(value)
        except ValueError:
            raise CatalogAPIError(
                400,
                "invalid_identifier",
                f"{field} is not a valid catalog identifier.",
                details={"field": field},
            )

    def _not_found(
        self,
        project_id: str,
        card_version: int | None = None,
    ) -> CatalogAPIError:
        details: dict[str, Any] = {"project_id": project_id}
        if card_version is not None:
            details["card_version"] = card_version
        return CatalogAPIError(
            404,
            "card_not_found",
            "The requested Agent Project Card was not found.",
            details=details,
        )
