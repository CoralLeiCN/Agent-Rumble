"""Explicit, atomic publication of validated canonical cards."""

from __future__ import annotations

import copy
import fcntl
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import yaml

from agent_project_intelligence.catalog.repository import (
    FilesystemCatalogRepository,
    encode_card_id,
)
from agent_project_intelligence.catalog.validation import SkillCardValidator, parse_card_yaml


def material_changes(previous: dict[str, Any], current: dict[str, Any]) -> list[str]:
    """Report changed canonical JSON pointers, including claim changes."""
    changes: list[str] = []

    def visit(left: Any, right: Any, path: str) -> None:
        if isinstance(left, dict) and isinstance(right, dict):
            for key in sorted(left.keys() | right.keys()):
                pointer = f"{path}/{key.replace('~', '~0').replace('/', '~1')}"
                if key not in left or key not in right:
                    changes.append(pointer)
                else:
                    visit(left[key], right[key], pointer)
        elif left != right:
            changes.append(path)

    visit(previous, current, "")
    return changes


class CardPublisher:
    """Serialize writers and expose only complete, contiguous card versions."""

    def __init__(self, root: Path, max_file_size_bytes: int = 2 * 1024 * 1024) -> None:
        self.root = root
        self.limit = max_file_size_bytes
        self.validator = SkillCardValidator()

    def publish(
        self, document: dict[str, Any], *, assign_version: bool = True
    ) -> tuple[Path, list[str]]:
        self.validator.validate(document)
        self.root.mkdir(parents=True, exist_ok=True)
        root = self.root.resolve(strict=True)
        descriptor = os.open(
            root / ".publication.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600
        )
        with os.fdopen(descriptor, "a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            repository = FilesystemCatalogRepository(
                root=root, validator=self.validator, max_file_size_bytes=self.limit
            )
            snapshot = repository.load()
            card = copy.deepcopy(document)
            previous = snapshot.get_current(card["project"]["project_id"])
            before = previous.to_document() if previous else {}
            if previous:
                if previous.card_id != card["card_id"]:
                    raise ValueError("publication cannot change a project's card identity")
                comparable = {**card, "card_version": previous.card_version}
                if comparable == before and (
                    assign_version or card["card_version"] == previous.card_version
                ):
                    return previous.source_path, []
            elif any(item.card_id == card["card_id"] for item in snapshot.cards):
                raise ValueError("card identity already belongs to another project")
            next_version = previous.card_version + 1 if previous else 1
            if not assign_version and card["card_version"] != next_version:
                raise ValueError("publication must preserve the next immutable card version")
            card["card_version"] = next_version
            self.validator.validate(card)

            class CanonicalDumper(yaml.SafeDumper):
                def ignore_aliases(self, data: Any) -> bool:
                    return True

            raw = yaml.dump(
                card, Dumper=CanonicalDumper, sort_keys=False, allow_unicode=True
            ).encode("utf-8")
            parse_card_yaml(raw.decode("utf-8"))
            if len(raw) > self.limit:
                raise ValueError("published card exceeds the configured size limit")
            parent = root / encode_card_id(card["card_id"]) / "versions"
            for candidate in (parent.parent, parent):
                if candidate.is_symlink():
                    raise ValueError("publication directories may not be symlinks")
                candidate.mkdir(exist_ok=True)
            destination = parent / str(card["card_version"])
            # Stage outside the discoverable filename/layout. Rename is atomic on this filesystem.
            with tempfile.TemporaryDirectory(prefix=".publish-", dir=root.parent) as temporary:
                staging = Path(temporary) / "version"
                staging.mkdir()
                output = staging / "card.pending"
                with output.open("xb") as stream:
                    stream.write(raw)
                    stream.flush()
                    os.fsync(stream.fileno())
                output.rename(staging / "project-card.yaml")
                if destination.exists():
                    raise ValueError("card version already exists")
                staging.rename(destination)
                directory_fd = os.open(parent, os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            return destination / "project-card.yaml", material_changes(before, card)


def main() -> None:
    """Publish a reviewed card explicitly; API generation never invokes this CLI."""
    import argparse

    from agent_project_intelligence.config import get_settings

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("card", type=Path)
    parser.add_argument("--catalog-root", type=Path)
    args = parser.parse_args()
    settings = get_settings()
    with args.card.open("rb") as stream:
        raw = stream.read(settings.catalog_max_file_size_bytes + 1)
    if len(raw) > settings.catalog_max_file_size_bytes:
        parser.error("card exceeds the configured size limit")
    document = parse_card_yaml(raw.decode("utf-8"))
    path, changes = CardPublisher(
        args.catalog_root or settings.catalog_root, settings.catalog_max_file_size_bytes
    ).publish(document, assign_version=False)
    print(json.dumps({"path": str(path), "changed_paths": changes}))


if __name__ == "__main__":
    main()
