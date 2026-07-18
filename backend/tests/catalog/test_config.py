"""Tests for typed backend settings."""

from pathlib import Path

import pytest
from pydantic import ValidationError

import agent_project_intelligence.config as config


def test_settings_have_repository_catalog_defaults() -> None:
    settings = config.Settings()

    assert settings.api_prefix == "/api/v1"
    assert settings.catalog_root == config.REPOSITORY_ROOT / "catalog" / "cards"
    assert settings.catalog_max_file_size_bytes > 0
    assert settings.development_cors_origins == (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )


def test_get_settings_loads_dotenv_before_construction(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls: list[str] = []

    def load_test_dotenv() -> bool:
        calls.append("dotenv")
        monkeypatch.setenv("AGENT_RUMBLE_CATALOG_ROOT", str(tmp_path))
        return True

    monkeypatch.setattr(config, "load_dotenv", load_test_dotenv)
    config.get_settings.cache_clear()
    try:
        settings = config.get_settings()
    finally:
        config.get_settings.cache_clear()

    assert calls == ["dotenv"]
    assert settings.catalog_root == tmp_path


@pytest.mark.parametrize("prefix", ["api/v1", "/", "/api/v1/"])
def test_settings_reject_invalid_api_prefix(prefix: str) -> None:
    with pytest.raises(ValidationError):
        config.Settings(api_prefix=prefix)


def test_settings_reject_non_positive_file_limit() -> None:
    with pytest.raises(ValidationError):
        config.Settings(catalog_max_file_size_bytes=0)
