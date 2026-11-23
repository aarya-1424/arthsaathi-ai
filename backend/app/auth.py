"""Checks the login token sent by the website.

The token is signed by Supabase. We verify the signature, the issuer, the audience
and the expiry. We never trust anything else the browser tells us about who the user is.
"""
import logging
from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import Settings, get_settings

logger = logging.getLogger("arthsaathi.auth")
_bearer = HTTPBearer(auto_error=False)
_ALLOWED_ALGORITHMS = ["ES256", "RS256"]


class CurrentUser(BaseModel):
    id: str
    email: str | None = None


@lru_cache
def _jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    # Caches Supabase's public signing keys so we don't fetch them on every request.
    return jwt.PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)


def get_signing_key(token: str, settings: Settings) -> Any:
    """Finds the public key that matches this token. Tests replace this function."""
    return _jwks_client(settings.supabase_jwks_url).get_signing_key_from_jwt(token).key


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in to continue.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    if creds is None or not settings.supabase_url:
        raise _unauthorized()
    try:
        key = get_signing_key(creds.credentials, settings)
        claims = jwt.decode(
            creds.credentials,
            key,
            algorithms=_ALLOWED_ALGORITHMS,
            audience="authenticated",
            issuer=settings.supabase_issuer,
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except Exception as exc:  # any problem means "not signed in"; never reveal why
        logger.info("Rejected token: %s", type(exc).__name__)
        raise _unauthorized() from None
    return CurrentUser(id=claims["sub"], email=claims.get("email"))
