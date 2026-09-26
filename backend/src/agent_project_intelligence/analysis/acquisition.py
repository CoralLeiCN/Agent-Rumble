"""Anonymous public GitHub intake without checkout or repository execution."""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import signal
import tempfile
import urllib.request
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from urllib.parse import urlsplit


def github_repository(value: str) -> str:
    """Accept only a canonical, uncredentialed owner/repository URL."""
    url = urlsplit(value)
    if url.scheme != "https" or url.netloc != "github.com" or url.query or url.fragment:
        raise ValueError("Use an uncredentialed https://github.com/owner/repository URL")
    path = url.path.removesuffix("/").removesuffix(".git")
    if not re.fullmatch(r"/[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+", path):
        raise ValueError("URL must identify exactly one GitHub owner/repository")
    if path.rsplit("/", 1)[1] in {".", ".."}:
        raise ValueError("Invalid repository name")
    return f"https://github.com{path}"


def verify_public_repository(url: str) -> None:
    """Anonymous GitHub metadata establishes the public-repository boundary."""
    api_url = url.replace("https://github.com/", "https://api.github.com/repos/")
    request = urllib.request.Request(
        api_url, headers={"Accept": "application/vnd.github+json", "User-Agent": "Agent-Rumble"}
    )

    # Disable proxies and redirects; callers must submit the current canonical repository URL.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args: object, **kwargs: object) -> None:
            return None

    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(request, timeout=20) as response:
        raw = response.read(65_537)
    if len(raw) > 65_536:
        raise ValueError("GitHub metadata exceeds its size limit")
    metadata = json.loads(raw)
    if metadata.get("private") is not False or metadata.get("visibility") != "public":
        raise ValueError("Only public GitHub repositories are supported")
    if str(metadata.get("html_url", "")).casefold() != url.casefold():
        raise ValueError("GitHub repository identity does not match the requested URL")


@asynccontextmanager
async def acquire_repository(url: str, revision: str | None = None) -> AsyncIterator[Path]:
    """Fetch bounded Git objects into temporary storage, then discard them."""
    url = github_repository(url)
    if revision is not None and not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", revision):
        raise ValueError("source_revision must be a full lowercase commit hash")
    await asyncio.to_thread(verify_public_repository, url)
    git = shutil.which("git", path=os.defpath)
    if git is None:
        raise ValueError("Git is required for repository acquisition")
    environment = {
        "PATH": os.defpath,
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/usr/bin/false",
        "GIT_LFS_SKIP_SMUDGE": "1",
    }
    with tempfile.TemporaryDirectory(prefix="agent-rumble-source-") as temporary:
        workspace = Path(temporary)

        def check_size() -> None:
            size = 0
            for path in workspace.rglob("*"):
                try:
                    if path.is_file():
                        size += path.stat().st_size
                except FileNotFoundError:
                    # Git can remove temporary packs while the monitor samples them.
                    continue
                if size > 256 * 1024 * 1024:
                    raise ValueError("repository acquisition exceeds 256 MiB")

        async def run(*arguments: str) -> None:
            process = await asyncio.create_subprocess_exec(
                git,
                "-c",
                f"core.hooksPath={os.devnull}",
                "-c",
                "credential.helper=",
                "-c",
                "protocol.allow=never",
                "-c",
                "protocol.https.allow=always",
                "-c",
                "http.followRedirects=false",
                "-C",
                str(workspace),
                *arguments,
                env=environment,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
                start_new_session=True,
            )
            completion = asyncio.create_task(process.wait())
            try:
                async with asyncio.timeout(120):
                    while process.returncode is None:
                        try:
                            await asyncio.wait_for(asyncio.shield(completion), timeout=0.25)
                        except TimeoutError:
                            await asyncio.to_thread(check_size)
                    if process.returncode != 0:
                        raise ValueError("Unable to acquire the public repository revision")
                    await asyncio.to_thread(check_size)
            finally:
                if process.returncode is None:
                    with suppress(ProcessLookupError):
                        os.killpg(process.pid, signal.SIGKILL)
                await completion

        await run("init", "--quiet")
        await run("remote", "add", "origin", url)
        await run("fetch", "--depth=1", "--no-tags", "origin", revision or "HEAD")
        # Set HEAD without materializing files, filters, submodules, or hooks.
        await run("reset", "--soft", "FETCH_HEAD")
        yield workspace
