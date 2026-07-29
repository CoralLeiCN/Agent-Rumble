"""Typed application configuration."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import AnyHttpUrl, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CATALOG_ROOT = REPOSITORY_ROOT / "catalog" / "cards"


class Settings(BaseSettings):
    """Environment-backed settings for the Agent Rumble backend."""

    model_config = SettingsConfigDict(
        extra="ignore",
        frozen=True,
        populate_by_name=True,
    )

    api_prefix: str = Field(
        default="/api/v1",
        validation_alias="AGENT_RUMBLE_API_PREFIX",
    )
    catalog_root: Path = Field(
        default=DEFAULT_CATALOG_ROOT,
        validation_alias="AGENT_RUMBLE_CATALOG_ROOT",
    )
    catalog_max_file_size_bytes: int = Field(
        default=2 * 1024 * 1024,
        validation_alias="AGENT_RUMBLE_CATALOG_MAX_FILE_SIZE_BYTES",
    )
    development_cors_origins: tuple[str, ...] = Field(
        default=(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ),
        validation_alias="AGENT_RUMBLE_DEVELOPMENT_CORS_ORIGINS",
    )
    model: str | None = Field(default=None, validation_alias="CODEX_MODEL")
    model_provider: str | None = Field(
        default=None,
        validation_alias="CODEX_MODEL_PROVIDER",
    )
    model_provider_base_url: AnyHttpUrl | None = Field(
        default=None,
        validation_alias="CODEX_MODEL_PROVIDER_BASE_URL",
    )
    model_provider_wire_api: Literal["responses"] = Field(
        default="responses",
        validation_alias="CODEX_MODEL_PROVIDER_WIRE_API",
    )
    model_provider_env_key: str | None = Field(
        default=None,
        validation_alias="CODEX_MODEL_PROVIDER_ENV_KEY",
    )
    turn_timeout_seconds: int = Field(
        default=15 * 60,
        validation_alias="CODEX_TURN_TIMEOUT_SECONDS",
    )

    @field_validator("api_prefix")
    @classmethod
    def validate_api_prefix(cls, value: str) -> str:
        """Require a stable absolute prefix without a trailing slash."""
        if not value.startswith("/") or value == "/" or value.endswith("/"):
            raise ValueError("api_prefix must start with '/' and must not end with '/'")
        return value

    @field_validator("catalog_max_file_size_bytes")
    @classmethod
    def validate_max_file_size(cls, value: int) -> int:
        """Reject limits that would disable the catalog safety boundary."""
        if value <= 0:
            raise ValueError("catalog_max_file_size_bytes must be greater than zero")
        return value

    @field_validator("model", "model_provider")
    @classmethod
    def validate_optional_identifier(cls, value: str | None) -> str | None:
        """Reject empty model and provider identifiers."""
        if value is not None and not value.strip():
            raise ValueError("model and provider identifiers must not be empty")
        return value.strip() if value is not None else None

    @field_validator("model_provider_base_url")
    @classmethod
    def validate_model_provider_base_url(
        cls,
        value: AnyHttpUrl | None,
    ) -> AnyHttpUrl | None:
        """Prevent credentials and token-like URL parts from entering provenance."""
        if value is None:
            return None
        if (
            value.username is not None
            or value.password is not None
            or value.query is not None
            or value.fragment is not None
        ):
            raise ValueError(
                "model_provider_base_url must not contain credentials, "
                "a query, or a fragment"
            )
        return value

    @field_validator("model_provider_env_key")
    @classmethod
    def validate_model_provider_env_key(cls, value: str | None) -> str | None:
        """Keep a configured credential reference safe for Codex configuration."""
        if value is None:
            return None
        if not value.isidentifier() or not value.isupper():
            raise ValueError(
                "model_provider_env_key must be an uppercase environment variable name"
            )
        return value

    @field_validator("turn_timeout_seconds")
    @classmethod
    def validate_turn_timeout(cls, value: int) -> int:
        """Require a finite positive timeout for hosted Codex turns."""
        if value <= 0:
            raise ValueError("turn_timeout_seconds must be greater than zero")
        return value

    @model_validator(mode="after")
    def validate_model_provider_configuration(self) -> "Settings":
        """Keep named Codex providers distinct from the inline local endpoint."""
        if self.model_provider_base_url is not None and self.model_provider not in (
            None,
            "custom",
        ):
            raise ValueError(
                "model_provider_base_url cannot be combined with "
                "a different model_provider"
            )
        if self.model_provider_base_url is not None and self.model is None:
            raise ValueError(
                "model is required when model_provider_base_url is configured"
            )
        if (
            self.model_provider_env_key is not None
            and self.model_provider_base_url is None
        ):
            raise ValueError(
                "model_provider_env_key requires model_provider_base_url"
            )
        if self.model_provider_base_url is None and self.model_provider == "custom":
            raise ValueError(
                "custom is reserved for model_provider_base_url configuration"
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load ``.env`` values, then construct and cache application settings."""
    load_dotenv()
    return Settings()
