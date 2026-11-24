from dataclasses import asdict
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.money.calc import Entry, Limit, month_bounds, previous_month, summarize
from app.money.repo import LIST_LIMIT, SUMMARY_LIMIT, MoneyRepo, get_money_repo
from app.schemas.money import BudgetIn, BudgetLimit, BudgetOut, EntryIn, EntryList, EntryOut, MonthStr

router = APIRouter(tags=["money"])

Repo = Annotated[MoneyRepo, Depends(get_money_repo)]
Month = Annotated[MonthStr, Query(description="Month as YYYY-MM, e.g. 2026-11")]


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, "We couldn't find that entry. It may have been deleted.")


# ---------- entries ----------

@router.get("/transactions")
def list_entries(repo: Repo, month: Month, kind: Literal["income", "expense"] | None = None) -> EntryList:
    start, end = month_bounds(month)
    rows = repo.list_entries(start, end, kind)
    return EntryList(month=month, entries=rows, truncated=len(rows) >= LIST_LIMIT)


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def add_entry(body: EntryIn, repo: Repo) -> EntryOut:
    # user_id is filled in by the database from the login token, never from the browser.
    return EntryOut.model_validate(repo.create(body.model_dump(mode="json")))


@router.put("/transactions/{entry_id}")
def change_entry(entry_id: UUID, body: EntryIn, repo: Repo) -> EntryOut:
    row = repo.replace(str(entry_id), body.model_dump(mode="json"))
    if row is None:  # not found, or it belongs to someone else (the database hides it)
        raise _not_found()
    return EntryOut.model_validate(row)


@router.delete("/transactions/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: UUID, repo: Repo) -> Response:
    if not repo.delete(str(entry_id)):
        raise _not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- budgets ----------

@router.get("/budgets")
def get_budget(repo: Repo, month: Month) -> BudgetOut:
    start, _ = month_bounds(month)
    return BudgetOut(month=month, limits=[BudgetLimit.model_validate(r) for r in repo.budgets(start)])


@router.put("/budgets")
def set_budget(body: BudgetIn, repo: Repo, month: Month) -> BudgetOut:
    """Replaces the whole budget for that month in one step (all or nothing)."""
    start, _ = month_bounds(month)
    rows = repo.set_budgets(start, [b.model_dump() for b in body.limits])
    limits = [BudgetLimit(category=r["category"], amount=r["amount"]) for r in rows]
    return BudgetOut(month=month, limits=sorted(limits, key=lambda b: b.category))


# ---------- summary ----------

@router.get("/money/summary")
def month_summary(repo: Repo, month: Month) -> dict:
    cols = "kind,amount,category"
    start, end = month_bounds(month)
    prev_start, prev_end = month_bounds(previous_month(month))
    current = repo.list_entries(start, end, columns=cols, limit=SUMMARY_LIMIT)
    previous = repo.list_entries(prev_start, prev_end, columns=cols, limit=SUMMARY_LIMIT)
    limits = repo.budgets(start)
    result = summarize(
        month,
        [Entry(r["kind"], r["amount"], r["category"]) for r in current],
        [Limit(r["category"], r["amount"]) for r in limits],
        [Entry(r["kind"], r["amount"], r["category"]) for r in previous],
    )
    return asdict(result)
