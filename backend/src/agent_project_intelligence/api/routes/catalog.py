"""Versioned Agent Project Card catalog routes."""

from __future__ import annotations

import hashlib
import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Request, Response
from pydantic import BaseModel

from agent_project_intelligence.api.errors import CatalogAPIError, ErrorEnvelope
from agent_project_intelligence.api.identifier_references import decode_identifier_reference
from agent_project_intelligence.api.models.catalog import (
    CatalogContextResponse,
    ComparisonRequest,
    ComparisonResponse,
    EvidenceResponse,
    SearchRequest,
    SearchResponse,
)
from agent_project_intelligence.services.catalog import CatalogService
from agent_project_intelligence.services.catalog_rumble import CanonicalRumbleResult, catalog_rumble

router = APIRouter(tags=["catalog"])

ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorEnvelope, "description": "Invalid catalog identifier or request"},
    404: {"model": ErrorEnvelope, "description": "Pinned card or evidence not found"},
    422: {"model": ErrorEnvelope, "description": "Request validation failed"},
    500: {"model": ErrorEnvelope, "description": "Validated catalog reference error"},
    503: {"model": ErrorEnvelope, "description": "Catalog is unavailable"},
}
CACHE_HEADERS: dict[str, Any] = {
    "ETag": {"schema": {"type": "string"}, "description": "Hash of this response representation"},
    "Cache-Control": {"schema": {"type": "string"}, "description": "private, no-cache"},
}
CACHED_RESPONSES: dict[int | str, dict[str, Any]] = {
    **ERROR_RESPONSES,
    200: {"headers": CACHE_HEADERS},
    304: {"description": "Representation unchanged; no response body", "headers": CACHE_HEADERS},
}


def get_catalog_service(request: Request) -> CatalogService:
    """Resolve the immutable service installed by the application factory."""
    service = getattr(request.app.state, "catalog_service", None)
    if not isinstance(service, CatalogService):
        raise CatalogAPIError(
            503,
            "catalog_unavailable",
            "The validated card catalog is not available.",
        )
    return service


CatalogServiceDependency = Annotated[CatalogService, Depends(get_catalog_service)]
ProjectReference = Annotated[
    str,
    Path(
        description=(
            "Opaque project reference: '~' plus unpadded base64url of the UTF-8 "
            "JSON string representation."
        )
    ),
]
EvidenceReference = Annotated[
    str,
    Path(
        description=(
            "Opaque evidence reference: '~' plus unpadded base64url of the UTF-8 "
            "JSON string representation."
        )
    ),
]


def _surrogate_safe_json_response(
    content: BaseModel | dict[str, Any],
    *,
    exclude_none: bool = False,
    request: Request | None = None,
) -> Response:
    """Serialize catalog JSON as ASCII so every JSON string remains representable.

    Starlette's default JSON response uses ``ensure_ascii=False`` and then strict
    UTF-8 encoding, which cannot encode Python strings containing lone surrogate
    code points. JSON escapes preserve the exact string meaning without that
    invalid UTF-8 boundary.
    """
    serializable = (
        content.model_dump(mode="json", exclude_none=exclude_none)
        if isinstance(content, BaseModel)
        else content
    )
    body = json.dumps(
        serializable,
        ensure_ascii=True,
        allow_nan=False,
        separators=(",", ":"),
    )
    headers = {}
    if request is not None:
        etag = '"' + hashlib.sha256(body.encode("utf-8")).hexdigest() + '"'
        headers = {"ETag": etag, "Cache-Control": "private, no-cache"}
        candidates = request.headers.get("if-none-match", "").split(",")
        if any(item.strip().removeprefix("W/") in {etag, "*"} for item in candidates):
            return Response(status_code=304, headers=headers)
    return Response(content=body, media_type="application/json", headers=headers)


