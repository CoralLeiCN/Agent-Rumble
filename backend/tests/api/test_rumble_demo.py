"""API tests for the prepared Rumble demo endpoint."""

from fastapi.testclient import TestClient

from agent_project_intelligence.api.routes.rumble import provide_demo_bundle
from agent_project_intelligence.main import create_app
from agent_project_intelligence.services.rumble_demo import parse_demo_bundle
from ..demo_bundle_payloads import demo_bundle_payload


def test_returns_an_injected_validated_demo_bundle() -> None:
    application = create_app()
    application.dependency_overrides[provide_demo_bundle] = lambda: parse_demo_bundle(
        demo_bundle_payload()
    )

    with TestClient(application) as client:
        response = client.get("/api/v1/rumble/demo")

    assert response.status_code == 200
    body = response.json()
    assert body["fixture_label"] == "Two-project static-analysis demo"
    assert body["matchups"][0]["matchup_id"] == "project-a-vs-project-b"
    assert body["matchups"][0]["request"]["comparison_rows"][0][
        "entrant_a"
    ]["claim_ids"] == ["claim-a-approval"]
    serialized_keys = repr(body).casefold()
    assert "overall_score" not in serialized_keys
    assert "winner" not in serialized_keys


def test_returns_the_committed_real_project_matchup() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/rumble/demo")

    assert response.status_code == 200
    matchup = response.json()["matchups"][0]
    assert matchup["matchup_id"] == "openai-agents-sdk-vs-langgraph-support-poc"
    assert [
        entrant["project_id"] for entrant in matchup["request"]["entrants"]
    ] == ["openai-agents-sdk", "langgraph"]
    assert len(matchup["request"]["comparison_rows"]) == 3


def test_demo_endpoint_is_in_openapi_schema_with_typed_response() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    operation = response.json()["paths"]["/api/v1/rumble/demo"]["get"]
    assert operation["tags"] == ["catalog"]
    response_schema = operation["responses"]["200"]["content"][
        "application/json"
    ]["schema"]
    assert response_schema["$ref"].endswith("/RumbleDemoBundle")


def test_openapi_contract_exposes_nested_claim_and_evidence_fields() -> None:
    with TestClient(create_app()) as client:
        schema = client.get("/openapi.json").json()

    components = schema["components"]["schemas"]
    bundle_fields = components["RumbleDemoBundle"]["properties"]
    matchup_fields = components["RumbleDemoMatchup"]["properties"]
    claim_fields = components["RumbleDemoClaim"]["properties"]
    evidence_fields = components["RumbleDemoEvidence"]["properties"]

    assert set(bundle_fields) == {
        "fixture_label",
        "prepared_at",
        "coverage_notice",
        "matchups",
    }
    assert set(matchup_fields) == {"matchup_id", "display_label", "request", "claims"}
    assert {"supporting_evidence", "conflicting_evidence"} <= set(claim_fields)
    assert {
        "evidence_id",
        "repository",
        "revision",
        "path",
        "locator",
        "excerpt",
        "source_url",
    } == set(evidence_fields)
