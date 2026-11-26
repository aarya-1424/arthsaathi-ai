from datetime import date

import pytest

from app.goals.calc import add_months, ceil_div, goal_progress, months_between

TODAY = date(2026, 11, 26)


# ---------- helpers ----------

@pytest.mark.parametrize("a,b,expected", [(10, 5, 2), (11, 5, 3), (1, 5, 1), (0, 5, 0), (45000, 4, 11250), (45001, 4, 11251)])
def test_ceil_div_rounds_up_with_whole_numbers(a, b, expected):
    assert ceil_div(a, b) == expected


@pytest.mark.parametrize("target,expected", [
    (date(2026, 11, 30), 0), (date(2026, 12, 1), 1), (date(2027, 3, 15), 4), (date(2027, 11, 26), 12), (date(2026, 10, 1), -1),
])
def test_months_between(target, expected):
    assert months_between(TODAY, target) == expected


@pytest.mark.parametrize("months,expected", [(0, "2026-11"), (1, "2026-12"), (2, "2027-01"), (9, "2027-08"), (14, "2028-01"), (25, "2028-12")])
def test_add_months_crosses_years(months, expected):
    assert add_months(TODAY, months) == expected


# ---------- the laptop example from the product spec ----------

def test_spec_example_laptop_goal():
    # Target ₹60,000, saved ₹15,000 -> 25% done, ₹45,000 to go.
    g = goal_progress(60000, 15000, TODAY)
    assert (g.remaining, g.progress_percent, g.completed) == (45000, 25.0, False)
    assert (g.months_left, g.suggested_monthly, g.estimated_completion, g.on_track) == (None, None, None, None)


def test_suggested_monthly_from_target_date():
    # Due March 2027: Dec, Jan, Feb, Mar = 4 months. 45,000 / 4 = 11,250 a month.
    g = goal_progress(60000, 15000, TODAY, target_date=date(2027, 3, 31))
    assert (g.months_left, g.suggested_monthly, g.overdue) == (4, 11250, False)


def test_suggested_monthly_rounds_up_so_the_goal_is_really_reached():
    g = goal_progress(10000, 0, TODAY, target_date=date(2027, 2, 1))  # 3 months
    assert g.suggested_monthly == 3334
    assert g.suggested_monthly * g.months_left >= g.remaining


def test_estimate_from_own_monthly_amount():
    # ₹45,000 to go at ₹5,000 a month = 9 months -> August 2027.
    g = goal_progress(60000, 15000, TODAY, monthly_contribution=5000)
    assert (g.months_needed, g.estimated_completion, g.on_track) == (9, "2027-08", None)


def test_saving_the_suggested_amount_lands_exactly_on_the_target_month():
    first = goal_progress(60000, 15000, TODAY, target_date=date(2027, 3, 31))
    again = goal_progress(60000, 15000, TODAY, target_date=date(2027, 3, 31), monthly_contribution=first.suggested_monthly)
    assert (again.estimated_completion, again.on_track) == ("2027-03", True)


def test_not_on_track_when_own_amount_is_too_small():
    g = goal_progress(60000, 15000, TODAY, target_date=date(2027, 3, 31), monthly_contribution=5000)
    assert (g.months_needed, g.months_left, g.on_track, g.estimated_completion) == (9, 4, False, "2027-08")


# ---------- edges ----------

def test_goal_due_this_month_needs_everything_now():
    g = goal_progress(5000, 1000, TODAY, target_date=date(2026, 11, 30))
    assert (g.months_left, g.suggested_monthly) == (1, 4000)


def test_goal_due_today_is_not_overdue():
    assert goal_progress(5000, 0, TODAY, target_date=TODAY).overdue is False


def test_past_target_date_is_overdue_and_gives_no_suggestion():
    g = goal_progress(5000, 1000, TODAY, target_date=date(2026, 11, 25))
    assert (g.overdue, g.months_left, g.suggested_monthly) == (True, None, None)
    assert goal_progress(5000, 1000, TODAY, target_date=date(2026, 11, 25), monthly_contribution=500).on_track is False


@pytest.mark.parametrize("saved", [60000, 75000])
def test_reached_or_passed_goal_is_complete_and_quiet(saved):
    g = goal_progress(60000, saved, TODAY, target_date=date(2026, 1, 1), monthly_contribution=5000)
    assert (g.remaining, g.progress_percent, g.completed, g.overdue) == (0, 100.0, True, False)
    assert (g.suggested_monthly, g.months_needed, g.estimated_completion, g.on_track) == (None, None, None, None)


def test_nothing_saved_yet():
    g = goal_progress(50000, 0, TODAY)
    assert (g.remaining, g.progress_percent) == (50000, 0.0)


def test_progress_rounds_half_up_to_one_decimal():
    assert goal_progress(3, 1, TODAY).progress_percent == 33.3
    assert goal_progress(3, 2, TODAY).progress_percent == 66.7
    assert goal_progress(400, 49, TODAY).progress_percent == 12.3  # 12.25 -> 12.3


@pytest.mark.parametrize("monthly", [None, 0])
def test_no_monthly_amount_means_no_estimate(monthly):
    g = goal_progress(60000, 15000, TODAY, monthly_contribution=monthly)
    assert (g.months_needed, g.estimated_completion) == (None, None)


def test_tiny_monthly_amount_gives_months_but_no_far_future_date():
    g = goal_progress(10_000_000_000, 0, TODAY, monthly_contribution=1)
    assert g.months_needed == 10_000_000_000
    assert g.estimated_completion is None


def test_large_amounts_stay_exact():
    g = goal_progress(10_000_000_000, 1, TODAY, target_date=date(2027, 11, 1))
    assert g.remaining == 9_999_999_999
    assert g.suggested_monthly == 833_333_334  # 9,999,999,999 / 12, rounded up
