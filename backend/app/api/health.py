from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Simple check that the server is alive. Returns no private data."""
    return {"status": "ok", "service": "arthsaathi-api"}
