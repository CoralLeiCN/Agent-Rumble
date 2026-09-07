"""Generation must bind safe output to the authoritative static-analysis request."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest
import yaml
from agent_project_intelligence.analysis.codex_harness import CodexProjectCardHarness
from agent_project_intelligence.analysis.models import (
    GenerationFailureCode,
    ProjectCardAnalysisRequest,
)
from agent_project_intelligence.analysis.snapshot import SourceSnapshot
from agent_project_intelligence.config import REPOSITORY_ROOT, Settings
from openai_codex import ApprovalMode, SkillInput

VALID_CARD = (
    REPOSITORY_ROOT / "catalog/cards/card-openai-openai-agents-python/versions/1/project-card.yaml"
)
REVISION = "65886fa16dcdb482090b30b74de1d0cc80b9f4c6"


class FakeTurn:
    id = "turn-123"

    def __init__(self, response: str | None) -> None:
        self.final_response = response


class FakeCodex:
    id = "thread-123"

    def __init__(
        self, response: str | None, error: Exception | BaseException | None = None
    ) -> None:
        self.response = response
        self.error = error
        self.start_kwargs: dict[str, Any] = {}
        self.run_kwargs: dict[str, Any] = {}
        self.run_input: Any = None
        self.config: Any = None

    def __call__(self, config: Any) -> FakeCodex:
        self.config = config
        assert Path(config.cwd).is_dir()
        return self

    async def __aenter__(self) -> FakeCodex:
        return self

    async def __aexit__(self, *_args: Any) -> None:
        return None

    async def thread_start(self, **kwargs: Any) -> FakeCodex:
        self.start_kwargs = kwargs
        return self

    async def run(self, input: Any, **kwargs: Any) -> FakeTurn:
        self.run_input, self.run_kwargs = input, kwargs
        if self.error:
            raise self.error
        return FakeTurn(self.response)


@pytest.fixture(autouse=True)
def isolated_source(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("CODEX_CONFIG_HOME", str(tmp_path / "operator"))
    monkeypatch.setattr(
        "agent_project_intelligence.analysis.codex_harness.snapshot_repository",
        lambda workspace, revision: SourceSnapshot(
            revision or REVISION, {"README.md": "fixture"}, {}
        ),
    )


def request(workspace: Path, **overrides: Any) -> ProjectCardAnalysisRequest:
    return ProjectCardAnalysisRequest(
        **{
            "repository_url": "https://github.com/openai/openai-agents-python",
            "workspace": workspace,
            "project_boundary": "The openai-agents Python package",
            "source_revision": REVISION,
            **overrides,
        }
    )


def generate(
    tmp_path: Path,
    response: str | None = None,
    *,
    error: BaseException | None = None,
    settings: Settings | None = None,
    analysis_request: ProjectCardAnalysisRequest | None = None,
):
    client = FakeCodex(response, error)
    harness = CodexProjectCardHarness(
        settings=settings or Settings(model="test-model"), codex_factory=client
    )
    try:
        return asyncio.run(harness.generate(analysis_request or request(tmp_path))), client
    finally:
        if client.config:
            assert not Path(client.config.cwd).parent.exists()
        assert not list(tmp_path.glob(".agent-rumble-output-*"))


def test_valid_card_is_static_pinned_and_generated_outside_source(tmp_path: Path) -> None:
    result, client = generate(tmp_path, VALID_CARD.read_text())
    assert result.status == "succeeded", result
    assert result.card_id == "card-openai-openai-agents-python"
    assert result.codex_thread_id == client.id
    assert result.codex_turn_id == "turn-123"
    assert result.card is not None
    recorded = result.card["source_snapshot"]["analysis_configuration"]
    assert recorded["dynamic_analysis"] is False
    assert recorded["analysis_request"]["source_revision"] == REVISION
    assert recorded["generation_runtime"]["model"] == "test-model"
    assert recorded["generation_runtime"]["model_provider"] == "openai"
    assert (
        result.card["field_states"][
            "/source_snapshot/analysis_configuration/generation_runtime/base_url"
        ]
        == "unknown"
    )
    assert client.start_kwargs["approval_mode"] is ApprovalMode.deny_all
    # No broad SDK sandbox override may replace the named deny-read/write profile.
    assert "sandbox" not in client.start_kwargs
    assert "sandbox" not in client.run_kwargs
    assert 'permissions.static-analysis.filesystem./="deny"' in client.config.config_overrides
    assert not Path(client.config.cwd).is_relative_to(tmp_path)
    assert isinstance(client.run_input[0], SkillInput)
    assert client.run_input[0].name == "agent-project-card"


@pytest.mark.parametrize(
    ("output", "code"),
    [
        (None, GenerationFailureCode.missing_output),
        ("a: 1\na: 2", GenerationFailureCode.invalid_yaml),
        ("a: &a [*a]", GenerationFailureCode.invalid_yaml),
        ("[" * 600 + "]" * 600, GenerationFailureCode.invalid_yaml),
        ("unclosed: [", GenerationFailureCode.invalid_yaml),
        ("{}", GenerationFailureCode.validation_failed),
        ("x" * (2 * 1024 * 1024 + 1), GenerationFailureCode.output_too_large),
    ],
)
def test_bad_output_is_typed_and_cleaned(
    tmp_path: Path, output: str | None, code: GenerationFailureCode
) -> None:
    result, _ = generate(tmp_path, output)
    assert result.failure_code is code
    assert result.card is None


@pytest.mark.parametrize(
    ("group", "field", "value"),
    [
        ("configuration", "dynamic_analysis", True),
        ("configuration", "dynamic_analysis", "false"),
        ("claims", "verification_status", "runtime_verified"),
        ("capabilities", "support_status", "runtime_verified"),
    ],
)
def test_model_cannot_expand_static_policy(
    tmp_path: Path, group: str, field: str, value: Any
) -> None:
    card = yaml.safe_load(VALID_CARD.read_text())
    target = (
        card["source_snapshot"]["analysis_configuration"]
        if group == "configuration"
        else card[group][0]
    )
    target[field] = value
    result, _ = generate(tmp_path, yaml.safe_dump(json.loads(json.dumps(card))))
    assert result.failure_code is GenerationFailureCode.validation_failed
    assert any(field in error for error in result.validation_errors)


def test_missing_dynamic_flag_is_recorded_as_false(tmp_path: Path) -> None:
    card = yaml.safe_load(VALID_CARD.read_text())
    del card["source_snapshot"]["analysis_configuration"]["dynamic_analysis"]
    result, _ = generate(tmp_path, yaml.safe_dump(json.loads(json.dumps(card))))
    assert result.status == "succeeded"
    assert result.card["source_snapshot"]["analysis_configuration"]["dynamic_analysis"] is False


@pytest.mark.parametrize("wrong", ["repository", "revision", "supporting-revision"])
def test_repository_and_commit_must_match_the_same_source(tmp_path: Path, wrong: str) -> None:
    card = yaml.safe_load(VALID_CARD.read_text())
    analysis_request = request(tmp_path)
    if wrong == "repository":
        analysis_request = request(
            tmp_path, repository_url="https://github.com/openai/different-project"
        )
    else:
        card["source_snapshot"]["source_revisions"][0]["commit"] = "0" * 40
        if wrong == "supporting-revision":
            source_id = "supporting-source"
            card["project"]["repositories"].append(
                {
                    **card["project"]["repositories"][0],
                    "source_id": source_id,
                    "url": "https://github.com/example/supporting",
                }
            )
            card["sources"].append({**card["sources"][0], "source_id": source_id})
            card["source_snapshot"]["source_revisions"].append(
                {
                    **card["source_snapshot"]["source_revisions"][0],
                    "source_id": source_id,
                    "commit": REVISION,
                }
            )
    if wrong == "supporting-revision":
        card["field_states"]["/source_snapshot/source_revisions/1/tag"] = "unknown"
    result, _ = generate(
        tmp_path, yaml.safe_dump(json.loads(json.dumps(card))), analysis_request=analysis_request
    )
    assert result.failure_code is GenerationFailureCode.validation_failed
    assert any("matches" in error for error in result.validation_errors), result.validation_errors


@pytest.mark.parametrize(
    "error", [RuntimeError("secret provider token"), TimeoutError(), asyncio.CancelledError()]
)
def test_runtime_failure_cleans_private_output(tmp_path: Path, error: BaseException) -> None:
    if isinstance(error, asyncio.CancelledError):
        with pytest.raises(asyncio.CancelledError):
            generate(tmp_path, error=error)
    else:
        result, _ = generate(tmp_path, error=error)
        assert result.failure_code is (
            GenerationFailureCode.codex_timeout
            if isinstance(error, TimeoutError)
            else GenerationFailureCode.codex_error
        )
        assert "secret" not in result.failure_message


def test_local_provider_is_configured_and_recorded(tmp_path: Path) -> None:
    result, client = generate(
        tmp_path,
        VALID_CARD.read_text(),
        settings=Settings(
            model="qwen-coder",
            model_provider_base_url="http://localhost:11434/v1",
            model_provider_env_key="LOCAL_MODEL_API_KEY",
        ),
    )
    assert result.status == "succeeded"
    assert result.analysis_configuration.model_provider == "custom"
    assert result.analysis_configuration.base_url == "http://localhost:11434/v1"
    assert 'model_providers.custom.env_key="LOCAL_MODEL_API_KEY"' in client.config.config_overrides


def test_named_provider_is_imported_without_user_tools(tmp_path: Path) -> None:
    operator = tmp_path / "operator"
    operator.mkdir()
    (operator / "config.toml").write_text(
        'model="qwen-coder"\nmodel_provider="ollama"\n'
        '[model_providers.ollama]\nname="Ollama"\nbase_url="http://localhost:11434/v1"\n'
        '[mcp_servers.untrusted]\ncommand="should-never-run"\n'
    )
    result, client = generate(tmp_path, VALID_CARD.read_text(), settings=Settings())
    assert result.status == "succeeded", result
    assert result.analysis_configuration.model_provider == "ollama"
    assert result.analysis_configuration.model == "qwen-coder"
    assert "untrusted" not in json.dumps(client.config.config_overrides)
