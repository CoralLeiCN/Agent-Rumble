"""Rumble Arena comparison and prepared-demo endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends

from agent_project_intelligence.models.rumble import RumbleProjectionResponse
from agent_project_intelligence.models.rumble_demo import (
    RumbleDemoBundle,
    RumbleDemoMatchup,
)
from agent_project_intelligence.services.rumble import project_rumble
from agent_project_intelligence.services.rumble_demo import load_demo_bundle


router = APIRouter(prefix="/api/v1/rumble", tags=["catalog"])


def provide_demo_bundle() -> RumbleDemoBundle:
    """Provide the validated committed bundle, overridable by API tests."""
    return load_demo_bundle()


@router.get("/demo", response_model=RumbleDemoBundle)
async def get_rumble_demo(
    bundle: Annotated[RumbleDemoBundle, Depends(provide_demo_bundle)],
) -> RumbleDemoBundle:
    """Return prepared public-project matchups for the playable demo."""
    return bundle


@router.post("", response_model=RumbleProjectionResponse)
async def create_rumble_projection(
    matchup: RumbleDemoMatchup,
) -> RumbleProjectionResponse:
    """Validate and project a complete evidence-backed prepared matchup."""
    return project_rumble(matchup.request)
