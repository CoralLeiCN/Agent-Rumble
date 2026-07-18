"""Tests for loading and validating the prepared Rumble demo."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from agent_project_intelligence.services.rumble_demo import (
    load_demo_bundle,
    parse_demo_bundle,
)
from ..demo_bundle_payloads import demo_bundle_payload


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]


def test_loads_a_bundle_from_an_injected_fixture_path(tmp_path) -> None:
    fixture_path = tmp_path / "demo_bundle.json"
    fixture_path.write_text(json.dumps(demo_bundle_payload()), encoding="utf-8")

    bundle = load_demo_bundle(fixture_path)

    assert bundle.fixture_label == "Two-project static-analysis demo"
    assert bundle.matchups[0].request.entrants[0].project_id == "project-a"
    assert bundle.matchups[0].claims[0].supporting_evidence[0].revision == "a1b2c3d4"


def test_frontend_fallback_matches_the_validated_backend_bundle() -> None:
    backend_fixture = json.loads(
        (REPOSITORY_ROOT / "fixtures" / "rumble" / "demo_bundle.json").read_text()
    )
    frontend_fixture = json.loads(
        (
            REPOSITORY_ROOT
            / "frontend"
            / "src"
            / "data"
            / "rumbleDemoBundle.json"
        ).read_text()
    )

    assert frontend_fixture == backend_fixture


def test_rejects_a_matchup_request_that_is_not_a_rumble_projection() -> None:
    payload = demo_bundle_payload()
    del payload["matchups"][0]["request"]["assessment_context"]

    with pytest.raises(ValidationError, match="assessment_context"):
        parse_demo_bundle(payload)


def test_rejects_an_unresolved_material_claim() -> None:
    payload = demo_bundle_payload()
    payload["matchups"][0]["request"]["comparison_rows"][0]["entrant_a"][
        "claim_ids"
    ] = ["missing-claim"]

    with pytest.raises(ValidationError, match="does not resolve"):
        parse_demo_bundle(payload)


def test_rejects_an_unresolved_claim_on_an_inconclusive_cell() -> None:
    payload = demo_bundle_payload()
    payload["matchups"][0]["request"]["comparison_rows"][2]["entrant_a"][
        "claim_ids"
    ] = ["missing-claim"]

    with pytest.raises(ValidationError, match="does not resolve"):
        parse_demo_bundle(payload)


def test_rejects_a_material_claim_from_the_other_project() -> None:
    payload = demo_bundle_payload()
    payload["matchups"][0]["request"]["comparison_rows"][0]["entrant_a"][
        "claim_ids"
    ] = ["claim-b-approval"]

    with pytest.raises(ValidationError, match="must belong to project 'project-a'"):
        parse_demo_bundle(payload)


def test_rejects_evidence_from_a_different_revision() -> None:
    payload = demo_bundle_payload()
    payload["matchups"][0]["claims"][0]["supporting_evidence"][0][
        "revision"
    ] = "different-revision"

    with pytest.raises(ValidationError, match="revision must match"):
        parse_demo_bundle(payload)


def test_rejects_a_material_claim_without_evidence() -> None:
    payload = demo_bundle_payload()
    payload["matchups"][0]["claims"][0]["supporting_evidence"] = []

    with pytest.raises(ValidationError, match="must have evidence"):
        parse_demo_bundle(payload)


@pytest.mark.parametrize("location", ["claim", "row"])
def test_rejects_runtime_verified_demo_values(location: str) -> None:
    payload = demo_bundle_payload()
    if location == "claim":
        payload["matchups"][0]["claims"][0][
            "verification_status"
        ] = "runtime_verified"
    else:
        payload["matchups"][0]["request"]["comparison_rows"][0]["entrant_a"][
            "verification_status"
        ] = "runtime_verified"

    with pytest.raises(ValidationError, match="cannot be runtime_verified"):
        parse_demo_bundle(payload)


@pytest.mark.parametrize("field_name", ["overall_score", "winner"])
def test_rejects_score_or_winner_fields_recursively(field_name: str) -> None:
    payload = demo_bundle_payload()
    payload["matchups"][0][field_name] = "project-a"

    with pytest.raises(ValueError, match="score and winner fields must be absent"):
        parse_demo_bundle(payload)
