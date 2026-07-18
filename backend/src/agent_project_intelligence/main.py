"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent_project_intelligence.api.errors import install_error_handlers
from agent_project_intelligence.api.router import api_router, catalog_api_router
from agent_project_intelligence.catalog import (
    CatalogSnapshot,
    FilesystemCatalogRepository,
    SkillCardValidator,
)
from agent_project_intelligence.config import Settings, get_settings
from agent_project_intelligence.services.catalog import CatalogService


def create_app(
    *,
    settings: Settings | None = None,
    catalog_snapshot: CatalogSnapshot | None = None,
) -> FastAPI:
    """Create the backend over a loaded snapshot, with injection for tests."""
    resolved_settings = settings or get_settings()
    snapshot = catalog_snapshot or FilesystemCatalogRepository(
        root=resolved_settings.catalog_root,
        validator=SkillCardValidator(),
        max_file_size_bytes=resolved_settings.catalog_max_file_size_bytes,
    ).load()
    application = FastAPI(
        title="Agent Project Intelligence",
        version="0.1.0",
    )
    install_error_handlers(application)
    application.state.catalog_service = CatalogService(snapshot)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_settings.development_cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
    )
    application.include_router(api_router)
    application.include_router(
        catalog_api_router,
        prefix=resolved_settings.api_prefix,
    )
    return application


app = create_app()
