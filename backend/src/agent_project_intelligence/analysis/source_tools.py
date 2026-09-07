"""Bounded, read-only tools over an application-created Git snapshot."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from mcp.server import MCPServer
from mcp.types import ToolAnnotations


class SnapshotReader:
    """Tool arguments only index immutable data; they never become filesystem paths."""

    def __init__(self, document: dict[str, Any]) -> None:
        self._files: dict[str, str] = document["files"]
        self._omitted: dict[str, str] = document["omitted"]
        self._contract: dict[str, str] = document.get("contract", {})

    def read_contract(self, path: str) -> str:
        """Read a trusted skill reference by its exact contract-relative name."""
        if path not in self._contract:
            raise ValueError("unknown skill contract reference")
        return self._contract[path]

    def list_files(self, offset: int = 0, limit: int = 200) -> dict[str, Any]:
        """List pinned repository paths with reasons for any omitted content."""
        if offset < 0 or not 1 <= limit <= 500:
            raise ValueError("offset must be nonnegative and limit must be 1–500")
        paths = sorted(self._files.keys() | self._omitted.keys())
        return {
            "total": len(paths),
            "files": [
                {"path": path, "omitted_reason": self._omitted.get(path)}
                for path in paths[offset : offset + limit]
            ],
        }

    def read_file(self, path: str, start_line: int = 1, line_count: int = 200) -> dict[str, Any]:
        """Read numbered lines from an exact path in the immutable source snapshot."""
        if start_line < 1 or not 1 <= line_count <= 500:
            raise ValueError("start_line must be positive and line_count must be 1–500")
        if path not in self._files:
            raise ValueError("path is not a readable file in the pinned snapshot")
        lines = self._files[path].splitlines()
        content = "\n".join(
            f"{index + 1}: {line}"
            for index, line in enumerate(lines)
            if start_line <= index + 1 < start_line + line_count
        )
        return {
            "path": path,
            "total_lines": len(lines),
            "content": content[:32_000],
            "truncated": len(content) > 32_000,
        }

    def search(self, text: str, offset: int = 0, limit: int = 100) -> dict[str, Any]:
        """Search pinned text for a literal substring; return bounded path and line matches."""
        if not text or len(text) > 500 or offset < 0 or not 1 <= limit <= 200:
            raise ValueError(
                "search requires 1–500 characters, nonnegative offset, and limit 1–200"
            )
        matches: list[dict[str, Any]] = []
        count = 0
        for path, content in sorted(self._files.items()):
            for number, line in enumerate(content.splitlines(), 1):
                if text.casefold() in line.casefold():
                    if offset <= count < offset + limit:
                        matches.append({"path": path, "line": number, "text": line[:500]})
                    count += 1
        return {"total": count, "matches": matches}


def create_server(reader: SnapshotReader) -> MCPServer:
    server = MCPServer("agent-project-card-source")
    annotations = ToolAnnotations(
        read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False
    )
    server.tool(annotations=annotations)(reader.list_files)
    server.tool(annotations=annotations)(reader.read_file)
    server.tool(annotations=annotations)(reader.search)
    server.tool(annotations=annotations)(reader.read_contract)
    return server


if __name__ == "__main__":
    snapshot = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    create_server(SnapshotReader(snapshot)).run()
