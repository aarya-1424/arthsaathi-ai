"""Money calculations. Plain, tested code. The AI never does these sums.

All amounts are whole rupees (int). Percentages are rounded to one decimal place,
half up (so 12.25% becomes 12.3%), using exact decimal maths, not floating point.
"""
from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Literal

NEAR_LIMIT_PERCENT = 80  # a budget is "near" its limit from 80% used


@dataclass(frozen=True)
class Entry:
    kind: Literal["income", "expense"]
    amount: int
    category: str


@dataclass(frozen=True)
class Limit:
    category: str
    amount: int


@dataclass
class CategorySpend:
    category: str
    spent: int
    share_percent: float  # share of this month's total spending


@dataclass
class BudgetStatus:
    category: str
    limit: int
    spent: int
    remaining: int  # negative when over the limit
    used_percent: float
    status: Literal["ok", "near", "over"]


@dataclass
class Comparison:
    previous_income: int
    previous_expenses: int
    expense_change: int  # positive = spent more than last month


@dataclass
class MonthSummary:
    month: str
    total_income: int
    total_expenses: int
    remaining: int  # income minus expenses; negative means overspent
    savings_rate_percent: float | None  # None when there is no income to compare with
    entry_count: int
    categories: list[CategorySpend] = field(default_factory=list)
    budgets: list[BudgetStatus] = field(default_factory=list)
    budget_total: int = 0
    budget_spent: int = 0
    budget_remaining: int = 0
    comparison: Comparison | None = None


def percent(part: int, whole: int) -> float | None:
    """part as a percentage of whole, one decimal place. None if whole is zero or less."""
    if whole <= 0:
        return None
    value = (Decimal(part) * 100 / Decimal(whole)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return float(value)


def month_bounds(month: str) -> tuple[date, date]:
    """'2026-11' -> (2026-11-01, 2026-12-01). The end date is NOT included."""
    year, mon = (int(p) for p in month.split("-"))
    start = date(year, mon, 1)
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return start, end


def previous_month(month: str) -> str:
    year, mon = (int(p) for p in month.split("-"))
    return f"{year - 1}-12" if mon == 1 else f"{year}-{mon - 1:02d}"


def budget_status(limit: int, spent: int) -> Literal["ok", "near", "over"]:
    if spent > limit:
        return "over"
    # Integer maths: spent/limit >= 80%  <=>  spent*100 >= limit*80
    if spent * 100 >= limit * NEAR_LIMIT_PERCENT:
        return "near"
    return "ok"


def summarize(
    month: str,
    entries: Iterable[Entry],
    limits: Iterable[Limit] = (),
    previous_entries: Iterable[Entry] | None = None,
) -> MonthSummary:
    entries = list(entries)
    income = sum(e.amount for e in entries if e.kind == "income")
    expenses = sum(e.amount for e in entries if e.kind == "expense")
    remaining = income - expenses

    by_category: dict[str, int] = {}
    for e in entries:
        if e.kind == "expense":
            by_category[e.category] = by_category.get(e.category, 0) + e.amount
    categories = [
        CategorySpend(category=c, spent=s, share_percent=percent(s, expenses) or 0.0)
        for c, s in sorted(by_category.items(), key=lambda kv: (-kv[1], kv[0]))
    ]

    budgets = []
    for lim in sorted(limits, key=lambda l: l.category):
        spent = by_category.get(lim.category, 0)
        budgets.append(BudgetStatus(
            category=lim.category,
            limit=lim.amount,
            spent=spent,
            remaining=lim.amount - spent,
            used_percent=percent(spent, lim.amount) or 0.0,
            status=budget_status(lim.amount, spent),
        ))
    budget_total = sum(b.limit for b in budgets)
    budget_spent = sum(b.spent for b in budgets)

    comparison = None
    if previous_entries is not None:
        prev = list(previous_entries)
        if prev:  # only compare when last month actually has data
            prev_income = sum(e.amount for e in prev if e.kind == "income")
            prev_expenses = sum(e.amount for e in prev if e.kind == "expense")
            comparison = Comparison(prev_income, prev_expenses, expenses - prev_expenses)

    return MonthSummary(
        month=month,
        total_income=income,
        total_expenses=expenses,
        remaining=remaining,
        savings_rate_percent=percent(remaining, income),
        entry_count=len(entries),
        categories=categories,
        budgets=budgets,
        budget_total=budget_total,
        budget_spent=budget_spent,
        budget_remaining=budget_total - budget_spent,
        comparison=comparison,
    )
