"""Public intake is bounded and never checks out or executes repository files."""

import asyncio
import io
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from agent_project_intelligence.analysis import acquisition


@pytest.mark.parametrize(
    "metadata",
    [
        {"private": True, "visibility": "private", "html_url": "https://github.com/owner/repo"},
        {"private": False, "visibility": "public", "html_url": "https://github.com/other/repo"},
    ],
)
def test_public_boundary_rejects_private_or_changed_identity(monkeypatch, metadata):
    opener = SimpleNamespace(open=lambda *args, **kwargs: io.BytesIO(json.dumps(metadata).encode()))
    monkeypatch.setattr(acquisition.urllib.request, "build_opener", lambda *args: opener)
    with pytest.raises(ValueError):
        acquisition.verify_public_repository("https://github.com/owner/repo")


@pytest.mark.parametrize("oversize", [False, True])
def test_fetch_uses_clean_environment_without_checkout_and_cleans_up(monkeypatch, oversize):
    monkeypatch.setattr(acquisition, "verify_public_repository", lambda url: None)
    calls = []
    workspaces = []

    async def spawn(*args, **kwargs):
        calls.append((args, kwargs))
        workspace = Path(args[args.index("-C") + 1])
        workspaces.append(workspace)
        if "fetch" in args and oversize:
            with (workspace / "oversized.pack").open("wb") as stream:
                stream.truncate(257 * 1024 * 1024)
        return SimpleNamespace(returncode=0, wait=AsyncMock(return_value=0))

    monkeypatch.setattr(acquisition.asyncio, "create_subprocess_exec", spawn)

    async def run():
        async with acquisition.acquire_repository("https://github.com/owner/repo") as workspace:
            assert workspace.is_dir()

    if oversize:
        with pytest.raises(ValueError, match="256 MiB"):
            asyncio.run(run())
    else:
        asyncio.run(run())
        assert calls[-1][0][-3:] == ("reset", "--soft", "FETCH_HEAD")
    assert all(not path.exists() for path in workspaces)
    for args, kwargs in calls:
        assert "checkout" not in args and "clone" not in args
        assert "credential.helper=" in args and "http.followRedirects=false" in args
        assert kwargs["env"]["GIT_CONFIG_GLOBAL"] == acquisition.os.devnull
        assert "HOME" not in kwargs["env"]
        assert kwargs["start_new_session"] is True


def test_cancel_kills_git_process_group_and_removes_workspace(monkeypatch):
    monkeypatch.setattr(acquisition, "verify_public_repository", lambda url: None)

    async def run():
        started = asyncio.Event()
        stopped = asyncio.Event()
        workspace = None
        process = SimpleNamespace(returncode=None, pid=12345)

        async def wait():
            await stopped.wait()
            return process.returncode

        process.wait = wait

        async def spawn(*args, **kwargs):
            nonlocal workspace
            workspace = Path(args[args.index("-C") + 1])
            started.set()
            return process

        def kill(pid, sig):
            assert pid == process.pid and sig == acquisition.signal.SIGKILL
            process.returncode = -9
            stopped.set()

        monkeypatch.setattr(acquisition.asyncio, "create_subprocess_exec", spawn)
        monkeypatch.setattr(acquisition.os, "killpg", kill)

        async def acquire():
            async with acquisition.acquire_repository("https://github.com/owner/repo"):
                pytest.fail("Cancelled intake must not reach analysis")

        task = asyncio.create_task(acquire())
        await started.wait()
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert stopped.is_set() and not workspace.exists()

    asyncio.run(run())
