"""Typed contracts for Agent Project Card generation."""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator


class GenerationFailureCode(StrEnum):
    """Stable failure categories for the analysis workflow."""

    invalid_request = "invalid_request"
    codex_error = "codex_error"
    codex_timeout = "codex_timeout"
    missing_output = "missing_output"
    output_too_large = "output_too_large"
    invalid_yaml = "invalid_yaml"
    validation_failed = "validation_failed"
    output_processing_error = "output_processing_error"


class ProjectCardAnalysisRequest(BaseModel):
    """One internal request to analyze a checked-out public GitHub repository."""

    model_config = ConfigDict(frozen=True)

    repository_url: AnyHttpUrl
    workspace: Path
    project_boundary: str = Field(min_length=1)
    source_revision: str | None = None
    analysis_depth: Literal["triage", "targeted", "deep"] = "targeted"

    @model_validator(mode="after")
    def validate_public_github_repository(self) -> "ProjectCardAnalysisRequest":
        """Constrain the first service slice to uncredentialed GitHub repository URLs."""
        url = self.repository_url
        if (
            url.scheme != "https"
            or url.host != "github.com"
            or url.username is not None
            or url.password is not None
            or url.port not in (None, 443)
            or url.query is not None
            or url.fragment is not None
        ):
            raise ValueError("repository_url must be a public https://github.com URL")
        segments = [segment for segment in (url.path or "").split("/") if segment]
        if len(segments) != 2:
            raise ValueError("repository_url must identify one GitHub owner/repository")
        return self


class AnalysisConfiguration(BaseModel):
    """Non-secret, traceable configuration for one generation attempt."""

    model_config = ConfigDict(frozen=True)

    analysis_mode: Literal["static"] = "static"
    analyzer_version: str = "agent-project-card-skill/0.1"
    skill_path: str
    codex_sdk_version: str
    model: str | None
    model_provider: str | None
    base_url: str | None
    wire_api: Literal["responses"]
    turn_timeout_seconds: int


class ProjectCardGenerationResult(BaseModel):
    """Validated draft card or a typed failure; raw model output is never canonical."""

    model_config = ConfigDict(frozen=True)

    status: Literal["succeeded", "failed"]
    analysis_configuration: AnalysisConfiguration
    codex_thread_id: str | None = None
    codex_turn_id: str | None = None
    card: dict[str, Any] | None = None
    card_id: str | None = None
    card_version: int | None = None
    schema_version: str | None = None
    failure_code: GenerationFailureCode | None = None
    failure_message: str | None = None
    validation_errors: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_status_shape(self) -> "ProjectCardGenerationResult":
        """Keep successful and failed result fields mutually coherent."""
        if self.status == "succeeded":
            required = (
                self.card,
                self.card_id,
                self.card_version,
                self.schema_version,
            )
            if any(value is None for value in required):
                raise ValueError("successful generation requires a validated card identity")
            if self.failure_code is not None or self.failure_message is not None:
                raise ValueError("successful generation cannot include failure details")
        else:
            if self.failure_code is None or self.failure_message is None:
                raise ValueError("failed generation requires typed failure details")
            if self.card is not None:
                raise ValueError("failed generation cannot include a canonical card")
        return self
