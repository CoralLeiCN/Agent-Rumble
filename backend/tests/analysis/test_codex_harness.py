"""Tests for the direct Python Codex SDK harness."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest
from openai_codex import ApprovalMode, Sandbox, SkillInput

from agent_project_intelligence.analysis.codex_harness import CodexProjectCardHarness
from agent_project_intelligence.analysis.models import (
    GenerationFailureCode,
    ProjectCardAnalysisRequest,
)
from agent_project_intelligence.config import REPOSITORY_ROOT, Settings


VALID_CARD = (
    REPOSITORY_ROOT
    / "catalog"
    / "cards"
    / "card-openai-openai-agents-python"
    / "versions"
    / "1"
    / "project-card.yaml"
)


class FakeTurnResult:
    id = "turn-123"
    final_response = "Created and validated project-card.yaml."


class FakeThread:
    id = "thread-123"

    def __init__(
        self,
        *,
        workspace: Path,
        write_card: bool = True,
        cancel: bool = False,
    ) -> None:
        self.workspace = workspace
        self.write_card = write_card
        self.cancel = cancel
        self.run_input: Any = None
        self.run_kwargs: dict[str, Any] = {}

    async def run(self, input: Any, **kwargs: Any) -> FakeTurnResult:
        self.run_input = input
        self.run_kwargs = kwargs
        if self.cancel:
            raise asyncio.CancelledError
        if self.write_card:
            prompt = input[1].text
            request_start = prompt.index("{")
            request_end = prompt.index("\n}", request_start) + 2
            request_data = json.loads(prompt[request_start:request_end])
            Path(request_data["output_path"]).write_bytes(VALID_CARD.read_bytes())
        return FakeTurnResult()


class FakeCodex:
    def __init__(self, thread: FakeThread) -> None:
        self.thread = thread
        self.start_kwargs: dict[str, Any] = {}

    async def __aenter__(self) -> "FakeCodex":
        return self

    async def __aexit__(self, *_args: Any) -> None:
        return None

    async def thread_start(self, **kwargs: Any) -> FakeThread:
        self.start_kwargs = kwargs
        return self.thread


class FakeCodexFactory:
    def __init__(self, client: FakeCodex) -> None:
        self.client = client
        self.config = None

    def __call__(self, config: Any) -> FakeCodex:
        self.config = config
        return self.client


def analysis_request(workspace: Path) -> ProjectCardAnalysisRequest:
    return ProjectCardAnalysisRequest(
        repository_url="https://github.com/openai/openai-agents-python",
        workspace=workspace,
        project_boundary="The openai-agents Python package",
        source_revision="65886fa16dcdb482090b30b74de1d0cc80b9f4c6",
    )


def test_codex_harness_attaches_skill_and_validates_output(tmp_path: Path) -> None:
    asyncio.run(_codex_harness_attaches_skill_and_validates_output(tmp_path))


async def _codex_harness_attaches_skill_and_validates_output(
    tmp_path: Path,
) -> None:
    thread = FakeThread(workspace=tmp_path)
    client = FakeCodex(thread)
    factory = FakeCodexFactory(client)
    harness = CodexProjectCardHarness(
        settings=Settings(model="codex-model"),
        codex_factory=factory,
    )

    result = await harness.generate(analysis_request(tmp_path))

    assert result.status == "succeeded"
    assert result.card_id == "card-openai-openai-agents-python"
    assert result.codex_thread_id == "thread-123"
    assert result.codex_turn_id == "turn-123"
    assert result.card is not None
    recorded = result.card["source_snapshot"]["analysis_configuration"]
    assert recorded["analysis_request"] == {
        "repository_url": "https://github.com/openai/openai-agents-python",
        "project_boundary": "The openai-agents Python package",
        "analysis_depth": "targeted",
        "source_revision": "65886fa16dcdb482090b30b74de1d0cc80b9f4c6",
    }
    assert recorded["generation_runtime"]["runtime"] == "codex"
    assert recorded["generation_runtime"]["model"] == "codex-model"
    assert recorded["generation_runtime"]["model_provider"] is None
    assert recorded["generation_runtime"]["base_url"] is None
    assert (
        result.card["field_states"][
            "/source_snapshot/analysis_configuration/generation_runtime/"
            "model_provider"
        ]
        == "unknown"
    )
    assert (
        result.card["field_states"][
            "/source_snapshot/analysis_configuration/generation_runtime/"
            "base_url"
        ]
        == "unknown"
    )
    assert client.start_kwargs["approval_mode"] is ApprovalMode.deny_all
    assert client.start_kwargs["sandbox"] is Sandbox.workspace_write
    assert client.start_kwargs["model"] == "codex-model"
    assert isinstance(thread.run_input[0], SkillInput)
    assert thread.run_input[0].name == "agent-project-card"
    assert factory.config.cwd == str(tmp_path)
    assert not list(tmp_path.glob(".agent-rumble-output-*"))


def test_codex_harness_returns_typed_missing_output(tmp_path: Path) -> None:
    asyncio.run(_codex_harness_returns_typed_missing_output(tmp_path))


async def _codex_harness_returns_typed_missing_output(tmp_path: Path) -> None:
    thread = FakeThread(workspace=tmp_path, write_card=False)
    harness = CodexProjectCardHarness(
        settings=Settings(),
        codex_factory=FakeCodexFactory(FakeCodex(thread)),
    )

    result = await harness.generate(analysis_request(tmp_path))

    assert result.status == "failed"
    assert result.failure_code is GenerationFailureCode.missing_output
    assert result.card is None
    assert not list(tmp_path.glob(".agent-rumble-output-*"))


def test_codex_harness_rejects_card_for_wrong_revision(tmp_path: Path) -> None:
    asyncio.run(_codex_harness_rejects_card_for_wrong_revision(tmp_path))


async def _codex_harness_rejects_card_for_wrong_revision(tmp_path: Path) -> None:
    thread = FakeThread(workspace=tmp_path)
    harness = CodexProjectCardHarness(
        settings=Settings(),
        codex_factory=FakeCodexFactory(FakeCodex(thread)),
    )
    request = ProjectCardAnalysisRequest(
        repository_url="https://github.com/openai/openai-agents-python",
        workspace=tmp_path,
        project_boundary="The openai-agents Python package",
        source_revision="0123456789abcdef",
    )

    result = await harness.generate(request)

    assert result.status == "failed"
    assert result.failure_code is GenerationFailureCode.validation_failed
    assert result.validation_errors == (
        "/source_snapshot/source_revisions: no commit matches "
        "the requested source revision",
    )
    assert not list(tmp_path.glob(".agent-rumble-output-*"))


def test_codex_harness_rejects_card_for_wrong_repository(tmp_path: Path) -> None:
    asyncio.run(_codex_harness_rejects_card_for_wrong_repository(tmp_path))


async def _codex_harness_rejects_card_for_wrong_repository(tmp_path: Path) -> None:
    thread = FakeThread(workspace=tmp_path)
    harness = CodexProjectCardHarness(
        settings=Settings(),
        codex_factory=FakeCodexFactory(FakeCodex(thread)),
    )
    request = ProjectCardAnalysisRequest(
        repository_url="https://github.com/openai/different-project",
        workspace=tmp_path,
        project_boundary="A different project",
        source_revision="65886fa16dcdb482090b30b74de1d0cc80b9f4c6",
    )

    result = await harness.generate(request)

    assert result.status == "failed"
    assert result.failure_code is GenerationFailureCode.validation_failed
    assert result.validation_errors == (
        "/project/repositories: no repository URL matches the analysis request",
    )
    assert not list(tmp_path.glob(".agent-rumble-output-*"))


def test_codex_harness_cleans_output_when_cancelled(tmp_path: Path) -> None:
    thread = FakeThread(workspace=tmp_path, cancel=True)
    harness = CodexProjectCardHarness(
        settings=Settings(),
        codex_factory=FakeCodexFactory(FakeCodex(thread)),
    )

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(harness.generate(analysis_request(tmp_path)))

    assert not list(tmp_path.glob(".agent-rumble-output-*"))


def test_codex_harness_configures_local_model_provider(tmp_path: Path) -> None:
    asyncio.run(_codex_harness_configures_local_model_provider(tmp_path))


async def _codex_harness_configures_local_model_provider(tmp_path: Path) -> None:
    thread = FakeThread(workspace=tmp_path)
    client = FakeCodex(thread)
    factory = FakeCodexFactory(client)
    harness = CodexProjectCardHarness(
        settings=Settings(
            model="qwen-coder",
            model_provider_base_url="http://localhost:11434/v1",
            model_provider_env_key="LOCAL_MODEL_API_KEY",
        ),
        codex_factory=factory,
    )

    result = await harness.generate(analysis_request(tmp_path))

    assert result.status == "succeeded"
    assert client.start_kwargs["model_provider"] == "custom"
    assert factory.config.config_overrides == (
        'model_providers.custom.name="Application-configured model provider"',
        'model_providers.custom.base_url="http://localhost:11434/v1"',
        'model_providers.custom.wire_api="responses"',
        'model_providers.custom.env_key="LOCAL_MODEL_API_KEY"',
    )
    assert result.analysis_configuration.model == "qwen-coder"
    assert result.analysis_configuration.model_provider == "custom"
    assert result.analysis_configuration.base_url == "http://localhost:11434/v1"
    assert result.analysis_configuration.wire_api == "responses"


def test_codex_harness_uses_named_provider_without_inline_overrides(
    tmp_path: Path,
) -> None:
    asyncio.run(_codex_harness_uses_named_provider_without_inline_overrides(tmp_path))


async def _codex_harness_uses_named_provider_without_inline_overrides(
    tmp_path: Path,
) -> None:
    thread = FakeThread(workspace=tmp_path)
    client = FakeCodex(thread)
    factory = FakeCodexFactory(client)
    harness = CodexProjectCardHarness(
        settings=Settings(model="qwen-coder", model_provider="ollama"),
        codex_factory=factory,
    )

    result = await harness.generate(analysis_request(tmp_path))

    assert result.status == "succeeded"
    assert client.start_kwargs["model"] == "qwen-coder"
    assert client.start_kwargs["model_provider"] == "ollama"
    assert factory.config.config_overrides == ()
