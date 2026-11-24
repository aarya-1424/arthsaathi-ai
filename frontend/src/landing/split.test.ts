import { expect, test } from "vitest";
import { MAX_DEMO_INCOME, split503020 } from "./split";

test("splits a round income 50/30/20", () => {
  expect(split503020(28000)).toEqual({ needs: 14000, wants: 8400, savings: 5600 });
});

test.each([1, 7, 33, 12345, 99999, 28001])("the three parts always add up exactly (%i)", (income) => {
  const s = split503020(income);
  expect(s.needs + s.wants + s.savings).toBe(income);
  expect(Math.min(s.needs, s.wants, s.savings)).toBeGreaterThanOrEqual(0);
});

test.each([[0, 0], [-500, 0], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0], [12.9, 12]])("bad input %s is handled safely", (income, total) => {
  const s = split503020(income);
  expect(s.needs + s.wants + s.savings).toBe(total);
});

test("very large incomes are capped for the demo", () => {
  const s = split503020(MAX_DEMO_INCOME * 5);
  expect(s.needs + s.wants + s.savings).toBe(MAX_DEMO_INCOME);
});
