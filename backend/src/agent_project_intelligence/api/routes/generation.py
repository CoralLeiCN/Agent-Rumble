"""Hosted generation stays separate from read-only catalog routes."""

import asyncio
from collections.abc import Awaitable
from contextlib import suppress
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from agent_project_intelligence.api.errors import CatalogAPIError, ErrorEnvelope
from agent_project_intelligence.services.generation import (
    GenerationRequest,
    GenerationResponse,
    GenerationService,
)

RETRIEVAL_ERRORS: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorEnvelope, "description": "Saved generation not found"},
    422: {"model": ErrorEnvelope, "description": "Request validation failed"},
    500: {"model": ErrorEnvelope, "description": "Saved manifest or canonical card is invalid"},
}
GENERATION_ERRORS: dict[int | str, dict[str, Any]] = {
    409: {
        "model": ErrorEnvelope,
        "description": "Generated identity conflicts with a project boundary",
    },
    422: {
        "model": ErrorEnvelope,
        "description": "Invalid request or unavailable/unsupported public repository",
    },
    499: {"model": ErrorEnvelope, "description": "Requesting client disconnected"},
    500: {
        "model": ErrorEnvelope,
        "description": "Repository storage, draft storage, or saved card failure",
    },
    502: {
        "model": ErrorEnvelope,
        "description": "GitHub is unavailable or analyzer could not produce a valid card",
    },
    503: {"model": ErrorEnvelope, "description": "Another generation is already running"},
    504: {"model": ErrorEnvelope, "description": "Repository acquisition timed out"},
}

router = APIRouter(prefix="/generation", tags=["generation"])


def generation_service(request: Request) -> GenerationService:
    service: GenerationService = request.app.state.generation_service
    return service


Service = Annotated[GenerationService, Depends(generation_service)]


async def until_disconnect(
    request: Request, operation: Awaitable[dict[str, object]]
) -> dict[str, object]:
    """Cancel expensive analysis when the requesting client disconnects."""

    async def disconnected() -> None:
        while (await request.receive())["type"] != "http.disconnect":
            pass

    task = asyncio.ensure_future(operation)
    watcher = asyncio.create_task(disconnected())
    try:
        await asyncio.wait((task, watcher), return_when=asyncio.FIRST_COMPLETED)
        if task.done():
            return await task
        raise CatalogAPIError(499, "generation_disconnected", "Generation request disconnected.")
    finally:
        for pending in (watcher, task):
            if not pending.done():
                pending.cancel()
            with suppress(asyncio.CancelledError):
                await pending


@router.post("", status_code=201, response_model=GenerationResponse, responses=GENERATION_ERRORS)
async def generate_card(
    payload: GenerationRequest, service: Service, request: Request
) -> dict[str, object]:
    return await until_disconnect(request, service.generate(payload))


@router.get("/{generation_id}", response_model=GenerationResponse, responses=RETRIEVAL_ERRORS)
def retrieve_card(generation_id: UUID, service: Service) -> dict[str, object]:
    return service.retrieve(generation_id)


@router.post(
    "/{generation_id}/refresh",
    status_code=201,
    response_model=GenerationResponse,
    responses={**RETRIEVAL_ERRORS, **GENERATION_ERRORS},
)
async def refresh_card(
    generation_id: UUID, service: Service, request: Request
) -> dict[str, object]:
    return await until_disconnect(request, service.refresh(generation_id))
