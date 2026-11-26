from dataclasses import asdict
from datetime import date
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.goals.calc import goal_progress
from app.goals.repo import GoalsRepo, get_goals_repo
from app.schemas.goals import GoalIn, GoalOut
from app.schemas.money import today_in_india

router = APIRouter(tags=["goals"])

Repo = Annotated[GoalsRepo, Depends(get_goals_repo)]
Today = Annotated[date, Depends(today_in_india)]

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that goal. It may have been deleted.")


def _with_progress(row: dict[str, Any], today: date) -> GoalOut:
    target_date = row.get("target_date")
    if isinstance(target_date, str):
        target_date = date.fromisoformat(target_date)
    progress = goal_progress(
        row["target_amount"], row["saved_amount"], today,
        target_date=target_date, monthly_contribution=row.get("monthly_contribution"),
    )
    return GoalOut.model_validate({**row, **asdict(progress)})


@router.get("/goals")
def list_goals(repo: Repo, today: Today) -> list[GoalOut]:
    """Goals still in progress first (most important first), then the ones already reached."""
    goals = [_with_progress(r, today) for r in repo.list()]
    return sorted(goals, key=lambda g: (g.completed, PRIORITY_ORDER[g.priority], g.created_at))


@router.post("/goals", status_code=status.HTTP_201_CREATED)
def add_goal(body: GoalIn, repo: Repo, today: Today) -> GoalOut:
    return _with_progress(repo.create(body.model_dump(mode="json")), today)


@router.put("/goals/{goal_id}")
def change_goal(goal_id: UUID, body: GoalIn, repo: Repo, today: Today) -> GoalOut:
    row = repo.replace(str(goal_id), body.model_dump(mode="json"))
    if row is None:  # not found, or it belongs to someone else (the database hides it)
        raise _not_found()
    return _with_progress(row, today)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: UUID, repo: Repo) -> Response:
    if not repo.delete(str(goal_id)):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
