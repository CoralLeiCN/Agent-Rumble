"""Top-level API router."""

from fastapi import APIRouter

from agent_project_intelligence.api.routes import catalog, health, rumble

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(rumble.router)

catalog_api_router = APIRouter()
catalog_api_router.include_router(catalog.router)
