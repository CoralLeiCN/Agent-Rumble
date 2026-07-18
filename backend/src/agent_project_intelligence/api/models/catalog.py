"""Catalog API transport models.

Canonical card retrieval deliberately does not use a projection model: those
routes return the validated document byte-for-value after JSON serialization.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PlainValidator,
    WithJsonSchema,
    field_validator,
)

from agent_project_intelligence.api.identifier_references import (
    identifier_comparison_key,
    normalize_scalar_identifier,
)


class APIModel(BaseModel):
    """Strict base model for catalog transport contracts."""

    model_config = ConfigDict(extra="forbid")


def _validate_canonical_identifier(value: Any) -> str:
    """Accept a nonempty interoperable JSON string and normalize valid pairs."""
    if not isinstance(value, str) or value == "":
        raise ValueError("identifier must be a nonempty string")
    return normalize_scalar_identifier(value)


CanonicalIdentifier = Annotated[
    str,
    PlainValidator(_validate_canonical_identifier),
    WithJsonSchema({"type": "string", "minLength": 1}),
]


class AssessmentContextInput(APIModel):
    """The caller's explicit context for search or comparison."""

    use_case: str = Field(min_length=1, max_length=2_000)
    comparison_cohort: list[str] = Field(default_factory=list, max_length=100)
    requirements: list[str] = Field(default_factory=list, max_length=100)
    organizational_constraints: list[str] = Field(default_factory=list, max_length=100)
    assessed_at: datetime | None = None

    @field_validator(
        "comparison_cohort",
        "requirements",
        "organizational_constraints",
    )
    @classmethod
    def reject_blank_items(cls, values: list[str]) -> list[str]:
        if any(not value.strip() for value in values):
            raise ValueError("items must not be blank")
        return values


class AssessmentContextView(APIModel):
    """A canonical assessment context attached to a result card."""

    context_id: CanonicalIdentifier
    project_id: CanonicalIdentifier
    use_case: str
    comparison_cohort: list[str]
    requirements: list[str]
    organizational_constraints: list[str]
    assessed_at: str


class CatalogContextResponse(APIModel):
    """Declared context and freshness bounds for the loaded catalog."""

    catalog_id: str
    label: str
    cohort_description: str
    coverage: list[str]
    exclusions: list[str]
    card_count: int = Field(ge=0)
    schema_versions: list[str]
    ontology_versions: list[str]
    oldest_analyzed_at: str | None
    newest_analyzed_at: str | None


class SearchFilters(APIModel):
    """Structured filters; dimensions are ANDed and values within one are ORed."""

    categories: list[str] = Field(default_factory=list, max_length=100)
    capabilities: list[str] = Field(default_factory=list, max_length=100)
    languages: list[str] = Field(default_factory=list, max_length=100)
    licenses: list[str] = Field(default_factory=list, max_length=100)
    maturities: list[str] = Field(default_factory=list, max_length=100)
    architecture_layers: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("*")
    @classmethod
    def reject_blank_items(cls, values: list[str]) -> list[str]:
        if any(not value.strip() for value in values):
            raise ValueError("filter values must not be blank")
        return values


class SearchRequest(APIModel):
    """Deterministic catalog-search request."""

    text: str = Field(default="", max_length=2_000)
    filters: SearchFilters = Field(default_factory=SearchFilters)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    assessment_context: AssessmentContextInput | None = None


class MatchReason(APIModel):
    """Trace from one matched query/filter value to canonical card data."""

    kind: Literal["text", "synonym", "filter"]
    path: str
    matched_value: str
    terms: list[str]
    claim_ids: list[CanonicalIdentifier]
    evidence_ids: list[CanonicalIdentifier]
    capability_support_status: str | None = None
    evidence_status: str | None = None
    confidence: str | None = None
    field_state: Literal[
        "unknown",
        "not_applicable",
        "not_analyzed",
        "no_evidence_found",
    ] | None = None


