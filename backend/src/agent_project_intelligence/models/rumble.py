"""Typed models for the Rumble Arena comparison projection."""

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator


NonEmptyString = Annotated[str, Field(min_length=1)]


class ComparisonState(StrEnum):
    """Whether a comparison cell contains a value or an exact non-value."""

    VALUE = "value"
    UNKNOWN = "unknown"
    NOT_APPLICABLE = "not_applicable"
    NOT_ANALYZED = "not_analyzed"
    NO_EVIDENCE_FOUND = "no_evidence_found"


class RequirementAlignment(StrEnum):
    """Contextual fit of a finding against the round requirement."""

    SATISFIES = "satisfies"
    PARTIALLY_SATISFIES = "partially_satisfies"
    DOES_NOT_SATISFY = "does_not_satisfy"
    UNCLEAR = "unclear"
    NOT_APPLICABLE = "not_applicable"


class VerificationStatus(StrEnum):
    """Verification status carried through from an Agent Project Card claim."""

    DOCUMENTED = "documented"
    STATICALLY_CONFIRMED = "statically_confirmed"
    RUNTIME_VERIFIED = "runtime_verified"
    UNVERIFIED = "unverified"
    CONFLICTED = "conflicted"


class Confidence(StrEnum):
    """Confidence carried through from an Agent Project Card claim."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class RoundVerdict(StrEnum):
    """A contextual result for one round, never an overall project verdict."""

    ENTRANT_A_ADVANTAGE = "entrant_a_advantage"
    ENTRANT_B_ADVANTAGE = "entrant_b_advantage"
    TRADE_OFF = "trade_off"
    INCONCLUSIVE = "inconclusive"


class RoleRelationship(StrEnum):
    """Whether the entrants share a role in the stated comparison."""

    OVERLAPPING = "overlapping"
    DIFFERENT = "different"


class SourceSnapshot(BaseModel):
    """The analyzed source snapshot represented by an entrant."""

    card_id: NonEmptyString
    card_version: Annotated[int, Field(ge=1)]
    revision: NonEmptyString
    analyzed_at: datetime


class RumbleEntrant(BaseModel):
    """A catalog project entering a Rumble Arena comparison."""

    project_id: NonEmptyString
    project_name: NonEmptyString
    project_roles: Annotated[list[NonEmptyString], Field(min_length=1)]
    source_snapshot: SourceSnapshot


class AssessmentContext(BaseModel):
    """The explicit context against which round advantages are assessed."""

    title: NonEmptyString
    use_case: NonEmptyString
    cohort_project_ids: Annotated[list[NonEmptyString], Field(min_length=2, max_length=2)]
    requirements: Annotated[list[NonEmptyString], Field(min_length=1)]
    organizational_constraints: list[NonEmptyString] = Field(default_factory=list)
    assessed_at: date


class RumbleCell(BaseModel):
    """One entrant's evidence-backed finding for a round."""

    state: ComparisonState
    value: NonEmptyString | None = None
    alignment: RequirementAlignment
    verification_status: VerificationStatus
    confidence: Confidence
    claim_ids: list[NonEmptyString] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_value_and_evidence(self) -> "RumbleCell":
        """Keep exact non-values distinct and advantages linked to claims."""
        if self.state is ComparisonState.VALUE and self.value is None:
            raise ValueError("value is required when state is 'value'")
        if self.state is not ComparisonState.VALUE and self.value is not None:
            raise ValueError("value must be omitted for a non-value state")

        material_alignments = {
            RequirementAlignment.SATISFIES,
            RequirementAlignment.PARTIALLY_SATISFIES,
            RequirementAlignment.DOES_NOT_SATISFY,
        }
        if self.alignment in material_alignments:
            if self.state is not ComparisonState.VALUE:
                raise ValueError("a material alignment requires a value")
            if not self.claim_ids:
                raise ValueError("a material alignment requires at least one claim_id")

        if self.state is not ComparisonState.VALUE and self.alignment not in {
            RequirementAlignment.UNCLEAR,
            RequirementAlignment.NOT_APPLICABLE,
        }:
            raise ValueError("a non-value state must have unclear or not_applicable alignment")
        return self


class RumbleRoundInput(BaseModel):
    """One comparison row to turn into a themed arena round."""

    dimension: NonEmptyString
    label: NonEmptyString
    requirement: NonEmptyString
    entrant_a: RumbleCell
    entrant_b: RumbleCell


class RumbleProjectionRequest(BaseModel):
    """An evidence-backed two-project comparison ready for arena projection."""

    assessment_context: AssessmentContext
    entrants: Annotated[list[RumbleEntrant], Field(min_length=2, max_length=2)]
    comparison_rows: Annotated[list[RumbleRoundInput], Field(min_length=1, max_length=12)]

    @model_validator(mode="after")
    def validate_entrants_and_cohort(self) -> "RumbleProjectionRequest":
        """Require two distinct projects and an exact context cohort."""
        entrant_ids = [entrant.project_id for entrant in self.entrants]
        if len(set(entrant_ids)) != 2:
            raise ValueError("entrants must contain two distinct project_ids")
        if set(self.assessment_context.cohort_project_ids) != set(entrant_ids):
            raise ValueError("cohort_project_ids must match the two entrants")
        return self


class RumbleRound(BaseModel):
    """A rendered Rumble Arena round."""

    round_number: Annotated[int, Field(ge=1)]
    round_id: NonEmptyString
    title: NonEmptyString
    dimension: NonEmptyString
    label: NonEmptyString
    requirement: NonEmptyString
    verdict: RoundVerdict
    callout: NonEmptyString
    entrant_a: RumbleCell
    entrant_b: RumbleCell


class RumbleProjectionResponse(BaseModel):
    """The complete no-score arena projection."""

    mode: Literal["rumble_arena"] = "rumble_arena"
    assessment_context: AssessmentContext
    entrants: list[RumbleEntrant]
    role_relationship: RoleRelationship
    role_notice: NonEmptyString
    rounds: list[RumbleRound]
    overall_result: Literal["no_universal_winner"] = "no_universal_winner"
    ring_call: NonEmptyString

