"""API tests for the Rumble Arena projection endpoint."""

from agent_project_intelligence.main import create_app
from fastapi.testclient import TestClient

from ..rumble_matchup_payloads import rumble_matchup_payload


def test_create_rumble_projection() -> None:
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=rumble_matchup_payload())

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
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][0]["entrant_a"]["claim_ids"] = []

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "requires at least one claim_id" in response.text


def test_rejects_a_context_cohort_that_does_not_match_the_entrants() -> None:
    payload = rumble_matchup_payload()
    payload["request"]["assessment_context"]["cohort_project_ids"] = [
        "project-a",
        "project-c",
    ]

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "must match the two entrants" in response.text


def test_rejects_an_invented_claim_id_before_projection() -> None:
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][0]["entrant_a"]["claim_ids"] = ["invented-claim"]

    with TestClient(create_app()) as client:
        response = client.post("/api/v1/rumble", json=payload)

    assert response.status_code == 422
    assert "does not resolve in the matchup claim registry" in response.text


def test_rejects_an_invented_claim_id_on_an_inconclusive_cell() -> None:
    payload = rumble_matchup_payload()
    payload["request"]["comparison_rows"][2]["entrant_a"]["claim_ids"] = ["invented-claim"]

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
    assert request_schema["$ref"].endswith("/PreparedRumbleMatchup")
    assert operation["responses"]["200"]["content"]["application/json"]


def test_demo_endpoint_is_not_served_or_documented() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/rumble/demo")
        schema = client.get("/openapi.json").json()

    assert response.status_code == 404
    assert "/api/v1/rumble/demo" not in schema["paths"]
    assert "RumbleDemoBundle" not in schema["components"]["schemas"]


def test_openapi_contract_exposes_nested_claim_and_evidence_fields() -> None:
    with TestClient(create_app()) as client:
        schema = client.get("/openapi.json").json()

    components = schema["components"]["schemas"]
    matchup_fields = components["PreparedRumbleMatchup"]["properties"]
    claim_fields = components["PreparedRumbleClaim"]["properties"]
    evidence_fields = components["PreparedRumbleEvidence"]["properties"]

    assert set(matchup_fields) == {"matchup_id", "display_label", "request", "claims"}
    assert {"supporting_evidence", "conflicting_evidence"} <= set(claim_fields)
    assert set(evidence_fields) == {
        "evidence_id",
        "repository",
        "revision",
        "path",
        "locator",
        "excerpt",
        "source_url",
    }
