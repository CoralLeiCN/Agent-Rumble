"""FastAPI application entry point."""

from fastapi import FastAPI

from agent_project_intelligence.api.router import api_router


def create_app() -> FastAPI:
    """Create and configure the backend application."""
    application = FastAPI(
        title="Agent Project Intelligence",
        version="0.1.0",
    )
    application.include_router(api_router)
    return application


app = create_app()
