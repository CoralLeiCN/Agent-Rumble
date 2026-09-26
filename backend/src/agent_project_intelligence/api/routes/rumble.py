"""Rumble Arena projection for caller-supplied matchups."""

from fastapi import APIRouter

from agent_project_intelligence.api.errors import ErrorEnvelope
from agent_project_intelligence.models.rumble import RumbleProjectionResponse
from agent_project_intelligence.models.rumble_matchup import PreparedRumbleMatchup
from agent_project_intelligence.services.rumble import project_rumble

router = APIRouter(prefix="/rumble", tags=["catalog"])


@router.post(
    "",
    response_model=RumbleProjectionResponse,
    responses={422: {"model": ErrorEnvelope, "description": "Request validation failed"}},
)
async def create_rumble_projection(
    matchup: PreparedRumbleMatchup,
) -> RumbleProjectionResponse:
    """Validate and project a complete evidence-backed prepared matchup."""
    return project_rumble(matchup.request)
