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
    assert settings.model is None
    assert settings.model_provider is None
    assert settings.model_provider_base_url is None
    assert settings.model_provider_wire_api == "responses"
    assert settings.model_provider_env_key is None
    assert settings.turn_timeout_seconds == 15 * 60


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


def test_settings_load_one_direct_codex_model_group(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CODEX_MODEL", "qwen-coder")
    monkeypatch.setenv(
        "CODEX_MODEL_PROVIDER_BASE_URL",
        "http://localhost:30000/v1",
    )
    monkeypatch.setenv(
        "CODEX_MODEL_PROVIDER_ENV_KEY",
        "SGLANG_API_KEY",
    )

    settings = config.Settings()

    assert settings.model == "qwen-coder"
    assert (
        str(settings.model_provider_base_url).rstrip("/")
        == "http://localhost:30000/v1"
    )
    assert settings.model_provider_wire_api == "responses"
    assert settings.model_provider_env_key == "SGLANG_API_KEY"


def test_settings_do_not_load_superseded_agent_rumble_model_names(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENT_RUMBLE_MODEL", "superseded-model")
    monkeypatch.setenv("AGENT_RUMBLE_MODEL_PROVIDER", "superseded-provider")

    settings = config.Settings()

    assert settings.model is None
    assert settings.model_provider is None


def test_settings_require_model_for_custom_base_url() -> None:
    with pytest.raises(ValidationError):
        config.Settings(model_provider_base_url="http://localhost:30000/v1")


@pytest.mark.parametrize(
    "url",
    [
        "https://user:secret@example.com/v1",
        "https://example.com/v1?token=secret",
        "https://example.com/v1#secret",
    ],
)
def test_settings_reject_secret_bearing_model_provider_base_urls(url: str) -> None:
    with pytest.raises(ValidationError, match="model_provider_base_url"):
        config.Settings(model="local-model", model_provider_base_url=url)


def test_settings_reserve_inline_provider_name_for_custom_base_url() -> None:
    with pytest.raises(ValidationError, match="custom"):
        config.Settings(model="local-model", model_provider="custom")
