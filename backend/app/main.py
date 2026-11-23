import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import health
from app.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("arthsaathi")


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

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        # Log the error type and path only. Never log user data.
        logger.error("Unhandled error on %s: %s", request.url.path, type(exc).__name__)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})

    app.include_router(health.router, prefix="/api")
    return app


app = create_app()
