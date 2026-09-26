"""Version history, concurrency, and atomic visibility for publication."""

import copy
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
import yaml
from agent_project_intelligence.catalog import FilesystemCatalogRepository, SkillCardValidator
from agent_project_intelligence.catalog.publication import CardPublisher


def example_card():
    path = Path(__file__).parents[3] / "catalog/cards"
    return yaml.safe_load(next(path.glob("*/versions/1/project-card.yaml")).read_text())


def test_publication_preserves_history_and_is_idempotent(tmp_path):
    root = tmp_path / "catalog"
    publisher = CardPublisher(root)
    card = example_card()
    first, _ = publisher.publish(card)
    original = first.read_bytes()
    assert publisher.publish(card) == (first, [])
    changed = copy.deepcopy(card)
    changed["summary"]["one_line"] += " Updated assessment."
    second, paths = publisher.publish(changed)
    assert "/summary/one_line" in paths
    assert first.read_bytes() == original
    assert yaml.safe_load(second.read_text())["card_version"] == 2
    loaded = FilesystemCatalogRepository(
        root=root, validator=SkillCardValidator(), max_file_size_bytes=2**21
    ).load()
    assert loaded.versions(card["project"]["project_id"]) == (1, 2)
    assert publisher.publish(changed)[0] == second


def test_concurrent_writers_allocate_contiguous_versions(tmp_path):
    publisher = CardPublisher(tmp_path / "catalog")
    first = example_card()
    second = copy.deepcopy(first)
    second["summary"]["one_line"] += " Second version."
    with ThreadPoolExecutor(max_workers=2) as pool:
        paths = list(pool.map(lambda card: publisher.publish(card)[0], [first, second]))
    assert {path.parent.name for path in paths} == {"1", "2"}


def test_invalid_cards_and_version_reuse_cannot_replace_history(tmp_path):
    publisher = CardPublisher(tmp_path / "catalog")
    card = example_card()
    first, _ = publisher.publish(card)
    original = first.read_bytes()
    card["summary"]["one_line"] += " Changed content."
    with pytest.raises(ValueError, match="immutable card version"):
        publisher.publish(card, assign_version=False)
    del card["claims"]
    with pytest.raises(ValueError):
        publisher.publish(card)
    assert first.read_bytes() == original


def test_symlink_cannot_redirect_publication(tmp_path):
    card = example_card()
    root = tmp_path / "catalog"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    from agent_project_intelligence.catalog.repository import encode_card_id

    (root / encode_card_id(card["card_id"])).symlink_to(outside, target_is_directory=True)
    with pytest.raises(ValueError, match="symlink"):
        CardPublisher(root).publish(card)
    assert list(outside.iterdir()) == []