class MatchClaim(APIModel):
    """Primary claim supporting the compact frontend match projection."""

    claim_id: CanonicalIdentifier
    verification_status: str
    confidence: str


class ProjectSearchResult(APIModel):
    """Compact, traceable projection of one canonical card."""

    id: CanonicalIdentifier
    name: str
    owner: str
    project_type: str
    role: str
    summary: str
    match_reason: str
    constraint: str
    languages: list[str]
    card_id: CanonicalIdentifier
    schema_version: str
    card_version: int
    canonical_primary_type: str
    analysis_depth: str
    boundary: str
    source_count: int
    revision: str
    analyzed_at: str
    analysis_age_days: int = Field(ge=0)
    source_snapshot: dict[str, Any]
    match_reasons: list[MatchReason]
    match_claim: MatchClaim | None


class RequirementView(APIModel):
    """A normalized requirement carried into the search projection."""

    id: str
    kind: Literal["must", "prefer", "avoid"] = "must"
    label: str


class SearchResponse(APIModel):
    """One deterministic page of catalog matches."""

    query: str
    assessment_contexts: list[AssessmentContextView]
    requirements: list[RequirementView]
    uninterpreted_terms: list[str]
    page: int
    page_size: int
    total: int
    projects: list[ProjectSearchResult]


class CardReference(APIModel):
    """A pinned immutable card reference."""

    project_id: CanonicalIdentifier
    card_version: int = Field(ge=1)


class EvidenceResponse(APIModel):
    """Evidence with its Claim, Source, snapshot revision, and safe locator."""

    project_id: CanonicalIdentifier
    card_id: CanonicalIdentifier
    card_version: int
    evidence: dict[str, Any]
    related_claims: list[dict[str, Any]]
    source: dict[str, Any]
    source_revision: dict[str, Any]
    locator: dict[str, Any]
    source_url: str | None


class ComparisonRequest(APIModel):
    """Compare two or three immutable cards under one explicit context."""

    cards: list[CardReference] = Field(min_length=2, max_length=3)
    assessment_context: AssessmentContextInput

    @field_validator("cards")
    @classmethod
    def cards_must_be_unique(cls, cards: list[CardReference]) -> list[CardReference]:
        keys = {
            (identifier_comparison_key(card.project_id), card.card_version)
            for card in cards
        }
        if len(keys) != len(cards):
            raise ValueError("card references must be unique")
        return cards


FieldState = Literal[
    "value",
    "unknown",
    "not_applicable",
    "not_analyzed",
    "no_evidence_found",
]


class ComparisonCell(APIModel):
    """One project value without collapsing explicit unavailable states."""

    state: FieldState
    value: Any | None = None
    capability_support_status: str | None = None
    evidence_status: str | None = None
    claim_verification_status: str | None = None
    confidence: str | None = None
    claim_ids: list[CanonicalIdentifier]
    evidence_ids: list[CanonicalIdentifier]
    project_id: CanonicalIdentifier
    card_version: int


class ComparisonRow(APIModel):
    """One schema-aligned comparison dimension."""

    id: str
    label: str
    group: Literal["Role and fit", "Material differences", "Prototype guidance"]
    cells: dict[CanonicalIdentifier, ComparisonCell]


class ComparedCard(APIModel):
    """Identity and Source Snapshot for a pinned comparison participant."""

    project_id: CanonicalIdentifier
    card_id: CanonicalIdentifier
    card_version: int
    name: str
    primary_type: str
    source_snapshot: dict[str, Any]


class RoleAnalysis(APIModel):
    """Explicit explanation of whether project roles are directly comparable."""

    compatibility: Literal["same_role", "complementary_roles", "different_roles"]
    explanation: str


class ComparisonResponse(APIModel):
    """Schema-aligned comparison with no aggregate score or winner."""

    assessment_context: AssessmentContextInput
    project_ids: list[CanonicalIdentifier]
    cards: list[ComparedCard]
    role_analysis: RoleAnalysis
    rows: list[ComparisonRow]
    shared_attribute_count: int = Field(ge=0)
