"""Tests for the service health endpoint."""

from fastapi.testclient import TestClient

from agent_project_intelligence.main import create_app


def test_health_check() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_check_is_in_openapi_schema() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/health" in response.json()["paths"]
