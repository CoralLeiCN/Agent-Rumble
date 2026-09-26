"""Immutable inspection cannot execute source, follow links, or read the checkout."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest
from agent_project_intelligence.analysis.codex_process import runtime_environment
from agent_project_intelligence.analysis.snapshot import snapshot_repository
from agent_project_intelligence.analysis.source_tools import SnapshotReader


def test_snapshot_reads_only_committed_regular_blobs(tmp_path: Path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    secret = tmp_path / "private.txt"
    secret.write_text("private-data")
    (repo / "outside").symlink_to(secret)
    (repo / "README.md").write_text("original\nsource")
    (repo / "payload.sh").write_text("touch SHOULD_NOT_EXIST")
    (repo / "binary").write_bytes(b"\x00\xff")
    git = ["git", "-C", str(repo)]
    env = {"PATH": os.defpath, "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"}
    for args in (
        ["init", "-q"],
        ["add", "."],
        [
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.com",
            "-c",
            "commit.gpgsign=false",
            "commit",
            "-qm",
            "fixture",
        ],
    ):
        subprocess.run([*git, *args], check=True, env=env, capture_output=True)
    (repo / "README.md").write_text("mutable checkout")
    (repo / "untracked").write_text("not part of snapshot")
    snapshot = snapshot_repository(repo, None)
    assert len(snapshot.revision) == 40
    assert snapshot.files["README.md"] == "original\nsource"
    assert "payload.sh" in snapshot.files
    assert set(snapshot.omitted) == {"outside", "binary"}
    assert "untracked" not in snapshot.files
    assert "private-data" not in str(snapshot)
    assert not (repo / "SHOULD_NOT_EXIST").exists()
    assert snapshot_repository(repo, snapshot.revision) == snapshot
    nested = repo / "nested"
    nested.mkdir()
    with pytest.raises(ValueError, match="repository root"):
        snapshot_repository(nested, None)
    with pytest.raises(ValueError, match="full checked-out"):
        snapshot_repository(repo, "0" * 40)


def test_tools_are_bounded_and_only_index_snapshot_content() -> None:
    reader = SnapshotReader(
        {
            "files": {"README.md": "First\nNeedle\nneedle", "large": "x" * 40_000},
            "omitted": {"link": "symlink"},
            "contract": {"schema": "{}"},
        }
    )
    assert reader.list_files(limit=1)["total"] == 3
    assert reader.read_file("README.md", 2, 1)["content"] == "2: Needle"
    assert reader.read_file("large")["truncated"]
    assert reader.search("NEEDLE", offset=1, limit=1) == {
        "total": 2,
        "matches": [{"path": "README.md", "line": 3, "text": "needle"}],
    }
    assert reader.read_contract("schema") == "{}"
    for path in ("/etc/passwd", "../README.md", "link", "README.md/../../private"):
        with pytest.raises(ValueError):
            reader.read_file(path)
    with pytest.raises(ValueError):
        reader.read_file("README.md", line_count=501)
    with pytest.raises(ValueError):
        reader.search("", limit=100)
    with pytest.raises(ValueError):
        reader.list_files(offset=-1)
    with pytest.raises(ValueError):
        reader.read_contract("../auth.json")


def test_runtime_environment_does_not_inherit_host_authority(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GITHUB_TOKEN", "private")
    monkeypatch.setenv("PYTHONPATH", "/untrusted")
    monkeypatch.setenv("BASH_ENV", "/untrusted/startup")
    monkeypatch.setenv("PROVIDER_KEY", "selected-credential")
    environment = runtime_environment("/isolated", "PROVIDER_KEY")
    assert environment["PROVIDER_KEY"] == "selected-credential"
    assert not {"GITHUB_TOKEN", "PYTHONPATH", "BASH_ENV"} & environment.keys()
    assert environment["HOME"] == environment["CODEX_HOME"] == "/isolated"
