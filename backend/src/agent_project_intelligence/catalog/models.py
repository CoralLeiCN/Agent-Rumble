"""Immutable catalog value objects."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Any


def freeze_value(value: Any) -> Any:
    """Recursively freeze JSON-compatible card data."""
    if isinstance(value, dict):
        return MappingProxyType({key: freeze_value(child) for key, child in value.items()})
    if isinstance(value, list):
        return tuple(freeze_value(child) for child in value)
    return value


def thaw_value(value: Any) -> Any:
    """Return an exact mutable JSON-compatible copy of frozen card data."""
    if isinstance(value, Mapping):
        return {key: thaw_value(child) for key, child in value.items()}
    if isinstance(value, tuple):
        return [thaw_value(child) for child in value]
    return value


@dataclass(frozen=True, slots=True)
class CatalogCard:
    """One validated, immutable canonical card version."""

    card_id: str
    card_version: int
    project_id: str
    schema_version: str
    document: Mapping[str, Any]
    source_path: Path
    content_sha256: str

    def to_document(self) -> dict[str, Any]:
        """Copy canonical data into response-ready built-in containers."""
        return thaw_value(self.document)


class CatalogSnapshot:
    """An immutable, disposable view built from one complete catalog load."""

    __slots__ = ("_by_project", "_cards", "_current", "_project_to_card_id")

    def __init__(self, cards: tuple[CatalogCard, ...]) -> None:
        by_project: dict[str, dict[int, CatalogCard]] = {}
        project_to_card_id: dict[str, str] = {}
        for card in cards:
            by_project.setdefault(card.project_id, {})[card.card_version] = card
            project_to_card_id[card.project_id] = card.card_id

        frozen_by_project = {
            project_id: MappingProxyType(dict(sorted(versions.items())))
            for project_id, versions in by_project.items()
        }
        self._by_project = MappingProxyType(frozen_by_project)
        self._project_to_card_id = MappingProxyType(project_to_card_id)
        self._cards = tuple(sorted(cards, key=lambda card: (card.project_id, card.card_version)))
        self._current = tuple(
            versions[max(versions)]
            for _, versions in sorted(self._by_project.items())
        )

    @property
    def card_count(self) -> int:
        """Return the number of retained card versions."""
        return len(self._cards)

    @property
    def project_count(self) -> int:
        """Return the number of distinct projects."""
        return len(self._by_project)

    @property
    def cards(self) -> tuple[CatalogCard, ...]:
        """Return all retained versions in deterministic order."""
        return self._cards

    def list_current(self) -> tuple[CatalogCard, ...]:
        """Return the greatest retained card version for every project."""
        return self._current

    def get_current(self, project_id: str) -> CatalogCard | None:
        """Return the greatest retained version for a project."""
        versions = self._by_project.get(project_id)
        if not versions:
            return None
        return versions[max(versions)]

    def get(self, project_id: str, card_version: int) -> CatalogCard | None:
        """Return a pinned card version for a project."""
        versions = self._by_project.get(project_id)
        return versions.get(card_version) if versions else None

    def versions(self, project_id: str) -> tuple[int, ...]:
        """Return retained versions for a project in ascending order."""
        versions = self._by_project.get(project_id)
        return tuple(versions) if versions else ()

    def card_id_for(self, project_id: str) -> str | None:
        """Return the stable card lineage identifier for a project."""
        return self._project_to_card_id.get(project_id)
