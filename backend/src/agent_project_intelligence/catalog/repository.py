"""Filesystem adapter for the versioned YAML-first card catalog."""

from __future__ import annotations

import hashlib
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol
from urllib.parse import quote

import yaml
from yaml.events import AliasEvent
from yaml.nodes import MappingNode

from agent_project_intelligence.catalog.models import CatalogCard, CatalogSnapshot, freeze_value
from agent_project_intelligence.catalog.validation import CardValidationError, CardValidator


class _CatalogSafeLoader(yaml.SafeLoader):
    """Safe YAML loader that rejects aliases and ambiguous duplicate keys."""

    def compose_node(self, parent: Any, index: Any) -> Any:
        if self.check_event(AliasEvent):
            event = self.peek_event()
            raise yaml.constructor.ConstructorError(
                None,
                None,
                "YAML aliases are not allowed in canonical catalog cards",
                event.start_mark,
            )
        return super().compose_node(parent, index)

    def construct_mapping(self, node: MappingNode, deep: bool = False) -> dict[Any, Any]:
        if not isinstance(node, MappingNode):
            raise yaml.constructor.ConstructorError(
                None,
                None,
                f"expected a mapping node, but found {node.id}",
                node.start_mark,
            )
        self.flatten_mapping(node)
        mapping: dict[Any, Any] = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            try:
                duplicate = key in mapping
            except TypeError as exc:
                raise yaml.constructor.ConstructorError(
                    "while constructing a mapping",
                    node.start_mark,
                    "found an unhashable key",
                    key_node.start_mark,
                ) from exc
            if duplicate:
                raise yaml.constructor.ConstructorError(
                    "while constructing a mapping",
                    node.start_mark,
                    f"found duplicate key {key!r}",
                    key_node.start_mark,
                )
            mapping[key] = self.construct_object(value_node, deep=deep)
        return mapping


def encode_card_id(card_id: str) -> str:
    """Encode a card ID as one canonical, non-dot filesystem segment."""
    encoded = quote(card_id, safe="")
    if encoded in {".", ".."}:
        return encoded.replace(".", "%2E")
    return encoded


class CatalogRepository(Protocol):
    """Build a complete disposable snapshot from a canonical card store."""

    def load(self) -> CatalogSnapshot:
        """Return a new all-or-nothing catalog snapshot."""
        ...


@dataclass(frozen=True, slots=True)
class CatalogDiagnostic:
    """One typed catalog-load finding."""

    code: str
    path: Path
    message: str


class CatalogConfigurationError(ValueError):
    """The configured catalog root cannot represent a valid store."""


class CatalogLoadError(ValueError):
    """One or more artifacts made the complete catalog invalid."""

    def __init__(self, diagnostics: tuple[CatalogDiagnostic, ...]) -> None:
        self.diagnostics = diagnostics
        summary = "; ".join(
            f"{item.code} at {item.path}: {item.message}" for item in diagnostics
        )
        super().__init__(summary)


