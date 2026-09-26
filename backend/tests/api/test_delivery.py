"""Canonical comparisons, cache validation, and durable generation workflows."""

import asyncio
import copy
import errno
import json
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock
from urllib.error import HTTPError, URLError
from uuid import UUID

import pytest
import yaml
from agent_project_intelligence.analysis.acquisition import github_repository
from agent_project_intelligence.analysis.models import ProjectCardGenerationResult
from agent_project_intelligence.api.identifier_references import encode_identifier_reference
from agent_project_intelligence.catalog.publication import CardPublisher
from agent_project_intelligence.config import Settings
from agent_project_intelligence.main import create_app
from agent_project_intelligence.services import generation as generation_module
from agent_project_intelligence.services.catalog import CatalogService
from fastapi.testclient import TestClient


def setup_catalog(tmp_path):
    root = tmp_path / "catalog"
    root.mkdir()
    source = Path(__file__).parents[3] / "catalog/cards"
    cards = [
        yaml.safe_load(path.read_text())
        for path in sorted(source.glob("*/versions/1/project-card.yaml"))[:3]
    ]
    for card in cards:
        CardPublisher(root).publish(card)
    settings = Settings(catalog_root=root, generated_cards_root=tmp_path / "drafts")
    return create_app(settings=settings), cards, settings


def test_rumble_uses_same_pinned_cells_and_evidence_as_comparison(tmp_path):
    app, cards, _ = setup_catalog(tmp_path)
    client = TestClient(app)
    payload = {
        "cards": [
            {"project_id": card["project"]["project_id"], "card_version": 1} for card in cards[:2]
        ],
        "assessment_context": {
            "use_case": "A new context",
            "requirements": ["Python"],
            "preferences": ["Local tools"],
            "exclusions": ["Hosted control plane"],
        },
    }
    comparison = client.post("/api/v1/catalog/compare", json=payload).json()
    response = client.post("/api/v1/catalog/rumble", json=payload)
    assert response.status_code == 200, response.text
    body = response.json()
    assert [item["source_snapshot"]["card_id"] for item in body["projection"]["entrants"]] == [
        card["card_id"] for card in cards[:2]
    ]
    for row in body["projection"]["rounds"]:
        original = next(item for item in comparison["rows"] if item["id"] == row["dimension"])
        for side, card in zip(("entrant_a", "entrant_b"), cards, strict=False):
            assert row[side]["state"] == original["cells"][card["project"]["project_id"]]["state"]
        assert row["verdict"] == "inconclusive"
    assert body["projection"]["rounds"][0]["entrant_a"]["state"] == "not_analyzed"
    ids = [claim["claim_id"] for claim in body["matchup"]["claims"]]
    assert len(ids) == len(set(ids))
    payload["cards"].append({"project_id": cards[2]["project"]["project_id"], "card_version": 1})
    assert client.post("/api/v1/catalog/rumble", json=payload).status_code == 422


