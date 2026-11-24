from datetime import date

import pytest

from app.money.calc import (
    Entry, Limit, budget_status, month_bounds, percent, previous_month, summarize,
)


def inc(amount, category="salary"):
    return Entry("income", amount, category)


def exp(amount, category="food"):
    return Entry("expense", amount, category)


# ---------- percent ----------

@pytest.mark.parametrize("part,whole,expected", [
    (1, 4, 25.0),
    (1, 3, 33.3),
    (2, 3, 66.7),
    (1, 8, 12.5),
    (49, 400, 12.3),   # 12.25 rounds half UP to 12.3 (floats would give 12.2)
    (0, 100, 0.0),
    (150, 100, 150.0),
    (-50, 100, -50.0),
])
def test_percent(part, whole, expected):
    assert percent(part, whole) == expected


@pytest.mark.parametrize("whole", [0, -10])
def test_percent_of_nothing_is_none(whole):
    assert percent(5, whole) is None


# ---------- months ----------

def test_month_bounds_normal():
    assert month_bounds("2026-11") == (date(2026, 11, 1), date(2026, 12, 1))


def test_month_bounds_december_rolls_into_next_year():
    assert month_bounds("2026-12") == (date(2026, 12, 1), date(2027, 1, 1))


def test_month_bounds_february_leap_year():
    start, end = month_bounds("2028-02")
    assert (end - start).days == 29


@pytest.mark.parametrize("month,expected", [("2026-11", "2026-10"), ("2026-01", "2025-12"), ("2026-10", "2026-09")])
def test_previous_month(month, expected):
    assert previous_month(month) == expected


# ---------- budget status ----------

@pytest.mark.parametrize("limit,spent,expected", [
    (5000, 0, "ok"),
    (5000, 3999, "ok"),
    (5000, 4000, "near"),   # exactly 80%
    (5000, 5000, "near"),   # exactly at the limit is not "over"
    (5000, 5001, "over"),
    (3, 2, "ok"),           # 66.7%
    (3, 3, "near"),
])
def test_budget_status(limit, spent, expected):
    assert budget_status(limit, spent) == expected


# ---------- summarize ----------

def test_empty_month():
    s = summarize("2026-11", [])
    assert (s.total_income, s.total_expenses, s.remaining, s.entry_count) == (0, 0, 0, 0)
    assert s.savings_rate_percent is None
    assert s.categories == [] and s.budgets == [] and s.comparison is None


def test_rahul_example_from_the_spec():
    # ₹28,000 salary; ₹8,000 rent; ₹5,000 to family; food and transport.
    entries = [inc(28000), exp(8000, "rent"), exp(5000, "family"), exp(4500, "food"), exp(1500, "transport")]
    s = summarize("2026-11", entries)
    assert s.total_income == 28000
    assert s.total_expenses == 19000
    assert s.remaining == 9000
    assert s.savings_rate_percent == 32.1  # 9000/28000 = 32.14...
    assert [c.category for c in s.categories] == ["rent", "family", "food", "transport"]
    assert s.categories[0].share_percent == 42.1  # 8000/19000 = 42.10...


def test_overspent_month_has_negative_remaining():
    s = summarize("2026-11", [inc(10000), exp(12500, "shopping")])
    assert s.remaining == -2500
    assert s.savings_rate_percent == -25.0


def test_expenses_but_no_income():
    s = summarize("2026-11", [exp(800)])
    assert s.remaining == -800
    assert s.savings_rate_percent is None


def test_same_category_is_added_up():
    s = summarize("2026-11", [exp(100), exp(250), exp(50, "transport")])
    assert [(c.category, c.spent) for c in s.categories] == [("food", 350), ("transport", 50)]


def test_category_shares_add_up_close_to_100():
    s = summarize("2026-11", [exp(1), exp(1, "rent"), exp(1, "transport")])
    assert sum(c.share_percent for c in s.categories) == pytest.approx(99.9)


def test_ties_are_sorted_by_name_so_order_is_stable():
    s = summarize("2026-11", [exp(100, "transport"), exp(100, "food")])
    assert [c.category for c in s.categories] == ["food", "transport"]


def test_income_categories_do_not_appear_in_spending():
    s = summarize("2026-11", [inc(5000, "freelance"), exp(200, "other")])
    assert [c.category for c in s.categories] == ["other"]


def test_budgets_track_spending_per_category():
    entries = [exp(4200, "food"), exp(9000, "rent"), exp(300, "transport")]
    limits = [Limit("food", 5000), Limit("rent", 8000), Limit("medical", 1000)]
    s = summarize("2026-11", entries, limits)
    by = {b.category: b for b in s.budgets}
    assert (by["food"].spent, by["food"].remaining, by["food"].used_percent, by["food"].status) == (4200, 800, 84.0, "near")
    assert (by["rent"].remaining, by["rent"].status) == (-1000, "over")
    assert (by["medical"].spent, by["medical"].status) == (0, "ok")
    assert s.budget_total == 14000
    assert s.budget_spent == 13200   # transport has no budget, so it is not counted here
    assert s.budget_remaining == 800


def test_comparison_only_when_last_month_has_data():
    assert summarize("2026-11", [exp(100)], previous_entries=[]).comparison is None
    assert summarize("2026-11", [exp(100)], previous_entries=None).comparison is None


def test_comparison_with_last_month():
    s = summarize("2026-11", [inc(28000), exp(12000)], previous_entries=[inc(28000), exp(10000)])
    assert s.comparison is not None
    assert (s.comparison.previous_income, s.comparison.previous_expenses, s.comparison.expense_change) == (28000, 10000, 2000)


def test_large_amounts_stay_exact():
    s = summarize("2026-11", [inc(100_000_000)] * 1000)
    assert s.total_income == 100_000_000_000
