from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Returns who the signed-in user is. Used by the website to confirm login."""
    return user
