"""Adapter over the repository-local Agent Project Card validator."""

from __future__ import annotations

import importlib.util
import json
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any, Protocol


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SKILL_ROOT = (
    REPOSITORY_ROOT / "plugins" / "agent-project-card" / "skills" / "agent-project-card"
)
DEFAULT_SCHEMA_PATH = DEFAULT_SKILL_ROOT / "references" / "project-card.schema.json"
DEFAULT_VALIDATOR_PATH = DEFAULT_SKILL_ROOT / "scripts" / "validate_project_card.py"


@dataclass(frozen=True, slots=True)
class ValidatedCard:
    """Identity extracted only after the canonical document passes validation."""

    document: dict[str, Any]
    card_id: str
    card_version: int
    project_id: str
    schema_version: str


class CardValidator(Protocol):
    """Validate one already parsed canonical card document."""

    def validate(self, document: Any) -> ValidatedCard:
        """Return validated identity or raise ``CardValidationError``."""
        ...


class CardValidationError(ValueError):
    """A deterministic set of canonical-card validation findings."""

    def __init__(self, errors: tuple[str, ...]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def _load_validator_module(path: Path) -> ModuleType:
    """Load the skill's executable rules without maintaining a second copy."""
    spec = importlib.util.spec_from_file_location("_agent_project_card_validator", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to import Agent Project Card validator at {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SkillCardValidator:
    """Apply the skill's bundled JSON Schema and semantic validation rules."""

    def __init__(
        self,
        *,
        schema_path: Path = DEFAULT_SCHEMA_PATH,
        validator_path: Path = DEFAULT_VALIDATOR_PATH,
    ) -> None:
        try:
            schema_document = json.loads(schema_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise RuntimeError(f"Unable to load Agent Project Card schema at {schema_path}") from exc
        if not isinstance(schema_document, dict):
            raise RuntimeError(f"Agent Project Card schema is not an object: {schema_path}")

        self._schema = schema_document
        self._validator = _load_validator_module(validator_path)

    def validate(self, document: Any) -> ValidatedCard:
        """Validate with the repository-local executable contract."""
        errors = self._validator.schema_errors(document, self._schema)
        if not errors and isinstance(document, dict):
            errors.extend(self._validator.semantic_errors(document))
        else:
            _, unicode_errors = self._validator.normalize_unicode_scalars(document)
            errors.extend(unicode_errors)
        if errors:
            raise CardValidationError(tuple(sorted(errors)))
        if not isinstance(document, dict):  # Defensive: the schema should have rejected it.
            raise CardValidationError(("/: canonical card must be an object",))

        normalized_document, normalization_errors = self._validator.normalize_unicode_scalars(
            document
        )
        if normalization_errors:  # Defensive parity with semantic validation.
            raise CardValidationError(tuple(sorted(normalization_errors)))
        if not isinstance(normalized_document, dict):
            raise CardValidationError(("/: canonical card must be an object",))

        project = normalized_document["project"]
        if not isinstance(project, Mapping):  # Defensive parity with the schema.
            raise CardValidationError(("/project: canonical card project must be an object",))
        return ValidatedCard(
            document=normalized_document,
            card_id=normalized_document["card_id"],
            card_version=normalized_document["card_version"],
            project_id=project["project_id"],
            schema_version=normalized_document["schema_version"],
        )
