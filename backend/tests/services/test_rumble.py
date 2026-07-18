"""Tests for the deterministic Rumble Arena projection service."""

from agent_project_intelligence.models.rumble import (
    RoleRelationship,
    RoundVerdict,
    RumbleProjectionRequest,
)
from agent_project_intelligence.services.rumble import project_rumble
from ..rumble_payloads import rumble_payload


def test_projects_contextual_rounds_without_an_overall_winner() -> None:
    request = RumbleProjectionRequest.model_validate(rumble_payload())

    response = project_rumble(request)

    assert response.mode == "rumble_arena"
    assert response.overall_result == "no_universal_winner"
    assert "No universal winner" in response.ring_call
    assert [round_.verdict for round_ in response.rounds] == [
        RoundVerdict.ENTRANT_A_ADVANTAGE,
        RoundVerdict.TRADE_OFF,
        RoundVerdict.INCONCLUSIVE,
    ]
    assert response.rounds[0].title == "Round 1: Capability Clash"
    assert response.rounds[0].entrant_a.claim_ids == ["claim-a-approval"]


def test_absence_of_evidence_is_not_scored_as_a_loss() -> None:
    request = RumbleProjectionRequest.model_validate(rumble_payload())

    response = project_rumble(request)

    trace_round = response.rounds[2]
    assert trace_round.verdict is RoundVerdict.INCONCLUSIVE
    assert trace_round.entrant_a.state == "no_evidence_found"
    assert "do not justify" in trace_round.callout


def test_different_project_roles_are_explained() -> None:
    payload = rumble_payload()
    payload["entrants"][1]["project_roles"] = ["observability_component"]
    request = RumbleProjectionRequest.model_validate(payload)

    response = project_rumble(request)

    assert response.role_relationship is RoleRelationship.DIFFERENT
    assert "not proof that one replaces the other" in response.role_notice
