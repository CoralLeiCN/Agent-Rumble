"""Application-owned Codex configuration for static repository inspection."""

from __future__ import annotations

import json
import re
import shutil
import sys
import tomllib
from pathlib import Path
from typing import Any

from openai_codex import CodexConfig

from agent_project_intelligence.config import Settings

DISABLED_FEATURES = (
    "shell_tool",
    "unified_exec",
    "shell_snapshot",
    "shell_zsh_fork",
    "apply_patch_freeform",
    "js_repl",
    "code_mode",
    "code_mode_host",
    "multi_agent",
    "multi_agent_v2",
    "collab",
    "enable_fanout",
    "apps",
    "connectors",
    "plugins",
    "plugin_hooks",
    "hooks",
    "codex_hooks",
    "browser_use",
    "browser_use_external",
    "computer_use",
    "in_app_browser",
    "image_generation",
    "imagegenext",
    "remote_control",
    "remote_plugin",
    "memories",
    "memory_tool",
    "tool_suggest",
    "tool_search",
    "workspace_dependencies",
    "skill_mcp_dependency_install",
    "skill_env_var_dependency_prompt",
    "request_permissions_tool",
    "request_rule",
    "search_tool",
)
SOURCE_TOOL_NAMES = ("list_files", "read_file", "search", "read_contract")


def isolated_codex_config(
    settings: Settings, *, directory: Path, snapshot_path: Path
) -> CodexConfig:
    """Import only selected provider data and auth, never operator/repository tools."""
    home = directory / "runtime"
    home.mkdir(mode=0o700)
    workspace = directory / "work"
    workspace.mkdir(mode=0o700)
    operator_home = settings.codex_config_home.expanduser()
    operator_file = operator_home / "config.toml"
    operator = tomllib.loads(operator_file.read_text()) if operator_file.is_file() else {}
    model = settings.model or operator.get("model")
    provider = settings.model_provider or operator.get("model_provider", "openai")
    configuration: dict[str, Any] = {
        "default_permissions": "static-analysis",
        "permissions.static-analysis.filesystem./": "deny",
        "permissions.static-analysis.network.enabled": False,
        "web_search": "disabled",
        "project_doc_max_bytes": 0,
        "allow_login_shell": False,
        "shell_environment_policy.inherit": "none",
        "shell_environment_policy.ignore_default_excludes": False,
        "cli_auth_credentials_store": "file",
        "mcp_servers.source.command": sys.executable,
        "mcp_servers.source.args": [
            "-I",
            str(Path(__file__).with_name("source_tools.py")),
            str(snapshot_path),
        ],
        "mcp_servers.source.cwd": str(workspace),
        "mcp_servers.source.required": True,
        "mcp_servers.source.enabled_tools": list(SOURCE_TOOL_NAMES),
        "mcp_servers.source.default_tools_approval_mode": "auto",
    }
    configuration.update({f"features.{name}": False for name in DISABLED_FEATURES})
    credential_key = "OPENAI_API_KEY"
    provider_config: dict[str, Any] = {}
    if settings.model_provider_base_url is not None:
        provider = "custom"
        provider_config = {
            "name": "Application-configured model provider",
            "base_url": str(settings.model_provider_base_url).rstrip("/"),
            "wire_api": settings.model_provider_wire_api,
        }
        if settings.model_provider_env_key:
            provider_config["env_key"] = settings.model_provider_env_key
    elif provider != "openai":
        entry = operator.get("model_providers", {}).get(provider)
        if not isinstance(entry, dict):
            raise ValueError("selected model provider is absent from operator configuration")
        allowed = {
            "name",
            "base_url",
            "env_key",
            "wire_api",
            "requires_openai_auth",
            "request_max_retries",
            "stream_max_retries",
            "stream_idle_timeout_ms",
        }
        if set(entry) - allowed:
            raise ValueError(
                "static analysis providers may only use URL and environment-key authentication"
            )
        # Apply the application's URL and credential-reference validation to imported settings.
        Settings(
            model=model or "configured-model",
            model_provider=None,
            model_provider_base_url=entry.get("base_url"),
            model_provider_env_key=entry.get("env_key"),
            model_provider_wire_api=entry.get("wire_api", "responses"),
        )
        provider_config = entry
    if provider_config:
        configuration.update(
            {f"model_providers.{provider}.{key}": value for key, value in provider_config.items()}
        )
        credential_key = provider_config.get("env_key", "")
    if not isinstance(provider, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", provider):
        raise ValueError("model provider must be a plain identifier")
    configuration["model_provider"] = provider
    if model:
        configuration["model"] = model
    if provider == "openai" or provider_config.get("requires_openai_auth"):
        auth = operator_home / "auth.json"
        if auth.is_file():
            shutil.copyfile(auth, home / "auth.json")
            (home / "auth.json").chmod(0o600)
    overrides = tuple(f"{key}={json.dumps(value)}" for key, value in configuration.items())
    arguments = [
        sys.executable,
        "-I",
        str(Path(__file__).with_name("codex_process.py")),
        str(home),
        credential_key,
    ]
    for override in overrides:
        arguments.extend(["--config", override])
    arguments.extend(["app-server", "--listen", "stdio://"])
    return CodexConfig(
        cwd=str(workspace), config_overrides=overrides, launch_args_override=tuple(arguments)
    )