def test_cache_and_manual_catalog_refresh(tmp_path):
    app, cards, settings = setup_catalog(tmp_path)
    client = TestClient(app)
    path = f"/api/v1/projects/{encode_identifier_reference(cards[0]['project']['project_id'])}/cards/current"
    original = client.get(path)
    assert client.get(path, headers={"If-None-Match": original.headers["etag"]}).status_code == 304
    changed = copy.deepcopy(cards[0])
    changed["summary"]["one_line"] += " Refreshed."
    CardPublisher(settings.catalog_root).publish(changed)
    assert client.get(path).json()["card_version"] == 1
    assert client.post("/api/v1/catalog/refresh").status_code == 200
    refreshed = client.get(path, headers={"If-None-Match": original.headers["etag"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["card_version"] == 2
    assert client.get(path.replace("current", "1")).json() == cards[0]
    (settings.catalog_root / "project-card.yaml").write_text("invalid")
    assert client.post("/api/v1/catalog/refresh").status_code == 422
    assert client.get(path).json()["card_version"] == 2


def test_generation_refresh_storage_and_explicit_publication(tmp_path, monkeypatch):
    app, cards, settings = setup_catalog(tmp_path)
    card = copy.deepcopy(cards[0])
    card["summary"]["one_line"] += " Generated refresh."
    service = app.state.generation_service

    @asynccontextmanager
    async def acquire(url, revision):
        yield tmp_path

    monkeypatch.setattr(generation_module, "acquire_repository", acquire)
    result = ProjectCardGenerationResult(
        status="succeeded",
        card=card,
        card_id=card["card_id"],
        card_version=1,
        schema_version=card["schema_version"],
        analysis_configuration=service.harness.analysis_configuration,
    )
    monkeypatch.setattr(service.harness, "generate", AsyncMock(return_value=result))
    client = TestClient(app)
    request = {
        "repository_url": card["project"]["repositories"][0]["url"],
        "project_boundary": card["project"]["boundary"],
    }
    response = client.post("/api/v1/generation", json=request)
    assert response.status_code == 201, response.text
    draft = response.json()
    assert draft["published"] is False and draft["card"]["card_version"] == 2
    assert client.get(f"/api/v1/generation/{draft['generation_id']}").json() == draft
    restarted = TestClient(create_app(settings=settings))
    assert restarted.get(f"/api/v1/generation/{draft['generation_id']}").json() == draft
    assert not list(settings.catalog_root.glob("*/versions/2/*"))
    refresh = client.post(f"/api/v1/generation/{draft['generation_id']}/refresh")
    assert refresh.status_code == 201, refresh.text
    assert refresh.json()["card"]["card_id"] == draft["card"]["card_id"]
    assert refresh.json()["generation_id"] != draft["generation_id"]
    published, _ = CardPublisher(settings.catalog_root).publish(draft["card"], assign_version=False)
    assert yaml.safe_load(published.read_text()) == draft["card"]


@pytest.mark.parametrize(
    "url",
    [
        "http://github.com/a/b",
        "https://github.com.evil/a/b",
        "https://user@github.com/a/b",
        "https://github.com/a/b?token=secret",
        "https://github.com/a/..",
        "https://github.com/a/b/tree/main",
        "https://github.com/a%2fb/c",
        "file:///etc/passwd",
    ],
)
def test_intake_rejects_unsafe_urls(url):
    with pytest.raises(ValueError):
        github_repository(url)


def test_generation_failure_and_busy_responses_do_not_publish(tmp_path, monkeypatch):
    app, cards, settings = setup_catalog(tmp_path)

    @asynccontextmanager
    async def acquire(url, revision):
        raise ValueError("private repository")
        yield tmp_path

    monkeypatch.setattr(generation_module, "acquire_repository", acquire)
    client = TestClient(app)
    request = {
        "repository_url": "https://github.com/owner/repo",
        "project_boundary": "whole project",
    }
    response = client.post("/api/v1/generation", json=request)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "generation_failed"
    assert not settings.generated_cards_root.exists()


@pytest.mark.parametrize("reuse_identity", [False, True])
def test_generation_keeps_different_repository_boundaries_separate(
    tmp_path, monkeypatch, reuse_identity
):
    app, cards, settings = setup_catalog(tmp_path)
    service = app.state.generation_service
    component = copy.deepcopy(cards[0])
    component["project"]["boundary"] = "Only the parser component, excluding the application."
    if not reuse_identity:
        component["card_id"] = "card-parser-component"
        component["project"]["project_id"] = "parser-component"
    monkeypatch.setattr(service, "_analyze", AsyncMock(return_value=component))
    response = TestClient(app).post(
        "/api/v1/generation",
        json={
            "repository_url": component["project"]["repositories"][0]["url"],
            "project_boundary": component["project"]["boundary"],
        },
    )
    if reuse_identity:
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "generation_identity_conflict"
        assert not list(settings.generated_cards_root.rglob("project-card.yaml"))
    else:
        assert response.status_code == 201, response.text
        stored = response.json()["card"]
        assert stored["project"]["project_id"] == "parser-component"
        assert stored["card_id"] == "card-parser-component" and stored["card_version"] == 1
    assert not list(settings.catalog_root.glob("*/versions/2/*"))


def test_generation_reuses_authoritative_requested_boundary(tmp_path, monkeypatch):
    app, cards, _ = setup_catalog(tmp_path)
    service = app.state.generation_service
    card = copy.deepcopy(cards[0])
    boundary = "SDK only; exclude separately released tools."
    card["project"]["boundary"] = "The SDK package, excluding separately released tools."
    card["card_id"] = "card-sdk-only"
    card["project"]["project_id"] = "sdk-only"
    card["source_snapshot"]["analysis_configuration"]["analysis_request"] = {
        "project_boundary": boundary
    }
    monkeypatch.setattr(service, "_analyze", AsyncMock(return_value=card))
    client = TestClient(app)
    payload = {
        "repository_url": card["project"]["repositories"][0]["url"],
        "project_boundary": boundary,
    }
    first = client.post("/api/v1/generation", json=payload)
    assert first.status_code == 201, first.text
    card["summary"]["one_line"] += " Updated."
    card["card_id"] = "analyzer-proposed-new-card"
    card["project"]["project_id"] = "analyzer-proposed-new-project"
    second = client.post("/api/v1/generation", json=payload)
    assert second.status_code == 201, second.text
    assert second.json()["card"]["project"]["project_id"] == "sdk-only"
    assert second.json()["card"]["card_version"] == 2


def test_generation_disk_failure_is_a_server_error(tmp_path, monkeypatch):
    app, cards, _ = setup_catalog(tmp_path)
    service = app.state.generation_service
    monkeypatch.setattr(service, "_analyze", AsyncMock(return_value=cards[0]))

    def full_disk(*args):
        raise OSError(errno.ENOSPC, "No space left on device")

    monkeypatch.setattr(service, "_persist", full_disk)
    response = TestClient(app).post(
        "/api/v1/generation",
        json={
            "repository_url": "https://github.com/owner/repository",
            "project_boundary": "SDK",
        },
    )
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "generation_storage_failed"
    assert not service._lock.locked()


@pytest.mark.parametrize(
    ("failure", "status", "code"),
    [
        (HTTPError("https://api.github.com", 404, "Not found", {}, None), 422, "generation_failed"),
        (
            HTTPError("https://api.github.com", 429, "Rate limited", {}, None),
            502,
            "repository_unavailable",
        ),
        (URLError("Offline"), 502, "repository_unavailable"),
        (TimeoutError(), 504, "generation_timeout"),
        (OSError(errno.ENOSPC, "Disk full"), 500, "generation_acquisition_failed"),
    ],
)
def test_acquisition_errors_distinguish_input_upstream_and_storage(
    tmp_path, monkeypatch, failure, status, code
):
    app, _, _ = setup_catalog(tmp_path)

    @asynccontextmanager
    async def acquire(url, revision):
        raise failure
        yield tmp_path

    monkeypatch.setattr(generation_module, "acquire_repository", acquire)
    response = TestClient(app).post(
        "/api/v1/generation",
        json={
            "repository_url": "https://github.com/owner/repository",
            "project_boundary": "SDK",
        },
    )
    assert response.status_code == status
    assert response.json()["error"]["code"] == code


def test_refresh_allows_other_async_work_during_retrieval(tmp_path, monkeypatch):
    app, cards, _ = setup_catalog(tmp_path)
    service = app.state.generation_service
    started = threading.Event()
    finish = threading.Event()

    def retrieve(identifier):
        started.set()
        assert finish.wait(3), "Retrieval blocked the event loop"
        return {
            "repository_url": "https://github.com/owner/repository",
            "project_boundary": "SDK",
            "card": cards[0],
        }

    monkeypatch.setattr(service, "retrieve", retrieve)
    generated = AsyncMock(return_value={"status": "succeeded"})
    monkeypatch.setattr(service, "generate", generated)

    async def run():
        task = asyncio.create_task(service.refresh(UUID(int=1)))
        try:
            assert await asyncio.to_thread(started.wait, 2)
            await asyncio.sleep(0)
        finally:
            finish.set()
        assert await task == {"status": "succeeded"}

    asyncio.run(run())
    assert generated.call_args.kwargs["previous"] == cards[0]


def test_disconnect_cancels_analysis_and_releases_busy_service(tmp_path, monkeypatch):
    from agent_project_intelligence.api.errors import CatalogAPIError
    from agent_project_intelligence.api.routes.generation import until_disconnect
    from fastapi import Request

    app, _, settings = setup_catalog(tmp_path)
    service = app.state.generation_service
    payload = generation_module.GenerationRequest(
        repository_url="https://github.com/owner/repo", project_boundary="whole project"
    )

    async def run():
        started = asyncio.Event()
        disconnected = asyncio.Event()
        cleaned = asyncio.Event()

        @asynccontextmanager
        async def acquire(url, revision):
            try:
                started.set()
                await asyncio.Event().wait()
                yield tmp_path
            finally:
                cleaned.set()

        async def receive():
            await disconnected.wait()
            return {"type": "http.disconnect"}

        monkeypatch.setattr(generation_module, "acquire_repository", acquire)
        request = Request({"type": "http"}, receive)
        operation = asyncio.create_task(until_disconnect(request, service.generate(payload)))
        await started.wait()
        with pytest.raises(CatalogAPIError) as error:
            await service.generate(payload)
        assert error.value.status_code == 503
        disconnected.set()
        with pytest.raises(CatalogAPIError) as error:
            await operation
        assert error.value.status_code == 499
        assert error.value.error.code == "generation_disconnected"
        assert cleaned.is_set() and not service._lock.locked()
        assert not settings.generated_cards_root.exists()

    asyncio.run(run())


def test_cancel_during_storage_finishes_retrievable_manifest_before_unlock(tmp_path, monkeypatch):
    app, cards, settings = setup_catalog(tmp_path)
    service = app.state.generation_service
    card = cards[0]
    started = threading.Event()
    finish = threading.Event()
    persist = service._persist

    def delayed_persist(*args):
        started.set()
        assert finish.wait(5)
        return persist(*args)

    @asynccontextmanager
    async def acquire(url, revision):
        yield tmp_path

    monkeypatch.setattr(service, "_persist", delayed_persist)
    monkeypatch.setattr(generation_module, "acquire_repository", acquire)
    monkeypatch.setattr(
        service.harness,
        "generate",
        AsyncMock(
            return_value=ProjectCardGenerationResult(
                status="succeeded",
                card=card,
                card_id=card["card_id"],
                card_version=1,
                schema_version=card["schema_version"],
                analysis_configuration=service.harness.analysis_configuration,
            )
        ),
    )

    async def run():
        payload = generation_module.GenerationRequest(
            repository_url=card["project"]["repositories"][0]["url"],
            project_boundary=card["project"]["boundary"],
        )
        task = asyncio.create_task(service.generate(payload))
        try:
            assert await asyncio.to_thread(started.wait, 3)
            task.cancel()
            await asyncio.sleep(0)
            assert service._lock.locked() and not task.done()
        finally:
            finish.set()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert not service._lock.locked()

    asyncio.run(run())
    manifest = next(settings.generated_cards_root.glob("*/result.json"))
    client = TestClient(app)
    assert client.get(f"/api/v1/generation/{manifest.parent.name}").status_code == 200
    manifest.write_text("[]")
    response = client.get(f"/api/v1/generation/{manifest.parent.name}")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "stored_card_invalid"


@pytest.mark.parametrize("damage", ["missing", "invalid", "symlink", "wrong_identity", "duplicate"])
def test_saved_generation_reads_and_validates_canonical_yaml(tmp_path, damage):
    app, cards, settings = setup_catalog(tmp_path)
    card = cards[0]
    result = app.state.generation_service._persist(
        card,
        generation_module.GenerationRequest(
            repository_url=card["project"]["repositories"][0]["url"],
            project_boundary=card["project"]["boundary"],
        ),
        None,
    )
    manifest_path = settings.generated_cards_root / result["generation_id"] / "result.json"
    manifest = json.loads(manifest_path.read_text())
    assert "card" not in manifest and "card_path" not in manifest
    assert manifest["card_id"] == card["card_id"]
    path = next((settings.generated_cards_root / "cards").rglob("project-card.yaml"))
    client = TestClient(app)
    url = f"/api/v1/generation/{result['generation_id']}"
    assert client.get(url).json() == result
    if damage == "missing":
        path.unlink()
    elif damage == "invalid":
        path.write_text("invalid")
    elif damage == "symlink":
        external = tmp_path / "outside.yaml"
        path.rename(external)
        path.symlink_to(external)
    elif damage == "wrong_identity":
        manifest["card_id"] = "wrong-card"
        manifest_path.write_text(json.dumps(manifest))
    else:
        # Reintroducing a second card payload must not override the YAML source.
        manifest["card"] = card
        manifest_path.write_text(json.dumps(manifest))
    response = client.get(url)
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "stored_card_invalid"


def test_shared_development_context_is_evidence_backed_and_revision_pinned():
    from agent_project_intelligence.api.models.catalog import ComparisonRequest
    from agent_project_intelligence.catalog import FilesystemCatalogRepository, SkillCardValidator

    snapshot = FilesystemCatalogRepository(
        root=Settings().catalog_root, validator=SkillCardValidator(), max_file_size_bytes=2**21
    ).load()
    projects = [
        "project-openai-openai-agents-python",
        "project-langchain-ai-langgraph",
        "project-crewaiinc-crewai",
    ]
    cards = [snapshot.get_current(project) for project in projects]
    assert all(card and card.card_version == 2 for card in cards)
    first = cards[0].to_document()
    context = next(
        item
        for item in first["assessment"]["contexts"]
        if item["context_id"] == "context-python-support-prototype"
    )
    request = ComparisonRequest.model_validate(
        {
            "cards": [{"project_id": project, "card_version": 2} for project in projects],
            "assessment_context": {
                key: value for key, value in context.items() if key != "context_id"
            },
        }
    )
    service = CatalogService(snapshot)
    result = service.compare(request)
    fit = next(row for row in result.rows if row.id == "contextual-best-fit")
    assert all(cell.state == "value" and cell.claim_ids for cell in fit.cells.values())
    for card in cards:
        assert (
            card.to_document()["source_snapshot"]["source_revisions"]
            == snapshot.get(card.project_id, 1).to_document()["source_snapshot"]["source_revisions"]
        )
    request.assessment_context.exclusions = ["A newly introduced constraint"]
    changed = service.compare(request)
    assert all(
        cell.state == "not_analyzed"
        for row in changed.rows
        if row.id == "contextual-best-fit"
        for cell in row.cells.values()
    )


def test_every_published_evidence_record_resolves():
    from agent_project_intelligence.catalog import FilesystemCatalogRepository, SkillCardValidator

    snapshot = FilesystemCatalogRepository(
        root=Settings().catalog_root, validator=SkillCardValidator(), max_file_size_bytes=2**21
    ).load()
    service = CatalogService(snapshot)
    for card in snapshot.cards:
        for item in card.to_document()["evidence"]:
            resolved = service.evidence(card.project_id, card.card_version, item["evidence_id"])
            assert resolved.source["source_id"] == item["source_id"]
            assert resolved.evidence == item
