"""Talks to the Supabase database through its REST API.

Every request is sent with the signed-in USER'S own login token. That means the
database's row-level security rules decide what the user may read or change,
even if our server code had a bug. We never use the all-powerful service key here.
"""
import logging
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.config import Settings, get_settings

logger = logging.getLogger("arthsaathi.db")


class Database:
    def __init__(self, settings: Settings, user: CurrentUser):
        self._base = settings.supabase_rest_url
        self._timeout = settings.db_timeout_seconds
        self._headers = {
            "apikey": settings.supabase_publishable_key,
            "Authorization": f"Bearer {user.token}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, table: str, *, params: dict[str, str] | None = None,
                 json: Any = None, prefer: str | None = None) -> list[dict[str, Any]]:
        headers = dict(self._headers)
        if prefer:
            headers["Prefer"] = prefer
        try:
            r = httpx.request(method, f"{self._base}/{table}", params=params, json=json,
                              headers=headers, timeout=self._timeout)
        except httpx.HTTPError as exc:
            logger.error("Database unreachable (%s %s): %s", method, table, type(exc).__name__)
            raise _unavailable() from None
        if r.status_code in (401, 403):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in to continue.")
        if r.status_code in (400, 409, 422):
            # Only the error code is logged, never the user's data.
            logger.warning("Database rejected %s %s: status %s", method, table, r.status_code)
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Some details are not valid. Please check and try again.")
        if r.status_code >= 300:
            logger.error("Database error (%s %s): status %s", method, table, r.status_code)
            raise _unavailable()
        return r.json() if r.content else []

    def select_one(self, table: str, columns: str, **filters: str) -> dict[str, Any] | None:
        params = {"select": columns, **{k: f"eq.{v}" for k, v in filters.items()}, "limit": "1"}
        rows = self._request("GET", table, params=params)
        return rows[0] if rows else None

    def upsert(self, table: str, row: dict[str, Any], on_conflict: str, columns: str) -> dict[str, Any]:
        rows = self._request(
            "POST", table,
            params={"on_conflict": on_conflict, "select": columns},
            json=row,
            prefer="resolution=merge-duplicates,return=representation",
        )
        return rows[0]

    def update(self, table: str, values: dict[str, Any], **filters: str) -> None:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        self._request("PATCH", table, params=params, json=values, prefer="return=minimal")


def _unavailable() -> HTTPException:
    return HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "We could not reach the database. Please try again in a moment.")


def get_db(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Database:
    return Database(settings, user)
