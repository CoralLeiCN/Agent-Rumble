"""Typed HTTP errors shared by the catalog API."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field


class ErrorDetail(BaseModel):
    """A stable machine-readable API error."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelope(BaseModel):
    """Envelope used for every non-success catalog response."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail


class CatalogAPIError(Exception):
    """An expected catalog failure that is safe to return to an API client."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error = ErrorDetail(
            code=code,
            message=message,
            details=details or {},
        )


def install_error_handlers(application: FastAPI) -> None:
    """Install handlers that keep expected and validation errors typed."""

    @application.exception_handler(CatalogAPIError)
    async def catalog_error_handler(
        _request: Request,
        error: CatalogAPIError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=ErrorEnvelope(error=error.error).model_dump(mode="json"),
        )

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request,
        error: RequestValidationError,
    ) -> JSONResponse:
        details = {
            "issues": [
                {
                    "location": [str(part) for part in issue["loc"]],
                    "message": issue["msg"],
                    "type": issue["type"],
                }
                for issue in error.errors()
            ]
        }
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code="request_validation_error",
                message="The request did not match the API contract.",
                details=details,
            )
        )
        return JSONResponse(status_code=422, content=envelope.model_dump(mode="json"))
