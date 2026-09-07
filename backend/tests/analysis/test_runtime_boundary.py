"""Exercise the pinned SDK against an adversarial local Responses provider.

This test needs loopback binding, but never calls an external model or uses a real
credential. Runtime upgrades must continue to reject these tool attempts.
"""

from __future__ import annotations

import asyncio
import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from agent_project_intelligence.analysis.runtime import isolated_codex_config
from agent_project_intelligence.catalog.validation import DEFAULT_SKILL_ROOT
from agent_project_intelligence.config import Settings
from openai_codex import ApprovalMode, AsyncCodex, SkillInput, TextInput


def test_runtime_blocks_host_reads_writes_and_execution(tmp_path: Path) -> None:
    image = tmp_path / "private.png"
    image.write_bytes(
        base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII="
        )
    )
    target = tmp_path / "isolated" / "work" / "unauthorized-write"
    requests: list[dict[str, Any]] = []
    calls = [
        {
            "type": "function_call",
            "name": "view_image",
            "arguments": json.dumps({"path": str(image)}),
        },
        {
            "type": "custom_tool_call",
            "name": "apply_patch",
            "input": f"*** Begin Patch\n*** Add File: {target}\n+UNAUTHORIZED\n*** End Patch\n",
        },
        {
            "type": "function_call",
            "name": "exec_command",
            "arguments": json.dumps({"cmd": f"touch {target}"}),
        },
        {
            "type": "function_call",
            "name": "read_file",
            "namespace": "mcp__source",
            "arguments": json.dumps({"path": "README.md"}),
        },
    ]

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args: Any) -> None:
            pass

        def do_GET(self) -> None:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"models":[]}')

        def do_POST(self) -> None:
            request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            requests.append(request)
            index = len(requests) - 1
            if index < len(calls):
                item = {
                    **calls[index],
                    "id": f"item-{index}",
                    "call_id": f"call-{index}",
                    "status": "completed",
                }
            else:
                item = {
                    "id": "message-1",
                    "type": "message",
                    "role": "assistant",
                    "status": "completed",
                    "content": [
                        {"type": "output_text", "text": "boundary checked", "annotations": []}
                    ],
                }
            response = {
                "id": f"response-{index}",
                "object": "response",
                "status": "completed",
                "output": [item],
                "usage": {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2},
            }
            events = [
                {
                    "type": "response.created",
                    "response": {**response, "status": "in_progress", "output": []},
                },
                {"type": "response.output_item.done", "output_index": 0, "item": item},
                {"type": "response.completed", "response": response},
            ]
            body = "".join("data: " + json.dumps(event) + "\n\n" for event in events).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    runtime = tmp_path / "isolated"
    runtime.mkdir()
    snapshot = runtime / "snapshot.json"
    snapshot.write_text(
        json.dumps(
            {"files": {"README.md": "PINNED_SOURCE_SENTINEL"}, "omitted": {}, "contract": {}}
        )
    )
    settings = Settings(
        model="gpt-5.5",
        model_provider=None,
        model_provider_base_url=f"http://127.0.0.1:{server.server_port}/v1",
        model_provider_env_key=None,
        codex_config_home=tmp_path / "empty-operator",
    )
    config = isolated_codex_config(settings, directory=runtime, snapshot_path=snapshot)

    async def run() -> None:
        async with AsyncCodex(config) as client:
            thread = await client.thread_start(
                approval_mode=ApprovalMode.deny_all, cwd=config.cwd, ephemeral=True
            )
            result = await thread.run(
                [
                    SkillInput(name="agent-project-card", path=str(DEFAULT_SKILL_ROOT)),
                    TextInput("Inspect the pinned source using the source tools."),
                ],
                approval_mode=ApprovalMode.deny_all,
                cwd=config.cwd,
            )
            assert result.final_response == "boundary checked"

    try:
        asyncio.run(asyncio.wait_for(run(), timeout=60))
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)
    assert len(requests) == len(calls) + 1
    assert not target.exists()
    outputs = {
        item["call_id"]: item
        for request in requests
        for item in request["input"]
        if item.get("type") in {"function_call_output", "custom_tool_call_output"}
    }
    assert any(
        word in json.dumps(outputs["call-0"]).lower() for word in ("denied", "not permitted")
    ), outputs["call-0"]
    assert not any(
        item.get("type") == "input_image" for request in requests for item in request["input"]
    )
    assert "reject" in json.dumps(outputs["call-1"]).lower(), outputs["call-1"]
    assert "unsupported call" in json.dumps(outputs["call-2"]).lower(), outputs["call-2"]
    assert "PINNED_SOURCE_SENTINEL" in json.dumps(outputs["call-3"]), outputs["call-3"]
    tools = {tool["name"] for tool in requests[0]["tools"] if "name" in tool}
    assert (
        not {"exec_command", "shell", "shell_command", "js_repl", "spawn_agent", "web_search"}
        & tools
    )
