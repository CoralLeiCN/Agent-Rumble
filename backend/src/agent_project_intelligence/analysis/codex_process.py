"""Start the pinned SDK runtime with a clean environment, without a shell."""

from __future__ import annotations

import os
import sys

from codex_cli_bin import bundled_codex_path


def runtime_environment(runtime_home: str, credential_key: str) -> dict[str, str]:
    environment = {
        "PATH": os.defpath,
        "HOME": runtime_home,
        "CODEX_HOME": runtime_home,
        "TMPDIR": runtime_home,
        "LANG": "en_US.UTF-8",
    }
    for key in ("SYSTEMROOT", "WINDIR", "SSL_CERT_FILE", "SSL_CERT_DIR", credential_key):
        if key and key in os.environ:
            environment[key] = os.environ[key]
    return environment


if __name__ == "__main__":
    home, credential_key, *arguments = sys.argv[1:]
    binary = str(bundled_codex_path())
    os.execve(binary, [binary, *arguments], runtime_environment(home, credential_key))
