"""Validated, caller-supplied Rumble matchups and their evidence registries."""

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from agent_project_intelligence.models.rumble import (
    Confidence,
    NonEmptyString,
    RequirementAlignment,
    RumbleProjectionRequest,
    VerificationStatus,
)


def _reject_score_and_winner_fields(value: Any, location: str = "$") -> None:
    """Reject fields that could turn a matchup into a universal ranking."""
    if isinstance(value, dict):
        for key, nested_value in value.items():
            normalized_key = str(key).casefold()
            if "score" in normalized_key or "winner" in normalized_key:
                raise ValueError(
                    f"matchup field '{location}.{key}' is not allowed; "
                    "score and winner fields must be absent"
                )
            _reject_score_and_winner_fields(nested_value, f"{location}.{key}")
    elif isinstance(value, list):
        for index, nested_value in enumerate(value):
            _reject_score_and_winner_fields(nested_value, f"{location}[{index}]")


class PreparedRumbleModel(BaseModel):
    """Base model that keeps the supplied-matchup contract exact."""

    model_config = ConfigDict(extra="forbid")


class PreparedRumbleEvidence(PreparedRumbleModel):
    """A precisely located source fragment for a supplied matchup."""

    evidence_id: NonEmptyString
    repository: NonEmptyString
    revision: NonEmptyString
    path: NonEmptyString
    locator: NonEmptyString
    excerpt: NonEmptyString
    source_url: NonEmptyString


class PreparedRumbleClaim(PreparedRumbleModel):
    """A supplied claim and the evidence available for inspection."""

    claim_id: NonEmptyString
    project_id: NonEmptyString
    statement: NonEmptyString
    why_it_matters: NonEmptyString
    verification_status: VerificationStatus
    confidence: Confidence
    supporting_evidence: list[PreparedRumbleEvidence] = Field(default_factory=list)
    conflicting_evidence: list[PreparedRumbleEvidence] = Field(default_factory=list)

    @model_validator(mode="after")
    def reject_runtime_verification(self) -> "PreparedRumbleClaim":
        """Static-analysis matchups cannot represent runtime verification."""
        if self.verification_status is VerificationStatus.RUNTIME_VERIFIED:
            raise ValueError("supplied claims cannot be runtime_verified")
        return self

    @property
    def evidence(self) -> list[PreparedRumbleEvidence]:
        """Return supporting and conflicting evidence as one validation view."""
        return [*self.supporting_evidence, *self.conflicting_evidence]


class PreparedRumbleMatchup(PreparedRumbleModel):
    """One prepared matchup and the registry behind its material claims."""

    matchup_id: NonEmptyString
    display_label: NonEmptyString
    request: RumbleProjectionRequest
    claims: Annotated[list[PreparedRumbleClaim], Field(min_length=1)]

    @model_validator(mode="before")
    @classmethod
    def reject_scores_and_winners(cls, value: Any) -> Any:
        """Reject universal-ranking fields before parsing nested request data."""
        _reject_score_and_winner_fields(value)
        return value

    @model_validator(mode="after")
    def validate_referential_integrity(self) -> "PreparedRumbleMatchup":
        """Keep request findings tied to same-snapshot, same-project evidence."""
        claims_by_id = {claim.claim_id: claim for claim in self.claims}
        if len(claims_by_id) != len(self.claims):
            raise ValueError("claim_ids must be unique within a supplied matchup")

        entrants = self.request.entrants
        snapshots_by_project = {entrant.project_id: entrant.source_snapshot for entrant in entrants}
        evidence_ids: set[str] = set()

        for claim in self.claims:
            snapshot = snapshots_by_project.get(claim.project_id)
            if snapshot is None:
                raise ValueError(
                    f"claim '{claim.claim_id}' references project "
                    f"'{claim.project_id}', which is not a matchup entrant"
                )
            for evidence in claim.evidence:
                if evidence.evidence_id in evidence_ids:
                    raise ValueError(
                        "evidence_ids must be unique within a supplied matchup: "
                        f"'{evidence.evidence_id}'"
                    )
                evidence_ids.add(evidence.evidence_id)
                if evidence.revision != snapshot.revision:
                    raise ValueError(
                        f"evidence '{evidence.evidence_id}' revision must match "
                        f"the source snapshot for project '{claim.project_id}'"
                    )

        material_alignments = {
            RequirementAlignment.SATISFIES,
            RequirementAlignment.PARTIALLY_SATISFIES,
            RequirementAlignment.DOES_NOT_SATISFY,
        }
        for row in self.request.comparison_rows:
            cells = (
                ("entrant_a", entrants[0].project_id, row.entrant_a),
                ("entrant_b", entrants[1].project_id, row.entrant_b),
            )
            for side, project_id, cell in cells:
                if cell.verification_status is VerificationStatus.RUNTIME_VERIFIED:
                    raise ValueError(
                        f"supplied row '{row.label}' {side} cannot be runtime_verified"
                    )
                for claim_id in cell.claim_ids:
                    referenced_claim = claims_by_id.get(claim_id)
                    if referenced_claim is None:
                        raise ValueError(
                            f"claim reference '{claim_id}' in row '{row.label}' "
                            "does not resolve in the matchup claim registry"
                        )
                    if referenced_claim.project_id != project_id:
                        raise ValueError(
                            f"claim reference '{claim_id}' in row '{row.label}' "
                            f"must belong to project '{project_id}'"
                        )
                    if cell.alignment in material_alignments and not referenced_claim.evidence:
                        raise ValueError(f"material claim '{claim_id}' must have evidence")
        return self
