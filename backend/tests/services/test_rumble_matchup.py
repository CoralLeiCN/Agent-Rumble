"""Contract tests for caller-supplied Rumble matchups."""

import pytest
from agent_project_intelligence.models.rumble_matchup import PreparedRumbleMatchup
from pydantic import ValidationError

from ..rumble_matchup_payloads import rumble_matchup_payload


def test_accepts_a_complete_synthetic_matchup() -> None:
    matchup = PreparedRumbleMatchup.model_validate(rumble_matchup_payload())

    assert matchup.matchup_id == "project-a-vs-project-b"
    assert matchup.request.entrants[0].project_id == "project-a"
    assert matchup.claims[0].supporting_evidence[0].revision == "a1b2c3d4"


def test_rejects_a_matchup_request_that_is_not_a_rumble_projection() -> None:
    payload = rumble_matchup_payload()
    del payload["request"]["assessment_context"]

    with pytest.raises(ValidationError, match="assessment_context"):
        PreparedRumbleMatchup.model_validate(payload)


def test_rejects_an_unresolved_material_claim() -> None:
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][0]["entrant_a"]["claim_ids"] = ["missing-claim"]

    with pytest.raises(ValidationError, match="does not resolve"):
        PreparedRumbleMatchup.model_validate(payload)


def test_rejects_an_unresolved_claim_on_an_inconclusive_cell() -> None:
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][2]["entrant_a"]["claim_ids"] = ["missing-claim"]

    with pytest.raises(ValidationError, match="does not resolve"):
        PreparedRumbleMatchup.model_validate(payload)


def test_rejects_a_material_claim_from_the_other_project() -> None:
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][0]["entrant_a"]["claim_ids"] = ["claim-b-approval"]

    with pytest.raises(ValidationError, match="must belong to project 'project-a'"):
        PreparedRumbleMatchup.model_validate(payload)


def test_rejects_evidence_from_a_different_revision() -> None:
    payload = rumble_matchup_payload()
    payload["claims"][0]["supporting_evidence"][0]["revision"] = "different-revision"

    with pytest.raises(ValidationError, match="revision must match"):
        PreparedRumbleMatchup.model_validate(payload)


def test_rejects_a_material_claim_without_evidence() -> None:
    payload = rumble_matchup_payload()
    payload["claims"][0]["supporting_evidence"] = []

    with pytest.raises(ValidationError, match="must have evidence"):
        PreparedRumbleMatchup.model_validate(payload)


@pytest.mark.parametrize("location", ["claim", "row"])
def test_rejects_runtime_verified_matchup_values(location: str) -> None:
    payload = rumble_matchup_payload()
    if location == "claim":
        payload["claims"][0]["verification_status"] = "runtime_verified"
    else:
        payload["request"]["comparison_rows"][0]["entrant_a"]["verification_status"] = (
            "runtime_verified"
        )

    with pytest.raises(ValidationError, match="cannot be runtime_verified"):
        PreparedRumbleMatchup.model_validate(payload)


@pytest.mark.parametrize("field_name", ["overall_score", "winner"])
def test_rejects_score_or_winner_fields_recursively(field_name: str) -> None:
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][0][field_name] = "project-a"

    with pytest.raises(ValueError, match="score and winner fields must be absent"):
        PreparedRumbleMatchup.model_validate(payload)