class FilesystemCatalogRepository:
    """Load canonical YAML cards from the accepted versioned path layout."""

    def __init__(
        self,
        *,
        root: Path,
        validator: CardValidator,
        max_file_size_bytes: int,
    ) -> None:
        if max_file_size_bytes <= 0:
            raise CatalogConfigurationError("max_file_size_bytes must be greater than zero")
        self._root = root
        self._validator = validator
        self._max_file_size_bytes = max_file_size_bytes

    def load(self) -> CatalogSnapshot:
        """Validate every artifact before exposing any card."""
        root = self._resolve_root()
        diagnostics: list[CatalogDiagnostic] = []
        cards: list[CatalogCard] = []

        for path in sorted(root.rglob("project-card.yaml")):
            card = self._load_artifact(root, path, diagnostics)
            if card is not None:
                cards.append(card)

        diagnostics.extend(self._lineage_diagnostics(cards))
        if diagnostics:
            raise CatalogLoadError(tuple(sorted(diagnostics, key=self._diagnostic_key)))
        return CatalogSnapshot(tuple(cards))

    def _resolve_root(self) -> Path:
        try:
            root = self._root.expanduser().resolve(strict=True)
        except OSError as exc:
            raise CatalogConfigurationError(
                f"catalog root does not exist or cannot be resolved: {self._root}"
            ) from exc
        if not root.is_dir():
            raise CatalogConfigurationError(f"catalog root is not a directory: {root}")
        return root

    def _load_artifact(
        self,
        root: Path,
        path: Path,
        diagnostics: list[CatalogDiagnostic],
    ) -> CatalogCard | None:
        relative = path.relative_to(root)
        if len(relative.parts) != 4 or relative.parts[1] != "versions":
            diagnostics.append(
                CatalogDiagnostic(
                    "invalid_layout",
                    path,
                    "expected {encoded_card_id}/versions/{card_version}/project-card.yaml",
                )
            )
            return None

        encoded_card_id, _, version_segment, filename = relative.parts
        if filename != "project-card.yaml":  # Kept explicit for contract readability.
            return None
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != root):
            diagnostics.append(
                CatalogDiagnostic("unsafe_path", path, "catalog artifacts may not use symlinks")
            )
            return None
        try:
            resolved_path = path.resolve(strict=True)
        except OSError as exc:
            diagnostics.append(CatalogDiagnostic("unreadable_file", path, str(exc)))
            return None
        if not resolved_path.is_relative_to(root):
            diagnostics.append(
                CatalogDiagnostic("unsafe_path", path, "artifact resolves outside the catalog root")
            )
            return None

        try:
            stat_size = resolved_path.stat().st_size
            if stat_size > self._max_file_size_bytes:
                diagnostics.append(
                    CatalogDiagnostic(
                        "file_too_large",
                        path,
                        f"{stat_size} bytes exceeds limit {self._max_file_size_bytes}",
                    )
                )
                return None
            raw = resolved_path.read_bytes()
        except OSError as exc:
            diagnostics.append(CatalogDiagnostic("unreadable_file", path, str(exc)))
            return None
        if len(raw) > self._max_file_size_bytes:
            diagnostics.append(
                CatalogDiagnostic(
                    "file_too_large",
                    path,
                    f"{len(raw)} bytes exceeds limit {self._max_file_size_bytes}",
                )
            )
            return None

        try:
            document: Any = yaml.load(raw.decode("utf-8"), Loader=_CatalogSafeLoader)
        except (UnicodeDecodeError, yaml.YAMLError) as exc:
            diagnostics.append(CatalogDiagnostic("invalid_yaml", path, str(exc)))
            return None
        try:
            validated = self._validator.validate(document)
        except CardValidationError as exc:
            diagnostics.extend(
                CatalogDiagnostic("invalid_card", path, error) for error in exc.errors
            )
            return None

        expected_encoded_id = encode_card_id(validated.card_id)
        if encoded_card_id != expected_encoded_id:
            diagnostics.append(
                CatalogDiagnostic(
                    "card_id_path_mismatch",
                    path,
                    f"path segment must be canonical encoding {expected_encoded_id!r}",
                )
            )
            return None
        if version_segment != str(validated.card_version):
            diagnostics.append(
                CatalogDiagnostic(
                    "card_version_path_mismatch",
                    path,
                    f"path version must equal canonical version {validated.card_version}",
                )
            )
            return None

        frozen_document = freeze_value(validated.document)
        return CatalogCard(
            card_id=validated.card_id,
            card_version=validated.card_version,
            project_id=validated.project_id,
            schema_version=validated.schema_version,
            document=frozen_document,
            source_path=resolved_path,
            content_sha256=hashlib.sha256(raw).hexdigest(),
        )

    @staticmethod
    def _lineage_diagnostics(cards: list[CatalogCard]) -> list[CatalogDiagnostic]:
        diagnostics: list[CatalogDiagnostic] = []
        by_card_id: dict[str, list[CatalogCard]] = defaultdict(list)
        card_id_by_project: dict[str, str] = {}
        seen_versions: set[tuple[str, int]] = set()

        for card in cards:
            key = (card.card_id, card.card_version)
            if key in seen_versions:
                diagnostics.append(
                    CatalogDiagnostic(
                        "duplicate_card_version",
                        card.source_path,
                        f"duplicate {card.card_id!r} version {card.card_version}",
                    )
                )
            seen_versions.add(key)
            by_card_id[card.card_id].append(card)

            previous_card_id = card_id_by_project.setdefault(card.project_id, card.card_id)
            if previous_card_id != card.card_id:
                diagnostics.append(
                    CatalogDiagnostic(
                        "duplicate_project_id",
                        card.source_path,
                        f"project_id {card.project_id!r} belongs to multiple card lineages",
                    )
                )

        for card_id, lineage in by_card_id.items():
            project_ids = {card.project_id for card in lineage}
            if len(project_ids) != 1:
                diagnostics.append(
                    CatalogDiagnostic(
                        "inconsistent_project_id",
                        lineage[-1].source_path,
                        f"card lineage {card_id!r} changes project_id",
                    )
                )
            versions = sorted(card.card_version for card in lineage)
            expected = list(range(1, versions[-1] + 1))
            if versions != expected:
                diagnostics.append(
                    CatalogDiagnostic(
                        "invalid_version_lineage",
                        lineage[-1].source_path,
                        f"retained versions must be contiguous from 1; found {versions}",
                    )
                )
        return diagnostics

    @staticmethod
    def _diagnostic_key(diagnostic: CatalogDiagnostic) -> tuple[str, str, str]:
        return (str(diagnostic.path), diagnostic.code, diagnostic.message)
