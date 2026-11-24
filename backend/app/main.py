import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import health, me, money, profile
from app.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("arthsaathi")


def _field_name(error: dict) -> str:
    """Which field a validation error is about. Whole-entry checks name the field at the start
    of their message, like "category: please choose...", so we read it from there."""
    loc = error.get("loc") or ("body",)
    name = str(loc[-1])
    if name in ("body", "query"):
        msg = str(error.get("msg", "")).removeprefix("Value error, ")
        if ":" in msg:
            name = msg.split(":", 1)[0].strip()
    return name


def create_app() -> FastAPI:
    settings = get_settings()
    # Hide interactive API docs in production.
    docs = None if settings.environment == "production" else "/docs"
    app = FastAPI(title=settings.app_name, docs_url=docs, redoc_url=None, openapi_url=None if docs is None else "/openapi.json")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.exception_handler(RequestValidationError)
    async def invalid_input(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Tell the user WHICH fields need fixing, without echoing back what they typed.
        fields = sorted({_field_name(e) for e in exc.errors()})
        return JSONResponse(
            status_code=422,
            content={"detail": "Some details are not valid. Please check and try again.", "fields": fields},
        )

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        # Log the error type and path only. Never log user data.
        logger.error("Unhandled error on %s: %s", request.url.path, type(exc).__name__)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})

    app.include_router(health.router, prefix="/api")
    app.include_router(me.router, prefix="/api")
    app.include_router(profile.router, prefix="/api")
    app.include_router(money.router, prefix="/api")
    return app


app = create_app()
