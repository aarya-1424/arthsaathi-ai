"""Goal calculations. Plain, tested code. The AI never does these sums.

All amounts are whole rupees. The assumptions are simple and shown to the user:
- You save the same amount every month.
- No interest or returns are counted (so real results can only be equal or better).
- "Months left" counts each month after this one, up to and including the target month
  (at least 1, so a goal due this month means "the whole remaining amount now").
"""
from dataclasses import dataclass
from datetime import date

from app.money.calc import percent


@dataclass
class GoalProgress:
    remaining: int  # how much is still needed (never below 0)
    progress_percent: float  # 0 to 100
    completed: bool
    overdue: bool  # the target date has passed and the goal is not reached
    months_left: int | None  # None when there is no target date, or it has passed
    suggested_monthly: int | None  # save this much a month to reach the goal by the target date
    months_needed: int | None  # at the user's own monthly amount
    estimated_completion: str | None  # "YYYY-MM", at the user's own monthly amount
    on_track: bool | None  # does the user's monthly amount reach the goal by the target date?


def months_between(today: date, target: date) -> int:
    """Whole calendar months from today's month to the target's month (can be 0 or negative)."""
    return (target.year - today.year) * 12 + (target.month - today.month)


def add_months(today: date, months: int) -> str:
    """The month that is `months` after today's month, as "YYYY-MM"."""
    total = today.year * 12 + (today.month - 1) + months
    return f"{total // 12}-{total % 12 + 1:02d}"


def ceil_div(a: int, b: int) -> int:
    """a divided by b, rounded UP, using whole numbers only (no floating point)."""
    return -(-a // b)


def goal_progress(
    target_amount: int,
    saved_amount: int,
    today: date,
    target_date: date | None = None,
    monthly_contribution: int | None = None,
) -> GoalProgress:
    remaining = max(0, target_amount - saved_amount)
    completed = remaining == 0
    progress = percent(min(saved_amount, target_amount), target_amount) or 0.0

    overdue = False
    months_left: int | None = None
    suggested: int | None = None
    if target_date is not None and not completed:
        if target_date < today:
            overdue = True
        else:
            months_left = max(1, months_between(today, target_date))
            suggested = ceil_div(remaining, months_left)

    months_needed: int | None = None
    estimate: str | None = None
    on_track: bool | None = None
    if monthly_contribution and not completed:
        months_needed = ceil_div(remaining, monthly_contribution)
        # Far-future results are not shown as a date; they are not a useful promise.
        if months_needed <= 1200:
            estimate = add_months(today, months_needed)
        if months_left is not None:
            on_track = months_needed <= months_left
        elif overdue:
            on_track = False

    return GoalProgress(
        remaining=remaining,
        progress_percent=progress,
        completed=completed,
        overdue=overdue,
        months_left=months_left,
        suggested_monthly=suggested,
        months_needed=months_needed,
        estimated_completion=estimate,
        on_track=on_track,
    )
