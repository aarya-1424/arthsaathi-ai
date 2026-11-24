import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Donut, Legend } from "./charts";

test("donut describes itself in words for screen readers", () => {
  render(<Donut label="Spending" segments={[{ label: "Rent", value: 8000 }, { label: "Food", value: 2000 }]} />);
  expect(screen.getByRole("img", { name: "Spending: Rent ₹8,000 (80%), Food ₹2,000 (20%)" })).toBeInTheDocument();
});

test("donut with no data says so and draws only the empty ring", () => {
  const { container } = render(<Donut label="Spending" segments={[{ label: "Rent", value: 0 }]} />);
  expect(screen.getByRole("img", { name: "Spending: no data yet" })).toBeInTheDocument();
  expect(container.querySelectorAll("circle")).toHaveLength(1);
});

test("donut skips zero and negative slices", () => {
  const { container } = render(<Donut label="X" segments={[{ label: "A", value: 5 }, { label: "B", value: 0 }, { label: "C", value: -3 }]} />);
  expect(container.querySelectorAll("circle")).toHaveLength(2); // background ring + one slice
});

test("legend shows real amounts and shares", () => {
  render(<Legend segments={[{ label: "Needs", value: 14000 }, { label: "Wants", value: 8400 }, { label: "Savings", value: 5600 }]} />);
  expect(screen.getByText("₹14,000")).toBeInTheDocument();
  expect(screen.getByText("50%")).toBeInTheDocument();
  expect(screen.getByText("20%")).toBeInTheDocument();
});

import { BarChart, compactInr, niceMax } from "./charts";

test.each([
  [0, "₹0"], [950, "₹950"], [1000, "₹1k"], [25000, "₹25k"], [99999, "₹1L"], [99949, "₹99.9k"], [9_999_999, "₹1Cr"], [100000, "₹1L"],
  [150000, "₹1.5L"], [1234567, "₹12.3L"], [10000000, "₹1Cr"], [23000000, "₹2.3Cr"], [-2500, "-₹2.5k"],
])("compactInr(%i) is %s", (n, expected) => {
  expect(compactInr(n)).toBe(expected);
});

test.each([[0, 1000], [1, 1], [7, 8], [180, 200], [220, 250], [28000, 30000], [30000, 30000], [12000, 15000], [41000, 50000], [100000, 100000]])(
  "niceMax(%i) is %i", (max, expected) => {
    expect(niceMax(max)).toBe(expected);
  });

test("bar chart describes every month in words", () => {
  render(
    <BarChart
      label="Last 2 months"
      series={[{ label: "Received", color: "#3ddc97" }, { label: "Spent", color: "#6f8f82" }]}
      groups={[{ label: "Oct", values: [0, 1200] }, { label: "Nov", values: [28000, 8000] }]}
    />,
  );
  expect(screen.getByRole("img", { name: "Last 2 months: Oct: Received ₹0, Spent ₹1,200; Nov: Received ₹28,000, Spent ₹8,000" })).toBeInTheDocument();
  expect(screen.getByText("Received")).toBeInTheDocument();
});

test("bar chart with all zeros still draws safely", () => {
  const { container } = render(
    <BarChart label="Empty" series={[{ label: "Spent", color: "#fff" }]} groups={[{ label: "Nov", values: [0] }]} />,
  );
  for (const rect of container.querySelectorAll("rect")) expect(Number(rect.getAttribute("height"))).toBe(0);
});
