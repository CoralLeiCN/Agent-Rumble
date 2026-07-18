"""Tests for the dependency release cooldown."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import tomllib


BACKEND_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = BACKEND_ROOT.parent


def test_lockfile_respects_dependency_release_cooldown() -> None:
    pyproject = tomllib.loads((WORKSPACE_ROOT / "pyproject.toml").read_text())
    uv_config = pyproject["tool"]["uv"]

    assert uv_config["required-version"] == ">=0.9.17"
    assert uv_config["exclude-newer"] == "1 week"
    assert uv_config["workspace"]["members"] == ["backend"]

    lockfile = tomllib.loads((WORKSPACE_ROOT / "uv.lock").read_text())
    assert lockfile["options"]["exclude-newer-span"] == "P1W"

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    for package in lockfile["package"]:
        artifacts = [package.get("sdist"), *package.get("wheels", [])]
        upload_times = [
            datetime.fromisoformat(artifact["upload-time"])
            for artifact in artifacts
            if artifact is not None and "upload-time" in artifact
        ]
        assert all(upload_time <= cutoff for upload_time in upload_times)
