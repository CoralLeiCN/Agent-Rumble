"""HTTP contract tests for the YAML-first catalog vertical slice."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from pydantic import ValidationError

from agent_project_intelligence.api.errors import CatalogAPIError
from agent_project_intelligence.catalog import (
    CatalogCard,
    CatalogSnapshot,
    FilesystemCatalogRepository,
    SkillCardValidator,
)
from agent_project_intelligence.catalog.models import freeze_value
from agent_project_intelligence.config import Settings
from agent_project_intelligence.api.identifier_references import (
    decode_identifier_reference,
    encode_identifier_reference,
)
from agent_project_intelligence.api.models.catalog import CardReference
from agent_project_intelligence.main import create_app


EIGENT = "project-eigent-ai-eigent"
BIOMNI = "project-snap-stanford-biomni"
BIOAGENTS = "project-bio-xyz-bioagents"
PREPROCESSED_CARD_ROOT = Path(__file__).resolve().parents[3] / "project-cards"


@pytest.mark.parametrize(
    ("identifier", "reference"),
    [
        ("simple-id", "~InNpbXBsZS1pZCI"),
        ("项目/δοκιμή", "~Iumhueebri_OtM6_zrrOuc68zq4i"),
        (" ", "~IiAi"),
        ("ctl:\u0000\n", "~ImN0bDpcdTAwMDBcbiI"),
        (
            "project/cards/2/evidence/value",
            "~InByb2plY3QvY2FyZHMvMi9ldmlkZW5jZS92YWx1ZSI",
        ),
        (
            "evidence/cards/2/evidence/",
            "~ImV2aWRlbmNlL2NhcmRzLzIvZXZpZGVuY2UvIg",
        ),
        ("😀", "~IvCfmIAi"),
    ],
)
def test_identifier_reference_known_vectors(identifier: str, reference: str) -> None:
    assert encode_identifier_reference(identifier) == reference
    assert decode_identifier_reference(reference, field="project_id") == identifier


def test_card_reference_preserves_nonempty_interoperable_identifier_values() -> None:
    identifiers = [" ", "ctl:\u0000\n", "x" * 3_000]

    assert [
        CardReference(project_id=identifier, card_version=1).project_id
        for identifier in identifiers
    ] == identifiers


def test_paired_surrogate_codec_normalizes_to_json_scalar_meaning() -> None:
    paired = "\ud83d\ude00"

    assert encode_identifier_reference(paired) == "~IvCfmIAi"
    assert decode_identifier_reference("~IvCfmIAi", field="project_id") == "😀"


def test_lone_surrogate_boundary_is_explicit_and_typed() -> None:
    for lone, reference in (("\ud800", "~Ilx1ZDgwMCI"), ("\udc00", "~Ilx1ZGMwMCI")):
        with pytest.raises(ValueError, match="lone surrogate"):
            encode_identifier_reference(lone)
        with pytest.raises(CatalogAPIError) as opaque_error:
            decode_identifier_reference(reference, field="project_id")
        with pytest.raises(ValidationError, match="lone surrogate"):
            CardReference(project_id=lone, card_version=1)

        assert opaque_error.value.status_code == 400
        assert opaque_error.value.error.code == "invalid_identifier_reference"


def _card_from_document(document: dict[str, object]) -> CatalogCard:
    return CatalogCard(
        card_id=str(document["card_id"]),
        card_version=int(document["card_version"]),
        project_id=str(document["project"]["project_id"]),  # type: ignore[index]
        schema_version=str(document["schema_version"]),
        document=freeze_value(document),
        source_path=Path("project-card.yaml"),
        content_sha256="0" * 64,
    )


def _eigent_clone(
    catalog_snapshot: CatalogSnapshot,
    project_id: str,
    *,
    name: str | None = None,
) -> dict[str, object]:
    source = catalog_snapshot.get(EIGENT, 1)
    assert source is not None
    document = source.to_document()
    document["card_id"] = f"card-{project_id.replace('/', '-')}"
    document["project"]["project_id"] = project_id
    if name is not None:
        document["project"]["name"] = name
    return document


def _context_request(document: dict[str, object]) -> dict[str, object]:
    context = document["assessment"]["contexts"][0]  # type: ignore[index]
    return {
        "use_case": context["use_case"],
        "comparison_cohort": context["comparison_cohort"],
        "requirements": context["requirements"],
        "organizational_constraints": context["organizational_constraints"],
        "assessed_at": context["assessed_at"],
    }


@pytest.fixture(scope="module")
def catalog_snapshot() -> CatalogSnapshot:
    settings = Settings()
    return FilesystemCatalogRepository(
        root=settings.catalog_root,
        validator=SkillCardValidator(),
        max_file_size_bytes=settings.catalog_max_file_size_bytes,
    ).load()


@pytest.fixture(scope="module")
def client(catalog_snapshot: CatalogSnapshot) -> Iterator[TestClient]:
    with TestClient(create_app(catalog_snapshot=catalog_snapshot)) as test_client:
        yield test_client


def test_catalog_context_exposes_declared_scope_and_freshness(client: TestClient) -> None:
    response = client.get("/api/v1/catalog")

    assert response.status_code == 200
    body = response.json()
    assert body["catalog_id"] == "agent-rumble-public-catalog"
    assert body["card_count"] == 11
    assert body["schema_versions"] == ["0.3"]
    assert body["oldest_analyzed_at"] <= body["newest_analyzed_at"]
    assert any("Universal project quality scoring" in value for value in body["exclusions"])


def test_catalog_publishes_every_preprocessed_card(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    validator = SkillCardValidator()
    preprocessed: dict[tuple[str, int], dict[str, object]] = {}

    for path in sorted(PREPROCESSED_CARD_ROOT.glob("*/project-card.yaml")):
        document = yaml.safe_load(path.read_text(encoding="utf-8"))
        validated = validator.validate(document)
        preprocessed[(validated.project_id, validated.card_version)] = validated.document

    published = {
        (card.project_id, card.card_version): card.to_document()
        for card in catalog_snapshot.cards
    }

    assert len(preprocessed) == 11
    assert published == preprocessed


def test_current_and_versioned_routes_return_exact_canonical_document(
    client: TestClient,
    catalog_snapshot: CatalogSnapshot,
) -> None:
    expected = catalog_snapshot.get(EIGENT, 1)
    assert expected is not None

    current = client.get(f"/api/v1/projects/{EIGENT}/cards/current")
    pinned = client.get(f"/api/v1/projects/{EIGENT}/cards/1")

    assert current.status_code == pinned.status_code == 200
    assert current.json() == expected.to_document()
    assert pinned.json() == expected.to_document()


def test_missing_and_invalid_identifiers_use_typed_errors(client: TestClient) -> None:
    missing = client.get("/api/v1/projects/project-does-not-exist/cards/1")
    invalid = client.get("/api/v1/projects/~/cards/1")

    assert missing.status_code == 404
    assert missing.json() == {
        "error": {
            "code": "card_not_found",
            "message": "The requested Agent Project Card was not found.",
            "details": {"project_id": "project-does-not-exist", "card_version": 1},
        }
    }
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "invalid_identifier_reference"


def test_validation_errors_use_the_same_typed_envelope(client: TestClient) -> None:
    response = client.post(
        "/api/v1/catalog/search",
        json={"text": "agent", "page": 0, "page_size": 500},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "request_validation_error"
    assert {issue["location"][-1] for issue in body["error"]["details"]["issues"]} == {
        "page",
        "page_size",
    }


def test_unavailable_catalog_uses_typed_service_error(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    application = create_app(catalog_snapshot=catalog_snapshot)
    del application.state.catalog_service
    with TestClient(application) as unavailable_client:
        response = unavailable_client.get("/api/v1/catalog")

    assert response.status_code == 503
    assert response.json() == {
        "error": {
            "code": "catalog_unavailable",
            "message": "The validated card catalog is not available.",
            "details": {},
        }
    }


def test_search_is_deterministic_traceable_and_reports_uninterpreted_terms(
    client: TestClient,
) -> None:
    request = {
        "text": "multi-agent TypeScript quux-never-indexed",
        "filters": {"categories": ["agent_application"]},
        "page": 1,
        "page_size": 20,
        "assessment_context": {
            "use_case": "Evaluate an agent application",
            "comparison_cohort": ["Public agent applications"],
            "requirements": ["TypeScript implementation"],
            "organizational_constraints": ["Static evidence only"],
        },
    }

    first = client.post("/api/v1/catalog/search", json=request)
    second = client.post("/api/v1/catalog/search", json=request)

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    body = first.json()
    assert body["uninterpreted_terms"] == ["quux never indexed"]
    assert body["total"] == 5
    assert [project["id"] for project in body["projects"]] == [
        BIOAGENTS,
        EIGENT,
        "project-openloaf-openloaf",
        "project-openags-auto-researcher",
        "project-different-ai-openwork",
    ]
    assert body["requirements"] == [
        {"id": "requirement-1", "kind": "must", "label": "TypeScript implementation"}
    ]
    for project in body["projects"]:
        assert project["source_snapshot"]["source_revisions"]
        assert project["analysis_age_days"] >= 0
        assert project["match_reasons"]
        assert all(reason["path"].startswith("/") for reason in project["match_reasons"])
        assert any(reason["claim_ids"] for reason in project["match_reasons"])
        assert "score" not in project


@pytest.mark.parametrize(
    ("query", "expected_first"),
    [
        ("desktop MCP agent", EIGENT),
        ("biomedical research tools", BIOMNI),
        ("archived TypeScript biology", BIOAGENTS),
        ("Biomni", BIOMNI),
    ],
)
def test_search_prioritizes_the_project_most_relevant_to_basic_queries(
    client: TestClient,
    query: str,
    expected_first: str,
) -> None:
    response = client.post("/api/v1/catalog/search", json={"text": query})

    assert response.status_code == 200
    body = response.json()
    assert body["projects"]
    assert body["projects"][0]["id"] == expected_first
    assert body["projects"][0]["match_reason"].startswith("Matches “")
    assert " at /" not in body["projects"][0]["match_reason"]
    assert "score" not in body["projects"][0]


def test_search_filters_weak_partial_matches_for_a_specific_query(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/catalog/search",
        json={"text": "archived TypeScript biology"},
    )

    assert response.status_code == 200
    assert [project["id"] for project in response.json()["projects"]] == [BIOAGENTS]


def test_search_returns_an_explainable_empty_result_for_unknown_terms(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/catalog/search",
        json={"text": "quantum satellite robotics"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["projects"] == []
    assert response.json()["uninterpreted_terms"] == [
        "quantum",
        "satellite",
        "robotics",
    ]


def test_search_supports_all_filter_dimensions_and_pagination(client: TestClient) -> None:
    filtered = client.post(
        "/api/v1/catalog/search",
        json={
            "filters": {
                "categories": ["agent_application"],
                "capabilities": ["multi-agent workforce"],
                "languages": ["Python"],
                "licenses": ["Apache"],
                "architecture_layers": ["Brain HTTP/SSE API"],
            }
        },
    )
    paged = client.post(
        "/api/v1/catalog/search",
        json={"text": "agent", "page": 2, "page_size": 1},
    )

    assert filtered.status_code == 200
    assert [project["id"] for project in filtered.json()["projects"]] == [EIGENT]
    assert {reason["kind"] for reason in filtered.json()["projects"][0]["match_reasons"]} == {
        "filter"
    }
    assert paged.status_code == 200
    assert paged.json()["page"] == 2
    assert paged.json()["page_size"] == 1
    assert len(paged.json()["projects"]) == 1


def test_unknown_license_is_not_indexed_as_a_negative_match(client: TestClient) -> None:
    response = client.post(
        "/api/v1/catalog/search",
        json={"filters": {"licenses": ["no license"]}},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["projects"] == []


def test_evidence_resolves_claim_source_revision_locator_and_pinned_url(
    client: TestClient,
) -> None:
    response = client.get(
        f"/api/v1/projects/{EIGENT}/cards/1/evidence/evidence-readme-product"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["evidence"]["source_id"] == body["source"]["source_id"]
    assert body["source_revision"]["source_id"] == body["source"]["source_id"]
    assert body["related_claims"]
    commit = body["source_revision"]["commit"]
    assert body["source_url"] == (
        f"https://github.com/eigent-ai/eigent/blob/{commit}/README.md#L31-L43"
    )


def test_unsafe_evidence_locator_never_becomes_a_source_url() -> None:
    document = {
        "schema_version": "0.3",
        "card_id": "card-test",
        "card_version": 1,
        "field_states": {},
        "project": {"project_id": "project-test", "name": "Test", "primary_type": "agent_tool_mcp"},
        "source_snapshot": {
            "analyzed_at": "2026-07-18T00:00:00Z",
            "source_revisions": [
                {
                    "source_id": "source-test",
                    "commit": "0123456789abcdef0123456789abcdef01234567",
                }
            ],
            "ontology_versions": {},
        },
        "summary": {},
        "classification": {"claim_ids": []},
        "capabilities": [],
        "architecture": {},
        "assessment": {"contexts": []},
        "relationships": {},
        "claims": [
            {
                "claim_id": "claim-test",
                "supporting_evidence_ids": ["evidence-test"],
                "conflicting_evidence_ids": [],
            }
        ],
        "sources": [
            {
                "source_id": "source-test",
                "source_type": "repository",
                "access_scope": "public",
                "uri": "https://github.com/example/test",
            }
        ],
        "evidence": [
            {
                "evidence_id": "evidence-test",
                "source_id": "source-test",
                "locator": {"path": "../README.md", "line_start": 1, "line_end": 2},
            }
        ],
        "open_questions": [],
    }
    card = CatalogCard(
        card_id="card-test",
        card_version=1,
        project_id="project-test",
        schema_version="0.3",
        document=freeze_value(document),
        source_path=Path("project-card.yaml"),
        content_sha256="0" * 64,
    )
    with TestClient(create_app(catalog_snapshot=CatalogSnapshot((card,)))) as unsafe_client:
        response = unsafe_client.get(
            "/api/v1/projects/project-test/cards/1/evidence/evidence-test"
        )

    assert response.status_code == 200
    assert response.json()["source_url"] is None


def test_comparison_is_role_first_pinned_and_preserves_field_states(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/catalog/compare",
        json={
            "cards": [
                {"project_id": BIOAGENTS, "card_version": 1},
                {"project_id": EIGENT, "card_version": 1},
            ],
            "assessment_context": {
                "use_case": "Compare public agent applications",
                "comparison_cohort": ["Agent applications"],
                "requirements": ["Inspectable source snapshot"],
                "organizational_constraints": ["Static evidence only"],
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["project_ids"] == [BIOAGENTS, EIGENT]
    assert body["rows"][0]["id"] == "role"
    assert body["role_analysis"]["compatibility"] == "same_role"
    assert all(card["source_snapshot"] for card in body["cards"])
    license_row = next(row for row in body["rows"] if row["id"] == "license")
    assert license_row["cells"][BIOAGENTS]["state"] == "no_evidence_found"
    assert license_row["cells"][EIGENT]["state"] == "value"
    fit_row = next(row for row in body["rows"] if row["id"] == "contextual-best-fit")
    assert {cell["state"] for cell in fit_row["cells"].values()} == {"not_analyzed"}
    assert "winner" not in body
    assert "score" not in body


def test_comparison_rejects_duplicate_or_unpinned_card_sets(client: TestClient) -> None:
    duplicate = client.post(
        "/api/v1/catalog/compare",
        json={
            "cards": [
                {"project_id": EIGENT, "card_version": 1},
                {"project_id": EIGENT, "card_version": 1},
            ],
            "assessment_context": {"use_case": "Compare duplicates"},
        },
    )
    missing = client.post(
        "/api/v1/catalog/compare",
        json={
            "cards": [
                {"project_id": EIGENT, "card_version": 1},
                {"project_id": BIOMNI, "card_version": 99},
            ],
            "assessment_context": {"use_case": "Compare pinned cards"},
        },
    )

    assert duplicate.status_code == 422
    assert duplicate.json()["error"]["code"] == "request_validation_error"
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "card_not_found"


def test_comparison_assessments_require_an_exact_context_and_matching_context_id(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    first = _eigent_clone(catalog_snapshot, "project-context-one")
    second = _eigent_clone(catalog_snapshot, "project-context-two")
    for document in (first, second):
        assessment = document["assessment"]
        assessment["maturity_signals"].insert(  # type: ignore[index]
            0,
            {
                "statement": "DO NOT LEAK foreign maturity signal",
                "reasoning": None,
                "context_id": "context-foreign",
                "confidence": "high",
                "claim_ids": ["claim-foreign-not-on-card"],
            },
        )
        assessment["limitations"].insert(  # type: ignore[index]
            0,
            {
                "statement": "DO NOT LEAK foreign limitation",
                "reasoning": None,
                "context_id": "context-foreign",
                "confidence": "high",
                "claim_ids": ["claim-foreign-not-on-card"],
            },
        )
        assessment["best_fit"].insert(  # type: ignore[index]
            0,
            {
                "statement": "DO NOT LEAK foreign fit",
                "reasoning": None,
                "context_id": "context-foreign",
                "confidence": "high",
                "claim_ids": ["claim-foreign-not-on-card"],
            },
        )
    cards = (_card_from_document(first), _card_from_document(second))
    exact_context = _context_request(first)
    base_request = {
        "cards": [
            {"project_id": "project-context-one", "card_version": 1},
            {"project_id": "project-context-two", "card_version": 1},
        ],
        "assessment_context": exact_context,
    }

    with TestClient(create_app(catalog_snapshot=CatalogSnapshot(cards))) as context_client:
        exact = context_client.post("/api/v1/catalog/compare", json=base_request)

        assert exact.status_code == 200
        rows = {row["id"]: row for row in exact.json()["rows"]}
        for row_id in ("maturity", "limitations", "contextual-best-fit"):
            assert {cell["state"] for cell in rows[row_id]["cells"].values()} == {"value"}
            assert "DO NOT LEAK" not in str(rows[row_id])
            assert all(
                "claim-foreign-not-on-card" not in cell["claim_ids"]
                for cell in rows[row_id]["cells"].values()
            )

        mismatches = []
        for field, value in (
            ("use_case", "A different use case"),
            ("comparison_cohort", ["A different cohort"]),
            ("requirements", ["A different requirement"]),
            ("organizational_constraints", ["A different constraint"]),
            ("assessed_at", "2026-07-18T12:48:00Z"),
        ):
            mismatched_context = dict(exact_context)
            mismatched_context[field] = value
            mismatches.append(
                context_client.post(
                    "/api/v1/catalog/compare",
                    json={**base_request, "assessment_context": mismatched_context},
                )
            )

    for response in mismatches:
        assert response.status_code == 200
        rows = {row["id"]: row for row in response.json()["rows"]}
        for row_id in ("maturity", "limitations", "contextual-best-fit"):
            assert {cell["state"] for cell in rows[row_id]["cells"].values()} == {
                "not_analyzed"
            }


def test_search_uses_context_for_relevance_and_context_bounds_assessments(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    document = _eigent_clone(
        catalog_snapshot,
        "project-context-search",
        name="ContextSearchOnly",
    )
    exact_context = _context_request(document)
    context_with_unsupported_terms = dict(exact_context)
    context_with_unsupported_terms["use_case"] = (
        f"{exact_context['use_case']} zqx-context-never-indexed"
    )
    app = create_app(catalog_snapshot=CatalogSnapshot((_card_from_document(document),)))

    with TestClient(app) as context_client:
        contextual = context_client.post(
            "/api/v1/catalog/search",
            json={"text": "", "assessment_context": context_with_unsupported_terms},
        )
        exact_maturity = context_client.post(
            "/api/v1/catalog/search",
            json={
                "filters": {"maturities": ["established"]},
                "assessment_context": exact_context,
            },
        )
        missing_context = context_client.post(
            "/api/v1/catalog/search",
            json={"text": "ContextSearchOnly", "filters": {"maturities": ["established"]}},
        )
        mismatched_context = dict(exact_context)
        mismatched_context["comparison_cohort"] = ["Wrong cohort"]
        wrong_maturity = context_client.post(
            "/api/v1/catalog/search",
            json={
                "filters": {"maturities": ["established"]},
                "assessment_context": mismatched_context,
            },
        )
        exact_constraint = context_client.post(
            "/api/v1/catalog/search",
            json={"text": "ContextSearchOnly", "assessment_context": exact_context},
        )
        no_constraint = context_client.post(
            "/api/v1/catalog/search",
            json={"text": "ContextSearchOnly"},
        )

    assert contextual.status_code == 200
    assert contextual.json()["total"] == 1
    assert "zqx context never indexed" in contextual.json()["uninterpreted_terms"]
    assert contextual.json()["projects"][0]["match_reasons"]
    assert exact_maturity.json()["total"] == 1
    assert missing_context.json()["total"] == 0
    assert wrong_maturity.json()["total"] == 0
    assert "Contextual limitation not analyzed" not in exact_constraint.json()["projects"][0][
        "constraint"
    ]
    assert no_constraint.json()["projects"][0]["constraint"] == (
        "Contextual limitation not analyzed for this Assessment Context."
    )


def test_capability_match_preserves_support_confidence_and_claimless_match_stays_null(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    document = _eigent_clone(
        catalog_snapshot,
        "project-status-test",
        name="ClaimlessZephyr",
    )
    capability = document["capabilities"][0]  # type: ignore[index]
    capability["support_status"] = None
    capability["confidence"] = "low"
    document["field_states"]["/capabilities/0/support_status"] = "unknown"  # type: ignore[index]
    app = create_app(catalog_snapshot=CatalogSnapshot((_card_from_document(document),)))

    with TestClient(app) as status_client:
        capability_match = status_client.post(
            "/api/v1/catalog/search",
            json={"filters": {"capabilities": [capability["capability_id"]]}},
        )
        claimless_match = status_client.post(
            "/api/v1/catalog/search",
            json={"text": "ClaimlessZephyr"},
        )

    assert capability_match.status_code == 200
    reason = capability_match.json()["projects"][0]["match_reasons"][0]
    assert reason["capability_support_status"] is None
    assert reason["confidence"] == "low"
    assert reason["field_state"] == "unknown"
    assert reason["claim_ids"] == capability["claim_ids"]
    assert capability_match.json()["projects"][0]["match_claim"]["claim_id"] in reason[
        "claim_ids"
    ]
    assert claimless_match.status_code == 200
    assert claimless_match.json()["projects"][0]["match_reasons"][0]["claim_ids"] == []
    assert claimless_match.json()["projects"][0]["match_claim"] is None

    other = _eigent_clone(catalog_snapshot, "project-status-other", name="StatusOther")
    comparison_app = create_app(
        catalog_snapshot=CatalogSnapshot(
            (_card_from_document(document), _card_from_document(other))
        )
    )
    with TestClient(comparison_app) as comparison_client:
        comparison = comparison_client.post(
            "/api/v1/catalog/compare",
            json={
                "cards": [
                    {"project_id": "project-status-test", "card_version": 1},
                    {"project_id": "project-status-other", "card_version": 1},
                ],
                "assessment_context": {"use_case": "Inspect capability state"},
            },
        )

    assert comparison.status_code == 200
    capability_cell = next(
        row["cells"]["project-status-test"]
        for row in comparison.json()["rows"]
        if row["id"].startswith("capability-")
        and row["cells"]["project-status-test"]["state"] == "unknown"
    )
    assert capability_cell.get("capability_support_status") is None
    assert capability_cell["confidence"] == "low"
    assert capability_cell["claim_verification_status"] == "statically_confirmed"
    assert capability_cell["claim_ids"] == capability["claim_ids"]
    assert capability_cell["evidence_ids"]


def test_search_joins_primary_repository_owner_and_revision_by_source_id(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    document = _eigent_clone(
        catalog_snapshot,
        "project-multi-repo",
        name="MultiRepoNeedle",
    )
    document["project"]["repositories"] = [  # type: ignore[index]
        {
            "source_id": "source-supporting",
            "url": "https://github.com/example/supporting",
            "owner": "WrongOwner",
            "role": "supporting",
            "included_paths": [],
            "excluded_paths": [],
        },
        {
            "source_id": "source-primary",
            "url": "https://github.com/example/primary",
            "owner": "PrimaryOwner",
            "role": "primary",
            "included_paths": [],
            "excluded_paths": [],
        },
    ]
    document["source_snapshot"]["source_revisions"] = [  # type: ignore[index]
        {"source_id": "source-supporting", "commit": "1111111", "tag": None},
        {"source_id": "source-primary", "commit": "2222222", "tag": None},
    ]
    app = create_app(catalog_snapshot=CatalogSnapshot((_card_from_document(document),)))

    with TestClient(app) as repository_client:
        response = repository_client.post(
            "/api/v1/catalog/search",
            json={"text": "MultiRepoNeedle"},
        )

    assert response.status_code == 200
    project = response.json()["projects"][0]
    assert project["owner"] == "PrimaryOwner"
    assert project["revision"] == "2222222"


def test_slash_and_unicode_identifiers_round_trip_losslessly(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    project_id = "项目/δοκιμή"
    evidence_id = "证据/τεστ"
    document = _eigent_clone(catalog_snapshot, project_id)
    original_evidence_id = document["evidence"][0]["evidence_id"]  # type: ignore[index]
    document["evidence"][0]["evidence_id"] = evidence_id  # type: ignore[index]
    for claim in document["claims"]:  # type: ignore[union-attr]
        claim["supporting_evidence_ids"] = [
            evidence_id if value == original_evidence_id else value
            for value in claim["supporting_evidence_ids"]
        ]
        claim["conflicting_evidence_ids"] = [
            evidence_id if value == original_evidence_id else value
            for value in claim["conflicting_evidence_ids"]
        ]
    app = create_app(catalog_snapshot=CatalogSnapshot((_card_from_document(document),)))
    encoded_project_id = encode_identifier_reference(project_id)
    encoded_evidence_id = encode_identifier_reference(evidence_id)

    with TestClient(app) as unicode_client:
        current = unicode_client.get(
            f"/api/v1/projects/{encoded_project_id}/cards/current"
        )
        pinned = unicode_client.get(
            f"/api/v1/projects/{encoded_project_id}/cards/1"
        )
        evidence = unicode_client.get(
            f"/api/v1/projects/{encoded_project_id}/cards/1/evidence/{encoded_evidence_id}"
        )

    assert current.status_code == pinned.status_code == evidence.status_code == 200
    assert current.json()["project"]["project_id"] == project_id
    assert pinned.json()["project"]["project_id"] == project_id
    assert evidence.json()["project_id"] == project_id
    assert evidence.json()["evidence"]["evidence_id"] == evidence_id


def test_paired_surrogate_identifiers_do_not_mislookup_or_fail_json_responses(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    paired = "\ud83d\ude00"
    document = _eigent_clone(
        catalog_snapshot,
        paired,
        name="PairedSurrogateNeedle",
    )
    original_evidence_id = document["evidence"][0]["evidence_id"]  # type: ignore[index]
    document["evidence"][0]["evidence_id"] = paired  # type: ignore[index]
    for claim in document["claims"]:  # type: ignore[union-attr]
        claim["supporting_evidence_ids"] = [
            paired if value == original_evidence_id else value
            for value in claim["supporting_evidence_ids"]
        ]
        claim["conflicting_evidence_ids"] = [
            paired if value == original_evidence_id else value
            for value in claim["conflicting_evidence_ids"]
        ]
    app = create_app(catalog_snapshot=CatalogSnapshot((_card_from_document(document),)))
    reference = encode_identifier_reference(paired)

    with TestClient(app) as surrogate_client:
        current = surrogate_client.get(
            f"/api/v1/projects/{reference}/cards/current"
        )
        pinned = surrogate_client.get(f"/api/v1/projects/{reference}/cards/1")
        evidence = surrogate_client.get(
            f"/api/v1/projects/{reference}/cards/1/evidence/{reference}"
        )
        search = surrogate_client.post(
            "/api/v1/catalog/search",
            json={"text": "PairedSurrogateNeedle"},
        )

    assert current.status_code == pinned.status_code == evidence.status_code == 200
    assert search.status_code == 200
    assert current.json()["project"]["project_id"] == "😀"
    assert pinned.json()["project"]["project_id"] == "😀"
    assert evidence.json()["project_id"] == "😀"
    assert evidence.json()["evidence"]["evidence_id"] == "😀"
    assert search.json()["projects"][0]["id"] == "😀"


def test_opaque_routes_accept_all_nonempty_json_string_identifier_shapes(
    catalog_snapshot: CatalogSnapshot,
) -> None:
    project_ids = [
        "  padded identifier  ",
        "ctl:\u0000\n",
        "x" * 2_050,
        "项目/δοκιμή",
        "project/cards/2/evidence/value",
        "~prefix-shaped-canonical-id",
    ]
    evidence_id = "evidence/cards/2/evidence/"
    cards: list[CatalogCard] = []
    for project_id in project_ids:
        document = _eigent_clone(catalog_snapshot, project_id)
        document["evidence"][0]["evidence_id"] = evidence_id  # type: ignore[index]
        cards.append(_card_from_document(document))

    with TestClient(create_app(catalog_snapshot=CatalogSnapshot(tuple(cards)))) as opaque_client:
        responses = []
        for project_id in project_ids:
            project_ref = encode_identifier_reference(project_id)
            evidence_ref = encode_identifier_reference(evidence_id)
            responses.append(
                (
                    project_id,
                    opaque_client.get(
                        f"/api/v1/projects/{project_ref}/cards/current"
                    ),
                    opaque_client.get(
                        f"/api/v1/projects/{project_ref}/cards/1/evidence/{evidence_ref}"
                    ),
                )
            )

    for project_id, current, evidence in responses:
        assert current.status_code == evidence.status_code == 200
        assert current.json()["project"]["project_id"] == project_id
        assert evidence.json()["project_id"] == project_id
        assert evidence.json()["evidence"]["evidence_id"] == evidence_id


@pytest.mark.parametrize(
    "invalid_ref",
    [
        "~",
        "~A",
        "~_w",
        "~bnVsbA",
        "~IiI",
        "~Ilx1ZDgwMCI",
        "~Ilx1ZGMwMCI",
    ],
)
def test_invalid_opaque_project_references_use_typed_400(
    client: TestClient,
    invalid_ref: str,
) -> None:
    response = client.get(f"/api/v1/projects/{invalid_ref}/cards/1")

    assert response.status_code == 400
    assert response.json()["error"] == {
        "code": "invalid_identifier_reference",
        "message": "project_id is not a valid opaque identifier reference.",
        "details": {"field": "project_id"},
    }


def test_invalid_opaque_evidence_reference_uses_typed_400(client: TestClient) -> None:
    response = client.get(
        f"/api/v1/projects/{encode_identifier_reference(EIGENT)}/cards/1/evidence/~_w"
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_identifier_reference"
    assert response.json()["error"]["details"] == {"field": "evidence_id"}


def test_openapi_exposes_all_versioned_catalog_operations(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    assert {
        "/api/v1/catalog",
        "/api/v1/catalog/search",
        "/api/v1/catalog/compare",
        "/api/v1/projects/{project_ref}/cards/current",
        "/api/v1/projects/{project_ref}/cards/{card_version}",
        "/api/v1/projects/{project_ref}/cards/{card_version}/evidence/{evidence_ref}",
    }.issubset(paths)
    assert paths["/api/v1/catalog/search"]["post"]["responses"]["422"]["content"][
        "application/json"
    ]["schema"]["$ref"].endswith("/ErrorEnvelope")
    project_parameter = next(
        parameter
        for parameter in paths["/api/v1/projects/{project_ref}/cards/current"]["get"][
            "parameters"
        ]
        if parameter["name"] == "project_ref"
    )
    evidence_parameter = next(
        parameter
        for parameter in paths[
            "/api/v1/projects/{project_ref}/cards/{card_version}/evidence/{evidence_ref}"
        ]["get"]["parameters"]
        if parameter["name"] == "evidence_ref"
    )
    assert "unpadded base64url" in project_parameter["description"]
    assert "JSON string representation" in evidence_parameter["description"]


def test_development_cors_allows_only_configured_origin(client: TestClient) -> None:
    allowed = client.options(
        "/api/v1/catalog/search",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    disallowed = client.options(
        "/api/v1/catalog/search",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in disallowed.headers
