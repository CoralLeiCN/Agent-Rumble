"""Typed application configuration."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CATALOG_ROOT = REPOSITORY_ROOT / "catalog" / "cards"


class Settings(BaseSettings):
    """Environment-backed settings for the Agent Rumble backend."""

    model_config = SettingsConfigDict(
        env_prefix="AGENT_RUMBLE_",
        extra="ignore",
        frozen=True,
    )

    api_prefix: str = "/api/v1"
    catalog_root: Path = DEFAULT_CATALOG_ROOT
    catalog_max_file_size_bytes: int = 2 * 1024 * 1024
    development_cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load ``.env`` values, then construct and cache application settings."""
    load_dotenv()
    return Settings()
