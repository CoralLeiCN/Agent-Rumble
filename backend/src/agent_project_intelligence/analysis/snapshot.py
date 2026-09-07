"""Read immutable Git blobs without executing checkout code or following symlinks."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

MAX_FILES = 20_000
MAX_FILE_BYTES = 2 * 1024 * 1024
MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024


@dataclass(frozen=True)
class SourceSnapshot:
    revision: str
    files: dict[str, str]
    omitted: dict[str, str]


def snapshot_repository(workspace: Path, revision: str | None) -> SourceSnapshot:
    """Snapshot HEAD from Git objects; ignore mutable working-tree file contents."""
    git = shutil.which("git", path=os.defpath)
    if git is None:
        raise ValueError("Git is required for immutable repository snapshots")
    environment = {
        "PATH": os.defpath,
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_TERMINAL_PROMPT": "0",
    }
    command = [
        git,
        "--no-replace-objects",
        "--no-optional-locks",
        "-c",
        "core.fsmonitor=false",
        "-c",
        f"core.hooksPath={os.devnull}",
        "-C",
        str(workspace),
    ]

    def run(*args: str, input_data: bytes | None = None) -> bytes:
        # Output goes to a file so an excessive tree listing cannot exhaust RAM.
        import tempfile

        with tempfile.TemporaryFile() as output:
            result = subprocess.run(
                [*command, *args],
                input=input_data,
                stdout=output,
                stderr=subprocess.PIPE,
                env=environment,
                timeout=30,
            )
            if result.returncode:
                raise ValueError("unable to read the local Git source snapshot")
            output.seek(0)
            raw = output.read(MAX_SNAPSHOT_BYTES + 2 * MAX_FILES * 200 + 1)
        if len(raw) > MAX_SNAPSHOT_BYTES + 2 * MAX_FILES * 200:
            raise ValueError("Git snapshot output exceeds its size limit")
        return raw

    head = run("rev-parse", "--verify", "HEAD^{commit}").decode("ascii").strip()
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", head):
        raise ValueError("workspace does not resolve to a full Git commit")
    if revision is not None and revision != head:
        raise ValueError("source_revision must equal the full checked-out Git commit")
    entries = run("ls-tree", "-r", "-z", "-l", head).split(b"\0")
    if len(entries) - 1 > MAX_FILES:
        raise ValueError("repository exceeds the source snapshot file limit")
    selected: list[tuple[str, str, int]] = []
    omitted: dict[str, str] = {}
    size_total = 0
    for entry in entries:
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        mode, kind, raw_oid, raw_size = metadata.split()
        path = raw_path.decode("utf-8", errors="strict")
        if kind != b"blob" or mode not in {b"100644", b"100755"}:
            omitted[path] = "symlink or submodule; not followed"
            continue
        size = int(raw_size)
        if size > MAX_FILE_BYTES:
            omitted[path] = "file exceeds the per-file snapshot size limit"
            continue
        size_total += size
        if size_total > MAX_SNAPSHOT_BYTES:
            raise ValueError("repository exceeds the source snapshot byte limit")
        selected.append((path, raw_oid.decode("ascii"), size))
    raw_blobs = run(
        "cat-file",
        "--batch",
        input_data="".join(f"{oid}\n" for _, oid, _ in selected).encode("ascii"),
    )
    offset = 0
    files: dict[str, str] = {}
    for path, oid, size in selected:
        end = raw_blobs.index(b"\n", offset)
        if raw_blobs[offset:end] != f"{oid} blob {size}".encode("ascii"):
            raise ValueError("Git blob response did not match the pinned tree")
        value = raw_blobs[end + 1 : end + 1 + size]
        offset = end + 1 + size + 1
        try:
            text = value.decode("utf-8", errors="strict")
            if "\0" in text:
                raise ValueError("binary file")
            files[path] = text
        except (UnicodeError, ValueError):
            omitted[path] = "binary content; not analyzed"
    return SourceSnapshot(head, files, omitted)
