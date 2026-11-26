"""What a valid goal looks like."""
from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

Priority = Literal["high", "medium", "low"]

MAX_GOAL = 10_000_000_000  # ₹1,000 crore
MAX_MONTHLY = 100_000_000  # ₹10 crore a month
EARLIEST = date(2000, 1, 1)
LATEST = date(2100, 12, 31)


class GoalIn(BaseModel):
    """What the website sends to create or change a goal. Whole rupees only."""

    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, Field(max_length=80)]
    target_amount: Annotated[int, Field(strict=True, gt=0, le=MAX_GOAL)]
    saved_amount: Annotated[int, Field(strict=True, ge=0, le=MAX_GOAL)] = 0
    target_date: date | None = None
    monthly_contribution: Annotated[int, Field(strict=True, ge=0, le=MAX_MONTHLY)] | None = None
    priority: Priority = "medium"
    notes: Annotated[str, Field(max_length=500)] | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please give your goal a name.")
        return v

    @field_validator("notes")
    @classmethod
    def tidy_notes(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None

    @field_validator("target_date")
    @classmethod
    def sensible_date(cls, v: date | None) -> date | None:
        if v is not None and not (EARLIEST <= v <= LATEST):
            raise ValueError("Please choose a date between 2000 and 2100.")
        return v

    @field_validator("monthly_contribution")
    @classmethod
    def zero_means_none(cls, v: int | None) -> int | None:
        return v or None  # "₹0 a month" is the same as not saying


class GoalOut(BaseModel):
    id: UUID
    name: str
    target_amount: int
    saved_amount: int
    target_date: date | None
    monthly_contribution: int | None
    priority: Priority
    notes: str | None
    created_at: datetime
    # Calculated by the server (app/goals/calc.py), never by AI:
    remaining: int
    progress_percent: float
    completed: bool
    overdue: bool
    months_left: int | None
    suggested_monthly: int | None
    months_needed: int | None
    estimated_completion: str | None
    on_track: bool | None
