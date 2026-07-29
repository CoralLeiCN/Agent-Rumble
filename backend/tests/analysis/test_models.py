"""Tests for analysis request and result contracts."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from agent_project_intelligence.analysis.models import ProjectCardAnalysisRequest


def test_analysis_request_accepts_public_github_repository() -> None:
    request = ProjectCardAnalysisRequest(
        repository_url="https://github.com/openai/openai-agents-python",
        workspace=Path("/tmp/repository"),
        project_boundary="The openai-agents Python package",
        source_revision="abc123",
    )

    assert request.repository_url.host == "github.com"
    assert request.source_revision == "abc123"
    assert request.analysis_depth == "targeted"


@pytest.mark.parametrize(
    "url",
    [
        "http://github.com/openai/openai-agents-python",
        "https://example.com/openai/openai-agents-python",
        "https://user@github.com/openai/openai-agents-python",
        "https://github.com/openai/openai-agents-python/issues",
        "https://github.com/openai/openai-agents-python?tab=readme",
    ],
)
def test_analysis_request_rejects_non_public_repository_urls(url: str) -> None:
    with pytest.raises(ValidationError, match="repository_url"):
        ProjectCardAnalysisRequest(
            repository_url=url,
            workspace=Path("/tmp/repository"),
            project_boundary="A project",
        )
