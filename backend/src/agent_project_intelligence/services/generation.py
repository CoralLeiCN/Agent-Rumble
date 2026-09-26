"""Synchronous generation with durable private drafts and explicit publication."""

from __future__ import annotations

import asyncio
import copy
import json
import os
from contextlib import AsyncExitStack
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.error import HTTPError, URLError
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator
from yaml import YAMLError

from agent_project_intelligence.analysis.acquisition import acquire_repository, github_repository
from agent_project_intelligence.analysis.codex_harness import CodexProjectCardHarness
from agent_project_intelligence.analysis.models import ProjectCardAnalysisRequest
from agent_project_intelligence.api.errors import CatalogAPIError
from agent_project_intelligence.catalog import FilesystemCatalogRepository, SkillCardValidator
from agent_project_intelligence.catalog.publication import CardPublisher
from agent_project_intelligence.catalog.validation import parse_card_yaml
from agent_project_intelligence.config import Settings


class GenerationRequest(BaseModel):
    """One user-requested static analysis; no runtime or provider controls."""

    model_config = ConfigDict(extra="forbid")
    repository_url: str = Field(max_length=2_048)
    project_boundary: str = Field(min_length=1, max_length=2_000)
    source_revision: Annotated[str, Field(pattern=r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")] | None = None

    @field_validator("repository_url")
    @classmethod
    def public_url(cls, value: str) -> str:
        return github_repository(value)

    @field_validator("project_boundary")
    @classmethod
    def nonblank_boundary(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("project_boundary must not be blank")
        return value.strip()


class GenerationResponse(BaseModel):
    """A retrievable draft; publication is a separate operator action."""

    model_config = ConfigDict(extra="forbid")
    generation_id: UUID
    status: Literal["succeeded"]
    published: Literal[False]
    repository_url: str
    project_boundary: str
    card: dict[str, Any]


class GenerationManifest(BaseModel):
    """Retrieval metadata pointing to a canonical YAML version, without a card copy."""

    model_config = ConfigDict(extra="forbid")
    generation_id: UUID
    repository_url: str
    project_boundary: str
    card_id: str
    project_id: str
    card_version: int = Field(ge=1)


class GenerationService:
    """Limit model work to one active request per application process."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.harness = CodexProjectCardHarness(settings=settings)
        self._lock = asyncio.Lock()

    async def generate(
        self, request: GenerationRequest, previous: dict[str, Any] | None = None
    ) -> dict[str, object]:
        if self._lock.locked():
            raise CatalogAPIError(
                503, "generation_busy", "Another analysis is running. Try again later."
            )
        async with self._lock:
            document = await self._analyze(request)
            try:
                storage = asyncio.create_task(
                    asyncio.to_thread(self._persist, document, request, previous)
                )
                try:
                    return await asyncio.shield(storage)
                except asyncio.CancelledError:
                    # Filesystem writes cannot be cancelled. Finish the manifest before
                    # releasing the generation lock or reporting cancellation.
                    await storage
                    raise
            except (OSError, ValueError, YAMLError) as exc:
                raise CatalogAPIError(
                    500, "generation_storage_failed", "Unable to store the generated card."
                ) from exc

    async def _analyze(self, request: GenerationRequest) -> dict[str, Any]:
        async with AsyncExitStack() as stack:
            try:
                workspace = await stack.enter_async_context(
                    acquire_repository(request.repository_url, request.source_revision)
                )
            except TimeoutError as exc:
                raise CatalogAPIError(
                    504, "generation_timeout", "Repository acquisition timed out."
                ) from exc
            except HTTPError as exc:
                if exc.code == 404:
                    raise CatalogAPIError(
                        422, "generation_failed", "Public repository was not found. Check its URL."
                    ) from exc
                raise CatalogAPIError(
                    502, "repository_unavailable", "GitHub could not provide the public repository."
                ) from exc
            except URLError as exc:
                raise CatalogAPIError(
                    502, "repository_unavailable", "GitHub could not be reached. Try again later."
                ) from exc
            except ValueError as exc:
                raise CatalogAPIError(
                    422,
                    "generation_failed",
                    "Unable to acquire this public repository. Check its URL, revision, and source limits.",
                ) from exc
            except OSError as exc:
                raise CatalogAPIError(
                    500, "generation_acquisition_failed", "Unable to prepare repository storage."
                ) from exc
            result = await self.harness.generate(
                ProjectCardAnalysisRequest(
                    repository_url=request.repository_url,  # type: ignore[arg-type]
                    workspace=workspace,
                    source_revision=request.source_revision,
                    project_boundary=request.project_boundary,
                )
            )
        if result.status != "succeeded" or result.card is None:
            raise CatalogAPIError(
                502,
                str(result.failure_code),
                "The analyzer could not produce a valid card. No card was published.",
                details={"validation_errors": list(result.validation_errors)},
            )
        return result.card

    def _persist(
        self, document: dict[str, Any], request: GenerationRequest, previous: dict[str, Any] | None
    ) -> dict[str, object]:
        identifier = uuid4()
        self.settings.generated_cards_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        card = self._store_card(document, request, previous)
        root = self.settings.generated_cards_root / str(identifier)
        root.mkdir(mode=0o700)
        self._write_manifest(
            root,
            GenerationManifest(
                generation_id=identifier,
                repository_url=request.repository_url,
                project_boundary=request.project_boundary,
                card_id=card["card_id"],
                project_id=card["project"]["project_id"],
                card_version=card["card_version"],
            ).model_dump(mode="json"),
        )
        return self.retrieve(identifier)

    def _store_card(
        self, document: dict[str, Any], request: GenerationRequest, previous: dict[str, Any] | None
    ) -> dict[str, Any]:
        draft_root = self.settings.generated_cards_root / "cards"
        draft_root.mkdir(exist_ok=True, mode=0o700)

        def load(root: Path) -> Any:
            return FilesystemCatalogRepository(
                root=root,
                validator=SkillCardValidator(),
                max_file_size_bytes=self.settings.catalog_max_file_size_bytes,
            ).load()

        public = load(self.settings.catalog_root)
        drafts = load(draft_root)
        matches = {
            item.project_id: item.to_document()
            for snapshot in (public, drafts)
            for item in snapshot.list_current()
            if self._boundary(item.to_document()) == request.project_boundary
            and any(
                str(repo.get("url", "")).rstrip("/").removesuffix(".git").casefold()
                == request.repository_url.casefold()
                for repo in item.to_document()["project"]["repositories"]
                if repo.get("role") == "primary"
            )
        }
        if previous is None:
            if len(matches) > 1:
                raise CatalogAPIError(
                    409,
                    "generation_identity_conflict",
                    "Multiple projects match this repository and boundary. Refresh a stored draft.",
                )
            previous = next(iter(matches.values()), None)
        card = copy.deepcopy(document)
        publisher = CardPublisher(draft_root, self.settings.catalog_max_file_size_bytes)
        if previous:
            card["card_id"] = previous["card_id"]
            card["project"]["project_id"] = previous["project"]["project_id"]
            # Seed retained public history so draft versions never reuse a published identity.
            for item in public.cards:
                if item.project_id != card["project"]["project_id"]:
                    continue
                retained = drafts.get(item.project_id, item.card_version)
                if retained and retained.to_document() != item.to_document():
                    raise ValueError("Public and draft card histories conflict")
                if retained is None:
                    publisher.publish(item.to_document(), assign_version=False)
        elif any(
            item.card_id == card["card_id"] or item.project_id == card["project"]["project_id"]
            for snapshot in (public, drafts)
            for item in snapshot.list_current()
        ):
            raise CatalogAPIError(
                409,
                "generation_identity_conflict",
                "The generated identity belongs to a different project boundary. Generate a distinct card or refresh its stored draft.",
            )
        path, _ = publisher.publish(card)
        stored: dict[str, Any] = parse_card_yaml(path.read_text(encoding="utf-8"))
        return stored

    @staticmethod
    def _boundary(document: dict[str, Any]) -> str:
        configuration = document["source_snapshot"]["analysis_configuration"]
        analysis_request = configuration.get("analysis_request")
        if isinstance(analysis_request, dict):
            requested = analysis_request.get("project_boundary")
            if isinstance(requested, str):
                return requested.strip()
        return str(document["project"]["boundary"]).strip()

    @staticmethod
    def _write_manifest(root: Path, manifest: dict[str, object]) -> None:
        with (root / "result.pending").open("x", encoding="utf-8") as stream:
            json.dump(manifest, stream, ensure_ascii=True, allow_nan=False)
            stream.flush()
            os.fsync(stream.fileno())
        (root / "result.pending").rename(root / "result.json")
        descriptor = os.open(root, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)

    def retrieve(self, identifier: UUID) -> dict[str, object]:
        root = self.settings.generated_cards_root
        path = root / str(identifier) / "result.json"
        if path.is_symlink() or path.parent.is_symlink() or not path.is_file():
            raise CatalogAPIError(404, "generation_not_found", "Generated card was not found.")
        try:
            with path.open("rb") as stream:
                raw = stream.read(self.settings.catalog_max_file_size_bytes * 8 + 1)
            if len(raw) > self.settings.catalog_max_file_size_bytes * 8:
                raise ValueError("Stored result exceeds its size limit")
            manifest = GenerationManifest.model_validate_json(raw)
            if manifest.generation_id != identifier:
                raise ValueError("Stored generation identity does not match")
            snapshot = FilesystemCatalogRepository(
                root=root / "cards",
                validator=SkillCardValidator(),
                max_file_size_bytes=self.settings.catalog_max_file_size_bytes,
            ).load()
            card = snapshot.get(manifest.project_id, manifest.card_version)
            if card is None or card.card_id != manifest.card_id:
                raise ValueError("Stored canonical card identity does not match")
            return GenerationResponse(
                generation_id=identifier,
                status="succeeded",
                published=False,
                repository_url=manifest.repository_url,
                project_boundary=manifest.project_boundary,
                card=card.to_document(),
            ).model_dump(mode="json")
        except (OSError, ValueError, YAMLError) as exc:
            raise CatalogAPIError(500, "stored_card_invalid", "Stored result is invalid.") from exc

    async def refresh(self, identifier: UUID) -> dict[str, object]:
        previous = await asyncio.to_thread(self.retrieve, identifier)
        return await self.generate(
            GenerationRequest(
                repository_url=str(previous["repository_url"]),
                project_boundary=str(previous["project_boundary"]),
            ),
            previous=previous["card"],  # type: ignore[arg-type]
        )
