import { expect, test } from "vitest";
import { categoryLabel, currentMonth, shiftMonth, todayISO } from "./types";

test("shiftMonth moves across years correctly", () => {
  expect(shiftMonth("2026-11", 1)).toBe("2026-12");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-03", -14)).toBe("2025-01");
});

test("todayISO and currentMonth use the user's local date", () => {
  const lateNight = new Date(2026, 10, 30, 23, 50); // 30 Nov, 11:50 pm local
  expect(todayISO(lateNight)).toBe("2026-11-30");
  expect(currentMonth(lateNight)).toBe("2026-11");
});

test("category labels are friendly, and the same code can mean different things for income and spending", () => {
  expect(categoryLabel("expense", "emi")).toBe("Loan EMIs");
  expect(categoryLabel("income", "allowance")).toBe("Pocket money / allowance");
  expect(categoryLabel("income", "other")).toBe("Other");
});
