"""Focused tests for the YAML-first filesystem catalog."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import yaml

from agent_project_intelligence.catalog.repository import (
    CatalogConfigurationError,
    CatalogLoadError,
    FilesystemCatalogRepository,
    encode_card_id,
)
from agent_project_intelligence.catalog.validation import (
    CardValidationError,
    SkillCardValidator,
    ValidatedCard,
)
from agent_project_intelligence.config import DEFAULT_CATALOG_ROOT


class IdentityValidator:
    """Small validator double that preserves repository-boundary test inputs."""

    def validate(self, document: Any) -> ValidatedCard:
        if not isinstance(document, dict) or document.get("valid") is False:
            raise CardValidationError(("/: rejected by test validator",))
        try:
            return ValidatedCard(
                document=document,
                card_id=document["card_id"],
                card_version=document["card_version"],
                project_id=document["project"]["project_id"],
                schema_version=document["schema_version"],
            )
        except (KeyError, TypeError) as exc:
            raise CardValidationError(("/: missing test identity",)) from exc


def card_document(
    *,
    card_id: str = "card-one",
    project_id: str = "project-one",
    card_version: int = 1,
) -> dict[str, Any]:
    return {
        "schema_version": "0.3",
        "card_id": card_id,
        "card_version": card_version,
        "project": {"project_id": project_id},
        "values": ["one", None],
    }


def publish(
    root: Path,
    document: dict[str, Any],
    *,
    encoded_card_id: str | None = None,
    version_segment: str | None = None,
    content: str | None = None,
) -> Path:
    card_id = document["card_id"]
    version = document["card_version"]
    path = (
        root
        / (encoded_card_id or encode_card_id(card_id))
        / "versions"
        / (version_segment or str(version))
        / "project-card.yaml"
    )
    path.parent.mkdir(parents=True)
    path.write_text(content if content is not None else yaml.safe_dump(document), encoding="utf-8")
    return path


def repository(root: Path, *, limit: int = 10_000) -> FilesystemCatalogRepository:
    return FilesystemCatalogRepository(
        root=root,
        validator=IdentityValidator(),
        max_file_size_bytes=limit,
    )


def diagnostic_codes(error: CatalogLoadError) -> set[str]:
    return {diagnostic.code for diagnostic in error.diagnostics}


def test_empty_existing_catalog_is_valid(tmp_path: Path) -> None:
    snapshot = repository(tmp_path).load()

    assert snapshot.card_count == 0
    assert snapshot.project_count == 0
    assert snapshot.list_current() == ()


def test_invalid_catalog_root_is_configuration_error(tmp_path: Path) -> None:
    with pytest.raises(CatalogConfigurationError):
        repository(tmp_path / "missing").load()


def test_loads_versions_and_selects_greatest_as_current(tmp_path: Path) -> None:
    first = card_document(card_version=1)
    second = card_document(card_version=2)
    publish(tmp_path, first)
    publish(tmp_path, second)

    snapshot = repository(tmp_path).load()

    assert snapshot.card_count == 2
    assert snapshot.project_count == 1
    assert snapshot.versions("project-one") == (1, 2)
    assert snapshot.get("project-one", 1).to_document() == first  # type: ignore[union-attr]
    assert snapshot.get_current("project-one").card_version == 2  # type: ignore[union-attr]
    assert snapshot.get_current("missing") is None


def test_snapshot_and_card_document_are_immutable(tmp_path: Path) -> None:
    document = card_document()
    publish(tmp_path, document)
    card = repository(tmp_path).load().get_current("project-one")
    assert card is not None

    with pytest.raises(TypeError):
        card.document["card_id"] = "changed"  # type: ignore[index]
    with pytest.raises(TypeError):
        card.document["project"]["project_id"] = "changed"  # type: ignore[index]

    copy = card.to_document()
    copy["project"]["project_id"] = "changed"
    assert card.to_document() == document


def test_accepts_canonical_percent_encoded_card_id(tmp_path: Path) -> None:
    document = card_document(card_id="card/with space")
    publish(tmp_path, document)

    snapshot = repository(tmp_path).load()

    assert snapshot.get_current("project-one").card_id == "card/with space"  # type: ignore[union-attr]


def test_dot_card_id_is_encoded_as_a_safe_non_dot_segment(tmp_path: Path) -> None:
    document = card_document(card_id="..")
    path = publish(tmp_path, document)

    assert path.relative_to(tmp_path).parts[0] == "%2E%2E"
    assert repository(tmp_path).load().get_current("project-one") is not None


@pytest.mark.parametrize(
    ("encoded_id", "version", "expected_code"),
    [
        ("wrong-card-id", None, "card_id_path_mismatch"),
        (None, "01", "card_version_path_mismatch"),
    ],
)
def test_rejects_path_identity_mismatch(
    tmp_path: Path,
    encoded_id: str | None,
    version: str | None,
    expected_code: str,
) -> None:
    publish(tmp_path, card_document(), encoded_card_id=encoded_id, version_segment=version)

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path).load()

    assert expected_code in diagnostic_codes(caught.value)


def test_rejects_card_file_outside_accepted_layout(tmp_path: Path) -> None:
    path = tmp_path / "project-card.yaml"
    path.write_text(yaml.safe_dump(card_document()), encoding="utf-8")

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path).load()

    assert diagnostic_codes(caught.value) == {"invalid_layout"}


@pytest.mark.parametrize(
    ("content", "expected_code"),
    [
        ("not: [valid", "invalid_yaml"),
        ("!!python/object/apply:builtins.eval ['1 + 1']", "invalid_yaml"),
        ("card_id: one\ncard_id: two\n", "invalid_yaml"),
        ("value: &shared [one]\nalias: *shared\n", "invalid_yaml"),
    ],
)
def test_safe_yaml_rejects_malformed_or_python_tagged_documents(
    tmp_path: Path,
    content: str,
    expected_code: str,
) -> None:
    publish(tmp_path, card_document(), content=content)

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path).load()

    assert diagnostic_codes(caught.value) == {expected_code}


def test_enforces_file_size_before_validation(tmp_path: Path) -> None:
    publish(tmp_path, card_document(), content="x" * 101)

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path, limit=100).load()

    assert diagnostic_codes(caught.value) == {"file_too_large"}


def test_rejects_non_contiguous_version_lineage(tmp_path: Path) -> None:
    publish(tmp_path, card_document(card_version=1))
    publish(tmp_path, card_document(card_version=3))

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path).load()

    assert diagnostic_codes(caught.value) == {"invalid_version_lineage"}


def test_rejects_project_id_shared_by_card_lineages(tmp_path: Path) -> None:
    publish(tmp_path, card_document(card_id="card-one"))
    publish(tmp_path, card_document(card_id="card-two"))

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path).load()

    assert diagnostic_codes(caught.value) == {"duplicate_project_id"}


def test_load_is_all_or_nothing_when_one_card_is_invalid(tmp_path: Path) -> None:
    publish(tmp_path, card_document(card_id="card-one", project_id="project-one"))
    invalid = card_document(card_id="card-two", project_id="project-two")
    invalid["valid"] = False
    publish(tmp_path, invalid)

    with pytest.raises(CatalogLoadError) as caught:
        repository(tmp_path).load()

    assert diagnostic_codes(caught.value) == {"invalid_card"}


def test_repository_catalog_loads_all_published_validated_cards() -> None:
    snapshot = FilesystemCatalogRepository(
        root=DEFAULT_CATALOG_ROOT,
        validator=SkillCardValidator(),
        max_file_size_bytes=2 * 1024 * 1024,
    ).load()

    assert snapshot.card_count == 3
    assert snapshot.project_count == 3
    assert {card.project_id for card in snapshot.list_current()} == {
        "project-bio-xyz-bioagents",
        "project-eigent-ai-eigent",
        "project-snap-stanford-biomni",
    }


def test_snapshot_receives_normalized_document_and_card_id(tmp_path: Path) -> None:
    source = (
        DEFAULT_CATALOG_ROOT.parents[1]
        / "project-cards"
        / "bio-xyz--BioAgents"
        / "project-card.yaml"
    )
    document = yaml.safe_load(source.read_text(encoding="utf-8"))
    document["card_id"] = "card-\ud83d\ude80"
    publish(
        tmp_path,
        document,
        encoded_card_id=encode_card_id("card-\U0001F680"),
    )

    snapshot = FilesystemCatalogRepository(
        root=tmp_path,
        validator=SkillCardValidator(),
        max_file_size_bytes=2 * 1024 * 1024,
    ).load()
    card = snapshot.get_current("project-bio-xyz-bioagents")

    assert card is not None
    assert card.card_id == "card-\U0001F680"
    assert card.to_document()["card_id"] == "card-\U0001F680"


@pytest.mark.parametrize(
    ("generated", "published"),
    [
        (
            "project-cards/bio-xyz--BioAgents/project-card.yaml",
            "catalog/cards/card-bio-xyz-bioagents/versions/1/project-card.yaml",
        ),
        (
            "project-cards/eigent-ai--eigent/project-card.yaml",
            "catalog/cards/card-eigent-ai-eigent/versions/1/project-card.yaml",
        ),
        (
            "project-cards/snap-stanford--biomni/project-card.yaml",
            "catalog/cards/card-snap-stanford-biomni/versions/1/project-card.yaml",
        ),
    ],
)
def test_published_cards_preserve_generated_canonical_bytes(
    generated: str,
    published: str,
) -> None:
    repository_root = DEFAULT_CATALOG_ROOT.parents[1]

    assert (repository_root / generated).read_bytes() == (repository_root / published).read_bytes()