@router.get(
    "/catalog",
    response_model=CatalogContextResponse,
    responses=ERROR_RESPONSES,
)
async def catalog_context(service: CatalogServiceDependency) -> Response:
    """Return catalog identity, cohort boundaries, versions, and freshness."""
    return _surrogate_safe_json_response(service.catalog_context())


@router.post(
    "/catalog/search",
    response_model=SearchResponse,
    responses=ERROR_RESPONSES,
)
async def search_catalog(
    search_request: SearchRequest,
    service: CatalogServiceDependency,
) -> Response:
    """Search current cards using deterministic keywords and filters."""
    return _surrogate_safe_json_response(service.search(search_request))


@router.get(
    "/projects/{project_ref}/cards/current",
    response_model=dict[str, Any],
    responses=CACHED_RESPONSES,
)
async def get_current_card(
    request: Request,
    project_ref: ProjectReference,
    service: CatalogServiceDependency,
) -> Response:
    """Return the exact canonical data for the current retained card."""
    project_id = decode_identifier_reference(project_ref, field="project_id")
    return _surrogate_safe_json_response(service.current_card(project_id), request=request)


@router.get(
    "/projects/{project_ref}/cards/{card_version}",
    response_model=dict[str, Any],
    responses=CACHED_RESPONSES,
)
async def get_versioned_card(
    request: Request,
    project_ref: ProjectReference,
    card_version: Annotated[int, Path(ge=1)],
    service: CatalogServiceDependency,
) -> Response:
    """Return the exact canonical data for one pinned historical card."""
    project_id = decode_identifier_reference(project_ref, field="project_id")
    return _surrogate_safe_json_response(service.card(project_id, card_version), request=request)


@router.get(
    "/projects/{project_ref}/cards/{card_version}/evidence/{evidence_ref}",
    response_model=EvidenceResponse,
    responses=CACHED_RESPONSES,
)
async def get_evidence(
    request: Request,
    project_ref: ProjectReference,
    card_version: Annotated[int, Path(ge=1)],
    evidence_ref: EvidenceReference,
    service: CatalogServiceDependency,
) -> Response:
    """Resolve one Evidence record to Claims, Source, revision, and locator."""
    project_id = decode_identifier_reference(project_ref, field="project_id")
    evidence_id = decode_identifier_reference(evidence_ref, field="evidence_id")
    return _surrogate_safe_json_response(
        service.evidence(project_id, card_version, evidence_id), request=request
    )


@router.post(
    "/catalog/compare",
    response_model=ComparisonResponse,
    response_model_exclude_none=True,
    responses=ERROR_RESPONSES,
)
async def compare_catalog(
    comparison_request: ComparisonRequest,
    service: CatalogServiceDependency,
) -> Response:
    """Compare two or three pinned cards under an explicit context."""
    return _surrogate_safe_json_response(
        service.compare(comparison_request),
        exclude_none=True,
    )


@router.post("/catalog/rumble", response_model=CanonicalRumbleResult, responses=ERROR_RESPONSES)
async def compare_rumble(
    comparison_request: ComparisonRequest,
    service: CatalogServiceDependency,
) -> Response:
    return _surrogate_safe_json_response(catalog_rumble(service, comparison_request))


@router.post("/catalog/refresh", response_model=CatalogContextResponse, responses=ERROR_RESPONSES)
def refresh_catalog(request: Request) -> Response:
    """Reload reviewed artifacts atomically; a failed reload leaves the old snapshot active."""
    from agent_project_intelligence.catalog import FilesystemCatalogRepository, SkillCardValidator

    settings = request.app.state.settings
    try:
        snapshot = FilesystemCatalogRepository(
            root=settings.catalog_root,
            validator=SkillCardValidator(),
            max_file_size_bytes=settings.catalog_max_file_size_bytes,
        ).load()
    except ValueError as exc:
        raise CatalogAPIError(
            422, "catalog_refresh_failed", "The catalog contains invalid artifacts."
        ) from exc
    service = CatalogService(snapshot)
    request.app.state.catalog_service = service
    return _surrogate_safe_json_response(service.catalog_context())
