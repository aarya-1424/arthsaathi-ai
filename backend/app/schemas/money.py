"""What valid money entries and budgets look like."""
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Kind = Literal["income", "expense"]
ExpenseCategory = Literal[
    "rent", "food", "groceries", "transport", "education", "medical", "utilities",
    "shopping", "family", "entertainment", "emi", "other",
]
INCOME_CATEGORIES = ("salary", "allowance", "freelance", "business", "other")
EXPENSE_CATEGORIES = ExpenseCategory.__args__  # type: ignore[attr-defined]

IST = timezone(timedelta(hours=5, minutes=30))  # India has one time zone and no daylight saving
EARLIEST = date(2000, 1, 1)
MAX_AMOUNT = 100_000_000  # ₹10 crore per entry

Amount = Annotated[int, Field(strict=True, gt=0, le=MAX_AMOUNT)]
MonthStr = Annotated[str, Field(pattern=r"^20\d{2}-(0[1-9]|1[0-2])$")]


def today_in_india() -> date:
    return datetime.now(IST).date()


def _clean(text: str | None) -> str | None:
    text = (text or "").strip()
    return text or None


class EntryIn(BaseModel):
    """One money entry: money received (income) or money spent (expense)."""

    model_config = ConfigDict(extra="forbid")

    kind: Kind
    amount: Amount
    occurred_on: date
    category: str
    description: Annotated[str, Field(max_length=120)] | None = None
    notes: Annotated[str, Field(max_length=500)] | None = None

    @field_validator("description", "notes")
    @classmethod
    def tidy(cls, v: str | None) -> str | None:
        return _clean(v)

    @model_validator(mode="after")
    def check(self) -> "EntryIn":
        allowed = INCOME_CATEGORIES if self.kind == "income" else EXPENSE_CATEGORIES
        if self.category not in allowed:
            raise ValueError("category: please choose a category from the list.")
        # Allow "tomorrow" so a late-night entry never fails because of time zones.
        if not (EARLIEST <= self.occurred_on <= today_in_india() + timedelta(days=1)):
            raise ValueError("occurred_on: the date can't be in the future.")
        return self


class EntryOut(BaseModel):
    id: UUID
    kind: Kind
    amount: int
    occurred_on: date
    category: str
    description: str | None
    notes: str | None
    created_at: datetime


class EntryList(BaseModel):
    month: str
    entries: list[EntryOut]
    truncated: bool  # True if there were too many to show at once


class BudgetLimit(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: ExpenseCategory
    amount: Amount


class BudgetIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    limits: list[BudgetLimit] = Field(max_length=len(EXPENSE_CATEGORIES))

    @field_validator("limits")
    @classmethod
    def one_per_category(cls, v: list[BudgetLimit]) -> list[BudgetLimit]:
        if len({b.category for b in v}) != len(v):
            raise ValueError("Each category can only have one limit.")
        return v


class BudgetOut(BaseModel):
    month: str
    limits: list[BudgetLimit]
