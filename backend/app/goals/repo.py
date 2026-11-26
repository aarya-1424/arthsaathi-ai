"""Database reads and writes for goals. Kept separate so the API can be tested without a database."""
from typing import Annotated, Any

from fastapi import Depends

from app.db import Database, get_db

GOAL_COLUMNS = "id,name,target_amount,saved_amount,target_date,monthly_contribution,priority,notes,created_at"
GOAL_LIMIT = 200  # far more goals than one person keeps


class GoalsRepo:
    def __init__(self, db: Database):
        self.db = db

    def list(self) -> list[dict[str, Any]]:
        return self.db.select("goals", GOAL_COLUMNS, [], order="created_at.asc", limit=GOAL_LIMIT)

    def create(self, row: dict[str, Any]) -> dict[str, Any]:
        # user_id is filled in by the database from the login token.
        return self.db.insert("goals", row, GOAL_COLUMNS)

    def replace(self, goal_id: str, row: dict[str, Any]) -> dict[str, Any] | None:
        rows = self.db.update_returning("goals", row, GOAL_COLUMNS, id=goal_id)
        return rows[0] if rows else None

    def delete(self, goal_id: str) -> bool:
        return self.db.delete("goals", id=goal_id) > 0


def get_goals_repo(db: Annotated[Database, Depends(get_db)]) -> GoalsRepo:
    return GoalsRepo(db)
