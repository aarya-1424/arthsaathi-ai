import { expect, test } from "vitest";
import type { Summary } from "../money/types";
import { nextSteps } from "./nextSteps";

function summary(over: Partial<Summary> = {}): Summary {
  return {
    month: "2026-11", total_income: 28000, total_expenses: 14000, remaining: 14000, savings_rate_percent: 50,
    entry_count: 5, categories: [], budgets: [], budget_total: 0, budget_spent: 0, budget_remaining: 0, comparison: null,
    ...over,
  };
}

const budget = (category: string, limit: number, spent: number, status: "ok" | "near" | "over") =>
  ({ category, limit, spent, remaining: limit - spent, used_percent: (spent / limit) * 100, status });

test("nothing yet: no steps", () => {
  expect(nextSteps(null)).toEqual([]);
});

test("empty month asks for the first entry, and doesn't suggest a budget yet", () => {
  const steps = nextSteps(summary({ entry_count: 0, total_income: 0, total_expenses: 0, remaining: 0 }));
  expect(steps[0].text).toBe("Add what you received and spent this month");
  expect(steps.some((s) => s.id === "set-budget")).toBe(false);
});

test("over-budget comes first, with the real amount", () => {
  const steps = nextSteps(summary({ budgets: [budget("food", 5000, 4500, "near"), budget("shopping", 3000, 3800, "over")] }));
  expect(steps[0]).toMatchObject({ text: "You're over your Shopping budget by ₹800", tone: "danger" });
  expect(steps[1]).toMatchObject({ text: "Your Food budget is almost used: ₹500 left", tone: "warn" });
});

test("overspending the month is flagged", () => {
  const steps = nextSteps(summary({ total_expenses: 30000, remaining: -2000, savings_rate_percent: -7.1 }));
  expect(steps[0].text).toBe("You've spent ₹2,000 more than you received this month");
});

test("entries but no budget suggests setting one", () => {
  expect(nextSteps(summary()).map((s) => s.id)).toEqual(["set-budget", "profile"]);
});

test("never more than 3 steps", () => {
  const many = ["food", "rent", "shopping", "transport"].map((c) => budget(c, 1000, 2000, "over"));
  expect(nextSteps(summary({ budgets: many }))).toHaveLength(3);
});
