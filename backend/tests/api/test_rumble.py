"""API tests for the Rumble Arena projection endpoint."""

from fastapi.testclient import TestClient

from agent_project_intelligence.main import create_app
from ..demo_bundle_payloads import demo_bundle_payload


def matchup_payload() -> dict:
    """Return the complete evidence registry required by the public endpoint."""
    return demo_bundle_payload()["matchups"][0]


def test_create_rumble_projection() -> None:
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=matchup_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "rumble_arena"
    assert body["overall_result"] == "no_universal_winner"
    assert [round_["verdict"] for round_ in body["rounds"]] == [
        "entrant_a_advantage",
        "trade_off",
        "inconclusive",
    ]
    assert body["entrants"][0]["source_snapshot"]["revision"] == "a1b2c3d4"


def test_rejects_material_alignment_without_claim_evidence() -> None:
    payload = matchup_payload()
    payload["request"]["comparison_rows"][0]["entrant_a"]["claim_ids"] = []

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "requires at least one claim_id" in response.text


def test_rejects_a_context_cohort_that_does_not_match_the_entrants() -> None:
    payload = matchup_payload()
    payload["request"]["assessment_context"]["cohort_project_ids"] = [
        "project-a",
        "project-c",
    ]

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "must match the two entrants" in response.text


def test_rejects_an_invented_claim_id_before_projection() -> None:
    payload = matchup_payload()
    payload["request"]["comparison_rows"][0]["entrant_a"]["claim_ids"] = [
        "invented-claim"
    ]

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "does not resolve in the matchup claim registry" in response.text


def test_rejects_an_invented_claim_id_on_an_inconclusive_cell() -> None:
    payload = matchup_payload()
    payload["request"]["comparison_rows"][2]["entrant_a"]["claim_ids"] = [
        "invented-claim"
    ]

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "does not resolve in the matchup claim registry" in response.text


def test_rumble_endpoint_is_in_openapi_schema() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/api/v1/rumble"]["post"]
    assert operation["tags"] == ["catalog"]
    request_schema = operation["requestBody"]["content"]["application/json"]["schema"]
    assert request_schema["$ref"].endswith("/RumbleDemoMatchup")
    assert operation["responses"]["200"]["content"]["application/json"]
