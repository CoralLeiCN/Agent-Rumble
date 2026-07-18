"""Typed models for the bundled Rumble Arena demonstration."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from agent_project_intelligence.models.rumble import (
    Confidence,
    NonEmptyString,
    RequirementAlignment,
    RumbleProjectionRequest,
    VerificationStatus,
)


class DemoModel(BaseModel):
    """Base model that keeps the committed fixture contract exact."""

    model_config = ConfigDict(extra="forbid")


class RumbleDemoEvidence(DemoModel):
    """A precisely located source fragment exposed by the demo."""

    evidence_id: NonEmptyString
    repository: NonEmptyString
    revision: NonEmptyString
    path: NonEmptyString
    locator: NonEmptyString
    excerpt: NonEmptyString
    source_url: NonEmptyString


class RumbleDemoClaim(DemoModel):
    """A fixture claim and the evidence available for inspection."""

    claim_id: NonEmptyString
    project_id: NonEmptyString
    statement: NonEmptyString
    why_it_matters: NonEmptyString
    verification_status: VerificationStatus
    confidence: Confidence
    supporting_evidence: list[RumbleDemoEvidence] = Field(default_factory=list)
    conflicting_evidence: list[RumbleDemoEvidence] = Field(default_factory=list)

    @model_validator(mode="after")
    def reject_runtime_verification(self) -> "RumbleDemoClaim":
        """The static-analysis demo cannot represent runtime verification."""
        if self.verification_status is VerificationStatus.RUNTIME_VERIFIED:
            raise ValueError("demo claims cannot be runtime_verified")
        return self

    @property
    def evidence(self) -> list[RumbleDemoEvidence]:
        """Return supporting and conflicting evidence as one validation view."""
        return [*self.supporting_evidence, *self.conflicting_evidence]


class RumbleDemoMatchup(DemoModel):
    """One prepared matchup and the registry behind its material claims."""

    matchup_id: NonEmptyString
    display_label: NonEmptyString
    request: RumbleProjectionRequest
    claims: Annotated[list[RumbleDemoClaim], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_referential_integrity(self) -> "RumbleDemoMatchup":
        """Keep request findings tied to same-snapshot, same-project evidence."""
        claims_by_id = {claim.claim_id: claim for claim in self.claims}
        if len(claims_by_id) != len(self.claims):
            raise ValueError("claim_ids must be unique within a demo matchup")

        entrants = self.request.entrants
        snapshots_by_project = {
            entrant.project_id: entrant.source_snapshot for entrant in entrants
        }
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
                        "evidence_ids must be unique within a demo matchup: "
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
                        f"demo row '{row.label}' {side} cannot be runtime_verified"
                    )
                for claim_id in cell.claim_ids:
                    claim = claims_by_id.get(claim_id)
                    if claim is None:
                        raise ValueError(
                            f"claim reference '{claim_id}' in row '{row.label}' "
                            "does not resolve in the matchup claim registry"
                        )
                    if claim.project_id != project_id:
                        raise ValueError(
                            f"claim reference '{claim_id}' in row '{row.label}' "
                            f"must belong to project '{project_id}'"
                        )
                    if (
                        cell.alignment in material_alignments
                        and not claim.evidence
                    ):
                        raise ValueError(
                            f"material claim '{claim_id}' must have evidence"
                        )
        return self


class RumbleDemoBundle(DemoModel):
    """A prepared, static-analysis-only bundle for the playable demo."""

    fixture_label: NonEmptyString
    prepared_at: datetime
    coverage_notice: NonEmptyString
    matchups: Annotated[list[RumbleDemoMatchup], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_matchup_ids(self) -> "RumbleDemoBundle":
        """Keep public matchup identifiers unambiguous."""
        matchup_ids = [matchup.matchup_id for matchup in self.matchups]
        if len(set(matchup_ids)) != len(matchup_ids):
            raise ValueError("matchup_ids must be unique within a demo bundle")
        return self
