"""The documented HTTP contract must describe actual errors and cache responses."""

import pytest
from agent_project_intelligence.api.errors import ErrorEnvelope
from agent_project_intelligence.api.identifier_references import encode_identifier_reference
from agent_project_intelligence.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as client:
        yield client


@pytest.mark.parametrize(
    ("method", "path", "payload", "operation", "status"),
    [
        (
            "POST",
            "/generation",
            {"repository_url": "file:///tmp/source", "project_boundary": "source"},
            "/generation",
            422,
        ),
        ("GET", "/generation/invalid-id", None, "/generation/{generation_id}", 422),
        (
            "GET",
            "/generation/00000000-0000-0000-0000-000000000000",
            None,
            "/generation/{generation_id}",
            404,
        ),
        (
            "POST",
            "/generation/invalid-id/refresh",
            None,
            "/generation/{generation_id}/refresh",
            422,
        ),
        ("POST", "/rumble", {}, "/rumble", 422),
        ("POST", "/catalog/compare", {}, "/catalog/compare", 422),
        ("POST", "/catalog/search", {"page": 0}, "/catalog/search", 422),
    ],
)
def test_openapi_errors_match_runtime_envelopes(client, method, path, payload, operation, status):
    response = client.request(method, f"/api/v1{path}", json=payload)
    assert response.status_code == status
    ErrorEnvelope.model_validate(response.json())
    documented = client.get("/openapi.json").json()["paths"][f"/api/v1{operation}"][method.lower()]
    assert documented["responses"][str(status)]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorEnvelope"
    }


def test_generation_documents_expected_failure_statuses(client):
    paths = client.get("/openapi.json").json()["paths"]
    for path in ("/api/v1/generation", "/api/v1/generation/{generation_id}/refresh"):
        responses = paths[path]["post"]["responses"]
        for status in (409, 422, 499, 500, 502, 503, 504):
            assert responses[str(status)]["content"]["application/json"]["schema"] == {
                "$ref": "#/components/schemas/ErrorEnvelope"
            }


def test_cross_origin_conditional_retrieval_and_documented_cache_contract(client):
    project = client.post("/api/v1/catalog/search", json={}).json()["projects"][0]
    reference = encode_identifier_reference(project["id"])
    origin = "http://localhost:5173"
    path = f"/api/v1/projects/{reference}/cards/current"
    preflight = client.options(
        path,
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "If-None-Match",
        },
    )
    assert preflight.status_code == 200
    original = client.get(path, headers={"Origin": origin})
    assert "etag" in original.headers["access-control-expose-headers"].lower()
    unchanged = client.get(
        path, headers={"Origin": origin, "If-None-Match": original.headers["etag"]}
    )
    assert unchanged.status_code == 304 and not unchanged.content
    assert unchanged.headers["etag"] == original.headers["etag"]
    assert unchanged.headers["access-control-allow-origin"] == origin
    paths = client.get("/openapi.json").json()["paths"]
    for operation, methods in paths.items():
        if operation.startswith("/api/v1/projects/"):
            for status in ("200", "304"):
                assert set(methods["get"]["responses"][status]["headers"]) == {
                    "ETag",
                    "Cache-Control",
                }
            assert "content" not in methods["get"]["responses"]["304"]
