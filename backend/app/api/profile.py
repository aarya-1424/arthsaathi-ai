from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user
from app.db import Database, get_db
from app.schemas.profile import FinancialProfile, ProfileOut, ProfileUpdate

router = APIRouter(tags=["profile"])

FIN_COLUMNS = ",".join(FinancialProfile.model_fields)


def _load(db: Database, user_id: str) -> ProfileOut:
    profile = db.select_one("profiles", "display_name", id=user_id)
    fin = db.select_one("financial_profiles", FIN_COLUMNS, user_id=user_id)
    return ProfileOut(
        display_name=(profile or {}).get("display_name"),
        financial=FinancialProfile.model_validate(fin) if fin else None,
        onboarding_complete=fin is not None,
    )


@router.get("/profile")
def get_profile(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Database, Depends(get_db)],
) -> ProfileOut:
    return _load(db, user.id)


@router.put("/profile")
def save_profile(
    body: ProfileUpdate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[Database, Depends(get_db)],
) -> ProfileOut:
    """Saves onboarding answers (first time) or profile edits (later)."""
    row = body.model_dump(exclude={"display_name"})
    # The owner always comes from the verified login token, never from what the browser sent.
    row["user_id"] = user.id
    saved = db.upsert("financial_profiles", row, on_conflict="user_id", columns=FIN_COLUMNS)
    db.update("profiles", {"display_name": body.display_name}, id=user.id)
    return ProfileOut(
        display_name=body.display_name,
        financial=FinancialProfile.model_validate(saved),
        onboarding_complete=True,
    )
