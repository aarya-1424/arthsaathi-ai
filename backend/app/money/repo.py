"""Database reads and writes for My Money. Kept separate so the API can be tested without a database."""
import logging
from datetime import date
from typing import Annotated, Any

from fastapi import Depends

from app.db import Database, get_db

logger = logging.getLogger("arthsaathi.money")

ENTRY_COLUMNS = "id,kind,amount,occurred_on,category,description,notes,created_at"
LIST_LIMIT = 1000        # entries shown on one page
SUMMARY_LIMIT = 20000    # far more than any person records in a month


class MoneyRepo:
    def __init__(self, db: Database):
        self.db = db

    def list_entries(self, start: date, end: date, kind: str | None = None, *,
                     columns: str = ENTRY_COLUMNS, limit: int = LIST_LIMIT) -> list[dict[str, Any]]:
        filters = [("and", f"(occurred_on.gte.{start.isoformat()},occurred_on.lt.{end.isoformat()})")]
        if kind:
            filters.append(("kind", f"eq.{kind}"))
        rows = self.db.select("transactions", columns, filters, order="occurred_on.desc,created_at.desc", limit=limit)
        if len(rows) >= limit:
            logger.warning("Entry list hit its limit of %s rows", limit)
        return rows

    def create(self, row: dict[str, Any]) -> dict[str, Any]:
        return self.db.insert("transactions", row, ENTRY_COLUMNS)

    def replace(self, entry_id: str, row: dict[str, Any]) -> dict[str, Any] | None:
        rows = self.db.update_returning("transactions", row, ENTRY_COLUMNS, id=entry_id)
        return rows[0] if rows else None

    def delete(self, entry_id: str) -> bool:
        return self.db.delete("transactions", id=entry_id) > 0

    def budgets(self, month_start: date) -> list[dict[str, Any]]:
        return self.db.select("budgets", "category,amount", [("month", f"eq.{month_start.isoformat()}")], order="category.asc")

    def set_budgets(self, month_start: date, limits: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self.db.rpc("set_month_budget", {"p_month": month_start.isoformat(), "p_limits": limits})


def get_money_repo(db: Annotated[Database, Depends(get_db)]) -> MoneyRepo:
    return MoneyRepo(db)
